'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    TrendingUp,
    Filter,
    Zap,
    Users,
    ArrowRight,
    LayoutGrid,
    List,
    Star,
    Sparkles,
    ShieldCheck,
    Globe,
    MessageCircle,
    Mail,
    ChevronDown,
    Loader2,
    Bot,
    Package,
    RefreshCw,
    Key
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const categories = ['All', 'Lead Gen', 'Social Media', 'E-commerce', 'Utility', 'SaaS Sync', 'Support', 'Finance'];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'price_low', label: 'Price: Low → High' },
    { value: 'price_high', label: 'Price: High → Low' },
];

const categoryColors: Record<string, { color: string; bg: string; accent: string }> = {
    'Lead Gen': { color: 'text-sky-400', bg: 'bg-sky-500/10', accent: 'border-sky-500/30' },
    'Social Media': { color: 'text-violet-400', bg: 'bg-violet-500/10', accent: 'border-violet-500/30' },
    'E-commerce': { color: 'text-pink-400', bg: 'bg-pink-500/10', accent: 'border-pink-500/30' },
    'Utility': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', accent: 'border-emerald-500/30' },
    'SaaS Sync': { color: 'text-blue-400', bg: 'bg-blue-500/10', accent: 'border-blue-500/30' },
    'Support': { color: 'text-orange-400', bg: 'bg-orange-500/10', accent: 'border-orange-500/30' },
    'Finance': { color: 'text-amber-400', bg: 'bg-amber-500/10', accent: 'border-amber-500/30' },
};

const categoryIcons: Record<string, any> = {
    'Lead Gen': Globe,
    'Social Media': MessageCircle,
    'E-commerce': Package,
    'Utility': Zap,
    'SaaS Sync': RefreshCw,
    'Support': Mail,
    'Finance': TrendingUp,
};

const integrationLabels: Record<string, { name: string; desc: string; type: 'api_key' | 'oauth' }> = {
    google_gemini: { name: 'Google Gemini', desc: 'AI Text Generation API Key', type: 'api_key' },
    groq: { name: 'Groq', desc: 'Groq API Key for fast LLM inference', type: 'api_key' },
    openai: { name: 'OpenAI', desc: 'GPT API Key', type: 'api_key' },
    telegram: { name: 'Telegram', desc: 'Bot Token from @BotFather', type: 'api_key' },
    discord: { name: 'Discord', desc: 'Webhook URL for your server', type: 'api_key' },
    slack: { name: 'Slack', desc: 'Webhook URL for your workspace', type: 'api_key' },
    google_sheets: { name: 'Google Sheets', desc: 'Connect via Google Sign-In', type: 'oauth' },
    google_docs: { name: 'Google Docs', desc: 'Connect via Google Sign-In', type: 'oauth' },
    google_calendar: { name: 'Google Calendar', desc: 'Connect via Google Sign-In', type: 'oauth' },
    google_gmail: { name: 'Gmail', desc: 'Connect via Google Sign-In', type: 'oauth' },
    notion: { name: 'Notion', desc: 'Integration API Key', type: 'api_key' },
    api: { name: 'Custom API', desc: 'HTTP Endpoint URL', type: 'api_key' },
};

interface Listing {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    tags: string[];
    usage_count: number;
    rating_avg: number;
    rating_count: number;
    is_active: boolean;
    created_at: string;
    seller?: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    };
    requiredIntegrations?: string[];
}

export default function MarketplacePage() {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sort, setSort] = useState('newest');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchListings = useCallback(async (signal?: AbortSignal) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCategory !== 'All') params.set('category', selectedCategory);
            if (searchQuery.trim()) params.set('search', searchQuery.trim());
            params.set('sort', sort);
            params.set('page', page.toString());
            params.set('limit', '12');

            const res = await fetch(`/api/marketplace/listings?${params}`, { signal });
            const data = await res.json();

            if (res.ok) {
                setListings(data.listings || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
            } else {
                console.error('Failed to fetch listings:', data.error);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') console.error('Error fetching listings:', err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCategory, searchQuery, sort, page]);

    useEffect(() => {
        const controller = new AbortController();
        fetchListings(controller.signal);
        return () => controller.abort();
    }, [fetchListings]);

    useEffect(() => {
        setPage(1);
    }, [selectedCategory, searchQuery, sort]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchListings();
    };

    const formatPrice = (price: number) => {
        if (price === 0) return 'Free';
        return `$${(price / 100).toFixed(0)}/mo`;
    };

    const getCardStyle = (category: string) =>
        categoryColors[category] || { color: 'text-primary-400', bg: 'bg-primary-500/10', accent: 'border-primary-500/30' };

    const getIcon = (category: string) => categoryIcons[category] || Bot;

    return (
        <div className="p-0 space-y-0 min-h-screen bg-[var(--bg)]">

            {/* Hero Section */}
            <div className="relative overflow-hidden pt-20 pb-24 px-6 lg:px-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,var(--color-primary-500)_0%,transparent_50%)] opacity-[0.05] pointer-events-none" />
                <div className="relative max-w-7xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/5 border border-primary-500/10 text-primary-500 dark:text-primary-400 text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in shadow-sm">
                        <Sparkles className="w-3 h-3" /> The Agent Economy is Here
                    </div>
                    <h1 className="text-5xl lg:text-8xl font-black tracking-tight max-w-5xl mx-auto leading-[0.95] uppercase italic">
                        Deploy <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-400 to-accent-400 dark:from-primary-400 dark:via-accent-400 dark:to-primary-400 bg-[length:200%_auto] animate-gradient-x">Expert AI</span> <br />Workers
                    </h1>
                    <p className="text-[var(--muted-fg)] text-lg lg:text-xl max-w-2xl mx-auto font-bold uppercase tracking-tight opacity-70">
                        Plug-and-play automations. Zero configuration. <br className="hidden md:block" /> 100% Secure.
                    </p>
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                        <div className="relative w-full max-w-lg group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-fg)] group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search the workforce..."
                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl pl-14 pr-6 py-5 text-sm shadow-premium focus:ring-4 ring-primary-500/10 transition-all outline-none font-bold"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button type="submit" size="lg" className="rounded-2xl px-12 h-[60px] font-black uppercase tracking-widest italic shadow-2xl shadow-primary-500/20">
                                Search
                            </Button>
                            <Link href="/marketplace/request">
                                <Button type="button" variant="outline" size="lg" className="rounded-2xl px-8 h-[60px] font-black uppercase tracking-widest italic border border-[var(--border)] hover:bg-[var(--muted)]/50">
                                    <Sparkles className="w-4 h-4 text-amber-400 mr-2" /> Request Custom
                                </Button>
                            </Link>
                        </div>
                    </form>
                </div>
            </div>

            {/* Filter Bar — unchanged */}
            <div className="bg-[var(--bg)] border-b border-[var(--border)]">
                <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-4">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border border-transparent",
                                    selectedCategory === cat
                                        ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25 scale-105"
                                        : "hover:bg-[var(--muted)] text-[var(--muted-fg)] hover:text-[var(--fg)] hover:border-[var(--border)]"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3 ml-6">
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="hidden lg:flex text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]"
                                onClick={() => setShowSortDropdown(!showSortDropdown)}
                            >
                                {SORT_OPTIONS.find(o => o.value === sort)?.label || 'Sort By'}
                                <ChevronDown className="w-3.5 h-3.5 ml-2" />
                            </Button>
                            {showSortDropdown && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-20 py-2">
                                        {SORT_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => { setSort(option.value); setShowSortDropdown(false); }}
                                                className={cn(
                                                    "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors",
                                                    sort === option.value
                                                        ? "text-primary-400 bg-primary-500/10"
                                                        : "text-[var(--fg)] hover:bg-[var(--muted)]"
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="h-6 w-[1px] bg-[var(--border)] mx-1 hidden lg:block" />
                        <div className="flex bg-[var(--muted)] p-1 rounded-xl">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-[var(--card)] shadow-sm">
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-40">
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Listings Grid */}
            <div className="max-w-7xl mx-auto p-6 lg:p-10">
                <div className="flex items-center justify-between mb-8">
                    <p className="text-xs font-bold text-[var(--muted-fg)] uppercase tracking-widest">
                        {isLoading ? 'Loading...' : `${total} automation${total !== 1 ? 's' : ''} found`}
                    </p>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-32">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                            <p className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-widest">Loading marketplace...</p>
                        </div>
                    </div>
                )}

                {/* Empty */}
                {!isLoading && listings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 gap-6">
                        <div className="w-24 h-24 rounded-[3rem] bg-primary-500/10 flex items-center justify-center">
                            <Bot className="w-12 h-12 text-primary-400" />
                        </div>
                        <div className="text-center space-y-3">
                            <h3 className="text-2xl font-black uppercase italic tracking-tight">No Automations Yet</h3>
                            <p className="text-sm text-[var(--muted-fg)] font-bold max-w-md">
                                {searchQuery
                                    ? `No results for "${searchQuery}". Try a different search term.`
                                    : 'Be the first to publish an automation! Head to the Builder to create one.'}
                            </p>
                        </div>
                        {!searchQuery && (
                            <Link href="/builder">
                                <Button className="rounded-2xl px-8 h-12 font-black uppercase tracking-widest italic shadow-xl shadow-primary-500/20">
                                    <Sparkles className="w-4 h-4 mr-2" /> Create Automation
                                </Button>
                            </Link>
                        )}
                    </div>
                )}

                {/* ── REDESIGNED CARDS ── */}
                {!isLoading && listings.length > 0 && (
                    <>
                        {/*
                            NEW LAYOUT: 3-col grid on lg, 2-col on md, 1-col on sm.
                            Each card is a compact horizontal strip:
                            [Icon | Info block] + [Price pill + Deploy btn]
                            No more tall rectangles.
                        */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {listings.map((item) => {
                                const style = getCardStyle(item.category);
                                const Icon = getIcon(item.category);
                                return (
                                    <Card
                                        key={item.id}
                                        className={cn(
                                            "group flex flex-col justify-between gap-0 p-0 border-[var(--border)] hover:border-primary-500/40",
                                            "hover:shadow-xl hover:shadow-primary-500/8 transition-all duration-300",
                                            "rounded-2xl overflow-hidden bg-[var(--card)] relative"
                                        )}
                                    >
                                        {/* Top strip: coloured accent line */}
                                        <div className={cn("h-0.5 w-full", style.bg, "opacity-60")} />

                                        {/* Main body */}
                                        <div className="flex items-start gap-4 p-5">
                                            {/* Icon */}
                                            <div className={cn(
                                                "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
                                                style.bg, "border border-white/5",
                                                "group-hover:scale-105 transition-transform duration-300 shadow-lg"
                                            )}>
                                                <Icon className={cn("w-5 h-5", style.color)} />
                                            </div>

                                            {/* Text block */}
                                            <div className="flex-1 min-w-0 space-y-1.5">
                                                {/* Category + rating row */}
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-[9px] font-black uppercase tracking-widest", style.color)}>
                                                        {item.category}
                                                    </span>
                                                    {item.rating_count > 0 && (
                                                        <span className="ml-auto flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md">
                                                            <Star className="w-2.5 h-2.5 fill-current" />
                                                            {item.rating_avg.toFixed(1)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <h3 className="text-sm font-black uppercase italic tracking-tight leading-tight group-hover:text-primary-400 transition-colors truncate">
                                                    {item.title}
                                                </h3>

                                                {/* Description */}
                                                <p className="text-[11px] text-[var(--muted-fg)] leading-relaxed line-clamp-2 font-medium opacity-70">
                                                    {item.description}
                                                </p>

                                                {/* Tags */}
                                                {((item.tags?.length ?? 0) > 0 || (item.requiredIntegrations?.length ?? 0) > 0) && (
                                                    <div className="flex flex-col gap-1.5 pt-0.5">
                                                        {item.tags && item.tags.length > 0 && (
                                                            <div className="flex gap-1.5 flex-wrap">
                                                                {item.tags.slice(0, 3).map(t => (
                                                                    <span
                                                                        key={t}
                                                                        className="text-[8px] font-black uppercase tracking-wider bg-[var(--muted)]/60 px-2 py-0.5 rounded-md border border-[var(--border)] text-[var(--muted-fg)] group-hover:border-primary-500/20 transition-colors"
                                                                    >
                                                                        {t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {item.requiredIntegrations && item.requiredIntegrations.length > 0 && (
                                                            <div className="flex gap-1 flex-wrap items-center mt-1">
                                                                <span className="text-[8px] font-bold text-[var(--muted-fg)] flex items-center gap-1 uppercase tracking-widest mr-1 opacity-70">
                                                                    <Key className="w-2.5 h-2.5" /> Needs:
                                                                </span>
                                                                {item.requiredIntegrations.slice(0, 3).map(k => {
                                                                    const name = integrationLabels[k]?.name || k;
                                                                    return (
                                                                        <span key={k} className="text-[8px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-sm">
                                                                            {name}
                                                                        </span>
                                                                    )
                                                                })}
                                                                {(item.requiredIntegrations?.length || 0) > 3 && (
                                                                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-sm">
                                                                        +{(item.requiredIntegrations?.length || 0) - 3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer strip */}
                                        <div className="border-t border-[var(--border)] px-5 py-3 flex items-center justify-between gap-3 bg-[var(--muted)]/20">
                                            {/* Left: creator + adoption */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                {item.seller?.full_name && (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-[7px] font-bold">
                                                            {item.seller.full_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-[9px] font-bold text-[var(--muted-fg)] truncate max-w-[80px]">
                                                            {item.seller.full_name}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1 text-[9px] font-black text-[var(--muted-fg)] opacity-50">
                                                    <Users className="w-3 h-3" />
                                                    {item.usage_count}
                                                </div>
                                            </div>

                                            {/* Right: price + deploy */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={cn(
                                                    "text-sm font-black italic",
                                                    item.price === 0 ? "text-emerald-400" : "text-primary-400"
                                                )}>
                                                    {formatPrice(item.price)}
                                                </span>
                                                <Link href={`/marketplace/${item.id}`}>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-4 rounded-xl font-black italic uppercase tracking-wider text-[10px] bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 border-none shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all active:scale-95"
                                                    >
                                                        Deploy <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-16">
                                <Button
                                    variant="outline"
                                    className="rounded-xl font-bold"
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Previous
                                </Button>
                                <span className="text-xs font-bold text-[var(--muted-fg)] uppercase tracking-widest px-4">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    className="rounded-xl font-bold"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {/* Secure Badge */}
                <div className="mt-24 py-12 border-t border-[var(--border)] flex flex-col items-center gap-8 bg-gradient-to-b from-transparent to-primary-500/[0.02] rounded-[3rem]">
                    <div className="flex items-center gap-4 text-primary-400 bg-primary-500/10 px-6 py-3 rounded-2xl border border-primary-500/20 shadow-xl shadow-primary-500/5 animate-pulse">
                        <ShieldCheck className="w-8 h-8" />
                        <span className="text-xl font-black italic uppercase tracking-[0.2em]">AION Secure Verified</span>
                    </div>
                    <p className="text-sm text-[var(--muted-fg)] text-center max-w-xl font-bold uppercase tracking-tight opacity-60">
                        Every worker undergoes deep protocol auditing and <br /> credential isolation before marketplace activation.
                    </p>
                </div>
            </div>
        </div>
    );
}