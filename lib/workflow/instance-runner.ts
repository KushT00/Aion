import { createClient } from '@/lib/supabase/server';
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
        const supabase = await createClient();

        try {
            // 1. Fetch Instance and its associated Workflow/Listing
            const { data: instance, error: instErr } = await supabase
                .from('consumer_instances')
                .select(`
                    *,
                    listing:marketplace_listings (
                        id, title,
                        workflow:workflows ( id, nodes, edges )
                    )
                `)
                .eq('id', this.instanceId)
                .eq('buyer_id', this.userId)
                .single();

            if (instErr || !instance) throw new Error('Instance not found or unauthorized');

            const workflow = (instance.listing as any)?.workflow;
            if (!workflow) throw new Error('Workflow definition not found for this instance');

            // 2. Fetch User Credentials for this instance
            const { data: credentials } = await supabase
                .from('consumer_credentials')
                .select('integration_key, credential_data')
                .eq('instance_id', this.instanceId);

            const credMap: Record<string, any> = {};
            (credentials || []).forEach(c => {
                credMap[c.integration_key] = c.credential_data;
            });

            // 3. Hydrate Nodes: Apply overrides and inject credentials
            const nodes: WorkflowNode[] = typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes;
            const edges: WorkflowEdge[] = typeof workflow.edges === 'string' ? JSON.parse(workflow.edges) : workflow.edges;
            const overrides = instance.config_overrides || {};

            const hydratedNodes = nodes.map((node: any) => {
                const nodeConfig = { ...(node.data || {}), ...(node.config || {}) };

                // A. Apply Behavior Overrides (Freedom)
                // Keys in overrides are formatted like "nodeId.property"
                Object.keys(overrides).forEach(key => {
                    const [nodeId, property] = key.split('.');
                    if (nodeId === node.id) {
                        nodeConfig[property] = overrides[key];
                    }
                });

                // B. Inject Credentials (BYOK)
                const nodeType = node.type?.toLowerCase();
                const integId = node.config?.integrationId || node.data?.integrationType;

                // Google Services (OAuth Integration)
                if (integId?.includes('google') || nodeType?.includes('google_sheets') || nodeType?.includes('google_docs')) {
                    const googleCred = credMap['google_sheets'] || credMap['google_oauth']; // usually unified
                    if (googleCred?.accessToken) {
                        nodeConfig.accessToken = googleCred.accessToken;
                    }
                }

                // AI Models
                if (integId === 'google_gemini' || nodeType?.includes('gemini')) {
                    if (credMap['google_gemini']?.value) nodeConfig.apiKey = credMap['google_gemini'].value;
                }
                if (integId === 'openai' || nodeType?.includes('openai')) {
                    if (credMap['openai']?.value) nodeConfig.apiKey = credMap['openai'].value;
                }
                if (integId === 'groq' || nodeType?.includes('groq')) {
                    if (credMap['groq']?.value) nodeConfig.apiKey = credMap['groq'].value;
                }

                // Messaging
                if (integId === 'telegram' || nodeType?.includes('telegram')) {
                    if (credMap['telegram']?.value) nodeConfig.botToken = credMap['telegram'].value;
                }

                return {
                    ...node,
                    config: nodeConfig,
                    data: nodeConfig, // ensure data matches config for consistency in runner
                };
            });

            // 4. Initialize and Run WorkflowRunner
            const runner = new WorkflowRunner(hydratedNodes, edges);
            const outputs = await runner.execute(triggerData);
            const logs = runner.getLogs();

            // 5. Update Instance Stats
            const success = logs.every(l => l.status !== 'failed');
            await supabase.from('consumer_instances').update({
                total_runs: (instance.total_runs || 0) + 1,
                total_successes: (instance.total_successes || 0) + (success ? 1 : 0),
                total_failures: (instance.total_failures || 0) + (success ? 0 : 1),
                last_run_at: new Date().toISOString()
            }).eq('id', this.instanceId);

            // 6. Save Run Log
            await supabase.from('consumer_run_logs').insert({
                instance_id: this.instanceId,
                status: success ? 'success' : 'failed',
                duration_ms: 0, // could calculate this
                node_count: hydratedNodes.length,
                input_summary: JSON.stringify(triggerData).substring(0, 1000),
                output_summary: JSON.stringify(outputs).substring(0, 1000),
                error: logs.find(l => l.status === 'failed')?.error || null
            });

            return { success, logs, outputs };

        } catch (error: any) {
            console.error(`[INSTANCE RUNNER ERROR] ${this.instanceId}:`, error);

            // Record failure in DB if possible
            try {
                await supabase.from('consumer_run_logs').insert({
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
