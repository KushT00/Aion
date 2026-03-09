'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAIChat } from '@/components/ai-chat-context';
import { useAuth } from '@/hooks/use-auth';
import {
    LayoutDashboard,
    Store,
    Bot,
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
    Inbox,
    Rocket,
    ArrowRight,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

const consumerNav = [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Marketplace', href: '/marketplace', icon: Store },
    { label: 'My Automations', href: '/my-automations', icon: Bot },
    { label: 'Inbox', href: '/inbox', icon: Inbox },
    { label: 'Billing', href: '/billing', icon: CreditCard },
    { label: 'Secret Vault', href: '/vault', icon: ShieldCheck },
];

const creatorNav = [
    { label: 'Creator Dashboard', href: '/creator/dashboard', icon: BarChart3 },
    { label: 'Workflow Builder', href: '/builder', icon: Hammer },
    { label: 'My Workflows', href: '/workflows', icon: GitBranch },
    { label: 'My Listings', href: '/creator/listings', icon: Package },
    { label: 'Inbox', href: '/creator/inbox', icon: Inbox },
    { label: 'Lead CRM', href: '/creator/leads', icon: Users },
    { label: 'Earnings', href: '/creator/earnings', icon: DollarSign },
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
    const { toggle: toggleChat } = useAIChat();
    const { profile } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    // Creator mode: user must BOTH have is_creator=true AND be on a creator path
    const isCreatorPath = pathname.startsWith('/creator') || pathname === '/builder' || pathname.startsWith('/workflows') || pathname.startsWith('/runs');
    const isCreator = profile?.is_creator === true || profile?.role === 'creator';

    // Show creator nav only if user IS a creator AND on a creator route
    const navItems = (isCreator && isCreatorPath) ? creatorNav : consumerNav;
    const sectionLabel = (isCreator && isCreatorPath) ? 'Build & Monetize' : 'Explore Marketplace';

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
                        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all duration-300 shrink-0 border border-white/10 p-0.5 bg-neutral-900">
                            <img
                                src="/logo.png"
                                alt="AION Logo"
                                className="w-full h-full object-cover rounded-lg"
                            />
                        </div>
                        {!collapsed && (
                            <span className="text-xl font-black bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent truncate tracking-tight">
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
                            {sectionLabel}
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
                                        ? 'bg-[var(--muted)] text-primary-500 dark:text-primary-400'
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

                    {/* "Become a Creator" CTA — shown only for non-creators in consumer nav */}
                    {!isCreator && !collapsed && (
                        <div className="mt-4 pt-4 border-t border-[var(--sidebar-border)]">
                            <Link
                                href="/become-creator"
                                onClick={onClose}
                                className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-primary-500/5 dark:bg-primary-500/10 border border-primary-500/10 text-primary-500 dark:text-primary-400 hover:bg-primary-500/10 transition-all group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                                    <Rocket className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black uppercase tracking-tight">Become a Creator</p>
                                    <p className="text-[10px] text-primary-500/70 font-medium">Sell AI automations</p>
                                </div>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </Link>
                        </div>
                    )}
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
                                        ? 'bg-[var(--muted)] text-primary-500 dark:text-primary-400'
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
