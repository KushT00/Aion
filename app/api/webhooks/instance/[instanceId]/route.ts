import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InstanceRunner } from "@/lib/workflow/instance-runner";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ instanceId: string }> }
) {
    const { instanceId } = await params;
    return NextResponse.json({
        message: 'Instance Webhook active. Send POST to trigger.',
        instanceId
    });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ instanceId: string }> }
) {
    console.log("📍 [INSTANCE WEBHOOK ROUTE] POST BEGIN");
    const { instanceId } = await params;
    const supabase = createAdminClient();

    try {
        // 1. Fetch the instance to get the userId
        const { data: instance, error: instanceError } = await supabase
            .from('consumer_instances')
            .select('*')
            .eq('id', instanceId)
            .single();

        if (instanceError || !instance) {
            console.error(`❌ [WEBHOOK] Instance not found: ${instanceId}`);
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        if (instance.status === 'paused') {
            console.log(`⚠️ [WEBHOOK] Instance is paused: ${instanceId}`);
            return NextResponse.json({ error: 'Instance is paused' }, { status: 400 });
        }

        // 2. Extract trigger data
        let triggerData = {};
        const contentType = request.headers.get('content-type') || '';

        try {
            if (contentType.includes('application/json')) {
                triggerData = await request.json();
            } else {
                // For telegram, it might be JSON, but let's be safe
                const text = await request.text();
                if (text) {
                    triggerData = JSON.parse(text);
                }
            }
        } catch (e) {
            console.warn("⚠️ [WEBHOOK] Could not parse request body.", e);
        }

        // --- COMMAND: CLEAR SESSION --- (Optional - keep consistency with generic webhook)
        const typedTriggerData = triggerData as any;
        const userText = typedTriggerData.text || typedTriggerData.message?.text;
        const chat_id = typedTriggerData.chat_id || typedTriggerData.message?.chat?.id;

        if (userText === '/clear' && chat_id) {
            console.log(`🧹 [COMMAND] Clearing session for chat ${chat_id}...`);
            await supabase.from('workflow_memory').delete().eq('session_id', String(chat_id));
            return NextResponse.json({
                message: 'Session cleared successfully.',
                output: { text: "Your session has been cleared! You can now start fresh." }
            });
        }

        console.log(`🚀 [WEBHOOK] Running instance: ${instanceId}`);

        // 3. Run the instance
        const runner = new InstanceRunner(instanceId, instance.buyer_id);

        // Let's format telegram trigger data if it's from Telegram
        let formattedTriggerData = typedTriggerData;
        if (typedTriggerData.message) {
            formattedTriggerData = {
                chat_id: typedTriggerData.message.chat?.id,
                text: typedTriggerData.message.text,
                username: typedTriggerData.message.from?.first_name,
                is_bot: typedTriggerData.message.from?.is_bot || false,
                update_id: typedTriggerData.update_id,
                raw: typedTriggerData
            };
        }

        const result = await runner.run(formattedTriggerData);

        if (!result.success) {
            return NextResponse.json({ error: 'Workflow execution failed', details: result.error, logs: result.logs }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Workflow executed successfully.',
            instanceId,
            output: result.outputs
        });
    } catch (err: any) {
        console.error('Webhook error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
