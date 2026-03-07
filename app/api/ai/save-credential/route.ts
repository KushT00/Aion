import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { instanceId, integrationKey, value } = await req.json();

        if (!instanceId || !integrationKey || !value) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Verify ownership
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id')
            .eq('id', instanceId)
            .eq('buyer_id', user.id)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        // 2. Upsert the credential
        const { error: upsertErr } = await supabase
            .from('consumer_credentials')
            .upsert({
                instance_id: instanceId,
                integration_key: integrationKey,
                credential_data: { value: value.trim() },
                is_valid: true,
                validated_at: new Date().toISOString(),
            }, {
                onConflict: 'instance_id,integration_key',
            });

        if (upsertErr) throw upsertErr;

        return NextResponse.json({ success: true, message: 'Credential saved securely' });
    } catch (error: any) {
        console.error('[SAVE CREDENTIAL ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed to save credential' }, { status: 500 });
    }
}
