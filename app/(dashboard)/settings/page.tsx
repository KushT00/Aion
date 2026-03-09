'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor, Bell, Shield, Key, Trash2 } from 'lucide-react';
import type { Theme } from '@/types';

const themeOptions: { value: Theme; label: string; icon: typeof Sun; desc: string }[] = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Always use light mode' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Always use dark mode' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Follow system preference' },
];

import { useState, useEffect } from 'react';
import { Copy, RefreshCw, Check, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isLoadingKey, setIsLoadingKey] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchApiKey();
    }, []);

    async function fetchApiKey() {
        try {
            const res = await fetch('/api/settings/api-key');
            const data = await res.json();
            if (res.ok) {
                setApiKey(data.apiKey);
            }
        } catch (err) {
            console.error('Failed to fetch API key');
        } finally {
            setIsLoadingKey(false);
        }
    }

    async function handleRegenerate() {
        if (!confirm('Regenerating will invalidate your current API key. Any external integrations using it will break. Continue?')) {
            return;
        }

        setIsRegenerating(true);
        try {
            const res = await fetch('/api/settings/api-key', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setApiKey(data.apiKey);
                setShowKey(true);
                toast.success('New API key generated');
            } else {
                toast.error(data.error || 'Failed to generate key');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setIsRegenerating(false);
        }
    }

    const copyToClipboard = () => {
        if (!apiKey) return;
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 lg:p-8 max-w-3xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--fg)]">Settings</h1>
                <p className="text-[var(--muted-fg)] mt-1">
                    Manage your application preferences and account settings.
                </p>
            </div>

            {/* Appearance */}
            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel of your dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {themeOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setTheme(opt.value)}
                                className={cn(
                                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                                    theme === opt.value
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                                        : 'border-[var(--border)] hover:border-[var(--muted-fg)]',
                                )}
                            >
                                <opt.icon
                                    className={cn(
                                        'w-6 h-6',
                                        theme === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--muted-fg)]',
                                    )}
                                />
                                <span
                                    className={cn(
                                        'text-sm font-medium',
                                        theme === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--fg)]',
                                    )}
                                >
                                    {opt.label}
                                </span>
                                <span className="text-xs text-[var(--muted-fg)]">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notifications
                    </CardTitle>
                    <CardDescription>Configure your notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        { title: 'Workflow runs', desc: 'Get notified when a workflow run completes or fails' },
                        { title: 'Marketplace sales', desc: 'Receive alerts when someone purchases your workflow' },
                        { title: 'System updates', desc: 'Important announcements and platform updates' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium text-[var(--fg)]">{item.title}</p>
                                <p className="text-xs text-[var(--muted-fg)]">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-10 h-5 bg-[var(--muted)] rounded-full peer peer-checked:bg-primary-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                            </label>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* API Keys */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        API Keys
                    </CardTitle>
                    <CardDescription>Use this key to authenticate external API calls to AION</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 p-4 bg-[var(--muted)] rounded-lg group">
                            <code className="flex-1 text-sm font-mono text-[var(--fg)] break-all">
                                {isLoadingKey ? (
                                    <span className="opacity-50">Loading...</span>
                                ) : apiKey ? (
                                    showKey ? apiKey : 'aion_sk_' + '•'.repeat(24)
                                ) : (
                                    <span className="opacity-50 italic">No key generated yet</span>
                                )}
                            </code>
                            <div className="flex items-center gap-1">
                                {apiKey && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setShowKey(!showKey)}
                                        >
                                            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={copyToClipboard}
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        </Button>
                                    </>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-2"
                                    onClick={handleRegenerate}
                                    disabled={isRegenerating}
                                >
                                    {isRegenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Regenerate'}
                                </Button>
                            </div>
                        </div>
                        <p className="text-[10px] text-[var(--muted-fg)] uppercase font-bold tracking-widest">
                            Keep this key secret. It provides full programmatic access to your account.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-500/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[var(--error-fg)]">
                        <Shield className="w-5 h-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>Irreversible and destructive actions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--fg)]">Delete account</p>
                            <p className="text-xs text-[var(--muted-fg)]">
                                Permanently delete your account and all associated data
                            </p>
                        </div>
                        <Button variant="outline" className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/50" size="sm">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Account
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

