import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { instanceId } = await req.json();
        if (!instanceId) {
            return NextResponse.json({ error: 'Missing instanceId' }, { status: 400 });
        }

        // Verify ownership
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id, status, buyer_id')
            .eq('id', instanceId)
            .eq('buyer_id', user.id)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        // Activate the instance
        const { error: updateErr } = await supabase
            .from('consumer_instances')
            .update({ status: 'active' })
            .eq('id', instanceId);

        if (updateErr) throw updateErr;

        return NextResponse.json({ success: true, status: 'active' });
    } catch (error: any) {
        console.error('[ACTIVATE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Activation failed' }, { status: 500 });
    }
}
