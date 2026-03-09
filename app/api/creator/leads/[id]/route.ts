import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createAdminClient();

        // Verify the user is either the creator or the consumer of this lead
        const { data: lead, error: fetchErr } = await adminClient
            .from('creator_custom_leads')
            .select('creator_id, consumer_id')
            .eq('id', id)
            .single();

        if (fetchErr || !lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        if (lead.creator_id !== user.id && lead.consumer_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete the lead using admin client (bypasses RLS which lacks a delete policy)
        const { error: deleteErr } = await adminClient
            .from('creator_custom_leads')
            .delete()
            .eq('id', id);

        if (deleteErr) {
            throw deleteErr;
        }

        // Also attempt to delete any attached notification sent to the creator
        // The notification has `leadId` inside its metadata jsonb
        await adminClient
            .from('notifications')
            .delete()
            .filter('metadata->>leadId', 'eq', id);

        return NextResponse.json({ success: true, message: 'Lead and notification deleted successfully' });
    } catch (error: any) {
        console.error('[LEAD DELETE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
