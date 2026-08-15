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

async function viewer(env, permissions = []) {
  const admin = await login(env);
  const created = await worker.fetch(new Request(`${ORIGIN}/api/auth/accounts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: admin },
    body: JSON.stringify({ username: `viewer-${permissions.length}`, name: 'Viewer', password: 'viewer-password', role: 'viewer', customPermissions: permissions }),
  }), env, {});
  assert.equal(created.status, 201);
  return login(env, `viewer-${permissions.length}`, 'viewer-password');
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

test('IPTV playlist requires iptv_access, validates headers, and uses a bounded isolate cache', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const deniedCookie = await viewer(env);
  let fetches = 0;
  const target = 'https://iptv.example/list.m3u';
  const denied = await withFetchStub(async () => { fetches += 1; return new Response(); }, () => worker.fetch(new Request(`${ORIGIN}/api/iptv?url=${encodeURIComponent(target)}`, { headers: { Cookie: deniedCookie } }), env, {}));
  assert.equal(denied.status, 403);
  assert.equal(fetches, 0);

  const allowedCookie = await viewer(env, ['iptv_access']);
  const path = `${ORIGIN}/api/iptv?url=${encodeURIComponent(target)}&ua=${encodeURIComponent('UXUV Test')}&referer=${encodeURIComponent('https://iptv.example/')}`;
  await withFetchStub(async () => { fetches += 1; return new Response('#EXTM3U\n#EXTINF:-1,News\nhttps://stream.example/live.m3u8'); }, async () => {
    const first = await worker.fetch(new Request(path, { headers: { Cookie: allowedCookie } }), env, {});
    const second = await worker.fetch(new Request(path, { headers: { Cookie: allowedCookie } }), env, {});
    assert.match(await first.text(), /^#EXTM3U/);
    assert.match(await second.text(), /^#EXTM3U/);
  });
  assert.equal(fetches, 1);

  const invalid = await worker.fetch(new Request(`${ORIGIN}/api/iptv?url=${encodeURIComponent(target)}&ua=${encodeURIComponent('bad\nheader')}`, { headers: { Cookie: allowedCookie } }), env, {});
  assert.equal(invalid.status, 400);
});

test('IPTV stream tokens cannot cross scopes and manifests are capped at one MiB', async () => {
  const { db, calls } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await viewer(env, ['iptv_access']);
  const target = 'https://iptv.example/live/master.m3u8';
  let fetches = 0;
  await withFetchStub(async (input) => {
    fetches += 1;
    if (String(input) === target) return new Response('#EXTM3U\n#EXTINF:10,\nsegment.ts', { headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } });
    return new Response(Uint8Array.from([7]), { headers: { 'Content-Type': 'video/mp2t' } });
  }, async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}/api/iptv/stream?url=${encodeURIComponent(target)}`, { headers: { Cookie: cookie } }), env, {});
    const childPath = (await response.text()).split('\n').find((line) => line.startsWith('/api/iptv/stream?'));
    assert.ok(childPath);
    const crossScope = new URL(childPath, ORIGIN);
    crossScope.pathname = '/api/proxy';
    const cross = await worker.fetch(new Request(crossScope), env, {});
    assert.equal(cross.status, 401);
    const preparedBeforeChild = calls.prepared.length;
    const child = await worker.fetch(new Request(new URL(childPath, ORIGIN)), env, {});
    assert.deepEqual(new Uint8Array(await child.arrayBuffer()), Uint8Array.from([7]));
    assert.equal(calls.prepared.length, preparedBeforeChild);
  });

  const large = `#EXTM3U\n${'x'.repeat((1024 * 1024) + 1)}`;
  const oversized = await withFetchStub(async () => new Response(large, { headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } }), () => worker.fetch(new Request(`${ORIGIN}/api/iptv/stream?url=${encodeURIComponent('https://iptv.example/large.m3u8')}`, { headers: { Cookie: cookie } }), env, {}));
  assert.equal(oversized.status, 413);
  assert.ok(fetches >= 2);
});
