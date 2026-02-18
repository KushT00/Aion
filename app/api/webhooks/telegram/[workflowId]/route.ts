import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WorkflowRunner } from "@/lib/workflow/runner";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    const { workflowId } = await params;

    try {
        const body = await request.json();
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

        // 2. Load Workflow from Supabase
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: workflow, error } = await supabase
            .from("workflows")
            .select(`
                *,
                nodes:workflow_nodes(*),
                edges:workflow_edges(*)
            `)
            .eq("id", workflowId)
            .single();

        if (error || !workflow) {
            console.error("Workflow fetch error:", error);
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }



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

        const runner = new WorkflowRunner(workflow.nodes, workflow.edges, safeEnv);

        // 6. Execute Synchronously
        await runner.execute(triggerData, (log) => {
            console.log(`[${log.status}] Node ${log.nodeId}:`, log.output || log.error);
        });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Webhook Execution Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
