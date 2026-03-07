'use client';

import { useState } from 'react';
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
    ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const categories = ['All', 'Lead Gen', 'Social Media', 'E-commerce', 'Utility', 'SaaS Sync'];

const listings = [
    {
        id: '1',
        title: 'LinkedIn Lead Magnet Pro',
        description: 'Auto-find and engage with high-intent leads using AI-driven personalization. Perfect for sales teams.',
        price: '$49/mo',
        rating: 4.9,
        reviews: 124,
        users: '1.2k',
        impact: 'ROI: 12x',
        category: 'Lead Gen',
        icon: Globe,
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
        tags: ['Sales', 'Automation']
    },
    {
        id: '2',
        title: 'Social Multiplier v2',
        description: 'Publish across 5 platforms with AI-generated voice consistent content. One-click scheduling.',
        price: '$29/mo',
        rating: 4.7,
        reviews: 86,
        users: '850',
        impact: 'Saved: 20h/wk',
        category: 'Social Media',
        icon: MessageCircle,
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
        tags: ['Content', 'AI Video']
    },
    {
        id: '3',
        title: 'Smart Support Triage',
        description: 'Classify and draft replies for Tier-1 support tickets in real-time. Direct Zendesk sync.',
        price: '$0/mo',
        rating: 4.8,
        reviews: 210,
        users: '3.4k',
        impact: 'Success: 92%',
        category: 'Utility',
        icon: Mail,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        tags: ['Support', 'Email']
    },
    {
        id: '4',
        title: 'Market Pulse Tracker',
        description: 'Real-time competitive analysis and social sentiment monitoring. Custom AI signals.',
        price: '$99/mo',
        rating: 4.6,
        reviews: 42,
        users: '120',
        impact: 'Alpha: 15%',
        category: 'Lead Gen',
        icon: TrendingUp,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        tags: ['Finance', 'Data']
    }
];

export default function MarketplacePage() {
    const [selectedCategory, setSelectedCategory] = useState('All');

    return (
        <div className="p-0 space-y-0 min-h-screen bg-[var(--bg)]">
            {/* Hero Section */}
            <div className="relative overflow-hidden border-b border-[var(--border)] pt-20 pb-24 px-6 lg:px-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--primary-500)_0%,transparent_50%)] opacity-[0.03] pointer-events-none" />

                <div className="relative max-w-7xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/5 border border-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in">
                        <Sparkles className="w-3 h-3" /> The Agent Economy is Here
                    </div>
                    <h1 className="text-5xl lg:text-8xl font-black tracking-tight max-w-5xl mx-auto leading-[0.95] uppercase italic">
                        Deploy <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-[length:200%_auto] animate-gradient-x">Expert AI</span> <br />Workers
                    </h1>
                    <p className="text-[var(--muted-fg)] text-lg lg:text-xl max-w-2xl mx-auto font-bold uppercase tracking-tight opacity-80">
                        Plug-and-play automations. Zero configuration. <br className="hidden md:block" /> 100% Secure.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                        <div className="relative w-full max-w-lg group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-fg)] group-focus-within:text-primary-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search the workforce..."
                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl pl-14 pr-6 py-5 text-sm shadow-2xl shadow-primary-500/5 focus:ring-2 ring-primary-500/20 transition-all outline-none font-bold"
                            />
                        </div>
                        <Button size="lg" className="rounded-2xl px-12 h-[60px] font-black uppercase tracking-widest italic shadow-2xl shadow-primary-500/20">
                            Search
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="sticky top-16 z-20 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)] shadow-sm">
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
                        <Button variant="ghost" size="sm" className="hidden lg:flex text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]">
                            Sort By <ChevronDown className="w-3.5 h-3.5 ml-2" />
                        </Button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                    {listings.map((item) => (
                        <Card key={item.id} className="group flex flex-col p-0 border-[var(--border)] hover:border-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-[var(--card)] relative">
                            {/* Card Decoration */}
                            <div className="absolute top-0 right-0 p-5">
                                <Badge variant="primary" className="bg-primary-500 text-white text-[8px] font-black tracking-[0.1em] px-2.5 py-1 rounded-lg shadow-lg shadow-primary-500/20 uppercase">
                                    {item.impact}
                                </Badge>
                            </div>

                            {/* Image / Icon Section */}
                            <div className="p-8 pb-4">
                                <div className={cn("w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-xl", item.bg, "border border-white/5")}>
                                    <item.icon className={cn("w-7 h-7", item.color)} />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-8 pb-8 space-y-5 flex-1 flex flex-col">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-400">{item.category}</span>
                                        <div className="flex items-center text-[10px] font-bold text-amber-400 ml-auto bg-amber-400/10 px-2 py-0.5 rounded-full">
                                            <Star className="w-3 h-3 fill-current mr-1" /> {item.rating}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black leading-tight group-hover:text-primary-400 transition-colors uppercase italic tracking-tighter">{item.title}</h3>
                                    <p className="text-xs text-[var(--muted-fg)] leading-relaxed line-clamp-2 font-medium opacity-80 min-h-[2.5rem]">
                                        {item.description}
                                    </p>
                                </div>

                                <div className="flex gap-2 flex-wrap">
                                    {item.tags.map(t => (
                                        <span key={t} className="text-[9px] font-black uppercase tracking-widest bg-[var(--muted)]/50 px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--muted-fg)] group-hover:border-primary-500/20 transition-colors">
                                            {t}
                                        </span>
                                    ))}
                                </div>

                                <div className="pt-5 border-t border-[var(--border)] mt-auto flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase font-black text-[var(--muted-fg)] tracking-widest opacity-40">Monthly</span>
                                        <span className="text-xl font-black italic text-primary-400">{item.price}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[9px] uppercase font-black text-[var(--muted-fg)] tracking-widest opacity-40">Adoption</span>
                                        <span className="text-sm font-black flex items-center gap-1 justify-end uppercase">
                                            <Users className="w-3 h-3" /> {item.users}
                                        </span>
                                    </div>
                                </div>

                                <Link href={`/marketplace/${item.id}`} className="block">
                                    <Button className="w-full rounded-2xl h-12 font-black italic uppercase tracking-widest group-hover:shadow-xl group-hover:shadow-primary-500/30 transform transition-all active:scale-95 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 border-none">
                                        Deploy AI <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>

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
