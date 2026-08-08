import assert from 'node:assert/strict';
import test from 'node:test';

import worker, {
  controlledFetch,
  createRequestBudget,
  sanitizeUpstreamHeaders,
  signUpstreamToken,
  validateUpstreamUrl,
  verifyUpstreamToken,
} from '../../_worker.js';
import { createAuthD1Stub, createD1Stub } from './fixtures/d1.mjs';

const env = {
  DB: createD1Stub().db,
  ADMIN_PASSWORD: 'bootstrap-admin-password',
  AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
};

async function login(origin, loginEnv = env) {
  const headers = { 'Content-Type': 'application/json' };
  if (origin !== undefined) headers.Origin = origin;
  return worker.fetch(new Request('https://worker.example/api/auth', {
    method: 'POST',
    headers,
    body: JSON.stringify({ username: 'admin', password: loginEnv.ADMIN_PASSWORD }),
  }), loginEnv, {});
}

async function captureLogs(run) {
  const messages = [];
  const originalLog = console.log;
  console.log = (message) => messages.push(String(message));
  try {
    return { value: await run(), messages };
  } finally {
    console.log = originalLog;
  }
}

test('state-changing authentication requests require an exact same-origin Origin', async () => {
  const missing = await login(undefined);
  assert.equal(missing.status, 403);
  assert.equal((await missing.json()).error.code, 'ORIGIN_REQUIRED');

  const crossOrigin = await login('https://attacker.example');
  assert.equal(crossOrigin.status, 403);
  assert.equal((await crossOrigin.json()).error.code, 'ORIGIN_MISMATCH');

  assert.equal(missing.headers.has('Access-Control-Allow-Origin'), false);
  assert.equal(crossOrigin.headers.has('Access-Control-Allow-Origin'), false);
});

test('rejects cross-origin account and logout mutations before any D1 operation', async () => {
  const stub = createAuthD1Stub();
  const secureEnv = {
    ...env,
    DB: stub.db,
  };
  const authenticated = await login('https://worker.example', secureEnv);
  assert.equal(authenticated.status, 200);
  const cookie = (authenticated.headers.get('Set-Cookie') ?? '').split(';', 1)[0];
  const before = {
    prepared: stub.calls.prepared.length,
    bindings: stub.calls.bindings.length,
    batches: stub.calls.batches.length,
  };

  const account = await worker.fetch(new Request('https://worker.example/api/auth/accounts', {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Origin: 'https://attacker.example',
    },
    body: JSON.stringify({
      username: 'attacker',
      name: 'Attacker',
      password: 'attacker-password',
      role: 'viewer',
      customPermissions: [],
    }),
  }), secureEnv, {});
  assert.equal(account.status, 403);
  assert.equal((await account.json()).error.code, 'ORIGIN_MISMATCH');

  const logout = await worker.fetch(new Request('https://worker.example/api/auth/session', {
    method: 'DELETE',
    headers: { Cookie: cookie, Origin: 'https://attacker.example' },
  }), secureEnv, {});
  assert.equal(logout.status, 403);
  assert.equal((await logout.json()).error.code, 'ORIGIN_MISMATCH');
  assert.deepEqual({
    prepared: stub.calls.prepared.length,
    bindings: stub.calls.bindings.length,
    batches: stub.calls.batches.length,
  }, before);
});

test('keeps plaintext credentials, secrets, and raw session tokens out of D1, bodies, and logs', async () => {
  const stub = createAuthD1Stub();
  const secrets = {
    ADMIN_PASSWORD: 'plaintext-admin-password',
    AUTH_SECRET: 'plaintext-auth-secret-at-least-thirty-two-bytes',
    PREMIUM_PASSWORD: 'plaintext-premium-password',
  };
  const secureEnv = { DB: stub.db, ...secrets };
  const loginResult = await captureLogs(() => login('https://worker.example', secureEnv));
  assert.equal(loginResult.value.status, 200);
  const loginBody = await loginResult.value.clone().text();
  const setCookie = loginResult.value.headers.get('Set-Cookie') ?? '';
  const cookie = setCookie.split(';', 1)[0];
  const rawToken = cookie.split('=', 2)[1];

  const premiumResult = await captureLogs(() => worker.fetch(new Request('https://worker.example/api/auth', {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Origin: 'https://worker.example',
    },
    body: JSON.stringify({ type: 'premium', password: secrets.PREMIUM_PASSWORD }),
  }), secureEnv, {}));
  assert.equal(premiumResult.value.status, 200);
  const premiumBody = await premiumResult.value.text();

  const protectedEvidence = JSON.stringify({
    bindings: stub.calls.bindings,
    bodies: [loginBody, premiumBody],
    logs: [...loginResult.messages, ...premiumResult.messages],
  });
  for (const secret of Object.values(secrets)) assert.doesNotMatch(protectedEvidence, new RegExp(secret));
  assert.doesNotMatch(protectedEvidence, new RegExp(rawToken));
  assert.match(setCookie, /^__Host-uxuv_session=[A-Za-z0-9_-]{43};/);
  assert.match(setCookie, /HttpOnly; Secure; SameSite=Strict; Path=\//);
  assert.doesNotMatch(setCookie, /Domain=/i);
});

test('rejects private, ambiguous, credentialed, and dangerous upstream targets', () => {
  assert.equal(validateUpstreamUrl('https://media.example/video.m3u8').href, 'https://media.example/video.m3u8');
  const rejected = [
    'file:///etc/passwd',
    'https://user:password@media.example/video',
    'http://localhost/admin',
    'http://127.0.0.1/admin',
    'http://127.1/admin',
    'http://2130706433/admin',
    'http://[::1]/admin',
    'http://[::ffff:127.0.0.1]/admin',
    'http://169.254.169.254/latest/meta-data',
    'http://10.0.0.1/private',
    'http://172.16.0.1/private',
    'http://192.168.1.1/private',
    'https://media.example:22/video',
  ];
  for (const target of rejected) {
    assert.throws(() => validateUpstreamUrl(target), (error) => error?.code === 'UPSTREAM_URL_BLOCKED', target);
  }
});

test('forwards only the explicit upstream header allowlist', () => {
  const headers = sanitizeUpstreamHeaders(new Headers({
    Accept: 'application/json',
    'Accept-Language': 'zh-CN',
    Authorization: 'Bearer secret',
    Cookie: 'session=secret',
    Origin: 'https://worker.example',
    Range: 'bytes=0-99',
    'CF-Connecting-IP': '203.0.113.10',
    'X-Forwarded-For': '203.0.113.10',
  }));
  assert.deepEqual(Object.fromEntries(headers), {
    accept: 'application/json',
    'accept-language': 'zh-CN',
    range: 'bytes=0-99',
  });
});

test('validates every redirect before issuing the next subrequest', async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(String(url));
    return new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } });
  };
  await assert.rejects(
    controlledFetch('https://media.example/start', { fetchImpl, budget: createRequestBudget() }),
    (error) => error?.code === 'UPSTREAM_URL_BLOCKED',
  );
  assert.deepEqual(requests, ['https://media.example/start']);
});

test('HMAC child-resource tokens bind the exact URL and expiry', async () => {
  const secret = 'auth-secret-with-at-least-thirty-two-bytes';
  const url = 'https://media.example/segment.ts';
  const token = await signUpstreamToken(secret, url, 2_000);
  assert.equal(await verifyUpstreamToken(secret, url, token, 1_000), true);
  assert.equal(await verifyUpstreamToken(secret, `${url}?changed=1`, token, 1_000), false);
  assert.equal(await verifyUpstreamToken(secret, url, token, 2_001), false);
});
