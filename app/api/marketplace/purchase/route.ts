import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin'; // Use admin for cloning
import { NextRequest, NextResponse } from 'next/server';
import { PricingError, quotePurchase } from '@/lib/billing/pricing';
import { purchaseAutomationTxn } from '@/lib/billing/marketplace';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const adminDb = createAdminClient(); // Bypasses RLS for cloning
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { listingId, pricingTier, durationDays, maxPrice } = body;
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

        // 4. Atomic marketplace purchase (Part 5 — single Postgres txn):
        // verify → server price → deduct → purchase → entitlement →
        // marketplace split → creator earning. COMMIT or full ROLLBACK.
        // Frontend sends ids only; the final price is never accepted
        // from the browser (maxPrice only guards against stale quotes).
        const tier = pricingTier === 'managed' ? 'managed' : 'byok';
        const duration = Number(durationDays ?? 30);
        let receipt;
        try {
            // Server re-quotes for the maxPrice guard default.
            const serverQuote = await quotePurchase(listingId, tier, duration);
            receipt = await purchaseAutomationTxn(
                user.id,
                listingId,
                tier,
                duration,
                maxPrice ?? serverQuote.customer_price,
            );
        } catch (e) {
            if (e instanceof PricingError) {
                return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
            }
            throw e;
        }

        const purchase = { id: receipt.purchaseId };

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

        // Map original IDs to new IDs to maintain associations if needed, 
        // though technical edges usually use the direct UUIDs.
        // For technical nodes, we need to maintain their relative positions and configs.
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
                    config: n.config // Deep copy of config (prompts, etc.)
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
            durationDays: duration,
            creditsCharged: receipt.charged,
            expiresAt: receipt.expiresAt,
            creatorAmount: receipt.creatorAmount,
            platformFee: receipt.platformFee,
            message: 'Neural protocol mirrored successfully!',
        });

    } catch (error: any) {
        console.error('[PURCHASE ERROR]', error);
        // If the atomic billing committed but fulfillment (clone/instance)
        // failed afterwards, the purchase + entitlement persist by design
        // (money committed, fulfillment retryable via /api/marketplace/create-instance).
        return NextResponse.json(
            { error: 'Purchase failed' },
            { status: 500 }
        );
    }
}
