import assert from 'node:assert/strict';
import test from 'node:test';

import { limitReadableStream, readLimitedBody } from '../../_worker.js';

test('rejects an oversized declared content length before reading', async () => {
  const response = new Response('small', { headers: { 'Content-Length': '100' } });
  await assert.rejects(readLimitedBody(response, 10), (error) => error?.code === 'UPSTREAM_BODY_TOO_LARGE');
});

test('rejects an oversized streamed textual body', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(8));
      controller.enqueue(new Uint8Array(8));
      controller.close();
    },
  });
  await assert.rejects(
    readLimitedBody(new Response(stream), 12),
    (error) => error?.code === 'UPSTREAM_BODY_TOO_LARGE',
  );
});

test('passes binary bytes through a bounded Web Stream without buffering the response', async () => {
  const source = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3, 4]));
      controller.close();
    },
  });
  const bytes = new Uint8Array(await new Response(limitReadableStream(source, 4)).arrayBuffer());
  assert.deepEqual([...bytes], [1, 2, 3, 4]);
});

test('errors a binary Web Stream as soon as it exceeds the cap', async () => {
  const source = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.enqueue(new Uint8Array([4, 5]));
      controller.close();
    },
  });
  await assert.rejects(
    new Response(limitReadableStream(source, 4)).arrayBuffer(),
    (error) => error?.code === 'UPSTREAM_BODY_TOO_LARGE',
  );
});
