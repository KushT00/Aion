import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch all listings by this creator
        const { data: listings, error: listingsErr } = await supabase
            .from('marketplace_listings')
            .select('*')
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false });

        if (listingsErr) throw listingsErr;

        // 2. Fetch total purchases for this creator's listings
        const listingIds = (listings || []).map(l => l.id);
        let purchases: any[] = [];
        let totalRevenue = 0;

        if (listingIds.length > 0) {
            const { data: purchaseData, error: purchaseErr } = await supabase
                .from('purchases')
                .select('*')
                .in('listing_id', listingIds);

            if (!purchaseErr && purchaseData) {
                purchases = purchaseData;
                totalRevenue = purchaseData.reduce((sum, p) => sum + (p.price_paid || 0), 0);
            }
        }

        // 3. Fetch workflow runs for this creator's workflows
        const { data: workflows } = await supabase
            .from('workflows')
            .select('id')
            .eq('user_id', user.id);

        const workflowIds = (workflows || []).map(w => w.id);
        let totalRuns = 0;

        if (workflowIds.length > 0) {
            const { count } = await supabase
                .from('workflow_runs')
                .select('id', { count: 'exact', head: true })
                .in('workflow_id', workflowIds);

            totalRuns = count || 0;
        }

        // 4. Active subscribers = unique buyers
        const uniqueBuyers = new Set(purchases.map(p => p.buyer_id));

        // 5. Top listings = listings sorted by revenue
        const listingRevenues = (listings || []).map(listing => {
            const listingPurchases = purchases.filter(p => p.listing_id === listing.id);
            return {
                id: listing.id,
                name: listing.title,
                sales: listingPurchases.length,
                revenue: listingPurchases.reduce((sum, p) => sum + (p.price_paid || 0), 0),
                rating: listing.rating_avg,
                active: listing.is_active,
                category: listing.category,
            };
        }).sort((a, b) => b.revenue - a.revenue);

        // 6. Recent purchases (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const recentPurchases = purchases.filter(p => p.created_at > sevenDaysAgo);
        const recentRevenue = recentPurchases.reduce((sum, p) => sum + (p.price_paid || 0), 0);

        return NextResponse.json({
            stats: {
                totalRevenue,           // in cents
                recentRevenue,          // last 7 days, in cents
                activeSubscribers: uniqueBuyers.size,
                totalRuns,
                totalListings: (listings || []).length,
                activeListings: (listings || []).filter(l => l.is_active).length,
                totalPurchases: purchases.length,
                recentPurchases: recentPurchases.length,
            },
            topListings: listingRevenues.slice(0, 5),
            allListings: listings || [],
        });
    } catch (error: any) {
        console.error('[CREATOR DASHBOARD ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
