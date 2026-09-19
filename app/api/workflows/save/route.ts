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

        // 2. Parse + validate request body
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }
        const { workflowId, workflowName, nodes, edges } = body as {
            workflowId?: unknown; workflowName?: unknown; nodes?: unknown; edges?: unknown;
        };

        if (typeof workflowName !== 'string' || workflowName.trim().length === 0 || workflowName.length > 120) {
            return NextResponse.json({ error: 'A workflow name (1-120 chars) is required' }, { status: 400 });
        }
        if (nodes !== undefined && !Array.isArray(nodes)) {
            return NextResponse.json({ error: 'nodes must be an array' }, { status: 400 });
        }
        if (edges !== undefined && !Array.isArray(edges)) {
            return NextResponse.json({ error: 'edges must be an array' }, { status: 400 });
        }
        if (Array.isArray(nodes) && nodes.length > 500) {
            return NextResponse.json({ error: 'Too many nodes (max 500)' }, { status: 400 });
        }
        if (Array.isArray(edges) && edges.length > 1000) {
            return NextResponse.json({ error: 'Too many edges (max 1000)' }, { status: 400 });
        }
        const nodeList = (Array.isArray(nodes) ? nodes : []) as any[];
        const edgeList = (Array.isArray(edges) ? edges : []) as any[];

        // Every node must carry a usable position; otherwise the insert would crash
        for (const n of nodeList) {
            if (!n || typeof n !== 'object' || typeof n.position?.x !== 'number' || typeof n.position?.y !== 'number') {
                return NextResponse.json({ error: 'Each node must include a numeric position {x, y}' }, { status: 400 });
            }
        }
        for (const e of edgeList) {
            if (!e || typeof e !== 'object' || typeof e.source !== 'string' || typeof e.target !== 'string') {
                return NextResponse.json({ error: 'Each edge must include string source and target' }, { status: 400 });
            }
        }

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
            // Verify ownership first: the update must match exactly one row owned by this user.
            // Otherwise a non-owner could wipe the victim's graph below.
            const { data: owned, error: ownErr } = await adminDb
                .from('workflows')
                .select('id')
                .eq('id', currentWfId)
                .eq('user_id', user.id)
                .single();
            if (ownErr || !owned) {
                return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
            }
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

        if (nodeList.length > 0) {
            const nodesToInsert = nodeList.map((n: any) => {
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

        if (edgeList.length > 0) {
            const edgesToInsert = edgeList.map((e: any) => {
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
