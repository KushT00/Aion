import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { WorkflowRunner } from '@/lib/workflow/runner';
import { WorkflowNode, WorkflowEdge } from '@/types';

/**
 * POST /api/form/submit/[instanceId]
 * Public endpoint for Aion Forms to trigger a workflow.
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: instanceId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const supabase = createAdminClient();

    try {
        // 1. Fetch the Instance and its Workflow
        const { data: instance, error: instError } = await supabase
            .from('consumer_instances')
            .select(`
                *,
                workflow:workflows (
                    id,
                    user_id,
                    nodes:workflow_nodes (*),
                    edges:workflow_edges (*)
                )
            `)
            .eq('id', instanceId)
            .single();

        if (instError || !instance) {
            return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });
        }

        if (instance.status === 'paused') {
            return NextResponse.json({ error: 'Automation is paused' }, { status: 403 });
        }

        const workflow = instance.workflow as any;
        const nodes = workflow.nodes as WorkflowNode[];
        const edges = workflow.edges as WorkflowEdge[];

        // 2. Validation: Ensure the workflow HAS a form_trigger node
        // This prevents this public endpoint from being used to trigger random workflows
        const hasFormTrigger = nodes.some((n: any) => n.data?.config?.integrationId === 'form_trigger');
        if (!hasFormTrigger) {
            return NextResponse.json({ error: 'This automation does not support form submissions' }, { status: 400 });
        }

        // 3. Prepare Environment
        const env = {
            ...process.env as Record<string, string>,
            ...(instance.credentials as Record<string, string> || {}),
        };

        // 4. Create Run Record
        const { data: run, error: runError } = await supabase
            .from('workflow_runs')
            .insert({
                workflow_id: workflow.id,
                user_id: instance.buyer_id, // Attributed to the buyer
                status: 'running',
                started_at: new Date().toISOString(),
                // metadata: { instance_id: instanceId, source: 'form_submit' }
            })
            .select()
            .single();

        if (runError) throw runError;

        // 5. Execute Runner (Non-blocking usually best for forms, but we can wait for a few seconds)
        const runner = new WorkflowRunner(nodes, edges, env, instanceId);

        // We execute and return success immediately to the client
        // The runner handles the actual logic
        runner.execute(body)
            .then(async (results) => {
                // 5.1 Persist Captured CRM Results
                const captured = runner.getCapturedResults();
                const resultsToInsert = captured.map(c => ({
                    instance_id: instanceId,
                    buyer_id: instance.buyer_id,
                    workflow_id: workflow.id,
                    run_id: run.id,
                    result_type: c.result_type,
                    title: c.title,
                    data: c.data,
                    tags: c.tags,
                    metadata: c.metadata,
                    created_at: c.captured_at
                }));

                // If no explicit CRM capture nodes, save the trigger data itself as a lead
                if (resultsToInsert.length === 0) {
                    resultsToInsert.push({
                        instance_id: instanceId,
                        buyer_id: instance.buyer_id,
                        workflow_id: workflow.id,
                        run_id: run.id,
                        result_type: 'form_submission',
                        title: `Form Submission — ${new Date().toLocaleDateString()}`,
                        data: body,
                        tags: ['form'],
                        metadata: { source: 'aion_form' },
                        created_at: new Date().toISOString()
                    });
                }

                await supabase.from('consumer_results').insert(resultsToInsert);

                // Update Run Record on success
                await supabase.from('workflow_runs').update({
                    status: 'success',
                    completed_at: new Date().toISOString(),
                    output: results,
                    logs: JSON.stringify(runner.getLogs())
                }).eq('id', run.id);

                await supabase.rpc('increment_instance_runs', {
                    inst_id: instanceId,
                    is_success: true
                });
            })
            .catch(async (execErr: any) => {
                await supabase.from('workflow_runs').update({
                    status: 'failed',
                    completed_at: new Date().toISOString(),
                    error: execErr.message,
                    logs: JSON.stringify(runner.getLogs())
                }).eq('id', run.id);

                await supabase.rpc('increment_instance_runs', {
                    inst_id: instanceId,
                    is_success: false
                });
            });

        return NextResponse.json({
            success: true,
            message: 'Submission received',
            runId: run.id
        });

    } catch (err: any) {
        console.error('[FORM SUBMIT ERROR]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
