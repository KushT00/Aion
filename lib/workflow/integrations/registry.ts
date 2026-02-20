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
            execute: async (config) => {
                const { botToken, chatId, text, parseMode } = config;
                if (!botToken) throw new Error("Telegram Bot Token is required");
                if (!chatId) throw new Error("Chat ID is required");
                const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ chat_id: chatId, text: text || "", parse_mode: parseMode || "Markdown" }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(`Telegram Error: ${err.description || res.statusText}`);
                }
                return await res.json();
            },
        },
    ],
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
                const { spreadsheetId, range, values } = config;
                if (!accessToken) throw new Error("Google Access Token is required");
                if (!spreadsheetId) throw new Error("Spreadsheet ID is required");
                const parsedValues = typeof values === "string" ? JSON.parse(values) : values;
                const res = await fetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range || "Sheet1"}:append?valueInputOption=USER_ENTERED`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ values: [parsedValues] }),
                    }
                );
                if (!res.ok) throw new Error(`Sheets Error: ${res.statusText}`);
                return await res.json();
            },
        },
        {
            id: "read_range",
            name: "Read Range",
            description: "Read cells from a Google Sheet",
            execute: async (config, input) => {
                const accessToken = config.accessToken || input?.env?.GOOGLE_ACCESS_TOKEN;
                const { spreadsheetId, range } = config;
                if (!accessToken) throw new Error("Google Access Token is required");
                const res = await fetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range || "Sheet1"}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (!res.ok) throw new Error(`Sheets Error: ${res.statusText}`);
                return await res.json();
            },
        },
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
