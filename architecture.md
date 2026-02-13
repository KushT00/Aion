# AION System Architecture

AION is built on a serverless-first, edge-ready tech stack optimized for low latency and high scalability.

## 1. Frontend: Next.js + Tailwind CSS
- **Framework**: Next.js (App Router).
- **Styling**: Tailwind CSS + Shadcn UI.
- **Workflow UI**: React Flow for the visual graph editor.
- **State Management**: Zustand for builder state, TanStack Query for server data.

## 2. Backend & Data: Supabase
- **Authentication**: Supabase Auth (Email, OAuth).
- **Database**: PostgreSQL with Row Level Security (RLS) for multi-tenancy.
- **Realtime**: Supabase Channels for streaming workflow execution logs to the UI.
- **Storage**: Supabase Storage for assets and user-uploaded files.

## 3. Execution Engine: Supabase Edge Functions
- **Runtime**: Deno (deployed via Supabase Edge Functions).
- **Role**: Interprets the JSON DAG and coordinates API calls.
- **Isolation**: Each run is a stateless function call.
- **Scaling**: Massive parallelism by default.

## 4. Third-Party Services
- **Stripe**: Payments, Wallet balance, and Creator payouts.
- **AI Gateways**: Direct connection to OpenAI, Gemini, Groq, and Cerebras.
- **Upstash (Optional)**: Redis for global rate limiting and caching.

## 5. Security Model
- **Credential Safety**: User API keys are stored in a dedicated schema with Postgres Vault or similar encryption.
- **Execution Sandbox**: Nodes only have access to their own inputs and defined environment variables.
- **RLS**: Ensures data isolation—Creators cannot see client run data unless authorized.

## 6. Development Workflow
- **Monorepo-like**: `/app` for UI, `/supabase/functions` for logic.
- **CI/CD**: GitHub Actions for deploying Next.js to Vercel and functions to Supabase.
