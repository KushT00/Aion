'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
    Key,
    Sparkles,
    Server,
    Wallet,
    ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// Human-readable names for integration IDs
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

export default function MarketplaceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [listing, setListing] = useState<any>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [requiredIntegrations, setRequiredIntegrations] = useState<string[]>([]);
    const [hasPurchased, setHasPurchased] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pricingTab, setPricingTab] = useState<'byok' | 'managed'>('byok');
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        async function fetchListing() {
            try {
                const res = await fetch(`/api/marketplace/listings/${params.id}`, { signal: controller.signal });
                const data = await res.json();

                if (!res.ok) {
                    if (isMounted) setError(data.error || 'Listing not found');
                    return;
                }

                if (isMounted) {
                    setListing(data.listing);
                    setReviews(data.reviews || []);
                    setRequiredIntegrations(data.requiredIntegrations || []);
                    setHasPurchased(data.hasPurchased || false);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError' && isMounted) setError('Failed to load listing');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        if (params.id) fetchListing();
        return () => { isMounted = false; controller.abort(); };
    }, [params.id]);

    const formatPrice = (price: number) => {
        if (price === 0) return 'Free';
        return `$${(price / 100).toFixed(0)}`;
    };

    const handlePurchase = async () => {
        setIsPurchasing(true);
        try {
            const res = await fetch('/api/marketplace/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listingId: listing.id,
                    pricingTier: pricingTab,
                }),
            });

            const data = await res.json();

            if (res.status === 409) {
                toast.success('You already own this! Redirecting...');
                router.push('/my-automations');
                return;
            }

            if (!res.ok) {
                toast.error(data.error || 'Purchase failed');
                return;
            }

            toast.success('🎉 Purchase complete! Starting AI setup...');
            setHasPurchased(true);

            // Redirect to the AI setup wizard
            const targetUrl = data.instanceId
                ? `/my-automations/${data.instanceId}/setup`
                : '/my-automations';
            setTimeout(() => {
                router.push(targetUrl);
            }, 1000);
        } catch (err) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsPurchasing(false);
        }
    };

    // Separate integrations by type
    const oauthIntegrations = requiredIntegrations.filter(k => integrationLabels[k]?.type === 'oauth');
    const apiKeyIntegrations = requiredIntegrations.filter(k => integrationLabels[k]?.type === 'api_key');
    // Deduplicate Google OAuth (sheets + docs + calendar = 1 Google sign-in)
    const needsGoogleOAuth = oauthIntegrations.length > 0;

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

    const byokPrice = listing.price;
    const managedPrice = listing.price === 0 ? 0 : listing.price * 2;

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

                        {/* Required Integrations / Credentials Preview */}
                        {requiredIntegrations.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted-fg)] flex items-center gap-2">
                                    <Key className="w-4 h-4" /> What You'll Need to Connect
                                </h3>
                                <p className="text-xs text-[var(--muted-fg)]">
                                    With <span className="text-primary-400 font-bold">BYOK</span> you provide these yourself. With <span className="text-emerald-400 font-bold">Managed</span>, the creator provides all resources for you.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {needsGoogleOAuth && (
                                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)] group hover:border-primary-500/30 transition-colors">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <Globe className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Google Account</p>
                                                <p className="text-[10px] text-[var(--muted-fg)] uppercase tracking-widest">
                                                    Sign in with Google · Covers {oauthIntegrations.map(k => integrationLabels[k]?.name).join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {apiKeyIntegrations.map(integId => {
                                        const info = integrationLabels[integId] || { name: integId, desc: 'API Key', type: 'api_key' };
                                        return (
                                            <div key={integId} className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)] group hover:border-primary-500/30 transition-colors">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                                    <Key className="w-5 h-5 text-amber-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{info.name}</p>
                                                    <p className="text-[10px] text-[var(--muted-fg)] uppercase tracking-widest">{info.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                    { t: 'Choose Your Plan', d: 'Pick BYOK (use your own API keys) or Managed (we handle everything).' },
                                    { t: 'AI Setup', d: 'Our AI assistant walks you through connecting your accounts in under 2 minutes.' },
                                    { t: 'Configure', d: 'Select your files, sheets, and preferences — the AI handles the rest.' },
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

                    {/* ─── Right: Pricing Sidebar ─── */}
                    <div className="space-y-6">
                        <Card className="p-0 sticky top-8 bg-[var(--card)] border-[var(--border)] shadow-2xl shadow-black/10 overflow-hidden rounded-[2rem]">
                            {/* Pricing Tabs */}
                            <div className="grid grid-cols-2 border-b border-[var(--border)]">
                                <button
                                    onClick={() => setPricingTab('byok')}
                                    className={cn(
                                        "py-5 text-center transition-all relative",
                                        pricingTab === 'byok'
                                            ? "bg-primary-500/5"
                                            : "hover:bg-[var(--muted)]/50 opacity-50 hover:opacity-80"
                                    )}
                                >
                                    <div className="flex flex-col items-center gap-1.5">
                                        <Key className={cn("w-5 h-5", pricingTab === 'byok' ? "text-primary-400" : "text-[var(--muted-fg)]")} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Your Keys</span>
                                    </div>
                                    {pricingTab === 'byok' && (
                                        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary-500" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setPricingTab('managed')}
                                    className={cn(
                                        "py-5 text-center transition-all relative",
                                        pricingTab === 'managed'
                                            ? "bg-emerald-500/5"
                                            : "hover:bg-[var(--muted)]/50 opacity-50 hover:opacity-80"
                                    )}
                                >
                                    <div className="flex flex-col items-center gap-1.5">
                                        <Server className={cn("w-5 h-5", pricingTab === 'managed' ? "text-emerald-400" : "text-[var(--muted-fg)]")} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Managed</span>
                                    </div>
                                    {pricingTab === 'managed' && (
                                        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500" />
                                    )}
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="p-8 space-y-6">
                                {/* BYOK Tab */}
                                {pricingTab === 'byok' && (
                                    <>
                                        <div className="space-y-2">
                                            <Badge className="bg-primary-500/10 text-primary-400 border-primary-500/20 font-black uppercase tracking-widest text-[8px]">
                                                Bring Your Own Keys
                                            </Badge>
                                            <p className={cn("text-4xl font-black", byokPrice === 0 ? "text-emerald-400" : "")}>
                                                {formatPrice(byokPrice)}
                                            </p>
                                            <p className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tighter">
                                                {byokPrice === 0 ? 'FREE FOREVER' : 'FIXED PRICE / MONTH'}
                                            </p>
                                        </div>
                                        <div className="space-y-3 text-xs text-[var(--muted-fg)]">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                                                <span className="font-bold">You provide your own API keys & Google account</span>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                                                <span className="font-bold">Fixed monthly cost — no usage surprises</span>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                                                <span className="font-bold">Full control over your data & credentials</span>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                                                <span className="font-bold">AI guides you through setup in 2 minutes</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-[var(--muted-fg)] italic opacity-60 leading-relaxed">
                                            Best for technical users who already have API keys and want predictable billing.
                                        </p>
                                    </>
                                )}

                                {/* Managed Tab */}
                                {pricingTab === 'managed' && (
                                    <>
                                        <div className="space-y-2">
                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-black uppercase tracking-widest text-[8px]">
                                                Fully Managed
                                            </Badge>
                                            <p className="text-4xl font-black text-emerald-400">
                                                {managedPrice === 0 ? 'Free' : formatPrice(managedPrice)}
                                            </p>
                                            <p className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tighter">
                                                {managedPrice === 0 ? 'FREE FOREVER' : 'USAGE-BASED / MONTH'}
                                            </p>
                                        </div>
                                        <div className="space-y-3 text-xs text-[var(--muted-fg)]">
                                            <div className="flex items-start gap-3">
                                                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                <span className="font-bold">Creator provides all API keys & infrastructure</span>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                <span className="font-bold">Zero technical setup — just sign up and go</span>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                <span className="font-bold">Usage-based billing (pay only for what runs)</span>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                <span className="font-bold">Priority support from the creator</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-[var(--muted-fg)] italic opacity-60 leading-relaxed">
                                            Best for non-technical users who want a plug-and-play experience with no API setup.
                                        </p>
                                    </>
                                )}

                                {/* Action Buttons */}
                                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                                    {hasPurchased ? (
                                        <Link href="/my-automations">
                                            <Button className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest italic group shadow-xl shadow-emerald-500/30">
                                                <CheckCircle2 className="w-5 h-5 mr-2" /> Purchased — View Dashboard
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            onClick={handlePurchase}
                                            disabled={isPurchasing}
                                            className={cn(
                                                "w-full h-16 rounded-2xl text-white font-black uppercase tracking-widest italic group shadow-xl transition-all",
                                                pricingTab === 'byok'
                                                    ? "bg-gradient-to-r from-primary-600 to-primary-500 shadow-primary-500/30 hover:shadow-primary-500/40"
                                                    : "bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-500/30 hover:shadow-emerald-500/40"
                                            )}
                                        >
                                            {isPurchasing ? (
                                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                                            ) : (
                                                <>
                                                    Deploy with AI Setup
                                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>

                                {/* Trust Badges */}
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
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
