'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    GitBranch,
    Play,
    Store,
    TrendingUp,
    Plus,
    ArrowRight,
    Activity,
    Clock,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const stats = [
    {
        label: 'Total Workflows',
        value: '12',
        change: '+3 this week',
        icon: GitBranch,
        color: 'from-primary-500 to-primary-600',
    },
    {
        label: 'Total Runs',
        value: '248',
        change: '+52 this week',
        icon: Play,
        color: 'from-accent-500 to-accent-600',
    },
    {
        label: 'Marketplace Sales',
        value: '$1,240',
        change: '+18% this month',
        icon: Store,
        color: 'from-emerald-500 to-emerald-600',
    },
    {
        label: 'Success Rate',
        value: '96.8%',
        change: '+2.1% vs last month',
        icon: TrendingUp,
        color: 'from-amber-500 to-amber-600',
    },
];

const recentActivity = [
    {
        id: 1,
        type: 'run',
        title: 'Email Automation Flow',
        status: 'success' as const,
        time: '2 mins ago',
    },
    {
        id: 2,
        type: 'run',
        title: 'Data Scraping Pipeline',
        status: 'running' as const,
        time: '12 mins ago',
    },
    {
        id: 3,
        type: 'publish',
        title: 'Social Media Bot',
        status: 'success' as const,
        time: '1 hour ago',
    },
    {
        id: 4,
        type: 'run',
        title: 'Report Generator',
        status: 'failed' as const,
        time: '3 hours ago',
    },
    {
        id: 5,
        type: 'run',
        title: 'Customer Support Agent',
        status: 'success' as const,
        time: '5 hours ago',
    },
];

const statusConfig = {
    success: { icon: CheckCircle, variant: 'success' as const, label: 'Success' },
    running: { icon: Activity, variant: 'info' as const, label: 'Running' },
    failed: { icon: XCircle, variant: 'error' as const, label: 'Failed' },
};

export default function DashboardPage() {
    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--fg)]">Dashboard</h1>
                    <p className="text-[var(--muted-fg)] mt-1">
                        Welcome back! Here&apos;s what&apos;s happening with your workflows.
                    </p>
                </div>
                <Link href="/builder">
                    <Button>
                        <Plus className="w-4 h-4" />
                        New Workflow
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {stats.map((stat) => (
                    <Card
                        key={stat.label}
                        className="hover:shadow-lg hover:-translate-y-1 cursor-default group"
                    >
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                                >
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-[var(--fg)] mb-1">
                                {stat.value}
                            </div>
                            <div className="text-sm text-[var(--muted-fg)]">{stat.label}</div>
                            <div className="text-xs text-emerald-500 mt-2 font-medium">
                                {stat.change}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Recent Activity */}
                <Card className="lg:col-span-3">
                    <div className="p-6 border-b border-[var(--border)]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[var(--fg)]">
                                Recent Activity
                            </h2>
                            <Link href="/runs">
                                <Button variant="ghost" size="sm">
                                    View all
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {recentActivity.map((activity) => {
                            const config = statusConfig[activity.status];
                            return (
                                <div
                                    key={activity.id}
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--muted)] transition-colors"
                                >
                                    <div className="flex-shrink-0">
                                        <config.icon
                                            className={`w-5 h-5 ${activity.status === 'success'
                                                    ? 'text-emerald-500'
                                                    : activity.status === 'running'
                                                        ? 'text-blue-500 animate-pulse'
                                                        : 'text-red-500'
                                                }`}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--fg)] truncate">
                                            {activity.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Clock className="w-3 h-3 text-[var(--muted-fg)]" />
                                            <span className="text-xs text-[var(--muted-fg)]">{activity.time}</span>
                                        </div>
                                    </div>
                                    <Badge variant={config.variant} dot pulse={activity.status === 'running'}>
                                        {config.label}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Quick Actions */}
                <Card className="lg:col-span-2">
                    <div className="p-6 border-b border-[var(--border)]">
                        <h2 className="text-lg font-semibold text-[var(--fg)]">Quick Actions</h2>
                    </div>
                    <div className="p-6 space-y-3">
                        <Link href="/builder" className="block">
                            <button className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] hover:border-primary-500/50 transition-all group text-left">
                                <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Plus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[var(--fg)]">Create Workflow</p>
                                    <p className="text-xs text-[var(--muted-fg)]">
                                        Build a new digital worker
                                    </p>
                                </div>
                            </button>
                        </Link>
                        <Link href="/marketplace" className="block">
                            <button className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] hover:border-primary-500/50 transition-all group text-left">
                                <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Store className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[var(--fg)]">Browse Marketplace</p>
                                    <p className="text-xs text-[var(--muted-fg)]">
                                        Discover community workflows
                                    </p>
                                </div>
                            </button>
                        </Link>
                        <Link href="/workflows" className="block">
                            <button className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] hover:border-primary-500/50 transition-all group text-left">
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <GitBranch className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[var(--fg)]">My Workflows</p>
                                    <p className="text-xs text-[var(--muted-fg)]">
                                        Manage your creations
                                    </p>
                                </div>
                            </button>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
