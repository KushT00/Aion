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
    Save, Play, Undo2, Redo2, Download, Upload,
    Cpu, Globe, GitFork, ArrowRightCircle, MessageSquare,
    X, Zap, Settings2, Database, Clock, Search,
    Webhook as WebhookIcon, Calendar, Mail,
    BrainCircuit, Code2, SlidersHorizontal, Merge, Repeat,
    Send, FileSpreadsheet, FileText, Hash, Timer, Trash2, Terminal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { registry } from '@/lib/workflow/integrations/registry';
import { WorkflowRunner, RunLog } from '@/lib/workflow/runner';
import { WorkflowNode, WorkflowEdge, NodeType } from '@/types';
import { nodeTypes as customNodeTypes, nodeColors, nodeIcons } from '@/components/workflow/NodeComponents';
import { useIntegrations } from '@/hooks/useIntegrations';
import { GoogleConnectButton } from '@/components/workflow/GoogleConnectButton';
import {
    AIAgentConfig, IfElseConfig, SlackConfig, TelegramConfig,
    NotionConfig, SheetsConfig, OpenRouterConfig, CodeConfig,
    SetVariableConfig, DelayConfig,
} from '@/components/workflow/NodeConfigs';

// ─── Node type registration (custom components) ─────────────
const nodeTypes: NodeTypes = customNodeTypes as unknown as NodeTypes;

// ─── Node Palette Categories & Items ────────────────────────
type PaletteCategory = 'Triggers' | 'AI' | 'Communication' | 'Google' | 'Logic' | 'Utility';
// ─── Initial data ──────────────────────────────────────────
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// ─── Node Palette — all nodes grouped by category ──────────
const paletteCategories: { category: PaletteCategory; color: string; items: any[] }[] = [
    {
        category: 'Triggers',
        color: 'text-amber-400',
        items: [
            { type: 'trigger', label: 'Schedule', icon: Clock, integrationId: 'cron', nodeType: 'custom' },
            { type: 'trigger', label: 'Webhook', icon: WebhookIcon, integrationId: 'webhook', nodeType: 'custom' },
            { type: 'trigger', label: 'Gmail Trigger', icon: Mail, integrationId: 'google_gmail_trigger', nodeType: 'custom' },
        ],
    },
    {
        category: 'AI',
        color: 'text-violet-400',
        items: [
            { type: 'ai_action', label: 'AI Agent', icon: BrainCircuit, integrationId: 'google_gemini', nodeType: 'ai_agent', actionId: 'chat' },
            { type: 'ai_action', label: 'Google Gemini', icon: Cpu, integrationId: 'google_gemini', nodeType: 'custom', actionId: 'chat' },
            { type: 'ai_action', label: 'OpenAI GPT', icon: Cpu, integrationId: 'openai', nodeType: 'custom', actionId: 'chat' },
            { type: 'ai_action', label: 'Groq (Llama)', icon: Cpu, integrationId: 'groq', nodeType: 'custom', actionId: 'chat' },
            { type: 'ai_action', label: 'OpenRouter', icon: Globe, integrationId: 'openrouter', nodeType: 'custom', actionId: 'chat' },
        ],
    },
    {
        category: 'Communication',
        color: 'text-indigo-400',
        items: [
            { type: 'social_action', label: 'Discord', icon: Hash, integrationId: 'discord', nodeType: 'custom', actionId: 'send_message' },
            { type: 'social_action', label: 'Slack', icon: Hash, integrationId: 'slack', nodeType: 'custom', actionId: 'send_message' },
            { type: 'social_action', label: 'Telegram', icon: Send, integrationId: 'telegram', nodeType: 'custom', actionId: 'send_message' },
        ],
    },
    {
        category: 'Google',
        color: 'text-blue-400',
        items: [
            { type: 'data_tool', label: 'Gmail', icon: Mail, integrationId: 'google_gmail', nodeType: 'custom', actionId: 'send_email' },
            { type: 'data_tool', label: 'Google Calendar', icon: Calendar, integrationId: 'google_calendar', nodeType: 'custom', actionId: 'get_events' },
            { type: 'data_tool', label: 'Google Sheets', icon: FileSpreadsheet, integrationId: 'google_sheets', nodeType: 'custom', actionId: 'append_row' },
        ],
    },
    {
        category: 'Logic',
        color: 'text-orange-400',
        items: [
            { type: 'logic_gate', label: 'IF / ELSE', icon: GitFork, integrationId: 'if_else', nodeType: 'if_else', actionId: 'condition' },
            { type: 'logic_gate', label: 'Loop', icon: Repeat, integrationId: 'loop', nodeType: 'custom', actionId: 'for_each' },
            { type: 'data_tool', label: 'Merge', icon: Merge, integrationId: 'merge', nodeType: 'custom', actionId: 'combine' },
        ],
    },
    {
        category: 'Utility',
        color: 'text-emerald-400',
        items: [
            { type: 'api_action', label: 'HTTP Request', icon: Globe, integrationId: 'api', nodeType: 'custom', actionId: 'request' },
            { type: 'data_tool', label: 'Notion', icon: FileText, integrationId: 'notion', nodeType: 'custom', actionId: 'create_page' },
            { type: 'data_tool', label: 'Code (JS)', icon: Code2, integrationId: 'code', nodeType: 'custom', actionId: 'run_js' },
            { type: 'data_tool', label: 'Set Variable', icon: SlidersHorizontal, integrationId: 'set_variable', nodeType: 'custom', actionId: 'set' },
            { type: 'data_tool', label: 'Delay / Wait', icon: Timer, integrationId: 'delay', nodeType: 'custom', actionId: 'wait' },
        ],
    },
];
// Flat list for drag-drop
const paletteItems = paletteCategories.flatMap(c => c.items);

// ─── Helper for Google Connection status across configs ──────
function GoogleConnectionSection({ scope = 'all' }: { scope?: any }) {
    const { getIntegration, connectGoogle } = useIntegrations();
    const integration = getIntegration('google');

    return (
        <GoogleConnectButton
            isConnected={!!integration}
            isValid={integration?.is_valid}
            accountEmail={integration?.account_email}
            onConnect={() => connectGoogle(scope)}
            onDisconnect={() => { }}
        />
    );
}

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
        <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500 mt-0.5" />
                <div>
                    <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">Discord Webhook</div>
                    <div className="text-[9px] opacity-60">Send automated messages.</div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight ml-1">Webhook URL</label>
                <input
                    type="text"
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[11px] font-mono text-[var(--fg)] outline-none focus:ring-1 focus:ring-indigo-500"
                    value={data.webhookUrl || ''}
                    onChange={(e) => updateData({ webhookUrl: e.target.value })}
                />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight ml-1">Message Content</label>
                <textarea
                    placeholder="Message: {{AI Action.text}}"
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-[11px] text-[var(--fg)] h-24 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
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
        <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight ml-1">Trigger Type</label>
                <div className="flex bg-[var(--muted)] p-1 rounded-lg gap-1">
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'cron', actionId: 'schedule' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all", isCron ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)]" : "opacity-60")}
                    >
                        Schedule
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'webhook', actionId: 'receive' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all", isWebhook ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)]" : "opacity-60")}
                    >
                        Webhook
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'google_gmail_trigger', actionId: 'on_new_email' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all flex items-center justify-center gap-1", isGmail ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)] text-red-600 dark:text-red-400" : "opacity-60")}
                    >
                        <Mail className="w-2.5 h-2.5" /> Gmail
                    </button>
                </div>
            </div>

            {isCron && (
                <div className="space-y-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight ml-1">Cron Expression</label>
                        <input
                            type="text"
                            placeholder="* * * * *"
                            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--fg)] outline-none focus:ring-1 focus:ring-amber-500"
                            value={data.cron || '0 * * * *'}
                            onChange={(e) => updateData({ cron: e.target.value })}
                        />
                        <div className="text-[9px] text-amber-600 dark:text-amber-400 font-mono ml-1">
                            Runs: Every hour at minute 0
                        </div>
                    </div>
                </div>
            )}

            {(isWebhook || isGmail) && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight ml-1">Endpoint (Production)</label>
                    {isGmail && (
                        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                            <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight ml-1">Account Connection</label>
                            <GoogleConnectionSection scope="gmail" />
                            <p className="text-[9px] opacity-60 italic text-red-600 dark:text-red-400 leading-tight">Step 1: Connect your account above.<br />Step 2: Config Gmail to forward to the URL below.</p>
                        </div>
                    )}
                    <div className="relative group">
                        <div className="p-2 bg-[var(--muted)] rounded-lg border border-dashed border-[var(--border)] text-[9px] font-mono break-all text-primary-600 dark:text-primary-400">
                            {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/${workflowId || 'SAVE_FIRST'}/${node.id}` : ''}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                                const url = `${window.location.origin}/api/webhooks/${workflowId || 'SAVE_FIRST'}/${node.id}`;
                                navigator.clipboard.writeText(url);
                                toast.success('Copied!');
                            }}
                        >
                            <Upload className="w-2.5 h-2.5" />
                        </Button>
                    </div>
                    {!isGmail && (
                        <p className="text-[9px] opacity-60 italic leading-tight">Send POST JSON to trigger.</p>
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
        updateNode({ config: { ...config, data: { ...data, ...kv } } });
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
                    <div className="text-[10px] opacity-60">Manage your events and schedule.</div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Account Connection</label>
                <GoogleConnectionSection scope="calendar" />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Manual Token (Optional Override)</label>
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
        updateNode({ config: { ...config, data: { ...data, ...kv } } });
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

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Account Connection</label>
                <GoogleConnectionSection scope="gmail" />
                <p className="text-[9px] text-[var(--muted-fg)] leading-relaxed italic mt-1">Users connect their own Google account when deploying this worker.</p>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Manual Token (Optional Override)</label>
                <input
                    type="password"
                    placeholder="Paste OAuth2 Access Token"
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500"
                    value={data.accessToken || ''}
                    onChange={(e) => updateData({ accessToken: e.target.value })}
                />
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
    const [paletteSearch, setPaletteSearch] = useState('');

    // Google integration status
    const { isConnected: isGoogleConnected, getIntegration, connectGoogle, getAccessToken, disconnect: disconnectIntegration, refresh: refreshIntegrations } = useIntegrations();

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
                setNodes(wfNodes.map(n => {
                    // Determine correct React Flow node type from config
                    const integId = (n.config as any)?.integrationId;
                    let rfType = 'custom';
                    if (integId === 'if_else') rfType = 'if_else';
                    else if ((n.config as any)?.rfType === 'ai_agent') rfType = 'ai_agent';
                    return {
                        id: n.id,
                        type: rfType,
                        position: { x: n.position_x, y: n.position_y },
                        data: { label: n.label, type: n.type, config: n.config }
                    };
                }));
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
        (type: NodeType, label: string, integrationId?: string, nodeType: string = 'custom', actionId?: string) => {
            setNodes((nds) => {
                const count = nds.filter(n => (n.data as any).label?.startsWith(label)).length + 1;
                const id = crypto.randomUUID();
                const defaultActionId = actionId || registry.getIntegration(integrationId || '')?.actions[0]?.id;
                const newNode: Node = {
                    id,
                    type: nodeType,
                    position: { x: 250 + Math.random() * 200, y: 200 + Math.random() * 200 },
                    data: {
                        label: count > 1 ? `${label} ${count}` : label,
                        type,
                        config: integrationId ? { integrationId, actionId: defaultActionId } : {}
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

        let runner: WorkflowRunner | null = null;
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

            // 3. Initialize Runner with environment context (tokens)
            const googleToken = await getAccessToken('google');
            const env: Record<string, string> = {};
            if (googleToken) {
                env.GOOGLE_ACCESS_TOKEN = googleToken;
            }

            runner = new WorkflowRunner(engineNodes, engineEdges, env);

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

            // Add error log to the console if it failed at a specific node
            const lastLog = runner?.getLogs().slice(-1)[0];
            if (lastLog) {
                setExecutionLogs(prev => {
                    const existing = prev.findIndex(l => l.nodeId === lastLog.nodeId);
                    const errorLog = {
                        nodeId: lastLog.nodeId,
                        status: 'error' as any,
                        timestamp: new Date().toLocaleTimeString(),
                        error: error.message
                    };
                    if (existing !== -1) {
                        const newLogs = [...prev];
                        newLogs[existing] = { ...newLogs[existing], ...errorLog };
                        return newLogs;
                    }
                    return [...prev, errorLog];
                });
            }

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
                    <div className="w-px h-6 bg-[var(--border)] mx-1" />
                    <Button
                        variant={showConsole ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setShowConsole(!showConsole)}
                        className={cn(showConsole && "bg-primary-500/10 text-primary-500 hover:bg-primary-500/20")}
                    >
                        <Terminal className="w-4 h-4" />
                        Console {executionLogs.length > 0 && `(${executionLogs.length})`}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex">
                {/* Node Palette — categorized with search */}
                <div className="w-56 border-r border-[var(--border)] bg-[var(--card)]/50 flex flex-col hidden md:flex">
                    {/* Search */}
                    <div className="p-2.5 border-b border-[var(--border)]">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--muted-fg)]" />
                            <input
                                placeholder="Filter nodes..."
                                value={paletteSearch}
                                onChange={e => setPaletteSearch(e.target.value)}
                                className="w-full pl-7 pr-2 py-1.5 text-[11px] bg-[var(--muted)] border border-[var(--border)] rounded-md text-[var(--fg)] outline-none focus:ring-1 focus:ring-violet-500"
                            />
                        </div>
                    </div>
                    {/* Categories */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-3 custom-scrollbar">
                        {paletteCategories.map(cat => {
                            const filteredItems = cat.items.filter(item =>
                                !paletteSearch || item.label.toLowerCase().includes(paletteSearch.toLowerCase())
                            );
                            if (filteredItems.length === 0) return null;
                            return (
                                <div key={cat.category}>
                                    <p className={cn('text-[9px] font-bold uppercase tracking-[0.1em] mb-1.5 opacity-70 ml-1', cat.color)}>
                                        {cat.category}
                                    </p>
                                    <div className="space-y-0.5">
                                        {filteredItems.map(item => (
                                            <button
                                                key={item.label + item.integrationId}
                                                onClick={() => addNode(item.type as NodeType, item.label, item.integrationId, item.nodeType, item.actionId)}
                                                draggable
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-transparent hover:border-[var(--border)] hover:bg-[var(--muted)] transition-all text-left group"
                                            >
                                                <div className="w-6 h-6 rounded-md bg-[var(--muted)] flex items-center justify-center shrink-0 group-hover:bg-[var(--card)] transition-colors">
                                                    <item.icon className="w-3 h-3 text-[var(--muted-fg)] group-hover:text-violet-400 transition-colors" />
                                                </div>
                                                <span className="text-[11px] font-medium text-[var(--fg)] truncate">{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Workflow Canvas */}
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
                        minZoom={0.2}
                        maxZoom={1.5}
                        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                        snapToGrid={true}
                        snapGrid={[15, 15]}
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
                    <div className="w-72 border-l border-[var(--border)] bg-[var(--card)] flex flex-col animate-in slide-in-from-right duration-300 shadow-xl">
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)] bg-[var(--muted)]/30">
                            <div className="flex items-center gap-2">
                                <div className={cn("p-1.5 rounded-lg", nodeColors[(selectedNode.data as any).type as any]?.bg)}>
                                    {(() => {
                                        const Icon = nodeIcons[(selectedNode.data as any).type as any] || Settings2;
                                        return <Icon className={cn("w-3.5 h-3.5", nodeColors[(selectedNode.data as any).type as any]?.icon)} />;
                                    })()}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs font-bold text-[var(--fg)] leading-none truncate">Settings</h3>
                                    <p className="text-[8px] text-[var(--muted-fg)] uppercase font-semibold tracking-wider mt-0.5 truncate">
                                        {((selectedNode.data as any).type as string).replace('_', ' ')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    title="Delete Node"
                                    onClick={() => {
                                        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                                        setEdges((eds) =>
                                            eds.filter(
                                                (e) =>
                                                    e.source !== selectedNode.id && e.target !== selectedNode.id,
                                            ),
                                        );
                                        setSelectedNodeId(null);
                                        toast.success('Node deleted');
                                    }}
                                    className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setSelectedNodeId(null)}
                                    className="p-1 rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)] transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                            {/* Base Settings */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[var(--muted-fg)] uppercase tracking-tight ml-0.5 opacity-70">Label</label>
                                <input
                                    type="text"
                                    value={(selectedNode.data as any).label}
                                    onChange={(e) => updateNode({ label: e.target.value })}
                                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[11px] text-[var(--fg)] outline-none focus:ring-1 focus:ring-primary-500 font-medium"
                                />
                            </div>

                            {/* Specialized Settings dispatcher */}
                            <div className="pt-3 border-t border-[var(--border)]">
                                {(() => {
                                    const nodeData = selectedNode.data as any;
                                    const integId = nodeData?.config?.integrationId;

                                    // Trigger nodes
                                    if (nodeData.type === 'trigger') return (
                                        <TriggerConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                    );

                                    // AI Agent (multi-panel)
                                    if (nodeData.type === 'ai_action' && selectedNode.type === 'ai_agent') return (
                                        <AIAgentConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // Standard AI node
                                    if (nodeData.type === 'ai_action') return (
                                        integId === 'openrouter'
                                            ? <OpenRouterConfig node={selectedNode} updateNode={updateNode} />
                                            : <AIConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                    );

                                    // IF/ELSE
                                    if (integId === 'if_else') return (
                                        <IfElseConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // Communication nodes
                                    if (nodeData.type === 'social_action') {
                                        if (integId === 'slack') return <SlackConfig node={selectedNode} updateNode={updateNode} />;
                                        if (integId === 'telegram') return <TelegramConfig node={selectedNode} updateNode={updateNode} />;
                                        return <CommunicationConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />;
                                    }

                                    // Google nodes
                                    const googleIntegration = getIntegration('google');
                                    if (integId === 'google_calendar') return (
                                        <GoogleCalendarConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                    );
                                    if (integId === 'google_gmail') return (
                                        <GoogleGmailConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                    );
                                    if (integId === 'google_sheets') return (
                                        <SheetsConfig
                                            node={selectedNode}
                                            updateNode={updateNode}
                                            googleIntegration={googleIntegration}
                                            onConnectGoogle={() => connectGoogle('all')}
                                        />
                                    );

                                    // Notion
                                    if (integId === 'notion') return <NotionConfig node={selectedNode} updateNode={updateNode} />;

                                    // Code
                                    if (integId === 'code') return <CodeConfig node={selectedNode} updateNode={updateNode} />;

                                    // Set Variable
                                    if (integId === 'set_variable') return <SetVariableConfig node={selectedNode} updateNode={updateNode} />;

                                    // Delay
                                    if (integId === 'delay') return <DelayConfig node={selectedNode} updateNode={updateNode} />;

                                    // HTTP Request
                                    if (nodeData.type === 'api_action') return (
                                        <APIConfiguration node={selectedNode} updateNode={updateNode} workflowId={workflowId} />
                                    );

                                    // Fallback — raw JSON
                                    return (
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-[var(--muted-fg)] uppercase tracking-tight ml-0.5">JSON Config</label>
                                            <textarea
                                                className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[10px] font-mono text-[var(--fg)] h-32 outline-none focus:ring-1 focus:ring-violet-500 resize-none shadow-inner"
                                                value={JSON.stringify(nodeData.config || {}, null, 2)}
                                                onChange={e => { try { updateNode({ config: JSON.parse(e.target.value) }); } catch { } }}
                                            />
                                        </div>
                                    );
                                })()}
                            </div>
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
                            <div key={i} className={cn(
                                "flex flex-col gap-1 border-l-2 pl-3 py-2 transition-colors",
                                log.status === 'running' ? "border-primary-500 bg-primary-500/5" :
                                    log.status === 'error' ? "border-red-500 bg-red-500/5" : "border-emerald-500 bg-emerald-500/5"
                            )}>
                                <div className="flex items-center gap-4">
                                    <span className="text-[var(--muted-fg)] min-w-[80px] font-mono">{log.timestamp}</span>
                                    <span className={cn(
                                        "font-bold uppercase text-[10px] px-1.5 py-0.5 rounded",
                                        log.status === 'running' ? "bg-primary-500/20 text-primary-500" :
                                            log.status === 'error' ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"
                                    )}>
                                        {log.status}
                                    </span>
                                    <span className="text-[var(--fg)] font-medium">
                                        Node <span className="text-primary-400">{log.nodeId}</span>
                                    </span>
                                </div>
                                <div className="text-[11px] mt-1">
                                    {log.status === 'running' && <span className="text-[var(--muted-fg)]">Processing node logic...</span>}
                                    {log.status === 'success' && <span className="text-emerald-500/80">Execution completed successfully.</span>}
                                    {log.status === 'error' && (
                                        <div className="space-y-1">
                                            <span className="text-red-500 font-bold">Error:</span>
                                            <p className="text-red-400 bg-red-950/20 p-2 rounded border border-red-500/20 break-words">
                                                {log.error || 'Unknown error occurred'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {log.output && (
                                    <div className="mt-2 bg-[var(--muted)] p-2 rounded text-[10px] text-[var(--muted-fg)] border border-[var(--border)] overflow-x-auto">
                                        <div className="font-bold mb-1 opacity-50 uppercase tracking-tighter">Output Data</div>
                                        <pre>{JSON.stringify(log.output, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
