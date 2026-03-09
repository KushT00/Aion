const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.AION_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testUpdate() {
    const testProfile = {
        expertise: "Lead Gen specialist",
        skills: ["Node.js", "AI APIs"],
        experience_years: 3,
        bio: "Test actual bio.",
        work_style: "Custom Builds",
        specializations: [],
        portfolio_links: [],
        automation_categories: []
    };

    // Update the first creator user
    const { data, error } = await supabase.from('profiles').update({ creator_profile: testProfile, is_creator: true }).eq('role', 'creator').select();
    console.log(JSON.stringify({ data, error }, null, 2));
}

testUpdate();
