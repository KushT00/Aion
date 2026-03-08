import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/conversations/[id]/status — update conversation status (creator only for most)

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conversationId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { status, priority } = body;

        // Verify participation
        const { data: conv } = await supabase
            .from('conversations')
            .select('id, consumer_id, creator_id')
            .eq('id', conversationId)
            .single();

        if (!conv || (conv.consumer_id !== user.id && conv.creator_id !== user.id)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const updates: Record<string, any> = {};
        if (status) updates.status = status;
        if (priority && conv.creator_id === user.id) updates.priority = priority;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('conversations')
            .update(updates)
            .eq('id', conversationId)
            .select()
            .single();

        if (error) {
            console.error('[CONV STATUS UPDATE]', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Add system message for status change
        if (status) {
            await supabase.from('messages').insert({
                conversation_id: conversationId,
                sender_id: user.id,
                content: `Conversation marked as "${status}"`,
                message_type: 'system',
            });
        }

        return NextResponse.json({ conversation: data });
    } catch (err: any) {
        console.error('[CONV STATUS ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
