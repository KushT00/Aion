import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

async function validateKey(integrationKey: string, value: string): Promise<boolean> {
    try {
        switch (integrationKey) {
            case 'google_gemini': {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${value}`);
                return res.ok;
            }
            case 'groq': {
                const res = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { 'Authorization': `Bearer ${value}` }
                });
                return res.ok;
            }
            case 'openai': {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${value}` }
                });
                return res.ok;
            }
            case 'telegram': {
                const res = await fetch(`https://api.telegram.org/bot${value}/getMe`);
                return res.ok;
            }
            case 'anthropic': {
                const res = await fetch('https://api.anthropic.com/v1/models', {
                    headers: {
                        'x-api-key': value,
                        'anthropic-version': '2023-06-01'
                    }
                });
                return res.ok;
            }
            case 'openrouter': {
                const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
                    headers: { 'Authorization': `Bearer ${value}` }
                });
                return res.ok;
            }
            default:
                // If we don't have a validator for it, just assume valid for now
                return true;
        }
    } catch (err) {
        console.error(`Validation error for ${integrationKey}:`, err);
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { instanceId, integrationKey, value } = await req.json();

        if (!instanceId || !integrationKey || !value) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Verify ownership
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id')
            .eq('id', instanceId)
            .eq('buyer_id', user.id)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        // 2. Validate Key
        const trimmedValue = value.trim();
        const isValid = await validateKey(integrationKey, trimmedValue);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid API Key provided. Could not authenticate with service.' }, { status: 400 });
        }

        // 3. Encrypt the credential
        const encryptedBundle = encrypt(trimmedValue);

        // 4. Upsert the credential
        const { error: upsertErr } = await supabase
            .from('consumer_credentials')
            .upsert({
                instance_id: instanceId,
                integration_key: integrationKey,
                credential_data: {
                    encrypted: true,
                    ...encryptedBundle
                },
                is_valid: true,
                validated_at: new Date().toISOString(),
            }, {
                onConflict: 'instance_id,integration_key',
            });

        if (upsertErr) throw upsertErr;

        // 5. Special Case: If Telegram, set webhook to the instance-specific webhook URL
        if (integrationKey === 'telegram') {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
            
            // Telegram requires https for webhooks. In local dev, this might fail unless using ngrok
            if (baseUrl.startsWith('https://')) {
                const webhookUrl = `${baseUrl}/api/webhooks/instance/${instanceId}`;
                console.log(`[TELEGRAM] Setting webhook for instance ${instanceId} to ${webhookUrl}`);
                try {
                    const setWebhookRes = await fetch(`https://api.telegram.org/bot${trimmedValue}/setWebhook`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: webhookUrl })
                    });
                    const resJson = await setWebhookRes.json();
                    if (!setWebhookRes.ok) {
                        console.error('[TELEGRAM WEBHOOK ERROR]', resJson);
                    } else {
                        console.log(`[TELEGRAM] Webhook set successfully:`, resJson);
                    }
                } catch (webhookErr) {
                    console.error('[TELEGRAM WEBHOOK CATCH]', webhookErr);
                }
            } else {
                console.warn(`[TELEGRAM] ⚠️ Webhook setup SKIPPED. Telegram REQUIRES an https:// URL.`);
                console.warn(`[TELEGRAM] Current URL is ${baseUrl}. Please use ngrok to get a public https:// address.`);
                console.warn(`[TELEGRAM] Once ngrok is running, set NEXT_PUBLIC_APP_URL=https://your-ngrok.app in your .env.local file.`);
            }
        }


        return NextResponse.json({ success: true, message: 'Credential saved securely' });
    } catch (error: unknown) {
        console.error('[SAVE CREDENTIAL ERROR]', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save credential' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { instanceId, integrationKey } = await req.json();

        if (!instanceId || !integrationKey) {
            return NextResponse.json({ error: 'Missing instanceId or integrationKey' }, { status: 400 });
        }

        // 1. Verify ownership
        const { data: instance, error: instErr } = await supabase
            .from('consumer_instances')
            .select('id')
            .eq('id', instanceId)
            .eq('buyer_id', user.id)
            .single();

        if (instErr || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        // 2. Delete the credential
        const { error: deleteErr } = await supabase
            .from('consumer_credentials')
            .delete()
            .eq('instance_id', instanceId)
            .eq('integration_key', integrationKey);

        if (deleteErr) throw deleteErr;

        return NextResponse.json({ success: true, message: 'Credential removed' });
    } catch (error: unknown) {
        console.error('[DELETE CREDENTIAL ERROR]', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
    }
}
