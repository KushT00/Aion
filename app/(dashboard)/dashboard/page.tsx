'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useAIChat } from '@/components/ai-chat-context';
import {
    ArrowRight,
    Zap,
    TrendingUp,
    Clock,
    ChevronRight,
    Activity,
    Settings,
    Star,
    Sparkles,
    Globe,
    MessageSquare,
    Bot,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Pause,
    Key,
    BarChart3,
    Package,
} from 'lucide-react';
import Link from 'next/link';

// Status config matching my-automations page
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; borderColor: string; pulse?: boolean }> = {
    active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', pulse: true },
    setup_required: { label: 'Setup Required', color: 'text-amber-400', bg: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
    paused: { label: 'Paused', color: 'text-[var(--muted-fg)]', bg: 'bg-[var(--muted)]', borderColor: 'border-[var(--border)]' },
    error: { label: 'Error', color: 'text-rose-400', bg: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
};

const STATUS_ICONS: Record<string, typeof Bot> = {
    active: CheckCircle2,
    setup_required: Key,
    paused: Pause,
    error: AlertCircle,
};

interface DashboardInstance {
    id: string;
    status: string;
    total_runs: number;
    total_successes: number;
    total_failures: number;
    last_run_at: string | null;
    listing?: {
        id: string;
        title: string;
        description: string;
        category: string;
        seller?: { full_name: string; avatar_url: string | null };
    };
}

interface DashboardStats {
    totalInstances: number;
    activeCount: number;
    totalRuns: number;
    totalSuccesses: number;
    totalFailures: number;
    successRate: number;
}

interface MarketplaceRecommendation {
    id: string;
    title: string;
    category: string;
    rating_avg: number;
    price: number;
    currency: string;
}

export default function ConsumerDashboard() {
    const { profile } = useAuth();
    const { toggle: toggleChat } = useAIChat();

    const [instances, setInstances] = useState<DashboardInstance[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recommendations, setRecommendations] = useState<MarketplaceRecommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const firstName = profile?.full_name?.split(' ')[0] || 'Partner';

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

    // Fetch real data
    useEffect(() => {
        let cancelled = false;

        async function fetchDashboard() {
            try {
                // Fetch instances + stats
                const instRes = await fetch('/api/consumer/instances');
                if (instRes.ok) {
                    const data = await instRes.json();
                    if (!cancelled) {
                        setInstances(data.instances || []);
                        setStats(data.stats || null);
                    }
                }

                // Fetch marketplace recommendations (top rated listings)
                const recRes = await fetch('/api/marketplace/listings?limit=3&sort=rating');
                if (recRes.ok) {
                    const recData = await recRes.json();
                    if (!cancelled) {
                        setRecommendations(recData.listings || []);
                    }
                }
            } catch (err) {
                console.error('[Dashboard] Fetch error:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        fetchDashboard();
        return () => { cancelled = true; };
    }, []);

    // Derive display stats
    const totalRuns = stats?.totalRuns || 0;
    const successRate = stats?.successRate || 0;
    const activeCount = stats?.activeCount || 0;
    // Estimate time saved: ~5 minutes per successful run
    const hoursSaved = ((stats?.totalSuccesses || 0) * 5 / 60).toFixed(1);

    // Category icons for recommendations
    const CATEGORY_ICONS: Record<string, { icon: typeof Globe; color: string; bg: string }> = {
        'Lead Gen': { icon: Globe, color: 'text-sky-400', bg: 'bg-sky-500/10' },
        'Social': { icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        'Finance': { icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        'Utility': { icon: Zap, color: 'text-primary-400', bg: 'bg-primary-500/10' },
        'E-commerce': { icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    };

    const defaultCategoryIcon = { icon: Bot, color: 'text-primary-400', bg: 'bg-primary-500/10' };

    if (isLoading) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-widest">Loading your command center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-8 lg:p-14 shadow-premium group">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent-500/5 opacity-40 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                    <Zap className="w-64 h-64 text-primary-400 rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-500 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest">
                            <div className={cn("w-1.5 h-1.5 rounded-full", activeCount > 0 ? "bg-emerald-400 animate-pulse" : "bg-[var(--muted-fg)]")} />
                            {activeCount > 0 ? `${activeCount} Agent${activeCount > 1 ? 's' : ''} Active` : 'Digital Workforce Standby'}
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[0.9] uppercase italic">
                            {greeting}, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-500 dark:from-primary-400 dark:to-accent-400">{firstName}</span>
                        </h1>
                        <p className="text-[var(--muted-fg)] text-lg lg:text-xl max-w-xl font-bold uppercase tracking-tight">
                            {totalRuns > 0 ? (
                                <>Your AI agents saved <span className="text-[var(--fg)]">{hoursSaved} hours</span> with <span className="text-[var(--fg)]">{totalRuns.toLocaleString()} tasks</span> completed.</>
                            ) : (
                                <>Deploy your first AI agent to start automating your workflow.</>
                            )}
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <Link href="/marketplace">
                                <Button size="lg" className="rounded-2xl px-10 h-14 font-black uppercase italic tracking-widest shadow-xl shadow-primary-500/20">
                                    Expand Workforce <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                            <Button variant="outline" size="lg" onClick={toggleChat} className="rounded-2xl px-10 h-14 font-black uppercase tracking-widest border-2">
                                <Sparkles className="w-4 h-4 mr-2 text-primary-400" />
                                Hire with AI
                            </Button>
                        </div>
                    </div>

                    <div className="hidden xl:flex flex-col items-center justify-center p-8 rounded-[3rem] bg-[var(--card)]/50 border border-white/5 backdrop-blur-md shadow-2xl space-y-3">
                        <div className="relative">
                            <Activity className={cn("w-12 h-12 text-primary-400", activeCount > 0 ? "animate-pulse" : "opacity-40")} />
                            {activeCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--bg)]" />
                            )}
                        </div>
                        <div className="text-center">
                            <p className="text-4xl font-black italic tracking-tighter">{successRate}%</p>
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-[var(--muted-fg)]">Success Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Value Metrics — Real Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Time Saved', value: `${hoursSaved}h`, change: `${stats?.totalSuccesses || 0} successful runs`, icon: Clock, color: 'text-primary-500 dark:text-primary-400' },
                    { label: 'Tasks Completed', value: totalRuns.toLocaleString(), change: `${successRate}% success rate`, icon: Zap, color: 'text-amber-500 dark:text-amber-400' },
                    { label: 'Active Agents', value: activeCount.toString(), change: `${stats?.totalInstances || 0} total deployed`, icon: TrendingUp, color: 'text-emerald-500 dark:text-emerald-400' },
                ].map((stat) => (
                    <Card key={stat.label} className="p-8 border-[var(--border)] hover:border-primary-500/30 transition-all duration-500 rounded-[2rem] bg-[var(--card)] relative overflow-hidden group shadow-premium hover:-translate-y-1">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none">
                            <stat.icon className="w-24 h-24" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-primary-500/5 dark:bg-[var(--muted)]", stat.color)}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)] opacity-70">{stat.label}</p>
                                <h3 className="text-3xl font-black italic tracking-tighter mt-1">{stat.value}</h3>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-[10px] font-bold border-none px-2 py-0.5">
                                        {stat.change}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Content: Real Active Automations */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Live Workforce</h2>
                        <Link href="/my-automations" className="text-xs font-black uppercase tracking-[0.2em] text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
                            Manager Portal <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {instances.length === 0 ? (
                        <div className="text-center p-16 border-2 border-dashed border-[var(--border)] rounded-[2rem] bg-primary-500/[0.01]">
                            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                                <Bot className="w-8 h-8 text-primary-400" />
                            </div>
                            <h3 className="font-black text-xl uppercase italic mb-2">No agents deployed yet</h3>
                            <p className="text-[var(--muted-fg)] max-w-sm mx-auto mb-6 font-medium text-sm">
                                Browse the marketplace to find AI agents ready to automate your work.
                            </p>
                            <Link href="/marketplace">
                                <Button className="rounded-xl px-8 h-12 font-black uppercase tracking-widest text-xs">
                                    Browse Marketplace
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {instances.slice(0, 4).map((instance) => {
                                const statusConf = STATUS_CONFIG[instance.status] || STATUS_CONFIG.setup_required;
                                const StatusIcon = STATUS_ICONS[instance.status] || Bot;
                                const listing = instance.listing;

                                return (
                                    <Link key={instance.id} href={`/my-automations/${instance.id}/setup`} className="block">
                                        <div className="group relative bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-8 hover:border-primary-500/30 transition-all duration-500 flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-8">
                                                <div className={cn(
                                                    "w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500",
                                                    statusConf.bg
                                                )}>
                                                    <Bot className={cn("w-8 h-8", statusConf.color)} />
                                                </div>
                                                <div className="text-right">
                                                    <Badge className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest border",
                                                        statusConf.bg, statusConf.color, statusConf.borderColor,
                                                        statusConf.pulse ? "animate-pulse" : ""
                                                    )}>
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {statusConf.label}
                                                    </Badge>
                                                    {instance.last_run_at && (
                                                        <p className="text-[10px] font-bold text-[var(--muted-fg)] mt-2 uppercase tracking-tighter">
                                                            {new Date(instance.last_run_at).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2 flex-1">
                                                <h4 className="text-xl font-black uppercase tracking-tight truncate">{listing?.title || 'Automation'}</h4>
                                                <p className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-wider opacity-60">
                                                    {listing?.category || 'Automation'} · {listing?.seller?.full_name || 'Creator'}
                                                </p>
                                            </div>
                                            <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] uppercase font-black text-[var(--muted-fg)] tracking-widest opacity-40">Runs</p>
                                                    <p className="text-sm font-black italic flex items-center gap-1.5">
                                                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                                                        {instance.total_runs || 0}
                                                        {instance.total_runs > 0 && (
                                                            <span className="text-emerald-400 text-xs ml-1">
                                                                ({Math.round(((instance.total_successes || 0) / instance.total_runs) * 100)}%)
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary-500/10 hover:text-primary-400 transition-colors">
                                                    <Settings className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar: Marketplace Recommendations (Real data) */}
                <div className="space-y-8">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Expand Workforce</h2>
                    <div className="space-y-4">
                        {recommendations.length > 0 ? (
                            recommendations.map((item) => {
                                const catInfo = CATEGORY_ICONS[item.category] || defaultCategoryIcon;
                                const CatIcon = catInfo.icon;

                                return (
                                    <Link key={item.id} href={`/marketplace/${item.id}`} className="block group">
                                        <Card className="p-5 border-[var(--border)] hover:border-primary-500/30 bg-[var(--card)] transition-all flex items-center gap-4 rounded-2xl">
                                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", catInfo.bg)}>
                                                <CatIcon className={cn("w-6 h-6", catInfo.color)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-primary-400">{item.category}</span>
                                                    {item.rating_avg > 0 && (
                                                        <div className="flex items-center text-[10px] font-bold text-amber-400">
                                                            <Star className="w-3 h-3 fill-current mr-0.5" /> {item.rating_avg.toFixed(1)}
                                                        </div>
                                                    )}
                                                </div>
                                                <h4 className="font-extrabold text-sm truncate uppercase tracking-tighter">{item.title}</h4>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-[var(--muted-fg)] group-hover:translate-x-1 group-hover:text-primary-400 transition-all" />
                                        </Card>
                                    </Link>
                                );
                            })
                        ) : (
                            // Fallback: show generic CTA when no listings exist
                            <div className="text-center p-6 border border-dashed border-[var(--border)] rounded-2xl">
                                <p className="text-xs font-bold text-[var(--muted-fg)] opacity-60">Marketplace listings coming soon</p>
                            </div>
                        )}

                        <Link href="/marketplace" className="block">
                            <Button variant="outline" className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest border-2 hover:bg-primary-500/5">
                                View Full Workforce
                            </Button>
                        </Link>
                    </div>

                    {/* Concierge Promo */}
                    <Card className="p-8 bg-gradient-to-br from-primary-600/20 to-accent-600/20 border-primary-500/30 rounded-[2rem] space-y-4 relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-lg font-black uppercase tracking-tight italic leading-tight">Can't find what <br /> you need?</h3>
                            <p className="text-xs font-bold text-[var(--muted-fg)] leading-relaxed uppercase tracking-tight opacity-70">
                                Our AI Concierge can build a custom agent for your specific business needs.
                            </p>
                            <Button onClick={toggleChat} size="sm" className="mt-4 rounded-xl px-5 font-black uppercase italic tracking-widest bg-white text-black hover:bg-white/90">
                                Chat with AI
                            </Button>
                        </div>
                        <Sparkles className="absolute -bottom-4 -right-4 w-24 h-24 text-primary-400/10 group-hover:scale-125 transition-transform duration-700" />
                    </Card>
                </div>
            </div>
        </div>
    );
}
