import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../_worker.js';
import { createAuthD1Stub, createD1Stub } from './fixtures/d1.mjs';

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
const IMPLEMENTED_PATHS = new Set([
  '/api/app-update',
  '/api/auth/accounts/account-123',
  '/api/auth/accounts',
  '/api/auth',
  '/api/auth/session',
  '/api/config',
  '/api/danmaku',
  '/api/detail',
  '/api/douban/image',
  '/api/douban/recommend',
  '/api/douban/tags',
  '/api/iptv',
  '/api/iptv/stream',
  '/api/ping',
  '/api/premium/category',
  '/api/premium/types',
  '/api/probe-resolution',
  '/api/proxy',
  '/api/search-parallel',
  '/api/user/config',
  '/api/user/sync',
  '/api/admin/usage',
]);
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROUTE_DB = createD1Stub().db;

async function dispatch(path, method) {
  const messages = [];
  const originalLog = console.log;
  console.log = (message) => messages.push(String(message));

  try {
    const response = await worker.fetch(
      new Request(`https://worker.example${path}`, { method }),
      { DB: ROUTE_DB },
      {},
    );
    return { response, messages };
  } finally {
    console.log = originalLog;
  }
}

function assertVersionHeaders(response) {
  const requestId = response.headers.get('X-Request-Id');
  assert.match(requestId ?? '', REQUEST_ID_PATTERN);
  assert.equal(response.headers.get('X-UXUV-Worker-Version'), '1.0.0');
  assert.equal(response.headers.get('X-UXUV-Pages-Version'), '0.1.2');
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

test('registers all 22 implemented API contracts', () => {
  assert.equal(ROUTES.length, 22);
  const pendingRoutes = ROUTES.filter(([path]) => !IMPLEMENTED_PATHS.has(path));
  assert.deepEqual(pendingRoutes, []);
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

test('non-API methods fail with 405 without reaching the Pages release', async () => {
  const post = await dispatch('/settings', 'POST');
  await assertStructuredError(post.response, 405, 'METHOD_NOT_ALLOWED');
  assert.equal(post.response.headers.get('Allow'), 'GET, HEAD');
});

test('GET /api/config separates public runtime metadata from authenticated sources', async () => {
  const env = {
    DB: createAuthD1Stub().db,
    ADMIN_PASSWORD: 'admin-password',
    AUTH_SECRET: 'test-auth-secret-with-at-least-thirty-two-bytes',
    SITE_NAME: 'Family Video',
    SITE_TITLE: 'Family Video Library',
    SITE_DESCRIPTION: 'Private household media',
    SITE_ICON_URL: 'https://assets.example/icon.png',
    SUBSCRIPTION_SOURCES: '["https://source.example/sub.json"]',
    IPTV_SOURCES: '[{"name":"Home","url":"https://source.example/live.m3u"}]',
    MERGE_SOURCES: 'true',
    DANMAKU_API_URL: 'https://danmaku.example/api',
    AD_KEYWORDS: 'ad, sponsor, ad',
    VIDEOTOGETHER_ENABLED: 'true',
    VIDEOTOGETHER_SCRIPT_URL: 'https://scripts.example/video-together.js',
    VIDEOTOGETHER_SETTING_URL: 'https://scripts.example/settings',
  };

  const publicResponse = await worker.fetch(new Request('https://worker.example/api/config'), env, {});
  assert.equal(publicResponse.status, 200);
  const publicConfig = await publicResponse.json();
  assert.deepEqual(publicConfig.release, { worker: '1.0.0', pages: '0.1.2', apiContract: 1 });
  assert.deepEqual(publicConfig.site, {
    name: 'Family Video',
    title: 'Family Video Library',
    description: 'Private household media',
    iconUrl: 'https://assets.example/icon.png',
  });
  assert.deepEqual(publicConfig.capabilities, { premium: false, iptv: true, danmaku: true });
  assert.deepEqual(publicConfig.adKeywords, ['ad', 'sponsor']);
  assert.deepEqual(publicConfig.thirdPartyScripts.videoTogether, {
    enabled: true,
    scriptUrl: 'https://scripts.example/video-together.js',
    settingUrl: 'https://scripts.example/settings',
  });
  assert.equal(publicConfig.authenticated, false);
  assert.equal(Object.hasOwn(publicConfig, 'sources'), false);
  assert.doesNotMatch(JSON.stringify(publicConfig), /admin-password|test-auth-secret|source\.example/);

  const login = await worker.fetch(new Request('https://worker.example/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://worker.example' },
    body: JSON.stringify({ username: 'admin', password: 'admin-password' }),
  }), env, {});
  assert.equal(login.status, 200);
  const cookie = login.headers.get('Set-Cookie')?.split(';', 1)[0];
  assert.ok(cookie);

  const privateResponse = await worker.fetch(new Request('https://worker.example/api/config', {
    headers: { Cookie: cookie },
  }), env, {});
  assert.equal(privateResponse.status, 200);
  const privateConfig = await privateResponse.json();
  assert.equal(privateConfig.authenticated, true);
  assert.deepEqual(privateConfig.sources, {
    subscriptionSources: env.SUBSCRIPTION_SOURCES,
    iptvSources: env.IPTV_SOURCES,
    mergeSources: true,
    danmakuApiUrl: env.DANMAKU_API_URL,
  });

  const created = await worker.fetch(new Request('https://worker.example/api/auth/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: 'https://worker.example',
    },
    body: JSON.stringify({
      username: 'viewer',
      name: 'Viewer',
      password: 'viewer-password',
      role: 'viewer',
      customPermissions: [],
    }),
  }), env, {});
  assert.equal(created.status, 201);
  const viewerLogin = await worker.fetch(new Request('https://worker.example/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '192.0.2.2',
      Origin: 'https://worker.example',
    },
    body: JSON.stringify({ username: 'viewer', password: 'viewer-password' }),
  }), env, {});
  assert.equal(viewerLogin.status, 200);
  const viewerCookie = viewerLogin.headers.get('Set-Cookie')?.split(';', 1)[0];
  assert.ok(viewerCookie);
  const viewerResponse = await worker.fetch(new Request('https://worker.example/api/config', {
    headers: { Cookie: viewerCookie },
  }), env, {});
  const viewerConfig = await viewerResponse.json();
  assert.equal(viewerConfig.sources.subscriptionSources, env.SUBSCRIPTION_SOURCES);
  assert.equal(viewerConfig.sources.iptvSources, '');
});

test('normalizes trailing slashes without widening dynamic account paths', async () => {
  const normalized = await dispatch('/api/config/', 'GET');
  assert.equal(normalized.response.status, 200);
  assert.equal((await normalized.response.json()).authenticated, false);

  const nested = await dispatch('/api/auth/accounts/account-123/extra', 'PATCH');
  await assertStructuredError(nested.response, 404, 'API_ROUTE_NOT_FOUND');
});
