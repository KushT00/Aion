# AION: Product Roadmap & Strategic Vision

AION is a creator-centric marketplace for monetizable digital workers (workflows), moving beyond simple automation to a decentralized intelligence economy.

## Phase 1: Workflow Execution Engine (Month 1)
**Objective:** Transition from visual-only builder to a functional execution runtime.

- [ ] **JSON Schema Definition**: Standardize the DAG (Directed Acyclic Graph) structure for nodes and edges.
- [ ] **Node Executor System**: Core runtime capable of processing logical, AI, and action nodes.
- [ ] **Async Support & Queuing**: Background execution using Supabase Edge Functions and a message queue.
- [ ] **Run History & Logging**: Real-time streaming of execution logs and status updates to Supabase.
- [ ] **Error Handling & Retries**: Robust recovery mechanisms for failed steps.

## Phase 2: Integrations Ecosystem (Month 2)
**Objective:** Enable AION to interact with the world through a pluggable connector system.

- [ ] **Connector SDK**: Standardized way to build new integrations.
- [ ] **Tier 1 Integrations**:
    - **Communication**: Slack, Discord, Telegram.
    - **Productivity**: Notion, Airtable, Google Sheets.
    - **AI**: OpenAI, Gemini, Groq, Cerebras.
- [ ] **Trigger System**: Webhooks, Cron schedules, and manual triggers.

## Phase 3: Marketplace & Creator Monetization (Month 3)
**Objective:** Turn workflows into assets.

- [ ] **Marketplace UI**: Discovery, searching, and filtering of workflows.
- [ ] **Creator Dashboard**: Detailed analytics on workflow usage and earnings.
- [ ] **Stripe Integration**: Pay-per-run billing, creator revenue sharing, and wallet management.
- [ ] **Workflow Publishing**: Metadata management (tags, descriptions, documentation) for published "Digital Workers."

## Phase 4: Advanced Features & UX Polish (Month 4+)
**Objective:** Scale and refine.

- [ ] **Visual Debugger**: Live step-by-step debugging in the builder.
- [ ] **Command Palette**: "Linear-style" navigation (Ctrl+K).
- [ ] **Enterprise Security**: RBAC (Role-Based Access Control) and audit logs.
- [ ] **Mobile Executor**: Run and monitor workflows on the go.
