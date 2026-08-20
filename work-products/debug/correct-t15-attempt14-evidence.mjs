import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workerRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const pagesRoot = resolve(workerRoot, "../UXUV-Pages");
const evidenceRoot = join(workerRoot, "work-products", "evidence", "section21");
const correctionRoot = join(evidenceRoot, "receipts", "invalidated", "debug-20260820");
const candidateRoot = join(pagesRoot, "work-products", "tests", "fixtures", "ui-review", "section21-candidate");
const evidencePath = join(evidenceRoot, "t15-candidate-evidence.json");
const approvalPath = join(evidenceRoot, "t15-visual-approval.json");
const reviewPath = join(evidenceRoot, "t15-visual-review.md");
const validationPath = join(evidenceRoot, "t15-validation-attempt14.json");
const reportPath = join(evidenceRoot, "t15-e2e-attempt14.json");
const oldEvidenceArchivePath = join(correctionRoot, "t15-candidate-evidence-attempt14-pre-sanitization-correction.json");
const oldApprovalArchivePath = join(correctionRoot, "t15-visual-approval-attempt14-pre-sanitization-correction.json");
const correctionPath = join(correctionRoot, "t15-attempt14-sanitized-report-correction.json");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function repositoryPath(path) {
  return relative(workerRoot, path).replaceAll("\\", "/");
}

function receipt(path, bytes = readFileSync(path)) {
  return { path: repositoryPath(path), bytes: bytes.length, sha256: sha256(bytes) };
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function candidateCombinedSha256() {
  const files = readdirSync(candidateRoot).sort()
    .map((name) => join(candidateRoot, name))
    .filter((path) => lstatSync(path).isFile() && extname(path).toLowerCase() === ".png");
  assert.equal(files.length, 121);
  return sha256(files.map((path) => sha256(readFileSync(path))).join(""));
}

assert.equal(existsSync(correctionPath), false, "attempt 14 evidence correction already exists");
const oldEvidenceBytes = readFileSync(evidencePath);
const oldApprovalBytes = readFileSync(approvalPath);
const reviewBytes = readFileSync(reviewPath);
const validationBytes = readFileSync(validationPath);
const reportBytes = readFileSync(reportPath);
const oldEvidence = JSON.parse(oldEvidenceBytes);
const oldApproval = JSON.parse(oldApprovalBytes);
const report = JSON.parse(reportBytes);
assert.equal(oldEvidence.attempt, 14);
assert.equal(oldApproval.attempt, 14);
assert.equal(oldApproval.decision, "PENDING");
assert.equal(oldApproval.preapprovalEvidence.sha256, sha256(oldEvidenceBytes));
assert.equal(oldApproval.visualReview.sha256, sha256(reviewBytes));
assert.equal(oldApproval.machineBinding.candidateCombinedSha256, candidateCombinedSha256());
assert.equal(report.reportKind, "playwright_sanitized_summary");
assert.equal(report.stats.expected, 125);
assert.equal(report.stats.unexpected, 0);

const correctedEvidence = structuredClone(oldEvidence);
correctedEvidence.validation.receipt = receipt(validationPath, validationBytes);
correctedEvidence.validation.reason = "Attempt 14 validation is derived from the sanitized Playwright summary, current rollback pair, and an exact Pages release-scope trace reuse boundary.";
const correctedEvidenceBytes = jsonBytes(correctedEvidence);

const correction = {
  schemaVersion: 1,
  receiptKind: "pending_evidence_sanitization_correction",
  attempt: 14,
  correctedAt: new Date().toISOString(),
  invariant: {
    candidateCombinedSha256: oldApproval.machineBinding.candidateCombinedSha256,
    releaseScopeSha256: oldApproval.machineBinding.releaseScopeSha256,
    visualReviewSha256: oldApproval.visualReview.sha256,
    decision: oldApproval.decision,
  },
  archives: {
    priorCandidateEvidence: receipt(oldEvidenceArchivePath, oldEvidenceBytes),
    priorApproval: receipt(oldApprovalArchivePath, oldApprovalBytes),
  },
  correctedCandidateEvidence: receipt(evidencePath, correctedEvidenceBytes),
  sanitizedPlaywrightReport: {
    ...receipt(reportPath, reportBytes),
    discardedRaw: report.sourceRaw,
  },
  validationReceipt: receipt(validationPath, validationBytes),
  disposition: "Machine-absolute paths were removed from the retained Playwright report; candidate images, visual review, release scope, and PENDING decision are unchanged.",
  authorization: { commit: false, push: false, deploy: false, remoteChanges: false },
};
const correctionBytes = jsonBytes(correction);
const correctedApproval = structuredClone(oldApproval);
correctedApproval.preapprovalEvidence.sha256 = sha256(correctedEvidenceBytes);
correctedApproval.evidenceCorrection = {
  path: repositoryPath(correctionPath),
  sha256: sha256(correctionBytes),
  disposition: correction.disposition,
};
const correctedApprovalBytes = jsonBytes(correctedApproval);

for (const [path, bytes] of [
  [oldEvidenceArchivePath, oldEvidenceBytes],
  [oldApprovalArchivePath, oldApprovalBytes],
  [correctionPath, correctionBytes],
  [evidencePath, correctedEvidenceBytes],
  [approvalPath, correctedApprovalBytes],
]) writeFileSync(path, bytes);

process.stdout.write(`${JSON.stringify({ attempt: 14, candidateCombinedSha256: correction.invariant.candidateCombinedSha256, reportSha256: correction.sanitizedPlaywrightReport.sha256 })}\n`);
