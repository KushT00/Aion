import { NodeType } from './index';
import { LucideIcon } from 'lucide-react';

export interface PaletteItem {
  type: NodeType;
  label: string;
  icon: LucideIcon;
  integrationId: string;
  nodeType: string;
  actionId?: string;
}

export interface NodeData {
  label: string;
  type: NodeType;
  config?: {
    integrationId?: string;
    actionId?: string;
    data?: Record<string, unknown>;
    rfType?: string;
    originalType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ExecutionLog {
  nodeId: string;
  status: string;
  timestamp: string;
  output?: unknown;
  error?: string;
}

export interface CloudRun {
  id: string;
  workflow_id: string;
  status: string;
  created_at: string;
  started_at?: string;
  logs?: string | ExecutionLog[];
  output?: unknown;
  error?: string;
  [key: string]: unknown;
}
