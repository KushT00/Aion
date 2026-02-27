'use client';
import { cn } from '@/lib/utils';
import { GoogleConnectButton } from './GoogleConnectButton';
import {
    Plus, Trash2, BookOpen, Wrench, Globe, Link2,
    ChevronDown, ChevronRight, BrainCircuit,
} from 'lucide-react';
import { useState } from 'react';

// ─── Shared helpers ─────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] font-bold text-[var(--muted-fg)] uppercase tracking-wider block mb-1 ml-0.5">{children}</label>
);
const Input = ({ className = '', ...props }: any) => (
    <input className={cn("w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-violet-500 transition-shadow", className)} {...props} />
);
const Textarea = ({ className = '', ...props }: any) => (
    <textarea className={cn("w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-violet-500 resize-none transition-shadow", className)} {...props} />
);
const Select = ({ children, className = '', ...props }: any) => (
    <select className={cn("w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:ring-1 focus:ring-violet-500", className)} {...props}>{children}</select>
);

// ─── Section Accordion ─────────────────────────────────────
function Section({ title, icon: Icon, color = 'text-[var(--muted-fg)]', children, defaultOpen = true }: any) {
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
                <div className="space-y-1">
                    <Label>Instuctions (System)</Label>
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
            <div className="space-y-2"><Label>Bot Token</Label>
                <Input type="password" placeholder="1234567890:AAF..." value={data.botToken || ''} onChange={(e: any) => updateData({ botToken: e.target.value })} />
                <p className="text-[10px] text-[var(--muted-fg)]">Get from <a href="https://t.me/BotFather" target="_blank" className="text-violet-400 hover:underline">@BotFather</a></p>
            </div>
            <div className="space-y-2"><Label>Chat ID</Label>
                <Input placeholder="-1001234567890" value={data.chatId || ''} onChange={(e: any) => updateData({ chatId: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Message (supports Markdown)</Label>
                <Textarea className="h-28" placeholder="*Bold* {{node.text}}" value={data.text || ''} onChange={(e: any) => updateData({ text: e.target.value })} />
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
                <p className="text-[10px] text-[var(--muted-fg)]">From <a href="https://www.notion.so/my-integrations" target="_blank" className="text-violet-400 hover:underline">notion.so/my-integrations</a></p>
            </div>
            <div className="space-y-2"><Label>Action</Label>
                <Select value={config.actionId || 'create_page'} onChange={(e: any) => updateNode({ config: { ...config, actionId: e.target.value } })}>
                    <option value="create_page">Create Page</option>
                    <option value="append_block">Append to Page</option>
                </Select>
            </div>
            {config.actionId !== 'append_block' ? (
                <div className="space-y-2"><Label>Database ID</Label>
                    <Input placeholder="abc123def456..." value={data.databaseId || ''} onChange={(e: any) => updateData({ databaseId: e.target.value })} />
                </div>
            ) : (
                <div className="space-y-2"><Label>Page ID</Label>
                    <Input placeholder="abc123def456..." value={data.pageId || ''} onChange={(e: any) => updateData({ pageId: e.target.value })} />
                </div>
            )}
            <div className="space-y-2"><Label>Title</Label>
                <Input placeholder="{{node.text}}" value={data.title || ''} onChange={(e: any) => updateData({ title: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Content</Label>
                <Textarea className="h-24" placeholder="Page content..." value={data.content || ''} onChange={(e: any) => updateData({ content: e.target.value })} />
            </div>
        </div>
    );
}

// ─── Google Sheets Configuration ────────────────────────────
export function SheetsConfig({ node, updateNode, googleIntegration, onConnectGoogle }: {
    node: any; updateNode: (d: any) => void; googleIntegration: any; onConnectGoogle: () => void;
}) {
    const config = node.data.config || {};
    const data = config.data || {};
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    return (
        <div className="space-y-3">
            <GoogleConnectButton
                isConnected={!!googleIntegration}
                isValid={googleIntegration?.is_valid}
                accountEmail={googleIntegration?.account_email}
                onConnect={onConnectGoogle}
                onDisconnect={() => { }}
            />
            <div className="space-y-2"><Label>Spreadsheet ID</Label>
                <Input placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" value={data.spreadsheetId || ''} onChange={(e: any) => updateData({ spreadsheetId: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Action</Label>
                <Select value={config.actionId || 'append_row'} onChange={(e: any) => updateNode({ config: { ...config, actionId: e.target.value } })}>
                    <option value="append_row">Append Row</option>
                    <option value="read_range">Read Range</option>
                </Select>
            </div>
            <div className="space-y-2"><Label>Range (e.g. Sheet1!A:Z)</Label>
                <Input placeholder="Sheet1" value={data.range || ''} onChange={(e: any) => updateData({ range: e.target.value })} />
            </div>
            {config.actionId !== 'read_range' && (
                <div className="space-y-2"><Label>Values (JSON Array)</Label>
                    <Textarea className="h-20 font-mono text-xs" placeholder='["Value1", "{{node.text}}", "2026-01-01"]' value={typeof data.values === 'object' ? JSON.stringify(data.values) : data.values || ''} onChange={(e: any) => updateData({ values: e.target.value })} />
                </div>
            )}
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
        { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (Free)' },
    ];
    return (
        <div className="space-y-3">
            <div className="p-2.5 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <p className="text-[10px] text-violet-400 font-semibold">300+ Models Available</p>
                <p className="text-[10px] text-[var(--muted-fg)]">Many models are free. Get key at <a href="https://openrouter.ai/keys" target="_blank" className="text-violet-400 hover:underline">openrouter.ai</a></p>
            </div>
            <div className="space-y-2"><Label>API Key</Label>
                <Input type="password" placeholder="sk-or-..." value={data.apiKey || ''} onChange={(e: any) => updateData({ apiKey: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Model</Label>
                <Select value={data.model || ''} onChange={(e: any) => updateData({ model: e.target.value })}>
                    <option value="">-- Select model --</option>
                    {popularModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </Select>
                <Input placeholder="or type custom model ID..." value={data.model || ''} onChange={(e: any) => updateData({ model: e.target.value })} />
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
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    return (
        <div className="space-y-3">
            <div className="p-2.5 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                <p className="text-[10px] text-cyan-400 font-semibold">JavaScript Sandbox</p>
                <p className="text-[10px] text-[var(--muted-fg)]"><code className="bg-[var(--muted)] px-1 rounded">$input</code> = all previous node outputs</p>
            </div>
            <div className="space-y-2"><Label>Code</Label>
                <Textarea
                    className="h-48 font-mono text-xs"
                    placeholder={`// Example:\nconst emails = $input['Fetch Emails'].messages;\nreturn emails.map(e => e.subject).join('\\n');`}
                    value={data.code || ''}
                    onChange={(e: any) => updateData({ code: e.target.value })}
                />
            </div>
        </div>
    );
}

// ─── Set Variable Configuration ─────────────────────────────
export function SetVariableConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const vars: { key: string; value: string }[] = data.varList || [{ key: '', value: '' }];
    const updateVars = (list: { key: string; value: string }[]) =>
        updateNode({ config: { ...config, data: { ...data, varList: list } } });

    return (
        <div className="space-y-3">
            <p className="text-[10px] text-[var(--muted-fg)]">Set named values accessible via <code className="bg-[var(--muted)] px-1 rounded">{'{{Set Variable.key}}'}</code></p>
            <div className="space-y-2">
                {vars.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center">
                        <Input placeholder="key" className="w-28" value={v.key} onChange={(e: any) => { const n = [...vars]; n[i] = { ...v, key: e.target.value }; updateVars(n); }} />
                        <span className="text-[var(--muted-fg)] text-sm">=</span>
                        <Input placeholder="value or {{node.field}}" value={v.value} onChange={(e: any) => { const n = [...vars]; n[i] = { ...v, value: e.target.value }; updateVars(n); }} />
                        <button onClick={() => updateVars(vars.filter((_, j) => j !== i))} className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
            <button onClick={() => updateVars([...vars, { key: '', value: '' }])}
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add variable
            </button>
        </div>
    );
}

// ─── Delay Configuration ────────────────────────────────────
export function DelayConfig({ node, updateNode }: { node: any; updateNode: (d: any) => void }) {
    const config = node.data.config || {};
    const data = config.data || {};
    const updateData = (kv: any) => updateNode({ config: { ...config, data: { ...data, ...kv } } });
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label>Delay Duration (seconds)</Label>
                <Input type="number" min="1" max="60" placeholder="5" value={data.seconds || ''} onChange={(e: any) => updateData({ seconds: e.target.value })} />
                <p className="text-[10px] text-[var(--muted-fg)]">Max 60 seconds. For longer delays use a scheduled trigger.</p>
            </div>
        </div>
    );
}
