'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    User,
    Loader2,
    ArrowLeft,
    Key,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Zap,
    Globe,
    X,
    Settings,
    Sliders,
    Box,
    FileText,
    BrainCircuit,
    Activity,
    Bot,
    Send,
    Workflow,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { BehaviorWorkflowEditor } from '@/components/workflow/BehaviorWorkflowEditor';

interface IntegrationConfig {
    name: string;
    icon: string;
    color: string;
    bg: string;
    description: string;
    group: string;
}

interface UserIntegration {
    id: string;
    provider: string;
    is_valid: boolean;
    [key: string]: string | boolean | number | null | undefined;
}

interface RunResult {
    success: boolean;
    logs: {
        nodeId: string;
        status: string;
        error?: string;
    }[];
    [key: string]: unknown;
}

const INTEGRATION_CARDS: Record<string, IntegrationConfig> = {
    google_gemini: { name: 'Google Gemini', icon: '✦', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', description: 'AI text generation', group: 'ai' },
    groq: { name: 'Groq', icon: '⚡', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', description: 'Fast LLM inference', group: 'ai' },
    openai: { name: 'OpenAI', icon: '◈', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', description: 'GPT models', group: 'ai' },
    telegram: { name: 'Telegram Bot', icon: '✈', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', description: 'Messaging', group: 'messaging' },
    google_sheets: { name: 'Google Sheets', icon: '📊', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', description: 'Spreadsheets', group: 'google' },
    google_docs: { name: 'Google Docs', icon: '📄', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', description: 'Documents', group: 'google' },
    anthropic: { name: 'Anthropic', icon: '⌬', color: 'text-orange-200', bg: 'bg-orange-500/10 border-orange-500/20', description: 'Claude models', group: 'ai' },
    openrouter: { name: 'OpenRouter', icon: '🌐', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', description: 'Unified AI API', group: 'ai' },
    slack: { name: 'Slack', icon: '♯', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', description: 'Team collaboration', group: 'messaging' },
    notion: { name: 'Notion', icon: '⬚', color: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/20', description: 'Knowledge base', group: 'utility' },
};

interface WorkflowNode {
    id: string;
    type: string;
    label?: string;
    data?: {
        label?: string;
        agentModel?: { provider?: string };
        [key: string]: unknown;
    };
    config?: {
        agentModel?: { provider?: string };
        [key: string]: unknown;
    };
}

interface Instance {
    id: string;
    listing?: {
        title: string;
        workflow?: {
            nodes: WorkflowNode[];
        };
    };
    config_overrides?: Record<string, string>;
    pricing_tier?: string;
}

interface ExecutionLog {
    id: string;
    status: string;
    created_at: string;
    [key: string]: unknown;
}

export default function InstanceSandboxPage() {
    const params = useParams();
    const router = useRouter();
    const instanceId = params.id as string;

    const [activeTab, setActiveTab] = useState<'integrations' | 'behavior' | 'logs'>('integrations');
    const [instance, setInstance] = useState<Instance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requiredIntegrations, setRequiredIntegrations] = useState<string[]>([]);
    const [credentials, setCredentials] = useState<Record<string, { isValid: boolean }>>({});
    const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>([]);
    const [overrides, setOverrides] = useState<Record<string, string>>({});
    const [isActivating, setIsActivating] = useState(false);
    const [inputValues, setInputValues] = useState<Record<string, string>>({});
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [selectedAiProvider, setSelectedAiProvider] = useState<string>('groq');
    const [credentialErrors, setCredentialErrors] = useState<Record<string, string>>({});

    // Execution States
    const [isRunning, setIsRunning] = useState(false);
    const [lastRunResult, setLastRunResult] = useState<RunResult | null>(null);
    const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);

    // AI Chat
    const [chatOpen, setChatOpen] = useState(false);

    // ─── Fetch instance & workflow nodes ────────────────────────────────
    useEffect(() => {
        async function fetchAll() {
            try {
                if (window.location.hash) {
                    const h = window.location.hash.replace('#', '');
                    if (h === 'integrations' || h === 'behavior' || h === 'logs') {
                        setActiveTab(h as any);
                    }
                }

                const res = await fetch(`/api/ai/instance-details?instanceId=${instanceId}`);
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || 'Configuration not found');
                    return;
                }
                setInstance(data.instance);
                setRequiredIntegrations(data.requiredIntegrations || []);
                setOverrides(data.instance?.config_overrides || {});

                const credMap: Record<string, { isValid: boolean }> = {};
                for (const c of (data.credentials || [])) {
                    credMap[c.integration_key] = { isValid: c.is_valid };
                }
                setCredentials(credMap);
                setUserIntegrations(data.userIntegrations || []);
                setInputValues({});

                // Default AI provider selection
                const aiNode = (data.instance?.listing?.workflow?.nodes || []).find((n: WorkflowNode) => {
                    const nodeType = (n.type || '').toLowerCase();
                    const label = (n.label || n.data?.label || '').toLowerCase();
                    return nodeType === 'ai' || nodeType === 'ai_agent' || nodeType === 'agent' || label.includes('ai agent');
                });
                if (aiNode) {
                    const overriddenProv = data.instance?.config_overrides?.[`${aiNode.id}.integrationId`];
                    
                    // Priority: 1. Manual Override, 2. Existing Valid API Key, 3. Node Default, 4. Groq
                    let prov = overriddenProv;
                    
                    if (!prov) {
                        const providers = ['google_gemini', 'openai', 'anthropic', 'openrouter', 'groq'];
                        const connected = providers.find(k => credMap[k]?.isValid);
                        if (connected) prov = connected;
                    }

                    if (!prov) {
                        prov = aiNode.config?.agentModel?.provider || aiNode.data?.agentModel?.provider || 'groq';
                    }

                    setSelectedAiProvider(prov);
                }

                // Load initial logs
                const logRes = await fetch(`/api/ai/instance-logs?instanceId=${instanceId}`);
                if (logRes.ok) {
                    const logData = await logRes.json();
                    setExecutionLogs(logData.logs || []);
                }

                // Auto-open chat if setup is needed and this is first load
                if (data.requiredIntegrations?.length > 0 && !data.allConnected) {
                    setChatOpen(true);
                }
            } catch {
                setError('Failed to connect to AION cloud');
            } finally {
                setIsLoading(false);
            }
        }
        if (instanceId) fetchAll();
    }, [instanceId]);

    // ─── Run Logic (Test Drive) ──────────────────────────────────────────
    const handleTestDrive = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setActiveTab('logs');
        toast('🚀 Starting isolated test drive...', { icon: '🤖' });

        try {
            const res = await fetch('/api/ai/run-instance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceId, triggerData: { test: true } }),
            });
            const data = await res.json();

            if (res.ok) {
                setLastRunResult(data);
                // Refresh logs list
                const logRes = await fetch(`/api/ai/instance-logs?instanceId=${instanceId}`);
                if (logRes.ok) {
                    const logData = await logRes.json();
                    setExecutionLogs(logData.logs || []);
                }
                toast.success('Test drive completed successfully!');
            } else {
                toast.error(data.error || 'Execution failed');
            }
        } catch {
            toast.error('Connection error during execution');
        } finally {
            setIsRunning(false);
        }
    };

    // ─── Save Override Logic ──────────────────────────────────────────
    const [isSavingOverride, setIsSavingOverride] = useState<string | null>(null);

    const handleSaveOverride = async (nodeId: string, property: string, value: string) => {
        setIsSavingOverride(`${nodeId}.${property}`);
        try {
            const res = await fetch('/api/ai/save-override', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceId, nodeId, property, value }),
            });
            if (res.ok) {
                setOverrides(prev => ({ ...prev, [`${nodeId}.${property}`]: value }));
                toast.success('Behavior updated!', { icon: '⚙️' });
            } else {
                toast.error('Failed to save behavior');
            }
        } catch {
            toast.error('Connection error');
        } finally {
            setIsSavingOverride(null);
        }
    };

    // ─── Save Credential Logic ────────────────────────────────────────
    const handleSaveCredential = async (key: string) => {
        const val = inputValues[key]?.trim();
        if (!val) return;
        setSavingKey(key);
        setCredentialErrors(prev => ({ ...prev, [key]: '' }));
        try {
            const res = await fetch('/api/ai/save-credential', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceId, integrationKey: key, value: val }),
            });
            const data = await res.json();
            if (res.ok) {
                setCredentials(prev => ({ ...prev, [key]: { isValid: true } }));
                if (['google_gemini', 'openai', 'groq', 'anthropic', 'openrouter'].includes(key)) {
                    setSelectedAiProvider(key);
                }
                setInputValues(prev => ({ ...prev, [key]: '' }));
                toast.success('Integration connected!');
            } else {
                setCredentialErrors(prev => ({ ...prev, [key]: data.error || 'Invalid API Key' }));
            }
        } catch {
            setCredentialErrors(prev => ({ ...prev, [key]: 'Connection error' }));
        } finally {
            setSavingKey(null);
        }
    };

    const handleSaveCredentialDirect = async (key: string, val: string) => {
        if (!val) return;
        try {
            const res = await fetch('/api/ai/save-credential', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceId, integrationKey: key, value: val }),
            });
            const data = await res.json();
            if (res.ok) {
                setCredentials(prev => ({ ...prev, [key]: { isValid: true } }));
                toast.success('Integration connected manually!');
            } else {
                toast.error(data.error || 'Invalid API Key');
            }
        } catch {
            toast.error('Connection error');
        }
    };

    const handleConnectGoogle = () => {
        const scope = 'all';
        document.cookie = `oauth_return_to=${window.location.pathname}#${activeTab}; path=/; max-age=600`;
        window.location.href = `/api/auth/google/connect?scope=${scope}&instanceId=${instanceId}`;
    };

    const handleActivate = async () => {
        setIsActivating(true);
        try {
            const res = await fetch('/api/ai/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceId }),
            });
            if (res.ok) {
                toast.success('🚀 Activation Successful!');
                setTimeout(() => router.push(`/instance/${instanceId}`), 1000);
            }
        } finally {
            setIsActivating(false);
        }
    };

    const handleDeleteCredential = async (key: string) => {
        const isGoogle = key.startsWith('google');
        if (!confirm(`Are you sure you want to disconnect this ${isGoogle ? 'Google Account' : 'API key'}? This might break your automation.`)) return;
        try {
            if (key === 'google' || key === 'google_sheets' || key === 'google_gemini' || key === 'google_calendar' || key === 'google_docs' || key === 'google_gmail') {
                // 1. Global Disconnect
                await fetch('/api/integrations?provider=google', { method: 'DELETE' });
                // 2. Instance-specific cleanup
                await fetch('/api/ai/save-credential', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instanceId, integrationKey: key }),
                });
                setUserIntegrations([]);
            } else {
                await fetch('/api/ai/save-credential', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instanceId, integrationKey: key }),
                });
            }

            setCredentials(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
            toast.success('Disconnected successfully');
        } catch {
            toast.error('Failed to disconnect');
        }
    };

    // ─── Renderers ──────────────────────────────────────────────────────
    if (isLoading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;

    const workflowNodes = instance?.listing?.workflow?.nodes || [];
    const allConnected = requiredIntegrations.every(k => {
        const isManagedKey = instance?.pricing_tier === 'managed' && (k === 'groq' || k === 'google_gemini');
        return isManagedKey || credentials[k]?.isValid;
    });

    return (
        <div className="min-h-screen bg-(--bg) flex flex-col">
            {/* Header */}
            <header className="border-b border-(--border) bg-(--card) px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/my-automations"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
                        <div>
                            <h1 className="text-xl font-black italic uppercase tracking-tighter">Instance <span className="text-primary-400">Sandbox</span></h1>
                            <p className="text-[10px] text-(--muted-fg) font-bold uppercase tracking-widest">{instance?.listing?.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 mr-4">
                            {requiredIntegrations.map(k => (
                                <div key={k} className={cn("w-2 h-2 rounded-full", credentials[k]?.isValid ? "bg-emerald-400" : "bg-(--muted)")} title={k} />
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleTestDrive}
                            disabled={!allConnected || isRunning}
                            className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6 h-10 border-primary-500/20 text-primary-400 hover:bg-primary-500/5 disabled:opacity-30"
                        >
                            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Sparkles className="w-3.5 h-3.5 mr-2 text-primary-400" />}
                            Run Workflow
                        </Button>
                        <Button
                            onClick={handleActivate}
                            disabled={!allConnected || isActivating || isRunning}
                            className={cn(
                                "rounded-xl font-black uppercase tracking-widest text-[10px] px-6 h-10 italic",
                                allConnected ? "bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-500/20" : ""
                            )}
                        >
                            {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : (allConnected ? <><Zap className="w-3.5 h-3.5 mr-2 fill-current" /> Go Live</> : 'Setup Required')}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Sandbox Tabs */}
            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
                    {/* Tab Navigation */}
                    <div className="flex items-center gap-1 bg-(--card) border border-(--border) p-1 rounded-2xl w-fit">
                        <TabButton
                            active={activeTab === 'integrations'}
                            onClick={() => { setActiveTab('integrations'); window.location.hash = 'integrations'; }}
                            icon={<Key className="w-4 h-4" />}
                            label="Integrations"
                        />
                        <TabButton
                            active={activeTab === 'behavior'}
                            onClick={() => { setActiveTab('behavior'); window.location.hash = 'behavior'; }}
                            icon={<Workflow className="w-4 h-4" />}
                            label="Behavior (Freedom)"
                        />
                        <TabButton
                            active={activeTab === 'logs'}
                            onClick={() => { setActiveTab('logs'); window.location.hash = 'logs'; }}
                            icon={<Activity className="w-4 h-4" />}
                            label="Execution Logs"
                        />
                    </div>

                    {/* Tab Content */}
                    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {activeTab === 'integrations' ? (
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <Key className="w-4 h-4 text-amber-400" /> Primary Credentials
                                    </h2>
                                    <p className="text-xs text-(--muted-fg) font-medium">Connect your own API keys to run this automation in your isolated environment.</p>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {renderSimplifiedIntegrations()}
                                </div>
                            </div>
                        ) : activeTab === 'behavior' ? (
                            <div className="space-y-6 flex flex-col h-[700px]">
                                <div className="space-y-2 shrink-0">
                                    <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <BrainCircuit className="w-4 h-4 text-primary-400" /> Workflow Editor
                                    </h2>
                                    <p className="text-xs text-(--muted-fg) font-medium">Click a node to configure it. Structural changes are disabled to ensure the workflow functions as expected.</p>
                                </div>
                                <div className="flex-1 min-h-[600px] w-full">
                                    <BehaviorWorkflowEditor 
                                        instance={instance}
                                        overrides={overrides}
                                        credentials={credentials}
                                        userIntegrations={userIntegrations}
                                        onSaveOverride={handleSaveOverride}
                                        onSaveCredential={handleSaveCredentialDirect}
                                        onDisconnectCredential={handleDeleteCredential}
                                        onConnectGoogle={handleConnectGoogle}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-emerald-400" /> Run History
                                    </h2>
                                    <p className="text-xs text-(--muted-fg) font-medium">Track your instance&apos;s performance and review step-by-step logs.</p>
                                </div>
                                <div className="space-y-4">
                                    {isRunning && (
                                        <Card className="p-12 text-center flex flex-col items-center gap-4 border-(--border) bg-(--bg)/50">
                                            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                                            <h3 className="font-black uppercase italic text-primary-400">Executing Workflow...</h3>
                                            <p className="text-[10px] text-(--muted-fg) font-bold uppercase tracking-widest">Hydrating nodes and injecting credentials</p>
                                        </Card>
                                    )}

                                    {lastRunResult && !isRunning && (
                                        <div className="space-y-6">
                                            <Card className="relative p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                        <span className="text-xs font-black uppercase italic">Last Run Success</span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => setLastRunResult(null)} className="text-[9px] uppercase font-bold">Clear</Button>
                                                </div>
                                            </Card>

                                            <div className="space-y-3">
                                                {lastRunResult && lastRunResult.logs?.map((log, i: number) => (
                                                    <div key={i} className="flex gap-4 group">
                                                        <div className="w-1 bg-(--border) rounded-full group-hover:bg-primary-500/30 transition-colors" />
                                                        <div className="flex-1 py-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[10px] font-black uppercase tracking-tight">
                                                                    {workflowNodes.find((n: WorkflowNode) => n.id === log.nodeId)?.data?.label || 'Node'}
                                                                </p>
                                                                <Badge className={cn("text-[8px] font-black px-1.5", log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                                                                    {log.status.toUpperCase()}
                                                                </Badge>
                                                            </div>
                                                            {log.error && <p className="text-[9px] text-rose-400 font-bold mt-1 uppercase italic">{log.error}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {!isRunning && !lastRunResult && executionLogs.length === 0 && (
                                        <EmptyState icon={<FileText />} title="No Runs Yet" desc="Click 'Test Drive' to start your first execution." />
                                    )}

                                    {executionLogs.map((log: ExecutionLog) => (
                                        <div key={log.id} className="p-4 rounded-xl border border-(--border) bg-(--card) flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Activity className={cn("w-4 h-4", log.status === 'success' ? 'text-emerald-400' : 'text-rose-400')} />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-tight">Run #{log.id.slice(0, 4)}</p>
                                                    <p className="text-[8px] text-(--muted-fg) font-bold">{new Date(log.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <Badge className={cn("text-[8px] font-black", log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                                                {log.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Optional Assistant Sidebar (Hidden by default because User hates reliance on it) */}
                <div className={cn(
                    "w-[350px] border-l border-(--border) bg-(--card) transition-all flex flex-col relative z-20",
                    chatOpen ? "mr-0 opacity-100" : "-mr-[350px] opacity-0 pointer-events-none"
                )}>
                    <AIChatSidebar
                        instanceId={instanceId}
                        onClose={() => setChatOpen(false)}
                        onCredentialUpdate={(key: string) => {
                            setCredentials(prev => ({ ...prev, [key]: { isValid: true } }));
                            toast.success(`Connected ${key} via AI Chat!`);
                        }}
                    />
                </div>
            </div>

            {/* Help FAB */}
            <button
                onClick={() => setChatOpen(!chatOpen)}
                className="fixed bottom-8 right-8 w-14 h-14 rounded-3xl bg-primary-500 text-white shadow-2xl shadow-primary-500/30 flex items-center justify-center hover:scale-110 transition-transform z-50"
            >
                <Bot className="w-7 h-7" />
            </button>
        </div>
    );

    // ─── Sub-renderers ──────────────────────────────────────────────────
    function renderSimplifiedIntegrations() {
        const workflowNodes: WorkflowNode[] = instance?.listing?.workflow?.nodes || [];

        // 1. Detect AI Agent
        const aiNode = workflowNodes.find((n: WorkflowNode) => {
            const nodeType = (n.type || '').toLowerCase();
            const label = (n.label || n.data?.label || '').toLowerCase();
            return nodeType === 'ai' || nodeType === 'ai_agent' || nodeType === 'agent' || label.includes('ai agent');
        });
        const hasAiAgent = !!aiNode;

        // 2. Detect Google Services
        const hasGoogleService = workflowNodes.some((n: WorkflowNode) => {
            const type = (n.type || '').toLowerCase();
            const label = (n.label || n.data?.label || '').toLowerCase();
            return type.includes('google') || type.includes('sheet') || type.includes('docs') ||
                type.includes('gmail') || type.includes('calendar') ||
                label.includes('google') || label.includes('sheet') ||
                label.includes('gmail') || label.includes('calendar') || label.includes('google docs');
        });

        const elements = [];

        if (hasAiAgent) {
            elements.push(
                <div key="ai_selector" className="col-span-full space-y-6 mb-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary-400" /> Choose AI Engine
                        </h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-(--muted-fg)">Select Provider</span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        {['google_gemini', 'openai', 'groq', 'anthropic', 'openrouter'].map(key => {
                            const conf = INTEGRATION_CARDS[key];
                            const isSelected = selectedAiProvider === key;
                            return (
                                <button
                                    key={key}
                                        onClick={() => {
                                            setSelectedAiProvider(key);
                                            setCredentialErrors(prev => ({ ...prev, [key]: '' }));
                                            
                                            if (aiNode) {
                                                handleSaveOverride(aiNode.id, 'integrationId', key);
                                                if (key === 'groq') handleSaveOverride(aiNode.id, 'model', 'llama-3.3-70b-versatile');
                                                if (key === 'google_gemini') handleSaveOverride(aiNode.id, 'model', 'gemini-2.0-flash');
                                                if (key === 'openai') handleSaveOverride(aiNode.id, 'model', 'gpt-4o-mini');
                                            }
                                        }}
                                    className={cn(
                                        "p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                        isSelected ? "border-primary-500 bg-primary-500/10" : "border-(--border) bg-(--card) hover:border-primary-500/30"
                                    )}
                                >
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg", conf.bg)}>
                                        {conf.icon}
                                    </div>
                                    <div className="text-center">
                                        <p className={cn("text-[10px] font-black uppercase tracking-tight", isSelected ? "text-white" : "text-(--muted-fg)")}>
                                            {conf.name.replace('Google ', '')}
                                        </p>
                                        <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Managed</p>
                                    </div>
                                    {isSelected && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );

            elements.push(
                <div key="ai_credential" className="col-span-full mb-8">
                    <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-emerald-400" /> Connect Account
                    </h2>
                    {renderIntegrationCard(selectedAiProvider, "API KEY")}
                </div>
            );
        }

        if (hasGoogleService) {
            elements.push(
                <div key="google_credential" className="col-span-full">
                    {!hasAiAgent && (
                        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Zap className="w-4 h-4 text-emerald-400" /> Connect Account
                        </h2>
                    )}
                    {renderIntegrationCard('google_sheets', "GOOGLE ACCOUNT")}
                </div>
            );
        }

        if (elements.length === 0) {
            return <EmptyState icon={<Box />} title="No Credentials Needed" desc="This automation is self-contained." />;
        }

        return <div className="grid gap-8">{elements}</div>;
    }

    function renderIntegrationCard(key: string, overrideName?: string) {
        const conf = INTEGRATION_CARDS[key] || { name: key, icon: '🔑', color: 'text-white', bg: 'bg-(--muted)', group: 'other' };
        let isConnected = credentials[key]?.isValid;
        const isOAuth = key.startsWith('google_') && key !== 'google_gemini';

        if (isOAuth) {
            const googleInteg = userIntegrations.find(i => i.provider === 'google' && i.is_valid);
            if (googleInteg) isConnected = true;
        }

        const isManagedKey = instance?.pricing_tier === 'managed' && (key === 'groq' || key === 'google_gemini');
        if (isManagedKey) {
            isConnected = true;
        }

        const displayName = overrideName || conf.name;

        return (
            <Card key={key} className={cn(
                "p-5 border-(--border) bg-(--card) group transition-all h-full flex flex-col justify-between",
                isConnected ? "border-emerald-500/20 bg-emerald-500/2" : "hover:border-primary-500/40"
            )}>
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-white/5", conf.bg)}>
                                {conf.icon}
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-tight">{displayName}</p>
                                <div className="flex items-center gap-2">
                                    <Badge className="text-[7px] font-black uppercase py-0 h-4 bg-white/5 border-none text-(--muted-fg)">
                                        {conf.group}
                                    </Badge>
                                    {isConnected && (
                                        <Badge className="text-[7px] font-black uppercase py-0 h-4 bg-emerald-500/10 border-none text-emerald-400">
                                            Account Connected
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        {isConnected && !isManagedKey ? (
                            <button
                                onClick={() => handleDeleteCredential(key)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-(--muted-fg) hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Disconnect"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        ) : null}
                    </div>
                </div>

                {!isConnected && (
                    isOAuth ? (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleConnectGoogle}
                                className="flex-1 rounded-xl h-10 font-black uppercase tracking-widest text-[9px] bg-white text-black hover:bg-neutral-200"
                            >
                                <Globe className="w-3.5 h-3.5 mr-2" /> Connect Google Account
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="password"
                                        placeholder={`Paste your ${conf.name} API Key...`}
                                        value={inputValues[key] || ''}
                                        onChange={(e) => setInputValues(prev => ({ ...prev, [key]: e.target.value }))}
                                        className="w-full bg-(--muted) border-none rounded-lg px-3 py-2 text-[10px] font-mono outline-none pr-8"
                                    />
                                    {inputValues[key] ? (
                                        <button
                                            onClick={() => setInputValues(prev => ({ ...prev, [key]: '' }))}
                                            className="absolute right-2 top-2 text-(--muted-fg) hover:text-white"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    ) : null}
                                </div>
                                <Button
                                    size="sm"
                                    disabled={savingKey === key || !inputValues[key]}
                                    onClick={() => handleSaveCredential(key)}
                                    className="rounded-lg h-9 font-black uppercase tracking-widest text-[8px] bg-primary-500"
                                >
                                    {savingKey === key ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                                </Button>
                            </div>
                            {credentialErrors[key] && (
                                <p className="text-[9px] font-black uppercase italic text-rose-400 animate-in fade-in slide-in-from-top-1">
                                    {credentialErrors[key]}
                                </p>
                            )}
                        </div>
                    )
                )}
                {isConnected && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase text-emerald-400 italic">
                            <CheckCircle2 className="w-3 h-3" /> {isManagedKey ? 'Managed by Platform' : 'Securely Synchronized'}
                        </div>
                        <span className="text-[8px] text-(--muted-fg) font-mono">
                            {isManagedKey 
                                ? 'Auto-injected' 
                                : (isOAuth && userIntegrations.find(i => i.provider === 'google' && i.is_valid)?.account_email 
                                    ? String(userIntegrations.find(i => i.provider === 'google')?.account_email) 
                                    : '****-****-****-****')}
                        </span>
                    </div>
                )}
            </Card>
        );
    }

    function renderNodeConfigCard(node: WorkflowNode) {
        // Find configurable node properties
        const data = (node.data || {}) as Record<string, unknown>;
        const configurableKeys = Object.keys(data).filter(k =>
            !['integrationType', 'label', 'description', 'id', 'type', 'icon', 'onIntegrationClick'].includes(k) &&
            typeof data[k] !== 'object'
        );

        if (configurableKeys.length === 0) return null;

        return (
            <Card key={node.id} className="p-5 border-(--border) bg-(--card)">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-(--muted) flex items-center justify-center text-primary-400">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-xs font-black uppercase tracking-tight italic flex items-center gap-2">
                            {node.data?.label || node.type}
                            <span className="text-[8px] font-mono opacity-40">#{node.id.slice(0, 6)}</span>
                        </h4>
                        <p className="text-[10px] text-(--muted-fg) font-bold uppercase tracking-widest">{node.type}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {configurableKeys.map(prop => (
                        <div key={prop} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-widest text-(--muted-fg)">{prop.replace(/([A-Z])/g, ' $1')}</label>
                                {overrides[`${node.id}.${prop}`] !== undefined && (
                                    <span className="text-[7px] font-black tracking-widest text-primary-400 uppercase italic">Override Active</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-(--muted) border-none rounded-lg px-3 py-2.5 text-xs font-bold outline-none ring-primary-500/20 focus:ring-1"
                                    defaultValue={(overrides[`${node.id}.${prop}`] || data[prop]) as string}
                                    onBlur={(e) => {
                                        const currentVal = (overrides[`${node.id}.${prop}`] || data[prop]) as string;
                                        if (e.target.value !== currentVal) {
                                            handleSaveOverride(node.id, prop, e.target.value);
                                        }
                                    }}
                                />
                                {isSavingOverride === `${node.id}.${prop}` && <Loader2 className="w-4 h-4 animate-spin self-center text-primary-400" />}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                active ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20" : "text-(--muted-fg) hover:bg-white/5"
            )}
        >
            {icon} {label}
        </button>
    );
}

function LoadingState() {
    return (
        <div className="min-h-screen bg-(--bg) flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <Box className="w-10 h-10 text-primary-500 animate-bounce" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--muted-fg)">Waking up your instance...</p>
            </div>
        </div>
    );
}

function ErrorState({ error }: { error: string }) {
    return (
        <div className="min-h-screen bg-(--bg) flex items-center justify-center p-6">
            <div className="max-w-md w-full flex flex-col items-center gap-8 text-center">
                <div className="w-24 h-24 rounded-[3rem] bg-rose-500/10 flex items-center justify-center">
                    <AlertCircle className="w-12 h-12 text-rose-400" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase italic text-rose-400">Configuration Failed</h2>
                    <p className="text-sm text-(--muted-fg) font-medium leading-relaxed">{error}</p>
                </div>
                <Link href="/my-automations" className="w-full">
                    <Button variant="outline" className="w-full rounded-2xl h-14 font-black uppercase italic border-2">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="p-12 border-2 border-dashed border-(--border) rounded-4xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-(--muted) flex items-center justify-center mx-auto text-primary-400">
                {icon}
            </div>
            <h3 className="text-sm font-black uppercase italic">{title}</h3>
            <p className="text-xs text-(--muted-fg) font-medium">{desc}</p>
        </div>
    );
}

// ─── AI Chat Components ───────────────────────────────────────────

function AIChatSidebar({ instanceId, onClose, onCredentialUpdate }: { instanceId: string; onClose: () => void; onCredentialUpdate: (key: string) => void }) {
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([
        { role: 'assistant', content: "Hello! I'm your AION guide. I'll help you connect your accounts and set up this automation. What can I do for you?" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim() || isSending) return;

        const userMsg = { role: 'user', content: inputValue };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsSending(true);

        try {
            const res = await fetch('/api/ai/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceId,
                    message: inputValue,
                    history: messages
                }),
            });
            const data = await res.json();
            if (data.response) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            }
            if (data.credentialStored) {
                onCredentialUpdate('detected_by_ai');
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I lost my connection. Please check your internet and try again." }]);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            <div className="p-4 border-b border-(--border) flex items-center justify-between bg-(--bg)/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400">
                        <Bot className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest italic">AION Assistant</p>
                        <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" /> Guide Mode
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full w-8 h-8"><X className="w-4 h-4" /></Button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.map((m: { role: string; content: string }, i: number) => (
                    <div key={i} className={cn(
                        "flex gap-3 max-w-[90%]",
                        m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}>
                        <div className={cn(
                            "w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-1",
                            m.role === 'user' ? "bg-primary-500/20 text-primary-400" : "bg-(--muted) text-(--muted-fg)"
                        )}>
                            {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        </div>
                        <div className={cn(
                            "rounded-2xl p-3 text-[11px] font-medium leading-relaxed shadow-sm",
                            m.role === 'user' ? "bg-primary-600 text-white rounded-tr-none" : "bg-(--muted) text-(--foreground) rounded-tl-none"
                        )}>
                            {m.content}
                        </div>
                    </div>
                ))}
                {isSending && (
                    <div className="flex gap-3 max-w-[90%]">
                        <div className="w-6 h-6 rounded-full bg-(--muted) flex items-center justify-center animate-spin">
                            <Bot className="w-3 h-3" />
                        </div>
                        <div className="bg-(--muted) rounded-2xl rounded-tl-none p-3 shadow-sm">
                            <Loader2 className="w-3 h-3 animate-spin text-(--muted-fg)" />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-(--border) bg-(--bg)/50">
                <div className="relative group">
                    <input
                        className="w-full bg-(--muted) border border-transparent focus:border-primary-500/50 rounded-2xl px-4 py-3 text-[11px] font-bold outline-none ring-primary-500/10 focus:ring-4 transition-all pr-12"
                        placeholder="Say something like 'help me set up'..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isSending}
                        className="absolute right-2 top-1.5 w-9 h-9 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                <p className="text-[7px] text-(--muted-fg) font-black uppercase text-center mt-3 tracking-widest">
                    Powered by AION-Gemini Agent Orchestration
                </p>
            </div>
        </>
    );
}
