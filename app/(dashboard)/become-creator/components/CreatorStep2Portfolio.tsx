'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Link as LinkIcon, Plus, X, Briefcase, Globe, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatorStep2PortfolioProps {
    onNext: (data: any) => void;
    onBack: () => void;
    initialData: any;
}

const industryOptions = [
    'E-commerce', 'Real Estate', 'Finance', 'SaaS', 'Marketing', 'Healthcare', 'Education', 'Legal', 'Logistics', 'Content Creation'
];

const categoryOptions = [
    'Lead Gen', 'Social Media', 'Data Entry', 'Customer Support', 'CRM Management', 'Stock Analysis', 'Email Marketing', 'Internal Tooling'
];

export function CreatorStep2Portfolio({ onNext, onBack, initialData }: CreatorStep2PortfolioProps) {
    const [formData, setFormData] = useState(initialData);
    const [linkInput, setLinkInput] = useState('');

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        onNext(formData);
    };

    const addLink = () => {
        if (linkInput.trim() && !formData.portfolio_links.includes(linkInput.trim())) {
            setFormData({ ...formData, portfolio_links: [...formData.portfolio_links, linkInput.trim()] });
            setLinkInput('');
        }
    };

    const removeLink = (link: string) => {
        setFormData({ ...formData, portfolio_links: formData.portfolio_links.filter((l: string) => l !== link) });
    };

    const toggleSpecialization = (spec: string) => {
        const current = formData.specializations || [];
        if (current.includes(spec)) {
            setFormData({ ...formData, specializations: current.filter((s: string) => s !== spec) });
        } else {
            setFormData({ ...formData, specializations: [...current, spec] });
        }
    };

    const toggleCategory = (cat: string) => {
        const current = formData.automation_categories || [];
        if (current.includes(cat)) {
            setFormData({ ...formData, automation_categories: current.filter((c: string) => c !== cat) });
        } else {
            setFormData({ ...formData, automation_categories: [...current, cat] });
        }
    };

    return (
        <form onSubmit={handleNext} className="space-y-10">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-accent-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight">Portfolio & Niche</h2>
                        <p className="text-xs text-[var(--muted-fg)] font-bold uppercase">Showcase your past work and target market</p>
                    </div>
                </div>

                {/* Industry Specialization */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] ml-1">
                        <Target className="w-3 h-3" /> Industry Specialization
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {industryOptions.map((ind) => {
                            const selected = (formData.specializations || []).includes(ind);
                            return (
                                <button
                                    key={ind}
                                    type="button"
                                    onClick={() => toggleSpecialization(ind)}
                                    className={cn(
                                        "px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all duration-200",
                                        selected
                                            ? "bg-accent-500/10 border-accent-500/50 text-accent-400 shadow-lg shadow-accent-500/5"
                                            : "bg-[var(--muted)]/50 border-[var(--border)] text-[var(--muted-fg)] hover:border-accent-500/30"
                                    )}
                                >
                                    {ind}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Automation Categories */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] ml-1">
                        <Target className="w-3 h-3" /> Preferred Automation Types
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {categoryOptions.map((cat) => {
                            const selected = (formData.automation_categories || []).includes(cat);
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => toggleCategory(cat)}
                                    className={cn(
                                        "px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all duration-200",
                                        selected
                                            ? "bg-primary-500/10 border-primary-500/50 text-primary-400 shadow-lg shadow-primary-500/5"
                                            : "bg-[var(--muted)]/50 border-[var(--border)] text-[var(--muted-fg)] hover:border-primary-500/30"
                                    )}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Portfolio Links */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] ml-1">
                        <Globe className="w-3 h-3" /> Portfolio Links (GitHub, Website, Portfolio)
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                            <Input
                                placeholder="https://..."
                                className="bg-[var(--muted)] border-[var(--border)] rounded-xl h-12 pl-12 font-bold"
                                value={linkInput}
                                onChange={(e) => setLinkInput(e.target.value)}
                                onKeyPress={(e: any) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                            />
                        </div>
                        <Button type="button" onClick={addLink} variant="outline" className="h-12 rounded-xl px-6 font-black uppercase italic border-2">
                            <Plus className="w-4 h-4 mr-2" /> Add
                        </Button>
                    </div>
                    {formData.portfolio_links.length > 0 && (
                        <div className="space-y-2 mt-2">
                            {formData.portfolio_links.map((link: string) => (
                                <div key={link} className="flex items-center justify-between p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] group animate-in slide-in-from-left-2 duration-300">
                                    <span className="text-xs font-bold text-primary-400 truncate max-w-[90%]">{link}</span>
                                    <button type="button" onClick={() => removeLink(link)} className="text-[var(--muted-fg)] hover:text-red-400 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-8 border-t border-[var(--border)] flex justify-between gap-4">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onBack}
                    className="h-14 px-8 rounded-[1.25rem] font-black uppercase italic tracking-widest hover:bg-[var(--muted)]"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                    type="submit"
                    size="lg"
                    className="h-14 rounded-[1.25rem] font-black uppercase italic tracking-widest bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 shadow-xl shadow-primary-500/20 px-12"
                >
                    Review Terms <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </form>
    );
}
