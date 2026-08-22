import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const candidateId = "s22-account-usage-final-gate-completion-20260822-07";
const taskId = "S22-R20";
const attemptId = "run-20260822-s22-r20-01";
const attemptRoot = "work-products/debug/execution-baselines/S22-R20/" + attemptId;
const requestPath = "work-products/debug/execution-baselines/S22-R20/request-" + attemptId + ".json";
const receiptPath = "work-products/evidence/section22/receipts/S22-R20.json";
const evidencePath = "work-products/evidence/section22/final-gate-completion-validation.md";
const absolutePathPattern = /(?:^|[\s`'"])(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/mu;
const frozenPlanPath = "../debug/approval-baselines/" + candidateId + "/plan.md";
const frozenTodoPath = "../evidence/section22/blocked-r20-todo.md";
const frozenPlan = () => read(frozenPlanPath);

const parseBlueprint = (plan) => {
  const match = plan.match(/<!-- S22_FINAL_GATE_COMPLETION_REQUEST_BLUEPRINT -->\s*```json\s*([\s\S]*?)\s*```/u);
  assert.ok(match, "missing R20 executable request blueprint");
  return JSON.parse(match[1]);
};

const key = ({ repository, path }) => repository + ":" + path;

const todoState = (todo) => {
  const header = todo.match(/^> 状态：([^\r\n]+)$/m)?.[1];
  const approval = todo.match(/^- 批准状态：`(PENDING|APPROVED)`$/m)?.[1];
  const approvalRecord = todo.match(/^- 批准记录：`([^`]+)`$/m)?.[1];
  const rowState = todo.match(/^\| S22-R20 \| (pending|in_progress|completed|blocked) \| 0 \| 无 \| 否 \|$/m)?.[1];
  const task = todo.match(/^- \[([ x])\] S22-R20[^\r\n]*\r?\n  - 状态：(pending|in_progress|completed|blocked)$/m);
  assert.ok(header && approval && approvalRecord && rowState && task, "incomplete todo state");
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

test("frozen R20 candidate is one complete serial task with a legal blocked todo", async () => {
  const [plan, todo] = await Promise.all([frozenPlan(), read(frozenTodoPath)]);
  assert.match(plan, /^# 第六恢复计划：SPEC 第 22 节最终本地门禁完成$/m);
  assert.match(plan, new RegExp("> 候选 ID：`" + candidateId + "`"));
  assert.match(plan, /`fast requested: false`/);
  assert.match(plan, /执行策略：`serial`/);
  assert.match(plan, /安全并发上限：1/);
  assert.deepEqual([...plan.matchAll(/^### (S22-R\d{2})\b/gm)].map((match) => match[1]), [taskId]);
  assert.deepEqual(todoState(todo), { approval: "APPROVED", rowState: "blocked" });
  assert.doesNotMatch(plan + "\n" + todo, absolutePathPattern);
});

test("R20 blueprint binds a fresh attempt and does not reuse R19", async () => {
  const blueprint = parseBlueprint(await frozenPlan());
  assert.equal(blueprint.schema_version, "s22-final-gate-completion-request-blueprints/v1");
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
    owner: "native-worker:s22_r20",
    attempt_id: attemptId,
    attempt_root: attemptRoot,
    request_path: requestPath,
    no_replace: true,
  });
  assert.equal(JSON.stringify(task).includes("run-20260821-s22-r19-01"), false);
  assert.deepEqual(task.orchestration_outputs.map(key), ["worker:" + receiptPath]);
});

test("R20 blueprint preserves exact inputs, protected paths, and no-replace prestate", async () => {
  const blueprint = parseBlueprint(await frozenPlan());
  const task = blueprint.tasks[0];
  const inputs = task.input_sets.flatMap((name) => blueprint.input_sets[name]).map(key);
  for (const required of [
    "worker:work-products/debug/approval-baselines/" + candidateId + "/plan.md",
    "worker:work-products/evidence/section22/blocked-r19-todo-v2.md",
    "worker:work-products/evidence/section22/receipts/S22-R19.json",
    "worker:work-products/evidence/section22/final-gate-recovery-validation.md",
    "worker:work-products/debug/s22-r19-in-progress-mirror-contract.md",
    "worker:work-products/tests/section22-final-gate-completion-plan-contract.test.mjs",
  ]) assert.ok(inputs.includes(required), "missing input " + required);
  assert.deepEqual(
    blueprint.protected_input_sets[task.protected_input_set].map(key),
    [
      "pages:package.json",
      "pages:work-products/tests/iptv-retirement-contract.test.mjs",
      "pages:work-products/tests/pages-deployment.test.mjs",
      "pages:work-products/tests/repository-test-isolation.test.mjs",
      "pages:work-products/tests/fixtures/ui-review/section21-candidate",
    ],
  );
  assert.ok(task.targets.map(key).includes("worker:" + evidencePath));
  assert.ok(task.prestate.initial_must_be_missing.includes("worker:" + attemptRoot));
  assert.deepEqual(task.prestate.create_must_be_regular_files, ["worker:" + requestPath]);
  assert.deepEqual(task.prestate.create_must_be_empty_directories, ["worker:work-products/tests/work/section22-r20-temp"]);
  assert.deepEqual(task.prestate.ports_must_be_free, [4173, 4174]);
});

test("R20 approval snapshot is byte-identical and R19 remains immutable history", async () => {
  const [plan, snapshot, blockedTodo, receipt, debug] = await Promise.all([
    frozenPlan(),
    read("../debug/approval-baselines/" + candidateId + "/plan.md"),
    read("../evidence/section22/blocked-r19-todo-v2.md"),
    read("../evidence/section22/receipts/S22-R19.json"),
    read("../debug/s22-r19-in-progress-mirror-contract.md"),
  ]);
  assert.equal(snapshot, plan);
  assert.match(blockedTodo, /^\| S22-R19 \| blocked \| 0 \| 无 \| 否 \|$/m);
  assert.equal(JSON.parse(receipt).status, "blocked");
  assert.match(debug, /Worker 完整测试 \| 222\/222 pass/u);
});

test("R20 frozen failure binds the exact duplicate input and no-launch receipt", async () => {
  const [plan, requestRaw, receiptRaw, evidence, todo] = await Promise.all([
    frozenPlan(),
    read("../debug/execution-baselines/S22-R20/request-" + attemptId + ".json"),
    read("../evidence/section22/receipts/S22-R20.json"),
    read("../evidence/section22/final-gate-completion-validation.md"),
    read(frozenTodoPath),
  ]);
  const blueprint = parseBlueprint(plan);
  const task = blueprint.tasks[0];
  const flattened = task.input_sets.flatMap((name) => blueprint.input_sets[name]).map(key);
  const seen = new Set();
  const duplicates = flattened.filter((input) => seen.has(input) || !seen.add(input));
  assert.deepEqual(duplicates, ["worker:work-products/debug/s22-r19-in-progress-mirror-contract.md"]);
  const request = JSON.parse(requestRaw);
  assert.equal(request.inputs.filter((input) => key(input) === duplicates[0]).length, 2);
  const receipt = JSON.parse(receiptRaw);
  assert.equal(receipt.status, "blocked");
  assert.equal(receipt.worker_launched, false);
  assert.equal(receipt.baseline.create_exit_code, 1);
  assert.match(receipt.baseline.create_error, /duplicate or case alias/u);
  assert.match(evidence, /attempt root：missing/u);
  assert.match(todo, /^\| S22-R20 \| blocked \| 0 \| 无 \| 否 \|$/m);
});

test("R20 todo state machine accepts every legal approval and execution state", () => {
  const approvalRecord = "USER_EXPLICIT / 2026-08-22 / 批准计划";
  const fixture = ({ header, approval, record, state }) => [
    "# fixture",
    "> 状态：" + header,
    "- 批准状态：`" + approval + "`",
    "- 批准记录：`" + record + "`",
    "| S22-R20 | " + state + " | 0 | 无 | 否 |",
    "- [" + (state === "completed" ? "x" : " ") + "] S22-R20 fixture",
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
    assert.deepEqual(actual, {
      approval: state.approval,
      rowState: state.state,
    });
    assert.doesNotThrow(() => assertActiveCandidateState(actual));
  }
});
