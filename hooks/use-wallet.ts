'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { CreditTransaction } from '@/types';

export interface WalletSummaryData {
  balance: number;
  used_this_month: number;
  breakdown: {
    automation_purchases: number;
    managed_resources: number;
    usage_charges: number;
    other_spent: number;
  };
}

interface WalletState {
  balance: number | null;
  transactions: CreditTransaction[];
  summary: WalletSummaryData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Fetches keyed by limit (header uses 20, billing dashboard uses 100).
const inflight = new Map<number, Promise<{ balance: number; transactions: CreditTransaction[]; summary: WalletSummaryData | null }>>();

async function fetchWallet(limit: number): Promise<{ balance: number; transactions: CreditTransaction[]; summary: WalletSummaryData | null }> {
  if (!inflight.has(limit)) {
    inflight.set(limit, (async () => {
      const res = await fetch(`/api/wallet?limit=${limit}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || json?.error || 'wallet_fetch_failed');
      return {
        balance: Number(json.balance ?? 0),
        transactions: (json.transactions ?? []) as CreditTransaction[],
        summary: (json.summary ?? null) as WalletSummaryData | null,
      };
    })().finally(() => {
      inflight.delete(limit);
    }));
  }
  return inflight.get(limit)!;
}

/**
 * useWallet — Supabase/DB is the source of truth.
 * - Fetches from /api/wallet (no local-state trust).
 * - Realtime: subscribes to own wallets row + credit_transactions inserts
 *   and refreshes from the server on every event (avoids stale values).
 */
export function useWallet(limit = 20): WalletState {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [summary, setSummary] = useState<WalletSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setBalance(null);
      setTransactions([]);
      setSummary(null);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchWallet(limit);
      if (!mounted.current) return;
      setBalance(data.balance);
      setTransactions(data.transactions);
      setSummary(data.summary);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : 'wallet_fetch_failed');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  // Realtime refresh — any wallet/ledger change re-reads from the server.
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        () => {
          refresh();
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'credit_transactions', filter: `user_id=eq.${user.id}` },
        () => {
          refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return { balance, transactions, summary, loading, error, refresh };
}
