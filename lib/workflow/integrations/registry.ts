import { NodeType } from "@/types";
import { createClient } from "@supabase/supabase-js";

export interface NodeAction {
    id: string;
    name: string;
    description: string;
    execute: (config: any, context: any) => Promise<any>;
}

export interface Integration {
    id: string;
    name: string;
    icon?: string;
    category: 'ai' | 'communication' | 'logic' | 'utility' | 'trigger' | 'api_action';
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

// Shared Helper for Telegram
async function performTelegramSend(config: any, context: any) {
    let { botToken, chatId, content, replyToMessageId } = config;

    // 0. Clean inputs
    if (typeof botToken === 'string') botToken = botToken.trim();
    if (typeof chatId === 'string') chatId = chatId.trim();

    // 1. Fallback to Context Chat ID if available (Smart Reply)
    // If the variable couldn't resolve, it might literally be the string "{{chat_id}}"
    if ((!chatId || chatId.startsWith('{{')) && context?.trigger?.chat_id) {
        chatId = context.trigger.chat_id;
    }

    if (!botToken || !chatId || !content) {
        throw new Error(`Telegram configuration missing. Token: ${!!botToken}, ChatID: ${!!chatId}, Content: ${!!content}`);
    }

    // 2. Handle Mock ID for local builder runs
    if (chatId === "123456789" || String(chatId) === "123456789") {
        return { success: true, messageId: -1, mock: true };
    }

    // 3. Construct Payload
    const payload: any = {
        chat_id: chatId,
        text: content
    };

    if (replyToMessageId) {
        payload.reply_to_message_id = replyToMessageId;
    } else if (context?.trigger?.message_id && config.autoReply) {
        payload.reply_to_message_id = context.trigger.message_id;
    }

    console.log(`📡 TELEGRAM ATTEMPT: Chat=${chatId}, Mock=${chatId === "123456789"}`);
    console.log(`🚀 TELEGRAM FULL PAYLOAD:`, JSON.stringify(payload));
    console.log(`🔄 CONTEXT TRIGGER:`, JSON.stringify(context?.trigger));

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Telegram Error: ${error.description || response.statusText} | Payload sent: ${JSON.stringify(payload)} | Raw ChatID config: ${config.chatId}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.result.message_id };
}

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

                const selectedModel = model || "gemini-2.0-flash";
                const apiVersion = "v1beta";

                const payload: any = {
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: userPrompt }],
                        },
                    ],
                };

                if (systemPrompt) {
                    payload.system_instruction = {
                        parts: [{ text: systemPrompt }],
                    };
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
        {
            id: "model",
            name: "Model Configuration",
            description: "Provide model settings to an AI Agent",
            execute: async (config) => {
                return { provider: 'google_gemini', ...config };
            }
        }
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
            description: "Ultra-fast inference with Llama 3 / Mixtral",
            execute: async (config) => {
                const { apiKey, model, systemPrompt, userPrompt } = config;
                if (!apiKey) throw new Error("Groq API Key is required");

                const selectedModel = model || "llama-3.1-8b-instant";

                console.log(`🤖 GROQ INFERENCE: Model=${selectedModel}, API_KEY=${apiKey ? 'Present' : 'Missing'}`);
                console.log(`💬 USER_PROMPT: "${userPrompt}"`);

                if (!userPrompt) {
                    console.log("⚠️ WARNING: userPrompt is empty or undefined!");
                }

                const messages = [];
                if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
                messages.push({ role: "user", content: userPrompt || "" });

                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: messages,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Groq Error: ${error.error?.message || response.statusText}`);
                }

                const data = await response.json();
                return { text: data.choices[0].message.content };
            },
        },
        {
            id: "model",
            name: "Model Configuration",
            description: "Provide model settings to an AI Agent",
            execute: async (config) => {
                return { provider: 'groq', ...config };
            }
        }
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
            description: "Ask GPT a question",
            execute: async (config) => {
                return { text: "OpenAI integration pending auth implementation." };
            }
        },
        {
            id: "model",
            name: "Model Configuration",
            description: "Provide model settings to an AI Agent",
            execute: async (config) => {
                return { provider: 'openai', ...config };
            }
        }
    ]
});

// Memory Integration
registry.register({
    id: "memory",
    name: "Memory Session",
    category: "ai",
    actions: [
        {
            id: "session",
            name: "Session Key",
            description: "Provide a session ID to track conversation history",
            execute: async (config) => {
                return { ...config };
            }
        }
    ]
});

// Tool Integration
registry.register({
    id: "tool",
    name: "Tool",
    category: "utility",
    actions: [
        {
            id: "file_reader",
            name: "Read File",
            description: "Allows the AI to read a file or URL",
            execute: async (config) => {
                return { type: 'file_reader', ...config };
            }
        },
        {
            id: "calculator",
            name: "Calculator",
            description: "Evaluate math expressions",
            execute: async (config) => {
                return { type: 'calculator', ...config };
            }
        }
    ]
});

// AI Agent Integration
registry.register({
    id: "ai",
    name: "AI Agent",
    category: "ai",
    actions: [
        {
            id: "agent",
            name: "Run Agent",
            description: "Execute LLM with Memory and Tools",
            execute: async (config, context) => {
                const { systemPrompt, userPrompt: configUserPrompt, agentModel, agentMemory, agentTools } = config;
                const userPrompt = configUserPrompt || context?.trigger?.text;

                if (!agentModel || !agentModel.provider) {
                    throw new Error("AI Agent requires a Chat Model configuration.");
                }

                // 1. Process Tools (Pre-fetch context for file_reader)
                let toolsContext = "";
                if (agentTools && Array.isArray(agentTools)) {
                    for (const tool of agentTools) {
                        if (tool.type === 'file_reader' && tool.filePath) {
                            try {
                                let text = "";
                                if (tool.filePath.startsWith("http://") || tool.filePath.startsWith("https://")) {
                                    const res = await fetch(tool.filePath);
                                    if (res.ok) {
                                        text = await res.text();
                                    }
                                } else {
                                    if (typeof window === 'undefined') {
                                        try {
                                            const fs = await import("fs");
                                            const cleanPath = tool.filePath.replace(/^"|"$/g, '');
                                            console.log(`[FILE TOOL] Attempting to read local file: "${cleanPath}"`);

                                            if (fs.existsSync(cleanPath)) {
                                                console.log(`[FILE TOOL] File EXISTS. Reading contents...\n`);
                                                const ext = cleanPath.split('.').pop()?.toLowerCase();
                                                let isOfficeOrPdf = cleanPath.match(/\.(docx|pptx|xlsx|pdf|odt|odp|ods)$/i);

                                                if (isOfficeOrPdf) {
                                                    try {
                                                        const officeParser = await import("officeparser");
                                                        // @ts-ignore
                                                        const ast = await officeParser.parseOffice(cleanPath);
                                                        text = ast.toText();
                                                        console.log(`[FILE TOOL] Successfully parsed document using officeparser: ${text.length} characters.\n`);
                                                    } catch (parseErr: any) {
                                                        console.warn(`[FILE TOOL] Failed to parse document: ${parseErr.message}`);
                                                        text = fs.readFileSync(cleanPath, "utf-8"); // Fallback
                                                    }
                                                } else {
                                                    text = fs.readFileSync(cleanPath, "utf-8");
                                                    console.log(`[FILE TOOL] Successfully read ${text.length} characters.\n`);
                                                }
                                            } else {
                                                console.warn(`[FILE TOOL] ❌ File NOT FOUND at path: "${cleanPath}"\n`);
                                            }
                                        } catch (e: any) {
                                            console.warn(`[FILE TOOL] Dynamic import of 'fs' failed. Are you on Edge Runtime?`, e.message);
                                        }
                                    } else {
                                        console.warn(`[FILE TOOL] Cannot read local files from browser context.`);
                                    }
                                }

                                if (text) {
                                    text = text.replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, ""); // Strip invisible characters
                                    toolsContext += `\n\n--- Content from ${tool.filePath} ---\n${text.substring(0, 8000)}\n--- End Content ---`;
                                    console.log(`[FILE TOOL] Added to AI context (${text.substring(0, 8000).length} chars).\n`);
                                }
                            } catch (err: any) {
                                console.error(`\n[FILE TOOL] ❌ Exception reading file "${tool.filePath}": ${err.message}\n`);
                            }
                        }
                    }
                }

                // 2. Load Memory
                let messages: any[] = [];
                let sessionId = agentMemory?.sessionId || (agentMemory && context?.trigger?.chat_id ? String(context.trigger.chat_id) : undefined);
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

                if (sessionId && supabase) {
                    const { data: mem } = await supabase.from('workflow_memory').select('*').eq('session_id', sessionId).maybeSingle();
                    if (mem?.messages) {
                        // Keep only the last 6 messages (3 turns) to prevent exceeding LLM context windows (e.g. Groq 6000 TPM limit)
                        // plus we slice from the end to keep the *newest* messages
                        messages = mem.messages.slice(-6);
                    }
                }

                // Construct Prompt
                let finalSystemPrompt = systemPrompt || "You are a helpful AI assistant.";
                if (toolsContext) {
                    finalSystemPrompt += `\n\nUse the following external context if relevant to the user's query:\n${toolsContext}`;
                }

                // 3. Execute LLM (Gemini or OpenAI or Groq)
                let aiResponseText = "";

                if (agentModel.provider === 'google_gemini') {
                    const apiKey = agentModel.apiKey;
                    if (!apiKey) throw new Error("Gemini API Key missing in Chat Model config");

                    const payload: any = {
                        system_instruction: { parts: [{ text: finalSystemPrompt }] },
                        contents: [
                            ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : m.role, parts: [{ text: m.content }] })),
                            { role: "user", parts: [{ text: userPrompt || "" }] }
                        ]
                    };

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${agentModel.model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });

                    if (!response.ok) throw new Error(`Gemini Error: ${(await response.json()).error?.message}`);
                    const data = await response.json();
                    aiResponseText = data.candidates[0].content.parts[0].text;

                } else if (agentModel.provider === 'groq') {
                    const apiKey = agentModel.apiKey;
                    if (!apiKey) throw new Error("Groq API Key missing");

                    const payload = {
                        model: agentModel.model || 'llama-3.1-8b-instant',
                        messages: [
                            { role: "system", content: finalSystemPrompt },
                            ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content })),
                            { role: "user", content: userPrompt || "" }
                        ]
                    };

                    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    if (!response.ok) throw new Error(`Groq Error: ${(await response.json()).error?.message}`);
                    const data = await response.json();
                    aiResponseText = data.choices[0].message.content;

                } else if (agentModel.provider === 'openai') {
                    const apiKey = agentModel.apiKey;
                    if (!apiKey) throw new Error("OpenAI API Key missing");

                    const payload = {
                        model: agentModel.model || 'gpt-4o',
                        messages: [
                            { role: "system", content: finalSystemPrompt },
                            ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content })),
                            { role: "user", content: userPrompt || "" }
                        ]
                    };

                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    if (!response.ok) throw new Error(`OpenAI Error: ${(await response.json()).error?.message}`);
                    const data = await response.json();
                    aiResponseText = data.choices[0].message.content;
                } else {
                    throw new Error(`Unsupported provider: ${agentModel.provider}`);
                }

                // 4. Save Memory
                let memoryError = null;
                if (sessionId && supabase) {
                    messages.push({ role: "user", content: userPrompt || "" });
                    // Map generic "assistant" / "model" mapping safely for next runs by keeping standard "user" and "model" roles
                    const aiRole = agentModel.provider === 'google_gemini' ? 'model' : 'assistant';
                    messages.push({ role: aiRole, content: aiResponseText });

                    // Upsert Memory
                    const { data: existing, error: selectErr } = await supabase.from('workflow_memory').select('id').eq('session_id', sessionId).maybeSingle();
                    if (selectErr) console.error("[MEMORY] Select Error:", selectErr.message);

                    if (existing) {
                        const { error: updateErr } = await supabase.from('workflow_memory').update({ messages, updated_at: new Date().toISOString() }).eq('id', existing.id);
                        if (updateErr) memoryError = updateErr.message;
                    } else {
                        const { error: insertErr } = await supabase.from('workflow_memory').insert({ session_id: sessionId, messages });
                        if (insertErr) memoryError = insertErr.message;
                    }
                }

                return {
                    text: aiResponseText,
                    memory_context_used: !!sessionId,
                    memory_error: memoryError,
                    tools_used: agentTools?.length || 0,
                    debug_tools_context_length: toolsContext ? toolsContext.length : 0
                };
            }
        }
    ]
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

// Telegram
registry.register({
    id: "telegram",
    name: "Telegram",
    category: "communication",
    actions: [
        {
            id: "send_message",
            name: "Send Message",
            description: "Send a message via Telegram Bot",
            execute: performTelegramSend,
        },
        // Legacy Alias for backward compatibility
        {
            id: "process_message",
            name: "Send Message (Legacy)",
            description: "Send a message via Telegram Bot",
            execute: performTelegramSend,
        }
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

// Cron (Trigger acting as Action)
registry.register({
    id: "cron",
    name: "Cron",
    category: "trigger",
    actions: [
        {
            id: "schedule",
            name: "Schedule",
            description: "Run on a schedule",
            execute: async (config) => {
                return { cron: config.cron || '0 * * * *', triggered: true };
            },
        },
    ],
});

// HTTP API
registry.register({
    id: "api",
    name: "HTTP Request",
    category: "api_action",
    actions: [
        {
            id: "request",
            name: "HTTP Request",
            description: "Make an external HTTP request",
            execute: async (config) => {
                const { url, method, headers, body } = config;
                if (!url) throw new Error("URL is required for HTTP Request");

                let parsedHeaders = {};
                if (headers) {
                    try {
                        parsedHeaders = typeof headers === 'string' ? JSON.parse(headers) : headers;
                    } catch (e) {
                        console.warn("Invalid headers JSON in API node");
                    }
                }

                const response = await fetch(url, {
                    method: method || "GET",
                    headers: {
                        "Content-Type": "application/json",
                        ...parsedHeaders
                    },
                    body: (method !== "GET" && body) ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                });

                const contentType = response.headers.get("content-type");
                let data;
                if (contentType && contentType.includes("application/json")) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }

                if (!response.ok) {
                    throw new Error(`API Error (${response.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`);
                }

                return data;
            },
        },
    ],
});

// Webhook (Trigger acting as Action)
registry.register({
    id: "webhook",
    name: "Webhook",
    category: "trigger",
    actions: [
        {
            id: "receive",
            name: "Receive Data",
            description: "Triggers when a webhook is received",
            execute: async (config, context) => {
                // The actual payload is managed by the runner's triggerData context injection.
                // This just acts as a pass-through node for manual test runs.
                return { triggered: true, testPayload: "Simulated Webhook Event" };
            },
        },
    ],
});

// Telegram Trigger (Trigger acting as Action)
registry.register({
    id: "telegram_trigger",
    name: "Telegram Trigger",
    category: "trigger",
    actions: [
        {
            id: "receive",
            name: "Receive Message",
            description: "Triggers when a message is sent to the bot",
            execute: async (config, context) => {
                // In a live webhook, context.trigger contains the real message data.
                // For a manual UI test run, provide mock data so downstream nodes don't crash.
                return {
                    chat_id: 123456789,
                    text: "Hello! This is a manual test message.",
                    username: "TestUser",
                    is_bot: false
                };
            },
        },
    ],
});
