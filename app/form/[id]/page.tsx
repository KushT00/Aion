'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicFormPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params.id as string;
    const isEmbed = searchParams.get('embed') === 'true';

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<any>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});

    const supabase = createClient();

    useEffect(() => {
        const fetchFormConfig = async () => {
            try {
                // We fetch the instance and its workflow nodes to find the form trigger config
                const { data: instance, error: instError } = await supabase
                    .from('consumer_instances')
                    .select(`
                        id,
                        status,
                        workflow:workflows (
                            nodes:workflow_nodes (*)
                        )
                    `)
                    .eq('id', id)
                    .single();

                if (instError || !instance) {
                    setError('Form not found');
                    return;
                }

                if (instance.status === 'paused') {
                    setError('This form is currently inactive');
                    return;
                }

                const workflow = (instance as any).workflow;
                const nodes = workflow?.nodes || [];
                const formNode = nodes.find((n: any) => n.data?.config?.integrationId === 'form_trigger');

                if (!formNode) {
                    setError('This automation is not configured with a form');
                    return;
                }

                const nodeData = formNode.data?.config?.data || {};
                let fields = [];
                try {
                    fields = typeof nodeData.fields === 'string' ? JSON.parse(nodeData.fields) : (nodeData.fields || []);
                } catch (e) {
                    console.error('Failed to parse form fields', e);
                }

                setConfig({
                    title: nodeData.formTitle || 'Aion Intake Form',
                    description: nodeData.formDescription || 'Please fill out the form below.',
                    fields: fields
                });

                // Initialize form data
                const initial: any = {};
                fields.forEach((f: any) => initial[f.name || f.label] = '');
                setFormData(initial);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchFormConfig();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Trigger the workflow
            const response = await fetch(`/api/form/submit/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const resJson = await response.json();
                throw new Error(resJson.error || 'Submission failed');
            }

            setSubmitted(true);
            toast.success('Submitted successfully!');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
                <Card className="w-full max-w-md border-red-500/20 bg-red-500/5 shadow-none">
                    <CardContent className="pt-6 text-center space-y-4">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                        <h2 className="text-xl font-bold">{error}</h2>
                        <p className="text-[var(--muted-fg)] text-sm">Please contact the automation owner if you believe this is a mistake.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className={cn("min-h-screen flex items-center justify-center bg-[var(--bg)] p-4", isEmbed && "min-h-0 py-12")}>
                <Card className="w-full max-w-md border-emerald-500/20 bg-emerald-500/5 shadow-2xl">
                    <CardContent className="pt-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-[var(--fg)]">Thank You!</h2>
                            <p className="text-[var(--muted-fg)] text-sm">{config.title} has been submitted successfully.</p>
                        </div>
                        {!isEmbed && (
                            <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-4">
                                Fill another response
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 py-12", isEmbed && "min-h-0 p-0")}>
            <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Brand Header (Only if not embed) */}
                {!isEmbed && (
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-2 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                            <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Powered by AION</span>
                        </div>
                    </div>
                )}

                <Card className="border-[var(--border)] shadow-2xl bg-[var(--card)]/50 backdrop-blur-xl overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-violet-600 to-indigo-600" />
                    <CardHeader className="space-y-4 pb-8 border-b border-[var(--border)]/50 bg-[var(--muted)]/20">
                        <div className="space-y-1.5">
                            <CardTitle className="text-3xl font-extrabold tracking-tight text-[var(--fg)]">
                                {config.title}
                            </CardTitle>
                            <CardDescription className="text-base text-[var(--muted-fg)]">
                                {config.description}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 pb-10 px-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid gap-6">
                                {config.fields.map((field: any, idx: number) => (
                                    <div key={idx} className="space-y-2.5">
                                        <label className="text-sm font-semibold text-[var(--fg)] ml-1 block">
                                            {field.name || field.label}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </label>

                                        {field.type === 'textarea' ? (
                                            <textarea
                                                required={field.required}
                                                placeholder={field.placeholder || `Enter your ${field.name.toLowerCase()}...`}
                                                className="min-h-[120px] w-full bg-[var(--bg)]/50 border-[var(--border)] rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all text-base px-4 py-3"
                                                value={formData[field.name || field.label] || ''}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, [field.name || field.label]: e.target.value })}
                                            />
                                        ) : (
                                            <Input
                                                type={field.type || 'text'}
                                                required={field.required}
                                                placeholder={field.placeholder || `Enter your ${field.name.toLowerCase()}...`}
                                                className="h-12 bg-[var(--bg)]/50 border-[var(--border)] focus:ring-2 focus:ring-violet-500 transition-all text-base px-4 rounded-xl shadow-sm"
                                                value={formData[field.name || field.label] || ''}
                                                onChange={(e) => setFormData({ ...formData, [field.name || field.label]: e.target.value })}
                                            />
                                        )}
                                        {field.helpText && (
                                            <p className="text-xs text-[var(--muted-fg)] ml-1 opacity-70">{field.helpText}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98] rounded-xl"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Response'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Subtle footer */}
                {!isEmbed && (
                    <p className="text-center text-[10px] text-[var(--muted-fg)] font-medium opacity-40 hover:opacity-100 transition-opacity">
                        © {new Date().getFullYear()} AION Intelligence Workflow Platforms
                    </p>
                )}
            </div>
        </div>
    );
}

// Utility for conditional class merging (if not already globally available)
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
