import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkflowRunner, type RunLog } from "@/lib/workflow/runner";
import { WorkflowEdge } from "@/types";
import fs from 'fs';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    console.log("📍 [TELEGRAM ROUTE] GET HIT");
    const { workflowId } = await params;
    return NextResponse.json({
        status: "active",
        message: "Telegram Webhook Active",
        workflowId
    });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    console.log("📍 [TELEGRAM ROUTE] POST BEGIN - CACHE BUSTER");
    const { workflowId } = await params;

    try {
        const body = await request.json().catch(() => ({}));
        console.log("████████████████████████████████████████");
        console.log("📥 TELEGRAM WEBHOOK RECEIVED!");
        console.log("UPDATE_ID:", body.update_id);
        console.log("MESSAGE:", body.message?.text);
        console.log("CHAT_ID:", body.message?.chat?.id);
        console.log("████████████████████████████████████████");
        const { message, update_id } = body;

        // 1. Validate Payload
        if (!message || !message.text) {
            return NextResponse.json({ ok: true, reason: "No text message found" });
        }

        // Trigger Condition: Ignore bots
        if (message.from.is_bot) {
            console.log("Skipping bot message");
            return NextResponse.json({ ok: true, reason: "Bot message ignored" });
        }

        console.log(`🚀 Webhook Trigger for Workflow: ${workflowId}`);
        console.log(`📩 Message from ${message.from.first_name}: ${message.text}`);

        const cleanWorkflowId = workflowId.trim();
        console.log(`🔎 LOOKING FOR WORKFLOW: "${cleanWorkflowId}"`);

        // 2. Load Workflow from Supabase (using Admin client to bypass RLS)
        const supabase = createAdminClient();

        const { data: workflow, error } = await supabase
            .from("workflows")
            .select(`
                *,
                nodes:workflow_nodes(*),
                edges:workflow_edges(*)
            `)
            .eq("id", cleanWorkflowId)
            .single();

        if (error || !workflow) {
            console.log(`❌ WORKFLOW NOT FOUND: "${cleanWorkflowId}"`);
            if (error) console.error("Supabase Error:", error.message);
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }
        console.log(`✅ WORKFLOW LOADED: "${workflow.name}" (${workflow.nodes?.length || 0} nodes)`);



        // 4. Prepare Execution Context
        const triggerData = {
            chat_id: message.chat.id,
            text: message.text,
            username: message.from.first_name,
            is_bot: message.from.is_bot || false,
            update_id,
            raw: body
        };

        // 5. Initialize Runner
        const safeEnv = Object.fromEntries(
            Object.entries(process.env).filter(([_, v]) => v !== undefined)
        ) as Record<string, string>;

        // Implement the same edge-parsing hack used in the builder 
        // to retrieve `sourceHandle` and `targetHandle` from the JSON label
        // because the PostgREST cache doesn't acknowledge the columns yet.
        const parsedEdges = workflow.edges.map((e: WorkflowEdge) => {
            let sourceH = e.source_handle;
            let targetH = e.target_handle;
            let realLabel = e.label;

            if (e.label && e.label.startsWith('{')) {
                try {
                    const parsed = JSON.parse(e.label);
                    if (parsed.__is_handle_data) {
                        sourceH = parsed.sourceHandle;
                        targetH = parsed.targetHandle;
                        realLabel = parsed.label;
                    }
                } catch (err) { }
            }
            return {
                ...e,
                source_handle: sourceH,
                target_handle: targetH,
                label: realLabel
            };
        });

        const runner = new WorkflowRunner(workflow.nodes, parsedEdges, safeEnv);

        // 6. Create Run Record
        const { data: run, error: runError } = await supabase
            .from("workflow_runs")
            .insert({
                workflow_id: cleanWorkflowId,
                user_id: workflow.user_id,
                status: "running",
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (runError) {
            console.error("Failed to create run record:", runError.message);
        }

        // 7. Execute Synchronously
        fs.appendFileSync('debug_webhook.log', `\n\n--- TARGET WORKFLOW EXECUTION: ${new Date().toISOString()} ---\n`);
        fs.appendFileSync('debug_webhook.log', `TRIGGER DATA:\n${JSON.stringify(triggerData, null, 2)}\n`);
        fs.appendFileSync('debug_webhook.log', `PARSED EDGES:\n${JSON.stringify(parsedEdges, null, 2)}\n`);

        await runner.execute(triggerData, (log: RunLog) => {
            console.log(`[${log.status}] Node ${log.nodeId}:`, log.output || log.error);
            fs.appendFileSync('debug_webhook.log', `\n[${log.status}] Node ${log.nodeId}:\n${JSON.stringify(log.output || log.error, null, 2)}`);
        });

        if (run) {
            await supabase.from("workflow_runs").update({
                status: "success",
                completed_at: new Date().toISOString()
            }).eq("id", run.id);
        }

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        console.error("Webhook Execution Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ ok: false, error: errorMessage }, { status: 200 });
    }
}
