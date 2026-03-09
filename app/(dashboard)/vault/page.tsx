'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Plus, Trash2, Key, HelpCircle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_KEYS = [
    { name: 'OPENAI_API_KEY', label: 'OpenAI API Key', provider: 'OpenAI' },
    { name: 'GROQ_API_KEY', label: 'Groq API Key', provider: 'Groq' },
    { name: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', provider: 'Anthropic' },
    { name: 'GEMINI_API_KEY', label: 'Google Gemini API Key', provider: 'Google' },
    { name: 'SERP_API_KEY', label: 'SerpAPI Search Key', provider: 'SerpAPI' },
    { name: 'SLACK_WEBHOOK_URL', label: 'Slack Webhook URL', provider: 'Slack' },
    { name: 'DISCORD_WEBHOOK_URL', label: 'Discord Webhook URL', provider: 'Discord' },
    { name: 'GITHUB_TOKEN', label: 'GitHub Personal Access Token', provider: 'GitHub' },
    { name: 'TWILIO_AUTH_TOKEN', label: 'Twilio Auth Token', provider: 'Twilio' },
];

export default function VaultPage() {
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [keyName, setKeyName] = useState('');
    const [keyValue, setKeyValue] = useState('');
    const [description, setDescription] = useState('');

    const fetchKeys = async () => {
        try {
            const res = await fetch('/api/vault');
            const data = await res.json();
            if (res.ok) setKeys(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyName || !keyValue) return;
        setSaving(true);
        try {
            const res = await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key_name: keyName, key_value: keyValue, description }),
            });
            if (res.ok) {
                toast.success(`${keyName} stored successfully`);
                setKeyName('');
                setKeyValue('');
                setDescription('');
                fetchKeys();
            } else {
                toast.error("Failed to store key");
            }
        } catch (err) {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this key?")) return;
        try {
            const res = await fetch(`/api/vault?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Key deleted");
                fetchKeys();
            }
        } catch (err) {
            toast.error("Failed to delete key");
        }
    };

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 shadow-sm border border-primary-500/20">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Secret <span className="text-primary-500">Vault</span></h1>
                    </div>
                    <p className="text-[var(--muted-fg)] font-bold uppercase text-[10px] tracking-[0.2em] opacity-70">
                        Secure Environment Variables & API Credentials
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] px-4 py-2 rounded-2xl">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-[var(--card)] bg-primary-500/20 flex items-center justify-center">
                                <Key className="w-3 h-3 text-primary-500" />
                            </div>
                        ))}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]">
                        {keys.length} Active Secrets
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Form for adding keys (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-[var(--border)] bg-[var(--card)] shadow-xl rounded-[2rem] overflow-hidden border-b-4 border-b-primary-500/20">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-black uppercase italic tracking-tight flex items-center gap-2">
                                <Plus className="w-4 h-4 text-primary-500" />
                                Add New Secret
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--muted-fg)] ml-1">Quick Select</label>
                                    <select
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-primary-500/50 outline-none transition-all appearance-none cursor-pointer"
                                        onChange={(e) => {
                                            const preset = PRESET_KEYS.find(k => k.name === e.target.value);
                                            if (preset) {
                                                setKeyName(preset.name);
                                                setDescription(`API key for ${preset.provider}`);
                                            }
                                        }}
                                        value=""
                                    >
                                        <option value="" disabled>Common Presets...</option>
                                        {PRESET_KEYS.map(pk => (
                                            <option key={pk.name} value={pk.name}>{pk.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--muted-fg)] ml-1">Key ID</label>
                                    <Input
                                        placeholder="e.g. OPENAI_API_KEY"
                                        value={keyName}
                                        onChange={e => setKeyName(e.target.value)}
                                        className="bg-[var(--bg)] border-[var(--border)] h-11 text-xs font-bold uppercase tracking-tight placeholder:opacity-30 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--muted-fg)] ml-1">Value</label>
                                    <div className="relative">
                                        <Input
                                            type="password"
                                            placeholder="••••••••••••••••"
                                            value={keyValue}
                                            onChange={e => setKeyValue(e.target.value)}
                                            className="bg-[var(--bg)] border-[var(--border)] h-11 text-xs font-bold tracking-tight pr-10 rounded-xl"
                                        />
                                        <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-fg)] opacity-30" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--muted-fg)] ml-1">Label</label>
                                    <Input
                                        placeholder="Human readable name..."
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="bg-[var(--bg)] border-[var(--border)] h-11 text-xs font-bold tracking-tight rounded-xl"
                                    />
                                </div>

                                <Button
                                    className="w-full h-12 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-black uppercase italic tracking-widest text-[10px] shadow-lg shadow-primary-500/10 active:scale-[0.98] transition-all mt-2"
                                    disabled={saving || !keyName || !keyValue}
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                    Save to Vault
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right side: List of existing keys (8 cols) */}
                <div className="lg:col-span-8">
                    <Card className="border-[var(--border)] bg-[var(--card)]/40 backdrop-blur-md shadow-xl rounded-[2.5rem] overflow-hidden min-h-[460px] flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border)]/50 pb-6">
                            <div>
                                <CardTitle className="text-xl font-black uppercase italic tracking-tight">Stored Secrets</CardTitle>
                                <CardDescription className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Manage your encrypted credentials</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-6">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-4">
                                    <div className="relative">
                                        <ShieldCheck className="w-12 h-12 text-primary-500/20" />
                                        <Loader2 className="w-6 h-6 animate-spin text-primary-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)] animate-pulse">Decrypting Environment...</p>
                                </div>
                            ) : keys.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center gap-4 border-2 border-dashed border-[var(--border)] rounded-[2rem] opacity-40">
                                    <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center">
                                        <Key className="w-8 h-8 text-[var(--muted-fg)]" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black uppercase italic tracking-tight">Vault Isolated</p>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-fg)]">No keys detected in your current session</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {keys.map((key) => (
                                        <div
                                            key={key.id}
                                            className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-primary-500/40 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-primary-500/5 flex items-center justify-center text-primary-500 shrink-0 border border-primary-500/10 group-hover:bg-primary-500/10 transition-colors">
                                                <Key className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-[11px] font-black uppercase italic tracking-tight truncate group-hover:text-primary-400 transition-colors">{key.key_name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-bold uppercase text-[var(--muted-fg)] tracking-[0.2em] opacity-40">••••••••••</span>
                                                    {key.description && (
                                                        <span className="text-[9px] font-bold text-[var(--muted-fg)] truncate max-w-[100px] opacity-60">• {key.description.split(' ').slice(0, 2).join(' ')}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(key.id)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-fg)] hover:text-red-400 hover:bg-red-400/5 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Info Section: The 3 Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="p-5 rounded-[1.5rem] bg-[var(--card)] border border-[var(--border)] flex gap-4 items-start shadow-sm border-b-2 border-b-emerald-500/20">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Vault Security</h5>
                        <p className="text-[10px] font-bold text-[var(--muted-fg)] uppercase leading-relaxed tracking-tight opacity-70">Military-grade isolation. Keys never touch creator servers.</p>
                    </div>
                </div>

                <div className="p-5 rounded-[1.5rem] bg-[var(--card)] border border-[var(--border)] flex gap-4 items-start shadow-sm border-b-2 border-b-primary-500/20">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0 border border-primary-500/20">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-primary-500">Auto-Injection</h5>
                        <p className="text-[10px] font-bold text-[var(--muted-fg)] uppercase leading-relaxed tracking-tight opacity-70">AION detects matching keys during deployment for zero-effort setup.</p>
                    </div>
                </div>

                <div className="p-5 rounded-[1.5rem] bg-[var(--card)] border border-[var(--border)] flex gap-4 items-start shadow-sm border-b-2 border-b-accent-500/20">
                    <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-400 shrink-0 border border-accent-500/20">
                        <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-accent-400">Total Privacy</h5>
                        <p className="text-[10px] font-bold text-[var(--muted-fg)] uppercase leading-relaxed tracking-tight opacity-70">You control which automations access which vault secrets.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
