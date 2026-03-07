import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            const user = data.user;
            const supabaseAdmin = createAdminClient();

            // Extract profile info from Google metadata
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

            // Manually sync profile to ensure it exists immediately for the UI
            await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    full_name: fullName,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'id'
                });

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // If error or no code, redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
