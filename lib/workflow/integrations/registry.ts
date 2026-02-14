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
}

export const registry = new IntegrationRegistry();

// ─── Register Tier 1 Integrations ───────────────────────────

// OpenAI
registry.register({
    id: "openai",
    name: "OpenAI",
    actions: [
        {
            id: "chat",
            name: "Chat Completion",
            description: "Ask GPT-4o a question",
            execute: async (config) => {
                const { apiKey, systemPrompt, userPrompt } = config;
                if (!apiKey) throw new Error("OpenAI API Key is required");

                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: "gpt-4o",
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

// Google Gemini
registry.register({
    id: "google_gemini",
    name: "Google Gemini",
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
                            parts: [{ text: userPrompt }],
                        },
                    ],
                };

                if (systemPrompt) {
                    // v1 uses camelCase systemInstruction, v1beta uses snake_case system_instruction
                    if (apiVersion === "v1") {
                        payload.systemInstruction = {
                            parts: [{ text: systemPrompt }],
                        };
                    } else {
                        payload.system_instruction = {
                            parts: [{ text: systemPrompt }],
                        };
                    }
                }

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

// Discord
registry.register({
    id: "discord",
    name: "Discord",
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
