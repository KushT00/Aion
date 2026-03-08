'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Sparkles, Bot, Clock, Target, CalendarDays, Loader2, Star, BadgeCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface CreatorPreview {
    id: string;
    full_name: string;
    avatar_url: string;
    bio: string;
    expertise: string;
    skills: string[];
    experience_years: number;
    hourly_rate: number;
}

export default function RequestCustomAutomationPage() {
    const router = useRouter();

    // Wizard state
    const [step, setStep] = useState<1 | 2>(1);

    // Data states
    const [creators, setCreators] = useState<CreatorPreview[]>([]);
    const [isLoadingCreators, setIsLoadingCreators] = useState(true);
    const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        projectDescription: '',
        timeline: 'urgent',
        budget: 'flexible',
    });

    useEffect(() => {
        const fetchCreators = async () => {
            try {
                const res = await fetch('/api/marketplace/creators');
                const data = await res.json();
                if (data.success) {
                    setCreators(data.creators);
                } else {
                    console.error('Failed to fetch creators', data.error);
                }
            } catch (err) {
                console.error('Network error fetching creators:', err);
            } finally {
                setIsLoadingCreators(false);
            }
        };
        fetchCreators();
    }, []);

    const handleSelectCreator = (id: string) => {
        setSelectedCreatorId(id);
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleGoBack = () => {
        if (step === 2) setStep(1);
        else router.push('/marketplace');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.projectDescription) {
            return toast.error('Please fill in all required fields.');
        }

        setIsSubmitting(true);
        try {
            const bodyPayload = { ...formData, targetCreatorId: selectedCreatorId };

            const res = await fetch('/api/marketplace/request-custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Custom automation request submitted! The creator will review and be in touch.', {
                    duration: 5000,
                    icon: '🚀'
                });
                router.push('/marketplace');
            } else {
                toast.error(data.error || 'Failed to submit request');
            }
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] font-sans">
            <header className="border-b border-[var(--border)] bg-[var(--card)] px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="hover:bg-[var(--muted)] rounded-full" onClick={handleGoBack}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                                Request <span className="text-primary-400">Custom Agent</span>
                            </h1>
                            <p className="text-[10px] text-[var(--muted-fg)] font-bold uppercase tracking-widest hidden sm:block">
                                Built entirely to your specifications
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header messaging */}
                <div className="text-center space-y-4 mb-2">
                    <div className="w-16 h-16 rounded-3xl bg-primary-500/10 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/10 border border-primary-500/20">
                        <Sparkles className="w-8 h-8 text-primary-400" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight italic">
                        {step === 1 ? 'Choose Your AI Developer' : 'Project Details'}
                    </h2>
                    <p className="text-sm text-[var(--muted-fg)] max-w-xl mx-auto font-medium">
                        {step === 1
                            ? 'Browse top AION creators. Select an expert with the exact skills needed to build your custom automation pipeline.'
                            : 'Provide the technical and business details of your new automation. Your selected creator will review it shortly.'
                        }
                    </p>
                </div>

                {/* STEP 1: Creator Selection */}
                {step === 1 && (
                    <div className="space-y-6">
                        {/* Status bar */}
                        <div className="flex items-center justify-between max-w-4xl mx-auto px-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] flex items-center gap-2">
                                <Target className="w-4 h-4 text-emerald-400" /> Available Verified Creators
                            </span>
                            <span className="text-[10px] font-bold uppercase border border-[var(--border)] px-3 py-1 rounded bg-[var(--muted)]/50">
                                {creators.length} Found
                            </span>
                        </div>

                        {isLoadingCreators ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-400 mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-fg)]">Loading elite creators...</p>
                            </div>
                        ) : creators.length === 0 ? (
                            <Card className="flex flex-col items-center justify-center py-20 border-dashed border-2 border-[var(--border)] bg-transparent shadow-none">
                                <Bot className="w-12 h-12 text-[var(--muted-fg)] mb-4 opacity-50" />
                                <h3 className="text-xl font-bold">No Creators Available</h3>
                                <p className="text-sm text-[var(--muted-fg)] mt-2">Looks like our community is fully booked right now. Try again later!</p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {creators.map((creator) => (
                                    <Card
                                        key={creator.id}
                                        className="group p-0 border border-[var(--border)] hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-300 rounded-[2rem] overflow-hidden bg-[var(--card)] flex flex-col justify-between"
                                    >
                                        <div className="p-6 pb-2 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                                                        {creator.avatar_url ? (
                                                            <img src={creator.avatar_url} alt={creator.full_name} className="w-full h-full rounded-[1.5rem] object-cover" />
                                                        ) : (
                                                            creator.full_name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-lg flex items-center gap-1.5 uppercase italic tracking-tight">
                                                            {creator.full_name}
                                                            <BadgeCheck className="w-4 h-4 text-primary-400" />
                                                        </h3>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-fg)] block">
                                                            {creator.expertise}
                                                        </span>
                                                    </div>
                                                </div>

                                            </div>

                                            <p className="text-xs text-[var(--muted-fg)] font-medium leading-relaxed line-clamp-3">
                                                {creator.bio}
                                            </p>

                                            {/* Skills */}
                                            {creator.skills && creator.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {creator.skills.slice(0, 3).map((skill: string) => (
                                                        <span key={skill} className="text-[9px] font-black uppercase tracking-widest bg-[var(--muted)]/50 px-2 py-1 rounded-md border border-[var(--border)] text-[var(--muted-fg)] group-hover:border-primary-500/20 group-hover:text-primary-300 transition-colors">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 mt-4 border-t border-[var(--border)] bg-[var(--muted)]/10 flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted-fg)] opacity-60">Avg Rate</p>
                                                <p className="text-lg font-black text-primary-400 italic">${creator.hourly_rate}<span className="text-sm">/hr</span></p>
                                            </div>
                                            <Button
                                                onClick={() => handleSelectCreator(creator.id)}
                                                className="h-10 px-6 rounded-xl font-black text-xs uppercase tracking-widest italic group-hover:shadow-lg group-hover:shadow-primary-500/20 bg-[var(--bg)] text-primary-400 border border-primary-500/30 hover:bg-primary-500 hover:text-white transition-all overflow-hidden relative"
                                            >
                                                Select <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Fallback open marketplace request */}
                        <div className="max-w-4xl mx-auto pt-6 flex justify-center border-t border-[var(--border)] mt-8">
                            <Button
                                variant="outline"
                                className="rounded-xl h-12 px-8 font-bold uppercase tracking-wider text-xs border-dashed text-[var(--muted-fg)] hover:text-primary-400 hover:border-primary-400/50 hover:bg-primary-500/5 transition-all"
                                onClick={() => handleSelectCreator('')}
                            >
                                <Zap className="w-4 h-4 mr-2" /> Send to General Marketplace Request Pool
                            </Button>
                        </div>
                    </div>
                )}


                {/* STEP 2: Project Details Form */}
                {step === 2 && (
                    <div className="max-w-4xl mx-auto">
                        {/* Pre-selected creator header */}
                        {selectedCreatorId && (
                            <div className="mb-6 bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4 flex items-center gap-4">
                                <div className="w-12 h-12 bg-[var(--card)] rounded-xl flex items-center justify-center border border-[var(--border)]">
                                    <Bot className="w-6 h-6 text-primary-400" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-primary-400">Direct Request</h4>
                                    <p className="text-sm font-medium">You are sending this custom build requirement directly to the selected developer.</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="rounded-xl text-xs font-bold uppercase">Change Creator</Button>
                            </div>
                        )}

                        <Card className="p-8 md:p-10 border border-[var(--border)] bg-[var(--card)] rounded-[2rem] shadow-xl shadow-primary-500/5">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Contact Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]">Full Name</label>
                                        <Input
                                            placeholder="Jane Doe"
                                            className="h-12 bg-[var(--muted)]/50 border-none font-bold"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]">Email Address</label>
                                        <Input
                                            type="email"
                                            placeholder="jane@company.com"
                                            className="h-12 bg-[var(--muted)]/50 border-none font-bold"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Project Description */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] flex items-center gap-2">
                                        <Bot className="w-4 h-4 text-primary-400" /> Detailed Requirements
                                    </label>
                                    <p className="text-[10px] text-[var(--muted-fg)] mb-2">What apps are you integrating? What is the trigger? What should the AI do?</p>
                                    <textarea
                                        placeholder="E.g., I want an automation that triggers when a new row is added to Google Sheets, passes the data to Gemini for summarization, and sends a formatted message to Slack..."
                                        className="w-full h-40 bg-[var(--muted)]/50 border-[var(--border)] focus:border-primary-500/50 font-medium p-4 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-primary-500/20 text-sm transition-all shadow-inner"
                                        value={formData.projectDescription}
                                        onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* Dropdowns / Selects */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border)]">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-blue-400" /> Timeline
                                        </label>
                                        <select
                                            className="w-full h-12 bg-[var(--muted)]/50 border-none font-bold rounded-xl px-4 outline-none appearance-none"
                                            value={formData.timeline}
                                            onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                                        >
                                            <option value="urgent">ASAP / Urgent (Within days)</option>
                                            <option value="1_week">Within 1 Week</option>
                                            <option value="2_weeks">Within 2-3 Weeks</option>
                                            <option value="flexible">Flexible</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] flex items-center gap-2">
                                            <Target className="w-4 h-4 text-emerald-400" /> Budget Expectation
                                        </label>
                                        <select
                                            className="w-full h-12 bg-[var(--muted)]/50 border-none font-bold rounded-xl px-4 outline-none appearance-none"
                                            value={formData.budget}
                                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                        >
                                            <option value="flexible">Flexible / Negotiable</option>
                                            <option value="100-500">$100 - $500</option>
                                            <option value="500-1000">$500 - $1,000</option>
                                            <option value="1000+">$1,000+</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest italic shadow-xl shadow-primary-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-primary-600 to-primary-500"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                        ) : (
                                            <>
                                                Submit Custom Request to Developer <Send className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
