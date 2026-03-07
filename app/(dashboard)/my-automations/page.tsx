'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
    Sparkles,
    Loader2,
    Package,
    Terminal
} from 'lucide-react';
import Link from 'next/link';

interface PurchasedAutomation {
    id: string;
    created_at: string;
    listing: {
        id: string;
        title: string;
        description: string;
        category: string;
        seller: {
            full_name: string;
        };
        workflow: {
            id: string;
            name: string;
            status: string;
        };
    };
}

export default function MyAutomationsPage() {
    const [automations, setAutomations] = useState<PurchasedAutomation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        async function fetchAutomations() {
            try {
                const res = await fetch('/api/my-automations', { signal: controller.signal });
                const data = await res.json();
                if (isMounted && res.ok) {
                    setAutomations(data.automations || []);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') console.error(err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        fetchAutomations();
        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    const filtered = automations.filter(a =>
        a.listing.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-widest">Waking up your workers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">My <span className="text-primary-400">Automations</span></h1>
                    <p className="text-[var(--muted-fg)] font-medium">Manage and monitor your active AI instances.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search instances..."
                            className="bg-[var(--muted)] border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-1 ring-primary-500/50 w-64 transition-all font-bold placeholder:opacity-50"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filtered.map((item) => (
                    <Card key={item.id} className="relative overflow-hidden group hover:border-primary-500/40 p-0 transition-all duration-500 rounded-[2rem] border-[var(--border)] bg-[var(--card)] shadow-xl shadow-black/5">
                        <div className="flex flex-col lg:flex-row lg:items-center p-6 gap-8">
                            {/* Icon & Name */}
                            <div className="flex items-center gap-6 flex-1">
                                <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-primary-500/10 text-primary-400 shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                    <Bot className="w-8 h-8" />
                                </div>
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-black text-xl uppercase italic tracking-tighter truncate">{item.listing.title}</h3>
                                        <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-black uppercase tracking-widest text-[8px] animate-pulse">
                                            Instance Live
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)]">
                                        <span className="flex items-center gap-1.5"><Package className="w-3 h-3" /> {item.listing.category}</span>
                                        <span className="flex items-center gap-1.5"><Terminal className="w-3 h-3" /> {item.listing.seller.full_name}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 px-2 md:px-0">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)] opacity-50">Tasks Today</p>
                                    <p className="text-xl font-black italic flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-amber-400" />
                                        0
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)] opacity-50">Impact</p>
                                    <p className="text-xl font-black italic flex items-center gap-2 text-emerald-400">
                                        <ArrowUpRight className="w-4 h-4" />
                                        $0.00
                                    </p>
                                </div>
                                <div className="hidden md:block space-y-1">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)] opacity-50">Purchased</p>
                                    <p className="text-sm font-black uppercase flex items-center gap-2">
                                        <History className="w-4 h-4 text-[var(--muted-fg)]" />
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 border-t lg:border-t-0 pt-6 lg:pt-0">
                                {item.listing.workflow ? (
                                    <Link href={`/builder?id=${item.listing.workflow.id}`} className="flex-1 md:flex-none">
                                        <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20 bg-gradient-to-r from-primary-600 to-primary-500">
                                            Open Controller
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button disabled className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] opacity-50">
                                        Under Setup
                                    </Button>
                                )}
                                <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl opacity-60 hover:opacity-100 transition-opacity">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {automations.length === 0 && (
                <div className="mt-12 text-center p-20 border-2 border-dashed border-[var(--border)] rounded-[3rem] bg-primary-500/[0.01]">
                    <div className="w-20 h-20 rounded-[2rem] bg-primary-500/10 flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-10 h-10 text-primary-400" />
                    </div>
                    <h3 className="font-black text-2xl uppercase italic mb-2">Build your workforce</h3>
                    <p className="text-[var(--muted-fg)] max-w-sm mx-auto mb-8 font-medium">
                        You haven't purchased any automations yet. Browse the marketplace to find AI agents ready to work for you.
                    </p>
                    <Link href="/marketplace">
                        <Button className="rounded-2xl px-10 h-14 font-black uppercase tracking-widest italic shadow-xl shadow-primary-500/20">
                            Browse Marketplace
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
