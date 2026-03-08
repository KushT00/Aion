'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Users,
    MessageSquare,
    Search,
    Filter,
    MoreHorizontal,
    Zap,
    Tag,
    Clock,
    User,
    ArrowUpRight,
    TrendingUp,
    DollarSign,
    Loader2,
    Mail,
    RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function LeadCRMPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const router = useRouter();

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (filter !== 'all') params.append('type', filter);

            const res = await fetch(`/api/creator/leads?${params.toString()}`);
            const data = await res.json();

            if (res.ok) {
                setLeads(data.leads || []);
                setStats(data.stats);
            } else {
                toast.error(data.error || "Failed to load leads");
            }
        } catch (err) {
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [filter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLeads();
    };

    const formatDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return d.toLocaleDateString();
    };

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter">Lead <span className="text-primary-400">CRM</span></h1>
                    <p className="text-[var(--muted-fg)] font-medium uppercase tracking-tight text-xs">Direct requests generated from your marketplace listings.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchLeads}
                        disabled={loading}
                        className="rounded-xl border-primary-500/20 bg-primary-500/5 text-primary-400 font-black uppercase tracking-widest text-[10px]"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5 mr-2", loading && "animate-spin")} /> Refresh
                    </Button>
                    <Badge variant="primary" className="h-10 px-4 rounded-xl border-primary-500/20 bg-primary-500/5 text-primary-400 font-black uppercase tracking-tight">
                        <Users className="w-4 h-4 mr-2" /> {stats?.total || 0} Total Leads
                    </Badge>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Hot Leads', val: stats?.hot || '0', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Warm Leads', val: stats?.warm || '0', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Custom Requests', val: stats?.custom || '0', icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                    { label: 'Unread', val: stats?.unread || '0', icon: Mail, color: 'text-primary-400', bg: 'bg-primary-500/10' },
                ].map(s => (
                    <Card key={s.label} className="p-5 flex items-center gap-4 border-[var(--border)] bg-[var(--card)] rounded-2xl">
                        <div className={cn("p-3 rounded-xl transition-transform hover:scale-110 duration-300", s.bg, s.color)}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-[var(--muted-fg)] tracking-[0.15em] mb-1">{s.label}</p>
                            {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-black tracking-tight">{s.val}</p>}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main CRM Table/List */}
            <Card className="p-0 overflow-hidden border-[var(--border)] rounded-[2rem] shadow-xl">
                <div className="p-5 border-b border-[var(--border)] bg-[var(--muted)]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <form onSubmit={handleSearch} className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                        <input
                            type="text"
                            placeholder="Search leads, requests, or users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[var(--muted)]/50 border border-[var(--border)] pl-12 pr-4 py-2.5 rounded-xl text-sm font-bold focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                        />
                    </form>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary-500"
                        >
                            <option value="all">All Types</option>
                            <option value="hire_request">Hire Requests</option>
                            <option value="pre_sale_question">Questions</option>
                            <option value="tweak_request">Tweaks</option>
                        </select>
                        <Button variant="outline" size="sm" className="rounded-xl h-10 border-2 font-black uppercase tracking-widest text-[10px]">
                            Export CSV
                        </Button>
                    </div>
                </div>

                <div className="divide-y divide-[var(--border)]">
                    {loading && leads.length === 0 ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="p-8 space-y-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="w-12 h-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-48" />
                                    </div>
                                </div>
                                <Skeleton className="h-20 w-full rounded-xl" />
                            </div>
                        ))
                    ) : leads.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-[var(--muted)] rounded-full flex items-center justify-center mx-auto">
                                <Users className="w-10 h-10 text-[var(--muted-fg)] opacity-20" />
                            </div>
                            <h3 className="text-xl font-black uppercase italic">No Leads Found</h3>
                            <p className="text-[var(--muted-fg)] font-bold uppercase tracking-tight text-xs max-w-sm mx-auto">
                                Once customers contact you through the marketplace, they will appear here.
                            </p>
                        </div>
                    ) : (
                        leads.map((lead) => (
                            <div key={lead.id} className="p-8 hover:bg-primary-500/[0.02] transition-all group animate_in fade_in slide_in_from_bottom_2">
                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* Lead Meta */}
                                    <div className="flex-1 space-y-5">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 p-[1px]">
                                                    <div className="w-full h-full rounded-[15px] bg-[var(--card)] flex items-center justify-center text-primary-400 font-black text-xl italic overflow-hidden">
                                                        {lead.avatar_url ? (
                                                            <img src={lead.avatar_url} alt={lead.userName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            lead.userName.charAt(0)
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-[var(--fg)] group-hover:text-primary-400 transition-colors uppercase tracking-tight leading-none mb-1">{lead.userName}</h3>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted-fg)] uppercase tracking-tighter">
                                                        <span>{lead.email}</span>
                                                        <span className="w-1 h-1 bg-[var(--border)] rounded-full" />
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(lead.date)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge
                                                variant={lead.priority === 'hot' ? 'error' : lead.priority === 'warm' ? 'warning' : 'primary'}
                                                className="font-black italic uppercase text-[10px] px-3 py-1.5 rounded-lg border-none shadow-lg shadow-current/10"
                                                pulse={lead.priority === 'hot'}
                                            >
                                                {lead.status}
                                            </Badge>
                                        </div>

                                        <div className="bg-[var(--muted)]/50 rounded-2xl p-5 border border-[var(--border)] group-hover:border-primary-500/20 transition-colors">
                                            <p className="text-[10px] font-black uppercase text-primary-400 mb-2 tracking-widest">{lead.subject}</p>
                                            <p className="text-sm font-medium text-[var(--fg)] leading-relaxed italic opacity-80">
                                                "{lead.request}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Details & Actions */}
                                    <div className="flex flex-row lg:flex-col justify-between lg:w-72 border-l border-[var(--border)] lg:pl-8 space-y-6">
                                        <div className="space-y-4 flex-1">
                                            <div>
                                                <p className="text-[10px] uppercase font-black text-[var(--muted-fg)] tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <Tag className="w-3 h-3 text-primary-400" /> Source Listing
                                                </p>
                                                <p className="text-xs font-black truncate uppercase tracking-tighter text-primary-400">{lead.source}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-black text-[var(--muted-fg)] tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <DollarSign className="w-3 h-3 text-emerald-400" /> Potential
                                                </p>
                                                <p className="text-base font-black italic">{lead.potentialValue}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Button
                                                onClick={() => router.push(`/creator/inbox?id=${lead.conversationId}`)}
                                                className="rounded-xl w-full font-black italic uppercase tracking-widest h-12 bg-primary-500 hover:bg-primary-600 shadow-xl shadow-primary-500/20"
                                            >
                                                Reply to Lead <ArrowUpRight className="w-4 h-4 ml-2" />
                                            </Button>
                                            <Button variant="ghost" className="rounded-xl w-full font-bold uppercase tracking-widest text-[10px] h-10">
                                                Archive
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-8 bg-gradient-to-br from-primary-500/5 via-[var(--card)] to-accent-500/5 rounded-[2.5rem] border border-primary-500/10 relative overflow-hidden group">
                <div className="p-4 rounded-2xl bg-primary-500/10 text-primary-400">
                    <Zap className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1 relative z-10 flex-1">
                    <p className="text-[10px] text-primary-400 font-black uppercase tracking-[0.3em] mb-1">Creator Intelligence</p>
                    <p className="text-sm text-[var(--muted-fg)] font-bold uppercase tracking-tight leading-relaxed max-w-2xl">
                        AI identifies high-intent users based on interaction depth. <span className="text-[var(--fg)]">Hot Leads</span> are those who clicked "Deploy" but did not complete setup, or asked specific custom build questions.
                    </p>
                </div>
                <ArrowUpRight className="absolute -bottom-4 -right-4 w-32 h-32 text-primary-500/5 group-hover:scale-125 transition-transform duration-700" />
            </div>
        </div>
    );
}
