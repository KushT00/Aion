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
} from 'lucide-react';
import toast from 'react-hot-toast';

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
const initialNodes: Node[] = [
    {
        id: '1',
        type: 'custom',
        position: { x: 300, y: 50 },
        data: { label: 'User Input', type: 'input' },
    },
    {
        id: '2',
        type: 'custom',
        position: { x: 300, y: 200 },
        data: { label: 'AI Classifier', type: 'ai_step' },
    },
    {
        id: '3',
        type: 'custom',
        position: { x: 100, y: 370 },
        data: { label: 'Fetch Data', type: 'api_step' },
    },
    {
        id: '4',
        type: 'custom',
        position: { x: 500, y: 370 },
        data: { label: 'Route Logic', type: 'logic_step' },
    },
    {
        id: '5',
        type: 'custom',
        position: { x: 300, y: 540 },
        data: { label: 'Send Response', type: 'output' },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e2-4', source: '2', target: '4' },
    { id: 'e3-5', source: '3', target: '5' },
    { id: 'e4-5', source: '4', target: '5' },
];

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
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges],
    );

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    const addNode = useCallback(
        (type: string, label: string) => {
            const id = `node-${Date.now()}`;
            const newNode: Node = {
                id,
                type: 'custom',
                position: { x: 250 + Math.random() * 200, y: 200 + Math.random() * 200 },
                data: { label, type },
            };
            setNodes((nds) => [...nds, newNode]);
        },
        [setNodes],
    );

    const handleSave = () => {
        const workflowData = { nodes, edges };
        console.log('Saving workflow:', JSON.stringify(workflowData, null, 2));
        toast.success('Workflow saved successfully!');
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
                    <Button variant="outline" size="sm">
                        <Play className="w-4 h-4" />
                        Run
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
                                onClick={() => setSelectedNode(null)}
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
                                        setSelectedNode(null);
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
        </div>
    );
}
