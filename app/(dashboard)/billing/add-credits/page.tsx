'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  KeyRound,
  ServerCog,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { BillAnimation, type BillLine } from '@/components/billing/bill-animation';
import { useWallet } from '@/hooks/use-wallet';
import { cn } from '@/lib/utils';
import type { CustomerType, Payment } from '@/types';

const PRESETS = [10, 25, 50, 100, 200];
const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Phase = 'form' | 'processing' | 'success' | 'error';

async function api(path: string, init?: RequestInit, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(path, { ...init, signal: ctrl.signal, cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  } finally {
    clearTimeout(t);
  }
}

function AddCreditsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh: refreshWallet } = useWallet();

  const [customerType, setCustomerType] = useState<CustomerType | null>(null);
  const [preset, setPreset] = useState<number | null>(200);
  const [custom, setCustom] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [stage, setStage] = useState(0);
  const [billLines, setBillLines] = useState<BillLine[]>([]);
  const [billError, setBillError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);
  const [resuming, setResuming] = useState(false);
  const confirming = useRef(false);

  const amount = custom.trim() !== '' ? Number(custom) : (preset ?? 0);
  const amountValid = Number.isFinite(amount) && amount >= 1 && amount <= 10000;
  const canProceed = customerType !== null && amountValid && phase !== 'processing';

  const fail = useCallback((msg: string) => {
    setError(msg);
    setBillError(msg);
    setPhase('error');
  }, []);

  const runConfirm = useCallback(
    async (paymentId: string) => {
      if (confirming.current) return; // double-click guard
      confirming.current = true;
      try {
        setStage(2);
        let result: { res: Response; json: Record<string, unknown> };
        try {
          result = await api(`/api/billing/payments/${paymentId}/confirm`, { method: 'POST' });
        } catch (e) {
          // Timeout / network: payment may still have succeeded server-side.
          // Re-read authoritative status instead of guessing.
          if (e instanceof DOMException && e.name === 'AbortError') {
            const st = await api(`/api/billing/payments/${paymentId}`, undefined, 15000).catch(() => null);
            const p = st?.json?.payment as Payment | undefined;
            if (p?.status === 'succeeded') {
              await refreshWallet();
              const { res: r2, json: j2 } = await api(`/api/billing/payments/${paymentId}/confirm`, { method: 'POST' });
              if (r2.ok) {
                setPayment(j2.payment as Payment);
                setNewBalance(Number(j2.walletBalance ?? 0));
                setAlreadyProcessed(Boolean(j2.alreadyProcessed));
                setStage(3);
                setPhase('success');
                return;
              }
            }
            fail('Confirmation timed out. Your payment status was re-checked — open this page again to resume safely.');
            return;
          }
          throw e;
        }
        const { res, json } = result;
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) {
          fail((json?.message as string) || 'Payment could not be verified.');
          return;
        }
        setPayment(json.payment as Payment);
        setNewBalance(Number(json.walletBalance ?? 0));
        setAlreadyProcessed(Boolean(json.alreadyProcessed));
        setStage(3);
        setPhase('success');
        await refreshWallet(); // header + billing refresh from server truth
      } finally {
        confirming.current = false;
      }
    },
    [fail, refreshWallet, router],
  );

  const handleProceed = useCallback(async () => {
    if (!canProceed || confirming.current) return;
    setError(null);
    setBillError(null);
    setPhase('processing');
    setStage(0);

    // 1. Create pending payment (server validates type + amount, credits nothing)
    let created: Payment;
    try {
      const { res, json } = await api('/api/billing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerType, amountUsd: amount }),
      });
      if (res.status === 401) {
        router.push('/login');
        setPhase('form');
        return;
      }
      if (!res.ok || !json?.payment) {
        if (res.status === 503) {
          fail('Payments are not set up yet. Run the Part 2 + Part 3 SQL migrations in Supabase, then try again.');
        } else {
          fail((json?.message as string) || 'Could not start the payment.');
        }
        return;
      }
      created = json.payment as Payment;
    } catch {
      fail('Network error while starting the payment. Try again.');
      return;
    }

    // 2. Bill animation lines (receipt theater while server works)
    setBillLines([
      { label: 'Plan', value: created.customer_type === 'byok' ? 'BYOK' : 'AION Managed' },
      { label: 'Payment', value: `$${fmt(Number(created.amount_usd))}` },
      { label: 'You receive', value: `${fmt(Number(created.credits_amount))} Credits` },
      { label: 'Ref', value: created.id.slice(0, 8).toUpperCase() },
    ]);
    setStage(1);
    // REAL-GATEWAY HOOK: if payment.redirectUrl is set (Stripe Checkout),
    // `window.location.href = redirectUrl` here instead of confirming inline.
    await new Promise((r) => setTimeout(r, 900));
    await runConfirm(created.id);
  }, [amount, canProceed, customerType, fail, router, runConfirm]);

  // Refresh-safe: ?payment=<id> re-reads server-verified status on load.
  useEffect(() => {
    const pid = params.get('payment');
    if (!pid || payment) return;
    let cancelled = false;
    (async () => {
      setResuming(true);
      try {
        const { res, json } = await api(`/api/billing/payments/${pid}`);
        if (cancelled) return;
        if (res.ok && json?.payment) {
          const p = json.payment as Payment;
          setPayment(p);
          if (p.status === 'succeeded') {
            setPhase('success');
            await refreshWallet();
          } else if (p.status === 'pending' || p.status === 'processing') {
            // Resume an interrupted payment instead of creating a duplicate.
            setCustomerType(p.customer_type);
            setPreset(PRESETS.includes(Math.round(Number(p.amount_usd))) ? Math.round(Number(p.amount_usd)) : null);
            if (!PRESETS.includes(Math.round(Number(p.amount_usd)))) setCustom(String(p.amount_usd));
            setBillLines([
              { label: 'Plan', value: p.customer_type === 'byok' ? 'BYOK' : 'AION Managed' },
              { label: 'Payment', value: `$${fmt(Number(p.amount_usd))}` },
              { label: 'You receive', value: `${fmt(Number(p.credits_amount))} Credits` },
              { label: 'Ref', value: p.id.slice(0, 8).toUpperCase() },
            ]);
            setPhase('processing');
            setStage(1);
            await runConfirm(p.id);
          } else {
            fail(`This payment ${p.status}. Start a new one to try again.`);
          }
        }
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, payment, fail, refreshWallet, runConfirm]);

  // ─── Success ───
  if (phase === 'success' && payment) {
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto">
        <Card className="p-8 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Payment successful</h1>
            <p className="text-sm text-[var(--muted-fg)] mt-1">
              ${fmt(Number(payment.amount_usd))} → +{fmt(Number(payment.credits_amount))} AION Credits
              {alreadyProcessed && ' · (already credited — duplicate ignored)'}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--muted)]/60 border border-[var(--border)] p-4 flex items-center justify-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-[var(--muted-fg)]">New balance</span>
            <span className="text-xl font-black">{newBalance !== null ? fmt(newBalance) : '···'} Credits</span>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href="/billing">
              <Button variant="outline" className="rounded-xl">View Billing</Button>
            </Link>
            <Link href="/dashboard">
              <Button className="rounded-xl">Back to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Error ───
  if (phase === 'error') {
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto space-y-6">
        <BillAnimation open={true} lines={billLines} stage={stage} error={billError} onClose={() => { setPhase('form'); setBillError(null); }} />
        <Card className="p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            {params.get('cancelled') || /cancel/i.test(error ?? '') ? (
              <XCircle className="w-8 h-8 text-amber-400" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-400" />
            )}
          </div>
          <h1 className="text-2xl font-black">Payment didn&apos;t go through</h1>
          <p className="text-sm text-[var(--muted-fg)]">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => { setPhase('form'); setError(null); setBillError(null); }}>
              <RefreshCw className="w-4 h-4" /> Try again
            </Button>
            <Link href="/billing">
              <Button variant="ghost" className="rounded-xl">Back to Billing</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Form ───
  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-8">
      <BillAnimation open={phase === 'processing'} lines={billLines} stage={stage} error={null} onClose={() => {}} />
      <div className="flex items-center gap-3">
        <Link href="/billing" className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--muted-fg)]" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Credits</h1>
          <p className="text-[var(--muted-fg)]">$1 = 1 AION Credit · sandbox receipt, no real charge</p>
        </div>
      </div>

      {resuming && (
        <Card className="p-4 flex items-center gap-3 text-sm text-[var(--muted-fg)]">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> Restoring your payment from the server…
        </Card>
      )}

      {/* 1. Customer type */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-[var(--muted-fg)]">1 · Which type of customer are you?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setCustomerType('byok')}
            className={cn(
              'text-left rounded-2xl border-2 p-5 transition-all',
              customerType === 'byok'
                ? 'border-primary-500 bg-primary-500/5 ring-4 ring-primary-500/10'
                : 'border-[var(--border)] hover:border-primary-500/40 bg-[var(--card)]',
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <KeyRound className="w-5 h-5 text-primary-400" />
              {customerType === 'byok' && <Badge variant="primary" className="text-[10px]">Selected</Badge>}
            </div>
            <p className="font-black uppercase tracking-tight">BYOK</p>
            <p className="text-sm text-[var(--muted-fg)] mt-1">I will provide my own API/integration keys.</p>
          </button>
          <button
            onClick={() => setCustomerType('managed')}
            className={cn(
              'text-left rounded-2xl border-2 p-5 transition-all',
              customerType === 'managed'
                ? 'border-primary-500 bg-primary-500/5 ring-4 ring-primary-500/10'
                : 'border-[var(--border)] hover:border-primary-500/40 bg-[var(--card)]',
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <ServerCog className="w-5 h-5 text-accent-400" />
              {customerType === 'managed' && <Badge variant="primary" className="text-[10px]">Selected</Badge>}
            </div>
            <p className="font-black uppercase tracking-tight">AION Managed</p>
            <p className="text-sm text-[var(--muted-fg)] mt-1">AION will manage the required resources for me.</p>
          </button>
        </div>
      </section>

      {/* 2. Amount */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-[var(--muted-fg)]">2 · Amount</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => { setPreset(v); setCustom(''); }}
              className={cn(
                'h-14 rounded-2xl border-2 font-black text-lg transition-all',
                preset === v && custom.trim() === ''
                  ? 'border-primary-500 bg-primary-500/10 text-primary-500 dark:text-primary-300'
                  : 'border-[var(--border)] hover:border-primary-500/40',
              )}
            >
              ${v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--muted-fg)]">$</span>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="Custom amount"
              inputMode="decimal"
              className="w-full h-14 rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] pl-8 pr-4 font-bold focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
        {custom.trim() !== '' && !amountValid && (
          <p className="text-xs text-red-400">Enter an amount between $1 and $10,000.</p>
        )}
      </section>

      {/* 3. Summary + proceed */}
      <Card className="p-6 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--muted-fg)]">Payment</span>
          <span className="font-black text-lg">${amountValid ? fmt(amount) : '—'}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-[var(--border)] pt-4">
          <span className="text-[var(--muted-fg)]">You receive</span>
          <span className="font-black text-lg text-emerald-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4" />{amountValid ? `${fmt(amount)} Credits` : '—'}
          </span>
        </div>
        <Button
          disabled={!canProceed}
          onClick={handleProceed}
          className="w-full h-14 rounded-2xl text-base font-black disabled:opacity-40"
        >
          {phase === 'processing' ? 'Processing…' : `Proceed · $${amountValid ? fmt(amount) : '0.00'}`}
        </Button>
        {!customerType && <p className="text-xs text-center text-[var(--muted-fg)]">Select BYOK or AION Managed to continue.</p>}
      </Card>
    </div>
  );
}

export default function AddCreditsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-[var(--muted-fg)]">Loading…</div>}>
      <AddCreditsInner />
    </Suspense>
  );
}
