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

test("compressed Worker stays below the 3 MiB upload boundary", () => {
  const compressed = gzipSync(readFileSync(join(root, "_worker.js"), null), { level: 9 });
  assert.ok(compressed.byteLength < 3 * 1024 * 1024, `${compressed.byteLength} bytes`);
});

test("Worker and Pages deployment contract is documented", () => {
  const readme = read("README.md");
  const changelog = read("CHANGELOG.md");
  for (const term of [
    "DB", "ADMIN_PASSWORD", "AUTH_SECRET", "CF_ANALYTICS_API_TOKEN", "CF_ACCOUNT_ID",
    "CF_WORKER_SCRIPT_NAME", "CF_D1_DATABASE_ID", "0.1.2", "Free", "D1", "回滚", "本地",
  ]) assert.match(readme, new RegExp(term));
  assert.match(changelog, /## 1\.0\.0 - 2026-08-07/);
  assert.match(changelog, /Pages 0\.1\.2/);
});
