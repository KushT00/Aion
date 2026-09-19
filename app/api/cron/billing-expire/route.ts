import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/cron/billing-expire — flip past-due entitlements to expired.
// Same guard pattern as /api/cron: CRON_SECRET required when configured.
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    const provided = request.nextUrl.searchParams.get('secret');
    if (auth !== `Bearer ${cronSecret}` && provided !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('expire_entitlements');
    if (error) throw error;
    return NextResponse.json({ expired: Number(data ?? 0) });
  } catch {
    return NextResponse.json({ error: 'expiry_failed', message: 'Could not expire entitlements.' }, { status: 500 });
  }
}
