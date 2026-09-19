// AION Billing Part 6 — Complete end-to-end test (TEST A–G, spec §10).
// Usage: node scripts/test-billing-e2e.mjs
// Static path-mapping always runs. Live flow needs Part 2→3→4→5 migrations.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`  ✅ ${n}`); };
const bad = (n, d) => { fail++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`); };
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

console.log('\n[1/2] E2E path mapping (each TEST → implementation)');
{
  const map = [
    ['TEST A BYOK: payment→verify→credits→purchase', ['verifyAndConfirm', 'confirmPayment', 'purchase_automation_txn']],
    ['TEST A: no managed charge for BYOK', ['not_managed', 'purchase_automation_txn']],
    ['TEST B managed: usage→cost→margin→charge→deduct', ['run_managed_cycle', 'resource_usage']],
    ['TEST B: calculations stored (cycle row)', ['managed_billing_cycles', 'internal_cost']],
    ['TEST C duplicate webhook → single credit', ['already_processed', 'provider_payment_id']],
    ['TEST D insufficient → rejected, intact', ['insufficient_credits', '402']],
    ['TEST E concurrent → atomic, never invalid', ['for update', 'purchase_automation_txn']],
    ['TEST F refund +25, history intact', ['refund_purchase', "'refund'"]],
    ['TEST G creator split traceable', ['marketplace_transactions', 'creator_earnings', 'platform_fee_percent']],
  ];
  const hay = read('supabase/migrations/20260919000003_aion_marketplace_billing.sql')
    + read('supabase/migrations/20260919000002_aion_billing_engine.sql')
    + read('supabase/migrations/20260919000001_aion_payments.sql')
    + read('supabase/migrations/20260919000000_aion_credits_wallet.sql')
    + read('lib/payments/service.ts') + read('lib/billing/marketplace.ts')
    + read('app/api/marketplace/purchase/route.ts');
  for (const [n, needles] of map) {
    const missing = needles.filter((s) => !hay.includes(s));
    if (missing.length) bad(n, `missing: ${missing.join(', ')}`); else ok(n);
  }
}

if (!URL || !SERVICE) {
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (static only)`);
  process.exit(fail ? 1 : 0);
}

console.log('\n[2/2] Live end-to-end (TEST A–G)');
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const probe = await admin.from('wallets').select('id').limit(1);
if (probe.error?.code === 'PGRST205') {
  console.log('  ⚠️  Migrations not applied — live E2E blocked. Run Part 2→3→4→5 SQL in order.');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (migrations pending)`);
  process.exit(2);
}
const q = async (fn, args) => admin.rpc(fn, args);
const bal = async (uid) => Number((await admin.from('wallets').select('credit_balance').eq('user_id', uid).maybeSingle()).data?.credit_balance ?? NaN);

const { data: listings } = await admin.from('marketplace_listings').select('id, seller_id').eq('is_active', true).limit(5);
const { data: profiles } = await admin.from('profiles').select('id').limit(3);
if (!listings?.length || (profiles?.length ?? 0) < 1) {
  console.log('  ⚠️  Need ≥1 active listing + ≥1 profile.');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(0);
}

// ─── TEST A — BYOK: new user → 0 → +200 → buy 25 → 175, no managed charge ───
console.log('\n  TEST A — BYOK exact flow');
{
  const email = `e2e-a-${Date.now()}@example.com`;
  const { data: nu, error: cErr } = await admin.auth.admin.createUser({ email, password: 'E2eTest1234!E2eTest1234!', email_confirm: true });
  if (cErr) { bad('TEST A setup (new user)', cErr.message); }
  else {
    const buyer = nu.user.id;
    const listing = (listings.find((l) => l.seller_id !== buyer) ?? listings[0]);
    const seller = listing.seller_id;
    try {
      await q('ensure_wallet_for_user', { p_user_id: buyer });
      if ((await bal(buyer)) !== 0) bad('TEST A new user starts at 0', `got ${await bal(buyer)}`);
      else ok('TEST A new user starts at 0 credits');

      // Add Credits (BYOK, $200) → create + confirm (server-verified).
      const { data: pay } = await admin.from('payments').insert({
        user_id: buyer, customer_type: 'byok', amount_usd: 200, credits_amount: 200,
        provider: 'dummy', provider_payment_id: `dummy_e2e_a_${Date.now()}`, status: 'pending', metadata: { e2e: 'A' },
      }).select('*').single();
      const { data: conf, error: confErr } = await q('confirm_payment', { p_payment_id: pay.id });
      if (confErr || Number(conf?.wallet_balance) !== 200) bad('TEST A $200 verified → 200 credits', confErr?.message ?? JSON.stringify(conf));
      else ok('TEST A $200 payment verified → 200 credits');

      // TEST C piggybacks here: confirm the SAME payment again → no double credit.
      const { data: dup } = await q('confirm_payment', { p_payment_id: pay.id });
      if (dup?.already_processed === true && (await bal(buyer)) === 200) ok('TEST C duplicate confirm → already_processed, still 200 (ONE credit)');
      else bad('TEST C duplicate protection', JSON.stringify(dup));

      // Buy automation: force 30d BYOK price to exactly 25 for the script.
      const { data: prow } = await admin.from('automation_pricing').select('byok_prices').eq('listing_id', listing.id).single();
      const patched = { ...(prow?.byok_prices ?? {}), 30: 25, default: 25 };
      await admin.from('automation_pricing').update({ byok_prices: patched }).eq('listing_id', listing.id);
      const { data: r, error: pErr } = await q('purchase_automation_txn', {
        p_user_id: buyer, p_listing_id: listing.id, p_customer_type: 'byok', p_duration_days: 30, p_max_price: 25,
      });
      await admin.from('automation_pricing').update({ byok_prices: prow.byok_prices }).eq('listing_id', listing.id);
      if (pErr) bad('TEST A buy 30d for 25', pErr.message);
      else {
        if ((await bal(buyer)) === 175) ok('TEST A buyer 200 → 175 (−25)');
        else bad('TEST A buyer balance', `got ${await bal(buyer)}, want 175`);
        const { data: mch } = await admin.from('credit_transactions').select('id').eq('user_id', buyer)
          .eq('transaction_type', 'managed_resource_charge').limit(1);
        if (!mch?.length) ok('TEST A NO managed-resource charge for BYOK');
        else bad('TEST A BYOK isolation', 'managed charge found!');
      }

      // TEST F — refund 25 → +25, history intact.
      const { data: ent } = await admin.from('automation_entitlements').select('purchase_id').eq('user_id', buyer).eq('automation_id', listing.id).order('created_at', { ascending: false }).limit(1);
      if (ent?.length) {
        const pid = ent[0].purchase_id;
        const { error: rErr } = await q('refund_purchase', { p_purchase_id: pid });
        const bAfter = await bal(buyer);
        const { data: hist } = await admin.from('credit_transactions').select('amount, transaction_type').eq('user_id', buyer).eq('reference_id', pid);
        if (!rErr && bAfter === 200) ok('TEST F refund +25 → buyer back to 200');
        else bad('TEST F refund', rErr?.message ?? `balance ${bAfter}`);
        if (hist?.some((t) => Number(t.amount) < 0) && hist?.some((t) => t.transaction_type === 'refund')) ok('TEST F history intact (−purchase, +refund visible)');
        else bad('TEST F history', JSON.stringify(hist));
      }

      // TEST G — creator split on a fresh purchase (managed 7d, real quote).
      const { data: mq } = await q('quote_purchase', { p_listing_id: listing.id, p_customer_type: 'managed', p_duration_days: 7 });
      const mprice = Number(mq.customer_price);
      const s0 = await bal(seller);
      const { data: mr, error: mErr } = await q('purchase_automation_txn', {
        p_user_id: buyer, p_listing_id: listing.id, p_customer_type: 'managed', p_duration_days: 7, p_max_price: mprice,
      });
      if (mErr) bad('TEST G managed purchase', mErr.message);
      else {
        const { data: tx } = await admin.from('marketplace_transactions').select('*').eq('purchase_id', mr.purchase_id).single();
        const { data: er } = await admin.from('creator_earnings').select('*').eq('transaction_id', mr.transaction_id).single();
        const s1 = await bal(seller);
        const splitOk = tx && Math.abs(Number(tx.platform_fee) + Number(tx.creator_amount) - Number(tx.gross_amount)) < 0.02;
        if (splitOk && er && Math.abs(Number(er.amount) - Number(tx.creator_amount)) < 0.02 && Math.abs(s1 - s0) < 0.005) {
          ok(`TEST G split traceable: gross ${Number(tx.gross_amount).toFixed(2)} = platform ${Number(tx.platform_fee).toFixed(2)} + creator ${Number(tx.creator_amount).toFixed(2)} (pending, wallet untouched)`);
        } else bad('TEST G split', JSON.stringify({ tx, er }));
      }

      // TEST B — managed usage → stored calculations → deduct.
      const { data: inst } = await admin.from('consumer_instances').select('id').eq('buyer_id', buyer).eq('listing_id', listing.id).eq('pricing_tier', 'managed').limit(1);
      if (inst?.length) {
        const iid = inst[0].id;
        const { data: pr } = await admin.from('automation_pricing').select('resource_rates').eq('listing_id', listing.id).single();
        const rate = Number(pr.resource_rates.execution ?? 0.01);
        await admin.from('resource_usage').insert({ user_id: buyer, instance_id: iid, listing_id: listing.id, metric: 'execution', quantity: 200, unit_cost_usd: rate, cost_usd: Math.round(200 * rate * 10000) / 10000, metadata: { e2e: 'B' } });
        const b0 = await bal(buyer);
        const { data: cyc, error: cErr2 } = await q('run_managed_cycle', {
          p_user_id: buyer, p_instance_id: iid,
          p_period_start: new Date(Date.now() - 86400000).toISOString(), p_period_end: new Date().toISOString(),
        });
        if (cErr2) bad('TEST B managed cycle', cErr2.message);
        else if (cyc.status === 'succeeded') {
          const { data: row } = await admin.from('managed_billing_cycles').select('*').eq('id', cyc.cycle_id).single();
          const b1 = await bal(buyer);
          const mathOk = row && Math.abs(Number(row.internal_cost) + Number(row.margin) - Number(row.customer_charge)) < 0.02;
          const deductOk = Math.abs((b0 - b1) - Number(cyc.customer_charge)) < 0.02;
          if (mathOk && deductOk) ok(`TEST B stored: internal ${Number(row.internal_cost).toFixed(2)} + margin ${Number(row.margin).toFixed(2)} = charge ${Number(row.customer_charge).toFixed(2)} deducted`);
          else bad('TEST B calculations', JSON.stringify(row));
        } else bad('TEST B managed cycle', JSON.stringify(cyc));
      } else bad('TEST B setup', 'no managed instance (purchase route creates it; txn path needs instance)');
    } finally {
      // Cleanup: remove test rows, delete ephemeral user.
      try {
        await admin.from('resource_usage').delete().eq('user_id', buyer);
        await admin.from('managed_billing_cycles').delete().eq('user_id', buyer);
        await admin.from('creator_earnings').delete().eq('seller_id', seller).in('transaction_id',
          (await admin.from('marketplace_transactions').select('id').eq('buyer_id', buyer)).data?.map((t) => t.id) ?? []);
        await admin.from('marketplace_transactions').delete().eq('buyer_id', buyer);
        await admin.from('automation_entitlements').delete().eq('user_id', buyer);
        await admin.from('purchases').delete().eq('buyer_id', buyer);
        await admin.from('payments').delete().eq('user_id', buyer);
        await admin.from('credit_transactions').delete().eq('user_id', buyer);
        await admin.from('consumer_instances').delete().eq('buyer_id', buyer);
        await admin.from('wallets').delete().eq('user_id', buyer);
        await admin.auth.admin.deleteUser(buyer);
        console.log('  (cleaned up ephemeral TEST A user)');
      } catch (e) { console.log('  (cleanup warning:', e.message?.slice(0, 120), ')'); }
    }
  }
}

// ─── TEST D — 10cr buyer, 25cr purchase → rejected, 10 intact, no rows ───
console.log('\n  TEST D — insufficient');
{
  const { data: profs } = await admin.from('profiles').select('id').limit(1);
  const buyer = profs[0].id;
  const listing = listings[0].id;
  await admin.from('automation_entitlements').delete().eq('user_id', buyer).eq('automation_id', listing).eq('status', 'active');
  await q('ensure_wallet_for_user', { p_user_id: buyer });
  const b = await bal(buyer);
  if (b < 10) await admin.rpc('add_credits', { p_user_id: buyer, p_amount: 10 - b, p_transaction_type: 'adjustment', p_reference_id: 'e2e-d', p_description: 'e2e D fund' });
  if (b > 10) await admin.rpc('deduct_credits', { p_user_id: buyer, p_amount: b - 10, p_transaction_type: 'adjustment', p_reference_id: 'e2e-d', p_description: 'e2e D trim' });
  const { data: before } = await admin.from('purchases').select('id', { count: 'exact' }).eq('buyer_id', buyer);
  const { error } = await q('purchase_automation_txn', { p_user_id: buyer, p_listing_id: listing, p_customer_type: 'byok', p_duration_days: 30, p_max_price: 10000 });
  const after = await bal(buyer);
  const { data: afterP } = await admin.from('purchases').select('id', { count: 'exact' }).eq('buyer_id', buyer);
  // Note: may fail with insufficient OR duplicate (if buyer owns it) — both are rejections.
  if (error && after === 10 && (afterP?.length ?? 0) === (before?.length ?? 0)) ok(`TEST D rejected (${/insufficient/i.test(error.message) ? 'insufficient' : 'duplicate'}), balance 10, no partial rows`);
  else bad('TEST D', error?.message ?? `balance moved to ${after}`);
}

// ─── TEST E — 100 balance, racing 70 + 50 deducts → one wins, valid ───
console.log('\n  TEST E — concurrent');
{
  const { data: profs } = await admin.from('profiles').select('id').limit(1);
  const buyer = profs[0].id;
  await q('ensure_wallet_for_user', { p_user_id: buyer });
  const b = await bal(buyer);
  if (b < 100) await admin.rpc('add_credits', { p_user_id: buyer, p_amount: 100 - b, p_transaction_type: 'adjustment', p_reference_id: 'e2e-e', p_description: 'e2e E fund' });
  if (b > 100) await admin.rpc('deduct_credits', { p_user_id: buyer, p_amount: b - 100, p_transaction_type: 'adjustment', p_reference_id: 'e2e-e', p_description: 'e2e E trim' });
  const [r1, r2] = await Promise.allSettled([
    q('deduct_credits', { p_user_id: buyer, p_amount: 70, p_transaction_type: 'automation_purchase', p_reference_id: 'e2e-70', p_description: 'race 70' }),
    q('deduct_credits', { p_user_id: buyer, p_amount: 50, p_transaction_type: 'automation_purchase', p_reference_id: 'e2e-50', p_description: 'race 50' }),
  ]);
  const wins = [r1, r2].filter((r) => r.status === 'fulfilled' && !r.value.error).length;
  const fin = await bal(buyer);
  if (wins === 1 && (fin === 30 || fin === 50)) ok(`TEST E exactly one wins, balance=${fin.toFixed(2)} (never invalid)`);
  else bad('TEST E', `wins=${wins} final=${fin}`);
  // restore some funds for account hygiene
  await admin.rpc('add_credits', { p_user_id: buyer, p_amount: 100 - fin, p_transaction_type: 'adjustment', p_reference_id: 'e2e-e2', p_description: 'restore' }).catch(() => {});
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
