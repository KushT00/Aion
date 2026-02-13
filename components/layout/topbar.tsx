'use client';

import { Menu, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';

interface TopbarProps {
    onMenuClick: () => void;
    userName?: string | null;
    avatarUrl?: string | null;
}

export function Topbar({ onMenuClick, userName, avatarUrl }: TopbarProps) {
    return (
        <header
            className={cn(
                'sticky top-0 z-30 h-16 flex items-center gap-4 px-4 lg:px-6',
                'bg-[var(--topbar-bg)] backdrop-blur-xl',
                'border-b border-[var(--border)]',
            )}
        >
            {/* Mobile menu button */}
            <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-lg text-[var(--muted-fg)] hover:bg-[var(--muted)] transition-colors"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="flex-1 max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                    <input
                        type="text"
                        placeholder="Search workflows, marketplace..."
                        className={cn(
                            'w-full bg-[var(--muted)] border border-transparent',
                            'rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--fg)]',
                            'placeholder:text-[var(--muted-fg)]',
                            'focus:outline-none focus:bg-[var(--card)] focus:border-[var(--border)]',
                            'transition-all duration-200',
                        )}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <ThemeToggle />

                {/* Avatar */}
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={userName || 'User'}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-[var(--border)]"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                            {getInitials(userName)}
                        </div>
                    )}
                </button>
            </div>
        </header>
    );
}
