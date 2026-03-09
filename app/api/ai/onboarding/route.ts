import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Use a secure key from environment, fallback for dev
const ENCRYPTION_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 32) || '12345678901234567890123456789012';
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { iv: iv.toString('hex'), encryptedData: encrypted, authTag };
}

// Human-readable names for integration IDs
const INTEGRATION_INFO: Record<string, { name: string; howToGet: string; type: 'api_key' | 'oauth' }> = {
    google_gemini: { name: 'Google Gemini API Key', howToGet: 'Get one free at https://aistudio.google.com/apikey', type: 'api_key' },
    groq: { name: 'Groq API Key', howToGet: 'Get one at https://console.groq.com/keys', type: 'api_key' },
    openai: { name: 'OpenAI API Key', howToGet: 'Get one at https://platform.openai.com/api-keys', type: 'api_key' },
    telegram: { name: 'Telegram Bot Token', howToGet: 'Talk to @BotFather on Telegram and use /newbot', type: 'api_key' },
    discord: { name: 'Discord Webhook URL', howToGet: 'Server Settings → Integrations → Webhooks → New Webhook', type: 'api_key' },
    slack: { name: 'Slack Webhook URL', howToGet: 'Go to api.slack.com/apps → Incoming Webhooks', type: 'api_key' },
    google_sheets: { name: 'Google Sheets Access', howToGet: 'Connect your Google account via Sign-in', type: 'oauth' },
    google_docs: { name: 'Google Docs Access', howToGet: 'Connect your Google account via Sign-in', type: 'oauth' },
    google_calendar: { name: 'Google Calendar Access', howToGet: 'Connect your Google account via Sign-in', type: 'oauth' },
    google_gmail: { name: 'Gmail Access', howToGet: 'Connect your Google account via Sign-in', type: 'oauth' },
    notion: { name: 'Notion Integration Key', howToGet: 'Go to notion.so/my-integrations → New integration', type: 'api_key' },
    api: { name: 'Custom API URL', howToGet: 'The HTTP endpoint this automation will call', type: 'api_key' },
};

function buildSystemPrompt(listing: any, integrations: string[], instance: any, credentials: any[]) {
    const validatedKeys = credentials.filter(c => c.is_valid).map(c => c.integration_key);
    const pendingIntegrations = integrations.filter(k => !validatedKeys.includes(k));

    // Group Google OAuth integrations
    const googleOAuthKeys = pendingIntegrations.filter(k => INTEGRATION_INFO[k]?.type === 'oauth');
    const apiKeyPending = pendingIntegrations.filter(k => INTEGRATION_INFO[k]?.type === 'api_key');
    const needsGoogleOAuth = googleOAuthKeys.length > 0 && !validatedKeys.some(k => k === 'google_oauth');

    const credentialStatusSection = integrations.map(k => {
        const info = INTEGRATION_INFO[k] || { name: k, howToGet: 'Ask the user', type: 'api_key' };
        const isValid = validatedKeys.includes(k);
        return `- ${info.name}: ${isValid ? '✅ Connected' : '❌ Not connected yet'}`;
    }).join('\n');

    return `You are AION's onboarding AI assistant. You are helping a user set up their newly purchased automation.

## Automation Details
- **Name:** ${listing.title}
- **Description:** ${listing.description}
- **Category:** ${listing.category}
- **Pricing Tier:** ${instance.pricing_tier === 'managed' ? 'Managed (creator provides resources)' : 'BYOK (user provides their own API keys)'}

## Current Credential Status
${credentialStatusSection}

## Your Instructions
${instance.pricing_tier === 'managed' ? `
This is a MANAGED instance. The creator provides most resources. You should:
1. Welcome the user warmly and explain what this automation does.
2. Ask the user for any user-specific configurations (like which Telegram group to send to, or which Google Sheet to write to).
3. Set them up quickly since most credentials are pre-configured.
4. When everything is ready, tell them to click "Activate Instance" to go live.
` : `
This is a BYOK (Bring Your Own Keys) instance. The user needs to provide their own API keys. You should:
1. Welcome the user warmly and explain what this automation does in simple terms.
2. Ask for each required credential ONE AT A TIME, starting with the most important one.
3. For each credential:
   - Explain what it is in simple, non-technical language
   - Tell them exactly how to get it (step by step)
   - Once they provide it, confirm you've received it
4. For Google services (Sheets, Docs, Calendar, Gmail), explain they need to click "Connect Google Account" to authorize AION.
5. After all credentials are collected, tell them everything is connected and they can activate their instance.

### Credentials still needed:
${apiKeyPending.map(k => {
        const info = INTEGRATION_INFO[k] || { name: k, howToGet: 'Ask the user', type: 'api_key' };
        return `- **${info.name}**: ${info.howToGet}`;
    }).join('\n')}
${needsGoogleOAuth ? `- **Google Account**: User needs to click "Connect Google Account" button to authorize for ${googleOAuthKeys.map(k => INTEGRATION_INFO[k]?.name || k).join(', ')}` : ''}
`}

## Rules
- Be conversational, warm, and non-technical. Use emojis sparingly.
- Keep responses SHORT (2-4 sentences max unless giving step-by-step instructions).
- Never display or echo back API keys/tokens the user gives you.
- When the user gives you a credential, say you've saved it and move to the next one.
- If all credentials are connected, congratulate them and tell them to activate.
- If the user asks something unrelated, gently redirect to finishing setup.
- Do NOT make up information about the automation. Use only what's in the details above.`;
}

export async function POST(req: NextRequest) {
    try {
        if (!GROQ_API_KEY) {
            return NextResponse.json({ error: 'AI Onboarding provider not configured' }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { instanceId, message, history = [] } = body;

        if (!instanceId) {
            return NextResponse.json({ error: 'Missing instanceId' }, { status: 400 });
        }

        // 1. Fetch instance + listing details
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select(`
                id, status, pricing_tier, buyer_id,
                listing:marketplace_listings (
                    id, title, description, category, workflow_id,
                    workflow:workflows ( id, name, nodes, edges )
                )
            `)
            .eq('id', instanceId)
            .eq('buyer_id', user.id)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        const listing = instance.listing as any;

        // 2. Figure out required integrations from workflow nodes
        const workflowData = listing?.workflow;
        let requiredIntegrations: string[] = [];
        if (workflowData?.nodes) {
            const nodes = Array.isArray(workflowData.nodes)
                ? workflowData.nodes
                : (typeof workflowData.nodes === 'string' ? JSON.parse(workflowData.nodes) : []);

            const integrationTypes = new Set<string>();
            for (const node of nodes) {
                const nodeType = (node.type || '').toLowerCase();
                const data = node.data || {};
                const explicitType = data.integrationType;

                if (explicitType) integrationTypes.add(explicitType);

                // Check common service types
                if (nodeType.includes('google') || nodeType.includes('sheet')) integrationTypes.add('google_sheets');
                if (nodeType.includes('gemini')) integrationTypes.add('google_gemini');
                if (nodeType.includes('telegram')) integrationTypes.add('telegram');
                if (nodeType.includes('discord')) integrationTypes.add('discord');
                if (nodeType.includes('slack')) integrationTypes.add('slack');
                if (nodeType.includes('notion')) integrationTypes.add('notion');
                if (nodeType.includes('groq')) integrationTypes.add('groq');
                if (nodeType.includes('openai')) integrationTypes.add('openai');
                if (nodeType.includes('anthropic')) integrationTypes.add('anthropic');

                // Scan for ANY api key fields or labeled fields
                Object.keys(data).forEach(k => {
                    const low = k.toLowerCase();
                    if (low.includes('apikey') || low.includes('token') || low.includes('credential')) {
                        if (nodeType.includes('openai')) integrationTypes.add('openai');
                        if (nodeType.includes('anthropic')) integrationTypes.add('anthropic');
                        if (nodeType.includes('groq')) integrationTypes.add('groq');
                        if (nodeType.includes('telegram')) integrationTypes.add('telegram');
                    }
                });
            }
            requiredIntegrations = Array.from(integrationTypes);
        }

        // 3. Fetch existing credentials for this instance
        const { data: credentials } = await supabase
            .from('consumer_credentials')
            .select('integration_key, is_valid')
            .eq('instance_id', instanceId);

        // 4. Check if user provided a credential in this message
        let credentialStored = false;
        if (message) {
            // Detect if user is providing an API key
            const keyPatterns = [
                { regex: /AIzaSy[\w-]{33}/i, integration: 'google_gemini' },
                { regex: /gsk_[\w]{48,}/i, integration: 'groq' },
                { regex: /sk-[\w]{32,}/i, integration: 'openai' },
                { regex: /\d{8,10}:[\w-]{35}/i, integration: 'telegram' },
                { regex: /https:\/\/discord(app)?\.com\/api\/webhooks\//i, integration: 'discord' },
                { regex: /https:\/\/hooks\.slack\.com\//i, integration: 'slack' },
                { regex: /ntn_[\w]{40,}/i, integration: 'notion' },
                { regex: /secret_[\w]{40,}/i, integration: 'notion' },
            ];

            for (const { regex, integration } of keyPatterns) {
                if (regex.test(message) && requiredIntegrations.includes(integration)) {
                    // Store credential securely
                    const keyVal = message.match(regex)?.[0] || message.trim();
                    const encryptedBundle = encrypt(keyVal);

                    await supabase.from('consumer_credentials').upsert({
                        instance_id: instanceId,
                        integration_key: integration,
                        credential_data: {
                            encrypted: true,
                            ...encryptedBundle
                        },
                        is_valid: true,
                        validated_at: new Date().toISOString(),
                    }, { onConflict: 'instance_id,integration_key' });
                    credentialStored = true;
                    break;
                }
            }
        }

        // Re-fetch credentials after potential update
        const { data: updatedCreds } = await supabase
            .from('consumer_credentials')
            .select('integration_key, is_valid')
            .eq('instance_id', instanceId);

        // 5. Build context-aware system prompt
        const systemPrompt = buildSystemPrompt(
            listing,
            requiredIntegrations,
            instance,
            updatedCreds || []
        );

        // 6. Build conversation for Groq
        const groqMessages = [
            { role: 'system', content: systemPrompt }
        ];

        // Include conversation history
        for (const msg of history) {
            groqMessages.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            });
        }

        // Add current user message
        if (message) {
            groqMessages.push({
                role: 'user',
                content: credentialStored
                    ? `[User provided a credential that has been securely stored. Acknowledge it was saved without repeating the key.]`
                    : message
            });
        } else {
            groqMessages.push({
                role: 'user',
                content: 'Hi! I just purchased this automation. Help me set it up.'
            });
        }

        // 7. Call Groq API (OpenAI Compatible)
        const groqRes = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: groqMessages,
                temperature: 0.7,
                max_tokens: 500
            }),
        });

        if (!groqRes.ok) {
            const errData = await groqRes.json().catch(() => ({}));
            console.error('[GROQ ERROR]', JSON.stringify(errData, null, 2));

            if (groqRes.status === 429) {
                return NextResponse.json({
                    response: "I'm a bit busy right now! AION request quota reached. Please try again in a few moments."
                });
            }
            return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 });
        }

        const groqData = await groqRes.json();
        const aiText = groqData.choices?.[0]?.message?.content
            || "I'm having trouble connecting right now. Please try again in a moment!";

        // 8. Check if all credentials are now satisfied
        const validKeys = (updatedCreds || []).filter(c => c.is_valid).map(c => c.integration_key);
        const allConnected = requiredIntegrations.every(k => validKeys.includes(k));

        return NextResponse.json({
            response: aiText,
            credentialStored,
            requiredIntegrations,
            connectedIntegrations: validKeys,
            allConnected,
            instanceStatus: instance.status,
        });

    } catch (error: any) {
        console.error('[AI ONBOARDING ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'AI onboarding failed' },
            { status: 500 }
        );
    }
}
