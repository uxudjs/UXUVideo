import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../_worker.js';
import { createAuthD1Stub } from './fixtures/d1.mjs';

const ORIGIN = 'https://worker.example';
const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
const TOKEN = 'synthetic-analytics-token-do-not-leak';

const environment = (db, overrides = {}) => ({
  DB: db,
  ADMIN_PASSWORD: 'bootstrap-admin-password',
  AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
  CF_ANALYTICS_API_TOKEN: TOKEN,
  CF_ACCOUNT_ID: 'account0000000000000000000000000',
  CF_WORKER_SCRIPT_NAME: 'uxuv-test-worker',
  CF_D1_DATABASE_ID: 'database0000000000000000000000',
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
      accountWorkers: [{ sum: { requests: workers.accountRequests ?? 1, errors: workers.accountErrors ?? 0 } }],
      scriptWorkers: [{ sum: { requests: workers.scriptRequests ?? 1, errors: workers.scriptErrors ?? 0 } }],
      d1Usage: [
        { dimensions: { databaseId }, sum: { rowsRead: d1.databaseRowsRead ?? 1, rowsWritten: d1.databaseRowsWritten ?? 1 } },
        { dimensions: { databaseId: 'other-database' }, sum: { rowsRead: d1.otherRowsRead ?? 2, rowsWritten: d1.otherRowsWritten ?? 2 } },
      ],
      d1Storage: [
        { dimensions: { databaseId }, max: { databaseSizeBytes: d1.databaseStorageBytes ?? 1_024 } },
        { dimensions: { databaseId: 'other-database' }, max: { databaseSizeBytes: d1.otherStorageBytes ?? 2_048 } },
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
      CF_ANALYTICS_API_TOKEN: '', CF_ACCOUNT_ID: '', CF_WORKER_SCRIPT_NAME: '', CF_D1_DATABASE_ID: '',
    }), {});
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, {
      configured: false,
      missing: ['CF_ANALYTICS_API_TOKEN', 'CF_ACCOUNT_ID', 'CF_WORKER_SCRIPT_NAME', 'CF_D1_DATABASE_ID'],
      message: 'Cloudflare usage analytics is not configured.',
    });
  });
  assert.equal(fetches, 0);
});

test('usage sends one fixed GraphQL request and separates account and project metrics without leaking token', async () => {
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
          workers: { accountRequests: 85_000, scriptRequests: 1_250, accountErrors: 17, scriptErrors: 2 },
          d1: { databaseRowsRead: 800_000, otherRowsRead: 3_450_000, databaseRowsWritten: 50_000,
            otherRowsWritten: 10_000, databaseStorageBytes: 475_000_000, otherStorageBytes: 3_775_000_000 },
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
        accountRequests: 85_000, scriptRequests: 1_250, accountErrors: 17, scriptErrors: 2, accountLimit: 100_000,
      });
      assert.equal(body.d1.accountRowsRead, 4_250_000);
      assert.equal(body.d1.databaseRowsRead, 800_000);
      assert.equal(body.d1.accountRowsWritten, 60_000);
      assert.equal(body.d1.databaseRowsWritten, 50_000);
      assert.equal(body.d1.accountStorageBytes, 4_250_000_000);
      assert.equal(body.d1.databaseStorageBytes, 475_000_000);
      assert.equal(body.level, 'critical');
      assert.ok(body.warnings.includes('WORKERS_ACCOUNT_WARNING'));
      assert.ok(body.warnings.includes('D1_PROJECT_READ_NOTICE'));
      assert.ok(body.warnings.includes('D1_PROJECT_WRITE_WARNING'));
      assert.ok(body.warnings.includes('D1_DATABASE_STORAGE_CRITICAL'));
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
    scriptName: env.CF_WORKER_SCRIPT_NAME,
    databaseId: env.CF_D1_DATABASE_ID,
    datetimeStart: '2026-08-07T00:00:00.000Z',
    datetimeEnd: '2026-08-07T12:34:56.000Z',
    dateStart: '2026-08-07',
    dateEnd: '2026-08-07',
  });
  assert.match(payload.query, /workersInvocationsAdaptive/);
  assert.match(payload.query, /d1AnalyticsAdaptiveGroups/);
  assert.match(payload.query, /d1StorageAdaptiveGroups/);
  assert.equal(JSON.stringify(logs).includes(TOKEN), false);
  assert.equal(JSON.stringify(calls).includes(TOKEN), false);
});

test('usage reuses a five-minute snapshot and falls back stale for at most one hour', async () => {
  const { db } = createAuthD1Stub();
  const env = environment(db, { CF_WORKER_SCRIPT_NAME: 'cache-test-worker' });
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
    const fresh = await (await worker.fetch(usageRequest(cookie), env, {})).json();
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
    assert.equal(expired.status, 502);
    assert.equal((await expired.json()).error.code, 'USAGE_UPSTREAM_ERROR');
    assert.equal(fetches, 3);
  });
});

test('usage maps Cloudflare and GraphQL failures without reflecting upstream bodies', async () => {
  const { db } = createAuthD1Stub();
  const cookie = await login(environment(db));
  const cases = [
    { name: 'auth', response: () => Response.json({ secret: TOKEN }, { status: 401 }), status: 502, code: 'USAGE_AUTH_FAILED' },
    { name: 'forbidden', response: () => Response.json({ secret: TOKEN }, { status: 403 }), status: 502, code: 'USAGE_FORBIDDEN' },
    { name: 'rate', response: () => Response.json({ secret: TOKEN }, { status: 429 }), status: 503, code: 'USAGE_RATE_LIMITED' },
    { name: 'graphql', response: () => Response.json({ errors: [{ message: TOKEN }] }), status: 502, code: 'USAGE_UPSTREAM_ERROR' },
  ];
  for (const item of cases) {
    const env = environment(db, { CF_WORKER_SCRIPT_NAME: `error-${item.name}` });
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
    const env = environment(db, { CF_WORKER_SCRIPT_NAME: `threshold-${requests}` });
    await withGlobals({ fetchImpl: async () => Response.json(graphqlFixture({ workers: { accountRequests: requests } })) }, async () => {
      const body = await (await worker.fetch(usageRequest(cookie), env, {})).json();
      assert.equal(body.data.level, expected);
      assert.equal(Number.isSafeInteger(body.data.workers.accountRequests), true);
    });
  }
});
