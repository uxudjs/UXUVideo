import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const resourceKey = ({ repository, path }) => repository + ":" + path;
const candidateId = "s22-account-usage-final-gate-recovery-20260822-05";
const taskId = "S22-R19";
const attemptId = "run-20260821-s22-r19-01";
const baselineRoot = "work-products/debug/execution-baselines/S22-R19";
const attemptRoot = baselineRoot + "/" + attemptId;
const requestPath = baselineRoot + "/request-" + attemptId + ".json";
const evidencePath = "work-products/evidence/section22/final-gate-recovery-validation.md";
const receiptPath = "work-products/evidence/section22/receipts/S22-R19.json";
const todoPath = "work-products/todo.md";
const absolutePathPattern = /(?:^|[\s`'"])(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/mu;
const r19Plan = () => read("../debug/approval-baselines/" + candidateId + "/plan.md");
const r19Todo = () => read("../evidence/section22/blocked-r19-todo-v2.md");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const todoState = (todo) => {
  const header = todo.match(/^> 状态：([^\r\n]+)$/m)?.[1];
  const approval = todo.match(/^- 批准状态：`(PENDING|APPROVED)`$/m)?.[1];
  const approvalRecord = todo.match(/^- 批准记录：`([^`]+)`$/m)?.[1];
  const rowState = todo.match(/^\| S22-R19 \| (pending|in_progress|completed|blocked) \| 0 \| 无 \| 否 \|$/m)?.[1];
  const task = todo.match(/^- \[([ x])\] S22-R19[^\r\n]*\r?\n  - 状态：(pending|in_progress|completed|blocked)$/m);
  assert.ok(header, "missing todo header state");
  assert.ok(approval, "missing approval state");
  assert.ok(approvalRecord, "missing approval record");
  assert.ok(rowState, "missing R19 row state");
  assert.ok(task, "missing R19 task state");
  assert.equal(task[2], rowState, "task and row state differ");
  assert.equal(task[1], rowState === "completed" ? "x" : " ", "checkbox is not derived from task state");
  if (approval === "PENDING") {
    assert.equal(approvalRecord, "PENDING");
    assert.equal(rowState, "pending");
    assert.equal(header, "PLAN CANDIDATE / PENDING APPROVAL / RELEASE HOLD");
  } else {
    assert.match(approvalRecord, /^USER_EXPLICIT \/ \d{4}-\d{2}-\d{2} \/ .+/u);
    const expectedHeader = {
      pending: "APPROVED / READY FOR BUILD / RELEASE HOLD",
      in_progress: "APPROVED / BUILD IN PROGRESS / RELEASE HOLD",
      completed: "LOCAL CANDIDATE / RELEASE HOLD",
      blocked: "APPROVED / BLOCKED / RELEASE HOLD",
    }[rowState];
    assert.equal(header, expectedHeader);
  }
  return { approval, rowState };
};

const todoFixture = ({ header, approval, approvalRecord, state }) => [
  "# fixture",
  "> 状态：" + header,
  "- 批准状态：`" + approval + "`",
  "- 批准记录：`" + approvalRecord + "`",
  "| S22-R19 | " + state + " | 0 | 无 | 否 |",
  "- [" + (state === "completed" ? "x" : " ") + "] S22-R19 fixture",
  "  - 状态：" + state,
].join("\n");

const assertInProgressMirrors = (todo, state) => {
  const expected = state === "in_progress" ? 1 : 0;
  assert.equal(
    [...todo.matchAll(/^\| S22-R19 \| in_progress \| 0 \| 无 \| 否 \|$/gm)].length,
    expected,
    "unexpected in_progress table mirror count",
  );
  assert.equal(
    [...todo.matchAll(/^  - 状态：in_progress$/gm)].length,
    expected,
    "unexpected in_progress task mirror count",
  );
};

const pageEnvKeys = [
  "pages:.env",
  "pages:.env.local",
  "pages:.env.development",
  "pages:.env.development.local",
  "pages:.env.production",
  "pages:.env.production.local",
];

const expectedTargets = [
  "worker:" + evidencePath,
  "worker:work-products/tests/work/execution-baseline-tool",
  "worker:work-products/tests/work/section22-r19-temp",
  "pages:.next",
  "pages:out",
  "pages:release",
  "pages:tsconfig.tsbuildinfo",
  "pages:work-products/tests/artifacts/playwright",
  "pages:work-products/tests/work/kvideo-webview-compatibility",
  "pages:work-products/tests/work/pwa-release",
  "pages:work-products/tests/work/release-manifest",
  "pages:work-products/tests/work/section21-candidate-draft",
];

const expectedProtected = [
  "pages:package.json",
  "pages:work-products/tests/iptv-retirement-contract.test.mjs",
  "pages:work-products/tests/pages-deployment.test.mjs",
  "pages:work-products/tests/repository-test-isolation.test.mjs",
  "pages:work-products/tests/fixtures/ui-review/section21-candidate",
];

const parseBlueprint = (plan) => {
  const match = plan.match(/<!-- S22_FINAL_GATE_RECOVERY_REQUEST_BLUEPRINT -->\s*```json\s*([\s\S]*?)\s*```/u);
  assert.ok(match, "missing R19 executable request blueprint");
  return JSON.parse(match[1]);
};

const overlaps = (left, right) => {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  return a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
};

const assertCanonical = (path, label) => {
  assert.equal(typeof path, "string", label + " type");
  assert.notEqual(path.length, 0, label + " empty");
  assert.equal(path.endsWith("/"), false, label + " trailing slash");
  assert.equal(path.includes("\\"), false, label + " separator");
  assert.equal(path.split("/").some((segment) => segment === "" || segment === "." || segment === ".."), false, label + " segment");
  assert.equal(/[*?\[\]]/u.test(path), false, label + " glob");
};

test("R19 candidate preserves blocked R18 as immutable history", async () => {
  const [plan, oldPlan, frozenTodo, receipt, debug] = await Promise.all([
    r19Plan(),
    read("../debug/approval-baselines/s22-account-usage-execution-recovery-20260821-02/plan.md"),
    read("../evidence/section22/blocked-r18-todo.md"),
    read("../evidence/section22/receipts/S22-R18.json"),
    read("../debug/s22-r18-candidate-hygiene-enobufs.md"),
  ]);

  assert.match(oldPlan, /^# 第三恢复计划：SPEC 第 22 节账户级用量与本地门禁$/m);
  assert.match(frozenTodo, /^\| S22-R18 \| blocked \| 3 \| S22-R17 \| 否 \|$/m);
  assert.equal(JSON.parse(receipt).status, "blocked");
  assert.match(debug, /\| `npm test` \| 216 pass，0 fail \|/u);
  assert.match(plan, /S22-R18.*永久保持 blocked、只读且不可复用/s);
  assert.doesNotMatch(plan, /^### S22-R18\b/m);
  assert.match(plan, /^### S22-R19\b/m);
});

test("R19 is one complete serial task with an atomic legal-state todo mirror", async () => {
  const [plan, todo] = await Promise.all([r19Plan(), r19Todo()]);
  assert.match(plan, /^# 第五恢复计划：SPEC 第 22 节最终本地门禁$/m);
  assert.match(plan, /`fast requested: false`/);
  assert.match(plan, /执行策略：`serial`/);
  assert.match(plan, /安全并发上限：1/);
  assert.deepEqual([...plan.matchAll(/^### (S22-R\d{2})\b/gm)].map((match) => match[1]), [taskId]);

  const taskStart = plan.indexOf("### S22-R19 ");
  const taskEnd = plan.indexOf("## 5. ", taskStart);
  const task = plan.slice(taskStart, taskEnd);
  for (const field of [
    "- 目标：", "- 范围：", "- 依赖：", "- 执行基线根：", "- 读取：",
    "- 写入：", "- 生成输出：", "- `orchestration_outputs`：", "- Request 排除：",
    "- 共享资源：", "- 验收：", "- 聚焦验证：", "- 波次与启动条件：",
    "- 编辑可并行：", "- 聚焦验证可并行：", "- 主代理集成责任：", "- 失败/回滚：",
  ]) assert.ok(task.includes(field), "missing task field " + field);

  assert.match(todo, new RegExp("> 候选 ID：`" + candidateId + "`"));
  const { rowState } = todoState(todo);
  assertInProgressMirrors(todo, rowState);
  assert.doesNotMatch(todo, absolutePathPattern);
  assert.match(todo, /todo 是编排例外，只作为 Worker repository 精确 exclusion/);
});

test("R19 todo contract covers approval and every legal execution state", () => {
  const approvalRecord = "USER_EXPLICIT / 2026-08-22 / 批准计划";
  const legal = [
    { header: "PLAN CANDIDATE / PENDING APPROVAL / RELEASE HOLD", approval: "PENDING", approvalRecord: "PENDING", state: "pending" },
    { header: "APPROVED / READY FOR BUILD / RELEASE HOLD", approval: "APPROVED", approvalRecord, state: "pending" },
    { header: "APPROVED / BUILD IN PROGRESS / RELEASE HOLD", approval: "APPROVED", approvalRecord, state: "in_progress" },
    { header: "LOCAL CANDIDATE / RELEASE HOLD", approval: "APPROVED", approvalRecord, state: "completed" },
    { header: "APPROVED / BLOCKED / RELEASE HOLD", approval: "APPROVED", approvalRecord, state: "blocked" },
  ];
  for (const state of legal) {
    const fixture = todoFixture(state);
    assert.deepEqual(todoState(fixture), {
      approval: state.approval,
      rowState: state.state,
    });
    assertInProgressMirrors(fixture, state.state);
  }
  assert.throws(() => todoState(todoFixture({
    header: "PLAN CANDIDATE / PENDING APPROVAL / RELEASE HOLD",
    approval: "PENDING",
    approvalRecord: "PENDING",
    state: "in_progress",
  })));
});

test("R19 blueprint materializes one exact isolated v2 request", async () => {
  const plan = await r19Plan();
  const blueprints = parseBlueprint(plan);
  assert.equal(blueprints.schema_version, "s22-final-gate-recovery-request-blueprints/v1");
  assert.equal(blueprints.request_schema, "s22-execution-baseline-request/v2");
  assert.deepEqual(blueprints.runtime, {
    node_version: "v20.19.2",
    npm_version: "10.8.2",
    chrome_channel: "Google Chrome",
    chrome_version: "151.0.7922.173",
    fallbacks_forbidden: ["npx", "install", "network"],
  });
  assert.equal(blueprints.tasks.length, 1);

  const task = blueprints.tasks[0];
  assert.deepEqual({
    task_id: task.task_id,
    owner: task.owner,
    no_replace: task.no_replace,
    predecessor: task.predecessor,
    wave: task.wave,
    attempt_id: task.attempt_id,
    attempt_root: task.attempt_root,
    request_path: task.request_path,
  }, {
    task_id: taskId,
    owner: "native-worker:s22_r19",
    no_replace: true,
    predecessor: null,
    wave: 0,
    attempt_id: attemptId,
    attempt_root: attemptRoot,
    request_path: requestPath,
  });

  assert.deepEqual(task.repositories.map(({ id, root }) => id + ":" + root), ["worker:.", "pages:../UXUV-Pages"]);
  assert.deepEqual(task.targets.map(resourceKey), expectedTargets);
  assert.deepEqual(task.orchestration_outputs.map(resourceKey), ["worker:" + receiptPath]);
  assert.equal(resourceKey(task.task_temp), "worker:work-products/tests/work/section22-r19-temp");
  assert.deepEqual(task.generated_namespaces, [{
    repository: "pages",
    parent: "work-products/tests/work",
    prefix: "section21-rb-",
    initial: "none",
    terminal: "none",
  }]);

  const inputs = task.input_sets.flatMap((name) => blueprints.input_sets[name]);
  const protectedInputs = blueprints.protected_input_sets[task.protected_input_set];
  const toolchain = blueprints.toolchain_profiles[task.toolchain_profile];
  assert.deepEqual(protectedInputs.map(resourceKey), expectedProtected);
  assert.equal(inputs.some((resource) => resourceKey(resource) === "pages:release"), false, "release must be target-only");
  assert.deepEqual(blueprints.captured_resource_prestate.target_only_resources, ["pages:release"]);
  assert.ok(inputs.some((resource) => resourceKey(resource) === "worker:work-products/tests/section22-final-gate-recovery-plan-contract.test.mjs"));
  assert.ok(inputs.some((resource) => resourceKey(resource) === "worker:work-products/debug/s22-r18-candidate-hygiene-enobufs.md"));

  const resources = [...task.targets, ...inputs, ...protectedInputs, ...task.orchestration_outputs];
  for (const [index, resource] of resources.entries()) assertCanonical(resource.path, "resource " + index);
  for (let left = 0; left < resources.length; left += 1) {
    for (let right = left + 1; right < resources.length; right += 1) {
      if (resources[left].repository !== resources[right].repository) continue;
      assert.equal(overlaps(resources[left].path, resources[right].path), false, "overlap " + resourceKey(resources[left]) + " and " + resourceKey(resources[right]));
    }
  }

  const worker = task.repositories.find(({ id }) => id === "worker");
  const pages = task.repositories.find(({ id }) => id === "pages");
  const requiredWorkerExclusions = [
    todoPath, evidencePath, receiptPath, baselineRoot, attemptRoot,
    "work-products/tests/work/execution-baseline-tool",
    "work-products/tests/work/section22-r19-temp",
  ];
  const requiredPagesExclusions = expectedTargets
    .filter((key) => key.startsWith("pages:"))
    .map((key) => key.slice("pages:".length));
  assert.deepEqual([...worker.exclude].sort(), [...requiredWorkerExclusions].sort());
  assert.deepEqual([...pages.exclude].sort(), [...requiredPagesExclusions].sort());
  assert.equal(worker.exclude.filter((path) => path === todoPath).length, 1);
  assert.equal(worker.exclude.includes("work-products"), false);

  for (const path of [...worker.exclude, ...pages.exclude, task.request_path, task.attempt_root]) assertCanonical(path, "request path");
  assert.deepEqual(task.prestate.initial_must_be_missing, [
    "worker:" + baselineRoot,
    "worker:" + attemptRoot,
    "worker:" + evidencePath,
    "worker:" + receiptPath,
    "worker:work-products/tests/work/execution-baseline-tool",
    "worker:work-products/tests/work/section22-r19-temp",
    ...pageEnvKeys,
    "pages:work-products/tests/work/kvideo-webview-compatibility",
    "pages:work-products/tests/work/pwa-release",
    "pages:work-products/tests/work/release-manifest",
  ]);
  assert.deepEqual(task.prestate.create_must_be_regular_files, ["worker:" + requestPath]);
  assert.deepEqual(task.prestate.create_must_be_empty_directories, ["worker:work-products/tests/work/section22-r19-temp"]);
  assert.deepEqual(task.prestate.ports_must_be_free, [4173, 4174]);
  assert.deepEqual(task.prestate.generated_namespace_matches, []);
  assert.match(task.prestate.paths_must_not_be_reparse_points, /all declared roots/);

  assert.deepEqual(toolchain.map(resourceKey), [
    "worker:work-products/scripts/execution-baseline.mjs",
    "worker:scripts/check-worker-size.mjs",
    "pages:node_modules/@playwright/test/cli.js",
    "pages:node_modules/next/dist/bin/next",
    "pages:node_modules/esbuild/bin/esbuild",
    "pages:node_modules/eslint/bin/eslint.js",
    "pages:node_modules/typescript/bin/tsc",
  ]);
  const environment = blueprints.environment_profiles[task.environment_profile];
  assert.deepEqual(environment.task_temp_sha256, ["TEMP", "TMP", "TMPDIR"]);
  assert.deepEqual(environment.absent, ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"]);
  assert.deepEqual(environment.preflight_absent_aliases, ["http_proxy", "https_proxy", "all_proxy", "no_proxy"]);
});

test("R19 closes rollback, process-evidence, and release overlap boundaries", async () => {
  const plan = await r19Plan();
  const blueprints = parseBlueprint(plan);
  const task = blueprints.tasks[0];
  assert.ok(task.targets.some((resource) => resourceKey(resource) === "pages:work-products/tests/work/section21-candidate-draft"));
  assert.ok(task.repositories.find(({ id }) => id === "pages").exclude.includes("work-products/tests/work/section21-candidate-draft"));
  assert.match(plan, /不使用 `--generate`/);
  assert.match(plan, /git clone --local --no-hardlinks --no-checkout/);
  assert.match(plan, /两个源仓 `\.git\/` 永久只读/);
  assert.match(plan, /通用 candidate-hygiene 不覆盖流程目录/);
  assert.match(plan, /receipt create-new 后回读必须与预审计字节完全一致/);
  assert.match(plan, /`pages:release` 是 target-only/);
  assert.ok(task.validation_sequence.includes("main-agent evidence audit and pre-serialized receipt audit"));
  assert.ok(task.validation_sequence.includes("receipt create-new and byte-identical readback"));
  assert.ok(task.terminal_invariants.includes("evidence and receipt independently audited"));
});

test("candidate snapshot is byte-identical and approval remains a separate legal gate", async () => {
  const [snapshot, manifestRaw, todo] = await Promise.all([
    r19Plan(),
    read("../debug/execution-baselines/S22-R19/run-20260821-s22-r19-01/manifest.json"),
    r19Todo(),
  ]);
  const manifest = JSON.parse(manifestRaw);
  const identities = manifest.inputs.filter(({ repository, path }) => (
    repository === "worker"
    && (path === "work-products/plan.md" || path === "work-products/debug/approval-baselines/" + candidateId + "/plan.md")
  ));
  assert.equal(identities.length, 2);
  for (const input of identities) {
    assert.equal(input.identity.size, Buffer.byteLength(snapshot));
    assert.equal(input.identity.sha256, sha256(snapshot));
  }
  assert.match(todo, /- 字节比对：`IDENTICAL`/);
  todoState(todo);
  assert.match(todo, /批准后仍需用户另行调用 `@uxu-code:build auto`/);
  assert.match(snapshot, /旧候选批准或旧 build-auto 授权不能继承/);
  assert.doesNotMatch(snapshot, absolutePathPattern);
});
