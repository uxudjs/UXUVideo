import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { auditReceiptBytes } from "../scripts/section22-receipt-audit.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const validation = [
  "worker-full-gate",
  "pages-full-gate",
  "paired-final-gate",
  "section22-rollback",
  "candidate-hygiene",
  "evidence-audit",
  "terminal-verify",
].map((id) => ({ id, command: id, repository: "worker", exit_code: 0, result: "green" }));

const fixture = (evidence) => ({
  schema_version: "s22-task-receipt/v1",
  audit_profile: "section22-release-finalization/v1",
  task_id: "S22-R23",
  attempt_id: "run-20260822-s22-r23-01",
  status: "completed",
  baseline: {
    create_exit_code: 0,
    prewrite_exit_code: 0,
    inputs_exit_code: 0,
    terminal_exit_code: 0,
    approved_plan_snapshot: "identical",
  },
  validation,
  evidence: {
    path: "work-products/evidence/section22/example.md",
    bytes: evidence.length,
    sha256: sha256(evidence),
  },
  terminal: { verification: "green" },
  authorization: {
    commit: false,
    push: false,
    deploy: false,
    network: false,
    remote_changes: false,
  },
});

test("receipt byte audit accepts one terminal LF and verifies evidence bytes", async () => {
  const evidence = Buffer.from([
    "# S22-R23 release validation",
    "",
    "- 任务：`S22-R23`",
    "- attempt：`run-20260822-s22-r23-01`",
    "- schema：`s22-release-finalization-validation/v1`",
    "- 本文件结论：`VALIDATIONS GREEN / LOCAL CANDIDATE / RELEASE HOLD`",
    "",
  ].join("\n"), "utf8");
  const bytes = Buffer.from(`${JSON.stringify(fixture(evidence), null, 2)}\n`, "utf8");
  const result = await auditReceiptBytes({
    bytes,
    expectedTaskId: "S22-R23",
    expectedAttemptId: "run-20260822-s22-r23-01",
    expectedReceiptBytes: bytes.length,
    expectedReceiptSha256: sha256(bytes),
    loadEvidence: async (path) => {
      assert.equal(path, "work-products/evidence/section22/example.md");
      return evidence;
    },
  });
  assert.deepEqual(result, {
    schema_version: "s22-receipt-audit/v1",
    task_id: "S22-R23",
    attempt_id: "run-20260822-s22-r23-01",
    status: "completed",
    receipt_bytes: bytes.length,
    evidence_bytes: evidence.length,
    evidence_binding: "IDENTICAL",
    audit_profile: "section22-release-finalization/v1",
  });
});

test("receipt byte audit rejects host-output newline and evidence drift", async () => {
  const evidence = Buffer.from([
    "# S22-R23 release validation",
    "",
    "- 任务：`S22-R23`",
    "- attempt：`run-20260822-s22-r23-01`",
    "- schema：`s22-release-finalization-validation/v1`",
    "- 本文件结论：`VALIDATIONS GREEN / LOCAL CANDIDATE / RELEASE HOLD`",
    "",
  ].join("\n"), "utf8");
  const canonical = Buffer.from(`${JSON.stringify(fixture(evidence), null, 2)}\n`, "utf8");
  await assert.rejects(
    auditReceiptBytes({
      bytes: Buffer.concat([canonical, Buffer.from("\n")]),
      expectedTaskId: "S22-R23",
      expectedAttemptId: "run-20260822-s22-r23-01",
      loadEvidence: async () => evidence,
    }),
    /exactly one terminal LF/u,
  );
  await assert.rejects(
    auditReceiptBytes({
      bytes: canonical,
      expectedTaskId: "S22-R23",
      expectedAttemptId: "run-20260822-s22-r23-01",
      loadEvidence: async () => Buffer.from("drift\n"),
    }),
    /evidence binding mismatch/u,
  );
  await assert.rejects(
    auditReceiptBytes({
      bytes: canonical,
      expectedTaskId: "S22-R23",
      expectedAttemptId: "run-20260822-s22-r23-01",
      expectedReceiptBytes: canonical.length,
      expectedReceiptSha256: "0".repeat(64),
      loadEvidence: async () => evidence,
    }),
    /receipt byte identity mismatch/u,
  );
});

test("receipt audit rejects arbitrary validation and unsafe or semantically unrelated evidence", async () => {
  const validEvidence = Buffer.from([
    "# S22-R23 release validation",
    "",
    "- 任务：`S22-R23`",
    "- attempt：`run-20260822-s22-r23-01`",
    "- schema：`s22-release-finalization-validation/v1`",
    "- 本文件结论：`VALIDATIONS GREEN / LOCAL CANDIDATE / RELEASE HOLD`",
    "",
  ].join("\n"), "utf8");
  const invalidReceipt = fixture(validEvidence);
  invalidReceipt.validation = [{ id: "focused-audit", command: "focused audit", repository: "worker", exit_code: 0, result: "green" }];
  await assert.rejects(
    auditReceiptBytes({
      bytes: Buffer.from(`${JSON.stringify(invalidReceipt, null, 2)}\n`),
      expectedTaskId: "S22-R23",
      expectedAttemptId: "run-20260822-s22-r23-01",
      loadEvidence: async () => validEvidence,
    }),
    /validation ids/u,
  );

  const syntheticBearer = [
    "Authorization:",
    "Bearer",
    ["abcdefghijklm", "nopqrstuvwxyz", "123456"].join(""),
  ].join(" ");

  for (const [name, evidence, pattern] of [
    ["unrelated", Buffer.from("evidence\n"), /evidence identity/u],
    ["machine path", Buffer.from(`${validEvidence.toString("utf8")}C:\\Code\\private\n`), /machine path/u],
    ["secret", Buffer.from(`${validEvidence.toString("utf8")}${syntheticBearer}\n`), /credible secret/u],
  ]) {
    const receipt = fixture(evidence);
    await assert.rejects(
      auditReceiptBytes({
        bytes: Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`),
        expectedTaskId: "S22-R23",
        expectedAttemptId: "run-20260822-s22-r23-01",
        loadEvidence: async () => evidence,
      }),
      pattern,
      name,
    );
  }
});

test("receipt audit CLI byte-safely validates the retained R22 receipt", async () => {
  const receipt = await readFile(new URL("../evidence/section22/receipts/S22-R22.json", import.meta.url));
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL("../scripts/section22-receipt-audit.mjs", import.meta.url)),
    "--receipt",
    "work-products/evidence/section22/receipts/S22-R22.json",
    "--task",
    "S22-R22",
    "--attempt",
    "run-20260822-s22-r22-01",
    "--expected-bytes",
    String(receipt.length),
    "--expected-sha256",
    sha256(receipt),
    "--allow-legacy-binding-only",
  ], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), {
    schema_version: "s22-receipt-audit/v1",
    task_id: "S22-R22",
    attempt_id: "run-20260822-s22-r22-01",
    status: "completed",
    receipt_bytes: 4429,
    evidence_bytes: 4750,
    evidence_binding: "IDENTICAL",
    audit_profile: "legacy-binding-only",
  });
  assert.equal(receipt.at(-1), 0x0a);
  assert.notEqual(receipt.at(-2), 0x0a);
});
