import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../_worker.js';
import { createAuthD1Stub } from './fixtures/d1.mjs';

const ORIGIN = 'https://worker.example';
const environment = (db) => ({
  DB: db,
  ADMIN_PASSWORD: 'bootstrap-admin-password',
  AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
});

async function login(env, username = 'admin', password = env.ADMIN_PASSWORD) {
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ username, password }),
  }), env, {});
  assert.equal(response.status, 200);
  return response.headers.get('Set-Cookie').split(';', 1)[0];
}

async function withFetchStub(fetchImpl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try { return await run(); } finally { globalThis.fetch = original; }
}

test('proxy requires a session, rewrites HLS children with scoped tokens, and skips D1 for children', async () => {
  const { db, calls } = createAuthD1Stub();
  const env = environment(db);
  const target = 'https://media.example/master.m3u8';
  const anonymous = await worker.fetch(new Request(`${ORIGIN}/api/proxy?url=${encodeURIComponent(target)}`), env, {});
  assert.equal(anonymous.status, 401);
  const preflight = await worker.fetch(new Request(`${ORIGIN}/api/proxy`, { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env, {});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const crossOrigin = await worker.fetch(new Request(`${ORIGIN}/api/proxy`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env, {});
  assert.equal(crossOrigin.status, 403);
  assert.notEqual(crossOrigin.headers.get('Access-Control-Allow-Origin'), '*');

  const cookie = await login(env);
  const upstreamHeaders = [];
  const initial = await withFetchStub(async (input, init) => {
    upstreamHeaders.push(new Headers(init.headers));
    if (String(input) === target) return new Response('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.key"\n#EXTINF:10,\nsegment.ts', { headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } });
    return new Response(Uint8Array.from([1, 2, 3]), { headers: { 'Content-Type': 'video/mp2t' } });
  }, async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}/api/proxy?url=${encodeURIComponent(target)}`, { headers: { Cookie: cookie, Authorization: 'Bearer browser-secret' } }), env, {});
    assert.equal(response.status, 200);
    const playlist = await response.text();
    const childPath = playlist.split('\n').find((line) => line.startsWith('/api/proxy?'));
    assert.ok(childPath);
    assert.match(playlist, /#EXT-X-KEY:METHOD=AES-128,URI="\/api\/proxy\?/);
    assert.equal([...playlist.matchAll(/\/api\/proxy\?/g)].length, 2);
    const preparedBeforeChild = calls.prepared.length;
    const child = await worker.fetch(new Request(new URL(childPath, ORIGIN)), env, {});
    assert.deepEqual(new Uint8Array(await child.arrayBuffer()), Uint8Array.from([1, 2, 3]));
    assert.equal(calls.prepared.length, preparedBeforeChild);
    assert.notEqual(child.headers.get('Access-Control-Allow-Origin'), '*');
    return response;
  });
  assert.equal(initial.status, 200);
  for (const headers of upstreamHeaders) {
    assert.equal(headers.has('Cookie'), false);
    assert.equal(headers.has('Authorization'), false);
  }
});

test('proxy redirects authenticated media to the validated upstream when Cloudflare is denied', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const target = 'https://media.example/movie.m3u8';
  const request = () => new Request(`${ORIGIN}/api/proxy?url=${encodeURIComponent(target)}`, {
    headers: { Cookie: cookie, Origin: ORIGIN, Range: 'bytes=0-1' },
  });

  const redirected = await withFetchStub(async () => new Response(null, { status: 403 }), () => (
    worker.fetch(request(), env, {})
  ));
  assert.equal(redirected.status, 307);
  assert.equal(redirected.headers.get('Location'), target);
  assert.equal(redirected.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(redirected.headers.get('Cache-Control'), 'no-store');

  const unauthorized = await withFetchStub(async () => new Response(null, { status: 401 }), () => (
    worker.fetch(request(), env, {})
  ));
  assert.equal(unauthorized.status, 502);
  assert.equal((await unauthorized.json()).error.code, 'UPSTREAM_HTTP_ERROR');
});

test('proxy preserves Range bytes and cancelling the response cancels upstream with one termination log', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  let observedRange = null;
  const ranged = await withFetchStub(async (_input, init) => {
    observedRange = new Headers(init.headers).get('Range');
    return new Response(Uint8Array.from([4, 5]), { status: 206, headers: { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes 2-3/8', 'Accept-Ranges': 'bytes', 'Content-Length': '2' } });
  }, () => worker.fetch(new Request(`${ORIGIN}/api/proxy?url=${encodeURIComponent('https://media.example/video.mp4')}`, { headers: { Cookie: cookie, Range: 'bytes=2-3' } }), env, {}));
  assert.equal(ranged.status, 206);
  assert.equal(observedRange, 'bytes=2-3');
  assert.equal(ranged.headers.get('Content-Range'), 'bytes 2-3/8');
  assert.deepEqual(new Uint8Array(await ranged.arrayBuffer()), Uint8Array.from([4, 5]));

  let cancelled = 0;
  const logs = [];
  const originalLog = console.log;
  console.log = (message) => logs.push(String(message));
  try {
    const response = await withFetchStub(async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(Uint8Array.from([9])); },
      cancel() { cancelled += 1; },
    }), { headers: { 'Content-Type': 'video/mp2t' } }), () => worker.fetch(new Request(`${ORIGIN}/api/proxy?url=${encodeURIComponent('https://media.example/live.ts')}`, { headers: { Cookie: cookie } }), env, {}));
    const reader = response.body.getReader();
    await reader.read();
    await reader.cancel();
  } finally { console.log = originalLog; }
  assert.equal(cancelled, 1);

  console.log = (message) => logs.push(String(message));
  try {
    let pulls = 0;
    const response = await withFetchStub(async () => new Response(new ReadableStream({
      pull(controller) {
        pulls += 1;
        if (pulls === 1) controller.enqueue(Uint8Array.from([8]));
        else controller.error(new Error('upstream broke'));
      },
    }), { headers: { 'Content-Type': 'video/mp2t' } }), () => worker.fetch(new Request(`${ORIGIN}/api/proxy?url=${encodeURIComponent('https://media.example/broken.ts')}`, { headers: { Cookie: cookie } }), env, {}));
    const reader = response.body.getReader();
    assert.deepEqual((await reader.read()).value, Uint8Array.from([8]));
    await assert.rejects(reader.read(), /Media upstream stream failed/);
  } finally { console.log = originalLog; }

  const endings = logs.map((entry) => JSON.parse(entry)).filter(({ event }) => event === 'media.stream.end');
  assert.equal(endings.length, 2);
  assert.equal(endings.filter(({ outcome }) => outcome === 'client-cancel').length, 1);
  const upstreamError = endings.find(({ outcome }) => outcome === 'upstream-error');
  assert.equal(upstreamError?.errorCode, 'UPSTREAM_STREAM_ERROR');
});

test('proxy applies bounded ad filtering before same-origin child rewriting and propagates the selected mode', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const target = 'https://media.example/filtered.m3u8';
  const manifest = '#EXTM3U\n#EXTINF:10,\nmain.ts\n#EXTINF:2,\nsponsor-ad.ts\n#EXT-X-ENDLIST';
  const response = await withFetchStub(async () => new Response(manifest, {
    headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
  }), () => worker.fetch(new Request(
    `${ORIGIN}/api/proxy?url=${encodeURIComponent(target)}&ad=keyword&adkw=sponsor`,
    { headers: { Cookie: cookie } },
  ), env, {}));

  assert.equal(response.status, 200);
  const filtered = await response.text();
  assert.doesNotMatch(filtered, /sponsor-ad/);
  const child = filtered.split('\n').find((line) => line.startsWith('/api/proxy?'));
  assert.ok(child);
  const childUrl = new URL(child, ORIGIN);
  assert.equal(childUrl.searchParams.get('ad'), 'keyword');
  assert.deepEqual(childUrl.searchParams.getAll('adkw'), ['sponsor']);
});

test('proxy rewrites a production-sized VOD manifest with 1,651 child resources', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const target = 'https://media.example/movie.m3u8';
  const segments = Array.from({ length: 1_651 }, (_value, index) => `#EXTINF:5,\nsegment-${index}.ts`);
  const manifest = `#EXTM3U\n${segments.join('\n')}\n#EXT-X-ENDLIST`;
  const response = await withFetchStub(async () => new Response(manifest, {
    headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
  }), () => worker.fetch(new Request(
    `${ORIGIN}/api/proxy?url=${encodeURIComponent(target)}`,
    { headers: { Cookie: cookie } },
  ), env, {}));

  assert.equal(response.status, 200);
  const rewritten = await response.text();
  assert.equal([...rewritten.matchAll(/\/api\/proxy\?/g)].length, 1_651);
});

test('proxy keeps request abort active while reading a bounded manifest body', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const requestAbort = new AbortController();
  let streamController;
  let headersReturned;
  const headersReady = new Promise((resolve) => { headersReturned = resolve; });
  const target = 'https://media.example/stalled.m3u8';
  const responsePromise = withFetchStub(async (_input, init) => {
    const response = new Response(new ReadableStream({
      start(controller) {
        streamController = controller;
        init.signal.addEventListener('abort', () => controller.error(init.signal.reason), { once: true });
      },
    }), { headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } });
    headersReturned();
    return response;
  }, () => worker.fetch(new Request(`${ORIGIN}/api/proxy?url=${encodeURIComponent(target)}`, {
    signal: requestAbort.signal, headers: { Cookie: cookie },
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
  assert.ok(outcome, 'manifest proxy remained pending after request abort');
  assert.equal(outcome.status, 499);
  assert.equal((await outcome.json()).error.code, 'UPSTREAM_ABORTED');
});

test('proxy rejects a manifest that exceeds the streaming byte limit', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const target = 'https://media.example/oversized.m3u8';
  const payload = `#EXTM3U\n${'x'.repeat(1024 * 1024)}`;
  const response = await withFetchStub(async () => new Response(payload, {
    headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
  }), () => worker.fetch(new Request(`${ORIGIN}/api/proxy?url=${encodeURIComponent(target)}`, {
    headers: { Cookie: cookie },
  }), env, {}));

  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, 'UPSTREAM_BODY_TOO_LARGE');
});
