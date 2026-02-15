'use client';

import { useCallback, useMemo, useState } from 'react';
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
const initialNodes: Node[] = [
    {
        id: '1',
        type: 'custom',
        position: { x: 300, y: 50 },
        data: { label: 'Schedule', type: 'trigger', config: { integrationId: 'cron', actionId: 'schedule', data: { cron: '0 * * * *' } } },
    },
    {
        id: '2',
        type: 'custom',
        position: { x: 300, y: 200 },
        data: { label: 'Google Gemini', type: 'ai_action', config: { integrationId: 'google_gemini', actionId: 'chat' } },
    },
    {
        id: '5',
        type: 'custom',
        position: { x: 300, y: 350 },
        data: { label: 'Discord Output', type: 'social_action', config: { integrationId: 'discord', actionId: 'send_message' } },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-5', source: '2', target: '5', animated: true },
];

// ─── Node Palette ──────────────────────────────────────────
const paletteItems = [
    { type: 'trigger', label: 'Trigger', icon: Zap, integrationId: 'cron' },
    { type: 'ai_action', label: 'AI Engine', icon: Cpu, integrationId: 'google_gemini' },
    { type: 'social_action', label: 'Discord', icon: MessageSquare, integrationId: 'discord' },
    { type: 'logic_gate', label: 'Logic', icon: GitFork, integrationId: 'logic' },
    { type: 'api_action', label: 'HTTP Request', icon: Globe, integrationId: 'api' },
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

function AIConfiguration({ node, updateNode }: { node: any, updateNode: (data: any) => void }) {
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

function CommunicationConfiguration({ node, updateNode }: { node: any, updateNode: (data: any) => void }) {
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

function APIConfiguration({ node, updateNode }: { node: any, updateNode: (data: any) => void }) {
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

function TriggerConfiguration({ node, updateNode }: { node: any, updateNode: (data: any) => void }) {
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

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Trigger Type</label>
                <div className="flex bg-[var(--muted)] p-1 rounded-lg">
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'cron', actionId: 'schedule' } })}
                        className={cn("flex-1 px-3 py-1.5 rounded-md text-xs transition-all", isCron ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)]" : "opacity-60")}
                    >
                        Schedule
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'webhook', actionId: 'receive' } })}
                        className={cn("flex-1 px-3 py-1.5 rounded-md text-xs transition-all", !isCron ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)]" : "opacity-60")}
                    >
                        Webhook
                    </button>
                </div>
            </div>

            {isCron ? (
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
            ) : (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight">Webhook Endpoint</label>
                    <div className="p-3 bg-[var(--muted)] rounded-lg border border-dashed border-[var(--border)] text-[10px] font-mono opacity-60">
                        POST /api/webhooks/{node.id}
                    </div>
                    <p className="text-[10px] opacity-60 italic">Send a POST request to this endpoint to trigger the workflow.</p>
                </div>
            )}
        </div>
    );
}

// ─── Builder Page ──────────────────────────────────────────
export default function BuilderPage() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionLogs, setExecutionLogs] = useState<{ nodeId: string; status: string; timestamp: string; output?: any; error?: string }[]>([]);
    const [showConsole, setShowConsole] = useState(false);

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
                const id = `${type.replace('_', '-')}-${count}`;
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

    const handleSave = () => {
        const workflowData = { nodes, edges };
        console.log('Saving workflow:', JSON.stringify(workflowData, null, 2));
        toast.success('Workflow saved successfully!');
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
                    <Button size="sm" onClick={handleSave}>
                        <Save className="w-4 h-4" />
                        Save
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
                                    <TriggerConfiguration node={selectedNode} updateNode={updateNode} />
                                )}
                                {(selectedNode.data as any).type === 'ai_action' && (
                                    <AIConfiguration node={selectedNode} updateNode={updateNode} />
                                )}
                                {selectedNode.data.type === 'social_action' && (
                                    <CommunicationConfiguration node={selectedNode} updateNode={updateNode} />
                                )}
                                {selectedNode.data.type === 'api_action' && (
                                    <APIConfiguration node={selectedNode} updateNode={updateNode} />
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
                                {['api_action', 'data_tool', 'input', 'output'].includes((selectedNode.data as any).type) && (
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
