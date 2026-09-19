// AION Billing Part 2 — wallet verification.
// Usage: node scripts/test-wallet-part2.mjs
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// If the Part-2 migration hasn't been applied yet, static SQL checks still run
// and live DB tests exit(2) with instructions.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SQL_PATH = 'supabase/migrations/20260919000000_aion_credits_wallet.sql';

let pass = 0, fail = 0;
const ok = (name) => { pass++; console.log(`  ✅ ${name}`); };
const bad = (name, detail) => { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); };

// ─── 1. Static SQL checks (run even without DB) ───
console.log('\n[1/3] Static migration checks');
try {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const checks = [
    ['wallets table', /create table if not exists public\.wallets/i],
    ['user_id unique', /unique\s*\(\s*user_id\s*\)|uq_wallets_user_id/i],
    ['credit_balance column', /credit_balance\s+numeric/i],
    ['credit_transactions table', /create table if not exists public\.credit_transactions/i],
    ['all 7 transaction types', /payment_credit.*automation_purchase.*automation_usage.*managed_resource_charge.*creator_earning.*refund.*adjustment/s],
    ['balance_before/after', /balance_before[\s\S]*balance_after/],
    ['RLS enabled (both tables)', /enable row level security/g],
    ['SELECT-only policies (no anon write policy)', /for select/i],
    ['add_credits function', /create or replace function public\.add_credits/i],
    ['deduct_credits function', /create or replace function public\.deduct_credits/i],
    ['row lock FOR UPDATE (race guard)', /for update/i],
    ['insufficient_credits guard', /insufficient_credits/i],
    ['auto-provision trigger on profiles', /on_profile_created_ensure_wallet/i],
    ['backfill existing users', /insert into public\.wallets[\s\S]*from public\.profiles/si],
    ['revoke direct RPC from anon/authenticated', /revoke all on function public\.add_credits/i],
  ];
  for (const [name, re] of checks) {
    if (re instanceof RegExp && re.global) {
      const n = (sql.match(re) || []).length;
      (n >= 2 ? ok : bad)(name, n >= 2 ? undefined : `found ${n}, want >=2`);
    } else if (re.test(sql)) ok(name); else bad(name);
  }
  // Negative checks
  if (/create policy[^;]*on public\.wallets for (insert|update|all)/i.test(sql)) bad('no direct wallet write policy');
  else ok('no direct wallet write policy');
  if (/create policy[^;]*on public\.credit_transactions for (insert|update|delete|all)/i.test(sql)) bad('no direct ledger write policy');
  else ok('no direct ledger write policy');
} catch (e) {
  bad('read migration file', e.message);
}

if (!URL || !SERVICE) {
  console.log('\nMissing Supabase env — skipping live DB tests.');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (static only)`);
  process.exit(fail ? 1 : 0);
}

// ─── 2. Live DB checks ───
console.log('\n[2/3] Live DB checks');
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const probe = await admin.from('wallets').select('id', { count: 'exact' }).limit(1);
if (probe.error && probe.error.code === 'PGRST205') {
  console.log('  ⚠️  Migration NOT applied: public.wallets not in schema cache.');
  console.log('  → Open Supabase Dashboard → SQL Editor → paste & run:');
  console.log(`    ${SQL_PATH}`);
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (migration pending)`);
  process.exit(2);
}
if (probe.error) {
  bad('wallets table reachable', probe.error.message);
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(1);
}
ok('wallets table reachable');

const probe2 = await admin.from('credit_transactions').select('id', { count: 'exact' }).limit(1);
if (probe2.error) bad('credit_transactions reachable', probe2.error.message);
else ok('credit_transactions reachable');

// Need a real user to test against: reuse an existing profile or create one.
let testUserId = null;
const { data: profiles } = await admin.from('profiles').select('id').limit(1);
if (profiles?.length) testUserId = profiles[0].id;
let createdUser = null;
if (!testUserId) {
  const email = `wallet-test-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'Test1234!Test1234!', email_confirm: true });
  if (error) { bad('create test user', error.message); }
  else { createdUser = data.user; testUserId = data.user.id; ok(`created test user ${email}`); }
}
if (!testUserId) { console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(1); }

// a. New user gets wallet, balance = 0 (ensure + read)
await admin.rpc('ensure_wallet_for_user', { p_user_id: testUserId });
const { data: w0, error: w0e } = await admin.from('wallets').select('user_id, credit_balance').eq('user_id', testUserId).maybeSingle();
if (w0e) bad('new/existing user has wallet', w0e.message);
else if (!w0) bad('new/existing user has wallet', 'no row');
else ok(`wallet exists (balance=${w0.credit_balance})`);

// Reset test wallet to 0 via adjustment-safe path: deduct remainder or add.
const cur0 = Number(w0?.credit_balance ?? 0);
if (cur0 > 0) {
  const { error } = await admin.rpc('deduct_credits', { p_user_id: testUserId, p_amount: cur0, p_transaction_type: 'adjustment', p_reference_id: 'test-reset', p_description: 'Part2 test reset' });
  if (error) bad('reset wallet to 0', error.message); else ok('reset wallet to 0');
} else if (cur0 < 0) {
  bad('reset wallet to 0', 'negative balance — invariant violated');
} else ok('wallet starts at 0');

// b. Add 200 → 200.00
{
  const { data, error } = await admin.rpc('add_credits', { p_user_id: testUserId, p_amount: 200, p_transaction_type: 'payment_credit', p_reference_id: 'test-add-200', p_description: 'Part2 test: $200 → 200 credits' });
  if (error) bad('add 200 credits', error.message);
  else if (Number(data) !== 200) bad('add 200 credits', `returned ${data}`);
  else ok('add credits: 0 → 200.00');
}

// c. Deduct 70 → 130
{
  const { data, error } = await admin.rpc('deduct_credits', { p_user_id: testUserId, p_amount: 70, p_transaction_type: 'automation_purchase', p_reference_id: 'test-buy-a', p_description: 'Part2 test purchase' });
  if (error) bad('deduct 70', error.message);
  else if (Number(data) !== 130) bad('deduct 70', `returned ${data}, want 130`);
  else ok('deduct credits: 200 → 130.00');
}

// d. Insufficient: deduct 500 must fail, balance unchanged at 130
{
  const { error } = await admin.rpc('deduct_credits', { p_user_id: testUserId, p_amount: 500, p_transaction_type: 'automation_purchase', p_reference_id: 'test-over', p_description: 'must fail' });
  const { data: w } = await admin.from('wallets').select('credit_balance').eq('user_id', testUserId).maybeSingle();
  if (!error) bad('insufficient deduction rejected', 'RPC succeeded but should fail');
  else if (!/insufficient_credits/i.test(error.message)) bad('insufficient deduction rejected', error.message);
  else if (Number(w?.credit_balance) !== 130) bad('insufficient deduction rejected', `balance moved to ${w?.credit_balance}`);
  else ok('insufficient credits: 500 rejected, balance stays 130.00');
}

// e. Race: set to 100, fire 70 + 50 concurrently → exactly one wins, never negative
{
  // 130 → 100
  await admin.rpc('deduct_credits', { p_user_id: testUserId, p_amount: 30, p_transaction_type: 'adjustment', p_reference_id: 'test-race-setup', p_description: 'set 100' });
  const results = await Promise.allSettled([
    admin.rpc('deduct_credits', { p_user_id: testUserId, p_amount: 70, p_transaction_type: 'automation_purchase', p_reference_id: 'test-race-a', p_description: 'race A=70' }),
    admin.rpc('deduct_credits', { p_user_id: testUserId, p_amount: 50, p_transaction_type: 'automation_purchase', p_reference_id: 'test-race-b', p_description: 'race B=50' }),
  ]);
  const wins = results.filter((r) => r.status === 'fulfilled' && !r.value.error);
  const fails = results.filter((r) => r.status === 'rejected' || r.value?.error);
  const { data: w } = await admin.from('wallets').select('credit_balance').eq('user_id', testUserId).maybeSingle();
  const final = Number(w?.credit_balance);
  const validFinal = final === 30 || final === 50;
  if (wins.length === 1 && fails.length === 1 && validFinal && final >= 0) {
    ok(`race guard: 100 − {70,50} → exactly one wins, final=${final.toFixed(2)} (never negative)`);
  } else {
    bad('race guard', `wins=${wins.length} fails=${fails.length} final=${final}`);
  }
  // ledger integrity: sum(amounts since test start for race refs) consistent
  const { data: txs } = await admin.from('credit_transactions').select('amount, balance_before, balance_after').eq('user_id', testUserId).order('created_at', { ascending: true }).limit(50);
  let chainOk = true;
  for (const t of txs ?? []) {
    if (Number((Number(t.balance_before) + Number(t.amount)).toFixed(2)) !== Number(Number(t.balance_after).toFixed(2))) { chainOk = false; break; }
  }
  if (chainOk) ok('ledger integrity: balance_before + amount = balance_after for all rows');
  else bad('ledger integrity', 'chain mismatch');
}

// f. Unauthorized: anon cannot update wallet or forge ledger rows
console.log('\n[3/3] RLS / unauthorized-write checks');
{
  const anon = createClient(URL, ANON);
  const upd = await anon.from('wallets').update({ credit_balance: 999999 }).eq('user_id', testUserId);
  if (upd.error) ok(`anon wallet UPDATE blocked (${upd.error.code ?? 'denied'})`);
  else bad('anon wallet UPDATE blocked', 'update succeeded!');

  const ins = await anon.from('credit_transactions').insert({
    user_id: testUserId, amount: 999999, transaction_type: 'payment_credit',
    balance_before: 0, balance_after: 999999, description: 'forged',
  });
  if (ins.error) ok(`anon ledger INSERT blocked (${ins.error.code ?? 'denied'})`);
  else bad('anon ledger INSERT blocked', 'insert succeeded!');
}

// cleanup test user if we created it
if (createdUser) {
  await admin.from('wallets').delete().eq('user_id', testUserId);
  await admin.auth.admin.deleteUser(testUserId);
  console.log('  (cleaned up ephemeral test user)');
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
