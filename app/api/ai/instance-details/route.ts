import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const instanceId = req.nextUrl.searchParams.get('instanceId');
        if (!instanceId) {
            return NextResponse.json({ error: 'Missing instanceId' }, { status: 400 });
        }

        // 1. Fetch instance. Use OR to check if the ID provided might be a purchase_id by accident
        // Use Admin client to ensure nested workflow/nodes/edges are fetched even if RLS is tight for buyers initially
        const adminDb = createAdminClient();
        const { data: instance, error: instErr } = await adminDb
            .from('consumer_instances')
            .select(`
                id, status, pricing_tier, buyer_id, created_at, workflow_id, config_overrides,
                listing:marketplace_listings (
                    id, title, description, category
                )
            `)
            .or(`id.eq.${instanceId},purchase_id.eq.${instanceId}`)
            .eq('buyer_id', user.id)
            .maybeSingle();

        if (instErr) {
            console.error('[DEBUG] Database error while fetching instance:', instErr);
            throw instErr;
        }

        if (!instance) {
            console.warn(`[DEBUG] Instance not found for ID: ${instanceId}. User: ${user.id}`);
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        // 2. Fetch workflow details, nodes, and edges separately using Admin client to ensure visibility
        const { data: workflow } = await adminDb
            .from('workflows')
            .select('id, name')
            .eq('id', instance.workflow_id)
            .maybeSingle();

        const { data: rawNodes } = await adminDb
            .from('workflow_nodes')
            .select('id, type, label, position_x, position_y, config')
            .eq('workflow_id', instance.workflow_id);

        const { data: rawEdges } = await adminDb
            .from('workflow_edges')
            .select('id, source_node_id, target_node_id, source_handle, target_handle, label')
            .eq('workflow_id', instance.workflow_id);

        // 3. Get workflow nodes to determine required integrations
        const listing = instance.listing;
        const nodes = rawNodes || [];
        const edges = rawEdges || [];

        let requiredIntegrations: string[] = [];

        if (nodes.length > 0) {
            const integrationTypes = new Set<string>();

            for (const node of nodes) {
                const nodeConfig = (node.config as any) || {};
                const nodeType = (nodeConfig.rfType || nodeConfig.originalType || node.type || '').toLowerCase();
                const explicitType = nodeConfig.integrationId;

                if (explicitType) integrationTypes.add(explicitType);

                // Check common service types in node type strings
                if (nodeType.includes('google') || nodeType.includes('sheet')) integrationTypes.add('google_sheets');
                if (nodeType.includes('gemini') || nodeType.includes('ai_agent')) integrationTypes.add('google_gemini');
                if (nodeType.includes('telegram')) integrationTypes.add('telegram');
                if (nodeType.includes('discord')) integrationTypes.add('discord');
                if (nodeType.includes('slack')) integrationTypes.add('slack');
                if (nodeType.includes('notion')) integrationTypes.add('notion');
            }
            requiredIntegrations = Array.from(integrationTypes);
        }

        // Flatten the structure for the frontend to make it easier to use
        const normalizedInstance = {
            ...instance,
            listing: {
                ...listing,
                workflow: {
                    ...workflow,
                    nodes,
                    edges
                }
            }
        };

        // 3. Fetch existing credentials
        const { data: credentials } = await supabase
            .from('consumer_credentials')
            .select('integration_key, is_valid, credential_data')
            .eq('instance_id', instance.id);

        // 4. Fetch User Integrations (global OAuth)
        const { data: userIntegrations } = await supabase
            .from('user_integrations')
            .select('provider, is_valid, account_email')
            .eq('user_id', user.id);

        return NextResponse.json({
            instance: normalizedInstance,
            requiredIntegrations,
            credentials: (credentials || []).map((c: { integration_key: string; is_valid: boolean; credential_data: unknown }) => ({
                ...c,
                credential_data: c.is_valid ? { value: '••••••••' } : c.credential_data,
            })),
            userIntegrations: userIntegrations || [],
        });
    } catch (error: unknown) {
        console.error('[INSTANCE DETAILS ERROR]', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
    }
}
