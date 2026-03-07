'use client';

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from 'react';
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
    useReactFlow,
    useNodeConnections,
    type Connection,
    type Node,
    type Edge,
    type NodeTypes,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Save, Play, Undo2, Redo2, Download, Upload,
    Cpu, Globe, GitFork, ArrowRightCircle, MessageSquare,
    X, Zap, Settings2, Database, Clock, Search, Info,
    Webhook as WebhookIcon, Calendar, Mail,
    BrainCircuit, Code2, SlidersHorizontal, Merge, Repeat,
    Send, FileSpreadsheet, FileText, Hash, Timer, Trash2, Terminal, Activity, Sparkles, RotateCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { registry } from '@/lib/workflow/integrations/registry';
import { WorkflowRunner, RunLog } from '@/lib/workflow/runner';
import { WorkflowNode, WorkflowEdge, NodeType } from '@/types';
import { nodeTypes as customNodeTypes, nodeColors, nodeIcons } from '@/components/workflow/NodeComponents';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useAuth } from '@/hooks/use-auth';
import { GoogleConnectButton } from '@/components/workflow/GoogleConnectButton';
import {
    AIAgentConfig, IfElseConfig, SwitchConfig, FilterConfig, ParallelConfig, ConditionGroupConfig, RetryConfig, SlackConfig, TelegramConfig,
    NotionConfig, SheetsConfig, DocsConfig, CodeConfig, ModelSelector,
    SetVariableConfig, DelayConfig, AIConfig, GoogleCalendarConfig,
    GoogleGmailConfig, DiscordConfig, APIConfig, ToolConfig, MemoryConfig, LoopConfig,
    Input, Label
} from '@/components/workflow/NodeConfigs';
import { PublishingPanel } from '@/components/workflow/PublishingPanel';

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
            { type: 'trigger', label: 'Telegram Message', icon: Send, integrationId: 'telegram', nodeType: 'custom', actionId: 'telegram_message' },
            { type: 'trigger', label: 'Gmail Trigger', icon: Mail, integrationId: 'google_gmail_trigger', nodeType: 'custom' },
        ],
    },
    {
        category: 'AI',
        color: 'text-violet-400',
        items: [
            { type: 'ai_action', label: 'AI Agent', icon: BrainCircuit, integrationId: 'google_gemini', nodeType: 'ai_agent', actionId: 'chat' },
            { type: 'ai_action', label: 'Chat AI', icon: Cpu, integrationId: 'google_gemini', nodeType: 'custom', actionId: 'chat' },
            { type: 'chat_model', label: 'Chat Model', icon: Cpu, integrationId: 'google_gemini', nodeType: 'custom', actionId: 'model' },
            { type: 'memory', label: 'Memory Session', icon: Database, integrationId: 'memory', nodeType: 'custom', actionId: 'session' },
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
            { type: 'data_tool', label: 'Google Docs', icon: FileText, integrationId: 'google_docs', nodeType: 'custom', actionId: 'create_doc' },
        ],
    },
    {
        category: 'Logic',
        color: 'text-orange-400',
        items: [
            { type: 'logic_gate', label: 'IF / ELSE', icon: GitFork, integrationId: 'if_else', nodeType: 'if_else', actionId: 'condition' },
            { type: 'logic_gate', label: 'Switch', icon: GitFork, integrationId: 'switch', nodeType: 'switch', actionId: 'evaluate' },
            { type: 'logic_gate', label: 'Filter', icon: Activity, integrationId: 'filter', nodeType: 'custom', actionId: 'filter' },
            { type: 'logic_gate', label: 'Parallel', icon: GitFork, integrationId: 'parallel', nodeType: 'custom', actionId: 'split' },
            { type: 'logic_gate', label: 'Condition Group', icon: SlidersHorizontal, integrationId: 'condition_group', nodeType: 'custom', actionId: 'evaluate' },
            { type: 'logic_gate', label: 'Loop', icon: Repeat, integrationId: 'loop', nodeType: 'custom', actionId: 'for_each' },
            { type: 'logic_gate', label: 'Retry', icon: Repeat, integrationId: 'retry', nodeType: 'custom', actionId: 'retry' },
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
            { type: 'tool', label: 'File Tool', icon: WebhookIcon, integrationId: 'tool', nodeType: 'custom', actionId: 'file_reader' },
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
    const isTelegram = config.integrationId === 'telegram';
    const isWebhook = config.integrationId === 'webhook' || (!isCron && !isGmail && !isTelegram);

    // Professional: Auto-detect environment base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const webhookUrl = `${baseUrl}/api/webhooks/${workflowId || 'SAVE_FIRST'}/${node.id}`;

    const handleTelegramSync = async () => {
        if (!data.botToken) {
            toast.error('Bot Token is required to sync');
            return;
        }

        let finalBaseUrl = baseUrl;

        // Smart Handle for Localhost (No UI clutter)
        if (!finalBaseUrl.startsWith('https://')) {
            const manualUrl = window.prompt(
                'Telegram Requires HTTPS.\n\nPlease paste your Ngrok link below (or use Vercel for production):',
                'https://your-tunnel.ngrok-free.app'
            );

            if (!manualUrl) return;
            if (!manualUrl.startsWith('https://')) {
                toast.error('The provided URL must start with https://');
                return;
            }
            // Strip trailing slash if present
            finalBaseUrl = manualUrl.endsWith('/') ? manualUrl.slice(0, -1) : manualUrl;
        }

        if (!workflowId) {
            toast.error('Save the workflow first!');
            return;
        }

        const finalWebhookUrl = `${finalBaseUrl}/api/webhooks/${workflowId}/${node.id}`;
        const tid = toast.loading(`Connecting to Telegram...`);

        try {
            const res = await fetch(`https://api.telegram.org/bot${data.botToken}/setWebhook?url=${finalWebhookUrl}`);
            const result = await res.json();
            if (result.ok) {
                toast.success('Bot synced successfully!', { id: tid });
            } else {
                toast.error(`Sync failed: ${result.description}`, { id: tid });
            }
        } catch (err: any) {
            toast.error(`Error: ${err.message}`, { id: tid });
        }
    };

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight ml-1">Trigger Type</label>
                <div className="flex bg-[var(--muted)] p-1 rounded-lg gap-1">
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'cron', actionId: 'schedule' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all", isCron ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)]" : "opacity-60")}
                    >
                        Cron
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'webhook', actionId: 'receive' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all", isWebhook ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)]" : "opacity-60")}
                    >
                        Webhook
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'telegram', actionId: 'telegram_message' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all", isTelegram ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)] text-sky-500" : "opacity-60")}
                    >
                        Telegram
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'google_gmail_trigger', actionId: 'on_new_email' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all flex items-center justify-center gap-1", isGmail ? "bg-[var(--card)] shadow-sm font-bold border border-[var(--border)] text-red-600 dark:text-red-400" : "opacity-60")}
                    >
                        Gmail
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

            {isTelegram && (
                <div className="space-y-3 p-2.5 bg-sky-500/5 border border-sky-500/10 rounded-lg">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-sky-400 uppercase tracking-tight">Bot Token</label>
                        <input
                            type="password"
                            placeholder="123456... BotFather Token"
                            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[11px] text-[var(--fg)] outline-none focus:ring-1 focus:ring-sky-500"
                            value={data.botToken || ''}
                            onChange={(e) => updateData({ botToken: e.target.value })}
                        />
                    </div>

                    <Button
                        size="sm"
                        className="w-full h-8 text-xs bg-sky-500 hover:bg-sky-600 text-white gap-2"
                        onClick={handleTelegramSync}
                    >
                        <Zap className="w-3 h-3" />
                        Sync Bot Webhook
                    </Button>

                    {typeof window !== 'undefined' && !window.location.origin.startsWith('https://') && (
                        <p className="text-[8px] text-amber-500/60 leading-tight">
                            Note: Telegram requires HTTPS. For local testing, ensure your dev URL is accessible via tunnel.
                        </p>
                    )}
                </div>
            )}

            {(isWebhook || isGmail || isTelegram) && (
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-tight ml-1">
                        {isTelegram ? 'Final Webhook URL' : 'Endpoint (Production)'}
                    </label>
                    <div className="relative group">
                        <div className="p-2 bg-[var(--muted)] rounded-lg border border-dashed border-[var(--border)] text-[9px] font-mono break-all text-primary-600 dark:text-primary-400">
                            {webhookUrl}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                                navigator.clipboard.writeText(webhookUrl);
                                toast.success('Copied!');
                            }}
                        >
                            <Upload className="w-2.5 h-2.5" />
                        </Button>
                    </div>
                </div>
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
    const { user } = useAuth();

    // Stable, component-scoped Supabase client
    const supabase = useMemo(() => createClient(), []);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [workflowId, setWorkflowId] = useState<string | null>(searchParams.get('id'));
    const [workflowName, setWorkflowName] = useState('Untitled Workflow');
    const [isExecuting, setIsExecuting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [executionLogs, setExecutionLogs] = useState<{ nodeId: string; status: string; timestamp: string; output?: any; error?: string }[]>([]);
    const [showConsole, setShowConsole] = useState(false);
    const [activeConsoleTab, setActiveConsoleTab] = useState<'logs' | 'history'>('logs');
    const [cloudRunHistory, setCloudRunHistory] = useState<any[]>([]);
    const [paletteSearch, setPaletteSearch] = useState('');
    const [consoleHeight, setConsoleHeight] = useState(300);
    const [isResizing, setIsResizing] = useState(false);
    const [isPublishingPanelOpen, setIsPublishingPanelOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Resizing logic for console
    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        const newHeight = window.innerHeight - e.clientY;
        // Min 100px, Max 80vh
        if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
            setConsoleHeight(newHeight);
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = JSON.parse(event.target?.result as string);
                if (content.nodes && Array.isArray(content.nodes) && content.edges && Array.isArray(content.edges)) {
                    setNodes(content.nodes);
                    setEdges(content.edges);
                    if (content.name) setWorkflowName(content.name + ' (Imported)');
                    toast.success('Workflow imported successfully!');
                } else {
                    toast.error('Invalid workflow file format');
                }
            } catch (err) {
                toast.error('Failed to parse workflow file');
                console.error(err);
            }
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    // Google integration status
    const { isConnected: isGoogleConnected, getIntegration, connectGoogle, getAccessToken, disconnect: disconnectIntegration, refresh: refreshIntegrations } = useIntegrations();

    // Load workflow from Supabase or Local Storage
    useEffect(() => {
        if (!workflowId) {
            // Try loading local draft
            try {
                const savedNodes = localStorage.getItem('builder_nodes');
                const savedEdges = localStorage.getItem('builder_edges');
                if (savedNodes && savedEdges) {
                    const parsedNodes = JSON.parse(savedNodes);
                    if (parsedNodes.length > 0) {
                        setNodes(parsedNodes);
                        setEdges(JSON.parse(savedEdges));
                        return;
                    }
                }
            } catch (e) {
                console.error('Failed to load local draft', e);
            }

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
                    type: 'ai_agent',
                    position: { x: 300, y: 200 },
                    data: { label: 'AI Agent', type: 'ai_action', config: { integrationId: 'google_gemini', actionId: 'chat' } },
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
            if (!user) {
                console.warn("No authenticated user found while loading workflow.");
                return;
            }

            const { data: wfList, error: wfError } = await supabase.from('workflows').select('name').eq('id', workflowId);
            if (wfError) {
                console.error('Error loading workflow name:', wfError);
            } else if (wfList && wfList.length > 0) {
                setWorkflowName(wfList[0].name);
            }

            const { data: wfNodes, error: nodesError } = await supabase.from('workflow_nodes').select('*').eq('workflow_id', workflowId);
            if (nodesError) console.error('Error loading workflow nodes:', nodesError);

            const { data: wfEdges, error: edgesError } = await supabase.from('workflow_edges').select('*').eq('workflow_id', workflowId);
            if (edgesError) console.error('Error loading workflow edges:', edgesError);

            if (wfNodes && wfNodes.length > 0) {
                setNodes(wfNodes.map((n: any) => {
                    const config = n.config as any || {};
                    const integId = config?.integrationId;

                    let rfType = config?.rfType || 'custom';
                    if (!config?.rfType) {
                        // fallback for older records without rfType
                        if (integId === 'if_else') rfType = 'if_else';
                        else if (integId === 'switch') rfType = 'switch';
                        else if (config?.originalType === 'ai_action') rfType = 'ai_agent';
                        else if (config?.originalType === 'ai_agent') rfType = 'ai_agent';
                    }

                    // The 'input' dbType bypass requires us to load visual state from originalType
                    let logicType = config?.originalType || n.type;

                    // Recover lost types from older saves where everything was forced to 'input'
                    if (logicType === 'input' && !config?.originalType) {
                        if (config?.actionId === 'model') logicType = 'chat_model';
                        else if (integId === 'memory') logicType = 'memory';
                        else if (integId === 'tool') logicType = 'tool';
                        else if (config?.actionId === 'chat') logicType = 'ai_action';
                        else if (['discord', 'slack', 'telegram'].includes(integId)) logicType = 'social_action';
                        else if (['cron', 'webhook', 'google_gmail_trigger'].includes(integId)) logicType = 'trigger';
                        else if (integId === 'api') logicType = 'api_action';
                        else if (integId === 'if_else' || integId === 'switch') logicType = 'logic_gate';
                        else logicType = 'data_tool'; // generic fallback
                    }

                    return {
                        id: n.id,
                        type: rfType,
                        position: { x: n.position_x, y: n.position_y },
                        data: { label: n.label, type: logicType, config }
                    };
                }));
            }
            if (wfEdges) {
                setEdges(wfEdges.map((e: any) => {
                    let sourceH: string | null = null;
                    let targetH: string | null = null;
                    let realLabel: string | null = null;

                    // Handles are packed into the label column as JSON
                    if (e.label && e.label.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(e.label);
                            if (parsed.__is_handle_data) {
                                sourceH = parsed.sourceHandle || null;
                                targetH = parsed.targetHandle || null;
                                realLabel = parsed.label || null;
                            }
                        } catch (err) { }
                    } else {
                        realLabel = e.label || null;
                    }

                    return {
                        id: e.id,
                        source: e.source_node_id,
                        target: e.target_node_id,
                        sourceHandle: sourceH,
                        targetHandle: targetH,
                        animated: true,
                        label: realLabel
                    };
                }));
            }
        };

        loadWorkflow();
    }, [workflowId, supabase, user, setNodes, setEdges]);

    // Real-time Cloud Run History & Initial Load
    useEffect(() => {
        if (!workflowId) return;

        // 1. Fetch initial history
        const fetchHistory = async () => {
            const { data } = await supabase
                .from('workflow_runs')
                .select('*')
                .eq('workflow_id', workflowId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (data) setCloudRunHistory(data);
        };
        fetchHistory();

        // 2. Subscribe to REALTIME updates
        const channel = supabase.channel(`workflow_runs_live_${workflowId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'workflow_runs',
                filter: `workflow_id=eq.${workflowId}`
            }, (payload: any) => {
                setCloudRunHistory(prev => [payload.new, ...prev]);
                // Automatically open console on new cloud run
                setShowConsole(true);
                setActiveConsoleTab('history');
                toast.success('Workflow triggered remotely!', { icon: '🚀' });
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'workflow_runs',
                filter: `workflow_id=eq.${workflowId}`
            }, (payload: any) => {
                setCloudRunHistory(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workflowId, supabase]);

    // Auto-save local draft
    useEffect(() => {
        if (!workflowId) {
            // Prevent immediate overlap destroying cache before react flow initializes layout
            if (nodes.length === 0 && edges.length === 0) return;
            try {
                localStorage.setItem('builder_nodes', JSON.stringify(nodes));
                localStorage.setItem('builder_edges', JSON.stringify(edges));
            } catch (err) { }
        }
    }, [nodes, edges, workflowId]);

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

    // ─── Edge deletion handler ─────────────────────────────
    const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        toast.success('Connection removed');
    }, [setEdges]);

    const onConnect = useCallback(
        (params: Connection) => {
            // Validation Logic: n8n specific ports
            const targetNode = nodes.find(n => n.id === params.target);
            const sourceNode = nodes.find(n => n.id === params.source);

            if (targetNode && (targetNode.data as any).type === 'ai_action') {
                const sourceType = (sourceNode?.data as any).type;
                if (params.targetHandle === 'chat_model' && sourceType !== 'chat_model') {
                    toast.error(`Only a Chat Model node can be connected here (Found: ${sourceType})`);
                    return;
                }
                if (params.targetHandle === 'memory' && sourceType !== 'memory') {
                    toast.error(`Only a Memory node can be connected here (Found: ${sourceType})`);
                    return;
                }
                if (params.targetHandle === 'knowledge') {
                    const allowedKBTypes = ['data_tool', 'tool', 'api_action'];
                    if (!allowedKBTypes.includes(sourceType)) {
                        toast.error(`Only Data/Tool nodes can be connected to Knowledge (Found: ${sourceType})`);
                        return;
                    }
                }
                if (params.targetHandle === 'tools') {
                    const allowedToolTypes = ['tool', 'api_action', 'social_action', 'data_tool'];
                    if (!allowedToolTypes.includes(sourceType)) {
                        toast.error(`Only Tool or Action nodes can be connected here (Found: ${sourceType})`);
                        return;
                    }
                }
            }

            setEdges((eds) => addEdge({ ...params, id: crypto.randomUUID(), animated: true }, eds));
        },
        [nodes, setEdges],
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
        console.log('💾 [SAVE] Starting save process...');

        try {
            // 0. Validate user from auth state
            if (!user) throw new Error('User not authenticated');

            // --- Server-Side Save Call ---
            console.log('💾 [SAVE] Calling server-side save API...');
            const response = await fetch('/api/workflows/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workflowId,
                    workflowName,
                    nodes,
                    edges
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save workflow');
            }

            console.log('✅ [SAVE] server-side save complete:', result.workflowId);

            localStorage.removeItem('builder_nodes');
            localStorage.removeItem('builder_edges');

            if (!workflowId) {
                setWorkflowId(result.workflowId);
                router.replace(`/builder?id=${result.workflowId}`);
            }

            toast.success('Workflow saved!', { id: toastId });
        } catch (error: any) {
            console.error('❌ [SAVE] Process failed:', error);
            const errorMessage = error.message || 'Unknown error';
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

            const engineEdges: WorkflowEdge[] = edges.map(e => {
                // FAIL-SAFE: Check every possible property ReactFlow might use
                let sH = e.sourceHandle || (e as any).source_id || (e as any).src_handle || null;
                const tH = e.targetHandle || (e as any).target_id || (e as any).tgt_handle || null;

                // Polyfill for IF/ELSE nodes if sourceHandle is missing
                const srcNode = nodes.find(n => n.id === e.source);
                const srcType = (srcNode?.data as any)?.type || srcNode?.type;

                if (!sH && (srcType === 'if_else' || srcType === 'logic_gate')) {
                    console.warn(`⚠️ [BUILDER] Edge ${e.id} from IF/ELSE node ${e.source} is missing a handle ID. Output may be dual-path.`);
                }

                return {
                    id: e.id,
                    workflow_id: 'local',
                    source_node_id: e.source,
                    target_node_id: e.target,
                    source_handle: sH ? String(sH) : null,
                    target_handle: tH ? String(tH) : null,
                    label: e.label?.toString() || null,
                    created_at: new Date().toISOString()
                };
            });

            console.log("🚀 [BUILDER] engineEdges (Repaired):", engineEdges.map(e => ({
                id: e.id,
                src: e.source_node_id,
                tgt: e.target_node_id,
                sH: e.source_handle
            })));

            // 2. Extract Trigger Data
            // We look for 'input' (manual) or 'trigger' (webhook/cron) nodes
            const triggerNode = nodes.find(n => ['input', 'trigger'].includes((n.data as any).type));

            // Priority: triggerData (Manual Input) -> config.data (Legacy Code)
            let triggerData = (triggerNode?.data as any)?.config?.triggerData || (triggerNode?.data as any)?.config?.data || {};

            // LOCAL RUN FIX:
            // If running locally and no chat_id is provided, inject a mock one so Telegram action doesn't fail validation.
            // This allows users to test the "AI -> Telegram" flow without a real webhook event.
            if (!triggerData.chat_id) {
                console.log("Injecting mock data for local execution");
                triggerData = {
                    ...triggerData,
                    chat_id: "123456789",
                    text: triggerData.text || "Hello from Aion Builder!" // Mock Text
                };
            }

            // 3. Initialize Runner with environment context (tokens)
            console.log('🚀 [RUNNER] Fetching auth tokens...');
            const googleToken = await Promise.race([
                getAccessToken('google'),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
            ]);
            const env: Record<string, string> = {};
            if (googleToken) {
                console.log('🚀 [RUNNER] Google Token acquired.');
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
        <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--fg)] font-sans">
            {/* Header */}
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
                    <Button variant="ghost" size="icon" title="Export" onClick={() => {
                        const blob = new Blob([JSON.stringify({ nodes, edges, name: workflowName }, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${workflowName.replace(/\s+/g, '_').toLowerCase()}.json`;
                        a.click();
                    }}>
                        <Download className="w-4 h-4" />
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        accept=".json"
                        className="hidden"
                    />
                    <Button variant="ghost" size="icon" title="Import" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRun}
                        disabled={isExecuting || isSaving}
                    >
                        <Play className={cn("w-4 h-4", isExecuting && "animate-pulse text-primary-500")} />
                        {isExecuting ? 'Running...' : 'Run'}
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving || isExecuting}>
                        <Save className={cn("w-4 h-4", isSaving && "animate-spin")} />
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => setIsPublishingPanelOpen(true)}
                        className="shadow-lg shadow-primary-500/20"
                    >
                        <Sparkles className="w-4 h-4" />
                        Publish
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

            <div className="flex-1 flex overflow-hidden">
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
                        onEdgeDoubleClick={onEdgeDoubleClick}
                        deleteKeyCode={['Backspace', 'Delete']}
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

                                    // AI Agent (multi-panel with tools/RAG)
                                    if (nodeData.type === 'ai_action' && selectedNode.type === 'ai_agent') return (
                                        <AIAgentConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // All standard AI nodes (Google Gemini, OpenAI, Groq, OpenRouter)
                                    if (nodeData.type === 'ai_action') return (
                                        <AIConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // Component Support Nodes
                                    if (nodeData.type === 'chat_model') return <AIConfig node={selectedNode} updateNode={updateNode} />;
                                    if (nodeData.type === 'memory') return <MemoryConfig node={selectedNode} updateNode={updateNode} />;
                                    if (nodeData.type === 'tool') return <ToolConfig node={selectedNode} updateNode={updateNode} />;

                                    // IF/ELSE
                                    if (integId === 'if_else') return (
                                        <IfElseConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // Filter
                                    if (integId === 'filter') return (
                                        <FilterConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // Parallel
                                    if (integId === 'parallel') return (
                                        <ParallelConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // Condition Group
                                    if (integId === 'condition_group') return (
                                        <ConditionGroupConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // Retry
                                    if (integId === 'retry') return (
                                        <RetryConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // Loop
                                    if (integId === 'loop') return (
                                        <LoopConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // Switch
                                    if (integId === 'switch' || (selectedNode.type as string) === 'switch') return (
                                        <SwitchConfig node={selectedNode} updateNode={updateNode} />
                                    );

                                    // Communication nodes
                                    if (nodeData.type === 'social_action') {
                                        if (integId === 'slack') return <SlackConfig node={selectedNode} updateNode={updateNode} />;
                                        if (integId === 'telegram') return <TelegramConfig node={selectedNode} updateNode={updateNode} />;
                                        if (integId === 'discord') return <DiscordConfig node={selectedNode} updateNode={updateNode} />;
                                        return <APIConfig node={selectedNode} updateNode={updateNode} />;
                                    }

                                    // Google nodes
                                    const googleIntegration = getIntegration('google');
                                    if (integId === 'google_calendar') return (
                                        <GoogleCalendarConfig node={selectedNode} updateNode={updateNode} googleIntegration={googleIntegration} onConnect={() => connectGoogle('calendar')} onDisconnect={() => disconnectIntegration('google')} />
                                    );
                                    if (integId === 'google_gmail') return (
                                        <GoogleGmailConfig node={selectedNode} updateNode={updateNode} googleIntegration={googleIntegration} onConnect={() => connectGoogle('gmail')} onDisconnect={() => disconnectIntegration('google')} />
                                    );
                                    if (integId === 'google_sheets') return (
                                        <SheetsConfig
                                            node={selectedNode}
                                            updateNode={updateNode}
                                            googleIntegration={googleIntegration}
                                            onConnectGoogle={() => connectGoogle('all')}
                                            onDisconnect={() => disconnectIntegration('google')}
                                            getAccessToken={getAccessToken}
                                        />
                                    );
                                    if (integId === 'google_docs') return (
                                        <DocsConfig
                                            node={selectedNode}
                                            updateNode={updateNode}
                                            googleIntegration={googleIntegration}
                                            onConnectGoogle={() => connectGoogle('all')}
                                            onDisconnect={() => disconnectIntegration('google')}
                                            getAccessToken={getAccessToken}
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
                                        <APIConfig node={selectedNode} updateNode={updateNode} />
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

            {/* Console / Logs Overlay */}
            {showConsole && (
                <div
                    style={{ height: consoleHeight }}
                    className="fixed bottom-0 left-0 right-0 bg-black/95 text-[var(--fg)] font-mono text-xs overflow-hidden border-t border-white/10 z-50 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col"
                >
                    {/* Resize Handle */}
                    <div
                        onMouseDown={startResizing}
                        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-primary-500/50 transition-colors z-[60]"
                    />

                    <div className="flex flex-col flex-1 p-4 overflow-hidden pt-3">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10 sticky top-0 bg-transparent shrink-0">

                            <div className="flex items-center gap-6">
                                <span className="font-bold flex items-center gap-2 text-green-400">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    CONSOLE
                                </span>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setActiveConsoleTab('logs')}
                                        className={cn("pb-2 border-b-2 transition-colors", activeConsoleTab === 'logs' ? "border-primary-500 text-primary-500" : "border-transparent text-white/40 hover:text-white/60")}
                                    >
                                        Live Logs
                                    </button>
                                    <button
                                        onClick={() => setActiveConsoleTab('history')}
                                        className={cn("pb-2 border-b-2 transition-colors", activeConsoleTab === 'history' ? "border-primary-500 text-primary-500" : "border-transparent text-white/40 hover:text-white/60")}
                                    >
                                        Execution History {cloudRunHistory.length > 0 && `(${cloudRunHistory.length})`}
                                    </button>
                                </div>
                                {activeConsoleTab === 'history' && cloudRunHistory.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                            if (!workflowId) return;
                                            if (!confirm('Clear all run history for this workflow?')) return;

                                            const { error } = await supabase
                                                .from('workflow_runs')
                                                .delete()
                                                .eq('workflow_id', workflowId);

                                            if (error) {
                                                toast.error('Failed to clear history');
                                            } else {
                                                setCloudRunHistory([]);
                                                toast.success('History cleared');
                                            }
                                        }}
                                        className="h-7 px-2 text-[10px] text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 gap-1.5 ml-4"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Clear History
                                    </Button>
                                )}
                            </div>
                            <button onClick={() => setShowConsole(false)} className="text-white/50 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2 pt-2">
                            {activeConsoleTab === 'logs' ? (
                                <>
                                    {executionLogs.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full opacity-30 text-white">
                                            <Terminal className="w-8 h-8 mb-2" />
                                            <p>No local logs yet. Click 'Run' to test.</p>
                                        </div>
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
                                </>
                            ) : (
                                <div className="space-y-3">
                                    {cloudRunHistory.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full opacity-30 text-white min-h-[140px]">
                                            <Activity className="w-8 h-8 mb-2" />
                                            <p>No remote executions detected for this workflow.</p>
                                        </div>
                                    )}
                                    {cloudRunHistory.map((run: any) => {
                                        let logs: any[] = [];
                                        try { logs = typeof run.logs === 'string' ? JSON.parse(run.logs) : (run.logs || []); } catch (e) { }

                                        const getStatusColor = (s: string) => {
                                            if (s === 'success') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
                                            if (s === 'failed') return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
                                            return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
                                        };

                                        return (
                                            <div key={run.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-violet-500/30 transition-all shadow-sm">
                                                <div className="p-4 flex items-center justify-between border-b border-[var(--border)] bg-gray-500/5">
                                                    <div className="flex items-center gap-3">
                                                        <Badge className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", getStatusColor(run.status))}>
                                                            {run.status === 'running' && <Activity className="w-2.5 h-2.5 mr-1.5 animate-pulse" />}
                                                            {run.status}
                                                        </Badge>
                                                        <span className="text-xs font-mono text-[var(--muted-fg)]">{new Date(run.started_at).toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-[10px] font-mono text-[var(--muted-fg)] opacity-50 uppercase tracking-tighter">ID: {run.id.slice(-8)}</div>
                                                </div>

                                                {run.error && (
                                                    <div className="p-3 bg-rose-500/10 border-b border-[var(--border)] text-rose-500 text-[10px] font-mono flex items-start gap-2">
                                                        <X className="w-3 h-3 mt-0.5 shrink-0" />
                                                        <div className="flex-1 font-bold">{run.error}</div>
                                                    </div>
                                                )}

                                                <div className="p-4 space-y-3">
                                                    {logs.length > 0 ? (
                                                        <div className="space-y-1.5">
                                                            <p className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-wider mb-2">Execution Steps</p>
                                                            {logs.map((log: any, i: number) => (
                                                                <div key={i} className="flex items-center gap-3 text-xs border-l-2 border-violet-500/10 pl-3 py-0.5">
                                                                    <div className={cn(
                                                                        "w-1.5 h-1.5 rounded-full",
                                                                        log.status === 'success' ? 'bg-emerald-500' : (log.status === 'failed' ? 'bg-rose-500' : 'bg-blue-500 animate-pulse')
                                                                    )} />
                                                                    <span className="font-semibold text-[var(--fg)] min-w-[120px]">
                                                                        {(nodes.find(n => n.id === log.nodeId)?.data as any)?.label || 'Node'}
                                                                    </span>
                                                                    <span className="text-[10px] text-[var(--muted-fg)] italic">{log.status}</span>
                                                                    {log.output && <span className="text-[9px] text-violet-400 opacity-70 ml-auto font-mono">Output: {typeof log.output === 'object' ? 'JSON' : log.output.toString().slice(0, 20)}</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center p-8 bg-[var(--muted)]/30 rounded-lg border border-dashed border-[var(--border)]">
                                                            <div className="text-center">
                                                                <Activity className="w-5 h-5 text-[var(--muted-fg)] mx-auto mb-2 animate-pulse opacity-50" />
                                                                <p className="text-[10px] font-medium text-[var(--muted-fg)]">Waiting for background session logs...</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {run.output && (
                                                        <div className="mt-4 pt-4 border-t border-[var(--border)]">
                                                            <p className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-wider mb-2">Final Output</p>
                                                            <pre className="text-[10px] bg-[var(--muted)] p-3 rounded-lg overflow-x-auto font-mono text-violet-400 border border-[var(--border)]">
                                                                {JSON.stringify(run.output, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <PublishingPanel
                isOpen={isPublishingPanelOpen}
                onClose={() => setIsPublishingPanelOpen(false)}
                workflowName={workflowName}
                workflowId={workflowId}
                onSaveFirst={async () => {
                    // Auto-save the workflow and return the ID
                    try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error('Not authenticated');

                        let currentWfId = workflowId;
                        if (!currentWfId) {
                            const { data: wf, error: wfErr } = await supabase
                                .from('workflows')
                                .insert({ user_id: user.id, name: workflowName, status: 'draft' })
                                .select()
                                .single();
                            if (wfErr) throw wfErr;
                            currentWfId = wf.id;
                        } else {
                            await supabase.from('workflows').update({ name: workflowName }).eq('id', currentWfId);
                        }

                        // Sync nodes
                        await supabase.from('workflow_nodes').delete().eq('workflow_id', currentWfId);
                        const nodesToInsert = nodes.map(n => {
                            const realType = (n.data as any).type;
                            const rfType = n.type;
                            const config = (n.data as any).config || {};
                            return {
                                id: n.id,
                                workflow_id: currentWfId,
                                type: 'input',
                                label: (n.data as any).label,
                                position_x: n.position.x,
                                position_y: n.position.y,
                                config: { ...config, originalType: realType, rfType }
                            };
                        });
                        await supabase.from('workflow_nodes').insert(nodesToInsert);

                        // Sync edges
                        await supabase.from('workflow_edges').delete().eq('workflow_id', currentWfId);
                        const edgesToInsert = edges.map(e => {
                            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.id);
                            return {
                                id: isUUID ? e.id : crypto.randomUUID(),
                                workflow_id: currentWfId,
                                source_node_id: e.source,
                                target_node_id: e.target,
                                label: JSON.stringify({
                                    __is_handle_data: true,
                                    sourceHandle: e.sourceHandle || null,
                                    targetHandle: e.targetHandle || null,
                                    label: typeof e.label === 'string' ? e.label : null
                                })
                            };
                        });
                        await supabase.from('workflow_edges').insert(edgesToInsert);

                        // Update local state
                        if (!workflowId) {
                            setWorkflowId(currentWfId);
                            router.replace(`/builder?id=${currentWfId}`);
                        }

                        return currentWfId;
                    } catch (err: any) {
                        console.error('Auto-save for publish failed:', err);
                        return null;
                    }
                }}
                onPublish={(details) => {
                    console.log('Published to marketplace:', details);
                }}
            />
        </div>
    );
}
