'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useViewMode } from '@/components/view-mode-context';
import { useAIChat } from '@/components/ai-chat-context';
import {
    LayoutDashboard,
    Store,
    Bot,
    Zap,
    X,
    Settings,
    User,
    CreditCard,
    BarChart3,
    Hammer,
    GitBranch,
    Package,
    Users,
    DollarSign,
    MessageSquare,
    Play,
    Sparkles,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const consumerNav = [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Marketplace', href: '/marketplace', icon: Store },
    { label: 'My Automations', href: '/my-automations', icon: Bot },
    { label: 'Billing', href: '/billing', icon: CreditCard },
];

const creatorNav = [
    { label: 'Creator Dashboard', href: '/creator/dashboard', icon: BarChart3 },
    { label: 'Workflow Builder', href: '/builder', icon: Hammer },
    { label: 'My Workflows', href: '/workflows', icon: GitBranch },
    { label: 'My Listings', href: '/creator/listings', icon: Package },
    { label: 'Lead CRM', href: '/creator/leads', icon: Users },
    { label: 'Earnings', href: '/creator/earnings', icon: DollarSign },
    { label: 'Runs', href: '/runs', icon: Play },
    { label: 'Create Agent', href: '/agent-wizard', icon: Sparkles, highlight: true },
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
    const { toggle: toggleChat } = useAIChat();
    const [collapsed, setCollapsed] = useState(false);

    // Determine if we are in "Creator Studio" based on URL
    const isCreatorPath = pathname.startsWith('/creator') || pathname === '/builder' || pathname.startsWith('/workflows') || pathname.startsWith('/runs') || pathname.startsWith('/agent-wizard');
    const navItems = isCreatorPath ? creatorNav : consumerNav;

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
                    'fixed top-0 left-0 z-50 h-screen flex flex-col',
                    'bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] transition-all duration-300 ease-in-out',
                    'lg:translate-x-0 lg:static lg:z-auto',
                    open ? 'translate-x-0' : '-translate-x-full',
                    collapsed ? 'w-20' : 'w-64'
                )}
            >
                {/* Logo Section */}
                <div className={cn(
                    "flex items-center h-16 border-b border-[var(--sidebar-border)] transition-all overflow-hidden",
                    collapsed ? "justify-center px-0" : "justify-between px-5"
                )}>
                    <Link href="/dashboard" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow shrink-0">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        {!collapsed && (
                            <span className="text-lg font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent truncate">
                                AION
                            </span>
                        )}
                    </Link>
                    {!collapsed && (
                        <button
                            onClick={onClose}
                            className="lg:hidden p-1.5 rounded-lg text-[var(--muted-fg)] hover:bg-[var(--muted)] transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>


                {/* Section Label */}
                {!collapsed && (
                    <div className="px-5 pt-3 pb-1 animate-in fade-in scale-95 origin-left duration-300">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-fg)]">
                            {isCreatorPath ? 'Build & Monetize' : 'Explore Marketplace'}
                        </span>
                    </div>
                )}

                {/* Main nav */}
                <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto no-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const isHighlighted = (item as any).highlight;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                title={collapsed ? item.label : ""}
                                className={cn(
                                    'flex items-center rounded-lg text-sm font-medium transition-all duration-200',
                                    collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                                    isHighlighted && !isActive && 'bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400 hover:from-primary-500/20 hover:to-accent-500/20',
                                    isActive && !isHighlighted
                                        ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                                        : !isHighlighted && 'text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)] transition-colors',
                                    isActive && isHighlighted && 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25',
                                )}
                            >
                                <item.icon className="w-[18px] h-[18px] shrink-0" />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                                {!collapsed && isHighlighted && !isActive && (
                                    <span className="ml-auto text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">New</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom items */}
                <div className="px-3 py-4 space-y-1 border-t border-[var(--sidebar-border)] relative">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(
                            "absolute -right-3 top-0 -translate-y-1/2 hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] text-[var(--muted-fg)] hover:text-[var(--fg)] hover:border-primary-500/50 shadow-sm transition-all z-10",
                            collapsed && "rotate-180"
                        )}
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {bottomItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                title={collapsed ? item.label : ""}
                                className={cn(
                                    'flex items-center rounded-lg text-sm font-medium transition-all duration-200',
                                    collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                                    isActive
                                        ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                                        : 'text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)]',
                                )}
                            >
                                <item.icon className="w-[18px] h-[18px] shrink-0" />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                            </Link>
                        );
                    })}
                </div>
            </aside>
        </>
    );
}
