'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowRight, BadgePlus, X, Sparkles, User } from 'lucide-react';

interface CreatorStep1ProfileProps {
    onNext: (data: any) => void;
    initialData: any;
}

const expertiseOptions = [
    'Workflow Architect',
    'AI Integration Expert',
    'Full-Stack Automation Specialist',
    'LLM Prompt Engineer',
    'Data Scraper & Analyst',
    'Social Media Bot Architect',
    'Lead Gen specialist',
    'Other'
];

const workStyleOptions = [
    { id: 'custom', label: 'Custom Builds', desc: 'Focus on unique, bespoke solutions' },
    { id: 'templates', label: 'Template Creator', desc: 'High-volume marketplace tools' },
    { id: 'consultant', label: 'Consultant', desc: 'Strategic automation advice' },
];

export function CreatorStep1Profile({ onNext, initialData }: CreatorStep1ProfileProps) {
    const [formData, setFormData] = useState(initialData);
    const [skillInput, setSkillInput] = useState('');

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation
        if (formData.expertise && formData.skills.length > 0 && formData.bio.length >= 50) {
            onNext(formData);
        }
    };

    const addSkill = () => {
        if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
            setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
            setSkillInput('');
        }
    };

    const removeSkill = (skill: string) => {
        setFormData({ ...formData, skills: formData.skills.filter((s: string) => s !== skill) });
    };

    return (
        <form onSubmit={handleNext} className="space-y-10">
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight">Professional Profile</h2>
                        <p className="text-xs text-[var(--muted-fg)] font-bold uppercase">Define your identity as an AION creator</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] ml-1">Core Expertise</label>
                        <select
                            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm font-bold appearance-none focus:ring-1 focus:ring-primary-500 outline-none"
                            value={formData.expertise}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, expertise: e.target.value })}
                            required
                        >
                            <option value="" disabled>Select your expertise</option>
                            {expertiseOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] ml-1">Experience (Years)</label>
                        <Input
                            type="number"
                            min="0"
                            placeholder="e.g. 5"
                            className="bg-[var(--muted)] border-[var(--border)] rounded-xl h-12 py-3 px-4 font-bold"
                            value={formData.experience_years || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] ml-1">Skills & Stack</label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Add a skill (e.g. Supabase, OpenAI, Zapier...)"
                            className="bg-[var(--muted)] border-[var(--border)] rounded-xl h-12"
                            value={skillInput}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSkillInput(e.target.value)}
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        />
                        <Button type="button" onClick={addSkill} variant="outline" className="h-12 rounded-xl px-6 font-black uppercase italic tracking-widest">
                            <BadgePlus className="w-4 h-4 mr-2" /> Add
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {formData.skills.map((skill: string) => (
                            <Badge key={skill} variant="primary" className="pl-3 pr-2 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 font-bold uppercase tracking-tight text-[10px]">
                                {skill}
                                <button type="button" onClick={() => removeSkill(skill)} className="ml-2 hover:text-white transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]">Professional Bio</label>
                        <span className={cn("text-[9px] font-bold uppercase", formData.bio.length < 50 ? "text-amber-500" : "text-emerald-500")}>
                            {formData.bio.length} / 50 characters min
                        </span>
                    </div>
                    <textarea
                        placeholder="Describe your approach, the tools you specialize in, and what makes your automations premium..."
                        className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl min-h-[120px] p-4 text-sm font-medium leading-relaxed outline-none focus:ring-1 focus:ring-primary-500"
                        value={formData.bio}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, bio: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] ml-1">Creator Strategy</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {workStyleOptions.map((style) => (
                            <button
                                key={style.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, work_style: style.label })}
                                className={cn(
                                    "flex flex-col text-left p-4 rounded-2xl border-2 transition-all duration-300",
                                    formData.work_style === style.label
                                        ? "border-primary-500 bg-primary-500/5 shadow-lg shadow-primary-500/10"
                                        : "border-[var(--border)] hover:border-primary-500/30 bg-[var(--muted)]/30"
                                )}
                            >
                                <span className={cn("text-xs font-black uppercase tracking-tight", formData.work_style === style.label ? "text-primary-400" : "text-[var(--fg)]")}>
                                    {style.label}
                                </span>
                                <span className="text-[10px] font-bold text-[var(--muted-fg)] uppercase leading-tight mt-1 opacity-70">
                                    {style.desc}
                                </span>
                                {formData.work_style === style.label && (
                                    <Sparkles className="w-3 h-3 text-primary-400 mt-2 animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-[var(--border)] flex justify-end">
                <Button
                    type="submit"
                    size="lg"
                    disabled={!formData.expertise || formData.skills.length === 0 || formData.bio.length < 50}
                    className="h-14 px-10 rounded-[1.25rem] font-black uppercase italic tracking-widest bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 shadow-xl shadow-primary-500/20"
                >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </form>
    );
}
