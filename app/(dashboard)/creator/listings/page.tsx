'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
    Search,
    Loader2,
    Bot,
    ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface CreatorListing {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    workflow_id: string;
    sales: number;
    revenue: number;
    rating_avg: number;
    workflow: {
        name: string;
        status: string;
    };
}

export default function CreatorListingsPage() {
    const [listings, setListings] = useState<CreatorListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'All' | 'Published' | 'Drafts'>('All');

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        async function fetchListings() {
            try {
                const res = await fetch('/api/creator/listings', { signal: controller.signal });
                const data = await res.json();

                if (isMounted && res.ok) {
                    setListings(data.listings || []);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Fetch listings error:', err);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        fetchListings();
        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    const formatCurrency = (cents: number) => {
        return `$${(cents / 100).toLocaleString()}`;
    };

    const timeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const filteredListings = listings.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
            filter === 'All' ||
            (filter === 'Published' && item.is_active) ||
            (filter === 'Drafts' && !item.is_active);
        return matchesSearch && matchesFilter;
    });

    if (isLoading) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-widest">Loading your empire...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold italic uppercase tracking-tighter">My Marketplace <span className="text-primary-400">Inventory</span></h1>
                    <p className="text-[var(--muted-fg)] font-medium">Manage, edit, and track the performance of your published automations.</p>
                </div>
                <Link href="/builder">
                    <Button className="rounded-xl shadow-lg shadow-primary-500/20 h-12 px-6 font-bold uppercase tracking-widest italic transition-transform active:scale-95">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Listing
                    </Button>
                </Link>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center gap-3 bg-[var(--card)] p-2 rounded-2xl border border-[var(--border)] shadow-xl shadow-primary-500/5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search your listings..."
                        className="w-full bg-transparent border-none pl-10 pr-4 py-2 text-sm focus:ring-0 font-bold placeholder:opacity-50"
                    />
                </div>
                <div className="h-6 w-[1px] bg-[var(--border)] mx-2" />
                <div className="flex gap-1">
                    {['All', 'Published', 'Drafts'].map((f: any) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                filter === f
                                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                                    : "text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)]"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {filteredListings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-6">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-primary-500/10 flex items-center justify-center">
                        <Package className="w-10 h-10 text-primary-400" />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold uppercase italic tracking-tight">No listings found</h3>
                        <p className="text-sm text-[var(--muted-fg)] font-medium">
                            {searchQuery ? "Try a different search term" : "You haven't published any automations yet."}
                        </p>
                    </div>
                </div>
            )}

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredListings.map((item) => (
                    <Card key={item.id} className="group relative overflow-hidden flex flex-col hover:border-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-500 p-0 rounded-[2rem] border-[var(--border)] bg-[var(--card)]">
                        {/* Status Stripe */}
                        <div className={cn("h-1.5 w-full", item.is_active ? "bg-primary-500" : "bg-[var(--muted)]")} />

                        {/* Content */}
                        <div className="p-6 flex-1 space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="primary" className={cn(
                                        "font-black uppercase tracking-widest text-[8px] px-2 py-0.5 rounded-lg",
                                        item.is_active ? "bg-primary-500/10 text-primary-400 border-primary-500/20" : "bg-[var(--muted)] text-[var(--muted-fg)]"
                                    )}>
                                        {item.is_active ? 'Live on Marketplace' : 'Draft'}
                                    </Badge>
                                    <span className="text-[10px] font-black text-[var(--muted-fg)] uppercase tracking-widest opacity-60">
                                        Updated {timeAgo(item.updated_at)}
                                    </span>
                                </div>
                                <h3 className="font-black text-xl group-hover:text-primary-400 transition-colors truncate uppercase italic tracking-tighter">
                                    {item.title}
                                </h3>
                                <p className="text-[10px] uppercase font-black tracking-widest text-primary-400/80">{item.category}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-[var(--border)]">
                                <div className="space-y-1">
                                    <p className="text-[9px] text-[var(--muted-fg)] uppercase font-black tracking-widest opacity-60">Revenue</p>
                                    <p className="text-lg font-black text-emerald-400 italic">{formatCurrency(item.revenue)}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[9px] text-[var(--muted-fg)] uppercase font-black tracking-widest opacity-60">Sales</p>
                                    <p className="text-lg font-black text-[var(--fg)] italic">{item.sales}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        {item.rating_avg > 0 ? item.rating_avg.toFixed(1) : 'N/A'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] uppercase font-black text-[var(--muted-fg)] tracking-tighter">Price</span>
                                        <p className="text-sm font-black italic">{formatCurrency(item.price)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/builder?id=${item.workflow_id}`}>
                                        <Button variant="outline" className="h-10 rounded-xl font-bold uppercase tracking-widest text-[10px] group-hover:border-primary-500/30">
                                            <Edit3 className="w-3.5 h-3.5 mr-2" />
                                            Edit
                                        </Button>
                                    </Link>
                                    <Link href={`/marketplace/${item.id}`} target="_blank">
                                        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary-500 hover:text-white transition-colors">
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Help Card */}
            <Card className="p-8 border-dashed border-2 bg-primary-500/[0.02] mt-12">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary-500/10 flex items-center justify-center">
                        <Bot className="w-8 h-8 text-primary-400" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold uppercase tracking-tight italic">Boost your sales?</h4>
                        <p className="text-sm text-[var(--muted-fg)] font-medium">Add better documentation or video demos to your listings to increase trust by up to 40%.</p>
                    </div>
                    <Button variant="outline" className="ml-auto rounded-xl font-bold uppercase tracking-widest text-[10px]">Learn More</Button>
                </div>
            </Card>
        </div>
    );
}
