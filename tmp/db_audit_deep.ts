import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function deepAudit() {
  console.log('--- DEEP AUDIT OF LISTINGS ---');
  const { data: listings } = await supabaseAdmin
    .from('marketplace_listings')
    .select('id, title, workflow_id, created_at')
    .order('created_at', { ascending: false });

  if (!listings) return;
  for (const l of listings) {
    const { count: nodes } = await supabaseAdmin
      .from('workflow_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', l.workflow_id);
      
    const { data: wf } = await supabaseAdmin
      .from('workflows')
      .select('name, status, user_id')
      .eq('id', l.workflow_id)
      .maybeSingle();

    console.log(`Listing: ${l.title} (${l.id})`);
    console.log(`- Workflow: ${wf?.name || 'NOT FOUND'} (${l.workflow_id})`);
    console.log(`- Status: ${wf?.status || 'N/A'}`);
    console.log(`- User: ${wf?.user_id || 'N/A'}`);
    console.log(`- Nodes in DB: ${nodes}`);
    
    if (nodes === 0) {
        console.warn('⚠️  CRITICAL: Listing pointing to empty workflow nodes table!');
    }
    console.log('---');
  }

  console.log('\n--- DEEP AUDIT OF INSTANCES ---');
  const { data: instances } = await supabaseAdmin
    .from('consumer_instances')
    .select('id, workflow_id, listing_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!instances) return;
  for (const i of instances) {
    const { count: nodes } = await supabaseAdmin
      .from('workflow_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', i.workflow_id);

    console.log(`Instance: ${i.id}`);
    console.log(`- Source Listing: ${i.listing_id}`);
    console.log(`- Cloned Workflow: ${i.workflow_id}`);
    console.log(`- Nodes in Cloned Workflow: ${nodes}`);
    console.log('---');
  }
}

deepAudit();
