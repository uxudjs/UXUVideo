import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../_worker.js';
import { createAuthD1Stub } from './fixtures/d1.mjs';

const ORIGIN = 'https://worker.example';
const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
const TOKEN = 'synthetic-analytics-token-do-not-leak';
const LEGACY_WORKER_NAME = ['CF', 'WORKER', 'SCRIPT', 'NAME'].join('_');
const LEGACY_D1_NAME = ['CF', 'D1', 'DATABASE', 'ID'].join('_');

const environment = (db, overrides = {}) => ({
  DB: db,
  ADMIN_PASSWORD: 'bootstrap-admin-password',
  AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
  CF_ANALYTICS_API_TOKEN: TOKEN,
  CF_ACCOUNT_ID: 'account0000000000000000000000000',
  ...overrides,
});

async function login(env, username = 'admin', password = env.ADMIN_PASSWORD) {
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ username, password }),
  }), env, {});
  assert.equal(response.status, 200);
  return response.headers.get('Set-Cookie').split(';', 1)[0];
}

async function viewer(env) {
  const admin = await login(env);
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth/accounts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: admin },
    body: JSON.stringify({ username: 'viewer', name: 'Viewer', password: 'viewer-password', role: 'viewer', customPermissions: [] }),
  }), env, {});
  assert.equal(response.status, 201);
  return login(env, 'viewer', 'viewer-password');
}

function usageRequest(cookie, origin = ORIGIN) {
  return new Request(`${ORIGIN}/api/admin/usage`, { headers: { Cookie: cookie, Origin: origin } });
}

function graphqlFixture({ workers = {}, d1 = {} } = {}) {
  const databaseId = 'database0000000000000000000000';
  return {
    data: { viewer: { accounts: [{
      accountWorkers: [{
        sum: { requests: workers.accountRequests ?? 1, errors: workers.accountErrors ?? 0 },
        avg: { sampleInterval: workers.sampleInterval ?? 1 },
      }],
      d1Usage: [
        {
          dimensions: { databaseId },
          sum: { rowsRead: d1.databaseRowsRead ?? 1, rowsWritten: d1.databaseRowsWritten ?? 1 },
          avg: { sampleInterval: d1.sampleInterval ?? 1 },
        },
        {
          dimensions: { databaseId: 'other-database' },
          sum: { rowsRead: d1.otherRowsRead ?? 2, rowsWritten: d1.otherRowsWritten ?? 2 },
          avg: { sampleInterval: d1.otherSampleInterval ?? 1 },
        },
      ],
      d1Storage: [
        {
          dimensions: { databaseId }, max: { databaseSizeBytes: d1.databaseStorageBytes ?? 1_024 },
        },
        {
          dimensions: { databaseId }, max: { databaseSizeBytes: d1.databaseStorageBytesOlder ?? 512 },
        },
        {
          dimensions: { databaseId: 'other-database' }, max: { databaseSizeBytes: d1.otherStorageBytes ?? 2_048 },
        },
      ],
    }] } },
  };
}

function cacheStub() {
  const entries = new Map();
  return {
    entries,
    default: {
      async match(request) { return entries.get(request.url)?.clone(); },
      async put(request, response) { entries.set(request.url, response.clone()); },
    },
  };
}

function sizedGraphqlResponse(byteLength) {
  const payload = { ...graphqlFixture(), padding: '' };
  const baseline = Buffer.byteLength(JSON.stringify(payload));
  assert.ok(baseline <= byteLength, 'usage fixture must fit the requested response size');
  payload.padding = 'x'.repeat(byteLength - baseline);
  const body = JSON.stringify(payload);
  assert.equal(Buffer.byteLength(body), byteLength);
  return new Response(body, { headers: { 'Content-Type': 'application/json' } });
}

async function withGlobals({ fetchImpl, cache = cacheStub(), now }, run) {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const originalNow = Date.now;
  globalThis.fetch = fetchImpl;
  globalThis.caches = cache;
  if (now) Date.now = now;
  try { return await run(cache); } finally {
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
    Date.now = originalNow;
  }
}

test('usage is super_admin and same-origin only, with a no-network unconfigured response', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const admin = await login(env);
  const viewerCookie = await viewer(env);
  let fetches = 0;
  await withGlobals({ fetchImpl: async () => { fetches += 1; return Response.json({}); } }, async () => {
    assert.equal((await worker.fetch(usageRequest(''), env, {})).status, 401);
    assert.equal((await worker.fetch(usageRequest(viewerCookie), env, {})).status, 403);
    assert.equal((await worker.fetch(usageRequest(admin, 'https://evil.example'), env, {})).status, 403);
    const response = await worker.fetch(usageRequest(admin), environment(db, {
      CF_ANALYTICS_API_TOKEN: '', CF_ACCOUNT_ID: '',
      [LEGACY_WORKER_NAME]: 'ignored-legacy-worker', [LEGACY_D1_NAME]: 'ignored-legacy-database',
    }), {});
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, {
      configured: false,
      missing: ['CF_ANALYTICS_API_TOKEN', 'CF_ACCOUNT_ID'],
      message: 'Cloudflare usage analytics is not configured.',
    });

    const accountOnly = await worker.fetch(usageRequest(admin), environment(db, {
      CF_ANALYTICS_API_TOKEN: '', [LEGACY_WORKER_NAME]: '', [LEGACY_D1_NAME]: '',
    }), {});
    assert.deepEqual((await accountOnly.json()).data.missing, ['CF_ANALYTICS_API_TOKEN']);

    const tokenOnly = await worker.fetch(usageRequest(admin), environment(db, {
      CF_ACCOUNT_ID: '', [LEGACY_WORKER_NAME]: 'changed', [LEGACY_D1_NAME]: 'changed',
    }), {});
    assert.deepEqual((await tokenOnly.json()).data.missing, ['CF_ACCOUNT_ID']);
  });
  assert.equal(fetches, 0);
});

test('usage sends one account-only GraphQL request and returns only complete account totals without leaking token', async () => {
  const { db, calls } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const requests = [];
  const logs = [];
  const originalLog = console.log;
  console.log = (message) => logs.push(String(message));
  try {
    await withGlobals({
      fetchImpl: async (input, init) => {
        requests.push({ url: String(input), headers: new Headers(init.headers), body: String(init.body) });
        return Response.json(graphqlFixture({
          workers: { accountRequests: 85_000, accountErrors: 17, sampleInterval: 1.5 },
          d1: { databaseRowsRead: 800_000, otherRowsRead: 3_450_000, databaseRowsWritten: 50_000,
            otherRowsWritten: 10_000, databaseStorageBytes: 475_000_000,
            databaseStorageBytesOlder: 450_000_000, otherStorageBytes: 3_775_000_000,
            otherSampleInterval: 2 },
        }));
      },
      now: () => Date.parse('2026-08-07T12:34:56.000Z'),
    }, async (cache) => {
      const preparedBefore = calls.prepared.length;
      const response = await worker.fetch(usageRequest(cookie), env, {});
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
      const text = await response.text();
      assert.equal(text.includes(TOKEN), false);
      const body = JSON.parse(text).data;
      assert.equal(body.configured, true);
      assert.deepEqual(body.period, {
        start: '2026-08-07T00:00:00.000Z', end: '2026-08-07T12:34:56.000Z', resetsAt: '2026-08-08T00:00:00.000Z',
      });
      assert.deepEqual(body.workers, {
        accountRequests: 85_000, accountErrors: 17, accountLimit: 100_000,
      });
      assert.deepEqual(body.d1, {
        accountRowsRead: 4_250_000,
        accountRowsWritten: 60_000,
        accountStorageBytes: 4_250_000_000,
        accountRowsReadLimit: 5_000_000,
        accountRowsWrittenLimit: 100_000,
        accountStorageBytesLimit: 5_000_000_000,
      });
      assert.equal(body.level, 'warning');
      assert.ok(body.warnings.includes('WORKERS_ACCOUNT_WARNING'));
      assert.ok(body.warnings.includes('D1_ACCOUNT_READ_WARNING'));
      assert.ok(body.warnings.includes('D1_ACCOUNT_STORAGE_WARNING'));
      assert.equal(body.warnings.some((warning) => /(?:PROJECT|DATABASE)/.test(warning)), false);
      assert.doesNotMatch(JSON.stringify(body), /scriptRequests|scriptErrors|databaseRows|databaseStorage|projectRows/);
      assert.equal(body.observedAt, '2026-08-07T12:34:56.000Z');
      assert.equal(body.stale, false);
      assert.equal(body.source, 'cloudflare-graphql');
      const usageQueries = calls.prepared.slice(preparedBefore);
      assert.equal(usageQueries.some(({ sql }) => /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(sql)), false);
      for (const cached of cache.entries.values()) assert.equal((await cached.clone().text()).includes(TOKEN), false);
    });
  } finally { console.log = originalLog; }

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, GRAPHQL);
  assert.equal(requests[0].headers.get('Authorization'), `Bearer ${TOKEN}`);
  assert.equal(requests[0].body.includes(TOKEN), false);
  const payload = JSON.parse(requests[0].body);
  assert.deepEqual(payload.variables, {
    accountTag: env.CF_ACCOUNT_ID,
    datetimeStart: '2026-08-07T00:00:00.000Z',
    datetimeEnd: '2026-08-07T12:34:56.000Z',
    dateStart: '2026-08-07',
    dateEnd: '2026-08-07',
  });
  assert.match(payload.query, /workersInvocationsAdaptive/);
  assert.match(payload.query, /d1AnalyticsAdaptiveGroups/);
  assert.match(payload.query, /d1StorageAdaptiveGroups/);
  assert.equal((payload.query.match(/sampleInterval/g) ?? []).length, 2);
  assert.doesNotMatch(
    payload.query.slice(payload.query.indexOf('d1StorageAdaptiveGroups')),
    /\bavg\s*\{\s*sampleInterval\s*\}/,
  );
  assert.doesNotMatch(payload.query, /\$(?:scriptName|databaseId)\b/);
  assert.doesNotMatch(payload.query, /filter\s*:\s*\{[^}]*\b(?:scriptName|databaseId)\s*:/);
  assert.doesNotMatch(payload.query, /\b(?:scriptWorkers|databaseD1|databaseStorage)\s*:/);
  assert.equal(JSON.stringify(logs).includes(TOKEN), false);
  assert.equal(JSON.stringify(calls).includes(TOKEN), false);
});

test('usage reuses a five-minute snapshot and falls back stale for at most one hour', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db, {
    [LEGACY_WORKER_NAME]: 'ignored-cache-worker', [LEGACY_D1_NAME]: 'ignored-cache-database',
  });
  const cookie = await login(env);
  let now = Date.parse('2026-08-07T01:00:00.000Z');
  let fetches = 0;
  const cache = cacheStub();
  await withGlobals({
    cache,
    now: () => now,
    fetchImpl: async () => {
      fetches += 1;
      if (fetches > 1) throw new Error('network unavailable');
      return Response.json(graphqlFixture());
    },
  }, async () => {
    assert.equal((await worker.fetch(usageRequest(cookie), env, {})).status, 200);
    now += 4 * 60 * 1000;
    const freshEnv = environment(db, {
      [LEGACY_WORKER_NAME]: 'changed-worker', [LEGACY_D1_NAME]: 'changed-database',
    });
    const fresh = await (await worker.fetch(usageRequest(cookie), freshEnv, {})).json();
    assert.equal(fresh.data.stale, false);
    assert.equal(fetches, 1);

    now += 2 * 60 * 1000;
    const staleResponse = await worker.fetch(usageRequest(cookie), env, {});
    assert.equal(staleResponse.status, 200);
    const stale = await staleResponse.json();
    assert.equal(stale.data.stale, true);
    assert.ok(stale.data.warnings.includes('USAGE_DATA_STALE'));
    assert.equal(fetches, 2);

    now += 55 * 60 * 1000;
    const expired = await worker.fetch(usageRequest(cookie), env, {});
    assert.equal(expired.status, 503);
    assert.equal((await expired.json()).error.code, 'USAGE_FETCH_FAILED');
    assert.equal(fetches, 3);
  });
});

test('usage cache identity is account and UTC date only', async () => {
  const { db } = createAuthD1Stub();
  const cookie = await login(environment(db));
  let now = Date.parse('2026-08-07T01:00:00.000Z');
  let fetches = 0;
  await withGlobals({
    cache: cacheStub(),
    now: () => now,
    fetchImpl: async () => {
      fetches += 1;
      return Response.json(graphqlFixture({ workers: { accountRequests: fetches } }));
    },
  }, async (cache) => {
    const accountA = environment(db, { CF_ACCOUNT_ID: 'account-a', CF_ANALYTICS_API_TOKEN: 'token-a' });
    assert.equal((await worker.fetch(usageRequest(cookie), accountA, {})).status, 200);

    const sameIdentity = environment(db, {
      CF_ACCOUNT_ID: 'account-a',
      CF_ANALYTICS_API_TOKEN: 'token-b',
      [LEGACY_WORKER_NAME]: 'changed-worker',
      [LEGACY_D1_NAME]: 'changed-database',
    });
    assert.equal((await worker.fetch(usageRequest(cookie), sameIdentity, {})).status, 200);
    assert.equal(fetches, 1, 'token and retired identifiers must not change cache identity');

    assert.equal((await worker.fetch(usageRequest(cookie), environment(db, { CF_ACCOUNT_ID: 'account-b' }), {})).status, 200);
    assert.equal(fetches, 2, 'account change must miss cache');

    now = Date.parse('2026-08-08T00:00:01.000Z');
    assert.equal((await worker.fetch(usageRequest(cookie), accountA, {})).status, 200);
    assert.equal(fetches, 3, 'UTC date change must miss cache');
    assert.equal(cache.entries.size, 3);
  });
});

test('usage maps Cloudflare and GraphQL failures without reflecting upstream bodies', async () => {
  const { db } = createAuthD1Stub();
  const cookie = await login(environment(db));
  const cases = [
    { name: 'auth', response: () => Response.json({ secret: TOKEN }, { status: 401 }), status: 502, code: 'USAGE_AUTH_FAILED' },
    { name: 'forbidden', response: () => Response.json({ secret: TOKEN }, { status: 403 }), status: 502, code: 'USAGE_FORBIDDEN' },
    { name: 'rate', response: () => Response.json({ secret: TOKEN }, { status: 429 }), status: 503, code: 'USAGE_RATE_LIMITED' },
    { name: 'http', response: () => Response.json({ secret: TOKEN }, { status: 500 }), status: 502, code: 'USAGE_UPSTREAM_ERROR' },
    { name: 'network', response: async () => { throw new Error(TOKEN); }, status: 503, code: 'USAGE_FETCH_FAILED' },
    { name: 'graphql', response: () => Response.json({ errors: [{ message: TOKEN }] }), status: 502, code: 'USAGE_GRAPHQL_ERROR' },
  ];
  for (const item of cases) {
    const env = environment(db);
    await withGlobals({ fetchImpl: item.response }, async () => {
      const response = await worker.fetch(usageRequest(cookie), env, {});
      assert.equal(response.status, item.status);
      const text = await response.text();
      assert.equal(JSON.parse(text).error.code, item.code);
      assert.equal(text.includes(TOKEN), false);
    });
  }
});

test('usage thresholds use controlled integers at exact Workers boundaries', async () => {
  const { db } = createAuthD1Stub();
  const cookie = await login(environment(db));
  const cases = [
    [69_999, 'normal'], [70_000, 'notice'], [85_000, 'warning'], [95_000, 'critical'], [100_000, 'exhausted'],
  ];
  for (const [requests, expected] of cases) {
    const env = environment(db);
    await withGlobals({ fetchImpl: async () => Response.json(graphqlFixture({ workers: { accountRequests: requests } })) }, async () => {
      const body = await (await worker.fetch(usageRequest(cookie), env, {})).json();
      assert.equal(body.data.level, expected);
      assert.equal(Number.isSafeInteger(body.data.workers.accountRequests), true);
    });
  }
});

test('usage thresholds use exact D1 account boundaries', async () => {
  const { db } = createAuthD1Stub();
  const cookie = await login(environment(db));
  const metrics = [
    {
      name: 'rows read',
      values: [[4_249_999, 'normal'], [4_250_000, 'warning'], [4_750_000, 'critical'], [5_000_000, 'exhausted']],
      d1: (value) => ({ databaseRowsRead: value, otherRowsRead: 0, databaseRowsWritten: 0, otherRowsWritten: 0, databaseStorageBytes: 0, databaseStorageBytesOlder: 0, otherStorageBytes: 0 }),
    },
    {
      name: 'rows written',
      values: [[84_999, 'normal'], [85_000, 'warning'], [95_000, 'critical'], [100_000, 'exhausted']],
      d1: (value) => ({ databaseRowsRead: 0, otherRowsRead: 0, databaseRowsWritten: value, otherRowsWritten: 0, databaseStorageBytes: 0, databaseStorageBytesOlder: 0, otherStorageBytes: 0 }),
    },
    {
      name: 'storage',
      values: [[4_249_999_999, 'normal'], [4_250_000_000, 'warning'], [4_750_000_000, 'critical'], [5_000_000_000, 'exhausted']],
      d1: (value) => ({ databaseRowsRead: 0, otherRowsRead: 0, databaseRowsWritten: 0, otherRowsWritten: 0, databaseStorageBytes: value, databaseStorageBytesOlder: 0, otherStorageBytes: 0 }),
    },
  ];
  for (const metric of metrics) {
    for (const [value, expected] of metric.values) {
      await withGlobals({ fetchImpl: async () => Response.json(graphqlFixture({ d1: metric.d1(value) })) }, async () => {
        const body = await (await worker.fetch(usageRequest(cookie), environment(db), {})).json();
        assert.equal(body.data.level, expected, `${metric.name} at ${value}`);
      });
    }
  }
});

test('usage fails closed for incomplete, malformed, unsafe, invalid-sampling, or saturated aggregates', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  const cases = [
    {
      name: 'missing Workers node',
      payload: () => {
        const payload = graphqlFixture();
        delete payload.data.viewer.accounts[0].accountWorkers;
        return payload;
      },
    },
    {
      name: 'empty Workers aggregate',
      payload: () => {
        const payload = graphqlFixture();
        payload.data.viewer.accounts[0].accountWorkers = [];
        return payload;
      },
    },
    {
      name: 'missing D1 node',
      payload: () => {
        const payload = graphqlFixture();
        delete payload.data.viewer.accounts[0].d1Usage;
        return payload;
      },
    },
    {
      name: 'non-numeric aggregate',
      payload: () => graphqlFixture({ workers: { accountRequests: 'Infinity' } }),
    },
    { name: 'negative aggregate', payload: () => graphqlFixture({ workers: { accountRequests: -1 } }) },
    { name: 'fractional aggregate', payload: () => graphqlFixture({ d1: { databaseRowsRead: 1.5 } }) },
    { name: 'unsafe aggregate', payload: () => graphqlFixture({ d1: { databaseStorageBytes: Number.MAX_SAFE_INTEGER + 1 } }) },
    {
      name: 'rows read overflow',
      payload: () => graphqlFixture({ d1: { databaseRowsRead: Number.MAX_SAFE_INTEGER, otherRowsRead: 1 } }),
    },
    {
      name: 'storage overflow',
      payload: () => graphqlFixture({ d1: { databaseStorageBytes: Number.MAX_SAFE_INTEGER, otherStorageBytes: 1 } }),
    },
    {
      name: 'missing Workers sum',
      payload: () => {
        const payload = graphqlFixture();
        delete payload.data.viewer.accounts[0].accountWorkers[0].sum;
        return payload;
      },
    },
    {
      name: 'missing database dimensions',
      payload: () => {
        const payload = graphqlFixture();
        delete payload.data.viewer.accounts[0].d1Usage[0].dimensions;
        return payload;
      },
    },
    {
      name: 'empty database id',
      payload: () => {
        const payload = graphqlFixture();
        payload.data.viewer.accounts[0].d1Storage[0].dimensions.databaseId = '';
        return payload;
      },
    },
    {
      name: 'missing D1 sum',
      payload: () => {
        const payload = graphqlFixture();
        delete payload.data.viewer.accounts[0].d1Usage[0].sum;
        return payload;
      },
    },
    {
      name: 'missing D1 storage max',
      payload: () => {
        const payload = graphqlFixture();
        delete payload.data.viewer.accounts[0].d1Storage[0].max;
        return payload;
      },
    },
    {
      name: 'missing sample interval',
      payload: () => {
        const payload = graphqlFixture();
        delete payload.data.viewer.accounts[0].d1Usage[0].avg;
        return payload;
      },
    },
    { name: 'invalid Workers sample interval', payload: () => graphqlFixture({ workers: { sampleInterval: 0.5 } }) },
    { name: 'invalid D1 sample interval', payload: () => graphqlFixture({ d1: { otherSampleInterval: 'invalid' } }) },
    {
      name: 'D1 usage query limit saturation',
      payload: () => {
        const payload = graphqlFixture();
        payload.data.viewer.accounts[0].d1Usage = Array(10_000).fill(null);
        return payload;
      },
    },
    {
      name: 'D1 storage query limit saturation',
      payload: () => {
        const payload = graphqlFixture();
        payload.data.viewer.accounts[0].d1Storage = Array(10_000).fill(null);
        return payload;
      },
    },
  ];

  for (const item of cases) {
    await withGlobals({ fetchImpl: async () => Response.json(item.payload()) }, async () => {
      const response = await worker.fetch(usageRequest(cookie), env, {});
      assert.equal(response.status, 502, item.name);
      assert.equal((await response.json()).error.code, 'USAGE_RESPONSE_INVALID', item.name);
    });
  }
});

test('usage accepts exactly 512 KiB and rejects one byte more', async () => {
  const { db } = createAuthD1Stub();
  const cookie = await login(environment(db));
  const maximum = 512 * 1024;
  for (const [size, expectedStatus] of [[maximum, 200], [maximum + 1, 502]]) {
    await withGlobals({ fetchImpl: async () => sizedGraphqlResponse(size) }, async () => {
      const response = await worker.fetch(usageRequest(cookie), environment(db), {});
      assert.equal(response.status, expectedStatus, `${size} bytes`);
      if (expectedStatus !== 200) assert.equal((await response.json()).error.code, 'USAGE_RESPONSE_INVALID');
    });
  }
});

test('usage timeout covers a response body that stalls after headers', async (t) => {
  const { db } = createAuthD1Stub();
  const env = environment(db);
  const cookie = await login(env);
  let observedSignal;
  let bodyController;

  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withGlobals({
    fetchImpl: async (_input, init) => {
      observedSignal = init.signal;
      return new Response(new ReadableStream({
        start(controller) {
          bodyController = controller;
          init.signal.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true });
        },
      }));
    },
  }, async () => {
    const responsePromise = worker.fetch(usageRequest(cookie), env, {});
    for (let attempt = 0; attempt < 100 && !observedSignal; attempt += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.ok(observedSignal, 'mock fetch must receive the usage abort signal');
    t.mock.timers.tick(10_000);
    const aborted = observedSignal?.aborted === true;
    if (!aborted) bodyController.error(new Error('test cleanup'));
    const response = await responsePromise;
    assert.equal(aborted, true);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'USAGE_FETCH_TIMEOUT');
  });
});
