import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--muted)] flex items-center justify-center">
                <SearchX className="w-7 h-7 text-[var(--muted-fg)]" />
            </div>
            <div>
                <h2 className="text-xl font-bold">Page not found</h2>
                <p className="text-sm text-[var(--muted-fg)] mt-1">
                    The page you&apos;re looking for doesn&apos;t exist or was moved.
                </p>
            </div>
            <Link
                href="/dashboard"
                className="inline-flex items-center justify-center h-10 px-5 text-sm rounded-lg font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg transition-all hover:scale-[1.02]"
            >
                Back to dashboard
            </Link>
        </div>
    );
}
