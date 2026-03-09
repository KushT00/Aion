import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const adminDb = createAdminClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { purchaseId } = await req.json();
        if (!purchaseId) {
            return NextResponse.json({ error: 'Missing purchaseId' }, { status: 400 });
        }

        // 1. Get purchase details
        const { data: purchase, error: purchaseErr } = await supabase
            .from('purchases')
            .select('id, listing_id, buyer_id, pricing_tier')
            .eq('id', purchaseId)
            .eq('buyer_id', user.id)
            .single();

        if (purchaseErr || !purchase) {
            return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
        }

        // 2. Check if instance already exists
        const { data: existing } = await supabase
            .from('consumer_instances')
            .select('id')
            .eq('purchase_id', purchaseId)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ instanceId: existing.id, message: 'Instance already exists' });
        }

        // 3. Get listing to find workflow_id
        const { data: listing } = await supabase
            .from('marketplace_listings')
            .select('id, workflow_id')
            .eq('id', purchase.listing_id)
            .single();

        if (!listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        // 4. Create a DEEP CLONE of the workflow for the customer
        console.log('🔄 [INSTANCE FALLBACK] Cloning workflow architecture...');

        // 4.1 Create technical workflow container
        const { data: newWorkflow, error: wfErr } = await adminDb
            .from('workflows')
            .insert({
                user_id: user.id,
                name: `Instance Workflow (Protocol Fix)`,
                status: 'draft'
            })
            .select('id')
            .single();

        if (wfErr) throw wfErr;

        // 4.2 Fetch original technical architecture using Admin to bypass RLS
        const { data: originalNodes } = await adminDb
            .from('workflow_nodes')
            .select('*')
            .eq('workflow_id', listing.workflow_id);

        const { data: originalEdges } = await adminDb
            .from('workflow_edges')
            .select('*')
            .eq('workflow_id', listing.workflow_id);

        const nodeIdMap: Record<string, string> = {};

        if (originalNodes && originalNodes.length > 0) {
            const nodesToInsert = originalNodes.map(n => {
                const newId = crypto.randomUUID();
                nodeIdMap[n.id] = newId;
                return {
                    id: newId,
                    workflow_id: newWorkflow.id,
                    type: n.type,
                    label: n.label,
                    position_x: n.position_x,
                    position_y: n.position_y,
                    config: n.config
                };
            });
            await adminDb.from('workflow_nodes').insert(nodesToInsert);
        }

        if (originalEdges && originalEdges.length > 0) {
            const edgesToInsert = originalEdges.map(e => ({
                id: crypto.randomUUID(),
                workflow_id: newWorkflow.id,
                source_node_id: nodeIdMap[e.source_node_id] || e.source_node_id,
                target_node_id: nodeIdMap[e.target_node_id] || e.target_node_id,
                label: e.label
            }));
            await adminDb.from('workflow_edges').insert(edgesToInsert);
        }

        // 5. Create the instance (linked to the CLONE) using Admin
        const { data: instance, error: instanceErr } = await adminDb
            .from('consumer_instances')
            .insert({
                purchase_id: purchaseId,
                buyer_id: user.id,
                workflow_id: newWorkflow.id,
                listing_id: listing.id,
                pricing_tier: purchase.pricing_tier || 'byok',
                status: 'setup_required',
            })
            .select('id')
            .single();

        if (instanceErr) {
            console.error('[CREATE INSTANCE ERROR]', instanceErr);
            return NextResponse.json({ error: instanceErr.message || 'Failed to create instance' }, { status: 500 });
        }

        return NextResponse.json({ instanceId: instance.id, success: true });
    } catch (error: any) {
        console.error('[CREATE INSTANCE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
    }
}
