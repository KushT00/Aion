'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const supabase = createClient();

    async function handleReset(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback`,
            });
            if (error) {
                toast.error(error.message);
            } else {
                setSent(true);
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] gradient-mesh px-4">
            <div className="w-full max-w-md animate-scale-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2.5 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                            AION
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--fg)] mb-2">Reset your password</h1>
                    <p className="text-[var(--muted-fg)]">We&apos;ll send you a link to reset it</p>
                </div>

                {/* Card */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-xl">
                    {sent ? (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle className="w-7 h-7 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--fg)] mb-2">Check your email</h3>
                            <p className="text-sm text-[var(--muted-fg)] mb-6">
                                We&apos;ve sent a password reset link to <strong>{email}</strong>
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to sign in
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
                            <Input
                                label="Email address"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Button type="submit" className="w-full" loading={loading}>
                                Send reset link
                            </Button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                {!sent && (
                    <p className="text-center text-sm text-[var(--muted-fg)] mt-6">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1 text-primary-500 hover:text-primary-600 font-medium transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to sign in
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}
