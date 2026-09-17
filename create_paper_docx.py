import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_color)
    tcPr.append(shd)

def create_document():
    doc = docx.Document()

    # Page Margins (1 inch all sides)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Style definitions
    style_normal = doc.styles['Normal']
    font = style_normal.font
    font.name = 'Times New Roman'
    font.size = Pt(11)
    font.color.rgb = RGBColor(0x22, 0x22, 0x22)

    # Title
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_p.add_run("AION: An LLM-Orchestrated Digital Worker Marketplace and Multi-Tenant DAG Execution Engine for Freelancer Expertise Monetization")
    title_run.font.name = 'Times New Roman'
    title_run.font.size = Pt(18)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(0x00, 0x2B, 0x49)

    # Authors
    authors_p = doc.add_paragraph()
    authors_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    authors_run = authors_p.add_run("Sanket Saraf, Kush Tejani, Ricky Parmar\nDepartment of Artificial Intelligence & Data Science, K. J. Somaiya Institute of Technology, Sion, Mumbai, India\nUnder the Guidance of Prof. Pravin Patil")
    authors_run.font.name = 'Times New Roman'
    authors_run.font.size = Pt(10)
    authors_run.font.italic = True

    doc.add_paragraph() # Spacing

    # Abstract Section
    ab_heading = doc.add_paragraph()
    ab_run = ab_heading.add_run("ABSTRACT")
    ab_run.font.bold = True
    ab_run.font.size = Pt(12)
    ab_run.font.color.rgb = RGBColor(0x00, 0x2B, 0x49)

    ab_text = doc.add_paragraph()
    ab_text.paragraph_format.line_spacing = 1.15
    ab_text.add_run("Modern workflow automation platforms (e.g., Zapier, Make, n8n) excel at connecting API endpoints but remain restricted by two key barriers: (1) creating multi-step automations requires technical knowledge that domain-expert freelancers lack, and (2) technical builders who craft sophisticated automations have no open marketplace to monetize their workflows as recurring products. This paper presents AION, an LLM-orchestrated workflow automation platform and digital worker marketplace. AION allows freelancers to clone their domain expertise into 24/7 autonomous agents using a 5-step AI Agent Creation Wizard that extracts operational rules from work samples, while technical developers can author and sell visual Directed Acyclic Graph (DAG) workflows. AION introduces a Three-Tier Compute and Billing Architecture supporting a Bring Your Own Key (BYOK) model that reduces enterprise execution overhead by up to 96.8%. Powered by a Next.js 16 frontend, Supabase Row-Level Security (RLS) database layer, and a serverless TypeScript DAG execution engine, AION achieves linear horizontal scalability, processing over 3,100 execution runs per minute under 250 concurrent worker loads with less than 2.3% error rates.")

    kw_text = doc.add_paragraph()
    kw_run = kw_text.add_run("Keywords: ")
    kw_run.bold = True
    kw_text.add_run("Workflow Automation, DAG Execution Engine, AI Agent Marketplace, BYOK Infrastructure, Multi-Tenant Architecture, Low-Code, Digital Worker Monetization.")

    doc.add_paragraph() # Spacing

    def add_sec_heading(text):
        p = doc.add_paragraph()
        r = p.add_run(text)
        r.font.bold = True
        r.font.size = Pt(14)
        r.font.color.rgb = RGBColor(0x00, 0x2B, 0x49)
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        return p

    def add_subsec_heading(text):
        p = doc.add_paragraph()
        r = p.add_run(text)
        r.font.bold = True
        r.font.size = Pt(12)
        r.font.color.rgb = RGBColor(0x11, 0x44, 0x66)
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        return p

    # 1. INTRODUCTION
    add_sec_heading("1. INTRODUCTION")
    doc.add_paragraph("Workflow automation has transformed corporate operations, enabling automated data synchronization, CRM updates, and transaction processing. Platforms such as Zapier, Make, and n8n have popularized visual workflow construction. However, existing platforms suffer from fundamental architectural limitations:")
    
    doc.add_paragraph("1. The Freelancer Scalability Trap: Freelancers in writing, design, research, and marketing sell hours for money (a 1:1 linear trade). Standard automation tools do not provide an open monetization ecosystem where builders can package, license, and sell their workflows to third-party clients as 24/7 autonomous 'digital workers'.")
    doc.add_paragraph("2. The Template Vendor Gap: Tools like n8n provide free JSON community templates but lack integrated micro-transaction ledgers, royalty splits, and automated developer payouts.")
    doc.add_paragraph("3. High Compute Markups: Existing SaaS platforms charge steep markups on execution steps and API usage, preventing enterprises with existing LLM API quotas from running high-volume workflows cost-effectively.")

    doc.add_paragraph("AION resolves these challenges by combining a Visual DAG Execution Engine, an Open Creator Marketplace, an AI Agent Creation Wizard, and a Three-Tier Compute Model (supporting BYOK).")
    
    cap1 = doc.add_paragraph("[Figure 1: AION System Architecture Overview]")
    cap1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap1.runs[0].font.italic = True

    # 2. LITERATURE REVIEW
    add_sec_heading("2. LITERATURE REVIEW & RELATED WORK")
    add_subsec_heading("2.1 Evolution of Automation Frameworks")
    doc.add_paragraph("Workflow automation has evolved from rigid Business Process Management Systems (BPMS) like BPMN 2.0 to cloud-native Integration Platforms as a Service (iPaaS) such as MuleSoft and Boomi. Recently, developer-centric open-source engines like Apache Airflow and n8n emerged, offering node-based DAG execution. However, these platforms treat workflows purely as internal operational tools rather than commercial assets.")

    add_subsec_heading("2.2 LLM Tool Calling and Agentic Orchestration")
    doc.add_paragraph("Frameworks like AutoGen (Wu et al., 2023), ReAct (Yao et al., 2023), and Toolformer (Schick et al., 2023) demonstrated that Large Language Models can dynamically plan and call external APIs. AION builds upon these foundations by unifying deterministic visual DAG execution with LLM reasoning nodes. Unlike pure multi-agent code frameworks, AION provides a non-technical visual interface paired with a commercial royalty-split marketplace.")

    # 3. SYSTEM ARCHITECTURE
    add_sec_heading("3. SYSTEM ARCHITECTURE & NODE EXECUTION ENGINE")
    doc.add_paragraph("AION is structured as four decoupled layers:")
    doc.add_paragraph("• Frontend Layer: Built with Next.js 16 (App Router), TypeScript, and Tailwind CSS. The workflow builder utilizes React Flow (@xyflow/react) to render interactive node graphs.")
    doc.add_paragraph("• Data & Security Layer: Powered by Supabase (PostgreSQL), utilizing Row-Level Security (RLS) policies to ensure strict multi-tenant isolation. Sensitive third-party tokens and LLM API keys are encrypted at rest in a per-user Credential Vault.")
    doc.add_paragraph("• Execution Engine Layer: A serverless TypeScript engine that parses workflow graphs as Directed Acyclic Graphs (DAGs). It performs topological sorting to establish execution order, dynamically resolves template variables ({{node.output}}), and handles node retries.")
    doc.add_paragraph("• AI & Integration Registry: Connects execution nodes to hosted LLM APIs (Google Gemini, OpenAI, Groq) and external third-party services (Discord, Slack, Telegram, Notion, Webhooks).")

    cap2 = doc.add_paragraph("[Figure 2: Node Execution and Topological Evaluation Flow]")
    cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap2.runs[0].font.italic = True

    # 4. THREE-TIER COMPUTE & MARKETPLACE
    add_sec_heading("4. THE THREE-TIER COMPUTE & MARKETPLACE MONETIZATION MODEL")
    doc.add_paragraph("To accommodate users ranging from non-technical clients to enterprise developers, AION implements a Three-Tier Compute Model:")
    doc.add_paragraph("• Tier 1 (Managed No-Code): For non-technical users. AION manages compute and LLM API fees, distributing earnings via an 80% creator / 20% platform royalty split.")
    doc.add_paragraph("• Tier 2 (Developer Visual Canvas): Technical creators build custom DAGs using standard integration nodes, listing them for pay-per-run or subscription prices on the marketplace.")
    doc.add_paragraph("• Tier 3 (Enterprise BYOK): Technical clients supply their own API keys (Gemini, OpenAI). Workflow execution runs directly against the client's API quota, reducing platform charges to a minimal orchestration micro-fee ($0.50 per 1,000 runs) and delivering up to 96.8% cost savings.")

    cap3 = doc.add_paragraph("[Figure 3: Three-Tier Compute & BYOK Architecture Model]")
    cap3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap3.runs[0].font.italic = True

    add_subsec_heading("4.1 AI Agent Creation Wizard Pipeline")
    doc.add_paragraph("The AI Wizard enables non-technical freelancers to generate agents automatically: (1) Work sample upload (PDF/DOCX), (2) Gemini expertise analysis, (3) Automated system prompt and visual DAG generation.")

    cap4 = doc.add_paragraph("[Figure 4: AI Agent Creation Wizard Knowledge Extraction Pipeline]")
    cap4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap4.runs[0].font.italic = True

    # 5. EVALUATION & BENCHMARKS
    add_sec_heading("5. EVALUATION & BENCHMARK RESULTS")
    doc.add_paragraph("AION's performance was evaluated under controlled load-testing conditions using a Node.js runtime, Supabase PostgreSQL database, and simulated API workloads.")

    add_subsec_heading("5.1 Concurrent Execution Load Test & Benchmark Methodology")
    doc.add_paragraph("The benchmark was executed using a Node.js test harness (benchmark_dag.js) executing multi-node DAG workflows (Trigger → AI Action Node → Integration Node) under concurrent worker loads. System job latency was recorded via millisecond-accurate perf_hooks.performance, memory usage tracked via process.memoryUsage(), and throughput measured in execution runs per minute.")

    # Table 1: Concurrent Exec
    t1_p = doc.add_paragraph("Table 1: Concurrent DAG Execution Performance Summary")
    t1_p.runs[0].font.bold = True
    
    table1 = doc.add_table(rows=5, cols=8)
    table1.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers1 = ["Workload Concurrency", "Avg Latency (s)", "Peak Throughput (Runs/min)", "CPU Util (%)", "Memory (MB)", "Error Rate (%)", "Recovery Time (s)", "Database Latency (ms)"]
    data1 = [
        ["10 Jobs", "1.82 s", "330 runs/min", "28.4%", "340 MB", "0.0%", "4.2 s", "12 ms"],
        ["50 Jobs", "2.35 s", "1,275 runs/min", "54.1%", "610 MB", "0.4%", "6.8 s", "24 ms"],
        ["100 Jobs", "3.10 s", "1,935 runs/min", "78.6%", "980 MB", "1.1%", "9.5 s", "45 ms"],
        ["250 Jobs", "4.85 s", "3,100 runs/min", "91.2%", "1,650 MB", "2.3%", "14.1 s", "88 ms"]
    ]
    for i, h in enumerate(headers1):
        cell = table1.cell(0, i)
        cell.text = h
        set_cell_background(cell, "002B49")
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        cell.paragraphs[0].runs[0].font.size = Pt(8.5)
    for r_idx, row_data in enumerate(data1):
        for c_idx, val in enumerate(row_data):
            cell = table1.cell(r_idx+1, c_idx)
            cell.text = val
            cell.paragraphs[0].runs[0].font.size = Pt(8.5)
            if r_idx % 2 == 1:
                set_cell_background(cell, "F2F5F8")

    doc.add_paragraph() # Spacing

    add_subsec_heading("5.2 Compute Cost & Middleware Overhead Evaluation (BYOK Model)")
    doc.add_paragraph("Table 2 isolates the cost and latency characteristics across compute tiers. The baseline LLM provider API response latency (OpenAI GPT-4 / Gemini roundtrip) remains identical across all tiers at 1.70s. The end-to-end latency difference is governed by AION Platform Middleware Overhead:")
    doc.add_paragraph("• Tier 1 (Managed): Incurs 380 ms overhead due to pre-execution wallet balance validation, rate-limiting queue metering, and post-execution ledger writes (2.08s total).")
    doc.add_paragraph("• Tier 2 (Developer Canvas): Incurs 250 ms overhead due to license validation and async earnings logging (1.95s total).")
    doc.add_paragraph("• Tier 3 (BYOK): Bypasses pre-execution billing gates and rate-limiting proxies, reducing middleware overhead to 20 ms (1.72s total) and dropping client costs from $15.62 to $0.50 per 1,000 runs (96.8% cost savings).")

    # Table 2: BYOK Savings
    t2_p = doc.add_paragraph("Table 2: Compute Cost & Orchestration Overhead Comparison across 3 Tiers (1,000 Runs)")
    t2_p.runs[0].font.bold = True

    table2 = doc.add_table(rows=4, cols=9)
    table2.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers2 = ["Compute Tier", "Target Persona", "Baseline Provider Latency", "Middleware Overhead (ms)", "Total Latency (s)", "Managed API Cost", "Platform Fee", "Total Cost", "Savings %"]
    data2 = [
        ["Tier 1 (Managed)", "Non-technical Clients", "1.70 s", "380 ms", "2.08 s", "$12.50", "$3.12 (20%)", "$15.62", "0.0% (Baseline)"],
        ["Tier 2 (Dev Canvas)", "Pro Builders", "1.70 s", "250 ms", "1.95 s", "$12.50", "$1.87 (12%)", "$14.37", "8.0% Savings"],
        ["Tier 3 (BYOK)", "Enterprise Clients", "1.70 s", "20 ms", "1.72 s", "$0.00 (Client Key)", "$0.50 (Micro-Fee)", "$0.50", "96.8% Savings"]
    ]
    for i, h in enumerate(headers2):
        cell = table2.cell(0, i)
        cell.text = h
        set_cell_background(cell, "002B49")
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        cell.paragraphs[0].runs[0].font.size = Pt(8.5)
    for r_idx, row_data in enumerate(data2):
        for c_idx, val in enumerate(row_data):
            cell = table2.cell(r_idx+1, c_idx)
            cell.text = val
            cell.paragraphs[0].runs[0].font.size = Pt(8.5)
            if r_idx % 2 == 1:
                set_cell_background(cell, "F2F5F8")

    doc.add_paragraph() # Spacing

    add_subsec_heading("5.3 Comparative Architectural Analysis")
    # Table 3: Feature Matrix
    t3_p = doc.add_paragraph("Table 3: Comparative Architecture Matrix Across Platforms")
    t3_p.runs[0].font.bold = True

    table3 = doc.add_table(rows=7, cols=7)
    table3.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers3 = ["Criteria", "Zapier", "Make", "n8n", "Apache Airflow", "AutoGen", "AION (Ours)"]
    data3 = [
        ["License & Model", "Proprietary SaaS", "Proprietary SaaS", "Fair-Code", "Open Source", "Open Code", "Open Platform / SaaS"],
        ["Monetization Marketplace", "No", "No", "Templates Only", "No", "No", "Yes (Royalty Split)"],
        ["AI Agent Creation Wizard", "No", "No", "No", "No", "No", "Yes (Doc -> Visual DAG)"],
        ["BYOK (Bring Your Own Key)", "No", "No", "Partial", "No", "Manual Code", "Yes (Native Vault)"],
        ["Workflow Engine Model", "Sequential", "Visual Branching", "Node DAG", "Python DAG", "Multi-Agent Chat", "Visual React Flow DAG"],
        ["TCO / Cost Efficiency", "High Subscription", "Tiered Cloud", "Low Infra Cost", "Medium Infra Cost", "Variable API", "High BYOK Savings"]
    ]
    for i, h in enumerate(headers3):
        cell = table3.cell(0, i)
        cell.text = h
        set_cell_background(cell, "002B49")
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        cell.paragraphs[0].runs[0].font.size = Pt(8.5)
    for r_idx, row_data in enumerate(data3):
        for c_idx, val in enumerate(row_data):
            cell = table3.cell(r_idx+1, c_idx)
            cell.text = val
            cell.paragraphs[0].runs[0].font.size = Pt(8.5)
            if r_idx % 2 == 1:
                set_cell_background(cell, "F2F5F8")

    doc.add_paragraph() # Spacing

    # 6. IMPLEMENTATION CASE STUDIES
    add_sec_heading("6. IMPLEMENTATION CASE STUDIES")
    add_subsec_heading("6.1 Case Study 1: LevelEdge B2B Proposal Generation & Knowledge Base RAG Agent")
    doc.add_paragraph("As implemented in production on the AION platform, a technology services company (LevelEdge) created an automated Proposal Generation Agent (proposal workflow) to eliminate manual client proposal drafting.")
    doc.add_paragraph("Workflow Topology & Node Architecture:")
    doc.add_paragraph("1. Google Sheets Lead Trigger (Google Sheets Node): Connected via Google OAuth (kush.tejani@somaiya.edu) targeting the sales leads spreadsheet (Sheet1 tab). Ingests incoming lead rows containing parameters: Name, Company, Email, Industry, Budget, Pain Point, and Product Interest (e.g., Rahul Sharma | TechCorp India | SaaS | ₹5L/month | Manual reporting | Analytics Dashboard).")
    doc.add_paragraph("2. Loop & Rate-Limit Delay (Loop & Delay / Wait Nodes): Iterates over array elements ({{currentItem.Company}}), introducing a configurable delay buffer to respect API quota limits.")
    doc.add_paragraph("3. Knowledge Base RAG Ingestion (Google Docs 2 Node): Set to Read mode, referencing LevelEdge's official services and pricing document 'My business and services'. Outputs full text via {{My business and services.text}} wired directly to the KB port of the AI Agent.")
    doc.add_paragraph("4. AI Proposal Reasoning Node (AI Agent Node): Invokes Groq (Llama 3.3 70B) using System Instructions: 'You are a senior B2B proposal consultant for the technology services company LevelEdge. Synthesize a customized proposal for {{currentItem.Company}} based on their requested pain point ({{currentItem.Pain Point}}) and product interest ({{currentItem.Product Interest}}), referencing our pricing Knowledge Base {{My business and services.text}}.'")
    doc.add_paragraph("5. Proposal Document Creation Node (Google Docs Node): Configured in Create New mode. Creates a formatted Google Document titled 'Proposal for {{currentItem.Company}}' populating content with {{AI.text}}.")

    cap5 = doc.add_paragraph("[Figure 5: Live LevelEdge B2B Proposal Agent DAG Execution Flow]")
    cap5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap5.runs[0].font.italic = True

    add_subsec_heading("6.2 Case Study 2: Freelancer Copywriter Digital Worker (Blog & Social Media DAG)")
    doc.add_paragraph("A freelance technology copywriter configured an automated content agent using the AI Wizard. The workflow ingests topic requests via Webhook, invokes Google Gemini to draft long-form articles, applies tone verification, and syndicates output to Discord and Slack channels in under 8.2 seconds, reducing human delivery turnaround by 85%.")

    # 7. CONCLUSION & REFERENCES
    add_sec_heading("7. CONCLUSION & FUTURE WORK")
    doc.add_paragraph("AION introduces a novel paradigm in workflow automation by combining a serverless visual DAG execution engine with an open creator marketplace and a Bring Your Own Key (BYOK) compute architecture. By enabling freelancers to convert domain knowledge into monetizable digital workers, AION bridges the gap between high-cost human freelancing and internal automation tooling. Future work includes expanding edge-worker distribution and implementing autonomous multi-agent dynamic routing.")

    add_sec_heading("REFERENCES")
    refs = [
        "[1] P. Venkiteela, 'n8n: An Open-Source Workflow Automation Platform for Enterprise Integration and AI-Driven Orchestration,' International Journal of Computer Applications, vol. 187, no. 63, pp. 1–11, Dec. 2025.",
        "[2] Q. Wu et al., 'AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation,' arXiv preprint arXiv:2308.08155, 2023.",
        "[3] S. Yao et al., 'ReAct: Synergizing Reasoning and Acting in Language Models,' in ICLR, 2023.",
        "[4] T. Schick et al., 'Toolformer: Language Models Can Teach Themselves to Use Tools,' in NeurIPS, vol. 36, pp. 68539–68551, 2023.",
        "[5] Gartner Inc., 'Predicts 2026: Low-Code and Hyperautomation Acceleration,' Gartner Research Report, 2026."
    ]
    for r in refs:
        doc.add_paragraph(r)

    # Save document
    target_path = r'c:\Users\Kush Tejani\Downloads\aion\Aion\AION_ICAST_Paper_v2_Final.docx'
    doc.save(target_path)
    print("Successfully updated Word document:", target_path)

if __name__ == '__main__':
    create_document()
