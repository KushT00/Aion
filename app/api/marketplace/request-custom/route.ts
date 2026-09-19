import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientKey } from '@/lib/rate-limit';

const GEMINI_API_KEY = process.env.AION_GEMINI_API_KEY || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
    try {
        // Basic abuse protection for this public endpoint
        const rl = rateLimit(clientKey(req), 10, 60_000);
        if (!rl.ok) {
            return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
        }

        const body = await req.json().catch(() => null);
        const { name, email, projectDescription, timeline, budget, targetCreatorId } = body ?? {};

        if (
            typeof name !== 'string' || name.trim().length === 0 || name.length > 120 ||
            typeof email !== 'string' || !EMAIL_RE.test(email.trim()) ||
            typeof projectDescription !== 'string' || projectDescription.trim().length < 20 || projectDescription.length > 5000
        ) {
            return NextResponse.json({ error: 'Please provide a valid name, email, and a project description (20+ characters).' }, { status: 400 });
        }

        if (timeline !== undefined && (typeof timeline !== 'string' || timeline.length > 50)) {
            return NextResponse.json({ error: 'Invalid timeline' }, { status: 400 });
        }
        if (budget !== undefined && (typeof budget !== 'string' || budget.length > 50)) {
            return NextResponse.json({ error: 'Invalid budget' }, { status: 400 });
        }
        if (targetCreatorId !== undefined && targetCreatorId !== null && typeof targetCreatorId !== 'string') {
            return NextResponse.json({ error: 'Invalid creator' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Let's use AI to analyze the lead!
        let summary = "A custom automation request.";
        let urgencyScore = 5;
        let urgencyTag = 'Slow';

        try {
            if (GEMINI_API_KEY) {
                const prompt = `
You are a Lead Scoring AI for an AI Automation Agency marketplace.
A potential client wants a custom automation built.

Client Name: ${name}
Project Details: ${projectDescription}
Timeline: ${timeline}
Budget: ${budget}

Task:
1. Write a 1-sentence punchy summary of what they want built.
2. Assign an urgency score strictly from 1 to 10 based on the timeline, budget flexibility, and project details (10 being immediate "Hot" lead ready to buy, 1 being "Slowest" window shopper).
3. Assign exactly one of these tags based on the score: "Hot" (score 8-10), "Slow" (score 4-7), "Slowest" (score 1-3).

Respond strictly in JSON format matching this structure:
{
  "summary": "Example summary.",
  "score": 8,
  "tag": "Hot"
}
`;

                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: 'application/json' }
                    })
                });

                if (res.ok) {
                    const aiData = await res.json();
                    const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textContent) {
                        try {
                            const parsed = JSON.parse(textContent);
                            if (typeof parsed.summary === 'string' && parsed.summary) summary = parsed.summary.slice(0, 300);
                            if (typeof parsed.score === 'number' && parsed.score >= 1 && parsed.score <= 10) urgencyScore = parsed.score;
                            if (parsed.tag === 'Hot' || parsed.tag === 'Slow' || parsed.tag === 'Slowest') urgencyTag = parsed.tag;
                        } catch {
                            console.error('[GEMINI LEAD SCORING] Invalid AI JSON, using defaults');
                        }
                    }
                } else {
                    console.error('[GEMINI LEAD SCORING ERROR]', await res.text());
                }
            } else {
                // Fallback heuristic if no API key
                if (timeline === 'urgent') { urgencyScore = 9; urgencyTag = 'Hot'; }
                else if (timeline === '1_week') { urgencyScore = 7; urgencyTag = 'Slow'; }
                else { urgencyScore = 3; urgencyTag = 'Slowest'; }
                summary = `Wants an automation: ${projectDescription.slice(0, 100)}...`;
            }
        } catch (aiErr) {
            console.error('[AI SCORING FALLBACK]', aiErr);
            if (timeline === 'urgent') { urgencyScore = 9; urgencyTag = 'Hot'; }
        }

        // We map the requested targetCreatorId to the new lead.
        // If the consumer didn't select a specific creator, we fallback to NULL so it can go to a marketplace pool.
        const assignedCreatorId = targetCreatorId || null;

        // Insert Lead — a real failure is returned so the UI can show a retry state
        const { data: newLead, error: insertErr } = await supabase
            .from('creator_custom_leads')
            .insert({
                consumer_id: user?.id || null,
                creator_id: assignedCreatorId,
                consumer_name: name.trim(),
                consumer_email: email.trim(),
                project_description: projectDescription,
                ai_summary: summary,
                urgency_score: urgencyScore,
                urgency_tag: urgencyTag,
                status: 'new'
            })
            .select('id')
            .single();

        if (insertErr) {
            // Missing table (migration not run yet): don't strand the user, but be honest in logs
            console.error('[SUPABASE LEAD INSERT ERROR]', insertErr.message || insertErr);
            return NextResponse.json({ error: 'Could not save your request. Please try again.' }, { status: 500 });
        }

        if (assignedCreatorId && newLead) {
            // Send notification to the creator
            await supabase.from('notifications').insert({
                user_id: assignedCreatorId,
                type: 'new_lead',
                title: 'New Custom Request',
                message: `${name} has requested a custom automation.`,
                metadata: { url: '/creator/leads', leadId: newLead.id }
            });
        }

        return NextResponse.json({ success: true, summary, urgencyTag });

    } catch (error: any) {
        console.error('[REQUEST CUSTOM ERRROR]', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
