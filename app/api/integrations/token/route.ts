import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// POST /api/integrations/token — returns a fresh access token for use in node execution.
// Callers are either:
//  1. The signed-in user in the browser (session cookie) — userId must match their own id.
//  2. Our own server-side webhook runner — must send the x-internal-secret header.
function isInternalCaller(request: NextRequest): boolean {
    const secret = process.env.INTERNAL_API_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) return false;
    const header = request.headers.get('x-internal-secret');
    return !!header && header === secret;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        const userId = typeof body?.userId === 'string' ? body.userId : '';
        const provider = typeof body?.provider === 'string' ? body.provider : '';

        if (!userId || !provider) {
            return NextResponse.json({ error: 'userId and provider required' }, { status: 400 });
        }

        if (!isInternalCaller(request)) {
            const supabase = await createClient();
            const { data: { user }, error: authErr } = await supabase.auth.getUser();
            if (authErr || !user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            if (user.id !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const supabase = createAdminClient();

        // Fetch stored integration
        const { data: integration, error } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', provider)
            .single();

        if (error || !integration) {
            return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
        }

        // Check if token is still valid (with 5 min buffer)
        const expiresAt = new Date(integration.token_expires_at).getTime();
        const now = Date.now();
        const bufferMs = 5 * 60 * 1000;

        if (expiresAt - now > bufferMs) {
            // Token still valid
            return NextResponse.json({ access_token: integration.access_token });
        }

        // Token expired — refresh it
        if (!integration.refresh_token) {
            return NextResponse.json({ error: 'No refresh token. User must reconnect.' }, { status: 401 });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: 'OAuth not configured' }, { status: 500 });
        }

        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: integration.refresh_token,
                grant_type: 'refresh_token',
            }),
        });

        if (!refreshResponse.ok) {
            // Mark as invalid so user is prompted to reconnect
            await supabase.from('user_integrations').update({ is_valid: false }).eq('id', integration.id);
            return NextResponse.json({ error: 'Token refresh failed. Please reconnect your Google account.' }, { status: 401 });
        }

        const refreshed = await refreshResponse.json();

        // Update stored token
        await supabase.from('user_integrations').update({
            access_token: refreshed.access_token,
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            is_valid: true,
            updated_at: new Date().toISOString(),
        }).eq('id', integration.id);

        return NextResponse.json({ access_token: refreshed.access_token });
    } catch (err) {
        console.error('[API] Integrations token error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
