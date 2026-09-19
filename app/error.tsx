'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[App] Unhandled route error:', error);
    }, [error]);

    return (
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <div>
                <h2 className="text-xl font-bold">Something went wrong</h2>
                <p className="text-sm text-[var(--muted-fg)] mt-1 max-w-md">
                    This section failed to load. Your data is safe — try again, and if it keeps
                    happening, please contact support.
                </p>
            </div>
            <Button onClick={reset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Try again
            </Button>
        </div>
    );
}
