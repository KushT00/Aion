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

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

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
                    <CardDescription>Manage API keys for programmatic access</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 p-4 bg-[var(--muted)] rounded-lg">
                        <code className="flex-1 text-sm font-mono text-[var(--muted-fg)]">
                            aion_sk_••••••••••••••••••••••••
                        </code>
                        <Button variant="outline" size="sm">
                            Regenerate
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-500/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-error">
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
                        <Button variant="danger" size="sm">
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
