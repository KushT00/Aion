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



// OpenAI (Extended)
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
        {
            id: "generate_reply",
            name: "AI Response",
            description: "Generates a response using ChatGPT",
            execute: async (config) => {
                const { apiKey, userPrompt, reply_type } = config;

                // Trigger Condition: Only run if reply_type is 'question'
                if (reply_type !== "question") {
                    return {
                        skipped: true,
                        reply_text: ""
                    };
                }

                if (!apiKey) throw new Error("OpenAI API Key is required");

                try {
                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${apiKey}`,
                        },
                        body: JSON.stringify({
                            model: "gpt-4o",
                            messages: [
                                { role: "system", content: "You are a helpful Telegram chatbot. Answer the user's question clearly and concisely." },
                                { role: "user", content: userPrompt },
                            ],
                        }),
                    });

                    const data = await response.json();
                    if (data.error) throw new Error(data.error.message);

                    return {
                        reply_text: data.choices[0].message.content,
                        reply_type: "answer"
                    };
                } catch (error: any) {
                    throw new Error(`OpenAI Error: ${error.message}`);
                }
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

// Telegram
registry.register({
    id: "telegram",
    name: "Telegram",
    actions: [
        {
            id: "send_message",
            name: "Send Message",
            description: "Send a message via Telegram Bot API",
            execute: async (config) => {
                const { botToken, chatId, content } = config;

                if (!botToken) throw new Error("Telegram Bot Token is required");
                if (!chatId) throw new Error("Telegram Chat ID is required");
                if (!content) throw new Error("Message Content is required");

                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: content
                    })
                });

                const data = await response.json();

                if (!data.ok) {
                    throw new Error(`Telegram Error: ${data.description}`);
                }

                return { sent_message: data.result };
            },
        },
    ],
});
