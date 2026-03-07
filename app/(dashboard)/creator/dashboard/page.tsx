'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    DollarSign,
    Users,
    TrendingUp,
    ArrowUpRight,
    Package,
    BarChart3,
    MoreHorizontal,
    Plus,
    Activity,
    GitBranch
} from 'lucide-react';
import Link from 'next/link';

const creatorStats = [
    { label: 'Total Revenue', value: '$12,450', change: '+$1,240 this month', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Active Subscribers', value: '184', change: '+12 new today', icon: Users, color: 'text-primary-400', bg: 'bg-primary-500/10' },
    { label: 'Workflow Runs', value: '45,201', change: '+2.1k since yesterday', icon: GitBranch, color: 'text-accent-400', bg: 'bg-accent-500/10' },
];

const topListings = [
    { name: 'AI Lead Magnet Pro', sales: 84, revenue: '$4,116', rating: 4.9, active: true },
    { name: 'Notion Sync Engine', sales: 52, revenue: '$2,548', rating: 4.8, active: true },
    { name: 'Gmail Triage Bot', sales: 48, revenue: '$1,920', rating: 4.7, active: false },
];

export default function CreatorDashboard() {
    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">Creator Studio</h1>
                    <p className="text-[var(--muted-fg)]">Manage your automation empire and track performance.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/builder">
                        <Button variant="outline" className="rounded-xl">
                            <Plus className="w-4 h-4 mr-2" />
                            New Workflow
                        </Button>
                    </Link>
                    <Link href="/agent-wizard">
                        <Button className="rounded-xl">
                            <Package className="w-4 h-4 mr-2" />
                            Publish Listing
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {creatorStats.map((stat) => (
                    <Card key={stat.label} className="border-none bg-gradient-to-br from-[var(--card)] to-[var(--muted)] hover:shadow-xl transition-all duration-500 group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <Badge variant="primary" className="bg-transparent border-primary-500/20 text-primary-400">
                                <Activity className="w-3 h-3 mr-1" /> Live
                            </Badge>
                        </div>
                        <p className="text-sm text-[var(--muted-fg)] font-medium">{stat.label}</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
                            <span className="text-xs text-emerald-400 flex items-center">
                                <ArrowUpRight className="w-3 h-3" /> 12%
                            </span>
                        </div>
                        <p className="text-xs text-[var(--muted-fg)] mt-1">{stat.change}</p>
                    </Card>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Performance Chart Placeholder */}
                <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary-400" />
                            Revenue Statistics
                        </h3>
                        <div className="flex gap-2">
                            {['7D', '1M', '1Y'].map(t => (
                                <button key={t} className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--muted)] hover:bg-[var(--border)] transition-colors uppercase">
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 min-h-[300px] flex items-center justify-center bg-[var(--muted)]/30">
                        <div className="flex flex-col items-center gap-3 text-[var(--muted-fg)]">
                            <TrendingUp className="w-12 h-12 opacity-20" />
                            <p className="text-sm">Revenue analytics visualization loading...</p>
                        </div>
                    </div>
                </Card>

                {/* Top Listings */}
                <Card className="p-6 space-y-6">
                    <h3 className="font-bold flex items-center justify-between">
                        Top Listings
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </h3>
                    <div className="space-y-5">
                        {topListings.map((item) => (
                            <div key={item.name} className="flex items-center justify-between group">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold group-hover:text-primary-400 transition-colors uppercase tracking-tight">{item.name}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center text-[10px] text-amber-400">
                                            <TrendingUp className="w-3 h-3 mr-1" /> {item.rating}
                                        </div>
                                        <span className="text-[10px] text-[var(--muted-fg)]">{item.sales} Sales</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold">{item.revenue}</p>
                                    <Badge variant={item.active ? 'success' : 'default'} className="text-[9px] py-0 px-1.5 h-4">
                                        {item.active ? 'Active' : 'Draft'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" className="w-full rounded-xl text-xs font-bold border-primary-500/20 hover:bg-primary-500/5">
                        Manage All Listings
                    </Button>
                </Card>
            </div>
        </div>
    );
}
