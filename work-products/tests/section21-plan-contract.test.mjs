import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const section = (plan, start, end) => {
  const from = plan.indexOf(start);
  const to = plan.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `missing section ${start}`);
  assert.notEqual(to, -1, `missing section boundary ${end}`);
  return plan.slice(from, to);
};

test("Section 21 plan keeps shared HLS behavior before retiring IPTV", async () => {
  const plan = await read("../plan.md");
  const task = section(plan, "### S21-T08", "### S21-T09");
  assert.match(task, /lib\/player\/hls-compatibility\.ts/);
  assert.match(task, /selectCompatibleHlsLevel/);
  assert.match(task, /supportsHevcPlayback/);
  assert.match(task, /useHlsPlayer/);
  assert.match(task, /普通.*HLS/);
  assert.match(task, /删除五个 IPTV Node 正向测试.*正式 Node 清单在 T08/s);
  assert.match(
    task,
    /删除 `lib\/iptv\/playback-policy\.ts` 前，先把 `selectCompatibleHlsLevel`.*迁入.*更新 `useHlsPlayer`/s,
    "T08 must migrate shared HLS behavior before deleting the IPTV module",
  );
  for (const testFile of [
    "iptv-retirement-contract.test.mjs",
    "hls-compatibility.test.mjs",
  ]) assert.match(task, new RegExp(testFile.replaceAll(".", "\\.")), testFile);
  assert.match(task, /section21-ui-contract\.test\.mjs.*聚焦命令单独运行/s);
  const finalUiTask = section(plan, "### S21-T13", "### S21-T14");
  assert.match(finalUiTask, /package\.json.*section21-ui-contract\.test\.mjs.*正式 Node 清单/s);
  const releaseTask = section(plan, "### S21-T14", "### S21-T15");
  assert.match(releaseTask, /Pages package\/lock 在 T08 后只读/);
});

test("Section 21 plan freezes security, scope, visual, performance, and hygiene contracts", async () => {
  const plan = await read("../plan.md");
  for (const token of [
    "section21-security-baseline.test.mjs",
    "candidate-hygiene.test.mjs",
    "root-prefix-inventory.txt",
    "iptv-default-source-inventory.txt",
    "section21-visual.e2e.spec.ts",
    "section21-performance.e2e.spec.ts",
    "section21-inventory-generator.mjs",
    "binary-allowlist.json",
    "github-pages-physical",
    "npm audit --audit-level=high",
    "npm audit signatures",
  ]) assert.match(plan, new RegExp(token.replaceAll(".", "\\.")), token);
  assert.doesNotMatch(plan, /rg --no-ignore -n/);
  assert.doesNotMatch(plan, /\.\.\/UXUV-Pages\/README\.md/);
});

test("Section 21 plan keeps immutable baseline provenance and snapshots immediately before T08", async () => {
  const plan = await read("../plan.md");
  const baseline = section(plan, "### S21-T01", "### S21-T02");
  const retirement = section(plan, "### S21-T08", "### S21-T09");
  assert.match(baseline, /--write-baseline/);
  assert.match(baseline, /常规测试缺失即失败且永不写入/);
  assert.match(baseline, /生成此内容基线的计划/);
  assert.match(plan, /--write-snapshot S21-PRE-T08/);
  assert.match(retirement, /attempt 2.*既有 `S21-PRE-T08` 快照.*不得.*重新生成/s);
  assert.match(plan, /T07 完成后、T08 启动前/);
  assert.match(retirement, /baseline 只用于来源与历史角色审计/);
  assert.doesNotMatch(retirement, /冻结 SHA 不一致即停止/);
});

test("Section 21 replacement plan is serial, standing-approved, and keeps network audit recommended", async () => {
  const plan = await read("../plan.md");
  assert.match(plan, /fast = false/);
  assert.match(plan, /安全并发上限：1/);
  assert.match(plan, /T01 → T02 → T06 → T03 → T05 → T04 → T07 → T08/);
  assert.match(plan, /STANDING APPROVAL ACTIVE/);
  assert.doesNotMatch(plan, /EXPLICIT APPROVAL REQUIRED/);
  assert.doesNotMatch(plan, /S21-Txx\.forward\.patch/);
  assert.match(plan, /依赖漏洞\/签名检查仅作为 `Recommended`/);
  assert.match(plan, /不阻断本地候选完成/);
});

test("Section 21 plan reads bundled Next 16 App Router routing documents", async () => {
  const task = section(await read("../plan.md"), "### S21-T05", "### S21-T06");
  for (const token of [
    "basePath,assetPrefix",
    "01-app/02-guides/static-exports.md",
    "01-app/03-api-reference/02-components/link.md",
    "basePath 构建期内联",
    "worker-origin",
    "github-pages-physical",
  ]) assert.match(task, new RegExp(token.replaceAll(".", "\\.")), token);
});

test("Section 21 plan switches advertised identities only with complete v2 semantics", async () => {
  const plan = await read("../plan.md");
  const workerRoot = section(plan, "### S21-T02", "### S21-T03");
  const workerV2 = section(plan, "### S21-T03", "### S21-T04");
  const pagesRoot = section(plan, "### S21-T05", "### S21-T06");
  const pagesV2 = section(plan, "### S21-T08", "### S21-T09");
  assert.match(workerRoot, /1\.1\.4.*API Contract `1`/s);
  assert.match(workerV2, /2\.0\.0.*API Contract `2`/s);
  assert.match(pagesRoot, /0\.2\.1.*API `1`/s);
  assert.match(pagesV2, /0\.3\.0.*manifest API `2`/s);
});

test("todo keeps machine identity out of human approval copy and mirrors legal task states", async () => {
  const [plan, todo, receiptText] = await Promise.all([
    read("../plan.md"),
    read("../todo.md"),
    read("../evidence/section21/receipts/S21-T15.json"),
  ]);
  const sha = createHash("sha256").update(plan).digest("hex");
  const receipt = JSON.parse(receiptText);
  assert.doesNotMatch(todo, /SHA-?256|\b[a-f0-9]{64}\b/i);
  assert.match(todo, /内部计划漂移检测：由机器证据处理，不作为人工审批门/);
  assert.equal(receipt.planSha256, sha, "machine receipt must retain the internal plan binding");
  const taskLines = todo.split(/\r?\n/).filter((line) => /^- \[[ x]\] `S21-T\d{2}`/.test(line));
  assert.equal(taskLines.length, 15);
  for (const line of taskLines) {
    const match = line.match(/^- \[([ x])\] `S21-T\d{2}`｜state: `(pending|in_progress|blocked|failed|completed)`/);
    assert.ok(match, `invalid task ledger line: ${line}`);
    assert.equal(match[1] === "x", match[2] === "completed", `checkbox/state mismatch: ${line}`);
  }
});

test("approval holds never retain active attempts and in-progress receipts bind the current plan", async () => {
  const [plan, todo, invalidationText] = await Promise.all([
    read("../plan.md"),
    read("../todo.md"),
    read("../evidence/section21/receipts/review-invalidation.json"),
  ]);
  const sha = createHash("sha256").update(plan).digest("hex");
  const invalidation = JSON.parse(invalidationText);
  assert.match(invalidation.archive, /^invalidated\/[a-f0-9]{8}$/);
  for (const entry of invalidation.invalidates) {
    const archived = await read(`../evidence/section21/receipts/${invalidation.archive}/${entry.path}`);
    assert.equal(createHash("sha256").update(archived).digest("hex"), entry.sha256, entry.path);
  }
  const taskLines = todo.split(/\r?\n/).filter((line) => /^- \[[ x]\] `S21-T\d{2}`/.test(line));
  const active = taskLines.flatMap((line) => {
    const match = line.match(/`(S21-T\d{2})`｜state: `(in_progress)`/);
    return match ? [{ taskId: match[1], state: match[2] }] : [];
  });
  if (/PLAN (?:RE)?APPROVAL REQUIRED/.test(todo)) {
    assert.deepEqual(active, [], "a reapproval hold cannot own active task attempts");
  }
  for (const task of active) {
    const receipt = JSON.parse(await read(`../evidence/section21/receipts/${task.taskId}.json`));
    assert.equal(receipt.taskId, task.taskId);
    assert.equal(receipt.planSha256, sha, `${task.taskId} receipt is bound to a different plan`);
    assert.equal(receipt.state, task.state, `${task.taskId} receipt state does not mirror todo`);
  }
});

test("T15 visual decision is atomic across approval, review, receipt, and todo", async () => {
  const [approvalText, review, receiptText, todo] = await Promise.all([
    read("../evidence/section21/t15-visual-approval.json"),
    read("../evidence/section21/t15-visual-review.md"),
    read("../evidence/section21/receipts/S21-T15.json"),
    read("../todo.md"),
  ]);
  const approval = JSON.parse(approvalText);
  const receipt = JSON.parse(receiptText);
  assert.ok(["PENDING", "APPROVED"].includes(approval.decision));
  assert.equal(receipt.attempt, approval.attempt);
  assert.equal(receipt.visualDecision.candidateLabel, approval.candidateLabel);
  assert.equal(receipt.visualDecision.approvalSha256, createHash("sha256").update(approvalText).digest("hex"));
  assert.match(review, /自动化：`GREEN`/);
  if (approval.decision === "PENDING") {
    assert.equal(receipt.state, "in_progress");
    assert.equal(receipt.completedAt, null);
    assert.deepEqual(receipt.gate, { local: "GREEN", release: "HOLD", visualApproval: "PENDING" });
    assert.deepEqual(receipt.verification.remaining, [`user visual decision for candidate ${approval.attempt}`]);
    assert.equal(receipt.visualDecision.decision, "PENDING");
    assert.match(review, /视觉批准状态：`PENDING`/);
    assert.match(review, /decision：`PENDING`/);
    assert.match(todo, /状态：\*\*LOCAL GREEN \/ VISUAL PENDING \/ RELEASE HOLD\*\*/);
    assert.match(todo, new RegExp(`视觉候选 ${approval.attempt} 已就绪，等待用户视觉决定，保持 HOLD`));
  } else {
    assert.equal(approval.exactApprovalText, approval.humanDecisionContract.approvePhrase);
    assert.equal(receipt.state, "completed");
    assert.match(receipt.completedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(receipt.gate, { local: "GREEN", release: "HOLD", visualApproval: "APPROVED" });
    assert.deepEqual(receipt.verification.remaining, []);
    assert.equal(receipt.visualDecision.decision, "APPROVED");
    assert.match(review, /视觉批准状态：`APPROVED`/);
    assert.match(review, /decision：`APPROVED`/);
    assert.match(todo, /状态：\*\*LOCAL PLAN COMPLETE \/ VISUAL APPROVED \/ RELEASE HOLD\*\*/);
    assert.match(todo, new RegExp(`视觉候选 ${approval.attempt} 已获用户批准，本地计划完成，发布保持 HOLD`));
  }
});

test("historical replan evidence remains immutable and phase-only identity guards stay outside final discovery", async () => {
  const [plan, todo, workerContract, invalidationText] = await Promise.all([
    read("../plan.md"),
    read("../todo.md"),
    read("section21-worker-contract.test.mjs"),
    read("../evidence/section21/receipts/replan-invalidation.json"),
  ]);
  const invalidation = JSON.parse(invalidationText);

  assert.equal(invalidation.planSha256, "8df83634738324bd4b1277d55a9204b5f4ea8a92dbc28fd9b064a7bfec59ee6e");
  assert.equal(invalidation.invalidatedPlanSha256, "6ef4a9515b3929695b04b0886b3fca64680dce765b0a7f5f16dd6ceba64cd91a");
  assert.equal(invalidation.archive, "invalidated/6ef4a951");
  assert.match(plan, /invalidated\/8df83634/);
  assert.match(todo, /(?:PLAN APPROVAL REQUIRED|APPROVED \/ READY FOR BUILD|LOCAL PLAN COMPLETE \/ VISUAL APPROVED \/ RELEASE HOLD|LOCAL GREEN \/ VISUAL PENDING \/ RELEASE HOLD)/);
  assert.doesNotMatch(workerContract, /test\(['"]S21-T02 keeps the v1 Worker and API identities/);
  assert.match(workerContract, /S21-T02 routes the retired UXUV-Pages browser prefix to a local 404/);
  assert.match(workerContract, /S21-T03 switches the complete Worker surface to v2 atomically/);

  for (const entry of invalidation.invalidates) {
    const archived = await read(`../evidence/section21/receipts/${invalidation.archive}/${entry.path}`);
    assert.equal(createHash("sha256").update(archived).digest("hex"), entry.sha256, entry.path);
  }
});

test("historical replacement and contract revisions keep distinct invalidation ownership", async () => {
  const [plan, replacementText, revisionText, hygiene, generator] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/replacement-invalidation.json"),
    read("../evidence/section21/receipts/contract-revision-invalidation.json"),
    read("candidate-hygiene.test.mjs"),
    read("section21-inventory-generator.mjs"),
  ]);
  const replacement = JSON.parse(replacementText);
  const revision = JSON.parse(revisionText);

  assert.equal(replacement.planSha256, "096e92fd1b7e084f118dd6939216003ace104ee9a7ad76155595ab38bbd8a77b");
  assert.equal(replacement.invalidatedPlanSha256, "8df83634738324bd4b1277d55a9204b5f4ea8a92dbc28fd9b064a7bfec59ee6e");
  assert.equal(replacement.archive, "invalidated/8df83634");
  for (const entry of replacement.invalidates) {
    const archived = await read(`../evidence/section21/receipts/${replacement.archive}/${entry.path}`);
    assert.equal(createHash("sha256").update(archived).digest("hex"), entry.sha256, entry.path);
    assert.equal(Buffer.byteLength(archived), entry.bytes, `${entry.path} byte count`);
  }

  assert.equal(revision.planSha256, "b18979bf53a2c587278351d198ca6f27c173c3888d3da4eba53ba19d65bb69db");
  assert.equal(revision.invalidatedPlanSha256, "096e92fd1b7e084f118dd6939216003ace104ee9a7ad76155595ab38bbd8a77b");
  assert.equal(revision.archive, "invalidated/096e92fd");
  for (const entry of revision.invalidates) {
    const archived = await read(`../evidence/section21/receipts/${revision.archive}/${entry.path}`);
    assert.equal(createHash("sha256").update(archived).digest("hex"), entry.sha256, entry.path);
    assert.equal(Buffer.byteLength(archived), entry.bytes, `${entry.path} byte count`);
  }
  assert.match(hygiene, /baselinePlanSha256 = ['"]6ef4a951/);
  assert.doesNotMatch(hygiene, /planSha256\s*=\s*createHash/);
  assert.doesNotMatch(generator, /normalize-existing|normalizeStoredInventory/);
});

test("T08 boundary replan preserves completed work and invalidates only the failed attempt", async () => {
  const [plan, replanText] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t08-e2e-boundary-replan.json"),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "376af11dc82d3c89b7a2d658e597494364c692bc51275d99f7b12ee18b6a8324");
  assert.equal(replan.predecessorPlanSha256, "b18979bf53a2c587278351d198ca6f27c173c3888d3da4eba53ba19d65bb69db");
  assert.deepEqual(replan.preservesCompletedTasks, ["S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07"]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T08",
    attempt: 1,
    path: "plan-revisions/2026-08-19-t08-e2e-boundary.zip::S21-T08.json",
    sha256: "3b39c1444670ef9c974dbbb6903b79f97e17d79470c951b02b1e6ff4612d4444",
    bytes: 6737,
  }]);
  assert.equal(replan.archiveSha256, "29e6af876752b12f485fbb42331af15b34fb71a559bcb1faf4e458500a5ebd29");
  assert.equal(replan.archiveBytes, 26676);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T09 boundary replan expands only source and danmaku ownership before implementation", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t09-danmaku-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-19-t09-danmaku-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "cd0f42b494ff0a382318c98687a5004f3823eb2366a747f86b40e06799c81552");
  assert.equal(replan.predecessorPlanSha256, "376af11dc82d3c89b7a2d658e597494364c692bc51275d99f7b12ee18b6a8324");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T09",
    attempt: 1,
    path: "plan-revisions/2026-08-19-t09-danmaku-boundary.zip::S21-T09.json",
    sha256: "b6317f28444a2c276f81f0494fb33cf9413d14c70e7cea42332f224e791cf5b4",
    bytes: 5416,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  const task = section(plan, "### S21-T09", "### S21-T10");
  for (const path of [
    "PlayerSettings.tsx",
    "PremiumSettingsExperience.tsx",
    "player-settings-contract.test.mjs",
    "kvideo-player-settings.e2e.spec.ts",
    "kvideo-premium-settings.e2e.spec.ts",
  ]) assert.match(task, new RegExp(path.replaceAll(".", "\\.")), path);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T10 boundary replan targets the authorization-gated Premium layout and directly conflicting tests", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t10-premium-contract-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-19-t10-premium-contract-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "adc19a7401fa9083c5ecf131840f33ba81d72e7f8e5f3e1e239735d7305e26a1");
  assert.equal(replan.predecessorPlanSha256, "cd0f42b494ff0a382318c98687a5004f3823eb2366a747f86b40e06799c81552");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T10",
    attempt: 1,
    path: "plan-revisions/2026-08-19-t10-premium-contract-boundary.zip::S21-T10.json",
    sha256: "9eb09ecb8bd5eda3d9ac0dc8a142c06acd703eecb8c42792cd8bfb9e4c1cceec",
    bytes: 5906,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  const task = section(plan, "### S21-T10", "### S21-T11");
  for (const path of [
    "section21-ui-contract.test.mjs",
    "premium-settings-contract.test.mjs",
    "kvideo-player-settings.e2e.spec.ts",
  ]) assert.match(task, new RegExp(path.replaceAll(".", "\\.")), path);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T11 boundary replan owns the MediaPlayer per-video skip data path before implementation", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t11-media-player-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-19-t11-media-player-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "6524f1488257520165e55860cfe8fa913c87799875c6467881845d48db2d5068");
  assert.equal(replan.predecessorPlanSha256, "adc19a7401fa9083c5ecf131840f33ba81d72e7f8e5f3e1e239735d7305e26a1");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T11",
    attempt: 1,
    path: "plan-revisions/2026-08-19-t11-media-player-boundary.zip::S21-T11.json",
    sha256: "2906822c93e67de423270023962d9edd7ae274fc81f2123ab4d421ff792f70d1",
    bytes: 4113,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  const task = section(plan, "### S21-T11", "### S21-T12");
  assert.match(task, /components\/media\/MediaPlayer\.tsx/);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T13 formal Node boundary replan adopts completed material writes and owns conflicting contracts", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t13-formal-node-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-19-t13-formal-node-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "52ee4faff154a24319ecf77dacff834e8406a8ceeca94736fa786abfed403200");
  assert.equal(replan.predecessorPlanSha256, "6524f1488257520165e55860cfe8fa913c87799875c6467881845d48db2d5068");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T13",
    attempt: 1,
    path: "plan-revisions/2026-08-19-t13-formal-node-boundary.zip::S21-T13.json",
    sha256: "d55c07b122fa1457ec4895a53a3ac95f63ffde27ca6b6fefcdc4ee9a6f92153f",
    bytes: 11204,
  }]);
  assert.equal(replan.preservesAttemptWrites.receiptSha256, replan.invalidates[0].sha256);
  assert.equal(replan.preservesAttemptWrites.rule, "attempt2 before must equal archived attempt1 after for adopted paths");
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  const task = section(plan, "### S21-T13", "### S21-T14");
  assert.match(task, /app-update-control-contract\.test\.mjs/);
  assert.match(task, /iptv-retirement-contract\.test\.mjs/);
  assert.match(task, /`npm test`/);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T14 release boundary replan owns fresh artifact order and skipped-retired-field reporting", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t14-release-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-19-t14-release-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "9d4ef7667fcf3952347e4eed8500ecbc7cc3b6bc91d29974266bf56aa6cc7dd8");
  assert.equal(replan.predecessorPlanSha256, "52ee4faff154a24319ecf77dacff834e8406a8ceeca94736fa786abfed403200");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12", "S21-T13",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T14",
    attempt: 1,
    path: "plan-revisions/2026-08-19-t14-release-boundary.zip::S21-T14.json",
    sha256: "ce446c4ab8d7536913a3d51b8f30f075a4884bb2572eac820ac6bc080905b709",
    bytes: 5001,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  const task = section(plan, "### S21-T14", "### S21-T15");
  for (const path of [
    ".github/workflows/pages.yml",
    "lib/data/settings-transfer.ts",
    "components/settings/SettingsImportModal.tsx",
    "kvideo-data-settings.e2e.spec.ts",
    "kvideo-feature-parity.test.mjs",
    "iptv-retirement-contract.test.mjs",
  ]) assert.match(task, new RegExp(path.replaceAll(".", "\\.")), path);
  assert.match(task, /npm run build.*npm run release:build.*node --test/s);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T14 formal Node boundary replan adopts release evidence and owns exact stale fixtures and binary receipts", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t14-formal-node-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-19-t14-formal-node-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "d678e925b42f34651513e1c649d1f4b46d3d5cf211231de06b76b5f7f745ad7e");
  assert.equal(replan.predecessorPlanSha256, "9d4ef7667fcf3952347e4eed8500ecbc7cc3b6bc91d29974266bf56aa6cc7dd8");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12", "S21-T13",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T14",
    attempt: 2,
    path: "plan-revisions/2026-08-19-t14-formal-node-boundary.zip::S21-T14.json",
    sha256: "edadba39b9d188fce85e956fec3eb95e7b2bcf964b8d1f5297227fc54e51ee9c",
    bytes: 11196,
  }]);
  assert.equal(replan.preservesAttemptWrites.receiptSha256, replan.invalidates[0].sha256);
  assert.equal(replan.preservesAttemptWrites.rule, "attempt3 before must equal archived attempt2 after for adopted paths");
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  assert.deepEqual(replan.requiredOwnershipAdditions, [
    "worker:work-products/tests/app-update-artifact.test.mjs",
    "worker:work-products/evidence/section21/binary-allowlist.json",
  ]);
  const task = section(plan, "### S21-T14", "### S21-T15");
  assert.match(task, /app-update-artifact\.test\.mjs/);
  assert.match(task, /binary-allowlist\.json/);
  assert.match(task, /登记不代表视觉质量获批/);
  assert.equal(replan.visualApprovalGranted, false);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T15 full E2E and evidence boundary replan adopts the failed gate and owns only exact remediation surfaces", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t15-full-e2e-evidence-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-19-t15-full-e2e-evidence-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "853598fa00a91ad92ca73ab7a1dc64bbc0b72e1c895ff341cef7975558dbce56");
  assert.equal(replan.predecessorPlanSha256, "d678e925b42f34651513e1c649d1f4b46d3d5cf211231de06b76b5f7f745ad7e");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12", "S21-T13", "S21-T14",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T15",
    attempt: 1,
    path: "plan-revisions/2026-08-19-t15-full-e2e-evidence-boundary.zip::S21-T15.json",
    sha256: "fc8efbf4f6962134e0d04357793f004498dd836c04727d1314d36d12f994926a",
    bytes: 7860,
  }]);
  assert.equal(replan.preservesAttemptWrites.receiptSha256, replan.invalidates[0].sha256);
  assert.equal(replan.preservesAttemptWrites.candidateCombinedSha256, "c121bb1f518e75006af4583475208a17cb71e8f0dd01640248f3bb241122c1d1");
  assert.equal(replan.preservesAttemptWrites.rule, "attempt2 before must equal archived attempt1 after for adopted paths");
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  assert.deepEqual(replan.requiredOwnershipAdditions, [
    "pages:app/globals.css",
    "pages:work-products/tests/app-flows.e2e.spec.ts",
    "pages:work-products/tests/usage-ui.e2e.spec.ts",
    "pages:work-products/tests/accessibility.e2e.spec.ts",
    "pages:work-products/tests/kvideo-settings-preferences.e2e.spec.ts",
    "pages:work-products/tests/kvideo-search-results.e2e.spec.ts",
    "pages:work-products/tests/kvideo-player-shell.e2e.spec.ts",
    "pages:work-products/tests/section21-visual.e2e.spec.ts",
    "pages:work-products/tests/static-server.mjs",
  ]);
  const task = section(plan, "### S21-T15", "## 7. 串行执行合同");
  assert.match(task, /117\/122/);
  assert.match(task, /Worker `2\.0\.0`、Pages `0\.3\.0`、API `2`/);
  assert.match(task, /--trace on/);
  assert.match(task, /Codex 内置浏览器/);
  assert.match(task, /app\/globals\.css/);
  assert.equal(replan.visualApprovalGranted, false);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T15 player-navbar boundary replan adopts attempt 2 without widening its file ownership", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t15-player-navbar-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-19-t15-player-navbar-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "f396b346b80604e5e78d0609ee5dac4013f5fe212b1198565e3b417f88a06ec3");
  assert.equal(replan.predecessorPlanSha256, "853598fa00a91ad92ca73ab7a1dc64bbc0b72e1c895ff341cef7975558dbce56");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12", "S21-T13", "S21-T14",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T15",
    attempt: 2,
    path: "plan-revisions/2026-08-19-t15-player-navbar-boundary.zip::S21-T15.json",
    sha256: "c0a6093d12ba81e03b2ad874fe178af7a8a002e517877ef36357067e117e93a8",
    bytes: 10221,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  assert.equal(replan.preservesAttemptWrites.receiptSha256, replan.invalidates[0].sha256);
  assert.equal(replan.preservesAttemptWrites.candidateCount, 116);
  assert.equal(replan.preservesAttemptWrites.candidateCombinedSha256, "536e655edf36bb6d5ccb78dfa767893200c129bdab8f2432e10a875fbd7e29dd");
  assert.equal(replan.preservesAttemptWrites.performanceTraceSha256, "86c55fec6dc35034eb946b4f34d3eefd512d678347f275cf58d6406ae90c2ebf");
  assert.equal(replan.preservesAttemptWrites.rule, "attempt3 before must equal archived attempt2 after for adopted non-control-plane paths");
  assert.deepEqual(replan.requiredOwnershipAdditions, []);
  assert.deepEqual(replan.scopeClarification.existingOwnedPaths, [
    "pages:app/globals.css",
    "pages:work-products/tests/kvideo-player-shell.e2e.spec.ts",
  ]);
  assert.deepEqual(replan.observedGeometry.desktop1440, { navbar: [84, 172], nextContent: [120, 206], overlapPx: 52 });
  assert.deepEqual(replan.observedGeometry.mobile320, { navbar: [84, 228], nextContent: [176, 338], overlapPx: 52 });
  const task = section(plan, "### S21-T15", "## 7. 串行执行合同");
  assert.match(task, /播放器 sticky 顶栏遮挡/);
  assert.match(task, /sticky inset/);
  assert.match(task, /\.player-navbar-glass/);
  assert.match(task, /200%/);
  assert.equal(replan.visualApprovalGranted, false);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T15 200 percent reflow boundary replan adopts attempt 3 without widening file ownership", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t15-player-200-percent-reflow-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-19-t15-player-200-percent-reflow-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "7ce03e23ba613b65d5793eda24b4ccf882ce8de1fda20b0ef7549f1e9db669f5");
  assert.equal(replan.predecessorPlanSha256, "f396b346b80604e5e78d0609ee5dac4013f5fe212b1198565e3b417f88a06ec3");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12", "S21-T13", "S21-T14",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T15",
    attempt: 3,
    path: "work-products/evidence/section21/plan-revisions/2026-08-19-t15-player-200-percent-reflow-boundary.zip::S21-T15.json",
    sha256: "9999fa77e44c0598c6fd357e28af8a0448f917b733b26ac29a5d9c2e6fcd98b6",
    bytes: 10669,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  assert.equal(replan.preservesAttemptWrites.receiptSha256, replan.invalidates[0].sha256);
  assert.equal(replan.preservesAttemptWrites.candidateCount, 116);
  assert.equal(replan.preservesAttemptWrites.candidateCombinedSha256, "ad66de052ca700e6d5da54f625db18df485fbfd8a03c8850dc0804bdc43ddb82");
  assert.equal(replan.preservesAttemptWrites.performanceTraceSha256, "86c55fec6dc35034eb946b4f34d3eefd512d678347f275cf58d6406ae90c2ebf");
  assert.equal(replan.preservesAttemptWrites.rule, "attempt4 before must equal archived attempt3 after for adopted non-control-plane paths");
  assert.deepEqual(replan.observedReflow, {
    viewportWidth: 640,
    rootFontSize: "200%",
    scrollWidth: 678,
    overflowPx: 38,
    offenders: [".player-navbar-actions", ".theme-switcher", ".history-sidebar-toggle"],
  });
  assert.deepEqual(replan.requiredOwnershipAdditions, []);
  assert.deepEqual(replan.scopeClarification.existingOwnedPaths, [
    "pages:app/globals.css",
    "pages:work-products/tests/kvideo-player-shell.e2e.spec.ts",
  ]);
  assert.match(replan.scopeClarification.allowed, /fourth CSS remediation only/);
  assert.ok(replan.scopeClarification.forbidden.some((entry) => entry.includes("overflow-x:hidden")));
  assert.ok(replan.scopeClarification.forbidden.some((entry) => entry.includes("floating-position hooks")));
  const task = section(plan, "### S21-T15", "## 7. 串行执行合同");
  assert.match(task, /scrollWidth=640/);
  assert.match(task, /44 px/);
  assert.match(task, /50 px/);
  assert.match(task, /attempt 4/);
  assert.equal(replan.visualApprovalGranted, false);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T15 floating-control boundary replan adopts attempt 4 without widening file ownership", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t15-player-floating-control-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-20-t15-player-floating-control-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "1e1e73eb4883dc9918f2099b7ab60b9e4e9a132b90dc5a29818d9160672c29c2");
  assert.equal(replan.predecessorPlanSha256, "7ce03e23ba613b65d5793eda24b4ccf882ce8de1fda20b0ef7549f1e9db669f5");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12", "S21-T13", "S21-T14",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T15",
    attempt: 4,
    path: "work-products/evidence/section21/plan-revisions/2026-08-20-t15-player-floating-control-boundary.zip::S21-T15.json",
    sha256: "ebe79d06c6c313f9313c152149b239d3b76df64660ec1397d30b1c6826a60110",
    bytes: 10067,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  assert.equal(replan.preservesAttemptWrites.receiptSha256, replan.invalidates[0].sha256);
  assert.equal(replan.preservesAttemptWrites.candidateCount, 116);
  assert.equal(replan.preservesAttemptWrites.candidateCombinedSha256, "ad66de052ca700e6d5da54f625db18df485fbfd8a03c8850dc0804bdc43ddb82");
  assert.equal(replan.preservesAttemptWrites.performanceTraceSha256, "86c55fec6dc35034eb946b4f34d3eefd512d678347f275cf58d6406ae90c2ebf");
  assert.equal(replan.preservesAttemptWrites.rule, "attempt5 before must equal archived attempt4 after for adopted non-control-plane paths");
  assert.deepEqual(replan.observedCollision, {
    viewport: { width: 320, height: 900 },
    historyToggle: { left: 248, right: 298, top: 422, bottom: 472, width: 50, height: 50 },
    skipTrigger: { left: 206, right: 304, top: 416, bottom: 460, width: 98, height: 44 },
    intersectionAreaPx2: 1900,
    horizontalGapPx: -56,
  });
  assert.deepEqual(replan.requiredOwnershipAdditions, []);
  assert.deepEqual(replan.scopeClarification.existingOwnedPaths, [
    "pages:app/globals.css",
    "pages:work-products/tests/kvideo-player-shell.e2e.spec.ts",
  ]);
  assert.match(replan.scopeClarification.allowed, /64px inline-end/);
  assert.ok(replan.scopeClarification.forbidden.some((entry) => entry.includes("pointer-events:none")));
  assert.ok(replan.scopeClarification.forbidden.some((entry) => entry.includes("drag hook")));
  const task = section(plan, "### S21-T15", "## 7. 串行执行合同");
  assert.match(task, /八项布局补修/);
  assert.match(task, /64 px inline-end/);
  assert.match(task, /相交面积为零/);
  assert.match(task, /50 px/);
  assert.match(task, /attempt 5/);
  assert.equal(replan.visualApprovalGranted, false);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T15 tag-geometry boundary replan adopts attempt 5 and owns only the stale test baseline", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t15-tag-geometry-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-20-t15-tag-geometry-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "8837b71153dc156ed5ba9260b6f7641ea00e54c1ff2537badd21482fffe4253d");
  assert.equal(replan.predecessorPlanSha256, "1e1e73eb4883dc9918f2099b7ab60b9e4e9a132b90dc5a29818d9160672c29c2");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12", "S21-T13", "S21-T14",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T15",
    attempt: 5,
    path: "work-products/evidence/section21/plan-revisions/2026-08-20-t15-tag-geometry-boundary.zip::S21-T15.json",
    sha256: "74d375bb06aba8b9891eb18608c11f5059b00ae9e2eafd3f7fecaf6bd8708e40",
    bytes: 10630,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  assert.equal(replan.preservesAttemptWrites.receiptSha256, replan.invalidates[0].sha256);
  assert.equal(replan.preservesAttemptWrites.candidateCount, 116);
  assert.equal(replan.preservesAttemptWrites.candidateCombinedSha256, "f3ebd8ec1cd9bd83da36b6c3e772ef5967b858bb759b4fd5019a6bcaf02be0c5");
  assert.equal(replan.preservesAttemptWrites.performanceTraceSha256, "86c55fec6dc35034eb946b4f34d3eefd512d678347f275cf58d6406ae90c2ebf");
  assert.equal(replan.preservesAttemptWrites.rule, "attempt6 before must equal archived attempt5 after for adopted non-control-plane paths");
  assert.deepEqual(replan.observedFullE2E, {
    passed: 123,
    failed: 1,
    total: 124,
    testPath: "pages:work-products/tests/kvideo-tag-management.e2e.spec.ts",
    line: 105,
    expectedDesktopX: 36,
    actualDesktopX: 94,
    expectedMobileX: 20,
    approvedMobileX: 78,
    deterministicOffsetPx: 58,
    classification: "stale test baseline; not a product regression",
  });
  assert.deepEqual(replan.requiredOwnershipAdditions, [
    "pages:work-products/tests/kvideo-tag-management.e2e.spec.ts",
  ]);
  assert.deepEqual(replan.newlyOwnedBeforeSha256, {
    "pages:work-products/tests/kvideo-tag-management.e2e.spec.ts": "2f6e667edd1be6a0c2b385d181dd551bd46fd11db8b6d6c65a8fbb26623ab397",
  });
  assert.match(replan.scopeClarification.allowed, /36\/20 to 94\/78/);
  assert.ok(replan.scopeClarification.forbidden.some((entry) => entry.includes("product CSS")));
  assert.ok(replan.scopeClarification.forbidden.some((entry) => entry.includes("y or height")));
  const task = section(plan, "### S21-T15", "## 7. 串行执行合同");
  assert.match(task, /kvideo-tag-management\.e2e\.spec\.ts/);
  assert.match(task, /`36\/20` 同步为 `94\/78`/);
  assert.match(task, /123\/124/);
  assert.match(task, /attempt 6/);
  assert.equal(replan.visualApprovalGranted, false);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T15 visual-candidate boundary replan adopts attempt 6 and refreshes final evidence", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t15-visual-candidate-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-20-t15-visual-candidate-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "01815674befb8c7836b4d04fdb3a00df6f20d102b54287f55703a7ff315e5074");
  assert.equal(replan.predecessorPlanSha256, "8837b71153dc156ed5ba9260b6f7641ea00e54c1ff2537badd21482fffe4253d");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12", "S21-T13", "S21-T14",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T15",
    attempt: 6,
    path: "work-products/evidence/section21/plan-revisions/2026-08-20-t15-visual-candidate-boundary.zip::S21-T15.json",
    sha256: "60f26bc2698842b69de759953588e6a5cd1c9e2675e9717d4d5f4d4a56ab6611",
    bytes: 11962,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  assert.equal(replan.preservesAttemptWrites.receiptSha256, replan.invalidates[0].sha256);
  assert.equal(replan.preservesAttemptWrites.candidateCount, 116);
  assert.equal(replan.preservesAttemptWrites.candidateCombinedSha256, "416a30c5b06dd90593322345b6de34563b45ced261024f68669c8d68d458067d");
  assert.match(replan.preservesAttemptWrites.candidateDisposition, /rejected/);
  assert.match(replan.preservesAttemptWrites.performanceTraceDisposition, /must be replaced/);
  assert.equal(replan.preservesAttemptWrites.rule, "attempt7 before must equal archived attempt6 after for adopted non-control-plane paths");
  assert.equal(replan.observedVisualBlockers.homeHistoryTagLane.intersectionAreaPx2, 252);
  assert.deepEqual(replan.observedVisualBlockers.englishPlayerPanel.affectedWidths, [320, 1024]);
  assert.equal(replan.observedVisualBlockers.playerCandidateScroll.observedTopOffsetPx, 224);
  assert.deepEqual(replan.requiredOwnershipAdditions, []);
  assert.deepEqual(replan.scopeClarification.existingOwnedPaths, [
    "pages:app/globals.css",
    "pages:work-products/tests/section21-visual.e2e.spec.ts",
    "pages:work-products/tests/kvideo-player-shell.e2e.spec.ts",
  ]);
  assert.ok(replan.scopeClarification.allowed.some((entry) => entry.includes("64px")));
  assert.ok(replan.scopeClarification.allowed.some((entry) => entry.includes("minmax(0,1fr)")));
  assert.ok(replan.scopeClarification.allowed.some((entry) => entry.includes("scrollX=scrollY=0")));
  assert.ok(replan.scopeClarification.forbidden.some((entry) => entry.includes("overflow hidden")));
  assert.equal(replan.evidenceRefresh.freshPerformanceRequired, true);
  assert.equal(replan.evidenceRefresh.freshRollbackRequired, true);
  assert.deepEqual(replan.evidenceRefresh.paths, [
    "worker:work-products/evidence/section21/t15-performance-trace.zip",
    "worker:work-products/evidence/section21/pair-rollback.json",
    "worker:work-products/evidence/section21/worker-v1.reverse.patch",
    "worker:work-products/evidence/section21/pages-v1.reverse.patch",
    "worker:work-products/evidence/section21/worker-v2.forward.patch",
    "worker:work-products/evidence/section21/pages-v2.forward.patch",
  ]);
  const task = section(plan, "### S21-T15", "## 7. 串行执行合同");
  assert.match(task, /八项布局补修/);
  assert.match(plan, /252 px²/);
  assert.match(task, /scrollX=scrollY=0/);
  assert.match(task, /pair-rollback\.json/);
  assert.match(task, /attempt 7/);
  assert.equal(replan.visualApprovalGranted, false);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T15 classic-scrollbar boundary replan adopts attempt 7 and refines only the mobile tag lane", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t15-classic-scrollbar-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-20-t15-classic-scrollbar-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "1b86105166b284c152682aebf761127492249c08597370a3a747c05c7985f881");
  assert.equal(replan.predecessorPlanSha256, "01815674befb8c7836b4d04fdb3a00df6f20d102b54287f55703a7ff315e5074");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12", "S21-T13", "S21-T14",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T15",
    attempt: 7,
    path: "work-products/evidence/section21/plan-revisions/2026-08-20-t15-classic-scrollbar-boundary.zip::S21-T15.json",
    sha256: "abc692875763e0c49b514ef9c1357efc2d774471d8d6bcfab0d96589c02f145b",
    bytes: 13803,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  assert.equal(replan.preservesAttemptWrites.receiptSha256, replan.invalidates[0].sha256);
  assert.equal(replan.preservesAttemptWrites.formalE2E, "124/124 GREEN");
  assert.equal(replan.preservesAttemptWrites.candidateCount, 116);
  assert.equal(replan.preservesAttemptWrites.candidateBytes, 15995153);
  assert.equal(replan.preservesAttemptWrites.candidateCombinedSha256, "9dd300806976f5bab51113f8789efb66c6bed6f28ffb5119e3195d6d6d82f46c");
  assert.match(replan.preservesAttemptWrites.candidateDisposition, /historical attempt 7 evidence/);
  assert.equal(replan.preservesAttemptWrites.performanceTraceSha256, "88b6bc3d4eb9f76f5955eaa6d01337e7b7842974f11aa82ce385681552c3df0c");
  assert.equal(replan.preservesAttemptWrites.performanceTraceBytes, 17283041);
  assert.match(replan.preservesAttemptWrites.performanceTraceDisposition, /must be replaced/);
  assert.equal(replan.preservesAttemptWrites.rule, "attempt8 before must equal archived attempt7 after for adopted non-control-plane paths");
  assert.deepEqual(replan.observedClassicScrollbar.viewport, {
    innerWidth: 320,
    clientWidth: 305,
    height: 900,
    scrollbarWidth: 15,
  });
  assert.equal(replan.observedClassicScrollbar.tagList.right, 225);
  assert.equal(replan.observedClassicScrollbar.secondTag.right, 236);
  assert.equal(replan.observedClassicScrollbar.historyToggle.left, 248);
  assert.equal(replan.observedClassicScrollbar.secondTagClippedPx, 11);
  assert.equal(replan.observedClassicScrollbar.laneHistoryGapPx, 23);
  assert.deepEqual(replan.requiredOwnershipAdditions, []);
  assert.deepEqual(replan.scopeClarification.existingOwnedPaths, [
    "pages:app/globals.css",
    "pages:work-products/tests/section21-visual.e2e.spec.ts",
  ]);
  assert.ok(replan.scopeClarification.allowed.some((entry) => entry.includes("inline-size: calc(100vw - 98px)")));
  assert.ok(replan.scopeClarification.allowed.some((entry) => entry.includes("15px classic scrollbar")));
  assert.ok(replan.scopeClarification.forbidden.some((entry) => entry.includes("overflow hidden")));
  assert.ok(replan.scopeClarification.forbidden.some((entry) => entry.includes("classic scrollbars")));
  assert.equal(replan.evidenceRefresh.candidateRequired, true);
  assert.equal(replan.evidenceRefresh.freshPerformanceRequired, true);
  assert.equal(replan.evidenceRefresh.freshReleaseRequired, true);
  assert.equal(replan.evidenceRefresh.freshRollbackRequired, true);
  const task = section(plan, "### S21-T15", "## 7. 串行执行合同");
  assert.match(task, /八项布局补修/);
  assert.match(task, /attempt 8/);
  assert.match(task, /clientWidth=305/);
  assert.match(plan, /裁 11 px/);
  assert.match(task, /inline-size: calc\(100vw - 98px\)/);
  assert.match(task, /性能必须重新运行/);
  assert.match(task, /pair-rollback\.json/);
  assert.equal(replan.visualApprovalGranted, false);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});

test("T15 floating-sidebar content boundary replan adopts attempt 8 and adds one shared exclusion zone", async () => {
  const [plan, replanText, archive] = await Promise.all([
    read("../plan.md"),
    read("../evidence/section21/receipts/t15-candidate-floating-sidebar-content-boundary-replan.json"),
    readFile(new URL("../evidence/section21/plan-revisions/2026-08-20-t15-candidate-floating-sidebar-content-boundary.zip", import.meta.url)),
  ]);
  const replan = JSON.parse(replanText);
  assert.equal(replan.planSha256, "c06f97d5bf33c44455c1541f06801d6258b50acf4487bd04f45e43475d04dd30");
  assert.equal(replan.predecessorPlanSha256, "1b86105166b284c152682aebf761127492249c08597370a3a747c05c7985f881");
  assert.deepEqual(replan.preservesCompletedTasks, [
    "S21-T01", "S21-T02", "S21-T03", "S21-T04", "S21-T05", "S21-T06", "S21-T07", "S21-T08", "S21-T09", "S21-T10", "S21-T11", "S21-T12", "S21-T13", "S21-T14",
  ]);
  assert.deepEqual(replan.invalidates, [{
    taskId: "S21-T15",
    attempt: 8,
    path: "work-products/evidence/section21/plan-revisions/2026-08-20-t15-candidate-floating-sidebar-content-boundary.zip::S21-T15.json",
    sha256: "da06f7e503d8c2591337a77ffe8c5ea4b37fef9dcffeb5e1e22e7dd2dabd95dd",
    bytes: 13996,
  }]);
  assert.equal(createHash("sha256").update(archive).digest("hex"), replan.archiveSha256);
  assert.equal(archive.byteLength, replan.archiveBytes);
  assert.equal(replan.preservesAttemptWrites.receiptSha256, replan.invalidates[0].sha256);
  assert.equal(replan.preservesAttemptWrites.formalE2E, "124/124 GREEN");
  assert.equal(replan.preservesAttemptWrites.candidateCount, 116);
  assert.equal(replan.preservesAttemptWrites.candidateBytes, 16099136);
  assert.equal(replan.preservesAttemptWrites.candidateCombinedSha256, "00292fbe3967580217ab50a88a25f1443f86e40069a1399c15aaec4cd324b7d8");
  assert.match(replan.preservesAttemptWrites.candidateDisposition, /rejected/);
  assert.match(replan.preservesAttemptWrites.performanceTraceDisposition, /not final candidate evidence/);
  assert.match(replan.preservesAttemptWrites.rollbackDisposition, /pre-T15/);
  assert.equal(replan.preservesAttemptWrites.rule, "attempt9 before must equal archived attempt8 after for adopted non-control-plane paths");
  assert.deepEqual(replan.observedVisualBlockers.searchResults.candidates.map(({ path, sha256 }) => ({ path, sha256 })), [
    {
      path: "pages:work-products/tests/fixtures/ui-review/section21-candidate/routes-search-ready-en-320.png",
      sha256: "dec487287df251b818a4b29d8b652126e7b804ac219e1074044d757ed8cdeb62",
    },
    {
      path: "pages:work-products/tests/fixtures/ui-review/section21-candidate/routes-search-ready-zh-CN-320.png",
      sha256: "6ca4e08c9bf4af46097bac025895ff093984c880eb6b19b1fee9d0e4d3085ed2",
    },
  ]);
  assert.equal(replan.observedVisualBlockers.playerCurrentSource.candidate.path,
    "pages:work-products/tests/fixtures/ui-review/section21-candidate/routes-player-ready-en-1024.png");
  assert.equal(replan.observedVisualBlockers.playerCurrentSource.candidate.sha256,
    "e83e55561eed5d6c006513cbc1b9d69720a5bdd1f39a8c5a1d77f97ed2865cad");
  assert.equal(replan.excludedFindings[0].sha256, "9190bc25d974204ca764cc1bfe245d57461cf2eb7fcd7a775999d68bbd6c6de1");
  assert.match(replan.excludedFindings[0].reason, /no product or producer scroll-restoration change/);
  assert.deepEqual(replan.requiredOwnershipAdditions, []);
  assert.equal(replan.scopeClarification.maxNewCssSemanticRemediations, 1);
  assert.deepEqual(replan.scopeClarification.existingOwnedPaths, [
    "pages:app/globals.css",
    "pages:work-products/tests/kvideo-search-results.e2e.spec.ts",
    "pages:work-products/tests/kvideo-player-shell.e2e.spec.ts",
  ]);
  assert.ok(replan.scopeClarification.allowed.some((entry) => entry.includes("--floating-sidebar-content-inset")));
  assert.ok(replan.scopeClarification.allowed.some((entry) => entry.includes("below 480px")));
  assert.ok(replan.scopeClarification.allowed.some((entry) => entry.includes("non-cinema")));
  assert.ok(replan.scopeClarification.forbidden.some((entry) => entry.includes("pointer-events none")));
  assert.equal(replan.evidenceRefresh.candidateRequired, true);
  assert.equal(replan.evidenceRefresh.freshPerformanceRequired, true);
  assert.equal(replan.evidenceRefresh.freshReleaseRequired, true);
  assert.equal(replan.evidenceRefresh.freshRollbackRequired, true);
  assert.equal(replan.evidenceRefresh.strictBinaryAllowlistRequired, true);
  assert.equal(replan.evidenceRefresh.visualReviewRequired, true);
  const task = section(plan, "### S21-T15", "## 7. 串行执行合同");
  assert.match(task, /八项布局补修/);
  assert.match(task, /attempt 12/);
  assert.match(task, /attempt 13/);
  assert.match(task, /iOS 27 Liquid Glass/);
  assert.match(task, /暗边、镜面高光/);
  assert.match(task, /人工决定只使用候选标签和可见预览/);
  assert.match(task, /同步状态不得与返回、标题或浮动操作相交/);
  assert.match(task, /证据转换抽成可执行纯守卫/);
  assert.match(task, /--floating-sidebar-content-inset/);
  assert.match(task, /搜索结果 grid 与左右浮钮各留至少 8 px/);
  assert.match(task, /历史浮钮与当前来源卡相交面积为零/);
  assert.equal(replan.visualApprovalGranted, false);
  assert.equal(replan.authorization.commit, false);
  assert.equal(replan.authorization.push, false);
  assert.equal(replan.authorization.deploy, false);
});
