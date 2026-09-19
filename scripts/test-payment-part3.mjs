// AION Billing Part 3 — payment → credits verification.
// Usage: node scripts/test-payment-part3.mjs
// Static checks always run. Live DB + API tests need the Part 2 + Part 3
// migrations applied and (for API tests) a running dev server + test user.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SQL2 = 'supabase/migrations/20260919000000_aion_credits_wallet.sql';
const SQL3 = 'supabase/migrations/20260919000001_aion_payments.sql';

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`  ✅ ${n}`); };
const bad = (n, d) => { fail++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`); };
const filesExist = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

// ─── 1. Static checks ───
console.log('\n[1/4] Static migration + code checks');
for (const [path, checks] of [
  [SQL2, [
    ['P2 wallets table', /create table if not exists public\.wallets/i],
    ['P2 ledger + atomic deduct', /deduct_credits[\s\S]*for update/i],
  ]],
  [SQL3, [
    ['payments table', /create table if not exists public\.payments/i],
    ['customer_type byok|managed', /customer_type in \('byok', 'managed'\)/],
    ['all 6 statuses', /pending.*processing.*succeeded.*failed.*cancelled.*refunded/s],
    ['1 USD = 1 credit columns', /amount_usd[\s\S]*credits_amount/],
    ['provider column (dummy-ready)', /provider.*dummy.*stripe.*razorpay/s],
    ['unique provider_payment_id (idempotency)', /provider_payment_id text unique/i],
    ['RLS select-only', /for select/i],
    ['confirm_payment RPC atomic', /create or replace function public\.confirm_payment/i],
    ['confirm row lock FOR UPDATE', /for update/i],
    ['confirm idempotency (already succeeded)', /already_processed/i],
    ['confirm calls add_credits (ledger)', /add_credits\(/],
    ['fail_payment terminal guard', /fail_payment/],
    ['revoke direct RPC', /revoke all on function public\.confirm_payment/i],
  ]],
]) {
  if (!filesExist(path)) { bad(`${path} exists`, 'missing'); continue; }
  const sql = fs.readFileSync(path, 'utf8');
  for (const [name, re] of checks) {
    if (re.test(sql)) ok(name); else bad(name);
  }
  if (/payments/i.test(path)) {
    if (/create policy[^;]*on public\.payments for (insert|update|delete|all)/i.test(sql)) bad('no direct payment write policy');
    else ok('no direct payment write policy');
  }
}

for (const [path, snippets] of [
  ['lib/payments/gateway.ts', ['PaymentProvider', 'DummyProvider', 'verifyAndConfirm', 'TODO-REAL', 'redirectUrl']],
  ['lib/payments/service.ts', ['validateCustomerType', 'validateAmount', 'createPayment', 'confirmPayment', 'getPayment', 'alreadyProcessed']],
  ['app/api/billing/payments/route.ts', ['POST', 'GET']],
  ['app/api/billing/payments/[id]/route.ts', ['GET']],
  ['app/api/billing/payments/[id]/confirm/route.ts', ['confirmPayment']],
  ['app/(dashboard)/billing/add-credits/page.tsx', ['BYOK', 'AION Managed', 'Proceed', 'payment_success', 'BillAnimation']],
  ['components/billing/bill-animation.tsx', ['BillAnimation']],
]) {
  if (!filesExist(path)) { bad(path, 'missing'); continue; }
  const src = fs.readFileSync(path, 'utf8');
  const missing = snippets.filter((s) => !src.includes(s));
  // 'payment_success' must NOT appear as a trusted flag — check negatively below.
  if (missing.length && !(path.includes('add-credits') && missing.length === 1 && missing[0] === 'payment_success')) {
    bad(path, `missing: ${missing.join(', ')}`);
  } else ok(path);
}

// Negative: frontend must never trust a payment_success flag.
{
  const page = fs.readFileSync('app/(dashboard)/billing/add-credits/page.tsx', 'utf8');
  if (/payment_success\s*=\s*true|localStorage.*payment|sessionStorage.*payment/i.test(page)) {
    bad('no frontend-trusted success flag', 'found payment_success/localStorage trust');
  } else ok('no frontend-trusted success flag');
  if (/card.?number|cvv|card-element|CardNumber/i.test(page)) bad('no card data handling', 'found card fields');
  else ok('no card data handling');
}

if (!URL || !SERVICE) {
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (static only)`);
  process.exit(fail ? 1 : 0);
}

// ─── 2. Live DB checks ───
console.log('\n[2/4] Live DB checks');
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const need = async (table) => {
  const r = await admin.from(table).select('id', { count: 'exact' }).limit(1);
  return r.error?.code === 'PGRST205' ? null : r;
};
const walletsProbe = await need('wallets');
const paymentsProbe = await need('payments');
if (!walletsProbe) {
  console.log('  ⚠️  Part 2 migration NOT applied — run it first, then Part 3.');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (migrations pending)`);
  process.exit(2);
}
if (!paymentsProbe) {
  console.log('  ⚠️  Part 3 migration NOT applied: public.payments missing.');
  console.log(`    Run ${SQL3} in the Supabase SQL Editor.`);
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (migration pending)`);
  process.exit(2);
}
ok('wallets + payments tables reachable');

// Pick a test user (existing profile) — never creates charges (dummy).
let testUserId = null;
const { data: profiles } = await admin.from('profiles').select('id').limit(1);
if (!profiles?.length) {
  console.log('  ⚠️  No profiles in DB — sign up once, then re-run for live flow tests.');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(0);
}
testUserId = profiles[0].id;

// Helper: replicate service validation + confirm flow via RPC directly.
console.log('\n[3/4] Live payment → wallet flow ($10 / $50 / $200)');
const { data: wStart } = await admin.from('wallets').select('credit_balance').eq('user_id', testUserId).maybeSingle();
const startBal = Number(wStart?.credit_balance ?? 0);
console.log(`  starting balance: ${startBal.toFixed(2)}`);

for (const amt of [10, 50, 200]) {
  const { data: pay, error: cErr } = await admin.from('payments').insert({
    user_id: testUserId, customer_type: amt === 50 ? 'managed' : 'byok',
    amount_usd: amt, credits_amount: amt, provider: 'dummy',
    provider_payment_id: `dummy_test_${Date.now()}_${amt}`, status: 'pending',
    metadata: { test: 'part3' },
  }).select('*').single();
  if (cErr || !pay) { bad(`create $${amt} payment`, cErr?.message); continue; }
  ok(`create $${amt} payment (${pay.customer_type}, ref ${String(pay.id).slice(0, 8)})`);

  const { data: res, error: cfErr } = await admin.rpc('confirm_payment', { p_payment_id: pay.id });
  if (cfErr) { bad(`confirm $${amt} → +${amt} credits`, cfErr.message); continue; }
  if (Number(res?.credits_amount) !== amt || res?.status !== 'succeeded') {
    bad(`confirm $${amt}`, `unexpected result ${JSON.stringify(res)}`); continue;
  }
  ok(`confirm $${amt} → +${amt} credits (already_processed=${res.already_processed})`);

  // Duplicate confirm = idempotent, no double credit.
  const { data: wBefore } = await admin.from('wallets').select('credit_balance').eq('user_id', testUserId).maybeSingle();
  const { data: dup } = await admin.rpc('confirm_payment', { p_payment_id: pay.id });
  const { data: wAfter } = await admin.from('wallets').select('credit_balance').eq('user_id', testUserId).maybeSingle();
  if (dup?.already_processed === true && Number(wBefore?.credit_balance) === Number(wAfter?.credit_balance)) {
    ok(`duplicate confirm $${amt} ignored (balance ${Number(wAfter?.credit_balance).toFixed(2)})`);
  } else bad(`duplicate confirm $${amt}`, JSON.stringify(dup));
}

const { data: wEnd } = await admin.from('wallets').select('credit_balance').eq('user_id', testUserId).maybeSingle();
const gained = Number(wEnd?.credit_balance ?? 0) - startBal;
if (gained === 260) ok(`wallet delta +260.00 (10+50+200)`);
else bad('wallet delta', `gained ${gained}, want 260`);

// ─── 4. Error states ───
console.log('\n[4/4] Error states');
{
  // invalid customer_type rejected by CHECK
  const r = await admin.from('payments').insert({
    user_id: testUserId, customer_type: 'evil', amount_usd: 10, credits_amount: 10,
    provider: 'dummy', status: 'pending',
  }).select('id').single();
  if (r.error) ok('invalid customer_type rejected');
  else { bad('invalid customer_type rejected', 'inserted!'); await admin.from('payments').delete().eq('id', r.data.id); }

  // invalid amount rejected by CHECK
  const r2 = await admin.from('payments').insert({
    user_id: testUserId, customer_type: 'byok', amount_usd: -5, credits_amount: -5,
    provider: 'dummy', status: 'pending',
  }).select('id').single();
  if (r2.error) ok('invalid amount rejected');
  else { bad('invalid amount rejected', 'inserted!'); await admin.from('payments').delete().eq('id', r2.data.id); }

  // cancelled payment cannot be confirmed
  const { data: cpay } = await admin.from('payments').insert({
    user_id: testUserId, customer_type: 'byok', amount_usd: 10, credits_amount: 10,
    provider: 'dummy', provider_payment_id: `dummy_test_cancel_${Date.now()}`, status: 'pending',
    metadata: { test: 'cancel' },
  }).select('*').single();
  await admin.rpc('fail_payment', { p_payment_id: cpay.id, p_status: 'cancelled', p_reason: 'user_cancelled' });
  const { error: cfErr } = await admin.rpc('confirm_payment', { p_payment_id: cpay.id });
  if (cfErr && /not_confirmable/i.test(cfErr.message)) ok('cancelled payment not confirmable');
  else bad('cancelled payment not confirmable', cfErr?.message ?? 'confirmed!');

  // failed payment credits nothing
  const { data: fpay } = await admin.from('payments').insert({
    user_id: testUserId, customer_type: 'managed', amount_usd: 25, credits_amount: 25,
    provider: 'dummy', provider_payment_id: `dummy_test_fail_${Date.now()}`, status: 'pending',
    metadata: { test: 'fail' },
  }).select('*').single();
  const { data: wb } = await admin.from('wallets').select('credit_balance').eq('user_id', testUserId).maybeSingle();
  await admin.rpc('fail_payment', { p_payment_id: fpay.id, p_status: 'failed', p_reason: 'verification_failed' });
  const { data: wa } = await admin.from('wallets').select('credit_balance').eq('user_id', testUserId).maybeSingle();
  if (Number(wb?.credit_balance) === Number(wa?.credit_balance)) ok('failed payment credits nothing');
  else bad('failed payment credits nothing', `${wb?.credit_balance} → ${wa?.credit_balance}`);

  // cleanup test rows (keep wallet + ledger audit trail intact)
  await admin.from('payments').delete().eq('user_id', testUserId).eq('metadata->>test', 'part3');
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
