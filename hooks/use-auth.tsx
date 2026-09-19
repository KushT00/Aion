'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

// Single Supabase client instance for the entire app
const supabase = createClient();

const STORAGE_KEY = 'aion_user_profile';

// ─── In-memory profile cache ──────────────────────────────────
let _profileCache: Profile | null = null;
let _profileUserId: string | null = null;
let _fetchPromise: Promise<Profile | null> | null = null;

async function fetchProfile(userId: string): Promise<Profile | null> {
    if (_profileCache && _profileUserId === userId) {
        return _profileCache;
    }
    if (_fetchPromise && _profileUserId === userId) {
        return _fetchPromise;
    }

    _profileUserId = userId;
    _fetchPromise = (async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, avatar_url, is_creator, role, bio, website')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.warn('[Auth] Failed to fetch profile from Supabase:', error);
                return _profileCache;
            }

            if (data) {
                _profileCache = data as Profile;
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                    } catch (e) { }
                }
            }
            return _profileCache;
        } catch (err) {
            console.error('[Auth] Profile fetch exception:', err);
            return _profileCache;
        } finally {
            _fetchPromise = null;
        }
    })();

    return _fetchPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    // Always start loading on both server and client so hydration matches;
    // the init effect below resolves it. (Reading localStorage for the initial
    // value made the client render content while the server rendered a spinner.)
    const [loading, setLoading] = useState<boolean>(true);
    const initialized = useRef(false);

    const refreshProfile = async () => {
        _profileCache = null;
        _profileUserId = null;
        _fetchPromise = null;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const p = await fetchProfile(session.user.id);
            setProfile(p);
        }
    };

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        let cancelled = false;

        async function init() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (cancelled) return;

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const p = await fetchProfile(currentUser.id);
                    if (!cancelled) setProfile(p);
                } else {
                    if (typeof window !== 'undefined') {
                        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
                    }
                }
            } catch (err) {
                console.error('[Auth] Init error:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                if (cancelled) return;
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                        _profileCache = null;
                        _profileUserId = null;
                    }
                    const p = await fetchProfile(currentUser.id);
                    if (!cancelled && p) setProfile(p);
                } else {
                    _profileCache = null;
                    _profileUserId = null;
                    if (typeof window !== 'undefined') {
                        try {
                            localStorage.removeItem(STORAGE_KEY);
                        } catch (e) { }
                    }
                    setProfile(null);
                }

                if (!cancelled) setLoading(false);
            },
        );

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        _profileCache = null;
        _profileUserId = null;
        _fetchPromise = null;
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.clear();
                sessionStorage.clear();
            } catch (e) { }
        }
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('[Auth] SignOut error:', err);
        } finally {
            setUser(null);
            setProfile(null);
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
