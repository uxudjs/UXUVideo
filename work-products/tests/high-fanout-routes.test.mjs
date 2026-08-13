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

async function login(env, username = 'admin', password = env.ADMIN_PASSWORD) {
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ username, password }),
  }), env, {});
  assert.equal(response.status, 200);
  return response.headers.get('Set-Cookie').split(';', 1)[0];
}

async function viewerSession(env) {
  const admin = await login(env);
  const created = await worker.fetch(apiRequest('/api/auth/accounts', admin, {
    body: { username: 'viewer', name: 'Viewer', password: 'viewer-password', role: 'viewer', customPermissions: [] },
  }), env, {});
  assert.equal(created.status, 201);
  return login(env, 'viewer', 'viewer-password');
}

function apiRequest(path, cookie, options = {}) {
  return new Request(`${ORIGIN}${path}`, {
    method: options.method ?? 'POST',
    headers: { Cookie: cookie, Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function withFetchStub(fetchImpl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try { return await run(); } finally { globalThis.fetch = original; }
}

const source = (index) => ({
  id: `source-${index}`,
  name: `Source ${index}`,
  baseUrl: `https://source-${index}.example`,
  searchPath: '/api.php/provide/vod/',
  detailPath: '/api.php/provide/vod/',
  enabled: true,
});

function sseData(text) {
  return text.split(/\r?\n/).filter((line) => line.startsWith('data: ')).map((line) => JSON.parse(line.slice(6)));
}

async function sseErrorCode(response) {
  return sseData(await response.text())[0]?.error?.code;
}

test('free search caps imported collections at 12 sources, five-way concurrency, and 500 streamed videos', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await viewerSession(env);
  let active = 0;
  let maximumActive = 0;
  const result = await withFetchStub(async () => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    return Response.json({ code: 1, pagecount: 1, list: Array.from({ length: 60 }, (_, index) => ({ vod_id: index, vod_name: `Video ${index}` })) });
  }, async () => {
    const response = await worker.fetch(apiRequest('/api/search-parallel', cookie, {
      body: { query: 'test', sources: Array.from({ length: 13 }, (_, index) => source(index)), page: 1 },
    }), env, {});
    return { status: response.status, text: await response.text() };
  });
  assert.equal(result.status, 200);
  const events = sseData(result.text);
  const videos = events.filter(({ type }) => type === 'videos').flatMap((event) => event.videos);
  assert.deepEqual(events[0], {
    type: 'start',
    totalSources: 12,
    capability: {
      profile: 'free',
      limits: { sources: 12, searchConcurrency: 5, maxPages: 3, videos: 500, probeVideos: 6, probeConcurrency: 3, probeVariants: 2 },
    },
  });
  assert.equal(videos.length, 500);
  assert.ok(maximumActive <= 5, `observed ${maximumActive} concurrent upstreams`);
  assert.deepEqual(events.at(-1), { type: 'complete', totalVideosFound: 500, totalSources: 12, maxPageCount: 3 });
});

test('paid search caps imported collections at 32 sources, six-way concurrency, and 2000 streamed videos', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  let active = 0;
  let maximumActive = 0;
  const result = await withFetchStub(async () => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    return Response.json({ code: 1, pagecount: 1, list: Array.from({ length: 70 }, (_, index) => ({ vod_id: index, vod_name: `Video ${index}` })) });
  }, async () => {
    const response = await worker.fetch(apiRequest('/api/search-parallel', cookie, {
      body: { query: 'test', sources: Array.from({ length: 33 }, (_, index) => source(index)), page: 1 },
    }), env, {});
    return { status: response.status, text: await response.text() };
  });
  assert.equal(result.status, 200);
  const events = sseData(result.text);
  const videos = events.filter(({ type }) => type === 'videos').flatMap((event) => event.videos);
  assert.equal(events[0].capability.profile, 'paid');
  assert.deepEqual(events[0].capability.limits, {
    sources: 32, searchConcurrency: 6, maxPages: 3, videos: 2_000,
    probeVideos: 50, probeConcurrency: 6, probeVariants: 4,
  });
  assert.equal(videos.length, 2_000);
  assert.ok(maximumActive <= 6, `observed ${maximumActive} concurrent upstreams`);
  assert.deepEqual(events.at(-1), { type: 'complete', totalVideosFound: 2_000, totalSources: 32, maxPageCount: 3 });
});

test('search treats an imported full endpoint as the request target', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await viewerSession(env);
  const calls = [];
  const result = await withFetchStub(async (url) => {
    calls.push(String(url));
    return Response.json({ code: 1, pagecount: 1, list: [] });
  }, async () => {
    const response = await worker.fetch(apiRequest('/api/search-parallel', cookie, {
      body: { query: 'test', sources: [{
        ...source(1),
        baseUrl: 'https://api.example/api.php/provide/vod',
      }], page: 1 },
    }), env, {});
    return { status: response.status, text: await response.text() };
  });

  assert.equal(result.status, 200);
  assert.equal(calls[0], 'https://api.example/api.php/provide/vod?ac=videolist&wd=test&pg=1');
});

test('search preserves a custom imported PHP endpoint', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await viewerSession(env);
  const calls = [];
  const result = await withFetchStub(async (url) => {
    calls.push(String(url));
    return Response.json({ code: 1, pagecount: 1, list: [] });
  }, async () => {
    const response = await worker.fetch(apiRequest('/api/search-parallel', cookie, {
      body: { query: 'test', sources: [{
        ...source(1),
        baseUrl: 'https://api.example/inc/apijson.php',
      }], page: 1 },
    }), env, {});
    return { status: response.status, text: await response.text() };
  });

  assert.equal(result.status, 200);
  assert.equal(calls[0], 'https://api.example/inc/apijson.php?ac=videolist&wd=test&pg=1');
});

test('search reports an error instead of an empty result when every source response is invalid', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await viewerSession(env);
  const result = await withFetchStub(async () => Response.json([{
    id: 'catalog-source',
    name: 'Catalog source',
    baseUrl: 'https://catalog.example/api.php/provide/vod',
  }]), async () => {
    const response = await worker.fetch(apiRequest('/api/search-parallel', cookie, {
      body: { query: 'test', sources: [source(1)], page: 1 },
    }), env, {});
    return { status: response.status, text: await response.text() };
  });

  assert.equal(result.status, 200);
  const events = sseData(result.text);
  const error = events.find(({ type }) => type === 'error');
  assert.equal(error?.error?.code, 'SEARCH_SOURCES_UNAVAILABLE');
  assert.equal(typeof error?.error?.requestId, 'string');
  assert.deepEqual(error?.error?.details, { failedSources: 1, totalSources: 1 });
  assert.equal(events.some(({ type }) => type === 'complete'), false);
});

test('search still completes when at least one source returns a valid empty response', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await viewerSession(env);
  const result = await withFetchStub(async (url) => (
    new URL(String(url)).hostname === 'source-1.example'
      ? Response.json([{ id: 'not-a-search-response' }])
      : Response.json({ code: 1, pagecount: 1, list: [] })
  ), async () => {
    const response = await worker.fetch(apiRequest('/api/search-parallel', cookie, {
      body: { query: 'test', sources: [source(1), source(2)], page: 1 },
    }), env, {});
    return { status: response.status, text: await response.text() };
  });

  assert.equal(result.status, 200);
  const events = sseData(result.text);
  assert.equal(events.some(({ type }) => type === 'error'), false);
  assert.deepEqual(events.at(-1), { type: 'complete', totalVideosFound: 0, totalSources: 2, maxPageCount: 3 });
});

test('premium aggregation requires server-side authorization and avoids Node Buffer', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db, { PREMIUM_PASSWORD: 'premium-password' });
  const viewer = await viewerSession(env);
  let fetches = 0;
  const denied = await withFetchStub(async () => { fetches += 1; return Response.json({}); }, () => (
    worker.fetch(apiRequest('/api/premium/types', viewer, { body: { sources: [source(1)] } }), env, {})
  ));
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error.code, 'PREMIUM_REQUIRED');
  assert.equal(fetches, 0);

  const admin = await login(env);
  const allowed = await withFetchStub(async () => Response.json({ class: [{ type_id: 1, type_name: '剧情' }] }), () => (
    worker.fetch(apiRequest('/api/premium/types', admin, { body: { sources: [source(1)] } }), env, {})
  ));
  assert.equal(allowed.status, 200);
  const premiumTypes = await allowed.json();
  assert.deepEqual(premiumTypes.tags.map(({ label }) => label), ['今日推荐', '剧情']);
  assert.equal(premiumTypes.capability.profile, 'paid');
});

test('free resolution probing caps videos, variants, concurrency, and propagates cancellation', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await viewerSession(env);
  const configs = Array.from({ length: 7 }, (_, index) => source(index));
  const videos = configs.map((entry, index) => ({ id: index, source: entry.id }));
  const tooMany = await worker.fetch(apiRequest('/api/probe-resolution', cookie, {
    body: { videos, sourceConfigs: configs },
  }), env, {});
  assert.equal(tooMany.status, 400);
  assert.equal(await sseErrorCode(tooMany), 'FREE_LIMIT_EXCEEDED');

  let started = 0;
  let aborted = 0;
  const response = await withFetchStub((_url, init) => new Promise((_resolve, reject) => {
    started += 1;
    init.signal.addEventListener('abort', () => {
      aborted += 1;
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  }), () => worker.fetch(apiRequest('/api/probe-resolution', cookie, {
    body: { videos: videos.slice(0, 6), sourceConfigs: configs.slice(0, 6) },
  }), env, {}));
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  await new Promise((resolve) => setTimeout(resolve, 5));
  await reader.cancel();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok(started > 0);
  assert.ok(started <= 3, `observed ${started} concurrent probes`);
  assert.equal(aborted, started);
});

test('free resolution probing fetches at most two manifest variants per video', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await viewerSession(env);
  let variantFetches = 0;
  const textResponse = (body) => new Response(body, { headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } });
  const result = await withFetchStub(async (input) => {
    const url = new URL(String(input));
    if (url.searchParams.get('ac') === 'detail') {
      return Response.json({ list: [{ vod_play_url: 'Episode 1$https://media.example/master.m3u8' }] });
    }
    if (url.pathname === '/master.m3u8') {
      return textResponse('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\na.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2\nb.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=3\nc.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=4\nd.m3u8');
    }
    variantFetches += 1;
    return textResponse('#EXTM3U\n#EXTINF:10,\nsegment.ts');
  }, async () => {
    const response = await worker.fetch(apiRequest('/api/probe-resolution', cookie, {
      body: { videos: [{ id: 1, source: 'source-1' }], sourceConfigs: [source(1)] },
    }), env, {});
    return { status: response.status, text: await response.text() };
  });
  assert.equal(result.status, 200);
  assert.equal(variantFetches, 2);
  const events = sseData(result.text);
  assert.equal(events[0].capability.profile, 'free');
  assert.deepEqual(events.at(-1), { done: true });
});
