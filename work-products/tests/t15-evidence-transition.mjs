import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const writeAuthorizations = new WeakSet();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJson(bytes, label) {
  assert.ok(bytes, `${label} is missing`);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    assert.fail(`${label} is not valid JSON`);
  }
}

export function validateEvidenceTransition({
  attempt,
  activeApprovalBytes = null,
  archivedApprovalBytes = null,
  priorEvidenceBytes = null,
  priorReviewBytes = null,
  expectedPriorEvidencePath,
  expectedPriorReviewPath,
  currentCandidateCombinedSha256 = null,
}) {
  assert.ok(Number.isInteger(attempt) && attempt > 0, "attempt must be a positive integer");
  const authorization = {};
  if (!activeApprovalBytes) {
    writeAuthorizations.add(authorization);
    return authorization;
  }

  const approval = parseJson(activeApprovalBytes, "existing visual decision");
  assert.ok(Number.isInteger(approval.attempt), "existing visual decision must identify its attempt");
  assert.ok(approval.attempt <= attempt, "existing visual decision cannot be from a future attempt");
  if (approval.attempt === attempt) {
    assert.equal(
      approval.decision,
      "NOT_READY",
      `attempt ${attempt} visual decision is immutable after it becomes PENDING, APPROVED, or REJECTED`,
    );
    writeAuthorizations.add(authorization);
    return authorization;
  }

  assert.equal(approval.attempt, attempt - 1, "only the immediately prior attempt may be superseded");
  assert.ok(
    ["REJECTED", "APPROVED"].includes(approval.decision),
    "a new visual attempt requires an explicit prior rejection or proven approved-candidate invalidation",
  );
  if (approval.decision === "REJECTED") {
    assert.ok(archivedApprovalBytes, `rejected attempt ${attempt - 1} approval archive is missing`);
    assert.equal(
      Buffer.compare(activeApprovalBytes, archivedApprovalBytes),
      0,
      `active attempt ${attempt - 1} rejection must match its immutable archive`,
    );
  } else {
    assert.ok(currentCandidateCombinedSha256, "approved-candidate invalidation requires the current candidate identity");
    assert.notEqual(
      currentCandidateCombinedSha256,
      approval.machineBinding?.candidateCombinedSha256,
      "the replacement candidate identity must differ from the approved candidate identity",
    );
    if (archivedApprovalBytes) {
      assert.equal(
        Buffer.compare(activeApprovalBytes, archivedApprovalBytes),
        0,
        `active attempt ${attempt - 1} approval must match its immutable archive`,
      );
    }
  }

  const evidence = parseJson(priorEvidenceBytes, `rejected attempt ${attempt - 1} candidate evidence`);
  assert.equal(evidence.attempt, approval.attempt, "archived candidate evidence belongs to a different attempt");
  assert.equal(approval.preapprovalEvidence?.path, expectedPriorEvidencePath, "rejected approval points at an unexpected candidate evidence path");
  assert.equal(sha256(priorEvidenceBytes), approval.preapprovalEvidence?.sha256, "rejected candidate evidence does not match its approval binding");

  assert.ok(priorReviewBytes, `rejected attempt ${attempt - 1} visual review is missing`);
  assert.equal(approval.visualReview?.path, expectedPriorReviewPath, "rejected approval points at an unexpected visual review path");
  assert.equal(sha256(priorReviewBytes), approval.visualReview?.sha256, "rejected visual review drifted");

  writeAuthorizations.add(authorization);
  return authorization;
}

export function commitEvidenceWrites(authorization, writes, writer = writeFileSync) {
  assert.ok(writeAuthorizations.delete(authorization), "evidence writes require a successful, unused transition validation");
  assert.ok(Array.isArray(writes) && writes.length > 0, "evidence write plan is empty");
  for (const { path, bytes } of writes) {
    assert.equal(typeof path, "string", "evidence write path must be a string");
    assert.ok(Buffer.isBuffer(bytes), `evidence write for ${path} must use prepared bytes`);
  }
  for (const { path, bytes } of writes) writer(path, bytes);
}
