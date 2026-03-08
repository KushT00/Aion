'use client';

import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight, PartyPopper, ChevronRight, Zap, Hammer, Laptop } from 'lucide-react';
import Link from 'next/link';

export function CreatorStep4Success() {
    return (
        <div className="flex flex-col items-center text-center py-6 space-y-10">
            {/* Header */}
            <div className="space-y-4">
                <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center animate-bounce duration-1000">
                        <Rocket className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 p-2 bg-emerald-500 rounded-full border-4 border-[var(--bg)] shadow-lg animate-pulse">
                        <PartyPopper className="w-4 h-4 text-white" />
                    </div>
                </div>
                <h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter">
                    Account <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-primary-400">Activated!</span>
                </h2>
                <p className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-widest max-w-sm mx-auto">
                    You are now a verified AION Creator. Your journey starts here.
                </p>
            </div>

            {/* Quick Actions List */}
            <div className="w-full max-w-md space-y-3">
                <Link href="/creator/dashboard" className="block group">
                    <div className="flex items-center gap-4 p-5 rounded-3xl bg-[var(--muted)]/50 border border-[var(--border)] hover:border-primary-500/50 hover:bg-primary-500/5 transition-all duration-300">
                        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center shrink-0">
                            <Laptop className="w-6 h-6 text-primary-400" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary-400">Creator Studio</p>
                            <p className="text-sm font-black uppercase tracking-tight">Main Dashboard</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[var(--muted-fg)] group-hover:translate-x-1 group-hover:text-primary-400 transition-all" />
                    </div>
                </Link>

                <Link href="/builder" className="block group">
                    <div className="flex items-center gap-4 p-5 rounded-3xl bg-[var(--muted)]/50 border border-[var(--border)] hover:border-accent-500/50 hover:bg-accent-500/5 transition-all duration-300">
                        <div className="w-12 h-12 rounded-2xl bg-accent-500/10 flex items-center justify-center shrink-0">
                            <Hammer className="w-6 h-6 text-accent-400" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-400">Build Now</p>
                            <p className="text-sm font-black uppercase tracking-tight">Workflow Builder</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[var(--muted-fg)] group-hover:translate-x-1 group-hover:text-accent-400 transition-all" />
                    </div>
                </Link>

                <div className="flex items-center gap-4 p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Zap className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Next Step</p>
                        <p className="text-sm font-black uppercase tracking-tight">Setup your wallet</p>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Automatic</span>
                </div>
            </div>

            <Link href="/creator/dashboard">
                <Button size="lg" className="h-16 px-12 rounded-[2rem] font-black uppercase italic tracking-widest bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 shadow-2xl shadow-primary-500/30">
                    Enter Creator Studio <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
            </Link>
        </div>
    );
}
