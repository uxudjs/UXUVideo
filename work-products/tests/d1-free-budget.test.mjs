import assert from 'node:assert/strict';
import test from 'node:test';

import worker, {
  D1_LIMITS,
  D1_QUERIES,
  D1_SCHEMA_STATEMENTS,
  D1_SCHEMA_VERSION,
  ensureSchema,
  estimateD1WorstCaseBudget,
} from '../../_worker.js';
import { createD1Stub, EXPECTED_QUERY_PLANS } from './fixtures/d1.mjs';

async function captureLogs(run) {
  const messages = [];
  const originalLog = console.log;
  console.log = (message) => messages.push(String(message));
  try {
    return { value: await run(), entries: messages.map((message) => JSON.parse(message)) };
  } finally {
    console.log = originalLog;
  }
}

test('initializes the versioned schema once per D1 binding with idempotent indexed statements', async () => {
  const { db, calls } = createD1Stub();
  const first = await captureLogs(() => ensureSchema({ DB: db }, 'request-schema-1'));
  await ensureSchema({ DB: db }, 'request-schema-2');

  assert.equal(D1_SCHEMA_VERSION, 1);
  assert.equal(calls.batches.length, 1);
  assert.deepEqual(calls.batches[0], D1_SCHEMA_STATEMENTS.map(({ sql }) => sql));
  assert.equal(D1_SCHEMA_STATEMENTS.every(({ sql }) => /IF NOT EXISTS/i.test(sql)), true);
  assert.deepEqual(
    D1_SCHEMA_STATEMENTS
      .filter(({ sql }) => /^CREATE TABLE/i.test(sql))
      .map(({ id }) => id),
    ['schema.accounts', 'schema.sessions', 'schema.user_documents', 'schema.rate_limits'],
  );

  const schemaSql = D1_SCHEMA_STATEMENTS.map(({ sql }) => sql).join('\n');
  for (const requiredIndex of [
    'username TEXT NOT NULL UNIQUE',
    'PRIMARY KEY (account_id, kind)',
    'idx_accounts_created_at',
    'idx_accounts_role',
    'idx_sessions_account_created_at',
    'idx_sessions_expires_at',
    'idx_rate_limits_expires_at',
  ]) {
    assert.match(schemaSql, new RegExp(requiredIndex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }

  assert.equal(first.entries.length, D1_SCHEMA_STATEMENTS.length);
  first.entries.forEach((entry, index) => {
    assert.deepEqual(Object.keys(entry), [
      'event',
      'requestId',
      'queryId',
      'rowsRead',
      'rowsWritten',
      'durationMs',
    ]);
    assert.equal(entry.event, 'd1.query');
    assert.equal(entry.requestId, 'request-schema-1');
    assert.equal(entry.queryId, D1_SCHEMA_STATEMENTS[index].id);
    assert.equal(entry.rowsRead, 0);
    assert.equal(entry.rowsWritten, index + 1);
  });
});

test('defines bounded indexed query contracts without SELECT star or unbounded mutations', () => {
  assert.deepEqual(Object.keys(D1_QUERIES), Object.keys(EXPECTED_QUERY_PLANS));

  for (const [queryId, query] of Object.entries(D1_QUERIES)) {
    assert.doesNotMatch(query.sql, /SELECT\s+\*/i, queryId);
    assert.doesNotMatch(query.sql, /\b(?:UPDATE|DELETE)\b(?![\s\S]*\bWHERE\b)/i, queryId);
    assert.equal(query.expectedIndex, EXPECTED_QUERY_PLANS[queryId]);
    assert.match(query.sql, /\b(?:WHERE|LIMIT)\b/i, queryId);
  }
});

test('recomputes the approved worst-case D1 budget below every project warning line', () => {
  const budget = estimateD1WorstCaseBudget();

  assert.equal(D1_LIMITS.accounts, 8);
  assert.equal(D1_LIMITS.sessionsPerAccount, 5);
  assert.equal(D1_LIMITS.documentKinds, 2);
  assert.equal(D1_LIMITS.documentMaxBytes, 512 * 1024);
  assert.equal(budget.documentWrites, 23_040);
  assert.equal(budget.rateLimitWrites, 2_100);
  assert.equal(budget.sessionTouches, 160);
  assert.equal(budget.cleanupRows, 200);
  assert.equal(budget.logicalChanges, 25_500);
  assert.equal(D1_LIMITS.rateLimitBucketsPerAttempt, 2);
  assert.equal(budget.rowsWritten, 42_100);
  assert.equal(budget.rowsRead <= D1_LIMITS.warningRowsRead, true);
  assert.equal(budget.rowsWritten <= D1_LIMITS.warningRowsWritten, true);
  assert.equal(budget.storageBytes <= D1_LIMITS.warningStorageBytes, true);
  assert.equal(budget.rowsWritten > budget.logicalChanges, true, 'index amplification must be included');
});

test('fails known API routes closed when DB is missing, unavailable, or quota exhausted', async () => {
  const missing = await captureLogs(() => worker.fetch(
    new Request('https://worker.example/api/config'),
    {},
    {},
  ));
  assert.equal(missing.value.status, 503);
  assert.equal((await missing.value.json()).error.code, 'STORAGE_UNAVAILABLE');

  const unavailableStub = createD1Stub({ batchError: new Error('connection failed') });
  const unavailable = await captureLogs(() => worker.fetch(
    new Request('https://worker.example/api/config'),
    { DB: unavailableStub.db },
    {},
  ));
  assert.equal(unavailable.value.status, 503);
  assert.equal((await unavailable.value.json()).error.code, 'STORAGE_UNAVAILABLE');

  const quotaError = Object.assign(new Error('D1 quota exceeded'), { code: 'D1_QUOTA_EXCEEDED' });
  const quotaStub = createD1Stub({ batchError: quotaError });
  const quota = await captureLogs(() => worker.fetch(
    new Request('https://worker.example/api/config'),
    { DB: quotaStub.db },
    {},
  ));
  assert.equal(quota.value.status, 503);
  assert.equal((await quota.value.json()).error.code, 'STORAGE_QUOTA_EXCEEDED');
});
