import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../_worker.js';

const ROUTES = [
  ['/api/app-update', ['GET']],
  ['/api/auth/accounts/account-123', ['PATCH', 'DELETE']],
  ['/api/auth/accounts', ['GET', 'POST']],
  ['/api/auth', ['GET', 'POST']],
  ['/api/auth/session', ['GET', 'DELETE']],
  ['/api/config', ['GET']],
  ['/api/danmaku', ['GET', 'OPTIONS']],
  ['/api/detail', ['GET', 'POST']],
  ['/api/douban/image', ['GET']],
  ['/api/douban/recommend', ['GET']],
  ['/api/douban/tags', ['GET']],
  ['/api/iptv', ['GET']],
  ['/api/iptv/stream', ['GET', 'OPTIONS']],
  ['/api/ping', ['POST']],
  ['/api/premium/category', ['GET', 'POST']],
  ['/api/premium/types', ['GET', 'POST']],
  ['/api/probe-resolution', ['POST']],
  ['/api/proxy', ['GET', 'OPTIONS']],
  ['/api/search-parallel', ['POST']],
  ['/api/user/config', ['GET', 'POST']],
  ['/api/user/sync', ['GET', 'POST']],
  ['/api/admin/usage', ['GET']],
];

const SSE_PATHS = new Set(['/api/probe-resolution', '/api/search-parallel']);
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function dispatch(path, method) {
  const messages = [];
  const originalLog = console.log;
  console.log = (message) => messages.push(String(message));

  try {
    const response = await worker.fetch(new Request(`https://worker.example${path}`, { method }), {}, {});
    return { response, messages };
  } finally {
    console.log = originalLog;
  }
}

function assertVersionHeaders(response) {
  const requestId = response.headers.get('X-Request-Id');
  assert.match(requestId ?? '', REQUEST_ID_PATTERN);
  assert.equal(response.headers.get('X-UXUV-Worker-Version'), '1.0.0');
  assert.equal(response.headers.get('X-UXUV-Pages-Version'), 'unavailable');
  assert.equal(response.headers.get('X-UXUV-API-Contract'), '1');
  return requestId;
}

async function readError(response, isSse = false) {
  const text = await response.text();
  if (!isSse) {
    assert.match(response.headers.get('Content-Type') ?? '', /^application\/json\b/);
    return JSON.parse(text);
  }

  assert.match(response.headers.get('Content-Type') ?? '', /^text\/event-stream\b/);
  assert.match(text, /^event: error\ndata: /);
  return JSON.parse(text.slice('event: error\ndata: '.length).trim());
}

async function assertStructuredError(response, expectedStatus, expectedCode, isSse = false) {
  assert.equal(response.status, expectedStatus);
  const requestId = assertVersionHeaders(response);
  const body = await readError(response, isSse);
  assert.deepEqual(Object.keys(body), ['error']);
  assert.equal(body.error.code, expectedCode);
  assert.equal(typeof body.error.message, 'string');
  assert.equal(body.error.requestId, requestId);
  assert.equal(body.error.details, null);
}

test('registers all 22 API path and method contracts as fail-closed stubs', async () => {
  assert.equal(ROUTES.length, 22);

  for (const [path, methods] of ROUTES) {
    for (const method of methods) {
      const { response, messages } = await dispatch(path, method);
      await assertStructuredError(response, 501, 'ROUTE_NOT_IMPLEMENTED', SSE_PATHS.has(path));
      assert.equal(messages.length, 1);
    }
  }
});

test('returns 405 with Allow for methods outside each route contract', async () => {
  for (const [path, methods] of ROUTES) {
    const { response } = await dispatch(path, 'PUT');
    await assertStructuredError(response, 405, 'METHOD_NOT_ALLOWED', SSE_PATHS.has(path));
    assert.equal(response.headers.get('Allow'), methods.join(', '));
  }
});

test('unknown API paths return structured 404 and never HTML', async () => {
  const { response } = await dispatch('/api/not-a-route', 'GET');
  await assertStructuredError(response, 404, 'API_ROUTE_NOT_FOUND');
  assert.doesNotMatch(response.headers.get('Content-Type') ?? '', /text\/html/i);
});

test('non-API methods fail with 405 while GET and HEAD fail closed until Pages is wired', async () => {
  const post = await dispatch('/settings', 'POST');
  await assertStructuredError(post.response, 405, 'METHOD_NOT_ALLOWED');
  assert.equal(post.response.headers.get('Allow'), 'GET, HEAD');

  const get = await dispatch('/settings', 'GET');
  await assertStructuredError(get.response, 503, 'FRONTEND_NOT_READY');

  const head = await dispatch('/settings', 'HEAD');
  assert.equal(head.response.status, 503);
  assertVersionHeaders(head.response);
  assert.equal(await head.response.text(), '');
});

test('normalizes trailing slashes without widening dynamic account paths', async () => {
  const normalized = await dispatch('/api/config/', 'GET');
  await assertStructuredError(normalized.response, 501, 'ROUTE_NOT_IMPLEMENTED');

  const nested = await dispatch('/api/auth/accounts/account-123/extra', 'PATCH');
  await assertStructuredError(nested.response, 404, 'API_ROUTE_NOT_FOUND');
});
