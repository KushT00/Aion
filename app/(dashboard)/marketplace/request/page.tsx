'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Sparkles, Bot, Clock, Target, CalendarDays, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RequestCustomAutomationPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        projectDescription: '',
        timeline: 'urgent',
        budget: 'flexible',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.projectDescription) {
            return toast.error('Please fill in all required fields.');
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/marketplace/request-custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Custom automation request submitted! Creators will be in touch shortly.', {
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
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Link href="/marketplace">
                        <Button variant="ghost" size="icon" className="hover:bg-[var(--muted)] rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                            Request <span className="text-primary-400">Custom Agent</span>
                        </h1>
                        <p className="text-[10px] text-[var(--muted-fg)] font-bold uppercase tracking-widest">
                            Built entirely to your specifications
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 lg:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-4 mb-10">
                    <div className="w-16 h-16 rounded-3xl bg-primary-500/10 flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-8 h-8 text-primary-400" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight italic">
                        Can't find what you need?<br />
                        <span className="text-primary-400">Let's build it.</span>
                    </h2>
                    <p className="text-sm text-[var(--muted-fg)] max-w-xl mx-auto font-medium">
                        Describe your workflow, connect tools, and specify requirements.
                        Top AION creators will receive your request and generate a custom AI Automation tailored to your business.
                    </p>
                </div>

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
                                className="w-full h-40 bg-[var(--muted)]/50 border-none font-medium p-4 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
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
                                        Submit Custom Request <Send className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Card>
            </main>
        </div>
    );
}
