import { createBrowserClient } from '@supabase/ssr';

// ─── Singleton client ─────────────────────────────────────────
// A single browser Supabase client shared across the whole app.
// Creating a new client per component was causing multiple auth
// sessions to be negotiated and extra round-trips to Supabase.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    if (!_client) {
        _client = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
    }
    return _client;
}
