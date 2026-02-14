'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Upload, File, X, FileText, FileImage } from 'lucide-react';
import toast from 'react-hot-toast';

interface Step2SamplesProps {
    onNext: (data: WorkSample[]) => void;
    onBack: () => void;
    initialData?: WorkSample[];
}

export interface WorkSample {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    content?: string;
    file: File;
}

export function Step2Samples({ onNext, onBack, initialData }: Step2SamplesProps) {
    const [samples, setSamples] = useState<WorkSample[]>(initialData || []);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = async (files: FileList | null) => {
        if (!files) return;

        const newSamples: WorkSample[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Validate file type
            const validTypes = [
                'text/plain',
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/markdown'
            ];

            if (!validTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
                toast.error(`${file.name}: Unsupported file type. Please upload PDF, DOCX, TXT, or MD files.`);
                continue;
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name}: File too large. Maximum size is 5MB.`);
                continue;
            }

            // Check if already uploaded
            if (samples.some(s => s.fileName === file.name)) {
                toast.error(`${file.name}: Already uploaded.`);
                continue;
            }

            const sample: WorkSample = {
                id: Math.random().toString(36).substr(2, 9),
                fileName: file.name,
                fileType: file.type || 'text/plain',
                fileSize: file.size,
                file: file
            };

            // Extract text content for TXT and MD files
            if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                try {
                    const text = await file.text();
                    sample.content = text;
                } catch (error) {
                    console.error('Error reading file:', error);
                }
            }

            newSamples.push(sample);
        }

        if (newSamples.length > 0) {
            setSamples(prev => [...prev, ...newSamples]);
            toast.success(`${newSamples.length} file(s) uploaded successfully!`);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const removeSample = (id: string) => {
        setSamples(prev => prev.filter(s => s.id !== id));
        toast.success('File removed');
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getFileIcon = (fileType: string, fileName: string) => {
        if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
        if (fileType.includes('word') || fileName.endsWith('.docx')) return <FileText className="w-5 h-5 text-blue-500" />;
        if (fileType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.md')) return <File className="w-5 h-5 text-gray-500" />;
        return <FileImage className="w-5 h-5 text-purple-500" />;
    };

    const handleNext = () => {
        if (samples.length === 0) {
            toast.error('Please upload at least one work sample');
            return;
        }
        onNext(samples);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                    <Upload className="w-8 h-8 text-primary-500" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--fg)] mb-2">
                    Upload Your Work Samples
                </h2>
                <p className="text-[var(--muted-fg)]">
                    Share examples of your work so our AI can learn your style and approach
                </p>
            </div>

            {/* Upload Area */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging
                        ? 'border-primary-500 bg-primary-500/5'
                        : 'border-[var(--border)] hover:border-primary-500/50'
                    }`}
            >
                <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".txt,.md,.pdf,.docx"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                />

                <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--muted)]">
                        <Upload className="w-8 h-8 text-[var(--muted-fg)]" />
                    </div>

                    <div>
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <span className="text-primary-500 hover:text-primary-600 font-medium">
                                Click to upload
                            </span>
                            <span className="text-[var(--muted-fg)]"> or drag and drop</span>
                        </label>
                        <p className="text-sm text-[var(--muted-fg)] mt-2">
                            PDF, DOCX, TXT, or MD files (Max 5MB each)
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-xs text-[var(--muted-fg)]">
                        <span>✓ Articles</span>
                        <span>✓ Reports</span>
                        <span>✓ Portfolios</span>
                        <span>✓ Previous Work</span>
                    </div>
                </div>
            </div>

            {/* Uploaded Files */}
            {samples.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-[var(--fg)]">
                        Uploaded Files ({samples.length})
                    </h3>
                    <div className="space-y-2">
                        {samples.map(sample => (
                            <div
                                key={sample.id}
                                className="flex items-center gap-3 p-4 bg-[var(--muted)] border border-[var(--border)] rounded-lg hover:border-primary-500/30 transition-colors"
                            >
                                {getFileIcon(sample.fileType, sample.fileName)}

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[var(--fg)] truncate">
                                        {sample.fileName}
                                    </p>
                                    <p className="text-xs text-[var(--muted-fg)]">
                                        {formatFileSize(sample.fileSize)}
                                        {sample.content && ` • ${sample.content.length} characters`}
                                    </p>
                                </div>

                                <button
                                    onClick={() => removeSample(sample.id)}
                                    className="p-2 hover:bg-red-500/10 text-[var(--muted-fg)] hover:text-red-500 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tips */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                    💡 Tips for Better Results
                </h4>
                <ul className="text-sm text-[var(--muted-fg)] space-y-1">
                    <li>• Upload 3-5 of your best work samples</li>
                    <li>• Include diverse examples that showcase your range</li>
                    <li>• Longer samples (500+ words) help the AI learn better</li>
                    <li>• Recent work is more representative of your current style</li>
                </ul>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-[var(--border)]">
                <Button variant="outline" onClick={onBack} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>
                <Button onClick={handleNext} size="lg" className="gap-2">
                    Continue to Q&A
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
