import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch user's purchases with listing and workflow details
        const { data: purchases, error: purchaseErr } = await supabase
            .from('purchases')
            .select(`
                id,
                created_at,
                listing:marketplace_listings (
                    id,
                    title,
                    description,
                    category,
                    seller:profiles (
                        full_name
                    ),
                    workflow:workflows (
                        id,
                        name,
                        status
                    )
                )
            `)
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false });

        if (purchaseErr) throw purchaseErr;

        return NextResponse.json({ automations: purchases || [] });
    } catch (error: any) {
        console.error('[MY AUTOMATIONS ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch your automations' },
            { status: 500 }
        );
    }
}
