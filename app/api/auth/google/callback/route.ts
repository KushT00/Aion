import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Handles Google OAuth2 callback — exchanges code for tokens, stores in Supabase
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // scope string passed from /connect
    const error = searchParams.get('error');
    const origin = request.nextUrl.origin;

    if (error) {
        return NextResponse.redirect(`${origin}/settings?tab=integrations&error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return NextResponse.redirect(`${origin}/settings?tab=integrations&error=no_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || origin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
        return NextResponse.redirect(`${origin}/settings?tab=integrations&error=missing_config`);
    }

    try {
        // 1. Exchange auth code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const err = await tokenResponse.text();
            console.error('Token exchange failed:', err);
            return NextResponse.redirect(`${origin}/settings?tab=integrations&error=token_exchange_failed`);
        }

        const tokens = await tokenResponse.json();
        const { access_token, refresh_token, expires_in, scope } = tokens;

        // 2. Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        const userInfo = await userInfoResponse.json();

        // 3. Get the authenticated AION user from session cookie
        const supabaseServer = await createServerClient();
        const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

        if (authError || !user) {
            return NextResponse.redirect(`${origin}/login?redirect=/settings?tab=integrations`);
        }

        // 4. Upsert integration into Supabase (admin client bypasses RLS)
        const supabaseAdmin = createAdminClient();
        const { error: upsertError } = await supabaseAdmin
            .from('user_integrations')
            .upsert({
                user_id: user.id,
                provider: 'google',
                access_token,
                refresh_token: refresh_token || null,
                token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
                scopes: scope ? scope.split(' ') : [],
                account_email: userInfo.email,
                account_name: userInfo.name,
                metadata: { picture: userInfo.picture },
                is_valid: true,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,provider',
            });

        if (upsertError) {
            console.error('Failed to store tokens:', upsertError);
            return NextResponse.redirect(`${origin}/settings?tab=integrations&error=store_failed`);
        }

        // 5. Redirect back to where they came from (builder or settings)
        const returnTo = request.cookies.get('oauth_return_to')?.value || '/settings?tab=integrations&success=google';
        const response = NextResponse.redirect(`${origin}${returnTo.startsWith('/') ? returnTo : '/' + returnTo}`);
        response.cookies.delete('oauth_return_to');
        return response;

    } catch (err: any) {
        console.error('OAuth callback error:', err);
        return NextResponse.redirect(`${origin}/settings?tab=integrations&error=${encodeURIComponent(err.message)}`);
    }
}
