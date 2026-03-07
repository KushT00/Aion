import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedPaths = ['/dashboard', '/builder', '/marketplace', '/runs', '/profile', '/settings', '/workflows', '/creator', '/my-automations', '/billing', '/agent-wizard'];
const authPaths = ['/login', '/signup', '/forgot-password'];

export async function updateSession(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip auth check entirely for non-protected, non-auth routes (API, etc.)
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
    const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

    if (!isProtected && !isAuthPage) {
        return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value),
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    // IMPORTANT: This refreshes the auth token — only called for protected/auth routes now.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (isProtected && !user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    if (isAuthPage && user) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
