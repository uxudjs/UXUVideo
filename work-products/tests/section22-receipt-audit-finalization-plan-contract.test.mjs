import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import test from "node:test";
import { validateCreateRequest } from "../scripts/execution-baseline.mjs";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const readBytes = (relative) => readFile(new URL(relative, import.meta.url));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const key = ({ repository, path }) => `${repository}:${path}`;
const candidateId = "s22-account-usage-receipt-audit-finalization-20260822-12";
const taskId = "S22-R23";
const attemptId = "run-20260822-s22-r23-01";
const baselineRoot = "work-products/debug/execution-baselines/S22-R23";
const attemptRoot = `${baselineRoot}/${attemptId}`;
const requestPath = `${baselineRoot}/request-${attemptId}.json`;
const evidencePath = "work-products/evidence/section22/final-receipt-audit-recovery-validation.md";
const receiptPath = "work-products/evidence/section22/receipts/S22-R23.json";
const tempPath = "work-products/tests/work/section22-r23-temp";
const snapshotPath = `../debug/approval-baselines/${candidateId}/plan.md`;
const manifestPath = `../debug/execution-baselines/${taskId}/${attemptId}/manifest.json`;
const absolutePathPattern = /(?:^|[\s`'"])(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/mu;

const parseBlueprint = (plan) => {
  const match = plan.match(/<!-- S22_RECEIPT_AUDIT_FINALIZATION_REQUEST_BLUEPRINT -->\s*```json\s*([\s\S]*?)\s*```/u);
  assert.ok(match, "missing R23 executable request blueprint");
  return JSON.parse(match[1]);
};

const materializeRequest = (blueprint) => {
  const task = blueprint.tasks[0];
  const profile = blueprint.environment_profiles[task.environment_profile];
  return {
    schema_version: blueprint.request_schema,
    task_id: task.task_id,
    attempt_id: task.attempt_id,
    owner: task.owner,
    no_replace: task.no_replace,
    attempt_root: task.attempt_root,
    targets: task.targets,
    inputs: task.input_sets.flatMap((name) => blueprint.input_sets[name]),
    protected_inputs: blueprint.protected_input_sets[task.protected_input_set],
    orchestration_outputs: task.orchestration_outputs,
    repositories: task.repositories,
    toolchain: {
      node_version: blueprint.runtime.node_version,
      entrypoints: blueprint.toolchain_profiles[task.toolchain_profile],
    },
    environment: [
      ...profile.fixed,
      ...profile.task_temp_sha256.map((environmentKey) => ({
        key: environmentKey,
        state: "present",
        sensitive: true,
        sha256: "0".repeat(64),
      })),
      ...profile.absent.map((environmentKey) => ({
        key: environmentKey,
        state: "absent",
        sensitive: false,
      })),
    ],
    generated_namespaces: task.generated_namespaces,
  };
};

test("R23 is one serial task with a legal approval and execution ledger", async () => {
  const [plan, receiptText] = await Promise.all([read(snapshotPath), read("../evidence/section22/receipts/S22-R23.json")]);
  const receipt = JSON.parse(receiptText);
  assert.match(plan, /^# 第九恢复计划：SPEC 第 22 节 receipt 终态收口$/m);
  assert.match(plan, new RegExp(`> 候选 ID：\`${candidateId}\``));
  assert.match(plan, /执行策略：`serial`/u);
  assert.match(plan, /安全并发上限：1/u);
  assert.deepEqual([...plan.matchAll(/^### (S22-R\d{2})\b/gm)].map((match) => match[1]), [taskId]);
  assert.deepEqual({ task_id: receipt.task_id, attempt_id: receipt.attempt_id, status: receipt.status }, {
    task_id: taskId, attempt_id: attemptId, status: "completed",
  });
  assert.doesNotMatch(`${plan}\n${receiptText}`, absolutePathPattern);
});

test("R23 blueprint binds one fresh no-replace finalization attempt", async () => {
  const blueprint = parseBlueprint(await read(snapshotPath));
  assert.equal(blueprint.schema_version, "s22-receipt-audit-finalization-request-blueprints/v1");
  assert.equal(blueprint.request_schema, "s22-execution-baseline-request/v2");
  assert.equal(blueprint.tasks.length, 1);
  const task = blueprint.tasks[0];
  assert.deepEqual({
    task_id: task.task_id,
    owner: task.owner,
    attempt_id: task.attempt_id,
    attempt_root: task.attempt_root,
    request_path: task.request_path,
    no_replace: task.no_replace,
  }, {
    task_id: taskId,
    owner: "native-worker:s22_r23",
    attempt_id: attemptId,
    attempt_root: attemptRoot,
    request_path: requestPath,
    no_replace: true,
  });
  assert.deepEqual(task.orchestration_outputs.map(key), [`worker:${receiptPath}`]);
  assert.deepEqual(task.generated_namespaces, []);
  assert.equal(task.validation_sequence.some((command) => command.includes("npm test") || command.includes("test:e2e") || command.includes("rollback-drill")), false);
  assert.match(task.validation_sequence.at(-1), /tested raw-byte audit with pre-serialized expected identity/u);
});

test("R23 unique inputs bind frozen R22 and the tested byte-safe repair", async () => {
  const blueprint = parseBlueprint(await read(snapshotPath));
  const task = blueprint.tasks[0];
  const inputs = task.input_sets.flatMap((name) => blueprint.input_sets[name]).map(key);
  assert.equal(inputs.length, 24);
  assert.equal(new Set(inputs.map((entry) => entry.toLowerCase())).size, inputs.length);
  for (const required of [
    `worker:work-products/debug/approval-baselines/${candidateId}/plan.md`,
    "worker:work-products/evidence/section22/r21-frozen-integrity.json",
    "worker:work-products/evidence/section22/r22-frozen-integrity.json",
    "worker:work-products/evidence/section22/receipts/S22-R22.json",
    "worker:work-products/debug/execution-baselines/S22-R22/receipt-readback-output-normalization.md",
    "worker:work-products/scripts/section22-receipt-audit.mjs",
    "worker:work-products/tests/section22-receipt-readback-audit.test.mjs",
    "worker:work-products/tests/section22-receipt-audit-finalization-plan-contract.test.mjs",
  ]) assert.ok(inputs.includes(required), `missing input ${required}`);
});

test("R23 materialized request satisfies the real v2 validator and exact protection boundary", async () => {
  const blueprint = parseBlueprint(await read(snapshotPath));
  const task = blueprint.tasks[0];
  const request = materializeRequest(blueprint);
  assert.doesNotThrow(() => validateCreateRequest(request));
  assert.deepEqual(request.protected_inputs.map(key), [
    "worker:_worker.js",
    "pages:package.json",
    "pages:work-products/tests/iptv-retirement-contract.test.mjs",
    "pages:work-products/tests/pages-deployment.test.mjs",
    "pages:work-products/tests/repository-test-isolation.test.mjs",
    "pages:work-products/tests/fixtures/ui-review/section21-candidate",
    "pages:release/current",
  ]);
  assert.deepEqual(task.targets.map(key), [`worker:${evidencePath}`, `worker:${tempPath}`]);
  assert.deepEqual(task.orchestration_outputs.map(key), [`worker:${receiptPath}`]);
  assert.deepEqual(task.prestate.create_must_be_regular_files, [`worker:${requestPath}`]);
  assert.deepEqual(task.prestate.create_must_be_empty_directories, [`worker:${tempPath}`]);
  assert.equal(request.environment.length, 8);
  assert.equal(new Set(request.environment.map(({ key: environmentKey }) => environmentKey.toLowerCase())).size, 8);
  const alias = structuredClone(request);
  alias.inputs.push({ repository: "worker", path: "WORK-PRODUCTS/SPEC.MD" });
  assert.throws(() => validateCreateRequest(alias), /duplicate or case alias/u);
});

test("R23 declared resources have the expected current file types", async () => {
  const blueprint = parseBlueprint(await read(snapshotPath));
  const task = blueprint.tasks[0];
  const bases = {
    worker: new URL("../../", import.meta.url),
    pages: new URL("../../../UXUV-Pages/", import.meta.url),
  };
  const directories = new Set(blueprint.captured_resource_prestate.directory_protected_inputs);
  const resources = [
    ...task.input_sets.flatMap((name) => blueprint.input_sets[name]),
    ...blueprint.protected_input_sets[task.protected_input_set],
    ...blueprint.toolchain_profiles[task.toolchain_profile],
  ];
  for (const resource of resources) {
    const metadata = await lstat(new URL(resource.path, bases[resource.repository]));
    assert.equal(metadata.isSymbolicLink(), false, `link resource ${key(resource)}`);
    assert.equal(directories.has(key(resource)) ? metadata.isDirectory() : metadata.isFile(), true, `resource type ${key(resource)}`);
  }
});

test("R22 frozen integrity and R23 approval snapshot preserve raw bytes", async () => {
  const integrity = JSON.parse(await read("../evidence/section22/r22-frozen-integrity.json"));
  assert.equal(integrity.subject.task_id, "S22-R22");
  assert.equal(integrity.subject.status, "blocked");
  const workerRoot = new URL("../../", import.meta.url);
  for (const file of integrity.files) {
    const bytes = await readFile(new URL(file.path, workerRoot));
    assert.equal(bytes.length, file.bytes, `R22 byte length ${file.path}`);
    assert.equal(sha256(bytes), file.sha256, `R22 digest ${file.path}`);
  }
  const [snapshot, manifest] = await Promise.all([readBytes(snapshotPath), read(manifestPath).then(JSON.parse)]);
  const identity = manifest.inputs.find(({ repository, path }) => (
    repository === "worker" && path === `work-products/debug/approval-baselines/${candidateId}/plan.md`
  ))?.identity;
  assert.ok(identity, "R23 manifest must bind its approval snapshot");
  assert.equal(snapshot.length, identity.size, "R23 snapshot byte length");
  assert.equal(sha256(snapshot), identity.sha256, "R23 snapshot digest");
});
