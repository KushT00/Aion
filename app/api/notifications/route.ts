import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Fetches all notifications for the logged-in user.
 * Also auto-generates "pending setup" notifications from consumer_instances
 * that have status = 'setup_required'.
 * Supports ?unread_only=true and ?limit=20
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const unreadOnly = searchParams.get('unread_only') === 'true';
        const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

        // 1. Fetch real notifications from the notifications table
        let query = supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (unreadOnly) {
            query = query.eq('read', false);
        }

        const { data: rawDbNotifications, error: notifErr, count: rawCount } = await query;

        if (notifErr) throw notifErr;

        let dbNotifications = rawDbNotifications || [];
        const staleNotificationIds: string[] = [];

        // Dynamic validation of notifications
        const leadIdsToCheck = new Set<string>();
        const convIdsToCheck = new Set<string>();

        for (const n of dbNotifications) {
            if (n.type === 'new_lead' && n.metadata?.leadId) {
                leadIdsToCheck.add(n.metadata.leadId);
            }
            if ((n.type === 'new_message' || n.type === 'new_conversation') && n.metadata?.conversationId) {
                convIdsToCheck.add(n.metadata.conversationId);
            }
        }

        const validLeadIds = new Set<string>();
        if (leadIdsToCheck.size > 0) {
            const { data: leads } = await supabase
                .from('creator_custom_leads')
                .select('id')
                .in('id', Array.from(leadIdsToCheck));
            if (leads) leads.forEach((l: any) => validLeadIds.add(l.id));
        }

        const validConvIds = new Set<string>();
        if (convIdsToCheck.size > 0) {
            const { data: unreadMsgs } = await supabase
                .from('messages')
                .select('conversation_id')
                .in('conversation_id', Array.from(convIdsToCheck))
                .eq('is_read', false)
                .neq('sender_id', user.id);
            if (unreadMsgs) unreadMsgs.forEach((m: any) => validConvIds.add(m.conversation_id));
        }

        // Filter and collect stale IDs
        const validDbNotifications = [];
        for (const n of dbNotifications) {
            let isStale = false;

            if (n.type === 'new_lead' && n.metadata?.leadId) {
                if (!validLeadIds.has(n.metadata.leadId)) isStale = true;
            } else if ((n.type === 'new_message' || n.type === 'new_conversation') && n.metadata?.conversationId) {
                if (!validConvIds.has(n.metadata.conversationId)) isStale = true;
            }

            if (isStale) {
                staleNotificationIds.push(n.id);
            } else {
                validDbNotifications.push(n);
            }
        }

        dbNotifications = validDbNotifications;

        // Cleanup stale notifications
        if (staleNotificationIds.length > 0) {
            await supabase
                .from('notifications')
                .delete()
                .in('id', staleNotificationIds);
        }

        // 2. Fetch pending setup instances (consumer_instances with status = 'setup_required')
        const { data: pendingInstances } = await supabase
            .from('consumer_instances')
            .select(`
                id, status, created_at,
                listing:marketplace_listings (
                    title, category
                )
            `)
            .eq('buyer_id', user.id)
            .eq('status', 'setup_required')
            .order('created_at', { ascending: false });

        // 3. Build synthetic "pending setup" notifications from these instances
        const pendingNotifications = (pendingInstances || []).map((inst: any) => ({
            id: `pending-${inst.id}`,
            user_id: user.id,
            type: 'setup_pending',
            title: `Complete setup: ${inst.listing?.title || 'Automation'}`,
            message: `Your ${inst.listing?.category || 'automation'} "${inst.listing?.title || 'instance'}" needs API keys to start working. Click to complete setup.`,
            read: false,
            metadata: {
                instanceId: inst.id,
                href: `/my-automations/${inst.id}/setup`,
            },
            created_at: inst.created_at,
            _isPending: true, // flag to identify synthetic notifications
        }));

        // 4. Merge: pending setup notifications come first, then DB notifications
        const allNotifications = [...pendingNotifications, ...(dbNotifications || [])];

        // 5. Count unread (DB unread + all pending setups count as unread)
        const { count: dbUnreadCount } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);

        const totalUnread = (dbUnreadCount || 0) + pendingNotifications.length;

        return NextResponse.json({
            notifications: allNotifications,
            unreadCount: totalUnread,
            pendingSetups: pendingNotifications.length,
            total: Math.max(0, (rawCount || 0) - staleNotificationIds.length) + pendingNotifications.length,
        });
    } catch (error: any) {
        console.error('[NOTIFICATIONS GET ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/notifications
 * Marks notifications as read.
 * Body: { notificationIds: string[] } or { markAllRead: true }
 */
export async function PATCH(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { notificationIds, markAllRead } = body;

        if (markAllRead) {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

            if (error) throw error;
            return NextResponse.json({ success: true, message: 'All notifications marked as read' });
        }

        if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
            return NextResponse.json({ error: 'Missing notificationIds or markAllRead' }, { status: 400 });
        }

        // Filter out synthetic pending-* IDs (they're not in the DB)
        const realIds = notificationIds.filter((id: string) => !id.startsWith('pending-'));

        if (realIds.length > 0) {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .in('id', realIds);

            if (error) throw error;
        }

        return NextResponse.json({
            success: true,
            message: `${realIds.length} notification(s) marked as read`,
        });
    } catch (error: any) {
        console.error('[NOTIFICATIONS PATCH ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update notifications' },
            { status: 500 }
        );
    }
}
