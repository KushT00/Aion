import { createClient } from '@/lib/supabase/server';
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

        console.log(`[DEBUG] Fetching instance with ID: ${instanceId} for user: ${user.id}`);

        // 1. Fetch instance. Use OR to check if the ID provided might be a purchase_id by accident
        // This makes the API more robust to ID swaps between purchase and instance
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select(`
                id, status, pricing_tier, buyer_id, created_at, workflow_id,
                listing:marketplace_listings (
                    id, title, description, category
                ),
                workflow:workflows!consumer_instances_workflow_id_fkey ( 
                    id, name,
                    nodes:workflow_nodes (id, type, label, position_x, position_y, config),
                    edges:workflow_edges (id, source_node_id, target_node_id, label)
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

        // 2. Get workflow nodes to determine required integrations
        const listing = instance.listing as any;
        const rawWorkflow = (instance as any).workflow;

        // Handle Supabase returning array for joins
        const workflow = Array.isArray(rawWorkflow) ? rawWorkflow[0] : rawWorkflow;
        const nodes = workflow?.nodes || [];
        const edges = workflow?.edges || [];

        let requiredIntegrations: string[] = [];

        if (nodes.length > 0) {
            const integrationTypes = new Set<string>();

            for (const node of nodes) {
                const nodeType = (node.type || '').toLowerCase();
                const config = node.config || {};
                const data = config.data || {};
                const explicitType = config.integrationId;

                if (explicitType) integrationTypes.add(explicitType);

                // Check common service types in node type strings
                if (nodeType.includes('google') || nodeType.includes('sheet')) integrationTypes.add('google_sheets');
                if (nodeType.includes('gemini')) integrationTypes.add('google_gemini');
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

        return NextResponse.json({
            instance: normalizedInstance,
            requiredIntegrations,
            credentials: (credentials || []).map(c => ({
                ...c,
                credential_data: c.is_valid ? { value: '••••••••' } : c.credential_data,
            })),
        });
    } catch (error: any) {
        console.error('[INSTANCE DETAILS ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
    }
}
