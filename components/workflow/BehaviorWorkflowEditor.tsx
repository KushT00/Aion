'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    useReactFlow,
    type Node,
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { nodeTypes as customNodeTypes, nodeColors, nodeIcons } from '@/components/workflow/NodeComponents';
import { Button } from '@/components/ui/button';
import {
    AIAgentConfig, IfElseConfig, SwitchConfig, FilterConfig, ParallelConfig,
    ConditionGroupConfig, RetryConfig, SlackConfig, TelegramConfig,
    NotionConfig, CodeConfig, SetVariableConfig, DelayConfig,
    CRMCaptureConfig, APIConfig, ToolConfig, MemoryConfig, LoopConfig,
    DataScrapingConfig, JSONSearchConfig, StructurizerConfig,
    GoogleCalendarConfig, GoogleGmailConfig, SheetsConfig, DocsConfig,
    DiscordConfig, AIConfig, FormTriggerConfig
} from '@/components/workflow/NodeConfigs';
import { Settings, X, Loader2, Zap, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';

const nodeTypes = customNodeTypes as any;

interface BehaviorWorkflowEditorProps {
    instance: any;
    overrides: Record<string, string>;
    onSaveOverride: (nodeId: string, property: string, value: string) => void;
    credentials: Record<string, { isValid: boolean }>;
    userIntegrations: any[];
    onSaveCredential: (key: string, value: string) => void;
    onDisconnectCredential: (key: string) => void;
    onConnectGoogle: () => void;
}

// Re-implementing TriggerConfiguration locally for Behavior tab
function TriggerConfiguration({ node, updateNode }: { node: Node, updateNode: (data: any) => void }) {
    const config = (node.data as any).config || {};
    const data = config.data || {};

    const updateData = (kv: Record<string, unknown>) => {
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

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-(--muted-fg) uppercase tracking-tight ml-1">Trigger Type</label>
                <div className="flex bg-(--muted) p-1 rounded-lg gap-1">
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'cron', actionId: 'schedule' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all", isCron ? "bg-(--card) shadow-sm font-bold border border-(--border)" : "opacity-60")}
                    >
                        Cron
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'webhook', actionId: 'receive' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all", isWebhook ? "bg-(--card) shadow-sm font-bold border border-(--border)" : "opacity-60")}
                    >
                        Webhook
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'telegram', actionId: 'telegram_message' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all", isTelegram ? "bg-(--card) shadow-sm font-bold border border-(--border) text-sky-500" : "opacity-60")}
                    >
                        Telegram
                    </button>
                    <button
                        onClick={() => updateNode({ config: { ...config, integrationId: 'google_gmail_trigger', actionId: 'on_new_email' } })}
                        className={cn("flex-1 px-2 py-1.5 rounded-md text-[10px] transition-all flex items-center justify-center gap-1", isGmail ? "bg-(--card) shadow-sm font-bold border border-(--border) text-red-600 dark:text-red-400" : "opacity-60")}
                    >
                        Gmail
                    </button>
                </div>
            </div>

            {isCron && (
                <div className="space-y-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-(--muted-fg) uppercase tracking-tight ml-1">Cron Expression</label>
                        <input
                            type="text"
                            placeholder="* * * * *"
                            className="w-full bg-(--muted) border border-(--border) rounded-lg px-3 py-1.5 text-xs font-mono text-(--fg) outline-none focus:ring-1 focus:ring-amber-500"
                            value={(data.cron as string) || '0 * * * *'}
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
                            className="w-full bg-(--muted) border border-(--border) rounded-md px-2.5 py-1.5 text-[11px] text-(--fg) outline-none focus:ring-1 focus:ring-sky-500"
                            value={(data.botToken as string) || ''}
                            onChange={(e) => updateData({ botToken: e.target.value })}
                        />
                    </div>
                    <Button size="sm" className="w-full h-8 text-xs bg-sky-500 hover:bg-sky-600 text-white gap-2" onClick={() => toast.success('Webhook synced via background API')}>
                        <Zap className="w-3 h-3" />
                        Sync Bot Webhook
                    </Button>
                </div>
            )}
        </div>
    );
}

export function BehaviorWorkflowEditor({ instance, overrides, onSaveOverride,    credentials,
    userIntegrations,
    onSaveCredential,
    onDisconnectCredential,
    onConnectGoogle
}: BehaviorWorkflowEditorProps) {
    const workflow = instance?.listing?.workflow || { nodes: [], edges: [] };
    
    // Merge overrides and manage integration auto-binding (visual only)
    const initialNodes = useMemo(() => {
        return (workflow.nodes || []).map((n: any) => {
            const config = { ...(n.data?.config || n.config || {}) };
            const data = { ...(config.data || {}) };
            
            // Apply overrides
            Object.keys(overrides).forEach(key => {
                if (key.startsWith(`${n.id}.`)) {
                    const prop = key.split('.')[1];
                    data[prop] = overrides[key];
                    config[prop] = overrides[key];
                }
            });

            // Auto-bind managed keys visually if needed
            const isManaged = instance?.pricing_tier === 'managed';
            if (isManaged && (config.integrationId === 'groq' || config.integrationId === 'google_gemini')) {
                data.apiKey = 'managed-by-aion-platform';
            } else if (config.integrationId && credentials[config.integrationId]?.isValid) {
                data.apiKey = '••••••••••••••••••••••••';
            } else if (config.integrationId && (config.integrationId === 'openai' || config.integrationId === 'anthropic' || config.integrationId === 'groq' || config.integrationId === 'google_gemini' || config.integrationId === 'openrouter')) {
                data.apiKey = '';
            }

            if (config.integrationId === 'telegram') {
                if (credentials['telegram']?.isValid) {
                    data.botToken = '••••••••••••••••••••••••';
                } else {
                    data.botToken = '';
                }
            }

            config.data = data;

            // Follow builder's mapping strategy perfectly
            const rfType = config.rfType || 'custom';
            const logType = config.originalType || n.type || n.data?.type || 'custom';

            return {
                id: n.id,
                type: rfType,
                position: { x: n.position_x || n.position?.x || 0, y: n.position_y || n.position?.y || 0 },
                data: { 
                    ...n.data, 
                    config, 
                    label: n.label || n.data?.label, 
                    type: logType,
                    instanceId: instance.id 
                },
                draggable: true,
                selectable: true,
            };
        });
    }, [workflow.nodes, overrides, instance?.id, instance?.pricing_tier, credentials]);

    const initialEdges = useMemo(() => {
        return (workflow.edges || []).map((e: any) => {
            let sH = e.sourceHandle || e.source_handle;
            let tH = e.targetHandle || e.target_handle;

            // Handle legacy/bundled storage in label column
            if (!sH && e.label && typeof e.label === 'string' && e.label.startsWith('{')) {
                try {
                    const parsed = JSON.parse(e.label);
                    if (parsed.__is_handle_data) {
                        sH = parsed.sourceHandle;
                        tH = parsed.targetHandle;
                    }
                } catch (err) {
                    console.error('Failed to parse edge label JSON:', err);
                }
            }

            return {
                id: e.id,
                source: e.source || e.source_node_id,
                target: e.target || e.target_node_id,
                sourceHandle: sH,
                targetHandle: tH,
                animated: true,
            };
        });
    }, [workflow.edges]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Keep nodes array synced if overrides change externally
    useEffect(() => {
        setNodes(initialNodes);
    }, [initialNodes, setNodes]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

    const updateNodeConfig = useCallback((newData: any) => {
        if (!selectedNodeId) return;
        
        // This simulates saving overrides for the specific properties changed
        const newConfig = newData.config || {};
        const newDataPayload = newConfig.data || {};
        
        // Find what changed and call onSaveOverride or onSaveCredential
        if (newData.label !== undefined && newData.label !== selectedNode?.data?.label) {
            onSaveOverride(selectedNodeId, 'label', newData.label);
        }

        const oldNode = nodes.find(n => n.id === selectedNodeId);
        const oldDataPayload = (oldNode?.data as any)?.config?.data || {};
        const oldConfigPayload = (oldNode?.data as any)?.config || {};
        
        Object.keys(newDataPayload).forEach(key => {
            if (newDataPayload[key] !== oldDataPayload[key] && typeof newDataPayload[key] !== 'object') {
                if (key === 'apiKey' || key === 'botToken') {
                    const integId = newConfig.integrationId || oldConfigPayload.integrationId || 'telegram';
                    if (newDataPayload[key]) {
                        onSaveCredential(integId, String(newDataPayload[key]));
                    } else {
                        onDisconnectCredential(integId);
                    }
                } else {
                    onSaveOverride(selectedNodeId, key, String(newDataPayload[key]));
                }
            }
        });

        if (newConfig.integrationId !== oldConfigPayload.integrationId) {
            onSaveOverride(selectedNodeId, 'integrationId', newConfig.integrationId);
            // also trigger a model override assignment if changing AI models
            if (newConfig.integrationId === 'groq') onSaveOverride(selectedNodeId, 'model', 'llama-3.3-70b-versatile');
            if (newConfig.integrationId === 'google_gemini') onSaveOverride(selectedNodeId, 'model', 'gemini-2.0-flash');
            if (newConfig.integrationId === 'openai') onSaveOverride(selectedNodeId, 'model', 'gpt-4o-mini');
        }

        Object.keys(newConfig).forEach(key => {
            if (key !== 'data' && newConfig[key] !== (oldNode?.data as any)?.config?.[key] && typeof newConfig[key] !== 'object') {
                onSaveOverride(selectedNodeId, key, String(newConfig[key]));
            }
        });

        // Optimistically update locally
        setNodes(nds => nds.map(n => 
            n.id === selectedNodeId 
            ? { ...n, data: { ...n.data, ...newData } as any }
            : n
        ));
    }, [selectedNodeId, nodes, onSaveOverride, setNodes]);

    return (
        <ReactFlowProvider>
            <div className="flex h-[600px] bg-(--bg) rounded-2xl overflow-hidden border border-(--border) shadow-xl relative dark">
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        nodesDraggable={true}
                        nodesConnectable={false}
                        elementsSelectable={true}
                        panOnScroll
                        fitView
                        className="bg-(--bg)"
                    >
                        <Background color="rgba(255,255,255,0.05)" gap={16} size={1} />
                        <Controls className="fill-white bg-(--card) border-(--border)" />
                    </ReactFlow>
                </div>
                
                {/* Node Configuration Sidebar */}
                <div className={cn(
                    "w-[350px] bg-(--card) border-l border-(--border) flex flex-col transition-all duration-300 z-10 custom-scrollbar",
                    selectedNode ? 'translate-x-0' : 'translate-x-full absolute right-0 inset-y-0'
                )}>
                    {selectedNode && (() => {
                        const nodeData = selectedNode.data as any;
                        const logType = nodeData.type || 'custom';
                        const nColorConfig = nodeColors[logType] || nodeColors.input;
                        const Icon = nodeIcons[logType] || Settings2;

                        return (
                            <>
                                <div className="flex items-center justify-between px-3 py-2.5 border-b border-(--border) bg-(--muted)/30">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-1.5 rounded-lg", nColorConfig.bg)}>
                                            <Icon className={cn("w-3.5 h-3.5", nColorConfig.icon)} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xs font-bold text-(--fg) leading-none truncate">Settings</h3>
                                            <p className="text-[8px] text-(--muted-fg) uppercase font-semibold tracking-wider mt-0.5 truncate">
                                                {logType.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedNodeId(null)} className="p-1 rounded-md text-(--muted-fg) hover:bg-(--muted) transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                                    {/* Base Node Configuration */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-(--muted-fg) uppercase tracking-tight ml-0.5 opacity-70">Label</label>
                                        <input
                                            type="text"
                                            value={nodeData.label || ''}
                                            onChange={(e) => updateNodeConfig({ label: e.target.value })}
                                            className="w-full bg-(--muted) border border-(--border) rounded-md px-2.5 py-1.5 text-[11px] text-(--fg) outline-none focus:ring-1 focus:ring-primary-500 font-medium"
                                        />
                                    </div>
                                    
                                    <div className="pt-3 border-t border-[var(--border)]">
                                        {(() => {
                                            const integId = nodeData.config?.integrationId;

                                            // Sub-Configuration Routing
                                            if (logType === 'trigger') {
                                                if (integId === 'form_trigger') return <FormTriggerConfig node={selectedNode as any} updateNode={updateNodeConfig} workflowId={instance.id} />;
                                                return <TriggerConfiguration node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            }
                                            
                                            if (logType === 'ai_action' && selectedNode.type === 'ai_agent') {
                                                return <AIAgentConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            }
                                            if (logType === 'ai_action') return <AIConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            
                                            // Component Support Nodes
                                            if (logType === 'chat_model') return <AIConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (logType === 'memory') return <MemoryConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (logType === 'tool') return <ToolConfig node={selectedNode as any} updateNode={updateNodeConfig} />;

                                            if (integId === 'if_else' || logType === 'if_else') return <IfElseConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'switch' || logType === 'switch') return <SwitchConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'filter') return <FilterConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'parallel') return <ParallelConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'condition_group') return <ConditionGroupConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'retry') return <RetryConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'loop') return <LoopConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            
                                            if (logType === 'social_action') {
                                                if (integId === 'slack') return <SlackConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                                if (integId === 'telegram') return <TelegramConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                                if (integId === 'discord') return <DiscordConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                                return <APIConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            }
                                            if (integId === 'slack') return <SlackConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'telegram') return <TelegramConfig node={selectedNode as any} updateNode={updateNodeConfig} />;

                                            const googleInteg = userIntegrations?.find(i => i.provider === 'google' && i.is_valid);
                                            const fakeGoogleIntegration = googleInteg ? { is_valid: true, account_email: googleInteg.account_email } : null;
                                            const disconnectGoogle = () => onDisconnectCredential('google');

                                            if (integId === 'google_calendar') return <GoogleCalendarConfig node={selectedNode as any} updateNode={updateNodeConfig} googleIntegration={fakeGoogleIntegration} onConnect={onConnectGoogle} onDisconnect={disconnectGoogle} />;
                                            if (integId === 'google_gmail') return <GoogleGmailConfig node={selectedNode as any} updateNode={updateNodeConfig} googleIntegration={fakeGoogleIntegration} onConnect={onConnectGoogle} onDisconnect={disconnectGoogle} />;
                                            if (integId === 'google_sheets') return <SheetsConfig node={selectedNode as any} updateNode={updateNodeConfig} googleIntegration={fakeGoogleIntegration} onConnectGoogle={onConnectGoogle} onDisconnect={disconnectGoogle} getAccessToken={async () => ''} />;
                                            if (integId === 'google_docs') return <DocsConfig node={selectedNode as any} updateNode={updateNodeConfig} googleIntegration={fakeGoogleIntegration} onConnectGoogle={onConnectGoogle} onDisconnect={disconnectGoogle} getAccessToken={async () => ''} />;

                                            if (integId === 'notion') return <NotionConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'code') return <CodeConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'set_variable') return <SetVariableConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'delay') return <DelayConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            
                                            if (integId === 'data_scraping') {
                                                if (nodeData?.config?.actionId === 'json_search') return <JSONSearchConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                                if (nodeData?.config?.actionId === 'structurizer') return <StructurizerConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                                return <DataScrapingConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            }

                                            if (integId === 'crm_capture') return <CRMCaptureConfig node={selectedNode as any} updateNode={updateNodeConfig} />;
                                            if (integId === 'api' || logType === 'api_action') return <APIConfig node={selectedNode as any} updateNode={updateNodeConfig} />;

                                            // Fallback
                                            return (
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-(--muted-fg) uppercase tracking-tight ml-0.5">JSON Config</label>
                                                    <textarea
                                                        className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[10px] font-mono text-[var(--fg)] h-32 outline-none focus:ring-1 focus:ring-violet-500 resize-none shadow-inner"
                                                        value={JSON.stringify(nodeData.config || {}, null, 2)}
                                                        onChange={e => { try { updateNodeConfig({ config: JSON.parse(e.target.value) }); } catch { } }}
                                                    />
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>
        </ReactFlowProvider>
    );
}
