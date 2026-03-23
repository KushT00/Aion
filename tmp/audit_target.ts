import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function auditListing() {
  const { data: listings } = await supabaseAdmin
    .from('marketplace_listings')
    .select('*')
    .ilike('title', '%no%');
    
  console.log('--- LISTING DETAILS ---');
  console.log(JSON.stringify(listings, null, 2));
  
  if (listings && listings[0]) {
      const wfId = listings[0].workflow_id;
      const { data: nodes } = await supabaseAdmin.from('workflow_nodes').select('*').eq('workflow_id', wfId);
      console.log(`\nNodes found for workflow ${wfId}: ${nodes?.length || 0}`);
      if (nodes && nodes.length > 0) {
          console.log('First node sample:', JSON.stringify(nodes[0], null, 2));
      }
  }
}

auditListing();
