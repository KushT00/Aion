import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/consumer/instances/[id]/toggle
 * Toggles an instance between 'active' and 'paused' states.
 * Body: { action: 'pause' | 'resume' }  (optional — toggles if not specified)
 */
export async function POST(
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
        const body = await req.json().catch(() => ({}));
        const requestedAction = body.action; // 'pause' | 'resume' | undefined

        // Fetch current instance
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id, status, buyer_id')
            .eq('id', instanceId)
            .eq('buyer_id', user.id)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        // Can only toggle between active <-> paused
        if (instance.status === 'setup_required') {
            return NextResponse.json(
                { error: 'Instance requires setup before it can be activated. Complete the API key setup first.' },
                { status: 400 }
            );
        }

        if (instance.status === 'error' && requestedAction !== 'resume') {
            return NextResponse.json(
                { error: 'Instance is in error state. Use action "resume" to attempt recovery.' },
                { status: 400 }
            );
        }

        // Determine new status
        let newStatus: string;
        if (requestedAction === 'pause') {
            newStatus = 'paused';
        } else if (requestedAction === 'resume') {
            newStatus = 'active';
        } else {
            // Toggle
            newStatus = instance.status === 'active' ? 'paused' : 'active';
        }

        const { error: updateErr } = await supabase
            .from('consumer_instances')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', instanceId);

        if (updateErr) throw updateErr;

        return NextResponse.json({
            success: true,
            previousStatus: instance.status,
            newStatus,
            message: newStatus === 'active'
                ? 'Instance resumed — your automation is live!'
                : 'Instance paused — no further executions until resumed.',
        });
    } catch (error: any) {
        console.error('[INSTANCE TOGGLE ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to toggle instance' },
            { status: 500 }
        );
    }
}
