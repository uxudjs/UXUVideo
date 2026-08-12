import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../_worker.js';
import { createAuthD1Stub } from './fixtures/d1.mjs';

const ORIGIN = 'https://worker.example';
const environment = (db, overrides = {}) => ({
  DB: db,
  ADMIN_PASSWORD: 'bootstrap-admin-password',
  AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
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

function request(path, cookie, options = {}) {
  const headers = { Cookie: cookie, ...options.headers };
  if (options.method === 'POST') {
    headers.Origin = options.origin ?? ORIGIN;
    headers['Content-Type'] = 'application/json';
  }
  return new Request(`${ORIGIN}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

test('low-fanout upstream routes require a session and reject cross-origin writes before D1', async () => {
  const stub = createAuthD1Stub();
  const env = environment(stub.db);
  let fetches = 0;
  const anonymous = await withFetchStub(async () => { fetches += 1; return new Response('{}'); }, () => (
    worker.fetch(request('/api/douban/tags', ''), env, {})
  ));
  assert.equal(anonymous.status, 401);
  assert.equal((await anonymous.json()).error.code, 'AUTH_REQUIRED');
  assert.equal(fetches, 0);

  const cookie = await login(env);
  const before = stub.calls.bindings.length;
  const crossOrigin = await worker.fetch(request('/api/ping', cookie, {
    method: 'POST', origin: 'https://attacker.example', body: { url: 'https://media.example' },
  }), env, {});
  assert.equal(crossOrigin.status, 403);
  assert.equal((await crossOrigin.json()).error.code, 'ORIGIN_MISMATCH');
  assert.equal(stub.calls.bindings.length, before);
});

test('app update checks the fixed configured repository with a bounded JSON response', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db, { UPDATE_REPOSITORY: 'uxudjs/UXUVideo', UPDATE_BRANCH: 'main' });
  const cookie = await login(env);
  const calls = [];
  const manifest = {
    currentVersion: '1.2.0',
    releases: [{ version: '1.2.0', publishedAt: '2026-08-07', title: 'Next', notes: ['Safe update'] }],
  };
  const response = await withFetchStub(async (url, init) => {
    calls.push({ url, init });
    return Response.json(manifest);
  }, () => worker.fetch(request('/api/app-update', cookie), env, {}));

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.currentVersion, '1.1.0');
  assert.equal(body.latestVersion, '1.2.0');
  assert.equal(body.status, 'update-available');
  assert.equal(body.checkedRemotely, true);
  assert.deepEqual(body.copy, {
    available: true,
    href: '/api/app-update?artifact=worker',
    version: '1.2.0',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://raw.githubusercontent.com/uxudjs/UXUVideo/main/app-release.json');
});

test('danmaku proxies bounded JSON without forwarding credentials or wildcard CORS', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const calls = [];
  const cacheCalls = [];
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: {
    match: async (cacheRequest) => { cacheCalls.push({ action: 'match', url: cacheRequest.url }); return undefined; },
    put: async (cacheRequest, cacheResponse) => cacheCalls.push({
      action: 'put', url: cacheRequest.url, cacheControl: cacheResponse.headers.get('Cache-Control'),
    }),
  } };
  let responses;
  try {
    responses = await withFetchStub(async (url, init) => {
      calls.push({ url, headers: Object.fromEntries(init.headers) });
      return Response.json({ animes: [{ animeTitle: '测试' }] });
    }, async () => {
      const first = await worker.fetch(request('/api/danmaku?action=search&keyword=test&apiUrl=https%3A%2F%2Fdanmaku.example', cookie), env, {});
      const second = await worker.fetch(request('/api/danmaku?action=search&keyword=test&apiUrl=https%3A%2F%2Fdanmaku.example', cookie), env, {});
      return [first, second];
    });
  } finally {
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  }

  assert.deepEqual(responses.map(({ status }) => status), [200, 200]);
  assert.deepEqual(await responses[0].json(), { animes: [{ animeTitle: '测试' }] });
  assert.deepEqual(await responses[1].json(), { animes: [{ animeTitle: '测试' }] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://danmaku.example/api/v2/search/episodes?anime=test');
  assert.equal(calls[0].headers.accept, 'application/json');
  assert.equal(calls[0].headers['user-agent'], 'UXUVideo/1.0');
  assert.equal(calls[0].headers.cookie, undefined);
  assert.equal(calls[0].headers.authorization, undefined);
  assert.deepEqual(cacheCalls.map(({ action }) => action), ['match', 'put']);
  assert.equal(cacheCalls[1].cacheControl, 'public, max-age=3600');
  assert.doesNotMatch(cacheCalls[1].url, /danmaku\.example|keyword|test/);
  assert.equal(responses[0].headers.has('Access-Control-Allow-Origin'), false);
});

test('detail parses the preferred m3u8 episode list and strips source credentials', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const calls = [];
  const upstream = {
    code: 1,
    list: [{
      vod_id: 'video-1', vod_name: '示例', vod_pic: 'https://image.example/poster.jpg',
      vod_play_from: 'line$$$m3u8',
      vod_play_url: '第一集$https://media.example/old.m3u8$$$第一集$https://media.example/1.m3u8#第二集$https://media.example/2.m3u8',
    }],
  };
  const response = await withFetchStub(async (url, init) => {
    calls.push({ url, headers: Object.fromEntries(init.headers) });
    return Response.json(upstream);
  }, () => worker.fetch(request('/api/detail', cookie, {
    method: 'POST',
    body: {
      id: 'video-1',
      source: {
        id: 'source-1', name: 'Source', baseUrl: 'https://api.example/proxy', detailPath: '/api.php/provide/vod/',
        headers: { Authorization: 'Bearer secret', Cookie: 'secret=value' },
      },
    },
  }), env, {}));

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.data.episodes, [
    { name: '第一集', url: 'https://media.example/1.m3u8', index: 0 },
    { name: '第二集', url: 'https://media.example/2.m3u8', index: 1 },
  ]);
  assert.equal(calls[0].url, 'https://api.example/proxy/api.php/provide/vod?ac=detail&ids=video-1');
  assert.equal(calls[0].headers.authorization, undefined);
  assert.equal(calls[0].headers.cookie, undefined);
});

test('Douban tags, recommendations, and image mirrors stay on fixed hosts', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const calls = [];
  await withFetchStub(async (url) => {
    calls.push(url);
    if (url.includes('/j/search_tags')) return Response.json({ tags: ['热门'] });
    if (url.includes('/j/search_subjects')) {
      return Response.json({ subjects: [{ id: '1', cover: 'https://img9.doubanio.com/view/photo.jpg' }] });
    }
    if (url.startsWith('https://img9.doubanio.com/')) throw new Error('mirror unavailable');
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } });
  }, async () => {
    const tags = await worker.fetch(request('/api/douban/tags?type=movie', cookie), env, {});
    assert.deepEqual(await tags.json(), { tags: ['热门'] });
    const recommendations = await worker.fetch(request('/api/douban/recommend?type=movie&tag=热门&page_limit=20&page_start=0', cookie), env, {});
    const recommendationBody = await recommendations.json();
    assert.match(recommendationBody.subjects[0].cover, /^\/api\/douban\/image\?url=/);
    const image = await worker.fetch(request('/api/douban/image?url=https%3A%2F%2Fimg9.doubanio.com%2Fview%2Fphoto.jpg', cookie), env, {});
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('Content-Type'), 'image/jpeg');
    assert.deepEqual([...new Uint8Array(await image.arrayBuffer())], [1, 2, 3]);
  });
  assert.ok(calls.every((url) => url.startsWith('https://movie.douban.com/') || /^https:\/\/img[239]\.doubanio\.com\//.test(url)));
});

test('ping falls back from HEAD to one-byte GET within a two-subrequest budget', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const calls = [];
  const response = await withFetchStub(async (url, init) => {
    calls.push({ url, method: init.method, headers: Object.fromEntries(init.headers) });
    if (init.method === 'HEAD') throw new Error('HEAD unsupported');
    return new Response(new Uint8Array([1]), { status: 206 });
  }, () => worker.fetch(request('/api/ping', cookie, {
    method: 'POST', body: { url: 'https://media.example/video.m3u8' },
  }), env, {}));

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.method, 'GET');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].headers.range, 'bytes=0-0');
});
