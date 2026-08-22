import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  auditReleaseContract,
  auditTaskTempEntries,
} from "../scripts/section22-final-gate-audit.mjs";

const fixture = () => ({
  workerPackageVersion: "2.0.0",
  pagesPackageVersion: "0.3.0",
  workerSource: "const WORKER_VERSION = '2.0.0';\nconst API_CONTRACT_VERSION = '2';\n",
  releaseManifest: {
    schemaVersion: 1,
    pagesVersion: "0.3.0",
    apiContract: 2,
    workerRange: ">=2.0.0 <3.0.0",
    routes: { "/": "index.html" },
    assets: {
      "/index.html": { path: "index.html", contentType: "text/html; charset=utf-8" },
    },
  },
  actualFiles: ["index.html"],
  expectedRouteCount: 1,
  expectedAssetCount: 1,
});

test("final-gate audit matches root routes by declared asset path", () => {
  assert.deepEqual(auditReleaseContract(fixture()), {
    workerVersion: "2.0.0",
    pagesVersion: "0.3.0",
    apiContract: 2,
    workerRange: ">=2.0.0 <3.0.0",
    routes: 1,
    assets: 1,
  });
  const broken = fixture();
  broken.releaseManifest.routes["/"] = "missing.html";
  assert.throws(() => auditReleaseContract(broken), /route asset is missing/u);
});

test("final-gate audit allows only an empty task temp or Playwright transform cache", () => {
  assert.equal(auditTaskTempEntries([]), "empty");
  assert.equal(auditTaskTempEntries(["playwright-transform-cache"]), "playwright-transform-cache");
  assert.throws(() => auditTaskTempEntries(["unexpected"]), /task temp contains unexpected entries/u);
  assert.throws(
    () => auditTaskTempEntries(["playwright-transform-cache", "unexpected"]),
    /task temp contains unexpected entries/u,
  );
});

test("final-gate audit CLI validates the retained local candidate without writes", () => {
  const result = spawnSync(process.execPath, [
    "work-products/scripts/section22-final-gate-audit.mjs",
    "--task-temp",
    "work-products/tests/work/section22-r21-temp",
  ], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const summary = JSON.parse(result.stdout);
  assert.ok(["empty", "playwright-transform-cache"].includes(summary.task_temp));
  assert.deepEqual({
    schema_version: summary.schema_version,
    identity: summary.identity,
    routes: summary.routes,
    assets: summary.assets,
    manifest_actual: summary.manifest_actual,
    retired_active_names: summary.retired_active_names,
  }, {
    schema_version: "s22-final-gate-audit/v1",
    identity: "Worker 2.0.0 / Pages 0.3.0 / API 2 / >=2.0.0 <3.0.0",
    routes: 7,
    assets: 72,
    manifest_actual: "IDENTICAL",
    retired_active_names: 0,
  });
  assert.doesNotMatch(result.stdout + result.stderr, /(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/u);
});

test("final-gate audit CLI treats an absent bounded task temp as empty", () => {
  const result = spawnSync(process.execPath, [
    "work-products/scripts/section22-final-gate-audit.mjs",
    "--task-temp",
    "work-products/tests/work/section22-final-gate-audit-absent",
  ], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.equal(JSON.parse(result.stdout).task_temp, "empty");
  assert.doesNotMatch(result.stdout + result.stderr, /(?:[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/u);
});
