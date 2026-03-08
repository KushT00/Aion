'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    Activity,
    Database,
    Users,
    FileText,
    CheckSquare,
    Search,
    Filter,
    Download,
    RefreshCw,
    ExternalLink,
    Box,
    Clock,
    Zap,
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// Helper to get styling for result types
const getTypeStyle = (type: string) => {
    switch (type) {
        case 'lead': return { icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' };
        case 'data': return { icon: Database, color: 'text-sky-400', bg: 'bg-sky-500/10' };
        case 'task': return { icon: CheckSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
        case 'proposal': return { icon: FileText, color: 'text-violet-400', bg: 'bg-violet-500/10' };
        default: return { icon: Box, color: 'text-neutral-400', bg: 'bg-neutral-500/10' };
    }
};

export default function CRMDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const instanceId = params.id as string;

    const [instance, setInstance] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ total: 0, byType: {}, byStatus: {} });

    // Filtering & Pagination
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeType, setActiveType] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const limit = 50;

    const fetchDashboardData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            // Fetch Instance Details
            const instRes = await fetch(`/api/ai/instance-details?instanceId=${instanceId}`);
            if (instRes.ok) {
                const data = await instRes.json();
                setInstance(data.instance);
            }

            // Fetch Results
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: ((page - 1) * limit).toString()
            });
            if (activeType) params.append('type', activeType);
            if (searchQuery) params.append('search', searchQuery);

            const resRes = await fetch(`/api/consumer/instances/${instanceId}/results?${params.toString()}`);
            if (resRes.ok) {
                const data = await resRes.json();
                setResults(data.results || []);
                setStats(data.aggregates || { total: 0, byType: {}, byStatus: {} });
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (instanceId) {
            fetchDashboardData();
        }
    }, [instanceId, page, activeType]);

    // Simple manual search trigger
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // Reset to first page
        fetchDashboardData();
    };

    // Export to CSV
    const exportCSV = () => {
        if (!results.length) return toast.error('No data to export');

        // Very basic CSV generation
        const headers = ['Type', 'Title', 'Status', 'Created', 'Data'];
        const csvRows = [headers.join(',')];

        for (const row of results) {
            const dataStr = JSON.stringify(row.data).replace(/"/g, '""'); // basic escape
            const values = [
                row.result_type,
                `"${row.title?.replace(/"/g, '""') || ''}"`,
                row.status,
                new Date(row.created_at).toISOString(),
                `"${dataStr}"`
            ];
            csvRows.push(values.join(','));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `crm_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <Activity className="w-10 h-10 text-primary-500 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Loading Command Center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans">
            {/* Header */}
            <header className="border-b border-[var(--border)] bg-[var(--card)] px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/my-automations">
                            <Button variant="ghost" size="icon" className="hover:bg-[var(--muted)]">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                                CRM <span className="text-primary-400">Dashboard</span>
                            </h1>
                            <p className="text-[10px] text-[var(--muted-fg)] font-bold uppercase tracking-widest flex items-center gap-1">
                                {instance?.listing?.title || 'Loading automation...'}
                                {instance?.status === 'active' && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-2 animate-pulse" />
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => fetchDashboardData(true)}
                            disabled={isRefreshing}
                            className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isRefreshing && "animate-spin")} />
                            Refresh
                        </Button>
                        <Button
                            onClick={exportCSV}
                            className="h-9 bg-primary-600 hover:bg-primary-500 text-white font-bold uppercase tracking-wider text-[10px]"
                        >
                            <Download className="w-3.5 h-3.5 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">

                {/* AUTOMATION PULSE (Stats) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="p-5 border-[var(--border)] bg-[var(--card)]">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-primary-400" />
                            </div>
                            <h3 className="text-xs font-bold text-[var(--muted-fg)] uppercase tracking-wider">Total Captured</h3>
                        </div>
                        <p className="text-3xl font-black">{stats.total || 0}</p>
                    </Card>

                    {/* Dynamic Stats Based on Type */}
                    {Object.entries(stats.byType || {}).slice(0, 3).map(([type, count]: [string, any]) => {
                        const style = getTypeStyle(type);
                        const Icon = style.icon;
                        return (
                            <Card key={type} className="p-5 border-[var(--border)] bg-[var(--card)]">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", style.bg)}>
                                        <Icon className={cn("w-4 h-4", style.color)} />
                                    </div>
                                    <h3 className="text-xs font-bold text-[var(--muted-fg)] uppercase tracking-wider">{type}s</h3>
                                </div>
                                <p className="text-3xl font-black">{count}</p>
                            </Card>
                        );
                    })}
                </div>

                {/* RESULTS TABLE AREA */}
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {/* Controls */}
                    <div className="flex flex-col md:flex-row items-center gap-4 bg-[var(--card)] p-2 rounded-2xl border border-[var(--border)] shadow-sm">
                        <form onSubmit={handleSearch} className="flex-1 relative w-full">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-fg)]" />
                            <Input
                                placeholder="Search results, names, or data..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-10 w-full"
                            />
                        </form>

                        <div className="w-px h-6 bg-[var(--border)] hidden md:block" />

                        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto px-2 pb-2 md:pb-0 scrollbar-hide">
                            <Button
                                variant={activeType === null ? "primary" : "ghost"}
                                onClick={() => setActiveType(null)}
                                className={cn("h-8 text-[10px] uppercase font-bold tracking-wider rounded-lg px-3 whitespace-nowrap", activeType === null ? "bg-primary-500/10 text-primary-400" : "")}
                            >
                                All Results
                            </Button>
                            {['lead', 'data', 'task', 'proposal'].map(type => (
                                <Button
                                    key={type}
                                    variant={activeType === type ? "primary" : "ghost"}
                                    onClick={() => setActiveType(type)}
                                    className={cn("h-8 text-[10px] uppercase font-bold tracking-wider rounded-lg px-3 whitespace-nowrap", activeType === type ? getTypeStyle(type).bg + " " + getTypeStyle(type).color : "")}
                                >
                                    {type}s
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <Card className="border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-[var(--muted)]/50 border-b border-[var(--border)]">
                                    <tr>
                                        <th className="px-6 py-4 font-black uppercase text-[10px] tracking-wider text-[var(--muted-fg)]">Result</th>
                                        <th className="px-6 py-4 font-black uppercase text-[10px] tracking-wider text-[var(--muted-fg)]">Type</th>
                                        <th className="px-6 py-4 font-black uppercase text-[10px] tracking-wider text-[var(--muted-fg)]">Status</th>
                                        <th className="px-6 py-4 font-black uppercase text-[10px] tracking-wider text-[var(--muted-fg)]">Data Preview</th>
                                        <th className="px-6 py-4 font-black uppercase text-[10px] tracking-wider text-[var(--muted-fg)] text-right">Captured At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {results.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-[var(--muted-fg)]">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Box className="w-10 h-10 opacity-20" />
                                                    <p className="text-sm font-medium">No results found.</p>
                                                    <p className="text-[10px] uppercase tracking-wider opacity-60">Run your automation to capture data.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        results.map((result) => {
                                            const style = getTypeStyle(result.result_type);
                                            const Icon = style.icon;

                                            // Simple data preview
                                            let preview = '';
                                            if (result.data) {
                                                const keys = Object.keys(result.data).slice(0, 2);
                                                preview = keys.map(k => `${k}: ${String(result.data[k]).substring(0, 20)}`).join(' • ');
                                            }

                                            return (
                                                <tr key={result.id} className="hover:bg-[var(--muted)]/30 transition-colors group cursor-pointer">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-[var(--fg)] truncate max-w-[200px]">
                                                            {result.title || 'Untitled Result'}
                                                        </div>
                                                        <div className="flex gap-1 mt-1">
                                                            {(result.tags || []).slice(0, 2).map((tag: string, i: number) => (
                                                                <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-sm bg-[var(--muted)] text-[var(--muted-fg)] font-bold uppercase">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", style.bg, style.color)}>
                                                            <Icon className="w-3 h-3" />
                                                            {result.result_type}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant="default" className={cn(
                                                            "text-[9px] uppercase font-bold tracking-wider rounded-md",
                                                            result.status === 'new' ? 'border-sky-500/30 text-sky-400 bg-sky-500/5' :
                                                                result.status === 'processed' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' :
                                                                    'border-[var(--border)] text-[var(--muted-fg)]'
                                                        )}>
                                                            {result.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-[11px] font-mono text-[var(--muted-fg)] max-w-[300px] truncate">
                                                        {preview || '{}'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-xs text-[var(--muted-fg)] whitespace-nowrap">
                                                        {new Date(result.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination footer */}
                        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--muted-fg)]">
                            <div>
                                Showing {results.length} of {stats.total || 0}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="h-7 text-[10px] uppercase tracking-wider"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={results.length < limit}
                                    onClick={() => setPage(p => p + 1)}
                                    className="h-7 text-[10px] uppercase tracking-wider"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

            </main>
        </div>
    );
}
