# AION — Intelligent Workflow Platform

A modern SaaS platform where developers create, share, and sell intelligent workflow-based digital workers. Built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Stats cards, recent activity feed, quick actions |
| **Workflow Builder** | Visual drag-and-drop canvas (React Flow) with 5 node types |
| **Marketplace** | Browse, search, and discover community workflows |
| **My Workflows** | Create, edit, publish, and manage your own workflows |
| **Runs** | Execution history with status badges and expandable logs |
| **Auth** | Supabase Auth with email/password + Google OAuth |
| **Theming** | Light / Dark / System with localStorage persistence |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+
- A **Supabase** project (free tier works)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

The `.env.local` file is already created with your Supabase credentials. Verify it contains:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Set up the database

1. Open your **Supabase Dashboard** → **SQL Editor**
2. Paste and run `supabase/schema.sql`
3. (Optional) Paste and run `supabase/seed.sql` after replacing `YOUR_USER_ID`

### 4. Configure Google OAuth (optional)

1. In Supabase Dashboard → **Authentication** → **Providers** → Enable **Google**
2. Add your Google OAuth Client ID and Secret
3. Set the redirect URL to: `http://localhost:3000/auth/callback`

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## 📁 Project Structure

```
app/
├── (auth)/           # Login, Signup, Forgot Password
├── (dashboard)/      # Dashboard shell with sidebar
│   ├── dashboard/    # Main dashboard page
│   ├── workflows/    # My Workflows
│   ├── builder/      # Visual Workflow Builder
│   ├── marketplace/  # Community Marketplace
│   ├── runs/         # Execution History
│   ├── profile/      # User Profile
│   └── settings/     # App Settings
├── auth/callback/    # OAuth callback handler
└── layout.tsx        # Root layout

components/
├── layout/           # Sidebar, Topbar
├── ui/               # Button, Card, Input, Badge, etc.
├── theme-provider.tsx
└── theme-toggle.tsx

hooks/                # useAuth, useWorkflows
lib/
├── supabase/         # Client, Server, Middleware helpers
└── utils.ts          # cn(), formatDate, etc.
types/                # TypeScript interfaces
supabase/             # SQL schema + seed
```

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (Auth, Database, Storage)
- **Canvas**: React Flow (@xyflow/react)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Toasts**: react-hot-toast

---

## 📄 License

MIT
