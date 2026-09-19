// ============================================================
// AION — Core TypeScript Types
// ============================================================

// ─── User & Auth ────────────────────────────────────────────

export type UserRole = 'creator' | 'user' | 'admin';

export interface CreatorProfile {
  expertise: string;
  skills: string[];
  experience_years: number;
  bio: string;
  work_style: string;
  specializations: string[];
  portfolio_links: string[];
  automation_categories: string[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  bio: string | null;
  website: string | null;
  is_creator: boolean;
  creator_onboarded_at: string | null;
  creator_profile: CreatorProfile | null;
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

export type NodeType =
  | 'input'
  | 'trigger'
  | 'ai_action'
  | 'ai_agent'
  | 'api_action'
  | 'social_action'
  | 'logic_gate'
  | 'data_tool'
  | 'chat_model'
  | 'memory'
  | 'tool'
  | 'output';

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
  source_handle?: string | null;
  target_handle?: string | null;
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

// ─── AION Credits Wallet (Billing Part 2) ────────────────────
// 1 USD = 1 AION Credit. Positive ledger amount = credit, negative = spend.

export type CreditTransactionType =
  | 'payment_credit'
  | 'automation_purchase'
  | 'automation_usage'
  | 'managed_resource_charge'
  | 'creator_earning'
  | 'refund'
  | 'adjustment';

export interface Wallet {
  id: string;
  user_id: string;
  credit_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: CreditTransactionType;
  reference_id: string | null;
  description: string | null;
  balance_before: number;
  balance_after: number;
  created_at: string;
}

// ─── AION Payments (Billing Part 3) ─────────────────────────
// Dummy gateway now; real provider (Stripe/Razorpay) plugs into
// lib/payments/gateway.ts later. $1 = 1 AION Credit.

export type CustomerType = 'byok' | 'managed';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type PaymentProviderName = 'dummy' | 'stripe' | 'razorpay';

export interface Payment {
  id: string;
  user_id: string;
  customer_type: CustomerType;
  amount_usd: number;
  credits_amount: number;
  provider: PaymentProviderName;
  provider_payment_id: string | null;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── AION Billing Engine (Part 4: BYOK + Managed) ───────────
// All prices come from automation_pricing. Frontend never calculates.

export type BillingModel = 'flat' | 'duration' | 'usage';
export type MarginType = 'percent' | 'fixed';

export interface AutomationPricing {
  id: string;
  listing_id: string;
  billing_model: BillingModel;
  byok_prices: Record<string, number>;
  managed_base_internal: Record<string, number>;
  resource_rates: Record<string, number>;
  margin_type: MarginType;
  margin_value: number;
  supported_durations: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseQuote {
  listing_id: string;
  customer_type: CustomerType;
  duration_days: number;
  internal_cost: number;
  margin: number;
  customer_price: number;
  credits_required: number;
}

export type UsageMetric =
  | 'execution'
  | 'runtime_second'
  | 'input_token_1k'
  | 'output_token_1k'
  | 'api_request'
  | 'storage_gb_mo'
  | 'compute_second';

export interface ResourceUsage {
  id: string;
  user_id: string;
  instance_id: string | null;
  listing_id: string | null;
  metric: UsageMetric;
  quantity: number;
  unit_cost_usd: number;
  cost_usd: number;
  cycle_id: string | null;
  metadata: Record<string, unknown>;
  recorded_at: string;
}

export type BillingCycleStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

export interface BillingCycle {
  id: string;
  user_id: string;
  instance_id: string | null;
  period_start: string;
  period_end: string;
  usage: Record<string, number>;
  internal_cost: number;
  margin: number;
  customer_charge: number;
  credits_charged: number;
  status: BillingCycleStatus;
  created_at: string;
}

// ─── Marketplace billing (Part 5: purchase + entitlements + earnings) ──

export type EntitlementStatus = 'active' | 'expired' | 'cancelled' | 'suspended';

export interface AutomationEntitlement {
  id: string;
  user_id: string;
  automation_id: string;
  purchase_id: string;
  customer_type: CustomerType;
  duration_days: number;
  started_at: string;
  expires_at: string;
  status: EntitlementStatus;
  credits_paid: number;
  created_at: string;
}

export type MarketplaceTransactionStatus = 'pending' | 'completed' | 'refunded' | 'failed';

export interface MarketplaceTransaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  automation_id: string;
  purchase_id: string;
  gross_amount: number;
  platform_fee: number;
  creator_amount: number;
  status: MarketplaceTransactionStatus;
  created_at: string;
}

export type CreatorEarningStatus = 'pending' | 'available' | 'reversed';

export interface CreatorEarning {
  id: string;
  seller_id: string;
  transaction_id: string;
  amount: number;
  status: CreatorEarningStatus;
  available_at: string;
  released_at: string | null;
  created_at: string;
}

export interface CreatorEarningsSummary {
  total_earnings: number;
  pending_earnings: number;
  available_earnings: number;
  sales_count: number;
}

// ─── UI State ───────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system';

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
}

// ─── Consumer Instances (Sanket — Workstream C) ─────────────

export type InstanceStatus = 'setup_required' | 'active' | 'paused' | 'error';

export interface ConsumerInstance {
  id: string;
  purchase_id: string;
  buyer_id: string;
  workflow_id: string;
  listing_id: string;
  status: InstanceStatus;
  pricing_tier: 'byok' | 'managed';
  credentials: Record<string, unknown>;
  custom_config: Record<string, unknown>;
  config_overrides: Record<string, unknown>;
  last_run_at: string | null;
  total_runs: number;
  total_successes: number;
  total_failures: number;
  created_at: string;
  updated_at: string;
  // Joined data
  listing?: MarketplaceListing;
}

export interface ConsumerRunLog {
  id: string;
  instance_id: string;
  status: 'success' | 'failed';
  duration_ms: number | null;
  node_count: number | null;
  input_summary: string | null;
  output_summary: string | null;
  error: string | null;
  created_at: string;
}

export interface ConsumerAnalytic {
  id: string;
  instance_id: string;
  metric_type: 'lead' | 'revenue' | 'task' | 'custom';
  metric_value: number;
  metric_label: string | null;
  metadata: Record<string, unknown>;
  recorded_at: string;
}

// ─── Notifications (Sanket — Workstream C) ──────────────────

export type NotificationType =
  | 'workflow_failed'
  | 'workflow_success'
  | 'daily_summary'
  | 'threshold_alert'
  | 'purchase'
  | 'system'
  | 'info';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}
