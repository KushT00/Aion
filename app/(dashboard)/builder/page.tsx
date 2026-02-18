'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { WorkflowRunner, RunLog } from '@/lib/workflow/runner';
import { WorkflowNode, WorkflowEdge, NodeType } from '@/types';
import { createClient } from '@/lib/supabase/client';

// ─── Custom Node Component ──────────────────────────────────
interface NodeData {
    label: string;
    type: string;
    config?: Record<string, unknown>;
}

const nodeColors: Record<string, { bg: string; border: string; icon: string }> = {
    input: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-300 dark:border-emerald-500/30',
        icon: 'text-emerald-600 dark:text-emerald-400',
    },
    ai_step: {
        bg: 'bg-primary-50 dark:bg-primary-500/10',
        border: 'border-primary-300 dark:border-primary-500/30',
        icon: 'text-primary-600 dark:text-primary-400',
    },
    api_step: {
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-300 dark:border-blue-500/30',
        icon: 'text-blue-600 dark:text-blue-400',
    },
    logic_step: {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-300 dark:border-amber-500/30',
        icon: 'text-amber-600 dark:text-amber-400',
    },
    output: {
        bg: 'bg-rose-50 dark:bg-rose-500/10',
        border: 'border-rose-300 dark:border-rose-500/30',
        icon: 'text-rose-600 dark:text-rose-400',
    },
};

const nodeIcons: Record<string, typeof Cpu> = {
    input: Upload,
    ai_step: Cpu,
    api_step: Globe,
    logic_step: GitFork,
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
const getInitialWorkflow = (): { nodes: Node[]; edges: Edge[] } => {
    const triggerId = crypto.randomUUID();
    const aiId = crypto.randomUUID();
    const outputId = crypto.randomUUID();

    const nodes: Node[] = [
        {
            id: triggerId,
            type: 'custom',
            position: { x: 100, y: 100 },
            data: { label: 'Input Trigger', type: 'input' },
        },
        {
            id: aiId,
            type: 'custom',
            position: { x: 400, y: 100 },
            data: { label: 'AI Processing', type: 'ai_step' },
        },
        {
            id: outputId,
            type: 'custom',
            position: { x: 700, y: 100 },
            data: { label: 'Output Result', type: 'output' },
        },
    ];

    const edges: Edge[] = [
        { id: crypto.randomUUID(), source: triggerId, target: aiId, animated: true },
        { id: crypto.randomUUID(), source: aiId, target: outputId, animated: true },
    ];

    return { nodes, edges };
};

// ─── Node Palette ──────────────────────────────────────────
const paletteItems = [
    { type: 'input', label: 'Input', icon: Upload },
    { type: 'ai_step', label: 'AI Step', icon: Cpu },
    { type: 'api_step', label: 'API Step', icon: Globe },
    { type: 'logic_step', label: 'Logic Step', icon: GitFork },
    { type: 'output', label: 'Output', icon: ArrowRightCircle },
];

// ─── Builder Page ──────────────────────────────────────────
export default function BuilderPage() {
    // Initialize empty to avoid hydration mismatch (server vs client UUIDs)
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Load initial data only on client side
    useEffect(() => {
        const initial = getInitialWorkflow();
        setNodes(initial.nodes);
        setEdges(initial.edges);
    }, []); // Run once on mount

    const [isExecuting, setIsExecuting] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [executionLogs, setExecutionLogs] = useState<{ nodeId: string; status: string; timestamp: string; output?: any; error?: string }[]>([]);
    const [showConsole, setShowConsole] = useState(false);
    const [workflowId, setWorkflowId] = useState<string | null>(null);

    // Derive selected node from nodes state to ensure it's always up to date
    const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges],
    );

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const addNode = useCallback(
        (type: string, label: string) => {
            setNodes((nds) => {
                const count = nds.filter(n => (n.data as any).type === type).length + 1;
                // Use crypto.randomUUID() for Supabase compatibility
                const id = crypto.randomUUID();
                const newNode: Node = {
                    id,
                    type: 'custom',
                    position: { x: 250 + Math.random() * 200, y: 200 + Math.random() * 200 },
                    data: { label: `${label} ${count}`, type },
                };
                return [...nds, newNode];
            });
        },
        [setNodes],
    );

    const handleSave = async () => {
        setIsExecuting(true);
        toast.loading('Saving workflow...', { id: 'save' });

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error('You must be logged in to save.', { id: 'save' });
                return;
            }

            // 1. Save or Update Workflow
            let currentId = workflowId;
            if (!currentId) {
                const { data, error } = await supabase
                    .from('workflows')
                    .insert({
                        user_id: user.id,
                        name: 'Telegram Bot Workflow',
                        status: 'published',
                    })
                    .select()
                    .single();

                if (error) throw error;
                currentId = data.id;
                setWorkflowId(currentId);
            }

            // 2. Prepare Nodes and Edges
            // Helper function to map frontend types to DB types
            const getDbType = (type: string): string => {
                const map: Record<string, string> = {
                    // Fallback for others
                    'input': 'input',
                    'output': 'output',
                    'custom': 'logic_step'
                };
                return map[type] || 'logic_step';
            };

            const dbNodes = nodes.map(n => ({
                id: n.id,
                workflow_id: currentId,
                type: getDbType((n.data as any).type),
                label: (n.data as any).label,
                position_x: n.position.x,
                position_y: n.position.y,
                // Store the REAL frontend type in config so we can restore it later if needed
                config: {
                    ...((n.data as any).config || {}),
                    _frontend_type: (n.data as any).type
                },
            }));

            const dbEdges = edges.map(e => {
                // Ensure ID is a valid UUID, otherwise generate one
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.id);
                return {
                    id: isUUID ? e.id : crypto.randomUUID(),
                    workflow_id: currentId,
                    source_node_id: e.source,
                    target_node_id: e.target,
                    label: e.label || null,
                };
            });

            // 3. Delete existing queries (simple replace strategy for now)
            await supabase.from('workflow_edges').delete().eq('workflow_id', currentId);
            await supabase.from('workflow_nodes').delete().eq('workflow_id', currentId);

            const { error: nodesError } = await supabase.from('workflow_nodes').insert(dbNodes);
            if (nodesError) throw nodesError;

            const { error: edgesError } = await supabase.from('workflow_edges').insert(dbEdges);
            if (edgesError) throw edgesError;

            // 4. Update UI with new ID (specifically trigger nodes)
            setNodes(nds => nds.map(n => {
                if ((n.data as any).type === 'telegram_trigger') {
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            config: {
                                ...(n.data as any).config,
                                workflowId: currentId
                            }
                        }
                    };
                }
                return n;
            }));

            toast.success('Workflow saved successfully!', { id: 'save' });
        } catch (error: any) {
            console.error('Save Error:', error, error.message, error.details);
            toast.error(`Save failed: ${error.message || 'Unknown error'}`, { id: 'save' });
        } finally {
            setIsExecuting(false);
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

            // 2. Extract Trigger Data
            const triggerNode = nodes.find(n => ['input', 'telegram_trigger'].includes((n.data as any).type));

            let triggerData = (triggerNode?.data as any)?.config?.data || {};



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
            toast.error(`Execution failed: ${error.message}`, { id: 'exec' });
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
                        const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'workflow.json';
                        a.click();
                    }}>
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
                                    key={item.type}
                                    onClick={() => addNode(item.type, item.label)}
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
                    <div className="w-72 border-l border-[var(--border)] bg-[var(--card)] p-4 animate-slide-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-[var(--fg)]">Node Settings</h3>
                            <button
                                onClick={() => setSelectedNodeId(null)}
                                className="p-1 rounded-lg text-[var(--muted-fg)] hover:bg-[var(--muted)] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                    Label
                                </label>
                                <input
                                    type="text"
                                    value={(selectedNode.data as unknown as NodeData).label}
                                    onChange={(e) => {
                                        setNodes((nds) =>
                                            nds.map((n) =>
                                                n.id === selectedNode.id
                                                    ? { ...n, data: { ...(n.data as unknown as NodeData), label: e.target.value } }
                                                    : n,
                                            ),
                                        );
                                    }}
                                    className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                    Type
                                </label>
                                <p className="mt-1 text-sm text-[var(--fg)] capitalize">
                                    {(selectedNode.data as unknown as NodeData).type.replace('_', ' ')}
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                    Node ID
                                </label>
                                <p className="mt-1 text-xs text-[var(--muted-fg)] font-mono">
                                    {selectedNode.id}
                                </p>
                            </div>

                            {/* Input Node Specialized Settings */}
                            {(selectedNode.data as unknown as NodeData).type === 'input' && (
                                <div className="pt-4 border-t border-[var(--border)]">
                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                        Trigger Data (JSON)
                                    </label>
                                    <textarea
                                        placeholder='{ "text": "AI Future" }'
                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--fg)] h-32 focus:outline-none"
                                        value={JSON.stringify((selectedNode.data as any).config?.triggerData || (selectedNode.data as any).config?.data || {}, null, 2)}
                                        onChange={(e) => {
                                            try {
                                                const triggerData = JSON.parse(e.target.value);
                                                setNodes(nds => nds.map(n =>
                                                    n.id === selectedNode.id
                                                        ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, triggerData } } }
                                                        : n
                                                ));
                                            } catch (err) { }
                                        }}
                                    />
                                    <p className="text-[10px] text-[var(--muted-fg)] italic mt-1">
                                        This data will be available as {"{{Input Trigger.text}}"}
                                    </p>
                                </div>
                            )}

                            {/* AI Response Specialized Settings */}
                            {(selectedNode.data as unknown as NodeData).type === 'ai_response' && (
                                <div className="pt-4 border-t border-[var(--border)] space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                            OpenAI API Key
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="sk-..."
                                            className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] focus:outline-none"
                                            value={(selectedNode.data as any).config?.data?.apiKey || ''}
                                            onChange={(e) => {
                                                const apiKey = e.target.value;
                                                setNodes(nds => nds.map(n =>
                                                    n.id === selectedNode.id
                                                        ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, apiKey } } } }
                                                        : n
                                                ));
                                            }}
                                        />
                                    </div>
                                    <div className="hidden">
                                        {/* Hidden config to force integrationId/actionId and default prompt */}
                                        <input
                                            type="hidden"
                                            value={(selectedNode.data as any).config?.integrationId || ''}
                                            ref={(input) => {
                                                // Initialize defaults if not set
                                                if (input && !(selectedNode.data as any).config?.integrationId) {
                                                    setNodes(nds => nds.map(n =>
                                                        n.id === selectedNode.id
                                                            ? {
                                                                ...n,
                                                                data: {
                                                                    ...n.data,
                                                                    config: {
                                                                        ...(n.data as any).config,
                                                                        integrationId: 'openai',
                                                                        actionId: 'generate_reply',
                                                                        data: {
                                                                            ...(n.data as any).config?.data,
                                                                            userPrompt: "{{4.original_text}}", // Default connection to logic node (assuming id 4 for now, user can edit)
                                                                            reply_type: "{{4.reply_type}}"
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                            : n
                                                    ));
                                                }
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                            User Prompt Source
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="{{node.original_text}}"
                                            className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--fg)] focus:outline-none"
                                            value={(selectedNode.data as any).config?.data?.userPrompt || ''}
                                            onChange={(e) => {
                                                const userPrompt = e.target.value;
                                                setNodes(nds => nds.map(n =>
                                                    n.id === selectedNode.id
                                                        ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, userPrompt } } } }
                                                        : n
                                                ));
                                            }}
                                        />
                                        <p className="text-[10px] text-[var(--muted-fg)] mt-1">
                                            Should reference the "original_text" from the Logic node.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                            Reply Type Source
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="{{node.reply_type}}"
                                            className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--fg)] focus:outline-none"
                                            value={(selectedNode.data as any).config?.data?.reply_type || ''}
                                            onChange={(e) => {
                                                const reply_type = e.target.value;
                                                setNodes(nds => nds.map(n =>
                                                    n.id === selectedNode.id
                                                        ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, reply_type } } } }
                                                        : n
                                                ));
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-[var(--border)] space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                        Integration
                                    </label>
                                    <select
                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] focus:outline-none"
                                        value={(selectedNode.data as any).config?.integrationId || ''}
                                        onChange={(e) => {
                                            const integrationId = e.target.value;
                                            setNodes(nds => nds.map(n =>
                                                n.id === selectedNode.id
                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, integrationId, actionId: '' } } }
                                                    : n
                                            ));
                                        }}
                                    >
                                        <option value="">Select Integration</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="google_gemini">Google Gemini</option>
                                        <option value="discord">Discord</option>
                                        <option value="telegram">Telegram</option>
                                        <option value="logic">Logic</option>
                                    </select>
                                </div>

                                {(selectedNode.data as any).config?.integrationId && (
                                    <div>
                                        <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                            Action
                                        </label>
                                        <select
                                            className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] focus:outline-none"
                                            value={(selectedNode.data as any).config?.actionId || ''}
                                            onChange={(e) => {
                                                const actionId = e.target.value;
                                                setNodes(nds => nds.map(n =>
                                                    n.id === selectedNode.id
                                                        ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, actionId } } }
                                                        : n
                                                ));
                                            }}
                                        >
                                            <option value="">Select Action</option>
                                            {(selectedNode.data as any).config?.integrationId === 'openai' && (
                                                <option value="chat">Chat Completion</option>
                                            )}
                                            {(selectedNode.data as any).config?.integrationId === 'google_gemini' && (
                                                <option value="chat">Chat Completion</option>
                                            )}
                                            {(selectedNode.data as any).config?.integrationId === 'discord' && (
                                                <option value="send_message">Send Message</option>
                                            )}
                                            {(selectedNode.data as any).config?.integrationId === 'telegram' && (
                                                <option value="send_message">Send Message</option>
                                            )}
                                            {(selectedNode.data as any).config?.integrationId === 'logic' && (
                                                <option value="log">Log to Console</option>
                                            )}
                                        </select>
                                    </div>
                                )}

                                {(selectedNode.data as any).config?.actionId && (
                                    <div className="space-y-4">
                                        {(selectedNode.data as any).config?.integrationId === 'openai' && (
                                            <>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        OpenAI API Key
                                                    </label>
                                                    <input
                                                        type="password"
                                                        placeholder="sk-..."
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.apiKey || ''}
                                                        onChange={(e) => {
                                                            const apiKey = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, apiKey } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        System Prompt
                                                    </label>
                                                    <textarea
                                                        placeholder="You are a social media expert..."
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-20 focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.systemPrompt || ''}
                                                        onChange={(e) => {
                                                            const systemPrompt = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, systemPrompt } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        User Prompt / Task
                                                    </label>
                                                    <textarea
                                                        placeholder="Write a tweet about {{trigger.topic}}..."
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-24 focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.userPrompt || ''}
                                                        onChange={(e) => {
                                                            const userPrompt = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, userPrompt } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {(selectedNode.data as any).config?.integrationId === 'google_gemini' && (
                                            <>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        Gemini API Key
                                                    </label>
                                                    <input
                                                        type="password"
                                                        placeholder="AIza..."
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.apiKey || ''}
                                                        onChange={(e) => {
                                                            const apiKey = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, apiKey } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        Model
                                                    </label>
                                                    <select
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.model || 'gemini-2.0-flash'}
                                                        onChange={(e) => {
                                                            const model = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, model } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    >
                                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legacy)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        System Prompt
                                                    </label>
                                                    <textarea
                                                        placeholder="You are a social media expert..."
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-20 focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.systemPrompt || ''}
                                                        onChange={(e) => {
                                                            const systemPrompt = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, systemPrompt } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        User Prompt / Task
                                                    </label>
                                                    <textarea
                                                        placeholder="Write a tweet about {{trigger.topic}}..."
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-24 focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.userPrompt || ''}
                                                        onChange={(e) => {
                                                            const userPrompt = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, userPrompt } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {(selectedNode.data as any).config?.integrationId === 'discord' && (
                                            <>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        Webhook URL
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="https://discord.com/api/webhooks/..."
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.webhookUrl || ''}
                                                        onChange={(e) => {
                                                            const webhookUrl = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, webhookUrl } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        Message Content
                                                    </label>
                                                    <textarea
                                                        placeholder="Message: {{ai-1.text}} or {{Node Label.text}}"
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-24 focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.content || ''}
                                                        onChange={(e) => {
                                                            const content = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, content } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {(selectedNode.data as any).config?.integrationId === 'telegram' && (
                                            <>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        Bot Token
                                                    </label>
                                                    <input
                                                        type="password"
                                                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.botToken || ''}
                                                        onChange={(e) => {
                                                            const botToken = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, botToken } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        Chat ID
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="123456789"
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.chatId || ''}
                                                        onChange={(e) => {
                                                            const chatId = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, chatId } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        Message Content
                                                    </label>
                                                    <textarea
                                                        placeholder="Message: {{ai-1.text}} or {{Node Label.text}}"
                                                        className="mt-1 w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] h-24 focus:outline-none"
                                                        value={(selectedNode.data as any).config?.data?.content || ''}
                                                        onChange={(e) => {
                                                            const content = e.target.value;
                                                            setNodes(nds => nds.map(n =>
                                                                n.id === selectedNode.id
                                                                    ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data: { ...(n.data as any).config?.data, content } } } }
                                                                    : n
                                                            ));
                                                        }}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Fallback to JSON editor for other actions */}
                                        {(selectedNode.data as any).config?.integrationId !== 'openai' &&
                                            (selectedNode.data as any).config?.integrationId !== 'google_gemini' &&
                                            (selectedNode.data as any).config?.integrationId !== 'discord' &&
                                            (selectedNode.data as any).config?.integrationId !== 'telegram' && (
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                                                        Data / Payload
                                                    </label>
                                                    <textarea
                                                        placeholder="Enter JSON or variable templates..."
                                                        className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--fg)] h-32 focus:outline-none"
                                                        value={JSON.stringify((selectedNode.data as any).config?.data || {}, null, 2)}
                                                        onChange={(e) => {
                                                            try {
                                                                const data = JSON.parse(e.target.value);
                                                                setNodes(nds => nds.map(n =>
                                                                    n.id === selectedNode.id
                                                                        ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, data } } }
                                                                        : n
                                                                ));
                                                            } catch (err) { }
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        <p className="text-[10px] text-[var(--muted-fg)] italic">
                                            Tip: Use {"{{label.text}}"} or {"{{nodeId.text}}"} to reference previous steps.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-[var(--border)]">
                                <Button
                                    variant="danger"
                                    size="sm"
                                    className="w-full"
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
                                >
                                    Delete Node
                                </Button>
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
