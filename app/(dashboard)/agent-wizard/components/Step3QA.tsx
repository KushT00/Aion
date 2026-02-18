'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, MessageCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Step3QAProps {
    onNext: (data: QAAnswer[]) => void;
    onBack: () => void;
    initialData?: QAAnswer[];
    expertise?: string;
}

export interface QAAnswer {
    id: string;
    question: string;
    answer: string;
    type: 'text' | 'multiple_choice';
    options?: string[];
}

const getQuestionsForExpertise = (expertise: string): Omit<QAAnswer, 'answer'>[] => {
    const baseQuestions: Omit<QAAnswer, 'answer'>[] = [
        {
            id: 'q1',
            question: 'How do you typically start a new project?',
            type: 'text'
        },
        {
            id: 'q2',
            question: 'What tools or software do you use most frequently?',
            type: 'text'
        },
        {
            id: 'q3',
            question: 'How do you handle client feedback or revision requests?',
            type: 'text'
        },
        {
            id: 'q4',
            question: 'What makes your work unique or different from others?',
            type: 'text'
        },
        {
            id: 'q5',
            question: 'How long does a typical project take you?',
            type: 'text'
        }
    ];

    // Add expertise-specific questions
    const expertiseQuestions: Record<string, Omit<QAAnswer, 'answer'>[]> = {
        'Content Writer': [
            {
                id: 'q6',
                question: 'What is your research process before writing?',
                type: 'text'
            },
            {
                id: 'q7',
                question: 'How do you ensure SEO optimization in your content?',
                type: 'text'
            }
        ],
        'Data Analyst': [
            {
                id: 'q6',
                question: 'What data visualization tools do you prefer?',
                type: 'text'
            },
            {
                id: 'q7',
                question: 'How do you approach data cleaning and preparation?',
                type: 'text'
            }
        ],
        'Graphic Designer': [
            {
                id: 'q6',
                question: 'What is your design process from concept to final?',
                type: 'text'
            },
            {
                id: 'q7',
                question: 'How do you incorporate client branding into your designs?',
                type: 'text'
            }
        ]
    };

    return [...baseQuestions, ...(expertiseQuestions[expertise] || [])];
};

export function Step3QA({ onNext, onBack, initialData, expertise = '' }: Step3QAProps) {
    const questions = getQuestionsForExpertise(expertise);

    const [answers, setAnswers] = useState<QAAnswer[]>(
        initialData || questions.map(q => ({ ...q, answer: '' }))
    );

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const currentQuestion = answers[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / answers.length) * 100;
    const answeredCount = answers.filter(a => a.answer.trim()).length;

    const handleAnswerChange = (answer: string) => {
        setAnswers(prev => prev.map((a, i) =>
            i === currentQuestionIndex ? { ...a, answer } : a
        ));
    };

    const handleNext = () => {
        if (!currentQuestion.answer.trim()) {
            toast.error('Please answer the question before continuing');
            return;
        }

        if (currentQuestionIndex < answers.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // All questions answered
            if (answeredCount < 5) {
                toast.error('Please answer at least 5 questions');
                return;
            }
            onNext(answers);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSkip = () => {
        if (currentQuestionIndex < answers.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const jumpToQuestion = (index: number) => {
        setCurrentQuestionIndex(index);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                    <MessageCircle className="w-8 h-8 text-primary-500" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--fg)] mb-2">
                    Tell Us About Your Process
                </h2>
                <p className="text-[var(--muted-fg)]">
                    Answer these questions to help us understand how you work
                </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-fg)]">
                        Question {currentQuestionIndex + 1} of {answers.length}
                    </span>
                    <span className="text-primary-500 font-medium">
                        {answeredCount} answered
                    </span>
                </div>
                <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Question Card */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 space-y-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-semibold">
                        {currentQuestionIndex + 1}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
                            {currentQuestion.question}
                        </h3>

                        {currentQuestion.type === 'text' && (
                            <textarea
                                value={currentQuestion.answer}
                                onChange={(e) => handleAnswerChange(e.target.value)}
                                placeholder="Type your answer here..."
                                rows={6}
                                className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                                autoFocus
                            />
                        )}

                        {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                            <div className="space-y-2">
                                {currentQuestion.options.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => handleAnswerChange(option)}
                                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${currentQuestion.answer === option
                                                ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                                                : 'border-[var(--border)] hover:border-primary-500/30'
                                            }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}

                        <p className="text-xs text-[var(--muted-fg)] mt-2">
                            {currentQuestion.answer.length} characters
                        </p>
                    </div>
                </div>
            </div>

            {/* Question Navigator */}
            <div className="flex flex-wrap gap-2">
                {answers.map((answer, index) => (
                    <button
                        key={answer.id}
                        onClick={() => jumpToQuestion(index)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${index === currentQuestionIndex
                                ? 'bg-primary-500 text-white ring-4 ring-primary-500/20'
                                : answer.answer.trim()
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                                    : 'bg-[var(--muted)] text-[var(--muted-fg)] border border-[var(--border)] hover:border-primary-500/30'
                            }`}
                    >
                        {answer.answer.trim() ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : (
                            index + 1
                        )}
                    </button>
                ))}
            </div>

            {/* Tips */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                    💡 Tip
                </h4>
                <p className="text-sm text-[var(--muted-fg)]">
                    Be specific and detailed in your answers. The more context you provide, the better your AI agent will understand your unique approach and style.
                </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-[var(--border)]">
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onBack} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                    {currentQuestionIndex > 0 && (
                        <Button variant="ghost" onClick={handlePrevious}>
                            Previous Question
                        </Button>
                    )}
                </div>

                <div className="flex gap-2">
                    {currentQuestionIndex < answers.length - 1 && (
                        <Button variant="ghost" onClick={handleSkip}>
                            Skip
                        </Button>
                    )}
                    <Button onClick={handleNext} size="lg" className="gap-2">
                        {currentQuestionIndex < answers.length - 1 ? 'Next Question' : 'Continue to Preview'}
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
