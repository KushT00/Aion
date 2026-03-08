'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2, Sparkles, HelpCircle, Wrench, Briefcase, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ContactCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    listing: {
        id: string;
        title: string;
        seller_id: string;
        seller: {
            full_name: string | null;
            id: string;
        };
    };
}

const typeOptions = [
    { id: 'pre_sale_question', label: 'Question', icon: HelpCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'hire_request', label: 'Custom Build', icon: Briefcase, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { id: 'tweak_request', label: 'Modification', icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

export function ContactCreatorModal({ isOpen, onClose, listing }: ContactCreatorModalProps) {
    const [subject, setSubject] = useState(`Question about: ${listing.title}`);
    const [message, setMessage] = useState('');
    const [type, setType] = useState('pre_sale_question');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setSubject(`Question about: ${listing.title}`);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, listing.title]);

    const handleSend = async () => {
        if (!message.trim() || !subject.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    creator_id: listing.seller.id || listing.seller_id,
                    listing_id: listing.id,
                    subject,
                    message: message.trim(),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("Message Sent! Redirecing to your inbox...");
                onClose();
                router.push(`/inbox?id=${data.conversation.id}`);
            } else {
                const error = await res.json();
                toast.error(error.error || "Please try again later.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to connect to the messaging server.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-[500px] bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-xl text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--fg)] transition-all z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="pt-10 px-8 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-primary-400" />
                        </div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight">Contact Creator</h2>
                    </div>
                    <p className="text-[10px] font-black text-[var(--muted-fg)] uppercase tracking-tight ml-1">
                        Send a message to <span className="text-primary-400">{listing.seller.full_name}</span> regarding <span className="text-[var(--fg)]">{listing.title}</span>.
                    </p>
                </div>

                <div className="space-y-6 py-4 px-8">
                    {/* Message Type */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] ml-1">Purpose</label>
                        <div className="grid grid-cols-3 gap-2">
                            {typeOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setType(opt.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 gap-1.5",
                                        type === opt.id
                                            ? `${opt.bg} border-primary-500/50`
                                            : "border-[var(--border)] hover:border-primary-500/30"
                                    )}
                                >
                                    <opt.icon className={cn("w-4 h-4", type === opt.id ? opt.color : "text-[var(--muted-fg)]")} />
                                    <span className={cn("text-[9px] font-black uppercase", type === opt.id ? opt.color : "text-[var(--muted-fg)]")}>
                                        {opt.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] ml-1">Subject</label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="bg-[var(--muted)] border-[var(--border)] rounded-xl h-12 font-bold focus:ring-1 focus:ring-primary-500"
                            placeholder="Briefly describe your request..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] ml-1">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl min-h-[150px] p-4 text-sm font-medium focus:ring-1 focus:ring-primary-500 outline-none resize-none"
                            placeholder="Type your question or request here..."
                        />
                    </div>
                </div>

                <div className="px-8 pb-10 pt-4 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="rounded-xl font-black uppercase tracking-widest text-xs h-12 px-6">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={loading || !message.trim()}
                        className="rounded-xl px-8 h-12 font-black uppercase italic tracking-widest bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 shadow-lg shadow-primary-500/20"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Message <Send className="w-3.5 h-3.5 ml-2" /></>}
                    </Button>
                </div>

                <Sparkles className="absolute -bottom-4 -right-4 w-24 h-24 text-primary-400/5 pointer-events-none" />
            </div>
        </div>
    );
}
