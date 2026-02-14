'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardProgress } from './components/WizardProgress';
import { Step1Profile, ProfileData } from './components/Step1Profile';
import { Step2Samples, WorkSample } from './components/Step2Samples';
import { Step3QA, QAAnswer } from './components/Step3QA';
import { Step4Preview, AIAnalysisResult } from './components/Step4Preview';
import { Step5Test } from './components/Step5Test';
import toast from 'react-hot-toast';

const wizardSteps = [
    { title: 'Profile', description: 'Your expertise' },
    { title: 'Samples', description: 'Work examples' },
    { title: 'Q&A', description: 'Your process' },
    { title: 'Preview', description: 'AI analysis' },
    { title: 'Test', description: 'Try & publish' }
];

export default function AgentWizardPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);

    // Wizard data
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [workSamples, setWorkSamples] = useState<WorkSample[]>([]);
    const [qaAnswers, setQAAnswers] = useState<QAAnswer[]>([]);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);

    const handleStep1Next = (data: ProfileData) => {
        setProfileData(data);
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStep2Next = (data: WorkSample[]) => {
        setWorkSamples(data);
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStep3Next = (data: QAAnswer[]) => {
        setQAAnswers(data);
        setCurrentStep(4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStep4Next = (data: AIAnalysisResult) => {
        setAnalysisResult(data);
        setCurrentStep(5);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePublish = () => {
        toast.success('🎉 Agent published successfully!');
        // Redirect to marketplace or dashboard
        setTimeout(() => {
            router.push('/marketplace');
        }, 2000);
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-[var(--fg)] mb-2">
                        Create Your AI Agent
                    </h1>
                    <p className="text-[var(--muted-fg)]">
                        Transform your expertise into an AI-powered freelancer that works 24/7
                    </p>
                </div>

                {/* Progress Indicator */}
                <WizardProgress
                    currentStep={currentStep}
                    totalSteps={wizardSteps.length}
                    steps={wizardSteps}
                />

                {/* Step Content */}
                <div className="mt-12">
                    {currentStep === 1 && (
                        <Step1Profile
                            onNext={handleStep1Next}
                            initialData={profileData || undefined}
                        />
                    )}

                    {currentStep === 2 && (
                        <Step2Samples
                            onNext={handleStep2Next}
                            onBack={handleBack}
                            initialData={workSamples}
                        />
                    )}

                    {currentStep === 3 && (
                        <Step3QA
                            onNext={handleStep3Next}
                            onBack={handleBack}
                            initialData={qaAnswers}
                            expertise={profileData?.expertise}
                        />
                    )}

                    {currentStep === 4 && profileData && (
                        <Step4Preview
                            onNext={handleStep4Next}
                            onBack={handleBack}
                            profileData={profileData}
                            workSamples={workSamples}
                            qaAnswers={qaAnswers}
                        />
                    )}

                    {currentStep === 5 && analysisResult && (
                        <Step5Test
                            onPublish={handlePublish}
                            onBack={handleBack}
                            analysisResult={analysisResult}
                        />
                    )}
                </div>

                {/* Help Text */}
                <div className="mt-12 text-center">
                    <p className="text-sm text-[var(--muted-fg)]">
                        Need help? <a href="#" className="text-primary-500 hover:underline">Contact Support</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
