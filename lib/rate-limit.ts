/**
 * Minimal in-memory per-key rate limiter for public API routes.
 * Note: counters are per server instance (fine for single-instance deploys;
 * use Redis/Upstash for multi-instance production).
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (hits.get(key) || []).filter((t) => t > windowStart);

    if (timestamps.length >= limit) {
        const oldest = timestamps[0] ?? now;
        return { ok: false, retryAfterMs: Math.max(0, windowMs - (now - oldest)) };
    }

    timestamps.push(now);
    hits.set(key, timestamps);

    // Opportunistic cleanup to bound memory
    if (hits.size > 5000) {
        for (const [k, v] of hits) {
            if (v.length === 0 || v[v.length - 1]! < windowStart) hits.delete(k);
            if (hits.size <= 4000) break;
        }
    }

    return { ok: true, retryAfterMs: 0 };
}

export function clientKey(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    return `rl:${ip}`;
}
