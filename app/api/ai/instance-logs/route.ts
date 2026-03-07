import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const instanceId = req.nextUrl.searchParams.get('instanceId');
        if (!instanceId) {
            return NextResponse.json({ error: 'Missing instanceId' }, { status: 400 });
        }

        // Fetch logs for this instance
        const { data: logs, error: logErr } = await supabase
            .from('consumer_run_logs')
            .select('*')
            .eq('instance_id', instanceId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (logErr) throw logErr;

        return NextResponse.json({ logs: logs || [] });

    } catch (error: any) {
        console.error('[INSTANCE LOGS ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch logs' }, { status: 500 });
    }
}
