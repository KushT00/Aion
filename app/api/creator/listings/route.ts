import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all listings by this seller with their workflow name
        const { data: listings, error: listingsErr } = await supabase
            .from('marketplace_listings')
            .select(`
                *,
                workflow:workflows!marketplace_listings_workflow_id_fkey (
                    id,
                    name,
                    status
                )
            `)
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false });

        if (listingsErr) throw listingsErr;

        // Fetch purchase counts and revenue per listing for this creator
        const listingIds = (listings || []).map(l => l.id);
        let listingStats: Record<string, { sales: number; revenue: number }> = {};

        if (listingIds.length > 0) {
            const { data: purchases } = await supabase
                .from('purchases')
                .select('listing_id, price_paid')
                .in('listing_id', listingIds);

            if (purchases) {
                purchases.forEach(p => {
                    if (!listingStats[p.listing_id]) {
                        listingStats[p.listing_id] = { sales: 0, revenue: 0 };
                    }
                    listingStats[p.listing_id].sales += 1;
                    listingStats[p.listing_id].revenue += (p.price_paid || 0);
                });
            }
        }

        // Combine data
        const enrichedListings = (listings || []).map(listing => ({
            ...listing,
            sales: listingStats[listing.id]?.sales || 0,
            revenue: listingStats[listing.id]?.revenue || 0,
        }));

        return NextResponse.json({ listings: enrichedListings });
    } catch (error: any) {
        console.error('[CREATOR LISTINGS ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch listings' },
            { status: 500 }
        );
    }
}
