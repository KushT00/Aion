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

        return NextResponse.json({ success: true, message: 'Credential saved securely' });
    } catch (error: any) {
        console.error('[SAVE CREDENTIAL ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed to save credential' }, { status: 500 });
    }
}
