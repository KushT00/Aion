'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Bot,
    Settings,
    Play,
    Pause,
    Zap,
    Activity,
    History,
    Search,
    ArrowUpRight,
    Sparkles,
    Loader2,
    Package,
    Terminal,
    Key,
    CheckCircle2,
    AlertCircle,
    Clock,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
    active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10', pulse: true },
    setup_required: { label: 'Setup Required', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    paused: { label: 'Paused', color: 'text-[var(--muted-fg)]', bg: 'bg-[var(--muted)]' },
    error: { label: 'Error', color: 'text-rose-400', bg: 'bg-rose-500/10' },
};

export default function MyAutomationsPage() {
    const [automations, setAutomations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        async function fetchAutomations() {
            try {
                const res = await fetch('/api/my-automations', { signal: controller.signal });
                const data = await res.json();
                if (isMounted && res.ok) {
                    setAutomations(data.automations || []);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') console.error(err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        fetchAutomations();
        return () => { isMounted = false; controller.abort(); };
    }, []);

    const filtered = automations.filter(a => {
        return (a.listing?.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Create instance if missing (for old purchases that don't have one)
    const handleCreateInstance = async (purchaseId: string, item: any) => {
        try {
            toast.loading('Creating instance...', { id: 'create-inst' });
            const res = await fetch('/api/marketplace/create-instance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchaseId }),
            });
            const data = await res.json();
            toast.dismiss('create-inst');
            if (res.ok && data.instanceId) {
                toast.success('Instance created!');
                window.location.href = `/my-automations/${data.instanceId}/setup`;
            } else {
                toast.error(data.error || 'Failed to create instance');
            }
        } catch {
            toast.dismiss('create-inst');
            toast.error('Connection error');
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm font-bold text-[var(--muted-fg)] uppercase tracking-widest">Waking up your workers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">My <span className="text-primary-400">Automations</span></h1>
                    <p className="text-[var(--muted-fg)] font-medium">Manage and monitor your deployed AI instances.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search instances..."
                        className="bg-[var(--muted)] border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-1 ring-primary-500/50 w-64 transition-all font-bold placeholder:opacity-50"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filtered.map((item) => {
                    const status = item.status || 'setup_required';
                    const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.setup_required;
                    const listing = item.listing;
                    const hasInstance = !!item.instanceId;

                    return (
                        <Card key={item.purchaseId} className="relative overflow-hidden group hover:border-primary-500/40 p-0 transition-all duration-500 rounded-[2rem] border-[var(--border)] bg-[var(--card)] shadow-xl shadow-black/5">
                            {/* Status stripe */}
                            <div className={cn(
                                "h-1.5 w-full",
                                status === 'active' ? "bg-emerald-500" :
                                    status === 'setup_required' ? "bg-amber-500" :
                                        status === 'error' ? "bg-rose-500" :
                                            "bg-[var(--muted)]"
                            )} />

                            <div className="flex flex-col lg:flex-row lg:items-center p-6 gap-8">
                                {/* Icon & Name */}
                                <div className="flex items-center gap-6 flex-1">
                                    <div className={cn(
                                        "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500",
                                        status === 'active' ? "bg-emerald-500/10 text-emerald-400" :
                                            status === 'setup_required' ? "bg-amber-500/10 text-amber-400" :
                                                "bg-primary-500/10 text-primary-400"
                                    )}>
                                        {status === 'setup_required' ? <Key className="w-8 h-8" /> : <Bot className="w-8 h-8" />}
                                    </div>
                                    <div className="space-y-1.5 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="font-black text-xl uppercase italic tracking-tighter truncate">{listing?.title || 'Automation'}</h3>
                                            <Badge className={cn(
                                                "font-black uppercase tracking-widest text-[8px] border",
                                                statusConf.bg, statusConf.color,
                                                statusConf.pulse ? "animate-pulse" : ""
                                            )}>
                                                {status === 'setup_required' && <AlertCircle className="w-3 h-3 mr-1" />}
                                                {status === 'active' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                {statusConf.label}
                                            </Badge>
                                            {item.pricing_tier && (
                                                <Badge className={cn(
                                                    "font-black uppercase tracking-widest text-[8px]",
                                                    item.pricing_tier === 'managed'
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : "bg-primary-500/10 text-primary-400 border-primary-500/20"
                                                )}>
                                                    {item.pricing_tier === 'managed' ? 'Managed' : 'BYOK'}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)]">
                                            <span className="flex items-center gap-1.5"><Package className="w-3 h-3" /> {listing?.category || 'Automation'}</span>
                                            <span className="flex items-center gap-1.5"><Terminal className="w-3 h-3" /> {listing?.seller?.full_name || 'Creator'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 px-2 md:px-0">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)] opacity-50">Total Runs</p>
                                        <p className="text-xl font-black italic flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-amber-400" />
                                            {item.total_runs || 0}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)] opacity-50">Success Rate</p>
                                        <p className="text-xl font-black italic flex items-center gap-2 text-emerald-400">
                                            <ArrowUpRight className="w-4 h-4" />
                                            {item.total_runs > 0
                                                ? `${Math.round((item.total_successes / item.total_runs) * 100)}%`
                                                : '—'}
                                        </p>
                                    </div>
                                    <div className="hidden md:block space-y-1">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-[var(--muted-fg)] opacity-50">Last Run</p>
                                        <p className="text-sm font-black uppercase flex items-center gap-2">
                                            <History className="w-4 h-4 text-[var(--muted-fg)]" />
                                            {item.last_run_at
                                                ? new Date(item.last_run_at).toLocaleDateString()
                                                : 'Never'}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 border-t lg:border-t-0 pt-6 lg:pt-0">
                                    {hasInstance ? (
                                        // Instance exists — link to setup/dashboard
                                        <Link href={`/my-automations/${item.instanceId}/setup`}>
                                            {status === 'setup_required' ? (
                                                <Button className="w-full lg:w-auto h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/20 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400">
                                                    <Key className="w-4 h-4 mr-2" />
                                                    Complete Setup
                                                </Button>
                                            ) : (
                                                <Button className="w-full lg:w-auto h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20 bg-gradient-to-r from-primary-600 to-primary-500">
                                                    <Activity className="w-4 h-4 mr-2" />
                                                    View Dashboard
                                                </Button>
                                            )}
                                        </Link>
                                    ) : (
                                        // No instance yet — offer to create one
                                        <Button
                                            onClick={() => handleCreateInstance(item.purchaseId, item)}
                                            className="w-full lg:w-auto h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/20 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400"
                                        >
                                            <Key className="w-4 h-4 mr-2" />
                                            Initialize Instance
                                        </Button>
                                    )}
                                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl opacity-60 hover:opacity-100 transition-opacity">
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Empty State */}
            {automations.length === 0 && (
                <div className="mt-12 text-center p-20 border-2 border-dashed border-[var(--border)] rounded-[3rem] bg-primary-500/[0.01]">
                    <div className="w-20 h-20 rounded-[2rem] bg-primary-500/10 flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-10 h-10 text-primary-400" />
                    </div>
                    <h3 className="font-black text-2xl uppercase italic mb-2">Build your workforce</h3>
                    <p className="text-[var(--muted-fg)] max-w-sm mx-auto mb-8 font-medium">
                        You haven't deployed any automations yet. Browse the marketplace to find AI agents ready to work for you.
                    </p>
                    <Link href="/marketplace">
                        <Button className="rounded-2xl px-10 h-14 font-black uppercase tracking-widest italic shadow-xl shadow-primary-500/20">
                            Browse Marketplace
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
