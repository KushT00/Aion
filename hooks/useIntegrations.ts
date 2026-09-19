'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ConnectedIntegration {
    id: string;
    provider: string;
    account_email: string;
    account_name: string;
    scopes: string[];
    token_expires_at: string;
    is_valid: boolean;
    updated_at: string;
    metadata: Record<string, any>;
}

// ─── Module-level cache (60s TTL) ────────────────────────────
// Prevents re-fetching /api/integrations on every component mount.
let _cache: ConnectedIntegration[] | null = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000; // 60 seconds

export function useIntegrations() {
    const [integrations, setIntegrations] = useState<ConnectedIntegration[]>(_cache || []);
    const [loading, setLoading] = useState(_cache === null);

    const fetchIntegrations = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && _cache !== null && now - _cacheTs < CACHE_TTL) {
            setIntegrations(_cache);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/integrations');
            const data = await res.json();
            _cache = data.integrations || [];
            _cacheTs = Date.now();
            setIntegrations(_cache!);
        } catch (e) {
            console.error('Failed to fetch integrations', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIntegrations();
    }, [fetchIntegrations]);

    const getIntegration = useCallback(
        (provider: string) => integrations.find(i => i.provider === provider) ?? null,
        [integrations]
    );

    const isConnected = useCallback(
        (provider: string) => integrations.some(i => i.provider === provider && i.is_valid),
        [integrations]
    );

    // Open Google OAuth in current window, save return-to path
    const connectGoogle = useCallback((scope: 'gmail' | 'calendar' | 'drive' | 'all' = 'all') => {
        // Store current path so callback redirects back to builder
        document.cookie = `oauth_return_to=${window.location.pathname}${window.location.search}; path=/; max-age=300`;
        window.location.href = `/api/auth/google/connect?scope=${scope}`;
    }, []);

    const getAccessToken = useCallback(async (provider: string) => {
        const supabase = createClient();
        // getSession() reads from localStorage — no network round-trip
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const res = await fetch('/api/integrations/token', {
            method: 'POST',
            body: JSON.stringify({ userId: session.user.id, provider }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.access_token as string;
    }, []);

    const disconnect = useCallback(async (provider: string) => {
        await fetch(`/api/integrations?provider=${provider}`, { method: 'DELETE' });
        setIntegrations(prev => prev.filter(i => i.provider !== provider));
    }, []);

    return {
        integrations,
        loading,
        refresh: fetchIntegrations,
        getIntegration,
        isConnected,
        connectGoogle,
        getAccessToken,
        disconnect,
    };
}
