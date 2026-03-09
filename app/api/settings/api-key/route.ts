import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateApiKey } from '@/lib/auth/api-keys';

/**
 * GET — Fetch the current user's API key
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: key, error } = await supabase
            .from('user_api_keys')
            .select('secret_key, last_used_at')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return NextResponse.json({
            apiKey: key?.secret_key || null,
            lastUsedAt: key?.last_used_at || null
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST — Generate or Regenerate an API key
 */
export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const newKey = generateApiKey();

        // Deactivate old keys first
        await supabase
            .from('user_api_keys')
            .update({ is_active: false })
            .eq('user_id', user.id);

        // Insert new key
        const { data, error } = await supabase
            .from('user_api_keys')
            .insert({
                user_id: user.id,
                secret_key: newKey,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ apiKey: data.secret_key });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
