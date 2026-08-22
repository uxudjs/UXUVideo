import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import test from "node:test";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

test("repository product surface is Worker-only", () => {
  const retiredDirectories = [
    ".next", ".vercel", "app", "build", "components", "docs", "lib",
    "node_modules", "out", "public", "tests", "types", "verification",
  ];
  const tracked = execFileSync("git", ["ls-files", "--", ...retiredDirectories], { cwd: root, encoding: "utf8" })
    .split(/\r?\n/).filter(Boolean);
  assert.deepEqual(tracked.filter((path) => existsSync(join(root, path))), []);
  assert.deepEqual(retiredDirectories.filter((path) => existsSync(join(root, path))), []);

  const retiredFiles = [
    "app-release.json", "CODE_OF_CONDUCT.md", "CONTRIBUTING.md", "SECURITY.md",
    "eslint.config.mjs", "eslint-suppressions.json", "next.config.ts",
    "postcss.config.mjs", "tsconfig.json", "next-env.d.ts", "tsconfig.tsbuildinfo",
    "contrast-test-results.json", ".npmrc", ".github/pull_request_template.md",
    ".github/workflows/Github_Upstream_Sync.yml",
  ];
  assert.deepEqual(retiredFiles.filter((path) => existsSync(join(root, path))), []);
  assert.equal(existsSync(join(root, "_worker.js")), true);
});

test("Worker has no npm or local runtime dependency", () => {
  const worker = read("_worker.js");
  assert.doesNotMatch(worker, /^\s*(?:import\s|export\s+.+\s+from\s|require\()/m);
  assert.doesNotMatch(worker, /node:(?:fs|path)|readFile|process\.cwd/);

  const packageJson = JSON.parse(read("package.json"));
  assert.deepEqual(packageJson.dependencies ?? {}, {});
  assert.deepEqual(packageJson.devDependencies ?? {}, {});
  assert.equal(packageJson.scripts.test, "node --test work-products/tests");
  assert.equal(packageJson.scripts["check:size"], "node scripts/check-worker-size.mjs");
});

test("Worker release version 2.0.0 is synchronized", () => {
  const workerVersion = /const WORKER_VERSION = ['"]([^'"]+)['"]/.exec(read("_worker.js"))?.[1];
  const packageVersion = JSON.parse(read("package.json")).version;
  const packageLock = JSON.parse(read("package-lock.json"));

  assert.equal(workerVersion, "2.0.0");
  assert.equal(packageVersion, workerVersion);
  assert.equal(packageLock.version, workerVersion);
  assert.equal(packageLock.packages[""].version, workerVersion);
  assert.match(read("README.md"), /版本 `2\.0\.0`/);
  assert.match(read("CHANGELOG.md"), /## 2\.0\.0 - 2026-08-18/);
});

test("compressed Worker stays below the 3 MiB upload boundary", () => {
  const compressed = gzipSync(readFileSync(join(root, "_worker.js"), null), { level: 9 });
  assert.ok(compressed.byteLength < 3 * 1024 * 1024, `${compressed.byteLength} bytes`);
});

test("Worker uses Pages version compatibility without commit or SHA pins", () => {
  const worker = read("_worker.js");
  assert.match(worker, /const PAGES_BASE_URL = ['"]https:\/\/uxudjs\.github\.io\/UXUV-Pages\/app\/['"]/);
  assert.doesNotMatch(worker, /\bPAGES_VERSION\b/);
  assert.doesNotMatch(worker, /\bPAGES_GIT_COMMIT\b/);
  assert.doesNotMatch(worker, /\bPAGES_MANIFEST_SHA256\b/);
  assert.doesNotMatch(worker, /UXUV-Pages\/(?:\d+\.\d+\.\d+|main|master|latest)\//i);
});

test("README keeps user guidance separate from technical release records", () => {
  const readme = read("README.md");
  const changelog = read("CHANGELOG.md");
  const spec = read("work-products/SPEC.md");
  const activeWorkerTests = readdirSync(join(root, "work-products/tests"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
    .map((entry) => read(`work-products/tests/${entry.name}`))
    .join("\n");
  for (const term of [
    "DB", "ADMIN_PASSWORD", "AUTH_SECRET", "CF_ANALYTICS_API_TOKEN", "CF_ACCOUNT_ID",
    "https://uxudjs.github.io/UXUV-Pages/app/",
    "### 主要功能", "### 部署使用", "### 使用方法", "### 环境变量", "### 更新与回滚", "### 免责声明",
  ]) assert.match(readme, new RegExp(term));
  for (const retiredUsageName of [
    ["CF", "WORKER", "SCRIPT", "NAME"].join("_"),
    ["CF", "D1", "DATABASE", "ID"].join("_"),
  ]) {
    assert.doesNotMatch(readme, new RegExp(retiredUsageName));
    assert.doesNotMatch(read("_worker.js"), new RegExp(retiredUsageName));
    assert.doesNotMatch(activeWorkerTests, new RegExp(retiredUsageName));
  }
  assert.doesNotMatch(readme, /API Contract|workerRange|pagesVersion|release manifest|GitHub Actions|artifact|fixture|D1 schema|node --check|npm test|check:size|PAGES_GIT_COMMIT|PAGES_MANIFEST_SHA256|资产 SHA-256/);
  assert.match(changelog, /## 1\.0\.0 - 2026-08-07/);
  assert.match(changelog, /单一 `release\/current` 产物/);
  assert.match(changelog, /无需更新 Worker 或配置 Pages 对接密钥/);
  assert.match(spec, /只有已读取并验证当前 Pages 清单的静态 Pages 响应与 `\/api\/config` 才带 `X-UXUV-Pages-Version`/);
  assert.match(spec, /其他 API 不回报未验证、过期或硬编码的 Pages 版本/);
});

test("README explains the source workflow and responsibility boundary in user language", () => {
  const readme = read("README.md");
  for (const term of [
    "GitHub Pages 不是应用入口",
    "设置 → 视频源管理 → 导入 → 订阅",
    "网页设置是普通用户配置视频源和订阅的入口",
    "同一账号的设置会通过部署者的 D1 数据库同步",
    "所有视频源和弹幕 API 均由用户在网页设置中自行导入；系统不提供预设来源",
    "本项目不内置视频内容或订阅源",
    "请遵守所在地法律法规",
  ]) assert.match(readme, new RegExp(term));

  assert.ok(
    readme.indexOf("### 主要功能") < readme.indexOf("### 部署使用")
      && readme.indexOf("### 部署使用") < readme.indexOf("### 使用方法"),
    "the README should follow the user-facing feature, deployment, then usage flow",
  );
});

test("S21-T14 README uses the approved legal boundary and unified source/data workflow", () => {
  const readme = read("README.md");
  for (const retiredEnvironmentName of ["SUBSCRIPTION_SOURCES", "DANMAKU_API_URL", "IPTV_SOURCES"]) {
    assert.doesNotMatch(readme, new RegExp(retiredEnvironmentName));
  }
  for (const term of [
    "只使用自己有权访问的来源",
    "不提供或存储视频",
    "使用后删除自己下载或可控制的临时副本",
    "不能使未经授权的使用自动合法",
    "设置 → 数据管理",
    "导入前会先验证并预览",
    "已退休字段会被跳过并明确提示",
  ]) assert.match(readme, new RegExp(term));
  assert.doesNotMatch(readme, /个人视频源/);
});

test("S21-T14 documents one paired candidate and never authorizes remote release", () => {
  assert.equal(existsSync(join(root, "work-products/evidence/section21/release-runbook.md")), true);
  assert.equal(existsSync(join(root, "work-products/evidence/section21/pair-rollback.json")), true);
  const readme = read("README.md");
  const changelog = read("CHANGELOG.md");
  const runbook = read("work-products/evidence/section21/release-runbook.md");
  assert.match(readme, /不可只升级或回滚其中一仓/);
  assert.match(readme, /release-runbook\.md/);
  assert.match(changelog, /Worker `2\.0\.0`.*Pages `0\.3\.0`.*API Contract `2`/s);
  assert.match(changelog, /21 条同源 API 路由/);
  assert.match(changelog, /schema v2/);
  assert.match(runbook, /Pages v2[\s\S]*manifest[\s\S]*公开字节[\s\S]*Worker v2/);
  assert.match(runbook, /Pages v1[\s\S]*Worker v1/);
  assert.match(runbook, /预先批准的维护窗/);
  assert.match(runbook, /不授权.*commit.*push.*发布.*部署/s);
});
