import { readFileSync } from 'fs';
import { WorkflowRunner } from './lib/workflow/runner';
import { registry } from './lib/workflow/integrations/registry';

const file = readFileSync('Google_Sheets_to_Email_Workflow.json', 'utf8');
const data = JSON.parse(file);

const engineNodes = data.nodes.map((n: any) => ({
    id: n.id,
    workflow_id: 'local',
    type: n.data.type,
    label: n.data.label,
    position_x: n.position.x,
    position_y: n.position.y,
    config: n.data.config || {}
}));

const engineEdges = data.edges.map((e: any) => {
    let sH = e.sourceHandle || e.source_id || e.src_handle || null;
    let tH = e.targetHandle || e.target_id || e.tgt_handle || null;
    return {
        id: e.id,
        workflow_id: 'local',
        source_node_id: e.source,
        target_node_id: e.target,
        source_handle: sH ? String(sH) : null,
        target_handle: tH ? String(tH) : null,
        label: e.label?.toString() || null
    };
});

async function run() {
    console.log("Edges", engineEdges.map((e: any) => ({ s: e.source_node_id, t: e.target_node_id, sh: e.source_handle, th: e.target_handle })));
    const runner = new WorkflowRunner(engineNodes, engineEdges, {});
    const sorted = (runner as any).getSortedNodes();
    console.log("Sorted order:", sorted.map((n: any) => `${n.type} (${n.id})`));
    
    try {
        await runner.execute({}, (log) => {
            console.log("LOG:", log.nodeId, log.status, log.error || log.output);
        });
    } catch(e) {
        console.error("EXECUTION FAILED:", (e as Error).message);
    }
}

run();
