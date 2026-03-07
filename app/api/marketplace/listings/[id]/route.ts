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
        const { data: nodes } = await supabase
            .from('workflow_nodes')
            .select('config')
            .eq('workflow_id', listing.workflow?.id);

        // Extract unique integration IDs from node configs
        const requiredIntegrations = new Set<string>();
        if (nodes) {
            for (const node of nodes) {
                const config = node.config as any;
                if (config?.integrationId) {
                    requiredIntegrations.add(config.integrationId);
                }
            }
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
