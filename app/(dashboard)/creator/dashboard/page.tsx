'use client';

import { useState, useEffect } from 'react';
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
    GitBranch,
    Loader2,
    Sparkles,
    Bot
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
    totalRevenue: number;
    recentRevenue: number;
    activeSubscribers: number;
    totalRuns: number;
    totalListings: number;
    activeListings: number;
    totalPurchases: number;
    recentPurchases: number;
}

interface TopListing {
    id: string;
    name: string;
    sales: number;
    revenue: number;
    rating: number;
    active: boolean;
    category: string;
}

export default function CreatorDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [topListings, setTopListings] = useState<TopListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboard() {
            try {
                const res = await fetch('/api/creator/dashboard');
                const data = await res.json();

                if (res.ok) {
                    setStats(data.stats);
                    setTopListings(data.topListings || []);
                }
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDashboard();
    }, []);

    const formatCurrency = (cents: number) => {
        return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
    };

    if (isLoading) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-widest">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const creatorStats = [
        {
            label: 'Total Revenue',
            value: stats ? formatCurrency(stats.totalRevenue) : '$0',
            change: stats ? `+${formatCurrency(stats.recentRevenue)} this week` : '',
            icon: DollarSign,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10'
        },
        {
            label: 'Active Subscribers',
            value: stats?.activeSubscribers?.toString() || '0',
            change: stats ? `${stats.recentPurchases} new this week` : '',
            icon: Users,
            color: 'text-primary-400',
            bg: 'bg-primary-500/10'
        },
        {
            label: 'Workflow Runs',
            value: stats?.totalRuns?.toLocaleString() || '0',
            change: stats ? `${stats.activeListings} active listings` : '',
            icon: GitBranch,
            color: 'text-accent-400',
            bg: 'bg-accent-500/10'
        },
    ];

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
                    <Link href="/builder">
                        <Button className="rounded-xl">
                            <Package className="w-4 h-4 mr-2" />
                            Build & Publish
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
                        </div>
                        <p className="text-xs text-[var(--muted-fg)] mt-1">{stat.change}</p>
                    </Card>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Performance Summary */}
                <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary-400" />
                            Performance Overview
                        </h3>
                    </div>
                    <div className="flex-1 p-6">
                        {stats && stats.totalListings > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <p className="text-xs text-[var(--muted-fg)] font-bold uppercase tracking-widest">Total Listings</p>
                                    <p className="text-3xl font-black">{stats.totalListings}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-[var(--muted-fg)] font-bold uppercase tracking-widest">Active</p>
                                    <p className="text-3xl font-black text-emerald-400">{stats.activeListings}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-[var(--muted-fg)] font-bold uppercase tracking-widest">Total Sales</p>
                                    <p className="text-3xl font-black">{stats.totalPurchases}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-[var(--muted-fg)] font-bold uppercase tracking-widest">Lifetime Revenue</p>
                                    <p className="text-3xl font-black text-primary-400">{formatCurrency(stats.totalRevenue)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                                    <Bot className="w-8 h-8 text-primary-400" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="font-bold">No listings yet</p>
                                    <p className="text-xs text-[var(--muted-fg)]">Build and publish your first automation to start earning.</p>
                                </div>
                                <Link href="/builder">
                                    <Button size="sm" className="rounded-xl">
                                        <Sparkles className="w-4 h-4 mr-2" /> Build First Automation
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Top Listings */}
                <Card className="p-6 space-y-6">
                    <h3 className="font-bold flex items-center justify-between">
                        Top Listings
                        <Link href="/creator/listings">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </Link>
                    </h3>
                    <div className="space-y-5">
                        {topListings.length > 0 ? (
                            topListings.map((item) => (
                                <div key={item.id} className="flex items-center justify-between group">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold group-hover:text-primary-400 transition-colors uppercase tracking-tight">{item.name}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center text-[10px] text-amber-400">
                                                <TrendingUp className="w-3 h-3 mr-1" /> {item.rating?.toFixed(1) || '0.0'}
                                            </div>
                                            <span className="text-[10px] text-[var(--muted-fg)]">{item.sales} Sales</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold">{formatCurrency(item.revenue)}</p>
                                        <Badge variant={item.active ? 'success' : 'default'} className="text-[9px] py-0 px-1.5 h-4">
                                            {item.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-xs text-[var(--muted-fg)]">No listings yet. Publish your first one!</p>
                            </div>
                        )}
                    </div>
                    <Link href="/creator/listings">
                        <Button variant="outline" className="w-full rounded-xl text-xs font-bold border-primary-500/20 hover:bg-primary-500/5">
                            Manage All Listings
                        </Button>
                    </Link>
                </Card>
            </div>
        </div>
    );
}
