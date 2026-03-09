'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
    const { profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && profile && !(profile.is_creator || profile.role === 'creator')) {
            router.replace('/become-creator');
        }
        if (!loading && !profile) {
            router.replace('/login');
        }
    }, [profile, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                    <p className="text-xs text-[var(--muted-fg)] font-bold uppercase tracking-widest">
                        Verifying creator access...
                    </p>
                </div>
            </div>
        );
    }

    // While redirecting, show nothing
    if (!(profile?.is_creator || profile?.role === 'creator')) return null;

    return <>{children}</>;
}
