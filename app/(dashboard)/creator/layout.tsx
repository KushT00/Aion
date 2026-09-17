'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
    const { profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!profile) {
                router.replace('/login');
            } else if (!profile.is_creator && profile.role !== 'creator') {
                router.replace('/become-creator');
            }
        }
    }, [profile, loading, router]);

    if (loading || !profile) {
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

    if (!(profile.is_creator || profile.role === 'creator')) return null;

    return <>{children}</>;
}
