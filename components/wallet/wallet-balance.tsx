'use client';

import Link from 'next/link';
import { Coins, Plus } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import { cn } from '@/lib/utils';

function formatCredits(v: number | null): string {
  if (v === null || Number.isNaN(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Header wallet pill — matches existing AION topbar styling.
 * Shows live balance (server = source of truth) + Add Credits shortcut.
 */
export function WalletBalance({ className }: { className?: string }) {
  const { balance, loading } = useWallet();

  return (
    <div className={cn('flex items-center gap-2 shrink-0', className)}>
      <div
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-xl',
          'bg-[var(--muted)] border border-[var(--border)]',
          'text-sm font-bold text-[var(--fg)] whitespace-nowrap',
        )}
        title="AION Credits balance (1 USD = 1 Credit)"
      >
        <Coins className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="hidden md:inline text-[var(--muted-fg)] font-medium">
          AION Credits:
        </span>
        <span className={cn(loading && 'opacity-50 animate-pulse')}>
          {loading ? '···' : formatCredits(balance)}
        </span>
      </div>
      <Link
        href="/billing/add-credits"
        className={cn(
          'flex items-center gap-1 h-9 px-3 rounded-xl',
          'text-[10px] font-black uppercase tracking-widest',
          'bg-primary-500/10 border border-primary-500/30 text-primary-500 dark:text-primary-400',
          'hover:bg-primary-500/20 transition-colors whitespace-nowrap',
        )}
        title="Add Credits"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Add Credits</span>
        <span className="sm:hidden">Add</span>
      </Link>
    </div>
  );
}
