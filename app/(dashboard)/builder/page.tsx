'use client';

import { useCallback, useMemo, Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    type Connection,
    type Node,
    type Edge,
    type NodeTypes,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Save,
    Play,
    Undo2,
    Redo2,
    Download,
    Upload,
    Cpu,
    Globe,
    GitFork,
    ArrowRightCircle,
    MessageSquare,
    X,
    Zap,
    Settings2,
    Database,
    Clock,

    Webhook as WebhookIcon,
    Calendar,
    Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { registry } from '@/lib/workflow/integrations/registry';
import { WorkflowRunner, RunLog } from '@/lib/workflow/runner';
import { WorkflowNode, WorkflowEdge, NodeType } from '@/types';

// ─── Custom Node Component ──────────────────────────────────
interface NodeData {
    label: string;
    type: string;
    config?: Record<string, unknown>;
}

const nodeColors: Record<string, { bg: string; border: string; icon: string }> = {
    trigger: {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-300 dark:border-amber-500/30',
        icon: 'text-amber-600 dark:text-amber-400',
    },
    ai_action: {
        bg: 'bg-primary-50 dark:bg-primary-500/10',
        border: 'border-primary-300 dark:border-primary-500/30',
        icon: 'text-primary-600 dark:text-primary-400',
    },
    api_action: {
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-300 dark:border-blue-500/30',
        icon: 'text-blue-600 dark:text-blue-400',
    },
    social_action: {
        bg: 'bg-indigo-50 dark:bg-indigo-500/10',
        border: 'border-indigo-300 dark:border-indigo-500/30',
        icon: 'text-indigo-600 dark:text-indigo-400',
    },
    logic_gate: {
        bg: 'bg-orange-50 dark:bg-orange-500/10',
        border: 'border-orange-300 dark:border-orange-500/30',
        icon: 'text-orange-600 dark:text-orange-400',
    },
    data_tool: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-300 dark:border-emerald-500/30',
        icon: 'text-emerald-600 dark:text-emerald-400',
    },
    input: {
        bg: 'bg-slate-50 dark:bg-slate-500/10',
        border: 'border-slate-300 dark:border-slate-500/30',
        icon: 'text-slate-600 dark:text-slate-400',
    },
    output: {
        bg: 'bg-rose-50 dark:bg-rose-500/10',
        border: 'border-rose-300 dark:border-rose-500/30',
        icon: 'text-rose-600 dark:text-rose-400',
    },
};

const nodeIcons: Record<string, any> = {
    trigger: Zap,
    ai_action: Cpu,
    api_action: Globe,
    social_action: MessageSquare,
    logic_gate: GitFork,
    data_tool: Database,
    input: Upload,
    output: ArrowRightCircle,
};

function CustomNode({ data }: { data: NodeData }) {
    const colors = nodeColors[data.type] || nodeColors.input;
    const Icon = nodeIcons[data.type] || MessageSquare;

    return (
        <div
            className={cn(
                'relative bg-[var(--card)] border-2 rounded-xl p-4 min-w-[180px]',
                'hover:shadow-lg transition-all duration-200 group',
                colors.border,
            )}
        >
            {/* Glow on hover */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-[var(--border)] !border-2 !border-[var(--card)] hover:!bg-primary-500 transition-colors"
            />

            <div className="relative z-10 flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors.bg)}>
                    <Icon className={cn('w-4 h-4', colors.icon)} />
                </div>
                <div>
                    <p className="text-sm font-semibold text-[var(--fg)]">{data.label}</p>
                    <p className="text-xs text-[var(--muted-fg)] capitalize">
                        {data.type.replace('_', ' ')}
                    </p>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-[var(--border)] !border-2 !border-[var(--card)] hover:!bg-primary-500 transition-colors"
            />
        </div>
    );
}

// ─── Node type registration ────────────────────────────────
const nodeTypes: NodeTypes = {
    custom: CustomNode,
};

// ─── Initial data ──────────────────────────────────────────
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// ─── Node Palette ──────────────────────────────────────────
const paletteItems = [
    { type: 'trigger', label: 'Trigger', icon: Zap, integrationId: 'cron' },
    { type: 'ai_action', label: 'AI Engine', icon: Cpu, integrationId: 'google_gemini' },
    { type: 'social_action', label: 'Discord', icon: MessageSquare, integrationId: 'discord' },
    { type: 'logic_gate', label: 'Logic', icon: GitFork, integrationId: 'logic' },

    { type: 'api_action', label: 'HTTP Request', icon: Globe, integrationId: 'api' },
    { type: 'data_tool', label: 'Google Calendar', icon: Calendar, integrationId: 'google_calendar' },
    { type: 'data_tool', label: 'Google Gmail', icon: Mail, integrationId: 'google_gmail' },
];

// ─── Specialized Configuration Components ──────────────────

function ModelSelector({ value, onChange, integrationId }: { value: string, onChange: (val: string) => void, integrationId: string }) {
    const models = integrationId === 'google_gemini' || integrationId === 'gemini'
        ? [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Fast & Capable' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Exp)', desc: 'Experimental' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Efficient' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Powerful' }
        ]
        : integrationId === 'openai'
            ? [
                { id: 'gpt-4o', name: 'GPT-4o', desc: 'SOTA performance' },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Efficient & Smart' },
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Fast & Reliable' }
            ]
            : integrationId === 'groq'
                ? [
                    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: 'State-of-the-art' },
                    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', desc: 'Ultra-fast' },
                    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', desc: 'High context' }
                ]
                : [];

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Model Selection</label>
            <div className="grid grid-cols-1 gap-2">
                {models.map(m => (
                    <button
                        key={m.id}
                        onClick={() => onChange(m.id)}
                        className={cn(
                            "w-full text-left p-2 rounded-lg border transition-all text-xs",
                            value === m.id
                                ? "bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400"
                                : "bg-[var(--muted)] border-[var(--border)] hover:border-primary-500/50"
                        )}
                    >
                        <div className="font-semibold">{m.name}</div>
                        <div className="text-[10px] opacity-60">{m.desc}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

function AIConfiguration({ node, updateNode, workflowId }: { node: any, updateNode: (data: any) => void, workflowId: string | null }) {
    const config = node.data.config || {};
    const data = config.data || {};

    const updateData = (kv: any) => {
        updateNode({
            config: {
                ...config,
                data: { ...data, ...kv }
            }
        });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Integration</label>
                <select
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                    value={config.integrationId || ''}
                    onChange={(e) => updateNode({ config: { ...config, integrationId: e.target.value, actionId: 'chat' } })}
                >
                    <option value="google_gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="groq">Groq</option>
                </select>
            </div>

            <ModelSelector
                integrationId={config.integrationId}
                value={data.model || (
                    config.integrationId === 'groq' ? 'llama-3.3-70b-versatile' :
                        config.integrationId === 'openai' ? 'gpt-4o' :
                            'gemini-2.0-flash'
                )}
                onChange={(model) => updateData({ model })}
            />

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">API Key</label>
                <input
                    type="password"
                    placeholder="Enter API Key or use environment variable"
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                    value={data.apiKey || ''}
                    onChange={(e) => updateData({ apiKey: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">System Instructions</label>
                <textarea
                    placeholder="e.g. You are a helpful assistant..."
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-20 outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                    value={data.systemPrompt || ''}
                    onChange={(e) => updateData({ systemPrompt: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Prompt / Input</label>
                <textarea
                    placeholder="Use {{variables}} to reference other nodes"
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-28 outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                    value={data.userPrompt || ''}
                    onChange={(e) => updateData({ userPrompt: e.target.value })}
                />
            </div>
        </div>
    );
}

function CommunicationConfiguration({ node, updateNode, workflowId }: { node: any, updateNode: (data: any) => void, workflowId: string | null }) {
    const config = node.data.config || {};
    const data = config.data || {};

    const updateData = (kv: any) => {
        updateNode({
            config: {
                ...config,
                data: { ...data, ...kv }
            }
        });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-indigo-500 mt-0.5" />
                <div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Discord Webhook</div>
                    <div className="text-[10px] opacity-60">Send automated messages to your Discord channels.</div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Webhook URL</label>
                <input
                    type="text"
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--fg)] outline-none focus:ring-1 focus:ring-indigo-500"
                    value={data.webhookUrl || ''}
                    onChange={(e) => updateData({ webhookUrl: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Message Content</label>
                <textarea
                    placeholder="Message: {{AI Action.text}}"
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-32 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    value={data.content || ''}
                    onChange={(e) => updateData({ content: e.target.value })}
                />
            </div>
        </div>
    );
}

function APIConfiguration({ node, updateNode, workflowId }: { node: any, updateNode: (data: any) => void, workflowId: string | null }) {
    const config = node.data.config || {};
    const data = config.data || {};

    const updateData = (kv: any) => {
        updateNode({
            config: {
                ...config,
                actionId: 'request',
                data: { ...data, ...kv }
            }
        });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="flex gap-2">
                <div className="w-24">
                    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Method</label>
                    <select
                        className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs font-bold text-primary-500 outline-none focus:ring-1 focus:ring-primary-500"
                        value={data.method || 'GET'}
                        onChange={(e) => updateData({ method: e.target.value })}
                    >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">URL</label>
                    <input
                        type="text"
                        placeholder="https://api.example.com/v1"
                        className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                        value={data.url || ''}
                        onChange={(e) => updateData({ url: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Headers (JSON)</label>
                <textarea
                    placeholder='{ "Authorization": "Bearer Token" }'
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-[10px] font-mono text-[var(--fg)] h-20 outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                    value={typeof data.headers === 'object' ? JSON.stringify(data.headers, null, 2) : data.headers || ''}
                    onChange={(e) => {
                        try {
                            const headers = JSON.parse(e.target.value);
                            updateData({ headers });
                        } catch (err) {
                            updateData({ headers: e.target.value });
                        }
                    }}
                />
            </div>

            {['POST', 'PUT', 'PATCH'].includes(data.method || 'GET') && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Body (JSON/Text)</label>
                    <textarea
                        placeholder='{ "key": "value" }'
                        className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-[10px] font-mono text-[var(--fg)] h-40 outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                        value={typeof data.body === 'object' ? JSON.stringify(data.body, null, 2) : data.body || ''}
                        onChange={(e) => {
                            try {
                                const body = JSON.parse(e.target.value);
                                updateData({ body });
                            } catch (err) {
                                updateData({ body: e.target.value });
                            }
                        }}
                    />
                </div>
            )}

            <p className="text-[10px] text-[var(--muted-fg)] italic">
                Support for variables: Use {"{{node_label.field}}"} in URL or Body.
            </p>
        </div>
    );
}

function TriggerConfiguration({ node, updateNode, workflowId }: { node: any, updateNode: (data: any) => void, workflowId: string | null }) {
    const config = node.data.config || {};
    const data = config.data || {};

    const updateData = (kv: any) => {
        updateNode({
            config: {
                ...config,
                data: { ...data, ...kv }
            }
        });
    };

    const isCron = config.integrationId === 'cron';
    const isGmail = config.integrationId === 'google_gmail_trigger';
    const isWebhook = config.integrationId === 'webhook' || (!isCron && !isGmail);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Trigger Type</label>
                <div className="flex bg-[var(--muted)] p-1 rounded-lg gap-1">
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'cron', actionId: 'schedule' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-xs transition-all", isCron ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)]" : "opacity-60")}
                    >
                        Schedule
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'webhook', actionId: 'receive' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-xs transition-all", isWebhook ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)]" : "opacity-60")}
                    >
                        Webhook
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'google_gmail_trigger', actionId: 'on_new_email' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-xs transition-all flex items-center justify-center gap-1", isGmail ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)] text-red-600 dark:text-red-400" : "opacity-60")}
                    >
                        <Mail className="w-3 h-3" /> Gmail
                    </button>
                </div>
            </div>

            {isCron && (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Cron Expression</label>
                        <input
                            type="text"
                            placeholder="* * * * *"
                            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--fg)] outline-none focus:ring-1 focus:ring-amber-500"
                            value={data.cron || '0 * * * *'}
                            onChange={(e) => updateData({ cron: e.target.value })}
                        />
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                            Runs: Every hour at minute 0
                        </div>
                    </div>
                </div>
            )}

            {(isWebhook || isGmail) && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Webhook Endpoint (Production)</label>
                    <div className="relative group">
                        <div className="p-3 bg-[var(--muted)] rounded-lg border border-dashed border-[var(--border)] text-[10px] font-mono break-all text-primary-600 dark:text-primary-400">
                            {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/${workflowId || 'SAVE_FIRST'}/${node.id}` : ''}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                                const url = `${window.location.origin}/api/webhooks/${workflowId || 'SAVE_FIRST'}/${node.id}`;
                                navigator.clipboard.writeText(url);
                                toast.success('URL copied!');
                            }}
                        >
                            <Upload className="w-3 h-3" />
                        </Button>
                    </div>
                    {isGmail ? (
                        <p className="text-[10px] opacity-60 italic text-red-600 dark:text-red-400">Configure Gmail to forward emails or Push Notifications to this endpoint. The workflow will run when a new email payload is received.</p>
                    ) : (
                        <p className="text-[10px] opacity-60 italic">Send a POST request with any JSON body to this endpoint to trigger the workflow worker.</p>
                    )}
                </div>
            )}
        </div>
    );
}

function GoogleCalendarConfiguration({ node, updateNode, workflowId }: { node: any, updateNode: (data: any) => void, workflowId: string | null }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const actionId = config.actionId || 'get_events';

    const updateData = (kv: any) => {
        updateNode({
            config: {
                ...config,
                data: { ...data, ...kv }
            }
        });
    };

    const updateAction = (newActionId: string) => {
        updateNode({
            config: {
                ...config,
                actionId: newActionId,
                // preserve accessToken for convenience
                data: { ...data, accessToken: data.accessToken }
            }
        });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">Google Calendar</div>
                    <div className="text-[10px] opacity-60">Manage your schedule and events.</div>
                </div>
            </div>

            {/* Account Connection */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Access Token</label>
                <div className="flex gap-2">
                    <input
                        type="password"
                        placeholder="Paste OAuth2 Access Token"
                        className="flex-1 bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                        value={data.accessToken || ''}
                        onChange={(e) => updateData({ accessToken: e.target.value })}
                    />
                    {data.accessToken && (
                        <div className="flex items-center justify-center px-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg" title="Token Present">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-[var(--muted-fg)] leading-relaxed">
                    1. Go to <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google OAuth Playground</a>.<br />
                    2. In "Input your own scopes", paste: <code className="bg-[var(--muted)] px-1 rounded text-[9px] select-all">https://www.googleapis.com/auth/calendar</code><br />
                    3. Click "Authorize APIs" and copy the Access Token.
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Action</label>
                <select
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                    value={actionId}
                    onChange={(e) => updateAction(e.target.value)}
                >
                    <option value="get_events">Get Events</option>
                    <option value="create_event">Create Event</option>
                    <option value="update_event">Update Event</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Calendar ID</label>
                <input
                    type="text"
                    placeholder="primary"
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                    value={data.calendarId || ''}
                    onChange={(e) => updateData({ calendarId: e.target.value })}
                />
            </div>

            {actionId === 'create_event' && (
                <>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Event Summary</label>
                        <input
                            type="text"
                            placeholder="Meeting with Client"
                            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                            value={data.summary || ''}
                            onChange={(e) => updateData({ summary: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Start Time</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                                value={data.startTime || ''}
                                onChange={(e) => updateData({ startTime: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">End Time</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                                value={data.endTime || ''}
                                onChange={(e) => updateData({ endTime: e.target.value })}
                            />
                        </div>
                    </div>
                </>
            )}

            {actionId === 'update_event' && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Event ID</label>
                    <input
                        type="text"
                        placeholder="Event ID to update"
                        className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                        value={data.eventId || ''}
                        onChange={(e) => updateData({ eventId: e.target.value })}
                    />
                </div>
            )}

            {(actionId === 'create_event' || actionId === 'update_event') && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Description</label>
                    <textarea
                        placeholder="Event details..."
                        className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-20 outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                        value={data.description || ''}
                        onChange={(e) => updateData({ description: e.target.value })}
                    />
                </div>
            )}
        </div>
    );
}

function GoogleGmailConfiguration({ node, updateNode, workflowId }: { node: any, updateNode: (data: any) => void, workflowId: string | null }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const actionId = config.actionId || 'send_email';

    const updateData = (kv: any) => {
        updateNode({
            config: {
                ...config,
                data: { ...data, ...kv }
            }
        });
    };

    const updateAction = (newActionId: string) => {
        updateNode({
            config: {
                ...config,
                actionId: newActionId,
                data: { ...data, accessToken: data.accessToken }
            }
        });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <Mail className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                    <div className="text-xs font-bold text-red-600 dark:text-red-400">Google Gmail</div>
                    <div className="text-[10px] opacity-60">Automate your email workflow.</div>
                </div>
            </div>

            {/* Account Connection */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Access Token</label>
                <div className="flex gap-2">
                    <input
                        type="password"
                        placeholder="Paste OAuth2 Access Token"
                        className="flex-1 bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                        value={data.accessToken || ''}
                        onChange={(e) => updateData({ accessToken: e.target.value })}
                    />
                    {data.accessToken && (
                        <div className="flex items-center justify-center px-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg" title="Token Present">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-[var(--muted-fg)] leading-relaxed">
                    1. Go to <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google OAuth Playground</a>.<br />
                    2. Scopes: <code className="bg-[var(--muted)] px-1 rounded text-[9px] select-all">https://mail.google.com/</code><br />
                    3. Click "Authorize APIs" and copy the Access Token.
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Action</label>
                <select
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                    value={actionId}
                    onChange={(e) => updateAction(e.target.value)}
                >
                    <option value="send_email">Send Email</option>
                    <option value="reply_email">Reply to Email</option>
                    <option value="fetch_emails">Fetch Emails</option>
                    <option value="modify_email">Modify Labels</option>
                    <option value="delete_archive">Delete/Archive</option>
                </select>
            </div>

            {actionId === 'send_email' && (
                <>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">To</label>
                        <input type="text" placeholder="recipient@example.com" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.to || ''} onChange={(e) => updateData({ to: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">CC</label>
                            <input type="text" placeholder="cc@example.com" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.cc || ''} onChange={(e) => updateData({ cc: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">BCC</label>
                            <input type="text" placeholder="bcc@example.com" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.bcc || ''} onChange={(e) => updateData({ bcc: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Subject</label>
                        <input type="text" placeholder="Email Subject" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.subject || ''} onChange={(e) => updateData({ subject: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Thread ID (Optional)</label>
                        <input type="text" placeholder="To continue an existing thread" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.threadId || ''} onChange={(e) => updateData({ threadId: e.target.value })} />
                    </div>
                </>
            )}

            {actionId === 'reply_email' && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Message ID to Reply</label>
                    <input type="text" placeholder="Original Message ID" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.messageId || ''} onChange={(e) => updateData({ messageId: e.target.value })} />
                </div>
            )}

            {(actionId === 'send_email' || actionId === 'reply_email') && (
                <>
                    <div className="flex items-center gap-2 mt-2">
                        <input type="checkbox" id="isHtml" checked={!!data.isHtml} onChange={(e) => updateData({ isHtml: e.target.checked })} className="rounded cursor-pointer" />
                        <label htmlFor="isHtml" className="text-xs font-semibold text-[var(--fg)] cursor-pointer">Send as HTML</label>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Body</label>
                        <textarea placeholder="Email Content..." className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-32 outline-none focus:ring-1 focus:ring-primary-500 resize-none" value={data.body || ''} onChange={(e) => updateData({ body: e.target.value })} />
                    </div>
                </>
            )}

            {actionId === 'fetch_emails' && (
                <>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Search Query</label>
                        <input type="text" placeholder="is:unread label:important" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.query || ''} onChange={(e) => updateData({ query: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Label IDs</label>
                            <input type="text" placeholder="INBOX, UNREAD" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.labelIds || ''} onChange={(e) => updateData({ labelIds: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Max Results</label>
                            <input type="number" placeholder="10" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.maxResults || ''} onChange={(e) => updateData({ maxResults: e.target.value })} />
                        </div>
                    </div>
                </>
            )}

            {actionId === 'modify_email' && (
                <>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Message ID</label>
                        <input type="text" placeholder="Message ID to modify" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.messageId || ''} onChange={(e) => updateData({ messageId: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Add Labels</label>
                            <input type="text" placeholder="e.g. STARRED" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.addLabelIds || ''} onChange={(e) => updateData({ addLabelIds: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Remove Labels</label>
                            <input type="text" placeholder="e.g. UNREAD" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.removeLabelIds || ''} onChange={(e) => updateData({ removeLabelIds: e.target.value })} />
                        </div>
                    </div>
                </>
            )}

            {actionId === 'delete_archive' && (
                <>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Message ID</label>
                        <input type="text" placeholder="Message ID" className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500" value={data.messageId || ''} onChange={(e) => updateData({ messageId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Action</label>
                        <select
                            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                            value={data.actionType || 'trash'}
                            onChange={(e) => updateData({ actionType: e.target.value })}
                        >
                            <option value="trash">Move to Trash</option>
                            <option value="archive">Archive (Remove INBOX)</option>
                        </select>
                    </div>
                </>
            )}
        </div>
    );
}

export default function BuilderPage() {
    return (
        <Suspense fallback={<div>Loading Builder...</div>}>
            <BuilderContent />
        </Suspense>
    );
}

function BuilderContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [workflowId, setWorkflowId] = useState<string | null>(searchParams.get('id'));
    const [workflowName, setWorkflowName] = useState('Untitled Workflow');
    const [isExecuting, setIsExecuting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [executionLogs, setExecutionLogs] = useState<{ nodeId: string; status: string; timestamp: string; output?: any; error?: string }[]>([]);
    const [showConsole, setShowConsole] = useState(false);

    // Load workflow from Supabase
    useEffect(() => {
        if (!workflowId) {
            // New Workflow: Load Template with Unique IDs
            const id1 = crypto.randomUUID();
            const id2 = crypto.randomUUID();
            const id3 = crypto.randomUUID();

            setNodes([
                {
                    id: id1,
                    type: 'custom',
                    position: { x: 300, y: 50 },
                    data: { label: 'Schedule', type: 'trigger', config: { integrationId: 'cron', actionId: 'schedule', data: { cron: '0 * * * *' } } },
                },
                {
                    id: id2,
                    type: 'custom',
                    position: { x: 300, y: 200 },
                    data: { label: 'Google Gemini', type: 'ai_action', config: { integrationId: 'google_gemini', actionId: 'chat' } },
                },
                {
                    id: id3,
                    type: 'custom',
                    position: { x: 300, y: 350 },
                    data: { label: 'Discord Output', type: 'social_action', config: { integrationId: 'discord', actionId: 'send_message' } },
                },
            ]);
            setEdges([
                { id: crypto.randomUUID(), source: id1, target: id2, animated: true },
                { id: crypto.randomUUID(), source: id2, target: id3, animated: true },
            ]);
            return;
        }

        const loadWorkflow = async () => {
            const { data: wf } = await supabase.from('workflows').select('name').eq('id', workflowId).single();
            if (wf) setWorkflowName(wf.name);

            const { data: wfNodes } = await supabase.from('workflow_nodes').select('*').eq('workflow_id', workflowId);
            const { data: wfEdges } = await supabase.from('workflow_edges').select('*').eq('workflow_id', workflowId);

            if (wfNodes && wfNodes.length > 0) {
                setNodes(wfNodes.map(n => ({
                    id: n.id,
                    type: 'custom',
                    position: { x: n.position_x, y: n.position_y },
                    data: {
                        label: n.label,
                        type: n.type,
                        config: n.config
                    }
                })));
            }
            if (wfEdges) {
                setEdges(wfEdges.map(e => ({
                    id: e.id,
                    source: e.source_node_id,
                    target: e.target_node_id,
                    animated: true,
                    label: e.label
                })));
            }
        };

        loadWorkflow();
    }, [workflowId, supabase, setNodes, setEdges]);

    // Derive selected node from nodes state to ensure it's always up to date
    const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

    // Helper to update the selected node's data
    const updateNode = useCallback((newData: any) => {
        if (!selectedNodeId) return;
        setNodes(nds => nds.map(n =>
            n.id === selectedNodeId
                ? { ...n, data: { ...(n.data as any), ...newData } }
                : n
        ));
    }, [selectedNodeId, setNodes]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges],
    );

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const addNode = useCallback(
        (type: NodeType, label: string, integrationId?: string) => {
            setNodes((nds) => {
                const count = nds.filter(n => (n.data as any).type === type).length + 1;
                const id = crypto.randomUUID();
                const newNode: Node = {
                    id,
                    type: 'custom',
                    position: { x: 250 + Math.random() * 200, y: 200 + Math.random() * 200 },
                    data: {
                        label: `${label} ${count}`,
                        type,
                        config: integrationId ? { integrationId, actionId: registry.getIntegration(integrationId)?.actions[0]?.id } : {}
                    },
                };
                return [...nds, newNode];
            });
        },
        [setNodes],
    );

    const handleSave = async () => {
        setIsSaving(true);
        const toastId = toast.loading('Saving workflow...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            let currentWfId = workflowId;

            // 1. Create or Update Workflow metadata
            if (!currentWfId) {
                const { data: wf, error: wfErr } = await supabase
                    .from('workflows')
                    .insert({
                        user_id: user.id,
                        name: workflowName,
                        status: 'draft'
                    })
                    .select()
                    .single();

                if (wfErr) throw wfErr;
                currentWfId = wf.id;
                setWorkflowId(currentWfId);
                router.replace(`/builder?id=${currentWfId}`);
            } else {
                // Update Workflow metadata (name)
                await supabase.from('workflows').update({ name: workflowName }).eq('id', currentWfId);
            }

            // 2. Sync Nodes (Upsert)
            // For simplicity, we delete and re-insert for now to ensure consistency with ReactFlow state
            await supabase.from('workflow_nodes').delete().eq('workflow_id', currentWfId);
            const nodesToInsert = nodes.map(n => ({
                id: n.id,
                workflow_id: currentWfId,
                type: (n.data as any).type,
                label: (n.data as any).label,
                position_x: n.position.x,
                position_y: n.position.y,
                config: (n.data as any).config || {}
            }));

            const { error: nodesErr } = await supabase.from('workflow_nodes').insert(nodesToInsert);
            if (nodesErr) throw nodesErr;

            // 3. Sync Edges
            await supabase.from('workflow_edges').delete().eq('workflow_id', currentWfId);
            const edgesToInsert = edges.map(e => ({
                workflow_id: currentWfId,
                source_node_id: e.source,
                target_node_id: e.target,
                label: e.label || null
            }));

            const { error: edgesErr } = await supabase.from('workflow_edges').insert(edgesToInsert);
            if (edgesErr) throw edgesErr;

            toast.success('Workflow saved to cloud!', { id: toastId });
        } catch (error: any) {
            console.error('Save error details:', error);
            const errorMessage = error.message || error.details || 'Unknown error';
            toast.error(`Save failed: ${errorMessage}`, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRun = async () => {
        setIsExecuting(true);
        setExecutionLogs([]);
        setShowConsole(true);
        toast.loading('Starting engine...', { id: 'exec' });

        try {
            // 1. Map ReactFlow state to engine types
            const engineNodes: WorkflowNode[] = nodes.map(n => ({
                id: n.id,
                workflow_id: 'local',
                type: (n.data as any).type as NodeType,
                label: (n.data as any).label,
                position_x: n.position.x,
                position_y: n.position.y,
                config: (n.data as any).config || {},
                created_at: new Date().toISOString()
            }));

            const engineEdges: WorkflowEdge[] = edges.map(e => ({
                id: e.id,
                workflow_id: 'local',
                source_node_id: e.source,
                target_node_id: e.target,
                label: null,
                created_at: new Date().toISOString()
            }));

            // 2. Extract Trigger Data from Input Node
            const inputNode = nodes.find(n => (n.data as any).type === 'input');
            const triggerData = (inputNode?.data as any)?.config?.data || {};

            // 3. Initialize Runner
            const runner = new WorkflowRunner(engineNodes, engineEdges);

            // 4. Execute with live log updates
            toast.loading('Executing DAG...', { id: 'exec' });

            await runner.execute(triggerData, (log: RunLog) => {
                setExecutionLogs(prev => {
                    const existing = prev.findIndex(l => l.nodeId === log.nodeId);
                    const formattedLog = {
                        nodeId: log.nodeId,
                        status: log.status,
                        timestamp: new Date(log.timestamp).toLocaleTimeString(),
                        output: log.output,
                        error: log.error
                    };

                    if (existing !== -1) {
                        const newLogs = [...prev];
                        newLogs[existing] = formattedLog;
                        return newLogs;
                    }
                    return [...prev, formattedLog];
                });
            });

            toast.success('Execution completed!', { id: 'exec' });
        } catch (error: any) {
            console.error('Execution Error:', error);
            toast.error(`Error: ${error.message}`, { id: 'exec' });
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[var(--fg)]">Workflow Builder</h2>
                    <div className="w-px h-6 bg-[var(--border)] mx-2" />
                    <input
                        type="text"
                        value={workflowName}
                        onChange={(e) => setWorkflowName(e.target.value)}
                        placeholder="Name your worker..."
                        className="bg-transparent border-none text-sm font-medium text-[var(--muted-fg)] focus:text-[var(--fg)] outline-none w-64 px-2 py-1 rounded transition-colors"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" title="Undo">
                        <Undo2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Redo">
                        <Redo2 className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-[var(--border)] mx-1" />
                    <Button variant="ghost" size="icon" title="Export">
                        <Download className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRun}
                        disabled={isExecuting}
                    >
                        <Play className={cn("w-4 h-4", isExecuting && "animate-pulse text-primary-500")} />
                        {isExecuting ? 'Running...' : 'Run'}
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        <Save className={cn("w-4 h-4", isSaving && "animate-spin")} />
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex">
                {/* Node Palette */}
                <div className="w-56 border-r border-[var(--border)] bg-[var(--card)] p-4 hidden md:block">
                    <h3 className="text-xs font-semibold text-[var(--muted-fg)] uppercase tracking-wider mb-3">
                        Node Types
                    </h3>
                    <div className="space-y-2">
                        {paletteItems.map((item) => {
                            const colors = nodeColors[item.type];
                            return (
                                <button
                                    key={item.type + (item.integrationId || '')}
                                    onClick={() => addNode(item.type as NodeType, item.label, item.integrationId)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                                        'border border-[var(--border)]',
                                        'hover:bg-[var(--muted)] hover:border-primary-500/30',
                                        'transition-all duration-200 text-left group',
                                    )}
                                >
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
                                        <item.icon className={cn('w-4 h-4', colors.icon)} />
                                    </div>
                                    <span className="text-sm font-medium text-[var(--fg)]">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-[var(--bg)]"
                    >
                        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
                        <Controls className="!rounded-xl !border-[var(--border)]" />
                        <MiniMap
                            className="!rounded-xl !border-[var(--border)] !bg-[var(--card)]"
                            nodeColor="#8b5cf6"
                            maskColor="rgba(0,0,0,0.1)"
                        />
                    </ReactFlow>
                </div>

                {/* Node Settings Panel */}
                {selectedNode && (
                    <div className="w-80 border-l border-[var(--border)] bg-[var(--card)] flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2">
                                <div className={cn("p-1.5 rounded-lg", nodeColors[(selectedNode.data as any).type as any]?.bg)}>
                                    {(() => {
                                        const Icon = nodeIcons[(selectedNode.data as any).type as any] || Settings2;
                                        return <Icon className={cn("w-4 h-4", nodeColors[(selectedNode.data as any).type as any]?.icon)} />;
                                    })()}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--fg)]">Configuration</h3>
                                    <p className="text-[10px] text-[var(--muted-fg)] uppercase font-medium tracking-widest">
                                        {((selectedNode.data as any).type as string).replace('_', ' ')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedNodeId(null)}
                                className="p-1.5 rounded-lg text-[var(--muted-fg)] hover:bg-[var(--muted)] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Base Settings */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Display Name</label>
                                <input
                                    type="text"
                                    value={(selectedNode.data as any).label}
                                    onChange={(e) => updateNode({ label: e.target.value })}
                                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                                />
                            </div>

                            {/* Specialized Settings */}
                            <div className="pt-4 border-t border-[var(--border)]">
                                {(selectedNode.data as any).type === 'trigger' && (
                                    <TriggerConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                )}
                                {(selectedNode.data as any).type === 'ai_action' && (
                                    <AIConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                )}
                                {selectedNode.data.type === 'social_action' && (
                                    <CommunicationConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                )}
                                {selectedNode.data.type === 'api_action' && (
                                    <APIConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                )}
                                {selectedNode.data.type === 'logic_gate' && (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-3">
                                            <GitFork className="w-5 h-5 text-orange-500 mt-0.5" />
                                            <div>
                                                <div className="text-xs font-bold text-orange-600 dark:text-orange-400">Logic Gate</div>
                                                <div className="text-[10px] opacity-60">Route your workflow based on conditions.</div>
                                            </div>
                                        </div>
                                        <p className="text-xs italic text-[var(--muted-fg)]">Coming soon: Advanced branching and conditional IF/ELSE logic.</p>
                                    </div>
                                )}
                                {selectedNode.data.type === 'data_tool' && ((selectedNode.data.config as any)?.integrationId === 'google_calendar') && (
                                    <GoogleCalendarConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                )}
                                {selectedNode.data.type === 'data_tool' && ((selectedNode.data.config as any)?.integrationId === 'google_gmail') && (
                                    <GoogleGmailConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                )}
                                {['api_action', 'data_tool', 'input', 'output'].includes((selectedNode.data as any).type) && !((selectedNode.data.config as any)?.integrationId === 'google_calendar' || (selectedNode.data.config as any)?.integrationId === 'google_gmail') && (
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Advanced JSON Config</label>
                                        <textarea
                                            placeholder="Enter JSON config..."
                                            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--fg)] h-64 outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                                            value={JSON.stringify((selectedNode.data as any).config || {}, null, 2)}
                                            onChange={(e) => {
                                                try {
                                                    const config = JSON.parse(e.target.value);
                                                    updateNode({ config });
                                                } catch (err) { }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/50">
                            <Button
                                variant="danger"
                                size="sm"
                                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                onClick={() => {
                                    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                                    setEdges((eds) =>
                                        eds.filter(
                                            (e) =>
                                                e.source !== selectedNode.id && e.target !== selectedNode.id,
                                        ),
                                    );
                                    setSelectedNodeId(null);
                                    toast.success('Node removed from canvas');
                                }}
                            >
                                Delete Node
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Execution Console */}
            {showConsole && (
                <div className="h-64 border-t border-[var(--border)] bg-[var(--card)] flex flex-col animate-slide-up">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--muted)]">
                        <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", isExecuting ? "bg-primary-500 animate-pulse" : "bg-emerald-500")} />
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fg)]">
                                {isExecuting ? 'Execution Logs' : 'Run History'}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowConsole(false)}
                            className="p-1 rounded-lg text-[var(--muted-fg)] hover:bg-[var(--border)] transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
                        {executionLogs.length === 0 && (
                            <p className="text-[var(--muted-fg)] italic">No logs yet. Click "Run" to start.</p>
                        )}
                        {executionLogs.map((log, i) => (
                            <div key={i} className="flex gap-4 border-l-2 border-[var(--border)] pl-3 py-1">
                                <span className="text-[var(--muted-fg)] min-w-[80px]">{log.timestamp}</span>
                                <span className={cn(
                                    "font-bold uppercase",
                                    log.status === 'running' ? "text-primary-500" : "text-emerald-500"
                                )}>
                                    [{log.status}]
                                </span>
                                <span className="text-[var(--fg)]">
                                    Node <span className="text-primary-400">{log.nodeId}</span>:
                                    {log.status === 'running' ? ' Processing...' : ' Successful execution'}
                                </span>
                                {log.output && (
                                    <span className="text-[var(--muted-fg)] opacity-60 ml-auto truncate max-w-xs">
                                        {JSON.stringify(log.output)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
