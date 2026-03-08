import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/consumer/instances/[id]/analytics
 * Fetches ROI analytics for a specific consumer instance.
 * Returns aggregated metrics: leads generated, revenue attributed, tasks completed, time saved.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: instanceId } = await params;

        // Verify ownership + get instance stats
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id, total_runs, total_successes, total_failures, last_run_at, created_at')
            .eq('id', instanceId)
            .eq('buyer_id', user.id)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        // Fetch analytics metrics from consumer_analytics table
        const { data: analytics, error: analyticsErr } = await supabase
            .from('consumer_analytics')
            .select('*')
            .eq('instance_id', instanceId)
            .order('recorded_at', { ascending: false });

        // Even if the analytics table doesn't exist yet, we can compute from run logs
        const { data: recentLogs } = await supabase
            .from('consumer_run_logs')
            .select('status, duration_ms, created_at')
            .eq('instance_id', instanceId)
            .order('created_at', { ascending: false })
            .limit(100);

        // Compute derived metrics
        const totalRuns = instance.total_runs || 0;
        const successRate = totalRuns > 0
            ? Math.round(((instance.total_successes || 0) / totalRuns) * 100)
            : 0;

        // Estimate time saved: assume each successful run saves ~5 minutes of manual work
        const minutesSaved = (instance.total_successes || 0) * 5;
        const hoursSaved = (minutesSaved / 60).toFixed(1);

        // Group analytics by type
        const metricsByType: Record<string, number> = {};
        if (analytics) {
            for (const a of analytics) {
                metricsByType[a.metric_type] = (metricsByType[a.metric_type] || 0) + a.metric_value;
            }
        }

        // Runs per day (last 7 days)
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const dailyRuns: Record<string, { success: number; failed: number }> = {};

        for (let i = 0; i < 7; i++) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().split('T')[0];
            dailyRuns[key] = { success: 0, failed: 0 };
        }

        if (recentLogs) {
            for (const log of recentLogs) {
                const day = new Date(log.created_at).toISOString().split('T')[0];
                if (dailyRuns[day]) {
                    if (log.status === 'success') dailyRuns[day].success++;
                    else dailyRuns[day].failed++;
                }
            }
        }

        return NextResponse.json({
            summary: {
                totalRuns,
                successRate,
                hoursSaved,
                leadsGenerated: metricsByType['lead'] || 0,
                revenueAttributed: metricsByType['revenue'] || 0,
                tasksCompleted: metricsByType['task'] || instance.total_successes || 0,
            },
            dailyRuns,
            metrics: analytics || [],
            instance: {
                createdAt: instance.created_at,
                lastRunAt: instance.last_run_at,
            },
        });
    } catch (error: any) {
        console.error('[INSTANCE ANALYTICS ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
