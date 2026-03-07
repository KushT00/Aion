'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAIChat } from '@/components/ai-chat-context';
import {
    X,
    Send,
    Bot,
    User,
    Sparkles,
    Key,
    CheckCircle2,
    Loader2,
} from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    type?: 'text' | 'credential' | 'success';
    timestamp: Date;
}

const initialMessages: ChatMessage[] = [
    {
        id: '1',
        role: 'assistant',
        content: "👋 Hi! I'm your AION AI Agent. I can help you deploy automations, connect your accounts, and configure workflows. What would you like to do?",
        type: 'text',
        timestamp: new Date(),
    },
];

export function AIChatPanel() {
    const { isOpen, close } = useAIChat();
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            type: 'text',
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            const responses = [
                "I can help you set that up! First, I'll need access to your account. Would you like to connect via OAuth or provide an API key?",
                "Great choice! This automation will save you hours each week. Let me configure the required integrations for you.",
                "I've analyzed your request. Here's what I recommend: connect your Slack workspace first, then we'll set up the email triggers.",
                "Your workflow is almost ready! I just need to know where you'd like the output data sent — Slack, Email, or Google Sheets?",
            ];
            const response: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responses[Math.floor(Math.random() * responses.length)],
                type: 'text',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, response]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
                    onClick={close}
                />
            )}

            {/* Panel */}
            <div
                className={cn(
                    'fixed top-0 right-0 z-[70] h-screen w-full max-w-md flex flex-col',
                    'bg-[var(--card)] border-l border-[var(--border)]',
                    'shadow-2xl shadow-black/20',
                    'transition-transform duration-300 ease-in-out',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                            <Sparkles className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[var(--fg)]">AION Agent</h3>
                            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Online
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={close}
                        className="p-2 rounded-lg text-[var(--muted-fg)] hover:bg-[var(--muted)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                'flex gap-3 animate-fade-in',
                                msg.role === 'user' ? 'flex-row-reverse' : '',
                            )}
                        >
                            {/* Avatar */}
                            <div
                                className={cn(
                                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                    msg.role === 'assistant'
                                        ? 'bg-gradient-to-br from-primary-500 to-accent-500'
                                        : 'bg-[var(--muted)]',
                                )}
                            >
                                {msg.role === 'assistant' ? (
                                    <Bot className="w-4 h-4 text-white" />
                                ) : (
                                    <User className="w-4 h-4 text-[var(--muted-fg)]" />
                                )}
                            </div>

                            {/* Bubble */}
                            <div
                                className={cn(
                                    'max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                                    msg.role === 'assistant'
                                        ? 'bg-[var(--muted)] text-[var(--fg)] rounded-tl-md'
                                        : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-tr-md',
                                )}
                            >
                                {msg.type === 'credential' && (
                                    <div className="flex items-center gap-2 mb-2 text-xs text-amber-400">
                                        <Key className="w-3.5 h-3.5" />
                                        Credential Request
                                    </div>
                                )}
                                {msg.type === 'success' && (
                                    <div className="flex items-center gap-2 mb-2 text-xs text-emerald-400">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Connected
                                    </div>
                                )}
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex gap-3 animate-fade-in">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-[var(--muted)] px-4 py-3 rounded-2xl rounded-tl-md">
                                <div className="flex gap-1.5">
                                    <span className="w-2 h-2 bg-[var(--muted-fg)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-[var(--muted-fg)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-[var(--muted-fg)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="px-5 pb-2 flex gap-2 flex-wrap">
                    {['Connect Google', 'Deploy automation', 'Check status'].map((action) => (
                        <button
                            key={action}
                            onClick={() => {
                                setInput(action);
                                setTimeout(handleSend, 50);
                            }}
                            className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--muted-fg)] hover:text-[var(--fg)] hover:border-primary-500/30 hover:bg-primary-500/5 transition-all"
                        >
                            {action}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 bg-[var(--muted)] rounded-xl px-4 py-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask AION anything..."
                            className="flex-1 bg-transparent text-sm text-[var(--fg)] placeholder:text-[var(--muted-fg)] focus:outline-none"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className={cn(
                                'p-2 rounded-lg transition-all',
                                input.trim()
                                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40'
                                    : 'text-[var(--muted-fg)]',
                            )}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
