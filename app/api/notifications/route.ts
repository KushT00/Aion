import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

        const { data: dbNotifications, error: notifErr, count } = await query;

        if (notifErr) throw notifErr;

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
            total: (count || 0) + pendingNotifications.length,
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
