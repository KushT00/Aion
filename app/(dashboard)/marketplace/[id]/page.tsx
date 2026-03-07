'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAIChat } from '@/components/ai-chat-context';
import {
    Globe,
    Star,
    Users,
    Zap,
    ArrowLeft,
    Play,
    ShieldCheck,
    Clock,
    MessageSquare,
    CheckCircle2,
    Lock,
    Cpu,
    Loader2,
    Bot,
    Tag,
    Calendar,
    Key
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Human-readable names for integration IDs
const integrationLabels: Record<string, string> = {
    google_gemini: 'Google Gemini API Key',
    groq: 'Groq API Key',
    openai: 'OpenAI API Key',
    telegram: 'Telegram Bot Token',
    discord: 'Discord Webhook URL',
    slack: 'Slack Webhook URL',
    google_sheets: 'Google Account (OAuth)',
    google_docs: 'Google Account (OAuth)',
    google_calendar: 'Google Account (OAuth)',
    google_gmail: 'Google Account (OAuth)',
    notion: 'Notion API Key',
    api: 'Custom API Endpoint',
};

export default function MarketplaceDetailPage() {
    const params = useParams();
    const { toggle: toggleChat } = useAIChat();
    const [listing, setListing] = useState<any>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [requiredIntegrations, setRequiredIntegrations] = useState<string[]>([]);
    const [hasPurchased, setHasPurchased] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchListing() {
            try {
                const res = await fetch(`/api/marketplace/listings/${params.id}`);
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || 'Listing not found');
                    return;
                }

                setListing(data.listing);
                setReviews(data.reviews || []);
                setRequiredIntegrations(data.requiredIntegrations || []);
                setHasPurchased(data.hasPurchased || false);
            } catch (err) {
                setError('Failed to load listing');
            } finally {
                setIsLoading(false);
            }
        }
        if (params.id) fetchListing();
    }, [params.id]);

    const formatPrice = (price: number) => {
        if (price === 0) return 'Free';
        return `$${(price / 100).toFixed(0)}`;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-widest">Loading listing...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !listing) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="w-24 h-24 rounded-[3rem] bg-rose-500/10 flex items-center justify-center">
                        <Bot className="w-12 h-12 text-rose-400" />
                    </div>
                    <h2 className="text-2xl font-black uppercase italic">{error || 'Listing Not Found'}</h2>
                    <Link href="/marketplace">
                        <Button variant="outline" className="rounded-xl font-bold gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg)]">
            {/* Header / Nav */}
            <div className="max-w-7xl mx-auto px-6 py-6 border-b border-[var(--border)]">
                <Link href="/marketplace">
                    <Button variant="ghost" size="sm" className="rounded-xl gap-2 font-bold text-xs uppercase tracking-widest group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Marketplace
                    </Button>
                </Link>
            </div>

            <div className="max-w-7xl mx-auto p-6 lg:p-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left: Main Content */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Title & Icon */}
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-primary-500/10 flex items-center justify-center border border-primary-500/20 shadow-2xl shadow-primary-500/10">
                                <Bot className="w-16 h-16 text-primary-400" />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="primary" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-black uppercase tracking-widest text-[10px]">
                                        Active
                                    </Badge>
                                    <Badge variant="primary" className="bg-primary-500/10 border-primary-500/20 text-primary-400 font-black uppercase tracking-widest text-[10px]">
                                        {listing.category}
                                    </Badge>
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight uppercase">{listing.title}</h1>
                                <div className="flex items-center gap-6 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <div className="flex text-amber-400">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Star
                                                    key={i}
                                                    className={cn(
                                                        "w-4 h-4",
                                                        i <= Math.round(listing.rating_avg) ? "fill-current" : "opacity-20"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-sm font-bold">
                                            {listing.rating_avg > 0
                                                ? `${listing.rating_avg.toFixed(1)} (${listing.rating_count} review${listing.rating_count !== 1 ? 's' : ''})`
                                                : 'No reviews yet'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[var(--muted-fg)]">
                                        <Users className="w-4 h-4" />
                                        <span className="text-sm font-semibold">{listing.usage_count} Active Instance{listing.usage_count !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold uppercase tracking-tight">Automation Overview</h2>
                            <p className="text-[var(--muted-fg)] text-lg leading-relaxed">
                                {listing.description}
                            </p>
                        </div>

                        {/* Tags */}
                        {listing.tags && listing.tags.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted-fg)] flex items-center gap-2">
                                    <Tag className="w-4 h-4" /> Tags
                                </h3>
                                <div className="flex gap-2 flex-wrap">
                                    {listing.tags.map((t: string) => (
                                        <span key={t} className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-fg)]">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Required Integrations */}
                        {requiredIntegrations.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted-fg)] flex items-center gap-2">
                                    <Key className="w-4 h-4" /> Required Integrations
                                </h3>
                                <p className="text-xs text-[var(--muted-fg)]">
                                    After purchase, you'll need to provide the following credentials to activate this automation.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {requiredIntegrations.map(integId => (
                                        <div key={integId} className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)]">
                                            <CheckCircle2 className="w-5 h-5 text-amber-400" />
                                            <span className="text-sm font-bold">
                                                {integrationLabels[integId] || integId}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* How it works */}
                        <Card className="p-8 space-y-6 border-dashed border-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-primary-400" /> How it Works
                            </h3>
                            <div className="space-y-8 relative">
                                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-[var(--border)] border-dashed border-l" />
                                {[
                                    { t: 'Purchase', d: 'Get access to this automation by completing the purchase.' },
                                    { t: 'Connect Accounts', d: 'Provide your API keys and credentials through the secure setup wizard.' },
                                    { t: 'Configure', d: 'Customize settings through the AI onboarding assistant.' },
                                    { t: 'Live Deployment', d: 'Your isolated instance starts running 24/7 with zero maintenance.' }
                                ].map((step, idx) => (
                                    <div key={step.t} className="relative pl-12">
                                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary-500/30">
                                            {idx + 1}
                                        </div>
                                        <h4 className="font-bold mb-1 uppercase tracking-tight">{step.t}</h4>
                                        <p className="text-sm text-[var(--muted-fg)]">{step.d}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Reviews Section */}
                        {reviews.length > 0 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary-400" />
                                    Reviews ({reviews.length})
                                </h2>
                                <div className="space-y-4">
                                    {reviews.map((review: any) => (
                                        <Card key={review.id} className="p-6 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                                                        {review.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{review.user?.full_name || 'Anonymous'}</p>
                                                        <p className="text-[10px] text-[var(--muted-fg)]">
                                                            {new Date(review.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex text-amber-400">
                                                    {[1, 2, 3, 4, 5].map(i => (
                                                        <Star
                                                            key={i}
                                                            className={cn("w-3 h-3", i <= review.score ? "fill-current" : "opacity-20")}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            {review.comment && (
                                                <p className="text-sm text-[var(--muted-fg)] leading-relaxed">{review.comment}</p>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Sidebar Actions */}
                    <div className="space-y-6">
                        <Card className="p-8 sticky top-32 bg-gradient-to-br from-[var(--card)] to-[var(--muted)] border-none shadow-2xl space-y-8">
                            <div className="space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-widest">Monthly Cost</span>
                                    <div className="text-right">
                                        <p className={cn("text-4xl font-black", listing.price === 0 ? "text-emerald-400" : "")}>
                                            {formatPrice(listing.price)}
                                        </p>
                                        <p className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tighter">
                                            {listing.price === 0 ? 'OPEN SOURCE' : 'PER INSTANCE / MO'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                                {hasPurchased ? (
                                    <Link href="/my-automations">
                                        <Button className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest italic group shadow-xl shadow-emerald-500/30">
                                            <CheckCircle2 className="w-5 h-5 mr-2" /> Already Purchased — View
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button
                                        onClick={toggleChat}
                                        className="w-full h-16 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-black uppercase tracking-widest italic group shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40"
                                    >
                                        Deploy with AI Setup
                                        <Zap className="w-4 h-4 ml-2 fill-current group-hover:scale-125 transition-transform" />
                                    </Button>
                                )}
                                <Button variant="outline" className="w-full h-12 rounded-2xl font-bold uppercase tracking-wider">
                                    Trial Run (1hr)
                                </Button>
                            </div>

                            <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-3 text-xs font-bold text-[var(--muted-fg)]">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    Security Audited & Verified
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-[var(--muted-fg)]">
                                    <Clock className="w-4 h-4 text-primary-400" />
                                    Instant Setup ({'<'} 2 mins)
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-[var(--muted-fg)]">
                                    <Lock className="w-4 h-4 text-amber-400" />
                                    Credential Isolation Active
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-[var(--muted-fg)]">
                                    <Calendar className="w-4 h-4 text-[var(--muted-fg)]" />
                                    Published {new Date(listing.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            {/* Creator Info */}
                            {listing.seller && (
                                <div className="pt-8 border-t border-[var(--border)]">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg text-xs">
                                            {listing.seller.full_name?.slice(0, 2)?.toUpperCase() || '??'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-tighter">Creator</p>
                                            <p className="text-sm font-black text-primary-400 italic">
                                                {listing.seller.full_name || 'Unknown Creator'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-widest hover:text-primary-400">
                                        Contact Creator <MessageSquare className="w-3.5 h-3.5 ml-2" />
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
