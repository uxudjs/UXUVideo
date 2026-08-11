import assert from 'node:assert/strict';
import test from 'node:test';

import { controlledFetch } from '../../_worker.js';

test('IPTV upstream redirects are manual, bounded, and revalidated on every hop', async () => {
  const modes = [];
  const cancelled = [];
  const response = await controlledFetch('https://iptv.example/live.m3u8', {
    timeoutMs: 100,
    fetchImpl: async (input, init) => {
      modes.push(init.redirect);
      if (String(input).includes('iptv.example')) return new Response(new ReadableStream({
        cancel() { cancelled.push('redirect'); },
      }), { status: 302, headers: { Location: 'https://cdn.example/live.m3u8' } });
      return new Response('#EXTM3U');
    },
  });
  assert.equal(await response.text(), '#EXTM3U');
  assert.deepEqual(modes, ['manual', 'manual']);
  assert.deepEqual(cancelled, ['redirect']);

  await assert.rejects(controlledFetch('https://iptv.example/live.m3u8', {
    timeoutMs: 100,
    fetchImpl: async () => new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } }),
  }), (error) => error?.code === 'UPSTREAM_URL_BLOCKED');
});

test('IPTV upstream timeout and external cancellation remain distinguishable', async () => {
  const pendingFetch = (_input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
  });
  await assert.rejects(controlledFetch('https://iptv.example/live.m3u8', {
    timeoutMs: 5, fetchImpl: pendingFetch,
  }), (error) => error?.code === 'UPSTREAM_TIMEOUT' && error?.status === 504);

  const controller = new AbortController();
  const request = controlledFetch('https://iptv.example/live.m3u8', {
    timeoutMs: 100, signal: controller.signal, fetchImpl: pendingFetch,
  });
  controller.abort('channel changed');
  await assert.rejects(request, (error) => error?.code === 'UPSTREAM_ABORTED' && error?.status === 499);
});
