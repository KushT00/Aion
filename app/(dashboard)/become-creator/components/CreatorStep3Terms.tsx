'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRight, ArrowLeft, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';

interface CreatorStep3TermsProps {
    onNext: (data: any) => void;
    onBack: () => void;
    formData: any;
}

export function CreatorStep3Terms({ onNext, onBack, formData }: CreatorStep3TermsProps) {
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const { refreshProfile } = useAuth();

    const handleSubmit = async () => {
        if (!agreed) return;
        setLoading(true);
        try {
            const res = await fetch('/api/creator/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                await refreshProfile();
                toast.success("Welcome aboard, Creator!");
                onNext({});
            } else {
                const data = await res.json();
                toast.error(data.error || "Something went wrong. Please try again.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight">Terms & Agreement</h2>
                        <p className="text-xs text-[var(--muted-fg)] font-bold uppercase">Finalize your creator application</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-6 rounded-3xl bg-[var(--muted)]/50 border border-[var(--border)] space-y-4">
                        <div className="flex gap-4">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Authenticity</p>
                                <p className="text-xs font-bold text-[var(--muted-fg)] uppercase leading-relaxed tracking-tight">
                                    I agree that all workflows and agents I publish are original works or legally licensed.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 border-t border-[var(--border)] pt-4">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Quality Standards</p>
                                <p className="text-xs font-bold text-[var(--muted-fg)] uppercase leading-relaxed tracking-tight">
                                    I understand that AION reserves the right to remove low-quality or misleading content.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 border-t border-[var(--border)] pt-4">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Revenue Share</p>
                                <p className="text-xs font-bold text-[var(--muted-fg)] uppercase leading-relaxed tracking-tight">
                                    I accept the platform's revenue sharing model for all marketplace sales.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-6 rounded-3xl bg-primary-500/5 border border-primary-500/20">
                        <Info className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary-400 mb-1">Important Note</p>
                            <p className="text-xs font-bold text-[var(--muted-fg)] uppercase leading-relaxed tracking-tight">
                                Once you submit, your account will be instantly upgraded to a Creator profile. You will gain access to the Builder, Creator CRM, and Marketplace Publisher.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setAgreed(!agreed)}
                        className={cn(
                            "w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all duration-300",
                            agreed
                                ? "bg-emerald-500/10 border-emerald-500/50"
                                : "bg-[var(--muted)] border-[var(--border)] hover:border-emerald-500/30"
                        )}
                    >
                        <div className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                            agreed ? "bg-emerald-500 border-emerald-500 text-white" : "border-[var(--muted-fg)]"
                        )}>
                            {agreed && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <span className={cn("text-xs font-black uppercase tracking-widest", agreed ? "text-emerald-400" : "text-[var(--muted-fg)]")}>
                            I agree to the AION Creator Terms of Service
                        </span>
                    </button>
                </div>
            </div>

            <div className="pt-8 border-t border-[var(--border)] flex justify-between gap-4">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onBack}
                    disabled={loading}
                    className="h-14 px-8 rounded-[1.25rem] font-black uppercase italic tracking-widest hover:bg-[var(--muted)]"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                    type="button"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!agreed || loading}
                    className="h-14 px-12 rounded-[1.25rem] font-black uppercase italic tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Onboarding"}
                    {!loading && <ShieldCheck className="w-4 h-4 ml-2" />}
                </Button>
            </div>
        </div>
    );
}
