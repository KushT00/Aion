import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/conversations — list all conversations for the current user
// POST /api/conversations — create a new conversation

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // hire_request, pre_sale_question, etc.
        const status = searchParams.get('status');
        const role = searchParams.get('role'); // 'consumer' or 'creator'

        let query = supabase
            .from('conversations')
            .select(`
                *,
                consumer:profiles!conversations_consumer_id_fkey(id, full_name, avatar_url, email),
                creator:profiles!conversations_creator_id_fkey(id, full_name, avatar_url, email),
                listing:marketplace_listings(id, title, category),
                messages(id, content, sender_id, is_read, created_at)
            `)
            .order('last_message_at', { ascending: false });

        // Filter by role
        if (role === 'creator') {
            query = query.eq('creator_id', user.id);
        } else if (role === 'consumer') {
            query = query.eq('consumer_id', user.id);
        } else {
            // Default: show all where user is a participant
            query = query.or(`consumer_id.eq.${user.id},creator_id.eq.${user.id}`);
        }

        if (type) query = query.eq('type', type);
        if (status) query = query.eq('status', status);

        // Limit messages to last 1 for preview
        query = query.limit(1, { referencedTable: 'messages' });

        const { data, error } = await query;

        if (error) {
            console.error('[CONVERSATIONS GET]', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Calculate unread count per conversation
        const conversationsWithUnread = await Promise.all(
            (data || []).map(async (conv: any) => {
                const { count } = await supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', conv.id)
                    .eq('is_read', false)
                    .neq('sender_id', user.id);

                return {
                    ...conv,
                    unread_count: count || 0,
                    last_message: conv.messages?.[0] || null,
                };
            })
        );

        return NextResponse.json({ conversations: conversationsWithUnread });
    } catch (err: any) {
        console.error('[CONVERSATIONS GET ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { type, creator_id, consumer_id, listing_id, instance_id, subject, message, priority, metadata } = body;

        const actualConsumerId = consumer_id || user.id;
        const actualCreatorId = creator_id || user.id;

        if (user.id !== actualConsumerId && user.id !== actualCreatorId) {
            return NextResponse.json({ error: 'Unauthorized to create conversation for other users' }, { status: 403 });
        }

        if (!type || !actualCreatorId || !actualConsumerId || !subject) {
            return NextResponse.json({ error: 'Missing type, creator_id, consumer_id, or subject' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Create conversation
        const { data: conv, error: convErr } = await adminClient
            .from('conversations')
            .insert({
                type,
                consumer_id: actualConsumerId,
                creator_id: actualCreatorId,
                listing_id: listing_id || null,
                instance_id: instance_id || null,
                subject,
                priority: priority || 'none',
                metadata: metadata || {},
            })
            .select()
            .single();

        if (convErr) {
            console.error('[CONVERSATION CREATE]', convErr);
            return NextResponse.json({ error: convErr.message }, { status: 500 });
        }

        // Send first message if provided
        if (message) {
            await adminClient.from('messages').insert({
                conversation_id: conv.id,
                sender_id: user.id,
                content: message,
                message_type: 'text',
            });
        }

        // --- ADD NOTIFICATION FOR RECIPIENT ---
        const recipientId = actualCreatorId === user.id ? actualConsumerId : actualCreatorId;
        if (recipientId && recipientId !== user.id) {
            await supabase.from('notifications').insert({
                user_id: recipientId,
                type: 'new_conversation',
                title: 'New Conversation Started',
                message: `A new conversation was started regarding: ${subject}`,
                metadata: { conversationId: conv.id, url: user.id === actualCreatorId ? '/inbox' : '/creator/inbox' }
            });
        }

        return NextResponse.json({ conversation: conv }, { status: 201 });
    } catch (err: any) {
        console.error('[CONVERSATION CREATE ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
