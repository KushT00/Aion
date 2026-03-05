'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Bot,
    Settings,
    Play,
    Pause,
    Zap,
    Activity,
    History,
    Search,
    Filter,
    ArrowUpRight,
    Mail,
    Globe,
    MessageSquare,
    ExternalLink,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';

const instances = [
    {
        id: '1',
        name: 'LinkedIn Lead Scraper',
        integration: 'LinkedIn',
        status: 'running',
        tasksToday: 124,
        valueGenerated: '$120',
        lastActivity: '2 mins ago',
        icon: Globe,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10'
    },
    {
        id: '2',
        name: 'Smart Email Support',
        integration: 'Gmail',
        status: 'running',
        tasksToday: 48,
        valueGenerated: '$450',
        lastActivity: '1 hour ago',
        icon: Mail,
        color: 'text-primary-400',
        bg: 'bg-primary-500/10'
    },
    {
        id: '3',
        name: 'Discord Auto-Engagement',
        integration: 'Discord',
        status: 'paused',
        tasksToday: 0,
        valueGenerated: '$60',
        lastActivity: '2 days ago',
        icon: MessageSquare,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10'
    },
];

export default function MyAutomationsPage() {
    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">My Automations</h1>
                    <p className="text-[var(--muted-fg)]">Manage and monitor your active AI instances.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                        <input
                            type="text"
                            placeholder="Search instances..."
                            className="bg-[var(--muted)] border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 ring-primary-500/50 w-64 transition-all"
                        />
                    </div>
                    <Button variant="outline" size="icon" className="rounded-xl">
                        <Filter className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {instances.map((instance) => (
                    <Card key={instance.id} className="relative overflow-hidden group hover:border-primary-500/40 p-0 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                            {/* Icon & Name */}
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${instance.bg} ${instance.color} shrink-0 group-hover:scale-110 transition-transform`}>
                                    <instance.icon className="w-7 h-7" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">{instance.name}</h3>
                                        <Badge variant={instance.status === 'running' ? 'success' : 'default'} dot pulse={instance.status === 'running'}>
                                            {instance.status === 'running' ? 'Active' : 'Paused'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-[var(--muted-fg)] flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                                        Connect via <span className="text-[var(--fg)] underline decoration-primary-500/50">{instance.integration}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 px-2 md:px-0">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-[var(--muted-fg)] mb-1">Tasks Today</p>
                                    <p className="text-lg font-bold flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-amber-400" />
                                        {instance.tasksToday}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-[var(--muted-fg)] mb-1">Value Created</p>
                                    <p className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                                        <ArrowUpRight className="w-4 h-4" />
                                        {instance.valueGenerated}
                                    </p>
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-[10px] uppercase tracking-widest text-[var(--muted-fg)] mb-1">Last Activity</p>
                                    <p className="text-sm font-medium text-[var(--fg)] flex items-center gap-2">
                                        <History className="w-4 h-4 text-[var(--muted-fg)]" />
                                        {instance.lastActivity}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                                <Button variant="secondary" size="sm" className="rounded-xl flex-1 md:flex-none">
                                    Analytics
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl flex-1 md:flex-none">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Configure
                                </Button>
                                <Button
                                    variant={instance.status === 'running' ? 'ghost' : 'primary'}
                                    size="icon"
                                    className="rounded-xl h-9 w-9 shrink-0"
                                >
                                    {instance.status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Empty State Helper */}
            <div className="mt-12 text-center p-12 border-2 border-dashed border-[var(--border)] rounded-3xl">
                <div className="w-16 h-16 rounded-3xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-primary-400" />
                </div>
                <h3 className="font-bold text-xl mb-2">Need more workers?</h3>
                <p className="text-[var(--muted-fg)] max-w-sm mx-auto mb-6">
                    Our marketplace has thousands of digital workers ready to take over your boring tasks.
                </p>
                <Link href="/marketplace">
                    <Button variant="primary" className="rounded-full px-8">
                        Browse Marketplace
                    </Button>
                </Link>
            </div>
        </div>
    );
}
