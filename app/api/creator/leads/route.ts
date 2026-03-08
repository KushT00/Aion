import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/creator/leads — fetch real leads/conversations for the creator's CRM
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify user is a creator
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_creator')
            .eq('id', user.id)
            .single();

        if (!profile?.is_creator) {
            return NextResponse.json({ error: 'Creator access required' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const type = searchParams.get('type');
        const search = searchParams.get('search');

        // Fetch all incoming conversations for this creator (hire + questions + support)
        let query = supabase
            .from('conversations')
            .select(`
                *,
                consumer:profiles!conversations_consumer_id_fkey(id, full_name, avatar_url, email),
                listing:marketplace_listings(id, title, category),
                messages(id, content, sender_id, created_at)
            `)
            .eq('creator_id', user.id)
            .in('type', ['hire_request', 'pre_sale_question', 'tweak_request', 'post_sale_support'])
            .order('last_message_at', { ascending: false })
            .limit(1, { referencedTable: 'messages' });

        if (status) query = query.eq('status', status);
        if (priority) query = query.eq('priority', priority);
        if (type) query = query.eq('type', type);

        const { data: conversations, error } = await query;

        if (error) {
            console.error('[CREATOR LEADS GET]', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const leads = (conversations || []).map((conv: any) => ({
            id: conv.id,
            userName: conv.consumer?.full_name || conv.consumer?.email || 'Anonymous',
            email: conv.consumer?.email || '',
            avatar_url: conv.consumer?.avatar_url || null,
            request: conv.messages?.[0]?.content || conv.subject,
            subject: conv.subject,
            source: conv.listing?.title || 'Direct Contact',
            type: conv.type,
            status: conv.priority === 'hot' ? 'Hot' : conv.priority === 'warm' ? 'Warm' : conv.type === 'hire_request' ? 'Custom Request' : 'New',
            priority: conv.priority,
            convStatus: conv.status,
            date: conv.last_message_at,
            potentialValue: conv.metadata?.budget_range || 'N/A',
            conversationId: conv.id,
        })).filter((lead: any) => {
            if (!search) return true;
            const q = search.toLowerCase();
            return lead.userName.toLowerCase().includes(q) ||
                lead.email.toLowerCase().includes(q) ||
                lead.request.toLowerCase().includes(q) ||
                lead.source.toLowerCase().includes(q);
        });

        // Compute stats
        const stats = {
            total: leads.length,
            hot: leads.filter((l: any) => l.status === 'Hot').length,
            warm: leads.filter((l: any) => l.status === 'Warm').length,
            custom: leads.filter((l: any) => l.type === 'hire_request').length,
            unread: 0,
        };

        return NextResponse.json({ leads, stats });
    } catch (err: any) {
        console.error('[CREATOR LEADS ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
