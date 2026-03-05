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
    triggers?: any[];
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

// ─── Memory ───────────────────────────────────────────────────
registry.register({
    id: "memory",
    name: "Memory Session",
    category: "logic",
    actions: [
        {
            id: "session",
            name: "Session Manager",
            description: "Manages conversation history",
            execute: async (config, context) => {
                const { sessionId } = config;
                if (!sessionId) return { history: [] };

                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                // Try to get existing session
                const { data } = await supabase
                    .from('workflow_sessions')
                    .select('data')
                    .eq('session_id', sessionId)
                    .single();

                const history = data?.data?.history || [];

                // Return history for the AI to use
                return {
                    history,
                    sessionId,
                    addMessage: async (msg: any) => {
                        const newHistory = [...history, msg].slice(-10); // Keep last 10
                        await supabase.from('workflow_sessions').upsert({
                            session_id: sessionId,
                            data: { history: newHistory },
                            updated_at: new Date().toISOString()
                        });
                    }
                };
            },
        },
    ],
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
                const { systemPrompt, userPrompt: configUserPrompt, agentModel, agentMemory, agentTools, agentKB } = config;
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
                    finalSystemPrompt += `\n\n--- EXTERNAL CONTEXT ---\n${toolsContext}\n--- END EXTERNAL CONTEXT ---`;
                }

                // 3. Process Knowledge Base (KB)
                if (agentKB && Array.isArray(agentKB) && agentKB.length > 0) {
                    const kbContent = agentKB.map(kb => {
                        // Handle Structured Data (Google Sheets, etc)
                        if (kb.values && Array.isArray(kb.values)) {
                            const table = kb.values.map((row: any[]) => row.join(" | ")).join("\n");
                            return `[Spreadsheet Data: ${kb.range || 'Menu'}]\n${table}`;
                        }
                        // Handle File Reader / Text nodes
                        if (kb.text) {
                            return `[Document: ${kb.filePath || kb.name || 'document'}]\n${kb.text}`;
                        }
                        return `[Data Content]\n${JSON.stringify(kb)}`;
                    }).join('\n\n');

                    finalSystemPrompt += `\n\n### KNOWLEDGE BASE DATA\n\n${kbContent}\n\n### INSTRUCTIONS\n1. Use the data above to answer the query accurately.\n2. Do NOT mention headers like "KNOWLEDGE BASE DATA" or quote the raw table formatting in your response.\n3. Provide a natural, friendly chat response.`;
                }
                console.log(`\n📝 [AI AGENT] Final System Prompt Length: ${finalSystemPrompt.length} chars.`);
                // console.log(`FULL PROMPT:`, finalSystemPrompt); // Uncomment only for deep debug

                // 4. Execute LLM (Gemini or OpenAI or Groq)
                let aiResponseText = "";

                if (agentModel.provider === 'google_gemini') {
                    const apiKey = agentModel.apiKey;
                    if (!apiKey) throw new Error("Gemini API Key missing in Chat Model config");

                    const payload: any = {
                        system_instruction: { parts: [{ text: finalSystemPrompt }] },
                        contents: [
                            ...messages.map(m => ({
                                role: (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user',
                                parts: [{ text: m.content }]
                            })),
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
                            ...messages.map(m => ({
                                role: (m.role === 'model' || m.role === 'assistant') ? 'assistant' : 'user',
                                content: m.content
                            })),
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
                            ...messages.map(m => ({
                                role: (m.role === 'model' || m.role === 'assistant') ? 'assistant' : 'user',
                                content: m.content
                            })),
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

                // 5. Save Memory
                let memoryError = null;
                if (sessionId && supabase) {
                    const aiRole = agentModel.provider === 'google_gemini' ? 'model' : 'assistant';
                    const newMessages = [
                        ...(messages || []),
                        { role: "user", content: userPrompt || "" },
                        { role: aiRole, content: aiResponseText || "" }
                    ].slice(-10); // Keep last 10 messages for context

                    // Upsert Memory
                    const { data: existing, error: selectErr } = await supabase.from('workflow_memory').select('id').eq('session_id', sessionId).maybeSingle();

                    if (existing) {
                        const { error: updateErr } = await supabase.from('workflow_memory').update({
                            messages: newMessages,
                            updated_at: new Date().toISOString()
                        }).eq('id', existing.id);
                        if (updateErr) memoryError = updateErr.message;
                    } else {
                        const { error: insertErr } = await supabase.from('workflow_memory').insert({
                            session_id: sessionId,
                            messages: newMessages
                        });
                        if (insertErr) memoryError = insertErr.message;
                    }
                }

                return {
                    text: aiResponseText,
                    memory_context_used: !!sessionId,
                    memory_error: memoryError,
                    tools_used: agentTools?.length || 0,
                    debug_tools_context_length: toolsContext ? toolsContext.length : 0,
                    knowledge_base_used: agentKB?.length || 0,
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

registry.register({
    id: "google_gmail_trigger",
    name: "New Email (Gmail)",
    category: "trigger",
    actions: [
        {
            id: "on_new_email",
            name: "On New Email",
            description: "Triggers the workflow when a new email arrives",
            execute: async (config, input) => {
                // Returns the payload received from the Gmail webhook / pubsub
                return input;
            },
        },
    ],
});


// HTTP / API
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

// Google Calendar
registry.register({
    id: "google_calendar",
    name: "Google Calendar",
    category: "utility",
    actions: [
        {
            id: "get_events",
            name: "Get Events",
            description: "List events from a Google Calendar",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { calendarId, timeMin, timeMax } = config;
                if (!accessToken) throw new Error("Google Calendar Access Token is required.");

                const params = new URLSearchParams({
                    maxResults: "10",
                    singleEvents: "true",
                    orderBy: "startTime",
                });

                try {
                    params.append("timeMin", timeMin ? new Date(timeMin).toISOString() : new Date().toISOString());
                    if (timeMax) params.append("timeMax", new Date(timeMax).toISOString());
                } catch (e) {
                    throw new Error("Invalid Date Format for timeMin or timeMax. Use ISO 8601 (YYYY-MM-DDTHH:mm:ssZ).");
                }

                const calId = calendarId || "primary";
                const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events?${params.toString()}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    let errorDetails = response.statusText;
                    try {
                        const error = await response.json();
                        errorDetails = error.error?.message || response.statusText;
                    } catch { /* ignore JSON parse error */ }

                    if (response.status === 404) {
                        throw new Error(`Calendar Not Found: The Calendar ID '${calId}' is invalid. Try using 'primary'.`);
                    }
                    if (response.status === 401) {
                        throw new Error("Authentication Failed: Your access token may have expired or is invalid. Please refresh it.");
                    }
                    if (errorDetails.includes('insufficient authentication scopes')) {
                        throw new Error("Missing Permission: Your token needs 'https://www.googleapis.com/auth/calendar' scope.");
                    }
                    throw new Error(`Google Calendar Error (${response.status}): ${errorDetails}`);
                }

                return await response.json();
            },
        },
        {
            id: "create_event",
            name: "Create Event",
            description: "Create a new event in Google Calendar",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { calendarId, summary, description, startTime, endTime } = config;
                if (!accessToken) throw new Error("Google Calendar Access Token is required.");
                if (!summary) throw new Error("Event summary is required.");
                if (!startTime || !endTime) throw new Error("Start and End times are required.");

                const calId = calendarId || "primary";

                let startISO, endISO;
                try {
                    startISO = new Date(startTime).toISOString();
                    endISO = new Date(endTime).toISOString();
                } catch (e) {
                    throw new Error("Invalid Date Format for Start or End Time. Use ISO 8601 (YYYY-MM-DDTHH:mm:ssZ).");
                }

                const event = {
                    summary,
                    description,
                    start: { dateTime: startISO },
                    end: { dateTime: endISO },
                };

                const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(event),
                });

                if (!response.ok) {
                    let errorDetails = response.statusText;
                    try {
                        const error = await response.json();
                        errorDetails = error.error?.message || response.statusText;
                    } catch { /* ignore JSON parse error */ }

                    if (response.status === 404) {
                        throw new Error(`Calendar Not Found: The Calendar ID '${calId}' is invalid. Try using 'primary'.`);
                    }
                    if (response.status === 401) {
                        throw new Error("Authentication Failed: Your access token may have expired or is invalid. Please refresh it.");
                    }
                    if (errorDetails.includes('insufficient authentication scopes')) {
                        throw new Error("Missing Permission: Your token needs 'https://www.googleapis.com/auth/calendar' scope.");
                    }
                    throw new Error(`Google Calendar Error (${response.status}): ${errorDetails}`);
                }

                return await response.json();
            },
        },
        {
            id: "update_event",
            name: "Update Event",
            description: "Update an existing event in Google Calendar",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { calendarId, eventId, summary, description } = config;
                if (!accessToken) throw new Error("Google Calendar Access Token is required.");
                if (!eventId) throw new Error("Event ID is required.");

                const calId = calendarId || "primary";
                const updates: any = {};
                if (summary) updates.summary = summary;
                if (description) updates.description = description;

                if (Object.keys(updates).length === 0) {
                    return { message: "No updates provided." };
                }

                const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${eventId}`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updates),
                });

                if (!response.ok) {
                    let errorDetails = response.statusText;
                    try {
                        const error = await response.json();
                        errorDetails = error.error?.message || response.statusText;
                    } catch { /* ignore JSON parse error */ }

                    if (response.status === 404) {
                        throw new Error(`Resource Not Found: Check if Calendar ID '${calId}' or Event ID '${eventId}' are correct.`);
                    }
                    if (response.status === 401) {
                        throw new Error("Authentication Failed: Your access token may have expired or is invalid. Please refresh it.");
                    }
                    if (errorDetails.includes('insufficient authentication scopes')) {
                        throw new Error("Missing Permission: Your token needs 'https://www.googleapis.com/auth/calendar' scope.");
                    }
                    throw new Error(`Google Calendar Error (${response.status}): ${errorDetails}`);
                }

                return await response.json();
            },
        },
    ],
});

// Google Gmail
registry.register({
    id: "google_gmail",
    name: "Google Gmail",
    category: "utility",
    actions: [
        {
            id: "send_email",
            name: "Send Email",
            description: "Send a new email",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { to, cc, bcc, subject, body, isHtml, threadId } = config;
                if (!accessToken) throw new Error("Google Gmail Access Token is required.");
                if (!to) throw new Error("Recipient address (to) is required.");

                const headers = [
                    `To: ${to}`,
                    ...(cc ? [`Cc: ${cc}`] : []),
                    ...(bcc ? [`Bcc: ${bcc}`] : []),
                    `Subject: ${subject || ""}`,
                ];

                if (isHtml) {
                    headers.push('Content-Type: text/html; charset="UTF-8"');
                } else {
                    headers.push('Content-Type: text/plain; charset="UTF-8"');
                }

                const emailStr = headers.join("\r\n") + "\r\n\r\n" + (body || "");
                const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailStr))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                const payload: any = { raw: base64EncodedEmail };
                if (threadId) { payload.threadId = threadId; }

                const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    let errorDetails = response.statusText;
                    try {
                        const error = await response.json();
                        errorDetails = error.error?.message || response.statusText;
                    } catch { /* ignore */ }
                    throw new Error(`Gmail Error: ${errorDetails}`);
                }
                return await response.json();
            },
        },
        {
            id: "reply_email",
            name: "Reply to Email",
            description: "Reply to a specific email maintaining thread context",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { messageId, body, isHtml } = config;
                if (!accessToken || !messageId) throw new Error("Access Token and Message ID are required.");

                const getRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References&metadataHeaders=From`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (!getRes.ok) throw new Error("Failed to fetch original message for reply.");
                const originalMsg = await getRes.json();
                const headersMap = new Map();
                originalMsg.payload?.headers?.forEach((h: any) => headersMap.set(h.name.toLowerCase(), h.value));

                const origSubject = headersMap.get("subject") || "";
                const subject = origSubject.startsWith("Re:") ? origSubject : `Re: ${origSubject}`;
                const to = headersMap.get("from") || "";
                const origMessageId = headersMap.get("message-id") || "";
                const origReferences = headersMap.get("references") || "";

                const replyHeaders = [
                    `To: ${to}`,
                    `Subject: ${subject}`,
                    `In-Reply-To: ${origMessageId}`,
                    `References: ${origReferences ? origReferences + " " : ""}${origMessageId}`
                ];
                if (isHtml) {
                    replyHeaders.push('Content-Type: text/html; charset="UTF-8"');
                } else {
                    replyHeaders.push('Content-Type: text/plain; charset="UTF-8"');
                }
                const emailStr = replyHeaders.join("\r\n") + "\r\n\r\n" + (body || "");
                const base64Str = btoa(unescape(encodeURIComponent(emailStr))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                let response;
                try {
                    response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ raw: base64Str, threadId: originalMsg.threadId }),
                    });
                } catch (err: any) {
                    throw new Error(`Gmail Network Error: ${err.message}. (Check Adblockers or Google Cloud Origin settings)`);
                }

                if (!response.ok) {
                    let errorDetails = response.statusText;
                    try {
                        const error = await response.json();
                        errorDetails = error.error?.message || response.statusText;
                    } catch { /* ignore */ }
                    throw new Error(`Gmail Error: ${errorDetails}`);
                }
                return await response.json();
            }
        },
        {
            id: "fetch_emails",
            name: "Fetch Emails",
            description: "Fetch emails from Google Gmail",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { maxResults, query, labelIds } = config;
                if (!accessToken) throw new Error("Google Gmail Access Token is required.");

                const params = new URLSearchParams();
                if (maxResults) params.append("maxResults", String(maxResults));
                else params.append("maxResults", "10");

                if (query) params.append("q", query);
                if (labelIds && typeof labelIds === 'string') {
                    const labels = labelIds.split(",").map((l: string) => l.trim()).filter(Boolean);
                    labels.forEach((l: string) => params.append("labelIds", l));
                }

                let response;
                try {
                    response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    });
                } catch (err: any) {
                    throw new Error(`Gmail Network Error: ${err.message}. (Check if http://localhost:3000 is added to Authorized JavaScript Origins in Google Console)`);
                }

                if (!response.ok) {
                    let errorDetails = response.statusText;
                    try {
                        const error = await response.json();
                        errorDetails = error.error?.message || response.statusText;
                    } catch { /* ignore */ }
                    throw new Error(`Gmail Error: ${errorDetails}`);
                }

                const data = await response.json();
                if (!data.messages) return { messages: [], from: '', subject: '', date: '', body: '' };

                const msgDetails = await Promise.all(data.messages.map(async (msg: any) => {
                    try {
                        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                            headers: { Authorization: `Bearer ${accessToken}` }
                        });
                        if (msgRes.ok) return await msgRes.json();
                        return msg;
                    } catch (e) {
                        return msg; // Fallback to basic info if detail fetch fails
                    }
                }));

                // Helper to extract flattened data from the first message
                const first = msgDetails[0];
                let flattened = { from: '', subject: '', date: '', body: '' };
                if (first && first.payload) {
                    const headers = first.payload.headers || [];
                    flattened.from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
                    flattened.subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
                    flattened.date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
                    flattened.body = first.snippet || '';
                }

                return {
                    messages: msgDetails,
                    ...flattened,
                    count: msgDetails.length
                };
            },
        },
        {
            id: "modify_email",
            name: "Modify Email",
            description: "Add/Remove Labels or Mark as Read/Unread",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { messageId, addLabelIds, removeLabelIds } = config;
                if (!accessToken) throw new Error("Google Gmail Access Token is required.");
                if (!messageId) throw new Error("Message ID is required.");

                const payload: any = {};
                if (addLabelIds) {
                    payload.addLabelIds = addLabelIds.split(",").map((l: string) => l.trim());
                }
                if (removeLabelIds) {
                    payload.removeLabelIds = removeLabelIds.split(",").map((l: string) => l.trim());
                }

                const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    let errorDetails = response.statusText;
                    try {
                        const error = await response.json();
                        errorDetails = error.error?.message || response.statusText;
                    } catch { /* ignore */ }
                    throw new Error(`Gmail Error: ${errorDetails}`);
                }
                return await response.json();
            },
        },
        {
            id: "delete_archive",
            name: "Delete / Archive Email",
            description: "Move an email to trash or archive it",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { messageId, actionType } = config;
                if (!accessToken) throw new Error("Google Gmail Access Token is required.");
                if (!messageId) throw new Error("Message ID is required.");

                if (actionType === "trash") {
                    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });
                    if (!response.ok && response.status !== 200) {
                        let errorDetails = response.statusText;
                        try {
                            const error = await response.json();
                            errorDetails = error.error?.message || response.statusText;
                        } catch { /* ignore */ }
                        throw new Error(`Gmail Error: ${errorDetails}`);
                    }
                    return { success: true, action: "trashed", messageId };
                } else {
                    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ removeLabelIds: ["INBOX"] }),
                    });
                    if (!response.ok) {
                        let errorDetails = response.statusText;
                        try {
                            const error = await response.json();
                            errorDetails = error.error?.message || response.statusText;
                        } catch { /* ignore */ }
                        throw new Error(`Gmail Error: ${errorDetails}`);
                    }
                    return await response.json();
                }
            },
        },
    ],
});

// ─── Slack ───────────────────────────────────────────────────
registry.register({
    id: "slack",
    name: "Slack",
    category: "communication",
    actions: [
        {
            id: "send_message",
            name: "Send Message",
            description: "Send a message to a Slack channel via Incoming Webhook",
            execute: async (config) => {
                const { webhookUrl, text, username, iconEmoji, channel } = config;
                if (!webhookUrl) throw new Error("Slack Webhook URL is required");
                const payload: any = { text: text || "" };
                if (username) payload.username = username;
                if (iconEmoji) payload.icon_emoji = iconEmoji;
                if (channel) payload.channel = channel;
                const res = await fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(`Slack Error: ${res.statusText}`);
                return { success: true };
            },
        },
    ],
});

// ─── Telegram ────────────────────────────────────────────────
registry.register({
    id: "telegram",
    name: "Telegram Bot",
    category: "communication",
    actions: [
        {
            id: "send_message",
            name: "Send Message",
            description: "Send a message via Telegram Bot",
            execute: async (config, context) => {
                const { botToken, chatId, text, parseMode } = config;
                if (!botToken) throw new Error("Telegram Bot Token is required");

                // SMART REPLY: Use trigger sender_id if no chatId is provided
                const targetChatId = chatId || context?.trigger?.sender_id;

                if (!targetChatId) throw new Error("No Chat ID provided and no trigger sender found.");

                // [MOCK LOCAL FIX] Prevent Telegram from throwing "Bad Request: chat not found"
                // during local interface testing where the trigger data injects a fake chat ID.
                if (targetChatId === "123456789" || targetChatId.toString() === "123456789") {
                    console.log(`[LOCAL MOCK] Captured Telegram send to mock chat ID 123456789. Text:`, text);
                    return { ok: true, result: { message_id: 999, text, chat: { id: "123456789" } } };
                }

                const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: targetChatId,
                        text: text || "",
                        parse_mode: parseMode || "Markdown",
                    }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(`Telegram Error: ${err.description || res.statusText}`);
                }
                return await res.json();
            },
        },
        {
            id: "telegram_message",
            name: "On Message Received",
            description: "Triggers when your bot receives a message",
            execute: async (config, context) => {
                const body = context.trigger || {};
                const message = body.message || body.edited_message || body.callback_query?.message;
                if (!message) return { text: "", sender_id: null, chat_id: null };
                return {
                    text: message.text || "",
                    sender_id: message.from?.id,
                    username: message.from?.username,
                    chat_id: message.chat?.id,
                    message_id: message.message_id,
                };
            }
        },
    ],
    triggers: [],
});

// ─── Notion ──────────────────────────────────────────────────
registry.register({
    id: "notion",
    name: "Notion",
    category: "utility",
    actions: [
        {
            id: "create_page",
            name: "Create Page",
            description: "Create a new page in a Notion database",
            execute: async (config) => {
                const { apiKey, databaseId, title, content } = config;
                if (!apiKey) throw new Error("Notion API Key is required");
                if (!databaseId) throw new Error("Database ID is required");
                const res = await fetch("https://api.notion.com/v1/pages", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "Notion-Version": "2022-06-28",
                    },
                    body: JSON.stringify({
                        parent: { database_id: databaseId },
                        properties: {
                            Name: { title: [{ text: { content: title || "Untitled" } }] },
                        },
                        children: content ? [{
                            object: "block", type: "paragraph",
                            paragraph: { rich_text: [{ text: { content } }] },
                        }] : [],
                    }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(`Notion Error: ${err.message || res.statusText}`);
                }
                return await res.json();
            },
        },
        {
            id: "append_block",
            name: "Append Content",
            description: "Append text to an existing Notion page",
            execute: async (config) => {
                const { apiKey, pageId, content } = config;
                if (!apiKey) throw new Error("Notion API Key is required");
                if (!pageId) throw new Error("Page ID is required");
                const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "Notion-Version": "2022-06-28",
                    },
                    body: JSON.stringify({
                        children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: content || "" } }] } }],
                    }),
                });
                if (!res.ok) throw new Error(`Notion Error: ${res.statusText}`);
                return await res.json();
            },
        },
    ],
});

// ─── Google Sheets ───────────────────────────────────────────
registry.register({
    id: "google_sheets",
    name: "Google Sheets",
    category: "utility",
    actions: [
        {
            id: "append_row",
            name: "Append Row",
            description: "Append a row to a Google Sheet",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { spreadsheetId, range, values, rowData } = config;
                if (!accessToken) throw new Error("Google Access Token is required");
                if (!spreadsheetId) throw new Error("Spreadsheet ID is required");

                // Handle both 'values' (array) and 'rowData' (object)
                let finalValues = values;
                if (!finalValues && rowData) {
                    finalValues = Object.values(typeof rowData === 'string' ? JSON.parse(rowData) : rowData);
                }
                let parsedValues = typeof finalValues === "string" ? JSON.parse(finalValues) : finalValues;

                // Ensure it's a 2D array (e.g. [["A", "B"]])
                const valuesToSubmit = Array.isArray(parsedValues) && Array.isArray(parsedValues[0])
                    ? parsedValues
                    : [parsedValues];

                const res = await fetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range || "Sheet1"}:append?valueInputOption=USER_ENTERED`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ values: valuesToSubmit }),
                    }
                );
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(`Sheets Error: ${error.error?.message || res.statusText}`);
                }
                return await res.json();
            },
        },
        {
            id: "get_rows",
            name: "Get Rows",
            description: "Read cells from a Google Sheet",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { spreadsheetId, range, sheetName, rangeSpecific } = config;
                if (!accessToken) throw new Error("Google Access Token is required");
                if (!spreadsheetId) throw new Error("Spreadsheet ID is required");

                // Combine tab name (range or sheetName) with A1 notation (rangeSpecific)
                const tab = range || sheetName || "Sheet1";
                const finalRange = rangeSpecific ? `${tab}!${rangeSpecific}` : tab;

                const res = await fetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${finalRange}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(`Sheets Error: ${error.error?.message || res.statusText}`);
                }
                const data = await res.json();
                return {
                    values: data.values || [],
                    range: data.range,
                    count: data.values?.length || 0
                };
            },
        },
        {
            id: "update_row",
            name: "Update Row",
            description: "Update an existing row in a Google Sheet",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { spreadsheetId, range, sheetName, rowIndex, values, rowData } = config;
                if (!accessToken) throw new Error("Google Access Token is required");
                if (!spreadsheetId) throw new Error("Spreadsheet ID is required");
                if (!rowIndex) throw new Error("Row Index is required for Update Row");

                let finalValues = values;
                if (!finalValues && rowData) {
                    finalValues = Object.values(typeof rowData === 'string' ? JSON.parse(rowData) : rowData);
                }
                let parsedValues = typeof finalValues === "string" ? JSON.parse(finalValues) : finalValues;

                // Ensure it's a 2D array
                const valuesToSubmit = Array.isArray(parsedValues) && Array.isArray(parsedValues[0])
                    ? parsedValues
                    : [parsedValues];

                // Tab name preference: range > sheetName > "Sheet1"
                const tab = (range || sheetName || "Sheet1").split('!')[0];
                const updateRange = `${tab}!A${rowIndex}`;

                const res = await fetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`,
                    {
                        method: "PUT",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ values: valuesToSubmit }),
                    }
                );
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(`Sheets Error: ${error.error?.message || res.statusText}`);
                }
                return await res.json();
            },
        },
    ],
});

registry.register({
    id: "google_docs",
    name: "Google Docs",
    category: "utility",
    actions: [
        {
            id: "create_doc",
            name: "Create Document",
            description: "Create a new Google Document",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { title, content } = config;
                if (!accessToken) throw new Error("Google Access Token is required");

                // 1. Create the Doc
                const res = await fetch("https://docs.googleapis.com/v1/documents", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ title: title || "Untitled Document" }),
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(`Docs Error: ${error.error?.message || res.statusText}`);
                }
                const doc = await res.json();

                // 2. If content is provided, append it immediately
                if (content && doc.documentId) {
                    await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            requests: [
                                {
                                    insertText: {
                                        text: content,
                                        endOfSegmentLocation: {},
                                    },
                                },
                            ],
                        }),
                    });
                }

                return { ...doc, url: `https://docs.google.com/document/d/${doc.documentId}/edit` };
            },
        },
        {
            id: "append_text",
            name: "Append Text",
            description: "Append text to an existing Google Document",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { documentId, text } = config;
                if (!accessToken) throw new Error("Google Access Token is required");
                if (!documentId) throw new Error("Document ID is required");

                const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        requests: [
                            {
                                insertText: {
                                    text: text || "",
                                    endOfSegmentLocation: {},
                                },
                            },
                        ],
                    }),
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(`Docs Error: ${error.error?.message || res.statusText}`);
                }
                return await res.json();
            },
        },
        {
            id: "get_doc",
            name: "Get Document",
            description: "Read the content of a Google Document",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { documentId } = config;
                if (!accessToken) throw new Error("Google Access Token is required");
                if (!documentId) throw new Error("Document ID is required");

                const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(`Docs Error: ${error.error?.message || res.statusText}`);
                }
                const doc = await res.json();

                // Extract plain text from the document structural elements
                let text = "";
                if (doc.body && doc.body.content) {
                    doc.body.content.forEach((element: any) => {
                        if (element.paragraph) {
                            element.paragraph.elements.forEach((el: any) => {
                                if (el.textRun) {
                                    text += el.textRun.content;
                                }
                            });
                        }
                    });
                }

                return { ...doc, text };
            }
        }
    ],
});

// ─── OpenRouter (300+ AI Models) ─────────────────────────────
registry.register({
    id: "openrouter",
    name: "OpenRouter",
    category: "ai",
    actions: [
        {
            id: "chat",
            name: "Chat Completion",
            description: "Access 300+ AI models via OpenRouter",
            execute: async (config) => {
                const { apiKey, model, systemPrompt, userPrompt, temperature, maxTokens } = config;
                if (!apiKey) throw new Error("OpenRouter API Key is required");
                const messages: any[] = [];
                if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
                messages.push({ role: "user", content: userPrompt || "" });
                const payload: any = { model: model || "mistralai/mistral-7b-instruct", messages };
                if (temperature) payload.temperature = Number(temperature);
                if (maxTokens) payload.max_tokens = Number(maxTokens);
                const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://aion.app",
                        "X-Title": "AION",
                    },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(`OpenRouter Error: ${err.error?.message || res.statusText}`);
                }
                const data = await res.json();
                return { text: data.choices[0].message.content };
            },
        },
    ],
});

// ─── Logic: IF/ELSE ──────────────────────────────────────────
registry.register({
    id: "if_else",
    name: "IF / ELSE",
    category: "logic",
    actions: [
        {
            id: "condition",
            name: "Condition Check",
            description: "Branch workflow based on a condition",
            execute: async (config, context) => {
                const { leftValue, operator, rightValue } = config;
                let left = leftValue;
                let right = rightValue;
                // Auto-convert numbers
                if (!isNaN(Number(left)) && !isNaN(Number(right))) { left = Number(left); right = Number(right); }
                let result = false;
                switch (operator) {
                    case "equals": result = left == right; break;
                    case "not_equals": result = left != right; break;
                    case "greater_than": result = Number(left) > Number(right); break;
                    case "less_than": result = Number(left) < Number(right); break;
                    case "contains": result = String(left).includes(String(right)); break;
                    case "not_contains": result = !String(left).includes(String(right)); break;
                    case "starts_with": result = String(left).startsWith(String(right)); break;
                    case "is_empty": result = !left || String(left).trim() === ""; break;
                    case "is_not_empty": result = !!left && String(left).trim() !== ""; break;
                    default: result = Boolean(left);
                }
                return { result, branch: result ? "true" : "false", leftValue: left, rightValue: right };
            },
        },
    ],
});

// ─── Logic: Loop ─────────────────────────────────────────────
registry.register({
    id: "loop",
    name: "Loop",
    category: "logic",
    actions: [
        {
            id: "for_each",
            name: "For Each Item",
            description: "Iterate over an array of items",
            execute: async (config) => {
                const { inputArray } = config;
                const arr = typeof inputArray === "string" ? JSON.parse(inputArray) : inputArray;
                if (!Array.isArray(arr)) throw new Error("Input must be an array");
                return { items: arr, count: arr.length, currentItem: arr[0] };
            },
        },
    ],
});

// ─── Utility: Set Variable ────────────────────────────────────
registry.register({
    id: "set_variable",
    name: "Set Variable",
    category: "utility",
    actions: [
        {
            id: "set",
            name: "Set Values",
            description: "Set named variables to pass data through the workflow",
            execute: async (config) => {
                const { variables } = config;
                if (typeof variables === "string") return JSON.parse(variables);
                return variables || {};
            },
        },
    ],
});

// ─── Utility: Transform / Map Data ───────────────────────────
registry.register({
    id: "transform",
    name: "Transform Data",
    category: "utility",
    actions: [
        {
            id: "map",
            name: "Map / Extract Fields",
            description: "Extract or reshape fields from input data",
            execute: async (config, context) => {
                const { expression } = config;
                // expression is a JS expression string evaluated with the context
                try {
                    const fn = new Function("data", "context", `"use strict"; return (${expression})`);
                    return fn(context?.nodes || {}, context);
                } catch (e: any) {
                    throw new Error(`Transform error: ${e.message}`);
                }
            },
        },
    ],
});

// ─── Utility: Delay / Wait ────────────────────────────────────
registry.register({
    id: "delay",
    name: "Delay / Wait",
    category: "utility",
    actions: [
        {
            id: "wait",
            name: "Wait",
            description: "Pause execution for a number of seconds",
            execute: async (config) => {
                const seconds = Math.min(Number(config.seconds || 1), 60); // max 60s
                await new Promise(resolve => setTimeout(resolve, seconds * 1000));
                return { waited_seconds: seconds, continued_at: new Date().toISOString() };
            },
        },
    ],
});

// ─── Utility: Merge ──────────────────────────────────────────
registry.register({
    id: "merge",
    name: "Merge",
    category: "utility",
    actions: [
        {
            id: "combine",
            name: "Combine Inputs",
            description: "Merge outputs from multiple nodes into one object",
            execute: async (config, context) => {
                const { nodeIds } = config;
                const ids: string[] = typeof nodeIds === "string" ? nodeIds.split(",").map(s => s.trim()) : nodeIds || [];
                const merged: any = {};
                for (const id of ids) {
                    if (context?.nodes?.[id]) merged[id] = context.nodes[id];
                }
                return merged;
            },
        },
    ],
});

// ─── Code Runner (JS Sandbox) ────────────────────────────────
registry.register({
    id: "code",
    name: "Code",
    category: "utility",
    actions: [
        {
            id: "run_js",
            name: "Run JavaScript",
            description: "Execute custom JavaScript code with access to node outputs",
            execute: async (config, context) => {
                const { code: userCode } = config;
                if (!userCode) return {};
                try {
                    const fn = new Function("$input", "context", `"use strict";\n${userCode}`);
                    const result = fn(context?.nodes || {}, context);
                    return { result: await result };
                } catch (e: any) {
                    throw new Error(`Code Error: ${e.message}`);
                }
            },
        },
    ],
});
