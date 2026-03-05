'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { ViewModeProvider } from '@/components/view-mode-context';
import { AIChatProvider } from '@/components/ai-chat-context';
import { AIChatPanel } from '@/components/ui/ai-chat-panel';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { profile } = useAuth();

    return (
        <ViewModeProvider>
            <AIChatProvider>
                <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
                    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <Topbar
                            onMenuClick={() => setSidebarOpen(true)}
                            userName={profile?.full_name || 'User'}
                            avatarUrl={profile?.avatar_url}
                        />
                        <main className="flex-1 overflow-y-auto">
                            <div className="animate-fade-in">
                                {children}
                            </div>
                        </main>
                    </div>
                    <AIChatPanel />
                </div>
            </AIChatProvider>
        </ViewModeProvider>
    );
}
