import { WorkflowNode, WorkflowEdge, RunStatus } from "@/types";
import { registry } from "./integrations/registry";

export interface ExecutionContext {
    nodes: Record<string, any>; // nodeId -> output
    env: Record<string, string>;
    trigger: any;
}

export interface RunLog {
    nodeId: string;
    status: "pending" | "running" | "success" | "failed";
    output?: any;
    error?: string;
    timestamp: string;
}

export class WorkflowRunner {
    private nodes: WorkflowNode[];
    private edges: WorkflowEdge[];
    private context: ExecutionContext;
    private logs: RunLog[] = [];

    constructor(nodes: WorkflowNode[], edges: WorkflowEdge[], env: Record<string, string> = {}) {
        this.nodes = nodes;
        this.edges = edges;
        this.context = {
            nodes: {},
            env,
            trigger: {},
        };
    }

    private resolveVariables(config: any): any {
        if (typeof config === "string") {
            // Basic mustache-style resolution: {{nodeId/label.property}}
            return config.replace(/\{\{(.+?)\}\}/g, (_, path) => {
                const parts = path.trim().split(".");
                const identifier = parts[0];
                const propertyPath = parts.slice(1);

                // 1. Resolve environmental variables
                if (identifier === "env") {
                    return this.context.env[propertyPath[0]] || `{{${path}}}`;
                }

                // 2. Try to find node result (by ID or Label)
                let nodeResult = this.context.nodes[identifier];

                const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
                const target = normalize(identifier);

                if (!nodeResult && identifier !== "trigger" && identifier !== "input" && identifier !== "output") {
                    // Try to find by label
                    const nodeByLabel = this.nodes.find(n => normalize(n.label || '') === target);
                    if (nodeByLabel) {
                        nodeResult = this.context.nodes[nodeByLabel.id];
                    }
                }

                // fallback to trigger if identifier is 'trigger', 'output', 'input'
                // OR fallback to trigger as a general context if nothing else matches (bare variables like {{text}})
                let value = nodeResult || (['trigger', 'output', 'input'].includes(target) ? this.context.trigger : this.context.trigger[identifier]);

                // If value is still undefined but identifier is not a reserved name, 
                // it might be a property of the trigger itself (bare variable)
                if (value === undefined && identifier !== 'trigger' && identifier !== 'input' && identifier !== 'output') {
                    value = this.context.trigger[identifier];
                }

                // Debug log
                if (nodeResult || value !== undefined) {
                    console.log(`✅ RESOLVED: "{{${path}}}" -> ${typeof value === 'object' ? '[Object]' : value}`);
                } else {
                    console.log(`❌ FAILED TO RESOLVE: "{{${path}}}"`);
                }

                // 3. Resolve parts
                const effectiveParts = propertyPath[0]?.toLowerCase() === "output" ? propertyPath.slice(1) : propertyPath;

                for (const part of effectiveParts) {
                    if (value === undefined || value === null) break;

                    // Fallback for .text if it doesn't exist (check common keys)
                    if (part === 'text' && value[part] === undefined) {
                        value = value['topic'] ?? value['input'] ?? value['message'] ?? value['content'] ?? value[part];
                    } else {
                        value = value[part];
                    }
                }

                if (value !== undefined && value !== null) {
                    const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    if (strValue.startsWith('"') && strValue.endsWith('"')) {
                        return strValue.slice(1, -1);
                    }
                    return strValue;
                }

                return `{{${path}}}`;
            });
        }

        if (Array.isArray(config)) {
            return config.map((item) => this.resolveVariables(item));
        }

        if (typeof config === "object" && config !== null) {
            const resolved: any = {};
            for (const [key, value] of Object.entries(config)) {
                resolved[key] = this.resolveVariables(value);
            }
            return resolved;
        }

        return config;
    }

    private getSortedNodes(): WorkflowNode[] {
        const sorted: WorkflowNode[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        // Create a map for faster lookup and to ensure we only process existing nodes
        const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

        const visit = (nodeId: string) => {
            if (visiting.has(nodeId)) {
                console.warn(`Cycle detected or complex dependency for node ${nodeId}, skipping dependency check to proceed.`);
                return;
            }
            if (visited.has(nodeId)) return;

            if (!nodeMap.has(nodeId)) {
                return;
            }

            visiting.add(nodeId);

            const incomingEdges = this.edges.filter((e) => e.target_node_id === nodeId);
            for (const edge of incomingEdges) {
                visit(edge.source_node_id);
            }

            visiting.delete(nodeId);
            visited.add(nodeId);
            sorted.push(nodeMap.get(nodeId)!);
        };

        for (const node of this.nodes) {
            visit(node.id);
        }

        return sorted;
    }

    getLogs(): RunLog[] {
        return this.logs;
    }

    async execute(triggerData: any = {}, onLog?: (log: RunLog) => void): Promise<any> {
        this.context.trigger = triggerData;

        try {
            const sortedNodes = this.getSortedNodes();

            if (sortedNodes.length === 0) {
                console.warn("No nodes to execute.");
                return {};
            }

            for (const node of sortedNodes) {
                if (!node) continue; // Safety check

                const log: RunLog = {
                    nodeId: node.id,
                    status: "running",
                    timestamp: new Date().toISOString(),
                };
                this.logs.push(log);
                onLog?.(log);

                try {
                    const config = node.config || {};
                    if (node.config?.integrationId) {
                        let integrationId = node.config.integrationId as string;
                        let actionId = node.config.actionId as string;

                        // Fallback for common integrations
                        if (!actionId) {
                            if (integrationId === 'cron') actionId = 'schedule';
                            if (integrationId === 'api') actionId = 'request';
                        }

                        // Resolve variables in the entire config object
                        let resolvedConfig = this.resolveVariables(node.config);

                        // --- AI AGENT DYNAMIC RESOLUTION ---
                        if (node.type === 'ai_action' || node.config?.originalType === 'ai_action') {
                            const incomingEdges = this.edges.filter(e => e.target_node_id === node.id);

                            // DB items store handles in JSON label. Extract them for matching.
                            const getHandle = (edge: any, type: 'source' | 'target') => {
                                const val = edge[`${type}_handle`] || edge[`${type}Handle`];
                                if (val) return val;
                                try {
                                    const parsed = JSON.parse(edge.label || '{}');
                                    return parsed[`${type}Handle`] || null;
                                } catch (e) { return null; }
                            };

                            const chatModelEdge = incomingEdges.find(e => getHandle(e, 'target') === 'chat_model');
                            const memoryEdge = incomingEdges.find(e => getHandle(e, 'target') === 'memory');
                            const kbEdges = incomingEdges.filter(e => getHandle(e, 'target') === 'knowledge');
                            const toolEdges = incomingEdges.filter(e => getHandle(e, 'target') === 'tools');

                            let modelConfig = chatModelEdge ? this.context.nodes[chatModelEdge.source_node_id] : null;
                            const memoryConfig = memoryEdge ? this.context.nodes[memoryEdge.source_node_id] : null;
                            const kbConfig = kbEdges.map(e => this.context.nodes[e.source_node_id]);
                            const toolsConfig = toolEdges.map(e => this.context.nodes[e.source_node_id]);

                            // If no external model block is connected, use this block's own integration as the model config
                            if (!modelConfig) {
                                modelConfig = {
                                    provider: integrationId === 'google_gemini' ? 'google_gemini' : (integrationId === 'groq' ? 'groq' : 'openai'),
                                    ...resolvedConfig,
                                    ...(resolvedConfig.data || {})
                                };
                            }

                            resolvedConfig = {
                                ...resolvedConfig,
                                agentModel: modelConfig,
                                agentMemory: memoryConfig,
                                agentKB: kbConfig,
                                agentTools: toolsConfig
                            };

                            // UPGRADE: Force all AI Action nodes in the UI to run through the Universal AI Agent handler
                            // This ensures connected tools and memory are actually processed by the LLM
                            integrationId = 'ai';
                            actionId = 'agent';
                        }

                        const action = registry.getAction(integrationId, actionId);
                        if (!action) {
                            throw new Error(`Action ${actionId} not found in ${integrationId}`);
                        }

                        // Merge data into top level for convenient access in actions
                        const actionConfig = {
                            ...resolvedConfig,
                            ...(resolvedConfig.data || {})
                        };

                        const result = await action.execute(actionConfig, this.context);

                        // Check for stop_execution signal
                        if (result && result.stop_execution) {
                            log.status = "success";
                            log.output = result;
                            log.timestamp = new Date().toISOString();
                            onLog?.(log);
                            console.log(`Node ${node.id} stopped execution.`);
                            break;
                        }

                        // CRITICAL FIX: Ensure trigger node propagates message content (text, chat_id, etc)
                        const isTrigger = node.type === 'trigger' || node.config?.originalType === 'trigger';
                        const extraData = isTrigger ? { ...this.context.trigger } : {};

                        this.context.nodes[node.id] = { ...result, ...extraData };

                        // Also update context.trigger so {{trigger.text}} works
                        if (isTrigger) {
                            this.context.trigger = { ...this.context.trigger, ...result };
                        }
                    } else {
                        // For nodes without integration (e.g. Input/Trigger)
                        const isTrigger = node.type === 'trigger' || node.config?.originalType === 'trigger' || node.type === 'input';
                        let outputData = config.triggerData ? { ...config.triggerData } : (config.data ? { ...config.data } : {});

                        if (isTrigger) {
                            outputData = { ...outputData, ...triggerData, ...this.context.trigger };
                            this.context.trigger = outputData; // Sync here too
                        }

                        this.context.nodes[node.id] = outputData;
                    }

                    log.status = "success";
                    log.output = this.context.nodes[node.id];
                    log.timestamp = new Date().toISOString();
                    onLog?.(log);

                } catch (error: any) {
                    log.status = "failed";
                    log.error = error.message;
                    log.timestamp = new Date().toISOString();
                    onLog?.(log);
                    console.error(`Error executing node ${node.id}:`, error);
                    throw error;
                }
            }
        } catch (err) {
            console.error("Workflow Execution Failed:", err);
            throw err;
        }

        return this.context.nodes;
    }
}
