import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { WorkflowRunner } from '@/lib/workflow/runner';
import { WorkflowNode, WorkflowEdge } from '@/types';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ workflowId: string; nodeId: string }> }
) {
    console.log("📍 [GENERIC ROUTE] POST BEGIN");
    const { workflowId, nodeId } = await context.params;
    const supabase = createAdminClient();

    try {
        // 1. Fetch the workflow and the specific trigger node
        const { data: workflow, error: wfError } = await supabase
            .from('workflows')
            .select('user_id')
            .eq('id', workflowId)
            .single();

        if (wfError || !workflow) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }

        const { data: node, error: nodeError } = await supabase
            .from('workflow_nodes')
            .select('*')
            .eq('id', nodeId)
            .eq('workflow_id', workflowId)
            .single();

        if (nodeError || !node) {
            return NextResponse.json({ error: 'Trigger node not found' }, { status: 404 });
        }

        // 2. Fetch all nodes and edges for this workflow to build the execution graph
        const [nodesRes, edgesRes] = await Promise.all([
            supabase.from('workflow_nodes').select('*').eq('workflow_id', workflowId),
            supabase.from('workflow_edges').select('*').eq('workflow_id', workflowId)
        ]);

        if (nodesRes.error || edgesRes.error) {
            return NextResponse.json({ error: 'Failed to load workflow data' }, { status: 500 });
        }

        const nodes = nodesRes.data as WorkflowNode[];
        const edges = edgesRes.data as WorkflowEdge[];

        // 3. Get incoming data (collect any random JSON structure)
        const triggerData = await request.json().catch(() => ({}));

        // 4. Create a run record in Supabase
        const { data: run, error: runError } = await supabase
            .from('workflow_runs')
            .insert({
                workflow_id: workflowId,
                user_id: workflow.user_id,
                status: 'running',
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (runError) {
            return NextResponse.json({ error: 'Failed to create run record' }, { status: 500 });
        }

        // 5. Execute runner (await it to ensure DB update happens before response)
        const runner = new WorkflowRunner(nodes, edges, process.env as Record<string, string>);
        console.log(`🚀 [WEBHOOK] Starting execution for run ${run.id}...`);

        try {
            const results = await runner.execute(triggerData);
            console.log(`✅ [WEBHOOK] Execution complete for run ${run.id}. Updating DB...`);

            // 6. Save results with log fallback
            console.log(`📡 [WEBHOOK] Saving results for run ${run.id}...`);
            const updatePayload: any = {
                status: 'success',
                completed_at: new Date().toISOString(),
                output: results,
                logs: JSON.stringify(runner.getLogs())
            };

            const { error: updateError } = await supabase.from('workflow_runs').update(updatePayload).eq('id', run.id);

            if (updateError) {
                if (updateError.message.includes("'logs' column")) {
                    console.warn(`⚠️ [WEBHOOK] 'logs' column missing. Retrying update without logs...`);
                    delete updatePayload.logs;
                    await supabase.from('workflow_runs').update(updatePayload).eq('id', run.id);
                } else {
                    console.error(`❌ [WEBHOOK] Update error:`, updateError);
                }
            } else {
                console.log(`🎊 [WEBHOOK] Run ${run.id} marked as success.`);
            }

            return NextResponse.json({
                message: 'Workflow executed successfully.',
                runId: run.id,
                output: results
            });

        } catch (err: any) {
            console.error(`❌ [WEBHOOK] Execution FAILED for run ${run.id}:`, err);
            const errorPayload: any = {
                status: 'failed',
                completed_at: new Date().toISOString(),
                error: err.message,
                logs: JSON.stringify(runner.getLogs())
            };

            const { error: failedUpdateError } = await supabase.from('workflow_runs').update(errorPayload).eq('id', run.id);

            if (failedUpdateError && failedUpdateError.message.includes("'logs' column")) {
                delete errorPayload.logs;
                await supabase.from('workflow_runs').update(errorPayload).eq('id', run.id);
            }

            return NextResponse.json({
                error: 'Workflow execution failed',
                message: err.message,
                runId: run.id
            }, { status: 500 });
        }
    } catch (outerErr: any) {
        console.error('Outer Webhook error:', outerErr);
        return NextResponse.json({ error: outerErr.message }, { status: 500 });
    }
}

// Support GET for simple testing
export async function GET() {
    return NextResponse.json({ message: 'Webhook endpoint active. Send a POST request to trigger.' });
}