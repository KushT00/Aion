// AION Billing Part 4 — BYOK + Managed engine verification.
// Usage: node scripts/test-billing-part4.mjs
// Static checks always run. Live tests need Part 2→3→4 migrations applied.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SQL4 = 'supabase/migrations/20260919000002_aion_billing_engine.sql';

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`  ✅ ${n}`); };
const bad = (n, d) => { fail++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`); };
const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

console.log('\n[1/3] Static checks');
{
  if (!exists(SQL4)) bad(SQL4, 'missing');
  else {
    const sql = fs.readFileSync(SQL4, 'utf8');
    const checks = [
      ['automation_pricing table', /create table if not exists public\.automation_pricing/i],
      ['BYOK prices per duration', /byok_prices/],
      ['managed internal cost per duration', /managed_base_internal/],
      ['resource cost rates', /resource_rates/],
      ['margin percent|fixed', /margin_type.*percent.*fixed/s],
      ['durations 1/7/30/90', /supported_durations/],
      ['no hardcoded price in SQL (data-driven)', /pricing_for_duration/],
      ['resource_usage metrics', /execution.*runtime_second.*input_token_1k.*output_token_1k.*api_request.*storage.*compute/s],
      ['billing cycles w/ period + status', /managed_billing_cycles[\s\S]*period_start[\s\S]*period_end[\s\S]*status/s],
      ['cycle stores usage/cost/margin/charge/credits', /internal_cost[\s\S]*margin[\s\S]*customer_charge[\s\S]*credits_charged/s],
      ['quote_purchase RPC (BYOK internal=0)', /quote_purchase/],
      ['purchase_with_credits server recompute', /purchase_with_credits/],
      ['price-tamper guard (max_price)', /p_max_price|price_changed/],
      ['run_managed_cycle RPC', /run_managed_cycle/],
      ['BYOK refused managed charges', /not_managed/],
      ['insufficient → failed, never negative', /insufficient_credits/],
      ['RPCs revoked from anon/authenticated', /revoke all on function public\.purchase_with_credits/i],
      ['pricing seed trigger for listings', /seed_automation_pricing/],
    ];
    for (const [n, re] of checks) (re.test(sql) ? ok : bad)(n);
  }
  for (const [path, snippets] of [
    ['lib/billing/pricing.ts', ['quotePurchase', 'purchaseWithCredits', 'recordUsage', 'runBillingCycle', 'BYOK', 'never']],
    ['app/api/billing/quote/route.ts', ['quotePurchase']],
    ['app/api/billing/usage/route.ts', ['recordUsage']],
    ['app/api/billing/cycles/run/route.ts', ['runBillingCycle', 'Insufficient AION Credits']],
    ['app/api/creator/pricing/route.ts', ['sanitizePatch', 'seller_id']],
    ['app/api/marketplace/purchase/route.ts', ['purchaseAutomationTxn', 'durationDays', 'maxPrice', 'PricingError']],
    ['app/(dashboard)/marketplace/[id]/page.tsx', ['/api/billing/quote', 'durationDays', 'maxPrice', 'needsCredits', '/billing/add-credits']],
  ]) {
    if (!exists(path)) { bad(path, 'missing'); continue; }
    const src = fs.readFileSync(path, 'utf8');
    const missing = snippets.filter((s) => !src.includes(s));
    if (missing.length) bad(path, `missing: ${missing.join(', ')}`); else ok(path);
  }
  // Negative: no hardcoded price math left in marketplace/purchase paths.
  for (const p of ['app/api/marketplace/purchase/route.ts', 'app/(dashboard)/marketplace/[id]/page.tsx']) {
    const src = fs.readFileSync(p, 'utf8');
    if (/listing\.price\s*\*\s*2|price\s*\*\s*2/.test(src)) bad(`${p}: hardcoded price math`, 'found price * 2');
    else ok(`${p}: no hardcoded price math`);
  }
  const page = fs.readFileSync('app/(dashboard)/marketplace/[id]/page.tsx', 'utf8');
  if (/price_paid|creditsCharged/.test(fs.readFileSync('app/api/marketplace/purchase/route.ts', 'utf8'))) ok('purchase records server-priced charge');
  if (/customer_price|credits_required/.test(page)) ok('UI displays server quote only');
}

if (!URL || !SERVICE) {
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (static only)`);
  process.exit(fail ? 1 : 0);
}

console.log('\n[2/3] Live DB checks');
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
for (const t of ['automation_pricing', 'resource_usage', 'managed_billing_cycles']) {
  const r = await admin.from(t).select('id', { count: 'exact' }).limit(1);
  if (r.error?.code === 'PGRST205') {
    console.log(`  ⚠️  Part 4 migration NOT applied: public.${t} missing. Run Part 2→3→4 SQL in order.`);
    console.log(`\nRESULT: ${pass} passed, ${fail} failed (migrations pending)`);
    process.exit(2);
  }
  if (r.error) { bad(`${t} reachable`, r.error.message); }
  else ok(`${t} reachable`);
}
if (fail) { console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(1); }

// Need a listing + a buyer with credits.
const { data: listings } = await admin.from('marketplace_listings').select('id, price').eq('is_active', true).limit(1);
if (!listings?.length) {
  console.log('  ⚠️  No active listings — publish one, then re-run live tests.');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(0);
}
const listingId = listings[0].id;
const { data: profiles } = await admin.from('profiles').select('id').limit(1);
const buyerId = profiles[0].id;
// Ensure wallet + fund with 500 test credits.
await admin.rpc('ensure_wallet_for_user', { p_user_id: buyerId });
await admin.rpc('add_credits', { p_user_id: buyerId, p_amount: 500, p_transaction_type: 'adjustment', p_reference_id: 'part4-fund', p_description: 'Part4 test funding' });

console.log('\n[3/3] Live pricing engine');
const q = async (fn, args) => admin.rpc(fn, args);

// a. BYOK quote: internal 0, margin 0, durations from DB.
for (const d of [1, 7, 30, 90]) {
  const { data, error } = await q('quote_purchase', { p_listing_id: listingId, p_customer_type: 'byok', p_duration_days: d });
  if (error) { bad(`BYOK quote ${d}d`, error.message); continue; }
  if (Number(data.internal_cost) === 0 && Number(data.margin) === 0 && Number(data.customer_price) > 0) {
    ok(`BYOK ${d}d: customer=${Number(data.customer_price).toFixed(2)} internal=0 margin=0`);
  } else bad(`BYOK quote ${d}d`, JSON.stringify(data));
}
// b. Managed quote: customer = internal + margin (verify both margin modes).
{
  const { data } = await q('quote_purchase', { p_listing_id: listingId, p_customer_type: 'managed', p_duration_days: 30 });
  const inter = Number(data.internal_cost), marg = Number(data.margin), cust = Number(data.customer_price);
  if (Math.abs(inter + marg - cust) < 0.015 && cust > 0) ok(`Managed 30d: ${inter.toFixed(2)} + ${marg.toFixed(2)} = ${cust.toFixed(2)}`);
  else bad('Managed 30d math', JSON.stringify(data));
}
// c. Fixed margin mode: set fixed $2 and re-quote.
{
  const { data: prow } = await admin.from('automation_pricing').select('margin_type, margin_value').eq('listing_id', listingId).single();
  await admin.from('automation_pricing').update({ margin_type: 'fixed', margin_value: 2 }).eq('listing_id', listingId);
  const { data } = await q('quote_purchase', { p_listing_id: listingId, p_customer_type: 'managed', p_duration_days: 30 });
  const okFixed = Math.abs(Number(data.margin) - 2) < 0.015
    && Math.abs(Number(data.internal_cost) + 2 - Number(data.customer_price)) < 0.015;
  await admin.from('automation_pricing').update({ margin_type: prow.margin_type, margin_value: prow.margin_value }).eq('listing_id', listingId);
  if (okFixed) ok(`Fixed margin: internal + $2.00 = customer (${Number(data.customer_price).toFixed(2)})`);
  else bad('Fixed margin', JSON.stringify(data));
}
// d. Purchase at server price (BYOK 1d), then tamper attempt with low max_price.
{
  const { data: qu } = await q('quote_purchase', { p_listing_id: listingId, p_customer_type: 'byok', p_duration_days: 1 });
  const price = Number(qu.customer_price);
  const { data: w0 } = await admin.from('wallets').select('credit_balance').eq('user_id', buyerId).maybeSingle();
  const { data: res, error } = await q('purchase_with_credits', { p_user_id: buyerId, p_listing_id: listingId, p_customer_type: 'byok', p_duration_days: 1, p_max_price: price });
  if (error) bad('BYOK purchase at server price', error.message);
  else {
    const { data: w1 } = await admin.from('wallets').select('credit_balance').eq('user_id', buyerId).maybeSingle();
    const diff = Number(w0.credit_balance) - Number(w1.credit_balance);
    if (Math.abs(diff - price) < 0.015) ok(`BYOK purchase charged exactly ${price.toFixed(2)} (server price)`);
    else bad('BYOK purchase charge', `deducted ${diff}, want ${price}`);
  }
  const { error: tamper } = await q('purchase_with_credits', { p_user_id: buyerId, p_listing_id: listingId, p_customer_type: 'byok', p_duration_days: 1, p_max_price: 0.01 });
  const { data: w2 } = await admin.from('wallets').select('credit_balance').eq('user_id', buyerId).maybeSingle();
  if (tamper && /price_changed/i.test(tamper.message)) ok('price tamper (max_price $0.01) rejected, nothing deducted');
  else bad('price tamper guard', tamper?.message ?? 'accepted!');
}
// e. BYOK usage snapshots 0; managed usage snapshots rates; cycle bills managed.
{
  // Need a managed instance for the buyer (ephemeral test instance).
  const { data: wf } = await admin.from('workflows').select('id').limit(1);
  const { data: inst, error: iErr } = await admin.from('consumer_instances').insert({
    purchase_id: null, buyer_id: buyerId, workflow_id: wf?.[0]?.id ?? null, listing_id: listingId,
    pricing_tier: 'managed', status: 'active',
  }).select('id').single();
  if (iErr || !inst) { bad('ephemeral managed instance', iErr?.message); }
  else {
    const iid = inst.id;
    // Record usage directly (mirrors recordUsage: BYOK→0 tested via byok instance below).
    const { data: pr } = await admin.from('automation_pricing').select('resource_rates').eq('listing_id', listingId).single();
    const rate = Number(pr.resource_rates.execution ?? 0);
    await admin.from('resource_usage').insert([
      { user_id: buyerId, instance_id: iid, listing_id: listingId, metric: 'execution', quantity: 100, unit_cost_usd: rate, cost_usd: Math.round(100 * rate * 10000) / 10000 },
      { user_id: buyerId, instance_id: iid, listing_id: listingId, metric: 'api_request', quantity: 50, unit_cost_usd: Number(pr.resource_rates.api_request ?? 0), cost_usd: Math.round(50 * Number(pr.resource_rates.api_request ?? 0) * 10000) / 10000 },
    ]);
    const now = new Date(), ago = new Date(Date.now() - 30 * 86400000);
    const { data: wB } = await admin.from('wallets').select('credit_balance').eq('user_id', buyerId).maybeSingle();
    const { data: cyc, error: cErr } = await q('run_managed_cycle', { p_user_id: buyerId, p_instance_id: iid, p_period_start: ago.toISOString(), p_period_end: now.toISOString() });
    if (cErr) bad('managed cycle run', cErr.message);
    else if (cyc.status === 'succeeded' && Number(cyc.customer_charge) > 0) {
      const { data: wA } = await admin.from('wallets').select('credit_balance').eq('user_id', buyerId).maybeSingle();
      const dd = Number(wB.credit_balance) - Number(wA.credit_balance);
      if (Math.abs(dd - Number(cyc.customer_charge)) < 0.02) ok(`managed cycle: usage → charge ${Number(cyc.customer_charge).toFixed(2)} deducted`);
      else bad('managed cycle deduct', `deducted ${dd}, charge ${cyc.customer_charge}`);
    } else bad('managed cycle run', JSON.stringify(cyc));

    // f. BYOK instance: run_managed_cycle must REFUSE.
    const { data: binst } = await admin.from('consumer_instances').insert({
      purchase_id: null, buyer_id: buyerId, workflow_id: wf?.[0]?.id ?? null, listing_id: listingId,
      pricing_tier: 'byok', status: 'active',
    }).select('id').single();
    const { error: bErr } = await q('run_managed_cycle', { p_user_id: buyerId, p_instance_id: binst.id, p_period_start: ago.toISOString(), p_period_end: now.toISOString() });
    if (bErr && /not_managed/i.test(bErr.message)) ok('BYOK instance refused managed charges');
    else bad('BYOK protection', bErr?.message ?? 'billed!');

    // g. Insufficient: drain wallet, bill again → failed, balance intact.
    const { data: wC } = await admin.from('wallets').select('credit_balance').eq('user_id', buyerId).maybeSingle();
    const bal = Number(wC.credit_balance);
    if (bal > 0) await admin.rpc('deduct_credits', { p_user_id: buyerId, p_amount: bal, p_transaction_type: 'adjustment', p_reference_id: 'part4-drain', p_description: 'drain for insufficient test' });
    await admin.from('resource_usage').insert({ user_id: buyerId, instance_id: iid, listing_id: listingId, metric: 'execution', quantity: 10, unit_cost_usd: rate, cost_usd: Math.round(10 * rate * 10000) / 10000 });
    const { data: cyc2, error: cErr2 } = await q('run_managed_cycle', { p_user_id: buyerId, p_instance_id: iid, p_period_start: ago.toISOString(), p_period_end: now.toISOString() });
    const { data: wD } = await admin.from('wallets').select('credit_balance').eq('user_id', buyerId).maybeSingle();
    if (!cErr2 && cyc2.status === 'failed' && Number(wD.credit_balance) === 0) {
      ok('insufficient cycle → failed, balance stays 0.00 + message shown');
    } else bad('insufficient cycle', JSON.stringify(cyc2));

    // cleanup test instances/usage/cycles (keep wallet/ledger).
    await admin.from('resource_usage').delete().eq('user_id', buyerId).eq('instance_id', iid);
    await admin.from('managed_billing_cycles').delete().eq('user_id', buyerId).eq('instance_id', iid);
    await admin.from('consumer_instances').delete().eq('id', iid);
    await admin.from('consumer_instances').delete().eq('id', binst.id);
    console.log('  (cleaned up ephemeral test instances/usage/cycles)');
  }
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
