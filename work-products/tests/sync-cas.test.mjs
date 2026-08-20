import assert from 'node:assert/strict';
import test from 'node:test';

import worker, { D1_LIMITS } from '../../_worker.js';
import { createAuthD1Stub } from './fixtures/d1.mjs';

const ORIGIN = 'https://worker.example';
const envFor = (db) => ({
  DB: db,
  ADMIN_PASSWORD: 'bootstrap-admin-password',
  AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
});

async function login(env) {
  const response = await worker.fetch(new Request(`${ORIGIN}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ username: 'admin', password: env.ADMIN_PASSWORD }),
  }), env, {});
  assert.equal(response.status, 200);
  return response.headers.get('Set-Cookie').split(';', 1)[0];
}

async function documentRequest(env, cookie, path, options = {}) {
  const headers = { Cookie: cookie, ...options.headers };
  if (options.method === 'POST') {
    headers.Origin = options.origin ?? ORIGIN;
    headers['Content-Type'] = 'application/json';
  }
  return worker.fetch(new Request(`${ORIGIN}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }), env, {});
}

function timestampedRecords(count, prefix) {
  return Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}`, updatedAt: index + 1 }));
}

async function expectInvalidDocument(env, cookie, path, payload) {
  const response = await documentRequest(env, cookie, path, {
    method: 'POST',
    body: { baseVersion: 0, payload },
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'INVALID_DOCUMENT');
}

test('document APIs require a session and exact same-origin mutations', async () => {
  const { db, calls } = createAuthD1Stub();
  const env = envFor(db);
  const anonymous = await worker.fetch(new Request(`${ORIGIN}/api/user/config`), env, {});
  assert.equal(anonymous.status, 401);
  assert.equal((await anonymous.json()).error.code, 'AUTH_REQUIRED');

  const cookie = await login(env);
  const before = calls.bindings.length;
  const crossOrigin = await documentRequest(env, cookie, '/api/user/config', {
    method: 'POST',
    origin: 'https://evil.example',
    body: { baseVersion: 0, payload: {} },
  });
  assert.equal(crossOrigin.status, 403);
  assert.equal((await crossOrigin.json()).error.code, 'ORIGIN_MISMATCH');
  assert.equal(calls.bindings.length, before);
});

test('concurrent initial writes allow one winner and return the current version to the loser', async () => {
  const { db } = createAuthD1Stub();
  const env = envFor(db);
  const cookie = await login(env);
  const updatedAt = Date.now();
  const writes = await Promise.all([
    documentRequest(env, cookie, '/api/user/config', {
      method: 'POST',
      body: {
        baseVersion: 0,
        payload: {
          fields: { theme: { value: 'dark', updatedAt } },
          sources: [], subscriptions: [], tombstones: [],
        },
      },
    }),
    documentRequest(env, cookie, '/api/user/config', {
      method: 'POST',
      body: {
        baseVersion: 0,
        payload: {
          fields: { theme: { value: 'light', updatedAt } },
          sources: [], subscriptions: [], tombstones: [],
        },
      },
    }),
  ]);

  assert.deepEqual(writes.map((response) => response.status).sort(), [200, 409]);
  const conflict = writes.find((response) => response.status === 409);
  assert.equal((await conflict.json()).error.details.current.version, 1);
  const current = await documentRequest(env, cookie, '/api/user/config');
  assert.equal((await current.json()).version, 1);
});

test('config documents use ETag CAS, converge field merges, and retain deletion tombstones', async () => {
  const { db, state } = createAuthD1Stub();
  const env = envFor(db);
  const cookie = await login(env);
  const now = Date.now();

  const empty = await documentRequest(env, cookie, '/api/user/config');
  assert.equal(empty.status, 200);
  assert.equal(empty.headers.get('ETag'), '"0"');
  assert.deepEqual(await empty.json(), {
    kind: 'config', version: 0, updatedAt: null,
    payload: { fields: {}, sources: [], subscriptions: [], tombstones: [] },
  });

  const created = await documentRequest(env, cookie, '/api/user/config', {
    method: 'POST',
    body: {
      baseVersion: 0,
      payload: {
        fields: { theme: { value: 'dark', updatedAt: now - 20 } },
        sources: [{ id: 'source-1', name: 'Old', updatedAt: now - 20 }],
        subscriptions: [],
        tombstones: [],
      },
    },
  });
  assert.equal(created.status, 200);
  assert.equal(created.headers.get('ETag'), '"1"');

  const accountId = [...state.accounts.values()][0].id;
  const stored = state.documents.get(`${accountId}:config`);
  stored.updated_at = now - (D1_LIMITS.documentWriteIntervalSeconds * 1000) - 1;
  const merged = await documentRequest(env, cookie, '/api/user/config', {
    method: 'POST',
    headers: { 'If-Match': '"1"' },
    body: {
      payload: {
        fields: {
          theme: { value: 'light', updatedAt: now - 30 },
          locale: { value: 'zh-CN', updatedAt: now - 10 },
        },
        sources: [],
        subscriptions: [],
        tombstones: [
          { collection: 'sources', id: 'source-1', deletedAt: now },
          { collection: 'sources', id: 'expired', deletedAt: now - (31 * 24 * 60 * 60 * 1000) },
        ],
      },
    },
  });
  assert.equal(merged.status, 200);
  const mergedBody = await merged.json();
  assert.equal(mergedBody.version, 2);
  assert.equal(mergedBody.payload.fields.theme.value, 'dark');
  assert.equal(mergedBody.payload.fields.locale.value, 'zh-CN');
  assert.deepEqual(mergedBody.payload.sources, []);
  assert.deepEqual(mergedBody.payload.tombstones, [
    { collection: 'sources', id: 'source-1', deletedAt: now },
  ]);

  const conflict = await documentRequest(env, cookie, '/api/user/config', {
    method: 'POST',
    body: { baseVersion: 1, payload: { fields: {}, sources: [], subscriptions: [], tombstones: [] } },
  });
  assert.equal(conflict.status, 409);
  const conflictBody = await conflict.json();
  assert.equal(conflictBody.error.code, 'SYNC_CONFLICT');
  assert.equal(conflictBody.error.details.current.version, 2);

  const limited = await documentRequest(env, cookie, '/api/user/config', {
    method: 'POST',
    body: { baseVersion: 2, payload: { fields: {}, sources: [], subscriptions: [], tombstones: [] } },
  });
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error.code, 'SYNC_RATE_LIMITED');
});

test('library merges newer records and tombstones while rejecting oversized payloads', async () => {
  const { db, state } = createAuthD1Stub();
  const env = envFor(db);
  const cookie = await login(env);
  const now = Date.now();
  const first = await documentRequest(env, cookie, '/api/user/sync', {
    method: 'POST',
    body: {
      baseVersion: 0,
      payload: {
        history: [{ id: 'video-1', episode: 1, updatedAt: now - 20 }],
        favorites: [{ id: 'video-2', title: 'Saved', updatedAt: now - 20 }],
        tombstones: [],
      },
    },
  });
  assert.equal(first.status, 200);
  const accountId = [...state.accounts.values()][0].id;
  state.documents.get(`${accountId}:library`).updated_at = now - 60_001;

  const second = await documentRequest(env, cookie, '/api/user/sync', {
    method: 'POST',
    body: {
      baseVersion: 1,
      payload: {
        history: [{ id: 'video-1', episode: 2, updatedAt: now }],
        favorites: [],
        tombstones: [{ collection: 'favorites', id: 'video-2', deletedAt: now }],
      },
    },
  });
  assert.equal(second.status, 200);
  const body = await second.json();
  assert.equal(body.payload.history[0].episode, 2);
  assert.deepEqual(body.payload.favorites, []);

  const oversized = await documentRequest(env, cookie, '/api/user/sync', {
    method: 'POST',
    body: { baseVersion: 2, payload: { history: [], favorites: [], tombstones: [], extra: 'x'.repeat(513 * 1024) } },
  });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error.code, 'DOCUMENT_TOO_LARGE');
  assert.equal(state.documents.get(`${accountId}:library`).version, 2);
});

test('document APIs reject client-contract collection and video-skip-rule overflows', async () => {
  const { db, state } = createAuthD1Stub();
  const env = envFor(db);
  const cookie = await login(env);
  const emptyConfig = { fields: {}, sources: [], subscriptions: [], tombstones: [] };
  const skipRules = Object.fromEntries(Array.from({ length: 201 }, (_, index) => [`standard:source:${index}`, {
    introEnabled: false, introSeconds: 0, outroEnabled: false, outroSeconds: 0, updatedAt: index + 1,
  }]));

  await expectInvalidDocument(env, cookie, '/api/user/config', {
    ...emptyConfig,
    fields: Object.fromEntries(Array.from({ length: 129 }, (_, index) => [`field-${index}`, { value: index, updatedAt: index + 1 }])),
  });
  await expectInvalidDocument(env, cookie, '/api/user/config', { ...emptyConfig, sources: timestampedRecords(201, 'source') });
  await expectInvalidDocument(env, cookie, '/api/user/config', { ...emptyConfig, subscriptions: timestampedRecords(51, 'subscription') });
  await expectInvalidDocument(env, cookie, '/api/user/config', {
    ...emptyConfig,
    fields: { videoSkipRules: { value: skipRules, updatedAt: 1 } },
  });
  await expectInvalidDocument(env, cookie, '/api/user/config', {
    ...emptyConfig,
    fields: { videoSkipRules: { value: { 'standard:source:video': {
      introEnabled: true, introSeconds: 601, outroEnabled: false, outroSeconds: 0, updatedAt: 1,
    } }, updatedAt: 1 } },
  });
  await expectInvalidDocument(env, cookie, '/api/user/config', {
    ...emptyConfig,
    tombstones: Array.from({ length: 401 }, (_, index) => ({ collection: 'sources', id: `source-${index}`, deletedAt: index + 1 })),
  });
  await expectInvalidDocument(env, cookie, '/api/user/sync', {
    history: timestampedRecords(201, 'history'), favorites: [], tombstones: [],
  });
  await expectInvalidDocument(env, cookie, '/api/user/sync', {
    history: [], favorites: timestampedRecords(201, 'favorite'), tombstones: [],
  });
  assert.equal(state.documents.size, 0);
});

test('document merge rejects a collection that would exceed its bounded result', async () => {
  const { db, state } = createAuthD1Stub();
  const env = envFor(db);
  const cookie = await login(env);
  const created = await documentRequest(env, cookie, '/api/user/config', {
    method: 'POST',
    body: { baseVersion: 0, payload: {
      fields: {}, sources: timestampedRecords(200, 'source'), subscriptions: [], tombstones: [],
    } },
  });
  assert.equal(created.status, 200);
  const accountId = [...state.accounts.values()][0].id;
  state.documents.get(`${accountId}:config`).updated_at = Date.now() - 60_001;

  const overflow = await documentRequest(env, cookie, '/api/user/config', {
    method: 'POST',
    headers: { 'If-Match': '"1"' },
    body: { payload: { fields: {}, sources: [{ id: 'source-extra', updatedAt: 1 }], subscriptions: [], tombstones: [] } },
  });
  assert.equal(overflow.status, 400);
  assert.equal((await overflow.json()).error.code, 'INVALID_DOCUMENT');
  assert.equal(state.documents.get(`${accountId}:config`).version, 1);
});
