'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Wallet,
    CheckCircle2,
    Clock,
    RefreshCw,
    AlertTriangle,
    Coins,
    ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { CreatorEarning, CreatorEarningsSummary } from '@/types';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CreatorEarningsPage() {
    const [summary, setSummary] = useState<CreatorEarningsSummary | null>(null);
    const [earnings, setEarnings] = useState<CreatorEarning[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [releasing, setReleasing] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/creator/earnings', { cache: 'no-store' });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.message || 'Could not load earnings.');
            setSummary(json.summary);
            setEarnings(json.earnings ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load earnings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const release = async (id: string) => {
        setReleasing(id);
        try {
            const res = await fetch('/api/creator/earnings/release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ earningId: id }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.message || 'Release failed.');
            toast.success(
                json.alreadyProcessed
                    ? 'Already released — no double credit.'
                    : `+${fmt(json.amount ?? 0)} credits moved to your wallet.`,
            );
            await load();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Release failed.');
        } finally {
            setReleasing(null);
        }
    };

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">Earnings & Payouts</h1>
                    <p className="text-[var(--muted-fg)]">Every credit is traceable to its marketplace sale. 1 credit = $1.</p>
                </div>
                <Button variant="outline" className="rounded-xl h-12 px-8 font-bold gap-2" onClick={load}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            {error && (
                <Card className="p-4 border-amber-500/40 bg-amber-500/5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold">Earnings unavailable</p>
                        <p className="text-[var(--muted-fg)]">{error}</p>
                    </div>
                </Card>
            )}

            {/* Total / Pending / Available */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Earnings', value: summary?.total_earnings ?? 0, icon: Coins, accent: 'text-primary-400', sales: summary?.sales_count ?? 0 },
                    { label: 'Pending Earnings', value: summary?.pending_earnings ?? 0, icon: Clock, accent: 'text-amber-400', hint: 'Release to wallet below' },
                    { label: 'Available Earnings', value: summary?.available_earnings ?? 0, icon: Wallet, accent: 'text-emerald-400', hint: 'Released to wallet' },
                ].map((c) => (
                    <Card key={c.label} className="p-6 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted-fg)] uppercase tracking-wider">
                            <c.icon className={`w-4 h-4 ${c.accent}`} /> {c.label}
                        </div>
                        <p className="text-3xl font-black">
                            {loading ? '···' : `${fmt(c.value)}`}
                            <span className="text-sm font-bold text-[var(--muted-fg)] ml-1">cr</span>
                        </p>
                        <p className="text-[11px] text-[var(--muted-fg)]">
                            {c.sales !== undefined ? `${c.sales} sale${c.sales === 1 ? '' : 's'}` : c.hint}
                        </p>
                    </Card>
                ))}
            </div>

            {/* Traceable earnings rows */}
            <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]/30">
                    <h3 className="font-bold uppercase tracking-widest text-xs">Earnings Ledger</h3>
                </div>
                <div className="divide-y divide-[var(--border)]">
                    {loading && earnings.length === 0 ? (
                        <p className="p-6 text-sm text-[var(--muted-fg)] text-center">Loading earnings…</p>
                    ) : earnings.length === 0 ? (
                        <div className="p-6 text-center space-y-2">
                            <p className="text-sm text-[var(--muted-fg)]">No earnings yet. Publish an automation to start earning 80% of each sale.</p>
                            <Link href="/creator/listings" className="inline-flex items-center gap-1 text-xs font-bold text-primary-400 hover:text-primary-300">
                                Go to listings <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    ) : (
                        earnings.map((e) => (
                            <div key={e.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--muted)]/20 transition-colors">
                                <div className="flex gap-4 items-center min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center shrink-0">
                                        <Coins className="w-4 h-4 text-[var(--muted-fg)]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black">+{fmt(Number(e.amount))} cr</p>
                                        <p className="text-xs text-[var(--muted-fg)] font-mono truncate">
                                            sale {e.transaction_id.slice(0, 8)} · {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <Badge
                                        variant={e.status === 'available' ? 'success' : e.status === 'reversed' ? 'warning' : 'primary'}
                                        className="font-bold uppercase text-[9px]"
                                    >
                                        {e.status}
                                    </Badge>
                                    {e.status === 'pending' && (
                                        <Button
                                            size="sm"
                                            className="rounded-xl font-bold"
                                            disabled={releasing === e.id}
                                            onClick={() => release(e.id)}
                                        >
                                            {releasing === e.id ? 'Releasing…' : 'Release to wallet'}
                                        </Button>
                                    )}
                                    {e.status === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            <p className="text-[11px] text-[var(--muted-fg)] text-center">
                Creator share = sale − platform fee (configurable in platform_config). Balances move only through server-side transactions — never from the browser.
            </p>
        </div>
    );
}
