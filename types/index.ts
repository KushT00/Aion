// ============================================================
// AION — Core TypeScript Types
// ============================================================

// ─── User & Auth ────────────────────────────────────────────

export type UserRole = 'creator' | 'user' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  bio: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Workflows ──────────────────────────────────────────────

export type WorkflowStatus = 'draft' | 'published' | 'archived';

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  thumbnail_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type NodeType = 'input' | 'ai_step' | 'api_step' | 'logic_step' | 'output';

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  type: NodeType;
  label: string;
  position_x: number;
  position_y: number;
  config: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  created_at: string;
}

// ─── Runs ───────────────────────────────────────────────────

export type RunStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  user_id: string;
  status: RunStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  logs: string | null;
  output: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
}

// ─── Marketplace ────────────────────────────────────────────

export interface MarketplaceListing {
  id: string;
  workflow_id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  usage_count: number;
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  workflow?: Workflow;
  seller?: Profile;
}

export interface Rating {
  id: string;
  listing_id: string;
  user_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  listing_id: string;
  buyer_id: string;
  price_paid: number;
  currency: string;
  created_at: string;
}

// ─── UI State ───────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system';

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
}
