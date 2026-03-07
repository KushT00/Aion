'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Package,
    MoreHorizontal,
    TrendingUp,
    Users,
    DollarSign,
    Edit3,
    Eye,
    Trash2,
    CheckCircle2,
    XCircle,
    Plus,
    Search
} from 'lucide-react';
import Link from 'next/link';

const listings = [
    {
        id: '1',
        title: 'AI Lead Magnet Pro',
        status: 'published',
        price: 4900,
        sales: 84,
        revenue: '$4,116',
        rating: 4.9,
        lastUpdated: '2 days ago',
        category: 'Lead Gen'
    },
    {
        id: '2',
        title: 'Notion Sync Engine',
        status: 'published',
        price: 2900,
        sales: 52,
        revenue: '$1,508',
        rating: 4.8,
        lastUpdated: '1 week ago',
        category: 'Utility'
    },
    {
        id: '3',
        title: 'Gmail Triage Bot',
        status: 'draft',
        price: 1900,
        sales: 0,
        revenue: '$0',
        rating: 0,
        lastUpdated: '3 hours ago',
        category: 'Communication'
    },
];

export default function CreatorListingsPage() {
    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">My Marketplace Listings</h1>
                    <p className="text-[var(--muted-fg)]">Manage, edit, and track the performance of your published automations.</p>
                </div>
                <Link href="/agent-wizard">
                    <Button className="rounded-xl shadow-lg shadow-primary-500/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Listing
                    </Button>
                </Link>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center gap-3 bg-[var(--card)] p-2 rounded-2xl border border-[var(--border)]">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                    <input
                        type="text"
                        placeholder="Search your listings..."
                        className="w-full bg-transparent border-none pl-10 pr-4 py-2 text-sm focus:ring-0"
                    />
                </div>
                <div className="h-6 w-[1px] bg-[var(--border)] mx-2" />
                <div className="flex gap-1">
                    {['All', 'Published', 'Drafts'].map(f => (
                        <button key={f} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f === 'All' ? 'bg-[var(--muted)] text-[var(--fg)]' : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {listings.map((item) => (
                    <Card key={item.id} className="group relative overflow-hidden flex flex-col hover:border-primary-500/40 transition-all p-0">
                        {/* Header Image Placeholder */}
                        <div className="h-32 bg-gradient-to-br from-[var(--muted)] to-[var(--border)] relative group-hover:from-primary-500/10 group-hover:to-accent-500/10 transition-colors">
                            <div className="absolute top-4 right-4">
                                <Badge variant={item.status === 'published' ? 'success' : 'default'} className="font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">
                                    {item.status}
                                </Badge>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform">
                                <Package className="w-12 h-12 text-[var(--muted-fg)]" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 space-y-4">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary-400">{item.category}</span>
                                    <span className="text-xs text-[var(--muted-fg)]">{item.lastUpdated}</span>
                                </div>
                                <h3 className="font-bold text-lg group-hover:text-primary-400 transition-colors truncate">{item.title}</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-2 border-y border-[var(--border)]">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-[var(--muted-fg)] uppercase font-bold tracking-tight">Revenue</p>
                                    <p className="text-sm font-black text-emerald-400">{item.revenue}</p>
                                </div>
                                <div className="space-y-0.5 text-right">
                                    <p className="text-[10px] text-[var(--muted-fg)] uppercase font-bold tracking-tight">Total Sales</p>
                                    <p className="text-sm font-black">{item.sales}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        {item.rating || 'N/A'}
                                    </div>
                                    <p className="text-sm font-bold">${item.price / 100}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg">
                                        <Edit3 className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Quick View Stats Overlay */}
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                    </Card>
                ))}
            </div>
        </div>
    );
}

