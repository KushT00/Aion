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
                    tags,
                    description,
                    nodes
                )
            `)
            .eq('id', id)
            .eq('is_active', true)
            .single();

        if (error || !listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        // Fetch reviews for this listing
        const { data: reviews } = await supabase
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

        // Fetch workflow nodes to auto-detect required integrations
        const workflowData = listing.workflow as any;
        const requiredIntegrations = new Set<string>();

        if (workflowData?.nodes) {
            const nodes = Array.isArray(workflowData.nodes)
                ? workflowData.nodes
                : (typeof workflowData.nodes === 'string' ? JSON.parse(workflowData.nodes) : []);

            for (const node of nodes) {
                const nodeType = (node.type || '').toLowerCase();
                const data = node.data || {};
                const explicitType = data.integrationType;

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
                Object.keys(data).forEach(k => {
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
            delete listing.workflow.nodes;
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
