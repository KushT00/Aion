'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Search,
    Star,
    Play,
    TrendingUp,
    Filter,
    ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListingItem {
    id: string;
    title: string;
    description: string;
    creator: string;
    avatar: string;
    price: number;
    rating: number;
    ratingCount: number;
    usageCount: number;
    category: string;
    tags: string[];
    gradient: string;
}

const listings: ListingItem[] = [
    {
        id: '1',
        title: 'Email Automation Pro',
        description: 'AI-powered email triage, classification, and smart response drafting with GPT-4 integration.',
        creator: 'Sarah Chen',
        avatar: 'SC',
        price: 4900,
        rating: 4.8,
        ratingCount: 124,
        usageCount: 1242,
        category: 'Automation',
        tags: ['email', 'ai', 'gpt-4'],
        gradient: 'from-violet-500 to-purple-600',
    },
    {
        id: '2',
        title: 'Social Media Manager',
        description: 'Schedule, generate, and publish content across Twitter, LinkedIn, and Instagram automatically.',
        creator: 'Alex Rivera',
        avatar: 'AR',
        price: 2900,
        rating: 4.6,
        ratingCount: 89,
        usageCount: 856,
        category: 'Social',
        tags: ['social', 'content', 'scheduling'],
        gradient: 'from-cyan-500 to-blue-600',
    },
    {
        id: '3',
        title: 'Data Pipeline Builder',
        description: 'ETL workflows for scraping, transforming, and loading data from any web source into your database.',
        creator: 'Marcus Johnson',
        avatar: 'MJ',
        price: 7900,
        rating: 4.9,
        ratingCount: 203,
        usageCount: 2103,
        category: 'Data',
        tags: ['etl', 'scraping', 'database'],
        gradient: 'from-emerald-500 to-teal-600',
    },
    {
        id: '4',
        title: 'Customer Support Agent',
        description: 'Intelligent chatbot that handles Tier-1 support tickets with escalation to humans when needed.',
        creator: 'Priya Patel',
        avatar: 'PP',
        price: 5900,
        rating: 4.7,
        ratingCount: 156,
        usageCount: 1567,
        category: 'AI Agents',
        tags: ['chatbot', 'support', 'nlp'],
        gradient: 'from-rose-500 to-pink-600',
    },
    {
        id: '5',
        title: 'Report Generator',
        description: 'Generate beautiful PDF/HTML reports from multiple data sources with charts, tables, and insights.',
        creator: 'James Wilson',
        avatar: 'JW',
        price: 3900,
        rating: 4.5,
        ratingCount: 67,
        usageCount: 634,
        category: 'Analytics',
        tags: ['reporting', 'charts', 'pdf'],
        gradient: 'from-amber-500 to-orange-600',
    },
    {
        id: '6',
        title: 'Code Review Assistant',
        description: 'Automated PR reviews powered by AI. Catches bugs, suggests improvements, and enforces standards.',
        creator: 'Yuki Tanaka',
        avatar: 'YT',
        price: 0,
        rating: 4.9,
        ratingCount: 312,
        usageCount: 4521,
        category: 'Dev Tools',
        tags: ['code-review', 'github', 'ai'],
        gradient: 'from-indigo-500 to-violet-600',
    },
];

const categories = ['All', 'Automation', 'Social', 'Data', 'AI Agents', 'Analytics', 'Dev Tools'];

export default function MarketplacePage() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');

    const filtered = listings.filter((l) => {
        const matchesSearch =
            l.title.toLowerCase().includes(search.toLowerCase()) ||
            l.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === 'All' || l.category === category;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--fg)]">Marketplace</h1>
                <p className="text-[var(--muted-fg)] mt-1">
                    Discover and install community-built workflows and AI agents.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search marketplace..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search className="w-4 h-4" />}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {categories.map((cat) => (
                        <Button
                            key={cat}
                            variant={category === cat ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setCategory(cat)}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                    <Card
                        key={listing.id}
                        className="group overflow-hidden hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-2 cursor-pointer p-0"
                    >
                        {/* Gradient Header */}
                        <div className={cn('relative h-36 bg-gradient-to-br', listing.gradient)}>
                            <div className="absolute inset-0 bg-black/10" />
                            <div className="absolute bottom-3 left-4">
                                <Badge variant="primary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                                    {listing.category}
                                </Badge>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <h3 className="text-base font-bold text-[var(--fg)] mb-1.5 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {listing.title}
                            </h3>
                            <p className="text-sm text-[var(--muted-fg)] line-clamp-2 mb-4">
                                {listing.description}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {listing.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-2 py-0.5 text-xs rounded-md bg-[var(--muted)] text-[var(--muted-fg)]"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Creator */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-[10px] text-white font-bold">
                                    {listing.avatar}
                                </div>
                                <span className="text-sm text-[var(--muted-fg)]">{listing.creator}</span>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                                <div className="flex items-center gap-3 text-sm text-[var(--muted-fg)]">
                                    <span className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        {listing.rating}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Play className="w-3.5 h-3.5" />
                                        {listing.usageCount.toLocaleString()}
                                    </span>
                                </div>
                                <span className="text-base font-bold text-primary-600 dark:text-primary-400">
                                    {listing.price === 0 ? 'Free' : `$${(listing.price / 100).toFixed(0)}`}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
