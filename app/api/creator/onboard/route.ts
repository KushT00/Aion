import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/creator/onboard — submit creator onboarding form
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const {
            expertise,
            skills,
            experience_years,
            bio,
            work_style,
            specializations,
            portfolio_links,
            automation_categories,
        } = body;

        // Validate required fields
        if (!expertise || !skills?.length || !bio || bio.length < 50) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const creatorProfile = {
            expertise,
            skills,
            experience_years: experience_years || 0,
            bio,
            work_style: work_style || '',
            specializations: specializations || [],
            portfolio_links: portfolio_links || [],
            automation_categories: automation_categories || [],
        };

        // Update profile: mark as creator
        const { error: profileErr } = await supabase
            .from('profiles')
            .update({
                is_creator: true,
                role: 'creator',
                creator_onboarded_at: new Date().toISOString(),
                creator_profile: creatorProfile,
                bio: bio,
            })
            .eq('id', user.id);

        if (profileErr) {
            console.error('[CREATOR ONBOARD] Profile update error:', profileErr);
            return NextResponse.json({ error: profileErr.message }, { status: 500 });
        }

        // Log the application (best-effort, don't fail if table doesn't exist yet)
        try {
            await supabase.from('creator_applications').insert({
                user_id: user.id,
                status: 'approved',
                expertise,
                skills,
                experience_years: experience_years || 0,
                bio,
                work_style: work_style || '',
                specializations: specializations || [],
                portfolio_links: portfolio_links || [],
                automation_categories: automation_categories || [],
            });
        } catch (_) { /* non-critical */ }

        // Create a wallet entry for the creator if one doesn't exist
        const { data: existingWallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!existingWallet) {
            await supabase.from('wallets').insert({
                user_id: user.id,
                balance: 0,
                currency: 'USD',
            });
        }

        return NextResponse.json({ success: true, message: 'Creator account activated!' });
    } catch (err: any) {
        console.error('[CREATOR ONBOARD ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
