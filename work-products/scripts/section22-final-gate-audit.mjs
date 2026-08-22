import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workerRoot = resolve(dirname(scriptPath), "../..");
const pagesRoot = resolve(workerRoot, "../UXUV-Pages");
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const fail = (message) => { throw new Error(message); };

const sortedUnique = (values, label) => {
  const sorted = [...values].sort(compareText);
  if (new Set(sorted.map((value) => value.toLowerCase())).size !== sorted.length) {
    fail(`${label} contains a duplicate or case alias`);
  }
  return sorted;
};

export const auditReleaseContract = ({
  workerPackageVersion,
  pagesPackageVersion,
  workerSource,
  releaseManifest,
  actualFiles,
  expectedRouteCount,
  expectedAssetCount,
}) => {
  if (workerPackageVersion !== "2.0.0" || pagesPackageVersion !== "0.3.0") fail("package identity mismatch");
  if (!workerSource.includes("const WORKER_VERSION = '2.0.0';")
    || !workerSource.includes("const API_CONTRACT_VERSION = '2';")) fail("Worker identity mismatch");
  if (!releaseManifest || typeof releaseManifest !== "object" || Array.isArray(releaseManifest)) {
    fail("release manifest is invalid");
  }
  if (releaseManifest.schemaVersion !== 1
    || releaseManifest.pagesVersion !== "0.3.0"
    || releaseManifest.apiContract !== 2
    || releaseManifest.workerRange !== ">=2.0.0 <3.0.0") fail("release identity mismatch");
  const routes = Object.entries(releaseManifest.routes ?? {});
  const assets = Object.values(releaseManifest.assets ?? {});
  if (routes.length !== expectedRouteCount || assets.length !== expectedAssetCount) {
    fail("release route or asset count mismatch");
  }
  const declaredFiles = sortedUnique(assets.map((asset) => asset?.path), "release assets");
  if (declaredFiles.some((path) => typeof path !== "string" || path.length === 0)) fail("release asset path is invalid");
  for (const [route, path] of routes) {
    if (typeof route !== "string" || typeof path !== "string" || !declaredFiles.includes(path)) {
      fail(`route asset is missing: ${route}`);
    }
  }
  const actual = sortedUnique(actualFiles, "release actual files");
  if (JSON.stringify(actual) !== JSON.stringify(declaredFiles)) fail("release manifest actual file set mismatch");
  return {
    workerVersion: workerPackageVersion,
    pagesVersion: pagesPackageVersion,
    apiContract: releaseManifest.apiContract,
    workerRange: releaseManifest.workerRange,
    routes: routes.length,
    assets: assets.length,
  };
};

export const auditTaskTempEntries = (entries) => {
  const names = sortedUnique(entries, "task temp");
  if (names.length === 0) return "empty";
  if (names.length === 1 && names[0] === "playwright-transform-cache") return "playwright-transform-cache";
  fail("task temp contains unexpected entries");
};

const readTaskTempEntries = async (taskTemp) => {
  try {
    return await readdir(taskTemp);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
};

const walkFiles = async (root, options = {}) => {
  const files = [];
  let entriesSeen = 0;
  const visit = async (directory, prefix = "") => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compareText(left.name, right.name));
    for (const entry of entries) {
      entriesSeen += 1;
      if (entriesSeen > (options.maxEntries ?? 100_000)) fail(`${options.label ?? "tree"} exceeds entry limit`);
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = resolve(directory, entry.name);
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) fail(`${options.label ?? "tree"} contains a link or reparse point`);
      const resolved = await realpath(absolute);
      if (resolved.toLowerCase() !== absolute.toLowerCase()) fail(`${options.label ?? "tree"} crosses a link or reparse boundary`);
      if (entry.isDirectory()) await visit(absolute, path);
      else if (entry.isFile()) files.push(path);
      else fail(`${options.label ?? "tree"} contains an unsupported filesystem type`);
    }
  };
  await visit(root);
  return files;
};

const sourceFiles = async () => {
  const files = [
    resolve(workerRoot, "_worker.js"),
    resolve(workerRoot, "README.md"),
    resolve(pagesRoot, "package.json"),
  ];
  const addTopLevel = async (root, extensions) => {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension))) files.push(resolve(root, entry.name));
    }
  };
  const addRecursive = async (root, extensions) => {
    const visit = async (directory) => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const absolute = resolve(directory, entry.name);
        if (entry.isDirectory()) await visit(absolute);
        else if (entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension))) files.push(absolute);
      }
    };
    await visit(root);
  };
  await addTopLevel(resolve(workerRoot, "work-products/tests"), [".test.mjs"]);
  await addTopLevel(resolve(pagesRoot, "work-products/tests"), [".mjs", ".ts", ".tsx", ".js"]);
  for (const directory of ["app", "components", "lib"]) {
    await addRecursive(resolve(pagesRoot, directory), [".ts", ".tsx", ".js", ".mjs"]);
  }
  return sortedUnique(files, "active source files");
};

const auditRetiredNames = async () => {
  const retired = ["CF_WORKER_SCRIPT_NAME", "CF_D1_DATABASE_ID"];
  for (const path of await sourceFiles()) {
    const source = await readFile(path, "utf8");
    if (retired.some((name) => source.includes(name))) fail("retired active name found");
  }
  return 0;
};

const canonicalTaskTemp = (value) => {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || isAbsolute(value)) {
    fail("task temp must be a canonical repository-relative path");
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")
    || !value.startsWith("work-products/tests/work/")) fail("task temp path is outside the test-work boundary");
  const absolute = resolve(workerRoot, ...segments);
  const fromRoot = relative(workerRoot, absolute);
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) fail("task temp escapes the Worker repository");
  return absolute;
};

const run = async (taskTempRelative) => {
  const workerPackage = JSON.parse(await readFile(resolve(workerRoot, "package.json"), "utf8"));
  const pagesPackage = JSON.parse(await readFile(resolve(pagesRoot, "package.json"), "utf8"));
  const source = await readFile(resolve(workerRoot, "_worker.js"), "utf8");
  const releaseRoot = resolve(pagesRoot, "release/current");
  const releaseManifest = JSON.parse(await readFile(resolve(releaseRoot, "release-manifest.json"), "utf8"));
  const actualFiles = (await walkFiles(releaseRoot, { label: "release/current" }))
    .filter((path) => path !== "release-manifest.json");
  const identity = auditReleaseContract({
    workerPackageVersion: workerPackage.version,
    pagesPackageVersion: pagesPackage.version,
    workerSource: source,
    releaseManifest,
    actualFiles,
    expectedRouteCount: 7,
    expectedAssetCount: 72,
  });
  const taskTemp = canonicalTaskTemp(taskTempRelative);
  const taskTempEntries = await readTaskTempEntries(taskTemp);
  const taskTempState = auditTaskTempEntries(taskTempEntries);
  if (taskTempState === "playwright-transform-cache") {
    await walkFiles(resolve(taskTemp, "playwright-transform-cache"), {
      label: "Playwright transform cache",
      maxEntries: 8_192,
    });
  }
  const retiredActiveNames = await auditRetiredNames();
  return {
    schema_version: "s22-final-gate-audit/v1",
    identity: `Worker ${identity.workerVersion} / Pages ${identity.pagesVersion} / API ${identity.apiContract} / ${identity.workerRange}`,
    routes: identity.routes,
    assets: identity.assets,
    manifest_actual: "IDENTICAL",
    retired_active_names: retiredActiveNames,
    task_temp: taskTempState,
  };
};

const sanitize = (error) => {
  let message = error instanceof Error ? error.message : "unknown failure";
  for (const root of [workerRoot, pagesRoot]) {
    message = message.replaceAll(root, "<workspace>").replaceAll(root.replaceAll("\\", "/"), "<workspace>");
  }
  return message;
};

const isMain = typeof process.argv[1] === "string"
  && resolve(process.argv[1]).toLowerCase() === scriptPath.toLowerCase();

if (isMain) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== "--task-temp") fail("requires only --task-temp");
    process.stdout.write(`${JSON.stringify(await run(args[1]))}\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${sanitize(error)}\n`);
    process.exitCode = 1;
  }
}
