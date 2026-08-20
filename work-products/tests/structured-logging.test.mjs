import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../_worker.js';
import { createAuthD1Stub, createD1Stub } from './fixtures/d1.mjs';

const ORIGIN = 'https://worker.example';

async function login(env) {
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ username: 'admin', password: env.ADMIN_PASSWORD }),
  }), env, {});
  assert.equal(response.status, 200);
  return response.headers.get('Set-Cookie').split(';', 1)[0];
}

test('emits one correlated completion log without request secrets, even in debug mode', async () => {
  const messages = [];
  const originalLog = console.log;
  console.log = (message) => messages.push(String(message));

  let response;
  try {
    response = await worker.fetch(new Request(
      'https://worker.example/api/admin/usage?url=https%3A%2F%2Fmedia.example%2Fprivate.m3u8&token=query-secret',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer authorization-secret',
          Cookie: 'session=cookie-secret',
        },
      },
    ), {
      DEBUG: 'true',
      DB: createD1Stub().db,
      ADMIN_PASSWORD: 'bootstrap-admin-password',
      AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
    }, {});
  } finally {
    console.log = originalLog;
  }

  assert.equal(response.status, 401);
  const entries = messages.map((message) => JSON.parse(message));
  const completions = entries.filter(({ event }) => event === 'request.complete');
  assert.equal(completions.length, 1);

  const [entry] = completions;
  assert.deepEqual(Object.keys(entry), [
    'event',
    'requestId',
    'routeId',
    'method',
    'status',
    'durationMs',
    'workerVersion',
    'pagesVersion',
    'apiContract',
    'cacheStatus',
    'upstreamClass',
    'errorCode',
  ]);
  assert.equal(entry.event, 'request.complete');
  assert.equal(entry.requestId, response.headers.get('X-Request-Id'));
  assert.equal(entry.routeId, 'admin-usage');
  assert.equal(entry.method, 'GET');
  assert.equal(entry.status, 401);
  assert.equal(Number.isInteger(entry.durationMs), true);
  assert.equal(entry.durationMs >= 0, true);
  assert.equal(entry.workerVersion, response.headers.get('X-UXUV-Worker-Version'));
  assert.equal(entry.pagesVersion, response.headers.get('X-UXUV-Pages-Version'));
  assert.equal(entry.apiContract, response.headers.get('X-UXUV-API-Contract'));
  assert.equal(entry.cacheStatus, 'bypass');
  assert.equal(entry.upstreamClass, null);
  assert.equal(entry.errorCode, 'AUTH_REQUIRED');

  const serialized = messages.join('\n').toLowerCase();
  for (const secret of [
    'media.example',
    'query-secret',
    'authorization-secret',
    'cookie-secret',
  ]) {
    assert.doesNotMatch(serialized, new RegExp(secret));
  }
});

test('S21-T04 source failures log only bounded counts, never source credentials or response bodies', async () => {
  const { db } = createAuthD1Stub();
  const env = {
    DB: db,
    ADMIN_PASSWORD: 'bootstrap-admin-password',
    AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
  };
  const cookie = await login(env);
  const messages = [];
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  globalThis.fetch = async () => Response.json({ detail: 'upstream-response-secret' });
  console.log = (message) => messages.push(String(message));
  try {
    const response = await worker.fetch(new Request(`${ORIGIN}/api/search-parallel`, {
      method: 'POST',
      headers: { Cookie: cookie, Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test', sources: [{
        id: 'private-source', name: 'Private source', enabled: true,
        baseUrl: 'https://source-credential.example/api.php/provide/vod?token=source-query-secret',
        searchPath: '/api.php/provide/vod/',
        headers: { referer: 'https://private-referrer.example/path?token=referer-secret' },
      }] }),
    }), env, {});
    await response.text();
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }

  const entries = messages.map((message) => JSON.parse(message));
  const unavailable = entries.find(({ event }) => event === 'search.sources_unavailable');
  assert.deepEqual(Object.keys(unavailable).sort(), [
    'errorCode', 'event', 'failedSources', 'requestId', 'routeId', 'totalSources',
  ]);
  assert.equal(unavailable.failedSources, 1);
  const serialized = messages.join('\n');
  for (const secret of [
    'source-credential.example', 'source-query-secret', 'private-referrer.example',
    'referer-secret', 'upstream-response-secret',
  ]) assert.doesNotMatch(serialized, new RegExp(secret));
});
