import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/consumer/instances
 * Lists all consumer instances for the logged-in user with aggregated stats.
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all instances with listing details
        const { data: instances, error: instErr } = await supabase
            .from('consumer_instances')
            .select(`
                id, status, pricing_tier, total_runs, total_successes, total_failures,
                last_run_at, created_at, updated_at,
                listing:marketplace_listings (
                    id, title, description, category, price, currency,
                    seller:profiles ( id, full_name, avatar_url ),
                    workflow:workflows ( id, name, status )
                )
            `)
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false });

        if (instErr) throw instErr;

        // Compute aggregate stats
        const totalInstances = instances?.length || 0;
        const activeCount = instances?.filter(i => i.status === 'active').length || 0;
        const totalRuns = instances?.reduce((sum, i) => sum + (i.total_runs || 0), 0) || 0;
        const totalSuccesses = instances?.reduce((sum, i) => sum + (i.total_successes || 0), 0) || 0;
        const totalFailures = instances?.reduce((sum, i) => sum + (i.total_failures || 0), 0) || 0;
        const successRate = totalRuns > 0 ? Math.round((totalSuccesses / totalRuns) * 100) : 0;

        return NextResponse.json({
            instances: instances || [],
            stats: {
                totalInstances,
                activeCount,
                totalRuns,
                totalSuccesses,
                totalFailures,
                successRate,
            },
        });
    } catch (error: any) {
        console.error('[CONSUMER INSTANCES ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch instances' },
            { status: 500 }
        );
    }
}
