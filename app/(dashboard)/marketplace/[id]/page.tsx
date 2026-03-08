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
import { useAuth } from '@/hooks/use-auth';
import dynamic from 'next/dynamic';

const ContactCreatorModal = dynamic(() => import('../components/ContactCreatorModal').then(mod => mod.ContactCreatorModal), {
    ssr: false,
    loading: () => null
});

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
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const { profile } = useAuth();

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
            <div className="flex items-center justify-center min-h-[60vh] animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                    <p className="text-sm font-black uppercase tracking-widest text-[var(--muted-fg)]">Synchronizing AI Node...</p>
                </div>
            </div>
        );
    }

    if (error || !listing) {
        return (
            <div className="p-10 text-center space-y-4">
                <div className="w-20 h-20 bg-[var(--muted)] rounded-full flex items-center justify-center mx-auto">
                    <Bot className="w-10 h-10 text-[var(--muted-fg)] opacity-20" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-error-400">Execution Error</h2>
                <p className="text-[var(--muted-fg)] uppercase tracking-tight text-xs">{error || 'Unknown error occurred'}</p>
                <Button onClick={() => router.push('/marketplace')} variant="outline" className="rounded-xl border-2 font-black uppercase tracking-widest text-[10px]">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Market
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Nav */}
            <div className="flex items-center gap-4">
                <Button
                    onClick={() => router.push('/marketplace')}
                    variant="ghost"
                    className="rounded-full w-10 h-10 p-0 hover:bg-[var(--muted)]"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/marketplace" className="text-[10px] font-black uppercase text-[var(--muted-fg)] hover:text-primary-400">Marketplace</Link>
                        <span className="w-1 h-1 bg-[var(--border)] rounded-full" />
                        <span className="text-[10px] font-black uppercase text-primary-400">{listing.category}</span>
                    </div>
                    <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{listing.title}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Media & Info */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Hero Section */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        <div className="md:col-span-2">
                            <div className="aspect-square rounded-[2rem] bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center p-8 relative group overflow-hidden shadow-2xl">
                                <Bot className="w-32 h-32 text-primary-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500" />
                                <div className="absolute top-4 left-4">
                                    <Badge variant="success" dot pulse className="bg-emerald-500/10 text-emerald-400 border-none font-black uppercase tracking-widest text-[9px] px-3">Verified</Badge>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-6 h-6 rounded-full border-2 border-[var(--bg)] bg-[var(--muted)] flex items-center justify-center text-[8px] font-black">
                                            {String.fromCharCode(64 + i)}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1 text-[var(--muted-fg)]">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="text-[10px] font-black tracking-widest uppercase">{listing.rating} (124+ active users)</span>
                                </div>
                            </div>

                            <p className="text-[var(--muted-fg)] font-medium leading-relaxed uppercase tracking-tight text-sm">
                                {listing.description}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {listing.features?.map((f: string) => (
                                    <Badge key={f} variant="primary" className="bg-[var(--muted)] text-[var(--fg)] border-none text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">
                                        {f}
                                    </Badge>
                                ))}
                            </div>

                            <div className="pt-4 flex items-center gap-10 border-t border-[var(--border)]">
                                <div>
                                    <p className="text-[9px] font-black text-[var(--muted-fg)] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Users className="w-3 h-3 text-primary-400" /> Total Deploys
                                    </p>
                                    <p className="text-base font-black italic">{listing.sales_count || 124}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-[var(--muted-fg)] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Zap className="w-3 h-3 text-emerald-400" /> Efficiency
                                    </p>
                                    <p className="text-base font-black italic">{(listing.base_price / 100 * 2.4).toFixed(0)}h saved/mo</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Features */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Core Engine Capabilities</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: 'High Frequency Execution', desc: 'Capable of running tasks every 60 seconds with 99.9% uptime.', icon: Zap },
                                { title: 'Multi-Tool Orchestration', desc: 'Seamlessly interacts with all your connected business apps.', icon: Tag },
                                { title: 'Intelligent Error Recovery', desc: 'AI-powered self-healing for integration hiccups.', icon: ShieldCheck },
                                { title: 'Privacy First Architecture', desc: 'Your data stays in your workflows. No model training.', icon: Globe },
                            ].map((cap) => (
                                <div key={cap.title} className="p-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-primary-500/5 transition-colors group">
                                    <cap.icon className="w-6 h-6 text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
                                    <h4 className="font-black uppercase tracking-tight mb-2 text-sm">{cap.title}</h4>
                                    <p className="text-xs text-[var(--muted-fg)] font-medium leading-relaxed uppercase tracking-tight">{cap.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Technical Requirements */}
                    <div className="p-8 rounded-[2rem] border border-[var(--border)] bg-gradient-to-br from-primary-500/[0.03] to-transparent space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                <Key className="w-5 h-5 text-primary-400" />
                            </div>
                            <h2 className="text-lg font-black uppercase italic tracking-tighter">Integration Requirements</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {requiredIntegrations.map(id => (
                                <div key={id} className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                                    <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                                        {integrationLabels[id]?.type === 'api_key' ? <Key className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-emerald-400" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{integrationLabels[id]?.name || id}</p>
                                        <p className="text-[10px] text-[var(--muted-fg)] font-bold uppercase tracking-tight">{integrationLabels[id]?.desc || 'Connection required'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Pricing & Purchase */}
                <Card className="p-8 rounded-[2.5rem] border-[var(--border)] shadow-2xl bg-[var(--card)]/50 backdrop-blur-md sticky top-24 self-start space-y-8 overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-[60px] -z-10" />

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-4xl font-black italic tracking-tighter">{formatPrice(listing.base_price)}</h3>
                            <Badge variant="primary" className="bg-primary-500/10 text-primary-400 border-none font-black uppercase tracking-widest text-[9px] px-3">Best Value</Badge>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]">One-time License Fee</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex p-1 bg-[var(--muted)] rounded-xl gap-1">
                            {(['byok', 'managed'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setPricingTab(tab)}
                                    className={cn(
                                        "flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                                        pricingTab === tab ? "bg-[var(--card)] text-[var(--fg)] shadow-sm" : "text-[var(--muted-fg)] hover:text-[var(--fg)]"
                                    )}
                                >
                                    {tab === 'byok' ? 'Bring Your Tokens' : 'Fully Managed (Beta)'}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3 min-h-[140px]">
                            {pricingTab === 'byok' ? (
                                <>
                                    {[
                                        'Full AI core ownership',
                                        'Unlimited local execution',
                                        'Bring your own API tokens',
                                        'Standard Email Support'
                                    ].map(f => (
                                        <div key={f} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight text-[var(--muted-fg)]">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {f}
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <>
                                    {[
                                        'We handle all API costs',
                                        'High-priority cloud runners',
                                        'Weekly performance audits',
                                        'Dedicated Creator Support'
                                    ].map(f => (
                                        <div key={f} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight text-[var(--muted-fg)]">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {f}
                                        </div>
                                    ))}
                                    <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                        <p className="text-[9px] font-black uppercase tracking-tight text-amber-500">Subscription pricing coming soon</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {hasPurchased ? (
                            <Button
                                onClick={() => router.push('/my-automations')}
                                className="w-full h-14 rounded-[1.25rem] bg-emerald-500 hover:bg-emerald-600 text-white font-black italic uppercase tracking-widest shadow-xl shadow-emerald-500/20"
                            >
                                Open My Workspace <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handlePurchase}
                                disabled={isPurchasing}
                                className="w-full h-14 rounded-[1.25rem] bg-primary-500 hover:bg-primary-600 font-black italic uppercase tracking-widest shadow-xl shadow-primary-500/25"
                            >
                                {isPurchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deploy to My Workspace"}
                                {!isPurchasing && <ArrowRight className="w-4 h-4 ml-2" />}
                            </Button>
                        )}
                        <p className="text-[9px] text-center text-[var(--muted-fg)] font-black uppercase tracking-widest opacity-60">Verified by AION Protocol</p>
                    </div>

                    <div className="pt-6 border-t border-[var(--border)]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center text-primary-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase italic tracking-tight">Deployment Pack</h4>
                                <p className="text-[9px] text-[var(--muted-fg)] font-bold uppercase tracking-tight">Security & Versioning Included</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Security', icon: Lock },
                                { label: 'Updates', icon: Clock },
                                { label: 'Analytics', icon: Cpu },
                                { label: 'Logs', icon: Calendar },
                            ].map(at => (
                                <div key={at.label} className="p-3 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)] flex items-center gap-2">
                                    <at.icon className="w-3.5 h-3.5 text-[var(--muted-fg)]" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--muted-fg)]">{at.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {!hasPurchased && (
                        <div className="pt-4 space-y-4">
                            <div className="p-4 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)]">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center">
                                            <Bot className="w-3.5 h-3.5 text-primary-400" />
                                        </div>
                                        <p className="text-[10px] font-black text-primary-400">FROM THE CREATOR</p>
                                    </div>
                                    <p className="text-sm font-black text-primary-400 italic">
                                        {listing.seller?.full_name || 'Unknown Creator'}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="w-full text-xs font-black uppercase tracking-[0.15em] hover:text-primary-400"
                                    onClick={() => setIsContactModalOpen(true)}
                                >
                                    Contact Producer <MessageSquare className="w-3.5 h-3.5 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Modal for contacting creator */}
            <ContactCreatorModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                listing={listing}
            />
        </div>
    );
}
