import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch leads assigned to this creator (where creator_id matches their UUID, or null for pool)
        // For demonstration to ensure they see it: we fetch where creator_id = user.id OR creator_id IS NULL
        const { data: leads, error } = await supabase
            .from('creator_custom_leads')
            .select('*')
            .or(`creator_id.eq.${user.id},creator_id.is.null`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[CREATOR LEADS FETCH ERROR]', error);
            // If the table isn't created yet via migration, we can dynamically fallback to an empty array
            if (error.code === '42P01') {
                return NextResponse.json({
                    success: false,
                    error: 'Table creator_custom_leads does not exist. Please apply the migration.',
                    leads: []
                });
            }
            throw error;
        }

        return NextResponse.json({ success: true, leads });
    } catch (error: any) {
        console.error('[CREATOR LEADS API ERROR]', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
