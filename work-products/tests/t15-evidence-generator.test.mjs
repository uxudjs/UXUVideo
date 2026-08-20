import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { commitEvidenceWrites, validateEvidenceTransition } from './t15-evidence-transition.mjs';

const generator = readFileSync(new URL('./generate-t15-attempt10-receipts.mjs', import.meta.url), 'utf8');

test('T15 evidence generator never hardcodes successful validation or performance results', () => {
  assert.doesNotMatch(generator, /const performanceSamples\s*=|125\/125 GREEN|163\/163 GREEN|159\/159 GREEN/);
  assert.match(generator, /validationReceiptPath/);
  assert.match(generator, /validationReceipt\.e2e\.passed/);
  assert.match(generator, /generator does not execute validation commands/i);
});

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function transitionFixture(overrides = {}) {
  const attempt = 13;
  const evidencePath = 'work-products/evidence/section21/receipts/invalidated/debug-20260820/t15-candidate-evidence-attempt12-rejected.json';
  const reviewPath = 'work-products/evidence/section21/receipts/invalidated/debug-20260820/t15-visual-review-attempt12-rejected.md';
  const evidenceBytes = Buffer.from(JSON.stringify({ attempt: 12 }));
  const reviewBytes = Buffer.from('# rejected candidate 12\n');
  const approvalBytes = Buffer.from(JSON.stringify({
    attempt: 12,
    decision: 'REJECTED',
    preapprovalEvidence: { path: evidencePath, sha256: digest(evidenceBytes) },
    visualReview: { path: reviewPath, sha256: digest(reviewBytes) },
  }));
  return {
    attempt,
    activeApprovalBytes: approvalBytes,
    archivedApprovalBytes: approvalBytes,
    priorEvidenceBytes: evidenceBytes,
    priorReviewBytes: reviewBytes,
    expectedPriorEvidencePath: evidencePath,
    expectedPriorReviewPath: reviewPath,
    ...overrides,
  };
}

function approvedTransitionFixture(overrides = {}) {
  const evidencePath = 'work-products/evidence/section21/t15-candidate-evidence.json';
  const reviewPath = 'work-products/evidence/section21/t15-visual-review.md';
  const evidenceBytes = Buffer.from(JSON.stringify({ attempt: 13 }));
  const reviewBytes = Buffer.from('# approved candidate 13\n');
  const approvalBytes = Buffer.from(JSON.stringify({
    attempt: 13,
    decision: 'APPROVED',
    preapprovalEvidence: { path: evidencePath, sha256: digest(evidenceBytes) },
    visualReview: { path: reviewPath, sha256: digest(reviewBytes) },
    machineBinding: { candidateCombinedSha256: 'approved-sha' },
  }));
  return {
    attempt: 14,
    activeApprovalBytes: approvalBytes,
    priorEvidenceBytes: evidenceBytes,
    priorReviewBytes: reviewBytes,
    expectedPriorEvidencePath: evidencePath,
    expectedPriorReviewPath: reviewPath,
    currentCandidateCombinedSha256: 'replacement-sha',
    ...overrides,
  };
}

test('T15 evidence transition accepts only a fresh or explicitly supersedable decision', () => {
  assert.doesNotThrow(() => validateEvidenceTransition({ attempt: 13 }));
  assert.doesNotThrow(() => validateEvidenceTransition({
    attempt: 13,
    activeApprovalBytes: Buffer.from(JSON.stringify({ attempt: 13, decision: 'NOT_READY' })),
  }));
  for (const decision of ['PENDING', 'APPROVED', 'REJECTED']) {
    assert.throws(() => validateEvidenceTransition({
      attempt: 13,
      activeApprovalBytes: Buffer.from(JSON.stringify({ attempt: 13, decision })),
    }), /immutable/);
  }
  assert.throws(() => validateEvidenceTransition(transitionFixture({
    activeApprovalBytes: Buffer.from(JSON.stringify({ attempt: 12, decision: 'PENDING' })),
  })), /explicit prior rejection/);
  assert.throws(() => validateEvidenceTransition(transitionFixture({ archivedApprovalBytes: Buffer.from('{}') })), /immutable archive/);
});

test('T15 evidence transition preserves an approved decision while allowing only proven candidate-byte invalidation', () => {
  assert.doesNotThrow(() => validateEvidenceTransition(approvedTransitionFixture()));
  assert.throws(() => validateEvidenceTransition(approvedTransitionFixture({
    currentCandidateCombinedSha256: 'approved-sha',
  })), /must differ/);
  assert.throws(() => validateEvidenceTransition(approvedTransitionFixture({
    priorEvidenceBytes: null,
  })), /candidate evidence is missing/);
  assert.throws(() => validateEvidenceTransition(approvedTransitionFixture({
    priorReviewBytes: Buffer.from('# drift\n'),
  })), /visual review drifted/);
});

test('T15 evidence transition rejects every broken prior evidence or review binding', () => {
  assert.doesNotThrow(() => validateEvidenceTransition(transitionFixture()));
  const invalid = [
    [{ priorEvidenceBytes: null }, /candidate evidence is missing/],
    [{ priorEvidenceBytes: Buffer.from(JSON.stringify({ attempt: 11 })) }, /different attempt/],
    [{ expectedPriorEvidencePath: 'wrong.json' }, /unexpected candidate evidence path/],
    [{ priorEvidenceBytes: Buffer.from(JSON.stringify({ attempt: 12, drift: true })) }, /approval binding/],
    [{ priorReviewBytes: null }, /visual review is missing/],
    [{ expectedPriorReviewPath: 'wrong.md' }, /unexpected visual review path/],
    [{ priorReviewBytes: Buffer.from('# drift\n') }, /visual review drifted/],
  ];
  for (const [override, error] of invalid) assert.throws(() => validateEvidenceTransition(transitionFixture(override)), error);
});

test('T15 evidence writes are impossible after failed validation and consume one authorization', () => {
  const writes = [];
  const writer = (path, bytes) => writes.push([path, bytes]);
  assert.throws(() => validateEvidenceTransition(transitionFixture({ priorEvidenceBytes: null })), /missing/);
  assert.throws(() => commitEvidenceWrites({}, [{ path: 'should-not-write', bytes: Buffer.from('x') }], writer), /successful/);
  assert.deepEqual(writes, []);

  const authorization = validateEvidenceTransition(transitionFixture());
  commitEvidenceWrites(authorization, [{ path: 'one', bytes: Buffer.from('1') }, { path: 'two', bytes: Buffer.from('2') }], writer);
  assert.deepEqual(writes.map(([path]) => path), ['one', 'two']);
  assert.throws(() => commitEvidenceWrites(authorization, [{ path: 'three', bytes: Buffer.from('3') }], writer), /unused/);
  assert.deepEqual(writes.map(([path]) => path), ['one', 'two']);
});

test('T15 evidence generator keeps machine identities out of human approval instructions and delegates all writes', () => {
  assert.match(generator, /validateEvidenceTransition/);
  assert.match(generator, /commitEvidenceWrites/);
  assert.doesNotMatch(generator, /\bwriteFileSync\s*\(/);
  assert.match(generator, /humanDecisionContract/);
  assert.match(generator, /shaRequired: false/);
  assert.match(generator, /批准视觉候选 \$\{attempt\}/);
  const reviewTemplate = generator.split('const review =')[1].split('const visualReviewBytes')[0];
  assert.doesNotMatch(reviewTemplate, /SHA-?256|combinedSha256|releaseScopeSha256/i);
});
