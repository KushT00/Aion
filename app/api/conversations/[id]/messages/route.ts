import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET  /api/conversations/[id]/messages — fetch paginated messages
// POST /api/conversations/[id]/messages — send a new message

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conversationId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        // Verify user is a participant
        const { data: conv } = await supabase
            .from('conversations')
            .select('id, consumer_id, creator_id')
            .eq('id', conversationId)
            .single();

        if (!conv || (conv.consumer_id !== user.id && conv.creator_id !== user.id)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Fetch messages
        const { data: messages, error, count } = await supabase
            .from('messages')
            .select(`
                *,
                sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
            `, { count: 'exact' })
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[MESSAGES GET]', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Mark unread messages from the OTHER user as read
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .eq('is_read', false)
            .neq('sender_id', user.id);

        return NextResponse.json({
            messages: messages || [],
            total: count || 0,
            page,
            limit,
        });
    } catch (err: any) {
        console.error('[MESSAGES GET ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conversationId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify user is a participant
        const { data: conv } = await supabase
            .from('conversations')
            .select('id, consumer_id, creator_id, status')
            .eq('id', conversationId)
            .single();

        if (!conv || (conv.consumer_id !== user.id && conv.creator_id !== user.id)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        if (conv.status === 'closed') {
            return NextResponse.json({ error: 'Conversation is closed' }, { status: 400 });
        }

        const body = await req.json();
        const { content, message_type = 'text', attachments = [] } = body;

        if (!content?.trim()) {
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
        }

        // Insert message
        const { data: message, error: msgErr } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: user.id,
                content: content.trim(),
                message_type,
                attachments,
            })
            .select(`
                *,
                sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
            `)
            .single();

        if (msgErr) {
            console.error('[MESSAGE SEND]', msgErr);
            return NextResponse.json({ error: msgErr.message }, { status: 500 });
        }

        // Auto-update conversation status to in_progress if it was open
        if (conv.status === 'open' && conv.creator_id === user.id) {
            await supabase
                .from('conversations')
                .update({ status: 'in_progress' })
                .eq('id', conversationId);
        }

        return NextResponse.json({ message }, { status: 201 });
    } catch (err: any) {
        console.error('[MESSAGE SEND ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
