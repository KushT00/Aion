import { NextRequest, NextResponse } from 'next/server';

// Initiates Google OAuth2 for requested scopes
// Usage: GET /api/auth/google/connect?scope=calendar|gmail|drive
export async function GET(request: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured in .env.local' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get('scope') || 'gmail';  // gmail | calendar | drive | all

    // Map friendly scope names to Google OAuth scopes
    const scopeMap: Record<string, string[]> = {
        gmail: [
            'https://mail.google.com/',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ],
        calendar: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ],
        drive: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ],
        all: [
            'https://mail.google.com/',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ],
    };

    const scopes = scopeMap[scope] || scopeMap.all;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/google/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        access_type: 'offline',      // gets refresh_token
        prompt: 'consent',           // always show consent to get refresh_token
        state: scope,                // pass back to callback
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return NextResponse.redirect(googleAuthUrl);
}
