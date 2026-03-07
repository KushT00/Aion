'use client';

import { useParams } from 'next/navigation';
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
    Cpu
} from 'lucide-react';
import Link from 'next/link';

export default function MarketplaceDetailPage() {
    const { toggle: toggleChat } = useAIChat();

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
                            <div className="w-32 h-32 rounded-[2.5rem] bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-500/10">
                                <Globe className="w-16 h-16 text-blue-400" />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Badge variant="primary" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-black uppercase tracking-widest text-[10px]">99.8% Uptime</Badge>
                                    <Badge variant="primary" className="bg-primary-500/10 border-primary-500/20 text-primary-400 font-black uppercase tracking-widest text-[10px]">ROI: 12x</Badge>
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight uppercase">LinkedIn Lead Magnet Pro</h1>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className="flex text-amber-400">
                                            {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                                        </div>
                                        <span className="text-sm font-bold">4.9 (124 reviews)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[var(--muted-fg)]">
                                        <Users className="w-4 h-4" />
                                        <span className="text-sm font-semibold">1,242 Active Instances</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold uppercase tracking-tight">Automation Overview</h2>
                            <p className="text-[var(--muted-fg)] text-lg leading-relaxed">
                                This AI Agent acts as your dedicated sales assistant. It monitors LinkedIn for high-intent signals (new job postings, funding rounds, specific keyword mentions) and automatically initiates personalized engagement flows.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    'Automatic Lead Filtering',
                                    'AI Personalized Messaging',
                                    'Multi-channel Follow-ups',
                                    'CRM Sync (HubSpot, Salesforce)',
                                    'Sentiment Analysis',
                                    'Weekly Performance Reports'
                                ].map(f => (
                                    <div key={f} className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)]">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        <span className="text-sm font-bold">{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* How it works */}
                        <Card className="p-8 space-y-6 border-dashed border-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-primary-400" /> How it Works
                            </h3>
                            <div className="space-y-8 relative">
                                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-[var(--border)] border-dashed border-l" />
                                {[
                                    { t: 'Connect Accounts', d: 'Your agent will ask for LinkedIn access through our secure OAuth gateway.' },
                                    { t: 'Define Targets', d: 'Chat with the agent to define your ideal customer profile and keywords.' },
                                    { t: 'AI Learning', d: 'The model analyzes your past successful conversations to mimic your tone.' },
                                    { t: 'Live Deployment', d: 'Isolated worker instances start handling leads 24/7 with zero maintenance.' }
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
                    </div>

                    {/* Right: Sidebar Actions */}
                    <div className="space-y-6">
                        <Card className="p-8 sticky top-32 bg-gradient-to-br from-[var(--card)] to-[var(--muted)] border-none shadow-2xl space-y-8">
                            <div className="space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-widest">Monthly Cost</span>
                                    <div className="text-right">
                                        <p className="text-4xl font-black">$49</p>
                                        <p className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tighter">PER INSTANCE / MO</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                                <Button
                                    onClick={toggleChat}
                                    className="w-full h-16 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-black uppercase tracking-widest italic group shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40"
                                >
                                    Deploy with AI Setup
                                    <Zap className="w-4 h-4 ml-2 fill-current group-hover:scale-125 transition-transform" />
                                </Button>
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
                            </div>

                            <div className="pt-8 border-t border-[var(--border)]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg">RT</div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-tighter">Creator</p>
                                        <p className="text-sm font-black text-primary-400 italic">Ricky Thapar</p>
                                    </div>
                                </div>
                                <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-widest hover:text-primary-400">
                                    Contact Creator <MessageSquare className="w-3.5 h-3.5 ml-2" />
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
