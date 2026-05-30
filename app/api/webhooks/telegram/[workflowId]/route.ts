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
    let body: any = {};

    try {
        body = await request.json().catch(() => ({}));
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

        let workflow = null;
        let isInstance = false;
        let instance = null;

        const { data: wfData, error } = await supabase
            .from("workflows")
            .select(`
                *,
                nodes:workflow_nodes(*),
                edges:workflow_edges(*)
            `)
            .eq("id", cleanWorkflowId)
            .single();

        if (wfData) {
            workflow = wfData;
        } else {
            // Self-Healing: Check if the ID belongs to a consumer instance
            const { data: instData } = await supabase
                .from("consumer_instances")
                .select("*")
                .eq("id", cleanWorkflowId)
                .single();

            if (instData) {
                isInstance = true;
                instance = instData;
            }
        }

        if (!workflow && !isInstance) {
            console.log(`❌ NEITHER WORKFLOW NOR INSTANCE FOUND: "${cleanWorkflowId}"`);
            if (error) console.error("Supabase Error:", error.message);
            return NextResponse.json({ error: "Workflow or Instance not found" }, { status: 404 });
        }

        if (isInstance && instance) {
            console.log(`🚀 [TELEGRAM ROUTE] Self-healing redirect: Running Instance ${instance.id}`);
            const { InstanceRunner } = await import("@/lib/workflow/instance-runner");
            const runner = new InstanceRunner(instance.id, instance.buyer_id);

            const triggerData = {
                chat_id: message.chat.id,
                text: message.text,
                username: message.from.first_name,
                is_bot: message.from.is_bot || false,
                update_id,
                raw: body
            };

            const result = await runner.run(triggerData);
            if (!result.success) {
                try {
                    const { data: rawNodes } = await supabase
                        .from("workflow_nodes")
                        .select("config")
                        .eq("workflow_id", instance.workflow_id);

                    const telegramNode = rawNodes?.find((n: any) => 
                        n.config?.integrationId === "telegram" || 
                        n.config?.actionId === "send_message" ||
                        n.config?.actionId === "process_message"
                    );

                    let botToken = telegramNode?.config?.data?.botToken || telegramNode?.config?.botToken;
                    
                    const overrides = instance.config_overrides || {};
                    const tokenOverrideKey = Object.keys(overrides).find(k => k.endsWith(".botToken"));
                    if (tokenOverrideKey) botToken = overrides[tokenOverrideKey];

                    if (botToken && triggerData.chat_id) {
                        const errorMsg = `⚠️ *Automation Error*:\n\n${result.error || "Unknown execution failure"}`;
                        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                chat_id: triggerData.chat_id,
                                text: errorMsg,
                                parse_mode: "Markdown"
                            })
                        });
                    }
                } catch (sendErr) {
                    console.error("Failed to send execution error to Telegram:", sendErr);
                }
                return NextResponse.json({ ok: false, error: result.error || "Workflow execution failed" });
            }
            return NextResponse.json({ ok: true });
        }

        const activeWorkflow = workflow!;
        console.log(`✅ WORKFLOW LOADED: "${activeWorkflow.name}" (${activeWorkflow.nodes?.length || 0} nodes)`);



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
        const parsedEdges = activeWorkflow.edges.map((e: WorkflowEdge) => {
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

        const runner = new WorkflowRunner(activeWorkflow.nodes, parsedEdges, safeEnv, undefined, activeWorkflow.user_id);

        // 6. Create Run Record
        const { data: run, error: runError } = await supabase
            .from("workflow_runs")
            .insert({
                workflow_id: cleanWorkflowId,
                user_id: activeWorkflow.user_id,
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

        try {
            const cleanWorkflowId = workflowId.trim();
            const supabase = createAdminClient();
            const { data: wfData } = await supabase
                .from("workflows")
                .select("nodes")
                .eq("id", cleanWorkflowId)
                .single();

            const rawNodes = (wfData as any)?.nodes || [];
            const telegramNode = rawNodes.find((n: any) => 
                n.config?.integrationId === "telegram" || 
                n.config?.actionId === "send_message" ||
                n.config?.actionId === "process_message"
            );

            const botToken = telegramNode?.config?.data?.botToken || telegramNode?.config?.botToken;
            const chatId = body?.message?.chat?.id;

            if (botToken && chatId) {
                const errorMsg = `⚠️ *Automation Error*:\n\n${errorMessage}`;
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: errorMsg,
                        parse_mode: "Markdown"
                    })
                });
            }
        } catch (sendErr) {
            console.error("Failed to send execution error to Telegram:", sendErr);
        }

        return NextResponse.json({ ok: false, error: errorMessage }, { status: 200 });
    }
}
