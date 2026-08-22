import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import test from "node:test";
import { validateCreateRequest } from "../scripts/execution-baseline.mjs";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const readBytes = (relative) => readFile(new URL(relative, import.meta.url));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const candidateId = "s22-account-usage-final-gate-completion-recovery-20260822-10";
const taskId = "S22-R21";
const attemptId = "run-20260822-s22-r21-01";
const baselineRoot = "work-products/debug/execution-baselines/S22-R21";
const attemptRoot = baselineRoot + "/" + attemptId;
const requestPath = baselineRoot + "/request-" + attemptId + ".json";
const evidencePath = "work-products/evidence/section22/final-gate-completion-recovery-validation.md";
const receiptPath = "work-products/evidence/section22/receipts/S22-R21.json";
const tempPath = "work-products/tests/work/section22-r21-temp";
const todoPath = "work-products/todo.md";
const r20IntegrityPath = "work-products/evidence/section22/r20-frozen-integrity.json";
const frozenPlanPath = "../debug/approval-baselines/" + candidateId + "/plan.md";
const frozenTodoPath = "../evidence/section22/blocked-r21-todo.md";
const r21IntegrityPath = "../evidence/section22/r21-frozen-integrity.json";
const absolutePathPattern = /(?:^|[\s`'"])(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/mu;
const key = ({ repository, path }) => repository + ":" + path;

const assertCanonicalRequestPath = (path, label) => {
  assert.equal(typeof path, "string", label + " type");
  assert.notEqual(path.length, 0, label + " empty");
  assert.equal(path.includes("\\"), false, label + " backslash");
  assert.equal(path.startsWith("/"), false, label + " absolute");
  assert.equal(/^[A-Za-z]:/u.test(path), false, label + " drive");
  assert.equal(/[*?\[\]]/u.test(path), false, label + " glob");
  assert.equal(path.split("/").some((segment) => segment === "" || segment === "." || segment === ".."), false, label + " segment");
};

const pathsOverlap = (left, right) => {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  return a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
};

const parseBlueprint = (plan) => {
  const match = plan.match(/<!-- S22_FINAL_GATE_COMPLETION_RECOVERY_REQUEST_BLUEPRINT -->\s*```json\s*([\s\S]*?)\s*```/u);
  assert.ok(match, "missing R21 executable request blueprint");
  return JSON.parse(match[1]);
};

const todoState = (todo) => {
  const header = todo.match(/^> 状态：([^\r\n]+)$/m)?.[1];
  const approval = todo.match(/^- 批准状态：`(PENDING|APPROVED)`$/m)?.[1];
  const approvalRecord = todo.match(/^- 批准记录：`([^`]+)`$/m)?.[1];
  const rowState = todo.match(/^\| S22-R21 \| (pending|in_progress|completed|blocked) \| 0 \| 无 \| 否 \|$/m)?.[1];
  const task = todo.match(/^- \[([ x])\] S22-R21[^\r\n]*\r?\n  - 状态：(pending|in_progress|completed|blocked)$/m);
  assert.ok(header && approval && approvalRecord && rowState && task, "incomplete R21 todo state");
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

const assertActiveCandidateState = (state) => {
  if (state.approval === "PENDING") {
    assert.equal(state.rowState, "pending");
    return;
  }
  assert.equal(state.approval, "APPROVED");
  assert.ok(["pending", "in_progress", "completed", "blocked"].includes(state.rowState));
};

test("R21 candidate is one complete serial task with a legal todo state", async () => {
  const [plan, todo] = await Promise.all([read(frozenPlanPath), read(frozenTodoPath)]);
  assert.match(plan, /^# 第七恢复计划：SPEC 第 22 节最终本地门禁完成$/m);
  assert.match(plan, new RegExp("> 候选 ID：`" + candidateId + "`"));
  assert.match(plan, /`fast requested: false`/);
  assert.match(plan, /执行策略：`serial`/);
  assert.match(plan, /安全并发上限：1/);
  assert.deepEqual([...plan.matchAll(/^### (S22-R\d{2})\b/gm)].map((match) => match[1]), [taskId]);
  assertActiveCandidateState(todoState(todo));
  assert.doesNotMatch(plan + "\n" + todo, absolutePathPattern);
});

test("R21 blueprint binds a fresh no-replace attempt and exact orchestration outputs", async () => {
  const blueprint = parseBlueprint(await read(frozenPlanPath));
  assert.equal(blueprint.schema_version, "s22-final-gate-completion-recovery-request-blueprints/v1");
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
    owner: "native-worker:s22_r21",
    attempt_id: attemptId,
    attempt_root: attemptRoot,
    request_path: requestPath,
    no_replace: true,
  });
  assert.equal(JSON.stringify(task).includes("run-20260822-s22-r20-01"), false);
  assert.deepEqual(task.orchestration_outputs.map(key), ["worker:" + receiptPath]);
});

test("active final-gate request blueprint has unique flattened inputs", async () => {
  const blueprint = parseBlueprint(await read(frozenPlanPath));
  const task = blueprint.tasks[0];
  const inputs = task.input_sets.flatMap((name) => blueprint.input_sets[name]).map(key);
  const seen = new Set();
  const duplicates = inputs.filter((input) => seen.has(input) || !seen.add(input));
  assert.deepEqual(duplicates, []);
  assert.equal(inputs.length, 49);
  for (const required of [
    "worker:work-products/debug/approval-baselines/" + candidateId + "/plan.md",
    "worker:work-products/debug/approval-baselines/s22-account-usage-final-gate-completion-recovery-20260822-09/plan.md",
    "worker:work-products/evidence/section22/blocked-r20-todo.md",
    "worker:" + r20IntegrityPath,
    "worker:work-products/debug/execution-baselines/S22-R20/request-run-20260822-s22-r20-01.json",
    "worker:work-products/evidence/section22/receipts/S22-R20.json",
    "worker:work-products/evidence/section22/final-gate-completion-validation.md",
    "worker:work-products/debug/s22-r20-duplicate-input-contract.md",
    "worker:work-products/tests/section22-final-gate-completion-plan-contract.test.mjs",
    "worker:work-products/tests/section22-final-gate-completion-recovery-plan-contract.test.mjs",
  ]) assert.ok(inputs.includes(required), "missing input " + required);
});

test("R21 blueprint preserves protected inputs and exact no-replace prestate", async () => {
  const blueprint = parseBlueprint(await read(frozenPlanPath));
  const task = blueprint.tasks[0];
  assert.deepEqual(blueprint.protected_input_sets[task.protected_input_set].map(key), [
    "pages:package.json",
    "pages:work-products/tests/iptv-retirement-contract.test.mjs",
    "pages:work-products/tests/pages-deployment.test.mjs",
    "pages:work-products/tests/repository-test-isolation.test.mjs",
    "pages:work-products/tests/fixtures/ui-review/section21-candidate",
  ]);
  assert.ok(task.targets.map(key).includes("worker:" + evidencePath));
  assert.ok(task.targets.map(key).includes("worker:" + tempPath));
  assert.ok(task.prestate.initial_must_be_missing.includes("worker:" + baselineRoot));
  assert.ok(task.prestate.initial_must_be_missing.includes("worker:" + attemptRoot));
  assert.deepEqual(task.prestate.create_must_be_regular_files, ["worker:" + requestPath]);
  assert.deepEqual(task.prestate.create_must_be_empty_directories, ["worker:" + tempPath]);
  assert.deepEqual(task.prestate.ports_must_be_free, [4173, 4174]);
  assert.equal(task.validation_sequence[0], "Worker node --test work-products/tests/section22-final-gate-completion-recovery-plan-contract.test.mjs");
  assert.ok(task.validation_sequence.includes("Worker npm test"));
  assert.ok(task.validation_sequence.includes("Pages npm test"));
});

test("R21 materialized request satisfies the complete v2 static contract", async () => {
  const blueprint = parseBlueprint(await read(frozenPlanPath));
  const task = blueprint.tasks[0];
  const inputs = task.input_sets.flatMap((name) => blueprint.input_sets[name]);
  const protectedInputs = blueprint.protected_input_sets[task.protected_input_set];
  const toolchain = blueprint.toolchain_profiles[task.toolchain_profile];
  const environmentProfile = blueprint.environment_profiles[task.environment_profile];
  const environment = [
    ...environmentProfile.fixed,
    ...environmentProfile.task_temp_sha256.map((environmentKey) => ({
      key: environmentKey,
      state: "present",
      sensitive: true,
      sha256: "0".repeat(64),
    })),
    ...environmentProfile.absent.map((environmentKey) => ({ key: environmentKey, state: "absent", sensitive: false })),
  ];
  const request = {
    schema_version: blueprint.request_schema,
    task_id: task.task_id,
    attempt_id: task.attempt_id,
    owner: task.owner,
    no_replace: task.no_replace,
    attempt_root: task.attempt_root,
    targets: task.targets,
    inputs,
    protected_inputs: protectedInputs,
    orchestration_outputs: task.orchestration_outputs,
    repositories: task.repositories,
    toolchain: { node_version: blueprint.runtime.node_version, entrypoints: toolchain },
    environment,
    generated_namespaces: task.generated_namespaces,
  };
  assert.deepEqual(Object.keys(request).sort(), [
    "attempt_id", "attempt_root", "environment", "generated_namespaces", "inputs",
    "no_replace", "orchestration_outputs", "owner", "protected_inputs", "repositories",
    "schema_version", "targets", "task_id", "toolchain",
  ]);
  assert.equal(environment.length, 12);
  assert.equal(new Set(environment.map((entry) => entry.key.toLowerCase())).size, environment.length);
  assert.equal(environment.every((entry) => [
    "key,sensitive,state,value",
    "key,sensitive,sha256,state",
    "key,sensitive,state",
  ].includes(Object.keys(entry).sort().join(","))), true);
  assert.equal(environmentProfile.preflight_absent_aliases.every((alias) => !environment.some((entry) => entry.key === alias)), true);

  const resources = [...task.targets, ...inputs, ...protectedInputs, ...task.orchestration_outputs];
  for (const [index, resource] of resources.entries()) {
    assertCanonicalRequestPath(resource.path, "resource " + index);
    if (resource.repository === "worker") assert.equal(pathsOverlap(resource.path, todoPath), false, "resource captures todo");
  }
  for (let left = 0; left < resources.length; left += 1) {
    for (let right = left + 1; right < resources.length; right += 1) {
      if (resources[left].repository !== resources[right].repository) continue;
      assert.equal(pathsOverlap(resources[left].path, resources[right].path), false, "overlapping request resources");
    }
  }
  for (const [index, entrypoint] of toolchain.entries()) {
    assertCanonicalRequestPath(entrypoint.path, "toolchain entrypoint " + index);
    if (entrypoint.repository === "worker") assert.equal(pathsOverlap(entrypoint.path, todoPath), false, "toolchain captures todo");
  }
  assertCanonicalRequestPath(task.attempt_root, "attempt root");
  assertCanonicalRequestPath(task.request_path, "request path");
  assert.equal(pathsOverlap(task.attempt_root, todoPath), false);
  assert.equal(pathsOverlap(task.request_path, todoPath), false);

  const expectedExclusions = new Map(task.repositories.map(({ id }) => [id, []]));
  expectedExclusions.get("worker").push(todoPath, baselineRoot, task.attempt_root, ...task.orchestration_outputs.map(({ path }) => path));
  for (const target of task.targets) expectedExclusions.get(target.repository).push(target.path);
  for (const repository of task.repositories) {
    assert.deepEqual([...repository.exclude].sort(), [...new Set(expectedExclusions.get(repository.id))].sort(), repository.id + " exclusions");
    for (const [index, exclusion] of repository.exclude.entries()) {
      assertCanonicalRequestPath(exclusion, repository.id + " exclusion " + index);
      if (repository.id === "worker" && pathsOverlap(exclusion, todoPath)) assert.equal(exclusion, todoPath, "broad todo exclusion");
    }
  }
  assert.equal(task.repositories.find(({ id }) => id === "worker").exclude.filter((path) => path === todoPath).length, 1);
  for (const namespace of task.generated_namespaces) {
    assertCanonicalRequestPath(namespace.parent, "generated namespace parent");
    assert.equal(/[*?\[\]\\/]/u.test(namespace.prefix), false);
  }

  assert.doesNotThrow(() => validateCreateRequest(request));
  const caseAlias = structuredClone(request);
  caseAlias.inputs.push({ repository: "worker", path: "_WORKER.JS" });
  assert.throws(() => validateCreateRequest(caseAlias), /duplicate or case alias/u);
  const uncoveredTarget = structuredClone(request);
  uncoveredTarget.repositories.find(({ id }) => id === "worker").exclude = [todoPath, baselineRoot, attemptRoot];
  assert.throws(() => validateCreateRequest(uncoveredTarget), /not covered by repository exclusions/u);
});

test("R21 immutable inputs, protected inputs, and toolchain entrypoints have declared current types", async () => {
  const blueprint = parseBlueprint(await read(frozenPlanPath));
  const task = blueprint.tasks[0];
  const missing = new Set(blueprint.captured_resource_prestate.missing_inputs);
  const directories = new Set(blueprint.captured_resource_prestate.directory_protected_inputs);
  const repositoryBase = {
    worker: new URL("../../", import.meta.url),
    pages: new URL("../../../UXUV-Pages/", import.meta.url),
  };
  const inputs = task.input_sets.flatMap((name) => blueprint.input_sets[name]);
  for (const resource of inputs) {
    const resourceKey = key(resource);
    const url = new URL(resource.path, repositoryBase[resource.repository]);
    if (missing.has(resourceKey)) {
      await assert.rejects(lstat(url), { code: "ENOENT" });
    } else {
      assert.equal((await lstat(url)).isFile(), true, "input not file " + resourceKey);
    }
  }
  for (const resource of blueprint.protected_input_sets[task.protected_input_set]) {
    const resourceKey = key(resource);
    const metadata = await lstat(new URL(resource.path, repositoryBase[resource.repository]));
    assert.equal(directories.has(resourceKey) ? metadata.isDirectory() : metadata.isFile(), true, "protected type " + resourceKey);
  }
  for (const resource of blueprint.toolchain_profiles[task.toolchain_profile]) {
    assert.equal((await lstat(new URL(resource.path, repositoryBase[resource.repository]))).isFile(), true, "toolchain type " + key(resource));
  }
});

test("R21 blocked attempt and predecessor remain raw-byte frozen", async () => {
  const [plan, blockedTodo, requestRaw, receiptRaw, evidence, integrityRaw, r21IntegrityRaw] = await Promise.all([
    readBytes(frozenPlanPath),
    read("../evidence/section22/blocked-r20-todo.md"),
    read("../debug/execution-baselines/S22-R20/request-run-20260822-s22-r20-01.json"),
    read("../evidence/section22/receipts/S22-R20.json"),
    read("../evidence/section22/final-gate-completion-validation.md"),
    read("../evidence/section22/r20-frozen-integrity.json"),
    read(r21IntegrityPath),
  ]);
  assert.ok(plan.length > 0);
  assert.match(blockedTodo, /^\| S22-R20 \| blocked \| 0 \| 无 \| 否 \|$/m);
  const request = JSON.parse(requestRaw);
  const duplicate = "worker:work-products/debug/s22-r19-in-progress-mirror-contract.md";
  assert.equal(request.inputs.map(key).filter((input) => input === duplicate).length, 2);
  const receipt = JSON.parse(receiptRaw);
  assert.equal(receipt.status, "blocked");
  assert.equal(receipt.worker_launched, false);
  assert.equal(receipt.baseline.create_exit_code, 1);
  assert.match(evidence, /attempt root：missing/u);

  const integrity = JSON.parse(integrityRaw);
  assert.equal(integrity.schema_version, "s22-frozen-integrity/v1");
  assert.deepEqual(integrity.subject, {
    task_id: "S22-R20",
    attempt_id: "run-20260822-s22-r20-01",
    status: "blocked",
  });
  assert.equal(new Set(integrity.files.map(({ path }) => path.toLowerCase())).size, integrity.files.length);
  for (const file of integrity.files) {
    const raw = await readFile(new URL("../../" + file.path, import.meta.url));
    assert.equal(raw.length, file.bytes, "byte length " + file.path);
    assert.equal(sha256(raw), file.sha256, "sha256 " + file.path);
  }
  assert.deepEqual(integrity.terminal, {
    attempt_root: "missing",
    staging_root: "missing",
    task_temp: "present-empty",
  });

  const r21Integrity = JSON.parse(r21IntegrityRaw);
  assert.deepEqual(r21Integrity.subject, {
    task_id: "S22-R21",
    attempt_id: "run-20260822-s22-r21-01",
    status: "blocked",
  });
  assert.equal(new Set(r21Integrity.files.map(({ path }) => path.toLowerCase())).size, r21Integrity.files.length);
  for (const file of r21Integrity.files) {
    const raw = await readFile(new URL("../../" + file.path, import.meta.url));
    assert.equal(raw.length, file.bytes, "R21 byte length " + file.path);
    assert.equal(sha256(raw), file.sha256, "R21 sha256 " + file.path);
  }
  const frozenR21Todo = await read(frozenTodoPath);
  assert.match(frozenR21Todo, /^\| S22-R21 \| blocked \| 0 \| 无 \| 否 \|$/m);
  const r21Receipt = JSON.parse(await read("../evidence/section22/receipts/S22-R21.json"));
  assert.equal(r21Receipt.failure.classification, "orchestration_audit_wrapper_route_key_mismatch");
  assert.equal(r21Receipt.terminal.verification, "green");
});

test("R21 todo state machine accepts every legal approval and execution state", () => {
  const approvalRecord = "USER_EXPLICIT / 2026-08-22 / 批准计划";
  const fixture = ({ header, approval, record, state }) => [
    "# fixture",
    "> 状态：" + header,
    "- 批准状态：`" + approval + "`",
    "- 批准记录：`" + record + "`",
    "| S22-R21 | " + state + " | 0 | 无 | 否 |",
    "- [" + (state === "completed" ? "x" : " ") + "] S22-R21 fixture",
    "  - 状态：" + state,
  ].join("\n");
  const legal = [
    { header: "PLAN CANDIDATE / PENDING APPROVAL / RELEASE HOLD", approval: "PENDING", record: "PENDING", state: "pending" },
    { header: "APPROVED / READY FOR BUILD / RELEASE HOLD", approval: "APPROVED", record: approvalRecord, state: "pending" },
    { header: "APPROVED / BUILD IN PROGRESS / RELEASE HOLD", approval: "APPROVED", record: approvalRecord, state: "in_progress" },
    { header: "LOCAL CANDIDATE / RELEASE HOLD", approval: "APPROVED", record: approvalRecord, state: "completed" },
    { header: "APPROVED / BLOCKED / RELEASE HOLD", approval: "APPROVED", record: approvalRecord, state: "blocked" },
  ];
  for (const state of legal) {
    const actual = todoState(fixture(state));
    assert.deepEqual(actual, { approval: state.approval, rowState: state.state });
    assert.doesNotThrow(() => assertActiveCandidateState(actual));
  }
});
