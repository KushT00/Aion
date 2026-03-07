import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Strategy: Always query purchases and LEFT JOIN to consumer_instances
        // This way we always show what the user bought, with instance data if available
        const { data: purchases, error: purchaseErr } = await supabase
            .from('purchases')
            .select(`
                id,
                created_at,
                pricing_tier,
                listing:marketplace_listings (
                    id,
                    title,
                    description,
                    category,
                    seller:profiles (
                        full_name
                    ),
                    workflow:workflows (
                        id,
                        name,
                        status
                    )
                )
            `)
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false });

        if (purchaseErr) throw purchaseErr;

        // Now fetch instances for these purchases
        const purchaseIds = (purchases || []).map(p => p.id);
        let instanceMap: Record<string, any> = {};

        if (purchaseIds.length > 0) {
            const { data: instances } = await supabase
                .from('consumer_instances')
                .select('id, purchase_id, status, pricing_tier, total_runs, total_successes, total_failures, last_run_at')
                .in('purchase_id', purchaseIds);

            if (instances) {
                for (const inst of instances) {
                    instanceMap[inst.purchase_id] = inst;
                }
            }
        }

        // Merge: for each purchase, attach instance data if it exists
        const automations = (purchases || []).map(p => {
            const inst = instanceMap[p.id];
            return {
                purchaseId: p.id,
                instanceId: inst?.id || null,
                status: inst?.status || 'setup_required',
                pricing_tier: inst?.pricing_tier || p.pricing_tier || 'byok',
                total_runs: inst?.total_runs || 0,
                total_successes: inst?.total_successes || 0,
                total_failures: inst?.total_failures || 0,
                last_run_at: inst?.last_run_at || null,
                created_at: p.created_at,
                listing: p.listing,
            };
        });

        return NextResponse.json({ automations });
    } catch (error: any) {
        console.error('[MY AUTOMATIONS ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch your automations' },
            { status: 500 }
        );
    }
}
