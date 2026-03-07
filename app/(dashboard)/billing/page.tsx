'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    CreditCard,
    Wallet,
    Zap,
    CheckCircle2,
    Clock,
    Download,
    ArrowRight
} from 'lucide-react';

export default function BillingPage() {
    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold">Billing & Usage</h1>
                <p className="text-[var(--muted-fg)]">Manage your subscription, credits, and payment history.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Balance & Credits */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-gradient-to-br from-primary-600 to-accent-600 text-white border-none shadow-xl shadow-primary-500/20">
                        <div className="space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <Badge className="bg-white/20 border-none text-white font-bold">Active</Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Credit Balance</p>
                                <h3 className="text-4xl font-extrabold">$142.50</h3>
                            </div>
                            <Button className="w-full bg-white text-primary-600 hover:bg-white/90 font-bold py-6 rounded-2xl transition-transform active:scale-[0.98]">
                                Add Credits
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4">
                        <h4 className="font-bold flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-400" />
                            Usage History
                        </h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-[var(--muted-fg)]">This Month</span>
                                <span className="text-sm font-bold">4,124 runs</span>
                            </div>
                            <div className="w-full bg-[var(--muted)] h-2 rounded-full overflow-hidden">
                                <div className="bg-primary-500 h-full w-[65%] rounded-full" />
                            </div>
                            <p className="text-[10px] text-[var(--muted-fg)] uppercase font-bold text-center">65% OF PRO PLAN LIMIT REACHED</p>
                        </div>
                    </Card>
                </div>

                {/* Subscriptions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 border-2 border-primary-500/30 ring-4 ring-primary-500/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2">
                                <Badge variant="primary" className="text-[10px] uppercase font-black px-2">Current Plan</Badge>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Pro Power</h3>
                                <p className="text-sm text-[var(--muted-fg)]">For serious automation builders and power users.</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">$49</span>
                                    <span className="text-[var(--muted-fg)]">/month</span>
                                </div>
                                <ul className="space-y-3">
                                    {[
                                        '10k automation runs / mo',
                                        'Priority AI processing',
                                        'Unlimited integrations',
                                        '24/7 Priority support'
                                    ].map(f => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[var(--fg)] font-medium">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Button variant="outline" className="w-full rounded-xl mt-4">Manage Subscription</Button>
                            </div>
                        </Card>

                        <Card className="p-6 bg-[var(--muted)]/50 border-dashed hover:bg-[var(--muted)] transition-colors group cursor-pointer border-[var(--border)]">
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
                                <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Zap className="w-6 h-6 text-primary-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg italic uppercase tracking-tighter">Enterprise</h4>
                                    <p className="text-xs text-[var(--muted-fg)] max-w-[180px]">Custom limits, white-labeling, and dedicated support.</p>
                                </div>
                                <Button variant="ghost" className="text-primary-400 hover:text-primary-300 gap-2 font-bold uppercase tracking-widest text-[10px]">
                                    Contact Sales <ArrowRight className="w-3 h-3" />
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Transaction History */}
                    <Card className="p-0 overflow-hidden">
                        <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]/30">
                            <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-[var(--muted-fg)]" />
                                Recent Transactions
                            </h3>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                            {[
                                { desc: 'Pro Power Subscription', date: 'Oct 12, 2024', amount: '-$49.00', status: 'Success' },
                                { desc: 'Added Credits', date: 'Oct 08, 2024', amount: '+$100.00', status: 'Success' },
                                { desc: 'Marketplace Purchase - Lead Pro', date: 'Oct 02, 2024', amount: '-$29.00', status: 'Success' },
                            ].map((tx, idx) => (
                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-[var(--muted)]/20 transition-colors group">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center group-hover:bg-[var(--card)] transition-colors">
                                            <CreditCard className="w-4 h-4 text-[var(--muted-fg)]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{tx.desc}</p>
                                            <p className="text-xs text-[var(--muted-fg)]">{tx.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <p className={`text-sm font-black ${tx.amount.startsWith('-') ? 'text-[var(--fg)]' : 'text-emerald-400'}`}>
                                            {tx.amount}
                                        </p>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-fg)] hover:text-primary-400">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
