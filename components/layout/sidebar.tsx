'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    GitBranch,
    Hammer,
    Store,
    Play,
    User,
    Settings,
    Zap,
    X,
    Sparkles,
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Create Agent', href: '/agent-wizard', icon: Sparkles, highlight: true },
    { label: 'My Workflows', href: '/workflows', icon: GitBranch },
    { label: 'Builder', href: '/builder', icon: Hammer },
    { label: 'Marketplace', href: '/marketplace', icon: Store },
    { label: 'Runs', href: '/runs', icon: Play },
];

const bottomItems = [
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    'fixed top-0 left-0 z-50 h-screen w-64 flex flex-col',
                    'bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]',
                    'transition-transform duration-300 ease-in-out',
                    'lg:translate-x-0 lg:static lg:z-auto',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--sidebar-border)]">
                    <Link href="/dashboard" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                            AION
                        </span>
                    </Link>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-1.5 rounded-lg text-[var(--muted-fg)] hover:bg-[var(--muted)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const isHighlighted = (item as any).highlight;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                                    'transition-all duration-200',
                                    isHighlighted && !isActive && 'bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400 hover:from-primary-500/20 hover:to-accent-500/20',
                                    isActive && !isHighlighted
                                        ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                                        : !isHighlighted && 'text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)]',
                                    isActive && isHighlighted && 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25'
                                )}
                            >
                                <item.icon className="w-[18px] h-[18px]" />
                                {item.label}
                                {isHighlighted && !isActive && (
                                    <span className="ml-auto text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">
                                        New
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom items */}
                <div className="px-3 py-4 space-y-1 border-t border-[var(--sidebar-border)]">
                    {bottomItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                                    'transition-all duration-200',
                                    isActive
                                        ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                                        : 'text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)]',
                                )}
                            >
                                <item.icon className="w-[18px] h-[18px]" />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </aside>
        </>
    );
}
