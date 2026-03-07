import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { instanceId, nodeId, property, value } = await req.json();

        if (!instanceId || !nodeId || !property) {
            return NextResponse.json({ error: 'Missing required configuration fields' }, { status: 400 });
        }

        // 1. Fetch current instance with its overrides
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id, config_overrides, buyer_id')
            .eq('id', instanceId)
            .eq('buyer_id', user.id)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        // 2. Clear old override if it's identical, or update it
        const currentOverrides = instance.config_overrides || {};
        const key = `${nodeId}.${property}`;

        const nextOverrides = {
            ...currentOverrides,
            [key]: value
        };

        // 3. Save back to database
        const { error: updateErr } = await supabase
            .from('consumer_instances')
            .update({ config_overrides: nextOverrides })
            .eq('id', instanceId);

        if (updateErr) throw updateErr;

        return NextResponse.json({ success: true, overrides: nextOverrides });
    } catch (error: any) {
        console.error('[SANDBOX SAVE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed to save configuration' }, { status: 500 });
    }
}
