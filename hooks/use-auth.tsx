'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

interface AuthContextValue {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
});

// Single Supabase client instance for the entire app
const supabase = createClient();

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (cancelled) return;
                setUser(user);

                if (user) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    if (!cancelled) setProfile(data as Profile | null);
                }
            } catch (err) {
                console.error('[Auth] Init error:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (cancelled) return;
                setUser(session?.user ?? null);
                if (session?.user) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    if (!cancelled) setProfile(data as Profile | null);
                } else {
                    setProfile(null);
                }
            },
        );

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value= {{ user, profile, loading, signOut }
}>
    { children }
    </AuthContext.Provider>
    );
}

// Use this hook anywhere — it reads from the single AuthProvider, no duplicate calls
export function useAuth() {
    return useContext(AuthContext);
}
