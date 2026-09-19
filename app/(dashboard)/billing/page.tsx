'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    CreditCard,
    Wallet,
    Zap,
    CheckCircle2,
    Clock,
    ArrowRight,
    RefreshCw,
    AlertTriangle,
    Coins,
    ServerCog,
    Sparkles,
    Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/hooks/use-wallet';
import { cn } from '@/lib/utils';
import type { CreditTransactionType } from '@/types';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function txLabel(t: string): string {
  switch (t) {
    case 'payment_credit': return 'Credits Added';
    case 'automation_purchase': return 'Automation Purchase';
    case 'automation_usage': return 'Usage Charge';
    case 'managed_resource_charge': return 'Managed Resource';
    case 'creator_earning': return 'Creator Earning';
    case 'refund': return 'Refund';
    case 'adjustment': return 'Adjustment';
    default: return t;
  }
}

type FilterKey = 'all' | 'added' | 'spent' | 'automation' | 'managed' | 'earnings' | 'refunds';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'added', label: 'Added' },
  { key: 'spent', label: 'Spent' },
  { key: 'automation', label: 'Automation' },
  { key: 'managed', label: 'Managed Resources' },
  { key: 'earnings', label: 'Creator Earnings' },
  { key: 'refunds', label: 'Refunds' },
];

function matchesFilter(tx: { amount: number; transaction_type: CreditTransactionType }, f: FilterKey): boolean {
  const amt = Number(tx.amount);
  switch (f) {
    case 'all': return true;
    case 'added': return amt > 0;
    case 'spent': return amt < 0;
    case 'automation': return tx.transaction_type === 'automation_purchase' || tx.transaction_type === 'automation_usage';
    case 'managed': return tx.transaction_type === 'managed_resource_charge';
    case 'earnings': return tx.transaction_type === 'creator_earning';
    case 'refunds': return tx.transaction_type === 'refund';
  }
}

export default function BillingPage() {
    const { balance, transactions, summary, loading, error, refresh } = useWallet(100);
    const [filter, setFilter] = useState<FilterKey>('all');

    const filtered = useMemo(
        () => transactions.filter((t) => matchesFilter(t, filter)),
        [transactions, filter],
    );

    const breakdown = summary?.breakdown;
    const breakdownRows = [
        { label: 'Automation Purchases', value: breakdown?.automation_purchases ?? 0, icon: Zap, color: 'text-primary-400' },
        { label: 'Managed Resources', value: breakdown?.managed_resources ?? 0, icon: ServerCog, color: 'text-emerald-400' },
        { label: 'Usage Charges', value: breakdown?.usage_charges ?? 0, icon: Sparkles, color: 'text-amber-400' },
        { label: 'Other', value: breakdown?.other_spent ?? 0, icon: CreditCard, color: 'text-[var(--muted-fg)]' },
    ];
    const breakdownTotal = breakdownRows.reduce((a, r) => a + r.value, 0);

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold">Billing & Usage</h1>
                <p className="text-[var(--muted-fg)]">Balance, spending and full credit history — served live from Supabase.</p>
            </div>

            {error && (
                <Card className="p-4 border-amber-500/40 bg-amber-500/5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold">Wallet unavailable</p>
                        <p className="text-[var(--muted-fg)] break-words">{error}</p>
                        {/provisioned|relation|table/i.test(error) && (
                            <p className="text-[var(--muted-fg)] mt-1">
                                Run the Part 2–5 SQL migrations in the Supabase SQL Editor, in order, then refresh.
                            </p>
                        )}
                        <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={refresh}>
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </Button>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Balance & Credits */}
                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-primary-600 to-accent-600 text-white border-none shadow-xl shadow-primary-500/20">
                        <div className="space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <Badge className="bg-white/20 border-none text-white font-bold">Active</Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Current Balance</p>
                                <h3 className="text-4xl font-extrabold">
                                    {loading ? '···' : `${fmt(balance ?? 0)}`}
                                </h3>
                                <p className="text-xs opacity-70 mt-1">AION Credits · 1 USD = 1 Credit</p>
                            </div>
                            <div className="flex gap-2">
                                <Link href="/billing/add-credits" className="flex-1">
                                    <Button className="w-full bg-white text-primary-600 hover:bg-white/90 font-bold py-6 rounded-2xl transition-transform active:scale-[0.98]">
                                        <Wallet className="w-4 h-4 mr-2" />
                                        + Add Credits
                                    </Button>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-2xl h-auto"
                                    onClick={refresh}
                                    title="Refresh balance from server (Supabase = source of truth)"
                                >
                                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Month usage */}
                    <Card className="p-6 space-y-4">
                        <h4 className="font-bold flex items-center gap-2">
                            <Coins className="w-4 h-4 text-amber-400" />
                            Credits Used This Month
                        </h4>
                        <p className="text-3xl font-black">
                            {loading ? '···' : `${fmt(summary?.used_this_month ?? 0)}`}
                            <span className="text-sm font-bold text-[var(--muted-fg)] ml-1">Credits</span>
                        </p>
                        <div className="space-y-3">
                            {breakdownRows.map((r) => (
                                <div key={r.label} className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="flex items-center gap-1.5 font-bold text-[var(--muted-fg)]">
                                            <r.icon className={cn("w-3.5 h-3.5", r.color)} /> {r.label}
                                        </span>
                                        <span className="font-black">{fmt(r.value)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                                            style={{ width: `${breakdownTotal > 0 ? Math.min(100, (r.value / breakdownTotal) * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Right column */}
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

                    {/* Transaction History — filters + full rows */}
                    <Card className="p-0 overflow-hidden">
                        <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]/30 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-[var(--muted-fg)]" />
                                    Transaction History
                                </h3>
                                <button onClick={refresh} className="text-[var(--muted-fg)] hover:text-primary-400 transition-colors" title="Refresh from server">
                                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                                </button>
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {FILTERS.map((f) => (
                                    <button
                                        key={f.key}
                                        onClick={() => setFilter(f.key)}
                                        className={cn(
                                            'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-colors',
                                            filter === f.key
                                                ? 'bg-primary-500 border-primary-500 text-white'
                                                : 'border-[var(--border)] text-[var(--muted-fg)] hover:border-primary-500/50 hover:text-[var(--fg)]',
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                            {loading && transactions.length === 0 ? (
                                <p className="p-6 text-sm text-[var(--muted-fg)] text-center">Loading ledger…</p>
                            ) : filtered.length === 0 ? (
                                <div className="p-6 text-center space-y-2">
                                    <p className="text-sm text-[var(--muted-fg)]">
                                        {transactions.length === 0 ? 'No credit transactions yet.' : 'Nothing matches this filter.'}
                                    </p>
                                    <p className="text-xs text-[var(--muted-fg)]">Credits added, purchases, usage and refunds will appear here.</p>
                                </div>
                            ) : (
                                filtered.map((tx) => {
                                    const amt = Number(tx.amount);
                                    const positive = amt > 0;
                                    const Icon = tx.transaction_type === 'refund' ? Undo2
                                        : tx.transaction_type === 'managed_resource_charge' ? ServerCog
                                        : tx.transaction_type === 'creator_earning' ? Coins
                                        : CreditCard;
                                    return (
                                        <div key={tx.id} className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--muted)]/20 transition-colors group">
                                            <div className="flex gap-3 sm:gap-4 items-center min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-[var(--muted)] hidden sm:flex items-center justify-center group-hover:bg-[var(--card)] transition-colors shrink-0">
                                                    <Icon className="w-4 h-4 text-[var(--muted-fg)]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold truncate">
                                                        {positive ? '+' : ''}{fmt(amt)}
                                                        <span className={cn("ml-2 font-medium", positive ? 'text-emerald-400' : 'text-[var(--muted-fg)]')}>
                                                            {tx.description || txLabel(tx.transaction_type)}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-[var(--muted-fg)] truncate">
                                                        {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        {' · Bal after '}{fmt(Number(tx.balance_after))}
                                                        {tx.reference_id && (
                                                            <span className="font-mono"> · Ref {tx.reference_id.slice(0, 8)}</span>
                                                        )}
                                                    </p>
                                                    <div className="mt-1 flex gap-1.5 flex-wrap">
                                                        <Badge variant={positive ? 'success' : 'default'} className="font-bold uppercase text-[9px]">
                                                            {txLabel(tx.transaction_type)}
                                                        </Badge>
                                                        <Badge variant="default" className="font-bold uppercase text-[9px] opacity-70">
                                                            Completed
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={cn('text-sm font-black', positive ? 'text-emerald-400' : 'text-[var(--fg)]')}>
                                                    {positive ? '+' : '−'}{fmt(Math.abs(amt))}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20">
                            <p className="text-[11px] uppercase tracking-widest font-bold text-[var(--muted-fg)]">
                                Showing {filtered.length} of {transactions.length} · Supabase is the source of truth
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
