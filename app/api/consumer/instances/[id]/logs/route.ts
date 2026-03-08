import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/consumer/instances/[id]/logs
 * Fetches run logs for a specific consumer instance.
 * Supports pagination via ?page=1&limit=20 and filtering via ?status=success|failed
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
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const statusFilter = searchParams.get('status'); // 'success' | 'failed' | null
        const offset = (page - 1) * limit;

        // Verify ownership
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id')
            .eq('id', instanceId)
            .eq('buyer_id', user.id)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        // Build query
        let query = supabase
            .from('consumer_run_logs')
            .select('*', { count: 'exact' })
            .eq('instance_id', instanceId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (statusFilter && ['success', 'failed'].includes(statusFilter)) {
            query = query.eq('status', statusFilter);
        }

        const { data: logs, error: logErr, count } = await query;

        if (logErr) throw logErr;

        return NextResponse.json({
            logs: logs || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (error: any) {
        console.error('[INSTANCE LOGS ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch logs' },
            { status: 500 }
        );
    }
}
