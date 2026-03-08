'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface OnboardingProgressProps {
    currentStep: number;
    steps: string[];
}

export function OnboardingProgress({ currentStep, steps }: OnboardingProgressProps) {
    return (
        <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-12">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = currentStep > stepNumber;
                const isActive = currentStep === stepNumber;

                return (
                    <div key={step} className="flex flex-col items-center relative flex-1">
                        {/* Progress Line */}
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    "absolute top-5 left-[50%] right-[-50%] h-[2px] transition-colors duration-500",
                                    isCompleted ? "bg-primary-500" : "bg-[var(--border)]"
                                )}
                            />
                        )}

                        {/* Step Circle */}
                        <div
                            className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500 z-10",
                                isCompleted ? "bg-primary-500 border-primary-500 text-white" :
                                    isActive ? "bg-[var(--bg)] border-primary-500 text-primary-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" :
                                        "bg-[var(--bg)] border-[var(--border)] text-[var(--muted-fg)]"
                            )}
                        >
                            {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
                        </div>

                        {/* Step Label */}
                        <span
                            className={cn(
                                "mt-3 text-[10px] font-black uppercase tracking-widest transition-colors duration-500",
                                isActive ? "text-primary-500" : "text-[var(--muted-fg)]"
                            )}
                        >
                            {step}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
