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
                    id, title, description, category,
                    workflow:workflows ( id, name, nodes, edges )
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
        const workflowData = listing?.workflow;
        let requiredIntegrations: string[] = [];

        if (workflowData?.nodes) {
            const nodes = Array.isArray(workflowData.nodes)
                ? workflowData.nodes
                : (typeof workflowData.nodes === 'string' ? JSON.parse(workflowData.nodes) : []);

            const integrationTypes = new Set<string>();

            for (const node of nodes) {
                const nodeType = (node.type || '').toLowerCase();
                const data = node.data || {};
                const explicitType = data.integrationType;

                if (explicitType) integrationTypes.add(explicitType);

                // Check common service types
                if (nodeType.includes('google') || nodeType.includes('sheet')) integrationTypes.add('google_sheets');
                if (nodeType.includes('gemini')) integrationTypes.add('google_gemini');
                if (nodeType.includes('telegram')) integrationTypes.add('telegram');
                if (nodeType.includes('discord')) integrationTypes.add('discord');
                if (nodeType.includes('slack')) integrationTypes.add('slack');
                if (nodeType.includes('notion')) integrationTypes.add('notion');
                if (nodeType.includes('groq')) integrationTypes.add('groq');
                if (nodeType.includes('openai')) integrationTypes.add('openai');
                if (nodeType.includes('anthropic')) integrationTypes.add('anthropic');

                // Scan for ANY api key fields or labeled fields
                Object.keys(data).forEach(k => {
                    const low = k.toLowerCase();
                    if (low.includes('apikey') || low.includes('token') || low.includes('credential')) {
                        if (nodeType.includes('openai')) integrationTypes.add('openai');
                        if (nodeType.includes('anthropic')) integrationTypes.add('anthropic');
                        if (nodeType.includes('groq')) integrationTypes.add('groq');
                        if (nodeType.includes('telegram')) integrationTypes.add('telegram');
                    }
                });
            }
            requiredIntegrations = Array.from(integrationTypes);
        }

        // 3. Fetch existing credentials
        const { data: credentials } = await supabase
            .from('consumer_credentials')
            .select('integration_key, is_valid, credential_data')
            .eq('instance_id', instance.id); // Fixed: ensure we use the actual DB ID

        return NextResponse.json({
            instance,
            requiredIntegrations,
            credentials: (credentials || []).map(c => ({
                ...c,
                // Mask the actual credential value for security
                credential_data: c.is_valid ? { value: '••••••••' } : c.credential_data,
            })),
        });
    } catch (error: any) {
        console.error('[INSTANCE DETAILS ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
    }
}
