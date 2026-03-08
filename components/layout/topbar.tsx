import { Menu, Search, Hammer } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/ui/notification-bell';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { useViewMode } from '@/components/view-mode-context';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TopbarProps {
    onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
    const { mode } = useViewMode();
    const { profile } = useAuth();
    const isCreator = mode === 'creator';
    const userName = profile?.full_name || 'User';
    const avatarUrl = profile?.avatar_url;

    return (
        <header
            className={cn(
                'h-16 flex items-center gap-4 px-4 lg:px-6 z-30',
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

            <div className="flex items-center gap-4">
                {/* Mode Switcher Shortcut */}
                {!isCreator && (
                    <Link href="/creator/dashboard">
                        <Button variant="outline" size="sm" className="hidden sm:flex h-9 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border-dashed hover:border-primary-500/50">
                            <Hammer className="w-3.5 h-3.5 text-primary-400" />
                            Become a Creator
                        </Button>
                    </Link>
                )}

                {/* Notifications */}
                <NotificationBell />

                {/* Theme toggle */}
                <ThemeToggle />

                {/* Avatar */}
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors shrink-0">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={userName}
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
