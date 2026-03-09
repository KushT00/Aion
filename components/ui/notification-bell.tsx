'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, AlertTriangle, Zap, ShoppingBag, Info, X, Key, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string | null;
    read: boolean;
    created_at: string;
    metadata?: {
        instanceId?: string;
        href?: string;
        url?: string;
        conversationId?: string;
    };
    _isPending?: boolean;
}

const TYPE_ICONS: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
    setup_pending: { icon: Key, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    workflow_failed: { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    workflow_success: { icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    daily_summary: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    threshold_alert: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    purchase: { icon: ShoppingBag, color: 'text-primary-400', bg: 'bg-primary-500/10' },
    new_lead: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    new_message: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    new_conversation: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    system: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    info: { icon: Info, color: 'text-[var(--muted-fg)]', bg: 'bg-[var(--muted)]' },
};

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export function NotificationBell() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Fetch notifications
    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/notifications?limit=15');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error('[Notifications] Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on mount + poll every 30 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Also fetch when dropdown opens
    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen]);

    const handleMarkAllRead = async () => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllRead: true }),
            });
            if (res.ok) {
                // Only mark DB notifications as read (pending ones stay)
                setNotifications(prev => prev.map(n =>
                    n._isPending ? n : { ...n, read: true }
                ));
                // Recalculate: pending count stays
                const pendingCount = notifications.filter(n => n._isPending).length;
                setUnreadCount(pendingCount);
            }
        } catch (err) {
            console.error('[Notifications] Mark all read error:', err);
        }
    };

    const handleMarkRead = async (id: string) => {
        // Don't try to mark pending-* notifications as read (they're not in DB)
        if (id.startsWith('pending-')) return;

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: [id] }),
            });
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('[Notifications] Mark read error:', err);
        }
    };

    // Handle clicking on a notification — navigate if it has a link
    const handleNotificationClick = (notif: NotificationItem) => {
        let finalHref = notif.metadata?.href || notif.metadata?.url;
        if (finalHref && notif.metadata?.conversationId) {
            finalHref = `${finalHref}?conv=${notif.metadata.conversationId}`;
        }

        if (finalHref) {
            setIsOpen(false);
            router.push(finalHref);
        }

        if (!notif.read) {
            handleMarkRead(notif.id);
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-lg transition-colors",
                    "text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--fg)]",
                    isOpen && "bg-[var(--muted)] text-[var(--fg)]"
                )}
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary-500 text-white text-[10px] font-black px-1 animate-scale-in">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-12 w-96 max-h-[70vh] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl shadow-black/20 overflow-hidden z-50 animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                        <h3 className="text-sm font-black uppercase tracking-widest">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-[10px] font-bold uppercase tracking-wider text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Read All
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-md hover:bg-[var(--muted)] transition-colors"
                            >
                                <X className="w-4 h-4 text-[var(--muted-fg)]" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-[55vh] custom-scrollbar">
                        {isLoading && notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-10 text-center">
                                <Bell className="w-10 h-10 text-[var(--muted-fg)] opacity-30 mx-auto mb-3" />
                                <p className="text-sm font-bold text-[var(--muted-fg)] opacity-60">All caught up!</p>
                                <p className="text-xs text-[var(--muted-fg)] opacity-40 mt-1">You'll see alerts here when your automations need attention.</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const typeInfo = TYPE_ICONS[notif.type] || TYPE_ICONS.info;
                                const Icon = typeInfo.icon;
                                const isSetupPending = notif.type === 'setup_pending';
                                const hasLink = !!(notif.metadata?.href || notif.metadata?.url);

                                return (
                                    <div
                                        key={notif.id}
                                        className={cn(
                                            "flex items-start gap-3 px-4 py-3.5 border-b border-[var(--border)] last:border-b-0 cursor-pointer transition-colors",
                                            "hover:bg-[var(--muted)]",
                                            !notif.read && "bg-primary-500/[0.03]",
                                            isSetupPending && "bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
                                        )}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", typeInfo.bg)}>
                                            <Icon className={cn("w-4 h-4", typeInfo.color)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-sm leading-tight",
                                                    notif.read ? "font-medium text-[var(--muted-fg)]" : "font-bold text-[var(--fg)]",
                                                    isSetupPending && "text-amber-300"
                                                )}>
                                                    {notif.title}
                                                </p>
                                                {!notif.read && (
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full shrink-0 mt-1.5",
                                                        isSetupPending ? "bg-amber-500" : "bg-primary-500"
                                                    )} />
                                                )}
                                            </div>
                                            {notif.message && (
                                                <p className="text-xs text-[var(--muted-fg)] mt-0.5 line-clamp-2 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between mt-1.5">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-fg)] opacity-50">
                                                    {timeAgo(notif.created_at)}
                                                </p>
                                                {hasLink && (
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary-400 flex items-center gap-1">
                                                        {isSetupPending ? 'Complete Setup' : 'View'}
                                                        <ArrowRight className="w-3 h-3" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
