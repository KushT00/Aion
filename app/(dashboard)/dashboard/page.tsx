'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useAIChat } from '@/components/ai-chat-context';
import {
    Play,
    ArrowRight,
    Zap,
    TrendingUp,
    Clock,
    Mail,
    MessageSquare,
    ChevronRight,
    Activity,
    Settings,
    Star,
    Sparkles,
    Globe
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

const stats = [
    { label: 'Workforce Impact', value: '42.5h', change: '+12% this week', icon: Clock, color: 'text-primary-400' },
    { label: 'Tasks Completed', value: '1,284', change: '+243 today', icon: Zap, color: 'text-amber-400' },
    { label: 'Estimated ROI', value: '$840', change: 'Total Value Saved', icon: TrendingUp, color: 'text-emerald-400' },
];

const activeInstances = [
    {
        id: '1',
        name: 'Smart Email Triage',
        status: 'running',
        metric: '124 emails processed',
        lastRun: '2 mins ago',
        icon: Mail,
        gradient: 'from-blue-500/20 to-indigo-500/20'
    },
    {
        id: '2',
        name: 'Discord Lead Multiplier',
        status: 'running',
        metric: '12 hot leads found',
        lastRun: '15 mins ago',
        icon: MessageSquare,
        gradient: 'from-violet-500/20 to-purple-500/20'
    },
];

const recommendations = [
    { id: '1', title: 'LinkedIn Magnet', category: 'Lead Gen', rating: 4.9, icon: Globe, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { id: '2', title: 'Content Multiplier', category: 'Social', rating: 4.8, icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { id: '3', title: 'Market Pulse', category: 'Finance', rating: 4.7, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

export default function ConsumerDashboard() {
    const { profile } = useAuth();
    const { toggle: toggleChat } = useAIChat();

    const firstName = profile?.full_name?.split(' ')[0] || 'Partner';

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-900/40 via-accent-900/10 to-primary-900/40 border border-primary-500/20 rounded-[2.5rem] p-8 lg:p-14 shadow-2xl shadow-primary-500/5">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                    <Zap className="w-64 h-64 text-primary-400 rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Digital Workforce Active
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[0.9] uppercase italic">
                            {greeting}, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">{firstName}</span>
                        </h1>
                        <p className="text-[var(--muted-fg)] text-lg lg:text-xl max-w-xl font-bold uppercase tracking-tight opacity-80">
                            Your AI agents generated <span className="text-[var(--fg)]">42 hours</span> of freedom this month.
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
                            <Activity className="w-12 h-12 text-primary-400 animate-pulse" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--bg)]" />
                        </div>
                        <div className="text-center">
                            <p className="text-4xl font-black italic tracking-tighter">99.2%</p>
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-[var(--muted-fg)]">System Efficiency</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Value Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((stat) => (
                    <Card key={stat.label} className="p-8 border-[var(--border)] hover:border-primary-500/30 transition-all duration-300 rounded-3xl bg-[var(--card)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <stat.icon className="w-16 h-16" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--muted)]", stat.color)}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)]">{stat.label}</p>
                                <h3 className="text-3xl font-black italic tracking-tighter mt-1">{stat.value}</h3>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border-none">
                                        {stat.change}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Content: Active Automations */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Live Workforce</h2>
                        <Link href="/my-automations" className="text-xs font-black uppercase tracking-[0.2em] text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
                            Manager Portal <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {activeInstances.map((instance) => (
                            <div key={instance.id} className="group relative bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-8 hover:border-primary-500/30 transition-all duration-500 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-8">
                                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500", instance.gradient)}>
                                        <instance.icon className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="success" dot pulse className="bg-emerald-500/10 text-emerald-400 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">Active</Badge>
                                        <p className="text-[10px] font-bold text-[var(--muted-fg)] mt-2 uppercase tracking-tighter">{instance.lastRun}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <h4 className="text-xl font-black uppercase tracking-tight">{instance.name}</h4>
                                    <p className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-tight opacity-60">Status: Fully Autonomous</p>
                                </div>
                                <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-[var(--muted-fg)] tracking-widest opacity-40">Impact</p>
                                        <p className="text-sm font-black italic">{instance.metric}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary-500/10 hover:text-primary-400 transition-colors">
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar: Recommendations */}
                <div className="space-y-8">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Expand Workforce</h2>
                    <div className="space-y-4">
                        {recommendations.map((item) => (
                            <Link key={item.id} href="/marketplace" className="block group">
                                <Card className="p-5 border-[var(--border)] hover:border-primary-500/30 bg-[var(--card)] transition-all flex items-center gap-4 rounded-2xl">
                                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", item.bg)}>
                                        <item.icon className={cn("w-6 h-6", item.color)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-primary-400">{item.category}</span>
                                            <div className="flex items-center text-[10px] font-bold text-amber-400">
                                                <Star className="w-3 h-3 fill-current mr-0.5" /> {item.rating}
                                            </div>
                                        </div>
                                        <h4 className="font-extrabold text-sm truncate uppercase tracking-tighter">{item.title}</h4>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-[var(--muted-fg)] group-hover:translate-x-1 group-hover:text-primary-400 transition-all" />
                                </Card>
                            </Link>
                        ))}
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
