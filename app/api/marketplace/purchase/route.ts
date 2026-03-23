import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin'; // Use admin for cloning
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const adminDb = createAdminClient(); // Bypasses RLS for cloning
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { listingId, pricingTier } = body;
        // pricingTier: 'byok' | 'managed'

        if (!listingId) {
            return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
        }

        // 1. Fetch listing details
        const { data: listing, error: listingErr } = await supabase
            .from('marketplace_listings')
            .select('*')
            .eq('id', listingId)
            .eq('is_active', true)
            .single();

        if (listingErr || !listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        // 2. Check if already purchased
        const { data: existingPurchase } = await supabase
            .from('purchases')
            .select('id')
            .eq('listing_id', listingId)
            .eq('buyer_id', user.id)
            .maybeSingle();

        if (existingPurchase) {
            return NextResponse.json({ error: 'Already purchased', purchaseId: existingPurchase.id }, { status: 409 });
        }

        // 3. Prevent self-purchase
        if (listing.seller_id === user.id) {
            return NextResponse.json({ error: 'Cannot purchase your own listing' }, { status: 400 });
        }

        // 4. Record the purchase
        const tier = pricingTier === 'managed' ? 'managed' : 'byok';
        const pricePaid = tier === 'managed' ? listing.price * 2 : listing.price; // managed costs more

        const { data: purchase, error: purchaseErr } = await supabase
            .from('purchases')
            .insert({
                listing_id: listingId,
                buyer_id: user.id,
                price_paid: pricePaid,
                currency: listing.currency || 'USD',
                pricing_tier: tier
            })
            .select('id')
            .single();

        if (purchaseErr) throw purchaseErr;

        // 5. Create a DEEP CLONE of the workflow for the customer
        // We use adminDb here because the buyer (user) doesn't have SELECT permission on creator's nodes
        console.log('🔄 [PURCHASE] Admin-level cloning of architecture...');

        // 5.1 Create new technical workflow container
        const { data: newWorkflow, error: wfErr } = await adminDb
            .from('workflows')
            .insert({
                user_id: user.id,
                name: `${listing.title} (Protocol)`,
                description: `Isolated neural instance of ${listing.title}`,
                status: 'draft' // Buyer's copy is a draft instance
            })
            .select('id')
            .single();

        if (wfErr) throw wfErr;

        // 5.2 Fetch original technical nodes
        // Fetch original nodes using Admin to bypass RLS
        const { data: originalNodes } = await adminDb
            .from('workflow_nodes')
            .select('*')
            .eq('workflow_id', listing.workflow_id);

        // 5.3 Fetch original technical edges
        const { data: originalEdges } = await adminDb
            .from('workflow_edges')
            .select('*')
            .eq('workflow_id', listing.workflow_id);

        console.log(`🧠 [PURCHASE] Mirroring ${originalNodes?.length || 0} nodes and ${originalEdges?.length || 0} edges...`);

        // 5.4 Map original IDs to new IDs to maintain associations
        const nodeIdMap: Record<string, string> = {};
        const nodesToInsert = (originalNodes || []).map(n => {
            const newId = crypto.randomUUID();
            nodeIdMap[n.id] = newId;
            return {
                id: newId,
                workflow_id: newWorkflow.id,
                type: n.type,
                label: n.label,
                position_x: n.position_x,
                position_y: n.position_y,
                config: n.config // Will be sanitized in next pass
            };
        });

        // 5.5 Sanitize configs (update internal node references like tools/KB)
        nodesToInsert.forEach(n => {
            if (n.config && typeof n.config === 'object') {
                const conf = n.config as any;
                const data = conf.data || {};
                
                // Update Tools in both top-level and data-level (for compatibility)
                if (Array.isArray(conf.tools)) {
                    conf.tools = conf.tools.map((id: string) => nodeIdMap[id] || id);
                }
                if (Array.isArray(data.tools)) {
                    data.tools = data.tools.map((id: string) => nodeIdMap[id] || id);
                }
                
                // Update Knowledge Bases
                if (Array.isArray(conf.knowledgeBases)) {
                    conf.knowledgeBases = conf.knowledgeBases.map((id: string) => nodeIdMap[id] || id);
                }
                if (Array.isArray(data.knowledgeBases)) {
                    data.knowledgeBases = data.knowledgeBases.map((id: string) => nodeIdMap[id] || id);
                }
                if (typeof data.knowledgeBase === 'string' && nodeIdMap[data.knowledgeBase]) {
                    data.knowledgeBase = nodeIdMap[data.knowledgeBase];
                }
            }
        });

        if (nodesToInsert.length > 0) {
            console.log(`📦 [PURCHASE] Inserting ${nodesToInsert.length} cloned nodes...`);
            const { error: nodeErr } = await adminDb.from('workflow_nodes').insert(nodesToInsert);
            if (nodeErr) {
                console.error('[PURCHASE] Node insertion failed:', nodeErr);
                throw nodeErr;
            }
        }

        // 5.6 Clone edges using the map
        if (originalEdges && originalEdges.length > 0) {
            const edgesToInsert = originalEdges.map(e => ({
                id: crypto.randomUUID(),
                workflow_id: newWorkflow.id,
                source_node_id: nodeIdMap[e.source_node_id] || e.source_node_id,
                target_node_id: nodeIdMap[e.target_node_id] || e.target_node_id,
                source_handle: e.source_handle,
                target_handle: e.target_handle,
                label: e.label
            }));

            console.log(`🔗 [PURCHASE] Inserting ${edgesToInsert.length} cloned edges...`);
            const { error: edgeErr } = await adminDb.from('workflow_edges').insert(edgesToInsert);
            if (edgeErr) {
                console.error('[PURCHASE] Edge insertion failed:', edgeErr);
                throw edgeErr;
            }
        }

        // 6. Create a consumer instance (linked to the CLONED workflow)
        const { data: instance, error: instanceErr } = await adminDb
            .from('consumer_instances')
            .insert({
                purchase_id: purchase.id,
                buyer_id: user.id,
                workflow_id: newWorkflow.id, // THE CLONE
                listing_id: listingId,
                pricing_tier: tier,
                status: 'setup_required',
            })
            .select('id')
            .single();

        if (instanceErr) throw instanceErr;

        // 7. Increment usage_count on the listing
        await adminDb.rpc('increment_listing_usage', { listing_id: listingId });

        return NextResponse.json({
            success: true,
            purchaseId: purchase.id,
            instanceId: instance.id,
            pricingTier: tier,
            message: 'Neural protocol mirrored successfully!',
        });

    } catch (error: any) {
        console.error('[PURCHASE ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Purchase failed' },
            { status: 500 }
        );
    }
}
