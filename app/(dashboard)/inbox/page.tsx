'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
    MessageSquare, Search, Send, ArrowLeft, Clock, CheckCheck,
    Briefcase, HelpCircle, ShoppingBag, Wrench, Loader2,
    MoreHorizontal, ChevronRight, Inbox, Sparkles
} from 'lucide-react';

const typeConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
    hire_request: { label: 'Hire Request', color: 'text-violet-400', icon: Briefcase, bg: 'bg-violet-500/10' },
    pre_sale_question: { label: 'Question', color: 'text-blue-400', icon: HelpCircle, bg: 'bg-blue-500/10' },
    post_sale_support: { label: 'Support', color: 'text-emerald-400', icon: ShoppingBag, bg: 'bg-emerald-500/10' },
    tweak_request: { label: 'Tweak', color: 'text-amber-400', icon: Wrench, bg: 'bg-amber-500/10' },
};

const statusColors: Record<string, string> = {
    open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    quoted: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    accepted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    closed: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
};

interface Conversation {
    id: string;
    type: string;
    subject: string;
    status: string;
    priority: string;
    last_message_at: string;
    created_at: string;
    consumer: { id: string; full_name: string | null; avatar_url: string | null; email: string };
    creator: { id: string; full_name: string | null; avatar_url: string | null; email: string };
    listing?: { id: string; title: string; category: string } | null;
    last_message?: { id: string; content: string; sender_id: string; is_read: boolean; created_at: string } | null;
    unread_count: number;
}

interface Message {
    id: string;
    content: string;
    sender_id: string;
    message_type: string;
    attachments: any[];
    is_read: boolean;
    created_at: string;
    sender: { id: string; full_name: string | null; avatar_url: string | null };
}

export default function InboxPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // Get current user
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setCurrentUserId(data.user.id);
        });
    }, []);

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filterType) params.set('type', filterType);
            const res = await fetch(`/api/conversations?${params.toString()}`);
            const data = await res.json();
            if (data.conversations) setConversations(data.conversations);
        } catch (err) {
            console.error('Failed to fetch conversations', err);
        } finally {
            setLoading(false);
        }
    }, [filterType]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Fetch messages for selected conversation
    useEffect(() => {
        if (!selectedConv) return;
        const fetchMessages = async () => {
            const res = await fetch(`/api/conversations/${selectedConv}/messages`);
            const data = await res.json();
            if (data.messages) {
                setMessages(data.messages);
                // Mark conversation as read locally
                setConversations(prev => prev.map(c =>
                    c.id === selectedConv ? { ...c, unread_count: 0 } : c
                ));
            }
        };
        fetchMessages();
    }, [selectedConv]);

    // Supabase Realtime: listen for new messages
    useEffect(() => {
        if (!selectedConv) return;

        const channel = supabase
            .channel(`messages:${selectedConv}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${selectedConv}`
            }, async (payload: any) => {
                // Fetch full message with sender profile
                const { data: msg } = await supabase
                    .from('messages')
                    .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
                    .eq('id', payload.new.id)
                    .single();

                if (msg) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    // Mark as read if it's from the other user
                    if (msg.sender_id !== currentUserId) {
                        await supabase
                            .from('messages')
                            .update({ is_read: true })
                            .eq('id', msg.id);
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedConv, currentUserId]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedConv || sendingMsg) return;
        setSendingMsg(true);

        try {
            const res = await fetch(`/api/conversations/${selectedConv}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newMessage.trim() }),
            });
            if (res.ok) {
                setNewMessage('');
                // Refresh conversations to get updated last_message
                fetchConversations();
            }
        } catch (err) {
            console.error('Failed to send message', err);
        } finally {
            setSendingMsg(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const selectedConversation = conversations.find(c => c.id === selectedConv);

    const filteredConversations = conversations.filter(c => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return c.subject.toLowerCase().includes(q) ||
                c.creator?.full_name?.toLowerCase().includes(q) ||
                c.consumer?.full_name?.toLowerCase().includes(q);
        }
        return true;
    });

    // Determine the "other person" based on current user
    const getOtherPerson = (conv: Conversation) => {
        if (!currentUserId) return conv.creator;
        return conv.consumer.id === currentUserId ? conv.creator : conv.consumer;
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/20">
                        <Inbox className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Inbox</h1>
                        <p className="text-xs text-[var(--muted-fg)]">All your conversations with creators</p>
                    </div>
                </div>
                {conversations.filter(c => c.unread_count > 0).length > 0 && (
                    <Badge variant="primary" pulse className="font-bold">
                        {conversations.reduce((sum, c) => sum + c.unread_count, 0)} unread
                    </Badge>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* ─── Left Panel: Conversation List ─── */}
                <div className={cn(
                    "w-full md:w-96 border-r border-[var(--border)] flex flex-col bg-[var(--card)]/50",
                    selectedConv && "hidden md:flex"
                )}>
                    {/* Search + Filter */}
                    <div className="p-3 space-y-2 border-b border-[var(--border)]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-xl text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                            />
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setFilterType(null)}
                                className={cn(
                                    "px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wide transition-all whitespace-nowrap",
                                    !filterType ? "bg-primary-500/10 text-primary-400 border border-primary-500/20" : "text-[var(--muted-fg)] hover:bg-[var(--muted)]"
                                )}
                            >
                                All
                            </button>
                            {Object.entries(typeConfig).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterType(filterType === key ? null : key)}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wide transition-all whitespace-nowrap",
                                        filterType === key ? `${cfg.bg} ${cfg.color} border border-current/20` : "text-[var(--muted-fg)] hover:bg-[var(--muted)]"
                                    )}
                                >
                                    {cfg.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conversation Items */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                                <div className="p-4 rounded-2xl bg-[var(--muted)] mb-4">
                                    <MessageSquare className="w-8 h-8 text-[var(--muted-fg)]" />
                                </div>
                                <p className="text-sm font-bold text-[var(--fg)]">No conversations yet</p>
                                <p className="text-xs text-[var(--muted-fg)] mt-1">
                                    Ask a question on a listing or hire a creator to get started
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                const other = getOtherPerson(conv);
                                const cfg = typeConfig[conv.type] || typeConfig.pre_sale_question;
                                const TypeIcon = cfg.icon;

                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() => setSelectedConv(conv.id)}
                                        className={cn(
                                            "w-full p-4 flex gap-3 border-b border-[var(--border)] text-left transition-all hover:bg-[var(--muted)]/50",
                                            selectedConv === conv.id && "bg-primary-500/5 border-l-2 border-l-primary-500"
                                        )}
                                    >
                                        {/* Avatar */}
                                        <div className="relative shrink-0">
                                            {other.avatar_url ? (
                                                <img src={other.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--border)]" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-primary-400 font-bold text-sm border border-primary-500/20">
                                                    {(other.full_name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            {conv.unread_count > 0 && (
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={cn("text-sm font-bold truncate", conv.unread_count > 0 ? "text-[var(--fg)]" : "text-[var(--muted-fg)]")}>
                                                    {other.full_name || other.email}
                                                </span>
                                                <span className="text-[10px] text-[var(--muted-fg)] shrink-0">
                                                    {formatTime(conv.last_message_at)}
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-[var(--fg)] truncate mt-0.5">{conv.subject}</p>
                                            {conv.last_message && (
                                                <p className={cn("text-[11px] truncate mt-0.5", conv.unread_count > 0 ? "text-[var(--fg)] font-medium" : "text-[var(--muted-fg)]")}>
                                                    {conv.last_message.content}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", cfg.bg, cfg.color)}>
                                                    <TypeIcon className="w-2.5 h-2.5" />
                                                    {cfg.label}
                                                </span>
                                                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border", statusColors[conv.status])}>
                                                    {conv.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ─── Right Panel: Chat View ─── */}
                <div className={cn(
                    "flex-1 flex flex-col",
                    !selectedConv && "hidden md:flex"
                )}>
                    {!selectedConv ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                            <div className="p-6 rounded-3xl bg-gradient-to-br from-primary-500/5 to-accent-500/5 border border-primary-500/10 mb-6">
                                <Sparkles className="w-12 h-12 text-primary-400" />
                            </div>
                            <h2 className="text-xl font-black text-[var(--fg)]">Select a conversation</h2>
                            <p className="text-sm text-[var(--muted-fg)] mt-2 max-w-xs">
                                Choose a conversation from the left to view messages
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]">
                                <button
                                    onClick={() => setSelectedConv(null)}
                                    className="md:hidden p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>

                                {selectedConversation && (() => {
                                    const other = getOtherPerson(selectedConversation);
                                    const cfg = typeConfig[selectedConversation.type] || typeConfig.pre_sale_question;
                                    return (
                                        <>
                                            {other.avatar_url ? (
                                                <img src={other.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-[var(--border)]" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-primary-400 font-bold text-sm border border-primary-500/20">
                                                    {(other.full_name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold truncate">{other.full_name || other.email}</h3>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn("text-[10px] font-bold uppercase", cfg.color)}>
                                                        {selectedConversation.subject}
                                                    </span>
                                                </div>
                                            </div>
                                            <Badge className={cn("text-[9px] font-bold uppercase border", statusColors[selectedConversation.status])}>
                                                {selectedConversation.status.replace('_', ' ')}
                                            </Badge>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[var(--bg)]">
                                {messages.map(msg => {
                                    const isMe = msg.sender_id === currentUserId;
                                    const isSystem = msg.message_type === 'system';

                                    if (isSystem) {
                                        return (
                                            <div key={msg.id} className="flex justify-center">
                                                <span className="text-[10px] text-[var(--muted-fg)] bg-[var(--muted)] px-3 py-1 rounded-full font-medium">
                                                    {msg.content}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={msg.id} className={cn("flex gap-2.5", isMe ? "justify-end" : "justify-start")}>
                                            {!isMe && (
                                                msg.sender?.avatar_url ? (
                                                    <img src={msg.sender.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400 text-[10px] font-bold shrink-0 mt-1">
                                                        {(msg.sender?.full_name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )
                                            )}
                                            <div className={cn(
                                                "max-w-[75%] rounded-2xl px-4 py-2.5",
                                                isMe
                                                    ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-br-sm"
                                                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--fg)] rounded-bl-sm"
                                            )}>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                <div className={cn("flex items-center gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
                                                    <span className={cn("text-[9px]", isMe ? "text-white/60" : "text-[var(--muted-fg)]")}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && msg.is_read && (
                                                        <CheckCheck className="w-3 h-3 text-blue-300" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            {selectedConversation?.status !== 'closed' && (
                                <div className="p-3 border-t border-[var(--border)] bg-[var(--card)]">
                                    <div className="flex items-end gap-2">
                                        <textarea
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            placeholder="Type a message..."
                                            rows={1}
                                            className="flex-1 bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500 resize-none max-h-32"
                                            style={{ height: 'auto', minHeight: '2.5rem' }}
                                            onInput={(e: any) => {
                                                e.target.style.height = 'auto';
                                                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                                            }}
                                        />
                                        <Button
                                            size="icon"
                                            onClick={handleSend}
                                            disabled={!newMessage.trim() || sendingMsg}
                                            className="h-10 w-10 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white shadow-lg shadow-primary-500/20"
                                        >
                                            {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-[var(--muted-fg)] mt-1.5 ml-1">
                                        Press Enter to send, Shift+Enter for new line
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
