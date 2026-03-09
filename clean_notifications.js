const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data: leads } = await supabase.from('creator_custom_leads').select('id');
    const leadIds = leads ? leads.map(l => l.id) : [];
    console.log('Valid Leads:', leadIds.length);

    const { data: notifications } = await supabase.from('notifications').select('id, metadata').eq('type', 'new_lead');
    if (notifications) {
        for (const notif of notifications) {
            if (!notif.metadata.leadId || !leadIds.includes(notif.metadata.leadId)) {
                console.log('Deleting ghost notification:', notif.id);
                await supabase.from('notifications').delete().eq('id', notif.id);
            }
        }
    }
    console.log('Done cleaning notifications');
}
run();
