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

function request(url, cookie = '', body = { url: 'https://subscriptions.example/sources.json' }) {
  return new Request(`${ORIGIN}/api/source-import`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

async function withFetchStub(stub, run) {
  const previous = globalThis.fetch;
  globalThis.fetch = stub;
  try { return await run(); } finally { globalThis.fetch = previous; }
}

test('source import requires authentication before any upstream request', async () => {
  const { db } = createAuthD1Stub();
  let fetches = 0;
  const response = await withFetchStub(async () => { fetches += 1; return Response.json([]); },
    () => worker.fetch(request(), environment(db), {}));
  assert.equal(response.status, 401);
  assert.equal(fetches, 0);
});

test('source import rejects dangerous targets before fetch', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  let fetches = 0;
  const response = await withFetchStub(async () => { fetches += 1; return Response.json([]); },
    () => worker.fetch(request('', cookie, { url: 'http://127.0.0.1/private' }), env, {}));
  assert.equal(response.status, 400);
  assert.equal(fetches, 0);
});

test('source import returns only a bounded authenticated text payload', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const text = '[{"id":"safe","name":"Safe","baseUrl":"https://media.example"}]';
  const response = await withFetchStub(async (input) => {
    assert.equal(String(input), 'https://subscriptions.example/sources.json');
    return new Response(text, { headers: { 'Content-Type': 'application/json' } });
  }, () => worker.fetch(request('', cookie), env, {}));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { text });
});
