'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Globe,
    GlobeLock,
    GitBranch,
    Clock,
} from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import type { WorkflowStatus } from '@/types';

interface WorkflowItem {
    id: string;
    name: string;
    description: string | null;
    status: WorkflowStatus;
    tags: string[];
    updated_at: string;
    runs_count: number;
}

const demoWorkflows: WorkflowItem[] = [
    {
        id: '1',
        name: 'Email Automation Flow',
        description: 'Automate your email responses with AI-powered classification and drafting.',
        status: 'published',
        tags: ['email', 'ai', 'automation'],
        updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        runs_count: 142,
    },
    {
        id: '2',
        name: 'Data Scraping Pipeline',
        description: 'Extract and transform web data into structured datasets automatically.',
        status: 'draft',
        tags: ['scraping', 'data', 'etl'],
        updated_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        runs_count: 56,
    },
    {
        id: '3',
        name: 'Social Media Bot',
        description: 'Scheduled posting across multiple platforms with AI-generated content.',
        status: 'published',
        tags: ['social', 'ai', 'scheduling'],
        updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        runs_count: 298,
    },
    {
        id: '4',
        name: 'Report Generator',
        description: 'Generate weekly reports from multiple data sources with charts and insights.',
        status: 'archived',
        tags: ['reporting', 'analytics'],
        updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        runs_count: 85,
    },
];

const statusConfig = {
    draft: { label: 'Draft', variant: 'default' as const, icon: GlobeLock },
    published: { label: 'Published', variant: 'success' as const, icon: Globe },
    archived: { label: 'Archived', variant: 'warning' as const, icon: GlobeLock },
};

export default function WorkflowsPage() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | WorkflowStatus>('all');

    const filtered = demoWorkflows.filter((w) => {
        const matchesSearch =
            w.name.toLowerCase().includes(search.toLowerCase()) ||
            w.description?.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || w.status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--fg)]">My Workflows</h1>
                    <p className="text-[var(--muted-fg)] mt-1">
                        Create, manage, and publish your digital workers.
                    </p>
                </div>
                <Link href="/builder">
                    <Button>
                        <Plus className="w-4 h-4" />
                        New Workflow
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 max-w-sm">
                    <Input
                        placeholder="Search workflows..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search className="w-4 h-4" />}
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'draft', 'published', 'archived'] as const).map((f) => (
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

            {/* Workflows Grid */}
            {filtered.length === 0 ? (
                <EmptyState
                    icon={GitBranch}
                    title="No workflows found"
                    description={
                        search
                            ? `No workflows matching "${search}"`
                            : 'Create your first AI workflow to get started'
                    }
                    actionLabel="Create Workflow"
                    onAction={() => { }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {filtered.map((workflow) => {
                        const config = statusConfig[workflow.status];
                        return (
                            <Card
                                key={workflow.id}
                                className="group hover:shadow-lg hover:-translate-y-1 hover:border-primary-500/30 cursor-pointer"
                            >
                                <CardContent className="p-6">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-[var(--fg)] truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                {workflow.name}
                                            </h3>
                                        </div>
                                        <button className="p-1.5 rounded-lg text-[var(--muted-fg)] hover:bg-[var(--muted)] transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-[var(--muted-fg)] line-clamp-2 mb-4">
                                        {workflow.description}
                                    </p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {workflow.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 text-xs rounded-md bg-[var(--muted)] text-[var(--muted-fg)]"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                                        <Badge variant={config.variant} dot>
                                            {config.label}
                                        </Badge>
                                        <div className="flex items-center gap-3 text-xs text-[var(--muted-fg)]">
                                            <span className="flex items-center gap-1">
                                                <GitBranch className="w-3 h-3" />
                                                {workflow.runs_count}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatRelativeTime(workflow.updated_at)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
