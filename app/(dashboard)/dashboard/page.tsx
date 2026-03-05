'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    Settings
} from 'lucide-react';
import Link from 'next/link';

const stats = [
    { label: 'Automations Saved', value: '42.5h', change: '+12% this week', icon: Clock, color: 'text-primary-400' },
    { label: 'Tasks Completed', value: '1,284', change: '+243 today', icon: Zap, color: 'text-amber-400' },
    { label: 'Value Generated', value: '$840', change: 'Estimated ROI', icon: TrendingUp, color: 'text-emerald-400' },
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

export default function ConsumerDashboard() {
    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
            {/* Hero Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-primary-900/40 to-accent-900/20 border border-primary-500/20 rounded-3xl p-8 lg:p-12">
                <div className="space-y-4">
                    <Badge variant="primary" pulse dot>System Active</Badge>
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight">
                        Good evening, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">Builder</span>
                    </h1>
                    <p className="text-[var(--muted-fg)] text-lg max-w-xl">
                        Your AI agents have saved you <span className="text-[var(--fg)] font-semibold">42 hours</span> this month. Explore the marketplace to find your next productivity multiplier.
                    </p>
                    <div className="flex gap-4 pt-2">
                        <Link href="/marketplace">
                            <Button size="lg" className="rounded-full px-8">
                                Explore Marketplace
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="flex gap-4 hidden xl:flex">
                    <div className="w-32 h-32 rounded-3xl bg-primary-500/10 border border-primary-500/20 flex flex-col items-center justify-center p-4">
                        <Activity className="w-8 h-8 text-primary-400 mb-2" />
                        <span className="text-2xl font-bold">99%</span>
                        <span className="text-[10px] uppercase text-[var(--muted-fg)]">Efficiency</span>
                    </div>
                </div>
            </div>

            {/* Value Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.label} className="relative overflow-hidden group hover:border-primary-500/40">
                        <div className="flex items-center gap-4">
                            <div className={cn("p-4 rounded-2xl bg-[var(--muted)] group-hover:scale-110 transition-transform duration-300", stat.color)}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-[var(--muted-fg)]">{stat.label}</p>
                                <h3 className="text-2xl font-bold">{stat.value}</h3>
                                <p className="text-xs text-emerald-400 font-medium">{stat.change}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Active Automations */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Active Automations</h2>
                    <Link href="/my-automations" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium transition-colors">
                        View all <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {activeInstances.map((instance) => (
                        <div key={instance.id} className="group relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 hover:border-primary-500/40 transition-all">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br", instance.gradient)}>
                                        <instance.icon className="w-7 h-7 text-white/90" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-lg">{instance.name}</h4>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="success" dot pulse>Running</Badge>
                                            <span className="text-xs text-[var(--muted-fg)]">{instance.lastRun}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="mt-6 pt-6 border-t border-[var(--border)] flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-widest text-[var(--muted-fg)]">Value Driven</span>
                                    <span className="text-sm font-semibold">{instance.metric}</span>
                                </div>
                                <Button variant="secondary" size="sm" className="rounded-xl">
                                    Analytics
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
