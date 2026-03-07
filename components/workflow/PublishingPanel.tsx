'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    X,
    Upload,
    DollarSign,
    Tag,
    Globe,
    Lock,
    Sparkles,
    ShieldCheck,
    CheckCircle2,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PublishingPanelProps {
    isOpen: boolean;
    onClose: () => void;
    workflowName: string;
    onPublish: (details: any) => void;
}

export function PublishingPanel({ isOpen, onClose, workflowName, onPublish }: PublishingPanelProps) {
    const [title, setTitle] = useState(workflowName);
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('29');
    const [category, setCategory] = useState('Utility');
    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublish = async () => {
        setIsPublishing(true);
        const tid = toast.loading('Auditing automation for marketplace...');

        // Simulating the audit and isolation handshake
        setTimeout(() => {
            onPublish({
                title,
                description,
                price: parseFloat(price) * 100,
                category,
            });
            toast.success('Listing published successfully!', { id: tid });
            setIsPublishing(false);
            onClose();
        }, 2000);
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div className={cn(
                "fixed top-0 right-0 z-[70] h-screen w-full max-w-lg bg-[var(--bg)] border-l border-[var(--border)] shadow-2xl",
                "transition-transform duration-500 ease-in-out transform",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
                                <Upload className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold uppercase tracking-tight">Publish to Marketplace</h2>
                                <p className="text-[10px] text-[var(--muted-fg)] font-bold uppercase tracking-widest">Creator Studio</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        {/* Audit Status */}
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                <ShieldCheck className="w-4 h-4" /> Pre-flight Security Sync
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className="text-[var(--muted-fg)] uppercase">Credential Isolation</span>
                                    <span className="text-emerald-400">READY</span>
                                </div>
                                <div className="h-1 w-full bg-emerald-500/20 rounded-full">
                                    <div className="h-full w-full bg-emerald-500 rounded-full" />
                                </div>
                            </div>
                        </div>

                        {/* Basic Details */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted-fg)] flex items-center gap-2">
                                <Tag className="w-4 h-4" /> Listing Details
                            </h3>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest ml-1">Product Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. LinkedIn Sales Bot Pro"
                                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary-500/20 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest ml-1">Marketplace Description</label>
                                <textarea
                                    rows={4}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Explain the value proposition, ROI, and how the buyer benefits..."
                                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary-500/20 transition-all outline-none resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest ml-1">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary-500/20 outline-none appearance-none cursor-pointer"
                                    >
                                        <option>Utility</option>
                                        <option>Lead Gen</option>
                                        <option>Social Media</option>
                                        <option>E-commerce</option>
                                        <option>SaaS Sync</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest ml-1">Price (USD / Mo)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 ring-primary-500/20 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security & Ownership */}
                        <Card className="p-6 border-dashed bg-primary-500/5 border-primary-500/20 space-y-4">
                            <h4 className="font-bold flex items-center gap-2 text-primary-400">
                                <Lock className="w-4 h-4" /> Credential Policy
                            </h4>
                            <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                                Buyers will be required to provide their own credentials (API Keys/OAuth) through their AI Agent. Your personal keys used for building will be <span className="text-primary-400 font-bold">automatically stripped</span> and isolated from the production worker instances.
                            </p>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Source Code Hidden from Buyers
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Direct Payout Connection Active
                                </div>
                            </div>
                        </Card>

                        {/* Final Note */}
                        <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-600 dark:text-amber-500 font-medium leading-relaxed">
                                By publishing, you agree to the Creator Terms and acknowledge that AION will deduct a 15% platform fee on all successful sales.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-[var(--card)] border-t border-[var(--border)] flex gap-4">
                        <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-[2] h-14 rounded-2xl font-black italic uppercase tracking-widest shadow-xl shadow-primary-500/20 group overflow-hidden relative"
                            onClick={handlePublish}
                            loading={isPublishing}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                Push to Marketplace
                                <Sparkles className="w-4 h-4 group-hover:scale-125 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600 transition-transform group-hover:scale-110" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
