'use client';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import {
    Cpu, Globe, MessageSquare, GitFork, Database, Upload,
    ArrowRightCircle, Zap, Code2, Clock, Merge, Repeat,
    SlidersHorizontal, Mail, Calendar, FileText,
    CheckCircle2, XCircle, BrainCircuit, BookOpen, Wrench,
} from 'lucide-react';

// ─── Color Palette per node type ───────────────────────────
export const nodeColors: Record<string, { bg: string; border: string; icon: string; glow: string }> = {
    trigger: { bg: 'bg-amber-500/10', border: 'border-amber-500/40', icon: 'text-amber-400', glow: 'shadow-amber-500/20' },
    ai_action: { bg: 'bg-violet-500/10', border: 'border-violet-500/40', icon: 'text-violet-400', glow: 'shadow-violet-500/20' },
    ai_agent: { bg: 'bg-purple-500/10', border: 'border-purple-500/40', icon: 'text-purple-400', glow: 'shadow-purple-500/20' },
    api_action: { bg: 'bg-blue-500/10', border: 'border-blue-500/40', icon: 'text-blue-400', glow: 'shadow-blue-500/20' },
    social_action: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/40', icon: 'text-indigo-400', glow: 'shadow-indigo-500/20' },
    logic_gate: { bg: 'bg-orange-500/10', border: 'border-orange-500/40', icon: 'text-orange-400', glow: 'shadow-orange-500/20' },
    data_tool: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', icon: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    input: { bg: 'bg-slate-500/10', border: 'border-slate-500/40', icon: 'text-slate-400', glow: 'shadow-slate-500/20' },
    output: { bg: 'bg-rose-500/10', border: 'border-rose-500/40', icon: 'text-rose-400', glow: 'shadow-rose-500/20' },
    code: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', icon: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
    delay: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
};

export const nodeIcons: Record<string, any> = {
    trigger: Zap, ai_action: Cpu, ai_agent: BrainCircuit,
    api_action: Globe, social_action: MessageSquare, logic_gate: GitFork,
    data_tool: Database, input: Upload, output: ArrowRightCircle,
    code: Code2, delay: Clock, merge: Merge, loop: Repeat,
    set_variable: SlidersHorizontal,
};

const handleStyle = '!w-3 !h-3 !border-2 !border-[var(--card)] hover:!scale-125 transition-transform';

// ─── Standard Node ──────────────────────────────────────────
export function CustomNode({ data, selected }: { data: any; selected?: boolean }) {
    const colors = nodeColors[data.type] || nodeColors.input;
    const Icon = nodeIcons[data.type] || MessageSquare;
    const integrationId = data.config?.integrationId;

    // Sub-label for integration
    const integrationLabel: Record<string, string> = {
        google_gmail: 'Gmail', google_calendar: 'Calendar', google_sheets: 'Sheets',
        google_gemini: 'Gemini', openai: 'OpenAI', groq: 'Groq', openrouter: 'OpenRouter',
        discord: 'Discord', slack: 'Slack', telegram: 'Telegram',
        notion: 'Notion', cron: 'Schedule', webhook: 'Webhook',
        if_else: 'IF/ELSE', loop: 'Loop', delay: 'Delay', code: 'Code',
        set_variable: 'Set Var', merge: 'Merge', transform: 'Transform',
    };

    return (
        <div className={cn(
            'relative bg-[var(--card)] border shadow-sm rounded-lg min-w-[150px] cursor-pointer',
            'transition-all duration-200 group',
            colors.border,
            selected && `ring-1 ring-offset-1 ring-offset-[var(--bg)] ring-violet-500 shadow-md ${colors.glow}`,
            !selected && 'hover:shadow-sm hover:border-[var(--muted-fg)]/30',
        )}>
            <Handle type="target" position={Position.Top}
                className={cn(handleStyle, '!bg-[var(--border)] hover:!bg-violet-500')} />

            <div className="p-2 flex items-center gap-2">
                <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', colors.bg)}>
                    <Icon className={cn('w-3.5 h-3.5', colors.icon)} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--fg)] truncate">{data.label}</p>
                    <p className="text-[9px] text-[var(--muted-fg)]">
                        {integrationLabel[integrationId] || data.type?.replace(/_/g, ' ')}
                    </p>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom}
                className={cn(handleStyle, '!bg-[var(--border)] hover:!bg-violet-500')} />
        </div>
    );
}

// ─── IF/ELSE Node (dual outputs: true / false) ──────────────
export function IfElseNode({ data, selected }: { data: any; selected?: boolean }) {
    const colors = nodeColors.logic_gate;
    return (
        <div className={cn(
            'relative bg-[var(--card)] border shadow-sm rounded-lg min-w-[150px] cursor-pointer',
            'transition-all duration-200',
            colors.border,
            selected && 'ring-1 ring-offset-1 ring-offset-[var(--bg)] ring-orange-500 shadow-md shadow-orange-500/20',
        )}>
            <Handle type="target" position={Position.Top}
                className={cn(handleStyle, '!bg-[var(--border)] hover:!bg-orange-500')} />

            <div className="p-2 flex items-center gap-2">
                <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', colors.bg)}>
                    <GitFork className={cn('w-3.5 h-3.5', colors.icon)} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--fg)] truncate">{data.label}</p>
                    <p className="text-[9px] text-[var(--muted-fg)]">IF / ELSE condition</p>
                </div>
            </div>

            {/* Two output handles: true (left-bottom) and false (right-bottom) */}
            <div className="flex justify-between px-4 pb-1 pt-1 border-t border-[var(--border)]">
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-bold text-emerald-500 uppercase">True</span>
                    <Handle
                        type="source" position={Position.Bottom} id="true"
                        style={{ left: '30%', bottom: -5, transform: 'translateX(-50%)' }}
                        className={cn(handleStyle, '!bg-emerald-500 !border-[var(--card)]')}
                    />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-bold text-rose-500 uppercase">False</span>
                    <Handle
                        type="source" position={Position.Bottom} id="false"
                        style={{ left: '70%', bottom: -5, transform: 'translateX(-50%)' }}
                        className={cn(handleStyle, '!bg-rose-500 !border-[var(--card)]')}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── AI Agent Node (with sub-ports for Tools / KB) ──────────
export function AIAgentNode({ data, selected }: { data: any; selected?: boolean }) {
    const colors = nodeColors.ai_agent;
    const tools: string[] = data.config?.data?.tools || [];
    const hasKnowledge = !!(data.config?.data?.knowledgeBase);

    return (
        <div className={cn(
            'relative bg-[var(--card)] border shadow-sm rounded-lg min-w-[180px] cursor-pointer',
            'transition-all duration-200',
            colors.border,
            selected && 'ring-1 ring-offset-1 ring-offset-[var(--bg)] ring-purple-500 shadow-md shadow-purple-500/20',
        )}>
            {/* Main input */}
            <Handle type="target" position={Position.Top}
                className={cn(handleStyle, '!bg-[var(--border)] hover:!bg-purple-500')} />

            {/* Header */}
            <div className="p-2 flex items-center gap-2 border-b border-[var(--border)]">
                <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', colors.bg)}>
                    <BrainCircuit className={cn('w-3.5 h-3.5', colors.icon)} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--fg)] truncate">{data.label}</p>
                    <p className="text-[9px] text-purple-400">AI Agent</p>
                </div>
            </div>

            {/* Pills */}
            <div className="px-2 py-1.5 flex flex-wrap gap-1">
                <div className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-medium border',
                    hasKnowledge ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-[var(--muted)] border-[var(--border)] text-[var(--muted-fg)]'
                )}>
                    <BookOpen className="w-2 h-2" />
                    KB {hasKnowledge ? '✓' : '—'}
                </div>
                <div className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-medium border',
                    tools.length > 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-[var(--muted)] border-[var(--border)] text-[var(--muted-fg)]'
                )}>
                    <Wrench className="w-2 h-2" />
                    Tools {tools.length > 0 ? `(${tools.length})` : '—'}
                </div>
            </div>

            {/* Main output */}
            <Handle type="source" position={Position.Bottom}
                className={cn(handleStyle, '!bg-[var(--border)] hover:!bg-purple-500')} />
        </div>
    );
}

// ─── Node Type Registration Map ─────────────────────────────
export const nodeTypes = {
    custom: CustomNode,
    if_else: IfElseNode,
    ai_agent: AIAgentNode,
};
