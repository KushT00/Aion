'use client';
import { cn } from '@/lib/utils';
import { GoogleConnectButton } from './GoogleConnectButton';
import {
    Plus, Trash2, BookOpen, Wrench, Globe, Link2,
    ChevronDown, ChevronRight, BrainCircuit,
} from 'lucide-react';
import { useState } from 'react';

// ─── Shared helpers ─────────────────────────────────────────
export const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-wider block mb-1 ml-0.5">{children}</label>
);
export const Input = ({ className = '', ...props }: any) => (
    <input className={cn("w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-violet-500 transition-shadow", className)} {...props} />
);
export const Textarea = ({ className = '', ...props }: any) => (
    <textarea className={cn("w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-violet-500 resize-none transition-shadow", className)} {...props} />
);
export const Select = ({ children, className = '', ...props }: any) => (
    <select className={cn("w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-violet-500", className)} {...props}>{children}</select>
);

// ─── Section Accordion ─────────────────────────────────────
export function Section({ title, icon: Icon, color = 'text-[var(--muted-fg)]', children, defaultOpen = true }: any) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-2 bg-[var(--muted)]/50 hover:bg-[var(--muted)] transition-colors text-left">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={cn('w-3 h-3', color)} />}
                    <span className="text-[11px] font-bold text-[var(--fg)]">{title}</span>
                </div>
                {open ? <ChevronDown className="w-3 h-3 text-[var(--muted-fg)]" /> : <ChevronRight className="w-3 h-3 text-[var(--muted-fg)]" />}
            </button>
            {open && <div className="p-3 space-y-2.5 border-t border-[var(--border)] bg-transparent">{children}</div>}
        </div>
    );
}

// ─── Shared Model Selector ──────────────────────────────────
export function ModelSelector({ value, onChange, integrationId }: { value: string, onChange: (val: string) => void, integrationId: string }) {
    const models = integrationId === 'google_gemini' || integrationId === 'gemini'
        ? [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Fast & Capable' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Exp)', desc: 'Experimental' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Efficient' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Powerful' }
        ]
        : integrationId === 'openai'
            ? [
                { id: 'gpt-4o', name: 'GPT-4o', desc: 'SOTA performance' },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Efficient & Smart' },
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Fast & Reliable' }
            ]
            : integrationId === 'groq'
                ? [
                    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: 'State-of-the-art' },
                    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', desc: 'Ultra-fast' },
                    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', desc: 'High context' }
                ]
                : [];

    return (
        <div className="space-y-2">
            <Label>ModelSelection</Label>
            <div className="grid grid-cols-1 gap-2">
                {models.map(m => (
                    <button
                        key={m.id}
                        onClick={() => onChange(m.id)}
                        className={cn(
                            "w-full text-left p-2 rounded-lg border transition-all text-[11px]",
                            value === m.id
                                ? "bg-violet-500/10 border-violet-500 text-violet-600 dark:text-violet-400"
                                : "bg-[var(--card)] border-[var(--border)] hover:border-violet-500/50"
                        )}
                    >
                        <div className="font-semibold">{m.name}</div>
                        <div className="text-[10px] opacity-60 leading-tight">{m.desc}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── AI Agent Configuration ─────────────────────────────────
export function AIAgentConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const tools: string[] = data.tools || [];

    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    const toggleTool = (tool: string) => {
        const next = tools.includes(tool) ? tools.filter(t => t !== tool) : [...tools, tool];
        updateData({ tools: next });
    };

    const availableTools = [
        { id: 'web_search', label: 'Web Search', desc: 'Search the web for info' },
        { id: 'calculator', label: 'Calculator', desc: 'Perform math operations' },
        { id: 'code_exec', label: 'Code Executor', desc: 'Run Python/JS snippets' },
        { id: 'image_gen', label: 'Image Generator', desc: 'Generate images with AI' },
        { id: 'read_url', label: 'Read URL', desc: 'Fetch and read a webpage' },
    ];

    const INTEGRATION_OPTIONS = [
        { id: 'google_gemini', label: 'Google Gemini' },
        { id: 'openai', label: 'OpenAI GPT' },
        { id: 'groq', label: 'Groq (Llama)' },
        { id: 'openrouter', label: 'OpenRouter (300+ models)' },
    ];

    return (
        <div className="space-y-3">
            <Section title="Model" icon={BrainCircuit} color="text-purple-400">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label>Provider</Label>
                        <Select value={config.integrationId || 'google_gemini'}
                            onChange={(e: any) => updateNode({ config: { ...config, integrationId: e.target.value, actionId: 'chat' } })}>
                            {INTEGRATION_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label>API Key</Label>
                        <Input type="password" placeholder="Key..." value={data.apiKey || ''} onChange={(e: any) => updateData({ apiKey: e.target.value })} />
                    </div>
                </div>

                {config.integrationId !== 'openrouter' && (
                    <ModelSelector
                        integrationId={config.integrationId || 'google_gemini'}
                        value={data.model || (
                            config.integrationId === 'groq' ? 'llama-3.3-70b-versatile' :
                                config.integrationId === 'openai' ? 'gpt-4o' :
                                    'gemini-2.0-flash'
                        )}
                        onChange={(model) => updateData({ model })}
                    />
                )}

                <div className="space-y-1 pt-2">
                    <Label>Instructions (System)</Label>
                    <Textarea className="h-14 py-1" placeholder="Who are you?" value={data.systemPrompt || ''} onChange={(e: any) => updateData({ systemPrompt: e.target.value })} />
                </div>
                <div className="space-y-1">
                    <Label>Prompt (User)</Label>
                    <Textarea className="h-16 py-1" placeholder="Task details..." value={data.userPrompt || ''} onChange={(e: any) => updateData({ userPrompt: e.target.value })} />
                </div>
            </Section>

            <Section title="Tools" icon={Wrench} color="text-amber-400" defaultOpen={false}>
                <p className="text-[10px] text-[var(--muted-fg)]">Give the agent capabilities beyond text generation.</p>
                <div className="space-y-2">
                    {availableTools.map(tool => (
                        <label key={tool.id} className={cn(
                            "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                            tools.includes(tool.id)
                                ? "border-amber-500/40 bg-amber-500/5"
                                : "border-[var(--border)] hover:border-[var(--muted-fg)]/30"
                        )}>
                            <input type="checkbox" checked={tools.includes(tool.id)} onChange={() => toggleTool(tool.id)} className="accent-amber-500 w-3.5 h-3.5" />
                            <div>
                                <p className="text-xs font-semibold text-[var(--fg)]">{tool.label}</p>
                                <p className="text-[10px] text-[var(--muted-fg)]">{tool.desc}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </Section>

            <Section title="RAG / Knowledge" icon={BookOpen} color="text-blue-400" defaultOpen={false}>
                <div className="space-y-1.5">
                    <Label>URL / Docs</Label>
                    <Input placeholder="URL or text..." value={data.knowledgeBase || ''} onChange={(e: any) => updateData({ knowledgeBase: e.target.value })} />
                    <Label>Context</Label>
                    <Textarea className="h-16 py-1" placeholder="Inject text..." value={data.knowledgeText || ''} onChange={(e: any) => updateData({ knowledgeText: e.target.value })} />
                </div>
            </Section>
        </div>
    );
}

// ─── IF / ELSE Configuration ────────────────────────────────
export function IfElseConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    const operators = [
        { value: 'equals', label: '= equals' },
        { value: 'not_equals', label: '≠ not equals' },
        { value: 'greater_than', label: '> greater than' },
        { value: 'less_than', label: '< less than' },
        { value: 'contains', label: '⊃ contains' },
        { value: 'not_contains', label: '⊅ not contains' },
        { value: 'starts_with', label: '↦ starts with' },
        { value: 'is_empty', label: '∅ is empty' },
        { value: 'is_not_empty', label: '◉ is not empty' },
    ];

    return (
        <div className="space-y-3">
            <div className="p-2 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                <p className="text-[10px] text-[var(--muted-fg)] leading-tight">
                    Check <span className="text-emerald-400 font-bold">True</span> or <span className="text-rose-400 font-bold">False</span> handles.
                </p>
            </div>
            <div className="space-y-2">
                <Label>Left Value</Label>
                <Input placeholder="{{node_label.field}} or literal value" value={data.leftValue || ''} onChange={(e: any) => updateData({ leftValue: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>Operator</Label>
                <Select value={data.operator || 'equals'} onChange={(e: any) => updateData({ operator: e.target.value })}>
                    {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </Select>
            </div>
            {!['is_empty', 'is_not_empty'].includes(data.operator) && (
                <div className="space-y-2">
                    <Label>Right Value</Label>
                    <Input placeholder="Value to compare against" value={data.rightValue || ''} onChange={(e: any) => updateData({ rightValue: e.target.value })} />
                </div>
            )}
        </div>
    );
}

// ─── Slack Configuration ────────────────────────────────────
export function SlackConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    return (
        <div className="space-y-3">
            <div className="space-y-2"><Label>Incoming Webhook URL</Label>
                <Input placeholder="https://hooks.slack.com/services/..." value={data.webhookUrl || ''} onChange={(e: any) => updateData({ webhookUrl: e.target.value })} />
                <p className="text-[10px] text-[var(--muted-fg)]">Create one at <a href="https://api.slack.com/messaging/webhooks" target="_blank" className="text-violet-400 hover:underline">api.slack.com</a></p>
            </div>
            <div className="space-y-2"><Label>Channel (optional override)</Label>
                <Input placeholder="#general" value={data.channel || ''} onChange={(e: any) => updateData({ channel: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Bot Name (optional)</Label>
                <Input placeholder="AION" value={data.username || ''} onChange={(e: any) => updateData({ username: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Message</Label>
                <Textarea className="h-28" placeholder="{{ai_node.text}}" value={data.text || ''} onChange={(e: any) => updateData({ text: e.target.value })} />
            </div>
        </div>
    );
}

// ─── Telegram Configuration ─────────────────────────────────
export function TelegramConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    return (
        <div className="space-y-3">
            <div className="p-2.5 bg-sky-500/5 border border-sky-500/20 rounded-lg">
                <p className="text-[10px] text-sky-400 font-semibold mb-1">Telegram Bot API</p>
                <div className="space-y-2">
                    <Label>Bot Token</Label>
                    <Input type="password" placeholder="1234567890:AAF..." value={data.botToken || ''} onChange={(e: any) => updateData({ botToken: e.target.value })} />
                    <p className="text-[9px] text-[var(--muted-fg)] leading-tight">Paste your token from <a href="https://t.me/BotFather" target="_blank" className="text-sky-400 hover:underline">@BotFather</a></p>
                </div>
            </div>
            <div className="space-y-2">
                <Label>Chat ID (Optional)</Label>
                <Input placeholder="-100..." value={data.chatId || ''} onChange={(e: any) => updateData({ chatId: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea className="h-28" placeholder="Hello!" value={data.text || ''} onChange={(e: any) => updateData({ text: e.target.value })} />
            </div>
        </div>
    );
}

// ─── Notion Configuration ───────────────────────────────────
export function NotionConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    return (
        <div className="space-y-3">
            <div className="space-y-2"><Label>Integration Token</Label>
                <Input type="password" placeholder="secret_..." value={data.apiKey || ''} onChange={(e: any) => updateData({ apiKey: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Action</Label>
                <Select value={config.actionId || 'create_page'} onChange={(e: any) => updateNode({ config: { ...config, actionId: e.target.value } })}>
                    <option value="create_page">Create Page</option>
                    <option value="append_block">Append to Page</option>
                </Select>
            </div>
            <div className="space-y-2"><Label>Page / Database ID</Label>
                <Input placeholder="abc123def..." value={data.pageId || data.databaseId || ''} onChange={(e: any) => updateData({ pageId: e.target.value, databaseId: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Content</Label>
                <Textarea className="h-24" value={data.content || ''} onChange={(e: any) => updateData({ content: e.target.value })} />
            </div>
        </div>
    );
}

// ─── OpenRouter Configuration ───────────────────────────────
export function OpenRouterConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    const popularModels = [
        { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (Free)' },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (Free)' },
        { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free)' },
        { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
        { id: 'openai/gpt-4o', label: 'GPT-4o' },
    ];
    return (
        <div className="space-y-3">
            <div className="p-2.5 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <p className="text-[10px] text-violet-400 font-semibold">300+ Models Available</p>
                <p className="text-[10px] text-[var(--muted-fg)]">Get key at <a href="https://openrouter.ai/keys" target="_blank" className="text-violet-400 hover:underline">openrouter.ai</a></p>
            </div>
            <div className="space-y-2"><Label>API Key</Label>
                <Input type="password" placeholder="sk-or-..." value={data.apiKey || ''} onChange={(e: any) => updateData({ apiKey: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Model</Label>
                <Select value={data.model || ''} onChange={(e: any) => updateData({ model: e.target.value })}>
                    <option value="">-- Select model --</option>
                    {popularModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </Select>
                <Input placeholder="Custom Model ID..." value={data.model || ''} onChange={(e: any) => updateData({ model: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>System Prompt</Label>
                <Textarea className="h-20" value={data.systemPrompt || ''} onChange={(e: any) => updateData({ systemPrompt: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>User Prompt</Label>
                <Textarea className="h-24" placeholder="{{node.text}}" value={data.userPrompt || ''} onChange={(e: any) => updateData({ userPrompt: e.target.value })} />
            </div>
        </div>
    );
}

// ─── Code Node Configuration ────────────────────────────────
export function CodeConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <div className="p-2.5 bg-cyan-500/5 border border-cyan-500/20 rounded-lg text-[10px] text-[var(--muted-fg)]">
                <p className="text-cyan-400 font-semibold uppercase mb-1">JavaScript Sandbox</p>
                <code className="bg-[var(--muted)] px-1 rounded">$input</code> = previous outputs
            </div>
            <div className="space-y-2"><Label>Code</Label>
                <Textarea className="h-48 font-mono text-xs" value={data.code || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, code: e.target.value } } })} />
            </div>
        </div>
    );
}

// ─── Set Variable Configuration ─────────────────────────────
export function SetVariableConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const vars: { key: string; value: string }[] = data.varList || [{ key: '', value: '' }];
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                {vars.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center">
                        <Input placeholder="key" className="w-24" value={v.key} onChange={(e: any) => { const n = [...vars]; n[i].key = e.target.value; updateNode({ config: { ...config, data: { ...data, varList: n } } }); }} />
                        <span className="text-[var(--muted-fg)]">=</span>
                        <Input placeholder="value" value={v.value} onChange={(e: any) => { const n = [...vars]; n[i].value = e.target.value; updateNode({ config: { ...config, data: { ...data, varList: n } } }); }} />
                    </div>
                ))}
            </div>
            <button onClick={() => updateNode({ config: { ...config, data: { ...data, varList: [...vars, { key: '', value: '' }] } } })} className="text-[10px] text-violet-400 hover:underline">+ Add Variable</button>
        </div>
    );
}

// ─── Delay Configuration ────────────────────────────────────
export function DelayConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <Label>Delay (seconds)</Label>
            <Input type="number" placeholder="5" value={data.seconds || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, seconds: e.target.value } } })} />
        </div>
    );
}

// ─── Unified AI Configuration ────────────────────────────────
export function AIConfig({ node, updateNode }: { node: any, updateNode: (data: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const integrationId = config.integrationId || 'google_gemini';
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    return (
        <div className="space-y-4">
            <div className="space-y-1"><Label>Provider</Label>
                <Select value={integrationId} onChange={(e: any) => updateNode({ config: { ...config, integrationId: e.target.value, actionId: 'chat' } })}>
                    <option value="google_gemini">Google Gemini</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="groq">Groq (Llama)</option>
                    <option value="openrouter">OpenRouter</option>
                </Select>
            </div>
            {integrationId !== 'openrouter' && (
                <ModelSelector integrationId={integrationId} value={data.model || (integrationId === 'groq' ? 'llama-3.3-70b-versatile' : integrationId === 'openai' ? 'gpt-4o' : 'gemini-2.0-flash')} onChange={(model) => updateData({ model })} />
            )}
            <div className="space-y-2"><Label>API Key</Label><Input type="password" placeholder="Key..." value={data.apiKey || ''} onChange={(e: any) => updateData({ apiKey: e.target.value })} /></div>
            <div className="space-y-2"><Label>System Prompt</Label><Textarea className="h-20" value={data.systemPrompt || ''} onChange={(e: any) => updateData({ systemPrompt: e.target.value })} /></div>
            <div className="space-y-2"><Label>User Message</Label><Textarea className="h-28" placeholder="{{trigger.text}}" value={data.userPrompt || ''} onChange={(e: any) => updateData({ userPrompt: e.target.value })} /></div>
        </div>
    );
}

// ─── Google Sheets Configuration ────────────────────────────
export function SheetsConfig({ node, updateNode, googleIntegration, onConnectGoogle, onDisconnect, getAccessToken }: {
    node: any; updateNode: (d: any) => void; googleIntegration: any; onConnectGoogle: () => void; onDisconnect: () => void; getAccessToken: (p: string) => Promise<string | null>;
}) {
    const config = node.data.config || {};
    const data = config.data || {};
    const [sheets, setSheets] = useState<{ id: string; name: string }[] | null>(null);
    const [fetching, setFetching] = useState(false);
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });

    const fetchSheets = async () => {
        setFetching(true);
        try {
            const token = await getAccessToken('google');
            if (!token) throw new Error("No token found. Please re-connect.");
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&orderBy=modifiedTime desc&pageSize=15`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const { files } = await res.json();
            setSheets(files || []);
        } catch (e: any) { alert(e.message || "Failed to fetch sheets."); }
        finally { setFetching(false); }
    };

    return (
        <div className="space-y-3">
            <GoogleConnectButton isConnected={!!googleIntegration} isValid={googleIntegration?.is_valid} accountEmail={googleIntegration?.account_email} onConnect={onConnectGoogle} onDisconnect={onDisconnect} />
            <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Spreadsheet ID</Label>
                    {googleIntegration && <button onClick={fetchSheets} className="text-[9px] font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase">{fetching ? '...' : 'Browse Recent'}</button>}
                </div>
                {sheets ? (
                    <div className="border border-[var(--border)] rounded-lg p-1 bg-[var(--muted)]/50 max-h-32 overflow-y-auto custom-scrollbar">
                        {sheets.map(s => <button key={s.id} onClick={() => { updateData({ spreadsheetId: s.id }); setSheets(null); }} className="w-full text-left px-2 py-1.5 rounded text-[10px] hover:bg-[var(--muted)] truncate">{s.name}</button>)}
                    </div>
                ) : <Input placeholder="Spreadsheet ID..." value={data.spreadsheetId || ''} onChange={(e: any) => updateData({ spreadsheetId: e.target.value })} />}
            </div>
            <div className="space-y-2"><Label>Action</Label>
                <Select value={config.actionId || 'append_row'} onChange={(e: any) => updateNode({ config: { ...config, actionId: e.target.value } })}>
                    <option value="append_row">Append Row</option><option value="get_rows">Get Rows</option><option value="update_row">Update Row</option>
                </Select>
            </div>
        </div>
    );
}

// ─── Google Calendar Config ───────────────────────────
export function GoogleCalendarConfig({ node, updateNode, googleIntegration, onConnect, onDisconnect }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <GoogleConnectButton isConnected={!!googleIntegration} isValid={googleIntegration?.is_valid} accountEmail={googleIntegration?.account_email} onConnect={onConnect} onDisconnect={onDisconnect} />
            <div className="space-y-2">
                <Label>Action</Label>
                <Select value={config.actionId || 'get_events'} onChange={(e: any) => updateNode({ config: { ...config, actionId: e.target.value } })}>
                    <option value="get_events">Get Events</option><option value="create_event">Create Event</option>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Calendar ID</Label>
                <Input placeholder="primary" value={data.calendarId || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, calendarId: e.target.value } } })} />
            </div>
        </div>
    );
}

// ─── Google Gmail Config ────────────────────────────
export function GoogleGmailConfig({ node, updateNode, googleIntegration, onConnect, onDisconnect }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <GoogleConnectButton isConnected={!!googleIntegration} isValid={googleIntegration?.is_valid} accountEmail={googleIntegration?.account_email} onConnect={onConnect} onDisconnect={onDisconnect} />
            <div className="space-y-2"><Label>To</Label><Input placeholder="email@example.com" value={data.to || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, to: e.target.value } } })} /></div>
            <div className="space-y-2"><Label>Subject</Label><Input value={data.subject || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, subject: e.target.value } } })} /></div>
            <div className="space-y-2"><Label>Body</Label><Textarea className="h-24" value={data.body || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, body: e.target.value } } })} /></div>
        </div>
    );
}

// ─── Discord Config ─────────────────────────────────
export function DiscordConfig({ node, updateNode }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <div className="space-y-2"><Label>Webhook URL</Label><Input placeholder="https://discord..." value={data.webhookUrl || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, webhookUrl: e.target.value } } })} /></div>
            <div className="space-y-2"><Label>Message</Label><Textarea className="h-32" value={data.content || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, content: e.target.value } } })} /></div>
        </div>
    );
}

// ─── API Config ─────────────────────────────────────
export function APIConfig({ node, updateNode }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <div className="w-20"><Label>Method</Label><Select value={data.method || 'GET'} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, method: e.target.value } } })}><option value="GET">GET</option><option value="POST">POST</option></Select></div>
                <div className="flex-1"><Label>URL</Label><Input placeholder="https://api..." value={data.url || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, url: e.target.value } } })} /></div>
            </div>
            <div className="space-y-2"><Label>Body (JSON)</Label><Textarea className="h-32 text-[10px] font-mono" value={typeof data.body === 'object' ? JSON.stringify(data.body, null, 2) : data.body || ''} onChange={(e: any) => { try { updateNode({ config: { ...config, data: { ...data, body: JSON.parse(e.target.value) } } }); } catch { updateNode({ config: { ...config, data: { ...data, body: e.target.value } } }); } }} /></div>
        </div>
    );
}

// ─── Tool Config ────────────────────────────────────
export function ToolConfig({ node, updateNode }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label>Tool Type</Label>
                <Select value={config.actionId || 'file_reader'} onChange={(e: any) => updateNode({ config: { ...config, actionId: e.target.value } })}>
                    <option value="file_reader">Read File / URL</option><option value="calculator">Calculator</option>
                </Select>
            </div>
            {config.actionId === 'file_reader' && <div className="space-y-2"><Label>Path / URL</Label><Input placeholder="https://..." value={data.filePath || ''} onChange={(e: any) => updateNode({ config: { ...config, data: { ...data, filePath: e.target.value } } })} /></div>}
        </div>
    );
}

// ─── Memory Config ──────────────────────────────────
export function MemoryConfig({ node, updateNode }: any) {
    const config = node.data.config || {};
    const data = config.data || {};
    return (
        <div className="space-y-3 opacity-60">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-[10px] font-bold">COMING SOON</div>
            <div className="space-y-2"><Label>Session Key</Label><Input placeholder="{{trigger.chat_id}}" value={data.sessionId || '{{trigger.chat_id}}'} readOnly /></div>
        </div>
    );
}
