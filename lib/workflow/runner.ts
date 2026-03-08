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
                        if (nodeResult) {
                            console.log(`🔍 [VAR] Matched label "${identifier}" to node ID "${nodeByLabel.id}"`);
                        } else {
                            console.warn(`⚠️ [VAR] Node label "${identifier}" matched ID "${nodeByLabel.id}", but NO output data found yet. Is it connected?`);
                        }
                    }
                }

                // fallback to trigger if identifier is 'trigger', 'output', 'input'
                // OR fallback to trigger as a general context if nothing else matches
                let value = nodeResult || (['trigger', 'output', 'input'].includes(target) ? this.context.trigger : (this.context.trigger[identifier] ?? this.context.trigger.currentItem?.[identifier]));

                // If value is still undefined but identifier is not a reserved name,
                // it might be a property of the trigger itself (bare variable)
                if (value === undefined && identifier !== 'trigger' && identifier !== 'input' && identifier !== 'output') {
                    value = this.context.trigger[identifier] ?? this.context.trigger.currentItem?.[identifier];
                }

                // --- NEW: AUTO-SCOPE RECOVERY ---
                // If it's a loop and the user just typed {{Name}} instead of {{currentItem.Name}}
                // and we haven't found a match yet, try currentItem.
                if (value === undefined && this.context.trigger.currentItem) {
                    const potentialMatch = this.context.trigger.currentItem[identifier];
                    if (potentialMatch !== undefined) {
                        value = potentialMatch;
                    }
                }

                // Debug log
                if (nodeResult || value !== undefined) {
                    console.log(`✅ RESOLVED: "${path}" -> ${typeof value === 'object' ? '[Object]' : value}`);
                } else {
                    console.error(`❌ FAILED TO RESOLVE: "{{${path}}}"`);
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

    // ─── BFS to find all downstream node IDs from a starting node ───────────
    private getDownstreamNodeIds(startNodeId: string): string[] {
        const downstream = new Set<string>();
        const queue = [startNodeId];

        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            const outgoing = this.edges.filter(e => e.source_node_id === nodeId);
            for (const edge of outgoing) {
                if (!downstream.has(edge.target_node_id)) {
                    downstream.add(edge.target_node_id);
                    queue.push(edge.target_node_id);
                }
            }
        }

        return Array.from(downstream);
    }

    getLogs(): RunLog[] {
        return this.logs;
    }

    // ─── Execute a single node — returns true if execution should stop ───────
    private async executeNodeOnce(node: WorkflowNode, onLog?: (log: RunLog) => void): Promise<boolean> {
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
                if (node.type === 'ai_action' || node.type === 'ai_agent' || node.config?.originalType === 'ai_action') {
                    const incomingEdges = this.edges.filter(e => e.target_node_id === node.id);
                    console.log(`🧠 [RUNNER] Resolving AI Agent context for ${node.id} (${incomingEdges.length} connections)`);

                    const getHandle = (edge: any, type: 'source' | 'target') => {
                        const val = edge[`${type}_handle`] || edge[`${type}Handle`];
                        if (val) return val;
                        try {
                            const parsed = JSON.parse(edge.label || '{}');
                            return parsed[`${type}Handle`] || null;
                        } catch (e) { return null; }
                    };

                    const chatModelEdge = incomingEdges.find(e => {
                        const h = getHandle(e, 'target');
                        console.log(`   🔗 INBOUND: ${e.source_node_id} -> ${h}`);
                        return h === 'chat_model';
                    });
                    const memoryEdge = incomingEdges.find(e => getHandle(e, 'target') === 'memory');
                    const kbEdges = incomingEdges.filter(e => {
                        const h = getHandle(e, 'target');
                        return h === 'knowledge' || !h;
                    });
                    const toolEdges = incomingEdges.filter(e => getHandle(e, 'target') === 'tools');
                    console.log(`   ✅ Matched: ChatModel=${!!chatModelEdge}, Memory=${!!memoryEdge}, KB=${kbEdges.length}, Tools=${toolEdges.length}`);

                    let modelConfig = chatModelEdge ? this.context.nodes[chatModelEdge.source_node_id] : null;
                    const memoryConfig = memoryEdge ? this.context.nodes[memoryEdge.source_node_id] : null;
                    const kbConfig = kbEdges.map(e => this.context.nodes[e.source_node_id]);
                    const toolsConfig = toolEdges.map(e => this.context.nodes[e.source_node_id]);

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

                    integrationId = 'ai';
                    actionId = 'agent';
                }

                const action = registry.getAction(integrationId, actionId);
                if (!action) {
                    throw new Error(`Action ${actionId} not found in ${integrationId}`);
                }

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
                    return true; // Signal to stop
                }

                // CRITICAL FIX: Ensure trigger node propagates message content
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
                    outputData = { ...outputData, ...this.context.trigger };
                    this.context.trigger = outputData;
                }

                this.context.nodes[node.id] = outputData;
            }

            log.status = "success";
            log.output = this.context.nodes[node.id];
            log.timestamp = new Date().toISOString();
            onLog?.(log);
            return false; // Continue execution

        } catch (error: any) {
            log.status = "failed";
            log.error = error.message;
            log.timestamp = new Date().toISOString();
            onLog?.(log);
            throw error;
        }
    }

    private getRetryNodeFor(node: WorkflowNode): WorkflowNode | null {
        const edges = this.edges.filter(e => e.source_node_id === node.id);
        for (const edge of edges) {
            const targetNode = this.nodes.find(n => n.id === edge.target_node_id);
            const config = (targetNode?.config as any) || {};
            if (config.integrationId === 'retry' || (targetNode?.type as string) === 'retry' || config.originalType === 'retry') {
                return targetNode as WorkflowNode;
            }
        }
        return null;
    }

    private async handleRetry(node: WorkflowNode, retryNode: WorkflowNode, error: any, onLog?: (log: RunLog) => void): Promise<boolean> {
        const config = (retryNode.config as any)?.data || {};
        const maxAttempts = parseInt(config.maxAttempts || "3");
        const delay = parseInt(config.delay || "2"); // Default 2s for safety

        const nodeData = this.context.nodes[node.id] || {};
        const currentAttempts = (nodeData._retryAttempts || 0) + 1;

        // Update attempts in context
        this.context.nodes[node.id] = { ...nodeData, _retryAttempts: currentAttempts };

        if (currentAttempts <= maxAttempts) {
            const log: RunLog = {
                nodeId: retryNode.id,
                status: "running",
                timestamp: new Date().toISOString(),
                error: `[Retry ${currentAttempts}/${maxAttempts}] Previous node "${node.label || node.id}" failed: ${error.message}. Waiting ${delay}s...`
            };
            this.logs.push(log);
            onLog?.(log);

            console.log(`🔄 [RETRY] Node "${node.label || node.id}" failed. Attempt ${currentAttempts}/${maxAttempts}. Waiting ${delay}s...`);
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
            return true;
        }

        console.error(`❌ [RETRY] Node "${node.label || node.id}" failed after ${maxAttempts} attempts.`);
        return false;
    }

    async execute(triggerData: any = {}, onLog?: (log: RunLog) => void): Promise<any> {
        this.context.trigger = triggerData;

        try {
            console.log(`📡 [RUNNER] Loaded ${this.nodes.length} nodes and ${this.edges.length} edges.`);
            this.edges.forEach(e => {
                const anyEdge = e as any;
                const sH = anyEdge.source_handle || anyEdge.sourceHandle || anyEdge.source_id || anyEdge.sourceId;
                const tH = anyEdge.target_handle || anyEdge.targetHandle || anyEdge.target_id || anyEdge.targetId;
                console.log(`   🔸 EDGE: ${e.source_node_id} -> ${e.target_node_id} (S-Handle: ${sH}, T-Handle: ${tH})`);
            });

            const sortedNodes = this.getSortedNodes();

            if (sortedNodes.length === 0) {
                console.warn("No nodes to execute.");
                return {};
            }

            const prunedNodeIds = new Set<string>();
            const handledNodeIds = new Set<string>();

            for (let i = 0; i < sortedNodes.length; i++) {
                const node = sortedNodes[i];
                if (!node || handledNodeIds.has(node.id)) continue;

                if (prunedNodeIds.has(node.id)) {
                    console.log(`🚫 [RUNNER] Skipping pruned node: ${node.label || node.id}`);
                    continue;
                }

                console.log(`🚀 [RUNNER] Executing node: ${node.label || node.id} (${node.type})`);

                try {
                    const isLoopNode = node.config?.integrationId === 'loop' || node.config?.actionId === 'for_each';

                    if (isLoopNode) {
                        // ─── LOOP EXECUTION ──────────────────────────────────────
                        console.log(`🔁 [RUNNER] Loop node detected: ${node.id} (${node.label})`);

                        // 1. Execute the loop node itself to get the items array
                        const shouldStop = await this.executeNodeOnce(node, onLog);
                        if (shouldStop) break;

                        const loopResult = this.context.nodes[node.id];
                        const items: any[] = loopResult?.items;

                        if (!Array.isArray(items) || items.length === 0) {
                            console.log(`🔁 [LOOP] No items to iterate. Skipping downstream nodes.`);
                            // Mark downstream nodes as handled so they don't run again
                            const downstreamIds = this.getDownstreamNodeIds(node.id);
                            downstreamIds.forEach(id => handledNodeIds.add(id));
                            continue;
                        }

                        console.log(`🔁 [LOOP] Starting iteration over ${items.length} items.`);

                        // 2. Identify downstream subgraph (nodes reachable from the loop node)
                        const downstreamIds = this.getDownstreamNodeIds(node.id);
                        // Preserve topological order by filtering sortedNodes
                        const downstreamNodes = sortedNodes.filter(n => downstreamIds.includes(n.id));
                        // Mark all downstream nodes as "handled" so the main loop skips them
                        downstreamIds.forEach(id => handledNodeIds.add(id));

                        // 3. Save the base trigger context so we can restore it between iterations
                        const baseTrigger = { ...this.context.trigger };
                        const iterationResults: any[] = [];

                        // 4. Execute downstream subgraph once per item
                        for (let j = 0; j < items.length; j++) {
                            const currentItem = items[j];
                            console.log(`🔁 [LOOP] Iteration ${j + 1}/${items.length}:`, JSON.stringify(currentItem).substring(0, 100));

                            // ── CRITICAL: Clear downstream node outputs from previous iteration ──
                            downstreamNodes.forEach(dn => {
                                delete this.context.nodes[dn.id];
                            });

                            // Inject currentItem 
                            this.context.nodes[node.id] = { ...loopResult, currentItem, currentIndex: j };
                            this.context.trigger = {
                                ...baseTrigger,
                                currentItem,
                                currentIndex: j,
                                loop: { item: currentItem, index: j, total: items.length },
                                _isLoopIteration: true,
                            };

                            let lastNodeOutput: any = null;
                            let iterationFailed = false;

                            for (const downNode of downstreamNodes) {
                                try {
                                    const shouldStopDown = await this.executeNodeOnce(downNode, onLog);
                                    lastNodeOutput = this.context.nodes[downNode.id];
                                    if (shouldStopDown) break;
                                } catch (iterErr: any) {
                                    console.error(`🔁 [LOOP] Iteration ${j + 1} failed at node "${downNode.label}": ${iterErr.message}`);
                                    iterationFailed = true;
                                    break;
                                }
                            }

                            iterationResults.push({
                                index: j,
                                item: currentItem,
                                result: lastNodeOutput,
                                success: !iterationFailed,
                            });
                        }

                        // 5. Restore trigger and store aggregated loop results
                        this.context.trigger = baseTrigger;
                        this.context.nodes[node.id] = {
                            ...loopResult,
                            results: iterationResults,
                            completedIterations: iterationResults.length,
                            successCount: iterationResults.filter(r => r.success).length,
                        };

                        console.log(`🔁 [LOOP] Completed. ${iterationResults.filter(r => r.success).length}/${items.length} succeeded.`);

                    } else {
                        // ─── NORMAL, IF/ELSE OR SWITCH EXECUTION ────────────────
                        const config = node.config || {};
                        const isIntegIfElse = config?.integrationId === 'if_else' || config?.actionId === 'condition';
                        const isIntegSwitch = config?.integrationId === 'switch' || config?.actionId === 'evaluate';

                        const isLogicBranchNode = (node.type as string) === 'if_else' || (node.type as string) === 'switch' ||
                            node.config?.originalType === 'if_else' || node.config?.originalType === 'switch' ||
                            ((node.type as string) === 'logic_gate' && (isIntegIfElse || isIntegSwitch));

                        if (isLogicBranchNode) {
                            // --- BRANCHING LOGIC EVALUATION ---
                            const shouldStop = await this.executeNodeOnce(node, onLog);
                            if (shouldStop) break;

                            const result = this.context.nodes[node.id];
                            const selectedBranch = result?.branch || 'default';

                            console.log(`⚖️ [LOGIC] Node: ${node.label || node.id}, Selected Branch: "${selectedBranch}"`);

                            const debugInfo: any = {
                                selectedBranch,
                                edgesFound: [],
                                allEdgesForNode: this.edges.filter(e => e.source_node_id === node.id).map(e => ({
                                    tgt: e.target_node_id,
                                    sH: (e as any).source_handle || (e as any).sourceHandle
                                }))
                            };

                            const pruneEdges = this.edges.filter(e => {
                                if (e.source_node_id !== node.id) return false;

                                let sHandle = (e as any).source_handle || (e as any).sourceHandle;
                                if (!sHandle) {
                                    try {
                                        const parsed = JSON.parse(e.label || '{}');
                                        sHandle = parsed.sourceHandle;
                                    } catch (err) { }
                                }

                                const normalizedHandle = String(sHandle || '').toLowerCase().trim();
                                // Logic: Prune if the edge handle DOES NOT match the selected branch handle
                                const shouldPrune = normalizedHandle !== String(selectedBranch).toLowerCase().trim();

                                debugInfo.edgesFound.push({
                                    target: e.target_node_id,
                                    handle: sHandle,
                                    normalizedHandle,
                                    shouldPrune
                                });

                                return shouldPrune;
                            });

                            if (pruneEdges.length > 0) {
                                const gatherDownstream = (nId: string) => {
                                    if (prunedNodeIds.has(nId)) return;
                                    prunedNodeIds.add(nId);
                                    this.edges.filter(e => e.source_node_id === nId).forEach(e => gatherDownstream(e.target_node_id));
                                };

                                pruneEdges.forEach(e => gatherDownstream(e.target_node_id));
                                console.log(`✂️ [LOGIC] Pruning ${pruneEdges.length} unused branches. Total pruned nodes:`, Array.from(prunedNodeIds).length);
                                this.context.nodes[node.id]._debug = debugInfo;
                            }
                        } else {
                            // NORMAL SEQUENTIAL
                            const shouldStop = await this.executeNodeOnce(node, onLog);
                            if (shouldStop) break;
                        }
                    }
                } catch (nodeErr: any) {
                    const retryNode = this.getRetryNodeFor(node);
                    if (retryNode) {
                        const shouldRetry = await this.handleRetry(node, retryNode, nodeErr, onLog);
                        if (shouldRetry) {
                            i--; // RE-RUN THIS NODE
                            continue;
                        }
                    }
                    // Final failure or no retry configured
                    throw nodeErr;
                }
            }
        } catch (err) {
            console.error("Workflow Execution Failed:", err);
            throw err;
        }

        return this.context.nodes;
    }
}
