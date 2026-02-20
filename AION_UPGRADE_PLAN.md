# 🚀 AION — Enhancement Roadmap (n8n Level & Beyond)

> **Status Legend:** ✅ Done | 🔨 In Progress | 🔲 Planned

---

## 🎯 PHASE 1 — Advanced Builder UX (Manual Workflow Mode)
*Goal: Make the builder as powerful as n8n with better UX*

### 1.1 — Google OAuth "One-Click Connect" (Instead of Manual Tokens)
**Priority: HIGH** — This is the biggest UX pain point right now.

- [x] ✅ Current: User manually pastes OAuth2 tokens (horrible UX)
- [ ] 🔲 Add Google OAuth Provider to Supabase Auth (Google scope: calendar, gmail, drive)
- [ ] 🔲 Create `/api/auth/google/connect` route that stores tokens in `user_integrations` table
- [ ] 🔲 Show "Connect Google Account" button in node config panel → popup OAuth flow
- [ ] 🔲 Auto-refresh tokens silently using stored `refresh_token`
- [ ] 🔲 Support disconnecting / reconnecting accounts

**Supabase Table needed: `user_integrations`**
```sql
create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  provider text not null, -- 'google', 'discord', 'notion', 'slack'
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  metadata jsonb,
  created_at timestamptz default now()
);
```

---

### 1.2 — Advanced AI Node (n8n Agent-style)
**Priority: HIGH**

- [ ] 🔲 **Tools Panel** on AI node: add tools that the AI can call (web search, code exec, etc.)
- [ ] 🔲 **Knowledge Base Panel**: upload/reference documents, PDFs, URLs
- [ ] 🔲 **Memory**: short-term (within run), long-term (vector DB via Supabase pgvector)
- [ ] 🔲 **Streaming output**: stream tokens to console in real-time
- [ ] 🔲 **Function calling**: AI can call subsequent nodes as tools
- [ ] 🔲 **Multi-turn conversation**: maintain chat history across nodes

**New node sub-types:**
- `ai_agent` — Full autonomous agent with tools loop
- `ai_chat` — Simple chat completion (current)
- `ai_summarizer` — Specialized summarizer
- `ai_extractor` — Structured data extraction (JSON output)

---

### 1.3 — Multi-Handle Nodes (n8n style)
**Priority: HIGH**

Currently nodes have 1 input + 1 output. We need:
- [ ] 🔲 **Conditional branches**: IF node with `true` / `false` output handles
- [ ] 🔲 **Fan-out**: one node outputs to multiple downstream nodes
- [ ] 🔲 **Merge node**: combine multiple streams into one
- [ ] 🔲 **Loop node**: iterate over arrays (e.g. loop over emails)
- [ ] 🔲 **Error handle**: separate `onError` output path per node

---

### 1.4 — New Node Types to Add
**Priority: MEDIUM**

| Node | Integration | Status |
|------|------------|--------|
| Slack | Send message to channel | 🔲 |
| Notion | Create/update pages | 🔲 |
| Telegram | Send message via bot | 🔲 |
| Airtable | Read/write records | 🔲 |
| Google Sheets | Read/write cells | 🔲 |
| OpenRouter | Call any 300+ AI models | 🔲 |
| Code | Run JS/Python sandbox | 🔲 |
| Wait/Delay | Pause execution for N seconds | 🔲 |
| Set Variable | Assign data to named variables | 🔲 |
| Filter | Filter arrays by condition | 🔲 |
| Transform | Map/reshape data with JS | 🔲 |
| Webhook Response | Return custom HTTP response | 🔲 |

---

### 1.5 — Builder Quality of Life Improvements
**Priority: MEDIUM**

- [ ] 🔲 **Node search**: searchable node palette
- [ ] 🔲 **Node groups/folders**: group related nodes visually
- [ ] 🔲 **Sticky notes**: add comments/annotations to canvas
- [ ] 🔲 **Sub-workflow**: call another workflow as a node (composability)
- [ ] 🔲 **Auto-layout**: auto-arrange nodes in DAG order
- [ ] 🔲 **Version history**: see past saves, restore to checkpoint
- [ ] 🔲 **Live variable inspector**: hover a node to see real-time output
- [ ] 🔲 **Type-safe connections**: prevent connecting incompatible nodes

---

## 🎯 PHASE 2 — Execution Engine Improvements
*Goal: Make the runtime production-grade*

### 2.1 — Conditional / Branching Execution
- [ ] 🔲 IF/ELSE logic in runner (currently it's linear DAG only)
- [ ] 🔲 Loop execution (iterate over array items)
- [ ] 🔲 Error paths (node can have `onError` edge)

### 2.2 — Retry & Reliability
- [ ] 🔲 Exponential backoff on failed nodes (currently throws immediately)
- [ ] 🔲 Timeout per node (configurable, default 30s)
- [ ] 🔲 Max retries per node

### 2.3 — Better Run Logs
- [ ] 🔲 Per-node detailed logs with input + output stored in Supabase
- [ ] 🔲 Real-time log streaming via Supabase Realtime channels
- [ ] 🔲 Run comparison: diff two runs side-by-side

### 2.4 — Background Job Queue (Production)
- [ ] 🔲 Replace synchronous execution with Inngest / Upstash QStash
- [ ] 🔲 Proper async webhook handler with job ID tracking

---

## 🎯 PHASE 3 — AI Agent Builder Wrapper ⭐
*Goal: Wrap the entire builder with an AI that builds workflows for users*

### 3.1 — AI Workflow Generator
The AI agent takes a plain-English description like:
> "Every morning at 9am, fetch my unread Gmail emails, summarize them with Gemini, and post the summary to my #daily-digest Discord channel"

And auto-generates the full workflow DAG + node configs.

- [ ] 🔲 **Chat interface** on builder page: right-sidebar chat panel
- [ ] 🔲 **AI interprets intent** → maps to nodes + edges + config
- [ ] 🔲 **AI confirms with user**: "I'll create this workflow, does this look right?"
- [ ] 🔲 **One-click apply**: apply the AI-generated workflow to canvas

### 3.2 — Post-Generation Configuration Wizard
After AI generates the workflow:
- [ ] 🔲 Show only the "connection" prompts (connect Google, enter Discord webhook)
- [ ] 🔲 Skip all the technical config (AI fills it in)
- [ ] 🔲 Guided setup: "Step 1: Connect your Google account | Step 2: Pick a channel"

### 3.3 — Marketplace Template AI
- [ ] 🔲 User browses marketplace → clicks "Deploy with AI"
- [ ] 🔲 AI customizes the template to user's specific accounts/preferences
- [ ] 🔲 User just connects accounts and runs

---

## 🎯 PHASE 4 — Platform & AaaS Features
*Goal: Full Agent as a Service platform*

- [ ] 🔲 **API Keys**: users get API keys to trigger workflows programmatically
- [ ] 🔲 **Shareable run links**: share a run's output as a public URL  
- [ ] 🔲 **Billing**: credit-based system for AI token usage
- [ ] 🔲 **Team/Org**: share workflows across team members
- [ ] 🔲 **Embedded Agent**: iframe-embeddable chat widget that runs a workflow

---

## 📋 IMMEDIATE PRIORITY — What We're Building NOW

```
✅ STEP 1: Google OAuth Connect (One-click, no token paste)
   → Supabase table: user_integrations
   → New API route: /api/auth/google/connect, /api/auth/google/callback
   → Node config: shows "Connect Google" button, uses stored token transparently

✅ STEP 2: Advanced AI Node (Tools, Model, Memory config)
   → New custom node component with multiple ports/sections
   → Tools panel: toggle-able tools (web_search, code_exec, etc.)
   → KnowledgeBase panel: URL/text injection into system prompt

✅ STEP 3: IF/ELSE Conditional Node
   → Multi-handle node with true/false outputs
   → Visual branch paths on canvas
   → Runner supports conditional edge traversal

✅ STEP 4: More Integrations (Slack, Notion, Sheets, OpenRouter)
   → Add to registry.ts
   → Add configuration panels in builder
```

---

## 🏗️ Database Migrations Needed

```sql
-- 1. User Integrations (OAuth tokens store)
create table public.user_integrations ( ... );

-- 2. Workflow Variables (named variables per workflow)
create table public.workflow_variables ( ... );

-- 3. Node Run Logs (per-node granular logs)
alter table public.workflow_runs add column node_logs jsonb default '[]';
```
