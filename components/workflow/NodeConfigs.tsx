'use client';
import { cn } from '@/lib/utils';
import { GoogleConnectButton } from './GoogleConnectButton';
import {
    Plus, Trash2, BookOpen, Wrench, Globe, Link2,
    ChevronDown, ChevronRight, BrainCircuit, CheckCircle2,
    FileSpreadsheet, Zap, RotateCw, FileText, Code2
} from 'lucide-react';
import { useState } from 'react';

// ─── Shared types ──────────────────────────────────────────
export interface Condition { id: string; leftValue?: string; operator?: string; rightValue?: string }
export interface SwitchRule { id: string; leftValue?: string; operator?: string; rightValue?: string }

// ─── Shared helpers ─────────────────────────────────────────
export const Label = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <label className={cn("text-[10px] font-bold text-(--muted-fg) uppercase tracking-wider block mb-1 ml-0.5", className)}>{children}</label>
);
export const Input = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input className={cn("w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-violet-500 transition-shadow", className)} {...props} />
);
export const Textarea = ({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea className={cn("w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-violet-500 resize-none transition-shadow", className)} {...props} />
);
export const Select = ({ children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select className={cn("w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-violet-500", className)} {...props}>{children}</select>
);

// ─── Section Accordion ─────────────────────────────────────
export function Section({ title, icon: Icon, color = 'text-(--muted-fg)', children, defaultOpen = true }: { title: string, icon?: React.ComponentType<{ className?: string }>, color?: string, children: React.ReactNode, defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-2 bg-[var(--muted)]/50 hover:bg-[var(--muted)] transition-colors text-left">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={cn('w-3 h-3', color)} />}
                    <span className="text-[11px] font-bold text-[var(--fg)]">{title}</span>
                </div>
                {open ? <ChevronDown className="w-3 h-3 text-(--muted-fg)" /> : <ChevronRight className="w-3 h-3 text-(--muted-fg)" />}
            </button>
            {open && <div className="p-3 space-y-2.5 border-t border-[var(--border)] bg-transparent">{children}</div>}
        </div>
    );
}

// ─── Shared Model Selector ──────────────────────────────────
export function ModelSelector({ value, onChange, integrationId }: { value: string, onChange: (val: string) => void, integrationId: string }) {
    const models = integrationId === 'google_gemini' || integrationId === 'gemini'
        ? [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Fast & Capable' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Exp)', desc: 'Experimental' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Efficient' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Powerful' }
        ]
        : integrationId === 'openai'
            ? [
                { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', desc: 'High-performance Open-source' }
            ]
            : integrationId === 'groq'
                ? [
                    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: 'State-of-the-art' },
                    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', desc: 'Ultra-fast' },
                    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', desc: 'Reasoning model' },
                    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', desc: 'High-performance Open-source' }
                ]
                : [];

    return (
        <div className="space-y-2">
            <Label>ModelSelection</Label>
            <div className="grid grid-cols-1 gap-2">
                {models.map(m => (
                    <button
                        key={m.id}
                        onClick={() => onChange(m.id)}
                        className={cn(
                            "w-full text-left p-2 rounded-lg border transition-all text-[11px]",
                            value === m.id
                                ? "bg-violet-500/10 border-violet-500 text-violet-600 dark:text-violet-400"
                                : "bg-[var(--card)] border-[var(--border)] hover:border-violet-500/50"
                        )}
                    >
                        <div className="font-semibold">{m.name}</div>
                        <div className="text-[10px] opacity-60 leading-tight">{m.desc}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── AI Agent Configuration ─────────────────────────────────
export function AIAgentConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as {
        tools?: string[];
        apiKey?: string;
        model?: string;
        systemPrompt?: string;
        userPrompt?: string;
        knowledgeBase?: string;
        knowledgeText?: string;
    };
    const tools: string[] = data.tools || [];

    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    const toggleTool = (tool: string) => {
        const next = tools.includes(tool) ? tools.filter(t => t !== tool) : [...tools, tool];
        updateData({ tools: next });
    };

    const availableTools = [
        { id: 'web_search', label: 'Web Search', desc: 'Search the web for info' },
        { id: 'calculator', label: 'Calculator', desc: 'Perform math operations' },
        { id: 'code_exec', label: 'Code Executor', desc: 'Run Python/JS snippets' },
        { id: 'image_gen', label: 'Image Generator', desc: 'Generate images with AI' },
        { id: 'read_url', label: 'Read URL', desc: 'Fetch and read a webpage' },
    ];

    const INTEGRATION_OPTIONS = [
        { id: 'google_gemini', label: 'Google Gemini' },
        { id: 'openai', label: 'OpenAI GPT' },
        { id: 'groq', label: 'Groq (Llama)' },
        { id: 'openrouter', label: 'OpenRouter (300+ models)' },
    ];

    return (
        <div className="space-y-3">
            <Section title="Model" icon={BrainCircuit} color="text-purple-400">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label>Provider</Label>
                        <Select value={config.integrationId || 'google_gemini'}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateNode({ config: { ...config, integrationId: e.target.value, actionId: 'chat' } })}>
                            {INTEGRATION_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label>API Key</Label>
                        <Input type="password" placeholder="Key..." value={data.apiKey || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData({ apiKey: e.target.value })} />
                    </div>
                </div>

                {config.integrationId !== 'openrouter' && (
                    <ModelSelector
                        integrationId={config.integrationId || 'google_gemini'}
                        value={data.model || (
                            config.integrationId === 'groq' ? 'llama-3.3-70b-versatile' :
                                config.integrationId === 'openai' ? 'openai/gpt-oss-120b' :
                                    'gemini-2.0-flash'
                        )}
                        onChange={(model) => updateData({ model })}
                    />
                )}

                <div className="space-y-1 pt-2">
                    <Label>Instructions (System)</Label>
                    <Textarea className="h-14 py-1" placeholder="Who are you?" value={data.systemPrompt || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateData({ systemPrompt: e.target.value })} />
                </div>
                <div className="space-y-1">
                    <Label>Prompt (User)</Label>
                    <Textarea className="h-16 py-1" placeholder="Task details..." value={data.userPrompt || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateData({ userPrompt: e.target.value })} />
                </div>
            </Section>

            <Section title="Tools" icon={Wrench} color="text-amber-400" defaultOpen={false}>
                <p className="text-[10px] text-(--muted-fg)">Give the agent capabilities beyond text generation.</p>
                <div className="space-y-2">
                    {availableTools.map(tool => (
                        <label key={tool.id} className={cn(
                            "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                            tools.includes(tool.id)
                                ? "border-amber-500/40 bg-amber-500/5"
                                : "border-[var(--border)] hover:border-[var(--muted-fg)]/30"
                        )}>
                            <input type="checkbox" checked={tools.includes(tool.id)} onChange={() => toggleTool(tool.id)} className="accent-amber-500 w-3.5 h-3.5" />
                            <div>
                                <p className="text-xs font-semibold text-[var(--fg)]">{tool.label}</p>
                                <p className="text-[10px] text-(--muted-fg)">{tool.desc}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </Section>

            <Section title="RAG / Knowledge" icon={BookOpen} color="text-blue-400" defaultOpen={false}>
                <div className="space-y-1.5">
                    <Label>URL / Docs</Label>
                    <Input placeholder="URL or text..." value={data.knowledgeBase || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData({ knowledgeBase: e.target.value })} />
                    <Label>Context</Label>
                    <Textarea className="h-16 py-1" placeholder="Inject text..." value={data.knowledgeText || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateData({ knowledgeText: e.target.value })} />
                </div>
            </Section>
        </div>
    );
}

// ─── Switch Configuration ───────────────────────────────────
export function SwitchConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const rules = (config.rules as SwitchRule[]) || [];
    const updateRules = (newRules: SwitchRule[]) => updateNode({ config: { ...config, rules: newRules as unknown as Record<string, unknown>[], actionId: 'evaluate', integrationId: 'switch' } });

    const operators = [
        { value: 'equals', label: '= equals' },
        { value: 'not_equals', label: '≠ not equals' },
        { value: 'greater_than', label: '> greater than' },
        { value: 'less_than', label: '< less than' },
        { value: 'contains', label: '⊃ contains' },
        { value: 'not_contains', label: '⊅ not contains' },
        { value: 'starts_with', label: '↦ starts with' },
        { value: 'is_empty', label: '∅ is empty' },
        { value: 'is_not_empty', label: '◉ is not empty' },
    ];

    const addRule = () => {
        const newRule: SwitchRule = {
            id: `rule_${crypto.randomUUID()}`,
            leftValue: '',
            operator: 'equals',
            rightValue: '',
        };
        updateRules([...rules, newRule]);
    };

    const removeRule = (id: string) => {
        updateRules(rules.filter((r) => r.id !== id));
    };

    const updateRule = (id: string, kv: Partial<SwitchRule>) => {
        updateRules(rules.map((r) => r.id === id ? { ...r, ...kv } : r));
    };

    return (
        <div className="space-y-4">
            <div className="p-2 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                <p className="text-[10px] text-(--muted-fg) leading-tight">
                    Workflow will follow the first matching case. Add cases below.
                </p>
            </div>

            <div className="space-y-3">
                {rules.map((rule, idx) => (
                    <div key={rule.id} className="p-3 border border-[var(--border)] rounded-lg bg-[var(--muted)]/30 space-y-2 relative group/rule">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-orange-400 uppercase">Case {idx + 1}</span>
                            <button onClick={() => removeRule(rule.id)} className="text-(--muted-fg) hover:text-rose-500 transition-colors">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Left Value</Label>
                            <Input
                                placeholder="{{node.field}} or value"
                                value={rule.leftValue || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRule(rule.id, { leftValue: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label>Operator</Label>
                                <Select
                                    value={rule.operator || 'equals'}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateRule(rule.id, { operator: e.target.value })}
                                >
                                    {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                                </Select>
                            </div>
                            {!['is_empty', 'is_not_empty'].includes(rule.operator || '') && (
                                <div className="space-y-1.5">
                                    <Label>Right Value</Label>
                                    <Input
                                        placeholder="Compare to..."
                                        value={rule.rightValue || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRule(rule.id, { rightValue: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addRule}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-[var(--border)] rounded-lg text-[10px] font-bold text-(--muted-fg) hover:border-orange-500/40 hover:text-orange-400 transition-all uppercase"
            >
                <Plus className="w-3 h-3" />
                Add Case
            </button>

            <div className="p-2.5 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
                <p className="text-[9px] text-(--muted-fg) flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                    If no cases match, execution follows <b>Default</b>.
                </p>
            </div>
        </div>
    );
}

// ─── IF / ELSE Configuration ────────────────────────────────
export function IfElseConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { leftValue?: string; operator?: string; rightValue?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    const operators = [
        { value: 'equals', label: '= equals' },
        { value: 'not_equals', label: '≠ not equals' },
        { value: 'greater_than', label: '> greater than' },
        { value: 'less_than', label: '< less than' },
        { value: 'contains', label: '⊃ contains' },
        { value: 'not_contains', label: '⊅ not contains' },
        { value: 'starts_with', label: '↦ starts with' },
        { value: 'is_empty', label: '∅ is empty' },
        { value: 'is_not_empty', label: '◉ is not empty' },
    ];

    return (
        <div className="space-y-3">
            <div className="p-2 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                <p className="text-[10px] text-(--muted-fg) leading-tight">
                    Check <span className="text-emerald-400 font-bold">True</span> or <span className="text-rose-400 font-bold">False</span> handles.
                </p>
            </div>
            <div className="space-y-2">
                <Label>Left Value</Label>
                <Input placeholder="{{node_label.field}} or literal value" value={data.leftValue || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData({ leftValue: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>Operator</Label>
                <Select value={data.operator || 'equals'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateData({ operator: e.target.value })}>
                    {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </Select>
            </div>
            {!['is_empty', 'is_not_empty'].includes(data.operator || '') && (
                <div className="space-y-2">
                    <Label>Right Value</Label>
                    <Input placeholder="Value to compare against" value={data.rightValue || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData({ rightValue: e.target.value })} />
                </div>
            )}
        </div>
    );
}

// ─── Filter Configuration ───────────────────────────────────
export function FilterConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { leftValue?: string; operator?: string; rightValue?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv }, integrationId: 'filter', actionId: 'evaluate' } });

    const operators = [
        { value: 'equals', label: '= equals' },
        { value: 'not_equals', label: '≠ not equals' },
        { value: 'greater_than', label: '> greater than' },
        { value: 'less_than', label: '< less than' },
        { value: 'contains', label: '⊃ contains' },
        { value: 'not_contains', label: '⊅ not contains' },
        { value: 'starts_with', label: '↦ starts with' },
        { value: 'is_empty', label: '∅ is empty' },
        { value: 'is_not_empty', label: '◉ is not empty' },
    ];

    return (
        <div className="space-y-3">
            <div className="p-2 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <p className="text-[10px] text-(--muted-fg) leading-tight">
                    Workflow will <span className="text-violet-400 font-bold uppercase">Stop</span> if the condition below is not met.
                </p>
            </div>
            <div className="space-y-2">
                <Label>Left Value</Label>
                <Input placeholder="{{node_label.field}} or literal value" value={data.leftValue || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData({ leftValue: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>Operator</Label>
                <Select value={data.operator || 'equals'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateData({ operator: e.target.value })}>
                    {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </Select>
            </div>
            {!['is_empty', 'is_not_empty'].includes(data.operator || '') && (
                <div className="space-y-2">
                    <Label>Right Value</Label>
                    <Input placeholder="Value to compare against" value={data.rightValue || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData({ rightValue: e.target.value })} />
                </div>
            )}
        </div>
    );
}

// ─── Parallel Configuration ─────────────────────────────────
export function ParallelConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const branches = (config.branches as { id: string; label: string }[]) || [{ id: 'branch_1', label: 'Branch 1' }];

    const updateBranches = (newBranches: Record<string, unknown>[]) => {
        updateNode({
            config: {
                ...config,
                branches: newBranches,
                integrationId: 'parallel',
                actionId: 'distribute'
            }
        });
    };

    const addBranch = () => {
        const id = `branch_${crypto.randomUUID()}`;
        updateBranches([...branches, { id, label: `Branch ${branches.length + 1}` }]);
    };

    const removeBranch = (id: string) => {
        if (branches.length <= 1) return;
        updateBranches(branches.filter((b: { id: string }) => b.id !== id));
    };

    const updateBranchLabel = (id: string, label: string) => {
        updateBranches(branches.map((b: { id: string }) => b.id === id ? { ...b, label } : b));
    };

    return (
        <div className="space-y-4">
            <div className="p-2 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <p className="text-[10px] text-(--muted-fg) leading-tight">
                    This node sends the exact same input data to <span className="text-violet-400 font-bold uppercase">All</span> connected branches.
                </p>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <Label>Output Branches</Label>
                    <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">{branches.length}</span>
                </div>

                <div className="space-y-2">
                    {branches.map((branch: { id: string; label: string }, idx: number) => (
                        <div key={branch.id} className="flex items-center gap-2 group">
                            <div className="flex-1 relative">
                                <Input
                                    value={branch.label}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBranchLabel(branch.id, e.target.value)}
                                    className="pr-8 h-8 text-[11px]"
                                    placeholder={`Branch ${idx + 1} Name`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono opacity-20 group-hover:opacity-40 transition-opacity">
                                    #{idx + 1}
                                </span>
                            </div>
                            <button
                                onClick={() => removeBranch(branch.id)}
                                disabled={branches.length <= 1}
                                className="text-(--muted-fg) hover:text-rose-500 transition-colors disabled:opacity-30"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={addBranch}
                    className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-[var(--border)] rounded-lg text-[10px] font-bold text-(--muted-fg) hover:border-violet-500/40 hover:text-violet-400 transition-all uppercase mt-2"
                >
                    <Plus className="w-3 h-3" />
                    Add Branch
                </button>
            </div>
        </div>
    );
}

// ─── Condition Group Configuration ──────────────────────────
export function ConditionGroupConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { conditions?: Condition[]; logicalOperator?: string };
    // Use a stable initial condition if none exists
    const conditions = data.conditions || [{ id: 'cond_initial', leftValue: '', operator: 'equals', rightValue: '' }];
    const logicalOperator = data.logicalOperator || 'and';

    const updateData = (kv: Record<string, unknown>) => {
        updateNode({
            config: {
                ...config,
                data: { ...data, ...kv },
                integrationId: 'condition_group',
                actionId: 'evaluate'
            }
        });
    };

    const operators = [
        { value: 'equals', label: '= equals' },
        { value: 'not_equals', label: '≠ not equals' },
        { value: 'greater_than', label: '> greater than' },
        { value: 'less_than', label: '< less than' },
        { value: 'contains', label: '⊃ contains' },
        { value: 'not_contains', label: '⊅ not contains' },
        { value: 'starts_with', label: '↦ starts with' },
        { value: 'is_empty', label: '∅ is empty' },
        { value: 'is_not_empty', label: '◉ is not empty' },
    ];

    const addCondition = () => {
        const newCondition = {
            id: `cond_${crypto.randomUUID()}`,
            leftValue: '',
            operator: 'equals',
            rightValue: '',
        };
        updateData({ conditions: [...conditions, newCondition] });
    };

    const removeCondition = (id: string) => {
        if (conditions.length <= 1) return;
        updateData({ conditions: conditions.filter((c: any) => c.id !== id) });
    };

    const updateCondition = (id: string, kv: Record<string, unknown>) => {
        updateData({
            conditions: conditions.map((c: { id: string }) => c.id === id ? { ...c, ...kv } : c)
        });
    };

    return (
        <div className="space-y-4">
            <div className="p-2 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <p className="text-[10px] text-(--muted-fg) leading-tight">
                    Evaluate multiple conditions. Branch to <span className="text-emerald-400 font-bold">TRUE</span> if the logic below passes.
                </p>
            </div>

            <div className="space-y-2">
                <Label>Logical Operator</Label>
                <div className="flex gap-2">
                    {['and', 'or'].map(op => (
                        <button
                            key={op}
                            onClick={() => updateData({ logicalOperator: op })}
                            className={cn(
                                "flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all border",
                                logicalOperator === op
                                    ? "bg-violet-500 border-violet-600 text-white shadow-sm"
                                    : "bg-[var(--muted)] border-[var(--border)] text-(--muted-fg) hover:border-violet-500/50"
                            )}
                        >
                            {op}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <Label>Conditions</Label>
                {conditions.map((cond: { id: string; leftValue?: string; operator?: string; rightValue?: string }, idx: number) => (
                    <div key={cond.id} className="p-3 border border-[var(--border)] rounded-lg bg-[var(--muted)]/30 space-y-2 relative group/cond">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-violet-400 uppercase">Condition {idx + 1}</span>
                            <button onClick={() => removeCondition(cond.id)} className="text-(--muted-fg) hover:text-rose-500 transition-colors">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <Input
                                placeholder="Left side (e.g. {{node.field}})"
                                value={cond.leftValue || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCondition(cond.id, { leftValue: e.target.value })}
                                className="h-8"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Select
                                value={cond.operator || 'equals'}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCondition(cond.id, { operator: e.target.value })}
                                className="h-8"
                            >
                                {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                            </Select>
                            {cond.operator && !['is_empty', 'is_not_empty'].includes(cond.operator) && (
                                <Input
                                    placeholder="Right side"
                                    value={cond.rightValue || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCondition(cond.id, { rightValue: e.target.value })}
                                    className="h-8"
                                />
                            )}
                        </div>
                    </div>
                ))}

                <button
                    onClick={addCondition}
                    className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-[var(--border)] rounded-lg text-[10px] font-bold text-(--muted-fg) hover:border-violet-500/40 hover:text-violet-400 transition-all uppercase mt-1"
                >
                    <Plus className="w-3 h-3" />
                    Add Condition
                </button>
            </div>
        </div>
    );
}

// ─── Retry Configuration ────────────────────────────────────
export function RetryConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { maxAttempts?: string; delay?: string };
    const maxAttempts = data.maxAttempts || '3';
    const delay = data.delay || '2';

    const updateData = (kv: Record<string, unknown>) => {
        updateNode({
            config: {
                ...config,
                data: { ...data, ...kv },
                integrationId: 'retry',
                actionId: 'handle'
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex gap-3">
                <RotateCw className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-[var(--fg)]">Retry Mechanism</p>
                    <p className="text-[10px] text-(--muted-fg) leading-relaxed">
                        If the preceding node fails, this node will trigger a re-execution.
                    </p>
                </div>
            </div>

            <div className="space-y-3 p-3 border border-[var(--border)] rounded-lg bg-[var(--muted)]/20">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-amber-500/80">Max Attempts</Label>
                    <Input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="e.g. 3"
                        value={maxAttempts}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData({ maxAttempts: e.target.value })}
                        className="h-8 border-amber-500/20 focus:border-amber-500/50"
                    />
                    <p className="text-[9px] text-(--muted-fg)">Maximum number of retries before giving up.</p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                    <Label className="text-[10px] font-bold uppercase text-amber-500/80">Retry Delay (Seconds)</Label>
                    <Input
                        type="number"
                        min="0"
                        max="60"
                        placeholder="e.g. 2"
                        value={delay}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData({ delay: e.target.value })}
                        className="h-8 border-amber-500/20 focus:border-amber-500/50"
                    />
                    <p className="text-[9px] text-(--muted-fg)">Wait time between attempts.</p>
                </div>
            </div>

            <div className="text-[9px] text-(--muted-fg) italic px-1">
                Note: This node effectively wraps the execution of the node connected to its input.
            </div>
        </div>
    );
}

// ─── Slack Configuration ────────────────────────────────────
export function SlackConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { webhookUrl?: string; channel?: string; username?: string; text?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    return (
        <div className="space-y-3">
            <div className="space-y-2"><Label>Incoming Webhook URL</Label>
                <Input placeholder="https://hooks.slack.com/services/..." value={data.webhookUrl || ''} onChange={(e) => updateData({ webhookUrl: e.target.value })} />
                <p className="text-[10px] text-(--muted-fg)">Create one at <a href="https://api.slack.com/messaging/webhooks" target="_blank" className="text-violet-400 hover:underline">api.slack.com</a></p>
            </div>
            <div className="space-y-2"><Label>Channel (optional override)</Label>
                <Input placeholder="#general" value={data.channel || ''} onChange={(e) => updateData({ channel: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Bot Name (optional)</Label>
                <Input placeholder="AION" value={data.username || ''} onChange={(e) => updateData({ username: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Message</Label>
                <Textarea className="h-28" placeholder="{{ai_node.text}}" value={data.text || ''} onChange={(e) => updateData({ text: e.target.value })} />
            </div>
        </div>
    );
}

// ─── Telegram Configuration ─────────────────────────────────
export function TelegramConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { botToken?: string; chatId?: string; text?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    return (
        <div className="space-y-3">
            <div className="p-2.5 bg-sky-500/5 border border-sky-500/20 rounded-lg">
                <p className="text-[10px] text-sky-400 font-semibold mb-1">Telegram Bot API</p>
                <div className="space-y-2">
                    <Label>Bot Token</Label>
                    <Input type="password" placeholder="1234567890:AAF..." value={data.botToken || ''} onChange={(e) => updateData({ botToken: e.target.value })} />
                    <p className="text-[9px] text-(--muted-fg) leading-tight">Paste your token from <a href="https://t.me/BotFather" target="_blank" className="text-sky-400 hover:underline">@BotFather</a></p>
                </div>
            </div>
            <div className="space-y-2">
                <Label>Chat ID (Optional)</Label>
                <Input placeholder="-100..." value={data.chatId || ''} onChange={(e) => updateData({ chatId: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea className="h-28" placeholder="Hello!" value={data.text || ''} onChange={(e) => updateData({ text: e.target.value })} />
            </div>
        </div>
    );
}

// ─── Notion Configuration ───────────────────────────────────
export function NotionConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { apiKey?: string; pageId?: string; databaseId?: string; content?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    return (
        <div className="space-y-3">
            <div className="space-y-2"><Label>Integration Token</Label>
                <Input type="password" placeholder="secret_..." value={data.apiKey || ''} onChange={(e) => updateData({ apiKey: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Action</Label>
                <Select value={config.actionId || 'create_page'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateNode({ config: { ...config, actionId: e.target.value } })}>
                    <option value="create_page">Create Page</option>
                    <option value="append_block">Append to Page</option>
                </Select>
            </div>
            <div className="space-y-2"><Label>Page / Database ID</Label>
                <Input placeholder="abc123def..." value={data.pageId || data.databaseId || ''} onChange={(e) => updateData({ pageId: e.target.value, databaseId: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Content</Label>
                <Textarea className="h-24" value={data.content || ''} onChange={(e) => updateData({ content: e.target.value })} />
            </div>
        </div>
    );
}

// ─── OpenRouter Configuration ───────────────────────────────
export function OpenRouterConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { apiKey?: string; model?: string; systemPrompt?: string; userPrompt?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    const popularModels = [
        { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (Free)' },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (Free)' },
        { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free)' },
        { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
        { id: 'openai/gpt-4o', label: 'GPT-4o' },
    ];
    return (
        <div className="space-y-3">
            <div className="p-2.5 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <p className="text-[10px] text-violet-400 font-semibold">300+ Models Available</p>
                <p className="text-[10px] text-(--muted-fg)">Get key at <a href="https://openrouter.ai/keys" target="_blank" className="text-violet-400 hover:underline">openrouter.ai</a></p>
            </div>
            <div className="space-y-2"><Label>API Key</Label>
                <Input type="password" placeholder="sk-or-..." value={data.apiKey || ''} onChange={(e) => updateData({ apiKey: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Model</Label>
                <Select value={data.model || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateData({ model: e.target.value })}>
                    <option value="">-- Select model --</option>
                    {popularModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </Select>
                <Input placeholder="Custom Model ID..." value={data.model || ''} onChange={(e) => updateData({ model: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>System Prompt</Label>
                <Textarea className="h-20" value={data.systemPrompt || ''} onChange={(e) => updateData({ systemPrompt: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>User Prompt</Label>
                <Textarea className="h-24" placeholder="{{node.text}}" value={data.userPrompt || ''} onChange={(e) => updateData({ userPrompt: e.target.value })} />
            </div>
        </div>
    );
}

// ─── Code Node Configuration ────────────────────────────────
export function CodeConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { code?: string };
    return (
        <div className="space-y-3">
            <div className="p-2.5 bg-cyan-500/5 border border-cyan-500/20 rounded-lg text-[10px] text-(--muted-fg)">
                <p className="text-cyan-400 font-semibold uppercase mb-1">JavaScript Sandbox</p>
                <code className="bg-[var(--muted)] px-1 rounded">$input</code> = previous outputs
            </div>
            <div className="space-y-2"><Label>Code</Label>
                <Textarea className="h-48 font-mono text-xs" value={data.code || ''} onChange={(e) => updateNode({ config: { ...config, data: { ...data, code: e.target.value } } })} />
            </div>
        </div>
    );
}

// ─── Set Variable Configuration ─────────────────────────────
export function SetVariableConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { varList?: { key: string; value: string }[] };
    const vars: { key: string; value: string }[] = data.varList || [{ key: '', value: '' }];
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                {vars.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center">
                        <Input placeholder="key" className="w-24" value={v.key} onChange={(e: any) => { const n = [...vars]; n[i].key = e.target.value; updateNode({ config: { ...config, data: { ...data, varList: n } } }); }} />
                        <span className="text-(--muted-fg)">=</span>
                        <Input placeholder="value" value={v.value} onChange={(e: any) => { const n = [...vars]; n[i].value = e.target.value; updateNode({ config: { ...config, data: { ...data, varList: n } } }); }} />
                    </div>
                ))}
            </div>
            <button onClick={() => updateNode({ config: { ...config, data: { ...data, varList: [...vars, { key: '', value: '' }] } } })} className="text-[10px] text-violet-400 hover:underline">+ Add Variable</button>
        </div>
    );
}

// ─── Delay Configuration ────────────────────────────────────
export function DelayConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { seconds?: string };
    return (
        <div className="space-y-3">
            <Label>Delay (seconds)</Label>
            <Input type="number" placeholder="5" value={data.seconds || ''} onChange={(e) => updateNode({ config: { ...config, data: { ...data, seconds: e.target.value } } })} />
        </div>
    );
}

// ─── Unified AI Configuration ────────────────────────────────
export function AIConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (data: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { [key: string]: unknown };
    const integrationId = (config.integrationId as string) || 'google_gemini';
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    return (
        <div className="space-y-4">
            <div className="space-y-1"><Label>Provider</Label>
                <Select value={integrationId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateNode({ config: { ...config, integrationId: e.target.value, actionId: 'chat' } })}>
                    <option value="google_gemini">Google Gemini</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="groq">Groq (Llama)</option>
                    <option value="openrouter">OpenRouter</option>
                </Select>
            </div>
            {integrationId !== 'openrouter' && (
                <ModelSelector integrationId={integrationId} value={data.model || (integrationId === 'groq' ? 'llama-3.3-70b-versatile' : integrationId === 'openai' ? 'openai/gpt-oss-120b' : 'gemini-2.0-flash')} onChange={(model) => updateData({ model })} />
            )}
            <div className="space-y-2"><Label>API Key</Label><Input type="password" placeholder="Key..." value={data.apiKey || ''} onChange={(e: any) => updateData({ apiKey: e.target.value })} /></div>
            <div className="space-y-2"><Label>System Prompt</Label><Textarea className="h-20" value={data.systemPrompt || ''} onChange={(e: any) => updateData({ systemPrompt: e.target.value })} /></div>
            <div className="space-y-2"><Label>User Message</Label><Textarea className="h-28" placeholder="{{trigger.text}}" value={data.userPrompt || ''} onChange={(e: any) => updateData({ userPrompt: e.target.value })} /></div>
        </div>
    );
}

// ─── Google Sheets Configuration ────────────────────────────
export function SheetsConfig({ node, updateNode, googleIntegration, onConnectGoogle, onDisconnect, getAccessToken }: {
    node: any; updateNode: (d: any) => void; googleIntegration: any; onConnectGoogle: () => void; onDisconnect: () => void; getAccessToken: (p: string) => Promise<string | null>;
}) {
    const config = node.data.config || {};
    const data = config.data || {};
    const [sheets, setSheets] = useState<{ id: string; name: string; modifiedTime?: string }[] | null>(null);
    const [worksheets, setWorksheets] = useState<{ id: string; title: string }[] | null>(null);
    const [fetching, setFetching] = useState(false);
    const [fetchingWorksheets, setFetchingWorksheets] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    const fetchSheets = async (nameFilter?: string) => {
        setFetching(true);
        setWorksheets(null);
        try {
            const token = await getAccessToken('google');
            if (!token) throw new Error("No token found. Please re-connect.");
            let q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
            if (nameFilter) {
                const sanitized = nameFilter.replace(/'/g, "\\'");
                q += ` and name contains '${sanitized}'`;
            }
            const encodedQ = encodeURIComponent(q);
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodedQ}&orderBy=modifiedTime desc&pageSize=30&fields=files(id, name, modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true&spaces=drive`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const body = await res.json();
            if (body.error) throw new Error(body.error.message || "Google Drive API Error");
            setSheets(body.files || []);
        } catch (e: any) { alert(e.message || "Failed to fetch sheets."); }
        finally { setFetching(false); }
    };

    const fetchWorksheets = async (spreadsheetId: string) => {
        setFetchingWorksheets(true);
        try {
            const token = await getAccessToken('google');
            if (!token) throw new Error("No token found.");
            const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const body = await res.json();
            if (body.error) throw new Error(body.error.message || "Google Sheets API Error");
            if (body.sheets) {
                setWorksheets(body.sheets.map((s: any) => ({ id: s.properties.sheetId, title: s.properties.title })));
            }
        } catch (e: any) { alert(e.message || "Failed to fetch worksheets"); }
        finally { setFetchingWorksheets(false); }
    };

    return (
        <div className="space-y-4">
            <GoogleConnectButton
                isConnected={!!googleIntegration}
                isValid={googleIntegration?.is_valid}
                accountEmail={googleIntegration?.account_email}
                onConnect={onConnectGoogle}
                onDisconnect={onDisconnect}
            />

            {googleIntegration && (
                <Section title="Spreadsheet Setup" icon={FileSpreadsheet} color="text-emerald-400">
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="Search by name..."
                                        value={searchQuery}
                                        onChange={(e: any) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e: any) => e.key === 'Enter' && fetchSheets(searchQuery)}
                                    />
                                    {fetching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />}
                                </div>
                                <button
                                    disabled={fetching}
                                    onClick={() => fetchSheets(searchQuery)}
                                    className="p-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 transition-colors"
                                >
                                    <Globe className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {sheets && (
                            <div className="border border-violet-500/30 rounded-lg p-1 bg-violet-500/5 max-h-40 overflow-y-auto custom-scrollbar">
                                {sheets.length === 0 && <p className="p-3 text-[10px] text-center opacity-50 italic">No sheets found.</p>}
                                {sheets.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            updateData({ spreadsheetId: s.id, spreadsheetName: s.name, range: 'Sheet1' });
                                            setSheets(null);
                                            fetchWorksheets(s.id);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-[10px] hover:bg-violet-500/10 transition-colors truncate flex flex-col mb-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold truncate">{s.name}</span>
                                            {s.modifiedTime && <span className="text-[8px] opacity-30">{new Date(s.modifiedTime).toLocaleDateString()}</span>}
                                        </div>
                                        <span className="opacity-40 text-[8px]">{s.id}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {!sheets && data.spreadsheetId && (
                            <div className="flex items-center gap-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-emerald-400 truncate">{data.spreadsheetName || 'Connected Sheet'}</p>
                                    <p className="text-[8px] opacity-40 truncate">{data.spreadsheetId}</p>
                                </div>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            </div>
                        )}

                        {!sheets && !data.spreadsheetId && (
                            <Input
                                placeholder="Paste Spreadsheet ID..."
                                value={data.spreadsheetId || ''}
                                onChange={(e: any) => updateData({ spreadsheetId: e.target.value })}
                            />
                        )}

                        {data.spreadsheetId && (
                            <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                                <div className="flex items-center justify-between">
                                    <Label>Sheet (Tab)</Label>
                                    <button onClick={() => fetchWorksheets(data.spreadsheetId)} className="text-[9px] font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase">
                                        {fetchingWorksheets ? '...' : 'Refresh'}
                                    </button>
                                </div>
                                {worksheets ? (
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {worksheets.map(w => (
                                            <button
                                                key={w.id}
                                                onClick={() => { updateData({ range: w.title }); setWorksheets(null); }}
                                                className={cn("px-2 py-1.5 rounded-md border text-[10px] transition-all truncate", data.range === w.title ? "bg-violet-500/10 border-violet-500 text-violet-400 font-bold" : "bg-[var(--muted)] border-[var(--border)] hover:border-violet-500/40")}
                                            >
                                                {w.title}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <Input placeholder="Sheet1" value={data.range || ''} onChange={(e: any) => updateData({ range: e.target.value })} />
                                )}
                            </div>
                        )}
                    </div>
                </Section>
            )}

            {data.spreadsheetId && (
                <Section title="Operation" icon={Zap} color="text-amber-400">
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Action</Label>
                            <Select value={config.actionId || 'append_row'} onChange={(e: any) => updateNode({ config: { ...config, actionId: e.target.value } })}>
                                <option value="append_row">Append Row</option>
                                <option value="get_rows">Get Rows</option>
                                <option value="update_row">Update Row</option>
                            </Select>
                        </div>

                        {config.actionId === 'update_row' && (
                            <div className="space-y-1">
                                <Label>Row Index</Label>
                                <Input type="number" placeholder="e.g. 2" value={data.rowIndex || ''} onChange={(e: any) => updateData({ rowIndex: e.target.value })} />
                            </div>
                        )}

                        {(config.actionId === 'append_row' || config.actionId === 'update_row') && (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label>Row Data (JSON or Array)</Label>
                                    <span className="text-[8px] opacity-40">Use {"{{id.field}}"}</span>
                                </div>
                                <Textarea className="h-24 font-mono text-[10px]" placeholder='{ "Name": "{{trigger.name}}" }' value={typeof data.rowData === 'object' ? JSON.stringify(data.rowData, null, 2) : data.rowData || ''} onChange={(e: any) => updateData({ rowData: e.target.value })} />
                            </div>
                        )}

                        {config.actionId === 'get_rows' && (
                            <div className="space-y-1">
                                <Label>Specific Range (Optional)</Label>
                                <Input placeholder="A1:C10" value={data.rangeSpecific || ''} onChange={(e: any) => updateData({ rangeSpecific: e.target.value })} />
                            </div>
                        )}
                    </div>
                </Section>
            )}
        </div>
    );
}

// ─── Google Docs Configuration ──────────────────────────────
export function DocsConfig({ node, updateNode, googleIntegration, onConnectGoogle, onDisconnect, getAccessToken }: {
    node: any; updateNode: (d: any) => void; googleIntegration: any; onConnectGoogle: () => void; onDisconnect: () => void; getAccessToken: (p: string) => Promise<string | null>;
}) {
    const config = node.data.config || {};
    const data = config.data || {};
    const [docs, setDocs] = useState<{ id: string; name: string; modifiedTime?: string }[] | null>(null);
    const [fetching, setFetching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    const fetchDocs = async (nameFilter?: string) => {
        setFetching(true);
        try {
            const token = await getAccessToken('google');
            if (!token) throw new Error("No token found. Please re-connect.");
            // mimeType for Google Docs
            let q = "mimeType='application/vnd.google-apps.document' and trashed=false";
            if (nameFilter) {
                const sanitized = nameFilter.replace(/'/g, "\\'");
                q += ` and name contains '${sanitized}'`;
            }
            const encodedQ = encodeURIComponent(q);
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodedQ}&orderBy=modifiedTime desc&pageSize=30&fields=files(id, name, modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true&spaces=drive`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const body = await res.json();
            if (body.error) throw new Error(body.error.message || "Google Drive API Error");
            setDocs(body.files || []);
        } catch (e: any) { alert(e.message || "Failed to fetch docs."); }
        finally { setFetching(false); }
    };

    const actionID = config.actionId || 'create_doc';

    return (
        <div className="space-y-4">
            <GoogleConnectButton
                isConnected={!!googleIntegration}
                isValid={googleIntegration?.is_valid}
                accountEmail={googleIntegration?.account_email}
                onConnect={onConnectGoogle}
                onDisconnect={onDisconnect}
            />

            {googleIntegration && (
                <div className="space-y-3">
                    <Section title="Operation Mode" icon={Zap} color="text-amber-400">
                        <div className="flex gap-2 p-1 bg-[var(--muted)] rounded-lg">
                            <button
                                onClick={() => updateNode({ config: { ...config, actionId: 'create_doc' } })}
                                className={cn(
                                    "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                                    actionID === 'create_doc' ? "bg-violet-500 text-white shadow-sm" : "text-(--muted-fg) hover:bg-[var(--card)]"
                                )}
                            >
                                <Plus className="w-3 h-3 inline-block mr-1 mb-0.5" />
                                Create New
                            </button>
                            <button
                                onClick={() => updateNode({ config: { ...config, actionId: 'append_text' } })}
                                className={cn(
                                    "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                                    actionID === 'append_text' ? "bg-violet-500 text-white shadow-sm" : "text-(--muted-fg) hover:bg-[var(--card)]"
                                )}
                            >
                                <BookOpen className="w-3 h-3 inline-block mr-1 mb-0.5" />
                                Update
                            </button>
                            <button
                                onClick={() => updateNode({ config: { ...config, actionId: 'get_doc' } })}
                                className={cn(
                                    "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                                    actionID === 'get_doc' ? "bg-emerald-500 text-white shadow-sm" : "text-(--muted-fg) hover:bg-[var(--card)]"
                                )}
                            >
                                <Link2 className="w-3 h-3 inline-block mr-1 mb-0.5" />
                                Read
                            </button>
                        </div>
                    </Section>


                    {actionID === 'create_doc' ? (
                        <Section title="New Document Details" icon={Plus} color="text-violet-400">
                            <div className="space-y-2">
                                <Label>Document Title</Label>
                                <Input
                                    placeholder="e.g. Proposal for {{currentItem.Company}}"
                                    value={data.title || ''}
                                    onChange={(e: any) => updateData({ title: e.target.value })}
                                />
                                <Label>Initial Content</Label>
                                <Textarea
                                    className="h-24"
                                    placeholder="Content to add upon creation... use {{ai_node.text}}"
                                    value={data.content || ''}
                                    onChange={(e: any) => updateData({ content: e.target.value })}
                                />
                            </div>
                        </Section>
                    ) : actionID === 'get_doc' ? (
                        <Section title="Read Document" icon={BookOpen} color="text-emerald-400">
                            <div className="space-y-3">
                                {/* Doc picker — same search UI */}
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            placeholder="Search docs..."
                                            value={searchQuery}
                                            onChange={(e: any) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e: any) => e.key === 'Enter' && fetchDocs(searchQuery)}
                                        />
                                        {fetching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                                    </div>
                                    <button
                                        disabled={fetching}
                                        onClick={() => fetchDocs(searchQuery)}
                                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                    >
                                        <Globe className="w-4 h-4" />
                                    </button>
                                </div>

                                {docs && (
                                    <div className="border border-emerald-500/30 rounded-lg p-1 bg-emerald-500/5 max-h-40 overflow-y-auto custom-scrollbar">
                                        {docs.length === 0 && <p className="p-3 text-[10px] text-center opacity-50 italic">No docs found.</p>}
                                        {docs.map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => {
                                                    updateData({ documentId: d.id, documentName: d.name });
                                                    setDocs(null);
                                                }}
                                                className="w-full text-left px-3 py-2 rounded-lg text-[10px] hover:bg-emerald-500/10 transition-colors truncate flex flex-col mb-1"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold truncate">{d.name}</span>
                                                    {d.modifiedTime && <span className="text-[8px] opacity-30">{new Date(d.modifiedTime).toLocaleDateString()}</span>}
                                                </div>
                                                <span className="opacity-40 text-[8px]">{d.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {!docs && data.documentId && (
                                    <div className="flex items-center gap-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-emerald-400 truncate">{data.documentName || 'Reading Document'}</p>
                                            <p className="text-[8px] opacity-40 truncate">{data.documentId}</p>
                                        </div>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    </div>
                                )}

                                {/* How to use the output */}
                                <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-1.5">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Output — Use As KB</p>
                                    <p className="text-[9px] text-(--muted-fg) leading-relaxed">
                                        This node outputs the full document text. Connect it to an
                                        <span className="text-purple-400 font-semibold"> AI Agent&apos;s Knowledge (KB) ◆</span> port, or reference it with:
                                    </p>
                                    <code className="block text-[9px] bg-[var(--muted)] px-2 py-1 rounded text-emerald-300 font-mono">
                                        {`{{${data.documentName || 'Google Docs'}.text}}`}
                                    </code>
                                </div>
                            </div>
                        </Section>
                    ) : (
                        <Section title="Select Document" icon={BookOpen} color="text-blue-400">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            placeholder="Search docs..."
                                            value={searchQuery}
                                            onChange={(e: any) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e: any) => e.key === 'Enter' && fetchDocs(searchQuery)}
                                        />
                                        {fetching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />}
                                    </div>
                                    <button
                                        disabled={fetching}
                                        onClick={() => fetchDocs(searchQuery)}
                                        className="p-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 transition-colors"
                                    >
                                        <Globe className="w-4 h-4" />
                                    </button>
                                </div>

                                {docs && (
                                    <div className="border border-violet-500/30 rounded-lg p-1 bg-violet-500/5 max-h-40 overflow-y-auto custom-scrollbar">
                                        {docs.length === 0 && <p className="p-3 text-[10px] text-center opacity-50 italic">No docs found.</p>}
                                        {docs.map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => {
                                                    updateData({ documentId: d.id, documentName: d.name });
                                                    setDocs(null);
                                                }}
                                                className="w-full text-left px-3 py-2 rounded-lg text-[10px] hover:bg-violet-500/10 transition-colors truncate flex flex-col mb-1"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold truncate">{d.name}</span>
                                                    {d.modifiedTime && <span className="text-[8px] opacity-30">{new Date(d.modifiedTime).toLocaleDateString()}</span>}
                                                </div>
                                                <span className="opacity-40 text-[8px]">{d.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {!docs && data.documentId && (
                                    <div className="flex items-center gap-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-emerald-400 truncate">{data.documentName || 'Connected Document'}</p>
                                            <p className="text-[8px] opacity-40 truncate">{data.documentId}</p>
                                        </div>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    </div>
                                )}

                                <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                                    <Label>Text to Append</Label>
                                    <Textarea
                                        className="h-24"
                                        placeholder="Add content here... use {{ai_node.text}}"
                                        value={data.text || ''}
                                        onChange={(e: any) => updateData({ text: e.target.value })}
                                    />
                                </div>
                            </div>
                        </Section>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Google Calendar Config ───────────────────────────
export function GoogleCalendarConfig({ node, updateNode, googleIntegration, onConnect, onDisconnect }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <GoogleConnectButton isConnected={!!googleIntegration} isValid={googleIntegration?.is_valid} accountEmail={googleIntegration?.account_email} onConnect={onConnect} onDisconnect={onDisconnect} />
            <div className="space-y-2">
                <Label>Action</Label>
                <Select value={config.actionId || 'get_events'} onChange={(e: any) => updateNode({ config: { ...config, actionId: e.target.value } })}>
                    <option value="get_events">Get Events</option><option value="create_event">Create Event</option>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Calendar ID</Label>
                <Input placeholder="primary" value={data.calendarId || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, calendarId: e.target.value } } })} />
            </div>
        </div>
    );
}

// ─── Google Gmail Config ────────────────────────────
export function GoogleGmailConfig({ node, updateNode, googleIntegration, onConnect, onDisconnect }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <GoogleConnectButton isConnected={!!googleIntegration} isValid={googleIntegration?.is_valid} accountEmail={googleIntegration?.account_email} onConnect={onConnect} onDisconnect={onDisconnect} />
            <div className="space-y-2"><Label>To</Label><Input placeholder="email@example.com" value={data.to || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, to: e.target.value } } })} /></div>
            <div className="space-y-2"><Label>Subject</Label><Input value={data.subject || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, subject: e.target.value } } })} /></div>
            <div className="space-y-2"><Label>Body</Label><Textarea className="h-24" value={data.body || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, body: e.target.value } } })} /></div>
        </div>
    );
}

// ─── Discord Config ─────────────────────────────────
export function DiscordConfig({ node, updateNode }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <div className="space-y-2"><Label>Webhook URL</Label><Input placeholder="https://discord..." value={data.webhookUrl || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, webhookUrl: e.target.value } } })} /></div>
            <div className="space-y-2"><Label>Message</Label><Textarea className="h-32" value={data.content || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, content: e.target.value } } })} /></div>
        </div>
    );
}

// ─── API Config ─────────────────────────────────────
export function APIConfig({ node, updateNode }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <div className="w-20"><Label>Method</Label><Select value={data.method || 'GET'} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, method: e.target.value } } })}><option value="GET">GET</option><option value="POST">POST</option></Select></div>
                <div className="flex-1"><Label>URL</Label><Input placeholder="https://api..." value={data.url || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, url: e.target.value } } })} /></div>
            </div>
            <div className="space-y-2"><Label>Body (JSON)</Label><Textarea className="h-32 text-[10px] font-mono" value={typeof data.body === 'object' ? JSON.stringify(data.body, null, 2) : data.body || ''} onChange={(e: any) => { try { updateNode({ config: { ...config, data: { ...data, body: JSON.parse(e.target.value) } } }); } catch { updateNode({ config: { ...config, data: { ...data, body: e.target.value } } }); } }} /></div>
        </div>
    );
}

// ─── Tool Config ────────────────────────────────────
export function ToolConfig({ node, updateNode }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label>Tool Type</Label>
                <Select value={config.actionId || 'file_reader'} onChange={(e: any) => updateNode({ config: { ...config, actionId: e.target.value } })}>
                    <option value="file_reader">Read File / URL</option><option value="calculator">Calculator</option>
                </Select>
            </div>
            {config.actionId === 'file_reader' && <div className="space-y-2"><Label>Path / URL</Label><Input placeholder="https://..." value={data.filePath || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, filePath: e.target.value } } })} /></div>}
        </div>
    );
}

// ─── Memory Config ──────────────────────────────────
export function MemoryConfig({ node, updateNode }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3 opacity-60">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-[10px] font-bold">COMING SOON</div>
            <div className="space-y-2"><Label>Session Key</Label><Input placeholder="{{trigger.chat_id}}" value={data.sessionId || '{{trigger.chat_id}}'} readOnly /></div>
        </div>
    );
}

// ─── Loop Configuration ──────────────────────────────────────
export function LoopConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    const hasHeaders = data.hasHeaders !== false; // default true

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            {/* Input Array */}
            <div className="space-y-1.5">
                <Label>Input Array</Label>
                <Input
                    placeholder="{{Google Sheets.values}}"
                    value={data.inputArray || ''}
                    onChange={(e: any) => updateData({ inputArray: e.target.value })}
                />
                <p className="text-[9px] text-(--muted-fg) leading-relaxed ml-0.5">
                    Use <code className="bg-[var(--muted)] px-1 rounded">{'{{NodeName.values}}'}</code> for Google Sheets,
                    or <code className="bg-[var(--muted)] px-1 rounded">{'{{NodeName.items}}'}</code> for plain arrays.
                </p>
            </div>

            {/* First row = headers toggle */}
            <label className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--border)] hover:border-orange-500/40 cursor-pointer transition-colors">
                <input
                    type="checkbox"
                    checked={hasHeaders}
                    onChange={(e: any) => updateData({ hasHeaders: e.target.checked })}
                    className="accent-orange-500 w-3.5 h-3.5"
                />
                <div>
                    <p className="text-xs font-semibold text-[var(--fg)]">First row is headers</p>
                    <p className="text-[10px] text-(--muted-fg)">Maps column names as object keys (recommended for Sheets)</p>
                </div>
            </label>

            {/* Usage reference card */}
            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">In Downstream Nodes, Use:</p>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <code className="text-[10px] bg-[var(--muted)] px-2 py-0.5 rounded text-orange-300 font-mono">{'{{currentItem.ColumnName}}'}</code>
                        <span className="text-[9px] text-(--muted-fg)">any column value</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <code className="text-[10px] bg-[var(--muted)] px-2 py-0.5 rounded text-orange-300 font-mono">{'{{currentIndex}}'}</code>
                        <span className="text-[9px] text-(--muted-fg)">0-based row number</span>
                    </div>
                </div>
            </div>

            {/* Example for leads scenario */}
            <div className="p-3 bg-[var(--muted)] rounded-lg border border-[var(--border)] space-y-1.5">
                <p className="text-[9px] font-bold text-[var(--fg)] uppercase tracking-wider">📋 Example — Leads Scenario</p>
                <p className="text-[9px] text-(--muted-fg) leading-relaxed">
                    Input: <code className="text-violet-400">{'{{Google Sheets.values}}'}</code><br />
                    In AI prompt: <code className="text-violet-400">{'{{currentItem.Name}}, {{currentItem.Company}}'}</code><br />
                    Doc title: <code className="text-violet-400">{'Proposal for {{currentItem.Company}}'}</code>
                </p>
            </div>
        </div>
    );
}

// ─── CRM Capture Configuration ───────────────────────────────
// Lets creators configure what data gets saved to the buyer's CRM dashboard
export function CRMCaptureConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { resultType?: string; title?: string; captureFields?: string; tags?: string; sourceNodeId?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            {/* What this node does */}
            <div className="p-3 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-500/20 flex items-center justify-center">
                        <span className="text-sm">📦</span>
                    </div>
                    <p className="text-[11px] font-black text-teal-400 uppercase tracking-wider">CRM Capture</p>
                </div>
                <p className="text-[10px] text-(--muted-fg) leading-relaxed">
                    This node saves the upstream data as a <span className="text-teal-400 font-bold">business result</span> in
                    the buyer&apos;s CRM Dashboard. Use this to capture leads, proposals, extracted data — anything the buyer
                    should see as a deliverable.
                </p>
            </div>

            {/* Result Type */}
            <div className="space-y-1.5">
                <Label>Result Type</Label>
                <div className="grid grid-cols-2 gap-1.5">
                    {[
                        { id: 'lead', label: '👤 Lead', desc: 'Contact / prospect' },
                        { id: 'data', label: '📊 Data', desc: 'Extracted data' },
                        { id: 'task', label: '✅ Task', desc: 'Action item' },
                        { id: 'proposal', label: '📄 Proposal', desc: 'Generated doc' },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => updateData({ resultType: t.id })}
                            className={cn(
                                "p-2 rounded-lg border text-left transition-all",
                                (data.resultType || 'lead') === t.id
                                    ? "bg-teal-500/10 border-teal-500/50 text-teal-400"
                                    : "border-[var(--border)] hover:border-teal-500/30 text-(--muted-fg)"
                            )}
                        >
                            <p className="text-[10px] font-bold">{t.label}</p>
                            <p className="text-[8px] opacity-60">{t.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Title Template */}
            <div className="space-y-1.5">
                <Label>Title Template</Label>
                <Input
                    placeholder="e.g. Lead — {{currentItem.Name}}"
                    value={data.title || ''}
                    onChange={(e: any) => updateData({ title: e.target.value })}
                />
                <p className="text-[9px] text-(--muted-fg) ml-0.5">
                    Use <code className="bg-[var(--muted)] px-1 rounded">{'{{variable}}'}</code> for dynamic titles
                </p>
            </div>

            {/* Capture Fields (optional) */}
            <div className="space-y-1.5">
                <Label>Capture Fields <span className="text-[8px] opacity-50">(optional)</span></Label>
                <Input
                    placeholder="name, email, phone, company"
                    value={data.captureFields || ''}
                    onChange={(e) => updateData({ captureFields: e.target.value })}
                />
                <p className="text-[9px] text-(--muted-fg) ml-0.5">
                    Comma-separated. Leave empty to capture entire upstream output.
                </p>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
                <Label>Tags <span className="text-[8px] opacity-50">(optional)</span></Label>
                <Input
                    placeholder="hot-lead, auto-generated, q1"
                    value={data.tags || ''}
                    onChange={(e) => updateData({ tags: e.target.value })}
                />
            </div>

            {/* Source Node ID (auto or manual) */}
            <div className="space-y-1.5">
                <Label>Source Node <span className="text-[8px] opacity-50">(optional)</span></Label>
                <Input
                    placeholder="Auto-detect (leave empty)"
                    value={data.sourceNodeId || ''}
                    onChange={(e) => updateData({ sourceNodeId: e.target.value })}
                />
                <p className="text-[9px] text-(--muted-fg) ml-0.5">
                    If empty, captures from the immediate upstream node.
                </p>
            </div>

            {/* How it works */}
            <div className="p-3 bg-[var(--muted)] rounded-lg border border-[var(--border)] space-y-1.5">
                <p className="text-[9px] font-bold text-[var(--fg)] uppercase tracking-wider">💡 How it works</p>
                <p className="text-[9px] text-(--muted-fg) leading-relaxed">
                    When a buyer runs this automation, any data flowing through this node will be
                    saved to their <span className="text-teal-400 font-semibold">CRM Dashboard</span>. They can
                    view, search, filter, and export these results.
                </p>
            </div>
        </div>
    );
}

// ─── Data & Scraping Configurations ─────────────────────────
export function DataScrapingConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { url?: string; waitTime?: boolean; html?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    if (config.actionId === 'scrape' || config.actionId === 'scraper') {
        return (
            <div className="space-y-3">
                <div className="p-2.5 bg-teal-500/5 border border-teal-500/20 rounded-lg">
                    <p className="text-[10px] text-teal-400 font-bold uppercase mb-1 flex items-center gap-2">
                        <Globe className="w-3 h-3" /> Jina Reader Scraper
                    </p>
                    <p className="text-[9px] text-(--muted-fg)">Convert any public URL into clean, AI-ready Markdown.</p>
                </div>
                <div className="space-y-1.5">
                    <Label>URL to Scrape</Label>
                    <Input placeholder="https://example.com" value={data.url || ''} onChange={(e) => updateData({ url: e.target.value })} />
                </div>
                <div className="space-x-2 flex items-center">
                    <input type="checkbox" id="wait-chk" checked={!!data.waitTime} onChange={(e: any) => updateData({ waitTime: e.target.checked })} />
                    <label htmlFor="wait-chk" className="text-[10px] text-(--muted-fg)">Wait for JS execution</label>
                </div>
            </div>
        );
    }

    if (config.actionId === 'html_to_md') {
        return (
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <Label>Raw HTML</Label>
                    <Textarea className="h-40 font-mono text-[10px]" value={data.html || ''} onChange={(e: any) => updateData({ html: e.target.value })} />
                </div>
            </div>
        );
    }

    return null;
}

export function JSONSearchConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { data?: string; path?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    return (
        <div className="space-y-3">
            <div className="p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">JSON Object Mapper</p>
                <p className="text-[9px] text-(--muted-fg)">Extract deeply nested fields using dot notation.</p>
            </div>
            <div className="space-y-1.5">
                <Label>JSON Source</Label>
                <Textarea className="h-24 font-mono text-[10px]" placeholder="{{node.output}}" value={data.data || ''} onChange={(e: any) => updateData({ data: e.target.value })} />
            </div>
            <div className="space-y-1.5">
                <Label>Field Path</Label>
                <Input placeholder="data.user.profile.name" value={data.path || ''} onChange={(e: any) => updateData({ path: e.target.value })} />
            </div>
        </div>
    );
}

export function StructurizerConfig({ node, updateNode }: { node: { data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { modelConfig?: { provider: string }; text?: string; schema?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    return (
        <div className="space-y-3">
            <div className="p-2.5 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <p className="text-[10px] text-violet-400 font-bold uppercase mb-1 flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3" /> AI Structurizer
                </p>
                <p className="text-[9px] text-(--muted-fg)">Turn messy text into a clean JSON object via LLM.</p>
            </div>

            <div className="space-y-1.5 p-2 bg-[var(--muted)]/50 border border-[var(--border)] rounded-md">
                <Label>Model for Extraction</Label>
                <Select value={data.modelConfig?.provider || 'google_gemini'}
                    onChange={(e: any) => updateData({ modelConfig: { ...data.modelConfig, provider: e.target.value } })}>
                    <option value="google_gemini">Google Gemini</option>
                    <option value="groq">Groq (Llama)</option>
                    <option value="openai">OpenAI</option>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label>Input Text</Label>
                <Textarea className="h-24" placeholder="Messy scraped text..." value={data.text || ''} onChange={(e: any) => updateData({ text: e.target.value })} />
            </div>

            <div className="space-y-1.5">
                <Label>Expected JSON Schema</Label>
                <Textarea className="h-32 font-mono text-[10px]" placeholder='{"name": "string", "emails": ["string"]}' value={data.schema || ''} onChange={(e: any) => updateData({ schema: e.target.value })} />
            </div>
        </div>
    );
}

export function FormTriggerConfig({ node, updateNode, workflowId }: { node: { id: string; data: { config?: Record<string, unknown> } }; updateNode: (d: Record<string, unknown>) => void, workflowId: string }) {
    const config = node.data.config || {};
    const data = (config.data || {}) as { formTitle?: string; formDescription?: string; fields?: string };
    const updateData = (kv: Record<string, unknown>) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    const formUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/form/${workflowId}?node=${node.id}`
        : `/form/${workflowId}?node=${node.id}`;

    return (
        <div className="space-y-4">
            <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg flex gap-3">
                <FileText className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-[var(--fg)]">Aion Form</p>
                    <p className="text-[10px] text-(--muted-fg) leading-relaxed">
                        This workflow triggers when someone submits your hosted form.
                    </p>
                </div>
            </div>

            <Section title="Form Setup" icon={Globe} color="text-blue-400">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label>Public Form URL</Label>
                        <div className="flex items-center gap-2">
                            <Input value={formUrl} readOnly className="font-mono text-[9px] bg-[var(--muted)]/50" />
                            {typeof window !== 'undefined' && (
                                <button onClick={() => window.open(formUrl, '_blank')} className="p-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                                    <Link2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Form Title</Label>
                        <Input placeholder="Contact Us / Inquiry Form" value={data.formTitle || ''} onChange={(e) => updateData({ formTitle: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                        <Label>Description</Label>
                        <Textarea className="h-16 py-1" placeholder="Tell users what this form is for..." value={data.formDescription || ''} onChange={(e) => updateData({ formDescription: e.target.value })} />
                    </div>
                </div>
            </Section>

            <Section title="Fields (JSON)" icon={Plus} color="text-emerald-400" defaultOpen={false}>
                <Label>Field Definitions</Label>
                <Textarea
                    className="h-32 font-mono text-[10px]"
                    placeholder='[{"name": "Full Name", "type": "text"}, {"name": "Email", "type": "email"}]'
                    value={data.fields || '[]'}
                    onChange={(e) => updateData({ fields: e.target.value })}
                />
                <p className="text-[9px] text-(--muted-fg)">Define the inputs for your form as a JSON array.</p>
            </Section>

            <Section title="Embed Snippet" icon={Code2} color="text-amber-400" defaultOpen={false}>
                <div className="space-y-2">
                    <p className="text-[9px] text-(--muted-fg)">Copy this to embed the form on your own website.</p>
                    <div className="bg-black/20 p-2 rounded-md border border-[var(--border)] overflow-x-auto">
                        <code className="text-[8px] text-amber-200/80 whitespace-pre">
                            {`<iframe
  src="${formUrl}&embed=true"
  width="100%"
  height="600"
  frameborder="0"
></iframe>`}
                        </code>
                    </div>
                </div>
            </Section>
        </div>
    );
}
