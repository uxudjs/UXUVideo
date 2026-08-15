import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import worker from '../../_worker.js';
import { createAuthD1Stub } from './fixtures/d1.mjs';

const ORIGIN = 'https://worker.example';
const SOURCE_PATH = 'https://raw.githubusercontent.com/uxudjs/UXUVideo/main/_worker.js';
const MANIFEST_PATH = 'https://raw.githubusercontent.com/uxudjs/UXUVideo/main/app-release.json';
const PACKAGE_PATH = 'https://raw.githubusercontent.com/uxudjs/UXUVideo/main/package.json';
const environment = (db, overrides = {}) => ({
  DB: db,
  ADMIN_PASSWORD: 'bootstrap-admin-password',
  AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
  UPDATE_REPOSITORY: 'uxudjs/UXUVideo',
  UPDATE_BRANCH: 'main',
  ...overrides,
});

async function login(env) {
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ username: 'admin', password: env.ADMIN_PASSWORD }),
  }), env, {});
  assert.equal(response.status, 200);
  return response.headers.get('Set-Cookie').split(';', 1)[0];
}

async function withFetchStub(fetchImpl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try { return await run(); } finally { globalThis.fetch = original; }
}

function request(cookie = '') {
  return new Request(`${ORIGIN}/api/app-update?artifact=worker`, { headers: { Cookie: cookie } });
}

function release(version = '1.1.4') {
  return {
    currentVersion: version,
    releases: [{ version, publishedAt: '2026-08-11', title: 'Release', notes: [] }],
  };
}

test('artifact download requires authentication before contacting GitHub', async () => {
  const env = environment(createAuthD1Stub().db);
  let fetches = 0;
  const response = await withFetchStub(async () => {
    fetches += 1;
    return Response.json(release());
  }, () => worker.fetch(request(), env, {}));

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'AUTH_REQUIRED');
  assert.equal(fetches, 0);
});

test('artifact download returns exact verified Worker bytes and safety headers', async () => {
  const env = environment(createAuthD1Stub().db);
  const cookie = await login(env);
  const source = "const WORKER_VERSION = '1.1.4';\nexport default { fetch() {} };\n";
  const calls = [];
  const response = await withFetchStub(async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, redirect: init.redirect });
    if (url === MANIFEST_PATH) return Response.json(release());
    if (url === SOURCE_PATH) {
      return new Response(source, { headers: {
        'Content-Length': String(Buffer.byteLength(source)),
        'Content-Type': 'text/plain; charset=utf-8',
      } });
    }
    throw new Error(`unexpected URL ${url}`);
  }, () => worker.fetch(request(cookie), env, {}));

  assert.equal(response.status, 200);
  assert.equal(await response.text(), source);
  assert.equal(response.headers.get('Content-Type'), 'text/javascript; charset=utf-8');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('X-UXUVideo-Worker-Version'), '1.1.4');
  assert.equal(response.headers.get('X-UXUVideo-Worker-SHA256'), createHash('sha256').update(source).digest('hex'));
  assert.deepEqual(calls.map(({ url }) => url), [MANIFEST_PATH, SOURCE_PATH]);
  assert.ok(calls.every(({ redirect }) => redirect === 'manual'));
});

test('artifact download falls back to package.json when release manifest is missing', async () => {
  const env = environment(createAuthD1Stub().db);
  const cookie = await login(env);
  const source = "const WORKER_VERSION = '1.1.4';\nexport default { fetch() {} };\n";
  const calls = [];
  const response = await withFetchStub(async (input) => {
    const url = String(input);
    calls.push(url);
    if (url === MANIFEST_PATH) return new Response('Not Found', { status: 404 });
    if (url === PACKAGE_PATH) return Response.json({ version: '1.1.4' });
    if (url === SOURCE_PATH) return new Response(source);
    throw new Error(`unexpected URL ${url}`);
  }, () => worker.fetch(request(cookie), env, {}));

  assert.equal(response.status, 200);
  assert.equal(await response.text(), source);
  assert.deepEqual(calls, [MANIFEST_PATH, PACKAGE_PATH, SOURCE_PATH]);
});

test('artifact download rejects a remote Worker older than the current Worker before fetching source', async () => {
  const env = environment(createAuthD1Stub().db);
  const cookie = await login(env);
  const calls = [];
  const response = await withFetchStub(async (input) => {
    const url = String(input);
    calls.push(url);
    if (url === MANIFEST_PATH) return Response.json(release('0.9.0'));
    if (url === SOURCE_PATH) return new Response("const WORKER_VERSION = '0.9.0';\n");
    throw new Error(`unexpected URL ${url}`);
  }, () => worker.fetch(request(cookie), env, {}));

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, 'APP_UPDATE_VERSION_MISMATCH');
  assert.deepEqual(calls, [MANIFEST_PATH]);
});

test('artifact download fails closed when source and release versions differ', async () => {
  const env = environment(createAuthD1Stub().db);
  const cookie = await login(env);
  const response = await withFetchStub(async (input) => {
    if (String(input) === MANIFEST_PATH) return Response.json(release('1.1.4'));
    return new Response("const WORKER_VERSION = '1.0.9';\n");
  }, () => worker.fetch(request(cookie), env, {}));

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, 'APP_UPDATE_VERSION_MISMATCH');
});

test('artifact download maps an unparseable Worker version to a stable fetch failure', async () => {
  const env = environment(createAuthD1Stub().db);
  const cookie = await login(env);
  const response = await withFetchStub(async (input) => {
    if (String(input) === MANIFEST_PATH) return Response.json(release());
    return new Response('export default { fetch() {} };\n');
  }, () => worker.fetch(request(cookie), env, {}));

  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, 'APP_UPDATE_FETCH_FAILED');
});

test('artifact download rejects source larger than 3 MiB', async () => {
  const env = environment(createAuthD1Stub().db);
  const cookie = await login(env);
  const response = await withFetchStub(async (input) => {
    if (String(input) === MANIFEST_PATH) return Response.json(release());
    return new Response('x', { headers: { 'Content-Length': String(3 * 1024 * 1024 + 1) } });
  }, () => worker.fetch(request(cookie), env, {}));

  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, 'APP_UPDATE_ARTIFACT_TOO_LARGE');
});

test('artifact download maps upstream failures without echoing upstream content', async () => {
  const env = environment(createAuthD1Stub().db);
  const cookie = await login(env);
  const response = await withFetchStub(async () => {
    throw new Error('Bearer secret-upstream-token');
  }, () => worker.fetch(request(cookie), env, {}));

  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.error.code, 'APP_UPDATE_FETCH_FAILED');
  assert.doesNotMatch(JSON.stringify(body), /secret-upstream-token|Bearer/);
});
