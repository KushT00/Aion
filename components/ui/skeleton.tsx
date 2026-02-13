import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Show as a rounded-full circle instead of rounded rectangle */
    circle?: boolean;
}

export function Skeleton({ className, circle, ...props }: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse bg-[var(--muted)]',
                circle ? 'rounded-full' : 'rounded-lg',
                className,
            )}
            {...props}
        />
    );
}

/** Preset: A card-shaped skeleton loader. */
export function SkeletonCard() {
    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-3 pt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
            </div>
        </div>
    );
}

/** Preset: A row-shaped skeleton loader. */
export function SkeletonRow() {
    return (
        <div className="flex items-center gap-4 py-3">
            <Skeleton className="h-10 w-10" circle />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16" />
        </div>
    );
}
