import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-[var(--fg)] mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-fg)]">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            'w-full bg-[var(--card)] border border-[var(--border)]',
                            'rounded-lg px-4 py-2.5 text-sm text-[var(--fg)]',
                            'placeholder:text-[var(--muted-fg)]',
                            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
                            'transition-all duration-200',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            icon && 'pl-10',
                            error && 'border-error focus:ring-error/50',
                            className,
                        )}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-error">{error}</p>
                )}
            </div>
        );
    },
);

Input.displayName = 'Input';

export { Input };
