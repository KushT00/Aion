import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/consumer/instances/[id]/results
 * Fetches CRM results for a specific consumer instance.
 * 
 * Query Params:
 *   - type: filter by result_type (lead, data, task, proposal, custom)
 *   - status: filter by status (new, processing, processed, archived)
 *   - search: search within title or data (JSONB)
 *   - limit: max results (default 50)
 *   - offset: pagination offset (default 0)
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: instanceId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify the user owns this instance
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id, buyer_id')
            .eq('id', instanceId)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        if (instance.buyer_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Parse query params (clamped to safe ranges)
        const url = new URL(req.url);
        const type = url.searchParams.get('type');
        const status = url.searchParams.get('status');
        const search = url.searchParams.get('search');
        const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50') || 50, 1), 100);
        const offset = Math.max(parseInt(url.searchParams.get('offset') || '0') || 0, 0);

        // Build query
        let query = supabase
            .from('consumer_results')
            .select('*', { count: 'exact' })
            .eq('instance_id', instanceId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) query = query.eq('result_type', type);
        if (status) query = query.eq('status', status);
        if (search) {
            // Strip PostgREST filter control chars to keep the `or()` filter well-formed
            const safe = search.replace(/[,()]/g, '').slice(0, 100);
            if (safe) query = query.or(`title.ilike.%${safe}%,data->>text.ilike.%${safe}%`);
        }

        const { data: results, error: resultsErr, count } = await query;

        if (resultsErr) throw resultsErr;

        // Aggregate stats for this instance
        const { data: stats } = await supabase
            .from('consumer_results')
            .select('result_type, status')
            .eq('instance_id', instanceId);

        const aggregates = {
            total: stats?.length || 0,
            byType: {} as Record<string, number>,
            byStatus: {} as Record<string, number>,
        };

        stats?.forEach(r => {
            aggregates.byType[r.result_type] = (aggregates.byType[r.result_type] || 0) + 1;
            aggregates.byStatus[r.status] = (aggregates.byStatus[r.status] || 0) + 1;
        });

        return NextResponse.json({
            results: results || [],
            count: count || 0,
            aggregates,
            pagination: {
                limit,
                offset,
                hasMore: (count || 0) > offset + limit,
            },
        });
    } catch (error: any) {
        console.error('[CONSUMER RESULTS GET ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch results' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/consumer/instances/[id]/results
 * Saves one or more CRM results for a consumer instance.
 * Called by the workflow runner after execution.
 * 
 * Body: { results: CapturedResult[] } or a single CapturedResult
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: instanceId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify the caller owns this instance before accepting rows for it
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id, buyer_id')
            .eq('id', instanceId)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        if (instance.buyer_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json().catch(() => null);
        if (!body || (typeof body !== 'object')) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        // Accept both single result and array
        const results = Array.isArray(body.results) ? body.results : [body];

        if (results.length === 0 || results.length > 100) {
            return NextResponse.json({ error: 'Provide between 1 and 100 results' }, { status: 400 });
        }

        const rows = results.map((r: unknown) => {
            const rec = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
            const tags = Array.isArray(rec.tags)
                ? rec.tags.filter((t: unknown): t is string => typeof t === 'string').slice(0, 20)
                : [];
            return {
                instance_id: instanceId,
                run_log_id: typeof rec.run_log_id === 'string' ? rec.run_log_id : null,
                result_type: typeof rec.result_type === 'string' ? rec.result_type.slice(0, 50) : 'custom',
                title: typeof rec.title === 'string' ? rec.title.slice(0, 200) : 'Untitled Result',
                data: (rec.data && typeof rec.data === 'object') ? rec.data : {},
                tags,
                status: 'new',
                metadata: (rec.metadata && typeof rec.metadata === 'object') ? rec.metadata : {},
            };
        });

        const { data: inserted, error: insertErr } = await supabase
            .from('consumer_results')
            .insert(rows)
            .select();

        if (insertErr) throw insertErr;

        return NextResponse.json({
            success: true,
            count: inserted?.length || 0,
            results: inserted,
        });
    } catch (error: any) {
        console.error('[CONSUMER RESULTS POST ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to save results' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/consumer/instances/[id]/results
 * Updates a result's status or tags.
 * 
 * Body: { resultId: string, status?: string, tags?: string[] }
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: instanceId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => null);
        const { resultId, status, tags } = body ?? {};

        if (!resultId || typeof resultId !== 'string') {
            return NextResponse.json({ error: 'resultId is required' }, { status: 400 });
        }

        const ALLOWED_STATUSES = ['new', 'processing', 'processed', 'archived'];
        const updates: Record<string, unknown> = {};
        if (status !== undefined) {
            if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
                return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            }
            updates.status = status;
        }
        if (tags !== undefined) {
            if (!Array.isArray(tags) || !tags.every((t) => typeof t === 'string')) {
                return NextResponse.json({ error: 'Invalid tags' }, { status: 400 });
            }
            updates.tags = tags.slice(0, 20);
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
        }

        // Verify the caller owns the instance this result belongs to
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id, buyer_id')
            .eq('id', instanceId)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        if (instance.buyer_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data: updated, error: updateErr } = await supabase
            .from('consumer_results')
            .update(updates)
            .eq('id', resultId)
            .eq('instance_id', instanceId)
            .select()
            .single();

        if (updateErr) throw updateErr;

        return NextResponse.json({ success: true, result: updated });
    } catch (error: any) {
        console.error('[CONSUMER RESULTS PATCH ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update result' },
            { status: 500 }
        );
    }
}
