import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const scriptPath = resolve(fileURLToPath(import.meta.url));
const fail = (message) => { throw new Error(message); };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const machinePathPattern = /(?:^|[\s`'"])(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/mu;
const releaseFinalizationProfile = "section22-release-finalization/v1";
const releaseFinalizationEvidenceSchema = "s22-release-finalization-validation/v1";
const requiredValidationIds = [
  "worker-full-gate",
  "pages-full-gate",
  "paired-final-gate",
  "section22-rollback",
  "candidate-hygiene",
  "evidence-audit",
  "terminal-verify",
];
const credibleSecretPattern = /(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._~+/=-]{20,}|(?:CLOUDFLARE_API_TOKEN|CF_API_TOKEN|GITHUB_TOKEN|GH_TOKEN|API_TOKEN|ACCESS_TOKEN|SECRET_KEY)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{20,})/iu;

const repositoryPath = (value, label) => {
  if (typeof value !== "string" || value.length === 0) fail(`${label} is invalid`);
  if (value.includes("\\") || value.startsWith("/") || /^[A-Za-z]:/u.test(value)) fail(`${label} must be repository-relative`);
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) fail(`${label} has an invalid segment`);
  const absolute = resolve(repositoryRoot, ...segments);
  const boundary = `${repositoryRoot}${sep}`.toLowerCase();
  if (!absolute.toLowerCase().startsWith(boundary)) fail(`${label} escapes the repository`);
  return absolute;
};

const assertCompletedReceipt = (receipt, expectedTaskId, expectedAttemptId) => {
  if (receipt?.schema_version !== "s22-task-receipt/v1") fail("receipt schema is invalid");
  if (receipt.task_id !== expectedTaskId || receipt.attempt_id !== expectedAttemptId) fail("receipt identity mismatch");
  if (receipt.status !== "completed") fail("receipt status is not completed");
  for (const field of ["create_exit_code", "prewrite_exit_code", "inputs_exit_code", "terminal_exit_code"]) {
    if (receipt.baseline?.[field] !== 0) fail(`receipt baseline ${field} is not green`);
  }
  if (receipt.baseline?.approved_plan_snapshot !== "identical") fail("receipt approval snapshot is not identical");
  if (!Array.isArray(receipt.validation) || receipt.validation.length === 0) fail("receipt validation is empty");
  if (receipt.validation.some((entry) => entry?.exit_code !== 0)) fail("receipt validation contains a nonzero exit code");
  if (receipt.terminal?.verification !== "green") fail("receipt terminal verification is not green");
  for (const key of ["commit", "push", "deploy", "network", "remote_changes"]) {
    if (receipt.authorization?.[key] !== false) fail(`receipt authorization ${key} is not false`);
  }
};

const assertReleaseFinalizationReceipt = (receipt) => {
  if (receipt.audit_profile !== releaseFinalizationProfile) fail("receipt audit profile is invalid");
  const ids = receipt.validation.map((entry) => entry?.id);
  if (JSON.stringify(ids) !== JSON.stringify(requiredValidationIds)) fail("receipt validation ids are invalid");
  if (receipt.validation.some((entry) => (
    typeof entry?.command !== "string"
    || entry.command.length === 0
    || typeof entry.repository !== "string"
    || entry.repository.length === 0
    || entry.result !== "green"
  ))) fail("receipt validation entry is invalid");
  const evidencePath = receipt.evidence?.path;
  if (
    typeof evidencePath !== "string"
    || !evidencePath.startsWith("work-products/evidence/section22/")
    || evidencePath.startsWith("work-products/evidence/section22/receipts/")
  ) fail("receipt evidence path is outside the release evidence namespace");
};

const assertReleaseFinalizationEvidence = (evidence, receipt) => {
  const text = evidence.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(evidence) || text.startsWith("\uFEFF")) fail("evidence is not canonical UTF-8");
  if (machinePathPattern.test(text)) fail("evidence contains a machine path");
  if (credibleSecretPattern.test(text)) fail("evidence contains a credible secret");
  const identity = [
    `- 任务：\`${receipt.task_id}\``,
    `- attempt：\`${receipt.attempt_id}\``,
    `- schema：\`${releaseFinalizationEvidenceSchema}\``,
    "- 本文件结论：`VALIDATIONS GREEN / LOCAL CANDIDATE / RELEASE HOLD`",
  ];
  if (identity.some((line) => !text.includes(line))) fail("evidence identity is invalid");
};

export const auditReceiptBytes = async ({
  bytes,
  expectedTaskId,
  expectedAttemptId,
  expectedReceiptBytes,
  expectedReceiptSha256,
  loadEvidence,
  allowLegacyBindingOnly = false,
}) => {
  if (!Buffer.isBuffer(bytes)) fail("receipt bytes must be a Buffer");
  const hasExpectedBytes = expectedReceiptBytes !== undefined;
  const hasExpectedSha256 = expectedReceiptSha256 !== undefined;
  if (hasExpectedBytes !== hasExpectedSha256) fail("expected receipt identity is incomplete");
  if (hasExpectedBytes) {
    if (!Number.isSafeInteger(expectedReceiptBytes) || expectedReceiptBytes < 0) fail("expected receipt bytes are invalid");
    if (!/^[a-f0-9]{64}$/u.test(expectedReceiptSha256)) fail("expected receipt sha256 is invalid");
    if (bytes.length !== expectedReceiptBytes || sha256(bytes) !== expectedReceiptSha256) fail("receipt byte identity mismatch");
  }
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes) || text.startsWith("\uFEFF")) fail("receipt is not canonical UTF-8");
  if (text.includes("\r") || !text.endsWith("\n") || text.endsWith("\n\n")) fail("receipt must have exactly one terminal LF and no CR");
  if (/[ \t]+\n/u.test(text)) fail("receipt contains trailing whitespace");
  if (machinePathPattern.test(text)) fail("receipt contains a machine path");
  let receipt;
  try {
    receipt = JSON.parse(text);
  } catch {
    fail("receipt JSON is invalid");
  }
  assertCompletedReceipt(receipt, expectedTaskId, expectedAttemptId);
  const isReleaseFinalization = receipt.audit_profile === releaseFinalizationProfile;
  if (isReleaseFinalization) {
    assertReleaseFinalizationReceipt(receipt);
  } else if (!allowLegacyBindingOnly || receipt.audit_profile !== undefined) {
    fail("receipt audit profile is invalid");
  }
  const evidencePath = receipt.evidence?.path;
  repositoryPath(evidencePath, "receipt evidence path");
  if (!Number.isSafeInteger(receipt.evidence?.bytes) || receipt.evidence.bytes < 0) fail("receipt evidence bytes are invalid");
  if (!/^[a-f0-9]{64}$/u.test(receipt.evidence?.sha256)) fail("receipt evidence sha256 is invalid");
  if (typeof loadEvidence !== "function") fail("loadEvidence is required");
  const evidence = await loadEvidence(evidencePath);
  if (!Buffer.isBuffer(evidence)) fail("evidence loader must return a Buffer");
  if (evidence.length !== receipt.evidence.bytes || sha256(evidence) !== receipt.evidence.sha256) fail("evidence binding mismatch");
  if (isReleaseFinalization) assertReleaseFinalizationEvidence(evidence, receipt);
  return {
    schema_version: "s22-receipt-audit/v1",
    task_id: receipt.task_id,
    attempt_id: receipt.attempt_id,
    status: receipt.status,
    receipt_bytes: bytes.length,
    evidence_bytes: evidence.length,
    evidence_binding: "IDENTICAL",
    audit_profile: isReleaseFinalization ? releaseFinalizationProfile : "legacy-binding-only",
  };
};

const sanitize = (error) => String(error?.message ?? error)
  .replaceAll(repositoryRoot, "<repository>")
  .replaceAll(repositoryRoot.replaceAll("\\", "/"), "<repository>");

const run = async (args) => {
  if (args.length < 6 || args[0] !== "--receipt" || args[2] !== "--task" || args[4] !== "--attempt") {
    fail("requires --receipt, --task, --attempt, and optional expected receipt identity");
  }
  let cursor = 6;
  let expectedReceiptBytes;
  let expectedReceiptSha256;
  if (args[cursor] === "--expected-bytes") {
    if (args[cursor + 2] !== "--expected-sha256" || args[cursor + 3] === undefined) {
      fail("expected receipt identity is incomplete");
    }
    expectedReceiptBytes = Number(args[cursor + 1]);
    expectedReceiptSha256 = args[cursor + 3];
    cursor += 4;
  }
  const allowLegacyBindingOnly = args[cursor] === "--allow-legacy-binding-only";
  if (allowLegacyBindingOnly) cursor += 1;
  if (cursor !== args.length) fail("receipt audit arguments are invalid");
  const receiptPath = args[1];
  if (!receiptPath.startsWith("work-products/evidence/section22/receipts/")) fail("receipt path is outside the receipt namespace");
  const receiptAbsolute = repositoryPath(receiptPath, "receipt path");
  return auditReceiptBytes({
    bytes: await readFile(receiptAbsolute),
    expectedTaskId: args[3],
    expectedAttemptId: args[5],
    expectedReceiptBytes,
    expectedReceiptSha256,
    loadEvidence: async (path) => readFile(repositoryPath(path, "evidence path")),
    allowLegacyBindingOnly,
  });
};

const isMain = typeof process.argv[1] === "string"
  && resolve(process.argv[1]).toLowerCase() === scriptPath.toLowerCase();

if (isMain) {
  try {
    process.stdout.write(`${JSON.stringify(await run(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${sanitize(error)}\n`);
    process.exitCode = 1;
  }
}
