'use client';

import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from 'react-hot-toast';

export default function InstanceControlLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <div className="min-h-screen bg-[#050505] text-white selection:bg-primary-500/30">
                {children}
            </div>
        </AuthProvider>
    );
}
