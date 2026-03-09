import { createAdminClient } from '../supabase/admin';

/**
 * Validates a request's API key (Bearer token).
 * Used for public developer APIs.
 */
export async function validateApiKey(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const supabase = createAdminClient();

    const { data: keyRecord, error } = await supabase
        .from('user_api_keys')
        .select('user_id')
        .eq('secret_key', apiKey)
        .eq('is_active', true)
        .single();

    if (error || !keyRecord) {
        return null;
    }

    // Update last used timestamp (fire and forget)
    supabase.from('user_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', (keyRecord as any).id)
        .then();

    return keyRecord.user_id;
}

/**
 * Generates a high-entropy API key.
 */
export function generateApiKey() {
    const buffer = new Uint8Array(24);
    crypto.getRandomValues(buffer);
    const key = Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return `aion_sk_${key}`;
}
