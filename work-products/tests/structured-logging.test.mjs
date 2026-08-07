import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../_worker.js';

test('emits one correlated completion log without request secrets, even in debug mode', async () => {
  const messages = [];
  const originalLog = console.log;
  console.log = (message) => messages.push(String(message));

  let response;
  try {
    response = await worker.fetch(new Request(
      'https://worker.example/api/detail?url=https%3A%2F%2Fmedia.example%2Fprivate.m3u8&token=query-secret',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer authorization-secret',
          Cookie: 'session=cookie-secret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: 'body-secret' }),
      },
    ), { DEBUG: 'true' }, {});
  } finally {
    console.log = originalLog;
  }

  assert.equal(response.status, 501);
  assert.equal(messages.length, 1);

  const entry = JSON.parse(messages[0]);
  assert.deepEqual(Object.keys(entry), [
    'event',
    'requestId',
    'routeId',
    'method',
    'status',
    'durationMs',
    'workerVersion',
    'pagesVersion',
    'apiContract',
    'cacheStatus',
    'upstreamClass',
    'errorCode',
  ]);
  assert.equal(entry.event, 'request.complete');
  assert.equal(entry.requestId, response.headers.get('X-Request-Id'));
  assert.equal(entry.routeId, 'detail');
  assert.equal(entry.method, 'POST');
  assert.equal(entry.status, 501);
  assert.equal(Number.isInteger(entry.durationMs), true);
  assert.equal(entry.durationMs >= 0, true);
  assert.equal(entry.workerVersion, response.headers.get('X-UXUV-Worker-Version'));
  assert.equal(entry.pagesVersion, response.headers.get('X-UXUV-Pages-Version'));
  assert.equal(entry.apiContract, response.headers.get('X-UXUV-API-Contract'));
  assert.equal(entry.cacheStatus, 'bypass');
  assert.equal(entry.upstreamClass, null);
  assert.equal(entry.errorCode, 'ROUTE_NOT_IMPLEMENTED');

  const serialized = messages[0].toLowerCase();
  for (const secret of [
    'media.example',
    'query-secret',
    'authorization-secret',
    'cookie-secret',
    'body-secret',
  ]) {
    assert.doesNotMatch(serialized, new RegExp(secret));
  }
});
