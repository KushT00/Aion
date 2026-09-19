/**
 * LIVE Groq & Gemini API Real Runner Script
 * Connects to live Groq API using your real GROQ_API_KEY from .env!
 */

const fs = require('fs');
const path = require('path');

// Read GROQ_API_KEY from .env
function getEnvKey() {
    try {
        const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
        const match = envContent.match(/GROQ_API_KEY=(gsk_[a-zA-Z0-9_-]+)/);
        if (match) return match[1];
    } catch (e) {}
    return process.env.GROQ_API_KEY || null;
}

async function generateLiveGroqProposal() {
    const groqKey = getEnvKey();
    console.log("==========================================================");
    console.log("🚀 AION LIVE GROQ API WORKFLOW EXECUTION");
    console.log("==========================================================");

    if (!groqKey) {
        console.error("❌ Error: GROQ_API_KEY not found in .env");
        return;
    }

    console.log("✓ Found GROQ_API_KEY in .env!");

    // Real Input Data (Can be replaced with any Google Sheet row or text file)
    const clientData = {
        clientName: "Somaiya Tech Innovations",
        requirement: "Build an automated lead-scoring agent, connect to Google Sheets, and send instant WhatsApp/Email proposals",
        pricingKnowledgeBase: "Standard AI Agent Package: $2,000 setup + $100/mo cloud infrastructure. Includes 24/7 DAG execution & custom prompt tuning."
    };

    console.log("\n[1] Ingesting Live Client Data:", clientData.clientName);
    console.log("[2] Sending Live Request to Groq API (llama-3.3-70b-versatile)...");

    const startTime = Date.now();

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "You are an AI Digital Worker sales agent on the AION platform. Write a concise, highly professional B2B project proposal in markdown based on the client requirement and pricing knowledge base provided."
                    },
                    {
                        role: "user",
                        content: `CLIENT: ${clientData.clientName}\nREQUIREMENT: ${clientData.requirement}\nPRICING KB MATCH: ${clientData.pricingKnowledgeBase}`
                    }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        const latency = Date.now() - startTime;

        if (data.choices && data.choices[0]) {
            const proposalText = data.choices[0].message.content;

            const outputPath = path.join(__dirname, 'live_groq_proposal.md');
            fs.writeFileSync(outputPath, proposalText, 'utf-8');

            console.log("\n==========================================================");
            console.log("🎉 LIVE GROQ PROPOSAL GENERATED SUCCESSFULLY!");
            console.log(`  • Execution Latency: ${latency} ms`);
            console.log(`  • Model Used: llama-3.3-70b-versatile (via Groq)`);
            console.log(`  • Saved To: ${outputPath}\n`);
            console.log("--- PROPOSAL PREVIEW ---");
            console.log(proposalText.substring(0, 400) + "...\n");
            console.log("==========================================================");
        } else {
            console.error("❌ Groq API Error Response:", data);
        }

    } catch (err) {
        console.error("❌ Error executing Groq request:", err);
    }
}

generateLiveGroqProposal();
