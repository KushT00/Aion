'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Workflow } from '@/types';
import toast from 'react-hot-toast';

export function useWorkflows() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const fetchWorkflows = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            toast.error('Failed to fetch workflows');
        } else {
            setWorkflows((data as Workflow[]) || []);
        }
        setLoading(false);
    }, []);

    const createWorkflow = useCallback(
        async (name: string, description?: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('workflows')
                .insert({ user_id: user.id, name, description })
                .select()
                .single();

            if (error) {
                toast.error('Failed to create workflow');
                return null;
            }
            toast.success('Workflow created!');
            setWorkflows((prev) => [data as Workflow, ...prev]);
            return data as Workflow;
        },
        [],
    );

    const deleteWorkflow = useCallback(async (id: string) => {
        const { error } = await supabase.from('workflows').delete().eq('id', id);
        if (error) {
            toast.error('Failed to delete workflow');
        } else {
            setWorkflows((prev) => prev.filter((w) => w.id !== id));
            toast.success('Workflow deleted');
        }
    }, []);

    const updateWorkflow = useCallback(
        async (id: string, updates: Partial<Workflow>) => {
            const { data, error } = await supabase
                .from('workflows')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                toast.error('Failed to update workflow');
                return null;
            }
            setWorkflows((prev) =>
                prev.map((w) => (w.id === id ? (data as Workflow) : w)),
            );
            toast.success('Workflow updated');
            return data as Workflow;
        },
        [],
    );

    return { workflows, loading, fetchWorkflows, createWorkflow, deleteWorkflow, updateWorkflow };
}
