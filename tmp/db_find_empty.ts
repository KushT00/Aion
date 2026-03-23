import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function findEmptyListings() {
  const { data: listings } = await supabaseAdmin
    .from('marketplace_listings')
    .select('id, title, workflow_id');

  if (!listings) return;
  
  const results = [];
  for (const l of listings) {
    const { count } = await supabaseAdmin
      .from('workflow_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', l.workflow_id);
    
    if (count === 0) {
      results.push({
        id: l.id,
        title: l.title,
        workflow_id: l.workflow_id
      });
    }
  }
  
  console.log('--- EMPTY LISTINGS ---');
  console.log(JSON.stringify(results, null, 2));

  const { data: instances } = await supabaseAdmin
    .from('consumer_instances')
    .select('id, workflow_id');

  const emptyInstances = [];
  for (const i of instances || []) {
    const { count } = await supabaseAdmin
      .from('workflow_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', i.workflow_id);
    
    if (count === 0) {
      emptyInstances.push({
          id: i.id,
          workflow_id: i.workflow_id
      });
    }
  }
  console.log('\n--- EMPTY INSTANCES ---');
  console.log(JSON.stringify(emptyInstances, null, 2));
}

findEmptyListings();
