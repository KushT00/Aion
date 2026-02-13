import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-[var(--bg)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
    {
        variants: {
            variant: {
                primary:
                    'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98]',
                secondary:
                    'bg-[var(--muted)] text-[var(--fg)] hover:bg-[var(--border)] active:scale-[0.98]',
                ghost:
                    'text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)]',
                danger:
                    'bg-error/10 text-error hover:bg-error/20 active:scale-[0.98]',
                outline:
                    'border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--muted)] active:scale-[0.98]',
                gradient:
                    'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
            },
            size: {
                sm: 'h-8 px-3 text-sm rounded-lg',
                md: 'h-10 px-5 text-sm rounded-lg',
                lg: 'h-12 px-6 text-base rounded-xl',
                icon: 'h-9 w-9 rounded-lg',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    },
);

export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(buttonVariants({ variant, size, className }))}
                disabled={disabled || loading}
                {...props}
            >
                {loading && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {children}
            </button>
        );
    },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
