'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
    currentStep: number;
    totalSteps: number;
    steps: { title: string; description: string }[];
}

export function WizardProgress({ currentStep, totalSteps, steps }: WizardProgressProps) {
    return (
        <div className="w-full py-8">
            {/* Progress Bar */}
            <div className="relative">
                {/* Background Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-[var(--border)]" />

                {/* Active Progress Line */}
                <div
                    className="absolute top-5 left-0 h-0.5 bg-primary-500 transition-all duration-500"
                    style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                />

                {/* Steps */}
                <div className="relative flex justify-between">
                    {steps.map((step, index) => {
                        const stepNumber = index + 1;
                        const isCompleted = stepNumber < currentStep;
                        const isCurrent = stepNumber === currentStep;
                        const isUpcoming = stepNumber > currentStep;

                        return (
                            <div key={stepNumber} className="flex flex-col items-center">
                                {/* Circle */}
                                <div
                                    className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                                        'border-2',
                                        isCompleted && 'bg-primary-500 border-primary-500 text-white',
                                        isCurrent && 'bg-primary-500 border-primary-500 text-white ring-4 ring-primary-500/20',
                                        isUpcoming && 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-fg)]'
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        stepNumber
                                    )}
                                </div>

                                {/* Label */}
                                <div className="mt-3 text-center max-w-[120px]">
                                    <p
                                        className={cn(
                                            'text-sm font-medium transition-colors',
                                            isCurrent && 'text-primary-500',
                                            !isCurrent && 'text-[var(--muted-fg)]'
                                        )}
                                    >
                                        {step.title}
                                    </p>
                                    <p className="text-xs text-[var(--muted-fg)] mt-1">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step Counter */}
            <div className="mt-8 text-center">
                <p className="text-sm text-[var(--muted-fg)]">
                    Step <span className="font-semibold text-primary-500">{currentStep}</span> of {totalSteps}
                </p>
            </div>
        </div>
    );
}
