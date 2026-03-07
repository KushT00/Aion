import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { InstanceRunner } from '@/lib/workflow/instance-runner';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { instanceId, triggerData } = await req.json();

        if (!instanceId) {
            return NextResponse.json({ error: 'Missing instanceId' }, { status: 400 });
        }

        const runner = new InstanceRunner(instanceId, user.id);
        const result = await runner.run(triggerData || {});

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Workflow executed successfully',
                outputs: result.outputs,
                logs: result.logs
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error || 'Workflow execution failed',
                logs: result.logs
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[RUN INSTANCE API ERROR]', error);
        return NextResponse.json({ error: error.message || 'Workflow Execution Failed' }, { status: 500 });
    }
}
