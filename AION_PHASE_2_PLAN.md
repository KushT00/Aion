# AION Digital Worker Economy: Phase 2 Upgrade Plan

This document outlines the architectural design and implementation plan for the three core pillars of AION's next evolution: **Business Intelligence (CRM)**, **Conversational Intake (Forms)**, and **Data Harvesting (Scraping)**.

---

## 🏛️ Pillar 1: High-Fidelity Business Intelligence (CRM)
**Goal:** Transform technical execution logs into a personalized "Automation Insights" dashboard for the buyer.

### 1.1 Architecture
The system uses the `consumer_results` table in Supabase to store "Captured Intelligence."
- **Data Model:**
  - `instance_id`: Link to the user's specific worker.
  - `result_type`: Classification (e.g., `lead`, `proposal`, `data_point`, `task`).
  - `title`: Human-readable summary of the achievement.
  - `data`: JSONB object containing the actual payload.
  - `status`: Lifecycle (e.g., `new`, `contacted`, `converted`).

### 1.2 New Nodes to Implement
- **Lead Capture Node:** Specifically designed to flag a successful outreach or discovery as a "Lead."
- **ROI Calculator Node:** Allows creators to assign a dollar value to a specific step (e.g., "This email send is worth $2").
- **Insight Stream Node:** A generic node to push any data fragment to the "Captured Intelligence" tab on the client dashboard.

---

## 📋 Pillar 2: Conversational Intake (Aion Forms)
**Goal:** Provide an on-platform and embeddable Way to trigger workflows via structured input.

### 2.1 The "Form Trigger" Node
Instead of a raw Webhook, creators use the **Form Trigger** node.
- **On-Platform Form:** Every deployed instance gets a unique `/form/[instance_id]` URL with a UI generated based on the node's configuration.
- **Customizable Embed:** Provide a "Get Code" button that gives the user a React/HTML snippet.
  - **Dynamic Styling:** Allow users to pass `css` or `theme` params to the embed script.
  - **Secure Submission:** Submissions go directly to `/api/v1/trigger/[instanceId]` with a `form_id` header.

### 2.2 Functional Design
- **Schema Mapping:** The Form Trigger node defines the fields (e.g., `Full Name`, `Budget`, `Requirements`).
- **Validation:** Built-in client-side validation before the workflow even starts.
- **Success States:** Definable "Thank You" messages or redirects after submission.

---

## 🕸️ Pillar 3: Data Harvesting & Structurization
**Goal:** Empower workflows to find, read, and understand the web.

### 3.1 Web Scraper Node (Firecrawl Integration)
- **Crawl & Scrape:** Convert any URL into AI-ready Markdown.
- **Proxy Handling:** Automatically bypass "bot detection" to ensure reliable data flow.
- **Recursive Crawling:** Allow the agent to "Find all sub-pages about Pricing" and scrape them.

### 3.2 PDF & Document Parser
- **Structured Extraction:** Specialized logic to handle complex PDFs, Word Docs, and Powerpoints (using the existing `officeparser` & `pdfjs` implementation in the registry).

### 3.3 Data Structurizer (The Parser)
- **AI-Led Mapping:** Use a small LLM (e.g., Gemini Flash) to take raw scraped text and map it into a clean JSON schema defined by the creator.

---

## 🚀 Priority & Sequence

1.  **Phase 2.1: Data Harvesting**
    - Implement `Scraper` node in `lib/workflow/integrations/registry.ts`.
    - Add `Scraper` config UI in `components/workflow/NodeConfigs.tsx`.
2.  **Phase 2.2: Conversational Intake**
    - Build the `/app/form/[id]` dynamic page for on-platform forms.
    - Implement the "Form Trigger" node in the builder.
    - Create the "Embed Code" generator.
3.  **Phase 2.3: BI Integration**
    - Enhance `CRMCapture` node to support dynamic "Dashboard Categories."
    - Update the `/instance/[id]` dashboard to display segmented data (Leads vs. Tasks vs. ROI).

---

> [!IMPORTANT]
> This plan ensures that AION remains an **App Layer** on top of automation. We are not just moving data; we are capturing value, simplifying input, and harvesting intelligence.
