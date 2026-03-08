import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Fetch all profiles designated as creators, including their expertise and skills from creator_profile jsonb
        const { data: creators, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, bio, is_creator, role, creator_profile')
            .or('is_creator.eq.true,role.eq.creator');

        if (error) {
            console.error('[FETCH CREATORS ERROR]', error);
            // Handle cases where the migration hasn't run gracefully
            if (error.code === '42703' || error.code === '42P01') {
                return NextResponse.json({
                    success: false,
                    creators: [],
                    error: 'Database schema needs migration. Please run the creator onboarding migrations.'
                });
            }
            throw error;
        }

        // We map the raw results to ensure a clean, reliable data structure for the frontend
        const safeCreators = (creators || []).map((c: any) => {
            const profileData = c.creator_profile || {};
            return {
                id: c.id,
                full_name: c.full_name || 'Anonymous Creator',
                avatar_url: c.avatar_url,
                bio: c.bio || profileData.bio || 'Experienced AI Automation Specialist.',
                expertise: profileData.expertise || 'General Automation',
                skills: Array.isArray(profileData.skills) ? profileData.skills : [],
                experience_years: profileData.experience_years || 1,
                // If there's no base rate in the form, use a stylized default for UI purposes
                hourly_rate: profileData.hourly_rate || Math.floor(Math.random() * 50) + 50
            };
        });

        return NextResponse.json({ success: true, creators: safeCreators });

    } catch (error: any) {
        console.error('[API FETCH CREATORS ERROR]', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
