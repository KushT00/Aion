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

                // 1. Try to find node by ID or Label
                let nodeResult = this.context.nodes[identifier];
                if (!nodeResult) {
                    const nodeByLabel = this.nodes.find(n => n.label.toLowerCase() === identifier.toLowerCase());
                    if (nodeByLabel) nodeResult = this.context.nodes[nodeByLabel.id];
                }

                let value = nodeResult || (identifier === "trigger" ? this.context.trigger : undefined);

                // 2. Resolve parts, skip "output" if it's the first part of the result query
                const effectiveParts = parts[0]?.toLowerCase() === "output" ? parts.slice(1) : parts;

                for (const part of effectiveParts) {
                    if (value === undefined || value === null) break;
                    value = value[part];
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

        const visit = (nodeId: string) => {
            if (visiting.has(nodeId)) throw new Error("Cycle detected in workflow");
            if (visited.has(nodeId)) return;

            visiting.add(nodeId);

            const incomingEdges = this.edges.filter((e) => e.target_node_id === nodeId);
            for (const edge of incomingEdges) {
                visit(edge.source_node_id);
            }

            visiting.delete(nodeId);
            visited.add(nodeId);
            sorted.push(this.nodes.find((n) => n.id === nodeId)!);
        };

        for (const node of this.nodes) {
            visit(node.id);
        }

        return sorted;
    }

    async execute(triggerData: any = {}, onLog?: (log: RunLog) => void): Promise<any> {
        this.context.trigger = triggerData;
        const sortedNodes = this.getSortedNodes();

        for (const node of sortedNodes) {
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

                if (!integrationId || !actionId) {
                    // Fallback for simple nodes or logic
                    this.context.nodes[node.id] = config;
                } else {
                    const action = registry.getAction(integrationId, actionId);
                    if (!action) throw new Error(`Action ${actionId} not found in ${integrationId}`);

                    const resolvedConfig = this.resolveVariables(config.data || {});
                    const result = await action.execute(resolvedConfig, this.context);
                    this.context.nodes[node.id] = result;
                }

                log.status = "success";
                log.output = this.context.nodes[node.id];
            } catch (error: any) {
                log.status = "failed";
                log.error = error.message;
                onLog?.(log);
                throw error;
            }

            log.timestamp = new Date().toISOString();
            onLog?.(log);
        }

        return this.context.nodes;
    }
}
