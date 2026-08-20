import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const workerRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const receipt = JSON.parse(readFileSync(new URL('../evidence/section21/t15-validation-attempt14.json', import.meta.url), 'utf8'));

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function verifyFile(entry) {
  const bytes = readFileSync(join(workerRoot, ...entry.path.split('/')));
  assert.equal(bytes.length, entry.bytes);
  assert.equal(sha256(bytes), entry.sha256);
}

test('S21-T15 validation receipt derives E2E, performance, trace, and rollback results from retained evidence', () => {
  assert.equal(receipt.taskId, 'S21-T15');
  assert.equal(receipt.attempt, 14);
  assert.equal(receipt.status, 'passed');
  assert.equal(receipt.e2e.passed, receipt.e2e.discovered);
  assert.equal(receipt.performance.discovered, 1);
  assert.equal(receipt.performance.passed, 1);
  assert.equal(receipt.performance.samples.length, 3);
  assert.ok(receipt.performance.samples.every(({ totalFrames }) => totalFrames > 0));
  assert.equal(receipt.performance.trace.reusedFromAttempt, 13);
  assert.equal(receipt.performance.trace.pagesReleaseScopeExactMatch, true);
  assert.deepEqual(receipt.rollback.phases.map(({ name, status }) => ({ name, status })), [
    { name: 'bootstrap-v2', status: 'passed' },
    { name: 'reverse-v1', status: 'passed' },
    { name: 'forward-restore-v2', status: 'passed' },
  ]);
  for (const entry of [receipt.e2e.report, receipt.performance.report, receipt.performance.trace, receipt.rollback.pair]) verifyFile(entry);
});
