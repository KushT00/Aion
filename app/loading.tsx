import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex min-h-[60vh] w-full items-center justify-center p-20" role="status" aria-label="Loading">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
    );
}
