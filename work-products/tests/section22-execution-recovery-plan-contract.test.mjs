import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const frozenPlanPath = "../debug/approval-baselines/s22-account-usage-execution-recovery-20260821-02/plan.md";
const frozenTodoPath = "../evidence/section22/blocked-r18-todo.md";
const taskIds = ["S22-R15", "S22-R16", "S22-R17", "S22-R18"];
const dependencies = new Map([
  ["S22-R15", []],
  ["S22-R16", ["S22-R15"]],
  ["S22-R17", ["S22-R16"]],
  ["S22-R18", ["S22-R17"]],
]);
const attemptIds = new Map(taskIds.map((taskId) => [
  taskId,
  `run-20260821-s22-${taskId.slice(-3).toLowerCase()}-01`,
]));
const absolutePathPattern = /(?:^|[\s`'"])(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/mu;
const resourceKey = ({ repository, path }) => `${repository}:${path}`;
const proxyKeys = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"];
const proxyAliasKeys = ["http_proxy", "https_proxy", "all_proxy", "no_proxy"];
const pageEnvKeys = [
  "pages:.env",
  "pages:.env.local",
  "pages:.env.development",
  "pages:.env.development.local",
  "pages:.env.production",
  "pages:.env.production.local",
];
const expectedRuntime = {
  node_version: "v20.19.2",
  npm_version: "10.8.2",
  chrome_channel: "Google Chrome",
  chrome_version: "151.0.7922.173",
  fallbacks_forbidden: ["npx", "install", "network"],
};
const expectedInputSets = {
  governance: [
    "worker:work-products/SPEC.md",
    "worker:work-products/plan.md",
    "worker:work-products/debug/approval-baselines/s22-account-usage-execution-recovery-20260821-02/plan.md",
    "worker:work-products/scripts/execution-baseline.mjs",
    "worker:work-products/tests/execution-baseline-tool.test.mjs",
    "worker:work-products/tests/section22-plan-contract.test.mjs",
    "worker:work-products/tests/section22-recovery-plan-contract.test.mjs",
    "worker:work-products/tests/section22-baseline-recovery-plan-contract.test.mjs",
    "worker:work-products/tests/section22-execution-recovery-plan-contract.test.mjs",
  ],
  "worker-r15-read": [
    "worker:_worker.js",
    "worker:work-products/tests/structured-logging.test.mjs",
  ],
  "worker-validation": [
    "worker:_worker.js",
    "worker:README.md",
    "worker:CHANGELOG.md",
    "worker:package.json",
    "worker:package-lock.json",
    "worker:scripts/check-worker-size.mjs",
    "worker:work-products/tests/cloudflare-usage-contract.test.mjs",
    "worker:work-products/tests/structured-logging.test.mjs",
    "worker:work-products/tests/worker-only-boundary.test.mjs",
  ],
  "pages-runtime": [
    "pages:package-lock.json",
    "pages:node_modules/.package-lock.json",
    "pages:.env",
    "pages:.env.local",
    "pages:.env.development",
    "pages:.env.development.local",
    "pages:.env.production",
    "pages:.env.production.local",
  ],
  "pages-offline-suite": [
    "pages:playwright.config.ts",
    "pages:work-products/tests/usage-ui.e2e.spec.ts",
    "pages:work-products/tests/offline-boundary.e2e.spec.ts",
    "pages:work-products/tests/offline-reject-proxy.mjs",
  ],
  "prior-validation-evidence": [
    "worker:work-products/evidence/section22/receipts/S22-R15.json",
    "worker:work-products/evidence/section22/receipts/S22-R16.json",
    "worker:work-products/evidence/section22/receipts/S22-R17.json",
    "worker:work-products/evidence/section22/worker-validation.md",
    "pages:work-products/evidence/section22/pages-validation.md",
  ],
};
const expectedProtectedInputSets = {
  "pages-four": [
    "pages:package.json",
    "pages:work-products/tests/iptv-retirement-contract.test.mjs",
    "pages:work-products/tests/pages-deployment.test.mjs",
    "pages:work-products/tests/repository-test-isolation.test.mjs",
  ],
  "pages-four-plus-visual": [
    "pages:package.json",
    "pages:work-products/tests/iptv-retirement-contract.test.mjs",
    "pages:work-products/tests/pages-deployment.test.mjs",
    "pages:work-products/tests/repository-test-isolation.test.mjs",
    "pages:work-products/tests/fixtures/ui-review/section21-candidate",
  ],
};
const expectedToolchainProfiles = {
  worker: [
    "worker:work-products/scripts/execution-baseline.mjs",
    "worker:scripts/check-worker-size.mjs",
  ],
  "pages-focused": [
    "worker:work-products/scripts/execution-baseline.mjs",
    "pages:node_modules/@playwright/test/cli.js",
    "pages:node_modules/next/dist/bin/next",
    "pages:node_modules/esbuild/bin/esbuild",
  ],
  "pages-full": [
    "worker:work-products/scripts/execution-baseline.mjs",
    "pages:node_modules/@playwright/test/cli.js",
    "pages:node_modules/next/dist/bin/next",
    "pages:node_modules/esbuild/bin/esbuild",
    "pages:node_modules/eslint/bin/eslint.js",
    "pages:node_modules/typescript/bin/tsc",
  ],
};
const expectedTasks = {
  "S22-R15": {
    predecessor: null,
    wave: 0,
    repositories: ["worker:.", "pages:../UXUV-Pages"],
    targets: [
      "worker:work-products/tests/cloudflare-usage-contract.test.mjs",
      "worker:work-products/tests/worker-only-boundary.test.mjs",
      "pages:playwright.config.ts",
      "pages:work-products/tests/usage-ui.e2e.spec.ts",
      "pages:work-products/tests/offline-boundary.e2e.spec.ts",
      "pages:work-products/tests/offline-reject-proxy.mjs",
      "pages:.next",
      "pages:out",
      "pages:tsconfig.tsbuildinfo",
      "pages:work-products/tests/artifacts/playwright",
      "pages:work-products/tests/work/section22-r15-temp",
    ],
    input_sets: ["governance", "worker-r15-read", "pages-runtime"],
    protected_input_set: "pages-four",
    toolchain_profile: "pages-focused",
    environment_profile: "pages-offline",
    task_temp: "pages:work-products/tests/work/section22-r15-temp",
    generated_namespaces: [],
    must_be_missing: [
      "worker:work-products/debug/execution-baselines/S22-R15",
      "worker:work-products/debug/execution-baselines/S22-R15/run-20260821-s22-r15-01",
      "worker:work-products/evidence/section22/receipts/S22-R15.json",
      ...pageEnvKeys,
      "pages:work-products/tests/offline-boundary.e2e.spec.ts",
      "pages:work-products/tests/offline-reject-proxy.mjs",
      "pages:work-products/tests/work/section22-r15-temp",
    ],
    create_missing: [
      "worker:work-products/debug/execution-baselines/S22-R15/run-20260821-s22-r15-01",
      "worker:work-products/evidence/section22/receipts/S22-R15.json",
      ...pageEnvKeys,
      "pages:work-products/tests/offline-boundary.e2e.spec.ts",
      "pages:work-products/tests/offline-reject-proxy.mjs",
    ],
    preflight_namespaces: [],
    ports: [4173, 4174],
    validation_sequence: [
      "node --test focused Worker contracts",
      "node --check _worker.js",
      "Pages Playwright offline-boundary and usage-ui with workers=1",
      "two-repository retired-name scan",
      "two-repository git diff --check",
    ],
    terminal_invariants: ["verify terminal GREEN", "pages-four unchanged", "receipt create-new after terminal"],
  },
  "S22-R16": {
    predecessor: "S22-R15",
    wave: 1,
    repositories: ["worker:."],
    targets: [
      "worker:work-products/evidence/section22/worker-validation.md",
      "worker:work-products/tests/work/section22-r16-temp",
      "worker:work-products/tests/work/execution-baseline-tool",
    ],
    input_sets: ["governance", "worker-validation"],
    protected_input_set: null,
    toolchain_profile: "worker",
    environment_profile: "worker-local",
    task_temp: "worker:work-products/tests/work/section22-r16-temp",
    generated_namespaces: [],
    must_be_missing: [
      "worker:work-products/debug/execution-baselines/S22-R16",
      "worker:work-products/debug/execution-baselines/S22-R16/run-20260821-s22-r16-01",
      "worker:work-products/evidence/section22/receipts/S22-R16.json",
      "worker:work-products/tests/work/section22-r16-temp",
      "worker:work-products/tests/work/execution-baseline-tool",
    ],
    create_missing: [
      "worker:work-products/debug/execution-baselines/S22-R16/run-20260821-s22-r16-01",
      "worker:work-products/evidence/section22/receipts/S22-R16.json",
      "worker:work-products/tests/work/execution-baseline-tool",
    ],
    preflight_namespaces: [],
    ports: [],
    validation_sequence: [
      "node --check _worker.js",
      "node --test baseline usage logging worker-only and four plan contracts",
      "npm run check:size",
      "Worker secret path and retired-name scans",
      "Worker git diff --check",
    ],
    terminal_invariants: ["verify terminal GREEN", "baseline-tool work missing", "receipt create-new after terminal"],
  },
  "S22-R17": {
    predecessor: "S22-R16",
    wave: 2,
    repositories: ["worker:.", "pages:../UXUV-Pages"],
    targets: [
      "pages:work-products/evidence/section22/pages-validation.md",
      "pages:.next",
      "pages:out",
      "pages:release",
      "pages:tsconfig.tsbuildinfo",
      "pages:work-products/tests/artifacts/playwright",
      "pages:work-products/tests/work/kvideo-webview-compatibility",
      "pages:work-products/tests/work/pwa-release",
      "pages:work-products/tests/work/release-manifest",
      "pages:work-products/tests/work/section21-candidate-draft",
      "pages:work-products/tests/work/section22-r17-temp",
    ],
    input_sets: ["governance", "worker-r15-read", "pages-runtime", "pages-offline-suite"],
    protected_input_set: "pages-four-plus-visual",
    toolchain_profile: "pages-full",
    environment_profile: "pages-offline",
    task_temp: "pages:work-products/tests/work/section22-r17-temp",
    generated_namespaces: [],
    must_be_missing: [
      "worker:work-products/debug/execution-baselines/S22-R17",
      "worker:work-products/debug/execution-baselines/S22-R17/run-20260821-s22-r17-01",
      "worker:work-products/evidence/section22/receipts/S22-R17.json",
      ...pageEnvKeys,
      "pages:work-products/tests/work/kvideo-webview-compatibility",
      "pages:work-products/tests/work/pwa-release",
      "pages:work-products/tests/work/release-manifest",
      "pages:work-products/tests/work/section22-r17-temp",
    ],
    create_missing: [
      "worker:work-products/debug/execution-baselines/S22-R17/run-20260821-s22-r17-01",
      "worker:work-products/evidence/section22/receipts/S22-R17.json",
      ...pageEnvKeys,
      "pages:work-products/tests/work/kvideo-webview-compatibility",
      "pages:work-products/tests/work/pwa-release",
      "pages:work-products/tests/work/release-manifest",
    ],
    preflight_namespaces: [
      { repository: "pages", parent: "release", prefix: ".tmp-current-" },
      { repository: "pages", parent: "release", prefix: ".previous-current-" },
    ],
    ports: [4173, 4174],
    validation_sequence: [
      "npm run lint",
      "node node_modules/typescript/bin/tsc --noEmit",
      "npm run test:e2e",
      "npm run build",
      "npm run release:build",
      "npm test",
      "Pages git diff --check",
    ],
    terminal_invariants: ["verify terminal GREEN", "release staging and backup absent", "three Node test-work paths missing", "pages-four-plus-visual unchanged", "receipt create-new after terminal"],
  },
  "S22-R18": {
    predecessor: "S22-R17",
    wave: 3,
    repositories: ["worker:.", "pages:../UXUV-Pages"],
    targets: [
      "worker:work-products/evidence/section22/pair-validation.md",
      "worker:work-products/tests/work/execution-baseline-tool",
      "worker:work-products/tests/work/section22-r18-temp",
      "pages:.next",
      "pages:out",
      "pages:release",
      "pages:tsconfig.tsbuildinfo",
      "pages:work-products/tests/artifacts/playwright",
      "pages:work-products/tests/work/kvideo-webview-compatibility",
      "pages:work-products/tests/work/pwa-release",
      "pages:work-products/tests/work/release-manifest",
      "pages:work-products/tests/work/section21-candidate-draft",
    ],
    input_sets: ["governance", "worker-validation", "pages-runtime", "pages-offline-suite", "prior-validation-evidence"],
    protected_input_set: "pages-four-plus-visual",
    toolchain_profile: "pages-full",
    environment_profile: "pages-offline",
    task_temp: "worker:work-products/tests/work/section22-r18-temp",
    generated_namespaces: [{ repository: "pages", parent: "work-products/tests/work", prefix: "section21-rb-", initial: "none", terminal: "none" }],
    must_be_missing: [
      "worker:work-products/debug/execution-baselines/S22-R18",
      "worker:work-products/debug/execution-baselines/S22-R18/run-20260821-s22-r18-01",
      "worker:work-products/evidence/section22/receipts/S22-R18.json",
      ...pageEnvKeys,
      "worker:work-products/tests/work/execution-baseline-tool",
      "worker:work-products/tests/work/section22-r18-temp",
      "pages:work-products/tests/work/kvideo-webview-compatibility",
      "pages:work-products/tests/work/pwa-release",
      "pages:work-products/tests/work/release-manifest",
    ],
    create_missing: [
      "worker:work-products/debug/execution-baselines/S22-R18/run-20260821-s22-r18-01",
      "worker:work-products/evidence/section22/receipts/S22-R18.json",
      ...pageEnvKeys,
      "worker:work-products/tests/work/execution-baseline-tool",
      "pages:work-products/tests/work/kvideo-webview-compatibility",
      "pages:work-products/tests/work/pwa-release",
      "pages:work-products/tests/work/release-manifest",
    ],
    preflight_namespaces: [
      { repository: "pages", parent: "release", prefix: ".tmp-current-" },
      { repository: "pages", parent: "release", prefix: ".previous-current-" },
    ],
    ports: [4173, 4174],
    validation_sequence: [
      "Worker node --check _worker.js",
      "Worker npm test",
      "Worker npm run check:size",
      "Worker git diff --check",
      "Pages npm run lint",
      "Pages node node_modules/typescript/bin/tsc --noEmit",
      "Pages npm run test:e2e",
      "Pages npm run build",
      "Pages npm run release:build",
      "Pages npm test",
      "Pages git diff --check",
      "two-repository identity evidence and manifest scans",
      "local rollback drill inside generated namespace",
    ],
    terminal_invariants: ["verify terminal GREEN", "shared task temp identity unchanged", "generated namespace terminal none", "release staging and backup absent", "three Pages Node test-work paths missing", "pages-four-plus-visual unchanged", "receipt create-new after terminal", "LOCAL CANDIDATE / RELEASE HOLD"],
  },
};

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
  assert.notEqual(start, -1, `missing ${field}`);
  assert.notEqual(end, -1, `missing ${nextField}`);
  return [...task.slice(start, end).matchAll(/^  - `([^`]+)`/gm)].map((match) => match[1]);
};

const assertLegalApprovalState = (todo) => {
  const status = todo.match(/^- 批准状态：`(PENDING|APPROVED)`$/m)?.[1];
  const receipt = todo.match(/^- 批准记录：`([^`]+)`$/m)?.[1];
  assert.ok(status, "missing legal approval status");
  assert.ok(receipt, "missing approval receipt");
  if (status === "PENDING") assert.equal(receipt, "PENDING");
  if (status === "APPROVED") assert.match(receipt, /^USER_EXPLICIT \/ \d{4}-\d{2}-\d{2} \/ .+/u);
};

const requestBlueprints = (plan) => {
  const match = plan.match(/<!-- S22_EXECUTION_REQUEST_BLUEPRINTS -->\s*```json\s*([\s\S]*?)\s*```/u);
  assert.ok(match, "missing executable request blueprints");
  return JSON.parse(match[1]);
};

const pathsOverlap = (left, right) => {
  const leftPath = left.toLowerCase();
  const rightPath = right.toLowerCase();
  return leftPath === rightPath
    || leftPath.startsWith(`${rightPath}/`)
    || rightPath.startsWith(`${leftPath}/`);
};

const assertCanonicalRequestPath = (path, label) => {
  assert.equal(typeof path, "string", `${label} type`);
  assert.notEqual(path.length, 0, `${label} empty`);
  assert.equal(path.endsWith("/"), false, `${label} trailing slash`);
  assert.equal(path.includes("\\"), false, `${label} separator`);
  assert.equal(path.split("/").some((segment) => segment === "" || segment === "." || segment === ".."), false, `${label} segment`);
  assert.equal(/[*?\[\]]/u.test(path), false, `${label} glob`);
};

test("frozen execution-recovery plan has four complete serial task contracts", async () => {
  const plan = await read(frozenPlanPath);
  assert.match(plan, /^# 第三恢复计划：SPEC 第 22 节账户级用量与本地门禁$/m);
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
    /^- `orchestration_outputs`：/m,
    /^- Request 排除：/m,
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
    const baselineRoot = `work-products/debug/execution-baselines/${taskId}/`;
    assert.ok(scopedPaths(task, "写入", "生成输出").includes(baselineRoot), `${taskId} owns baseline root`);
    assert.match(task, /Worker repository 必须精确排除 `work-products\/todo\.md`/);
    assert.match(task, new RegExp(`work-products/evidence/section22/receipts/${taskId}\\.json`));
  }
  assert.doesNotMatch(plan, absolutePathPattern, "plan must not persist absolute paths");
});

test("frozen execution-recovery dependencies and waves are a complete linear DAG", async () => {
  const plan = await read(frozenPlanPath);
  assert.match(plan, /S22-R15 -> S22-R16 -> S22-R17 -> S22-R18/);
  for (const taskId of taskIds) {
    const dependencyLine = taskSection(plan, taskId).match(/^- 依赖：(.+)。$/m);
    assert.ok(dependencyLine, `${taskId} dependency`);
    assert.deepEqual(
      [...dependencyLine[1].matchAll(/S22-R\d{2}/g)].map((match) => match[0]),
      dependencies.get(taskId),
      `${taskId} dependency set`,
    );
  }
  const waves = [...plan.matchAll(/^\| Wave ([0-3]) \| ([^|]+) \| ([^|]+) \| (\d+) \| ([^|]+) \|/gm)]
    .map((match) => match.slice(1).map((value) => value.trim()));
  assert.deepEqual(waves, [
    ["0", "S22-R15", "S22-R16—R18", "1", "否 / 否"],
    ["1", "S22-R16", "S22-R17—R18", "1", "否 / 否"],
    ["2", "S22-R17", "S22-R18", "1", "否 / 否"],
    ["3", "S22-R18", "无", "1", "否 / 否"],
  ]);
});

test("frozen request exclusions cover todo, receipts, baseline roots, writes, and generated outputs", async () => {
  const plan = await read(frozenPlanPath);
  for (const taskId of taskIds) {
    const task = taskSection(plan, taskId);
    const write = scopedPaths(task, "写入", "生成输出");
    const generated = scopedPaths(task, "生成输出", "`orchestration_outputs`");
    const orchestrationOutputs = scopedPaths(task, "`orchestration_outputs`", "Request 排除");
    const exclusions = scopedPaths(task, "Request 排除", "共享资源");
    assert.ok(exclusions.includes("work-products/todo.md"), `${taskId} excludes todo`);
    assert.deepEqual(
      orchestrationOutputs,
      [`work-products/evidence/section22/receipts/${taskId}.json`],
      `${taskId} declares only its receipt as an orchestration output`,
    );
    for (const mutablePath of [...write, ...generated]) {
      assert.ok(exclusions.includes(mutablePath), `${taskId} excludes mutable path ${mutablePath}`);
    }
    assert.equal([...write, ...generated, ...orchestrationOutputs].some((path) => /[*?\[\]]/u.test(path)), false, `${taskId} mutable declarations contain no glob`);
    assert.equal(exclusions.some((path) => /[*?\[\]]/u.test(path)), false, `${taskId} exclusions contain no glob`);
    assert.equal(exclusions.includes("work-products/"), false, `${taskId} does not broadly exclude work-products`);
    assert.match(task, /receipt 为主代理 create-new 编排输出，不进入 worker target\/snapshot\/fingerprint/);
  }
  assert.match(plan, /Pages request 中的资源使用 `repository: pages` 与 Pages 仓库内相对路径/);
});

test("frozen plan contains exact executable per-task v2 request blueprints", async () => {
  const plan = await read(frozenPlanPath);
  const blueprints = requestBlueprints(plan);
  assert.equal(blueprints.schema_version, "s22-execution-recovery-request-blueprints/v1");
  assert.equal(blueprints.request_schema, "s22-execution-baseline-request/v2");
  assert.deepEqual(blueprints.runtime, expectedRuntime);
  assert.deepEqual(blueprints.failure_contract, {
    request_location: "task baseline root outside attempt",
    receipt_location: "task orchestration output",
    create_failure_timing: "write sanitized receipt immediately",
    attempt_id_terminal_state: "consumed",
    creating_staging: "may be atomically removed",
    subprocess_declared_cleanup: "allowed and recorded",
    main_agent_post_failure_cleanup: "forbidden",
    retention: "all artifacts still present after subprocess cleanup",
  });
  assert.deepEqual(blueprints.captured_resource_prestate, {
    missing_inputs: pageEnvKeys,
    directory_protected_inputs: ["pages:work-products/tests/fixtures/ui-review/section21-candidate"],
    other_inputs: "regular file",
    other_protected_inputs: "regular file",
    toolchain_entrypoints: "regular file",
  });
  assert.deepEqual(blueprints.tasks.map((task) => task.task_id), taskIds);

  assert.deepEqual(
    Object.fromEntries(Object.entries(blueprints.input_sets).map(([name, resources]) => [name, resources.map(resourceKey)])),
    expectedInputSets,
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(blueprints.protected_input_sets).map(([name, resources]) => [name, resources.map(resourceKey)])),
    expectedProtectedInputSets,
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(blueprints.toolchain_profiles).map(([name, resources]) => [name, resources.map(resourceKey)])),
    expectedToolchainProfiles,
  );
  assert.deepEqual(blueprints.environment_profiles, {
    "worker-local": {
      fixed: [{ key: "GIT_OPTIONAL_LOCKS", state: "present", sensitive: false, value: "0" }],
      task_temp_sha256: ["TEMP", "TMP", "TMPDIR"],
      absent: proxyKeys,
      preflight_absent_aliases: proxyAliasKeys,
    },
    "pages-offline": {
      fixed: [
        { key: "GIT_OPTIONAL_LOCKS", state: "present", sensitive: false, value: "0" },
        { key: "PORT", state: "present", sensitive: false, value: "4173" },
        { key: "NEXT_TELEMETRY_DISABLED", state: "present", sensitive: false, value: "1" },
        { key: "SECTION21_REVIEW_FIXTURE", state: "present", sensitive: false, value: "0" },
        { key: "UXUV_WRITE_VISUAL_CANDIDATE", state: "present", sensitive: false, value: "0" },
      ],
      task_temp_sha256: ["TEMP", "TMP", "TMPDIR"],
      absent: proxyKeys,
      preflight_absent_aliases: proxyAliasKeys,
    },
  });

  const todoPath = "work-products/todo.md";
  for (const task of blueprints.tasks) {
    const expected = expectedTasks[task.task_id];
    assert.equal(task.owner, `native-worker:${task.task_id.toLowerCase().replace("-", "_")}`, `${task.task_id} owner`);
    assert.equal(task.no_replace, true, `${task.task_id} no-replace`);
    assert.equal(task.predecessor, expected.predecessor, `${task.task_id} predecessor`);
    assert.equal(task.wave, expected.wave, `${task.task_id} wave`);
    assert.equal(task.attempt_id, attemptIds.get(task.task_id), `${task.task_id} attempt id`);
    const baselineRoot = `work-products/debug/execution-baselines/${task.task_id}`;
    const attemptRoot = `${baselineRoot}/${attemptIds.get(task.task_id)}`;
    assert.equal(task.attempt_root, attemptRoot, `${task.task_id} attempt root`);
    assert.equal(task.request_path, `${baselineRoot}/request-${attemptIds.get(task.task_id)}.json`, `${task.task_id} request path`);
    assertCanonicalRequestPath(task.request_path, `${task.task_id} request path`);
    assert.equal(pathsOverlap(task.attempt_root, todoPath), false, `${task.task_id} attempt overlaps todo`);
    assert.equal(pathsOverlap(task.request_path, todoPath), false, `${task.task_id} request overlaps todo`);
    assert.deepEqual(task.repositories.map(({ id, root }) => `${id}:${root}`), expected.repositories);
    assert.deepEqual(task.targets.map(resourceKey), expected.targets, `${task.task_id} targets`);
    assert.deepEqual(task.input_sets, expected.input_sets, `${task.task_id} input sets`);
    assert.equal(task.protected_input_set, expected.protected_input_set, `${task.task_id} protected set`);
    assert.equal(task.toolchain_profile, expected.toolchain_profile, `${task.task_id} toolchain`);
    assert.equal(task.environment_profile, expected.environment_profile, `${task.task_id} environment`);
    assert.equal(resourceKey(task.task_temp), expected.task_temp, `${task.task_id} temp`);
    assert.deepEqual(task.generated_namespaces, expected.generated_namespaces, `${task.task_id} namespaces`);
    assert.deepEqual(task.prestate.initial_must_be_missing, expected.must_be_missing, `${task.task_id} initial missing prestate`);
    assert.deepEqual(task.prestate.create_must_be_missing, expected.create_missing, `${task.task_id} create missing prestate`);
    assert.deepEqual(task.prestate.create_must_be_regular_files, [`worker:${task.request_path}`], `${task.task_id} request prestate`);
    assert.deepEqual(task.prestate.create_must_be_empty_directories, [expected.task_temp], `${task.task_id} temp prestate`);
    assert.deepEqual(task.prestate.preflight_namespaces_must_be_empty, expected.preflight_namespaces, `${task.task_id} preflight namespaces`);
    assert.deepEqual(task.prestate.ports_must_be_free, expected.ports, `${task.task_id} ports`);
    assert.deepEqual(task.validation_sequence, expected.validation_sequence, `${task.task_id} validation sequence`);
    assert.deepEqual(task.terminal_invariants, expected.terminal_invariants, `${task.task_id} terminal invariants`);
    if (task.generated_namespaces.length > 0) {
      assert.deepEqual(task.prestate.generated_namespace_matches, [], `${task.task_id} namespace prestate`);
    }

    const inputs = task.input_sets.flatMap((name) => blueprints.input_sets[name]);
    const protectedInputs = task.protected_input_set
      ? blueprints.protected_input_sets[task.protected_input_set]
      : [];
    const toolchain = blueprints.toolchain_profiles[task.toolchain_profile];
    const missingInputKeys = inputs.map(resourceKey).filter((key) => pageEnvKeys.includes(key));
    assert.equal(missingInputKeys.every((key) => task.prestate.create_must_be_missing.includes(key)), true, `${task.task_id} missing input prestate`);
    assert.equal(protectedInputs.filter((resource) => resource.path.endsWith("section21-candidate")).every(
      (resource) => blueprints.captured_resource_prestate.directory_protected_inputs.includes(resourceKey(resource)),
    ), true, `${task.task_id} protected directory type`);
    const environmentProfile = blueprints.environment_profiles[task.environment_profile];
    const environmentKeys = [
      ...environmentProfile.fixed.map(({ key }) => key),
      ...environmentProfile.task_temp_sha256,
      ...environmentProfile.absent,
    ];
    assert.equal(new Set(environmentKeys.map((key) => key.toLowerCase())).size, environmentKeys.length, `${task.task_id} environment aliases`);
    assert.equal(environmentProfile.preflight_absent_aliases.every((key) => !environmentKeys.includes(key)), true, `${task.task_id} preflight aliases leak into request`);
    const orchestration = [{
      repository: "worker",
      path: `work-products/evidence/section22/receipts/${task.task_id}.json`,
    }];
    assert.deepEqual(task.orchestration_outputs, orchestration, `${task.task_id} orchestration outputs`);
    assert.ok(task.targets.some((resource) => resourceKey(resource) === resourceKey(task.task_temp)), `${task.task_id} temp target`);
    const materializedRequest = {
      schema_version: blueprints.request_schema,
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
      toolchain: {
        node_version: blueprints.runtime.node_version,
        entrypoints: toolchain,
      },
      environment: [
        ...environmentProfile.fixed,
        ...environmentProfile.task_temp_sha256.map((key) => ({
          key,
          state: "present",
          sensitive: true,
          sha256: "0".repeat(64),
        })),
        ...environmentProfile.absent.map((key) => ({ key, state: "absent", sensitive: false })),
      ],
      generated_namespaces: task.generated_namespaces,
    };
    assert.deepEqual(Object.keys(materializedRequest).sort(), [
      "attempt_id", "attempt_root", "environment", "generated_namespaces", "inputs",
      "no_replace", "orchestration_outputs", "owner", "protected_inputs", "repositories",
      "schema_version", "targets", "task_id", "toolchain",
    ]);
    assert.equal(materializedRequest.environment.length, environmentKeys.length, `${task.task_id} environment materialization`);
    assert.equal(materializedRequest.environment.every((entry) => [
      "key,sensitive,state,value",
      "key,sensitive,sha256,state",
      "key,sensitive,state",
    ].includes(Object.keys(entry).sort().join(","))), true, `${task.task_id} environment key sets`);

    const mutableAndCaptured = [
      ...task.targets,
      ...inputs,
      ...protectedInputs,
      ...task.orchestration_outputs,
      ...toolchain,
    ];
    for (const [index, resource] of mutableAndCaptured.entries()) {
      assertCanonicalRequestPath(resource.path, `${task.task_id} resource ${index}`);
      if (resource.repository === "worker") {
        assert.equal(pathsOverlap(resource.path, todoPath), false, `${task.task_id} resource captures todo`);
      }
    }
    for (let left = 0; left < task.targets.length + inputs.length + protectedInputs.length + task.orchestration_outputs.length; left += 1) {
      for (let right = left + 1; right < task.targets.length + inputs.length + protectedInputs.length + task.orchestration_outputs.length; right += 1) {
        const resources = [...task.targets, ...inputs, ...protectedInputs, ...task.orchestration_outputs];
        if (resources[left].repository !== resources[right].repository) continue;
        assert.equal(pathsOverlap(resources[left].path, resources[right].path), false, `${task.task_id} overlapping resources`);
      }
    }

    const expectedExclusions = new Map(task.repositories.map(({ id }) => [id, []]));
    expectedExclusions.get("worker").push(todoPath, baselineRoot, attemptRoot, orchestration[0].path);
    for (const target of task.targets) expectedExclusions.get(target.repository).push(target.path);
    for (const repository of task.repositories) {
      assert.deepEqual(
        [...repository.exclude].sort(),
        [...new Set(expectedExclusions.get(repository.id))].sort(),
        `${task.task_id} ${repository.id} exclusions`,
      );
      for (const [index, exclusion] of repository.exclude.entries()) {
        assertCanonicalRequestPath(exclusion, `${task.task_id} exclusion ${index}`);
        if (repository.id === "worker" && pathsOverlap(exclusion, todoPath)) {
          assert.equal(exclusion, todoPath, `${task.task_id} broad todo exclusion`);
        }
      }
    }
    assert.equal(task.repositories.find(({ id }) => id === "worker").exclude.filter((path) => path === todoPath).length, 1);

    for (const namespace of task.generated_namespaces) {
      assertCanonicalRequestPath(namespace.parent, `${task.task_id} namespace parent`);
      assert.equal(/[*?\[\]/]/u.test(namespace.prefix), false, `${task.task_id} namespace prefix`);
      if (namespace.repository === "worker") {
        const child = todoPath.startsWith(`${namespace.parent}/`)
          ? todoPath.slice(namespace.parent.length + 1).split("/")[0]
          : "";
        assert.equal(namespace.parent === todoPath || child.startsWith(namespace.prefix), false, `${task.task_id} namespace captures todo`);
      }
    }
  }

  assert.match(plan, /todo 只允许作为 Worker repository 的精确 exclusion/);
  assert.match(plan, /create、verify 与 fingerprint 生效/);
  assert.match(plan, /主代理必须在 attempt 外保留原 request、净化错误与 create-failure receipt，并消费该 attempt ID/);
  assert.match(plan, /可删除尚未成形的 `\.creating` staging/);
  assert.match(plan, /subprocess 在既有 `finally` 中声明清理/);
  assert.match(plan, /主代理失败后不得追加清理/);
});

test("frozen requests use the v2 executable isolation contract", async () => {
  const plan = await read(frozenPlanPath);
  assert.match(plan, /`s22-execution-baseline-request\/v2`/);
  assert.match(plan, /只允许 `worker` → `\.` 与 `pages` → `\.\.\/UXUV-Pages`/);
  assert.match(plan, /create 在写入 attempt\/staging 前机器校验 todo、attempt root、targets 与 `orchestration_outputs` 的排除覆盖/);
  for (const taskId of taskIds) {
    const task = taskSection(plan, taskId);
    const attemptRoot = `work-products/debug/execution-baselines/${taskId}/${attemptIds.get(taskId)}`;
    assert.match(task, new RegExp(attemptRoot));
    assert.ok(
      scopedPaths(task, "Request 排除", "共享资源").includes(attemptRoot),
      `${taskId} explicitly excludes its exact attempt root`,
    );
    assert.match(task, /`orchestration_outputs` 使用 v2 request 字段/);
  }
  const finalTask = taskSection(plan, "S22-R18");
  assert.match(finalTask, /`repository: pages`、`parent: work-products\/tests\/work`、`prefix: section21-rb-`/);
});

test("frozen downstream preflights cover local tools, ports, offline environment, release, and protected inputs", async () => {
  const plan = await read(frozenPlanPath);
  for (const taskId of ["S22-R15", "S22-R17", "S22-R18"]) {
    const task = taskSection(plan, taskId);
    for (const token of [
      "Playwright", "Next", "esbuild", "Chrome", "4173", "4174",
      "GIT_OPTIONAL_LOCKS=0", "NEXT_TELEMETRY_DISABLED=1",
      "SECTION21_REVIEW_FIXTURE=0", "UXUV_WRITE_VISUAL_CANDIDATE=0",
      "TEMP/TMP/TMPDIR", "proxy",
    ]) assert.ok(task.includes(token), `${taskId} missing ${token}`);
  }
  for (const taskId of ["S22-R17", "S22-R18"]) {
    const task = taskSection(plan, taskId);
    for (const token of ["ESLint", "TypeScript", "`release/` 作为完整可回滚 target snapshot", "next/font"] ) {
      assert.ok(task.includes(token), `${taskId} missing ${token}`);
    }
  }
  assert.match(taskSection(plan, "S22-R18"), /四个 Pages `protected_inputs`/);
  assert.ok(plan.includes("request JSON 中的路径不得保留目录末尾 `/`"));
});

test("approval snapshot exists byte-identically across the legal approval transition", async () => {
  const [plan, todo, snapshot] = await Promise.all([
    read(frozenPlanPath),
    read(frozenTodoPath),
    read("../debug/approval-baselines/s22-account-usage-execution-recovery-20260821-02/plan.md"),
  ]);
  assert.equal(snapshot, plan);
  assert.match(todo, /- 字节比对：`IDENTICAL`/);
  assertLegalApprovalState(todo);
  assert.doesNotThrow(() => assertLegalApprovalState(
    todo
      .replace("- 批准状态：`PENDING`", "- 批准状态：`APPROVED`")
      .replace("- 批准记录：`PENDING`", "- 批准记录：`USER_EXPLICIT / 2026-08-21 / 批准当前计划`"),
  ));
});

test("frozen todo is a legal single-writer progressive mirror", async () => {
  const [plan, todo] = await Promise.all([read(frozenPlanPath), read(frozenTodoPath)]);
  assert.match(plan, /todo 由主代理单写；worker 不得改写 plan、todo/);
  assert.match(todo, /`work-products\/todo\.md` 仅由主代理写入/);
  const legalStates = new Set(["pending", "in_progress", "blocked", "completed"]);
  const table = new Map(
    [...todo.matchAll(/^\| (S22-R\d{2}) \| ([a-z_]+) \| (\d+) \| ([^|]+) \|/gm)]
      .map((match) => [match[1], { state: match[2], wave: match[3], dependency: match[4].trim() }]),
  );
  assert.deepEqual([...table.keys()], taskIds);
  const tasks = new Map(
    [...todo.matchAll(/^- \[([ x])\] (S22-R\d{2})[^\r\n]*\r?\n  - 状态：([a-z_]+)$/gm)]
      .map((match) => [match[2], { checked: match[1] === "x", state: match[3] }]),
  );
  assert.deepEqual([...tasks.keys()], taskIds);
  for (const [index, taskId] of taskIds.entries()) {
    const row = table.get(taskId);
    const task = tasks.get(taskId);
    assert.ok(legalStates.has(row.state), `${taskId} table state`);
    assert.equal(task.state, row.state, `${taskId} state mirror`);
    assert.equal(task.checked, task.state === "completed", `${taskId} checkbox mirror`);
    assert.equal(row.wave, String(index), `${taskId} wave`);
    assert.equal(row.dependency, index === 0 ? "无" : taskIds[index - 1], `${taskId} dependency mirror`);
    if (row.state !== "pending") {
      for (const dependency of dependencies.get(taskId)) assert.equal(table.get(dependency).state, "completed");
    }
  }
  assert.ok([...table.values()].filter((row) => row.state === "in_progress").length <= 1);
  assert.doesNotMatch(todo, absolutePathPattern, "todo must not persist absolute paths");
});
