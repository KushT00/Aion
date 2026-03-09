'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Activity,
    Zap,
    Box,
    Clock,
    ArrowLeft,
    ExternalLink,
    RefreshCw,
    Terminal,
    Cpu,
    Database,
    Shield,
    ChevronRight,
    Search,
    Filter,
    Download,
    Eye,
    EyeOff,
    Copy,
    Settings,
    LayoutDashboard,
    Flame,
    Workflow,
    History,
    CheckCircle2,
    XCircle,
    Info,
    Menu,
    LogOut,
    User,
    Play,
    Workflow as WorkflowIcon,
} from 'lucide-react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from '@/components/workflow/NodeComponents';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface InstanceStats {
    totalRuns: number;
    successRate: number;
    hoursSaved: string;
    leadsGenerated: number;
    revenueAttributed: number;
    tasksCompleted: number;
}

interface RunLog {
    id: string;
    status: 'success' | 'failed';
    created_at: string;
    duration_ms: number;
    node_count: number;
    error: string | null;
}

// ─── PAGE COMPONENT ─────────────────────────────────────────────────────────

export default function InstanceControlCenter() {
    const params = useParams();
    const router = useRouter();
    const instanceId = params.id as string;
    const { user } = useAuth();

    const [instance, setInstance] = useState<any>(null);
    const [stats, setStats] = useState<InstanceStats | null>(null);
    const [logs, setLogs] = useState<RunLog[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [apiKey, setApiKey] = useState<string>('');
    const [isKeyVisible, setIsKeyVisible] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'results' | 'integration'>('overview');

    // Fetch All Data
    const fetchData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            // 1. Instance Details
            const instRes = await fetch(`/api/ai/instance-details?instanceId=${instanceId}`);
            const instData = await instRes.ok ? await instRes.json() : null;
            if (instData) setInstance(instData.instance);

            // 2. Analytics
            const statRes = await fetch(`/api/consumer/instances/${instanceId}/analytics`);
            const statData = await statRes.ok ? await statRes.json() : null;
            if (statData) setStats(statData.summary);

            // 3. Logs
            const logRes = await fetch(`/api/ai/instance-logs?instanceId=${instanceId}`);
            const logData = await logRes.ok ? await logRes.json() : null;
            if (logData) setLogs(logData.logs || []);

            // 4. Results
            const resRes = await fetch(`/api/consumer/instances/${instanceId}/results?limit=10`);
            const resData = await resRes.ok ? await resRes.json() : null;
            if (resData) setResults(resData.results || []);

            // 5. API Key (From our new settings API)
            const keyRes = await fetch('/api/settings/api-key');
            if (keyRes.ok) {
                const keyData = await keyRes.json();
                setApiKey(keyData.key || '');
            }

        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Failed to sync with worker heart');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (instanceId) fetchData();
    }, [instanceId]);

    const handleCopyKey = () => {
        navigator.clipboard.writeText(apiKey);
        toast.success('API Key copied to tray');
    };

    const handleBack = () => {
        router.push('/my-automations');
    };

    if (isLoading) return <LoadingScreen />;

    return (
        <div className="flex h-screen overflow-hidden bg-[#050505] text-[#e5e5e5] font-sans">
            {/* ─── SIDEBAR (Control Panel) ─── */}
            <aside className="w-20 lg:w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col items-center lg:items-stretch py-8 shrink-0">
                <div className="px-6 mb-12 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/20">
                        <Cpu className="w-6 h-6 text-white" />
                    </div>
                    <span className="hidden lg:block text-xl font-black italic tracking-tighter uppercase">Mission <span className="text-primary-500">Control</span></span>
                </div>

                <nav className="flex-1 space-y-2 px-3">
                    <NavButton
                        active={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                        icon={<LayoutDashboard />}
                        label="Overview"
                    />
                    <NavButton
                        active={activeTab === 'activity'}
                        onClick={() => setActiveTab('activity')}
                        icon={<Activity />}
                        label="Activity Stream"
                    />
                    <NavButton
                        active={activeTab === 'results'}
                        onClick={() => setActiveTab('results')}
                        icon={<Database />}
                        label="Captured Intelligence"
                    />
                    <NavButton
                        active={activeTab === 'integration'}
                        onClick={() => setActiveTab('integration')}
                        icon={<Terminal />}
                        label="API Protocol"
                    />
                </nav>

                <div className="mt-auto px-6 space-y-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-[#666] hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="hidden lg:block">Exit Terminal</span>
                    </button>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hidden lg:block">
                        <p className="text-[10px] font-black uppercase text-[#666] mb-1">Worker Heartbeat</p>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Sync Active</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ─── MAIN CONTENT ─── */}
            <main className="flex-1 overflow-y-auto relative bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary-900/10 via-transparent to-transparent">
                {/* Top Banner */}
                <header className="sticky top-0 z-20 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-8 py-6 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-primary-500/10 text-primary-400 border-none font-black text-[9px] uppercase tracking-widest">Aion Worker Instance</Badge>
                            <span className="text-[10px] text-[#444] font-mono">ID: {instanceId.slice(0, 8)}</span>
                        </div>
                        <h1 className="text-3xl font-black italic uppercase tracking-tighter">{instance?.listing?.title || 'Loading Worker...'}</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={() => fetchData(true)}
                            disabled={isRefreshing}
                            className="h-10 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest"
                        >
                            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
                            Sync Source
                        </Button>
                        <Button
                            className="h-10 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-black uppercase tracking-widest text-[10px] px-6"
                        >
                            <Play className="w-4 h-4 mr-2 fill-current" />
                            Trigger Mission
                        </Button>
                    </div>
                </header>

                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {activeTab === 'overview' && <OverviewTab stats={stats} logs={logs} results={results} instance={instance} />}
                    {activeTab === 'activity' && <ActivityTab logs={logs} />}
                    {activeTab === 'results' && <ResultsTab instanceId={instanceId} />}
                    {activeTab === 'integration' && (
                        <IntegrationTab
                            instanceId={instanceId}
                            apiKey={apiKey}
                            isKeyVisible={isKeyVisible}
                            setIsKeyVisible={setIsKeyVisible}
                            onCopy={handleCopyKey}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function WorkflowPreview({ nodes: rawNodes, edges: rawEdges }: { nodes: any[], edges: any[] }) {
    // Map raw DB nodes to ReactFlow nodes
    const nodes = (rawNodes || []).map((n: any) => {
        const config = n.config || {};
        let logicType = config.originalType || n.type;
        let rfType = config.rfType || 'custom';

        return {
            id: n.id,
            type: rfType,
            position: { x: n.position_horizontal || n.position_x || 0, y: n.position_vertical || n.position_y || 0 },
            data: {
                label: n.label,
                type: logicType,
                config
            },
            draggable: false,
            selectable: false,
        };
    });

    const edges = (rawEdges || []).map((e: any) => {
        let sourceH: string | null = null;
        let targetH: string | null = null;
        let realLabel: string | null = null;

        if (e.label && e.label.startsWith('{')) {
            try {
                const parsed = JSON.parse(e.label);
                if (parsed.__is_handle_data) {
                    sourceH = parsed.sourceHandle || null;
                    targetH = parsed.targetHandle || null;
                    realLabel = parsed.label || null;
                }
            } catch (err) { }
        } else {
            realLabel = e.label || null;
        }

        return {
            id: e.id,
            source: e.source_node_id,
            target: e.target_node_id,
            sourceHandle: sourceH,
            targetHandle: targetH,
            label: realLabel,
            animated: true,
            selectable: false,
        };
    });

    if (nodes.length === 0) return null;

    return (
        <div className="h-[400px] w-full bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden relative group">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                zoomOnScroll={false}
                panOnScroll={false}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={20} color="#222" />
            </ReactFlow>
            <div className="absolute top-6 left-6 flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/20">
                    <WorkflowIcon className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Worker Architecture</p>
                    <p className="text-xs font-black uppercase italic">Neural Execution Logic</p>
                </div>
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group",
                active
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    : "text-[#666] hover:text-white hover:bg-white/5"
            )}
        >
            <div className={cn("w-5 h-5 transition-transform group-hover:scale-110", active ? "text-white" : "text-[#444]")}>
                {icon}
            </div>
            <span className="hidden lg:block text-xs font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}

function OverviewTab({ stats, logs, results, instance }: any) {
    const rawWorkflow = instance?.listing?.workflow;
    const workflow = Array.isArray(rawWorkflow) ? rawWorkflow[0] : rawWorkflow || {};
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    return (
        <div className="space-y-8">
            {/* WORKFLOW PREVIEW SECTION */}
            <WorkflowPreview nodes={nodes} edges={edges} />

            {/* TOP STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                    label="Missions Completed"
                    value={stats?.totalRuns || 0}
                    icon={<Zap className="text-amber-400" />}
                    sub="Total unique executions"
                />
                <StatCard
                    label="Infrastructure Cost"
                    value={`$${stats?.totalCost || '0.00'}`}
                    icon={<Shield className="text-blue-400" />}
                    sub={instance?.pricing_tier === 'managed' ? 'Managed consumption' : 'Zero (BYOK Active)'}
                />
                <StatCard
                    label="Protocol Value"
                    value={`$${stats?.totalSavings || '0.00'}`}
                    icon={<Flame className="text-orange-400" />}
                    sub="Estimated operational ROI"
                />
                <StatCard
                    label="Human Time Saved"
                    value={`${stats?.hoursSaved || 0}h`}
                    icon={<Clock className="text-primary-400" />}
                    sub="Based on task complexity"
                />
                <StatCard
                    label="Intelligence Units"
                    value={stats?.tasksCompleted || 0}
                    icon={<Database className="text-violet-400" />}
                    sub="Data objects processed"
                />
                <StatCard
                    label="Protocol Success"
                    value={`${stats?.successRate || 0}%`}
                    icon={<CheckCircle2 className="text-emerald-400" />}
                    sub="Average reliability rating"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LATEST ACTIVITY PREVIEW */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <History className="w-4 h-4 text-[#666]" /> Recent Missions
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {logs.slice(0, 5).map((log: any) => (
                            <div key={log.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:border-white/20 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center",
                                        log.status === 'success' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                    )}>
                                        {log.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">Mission Protocol Alpha</p>
                                        <p className="text-[9px] font-bold text-[#666] uppercase tracking-widest">{new Date(log.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden md:block">
                                        <p className="text-[10px] font-black uppercase text-[#666]">Node Ops</p>
                                        <p className="text-xs font-bold">{log.node_count || 0} nodes</p>
                                    </div>
                                    <Badge className={cn(
                                        "font-black text-[8px] uppercase tracking-widest px-3",
                                        log.status === 'success' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                    )}>
                                        {log.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                                <p className="text-xs font-black uppercase tracking-widest text-[#444]">No Mission Data Detected</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* WORKER BRAIN (Config Preview) */}
                <div className="space-y-6">
                    <Card className="p-6 bg-[#0a0a0a] border-white/10 rounded-[2rem] space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                                <Workflow className="w-6 h-6 text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest">Worker Logic</h3>
                                <p className="text-[10px] text-[#666] font-bold uppercase tracking-widest">Visual Workflow active</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-[#888] font-medium leading-relaxed italic">
                                "{instance?.listing?.description?.slice(0, 100)}..."
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-[9px] font-black uppercase text-[#666] mb-1">Pricing Layer</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary-400">{instance?.pricing_tier || 'BYOK'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-[9px] font-black uppercase text-[#666] mb-1">Created</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white">{new Date(instance?.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest h-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10">
                                <Settings className="w-4 h-4 mr-2" /> Adjust Parameters
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6 bg-primary-600 border-none rounded-[2rem] overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-125 transition-transform duration-500">
                            <Flame className="w-20 h-20 text-white" />
                        </div>
                        <div className="relative z-10 space-y-3">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white/90">Agentic Insight</h3>
                            <p className="text-xs font-bold leading-relaxed text-white">
                                Based on your last 100 missions, this worker is operating at <span className="underline decoration-2">Peak Efficiency</span>. No setup adjustments required.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, sub }: any) {
    return (
        <Card className="p-6 bg-[#0a0a0a] border-white/5 hover:border-white/10 transition-all rounded-[2rem] relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-primary-500/10 transition-all" />
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shadow-lg">
                    {icon}
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#666]">{label}</h4>
            </div>
            <p className="text-3xl font-black mb-1">{value}</p>
            <p className="text-[9px] font-bold text-[#444] uppercase tracking-widest">{sub}</p>
        </Card>
    );
}

function ActivityTab({ logs }: { logs: RunLog[] }) {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black italic uppercase tracking-tighter">Mission <span className="text-primary-500">History</span></h2>
                <div className="flex gap-2">
                    <Button variant="outline" className="h-9 rounded-xl bg-white/5 border-white/5 text-[9px] font-black uppercase tracking-widest">
                        <Filter className="w-3.5 h-3.5 mr-2" /> Filter protocols
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {logs.map((log) => (
                    <Card key={log.id} className="p-5 bg-[#0a0a0a] border-white/10 hover:border-primary-500/30 transition-all rounded-3xl flex flex-col md:flex-row md:items-center gap-6 group">
                        <div className="flex items-center gap-4 flex-1">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                                log.status === 'success' ? "bg-emerald-500/10 text-emerald-400 shadow-emerald-500/10" : "bg-rose-500/10 text-rose-400 shadow-rose-500/10"
                            )}>
                                {log.status === 'success' ? <Workflow className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-black text-sm uppercase tracking-tight">Mission Alpha-{log.id.slice(0, 4)}</h3>
                                    <Badge className={cn(
                                        "text-[8px] font-black uppercase px-2",
                                        log.status === 'success' ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"
                                    )}>
                                        {log.status === 'success' ? 'Protocol Success' : 'Protocol Failed'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-bold text-[#666] uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}</span>
                                    <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3" /> {log.node_count || 0} Step Process</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                            <div className="text-center md:text-right min-w-[80px]">
                                <p className="text-[9px] font-black uppercase text-[#444] mb-1">Duration</p>
                                <p className="text-xs font-black text-white">{(log.duration_ms / 1000).toFixed(2)}s</p>
                            </div>
                            <Button className="h-10 w-10 md:w-32 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest group-hover:bg-primary-500 group-hover:text-white transition-all">
                                <span className="hidden md:block">Inspect Logs</span>
                                <ChevronRight className="w-4 h-4 md:ml-2" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function ResultsTab({ instanceId }: { instanceId: string }) {
    const [results, setResults] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            const res = await fetch(`/api/consumer/instances/${instanceId}/results?search=${search}&limit=50`);
            if (res.ok) {
                const data = await res.json();
                setResults(data.results || []);
            }
            setIsLoading(false);
        };
        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [instanceId, search]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-black italic uppercase tracking-tighter">Captured <span className="text-primary-500">Intelligence</span></h2>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
                    <input
                        className="w-full bg-white/5 border-white/10 rounded-2xl pl-12 pr-4 py-3 text-xs font-bold outline-none ring-primary-500/20 focus:ring-4 transition-all"
                        placeholder="Search intelligence database..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="bg-[#0a0a0a] border-white/5 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr>
                                <th className="px-8 py-6 font-black uppercase tracking-widest text-[#666]">Identity</th>
                                <th className="px-8 py-6 font-black uppercase tracking-widest text-[#666]">Classification</th>
                                <th className="px-8 py-6 font-black uppercase tracking-widest text-[#666]">State</th>
                                <th className="px-8 py-6 font-black uppercase tracking-widest text-[#666]">Data Fragment</th>
                                <th className="px-8 py-6 font-black uppercase tracking-widest text-[#666] text-right">Acquisition</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {results.map((r) => (
                                <tr key={r.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                    <td className="px-8 py-6 font-black uppercase tracking-tight text-white group-hover:text-primary-400 transition-colors">
                                        {r.title || 'Unknown Entity'}
                                    </td>
                                    <td className="px-8 py-6">
                                        <Badge className="bg-primary-500/10 text-primary-400 border-none font-black text-[8px] uppercase tracking-widest px-2.5">
                                            {r.result_type}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-6 font-bold uppercase tracking-widest text-[#666] text-[10px]">
                                        {r.status}
                                    </td>
                                    <td className="px-8 py-6 font-mono text-[10px] text-[#444] max-w-xs truncate group-hover:text-[#888] transition-colors">
                                        {Object.entries(r.data || {}).slice(0, 3).map(([k, v]) => (
                                            <span key={k} className="mr-2">
                                                <span className="text-primary-500/50">{k}:</span>
                                                {typeof v === 'string' ? v.slice(0, 20) : JSON.stringify(v)}
                                            </span>
                                        ))}
                                        {Object.keys(r.data || {}).length > 3 && '...'}
                                    </td>
                                    <td className="px-8 py-6 text-right font-bold text-[#666] text-[10px]">
                                        {new Date(r.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {results.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <p className="text-xs font-black uppercase tracking-widest text-[#333]">Intelligence Database Empty</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function IntegrationTab({ instanceId, apiKey, isKeyVisible, setIsKeyVisible, onCopy }: any) {
    const curlSnippet = `curl -X POST http://localhost:3000/api/v1/trigger/${instanceId} \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "External trigger mission"}'`;

    const jsSnippet = `await fetch("http://localhost:3000/api/v1/trigger/${instanceId}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey || 'YOUR_API_KEY'}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ data: "mission_start" })
});`;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="space-y-2">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">API <span className="text-primary-500">Orchestration</span></h2>
                <p className="text-xs text-[#666] font-bold uppercase tracking-widest leading-relaxed max-w-2xl text-[10px]">
                    This worker can be summoned by external systems using the protocol below. Use your encrypted Secret Key to authenticate requests.
                </p>
            </div>

            <div className="grid gap-6">
                {/* API KEY SECTION */}
                <Card className="p-8 bg-[#0a0a0a] border-white/5 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-amber-400" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest italic">Secret Auth Protocol</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsKeyVisible(!isKeyVisible)}
                                className="h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest text-[#666] hover:text-white"
                            >
                                {isKeyVisible ? <><EyeOff className="w-4 h-4 mr-2" /> Conceal</> : <><Eye className="w-4 h-4 mr-2" /> Reveal</>}
                            </Button>
                            <Button
                                onClick={onCopy}
                                className="h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                <Copy className="w-4 h-4 mr-2" /> Copy to tray
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-black border border-white/5 font-mono text-sm break-all">
                        {isKeyVisible ? apiKey : 'aion_sk_••••••••••••••••••••••••••••••••'}
                    </div>
                </Card>

                {/* ENDPOINT SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 bg-[#0a0a0a] border-white/5 rounded-[2.5rem] space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Terminal className="w-5 h-5 text-primary-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic text-[#666]">Terminal Snippet (cURL)</h3>
                        </div>
                        <pre className="p-4 rounded-xl bg-black text-[10px] text-[#888] overflow-x-auto font-mono leading-relaxed border border-white/5">
                            {curlSnippet}
                        </pre>
                    </Card>

                    <Card className="p-6 bg-[#0a0a0a] border-white/5 rounded-[2.5rem] space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Workflow className="w-5 h-5 text-violet-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic text-[#666]">Application Hook (JS)</h3>
                        </div>
                        <pre className="p-4 rounded-xl bg-black text-[10px] text-[#888] overflow-x-auto font-mono leading-relaxed border border-white/5">
                            {jsSnippet}
                        </pre>
                    </Card>
                </div>

                <div className="p-6 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/20 flex items-start gap-4">
                    <Info className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 italic">Security Advisory</p>
                        <p className="text-[10px] text-amber-500/70 font-bold leading-relaxed uppercase tracking-tight">
                            Requests to this endpoint trigger REAL missions and consume your infrastructure resources.
                            Never expose this key in client-side code (frontend) or public repositories.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LoadingScreen() {
    return (
        <div className="h-screen w-full bg-[#050505] flex items-center justify-center">
            <div className="flex flex-col items-center gap-8 text-center animate-pulse">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu className="w-10 h-10 text-primary-500" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-black italic uppercase tracking-tighter">Synchronizing <span className="text-primary-500">Intelligence</span></h2>
                    <p className="text-[10px] text-[#444] font-black uppercase tracking-[0.3em]">Connecting to encrypted worker heart...</p>
                </div>
            </div>
        </div>
    );
}
