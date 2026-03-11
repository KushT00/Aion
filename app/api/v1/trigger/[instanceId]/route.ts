import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateApiKey } from '@/lib/auth/api-keys';
import { WorkflowRunner } from '@/lib/workflow/runner';
import { WorkflowNode, WorkflowEdge } from '@/types';

/**
 * POST /api/v1/trigger/[instanceId]
 * central entry point for external integrations to trigger a consumer automation.
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ instanceId: string }> }
) {
    const { instanceId } = await context.params;
    const body = await request.json().catch(() => ({}));

    // 1. Validate API Key
    const userId = await validateApiKey(request);
    if (!userId) {
        return NextResponse.json({ error: 'Invalid or missing API Key' }, { status: 401 });
    }

    const supabase = createAdminClient();

    try {
        // 2. Fetch the Consumer Instance
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
            .eq('buyer_id', userId) // Security: Ensure requester owns this instance
            .single();

        if (instError || !instance) {
            return NextResponse.json({ error: 'Automation instance not found or unauthorized' }, { status: 404 });
        }

        if (instance.status === 'paused') {
            return NextResponse.json({ error: 'Automation is paused' }, { status: 403 });
        }

        const workflow = instance.workflow as any;
        const nodes = workflow.nodes as WorkflowNode[];
        const edges = workflow.edges as WorkflowEdge[];

        // 3. Prepare Environment (Consumer Credentials + Global Env)
        const env = {
            ...process.env as Record<string, string>,
            ...(instance.credentials as Record<string, string> || {}),
        };

        // 4. Create Run Record
        const { data: run, error: runError } = await supabase
            .from('workflow_runs')
            .insert({
                workflow_id: workflow.id,
                user_id: userId,
                status: 'running',
                started_at: new Date().toISOString(),
                // metadata: { instance_id: instanceId, source: 'api_v1' }
            })
            .select()
            .single();

        if (runError) throw runError;

        // 5. Execute Runner
        const runner = new WorkflowRunner(nodes, edges, env, instanceId);

        // Non-blocking execution vs Blocking
        // For API integrations, we usually want blocking so they get the result
        try {
            const results = await runner.execute(body);

            // 5.1 Persist Captured CRM Results
            const captured = runner.getCapturedResults();
            if (captured.length > 0) {
                const resultsToInsert = captured.map(c => ({
                    instance_id: instanceId,
                    buyer_id: userId,
                    workflow_id: workflow.id,
                    run_id: run.id,
                    result_type: c.result_type,
                    title: c.title,
                    data: c.data,
                    tags: c.tags,
                    metadata: c.metadata,
                    created_at: c.captured_at
                }));

                await supabase.from('consumer_results').insert(resultsToInsert);
            }

            // Update Run Record on success
            await supabase.from('workflow_runs').update({
                status: 'success',
                completed_at: new Date().toISOString(),
                output: results,
                logs: JSON.stringify(runner.getLogs())
            }).eq('id', run.id);

            // Update Instance stats
            await supabase.rpc('increment_instance_runs', {
                inst_id: instanceId,
                is_success: true
            });

            return NextResponse.json({
                success: true,
                runId: run.id,
                output: results,
                capturedResults: captured.length
            });

        } catch (execErr: any) {
            // Update Run Record on failure
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

            return NextResponse.json({
                success: false,
                runId: run.id,
                error: execErr.message
            }, { status: 500 });
        }

    } catch (err: any) {
        console.error('[API V1 TRIGGER ERROR]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
