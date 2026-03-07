import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate the user server-side
        const supabase = await createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('❌ [API_SAVE] Auth failed:', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse request body
        const { workflowId, workflowName, nodes, edges } = await request.json();

        // 3. Use Admin Client for database operations to ensure reliability
        const adminDb = createAdminClient();
        let currentWfId = workflowId;

        // --- Step 1: Create or Update Workflow Metadata ---
        if (!currentWfId) {
            console.log('💾 [API_SAVE] Creating NEW workflow for user:', user.id);
            const { data: wf, error: wfErr } = await adminDb
                .from('workflows')
                .insert({ user_id: user.id, name: workflowName, status: 'draft' })
                .select()
                .single();

            if (wfErr) throw wfErr;
            currentWfId = wf.id;
        } else {
            console.log('💾 [API_SAVE] Updating existing workflow:', currentWfId);
            const { error: updErr } = await adminDb
                .from('workflows')
                .update({ name: workflowName })
                .eq('id', currentWfId)
                .eq('user_id', user.id); // Security: ensure it belongs to the user
            if (updErr) throw updErr;
        }

        // --- Step 2: Sync Nodes ---
        console.log('💾 [API_SAVE] Syncing nodes for workflow:', currentWfId);
        // Delete existing nodes first to ensure clean state
        const { error: delNodesErr } = await adminDb
            .from('workflow_nodes')
            .delete()
            .eq('workflow_id', currentWfId);
        if (delNodesErr) throw delNodesErr;

        if (nodes && nodes.length > 0) {
            const nodesToInsert = nodes.map((n: any) => {
                const realType = n.data?.type;
                const rfType = n.type;
                const config = n.data?.config || {};
                const newConfig = { ...config, originalType: realType, rfType };

                return {
                    id: n.id,
                    workflow_id: currentWfId,
                    type: 'input', // Standardized for Aion
                    label: n.data?.label,
                    position_x: n.position.x,
                    position_y: n.position.y,
                    config: newConfig
                };
            });

            const { error: nodesErr } = await adminDb
                .from('workflow_nodes')
                .upsert(nodesToInsert, { onConflict: 'id' });
            if (nodesErr) throw nodesErr;
        }

        // --- Step 3: Sync Edges ---
        console.log('💾 [API_SAVE] Syncing edges for workflow:', currentWfId);
        const { error: delEdgesErr } = await adminDb
            .from('workflow_edges')
            .delete()
            .eq('workflow_id', currentWfId);
        if (delEdgesErr) throw delEdgesErr;

        if (edges && edges.length > 0) {
            const edgesToInsert = edges.map((e: any) => {
                // If it's a temp ID from React Flow, we should really ensure it's a UUID
                // But generally e.id is fine if it matches schema.
                return {
                    id: e.id,
                    workflow_id: currentWfId,
                    source_node_id: e.source,
                    target_node_id: e.target,
                    label: JSON.stringify({
                        __is_handle_data: true,
                        sourceHandle: e.sourceHandle || null,
                        targetHandle: e.targetHandle || null,
                        label: typeof e.label === 'string' ? e.label : null
                    })
                };
            });

            const { error: edgesErr } = await adminDb
                .from('workflow_edges')
                .upsert(edgesToInsert, { onConflict: 'id' });
            if (edgesErr) throw edgesErr;
        }

        console.log('✅ [API_SAVE] Save successful for workflow:', currentWfId);
        return NextResponse.json({ success: true, workflowId: currentWfId });

    } catch (error: any) {
        console.error('❌ [API_SAVE] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
