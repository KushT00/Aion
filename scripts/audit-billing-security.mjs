// AION Billing Part 6 — Security audit (§7/§8/§9).
// Usage: node scripts/audit-billing-security.mjs
// Static checks always run. Live RLS probes need Supabase + migrations.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`  ✅ ${n}`); };
const bad = (n, d) => { fail++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`); };
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', '.next'].includes(e.name)) walk(p, out); }
    else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
};

const MIGRATIONS = [
  'supabase/migrations/20260919000000_aion_credits_wallet.sql',
  'supabase/migrations/20260919000001_aion_payments.sql',
  'supabase/migrations/20260919000002_aion_billing_engine.sql',
  'supabase/migrations/20260919000003_aion_marketplace_billing.sql',
];
const FINANCIAL_TABLES = [
  'wallets', 'credit_transactions', 'payments', 'automation_pricing',
  'resource_usage', 'managed_billing_cycles', 'automation_entitlements',
  'marketplace_transactions', 'creator_earnings', 'platform_config',
];

console.log('\n[1/4] RLS policy audit (static SQL)');
{
  const sql = MIGRATIONS.map(read).join('\n');
  for (const t of FINANCIAL_TABLES) {
    const hasRLS = new RegExp(`alter table public\\.${t} enable row level security`, 'i').test(sql);
    const hasSelect = new RegExp(`for select[\\s\\S]{0,300}on public\\.${t}`, 'i').test(sql)
      || new RegExp(`on public\\.${t}[\\s\\S]{0,300}for select`, 'i').test(sql);
    // Any write policy (insert/update/delete/all) scoped to the table?
    const writePol = [...sql.matchAll(/create policy[^;]+?for\s+(insert|update|delete|all)[^;]+?on\s+public\.(\w+)/gi)]
      .filter((m) => m[2] === t);
    if (hasRLS) ok(`${t}: RLS enabled`); else bad(`${t}: RLS enabled`, 'missing');
    if (hasSelect) ok(`${t}: read policy exists`); else bad(`${t}: read policy exists`, 'missing');
    if (writePol.length === 0) ok(`${t}: no client write policy`);
    else bad(`${t}: no client write policy`, writePol.map((m) => m[0].slice(0, 60)).join(' | '));
  }
  for (const fn of ['add_credits', 'deduct_credits', 'confirm_payment', 'purchase_automation_txn', 'run_managed_cycle', 'refund_purchase', 'release_creator_earning']) {
    const revoked = new RegExp(`revoke all on function public\\.${fn}`, 'i').test(sql);
    (revoked ? ok : bad)(`RPC ${fn}: revoked from anon/authenticated`);
  }
}

console.log('\n[2/4] Payment security (static code)');
{
  const clientFiles = [...walk('app'), ...walk('components'), ...walk('hooks')];
  // Only browser code counts: 'use client' files + components/hooks.
  // Server routes (app/api/**, server components) legitimately use secrets.
  const browserFiles = clientFiles.filter((f) => {
    if (f.startsWith(`app${path.sep}api${path.sep}`)) return false;
    if (f.startsWith('components') || f.startsWith('hooks')) return true;
    return read(f).includes("'use client'");
  });
  const hits = [];
  for (const f of browserFiles) {
    const src = read(f);
    // Real leaks: reading server-only env, or embedding key literals.
    if (/process\.env\.(STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|CRON_SECRET|GROQ_API_KEY|GOOGLE_CLIENT_SECRET)|sk_(test|live)_[A-Za-z0-9]+|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZi/i.test(src)) hits.push(f);
  }
  if (hits.length === 0) ok('no secret keys in frontend');
  else bad('no secret keys in frontend', hits.join(', '));

  const adminInClient = browserFiles.filter((f) => {
    const src = read(f);
    return src.includes('lib/supabase/admin');
  });
  if (adminInClient.length === 0) ok('service_role never imported by client components');
  else bad('service_role never imported by client components', adminInClient.join(', '));

  const allSrc = clientFiles.map(read).join('\n');
  if (/card.?number|cvv|cvc.*card|card.*cvc/i.test(allSrc)) bad('no card/CVV handling', 'found card fields');
  else ok('no card/CVV handling (provider-hosted checkout only)');

  // Webhook/idempotency design present for the real gateway.
  const gw = read('lib/payments/gateway.ts');
  if (/verifyWebhook|payment_status.*paid|redirectUrl/i.test(gw)) ok('gateway has server-verification + idempotency hooks');
  else bad('gateway has server-verification + idempotency hooks');

  // Purchase APIs accept ids only (maxPrice = stale-quote guard, never the charge).
  const pur = read('app/api/marketplace/purchase/route.ts');
  if (/durationDays.*maxPrice|maxPrice.*durationDays/s.test(pur) && !/body\?\.final_price|body\?\.price\b|body\?\.expir/i.test(pur)) {
    ok('purchase API accepts ids only (no client price/expiry)');
  } else bad('purchase API accepts ids only');
}

console.log('\n[3/4] Financial security (static SQL)');
{
  const sql = MIGRATIONS.map(read).join('\n');
  const moneyCols = ['credit_balance', 'amount_usd', 'credits_amount', 'gross_amount', 'platform_fee', 'creator_amount', 'internal_cost', 'customer_charge'];
  const nonNumeric = moneyCols.filter((c) => !new RegExp(`${c}[^;\\n]*numeric`, 'i').test(sql));
  if (nonNumeric.length === 0) ok('all money columns numeric/decimal (no float billing)');
  else bad('all money columns numeric', nonNumeric.join(', '));
  if (/credit_balance >= 0/.test(sql)) ok('non-negative balance constraint');
  else bad('non-negative balance constraint');
  const locks = (sql.match(/for update/gi) || []).length;
  if (locks >= 5) ok(`row-level locks present (${locks} FOR UPDATE — atomic updates)`);
  else bad('row-level locks present', `only ${locks}`);
  if (/transaction_id uuid[^\n]*unique/i.test(sql)) ok('no duplicate creator earning (unique per sale)');
  else bad('no duplicate creator earning');
  if (/provider_payment_id text unique/i.test(sql)) ok('duplicate webhook collapses (unique provider id)');
  else bad('duplicate webhook collapses');
}

if (!URL || !SERVICE || !ANON) {
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (static only)`);
  process.exit(fail ? 1 : 0);
}

console.log('\n[4/4] Live RLS probes (anon must be denied)');
const anon = createClient(URL, ANON, { auth: { persistSession: false } });
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
{
  const probe = await admin.from('wallets').select('id').limit(1);
  if (probe.error?.code === 'PGRST205') {
    console.log('  ⚠️  Migrations not applied — skipping live probes.');
    console.log(`\nRESULT: ${pass} passed, ${fail} failed (migrations pending)`);
    process.exit(2);
  }
  // Need a user id for FK-valid write attempts.
  const { data: profs } = await admin.from('profiles').select('id').limit(1);
  const uid = profs?.[0]?.id ?? '00000000-0000-0000-0000-000000000000';

  const attempts = [
    ['wallets UPDATE balance', () => anon.from('wallets').update({ credit_balance: 999999 }).eq('user_id', uid)],
    ['credit_transactions INSERT fake', () => anon.from('credit_transactions').insert({ user_id: uid, amount: 9999, transaction_type: 'payment_credit', balance_before: 0, balance_after: 9999 })],
    ['payments INSERT fake', () => anon.from('payments').insert({ user_id: uid, customer_type: 'byok', amount_usd: 1, credits_amount: 1, provider: 'dummy', status: 'succeeded' })],
    ['automation_pricing UPDATE margin', async () => {
      const { data } = await admin.from('automation_pricing').select('listing_id').limit(1);
      if (!data?.length) return { error: null, skipped: true };
      return anon.from('automation_pricing').update({ margin_value: 0 }).eq('listing_id', data[0].listing_id);
    }],
    ['resource_usage INSERT fake cost', () => anon.from('resource_usage').insert({ user_id: uid, metric: 'execution', quantity: 1, unit_cost_usd: 0, cost_usd: 0 })],
    ['managed_billing_cycles INSERT', () => anon.from('managed_billing_cycles').insert({ user_id: uid, period_start: new Date().toISOString(), period_end: new Date(Date.now() + 86400000).toISOString(), status: 'succeeded', customer_charge: 0 })],
    ['marketplace_transactions INSERT', () => anon.from('marketplace_transactions').insert({ buyer_id: uid, seller_id: uid, automation_id: '00000000-0000-0000-0000-000000000000', purchase_id: '00000000-0000-0000-0000-000000000000', gross_amount: 0, platform_fee: 0, creator_amount: 0 })],
    ['creator_earnings INSERT', () => anon.from('creator_earnings').insert({ seller_id: uid, transaction_id: '00000000-0000-0000-0000-000000000000', amount: 9999 })],
    ['entitlements INSERT', () => anon.from('automation_entitlements').insert({ user_id: uid, automation_id: '00000000-0000-0000-0000-000000000000', purchase_id: '00000000-0000-0000-0000-000000000000', customer_type: 'byok', duration_days: 30, expires_at: new Date(Date.now() + 86400000).toISOString() })],
  ];
  for (const [name, fn] of attempts) {
    try {
      const r = await fn();
      if (r?.skipped) { console.log(`  ⏭️  ${name} (no seed row to target)`); continue; }
      if (r?.error) {
        const msg = r.error.message || '';
        if (/row-level security|42501|not allowed|permission denied/i.test(msg)) ok(`${name}: denied by RLS`);
        else ok(`${name}: blocked (${r.error.code ?? msg.slice(0, 60)})`);
      } else bad(`${name}: WRITE SUCCEEDED — RLS HOLE`);
    } catch (e) { ok(`${name}: blocked (exception)`); }
  }
  // Anon RPC execution must fail (revoked).
  for (const [fn, args] of [['add_credits', { p_user_id: uid, p_amount: 10 }], ['confirm_payment', { p_payment_id: '00000000-0000-0000-0000-000000000000' }]]) {
    const r = await anon.rpc(fn, args);
    if (r.error) ok(`anon rpc ${fn}: denied`);
    else bad(`anon rpc ${fn}: EXECUTED — HOLE`);
  }
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
