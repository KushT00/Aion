'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
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


const statusConfig: Record<WorkflowStatus, { label: string; variant: "default" | "success" | "warning"; icon: any }> = {
    draft: { label: 'Draft', variant: 'default', icon: GlobeLock },
    published: { label: 'Published', variant: 'success', icon: Globe },
    archived: { label: 'Archived', variant: 'warning', icon: GlobeLock },
};

export default function WorkflowsPage() {
    const supabase = createClient();
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | WorkflowStatus>('all');

    const fetchWorkflows = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('workflows')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setWorkflows(data || []);
        } catch (err: any) {
            toast.error('Failed to load workflows');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const router = useRouter(); // Use useRouter

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('Are you sure you want to delete this workflow?')) return;

        try {
            const { error } = await supabase.from('workflows').delete().eq('id', id);
            if (error) throw error;
            toast.success('Workflow deleted');
            setWorkflows(prev => prev.filter(w => w.id !== id));
        } catch (err: any) {
            toast.error('Delete failed');
        }
    };

    const filtered = workflows.filter((w) => {
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
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-xl bg-[var(--muted)] animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={GitBranch}
                    title="No workflows found"
                    description={
                        search
                            ? `No workflows matching "${search}"`
                            : 'Create your first AI workflow to get started'
                    }
                    actionLabel="Create Workflow"
                    onAction={() => { router.push('/builder') }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {filtered.map((workflow) => {
                        const status = (workflow.status || 'draft') as WorkflowStatus;
                        const config = statusConfig[status];
                        return (
                            <Link key={workflow.id} href={`/builder?id=${workflow.id}`}>
                                <Card
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
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={(e) => handleDelete(e, workflow.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-[var(--muted-fg)] line-clamp-2 mb-4">
                                            {workflow.description}
                                        </p>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {(workflow.tags as string[] || []).map((tag: string) => (
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
                                                    {workflow.runs_count || 0}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatRelativeTime(workflow.updated_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
