import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkRpc() {
  const { data, error } = await supabaseAdmin.rpc('increment_listing_usage', { listing_id: '00000000-0000-0000-0000-000000000000' });
  if (error && error.message.includes('function does not exist')) {
    console.log('🔴 RPC increment_listing_usage DOES NOT EXIST');
  } else {
    console.log('🟢 RPC increment_listing_usage exists (or failed for other reasons)');
  }
}

checkRpc();
