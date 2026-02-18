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
                const [identifier, ...parts] = path.trim().split(".");

                // 1. Try to find node by ID or Label (fuzzy match for label)
                let nodeResult = this.context.nodes[identifier];
                if (!nodeResult) {
                    const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
                    const target = normalize(identifier);

                    const nodeByLabel = this.nodes.find(n => normalize(n.label) === target);
                    if (nodeByLabel) nodeResult = this.context.nodes[nodeByLabel.id];
                }

                let value = nodeResult || (identifier === "trigger" ? this.context.trigger : undefined);

                // 2. Resolve parts, skip "output" if it's the first part of the result query
                const effectiveParts = parts[0]?.toLowerCase() === "output" ? parts.slice(1) : parts;

                for (const part of effectiveParts) {
                    if (value === undefined || value === null) break;

                    // Specific fallback: if user asks for .text but it doesn't exist, check common alternatives
                    if (part === 'text' && value[part] === undefined) {
                        if (value['topic'] !== undefined) value = value['topic'];
                        else if (value['input'] !== undefined) value = value['input'];
                        else if (value['message'] !== undefined) value = value['message'];
                        else value = value[part];
                    } else {
                        value = value[part];
                    }
                }

                return value !== undefined ? value : `{{${path}}}`;
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
                // If a node is referenced in an edge but doesn't exist, we skip it
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
                    const integrationId = config.integrationId as string;
                    const actionId = config.actionId as string;

                    if (integrationId && actionId) {
                        const action = registry.getAction(integrationId, actionId);
                        if (!action) {
                            throw new Error(`Action ${actionId} not found in ${integrationId}`);
                        }

                        // Resolve variables in the data object, not the top-level config
                        const resolvedData = this.resolveVariables(config.data || {});

                        // Pass the entire resolved context if needed, but actions usually expect specific config
                        const result = await action.execute(resolvedData, this.context);

                        // Check for stop_execution signal
                        if (result && result.stop_execution) {
                            log.status = "success";
                            log.output = result;
                            log.timestamp = new Date().toISOString();
                            onLog?.(log);
                            console.log(`🛑 Node ${node.id} stopped execution.`);
                            break; // Stop the runner loop
                        }

                        // Merge triggerData if present (allows Input Node to provide data AND run action)
                        this.context.nodes[node.id] = { ...result, ...(config.triggerData || {}) };
                    } else {
                        // For nodes without integration (e.g. Input), just pass through or store config
                        // Prioritize triggerData, fall back to data (migration support)
                        const outputData = config.triggerData ? { ...config.triggerData } : (config.data ? { ...config.data } : {});
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
                    // Decide if we want to stop execution on error. For now, yes.
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
