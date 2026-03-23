import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { id } = await params;

        // Fetch listing with seller profile, workflow details, and reviews
        const { data: listing, error } = await supabase
            .from('marketplace_listings')
            .select(`
                *,
                seller:profiles!marketplace_listings_seller_id_fkey (
                    id,
                    full_name,
                    avatar_url,
                    email,
                    bio
                ),
                workflow:workflows!marketplace_listings_workflow_id_fkey (
                    id,
                    name,
                    tags,
                    description
                )
            `)
            .eq('id', id)
            .eq('is_active', true)
            .single();

        if (error || !listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        // Fetch workflow nodes and edges using adminDb for the Marketplace preview/summary
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminDb = createAdminClient();
        const { data: nodesData } = await adminDb
            .from('workflow_nodes')
            .select('id, type, label, position_x, position_y, config')
            .eq('workflow_id', (listing as any).workflow_id);

        const { data: edgesData } = await adminDb
            .from('workflow_edges')
            .select('*')
            .eq('workflow_id', (listing as any).workflow_id);

        const nodes = nodesData || [];
        const edges = edgesData || [];

        const workflowData = {
            ...((listing.workflow as any) || {}),
            nodes,
            edges
        };
        (listing as any).workflow = workflowData;

        // Fetch reviews for this listing
        const { data: reviewsData } = await supabase
            .from('ratings')
            .select(`
                *,
                user:profiles!ratings_user_id_fkey (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .eq('listing_id', id)
            .order('created_at', { ascending: false })
            .limit(20);

        const reviews = reviewsData || [];

        // Fetch workflow nodes to auto-detect required integrations
        const requiredIntegrations = new Set<string>();

        if (nodes.length > 0) {
            for (const node of nodes) {
                const nodeType = (node.type || '').toLowerCase();
                const config = (node.config as any) || {};
                const explicitType = config.integrationType || config.integrationId;

                if (explicitType) requiredIntegrations.add(explicitType);

                // Check common service types
                if (nodeType.includes('google') || nodeType.includes('sheet')) requiredIntegrations.add('google_sheets');
                if (nodeType.includes('gemini')) requiredIntegrations.add('google_gemini');
                if (nodeType.includes('telegram')) requiredIntegrations.add('telegram');
                if (nodeType.includes('discord')) requiredIntegrations.add('discord');
                if (nodeType.includes('slack')) requiredIntegrations.add('slack');
                if (nodeType.includes('notion')) requiredIntegrations.add('notion');
                if (nodeType.includes('groq')) requiredIntegrations.add('groq');
                if (nodeType.includes('openai')) requiredIntegrations.add('openai');
                if (nodeType.includes('anthropic')) requiredIntegrations.add('anthropic');

                // Scan for ANY api key fields or labeled fields
                Object.keys(config).forEach(k => {
                    const low = k.toLowerCase();
                    if (low.includes('apikey') || low.includes('token') || low.includes('credential')) {
                        if (nodeType.includes('openai')) requiredIntegrations.add('openai');
                        if (nodeType.includes('anthropic')) requiredIntegrations.add('anthropic');
                        if (nodeType.includes('groq')) requiredIntegrations.add('groq');
                        if (nodeType.includes('telegram')) requiredIntegrations.add('telegram');
                    }
                });
            }
        }

        // Don't leak the workflow nodes payload to the public API
        if (listing.workflow) {
            delete (listing.workflow as any).nodes;
            delete (listing.workflow as any).edges;
        }

        // Check if the current user has already purchased this listing
        let hasPurchased = false;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: purchase } = await supabase
                .from('purchases')
                .select('id')
                .eq('listing_id', id)
                .eq('buyer_id', user.id)
                .maybeSingle();
            hasPurchased = !!purchase;
        }

        return NextResponse.json({
            listing,
            reviews: reviews || [],
            requiredIntegrations: Array.from(requiredIntegrations),
            hasPurchased,
        });
    } catch (error: any) {
        console.error('[LISTING DETAIL ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch listing' },
            { status: 500 }
        );
    }
}
