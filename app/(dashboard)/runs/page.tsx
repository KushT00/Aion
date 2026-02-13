'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
    Search,
    Play,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Eye,
    ChevronDown,
    ChevronUp,
    Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime, formatDuration } from '@/lib/utils';
import type { RunStatus } from '@/types';

interface RunItem {
    id: string;
    workflowName: string;
    status: RunStatus;
    started_at: string;
    duration_ms: number | null;
    logs: string;
}

const demoRuns: RunItem[] = [
    {
        id: 'run-001',
        workflowName: 'Email Automation Flow',
        status: 'success',
        started_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        duration_ms: 4523,
        logs: '[2026-02-13 12:00:01] Starting workflow...\n[2026-02-13 12:00:02] Fetching emails from inbox...\n[2026-02-13 12:00:03] Processing 12 emails with AI classifier...\n[2026-02-13 12:00:04] Classified: 8 urgent, 3 normal, 1 spam\n[2026-02-13 12:00:05] Drafting responses for urgent emails...\n[2026-02-13 12:00:05] ✅ Workflow completed successfully',
    },
    {
        id: 'run-002',
        workflowName: 'Data Scraping Pipeline',
        status: 'running',
        started_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        duration_ms: null,
        logs: '[2026-02-13 11:48:01] Starting workflow...\n[2026-02-13 11:48:02] Connecting to target websites...\n[2026-02-13 11:48:05] Scraping page 1/50...\n[2026-02-13 11:55:00] Scraping page 35/50...\n⏳ In progress...',
    },
    {
        id: 'run-003',
        workflowName: 'Report Generator',
        status: 'failed',
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        duration_ms: 12340,
        logs: '[2026-02-13 09:00:01] Starting workflow...\n[2026-02-13 09:00:05] Fetching data from analytics API...\n[2026-02-13 09:00:08] Processing 15,000 records...\n[2026-02-13 09:00:12] ERROR: Rate limit exceeded on external API\n[2026-02-13 09:00:12] ❌ Workflow failed: API_RATE_LIMIT_ERROR',
    },
    {
        id: 'run-004',
        workflowName: 'Customer Support Agent',
        status: 'success',
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        duration_ms: 2156,
        logs: '[2026-02-13 07:00:01] Starting workflow...\n[2026-02-13 07:00:02] Processing 5 support tickets...\n[2026-02-13 07:00:03] ✅ Workflow completed successfully',
    },
    {
        id: 'run-005',
        workflowName: 'Social Media Bot',
        status: 'queued',
        started_at: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
        duration_ms: null,
        logs: '[2026-02-13 12:00:00] Queued for execution...',
    },
];

const statusConfig: Record<
    RunStatus,
    { icon: typeof CheckCircle; variant: 'success' | 'error' | 'info' | 'warning' | 'default'; label: string }
> = {
    success: { icon: CheckCircle, variant: 'success', label: 'Success' },
    running: { icon: Loader2, variant: 'info', label: 'Running' },
    failed: { icon: XCircle, variant: 'error', label: 'Failed' },
    queued: { icon: Clock, variant: 'warning', label: 'Queued' },
    cancelled: { icon: XCircle, variant: 'default', label: 'Cancelled' },
};

export default function RunsPage() {
    const [search, setSearch] = useState('');
    const [expandedRun, setExpandedRun] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | RunStatus>('all');

    const filtered = demoRuns.filter((r) => {
        const matchesSearch = r.workflowName.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || r.status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--fg)]">Runs</h1>
                <p className="text-[var(--muted-fg)] mt-1">
                    Monitor execution history and view logs for your workflow runs.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 max-w-sm">
                    <Input
                        placeholder="Search by workflow name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search className="w-4 h-4" />}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {(['all', 'queued', 'running', 'success', 'failed'] as const).map((f) => (
                        <Button
                            key={f}
                            variant={filter === f ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Runs Table */}
            {filtered.length === 0 ? (
                <EmptyState
                    icon={Activity}
                    title="No runs found"
                    description={
                        search ? `No runs matching "${search}"` : 'Run a workflow to see execution history here'
                    }
                />
            ) : (
                <Card className="overflow-hidden p-0">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[var(--muted)] text-xs font-semibold text-[var(--muted-fg)] uppercase tracking-wider border-b border-[var(--border)]">
                        <div className="col-span-4">Workflow</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Started</div>
                        <div className="col-span-2">Duration</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-[var(--border)]">
                        {filtered.map((run) => {
                            const config = statusConfig[run.status];
                            const isExpanded = expandedRun === run.id;
                            return (
                                <div key={run.id}>
                                    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[var(--muted)] transition-colors">
                                        <div className="col-span-4">
                                            <p className="text-sm font-medium text-[var(--fg)]">{run.workflowName}</p>
                                            <p className="text-xs text-[var(--muted-fg)] font-mono mt-0.5">{run.id}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <Badge variant={config.variant} dot pulse={run.status === 'running'}>
                                                {config.label}
                                            </Badge>
                                        </div>
                                        <div className="col-span-2 text-sm text-[var(--muted-fg)]">
                                            {formatRelativeTime(run.started_at)}
                                        </div>
                                        <div className="col-span-2 text-sm text-[var(--muted-fg)]">
                                            {run.duration_ms ? formatDuration(run.duration_ms) : '—'}
                                        </div>
                                        <div className="col-span-2 flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                                Logs
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Expandable Logs */}
                                    {isExpanded && (
                                        <div className="px-6 pb-4 animate-slide-in">
                                            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4">
                                                <pre className="text-xs font-mono text-[var(--muted-fg)] whitespace-pre-wrap leading-relaxed">
                                                    {run.logs}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
