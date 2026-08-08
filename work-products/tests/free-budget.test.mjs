import assert from 'node:assert/strict';
import test from 'node:test';

import { controlledFetch, createRequestBudget, createTokenBucket } from '../../_worker.js';

test('caps a request at 50 upstream subrequests', async () => {
  const budget = createRequestBudget();
  const fetchImpl = async () => new Response('ok');
  for (let index = 0; index < 50; index += 1) {
    const response = await controlledFetch(`https://media.example/${index}`, { budget, fetchImpl });
    assert.equal(response.status, 200);
  }
  await assert.rejects(
    controlledFetch('https://media.example/overflow', { budget, fetchImpl }),
    (error) => error?.code === 'SUBREQUEST_LIMIT',
  );
});

test('caps waiting response headers at six concurrent connections', async () => {
  const budget = createRequestBudget();
  const releases = [];
  const fetchImpl = () => new Promise((resolve) => releases.push(() => resolve(new Response('ok'))));
  const pending = Array.from({ length: 6 }, (_, index) => (
    controlledFetch(`https://media.example/${index}`, { budget, fetchImpl })
  ));
  await assert.rejects(
    controlledFetch('https://media.example/seventh', { budget, fetchImpl }),
    (error) => error?.code === 'UPSTREAM_CONCURRENCY_LIMIT',
  );
  releases.forEach((release) => release());
  assert.equal((await Promise.all(pending)).length, 6);
});

test('maps an upstream response-header timeout to a stable error', async () => {
  const fetchImpl = (_url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason));
  });
  await assert.rejects(
    controlledFetch('https://media.example/slow', { fetchImpl, timeoutMs: 10 }),
    (error) => error?.code === 'UPSTREAM_TIMEOUT',
  );
});

test('isolate token buckets recover only after their fixed window', () => {
  let now = 1_000;
  const bucket = createTokenBucket({ limit: 2, windowMs: 1_000, now: () => now });
  assert.equal(bucket.consume('account'), true);
  assert.equal(bucket.consume('account'), true);
  assert.equal(bucket.consume('account'), false);
  now = 2_001;
  assert.equal(bucket.consume('account'), true);
});
