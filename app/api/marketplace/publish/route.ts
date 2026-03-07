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
        const { workflowId, title, description, price, category, tags } = body;

        if (!workflowId || !title || !description) {
            return NextResponse.json(
                { error: 'Missing required fields: workflowId, title, description' },
                { status: 400 }
            );
        }

        // 1. Verify the user owns this workflow
        const { data: workflow, error: wfErr } = await supabase
            .from('workflows')
            .select('id, user_id, status')
            .eq('id', workflowId)
            .single();

        if (wfErr || !workflow) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }

        if (workflow.user_id !== user.id) {
            return NextResponse.json({ error: 'You do not own this workflow' }, { status: 403 });
        }

        // 2. Check if a listing already exists for this workflow
        const { data: existingListing } = await supabase
            .from('marketplace_listings')
            .select('id')
            .eq('workflow_id', workflowId)
            .maybeSingle();

        let listing;

        if (existingListing) {
            // Update existing listing
            const { data, error } = await supabase
                .from('marketplace_listings')
                .update({
                    title,
                    description,
                    price: Math.round(price), // cents
                    category: category || 'Utility',
                    tags: tags || [],
                    is_active: true,
                })
                .eq('id', existingListing.id)
                .select()
                .single();

            if (error) throw error;
            listing = data;
        } else {
            // Create new listing
            const { data, error } = await supabase
                .from('marketplace_listings')
                .insert({
                    workflow_id: workflowId,
                    seller_id: user.id,
                    title,
                    description,
                    price: Math.round(price), // cents
                    currency: 'USD',
                    category: category || 'Utility',
                    tags: tags || [],
                    is_active: true,
                })
                .select()
                .single();

            if (error) throw error;
            listing = data;
        }

        // 3. Update workflow status to 'published'
        await supabase
            .from('workflows')
            .update({ status: 'published' })
            .eq('id', workflowId);

        return NextResponse.json({
            success: true,
            listing,
            message: existingListing ? 'Listing updated successfully' : 'Listing published successfully'
        });

    } catch (error: any) {
        console.error('[PUBLISH ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to publish' },
            { status: 500 }
        );
    }
}
