const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
const source = ts.transpileModule(readFileSync('app/api/downloads/ea/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
function fixture({ user = { id: 'user-a' }, rows = [], databaseError = false, storageError = false } = {}) {
  const signed = [], events = [], filters = [];
  const query = {
    select() { return query; },
    eq(key, value) { filters.push([key, value]); return query; },
    then(resolve, reject) { return Promise.resolve({ data: rows.filter(row => filters.every(([key, value]) => row[key] === value)),
      error: databaseError ? { message: 'internal database details' } : null }).then(resolve, reject); }
  };
  const db = { from: () => query, storage: { from: bucket => ({
    createSignedUrl: async (path, seconds, options) => {
      signed.push({ bucket, path, seconds, options });
      return { data: storageError ? null : { signedUrl: 'https://storage.example.test/file' }, error: storageError ? { message: 'internal storage details' } : null };
    }
  }) } };
  const imports = {
    'next/server': { NextResponse },
    '@/lib/analytics/events': { trackFunnelEvent: async (...args) => events.push(args) },
    '@/lib/security/rate-limit': { checkRateLimit: () => ({ limited: false }), getClientIp: () => 'test' },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => db },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) }
  };
  const exports = {};
  vm.runInNewContext(source, { exports, process: { env: {} }, URL, Date, require: name => {
    if (!(name in imports)) throw Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return { get: platform => exports.GET(new Request(`https://app.example.test/api/downloads/ea?platform=${platform}`)), signed, events };
}
const active = platform => ({ id: 'entitlement', user_id: 'user-a', platform, status: 'active', expires_at: null });
for (const platform of ['MT4', 'MT5']) {
  test(`${platform} download signs the canonical path only for the requesting user`, async () => {
    const f = fixture({ rows: [active(platform)] });
    const response = await f.get(platform);
    assert.equal(response.headers.get('location'), 'https://storage.example.test/file');
    assert.equal(f.signed[0].bucket, 'ea-downloads');
    assert.equal(f.signed[0].path, `tfp-edge/${platform.toLowerCase()}/tfp-edge.${platform === 'MT4' ? 'ex4' : 'ex5'}`);
    assert.equal(f.signed[0].seconds, 300);
    assert.equal(f.events.length, 1);
  });
}
test('another user entitlement cannot grant download access', async () => {
  const f = fixture({ rows: [{ ...active('MT4'), user_id: 'user-b' }] });
  assert.equal((await f.get('MT4')).status, 403);
  assert.equal(f.signed.length, 0);
});
test('opposite platform, expired and revoked entitlements cannot grant access', async () => {
  for (const row of [active('MT5'), { ...active('MT4'), expires_at: '2000-01-01T00:00:00Z' }, { ...active('MT4'), status: 'revoked' }]) {
    const f = fixture({ rows: [row] });
    assert.equal((await f.get('MT4')).status, 403);
    assert.equal(f.signed.length, 0);
  }
});
test('logged-out download redirects to login', async () => {
  const f = fixture({ user: null });
  assert.equal((await f.get('MT4')).headers.get('location'), 'https://app.example.test/login');
});
test('unsupported platform is rejected', async () => {
  assert.equal((await fixture().get('MT6')).status, 400);
});
test('unavailable binary returns user to portal without storage paths or admin instructions', async () => {
  const f = fixture({ rows: [active('MT4')], storageError: true });
  const location = new URL((await f.get('MT4')).headers.get('location'));
  assert.equal(location.pathname, '/dashboard');
  assert.match(location.searchParams.get('message'), /MT4 download is temporarily unavailable/);
  assert.doesNotMatch(location.search, /tfp-edge|Supabase|internal|Upload/);
  assert.equal(f.events.length, 0);
});
test('database failure stays in portal and does not expose internal errors', async () => {
  const f = fixture({ databaseError: true });
  const location = new URL((await f.get('MT4')).headers.get('location'));
  assert.equal(location.pathname, '/dashboard');
  assert.doesNotMatch(location.search, /internal database/);
  assert.equal(f.signed.length, 0);
});
