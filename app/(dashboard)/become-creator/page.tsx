'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from './components/OnboardingProgress';
import { CreatorStep1Profile } from './components/CreatorStep1Profile';
import { CreatorStep2Portfolio } from './components/CreatorStep2Portfolio';
import { CreatorStep3Terms } from './components/CreatorStep3Terms';
import { CreatorStep4Success } from './components/CreatorStep4Success';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const steps = ['Profile', 'Portfolio', 'Terms', 'Success'];

export default function BecomeCreatorPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<any>({
        expertise: '',
        skills: [],
        experience_years: 0,
        bio: '',
        work_style: '',
        specializations: [],
        portfolio_links: [],
        automation_categories: [],
    });

    const handleNext = (data: any) => {
        setFormData((prev: any) => ({ ...prev, ...data }));
        setCurrentStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setCurrentStep((prev) => prev - 1);
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (profile?.is_creator && currentStep < 4) {
        // If already a creator, redirect to dashboard unless they just finished
        router.push('/creator/dashboard');
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] py-12 px-4 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter mb-4">
                        Become a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">Creator</span>
                    </h1>
                    <p className="text-[var(--muted-fg)] font-bold uppercase tracking-tight text-sm max-w-xl mx-auto">
                        Join the AION ecosystem and start building the future of automated commerce.
                    </p>
                </div>

                <OnboardingProgress currentStep={currentStep} steps={steps} />

                <Card className="p-8 lg:p-12 bg-[var(--card)]/50 border-[var(--border)] rounded-[2.5rem] shadow-2xl backdrop-blur-sm relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] -z-10" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 blur-[100px] -z-10" />

                    {currentStep === 1 && (
                        <CreatorStep1Profile
                            onNext={handleNext}
                            initialData={formData}
                        />
                    )}
                    {currentStep === 2 && (
                        <CreatorStep2Portfolio
                            onNext={handleNext}
                            onBack={handleBack}
                            initialData={formData}
                        />
                    )}
                    {currentStep === 3 && (
                        <CreatorStep3Terms
                            onNext={handleNext}
                            onBack={handleBack}
                            formData={formData}
                        />
                    )}
                    {currentStep === 4 && (
                        <CreatorStep4Success />
                    )}
                </Card>
            </div>
        </div>
    );
}
