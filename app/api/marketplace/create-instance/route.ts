import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
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

        // 4. Create the instance
        const { data: instance, error: instanceErr } = await supabase
            .from('consumer_instances')
            .insert({
                purchase_id: purchaseId,
                buyer_id: user.id,
                workflow_id: listing.workflow_id,
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
