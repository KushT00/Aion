import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
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
            .select('*, workflow:workflows(id, name)')
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
            })
            .select('id')
            .single();

        if (purchaseErr) throw purchaseErr;

        // 5. Create a consumer instance (the isolated sandbox)
        const { data: instance, error: instanceErr } = await supabase
            .from('consumer_instances')
            .insert({
                purchase_id: purchase.id,
                buyer_id: user.id,
                workflow_id: listing.workflow_id,
                listing_id: listingId,
                pricing_tier: tier,
                status: 'setup_required',
            })
            .select('id')
            .single();

        if (instanceErr) {
            console.error('[INSTANCE CREATE ERROR]', instanceErr);
            // Instance table might not exist yet — still return purchase success
            return NextResponse.json({
                success: true,
                purchaseId: purchase.id,
                instanceId: null,
                message: 'Purchase recorded. Instance creation pending (table may not exist yet).',
            });
        }

        // 6. Increment usage_count on the listing
        await supabase
            .from('marketplace_listings')
            .update({ usage_count: (listing.usage_count || 0) + 1 })
            .eq('id', listingId);

        return NextResponse.json({
            success: true,
            purchaseId: purchase.id,
            instanceId: instance.id,
            pricingTier: tier,
            message: 'Purchase complete! Redirecting to setup...',
        });

    } catch (error: any) {
        console.error('[PURCHASE ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Purchase failed' },
            { status: 500 }
        );
    }
}
