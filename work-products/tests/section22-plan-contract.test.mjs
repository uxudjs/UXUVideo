import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const taskIds = ["S22-T00", "S22-T01", "S22-T02", "S22-T03", "S22-T04", "S22-T05", "S22-T06"];
const frozenPlanPath = "../evidence/section22/blocked-wave2-plan.md";
const frozenTodoPath = "../evidence/section22/blocked-wave2-todo.md";

const taskSection = (plan, taskId) => {
  const start = plan.indexOf(`### ${taskId} `);
  assert.notEqual(start, -1, `missing task ${taskId}`);
  const nextTask = taskIds[taskIds.indexOf(taskId) + 1];
  const end = nextTask ? plan.indexOf(`### ${nextTask} `, start) : plan.indexOf("## 5. ", start);
  assert.notEqual(end, -1, `missing task boundary ${taskId}`);
  return plan.slice(start, end);
};

test("Section 22 plan has one complete seven-task contract", async () => {
  const plan = await read(frozenPlanPath);
  assert.match(plan, /^# 实施计划：SPEC 第 22 节 Cloudflare 账户级用量收敛$/m);
  assert.match(plan, /- 规范：`work-products\/SPEC\.md` 第 22 节/);
  assert.match(plan, /- Worker 基线：/);
  assert.match(plan, /- Pages 基线：/);

  const headings = [...plan.matchAll(/^### (S22-T\d{2})\b/gm)].map((match) => match[1]);
  assert.deepEqual(headings, taskIds);
  assert.doesNotMatch(plan, /^### S21-T\d{2}\b/gm);

  const requiredFields = [
    ["目标", /^- 目标：/m],
    ["范围", /^- 范围：/m],
    ["依赖", /^- 依赖：/m],
    ["执行基线根", /^- 执行基线根：/m],
    ["读取", /^- 读取：/m],
    ["写入", /^- 写入：/m],
    ["生成输出", /^- 生成(?:输出|但不手工编辑)?：/m],
    ["共享资源", /^- 共享资源：/m],
    ["验收", /^- 验收：/m],
    ["验证", /^- (?:聚焦验证(?:（[^）]+）)?|验证（串行）)：/m],
    ["波次与启动条件", /^- 波次与启动条件：/m],
    ["编辑可并行", /^- 编辑可并行：/m],
    ["聚焦验证可并行", /^- 聚焦验证可并行：/m],
    ["主代理集成责任", /^- 主代理集成责任：/m],
    ["失败/回滚", /^- 失败\/回滚：/m],
  ];

  for (const taskId of taskIds) {
    const task = taskSection(plan, taskId);
    for (const [name, pattern] of requiredFields) assert.match(task, pattern, `${taskId} missing ${name}`);
    const baselineRoot = `work-products/debug/execution-baselines/${taskId}/`;
    assert.ok(task.includes(`- 执行基线根：\`${baselineRoot}\``), `${taskId} baseline root`);
    const writeBlock = task.slice(task.indexOf("- 写入："), task.search(/\n- 生成(?:输出|但不手工编辑)?：/));
    assert.ok(writeBlock.includes(`\`${baselineRoot}\``), `${taskId} write scope must own its baseline root`);
  }

  assert.match(plan, /除显式以 `\.\.\/UXUV-Pages\/` 开头的路径外，所有仓库相对路径都以 Worker 仓库根目录解析/);
  assert.doesNotMatch(plan, /(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/, "plan must not persist machine-specific absolute paths");
});

test("Section 22 dependencies encode the complete acyclic task graph", async () => {
  const plan = await read(frozenPlanPath);
  const expected = new Map([
    ["S22-T00", []],
    ["S22-T01", ["S22-T00"]],
    ["S22-T02", ["S22-T00"]],
    ["S22-T03", ["S22-T01", "S22-T02"]],
    ["S22-T04", ["S22-T03"]],
    ["S22-T05", ["S22-T03"]],
    ["S22-T06", ["S22-T04", "S22-T05"]],
  ]);

  for (const taskId of taskIds) {
    const dependencyLine = taskSection(plan, taskId).match(/^- 依赖：(.+)。$/m);
    assert.ok(dependencyLine, `${taskId} dependency field`);
    const actual = [...dependencyLine[1].matchAll(/S22-T\d{2}/g)].map((match) => match[0]);
    assert.deepEqual(actual, expected.get(taskId), `${taskId} dependencies`);
    for (const dependency of actual) {
      assert.ok(taskIds.includes(dependency), `${taskId} has unknown dependency ${dependency}`);
      assert.ok(taskIds.indexOf(dependency) < taskIds.indexOf(taskId), `${taskId} dependency must precede it`);
    }
  }
});

test("Section 22 fast waves mirror readiness, barriers, and concurrency", async () => {
  const plan = await read(frozenPlanPath);
  assert.match(plan, /`fast requested: true`。执行策略：`fast`。安全并发上限：2。/);
  const waves = [...plan.matchAll(/^\| Wave ([0-4]) \| ([^|]+) \| ([^|]+) \| (\d+) \| ([^|]+) \|/gm)]
    .map((match) => match.slice(1).map((value) => value.trim()));
  assert.deepEqual(waves, [
    ["0", "S22-T00", "S22-T01—T06", "1", "否 / 否"],
    ["1", "S22-T01、S22-T02", "S22-T03—T06", "2", "是 / 是"],
    ["2", "S22-T03", "S22-T04—T06", "1", "否 / 否"],
    ["3", "S22-T04、S22-T05", "S22-T06", "2", "是 / 是"],
    ["4", "S22-T06", "无", "1", "否 / 否"],
  ]);
  for (const wave of waves) {
    assert.ok(Number(wave[3]) <= 2, `Wave ${wave[0]} exceeds the safe concurrency limit`);
  }
  assert.match(plan, /波次屏障强制执行/);
  assert.match(plan, /只能降低/);
});

test("Section 22 todo is single-writer and legally mirrors table, task state, and checkbox", async () => {
  const [plan, todo] = await Promise.all([read(frozenPlanPath), read(frozenTodoPath)]);
  assert.match(plan, /todo 由主代理单写；worker 不得改写计划、todo/);
  assert.match(todo, /`work-products\/todo\.md` 仅由主代理写入/);
  assert.doesNotMatch(todo, /(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/, "todo must not persist machine-specific absolute paths");

  const legalStates = new Set(["pending", "in_progress", "blocked", "completed"]);
  const tableStates = new Map(
    [...todo.matchAll(/^\| (S22-T\d{2}) \| ([a-z_]+) \|/gm)].map((match) => [match[1], match[2]]),
  );
  const taskStates = new Map();
  for (const match of todo.matchAll(/^- \[([ x])\] (S22-T\d{2})[^\r\n]*\r?\n  - 状态：([a-z_]+)$/gm)) {
    const [, checkbox, taskId, state] = match;
    assert.ok(legalStates.has(state), `${taskId} has illegal state ${state}`);
    assert.equal(checkbox === "x", state === "completed", `${taskId} checkbox/state mismatch`);
    taskStates.set(taskId, state);
  }

  assert.deepEqual([...tableStates.keys()], taskIds);
  assert.deepEqual([...taskStates.keys()], taskIds);
  for (const taskId of taskIds) {
    assert.ok(legalStates.has(tableStates.get(taskId)), `${taskId} table state is illegal`);
    assert.equal(taskStates.get(taskId), tableStates.get(taskId), `${taskId} table/task state mismatch`);
  }
});
