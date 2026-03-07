'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DollarSign,
    ArrowUpRight,
    Download,
    TrendingUp,
    CreditCard,
    Calendar,
    ArrowRight,
    PieChart,
    Wallet,
    CheckCircle2
} from 'lucide-react';

const payouts = [
    { id: '1', date: 'Oct 30, 2024', amount: '$4,520', status: 'Processing', method: 'Bank Transfer •••• 4242' },
    { id: '2', date: 'Sep 30, 2024', amount: '$3,840', status: 'Paid', method: 'Bank Transfer •••• 4242' },
    { id: '3', date: 'Aug 30, 2024', amount: '$4,110', status: 'Paid', method: 'Bank Transfer •••• 4242' },
];

export default function CreatorEarningsPage() {
    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">Earnings & Payouts</h1>
                    <p className="text-[var(--muted-fg)]">Track your revenue generation and withdraw your available balance.</p>
                </div>
                <Button className="rounded-xl shadow-lg shadow-primary-500/20 h-12 px-8 font-bold italic uppercase tracking-widest">
                    Withdraw Balance
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Balance Card */}
                <Card className="lg:col-span-2 bg-gradient-to-br from-[var(--card)] to-[var(--muted)] border-none p-8 flex flex-col justify-between group overflow-hidden relative">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-all duration-700" />

                    <div className="relative space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="p-4 rounded-2xl bg-primary-500/10 text-primary-400">
                                <Wallet className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-[0.2em]">Available for Withdrawal</p>
                                <h2 className="text-5xl font-black tracking-tight">$12,450.00</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-[var(--border)]">
                            <div>
                                <p className="text-xs font-bold text-[var(--muted-fg)] uppercase tracking-wider mb-1">Lifetime Earnings</p>
                                <p className="text-xl font-black">$48,290</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[var(--muted-fg)] uppercase tracking-wider mb-1">Expected Next Payout</p>
                                <p className="text-xl font-black text-emerald-400 font-italic">Nov 30</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[var(--muted-fg)] uppercase tracking-wider mb-1">Commission Rate</p>
                                <p className="text-xl font-black">15%</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Earnings breakdown by Listing */}
                <Card className="p-6 space-y-6 flex flex-col">
                    <h3 className="font-bold flex items-center gap-2 uppercase tracking-tighter text-sm">
                        <PieChart className="w-4 h-4 text-primary-400" /> Revenue Source Breakdown
                    </h3>
                    <div className="flex-1 space-y-5">
                        {[
                            { name: 'Lead Magnet Pro', val: '65%', color: 'bg-primary-500' },
                            { name: 'Notion Sync Engine', val: '25%', color: 'bg-accent-500' },
                            { name: 'Gmail Triage Bot', val: '10%', color: 'bg-emerald-500' },
                        ].map(s => (
                            <div key={s.name} className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-tight">
                                    <span>{s.name}</span>
                                    <span className="text-[var(--muted-fg)]">{s.val}</span>
                                </div>
                                <div className="h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                                    <div className={`${s.color} h-full rounded-full`} style={{ width: s.val }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-primary-400 hover:text-primary-300 gap-2">
                        Detailed Analytics <ArrowRight className="w-3 h-3" />
                    </Button>
                </Card>
            </div>

            {/* Payout History */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold uppercase tracking-tight italic">Payout History</h2>
                    <Button variant="outline" size="sm" className="rounded-xl h-9 gap-2 font-bold text-xs">
                        <Download className="w-4 h-4" /> Export Tax Forms
                    </Button>
                </div>

                <Card className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]/30 grid grid-cols-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">
                        <div className="pl-4">Payout Date</div>
                        <div>Amount</div>
                        <div>Status</div>
                        <div>Method</div>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {payouts.map((p) => (
                            <div key={p.id} className="p-6 grid grid-cols-4 items-center group hover:bg-[var(--muted)]/20 transition-all">
                                <div className="flex items-center gap-3 pl-4">
                                    <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-[var(--muted-fg)] group-hover:text-primary-400 transition-colors">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-sm tracking-tight">{p.date}</span>
                                </div>
                                <div className="font-black text-lg italic tracking-tighter">
                                    {p.amount}
                                </div>
                                <div>
                                    <Badge
                                        variant={p.status === 'Paid' ? 'success' : 'warning'}
                                        pulse={p.status === 'Processing'}
                                        dot
                                        className="font-bold uppercase text-[9px] px-2 py-0.5"
                                    >
                                        {p.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[var(--muted-fg)] font-medium">{p.method}</span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Security Note */}
            <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col md:flex-row items-center gap-6 justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl shadow-lg shadow-emerald-500/5">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-[var(--fg)] uppercase tracking-tight">Verified Bank Connection</h4>
                        <p className="text-sm text-[var(--muted-fg)]">Your Stripe account is connected and ready for instant payouts.</p>
                    </div>
                </div>
                <Button variant="ghost" className="text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs gap-2">
                    Manage Stripe <CreditCard className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
