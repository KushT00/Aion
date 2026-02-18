'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Sparkles, Loader2, Brain, Zap, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProfileData } from './Step1Profile';
import { WorkSample } from './Step2Samples';
import { QAAnswer } from './Step3QA';

interface Step4PreviewProps {
    onNext: (data: AIAnalysisResult) => void;
    onBack: () => void;
    profileData: ProfileData;
    workSamples: WorkSample[];
    qaAnswers: QAAnswer[];
}

export interface AIAnalysisResult {
    personalityPrompt: string;
    workflowSuggestion: string;
    keyInsights: string[];
    suggestedNodes: Array<{
        type: string;
        label: string;
        description: string;
    }>;
    qualityScore: number;
}

export function Step4Preview({ onNext, onBack, profileData, workSamples, qaAnswers }: Step4PreviewProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Auto-start analysis when component mounts
        performAnalysis();
    }, []);

    const performAnalysis = async () => {
        setIsAnalyzing(true);
        setProgress(0);

        try {
            // Simulate analysis progress
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 300);

            // TODO: Replace with actual Gemini API call
            // For now, we'll simulate the analysis
            await new Promise(resolve => setTimeout(resolve, 3000));

            const mockResult: AIAnalysisResult = {
                personalityPrompt: generatePersonalityPrompt(profileData, qaAnswers),
                workflowSuggestion: generateWorkflowSuggestion(profileData),
                keyInsights: generateKeyInsights(profileData, qaAnswers),
                suggestedNodes: generateSuggestedNodes(profileData),
                qualityScore: calculateQualityScore(profileData, workSamples, qaAnswers)
            };

            clearInterval(progressInterval);
            setProgress(100);
            setAnalysisResult(mockResult);
            toast.success('Analysis complete!');
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error('Analysis failed. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const generatePersonalityPrompt = (profile: ProfileData, qa: QAAnswer[]): string => {
        return `You are an AI agent cloned from ${profile.fullName}, a ${profile.expertise} with ${profile.experienceYears} years of experience.

Your expertise: ${profile.expertise}
Your skills: ${profile.skills.join(', ')}
Your work style: ${profile.workStyle}

About you: ${profile.description}

Your work process:
${qa.filter(q => q.answer.trim()).map(q => `- ${q.question}: ${q.answer}`).join('\n')}

When responding to tasks, embody this freelancer's expertise, style, and approach. Maintain their tone, attention to detail, and unique methodology.`;
    };

    const generateWorkflowSuggestion = (profile: ProfileData): string => {
        const workflows: Record<string, string> = {
            'Content Writer': 'Input → Research & Analysis → Content Generation → SEO Optimization → Quality Check → Output',
            'Data Analyst': 'Input → Data Collection → Data Cleaning → Analysis → Visualization → Insights Report → Output',
            'Graphic Designer': 'Input → Concept Development → Design Creation → Revision Loop → Final Export → Output',
            'Social Media Manager': 'Input → Content Planning → Post Creation → Scheduling → Engagement Tracking → Output',
            'Software Developer': 'Input → Requirements Analysis → Code Generation → Testing → Documentation → Output'
        };

        return workflows[profile.expertise] || 'Input → Processing → Analysis → Generation → Quality Check → Output';
    };

    const generateKeyInsights = (profile: ProfileData, qa: QAAnswer[]): string[] => {
        const insights: string[] = [
            `Specializes in ${profile.expertise.toLowerCase()} with ${profile.experienceYears}+ years of experience`,
            `Works in a ${profile.workStyle.toLowerCase()} manner`,
            `Core skills: ${profile.skills.slice(0, 3).join(', ')}`
        ];

        if (profile.specialization.length > 0) {
            insights.push(`Industry focus: ${profile.specialization.join(', ')}`);
        }

        const answeredQuestions = qa.filter(q => q.answer.trim()).length;
        insights.push(`Provided detailed answers to ${answeredQuestions} process questions`);

        return insights;
    };

    const generateSuggestedNodes = (profile: ProfileData): Array<{ type: string; label: string; description: string }> => {
        const baseNodes = [
            { type: 'input', label: 'Client Request', description: 'Receives the task from client' },
            { type: 'ai_step', label: `${profile.expertise} AI`, description: 'Processes using your expertise' },
            { type: 'output', label: 'Deliver Result', description: 'Returns completed work' }
        ];

        const expertiseNodes: Record<string, Array<{ type: string; label: string; description: string }>> = {
            'Content Writer': [
                { type: 'ai_step', label: 'Research', description: 'Gather information on topic' },
                { type: 'ai_step', label: 'Write Content', description: 'Generate article/blog post' },
                { type: 'ai_step', label: 'SEO Optimize', description: 'Add keywords and meta' }
            ],
            'Data Analyst': [
                { type: 'api_step', label: 'Fetch Data', description: 'Retrieve data from source' },
                { type: 'ai_step', label: 'Analyze', description: 'Process and analyze data' },
                { type: 'ai_step', label: 'Visualize', description: 'Create charts and graphs' }
            ],
            'Graphic Designer': [
                { type: 'ai_step', label: 'Concept', description: 'Generate design concepts' },
                { type: 'ai_step', label: 'Create Design', description: 'Produce visual assets' },
                { type: 'logic_step', label: 'Quality Check', description: 'Verify design standards' }
            ]
        };

        return [...baseNodes.slice(0, 1), ...(expertiseNodes[profile.expertise] || []), ...baseNodes.slice(2)];
    };

    const calculateQualityScore = (profile: ProfileData, samples: WorkSample[], qa: QAAnswer[]): number => {
        let score = 0;

        // Profile completeness (40 points)
        if (profile.fullName) score += 5;
        if (profile.expertise) score += 5;
        if (profile.skills.length >= 3) score += 10;
        if (profile.description.length >= 100) score += 10;
        if (profile.workStyle) score += 5;
        if (profile.specialization.length > 0) score += 5;

        // Work samples (30 points)
        score += Math.min(samples.length * 10, 30);

        // Q&A completeness (30 points)
        const answeredCount = qa.filter(q => q.answer.trim()).length;
        score += Math.min(answeredCount * 5, 30);

        return Math.min(score, 100);
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500';
        if (score >= 60) return 'text-amber-500';
        return 'text-red-500';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        return 'Needs Improvement';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                    <Brain className="w-8 h-8 text-primary-500" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--fg)] mb-2">
                    AI Analysis & Preview
                </h2>
                <p className="text-[var(--muted-fg)]">
                    Our AI is analyzing your profile and generating your agent
                </p>
            </div>

            {/* Analysis Progress */}
            {isAnalyzing && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 space-y-6">
                    <div className="flex items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                        <span className="text-lg font-medium text-[var(--fg)]">
                            Analyzing your expertise...
                        </span>
                    </div>

                    <div className="space-y-2">
                        <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-sm text-center text-[var(--muted-fg)]">
                            {progress}% complete
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                            <Sparkles className="w-5 h-5 text-primary-500 mx-auto" />
                            <p className="text-xs text-[var(--muted-fg)]">Analyzing Profile</p>
                        </div>
                        <div className="space-y-1">
                            <Brain className="w-5 h-5 text-primary-500 mx-auto" />
                            <p className="text-xs text-[var(--muted-fg)]">Learning Style</p>
                        </div>
                        <div className="space-y-1">
                            <Zap className="w-5 h-5 text-primary-500 mx-auto" />
                            <p className="text-xs text-[var(--muted-fg)]">Building Workflow</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Results */}
            {!isAnalyzing && analysisResult && (
                <div className="space-y-6">
                    {/* Quality Score */}
                    <div className="bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/20 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-[var(--muted-fg)] mb-1">
                                    Clone Quality Score
                                </h3>
                                <p className={`text-4xl font-bold ${getScoreColor(analysisResult.qualityScore)}`}>
                                    {analysisResult.qualityScore}%
                                </p>
                                <p className="text-sm text-[var(--muted-fg)] mt-1">
                                    {getScoreLabel(analysisResult.qualityScore)}
                                </p>
                            </div>
                            <div className="w-24 h-24 rounded-full bg-[var(--card)] flex items-center justify-center">
                                <Target className={`w-12 h-12 ${getScoreColor(analysisResult.qualityScore)}`} />
                            </div>
                        </div>
                    </div>

                    {/* Key Insights */}
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
                            Key Insights
                        </h3>
                        <ul className="space-y-3">
                            {analysisResult.keyInsights.map((insight, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-semibold text-primary-500">{index + 1}</span>
                                    </div>
                                    <span className="text-sm text-[var(--muted-fg)]">{insight}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Suggested Workflow */}
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
                            Suggested Workflow
                        </h3>
                        <div className="bg-[var(--muted)] rounded-lg p-4 font-mono text-sm text-[var(--fg)]">
                            {analysisResult.workflowSuggestion}
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {analysisResult.suggestedNodes.map((node, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-[var(--muted)] rounded-lg">
                                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-semibold text-primary-500">{index + 1}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--fg)]">{node.label}</p>
                                        <p className="text-xs text-[var(--muted-fg)]">{node.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Personality Prompt Preview */}
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
                            AI Personality Prompt
                        </h3>
                        <div className="bg-[var(--muted)] rounded-lg p-4 max-h-64 overflow-y-auto">
                            <pre className="text-xs text-[var(--muted-fg)] whitespace-pre-wrap font-mono">
                                {analysisResult.personalityPrompt}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-[var(--border)]">
                <Button variant="outline" onClick={onBack} disabled={isAnalyzing} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>
                <Button
                    onClick={() => analysisResult && onNext(analysisResult)}
                    disabled={isAnalyzing || !analysisResult}
                    size="lg"
                    className="gap-2"
                >
                    Continue to Test
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
