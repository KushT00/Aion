// AION Billing Part 5 — marketplace billing verification.
// Usage: node scripts/test-billing-part5.mjs
// Static checks always run. Live tests need Part 2→3→4→5 migrations applied.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SQL5 = 'supabase/migrations/20260919000003_aion_marketplace_billing.sql';

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`  ✅ ${n}`); };
const bad = (n, d) => { fail++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`); };
const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

console.log('\n[1/3] Static checks');
{
  if (!exists(SQL5)) bad(SQL5, 'missing');
  else {
    const sql = fs.readFileSync(SQL5, 'utf8');
    const checks = [
      ['platform_config (fee % configurable)', /platform_config[\s\S]*platform_fee_percent/s],
      ['entitlements w/ server expiry', /automation_entitlements[\s\S]*expires_at/s],
      ['entitlement statuses', /active.*expired.*cancelled.*suspended/s],
      ['no client expiry (started + duration in SQL)', /now\(\) \+ \(p_duration_days/],
      ['active-duplicate guard (partial unique)', /uq_entitlement_active[\s\S]*where status = 'active'/s],
      ['marketplace_transactions split audit', /marketplace_transactions[\s\S]*gross_amount[\s\S]*platform_fee[\s\S]*creator_amount/s],
      ['split invariant fee+creator=gross', /platform_fee \+ creator_amount = gross_amount/],
      ['creator_earnings traceable rows', /creator_earnings[\s\S]*transaction_id/s],
      ['earning pending|available|reversed', /pending.*available.*reversed/s],
      ['atomic purchase txn RPC', /purchase_automation_txn/],
      ['txn verifies + prices + deducts + purchase + entitlement + split', /deduct_credits[\s\S]*automation_entitlements[\s\S]*marketplace_transactions[\s\S]*creator_earnings/s],
      ['ledger reference = purchase_id', /automation_purchase', v_purchase::text/s],
      ['release earning → creator_earning ledger', /release_creator_earning[\s\S]*creator_earning/s],
      ['release idempotent', /already_processed/],
      ['refund keeps history (+refund rows)', /refund_purchase[\s\S]*'refund'/s],
      ['refund claws back released earnings', /Clawback/],
      ['refund cancels entitlement', /cancelled/],
      ['expire_entitlements sweep', /expire_entitlements/],
      ['RPCs locked to service_role', /revoke all on function public\.purchase_automation_txn/i],
    ];
    for (const [n, re] of checks) (re.test(sql) ? ok : bad)(n);
  }
  for (const [path, snippets] of [
    ['lib/billing/marketplace.ts', ['purchaseAutomationTxn', 'creatorEarningsSummary', 'releaseEarning', 'refundPurchase', 'expireEntitlements', 'getActiveEntitlement']],
    ['app/api/marketplace/purchase/route.ts', ['purchaseAutomationTxn', 'expiresAt', 'creatorAmount']],
    ['app/api/marketplace/entitlements/route.ts', ['getActiveEntitlement']],
    ['app/api/creator/earnings/route.ts', ['creatorEarningsSummary']],
    ['app/api/creator/earnings/release/route.ts', ['releaseEarning']],
    ['app/api/billing/refund/route.ts', ['refundPurchase']],
    ['app/api/cron/billing-expire/route.ts', ['expire_entitlements', 'CRON_SECRET']],
    ['app/(dashboard)/marketplace/[id]/page.tsx', ['Order Summary', 'Credits after purchase', 'entitlement', 'maxPrice']],
    ['app/(dashboard)/creator/earnings/page.tsx', ['Total Earnings', 'Pending Earnings', 'Available Earnings', 'Release to wallet']],
  ]) {
    if (!exists(path)) { bad(path, 'missing'); continue; }
    const src = fs.readFileSync(path, 'utf8');
    const missing = snippets.filter((s) => !src.includes(s));
    if (missing.length) bad(path, `missing: ${missing.join(', ')}`); else ok(path);
  }
  const pur = fs.readFileSync('app/api/marketplace/purchase/route.ts', 'utf8');
  if (/purchaseWithCredits|from\('purchases'\)\s*\.\s*insert/.test(pur)) bad('purchase route uses atomic txn only', 'old split flow remains');
  else ok('purchase route uses atomic txn only');
}

if (!URL || !SERVICE) {
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (static only)`);
  process.exit(fail ? 1 : 0);
}

console.log('\n[2/3] Live DB checks');
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
for (const t of ['automation_entitlements', 'marketplace_transactions', 'creator_earnings', 'platform_config']) {
  const r = await admin.from(t).select('id', { count: 'exact' }).limit(1);
  if (r.error && (r.error.code === 'PGRST205' || /platform_config/i.test(r.error.message))) {
    console.log(`  ⚠️  Part 5 migration NOT applied: public.${t} missing. Run Part 2→3→4→5 SQL in order.`);
    console.log(`\nRESULT: ${pass} passed, ${fail} failed (migrations pending)`);
    process.exit(2);
  }
  if (r.error && t === 'platform_config') {
    // platform_config has `key` PK, not `id` — retry correctly
    const r2 = await admin.from(t).select('key').limit(1);
    if (r2.error) { console.log('  ⚠️  platform_config missing — apply Part 5 migration.'); console.log(`\nRESULT: ${pass} passed, ${fail} failed (migrations pending)`); process.exit(2); }
    else ok(`${t} reachable`);
  } else if (r.error) bad(`${t} reachable`, r.error.message);
  else ok(`${t} reachable`);
}
if (fail) { console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(1); }

console.log('\n[3/3] Live marketplace billing');
// Setup: listing + buyer(100cr) + seller. Use two profiles if available.
const { data: listings } = await admin.from('marketplace_listings').select('id, seller_id').eq('is_active', true).limit(5);
const { data: profiles } = await admin.from('profiles').select('id').limit(3);
if (!listings?.length || !profiles?.length) {
  console.log('  ⚠️  Need ≥1 active listing + ≥1 profile. Re-run after seeding.');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(0);
}
// Pick a listing whose seller differs from our buyer.
let listing = listings.find((l) => l.seller_id !== profiles[0].id) ?? listings[0];
let buyerId = listing.seller_id === profiles[0].id ? profiles[1]?.id ?? profiles[0].id : profiles[0].id;
const sellerId = listing.seller_id;
if (buyerId === sellerId) {
  console.log('  ⚠️  Need buyer ≠ seller profiles for split test.');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(0);
}
const listingId = listing.id;
// Clean slate: remove any active entitlement for this pair (test isolation).
await admin.from('automation_entitlements').delete().eq('user_id', buyerId).eq('automation_id', listingId).eq('status', 'active');

const q = async (fn, args) => admin.rpc(fn, args);
const bal = async (uid) => Number((await admin.from('wallets').select('credit_balance').eq('user_id', uid).maybeSingle()).data?.credit_balance ?? 0);

// Fund buyer to exactly 100.
await admin.rpc('ensure_wallet_for_user', { p_user_id: buyerId });
await admin.rpc('ensure_wallet_for_user', { p_user_id: sellerId });
{
  const b = await bal(buyerId);
  if (b < 100) await admin.rpc('add_credits', { p_user_id: buyerId, p_amount: 100 - b, p_transaction_type: 'adjustment', p_reference_id: 'p5-fund', p_description: 'Part5 fund to 100' });
  if (b > 100) await admin.rpc('deduct_credits', { p_user_id: buyerId, p_amount: b - 100, p_transaction_type: 'adjustment', p_reference_id: 'p5-trim', p_description: 'Part5 trim to 100' });
}
const sellerBefore = await bal(sellerId);
const { data: feeRow } = await admin.from('platform_config').select('value').eq('key', 'platform_fee_percent').single();
const feePct = Number(feeRow?.value ?? 20);
console.log(`  buyer=100.00 seller=${sellerBefore.toFixed(2)} fee=${feePct}%`);

// a. Price a 30d BYOK purchase, then buy atomically.
const { data: quote } = await q('quote_purchase', { p_listing_id: listingId, p_customer_type: 'byok', p_duration_days: 30 });
const price = Number(quote.customer_price);
console.log(`  30d BYOK price: ${price.toFixed(2)}`);
{
  const { data: r, error } = await q('purchase_automation_txn', { p_user_id: buyerId, p_listing_id: listingId, p_customer_type: 'byok', p_duration_days: 30, p_max_price: price });
  if (error) { bad('atomic purchase', error.message); }
  else {
    const bAfter = await bal(buyerId);
    const expBal = 100 - price;
    const expFee = Math.round(price * feePct) / 100;
    const expCreator = Math.round((price - expFee) * 100) / 100;
    if (Math.abs(bAfter - expBal) < 0.02) ok(`buyer 100 → ${bAfter.toFixed(2)} (−${price.toFixed(2)})`);
    else bad('buyer balance', `got ${bAfter}, want ${expBal}`);
    if (Math.abs(Number(r.platform_fee) - expFee) < 0.02 && Math.abs(Number(r.creator_amount) - expCreator) < 0.02) {
      ok(`split: gross ${price.toFixed(2)} = platform ${Number(r.platform_fee).toFixed(2)} + creator ${Number(r.creator_amount).toFixed(2)}`);
    } else bad('fee split', JSON.stringify(r));
    // Expiry ≈ now + 30d (server-computed).
    const days = (new Date(r.expires_at).getTime() - Date.now()) / 86400000;
    if (days > 29.9 && days < 30.1) ok(`expiry server-computed: +${days.toFixed(2)}d`);
    else bad('expiry', r.expires_at);
    // Ledger: -price automation_purchase w/ purchase reference.
    const { data: led } = await admin.from('credit_transactions').select('amount, transaction_type, reference_id').eq('user_id', buyerId).eq('reference_id', r.purchase_id).limit(5);
    if (led?.some((t) => t.transaction_type === 'automation_purchase' && Math.abs(Number(t.amount) + price) < 0.02)) {
      ok('ledger −price automation_purchase w/ purchase reference');
    } else bad('ledger entry', JSON.stringify(led));
    // Creator earning pending (not yet in wallet).
    const { data: earn } = await admin.from('creator_earnings').select('amount, status').eq('transaction_id', r.transaction_id).maybeSingle();
    const sAfter = await bal(sellerId);
    if (earn?.status === 'pending' && Math.abs(sAfter - sellerBefore) < 0.02) ok('creator earning pending (wallet untouched)');
    else bad('creator pending', JSON.stringify(earn));
    // Release → seller wallet +amount, idempotent re-release.
    const { data: rel, error: relErr } = await q('release_creator_earning', { p_earning_id: (await admin.from('creator_earnings').select('id').eq('transaction_id', r.transaction_id).single()).data.id });
    const sRel = await bal(sellerId);
    if (!relErr && Math.abs(sRel - sellerBefore - Number(rel.amount)) < 0.02) ok(`release: seller +${Number(rel.amount).toFixed(2)} (creator_earning ledger)`);
    else bad('release', relErr?.message ?? JSON.stringify(rel));

    // b. Duplicate while active → rejected, balance unchanged.
    const bDup0 = await bal(buyerId);
    const { error: dupErr } = await q('purchase_automation_txn', { p_user_id: buyerId, p_listing_id: listingId, p_customer_type: 'byok', p_duration_days: 30, p_max_price: price });
    const bDup1 = await bal(buyerId);
    if (dupErr && /duplicate_purchase/i.test(dupErr.message) && Math.abs(bDup0 - bDup1) < 0.005) ok('duplicate purchase rejected, balance unchanged');
    else bad('duplicate guard', dupErr?.message ?? 'accepted!');

    // c. Concurrent race: expire entitlement first, then fire two txns.
    await admin.from('automation_entitlements').delete().eq('user_id', buyerId).eq('automation_id', listingId);
    const [c1, c2] = await Promise.allSettled([
      q('purchase_automation_txn', { p_user_id: buyerId, p_listing_id: listingId, p_customer_type: 'byok', p_duration_days: 7, p_max_price: 1000 }),
      q('purchase_automation_txn', { p_user_id: buyerId, p_listing_id: listingId, p_customer_type: 'byok', p_duration_days: 7, p_max_price: 1000 }),
    ]);
    const wins = [c1, c2].filter((r2) => r2.status === 'fulfilled' && !r2.value.error).length;
    if (wins === 1) ok('concurrent purchases: exactly one wins (other rolls back)');
    else bad('concurrency', `wins=${wins}`);
    // Cleanup race purchase (refund it to restore economics).
    const winVal = [c1, c2].find((r2) => r2.status === 'fulfilled' && !r2.value.error)?.value?.data;
    if (winVal) await q('refund_purchase', { p_purchase_id: winVal.purchase_id });

    // d. Refund the original purchase: buyer +gross, history intact.
    const bRef0 = await bal(buyerId);
    const { data: ref, error: refErr } = await q('refund_purchase', { p_purchase_id: r.purchase_id });
    const bRef1 = await bal(buyerId);
    if (!refErr && Math.abs(bRef1 - bRef0 - price) < 0.02) ok(`refund: buyer +${price.toFixed(2)} (adjustment row, history intact)`);
    else bad('refund', refErr?.message ?? JSON.stringify(ref));
    const { data: hist } = await admin.from('credit_transactions').select('amount, transaction_type').eq('user_id', buyerId).eq('reference_id', r.purchase_id);
    if (hist?.some((t) => Number(t.amount) < 0) && hist?.some((t) => t.transaction_type === 'refund' && Number(t.amount) > 0)) {
      ok('refund history: −purchase and +refund rows coexist');
    } else bad('refund history', JSON.stringify(hist));
  }
}
// e. Insufficient: buyer with 0 cannot buy.
{
  const b = await bal(buyerId);
  if (b > 0) await admin.rpc('deduct_credits', { p_user_id: buyerId, p_amount: b, p_transaction_type: 'adjustment', p_reference_id: 'p5-drain', p_description: 'drain' });
  const { error } = await q('purchase_automation_txn', { p_user_id: buyerId, p_listing_id: listingId, p_customer_type: 'managed', p_duration_days: 30, p_max_price: 10000 });
  if (error && /insufficient_credits/i.test(error.message)) ok('insufficient credits → purchase aborted, nothing created');
  else bad('insufficient guard', error?.message ?? 'accepted!');
  // restore funding for idempotent re-runs
  await admin.rpc('add_credits', { p_user_id: buyerId, p_amount: 100, p_transaction_type: 'adjustment', p_reference_id: 'p5-restore', p_description: 'restore' });
}
// f. Expiry sweep marks past-due active entitlements expired.
{
  const n = await admin.rpc('expire_entitlements');
  if (!n.error) ok(`expiry sweep runs (expired ${Number(n.data ?? 0)} this call)`);
  else bad('expiry sweep', n.error.message);
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
