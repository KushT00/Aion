import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateApiKey } from '@/lib/auth/api-keys';

/**
 * GET /api/v1/leads
 * Fetches the user's custom leads via API key (for external CRMs)
 */
export async function GET(request: NextRequest) {
    // 1. Validate API Key
    const userId = await validateApiKey(request);
    if (!userId) {
        return NextResponse.json({ error: 'Invalid or missing API Key' }, { status: 401 });
    }

    const supabase = createAdminClient();

    try {
        const { data: leads, error } = await supabase
            .from('creator_custom_leads')
            .select('*')
            .eq('creator_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            count: leads.length,
            leads
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
