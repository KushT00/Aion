# 🚀 AION — Development Roadmap & Team Plan

> **Agents-as-a-Service Automation Marketplace**
> A platform where creators build & sell AI-powered automations, and consumers deploy them with zero technical knowledge via conversational AI onboarding.

---

## 📋 Table of Contents

1. [Vision & Architecture](#-vision--architecture)
2. [Current Codebase Audit](#-current-codebase-audit--whats-already-built)
3. [Team Workstream Division](#-team-workstream-division)
4. [WORKSTREAM A — Creator Engine & Builder](#-workstream-a--creator-engine--builder-kush)
5. [WORKSTREAM B — Marketplace & Payments](#-workstream-b--marketplace--payments-ricky)
6. [WORKSTREAM C — Consumer Dashboard & Infrastructure](#-workstream-c--consumer-dashboard--infrastructure-sanket)
7. [Shared Database Schema Additions](#-shared-database-schema-additions)
8. [Development Phases & Timeline](#-development-phases--timeline)
9. [Git Branching Strategy](#-git-branching-strategy)
10. [Future Scope & Stretch Goals](#-future-scope--stretch-goals)

---

## 🏗 Vision & Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        AION PLATFORM                                 │
│                                                                      │
│   ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐     │
│   │  CREATOR     │   │  PUBLIC       │   │  CONSUMER            │     │
│   │  ENGINE      │   │  MARKETPLACE  │   │  DASHBOARD           │     │
│   │              │   │              │   │                      │     │
│   │  • Builder   │──▶│  • Browse    │──▶│  • My Automations    │     │
│   │  • Publish   │   │  • Purchase  │   │  • Live Logs         │     │
│   │  • Analytics │   │  • Reviews   │   │  • ROI Analytics     │     │
│   │  • Leads     │   │  • AI Chat   │   │  • API Key Mgmt      │     │
│   └──────┬───────┘   └──────┬───────┘   └──────────┬───────────┘     │
│          │                  │                      │                 │
│   ┌──────▼──────────────────▼──────────────────────▼───────────┐     │
│   │               SHARED INFRASTRUCTURE                        │     │
│   │                                                            │     │
│   │   • Workflow Runner Engine      • Supabase (Auth + DB)     │     │
│   │   • Integration Registry        • Stripe / Razorpay       │     │
│   │   • AI Onboarding Agent         • Instance Isolation       │     │
│   │   • Webhook / Cron System       • Real-time via SSE       │     │
│   └────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

### The Four Pillars

| Pillar | What it Does | Status |
|--------|-------------|--------|
| **The Creator Engine** | Visual node-based builder for repeatable monetization | 🟡 60% Built |
| **The AI Layer** | Conversational onboarding that maps user intent → API keys & configs | 🟡 40% Built |
| **The Infrastructure** | Isolated workflow instances per consumer | 🔴 10% Built |
| **The Business Logic** | ROI-based analytics over raw execution logs | 🔴 5% Built |

---

## 🔍 Current Codebase Audit — What's Already Built

### ✅ What Works Today

| Feature | File(s) | Status |
|---------|---------|--------|
| Auth (Supabase login/signup) | `app/(auth)/`, `app/auth/`, `lib/supabase/` | ✅ Complete |
| Visual Workflow Builder (React Flow) | `app/(dashboard)/builder/page.tsx` (1441 lines) | ✅ Functional |
| Node Palette (Triggers, AI, Comms, Logic, Utility) | Builder page + `components/workflow/NodeComponents.tsx` | ✅ Works |
| Node Configuration Forms | `components/workflow/NodeConfigs.tsx` (65K) | ✅ Rich configs |
| Workflow Runner Engine | `lib/workflow/runner.ts` (457 lines) | ✅ Core engine works |
| Integration Registry (Gemini, Groq, OpenAI, Telegram, Discord, HTTP, Google Sheets/Docs) | `lib/workflow/integrations/registry.ts` (1965 lines) | ✅ Extensive |
| Publishing Panel UI | `components/workflow/PublishingPanel.tsx` | ✅ UI works |
| Marketplace Browse Page | `app/(dashboard)/marketplace/page.tsx` | 🟡 Hardcoded listings |
| Creator Dashboard | `app/(dashboard)/creator/dashboard/page.tsx` | 🟡 Hardcoded stats |
| My Automations Page | `app/(dashboard)/my-automations/page.tsx` | 🟡 Hardcoded data |
| Billing Page | `app/(dashboard)/billing/page.tsx` | 🟡 UI only, no Stripe |
| Agent Wizard (AI Onboarding) | `app/(dashboard)/agent-wizard/` | 🟡 Basic flow |
| Telegram Webhook Handler | `app/api/webhooks/telegram/` | ✅ Functional |
| Workflow Execution Webhook | `app/api/webhooks/[workflowId]/` | ✅ Functional |
| Google OAuth Integration | `app/api/integrations/`, `GoogleConnectButton.tsx` | ✅ Works |
| Supabase Schema (profiles, workflows, nodes, edges, runs, marketplace, ratings, purchases) | `supabase/schema.sql` | ✅ Complete base |

### 🔴 What's Missing / Hardcoded

| Gap | Impact |
|-----|--------|
| Marketplace listings are hardcoded arrays, not fetched from DB | No real marketplace |
| Creator dashboard stats are hardcoded | No real creator analytics |
| My Automations page is hardcoded | Consumers can't see purchased automations |
| No payment integration (Stripe/Razorpay) | Can't monetize |
| No workflow instance isolation per consumer | All users share same execution |
| No consumer-facing CRM / ROI dashboard | Consumers can't see value |
| No subscription/recurring billing | One-time only |
| No version control for workflows | Creators can't iterate safely |
| No search/filter with real DB queries on marketplace | Poor discovery |
| No AI onboarding agent connected to marketplace | Users can't discover via chat |

---

## 👥 Team Workstream Division

```
┌─────────────────────────────────────────────────────────────┐
│                    TEAM ASSIGNMENTS                          │
├───────────────────┬──────────────────┬───────────────────────┤
│   KUSH            │   RICKY          │   SANKET              │
│   Workstream A    │   Workstream B   │   Workstream C        │
│                   │                  │                       │
│  Creator Engine   │  Marketplace     │  Consumer Dashboard   │
│  & Builder Logic  │  & Payments      │  & Infrastructure     │
│                   │                  │                       │
│  "Build & Sell"   │  "Discover &     │  "Deploy & Measure"   │
│                   │   Transact"      │                       │
└───────────────────┴──────────────────┴───────────────────────┘
```

---

## 🔧 WORKSTREAM A — Creator Engine & Builder (Kush)

> **Goal:** Make the builder production-grade so creators can build, test, version, and publish automation products.

### Phase 1: Foundation (Week 1–2)

#### A1. Builder Robustness & UX Polish
- [ ] **Undo/Redo system** — Implement a history stack for node/edge operations (`Ctrl+Z`, `Ctrl+Y`)
- [ ] **Copy/Paste nodes** — Allow duplicating node configurations
- [ ] **Minimap & zoom controls** — Better navigation for complex workflows
- [ ] **Auto-layout** — Button to auto-arrange nodes using dagre/ELK algorithm
- [ ] **Keyboard shortcuts** — Delete, Select All, Save (`Ctrl+S`) bindings
- [ ] **Canvas comments/notes** — Sticky notes for documenting workflow sections

#### A2. Workflow Versioning
- [ ] **Version table** in DB (`workflow_versions`)
- [ ] **Auto-save drafts** every 30 seconds
- [ ] **Manual version snapshots** — "Save Version" button with version name
- [ ] **Version history panel** — View & rollback to any past version
- [ ] **Diff view** — Visual comparison between two versions (optional stretch)

> [!IMPORTANT]
> Versioning is critical before marketplace launch. A creator updating a workflow should NOT break it for existing consumers.

#### A3. Workflow Testing Suite
- [ ] **Test with sample data** — Mock trigger payloads for each trigger type
- [ ] **Node-level testing** — Right-click → "Test this node" with sample input
- [ ] **Step-through debugger** — Execute one node at a time, inspect outputs
- [ ] **Test data profiles** — Save & reuse test configurations
- [ ] **Error boundary per node** — Graceful handling, no full-workflow crash

### Phase 2: Creator Tools (Week 3–4)

#### A4. Publishing Flow (Connect to Real DB)
- [ ] **Refactor `PublishingPanel.tsx`** to write to `marketplace_listings` table
- [ ] **Listing metadata form** — Category, tags, screenshots, demo video URL
- [ ] **Pricing tiers** — Free, One-time, Monthly subscription, Usage-based
- [ ] **Required integrations spec** — Auto-detect which API keys the consumer needs
- [ ] **Listing preview** — "See how buyers will see your listing" modal
- [ ] **Status flow**: Draft → In Review → Published → Archived

#### A5. Creator Dashboard (Connect to Real DB)
- [ ] **Real revenue tracking** — Query `purchases` table, aggregate by creator
- [ ] **Active subscriber count** — Count unique consumers running your workflows
- [ ] **Revenue charts** — Line chart (recharts/nivo) for daily/weekly/monthly revenue
- [ ] **Top listings table** — Sort by revenue, rating, active users
- [ ] **Workflow execution counts** — How many times each workflow has run
- [ ] **Notification center** — New purchase, new review, workflow failure alert

#### A6. Creator Lead Management
- [ ] **Lead inbox** — See incoming custom requests from consumers
- [ ] **AI-powered lead scoring** — Tag as Hot / Warm / Custom Request
- [ ] **Status tracking** — New → Contacted → Converted → Closed
- [ ] **Quick reply** — Respond to leads from dashboard

### Phase 3: Advanced Builder (Week 5–6)

#### A7. New Node Types
- [ ] **Sub-workflow node** — Embed one workflow inside another
- [ ] **Delay / Timer node** — Wait N seconds/minutes between steps
- [ ] **Switch/Router node** — Route data to different paths based on conditions (like a multi-branch IF)
- [ ] **Batch/Map node** — Process arrays of data item-by-item (beyond current Loop)
- [ ] **Error Handler node** — Catch errors from upstream nodes, define fallback logic
- [ ] **Human Approval node** — Pause workflow, send notification, wait for manual approval

#### A8. Template Library
- [ ] **Starter templates** — Pre-built workflows creators can fork
- [ ] **Template categories** — Lead Gen, Social, E-commerce, SaaS
- [ ] **"Use This Template" flow** — Clone into builder with one click

### 🚫 What NOT to Build (Creator Side)

| Feature | Why Not |
|---------|---------|
| Multi-user collaborative editing | Complexity too high for MVP. Single-creator per workflow |
| Custom code node (JS sandbox) | Security risk. Defer to post-launch |
| Self-hosted deployment option | Focus on managed platform first |
| Mobile builder | Desktop-first for production workflows |

---

## 🛒 WORKSTREAM B — Marketplace & Payments (Ricky)

> **Goal:** Build a real, functional marketplace where automations can be discovered, purchased, and monetized.

### Phase 1: Foundation (Week 1–2)

#### B1. Dynamic Marketplace (Connect to Real DB)
- [ ] **Refactor `marketplace/page.tsx`** — Remove hardcoded listings, fetch from `marketplace_listings` table
- [ ] **Listing card component** — Reusable card with real data (title, price, rating, installs, creator avatar)
- [ ] **Server-side data fetching** — Use Supabase server client in Server Components
- [ ] **Category filtering** — Query with `WHERE category = ?`
- [ ] **Search** — Full-text search on title + description using Supabase `ilike` or `tsvector`
- [ ] **Sorting** — By price, rating, popularity (usage_count), newest
- [ ] **Pagination** — Cursor-based or offset pagination (12 per page)
- [ ] **Tag filtering** — Click on a tag to filter listings

#### B2. Listing Detail Page (Real Data)
- [ ] **Refactor `marketplace/[id]/page.tsx`** — Fetch real listing + workflow metadata
- [ ] **Creator profile section** — Avatar, name, bio, total listings
- [ ] **Integration requirements** — Show which API keys the buyer needs (auto-detected from workflow nodes)
- [ ] **Screenshots / demo carousel** — Image gallery of the automation in action
- [ ] **"Estimated ROI" section** — AI-generated estimate based on automation type
- [ ] **Installation count & rating breakdown** — Star distribution chart
- [ ] **Questions & Reviews section** — User reviews with rating + comment

#### B3. Review & Rating System
- [ ] **Submit review form** — Star rating (1–5) + comment
- [ ] **Only purchasers can review** — Check `purchases` table before allowing
- [ ] **Average rating recalculation** — Trigger/function to update `marketplace_listings.rating_avg`
- [ ] **Helpful votes on reviews** — "Was this helpful?" (optional, Phase 3)

### Phase 2: Payments (Week 3–4)

#### B4. Payment Integration (Razorpay / Stripe)

> [!TIP]
> **Razorpay** is simpler for India-based transactions and UPI. **Stripe** is needed if you want international payments. Consider starting with Razorpay and adding Stripe later.

- [ ] **Payment gateway setup** — Razorpay checkout integration
- [ ] **Checkout flow**: Click "Buy Now" → Payment modal → On success, create `purchase` record
- [ ] **Payment verification** — Server-side verification of payment signature
- [ ] **Receipt generation** — Post-purchase email/toast with receipt details
- [ ] **Refund flow** — Admin-triggered refund within 7 days

##### New DB Tables Required:
```sql
-- Payment transactions
CREATE TABLE public.payment_transactions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id     uuid REFERENCES public.purchases(id),
    buyer_id        uuid REFERENCES public.profiles(id),
    seller_id       uuid REFERENCES public.profiles(id),
    amount          int NOT NULL,
    currency        text NOT NULL DEFAULT 'INR',
    gateway         text NOT NULL DEFAULT 'razorpay',
    gateway_order_id    text,
    gateway_payment_id  text,
    gateway_signature   text,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','completed','failed','refunded')),
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Subscription plans
CREATE TABLE public.subscription_plans (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  uuid REFERENCES public.marketplace_listings(id),
    name        text NOT NULL,
    price       int NOT NULL,
    currency    text NOT NULL DEFAULT 'INR',
    interval    text NOT NULL DEFAULT 'monthly'
                CHECK (interval IN ('monthly','yearly','one_time')),
    features    jsonb DEFAULT '[]',
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Active subscriptions
CREATE TABLE public.subscriptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         uuid REFERENCES public.subscription_plans(id),
    buyer_id        uuid REFERENCES public.profiles(id),
    status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','cancelled','expired','past_due')),
    current_period_start  timestamptz,
    current_period_end    timestamptz,
    gateway_subscription_id text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
```

#### B5. Creator Payouts
- [ ] **Earnings tracking** — Calculate creator's share (e.g., 80% of sale price)
- [ ] **Platform fee** — 20% commission on each sale
- [ ] **Payout history page** — Creator can see pending vs. paid earnings
- [ ] **Payout API** — (Phase 3) Auto-transfer to creator's bank via Razorpay Route / Stripe Connect

#### B6. Pricing Models
- [ ] **Free listings** — Fully free automations (good for creator discoverability)
- [ ] **One-time purchase** — Pay once, use forever
- [ ] **Monthly subscription** — Recurring billing via Razorpay Subscriptions
- [ ] **Usage-based** (Stretch) — Pay per workflow execution (e.g., $0.01 per run)

### Phase 3: Discovery & AI (Week 5–6)

#### B7. AI-Powered Discovery
- [ ] **AI chat widget on marketplace** — "What do you want to automate?" → AI recommends listings
- [ ] **Semantic search** — Use embeddings (Gemini/OpenAI) to match user intent to listings
- [ ] **"Similar Automations"** — Recommendations on listing detail page
- [ ] **Trending / Featured section** — Curated homepage section

#### B8. Marketplace Admin Panel
- [ ] **Listing moderation** — Admin review queue before publishing
- [ ] **Report/flag system** — Users can report low-quality or malicious listings
- [ ] **Platform analytics** — Total GMV, active listings, top categories
- [ ] **Creator verification** — Badge system for verified creators

### 🚫 What NOT to Build (Marketplace Side)

| Feature | Why Not |
|---------|---------|
| Auction-style pricing | Too complex, fixed pricing is fine for MVP |
| Multi-currency support | Start with INR (or USD), add later |
| Affiliate program | Post-launch feature |
| NFT-based ownership | Unnecessary complexity |

---

## 📊 WORKSTREAM C — Consumer Dashboard & Infrastructure (Sanket)

> **Goal:** After a consumer purchases an automation, they need a CRM-like dashboard to connect their accounts, see live results, and measure ROI.

### Phase 1: Foundation (Week 1–2)

#### C1. Consumer "My Automations" (Connect to Real DB)
- [x] **Refactor `my-automations/page.tsx`** — Fetch from `purchases` + `marketplace_listings` joined data
- [x] **Purchase flow integration** — After Ricky's payment goes through, record appears here
- [x] **Automation card** — Shows name, status (active/paused/error), last run, total runs
- [x] **Quick actions** — Play / Pause / Config / Logs buttons per automation
- [x] **Status indicators** — Real-time badge: 🟢 Active, 🟡 Paused, 🔴 Error, ⚪ Setup Required

#### C2. Consumer Onboarding — API Key Setup
- [x] **Per-automation setup wizard** — Click "Setup" → Step-by-step API key entry
- [x] **Auto-detect required keys** — Read the workflow's node configs to know which keys are needed
- [x] **Secure key storage** — Store encrypted in Supabase `consumer_credentials` table (use Supabase Vault)
- [x] **Key validation** — Test the API key before saving (ping the API endpoint)
- [x] **Connection status badges** — ✅ Connected / ❌ Not Connected per integration

##### New DB Table:
```sql
CREATE TABLE public.consumer_instances (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id     uuid REFERENCES public.purchases(id),
    buyer_id        uuid REFERENCES public.profiles(id),
    workflow_id     uuid REFERENCES public.workflows(id),
    listing_id      uuid REFERENCES public.marketplace_listings(id),
    status          text NOT NULL DEFAULT 'setup_required'
                    CHECK (status IN ('setup_required','active','paused','error')),
    credentials     jsonb DEFAULT '{}',   -- encrypted API keys
    custom_config   jsonb DEFAULT '{}',   -- user overrides
    last_run_at     timestamptz,
    total_runs      int DEFAULT 0,
    total_successes int DEFAULT 0,
    total_failures  int DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.consumer_run_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     uuid REFERENCES public.consumer_instances(id),
    status          text NOT NULL CHECK (status IN ('success','failed')),
    duration_ms     int,
    input_summary   text,
    output_summary  text,
    error           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
```

#### C3. Instance Isolation — Workflow Execution per Consumer

> [!IMPORTANT]
> This is the most critical infrastructure piece. Each consumer must have their own isolated execution context (their own API keys, their own trigger endpoints, their own logs).

- [x] **Instance runner** — Modify `WorkflowRunner` to accept a `consumer_instance_id` and inject that consumer's credentials
- [ ] **Per-instance triggers** — Each consumer gets their own webhook URL: `/api/webhooks/instance/[instanceId]`
- [ ] **Per-instance cron** — Consumer's scheduled workflows run independently
- [ ] **Per-instance Telegram bots** — Each consumer registers their own bot token
- [x] **Execution isolation** — Consumer A's failure doesn't affect Consumer B

### Phase 2: Consumer CRM Dashboard (Week 3–4)

#### C4. Live Activity Feed
- [x] **Real-time log stream** — Use Supabase Realtime or SSE (Server-Sent Events) for live updates
- [x] **Log entry component** — Timestamp, node name, status, input/output preview
- [x] **Expandable log detail** — Click to see full input/output JSON
- [x] **Filter by status** — Success / Failed / All
- [ ] **Filter by date range** — Today, Last 7 days, Custom

#### C5. ROI & Business Analytics Dashboard

> [!TIP]
> This is AION's killer differentiator. Unlike n8n/Make which show "workflow ran successfully", AION shows "this automation generated 47 leads worth ₹2.3L this week."

- [x] **Leads generated counter** — Track leads captured by lead-gen automations
- [x] **Revenue attributed** — Link automation outputs to business value
- [x] **Success rate** — Pie chart: successful vs failed runs
- [ ] **Time saved metric** — Calculate hours saved based on task duration estimates
- [ ] **ROI calculator** — (Subscription cost vs. value generated)
- [ ] **Weekly email digest** — Summary of automation performance

##### Analytics Schema:
```sql
CREATE TABLE public.consumer_analytics (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     uuid REFERENCES public.consumer_instances(id),
    metric_type     text NOT NULL
                    CHECK (metric_type IN ('lead','revenue','task','custom')),
    metric_value    float NOT NULL,
    metric_label    text,
    metadata        jsonb DEFAULT '{}',
    recorded_at     timestamptz NOT NULL DEFAULT now()
);
```

#### C6. Notification & Alert System
- [x] **Failure alerts** — Toast + email when a workflow fails
- [x] **Daily summary** — "Your automations ran 142 times today. 3 errors."
- [x] **Threshold alerts** — "Your API quota is at 90%"
- [x] **Notification preferences** — Email, in-app, or both

### Phase 3: Advanced Consumer Features (Week 5–6)

#### C7. Consumer Customization
- [ ] **Config overrides** — Let consumers tweak non-critical settings (e.g., email subject line templates)
- [ ] **Custom schedule** — Override the default cron schedule
- [ ] **Output routing** — "Send results to my Slack / Email / Google Sheet instead"
- [ ] **Branding options** — For white-label outputs (optional)

#### C8. Multi-Instance Management
- [ ] **Bulk actions** — Pause/resume all automations
- [ ] **Grouped view** — Group automations by category/creator
- [ ] **Comparison view** — Compare performance of two automations side-by-side
- [ ] **Export data** — CSV/PDF export of logs and analytics

### 🚫 What NOT to Build (Consumer Side)

| Feature | Why Not |
|---------|---------|
| Consumer editing of workflow logic | They bought a product, not a builder. Keep it simple |
| Multi-tenant team accounts | Defer to enterprise phase |
| Mobile app | Responsive web is enough for now |
| Custom integrations added by consumers | Too risky. Only use what creator defined |

---

## 🗄 Shared Database Schema Additions

These tables are needed across workstreams. Coordinate to avoid conflicts.

```sql
-- ─── Workflow Versions (Kush) ──────────────────────────────
CREATE TABLE public.workflow_versions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id uuid REFERENCES public.workflows(id) ON DELETE CASCADE,
    version     int NOT NULL,
    name        text,
    nodes       jsonb NOT NULL,
    edges       jsonb NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Consumer Instances (Sanket) ───────────────────────────
-- (See Workstream C above for full schema)

-- ─── Payment Transactions (Ricky) ──────────────────────────
-- (See Workstream B above for full schema)

-- ─── Subscriptions (Ricky) ─────────────────────────────────
-- (See Workstream B above for full schema)

-- ─── Consumer Analytics (Sanket) ───────────────────────────
-- (See Workstream C above for full schema)

-- ─── Lead Requests (Kush) ──────────────────────────────────
CREATE TABLE public.lead_requests (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id  uuid REFERENCES public.profiles(id),
    consumer_id uuid REFERENCES public.profiles(id),
    listing_id  uuid REFERENCES public.marketplace_listings(id),
    message     text NOT NULL,
    status      text NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','contacted','converted','closed')),
    priority    text DEFAULT 'warm'
                CHECK (priority IN ('hot','warm','custom')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Notifications (Sanket) ────────────────────────────────
CREATE TABLE public.notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES public.profiles(id),
    type        text NOT NULL,
    title       text NOT NULL,
    message     text,
    read        boolean DEFAULT false,
    metadata    jsonb DEFAULT '{}',
    created_at  timestamptz NOT NULL DEFAULT now()
);
```

---

## 📅 Development Phases & Timeline

### Phase 1 — Foundation (Week 1–2)
> **Theme:** "Connect everything to real data"

| Person | Focus | Key Deliverable |
|--------|-------|----------------|
| **Kush** | Builder polish + Versioning | Undo/redo, auto-save, version snapshots |
| **Ricky** | Dynamic marketplace + Search | Real listings from DB, search, filter, pagination |
| **Sanket** | Consumer instances + API key setup | Purchase → Instance creation, key storage |

### Phase 2 — Core Features (Week 3–4)
> **Theme:** "Make money flow"

| Person | Focus | Key Deliverable |
|--------|-------|----------------|
| **Kush** | Publishing flow + Creator dashboard (real data) | Publish to marketplace, real revenue stats |
| **Ricky** | Payment integration (Razorpay) + Subscriptions | Buy button works, money is collected |
| **Sanket** | Consumer CRM dashboard + Live logs | ROI analytics, real-time activity feed |

### Phase 3 — Scale & Polish (Week 5–6)
> **Theme:** "Delight users"

| Person | Focus | Key Deliverable |
|--------|-------|----------------|
| **Kush** | Advanced nodes + Templates | Sub-workflows, delay nodes, template library |
| **Ricky** | AI discovery + Admin panel | Chat-based search, listing moderation |
| **Sanket** | Notifications + Consumer customization | Alerts, config overrides, export data |

### Phase 4 — Launch Prep (Week 7)
> **Theme:** "Ship it!"

| Task | Owner |
|------|-------|
| End-to-end testing (Creator builds → Publishes → Consumer buys → Runs) | All |
| Performance optimization (lazy loading, code splitting) | Kush |
| Seed marketplace with 5–10 real automations | All |
| Landing page / marketing site | Ricky |
| Deploy to Vercel production | Sanket |
| Demo video recording | All |

---

## 🌿 Git Branching Strategy

```
main ─────────────────────────────────────────────────▶ (Production)
  │
  ├── kush/builder-undo-redo
  ├── kush/workflow-versioning
  ├── kush/publishing-flow
  │
  ├── ricky/dynamic-marketplace
  ├── ricky/payment-razorpay
  ├── ricky/ai-discovery
  │
  ├── sanket/consumer-instances
  ├── sanket/crm-dashboard
  └── sanket/notifications
```

> [!WARNING]
> **Rules:**
> 1. Never push directly to `main`. Always create a feature branch.
> 2. Name branches as `yourname/feature-name`.
> 3. Pull from `main` before creating a new branch.
> 4. When done, create a Pull Request. Another team member reviews before merging.
> 5. If you're touching shared files (`types/index.ts`, `schema.sql`, `runner.ts`), **communicate first** in the group chat.

### Shared Files — Coordination Required

| File | Touched By | Rule |
|------|-----------|------|
| `types/index.ts` | All | Add new interfaces at the bottom. Don't modify existing ones without sync |
| `supabase/schema.sql` | All | Add new tables in separate migration files |
| `lib/workflow/runner.ts` | Kush + Sanket | Kush owns the core. Sanket extends for consumer isolation |
| `lib/workflow/integrations/registry.ts` | Kush | Only Kush adds new integrations |
| `app/(dashboard)/layout.tsx` | All | Add sidebar items via PR, don't conflict |

---

## 🔮 Future Scope & Stretch Goals

### Near-Term (Post-Launch, Month 2–3)

| Feature | Description | Value |
|---------|-------------|-------|
| **White-label outputs** | Consumers can brand automation outputs with their logo | Premium upsell |
| **Workflow marketplace analytics** | Public stats page like "Top trending automations" | Increases trust |
| **Creator certification program** | Verified badge for top creators | Quality signal |
| **API access for consumers** | REST API to trigger automations programmatically | Developer appeal |
| **Team/Org accounts** | Multiple users under one consumer account | Enterprise readiness |

### Mid-Term (Month 4–6)

| Feature | Description | Value |
|---------|-------------|-------|
| **Workflow composition** | Consumers chain multiple purchased automations | Power users |
| **Custom integration requests** | Consumer requests a node → Creator builds it | Marketplace flywheel |
| **Multi-language AI agents** | Onboarding in Hindi, Spanish, etc. | International expansion |
| **Webhook → Workflow marketplace** | "Connect your Shopify" → auto-recommend automations | Viral growth |
| **Mobile companion app** | View logs, pause/resume from phone | Convenience |

### Long-Term (Month 6+)

| Feature | Description | Value |
|---------|-------------|-------|
| **Self-hosted enterprise** | On-prem deployment for large companies | Enterprise revenue |
| **Workflow AI builder** | "Build me an automation that..." → AI generates the workflow | Next-level UX |
| **Marketplace for integrations** | Third-party devs can contribute integration nodes | Platform ecosystem |
| **Real-time collaboration** | Multiple creators working on one workflow | Team productivity |

---

## 📌 Quick Reference — API Routes Needed

| Route | Method | Owner | Purpose |
|-------|--------|-------|---------|
| `/api/marketplace/listings` | GET | Ricky | Fetch listings with filters |
| `/api/marketplace/listings/[id]` | GET | Ricky | Single listing detail |
| `/api/marketplace/listings` | POST | Kush | Creator publishes a listing |
| `/api/marketplace/listings/[id]/reviews` | GET/POST | Ricky | Reviews CRUD |
| `/api/payments/create-order` | POST | Ricky | Create Razorpay order |
| `/api/payments/verify` | POST | Ricky | Verify payment signature |
| `/api/consumer/instances` | GET | Sanket | List consumer's active instances |
| `/api/consumer/instances/[id]/setup` | POST | Sanket | Store API keys for instance |
| `/api/consumer/instances/[id]/logs` | GET | Sanket | Fetch run logs |
| `/api/consumer/instances/[id]/analytics` | GET | Sanket | Fetch ROI metrics |
| `/api/consumer/instances/[id]/toggle` | POST | Sanket | Pause/resume instance |
| `/api/creator/dashboard` | GET | Kush | Creator analytics data |
| `/api/creator/leads` | GET | Kush | Lead inbox data |
| `/api/webhooks/instance/[instanceId]` | POST | Sanket | Per-consumer webhook trigger |
| `/api/notifications` | GET | Sanket | User notifications |

---

> [!NOTE]
> **This plan is a living document.** Update it as you make progress. Check off tasks, add new ones, and communicate blockers in your team chat. The key is to parallelise work across the three workstreams while being careful about shared infrastructure files.

**Let's build AION. 🚀**
