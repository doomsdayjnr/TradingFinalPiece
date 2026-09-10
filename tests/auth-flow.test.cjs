const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const { NextRequest, NextResponse } = require('next/server');

function load(file, imports = {}, env = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(source, { exports, URL, process: { env }, require(name) {
    if (!(name in imports)) throw Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}
function redirect(location) { const error = new Error('redirect'); error.location = location; throw error; }
async function redirected(action) {
  try { await action(); assert.fail('Expected redirect'); }
  catch (error) { if (!error.location) throw error; return error.location; }
}
function form(values) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; }

function authFixture(signupResult = { data: { user: { id: 'test-user' }, session: null }, error: null }) {
  let signup, signouts = 0;
  const actions = load('app/auth/actions.ts', {
    'next/navigation': { redirect },
    '@/lib/analytics/events': { trackFunnelEvent: async () => {} },
    '@/lib/auth/site-url': { getSiteUrl: () => 'https://trading-final-piece.vercel.app' },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({ auth: {
      signUp: async value => { signup = value; return signupResult; },
      signOut: async () => { signouts++; return { error: null }; },
      signInWithPassword: async () => ({ error: null })
    } }) }
  });
  return { actions, get signup() { return signup; }, get signouts() { return signouts; } };
}
test('signup requiring confirmation shows check-email and sends explicit hosted callback', async () => {
  const f = authFixture();
  assert.equal(await redirected(() => f.actions.register(form({ email: 'test@example.test', password: 'test-password' }))), '/register/check-email');
  assert.equal(f.signup.options.emailRedirectTo, 'https://trading-final-piece.vercel.app/auth/callback');
  assert.equal(f.signouts, 0);
});
test('signup with immediate session proceeds to dashboard', async () => {
  const f = authFixture({ data: { user: { id: 'test-user' }, session: { access_token: 'test' } }, error: null });
  assert.equal(await redirected(() => f.actions.register(form({ email: 'test@example.test', password: 'test-password' }))), '/dashboard');
});
test('signup error remains on registration page', async () => {
  const f = authFixture({ data: {}, error: { message: 'Email request rejected' } });
  assert.match(await redirected(() => f.actions.register(form({}))), /^\/register\?message=/);
});
test('only explicit logout action signs out', async () => {
  const f = authFixture();
  assert.equal(await redirected(() => f.actions.logout()), '/');
  assert.equal(f.signouts, 1);
});
test('prefetch or GET of old logout URL cannot sign out', async () => {
  const route = load('app/logout/route.ts', { 'next/server': { NextResponse } });
  const response = await route.GET(new Request('https://example.test/logout', { headers: { purpose: 'prefetch' } }));
  assert.equal(response.headers.get('location'), 'https://example.test/dashboard');
  assert.equal(response.headers.get('set-cookie'), null);
});
for (const result of ['success', 'error', 'missing']) {
  test(`email callback ${result} has a controlled same-origin destination`, async () => {
    const calls = [];
    const route = load('app/auth/callback/route.ts', {
      'next/server': { NextResponse },
      '@/lib/supabase/server': { createSupabaseServerClient: async () => ({ auth: {
        exchangeCodeForSession: async code => { calls.push(code); return { error: result === 'success' ? null : { message: 'expired' } }; }
      } }) }
    });
    const url = new URL('https://example.test/auth/callback?next=https://untrusted.test');
    if (result !== 'missing') url.searchParams.set('code', 'test-code');
    const response = await route.GET(new Request(url));
    const destination = new URL(response.headers.get('location'));
    assert.equal(destination.origin, url.origin);
    assert.equal(destination.pathname, result === 'success' ? '/dashboard' : '/login');
    if (result !== 'success') assert.ok(destination.searchParams.get('message'));
    assert.equal(calls.length, result === 'missing' ? 0 : 1);
  });
}
test('production signup URL defaults to Vercel, not localhost; configured custom origin works', () => {
  assert.equal(load('lib/auth/site-url.ts', {}, { NODE_ENV: 'production' }).getSiteUrl(), 'https://trading-final-piece.vercel.app');
  assert.equal(load('lib/auth/site-url.ts', {}, { NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://www.tradingfinalpiece.com/' }).getSiteUrl(), 'https://www.tradingfinalpiece.com');
  assert.throws(() => load('lib/auth/site-url.ts', {}, { NEXT_PUBLIC_SITE_URL: 'https://user:secret@example.test' }).getSiteUrl());
});
test('refreshed auth cookies reach both server actions and the browser', async () => {
  const request = new NextRequest('https://example.test/dashboard', { method: 'POST', headers: { cookie: 'sb-test=old-token' } });
  let calls = 0;
  const { proxy } = load('proxy.ts', {
    'next/server': { NextResponse },
    '@supabase/ssr': { createServerClient: (_url, _key, { cookies }) => ({ auth: {
      getUser: async () => {
        calls++;
        assert.equal(cookies.getAll()[0].value, 'old-token');
        cookies.setAll([{ name: 'sb-test', value: 'new-token', options: { path: '/', sameSite: 'lax' } }], { Pragma: 'no-cache', Expires: '0' });
        return { data: { user: { id: 'test-user' } }, error: null };
      }
    } }) }
  }, { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key' });
  const response = await proxy(request);
  assert.equal(calls, 1);
  assert.equal(request.cookies.get('sb-test').value, 'new-token');
  assert.equal(response.cookies.get('sb-test').value, 'new-token');
  assert.match(response.headers.get('x-middleware-request-cookie'), /new-token/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('pragma'), 'no-cache');
});

function demoFixture({ signedIn = true, duplicate = false } = {}) {
  const inserted = [], refreshed = [], events = [];
  const admin = { from(table) { return { insert(value) {
    inserted.push({ table, value });
    const result = { data: { id: `${table}-id`, expires_at: '2026-09-24T12:00:00.000Z' }, error: duplicate ? { code: '23505' } : null };
    return { select() { return { single: async () => result }; }, then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); } };
  } }; } };
  const actions = load('app/dashboard/actions.ts', {
    'node:crypto': crypto,
    'next/cache': { revalidatePath: path => refreshed.push(path) },
    'next/navigation': { redirect },
    '@/lib/analytics/events': { trackFunnelEvent: async (...args) => events.push(args) },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => admin },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({ auth: {
      getUser: async () => ({ data: { user: signedIn ? { id: 'test-user' } : null }, error: null }),
      signOut: async () => assert.fail('Demo request must never sign out')
    } }) }
  });
  return { actions, inserted, refreshed, events };
}
for (const platform of ['MT4', 'MT5']) {
  test(`${platform} demo submission preserves session, creates matching token and returns to dashboard`, async () => {
    const f = demoFixture();
    assert.match(await redirected(() => f.actions.requestDemoLicense(form({ platform }))), /^\/dashboard\?message=Demo/);
    assert.equal(f.inserted.length, 3);
    for (const row of f.inserted) { assert.equal(row.value.user_id, 'test-user'); assert.equal(row.value.platform, platform); }
    const rawToken = f.inserted[2].value.token;
    assert.match(rawToken, /^[a-f0-9]{64}$/);
    assert.equal(crypto.createHash('sha256').update(rawToken).digest('hex'), f.inserted[1].value.license_token_hash);
    assert.deepEqual(f.refreshed, ['/dashboard']);
  });
}
test('duplicate demo trial stays on dashboard with useful feedback', async () => {
  const f = demoFixture({ duplicate: true });
  const location = await redirected(() => f.actions.requestDemoLicense(form({ platform: 'MT4' })));
  assert.match(decodeURIComponent(location), /already requested/);
  assert.equal(f.inserted.length, 1);
});
test('genuinely expired session returns to login without creating a trial', async () => {
  const f = demoFixture({ signedIn: false });
  assert.match(await redirected(() => f.actions.requestDemoLicense(form({ platform: 'MT4' }))), /^\/login\?message=Your session has expired/);
  assert.equal(f.inserted.length, 0);
});
