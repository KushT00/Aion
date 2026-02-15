import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WorkflowRunner } from '@/lib/workflow/runner';
import { WorkflowNode, WorkflowEdge } from '@/types';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ workflowId: string; nodeId: string }> }
) {
    const { workflowId, nodeId } = await context.params;
    const supabase = await createClient();

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

        // 5. Execute runner asynchronously (background)
        // Note: In a production environment, you should use a background job queue (e.g. Inngest, Upstash QStash)
        // For this implementation, we will perform the execution and update Supabase.

        const runner = new WorkflowRunner(nodes, edges);

        // Use a non-blocking execution block
        (async () => {
            try {
                const results = await runner.execute(triggerData);

                await supabase.from('workflow_runs').update({
                    status: 'success',
                    completed_at: new Date().toISOString(),
                    output: results,
                    logs: 'Workflow executed successfully from Webhook.'
                }).eq('id', run.id);
            } catch (err: any) {
                console.error('Webhook execution error:', err);
                await supabase.from('workflow_runs').update({
                    status: 'failed',
                    completed_at: new Date().toISOString(),
                    error: err.message,
                    logs: `Execution failed: ${err.message}`
                }).eq('id', run.id);
            }
        })();

        // 6. Respond immediately to the webhook sender
        return NextResponse.json({
            message: 'Webhook received. Workflow execution started.',
            runId: run.id
        }, { status: 202 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Support GET for simple testing
export async function GET() {
    return NextResponse.json({ message: 'Webhook endpoint active. Send a POST request to trigger.' });
}
