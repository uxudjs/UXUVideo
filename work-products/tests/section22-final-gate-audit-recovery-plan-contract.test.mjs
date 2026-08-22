import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import test from "node:test";
import { validateCreateRequest } from "../scripts/execution-baseline.mjs";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const key = ({ repository, path }) => `${repository}:${path}`;
const candidateId = "s22-account-usage-final-gate-audit-recovery-20260822-11";
const taskId = "S22-R22";
const attemptId = "run-20260822-s22-r22-01";
const baselineRoot = "work-products/debug/execution-baselines/S22-R22";
const attemptRoot = `${baselineRoot}/${attemptId}`;
const requestPath = `${baselineRoot}/request-${attemptId}.json`;
const evidencePath = "work-products/evidence/section22/final-gate-audit-recovery-validation.md";
const receiptPath = "work-products/evidence/section22/receipts/S22-R22.json";
const tempPath = "work-products/tests/work/section22-r22-temp";
const todoPath = "work-products/todo.md";
const snapshotPath = `../debug/approval-baselines/${candidateId}/plan.md`;
const frozenTodoPath = "../evidence/section22/blocked-r22-todo.md";
const r22IntegrityPath = "../evidence/section22/r22-frozen-integrity.json";
const absolutePathPattern = /(?:^|[\s`'"])(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/mu;

const parseBlueprint = (plan) => {
  const match = plan.match(/<!-- S22_FINAL_GATE_AUDIT_RECOVERY_REQUEST_BLUEPRINT -->\s*```json\s*([\s\S]*?)\s*```/u);
  assert.ok(match, "missing R22 executable request blueprint");
  return JSON.parse(match[1]);
};

const todoState = (todo) => {
  const header = todo.match(/^> 状态：([^\r\n]+)$/m)?.[1];
  const approval = todo.match(/^- 批准状态：`(PENDING|APPROVED)`$/m)?.[1];
  const approvalRecord = todo.match(/^- 批准记录：`([^`]+)`$/m)?.[1];
  const rowState = todo.match(/^\| S22-R22 \| (pending|in_progress|completed|blocked) \| 0 \| R21 frozen-integrity \| 否 \|$/m)?.[1];
  const task = todo.match(/^- \[([ x])\] S22-R22[^\r\n]*\r?\n  - 状态：(pending|in_progress|completed|blocked)$/m);
  assert.ok(header && approval && approvalRecord && rowState && task, "incomplete R22 todo state");
  assert.equal(task[2], rowState);
  assert.equal(task[1], rowState === "completed" ? "x" : " ");
  if (approval === "PENDING") {
    assert.equal(approvalRecord, "PENDING");
    assert.equal(rowState, "pending");
    assert.equal(header, "PLAN CANDIDATE / PENDING APPROVAL / RELEASE HOLD");
  } else {
    assert.match(approvalRecord, /^USER_EXPLICIT \/ \d{4}-\d{2}-\d{2} \/ .+/u);
    assert.equal(header, {
      pending: "APPROVED / READY FOR BUILD / RELEASE HOLD",
      in_progress: "APPROVED / BUILD IN PROGRESS / RELEASE HOLD",
      completed: "LOCAL CANDIDATE / RELEASE HOLD",
      blocked: "APPROVED / BLOCKED / RELEASE HOLD",
    }[rowState]);
  }
  return { approval, rowState };
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

test("frozen R22 is one serial recovery task with a legal blocked ledger", async () => {
  const [plan, todo] = await Promise.all([read(snapshotPath), read(frozenTodoPath)]);
  assert.match(plan, /^# 第八恢复计划：SPEC 第 22 节最终终审恢复$/m);
  assert.match(plan, new RegExp(`> 候选 ID：\`${candidateId}\``));
  assert.match(plan, /`fast requested: false`/u);
  assert.match(plan, /执行策略：`serial`/u);
  assert.match(plan, /安全并发上限：1/u);
  assert.deepEqual([...plan.matchAll(/^### (S22-R\d{2})\b/gm)].map((match) => match[1]), [taskId]);
  todoState(todo);
  assert.doesNotMatch(`${plan}\n${todo}`, absolutePathPattern);
});

test("R22 blueprint binds a fresh no-replace attempt and narrow audit sequence", async () => {
  const blueprint = parseBlueprint(await read(snapshotPath));
  assert.equal(blueprint.schema_version, "s22-final-gate-audit-recovery-request-blueprints/v1");
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
    owner: "native-worker:s22_r22",
    attempt_id: attemptId,
    attempt_root: attemptRoot,
    request_path: requestPath,
    no_replace: true,
  });
  assert.deepEqual(task.orchestration_outputs.map(key), [`worker:${receiptPath}`]);
  assert.equal(task.validation_sequence.some((command) => command.includes("npm test") || command.includes("test:e2e") || command.includes("release:build")), false);
  assert.equal(task.validation_sequence.filter((command) => command.includes("section22-final-gate-audit.mjs --task-temp")).length, 2);
});

test("R22 inputs are unique and bind the frozen R21 evidence plus tested repair", async () => {
  const blueprint = parseBlueprint(await read(snapshotPath));
  const task = blueprint.tasks[0];
  const inputs = task.input_sets.flatMap((name) => blueprint.input_sets[name]).map(key);
  assert.equal(inputs.length, 27);
  assert.equal(new Set(inputs.map((entry) => entry.toLowerCase())).size, inputs.length);
  for (const required of [
    `worker:work-products/debug/approval-baselines/${candidateId}/plan.md`,
    "worker:work-products/evidence/section22/r21-frozen-integrity.json",
    "worker:work-products/debug/execution-baselines/S22-R21/run-20260822-s22-r21-01/manifest.json",
    "worker:work-products/evidence/section22/final-gate-completion-recovery-validation.md",
    "worker:work-products/evidence/section22/receipts/S22-R21.json",
    "worker:work-products/debug/s22-r21-post-scan-wrapper-contract.md",
    "worker:work-products/scripts/section22-final-gate-audit.mjs",
    "worker:work-products/tests/section22-final-gate-audit.test.mjs",
    "worker:work-products/tests/section22-final-gate-audit-recovery-plan-contract.test.mjs",
    "worker:work-products/tests/section21-rollback-drill.test.mjs",
  ]) assert.ok(inputs.includes(required), `missing input ${required}`);
});

test("R22 materialized request satisfies the real v2 validator and exact protection boundary", async () => {
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
  assert.deepEqual(task.targets.map(key), [
    `worker:${evidencePath}`,
    `worker:${tempPath}`,
  ]);
  assert.deepEqual(task.repositories.find(({ id }) => id === "worker").exclude, [
    todoPath,
    evidencePath,
    receiptPath,
    baselineRoot,
    attemptRoot,
    tempPath,
  ]);
  assert.deepEqual(task.repositories.find(({ id }) => id === "pages").exclude, [
    ".next",
    "out",
    "release",
    "tsconfig.tsbuildinfo",
    "work-products/tests/artifacts/playwright",
    "work-products/tests/work/kvideo-webview-compatibility",
    "work-products/tests/work/pwa-release",
    "work-products/tests/work/release-manifest",
    "work-products/tests/work/section21-candidate-draft",
  ]);
  assert.deepEqual(task.prestate.create_must_be_regular_files, [`worker:${requestPath}`]);
  assert.deepEqual(task.prestate.create_must_be_empty_directories, [`worker:${tempPath}`]);
  assert.equal(request.environment.length, 8);
  assert.equal(new Set(request.environment.map(({ key: environmentKey }) => environmentKey.toLowerCase())).size, 8);
  const caseAlias = structuredClone(request);
  caseAlias.inputs.push({ repository: "worker", path: "WORK-PRODUCTS/SPEC.MD" });
  assert.throws(() => validateCreateRequest(caseAlias), /duplicate or case alias/u);
});

test("R22 declared resources have the expected current file types", async () => {
  const blueprint = parseBlueprint(await read(snapshotPath));
  const task = blueprint.tasks[0];
  const bases = {
    worker: new URL("../../", import.meta.url),
    pages: new URL("../../../UXUV-Pages/", import.meta.url),
  };
  const directories = new Set(blueprint.captured_resource_prestate.directory_protected_inputs);
  const inputs = task.input_sets.flatMap((name) => blueprint.input_sets[name]);
  const protectedInputs = blueprint.protected_input_sets[task.protected_input_set];
  const toolchain = blueprint.toolchain_profiles[task.toolchain_profile];
  for (const resource of [...inputs, ...protectedInputs, ...toolchain]) {
    const metadata = await lstat(new URL(resource.path, bases[resource.repository]));
    assert.equal(metadata.isSymbolicLink(), false, `link resource ${key(resource)}`);
    assert.equal(directories.has(key(resource)) ? metadata.isDirectory() : metadata.isFile(), true, `resource type ${key(resource)}`);
  }
});

test("R21 and blocked R22 frozen integrity preserve raw bytes", async () => {
  const integrity = JSON.parse(await read("../evidence/section22/r21-frozen-integrity.json"));
  assert.deepEqual(integrity.subject, {
    task_id: "S22-R21",
    attempt_id: "run-20260822-s22-r21-01",
    status: "blocked",
  });
  const workerRoot = new URL("../../", import.meta.url);
  for (const file of integrity.files) {
    const bytes = await readFile(new URL(file.path, workerRoot));
    assert.equal(bytes.length, file.bytes, `R21 byte length ${file.path}`);
    assert.equal(sha256(bytes), file.sha256, `R21 digest ${file.path}`);
  }
  const r22Integrity = JSON.parse(await read(r22IntegrityPath));
  assert.deepEqual(r22Integrity.subject, {
    task_id: "S22-R22",
    attempt_id: "run-20260822-s22-r22-01",
    status: "blocked",
    receipt_semantic_status: "completed_but_non_authoritative_after_readback_wrapper_failure",
  });
  for (const file of r22Integrity.files) {
    const bytes = await readFile(new URL(file.path, workerRoot));
    assert.equal(bytes.length, file.bytes, `R22 byte length ${file.path}`);
    assert.equal(sha256(bytes), file.sha256, `R22 digest ${file.path}`);
  }
});
