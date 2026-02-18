'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, CheckCircle, Loader2, Rocket, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AIAnalysisResult } from './Step4Preview';

interface Step5TestProps {
    onPublish: () => void;
    onBack: () => void;
    analysisResult: AIAnalysisResult;
}

export function Step5Test({ onPublish, onBack, analysisResult }: Step5TestProps) {
    const [testInput, setTestInput] = useState('');
    const [testOutput, setTestOutput] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [testHistory, setTestHistory] = useState<Array<{ input: string; output: string; timestamp: Date }>>([]);
    const [isPublishing, setIsPublishing] = useState(false);

    const handleTest = async () => {
        if (!testInput.trim()) {
            toast.error('Please enter a test input');
            return;
        }

        setIsTesting(true);
        setTestOutput('');

        try {
            // TODO: Replace with actual workflow execution
            // For now, simulate AI response
            await new Promise(resolve => setTimeout(resolve, 2000));

            const mockOutput = generateMockResponse(testInput, analysisResult);

            setTestOutput(mockOutput);
            setTestHistory(prev => [...prev, {
                input: testInput,
                output: mockOutput,
                timestamp: new Date()
            }]);

            toast.success('Test completed!');
        } catch (error) {
            console.error('Test error:', error);
            toast.error('Test failed. Please try again.');
        } finally {
            setIsTesting(false);
        }
    };

    const generateMockResponse = (input: string, analysis: AIAnalysisResult): string => {
        // Simple mock response based on the personality prompt
        return `Based on your expertise and style, here's how your AI agent would respond:

${input}

[This is a simulated response. Once published, your agent will use the actual AI model with your custom personality prompt to generate real responses that match your style and expertise.]

Quality Score: ${analysis.qualityScore}%
Suggested Workflow: ${analysis.workflowSuggestion}`;
    };

    const handlePublish = async () => {
        setIsPublishing(true);

        try {
            // TODO: Save to database
            // - Create workflow in database
            // - Save personality prompt
            // - Create marketplace listing
            // - Set initial pricing

            await new Promise(resolve => setTimeout(resolve, 2000));

            toast.success('Agent published successfully!');
            onPublish();
        } catch (error) {
            console.error('Publish error:', error);
            toast.error('Failed to publish. Please try again.');
            setIsPublishing(false);
        }
    };

    const sampleInputs = [
        'Write a blog post about AI in healthcare',
        'Analyze this dataset and provide insights',
        'Create a social media campaign for a new product',
        'Design a logo for a tech startup',
        'Develop a Python script for data processing'
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                    <Rocket className="w-8 h-8 text-primary-500" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--fg)] mb-2">
                    Test Your AI Agent
                </h2>
                <p className="text-[var(--muted-fg)]">
                    Try out your agent with sample tasks before publishing
                </p>
            </div>

            {/* Test Interface */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="space-y-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
                            Test Input
                        </h3>

                        <textarea
                            value={testInput}
                            onChange={(e) => setTestInput(e.target.value)}
                            placeholder="Enter a task or question to test your agent..."
                            rows={8}
                            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                        />

                        <div className="mt-4 flex gap-2">
                            <Button
                                onClick={handleTest}
                                disabled={isTesting || !testInput.trim()}
                                className="flex-1 gap-2"
                            >
                                {isTesting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Testing...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4" />
                                        Run Test
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setTestInput('')}
                                disabled={isTesting}
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Sample Inputs */}
                        <div className="mt-4">
                            <p className="text-xs font-medium text-[var(--muted-fg)] mb-2">
                                Try these samples:
                            </p>
                            <div className="space-y-1">
                                {sampleInputs.slice(0, 3).map((sample, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setTestInput(sample)}
                                        className="w-full text-left text-xs text-[var(--muted-fg)] hover:text-primary-500 transition-colors p-2 hover:bg-[var(--muted)] rounded"
                                    >
                                        • {sample}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="space-y-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
                            Agent Response
                        </h3>

                        {!testOutput && !isTesting && (
                            <div className="h-64 flex items-center justify-center text-center text-[var(--muted-fg)]">
                                <div>
                                    <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">
                                        Run a test to see how your agent responds
                                    </p>
                                </div>
                            </div>
                        )}

                        {isTesting && (
                            <div className="h-64 flex items-center justify-center">
                                <div className="text-center">
                                    <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-[var(--muted-fg)]">
                                        Your agent is processing...
                                    </p>
                                </div>
                            </div>
                        )}

                        {testOutput && !isTesting && (
                            <div className="space-y-4">
                                <div className="bg-[var(--muted)] rounded-lg p-4 max-h-64 overflow-y-auto">
                                    <pre className="text-sm text-[var(--fg)] whitespace-pre-wrap">
                                        {testOutput}
                                    </pre>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-emerald-500">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Test completed successfully</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Test History */}
            {testHistory.length > 0 && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
                        Test History ({testHistory.length})
                    </h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                        {testHistory.map((test, index) => (
                            <div key={index} className="p-3 bg-[var(--muted)] rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-[var(--muted-fg)]">
                                        Test #{testHistory.length - index}
                                    </span>
                                    <span className="text-xs text-[var(--muted-fg)]">
                                        {test.timestamp.toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-sm text-[var(--fg)] truncate">
                                    <span className="font-medium">Input:</span> {test.input}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Agent Summary */}
            <div className="bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
                    Ready to Publish?
                </h3>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-primary-500 mb-1">
                            {analysisResult.qualityScore}%
                        </div>
                        <p className="text-xs text-[var(--muted-fg)]">Quality Score</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-primary-500 mb-1">
                            {analysisResult.suggestedNodes.length}
                        </div>
                        <p className="text-xs text-[var(--muted-fg)]">Workflow Steps</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-primary-500 mb-1">
                            {testHistory.length}
                        </div>
                        <p className="text-xs text-[var(--muted-fg)]">Tests Run</p>
                    </div>
                </div>

                <p className="text-sm text-[var(--muted-fg)] mb-4">
                    Your AI agent is ready! Once published, it will be available in the marketplace for clients to discover and use.
                </p>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        disabled={isPublishing}
                        className="flex-1"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Preview
                    </Button>
                    <Button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        size="lg"
                        className="flex-1 gap-2"
                    >
                        {isPublishing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Publishing...
                            </>
                        ) : (
                            <>
                                <Rocket className="w-4 h-4" />
                                Publish Agent
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
