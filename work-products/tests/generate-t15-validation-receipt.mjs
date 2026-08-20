import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pagesReleaseIdentity } from './t15-candidate-identity.mjs';

const workerRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const pagesRoot = resolve(workerRoot, '../UXUV-Pages');
const evidenceRoot = join(workerRoot, 'work-products', 'evidence', 'section21');
const attempt = 14;
const priorAttempt = attempt - 1;
const e2eReportPath = join(evidenceRoot, `t15-e2e-attempt${attempt}.json`);
const tracePath = join(evidenceRoot, 't15-performance-trace.zip');
const pairPath = join(evidenceRoot, 'pair-rollback.json');
const priorCandidateEvidencePath = join(evidenceRoot, 't15-candidate-evidence.json');
const receiptPath = join(evidenceRoot, `t15-validation-attempt${attempt}.json`);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function repositoryPath(path) {
  return relative(workerRoot, path).replaceAll('\\', '/');
}

function fileReceipt(path) {
  const bytes = readFileSync(path);
  return { path: repositoryPath(path), bytes: bytes.length, sha256: sha256(bytes) };
}

function stdoutTexts(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) for (const item of value) stdoutTexts(item, output);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) stdoutTexts(item, output);
  return output;
}

const e2eReportBytes = readFileSync(e2eReportPath);
const e2eReport = JSON.parse(e2eReportBytes.toString('utf8'));
assert.equal(e2eReport.stats.unexpected, 0, 'E2E report contains unexpected failures');
assert.equal(e2eReport.stats.flaky, 0, 'E2E report contains flaky tests');
assert.equal(e2eReport.stats.skipped, 0, 'E2E report contains skipped tests');
assert.ok(e2eReport.stats.expected > 0, 'E2E report has no expected tests');
const e2e = {
  discovered: e2eReport.stats.expected,
  passed: e2eReport.stats.expected,
  duration: `${Math.round(e2eReport.stats.duration)} ms`,
};

const performanceOutput = e2eReport.reportKind === 'playwright_sanitized_summary'
  ? e2eReport.performance.output
  : stdoutTexts(e2eReport).find((value) => value.startsWith('S21-T06 performance '));
const metricsMatch = /^S21-T06 performance (\{[^\r\n]+\})/.exec(performanceOutput ?? '');
assert.ok(metricsMatch, 'performance log is missing measured metrics');
const metrics = JSON.parse(metricsMatch[1]);
assert.equal(metrics.samples.length, 3);
for (const sample of metrics.samples) {
  assert.ok(Number.isFinite(sample.p95RafIntervalMs));
  assert.ok(Number.isFinite(sample.longTaskTotalMs));
  assert.ok(Number.isInteger(sample.droppedFrames));
  assert.ok(sample.totalFrames > 0);
}

function collectTests(suites, output = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const item of spec.tests ?? []) {
        const result = item.results?.at(-1);
        output.push({
          file: String(spec.file ?? '').replaceAll('\\', '/'),
          title: spec.title,
          status: result?.status,
          durationMs: result?.duration,
        });
      }
    }
    collectTests(suite.suites, output);
  }
  return output;
}

if (e2eReport.reportKind !== 'playwright_sanitized_summary') {
  const tests = collectTests(e2eReport.suites);
  assert.equal(tests.length, e2e.discovered);
  assert.ok(tests.every(({ status }) => status === 'passed'));
  const sanitizedReport = {
    schemaVersion: 1,
    reportKind: 'playwright_sanitized_summary',
    sourceRaw: {
      bytes: e2eReportBytes.length,
      sha256: sha256(e2eReportBytes),
      disposition: 'discarded after validation because the native report contained machine-absolute paths',
    },
    stats: e2eReport.stats,
    tests,
    performance: { output: performanceOutput, metrics },
  };
  writeFileSync(e2eReportPath, `${JSON.stringify(sanitizedReport, null, 2)}\n`);
}

const priorCandidateEvidence = JSON.parse(readFileSync(priorCandidateEvidencePath, 'utf8'));
assert.ok([priorAttempt, attempt].includes(priorCandidateEvidence.attempt));
const currentPagesReleaseScope = pagesReleaseIdentity(pagesRoot);
assert.deepEqual(
  currentPagesReleaseScope,
  priorCandidateEvidence.repositories.pages.releaseScope,
  'performance trace reuse requires an exact Pages release-scope match',
);
assert.equal(priorCandidateEvidence.performance.trace.sha256, sha256(readFileSync(tracePath)));

const pair = JSON.parse(readFileSync(pairPath, 'utf8'));
assert.deepEqual(pair.phases.map(({ name, status }) => ({ name, status })), [
  { name: 'bootstrap-v2', status: 'passed' },
  { name: 'reverse-v1', status: 'passed' },
  { name: 'forward-restore-v2', status: 'passed' },
]);
assert.equal(pair.compatibility.status, 'passed');

const receipt = {
  schemaVersion: 1,
  taskId: 'S21-T15',
  attempt,
  generatedAt: new Date().toISOString(),
  status: 'passed',
  e2e: {
    command: 'UXUV_WRITE_VISUAL_CANDIDATE=1 playwright test --reporter=json --workers=1',
    ...e2e,
    report: fileReceipt(e2eReportPath),
  },
  performance: {
    command: 'included in the full attempt 14 Playwright run',
    discovered: 1,
    passed: 1,
    duration: 'included in E2E report',
    samples: metrics.samples,
    median: metrics.median,
    report: fileReceipt(e2eReportPath),
    trace: {
      ...fileReceipt(tracePath),
      sanitization: 'passed in attempt 13',
      reusedFromAttempt: 13,
      pagesReleaseScopeExactMatch: true,
      pagesReleaseScope: currentPagesReleaseScope,
      reason: 'Pages release-source bytes are unchanged; attempt 14 changes Worker lifecycle and test/evidence ownership only.',
    },
  },
  rollback: {
    generateCommand: 'node work-products/tests/section21-rollback-drill.test.mjs --generate',
    replayCommand: 'node --test work-products/tests/section21-rollback-drill.test.mjs',
    pair: fileReceipt(pairPath),
    phases: pair.phases.map(({ name, status }) => ({ name, status })),
    compatibility: pair.compatibility,
  },
  authorization: { commit: false, push: false, deploy: false, remoteChanges: false },
};

writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: receipt.status, e2e: receipt.e2e.passed, performance: receipt.performance.median, rollback: receipt.rollback.phases })}\n`);
