import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const taskIds = ["S22-R09", "S22-R10", "S22-R11", "S22-R12", "S22-R13", "S22-R14"];
const frozenPlanPath = "../evidence/section22/blocked-r10-plan.md";
const frozenTodoPath = "../evidence/section22/blocked-r10-todo.md";
const absolutePathPattern = /(?:^|[\s`'"])(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/mu;

const taskSection = (plan, taskId) => {
  const start = plan.indexOf(`### ${taskId} `);
  assert.notEqual(start, -1, `missing task ${taskId}`);
  const nextTask = taskIds[taskIds.indexOf(taskId) + 1];
  const end = nextTask ? plan.indexOf(`### ${nextTask} `, start) : plan.indexOf("## 5. ", start);
  assert.notEqual(end, -1, `missing task boundary ${taskId}`);
  return plan.slice(start, end);
};

test("frozen baseline-recovery plan preserves six complete serial task contracts", async () => {
  const plan = await read(frozenPlanPath);
  assert.match(plan, /^# 第二恢复计划：SPEC 第 22 节账户级用量与本地门禁$/m);
  assert.match(plan, /`fast requested: false`。执行策略：`serial`。安全并发上限：1。/);
  assert.deepEqual(
    [...plan.matchAll(/^### (S22-R\d{2})\b/gm)].map((match) => match[1]),
    taskIds,
  );

  const requiredFields = [
    /^- 目标：/m,
    /^- 范围：/m,
    /^- 依赖：/m,
    /^- 执行基线根：/m,
    /^- 读取：/m,
    /^- 写入：/m,
    /^- 生成输出：/m,
    /^- 共享资源：/m,
    /^- 验收：/m,
    /^- 聚焦验证：/m,
    /^- 波次与启动条件：/m,
    /^- 编辑可并行：/m,
    /^- 聚焦验证可并行：/m,
    /^- 主代理集成责任：/m,
    /^- 失败\/回滚：/m,
  ];
  for (const taskId of taskIds) {
    const task = taskSection(plan, taskId);
    for (const pattern of requiredFields) assert.match(task, pattern, `${taskId} incomplete contract`);
    assert.match(task, new RegExp(`work-products/debug/execution-baselines/${taskId}/`));
  }
  assert.doesNotMatch(plan, absolutePathPattern, "frozen plan must remain portable");
});

test("frozen baseline-recovery todo preserves the exact terminal prefix", async () => {
  const todo = await read(frozenTodoPath);
  const expected = new Map([
    ["S22-R09", "completed"],
    ["S22-R10", "blocked"],
    ["S22-R11", "pending"],
    ["S22-R12", "pending"],
    ["S22-R13", "pending"],
    ["S22-R14", "pending"],
  ]);
  const table = new Map(
    [...todo.matchAll(/^\| (S22-R\d{2}) \| ([a-z_]+) \|/gm)].map((match) => [match[1], match[2]]),
  );
  assert.deepEqual(table, expected);
  for (const match of todo.matchAll(/^- \[([ x])\] (S22-R\d{2})[^\r\n]*\r?\n  - 状态：([a-z_]+)$/gm)) {
    const [, checkbox, taskId, state] = match;
    assert.equal(state, expected.get(taskId), `${taskId} task state`);
    assert.equal(checkbox === "x", state === "completed", `${taskId} checkbox mirror`);
  }
  assert.match(todo, /> 状态：BLOCKED \/ RELEASE HOLD/m);
  assert.doesNotMatch(todo, absolutePathPattern, "frozen todo must remain portable");
});

test("frozen R10 evidence proves the worker never launched and todo caused identity drift", async () => {
  const [receiptRaw, requestRaw, manifestRaw] = await Promise.all([
    read("../evidence/section22/receipts/S22-R10.json"),
    read("../debug/execution-baselines/S22-R10/run-20260821-s22-r10-01/request.json"),
    read("../debug/execution-baselines/S22-R10/run-20260821-s22-r10-01/manifest.json"),
  ]);
  const receipt = JSON.parse(receiptRaw);
  const request = JSON.parse(requestRaw);
  const manifest = JSON.parse(manifestRaw);

  assert.equal(receipt.status, "blocked");
  assert.equal(receipt.worker_launched, false);
  assert.deepEqual(receipt.changed_paths, []);
  assert.equal(receipt.baseline.inputs_error, "repository identity drift");
  const workerRequest = request.repositories.find((repository) => repository.id === "worker");
  const workerManifest = manifest.repositories.find((repository) => repository.id === "worker");
  assert.equal(workerRequest.exclude.includes("work-products/todo.md"), false);
  assert.equal(workerManifest.files.some((entry) => entry.path === "work-products/todo.md"), true);
});
