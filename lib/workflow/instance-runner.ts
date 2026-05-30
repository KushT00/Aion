import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { WorkflowRunner, RunLog } from './runner';
import { WorkflowNode, WorkflowEdge } from '@/types';

export interface InstanceRunResult {
    success: boolean;
    logs: RunLog[];
    outputs: any;
    error?: string;
}

export class InstanceRunner {
    private instanceId: string;
    private userId: string;

    constructor(instanceId: string, userId: string) {
        this.instanceId = instanceId;
        this.userId = userId;
    }

    async run(triggerData: any = {}): Promise<InstanceRunResult> {
        const admin = createAdminClient();

        try {
            // 1. Fetch Instance - Use admin client as webhooks don't have user sessions
            const { data: instance, error: instErr } = await admin
                .from('consumer_instances')
                .select(`
                    *,
                    listing:marketplace_listings (
                        id, title, workflow_id
                    )
                `)
                .eq('id', this.instanceId)
                .eq('buyer_id', this.userId)
                .single();

            if (instErr || !instance) throw new Error('Instance not found or unauthorized');

            const workflowId = instance.workflow_id || (instance.listing as any)?.workflow_id;
            if (!workflowId) throw new Error('Workflow ID not found for this instance');

            // 2. Fetch nodes and edges from their dedicated tables using admin client
            const { data: rawNodes, error: nodesErr } = await admin
                .from('workflow_nodes')
                .select('id, type, label, position_x, position_y, config')
                .eq('workflow_id', workflowId);

            if (nodesErr) throw new Error(`Failed to fetch workflow nodes: ${nodesErr.message}`);

            const { data: rawEdges, error: edgesErr } = await admin
                .from('workflow_edges')
                .select('id, source_node_id, target_node_id, source_handle, target_handle, label')
                .eq('workflow_id', workflowId);

            if (edgesErr) throw new Error(`Failed to fetch workflow edges: ${edgesErr.message}`);

            if (!rawNodes || rawNodes.length === 0) {
                throw new Error('Workflow has no nodes. Please check the workflow definition.');
            }

            // 3. Fetch User Credentials for this instance
            const { data: credentials } = await admin
                .from('consumer_credentials')
                .select('integration_key, credential_data')
                .eq('instance_id', this.instanceId);

            const ENCRYPTION_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 32) || '12345678901234567890123456789012';
            const ALGORITHM = 'aes-256-gcm';

            function decrypt(encryptedData: string, ivHex: string, authTagHex: string) {
                const iv = Buffer.from(ivHex, 'hex');
                const authTag = Buffer.from(authTagHex, 'hex');
                const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
                decipher.setAuthTag(authTag);
                let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                return decrypted;
            }

            const credMap: Record<string, any> = {};
            (credentials || []).forEach(c => {
                let data = c.credential_data;
                if (data?.encrypted && data?.encryptedData) {
                    try {
                        const val = decrypt(data.encryptedData, data.iv, data.authTag);
                        data = { value: val };
                    } catch (err) {
                        console.error(`Failed to decrypt credential for ${c.integration_key}`);
                    }
                }
                credMap[c.integration_key] = data;
            });

            // Also fetch global Google OAuth integration if applicable
            const { data: globalIntegrations } = await admin
                .from('user_integrations')
                .select('provider, access_token, refresh_token, is_valid')
                .eq('user_id', this.userId)
                .eq('provider', 'google')
                .eq('is_valid', true)
                .maybeSingle();

            if (globalIntegrations?.access_token) {
                credMap['google_oauth'] = { accessToken: globalIntegrations.access_token };
                // Also populate google_sheets, google_docs etc. with the OAuth token
                if (!credMap['google_sheets']) credMap['google_sheets'] = { accessToken: globalIntegrations.access_token };
                if (!credMap['google_docs']) credMap['google_docs'] = { accessToken: globalIntegrations.access_token };
                if (!credMap['google_gmail']) credMap['google_gmail'] = { accessToken: globalIntegrations.access_token };
            }

            // 4. Transform DB nodes/edges into WorkflowNode/WorkflowEdge format
            const nodes: WorkflowNode[] = rawNodes.map((n: any) => ({
                id: n.id,
                workflow_id: workflowId,
                type: n.config?.originalType || n.config?.rfType || n.type || 'input',
                label: n.label || '',
                position_x: n.position_x || 0,
                position_y: n.position_y || 0,
                config: n.config || {},
                created_at: new Date().toISOString(),
                data: n.config || {}, // keep for runner
            } as any));

            const edges: WorkflowEdge[] = (rawEdges || []).map((e: any) => ({
                id: e.id,
                workflow_id: workflowId,
                source_node_id: e.source_node_id || e.source,
                target_node_id: e.target_node_id || e.target,
                source_handle: e.source_handle || e.sourceHandle,
                target_handle: e.target_handle || e.targetHandle,
                label: e.label,
                created_at: new Date().toISOString(),
            } as any));

            const overrides = instance.config_overrides || {};

            // 5. Hydrate Nodes: Apply overrides and inject credentials
            const hydratedNodes = nodes.map((node: any) => {
                // Merge data and config, and ensure we have a fresh copy of data to mutate
                const nodeConfig = { 
                    ...(node.data || {}), 
                    ...(node.config || {}),
                    data: { ...(node.data || {}), ...(node.config?.data || {}) } 
                };

                // A. Apply Behavior Overrides (Freedom)
                if (Object.keys(overrides).length > 0) {
                    console.log(`⚙️ [INSTANCE RUNNER] Applying ${Object.keys(overrides).length} overrides for instance ${this.instanceId}`);
                }

                Object.keys(overrides).forEach(key => {
                    const parts = key.split('.');
                    const nodeId = parts[0];
                    const property = parts[parts.length - 1]; // Get the actual property name (e.g. filePath)
                    
                    if (nodeId === node.id) {
                        let val = overrides[key];
                        console.log(`   ✨ [OVERRIDE] Applying ${property}="${val}" to node ${node.label || node.id}`);
                        
                        // Auto-parse JSON strings for complex overrides like varList
                        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                            try { val = JSON.parse(val); } catch (e) {}
                        }
                        
                        // Apply to top level
                        nodeConfig[property] = val;
                        // ALSO apply to .data to prevent spread overwrite in runner.ts
                        if (nodeConfig.data) {
                            nodeConfig.data[property] = val;
                        }
                    }
                });

                return {
                    ...node,
                    config: nodeConfig,
                    data: nodeConfig,
                };
            });

            // 5b. Second Pass: Sync Nested Tools (e.g. if a standalone Tool node was overridden)
            hydratedNodes.forEach((node: any) => {
                const overrides = instance.config_overrides || {};
                Object.keys(overrides).forEach(key => {
                    const parts = key.split('.');
                    const nodeId = parts[0];
                    const property = parts[parts.length - 1];
                    
                    if (nodeId === node.id && (node.config?.integrationId === 'tool' || node.type === 'tool')) {
                        const val = overrides[key];
                        hydratedNodes.forEach((otherNode: any) => {
                            if (otherNode.config?.agentTools && Array.isArray(otherNode.config.agentTools)) {
                                otherNode.config.agentTools = otherNode.config.agentTools.map((t: any) => {
                                    if (t.type === node.config?.actionId || t.id === node.config?.actionId) {
                                        console.log(`   🔗 [SYNC] Syncing bundled tool in node ${otherNode.label || otherNode.id}: ${property}="${val}"`);
                                        return { ...t, [property]: val };
                                    }
                                    return t;
                                });
                            }
                        });
                    }
                });
            });

            console.log(`[INSTANCE RUNNER] Executing ${hydratedNodes.length} nodes, ${edges.length} edges for instance ${this.instanceId}`);

            // C. Final Pass: Inject Credentials (BYOK)
            hydratedNodes.forEach((node: any) => {
                const nodeConfig = node.config;
                const nodeType = node.type?.toLowerCase();
                const integId = nodeConfig.integrationId || node.data?.integrationType;

                console.log(`📌 [BYOK-INJECT] Node: "${node.label || node.id}", Type: "${nodeType}", integId: "${integId}"`);

                const injectCred = (key: string, val: string) => {
                    console.log(`🔍 [INJECT_CRED] Node: ${node.label || node.id}, Key: ${key}, Value: ${val ? val.substring(0, 10) + '...' : 'null'}`);
                    console.log(`   Before - nodeConfig.data:`, JSON.stringify(nodeConfig.data));
                    nodeConfig[key] = val;
                    if (nodeConfig.data) {
                        nodeConfig.data[key] = val;
                    }
                    console.log(`   After - nodeConfig.data:`, JSON.stringify(nodeConfig.data));
                };

                // Google Services (OAuth Integration)
                if (integId?.includes('google') || nodeType?.includes('google_sheets') || nodeType?.includes('google_docs') || nodeType?.includes('gmail')) {
                    const googleCred = credMap['google_sheets'] || credMap['google_oauth'];
                    if (googleCred?.accessToken) {
                        injectCred('accessToken', googleCred.accessToken);
                    }
                }

                // AI Models
                if (integId === 'google_gemini' || nodeType?.includes('gemini')) {
                    if (credMap['google_gemini']?.value) injectCred('apiKey', credMap['google_gemini'].value);
                }
                if (integId === 'openai' || nodeType?.includes('openai')) {
                    if (credMap['openai']?.value) injectCred('apiKey', credMap['openai'].value);
                }
                if (integId === 'groq' || nodeType?.includes('groq')) {
                    if (credMap['groq']?.value) injectCred('apiKey', credMap['groq'].value);
                }
                if (integId === 'anthropic' || nodeType?.includes('anthropic')) {
                    if (credMap['anthropic']?.value) injectCred('apiKey', credMap['anthropic'].value);
                }
                if (integId === 'openrouter' || nodeType?.includes('openrouter')) {
                    if (credMap['openrouter']?.value) injectCred('apiKey', credMap['openrouter'].value);
                }

                // Messaging
                if (integId === 'telegram' || nodeType?.includes('telegram')) {
                    if (credMap['telegram']?.value) injectCred('botToken', credMap['telegram'].value);
                }

                return {
                    ...node,
                    config: nodeConfig,
                    data: nodeConfig,
                };
            });

            console.log(`[INSTANCE RUNNER] Executing ${hydratedNodes.length} nodes, ${edges.length} edges for instance ${this.instanceId}`);

            // 6. Initialize and Run WorkflowRunner
            const runner = new WorkflowRunner(hydratedNodes, edges, {}, this.instanceId, this.userId, credMap);
            const startTime = Date.now();
            const outputs = await runner.execute(triggerData);
            const durationMs = Date.now() - startTime;
            const logs = runner.getLogs();

            // 7. Update Instance Stats
            const success = logs.every(l => l.status !== 'failed');
            await admin.from('consumer_instances').update({
                total_runs: (instance.total_runs || 0) + 1,
                total_successes: (instance.total_successes || 0) + (success ? 1 : 0),
                total_failures: (instance.total_failures || 0) + (success ? 0 : 1),
                last_run_at: new Date().toISOString(),
                status: success ? 'active' : instance.status, // Auto-activate on first successful run
            }).eq('id', this.instanceId);

            // 8. Save Run Log
            const safeStringify = (obj: any) => {
                try {
                    return JSON.stringify(obj).substring(0, 1000);
                } catch (e) {
                    return "[Unserializable Data]";
                }
            };

            await admin.from('consumer_run_logs').insert({
                instance_id: this.instanceId,
                status: success ? 'success' : 'failed',
                duration_ms: durationMs,
                node_count: hydratedNodes.length,
                input_summary: safeStringify(triggerData),
                output_summary: safeStringify(outputs),
                error: logs.find(l => l.status === 'failed')?.error || null
            });

            return { success, logs, outputs };

        } catch (error: any) {
            console.error(`[INSTANCE RUNNER ERROR] ${this.instanceId}:`, error);

            // Record failure in DB if possible
            try {
                const admin = createAdminClient();
                await admin.from('consumer_run_logs').insert({
                    instance_id: this.instanceId,
                    status: 'failed',
                    error: error.message
                });
            } catch (inner) { }

            return {
                success: false,
                logs: [],
                outputs: {},
                error: error.message
            };
        }
    }
}
