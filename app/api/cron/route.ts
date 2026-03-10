import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InstanceRunner } from "@/lib/workflow/instance-runner";
const parser = require('cron-parser');

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    console.log("📍 [CRON MANAGER] Starting per-instance cron check");
    const supabase = createAdminClient();

    try {
        // Query active instances with their nested workflows
        const { data: instances, error: fetchErr } = await supabase
            .from('consumer_instances')
            .select(`
                id,
                buyer_id,
                listing:marketplace_listings (
                    workflow:workflows ( id, nodes, edges )
                ),
                config_overrides
            `)
            .eq('status', 'active');

        if (fetchErr) {
            console.error("❌ [CRON MANAGER] DB Fetch Error:", fetchErr);
            return NextResponse.json({ error: "DB Error" }, { status: 500 });
        }

        const now = new Date();
        const triggeredInstances = [];

        for (const instance of (instances || [])) {
            const workflow = (instance.listing as any)?.workflow;
            if (!workflow) continue;

            const nodes = typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes;
            const overrides = instance.config_overrides || {};

            // Find cron trigger nodes
            const cronNodes = nodes.filter((n: any) =>
                n.type?.includes('trigger') &&
                (n.config?.integrationId === 'cron' || n.data?.integrationType === 'cron')
            );

            for (const node of cronNodes) {
                // Apply consumer overrides if they exist
                const overrideKey = `${node.id}.cron`;
                const cronExp = overrides[overrideKey] || node.config?.cron || node.data?.cron;

                if (!cronExp) continue;

                try {
                    // Check if it's due
                    const interval = parser.parseExpression(cronExp, {
                        currentDate: now,
                        tz: 'UTC'
                    });

                    const prev = interval.prev();
                    const diffMs = now.getTime() - prev.getTime();

                    // If the previous execution time is within the last 60 seconds, trigger it
                    if (diffMs >= 0 && diffMs < 60000) {
                        console.log(`⏰ [CRON MANAGER] Triggering instance ${instance.id} (Cron: ${cronExp})`);

                        // Kick off the run asynchronously
                        const runner = new InstanceRunner(instance.id, instance.buyer_id);
                        runner.run({ triggerType: 'cron', timestamp: now.toISOString() })
                            .catch(err => console.error(`Failed to run cron for instance ${instance.id}:`, err));

                        triggeredInstances.push({
                            instanceId: instance.id,
                            cronExp
                        });
                        break;
                    }
                } catch (parseErr) {
                    console.error(`Invalid cron expression for instance ${instance.id}: ${cronExp}`);
                }
            }
        }

        return NextResponse.json({
            message: "Cron check complete",
            triggered: triggeredInstances.length,
            details: triggeredInstances
        });
    } catch (err: any) {
        console.error("Cron Manager Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
