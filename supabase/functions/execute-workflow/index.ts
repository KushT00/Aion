import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { workflowId, triggerData } = await req.json();

        // 1. Fetch Workflow with Nodes and Edges
        const { data: workflow, error: wfError } = await supabaseClient
            .from("workflows")
            .select(`
        *,
        workflow_nodes (*),
        workflow_edges (*)
      `)
            .eq("id", workflowId)
            .single();

        if (wfError || !workflow) throw new Error("Workflow not found");

        // 2. Create a Run Record
        const { data: run, error: runError } = await supabaseClient
            .from("workflow_runs")
            .insert({
                workflow_id: workflowId,
                user_id: workflow.user_id,
                status: "running",
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (runError) throw new Error("Failed to create run record");

        // 3. Initialize Execution (Note: In a real prod environment, we'd 
        // probably use a background worker or queue here if it's long-running)
        // For now, we execute in-line for simplicity

        // TODO: Import the WorkflowRunner logic here. 
        // Since Deno can't easily import local TS files from Next.js lib directory
        // without complex setup, we will eventually move the runner to a shared 
        // Supabase internal module or duplicate it here for the Edge Function.

        console.log(`Executing workflow ${workflowId} for run ${run.id}`);

        // Mocking success for now
        await supabaseClient
            .from("workflow_runs")
            .update({
                status: "success",
                completed_at: new Date().toISOString(),
                output: { result: "Success" }
            })
            .eq("id", run.id);

        return new Response(
            JSON.stringify({ success: true, runId: run.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
