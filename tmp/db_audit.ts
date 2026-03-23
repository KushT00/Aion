import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkRecentWorkflows() {
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const { data: workflows } = await supabaseAdmin
    .from('workflows')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\n--- RECENT WORKFLOWS ---');
  if (!workflows || workflows.length === 0) {
      console.log('No workflows found or error:', workflows);
  } else {
      for (const wf of workflows) {
        const { count: nodeCount } = await supabaseAdmin
          .from('workflow_nodes')
          .select('id', { count: 'exact', head: true })
          .eq('workflow_id', wf.id);

        const { count: edgeCount } = await supabaseAdmin
          .from('workflow_edges')
          .select('id', { count: 'exact', head: true })
          .eq('workflow_id', wf.id);

        console.log(`Workflow: ${wf.name} (${wf.id})`);
        console.log(`- Created: ${wf.created_at}`);
        console.log(`- Nodes: ${nodeCount}`);
        console.log(`- Edges: ${edgeCount}`);
      }
  }

  const { data: listings } = await supabaseAdmin
    .from('marketplace_listings')
    .select('id, title, workflow_id, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\n--- RECENT LISTINGS ---');
  if (!listings || listings.length === 0) {
      console.log('No listings found.');
  } else {
      for (const l of listings) {
        console.log(`Listing: ${l.title} (${l.id})`);
        console.log(`- Workflow ID: ${l.workflow_id}`);
        
        // Check if the linked workflow has nodes
        const { count: nNodeCount } = await supabaseAdmin
          .from('workflow_nodes')
          .select('id', { count: 'exact', head: true })
          .eq('workflow_id', l.workflow_id);
          
        console.log(`  - Linked Workflow Nodes: ${nNodeCount}`);
      }
  }
  
  const { data: instances } = await supabaseAdmin
    .from('consumer_instances')
    .select('id, workflow_id, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\n--- RECENT INSTANCES ---');
  if (!instances || instances.length === 0) {
      console.log('No instances found.');
  } else {
      for (const i of instances) {
        console.log(`Instance: ${i.id}`);
        console.log(`- Workflow ID: ${i.workflow_id}`);
        
        const { count: iNodeCount } = await supabaseAdmin
          .from('workflow_nodes')
          .select('id', { count: 'exact', head: true })
          .eq('workflow_id', i.workflow_id);
          
        console.log(`  - Instance Workflow Nodes: ${iNodeCount}`);
      }
  }
}

checkRecentWorkflows();
