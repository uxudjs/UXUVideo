import assert from 'node:assert/strict';
import test from 'node:test';

import { controlledFetch, readLimitedBody } from '../../_worker.js';

test('upstream redirects are manual, bounded, and revalidated on every hop', async () => {
  const modes = [];
  const cancelled = [];
  const response = await controlledFetch('https://media.example/live.m3u8', {
    timeoutMs: 100,
    fetchImpl: async (input, init) => {
      modes.push(init.redirect);
      if (String(input).includes('media.example')) return new Response(new ReadableStream({
        cancel() { cancelled.push('redirect'); },
      }), { status: 302, headers: { Location: 'https://cdn.example/live.m3u8' } });
      return new Response('#EXTM3U');
    },
  });
  assert.equal(await response.text(), '#EXTM3U');
  assert.deepEqual(modes, ['manual', 'manual']);
  assert.deepEqual(cancelled, ['redirect']);

  let blockedRedirectCancelled = false;
  await assert.rejects(controlledFetch('https://media.example/live.m3u8', {
    timeoutMs: 100,
    fetchImpl: async () => new Response(new ReadableStream({
      cancel() { blockedRedirectCancelled = true; },
    }), { status: 302, headers: { Location: 'http://127.0.0.1/private' } }),
  }), (error) => error?.code === 'UPSTREAM_URL_BLOCKED');
  assert.equal(blockedRedirectCancelled, true);
});

test('upstream timeout and external cancellation remain distinguishable', async () => {
  const pendingFetch = (_input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
  });
  await assert.rejects(controlledFetch('https://media.example/live.m3u8', {
    timeoutMs: 5, fetchImpl: pendingFetch,
  }), (error) => error?.code === 'UPSTREAM_TIMEOUT' && error?.status === 504);

  const controller = new AbortController();
  const request = controlledFetch('https://media.example/live.m3u8', {
    timeoutMs: 100, signal: controller.signal, fetchImpl: pendingFetch,
  });
  controller.abort('source changed');
  await assert.rejects(request, (error) => error?.code === 'UPSTREAM_ABORTED' && error?.status === 499);
});

test('upstream timeout covers bounded response-body consumption', async () => {
  let bodyCancelled = false;
  await assert.rejects(controlledFetch('https://media.example/search.json', {
    timeoutMs: 5,
    fetchImpl: async (_input, init) => new Response(new ReadableStream({
      start(controller) {
        init.signal.addEventListener('abort', () => {
          bodyCancelled = true;
          controller.error(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      },
    }), { headers: { 'Content-Type': 'application/json' } }),
    consume: (response) => readLimitedBody(response, 1_024),
  }), (error) => error?.code === 'UPSTREAM_TIMEOUT' && error?.status === 504);
  assert.equal(bodyCancelled, true);
});
