import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)]',
                primary:
                    'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-500/10 dark:text-primary-400 dark:border-primary-500/20',
                success:
                    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
                warning:
                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
                error:
                    'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
                info:
                    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
    dot?: boolean;
    pulse?: boolean;
}

export function Badge({ className, variant, dot, pulse, children, ...props }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ variant }), className)} {...props}>
            {dot && (
                <span
                    className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        variant === 'success' && 'bg-emerald-500',
                        variant === 'warning' && 'bg-amber-500',
                        variant === 'error' && 'bg-red-500',
                        variant === 'info' && 'bg-blue-500',
                        variant === 'primary' && 'bg-primary-500',
                        (!variant || variant === 'default') && 'bg-[var(--muted-fg)]',
                        pulse && 'animate-pulse',
                    )}
                />
            )}
            {children}
        </span>
    );
}
