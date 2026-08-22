import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const taskIds = ["S22-R00", "S22-R01", "S22-R02", "S22-R03", "S22-R04"];
const frozenPlanPath = "../evidence/section22/blocked-r01-plan.md";
const frozenTodoPath = "../evidence/section22/blocked-r01-todo.md";
const dependencies = new Map([
  ["S22-R00", []],
  ["S22-R01", ["S22-R00"]],
  ["S22-R02", ["S22-R01"]],
  ["S22-R03", ["S22-R02"]],
  ["S22-R04", ["S22-R03"]],
]);

const taskSection = (plan, taskId) => {
  const start = plan.indexOf(`### ${taskId} `);
  assert.notEqual(start, -1, `missing task ${taskId}`);
  const nextTask = taskIds[taskIds.indexOf(taskId) + 1];
  const end = nextTask ? plan.indexOf(`### ${nextTask} `, start) : plan.indexOf("## 5. ", start);
  assert.notEqual(end, -1, `missing task boundary ${taskId}`);
  return plan.slice(start, end);
};

const scopedPaths = (task, field, nextField) => {
  const start = task.indexOf(`- ${field}：`);
  const end = task.indexOf(`\n- ${nextField}：`, start);
  assert.notEqual(start, -1, `missing ${field} scope`);
  assert.notEqual(end, -1, `missing ${field} scope boundary`);
  return [...task.slice(start, end).matchAll(/^  - `([^`]+)`/gm)].map((match) => match[1]);
};

test("Section 22 recovery plan has five complete task contracts", async () => {
  const plan = await read(frozenPlanPath);
  assert.match(plan, /^# 恢复计划：SPEC 第 22 节账户级用量与本地门禁$/m);
  assert.match(plan, /- 已批准规范：`work-products\/SPEC\.md` 第 22 节/);

  const headings = [...plan.matchAll(/^### (S22-R\d{2})\b/gm)].map((match) => match[1]);
  assert.deepEqual(headings, taskIds);

  const requiredFields = [
    ["目标", /^- 目标：/m],
    ["范围", /^- 范围：/m],
    ["依赖", /^- 依赖：/m],
    ["执行基线根", /^- 执行基线根：/m],
    ["读取", /^- 读取：/m],
    ["写入", /^- 写入：/m],
    ["生成输出", /^- 生成输出：/m],
    ["共享资源", /^- 共享资源：/m],
    ["验收", /^- 验收：/m],
    ["聚焦验证", /^- 聚焦验证：/m],
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
    assert.ok(scopedPaths(task, "写入", "生成输出").includes(baselineRoot), `${taskId} write scope owns baseline root`);
  }

  assert.match(plan, /除显式以 `\.\.\/UXUV-Pages\/` 开头的路径外，所有仓库相对路径都以 Worker 仓库根目录解析/);
  assert.doesNotMatch(plan, /(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/, "plan must not persist machine-specific absolute paths");
});

test("Section 22 recovery dependencies and waves are strictly serial", async () => {
  const plan = await read(frozenPlanPath);
  assert.match(plan, /`fast requested: false`。执行策略：`serial`。安全并发上限：1。/);
  assert.match(plan, /S22-R00 -> S22-R01 -> S22-R02 -> S22-R03 -> S22-R04/);

  for (const taskId of taskIds) {
    const task = taskSection(plan, taskId);
    const dependencyLine = task.match(/^- 依赖：(.+)。$/m);
    assert.ok(dependencyLine, `${taskId} dependency field`);
    const actual = [...dependencyLine[1].matchAll(/S22-R\d{2}/g)].map((match) => match[0]);
    assert.deepEqual(actual, dependencies.get(taskId), `${taskId} dependencies`);
    assert.match(task, /^- 编辑可并行：否(?:。|；)/m, `${taskId} editing must be serial`);
    assert.match(task, /^- 聚焦验证可并行：否(?:。|；)/m, `${taskId} validation must be serial`);
  }

  const waves = [...plan.matchAll(/^\| Wave ([0-4]) \| ([^|]+) \| ([^|]+) \| (\d+) \| ([^|]+) \|/gm)]
    .map((match) => match.slice(1).map((value) => value.trim()));
  assert.deepEqual(waves, [
    ["0", "S22-R00", "S22-R01—R04", "1", "否 / 否"],
    ["1", "S22-R01", "S22-R02—R04", "1", "否 / 否"],
    ["2", "S22-R02", "S22-R03—R04", "1", "否 / 否"],
    ["3", "S22-R03", "S22-R04", "1", "否 / 否"],
    ["4", "S22-R04", "无", "1", "否 / 否"],
  ]);
  assert.match(plan, /运行时宽度始终为 1，不允许从 serial 自动升级为 fast/);
});

test("Section 22 recovery scopes preserve relative paths and Pages protected inputs", async () => {
  const plan = await read(frozenPlanPath);
  const expectedScopes = new Map([
    ["S22-R00", {
      write: [
        "work-products/tests/section22-plan-contract.test.mjs",
        "work-products/tests/section22-recovery-plan-contract.test.mjs",
        "work-products/debug/execution-baselines/S22-R00/",
      ],
      generated: [],
    }],
    ["S22-R01", {
      write: [
        "work-products/tests/cloudflare-usage-contract.test.mjs",
        "work-products/tests/worker-only-boundary.test.mjs",
        "../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts",
        "work-products/debug/execution-baselines/S22-R01/",
      ],
      generated: [
        "../UXUV-Pages/.next/",
        "../UXUV-Pages/out/",
        "../UXUV-Pages/tsconfig.tsbuildinfo",
        "../UXUV-Pages/work-products/tests/artifacts/playwright/",
      ],
    }],
    ["S22-R02", {
      write: [
        "work-products/evidence/section22/worker-validation.md",
        "work-products/debug/execution-baselines/S22-R02/",
      ],
      generated: [],
    }],
    ["S22-R03", {
      write: [
        "../UXUV-Pages/work-products/evidence/section22/pages-validation.md",
        "work-products/debug/execution-baselines/S22-R03/",
      ],
      generated: [
        "../UXUV-Pages/.next/",
        "../UXUV-Pages/out/",
        "../UXUV-Pages/release/",
        "../UXUV-Pages/tsconfig.tsbuildinfo",
        "../UXUV-Pages/work-products/tests/artifacts/playwright/",
        "../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/",
        "../UXUV-Pages/work-products/tests/work/pwa-release/",
        "../UXUV-Pages/work-products/tests/work/release-manifest/",
      ],
    }],
    ["S22-R04", {
      write: [
        "work-products/evidence/section22/pair-validation.md",
        "work-products/evidence/section22/receipts/S22-R04.json",
        "work-products/debug/execution-baselines/S22-R04/",
      ],
      generated: [
        "../UXUV-Pages/.next/",
        "../UXUV-Pages/out/",
        "../UXUV-Pages/release/",
        "../UXUV-Pages/tsconfig.tsbuildinfo",
        "../UXUV-Pages/work-products/tests/artifacts/playwright/",
        "../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/",
        "../UXUV-Pages/work-products/tests/work/pwa-release/",
        "../UXUV-Pages/work-products/tests/work/release-manifest/",
      ],
    }],
  ]);
  const protectedInputs = [
    "../UXUV-Pages/package.json",
    "../UXUV-Pages/work-products/tests/iptv-retirement-contract.test.mjs",
    "../UXUV-Pages/work-products/tests/pages-deployment.test.mjs",
    "../UXUV-Pages/work-products/tests/repository-test-isolation.test.mjs",
  ];

  const mutablePaths = [];
  for (const taskId of taskIds) {
    const task = taskSection(plan, taskId);
    const write = scopedPaths(task, "写入", "生成输出");
    const generated = scopedPaths(task, "生成输出", "共享资源");
    assert.deepEqual(write, expectedScopes.get(taskId).write, `${taskId} write scope`);
    assert.deepEqual(generated, expectedScopes.get(taskId).generated, `${taskId} generated scope`);
    mutablePaths.push(...write, ...generated);
    for (const path of [...write, ...generated]) {
      assert.doesNotMatch(path, /^(?:[A-Za-z]:[\\/]|\\\\|\/)/, `${taskId} path must be relative`);
      assert.ok(path.startsWith("../UXUV-Pages/") || !path.startsWith("../"), `${taskId} path crosses an undeclared repository boundary`);
      assert.ok(!path.includes("\\"), `${taskId} path must use repository separators`);
    }
  }

  for (const path of protectedInputs) {
    assert.ok(plan.includes(`\`${path}\``), `missing protected input ${path}`);
    assert.ok(!mutablePaths.includes(path), `protected input must remain outside write/generated scopes: ${path}`);
    for (const taskId of ["S22-R01", "S22-R03", "S22-R04"]) {
      assert.ok(scopedPaths(taskSection(plan, taskId), "读取", "写入").includes(path), `${taskId} must read-protect ${path}`);
    }
  }
  assert.match(plan, /它们不是写集，任何漂移都阻塞且不得覆盖/);
});

test("Section 22 recovery todo mirrors legal progressive serial state", async () => {
  const [plan, todo] = await Promise.all([read(frozenPlanPath), read(frozenTodoPath)]);
  assert.match(plan, /todo 由主代理单写；worker 不得改写计划、todo/);
  assert.match(todo, /`work-products\/todo\.md` 仅由主代理写入/);
  assert.doesNotMatch(todo, /(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/, "todo must not persist machine-specific absolute paths");

  const legalStates = new Set(["pending", "in_progress", "blocked", "completed"]);
  const tableRows = new Map(
    [...todo.matchAll(/^\| (S22-R\d{2}) \| ([a-z_]+) \| (\d+) \| ([^|]+) \| ([^|]+) \|$/gm)]
      .map((match) => [match[1], { state: match[2], wave: match[3], dependency: match[4].trim() }]),
  );
  const taskStates = new Map();
  for (const match of todo.matchAll(/^- \[([ x])\] (S22-R\d{2})[^\r\n]*\r?\n  - 状态：([a-z_]+)$/gm)) {
    const [, checkbox, taskId, state] = match;
    assert.ok(legalStates.has(state), `${taskId} has illegal state ${state}`);
    assert.equal(checkbox === "x", state === "completed", `${taskId} checkbox/state mismatch`);
    taskStates.set(taskId, state);
  }

  assert.deepEqual([...tableRows.keys()], taskIds);
  assert.deepEqual([...taskStates.keys()], taskIds);
  for (const [index, taskId] of taskIds.entries()) {
    const row = tableRows.get(taskId);
    assert.ok(legalStates.has(row.state), `${taskId} table state is illegal`);
    assert.equal(taskStates.get(taskId), row.state, `${taskId} table/task state mismatch`);
    assert.equal(row.wave, String(index), `${taskId} wave`);
    assert.equal(row.dependency, index === 0 ? "无" : taskIds[index - 1], `${taskId} table dependency`);
    for (const dependency of dependencies.get(taskId)) {
      if (row.state !== "pending") {
        assert.equal(tableRows.get(dependency).state, "completed", `${taskId} cannot advance before ${dependency}`);
      }
    }
  }

  const inProgress = [...tableRows.values()].filter((row) => row.state === "in_progress");
  assert.ok(inProgress.length <= 1, "serial todo may have at most one in_progress task");
});
