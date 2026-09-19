'use client';

import { useEffect, useState } from 'react';
import { Check, FileText, Loader2, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BillLine {
  label: string;
  value: string;
}

interface BillAnimationProps {
  open: boolean;
  lines: BillLine[];
  stage: number; // 0..3 controlled by parent; 4 = done handled by parent unmount
  error: string | null;
  onClose: () => void;
}

const STAGES = ['Creating payment', 'Generating bill', 'Confirming payment', 'Crediting wallet'];

export function BillAnimation({ open, lines, stage, error, onClose }: BillAnimationProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  // Reset the printed-lines counter whenever a new bill opens
  // (render-time derived-state reset — the documented React pattern).
  const billKey = `${open}-${lines.length}`;
  const [prevKey, setPrevKey] = useState(billKey);
  if (prevKey !== billKey) {
    setPrevKey(billKey);
    setVisibleLines(0);
  }

  useEffect(() => {
    if (!open || lines.length === 0) return;
    const t = setInterval(() => {
      setVisibleLines((v) => {
        if (v >= lines.length) {
          clearInterval(t);
          return v;
        }
        return v + 1;
      });
    }, 350);
    return () => clearInterval(t);
  }, [open, lines.length]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Receipt header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-dashed border-[var(--border)]">
          <div className="mx-auto w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3">
            {error ? (
              <X className="w-5 h-5 text-red-400" />
            ) : (
              <FileText className="w-5 h-5 text-primary-400" />
            )}
          </div>
          <h3 className="font-black uppercase tracking-widest text-sm">AION Bill</h3>
          <p className="text-[11px] text-[var(--muted-fg)] mt-1">
            {error ? 'Processing stopped' : 'Sandbox receipt · no real charge'}
          </p>
        </div>

        {/* Receipt lines print one by one */}
        <div className="px-6 py-4 space-y-2.5 min-h-[132px] font-mono text-sm">
          {lines.slice(0, visibleLines).map((l) => (
            <div key={l.label} className="flex justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <span className="text-[var(--muted-fg)]">{l.label}</span>
              <span className="font-bold text-[var(--fg)] text-right">{l.value}</span>
            </div>
          ))}
          {visibleLines < lines.length && (
            <div className="flex items-center gap-2 text-[var(--muted-fg)] text-xs pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> printing…
            </div>
          )}
        </div>

        {/* Stage progress */}
        <div className="px-6 pb-4">
          <div className="h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
              style={{ width: `${Math.min(100, ((stage + 1) / STAGES.length) * 100)}%` }}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            {STAGES.map((s, i) => (
              <div key={s} className="flex items-center gap-2 text-xs">
                {i < stage || (error === null && i === stage && visibleLines >= lines.length) ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : i === stage && !error ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400 shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-[var(--border)] shrink-0" />
                )}
                <span className={cn(i <= stage && !error ? 'text-[var(--fg)] font-medium' : 'text-[var(--muted-fg)]')}>
                  {s}{i === stage && !error ? '…' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          {error ? (
            <div className="space-y-3">
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
              <button
                onClick={onClose}
                className="w-full h-10 rounded-xl border border-[var(--border)] text-sm font-bold hover:bg-[var(--muted)] transition-colors"
              >
                Back
              </button>
            </div>
          ) : (
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted-fg)]">
              <ShieldCheck className="w-3.5 h-3.5" /> Do not close — confirming with server
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
