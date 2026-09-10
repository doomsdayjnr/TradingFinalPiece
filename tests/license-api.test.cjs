const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

const token = 'a'.repeat(64);
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
const future = () => new Date(Date.now() + 3600000).toISOString();
const past = () => new Date(Date.now() - 3600000).toISOString();
const source = ts.transpileModule(readFileSync('app/api/v1/license/validate/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText;

// Exercise the real route with a small database double. No production fixtures,
// credentials, server or new testing dependency are needed.
function fixture({ kind = 'live', databaseError = false, unavailable = false, limited = false } = {}) {
  const account = { id: 'account-a', user_id: 'user-a', account_number: '123456789012',
    account_kind: 'live', platform: 'MT5', verification_status: 'verified', brokers: { name: 'XM' } };
  const entitlement = { id: 'entitlement-a', user_id: 'user-a', broker_account_id: account.id,
    demo_license_id: 'demo-a', kind, platform: 'MT5', ea_product: 'tfp-edge',
    license_token_hash: tokenHash, status: 'active', expires_at: kind === 'demo' ? future() : null,
    demo_licenses: { id: 'demo-a', status: 'active', expires_at: future() } };
  const tables = { broker_accounts: [account], license_entitlements: [entitlement], license_checks: [] };
  const events = [];
  const db = { from(table) {
    const filters = [];
    let patch;
    const query = {
      select() { return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      neq(key, value) { filters.push(row => row[key] !== value); return query; },
      update(value) { patch = value; return query; },
      insert(value) { tables[table].push(value); return Promise.resolve({ error: null }); },
      maybeSingle() {
        if (databaseError) return Promise.resolve({ data: null, error: { message: 'database offline' } });
        const matches = tables[table].filter(row => filters.every(filter => filter(row)));
        return Promise.resolve(matches.length > 1 ? { data: null, error: { message: 'ambiguous rows' } }
          : { data: matches[0] ?? null, error: null });
      },
      then(resolve, reject) {
        for (const row of tables[table].filter(row => filters.every(filter => filter(row)))) Object.assign(row, patch);
        return Promise.resolve({ error: null }).then(resolve, reject);
      }
    };
    return query;
  } };
  const exports = {};
  const imports = {
    'node:crypto': crypto,
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/analytics/events': { trackFunnelEvent: async (...args) => { events.push(args); } },
    '@/lib/security/rate-limit': { getClientIp: () => 'test', checkRateLimit: () => ({ limited, resetAt: Date.now() + 60000 }) },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => { if (unavailable) throw Error('missing config'); return db; } }
  };
  vm.runInNewContext(source, { exports, require: name => {
    if (!(name in imports)) throw Error(`Unexpected import ${name}`);
    return imports[name];
  }, Date, URL, Request, Response });
  const payload = { account_number: account.account_number, account_type: kind, platform_type: 'MT5',
    broker_name: 'XM', ea_product: 'tfp-edge', ea_version: '1.02', license_token: token };
  async function send(body = payload) {
    const response = await exports.POST(new Request('https://example.test/api/v1/license/validate', {
      method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }
    }));
    return { response, body: await response.json() };
  }
  return { account, entitlement, tables, events, payload, send, post: exports.POST };
}

test('live authorization binds token, account, platform and product and returns bounded grace', async () => {
  const f = fixture();
  const { body } = await f.send();
  assert.equal(body.allowed, true);
  assert.equal(body.expires_at, null);
  assert.ok(Date.parse(body.grace_until) - Date.parse(body.server_time) <= 48 * 3600000);
  assert.ok(f.entitlement.last_validated_at);
  assert.equal(f.tables.license_checks[0].result, 'allowed');
  assert.equal(f.events[0][0], 'license_validation_succeeded');
  assert.ok(!JSON.stringify(f.tables.license_checks).includes(token));
});

test('MT4 authorization works independently', async () => {
  const f = fixture(); f.account.platform = f.entitlement.platform = f.payload.platform_type = 'MT4';
  assert.equal((await f.send()).body.allowed, true);
});

for (const status of ['pending', 'rejected', 'suspended', 'revoked', 'removed_by_user']) {
  test(`live ${status} denies`, async () => {
    const f = fixture(); f.account.verification_status = status;
    assert.equal((await f.send()).body.allowed, false);
  });
}
test('removed history and identical account numbers on another platform do not break a new live record', async () => {
  const f = fixture();
  f.tables.broker_accounts.push({ ...f.account, id: 'old', verification_status: 'removed_by_user' });
  f.tables.broker_accounts.push({ ...f.account, id: 'other-platform', platform: 'MT4' });
  assert.equal((await f.send()).body.allowed, true);
});
for (const [field, value] of [['account_number', '999999'], ['license_token', 'b'.repeat(64)],
  ['platform_type', 'MT4'], ['broker_name', 'Another broker'], ['ea_product', 'another-ea']]) {
  test(`mismatched ${field} denies`, async () => {
    const f = fixture(); f.payload[field] = value;
    assert.equal((await f.send()).body.allowed, false);
  });
}
test('live entitlement expiry is enforced and grace cannot outlive a future expiry', async () => {
  const f = fixture(); f.entitlement.expires_at = past();
  assert.equal((await f.send()).body.status, 'expired');
  f.entitlement.expires_at = future();
  assert.equal((await f.send()).body.grace_until, f.entitlement.expires_at);
});
test('non-active live entitlement denies', async () => {
  const f = fixture(); f.entitlement.status = 'revoked';
  assert.equal((await f.send()).body.allowed, false);
});
test('demo grace is limited by the earlier of both expiry records', async () => {
  const f = fixture({ kind: 'demo' });
  f.entitlement.demo_licenses.expires_at = new Date(Date.now() + 60000).toISOString();
  const { body } = await f.send();
  assert.equal(body.allowed, true);
  assert.equal(body.grace_until, f.entitlement.demo_licenses.expires_at);
  assert.equal(body.expires_at, body.grace_until);
});
for (const record of ['entitlement', 'trial']) {
  test(`expired ${record} denies even if the other demo record is active`, async () => {
    const f = fixture({ kind: 'demo' });
    (record === 'trial' ? f.entitlement.demo_licenses : f.entitlement).expires_at = past();
    assert.equal((await f.send()).body.status, 'expired');
  });
}
test('missing or invalid demo expiry cannot create unlimited access', async () => {
  const f = fixture({ kind: 'demo' }); f.entitlement.expires_at = null;
  assert.equal((await f.send()).body.allowed, false);
  f.entitlement.expires_at = 'invalid';
  assert.equal((await f.send()).body.allowed, false);
});
test('demo token cannot validate live mode', async () => {
  const f = fixture({ kind: 'demo' }); f.payload.account_type = 'live';
  assert.equal((await f.send()).body.allowed, false);
});
test('product binding is checked on the stored entitlement', async () => {
  const f = fixture(); f.entitlement.ea_product = 'another-ea';
  assert.equal((await f.send()).body.allowed, false);
});
test('invalid shapes, fields and JSON fail with a controlled 400 response', async () => {
  const f = fixture();
  for (const input of [null, [], 'string', {}, { ...f.payload, account_number: 123 },
    { ...f.payload, platform_type: 'MT6' }, { ...f.payload, license_token: 'short' }]) {
    const { response, body } = await f.send(input);
    assert.equal(response.status, 400); assert.equal(body.allowed, false);
  }
  assert.equal((await f.post(new Request('https://example.test', { method: 'POST', body: '{' }))).status, 400);
});
test('real alias and lower-case platform are accepted', async () => {
  const f = fixture(); f.payload.account_type = 'real'; f.payload.platform_type = 'mt5';
  assert.equal((await f.send()).body.allowed, true);
});
test('database failures return server error rather than account not found', async () => {
  const { response, body } = await fixture({ databaseError: true }).send();
  assert.equal(response.status, 500); assert.equal(body.status, 'server_error');
});
test('missing configuration returns controlled unavailable response', async () => {
  const { response, body } = await fixture({ unavailable: true }).send();
  assert.equal(response.status, 503); assert.equal(body.allowed, false);
});
test('rate limiting returns retry information and denies', async () => {
  const { response, body } = await fixture({ limited: true }).send();
  assert.equal(response.status, 429); assert.equal(body.allowed, false);
  assert.ok(Number(response.headers.get('Retry-After')) > 0);
});
