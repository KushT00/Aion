'use client';
import { CheckCircle2, LogOut, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleConnectButtonProps {
    isConnected: boolean;
    accountEmail?: string;
    isValid?: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    scopes?: string[];
    className?: string;
}

export function GoogleConnectButton({
    isConnected, accountEmail, isValid = true,
    onConnect, onDisconnect, scopes, className,
}: GoogleConnectButtonProps) {
    if (isConnected && isValid) {
        return (
            <div className={cn('rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3', className)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        {/* Google G icon */}
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                            <svg viewBox="0 0 24 24" className="w-4 h-4">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Connected
                            </p>
                            <p className="text-[10px] text-[var(--muted-fg)] truncate max-w-[160px]">{accountEmail}</p>
                        </div>
                    </div>
                    <button
                        onClick={onDisconnect}
                        title="Disconnect"
                        className="p-1.5 rounded-lg text-[var(--muted-fg)] hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    // Expired / not connected
    return (
        <button
            onClick={onConnect}
            className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed',
                'border-[var(--border)] hover:border-blue-500/50 hover:bg-blue-500/5',
                'transition-all duration-200 group',
                isConnected && !isValid && 'border-amber-500/40 bg-amber-500/5',
                className,
            )}
        >
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
            </div>
            <div className="text-left">
                {isConnected && !isValid ? (
                    <>
                        <p className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Reconnect Required
                        </p>
                        <p className="text-[10px] text-[var(--muted-fg)]">Token expired — click to reconnect</p>
                    </>
                ) : (
                    <>
                        <p className="text-xs font-semibold text-[var(--fg)] group-hover:text-blue-400 transition-colors">
                            Sign in with Google
                        </p>
                        <p className="text-[10px] text-[var(--muted-fg)]">Connect Gmail, Calendar & Sheets</p>
                    </>
                )}
            </div>
        </button>
    );
}
