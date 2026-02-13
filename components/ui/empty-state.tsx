import { cn } from '@/lib/utils';
import { Button } from './button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center py-16 px-4 text-center',
                className,
            )}
        >
            <div className="w-16 h-16 mb-4 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/10 dark:to-primary-600/10 rounded-2xl flex items-center justify-center">
                <Icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--fg)] mb-2">{title}</h3>
            <p className="text-[var(--muted-fg)] max-w-sm mb-6">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction}>{actionLabel}</Button>
            )}
        </div>
    );
}
