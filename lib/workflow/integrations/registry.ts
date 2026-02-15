import { NodeType } from "@/types";

export interface NodeAction {
    id: string;
    name: string;
    description: string;
    execute: (config: any, input: any) => Promise<any>;
}

export interface Integration {
    id: string;
    name: string;
    icon?: string;
    category: 'ai' | 'communication' | 'logic' | 'utility' | 'trigger';
    actions: NodeAction[];
}

class IntegrationRegistry {
    private integrations: Map<string, Integration> = new Map();

    register(integration: Integration) {
        this.integrations.set(integration.id, integration);
    }

    getIntegration(id: string) {
        return this.integrations.get(id);
    }

    getAction(integrationId: string, actionId: string) {
        const integration = this.getIntegration(integrationId);
        return integration?.actions.find((a) => a.id === actionId);
    }

    getAllIntegrations() {
        return Array.from(this.integrations.values());
    }

    getIntegrationsByCategory(category: string) {
        return this.getAllIntegrations().filter(i => i.category === category);
    }
}

export const registry = new IntegrationRegistry();

// ─── Register Tier 1 Integrations ───────────────────────────

// Google Gemini
registry.register({
    id: "gemini",
    name: "Google Gemini",
    category: "ai",
    actions: [
        {
            id: "chat",
            name: "Chat Completion",
            description: "Ask Gemini a question",
            execute: async (config) => {
                const { apiKey, systemPrompt, userPrompt } = config;
                if (!apiKey) throw new Error("Gemini API Key is required");

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    { text: systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt }
                                ]
                            }
                        ],
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Gemini Error: ${error.error?.message || response.statusText}`);
                }

                const data = await response.json();
                return { text: data.candidates[0].content.parts[0].text };
            },
        },
    ],
});

// Google Gemini
registry.register({
    id: "google_gemini",
    name: "Google Gemini",
    category: "ai",
    actions: [
        {
            id: "chat",
            name: "Chat Completion",
            description: "Ask Gemini a question",
            execute: async (config) => {
                const { apiKey, model, systemPrompt, userPrompt } = config;
                if (!apiKey) throw new Error("Gemini API Key is required");

                // Gemini API format
                const selectedModel = model || "gemini-2.0-flash";

                // Use v1 for 2.x/3.x models, v1beta for 1.x legacy models
                const isLegacy = selectedModel.startsWith("gemini-1.");
                const apiVersion = isLegacy ? "v1beta" : "v1";

                const payload: any = {
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt }],
                        },
                    ],
                };

                const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${selectedModel}:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Gemini Error: ${error.error?.message || response.statusText}`);
                }

                const data = await response.json();
                return { text: data.candidates[0].content.parts[0].text };
            },
        },
    ],
});

// OpenAI
registry.register({
    id: "openai",
    name: "OpenAI",
    category: "ai",
    actions: [
        {
            id: "chat",
            name: "Chat Completion",
            description: "Ask OpenAI (GPT) a question",
            execute: async (config) => {
                const { apiKey, model, systemPrompt, userPrompt } = config;
                if (!apiKey) throw new Error("OpenAI API Key is required");

                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: model || "gpt-4o",
                        messages: [
                            { role: "system", content: systemPrompt || "You are a helpful assistant." },
                            { role: "user", content: userPrompt },
                        ],
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`OpenAI Error: ${error.error?.message || response.statusText}`);
                }

                const data = await response.json();
                return { text: data.choices[0].message.content };
            },
        },
    ],
});

// Groq
registry.register({
    id: "groq",
    name: "Groq",
    category: "ai",
    actions: [
        {
            id: "chat",
            name: "Chat Completion",
            description: "Ask Groq a question",
            execute: async (config) => {
                const {
                    apiKey,
                    model,
                    systemPrompt,
                    userPrompt,
                    temperature,
                    maxTokens,
                    topP,
                } = config;
                if (!apiKey) throw new Error("Groq API Key is required");

                const selectedModel = model || "llama-3.3-70b-versatile";

                const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
                if (systemPrompt) messages.push({ role: "system", content: String(systemPrompt) });
                messages.push({ role: "user", content: String(userPrompt ?? "") });

                const payload: any = {
                    model: selectedModel,
                    messages,
                };
                if (temperature !== undefined && temperature !== null && temperature !== "") {
                    payload.temperature = Number(temperature);
                }
                if (topP !== undefined && topP !== null && topP !== "") {
                    payload.top_p = Number(topP);
                }
                if (maxTokens !== undefined && maxTokens !== null && maxTokens !== "") {
                    payload.max_tokens = Number(maxTokens);
                }

                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    let errorMessage = response.statusText;
                    try {
                        const error = await response.json();
                        errorMessage = error.error?.message || errorMessage;
                    } catch {
                        // ignore JSON parse errors
                    }
                    throw new Error(`Groq Error: ${errorMessage}`);
                }

                const data = await response.json();
                return { text: data.choices?.[0]?.message?.content ?? "" };
            },
        },
    ],
});

// Discord
registry.register({
    id: "discord",
    name: "Discord",
    category: "communication",
    actions: [
        {
            id: "send_message",
            name: "Send Message",
            description: "Send a message to a Discord channel via Webhook",
            execute: async (config) => {
                const { webhookUrl, content } = config;
                if (!webhookUrl) throw new Error("Discord Webhook URL is required");

                const response = await fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content }),
                });

                if (!response.ok) {
                    throw new Error(`Discord Error: ${response.statusText}`);
                }

                return { success: true };
            },
        },
    ],
});

// Logic
registry.register({
    id: "logic",
    name: "Logic",
    category: "logic",
    actions: [
        {
            id: "log",
            name: "Log to Console",
            description: "Log the input to the execution console",
            execute: async (config, input) => {
                console.log("Workflow Log:", input);
                return input;
            },
        },
    ],
});
// Triggers
registry.register({
    id: "cron",
    name: "Schedule (Cron)",
    category: "trigger",
    actions: [
        {
            id: "schedule",
            name: "Run on Schedule",
            description: "Triggers the workflow on a cron expression",
            execute: async (config) => {
                return { triggered_at: new Date().toISOString(), schedule: config.cron };
            },
        },
    ],
});

registry.register({
    id: "webhook",
    name: "Webhook",
    category: "trigger",
    actions: [
        {
            id: "receive",
            name: "On HTTP Request",
            description: "Triggers the workflow when a POST request is received",
            execute: async (config, input) => {
                return input;
            },
        },
    ],
});

// HTTP / API
registry.register({
    id: "api",
    name: "HTTP Request",
    category: "utility",
    actions: [
        {
            id: "request",
            name: "Network Request",
            description: "Make an arbitrary HTTP request (GET, POST, etc.)",
            execute: async (config) => {
                const { url, method, headers, body } = config;
                if (!url) throw new Error("URL is required");

                const fetchOptions: any = {
                    method: method || "GET",
                    headers: headers || {},
                };

                if (["POST", "PUT", "PATCH"].includes(fetchOptions.method) && body) {
                    fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
                    if (!fetchOptions.headers["Content-Type"]) {
                        fetchOptions.headers["Content-Type"] = "application/json";
                    }
                }

                const response = await fetch(url, fetchOptions);
                const contentType = response.headers.get("content-type");

                let responseData;
                if (contentType && contentType.includes("application/json")) {
                    responseData = await response.json();
                } else {
                    responseData = await response.text();
                }

                if (!response.ok) {
                    throw new Error(`HTTP Error ${response.status}: ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
                }

                return {
                    status: response.status,
                    data: responseData,
                    headers: Object.fromEntries(response.headers.entries())
                };
            },
        },
    ],
});
