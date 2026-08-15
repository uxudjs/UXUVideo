import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import test from "node:test";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

test("repository product surface is Worker-only", () => {
  const retiredDirectories = ["app", "components", "docs", "lib", "public", "tests", "types", "verification"];
  const tracked = execFileSync("git", ["ls-files", "--", ...retiredDirectories], { cwd: root, encoding: "utf8" })
    .split(/\r?\n/).filter(Boolean);
  assert.deepEqual(tracked.filter((path) => existsSync(join(root, path))), []);

  const retiredFiles = [
    "app-release.json", "eslint.config.mjs", "eslint-suppressions.json", "next.config.ts",
    "postcss.config.mjs", "tsconfig.json", ".npmrc", ".github/workflows/Github_Upstream_Sync.yml",
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

test("Worker release version 1.1.3 is synchronized", () => {
  const workerVersion = /const WORKER_VERSION = ['"]([^'"]+)['"]/.exec(read("_worker.js"))?.[1];
  const packageVersion = JSON.parse(read("package.json")).version;
  const packageLock = JSON.parse(read("package-lock.json"));

  assert.equal(workerVersion, "1.1.3");
  assert.equal(packageVersion, workerVersion);
  assert.equal(packageLock.version, workerVersion);
  assert.equal(packageLock.packages[""].version, workerVersion);
  assert.match(read("README.md"), /版本 `1\.1\.3`/);
  assert.match(read("CHANGELOG.md"), /## 1\.1\.3 - 2026-08-15/);
});

test("compressed Worker stays below the 3 MiB upload boundary", () => {
  const compressed = gzipSync(readFileSync(join(root, "_worker.js"), null), { level: 9 });
  assert.ok(compressed.byteLength < 3 * 1024 * 1024, `${compressed.byteLength} bytes`);
});

test("Worker uses Pages version compatibility without commit or SHA pins", () => {
  const worker = read("_worker.js");
  assert.match(worker, /const PAGES_BASE_URL = ['"]https:\/\/uxudjs\.github\.io\/UXUV-Pages\/['"]/);
  assert.doesNotMatch(worker, /\bPAGES_VERSION\b/);
  assert.doesNotMatch(worker, /\bPAGES_GIT_COMMIT\b/);
  assert.doesNotMatch(worker, /\bPAGES_MANIFEST_SHA256\b/);
  assert.doesNotMatch(worker, /UXUV-Pages\/(?:\d+\.\d+\.\d+|main|master|latest)\//i);
});

test("Worker and Pages deployment contract is documented", () => {
  const readme = read("README.md");
  const changelog = read("CHANGELOG.md");
  const spec = read("work-products/SPEC.md");
  for (const term of [
    "DB", "ADMIN_PASSWORD", "AUTH_SECRET", "CF_ANALYTICS_API_TOKEN", "CF_ACCOUNT_ID",
    "CF_WORKER_SCRIPT_NAME", "CF_D1_DATABASE_ID", "https://uxudjs.github.io/UXUV-Pages/",
    "不再使用版本目录", "API Contract", "workerRange", "独立发布", "无需配置任何对接密钥",
    "上一份兼容 Pages artifact", "Free", "D1", "回滚", "本地",
  ]) assert.match(readme, new RegExp(term));
  assert.doesNotMatch(readme, /PAGES_GIT_COMMIT|PAGES_MANIFEST_SHA256|Pages 版本、commit|资产 SHA-256/);
  assert.match(changelog, /## 1\.0\.0 - 2026-08-07/);
  assert.match(changelog, /单一 `release\/current` 产物/);
  assert.match(changelog, /无需更新 Worker 或配置 Pages 对接密钥/);
  assert.match(spec, /只有已读取并验证当前 Pages 清单的静态 Pages 响应与 `\/api\/config` 才带 `X-UXUV-Pages-Version`/);
  assert.match(spec, /其他 API 不回报未验证、过期或硬编码的 Pages 版本/);
});
