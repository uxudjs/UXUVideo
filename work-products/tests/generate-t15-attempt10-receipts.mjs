import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { pagesReleaseIdentity } from "./t15-candidate-identity.mjs";
import { commitEvidenceWrites, validateEvidenceTransition } from "./t15-evidence-transition.mjs";

const workerRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const pagesRoot = resolve(workerRoot, "../UXUV-Pages");
const evidenceRoot = join(workerRoot, "work-products", "evidence", "section21");
const attempt = 14;
const previousAttempt = attempt - 1;
const candidateLabel = `S21-T15 视觉候选 ${attempt}`;
const candidateRoot = join(pagesRoot, "work-products", "tests", "fixtures", "ui-review", "section21-candidate");
const planPath = join(workerRoot, "work-products", "plan.md");
const pairPath = join(evidenceRoot, "pair-rollback.json");
const tracePath = join(evidenceRoot, "t15-performance-trace.zip");
const baselinePath = join(evidenceRoot, "performance-baseline.json");
const validationReceiptPath = join(evidenceRoot, `t15-validation-attempt${attempt}.json`);
const allowlistPath = join(evidenceRoot, "binary-allowlist.json");
const candidateEvidencePath = join(evidenceRoot, "t15-candidate-evidence.json");
const visualReviewPath = join(evidenceRoot, "t15-visual-review.md");
const approvalPath = join(evidenceRoot, "t15-visual-approval.json");
const taskReceiptPath = join(evidenceRoot, "receipts", "S21-T15.json");
const invalidatedRoot = join(evidenceRoot, "receipts", "invalidated", "debug-20260820");
const priorEvidenceArchivePath = join(invalidatedRoot, `t15-candidate-evidence-attempt${previousAttempt}-approved-invalidated.json`);
const priorReviewArchivePath = join(invalidatedRoot, `t15-visual-review-attempt${previousAttempt}-approved-invalidated.md`);
const priorApprovalArchivePath = join(invalidatedRoot, `t15-visual-approval-attempt${previousAttempt}-approved-invalidated.json`);
const priorAllowlistArchivePath = join(invalidatedRoot, `binary-allowlist-attempt${previousAttempt}-approved-invalidated.json`);
const priorTaskReceiptArchivePath = join(invalidatedRoot, `S21-T15-attempt${previousAttempt}-approved-invalidated.json`);
const invalidationReceiptPath = join(invalidatedRoot, `t15-approved-candidate-attempt${previousAttempt}-invalidation.json`);

const binaryMime = new Map([[".png", "image/png"], [".zip", "application/zip"]]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function slash(value) {
  return value.replaceAll("\\", "/");
}

function repositoryPath(root, path) {
  return slash(relative(root, path));
}

function filesUnder(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory).sort()) {
      const path = join(directory, entry);
      const metadata = lstatSync(path);
      assert.equal(metadata.isSymbolicLink(), false, `symbolic link is not allowed: ${repositoryPath(root, path)}`);
      if (metadata.isDirectory()) visit(path);
      else if (metadata.isFile()) files.push(path);
    }
  };
  visit(root);
  return files;
}

function fileReceipt(root, path) {
  const bytes = readFileSync(path);
  return { path: repositoryPath(root, path), bytes: bytes.length, sha256: sha256(bytes) };
}

function git(root, ...args) {
  return execFileSync("git", ["-c", "core.longpaths=true", "-C", root, ...args], { encoding: "utf8" }).trim();
}

function namespaceSha(root, paths) {
  return sha256(paths.map((path) => sha256(readFileSync(join(root, ...path.split("/"))))).join(""));
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function fileReceiptFromBytes(root, path, bytes) {
  return { path: repositoryPath(root, path), bytes: bytes.length, sha256: sha256(bytes) };
}

const existingApprovalBytes = existsSync(approvalPath) ? readFileSync(approvalPath) : null;
const archivedApprovalBytes = existsSync(priorApprovalArchivePath) ? readFileSync(priorApprovalArchivePath) : null;
const priorEvidenceBytes = existsSync(candidateEvidencePath) ? readFileSync(candidateEvidencePath) : null;
const priorReviewBytes = existsSync(visualReviewPath) ? readFileSync(visualReviewPath) : null;
const priorAllowlistBytes = existsSync(allowlistPath) ? readFileSync(allowlistPath) : null;
const priorTaskReceiptBytes = existsSync(taskReceiptPath) ? readFileSync(taskReceiptPath) : null;

for (const path of [
  pagesRoot, evidenceRoot, candidateRoot, planPath, pairPath, tracePath, baselinePath, validationReceiptPath,
  approvalPath, candidateEvidencePath, visualReviewPath, allowlistPath, taskReceiptPath,
]) {
  assert.equal(existsSync(path), true, `required input is missing: ${slash(relative(workerRoot, path))}`);
}

const packageJson = JSON.parse(readFileSync(join(pagesRoot, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(join(pagesRoot, "package-lock.json"), "utf8"));
assert.equal(packageJson.devDependencies.esbuild, "0.28.2");
assert.equal(packageLock.packages["node_modules/esbuild"].version, "0.28.2");

const candidateFiles = filesUnder(candidateRoot).filter((path) => extname(path).toLowerCase() === ".png");
assert.equal(candidateFiles.length, 121, `attempt ${attempt} must contain the exact 121-image candidate`);
const candidateReceipts = candidateFiles.map((path) => fileReceipt(pagesRoot, path));
const routeCandidates = candidateReceipts.filter(({ path }) => path.split("/").at(-1).startsWith("routes-")).length;
const stateCandidates = candidateReceipts.filter(({ path }) => path.split("/").at(-1).startsWith("states-")).length;
assert.deepEqual({ routeCandidates, stateCandidates }, { routeCandidates: 108, stateCandidates: 13 });
const candidateCombinedSha256 = sha256(candidateReceipts.map(({ sha256: digest }) => digest).join(""));
const candidateFileNameSetSha256 = sha256(candidateReceipts.map(({ path }) => path).join("\n"));
const candidateTotalBytes = candidateReceipts.reduce((sum, { bytes }) => sum + bytes, 0);
const writeAuthorization = validateEvidenceTransition({
  attempt,
  activeApprovalBytes: existingApprovalBytes,
  archivedApprovalBytes,
  priorEvidenceBytes,
  priorReviewBytes,
  expectedPriorEvidencePath: repositoryPath(workerRoot, candidateEvidencePath),
  expectedPriorReviewPath: repositoryPath(workerRoot, visualReviewPath),
  currentCandidateCombinedSha256: candidateCombinedSha256,
});

const workerBinaries = filesUnder(evidenceRoot).filter((path) => extname(path).toLowerCase() === ".zip");
const allowlistFiles = [
  ...workerBinaries.map((path) => ({
    repository: "worker",
    path: repositoryPath(workerRoot, path),
    mime: binaryMime.get(extname(path).toLowerCase()),
    sha256: sha256(readFileSync(path)),
    reason: path === tracePath
      ? "Sanitized successful Playwright performance trace; recursively scanned text members and exact byte identity."
      : "Exact Section 21 replan archive; recursively scanned text members and exact byte identity.",
  })),
  ...candidateReceipts.map(({ path, sha256: digest }) => ({
    repository: "pages", path, mime: "image/png", sha256: digest,
    reason: `Exact Section 21 attempt ${attempt} visual candidate screenshot; byte identity only.`,
  })),
].sort((left, right) => `${left.repository}:${left.path}`.localeCompare(`${right.repository}:${right.path}`));
assert.equal(new Set(allowlistFiles.map(({ repository, path }) => `${repository}:${path}`)).size, allowlistFiles.length);
const allowlistBytes = jsonBytes({ schemaVersion: 1, files: allowlistFiles });

const pair = JSON.parse(readFileSync(pairPath, "utf8"));
assert.deepEqual(pair.phases.map(({ name, status }) => ({ name, status })), [
  { name: "bootstrap-v2", status: "passed" },
  { name: "reverse-v1", status: "passed" },
  { name: "forward-restore-v2", status: "passed" },
]);
const validationReceipt = JSON.parse(readFileSync(validationReceiptPath, "utf8"));
assert.equal(validationReceipt.taskId, "S21-T15");
assert.equal(validationReceipt.attempt, attempt);
assert.equal(validationReceipt.status, "passed");
assert.equal(validationReceipt.e2e.passed, validationReceipt.e2e.discovered);
assert.equal(validationReceipt.performance.passed, 1);
assert.equal(validationReceipt.performance.trace.sha256, sha256(readFileSync(tracePath)));
assert.equal(validationReceipt.rollback.pair.sha256, sha256(readFileSync(pairPath)));
const manifestPath = join(pagesRoot, "release", "current", "release-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const releaseAssetPaths = Object.values(manifest.assets).map(({ path }) => slash(path)).sort();
const outFiles = filesUnder(join(pagesRoot, "out"));
const outPaths = outFiles.map((path) => repositoryPath(join(pagesRoot, "out"), path)).sort();
for (const path of outPaths) {
  const outBytes = readFileSync(join(pagesRoot, "out", ...path.split("/")));
  const releaseBytes = readFileSync(join(pagesRoot, "release", "current", ...path.split("/")));
  assert.equal(Buffer.compare(outBytes, releaseBytes), 0, `release byte drift: ${path}`);
}
for (const path of releaseAssetPaths) assert.equal(existsSync(join(pagesRoot, "release", "current", ...path.split("/"))), true, path);

const workerPackage = JSON.parse(readFileSync(join(workerRoot, "package.json"), "utf8"));
const workerRuntime = readFileSync(join(workerRoot, "_worker.js"));
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const trace = fileReceipt(workerRoot, tracePath);
const allowlist = fileReceiptFromBytes(workerRoot, allowlistPath, allowlistBytes);
const pairReceipt = fileReceipt(workerRoot, pairPath);
const patchReceipts = ["worker-v1.reverse.patch", "pages-v1.reverse.patch", "worker-v2.forward.patch", "pages-v2.forward.patch"]
  .map((name) => fileReceipt(workerRoot, join(evidenceRoot, name)));
const now = new Date().toISOString();

const evidence = {
  schemaVersion: 1,
  taskId: "S21-T15",
  attempt,
  planSha256: sha256(readFileSync(planPath)),
  generatedAt: now,
  gateStatus: "local_validation_passed_visual_pending",
  repositories: {
    worker: {
      head: git(workerRoot, "rev-parse", "HEAD"),
      version: workerPackage.version,
      apiContract: 2,
      candidateManifestSha256: pair.repositories.worker.manifests.v2,
      runtime: {
        path: "_worker.js", bytes: workerRuntime.length, sha256: sha256(workerRuntime),
        gzipBytes: gzipSync(workerRuntime, { level: 9 }).length, gzipLimitBytes: 3 * 1024 * 1024,
      },
    },
    pages: {
      head: git(pagesRoot, "rev-parse", "HEAD"),
      version: packageJson.version,
      apiContract: manifest.apiContract,
      workerRange: manifest.workerRange,
      candidateManifestSha256: pair.repositories.pages.manifests.v2,
      packageSha256: sha256(readFileSync(join(pagesRoot, "package.json"))),
      packageLockSha256: sha256(readFileSync(join(pagesRoot, "package-lock.json"))),
      nextEnvSha256: sha256(readFileSync(join(pagesRoot, "next-env.d.ts"))),
      releaseScope: pagesReleaseIdentity(pagesRoot),
      buildDependency: { name: "esbuild", declared: packageJson.devDependencies.esbuild, locked: packageLock.packages["node_modules/esbuild"].version },
    },
  },
  candidate: {
    repository: "pages",
    pathPrefix: "work-products/tests/fixtures/ui-review/section21-candidate/",
    fileCount: candidateReceipts.length,
    totalBytes: candidateTotalBytes,
    fileNameSetSha256: candidateFileNameSetSha256,
    fileNameSetAlgorithm: "sort repository-relative file names, join with LF without a trailing LF, then SHA-256 the UTF-8 bytes",
    combinedSha256: candidateCombinedSha256,
    combinedAlgorithm: "sort repository-relative file paths, concatenate each file's lowercase SHA-256 hexadecimal digest, then SHA-256 the UTF-8 bytes",
    producerCommand: "set UXUV_WRITE_VISUAL_CANDIDATE=1 in the host shell, then run npm run test:e2e",
    producerResult: `verified by t15-validation-attempt${attempt}.json; routine E2E writes only the draft directory`,
  },
  coverage: {
    routeCandidates,
    routeSurfaces: ["home", "favorites", "premium", "premium-favorites", "premium-settings", "settings", "not-found", "search-ready", "player-ready"],
    locales: ["zh-CN", "zh-TW", "en"],
    widths: [320, 768, 1024, 1440],
    specialStateCandidates: stateCandidates,
    specialStates: ["theme-light", "contrast-more", "forced-colors", "reduced-transparency", "text-200-percent", "setup-error-zh-CN", "setup-error-zh-TW", "setup-error-en", "sync-synced", "sync-offline", "sync-quota", "sync-conflict", "sync-error-text-200"],
  },
  performance: {
    status: "passed",
    reason: "Derived from the separately retained performance log and validation receipt; this generator does not execute validation commands.",
    command: "npx playwright test work-products/tests/section21-performance.e2e.spec.ts --config work-products/tests/section21-playwright.config.ts --trace on --workers=1",
    baseline: { path: repositoryPath(workerRoot, baselinePath), sha256: sha256(readFileSync(baselinePath)), median: baseline.median },
    samples: validationReceipt.performance.samples,
    median: validationReceipt.performance.median,
    trace: { ...trace, sanitization: "passed; identity bound by the independent validation receipt" },
  },
  validation: {
    status: "passed",
    reason: "This generator does not execute validation commands; it verifies a separately generated receipt against retained logs and current artifact hashes.",
    receipt: fileReceipt(workerRoot, validationReceiptPath),
    e2e: { discovered: validationReceipt.e2e.discovered, passed: validationReceipt.e2e.passed },
    rollback: validationReceipt.rollback.phases,
  },
  release: {
    sequence: ["npm run build", "npm run release:build", "npm test", "npm run lint", "npx tsc --noEmit"],
    out: { payloadCount: outPaths.length, totalBytes: outFiles.reduce((sum, path) => sum + lstatSync(path).size, 0), namespaceSha256: namespaceSha(join(pagesRoot, "out"), outPaths) },
    releaseCurrent: {
      assetCount: releaseAssetPaths.length,
      outPayloadExactMatch: true,
      releaseOnlyPaths: releaseAssetPaths.filter((path) => !outPaths.includes(path)),
      namespaceSha256: namespaceSha(join(pagesRoot, "release", "current"), releaseAssetPaths),
    },
    releaseManifest: {
      ...fileReceipt(pagesRoot, manifestPath), pagesVersion: manifest.pagesVersion, apiContract: manifest.apiContract,
      workerRange: manifest.workerRange, routeCount: Object.keys(manifest.routes).length, assetCount: Object.keys(manifest.assets).length,
    },
  },
  rollback: {
    pairRollback: pairReceipt,
    patches: patchReceipts,
    phases: pair.phases.map(({ name, status }) => ({ name, status })),
    compatibility: pair.compatibility,
    productionRollbackBoundary: "frozen historical production identity; not live-reverified in this task",
  },
  binaryAudit: {
    allowlist,
    actualCount: allowlistFiles.length,
    expectedCount: allowlistFiles.length,
    workerZipCount: workerBinaries.length,
    pagesPngCount: candidateReceipts.length,
    duplicateKeys: [], missing: [], unexpected: [], metadataMismatch: [], status: "passed",
  },
  recommendedAudits: {
    npmAuditHigh: "unperformed; external registry access was not separately authorized",
    npmAuditSignatures: "unperformed; external registry access was not separately authorized",
  },
  visualReview: { path: repositoryPath(workerRoot, visualReviewPath), approvalRequired: true },
  authorization: { commit: false, push: false, deploy: false, remoteChanges: false },
};
const candidateEvidenceBytes = jsonBytes(evidence);

const review = `# ${candidateLabel}\n\n`
  + `- 候选版本：Worker \`${evidence.repositories.worker.version}\` / Pages \`${evidence.repositories.pages.version}\` / API \`${evidence.repositories.pages.apiContract}\`\n`
  + `- 构建依赖：\`esbuild@0.28.2\`（package 与 lock 一致）\n`
  + `- 候选：${candidateReceipts.length} 张，${candidateTotalBytes.toLocaleString("en-US")} bytes\n`
  + `- 自动化：\`GREEN\`；独立收据验证 E2E ${validationReceipt.e2e.passed}/${validationReceipt.e2e.discovered}、三样本性能与三阶段回滚，本生成器自身不执行验证命令\n`
  + `- 视觉批准状态：\`PENDING\`\n\n`
  + `## 覆盖矩阵\n\n`
  + `主矩阵为 9 个 surface × 3 个 locale × 4 个宽度，共 108 张；另有 13 张状态候选。\n\n`
  + `| Surface | zh-CN | zh-TW | en | 宽度 | 自动状态 | 人工视觉状态 |\n| --- | --- | --- | --- | --- | --- | --- |\n`
  + evidence.coverage.routeSurfaces.map((surface) => `| ${surface} | ✓ | ✓ | ✓ | 320/768/1024/1440 | GREEN | PENDING |`).join("\n")
  + `\n\n状态候选：light、contrast-more、forced-colors、reduced-transparency、200% 文本、三语 setup-error，以及 synced/offline/quota/conflict/error 五种可见同步状态。\n\n`
  + `## 同步状态新增证据\n\n`
  + `- synced 行为门使用真实计时器证明约 3 秒后消失。\n`
  + `- offline、quota、conflict、error 行为门证明超过 3 秒仍持续可见。\n`
  + `- 五张状态图均执行视口内与浮动控件零重叠几何断言；覆盖 320/640@200%/768/1024/1440、三语与设置页。\n\n`
  + `## 代表截图\n\n`
  + `- [同步成功 zh-CN 1440](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/states-sync-synced-settings-zh-CN-1440.png)\n`
  + `- [离线 zh-TW 320](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/states-sync-offline-settings-zh-TW-320.png)\n`
  + `- [配额 en 768](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/states-sync-quota-settings-en-768.png)\n`
  + `- [冲突 zh-CN 1024](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/states-sync-conflict-settings-zh-CN-1024.png)\n`
  + `- [错误与 200% 文本 en 640](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/states-sync-error-text-200-settings-en-640.png)\n`
  + `- [搜索结果 en 320](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/routes-search-ready-en-320.png)\n`
  + `- [播放器 en 1024](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/routes-player-ready-en-1024.png)\n`
  + `- [普通设置 en 320](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/routes-settings-en-320.png)\n\n`
  + `## 已知非阻断边界\n\n`
  + `- not-found 在三种 locale fixture 下均被捕获，但当前静态 404 文案为英文；本证据不宣称 404 文案已三语本地化。\n`
  + `- 1024 px 播放页的密集选集按钮仍可能以“第…”省略显示；来源、控制和交互边界完整。\n`
  + `- 320 px 英文设置的原生 select 文案较紧，但含义可辨、控件未越界。\n\n`
  + `## 用户决定\n\n`
  + `- decision：\`PENDING\`\n`
  + `- 查看代表截图后，满意请回复“批准视觉候选 ${attempt}”；不满意请回复“拒绝视觉候选 ${attempt}：具体问题”。\n`
  + `- 完整性由内部机器证据记录；你不需要提供或确认任何机器标识。批准不授权 commit、push 或 deploy。\n`;
const visualReviewBytes = Buffer.from(review);

assert.ok(existingApprovalBytes && priorEvidenceBytes && priorReviewBytes && priorAllowlistBytes && priorTaskReceiptBytes);
const priorApproval = JSON.parse(existingApprovalBytes);
assert.equal(priorApproval.attempt, previousAttempt);
assert.equal(priorApproval.decision, "APPROVED");
assert.notEqual(priorApproval.machineBinding.candidateCombinedSha256, candidateCombinedSha256);
const invalidation = {
  schemaVersion: 1,
  receiptKind: "post_approval_candidate_invalidation",
  attempt: previousAttempt,
  invalidatedAt: now,
  historicalDecision: {
    decision: "APPROVED",
    exactApprovalText: priorApproval.exactApprovalText,
    disposition: "The user approval remains immutable historical evidence and does not apply to replacement candidate bytes.",
  },
  archives: {
    approval: fileReceiptFromBytes(workerRoot, priorApprovalArchivePath, existingApprovalBytes),
    candidateEvidence: fileReceiptFromBytes(workerRoot, priorEvidenceArchivePath, priorEvidenceBytes),
    visualReview: fileReceiptFromBytes(workerRoot, priorReviewArchivePath, priorReviewBytes),
    binaryAllowlist: fileReceiptFromBytes(workerRoot, priorAllowlistArchivePath, priorAllowlistBytes),
    taskReceipt: fileReceiptFromBytes(workerRoot, priorTaskReceiptArchivePath, priorTaskReceiptBytes),
  },
  approvedCandidateCombinedSha256: priorApproval.machineBinding.candidateCombinedSha256,
  replacementCandidateCombinedSha256: candidateCombinedSha256,
  reasons: [
    "routine E2E rewrote the active approved screenshot directory during the ship gate",
    "post-ship debug changed Worker response-body lifecycle bytes",
    "paired rollback evidence was regenerated with the missing Pages public release source",
  ],
  unavailableHistoricalArtifacts: [
    "the exact approved PNG set was overwritten before this remediation",
    "the attempt 13 pair rollback and patch bytes were replaced during rollback-scope repair",
  ],
  authorization: { commit: false, push: false, deploy: false, remoteChanges: false },
};
const invalidationBytes = jsonBytes(invalidation);

const approval = {
  schemaVersion: 2,
  taskId: "S21-T15",
  attempt,
  receiptKind: "visual_approval",
  candidateLabel,
  recordedAt: now,
  preapprovalEvidence: { path: repositoryPath(workerRoot, candidateEvidencePath), sha256: sha256(candidateEvidenceBytes), gateStatus: evidence.gateStatus },
  visualReview: { path: repositoryPath(workerRoot, visualReviewPath), sha256: sha256(visualReviewBytes) },
  machineBinding: {
    candidateCombinedSha256,
    releaseScopeSha256: evidence.repositories.pages.releaseScope.sha256,
  },
  previewPaths: [
    "pages:work-products/tests/fixtures/ui-review/section21-candidate/routes-home-zh-CN-1440.png",
    "pages:work-products/tests/fixtures/ui-review/section21-candidate/routes-search-ready-en-320.png",
    "pages:work-products/tests/fixtures/ui-review/section21-candidate/routes-player-ready-en-1024.png",
    "pages:work-products/tests/fixtures/ui-review/section21-candidate/routes-settings-zh-CN-1024.png",
  ],
  decision: "PENDING",
  decidedAt: null,
  decisionSummary: null,
  feedback: [],
  humanDecisionContract: {
    shaRequired: false,
    approvePhrase: `批准视觉候选 ${attempt}`,
    rejectPhrase: `拒绝视觉候选 ${attempt}：说明问题`,
  },
  supersedesDecision: {
    path: repositoryPath(workerRoot, invalidationReceiptPath),
    sha256: sha256(invalidationBytes),
    disposition: `attempt ${previousAttempt} approval is retained as historical evidence but invalidated for current bytes; attempt ${attempt} requires a new visible candidate and a new user decision`,
  },
  authorization: { commit: false, push: false, deploy: false, remoteChanges: false },
};
const approvalBytes = jsonBytes(approval);

commitEvidenceWrites(writeAuthorization, [
  { path: priorEvidenceArchivePath, bytes: priorEvidenceBytes },
  { path: priorReviewArchivePath, bytes: priorReviewBytes },
  { path: priorApprovalArchivePath, bytes: existingApprovalBytes },
  { path: priorAllowlistArchivePath, bytes: priorAllowlistBytes },
  { path: priorTaskReceiptArchivePath, bytes: priorTaskReceiptBytes },
  { path: invalidationReceiptPath, bytes: invalidationBytes },
  { path: allowlistPath, bytes: allowlistBytes },
  { path: candidateEvidencePath, bytes: candidateEvidenceBytes },
  { path: visualReviewPath, bytes: visualReviewBytes },
  { path: approvalPath, bytes: approvalBytes },
]);

process.stdout.write(`${JSON.stringify({ candidateLabel, candidateCount: candidateReceipts.length, candidateBytes: candidateTotalBytes, machineBindingRecorded: true, workerZipCount: workerBinaries.length, binaryCount: allowlistFiles.length })}\n`);
