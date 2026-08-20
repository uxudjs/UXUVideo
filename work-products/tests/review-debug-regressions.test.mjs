import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../_worker.js';
import { createAuthD1Stub } from './fixtures/d1.mjs';

const ORIGIN = 'https://worker.example';
const environment = (db) => ({
  DB: db,
  AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
  ADMIN_PASSWORD: 'bootstrap-admin-password',
});

async function login(env) {
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
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

test('source import keeps request abort active while the upstream body is being read', async () => {
  const env = environment(createAuthD1Stub().db);
  const cookie = await login(env);
  const requestAbort = new AbortController();
  let streamController;
  let headersReturned;
  const headersReady = new Promise((resolve) => { headersReturned = resolve; });
  const responsePromise = withFetchStub(async (_input, init) => {
    const response = new Response(new ReadableStream({
      start(controller) {
        streamController = controller;
        init.signal.addEventListener('abort', () => controller.error(init.signal.reason), { once: true });
      },
    }), { headers: { 'Content-Type': 'application/json' } });
    headersReturned();
    return response;
  }, () => worker.fetch(new Request(`${ORIGIN}/api/source-import`, {
    method: 'POST', signal: requestAbort.signal,
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie },
    body: JSON.stringify({ url: 'https://subscriptions.example/sources.json' }),
  }), env, {}));

  await headersReady;
  requestAbort.abort();
  const outcome = await Promise.race([
    responsePromise,
    new Promise((resolve) => setTimeout(() => resolve(null), 200)),
  ]);
  if (!outcome) {
    streamController.error(new Error('release stalled RED probe'));
    await responsePromise;
  }
  assert.ok(outcome, 'source import remained pending after request abort');
  assert.equal(outcome.status, 499);
  assert.equal((await outcome.json()).error.code, 'UPSTREAM_ABORTED');
});

test('config documents reject video skip keys that the Pages client cannot read', async () => {
  const env = environment(createAuthD1Stub().db);
  const cookie = await login(env);
  const response = await worker.fetch(new Request(`${ORIGIN}/api/user/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie },
    body: JSON.stringify({ baseVersion: 0, payload: {
      fields: { videoSkipRules: { value: { 'standard:not valid:video': {
        introEnabled: false, introSeconds: 0, outroEnabled: false, outroSeconds: 0, updatedAt: 1,
      } }, updatedAt: 1 } },
      sources: [], subscriptions: [], tombstones: [],
    } }),
  }), env, {});

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'INVALID_DOCUMENT');
});
