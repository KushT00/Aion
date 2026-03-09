'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    MessageSquare,
    Search,
    Filter,
    MoreHorizontal,
    Star,
    Zap,
    Tag,
    Clock,
    User,
    ArrowUpRight,
    Loader2,
    RefreshCw,
    Bot,
    Flame,
    Sparkles,
    Trash2
} from 'lucide-react';

interface CustomLead {
    id: string;
    consumer_id: string | null;
    creator_id: string | null;
    consumer_name: string;
    consumer_email: string;
    project_description: string;
    ai_summary: string | null;
    urgency_score: number;
    urgency_tag: string;
    status: string;
    created_at: string;
}

export default function LeadCRMPage() {
    const [leads, setLeads] = useState<CustomLead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dbError, setDbError] = useState('');
    const [startingChat, setStartingChat] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    const handleContact = async (lead: CustomLead) => {
        if (!lead.consumer_id) {
            toast.error("This request was submitted by an unregistered user and cannot be contacted via chat.");
            return;
        }

        setStartingChat(lead.id);
        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'hire_request',
                    consumer_id: lead.consumer_id,
                    creator_id: lead.creator_id,
                    subject: 'Automation Request: ' + lead.consumer_name,
                    message: "Hi " + lead.consumer_name + ", I received your custom automation request. Let's discuss the details!",
                    priority: lead.urgency_tag === 'Hot' ? 'hot' : (lead.urgency_tag === 'Slowest' ? 'none' : 'warm')
                })
            });
            const data = await res.json();
            if (res.ok && data.conversation) {
                router.push(`/creator/inbox?conv=${data.conversation.id}`);
            } else {
                toast.error(data.error || "Failed to start conversation");
            }
        } catch (error) {
            toast.error("Network error");
            console.error(error);
        } finally {
            setStartingChat(null);
        }
    };

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/creator/leads', { cache: 'no-store' });
            const data = await res.json();
            if (res.ok && data.success) {
                setLeads(data.leads || []);
            } else if (data.error && data.error.includes('does not exist')) {
                setDbError('Waiting for database migration to be applied...');
                setLeads([]);
            } else {
                console.error(data.error);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this custom request?')) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/creator/leads/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Lead removed successfully');
                setLeads(prev => prev.filter(l => l.id !== id));
            } else {
                toast.error(data.error || 'Failed to delete lead');
            }
        } catch (error) {
            toast.error('Network error');
            console.error(error);
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    // Derived Statistics
    const filteredLeads = leads.filter(l =>
        l.consumer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.consumer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.project_description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalLeads = leads.length;
    const hotLeads = leads.filter(l => l.urgency_tag === 'Hot').length;

    // Average urgency score
    const avgScore = totalLeads ? (leads.reduce((sum, l) => sum + (l.urgency_score || 0), 0) / totalLeads).toFixed(1) : '0.0';

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        Lead CRM <Badge className="bg-primary-500 font-black">AI Scored</Badge>
                    </h1>
                    <p className="text-[var(--muted-fg)]">Custom automation requests from potential buyers, deeply analyzed and scored.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchLeads} disabled={isLoading} className="rounded-xl h-10 border-primary-500/20 text-primary-400 font-bold hover:bg-[var(--muted)]">
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Refresh
                    </Button>
                    <Badge variant="primary" className="h-10 px-4 rounded-xl border-accent-500/20 bg-accent-500/5 text-accent-400 font-black text-sm uppercase tracking-widest italic flex items-center gap-2">
                        <Users className="w-4 h-4" /> {totalLeads} Active Leads
                    </Badge>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Requests', val: totalLeads.toString(), icon: MessageSquare, color: 'text-primary-400' },
                    { label: 'Hot Leads', val: hotLeads.toString(), icon: Flame, color: 'text-amber-400' },
                    { label: 'Avg Urgency Score', val: `${avgScore} / 10`, icon: Star, color: 'text-accent-400' },
                    { label: 'Conversion Rate', val: 'Est. 12%', icon: TrendingUp, color: 'text-emerald-400' },
                ].map((s) => (
                    <Card key={s.label} className="p-4 flex items-center gap-4 border-none bg-gradient-to-br from-[var(--card)] to-[var(--muted)] shadow-md">
                        <div className={`p-3 rounded-xl bg-[var(--card)] ${s.color} shadow-inner`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)]">{s.label}</p>
                            <p className="text-xl font-black md:text-2xl pt-1 leading-none">{s.val}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {dbError && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center gap-3 font-bold text-sm">
                    <Zap className="w-5 h-5" /> {dbError}
                    <span className="text-[10px] uppercase border border-amber-500/30 px-2 py-0.5 rounded opacity-80">Requires Migration</span>
                </div>
            )}

            {/* Main CRM Table/List */}
            <Card className="p-0 overflow-hidden border-[var(--border)] shadow-xl shadow-primary-500/5">
                <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]/30 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                        <input
                            type="text"
                            placeholder="Search leads, emails, or project details..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/30 outline-none transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="divide-y divide-[var(--border)] min-h-[300px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                            <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-fg)]">Loading Leads Network...</p>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <Bot className="w-12 h-12 text-[var(--muted-fg)] opacity-50" />
                            <h3 className="text-lg font-black uppercase italic tracking-widest">No Leads Found</h3>
                            <p className="text-sm text-[var(--muted-fg)] font-medium">Any custom automation requests from the marketplace will appear here.</p>
                        </div>
                    ) : (
                        filteredLeads.map((lead) => (
                            <div key={lead.id} className="p-6 hover:bg-[var(--muted)]/40 transition-all group flex flex-col lg:flex-row gap-6">
                                {/* Lead Meta */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-primary-400 font-black border border-primary-500/20 shadow-inner text-lg">
                                                {lead.consumer_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-lg text-[var(--fg)] group-hover:text-primary-400 transition-colors uppercase tracking-tight leading-none mb-1">
                                                    {lead.consumer_name}
                                                </h3>
                                                <p className="text-[11px] font-bold text-[var(--muted-fg)]">{lead.consumer_email}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <Badge
                                                variant={lead.urgency_tag === 'Hot' ? 'error' : lead.urgency_tag === 'Slow' ? 'warning' : 'default'}
                                                className="font-black italic uppercase text-[10px] px-3 py-1 shadow-sm tracking-widest"
                                            >
                                                {lead.urgency_tag} Lead
                                            </Badge>
                                            <span className="text-[9px] font-bold text-[var(--muted-fg)] uppercase tracking-wider">
                                                {new Date(lead.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-[var(--bg)] rounded-2xl p-4 border border-[var(--border)] space-y-3 relative group-hover:border-primary-500/30 transition-colors">
                                        {lead.ai_summary && (
                                            <div className="flex items-start gap-2">
                                                <Bot className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs font-bold text-[var(--fg)] italic">"{lead.ai_summary}"</p>
                                            </div>
                                        )}
                                        <div className="pl-6 border-l-2 border-[var(--muted)] ml-2 pb-1">
                                            <p className="text-[11px] text-[var(--muted-fg)] leading-relaxed line-clamp-2 hover:line-clamp-none transition-all">
                                                {lead.project_description}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Details & Actions */}
                                <div className="flex flex-row lg:flex-col justify-between lg:w-48 border-t lg:border-t-0 lg:border-l border-[var(--border)] pt-4 lg:pt-0 lg:pl-6 space-y-4">
                                    <div className="space-y-4">
                                        <div className="bg-gradient-to-br from-primary-500/10 to-transparent p-3 rounded-xl border border-primary-500/10">
                                            <p className="text-[9px] uppercase font-black text-primary-400 tracking-widest mb-1 flex items-center gap-1">
                                                <Zap className="w-3 h-3" /> Urgency Score
                                            </p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black italic">{lead.urgency_score || '-'}</span>
                                                <span className="text-[10px] text-[var(--muted-fg)] font-bold">/ 10</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase font-black text-[var(--muted-fg)] tracking-widest flex items-center gap-1 mb-1">
                                                <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Lead Status
                                            </p>
                                            <Badge variant="default" className="text-[10px] font-bold uppercase tracking-wider bg-[var(--card)]">
                                                {lead.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 items-end">
                                        <Button
                                            size="sm"
                                            onClick={() => handleContact(lead)}
                                            disabled={startingChat === lead.id}
                                            className="rounded-xl flex-1 font-black italic uppercase text-[10px] tracking-widest h-10 bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                                        >
                                            {startingChat === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Contact'}
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="icon"
                                            onClick={() => handleDelete(lead.id)}
                                            disabled={deletingId === lead.id}
                                            className="h-10 w-10 rounded-xl"
                                        >
                                            {deletingId === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-xl bg-[var(--muted)] hover:bg-[var(--border)]">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            <div className="text-center p-8 bg-gradient-to-r from-primary-500/5 to-accent-500/5 rounded-[2.5rem] border border-primary-500/10">
                <p className="text-[10px] text-primary-400 font-black uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> AI Lead Intelligence
                </p>
                <p className="text-sm text-[var(--fg)] max-w-lg mx-auto italic font-medium leading-relaxed">
                    "Every request is analyzed instantly by Gemini. We generate a concise summary and a 1-10 urgency score based on timeline and budget, helping you focus on the hottest leads first."
                </p>
            </div>
        </div >
    );
}

const TrendingUp = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);

