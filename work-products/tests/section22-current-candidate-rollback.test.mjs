import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const workerRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const pagesRoot = resolve(workerRoot, "../UXUV-Pages");
const evidenceRoot = join(workerRoot, "work-products", "evidence", "section22");
const workRoot = join(workerRoot, "work-products", "debug", "section22-current-candidate-rollback-work");
const artifacts = {
  manifest: join(evidenceRoot, "current-candidate-rollback.json"),
  workerForward: join(evidenceRoot, "current-candidate-worker.forward.patch"),
  workerReverse: join(evidenceRoot, "current-candidate-worker.reverse.patch"),
  pagesForward: join(evidenceRoot, "current-candidate-pages.forward.patch"),
  pagesReverse: join(evidenceRoot, "current-candidate-pages.reverse.patch"),
};
const candidateId = "s22-production-usage-fix-20260822-01";

const workerFiles = new Set(["README.md", "CHANGELOG.md", "_worker.js", "package.json", "package-lock.json"]);
const pagesFiles = new Set([
  ".github/workflows/pages.yml",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "playwright.config.ts",
]);
const pagesPrefixes = ["app/", "components/", "lib/", "public/", "scripts/"];
const slash = (value) => value.replaceAll("\\", "/");
const workerScope = (path) => workerFiles.has(slash(path));
const pagesScope = (path) => pagesFiles.has(slash(path)) || pagesPrefixes.some((prefix) => slash(path).startsWith(prefix));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const text = (value) => Buffer.isBuffer(value) ? value.toString("utf8") : String(value ?? "");

function run(file, args, { cwd, input, buffer = false } = {}) {
  const result = spawnSync(file, args, {
    cwd,
    input,
    encoding: buffer ? undefined : "utf8",
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const detail = [text(result.stdout), text(result.stderr)].filter(Boolean).join("\n").trim();
    throw new Error(`${file} ${args.join(" ")} failed${detail ? `\n${detail}` : ""}`);
  }
  return result.stdout ?? (buffer ? Buffer.alloc(0) : "");
}

function git(root, args, options = {}) {
  return run("git", ["-c", "core.longpaths=true", "-C", root, ...args], options);
}

function parseNul(value) {
  return text(value).split("\0").filter(Boolean);
}

function checkedPath(root, path) {
  const normalized = slash(path);
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`unsafe repository path: ${path}`);
  }
  const target = resolve(root, ...normalized.split("/"));
  if (!target.startsWith(`${resolve(root)}${sep}`)) throw new Error(`escaped repository path: ${path}`);
  return target;
}

function parseIndex(root) {
  const result = new Map();
  for (const record of parseNul(git(root, ["ls-files", "--stage", "-z"], { buffer: true }))) {
    const match = /^(\d+) ([0-9a-f]+) (\d)\t([\s\S]+)$/u.exec(record);
    if (!match || match[3] !== "0") throw new Error(`unexpected index entry: ${record}`);
    result.set(slash(match[4]), { mode: match[1], blobOid: match[2] });
  }
  return result;
}

function parseTree(root, revision) {
  const result = new Map();
  for (const record of parseNul(git(root, ["ls-tree", "-r", "-z", revision], { buffer: true }))) {
    const match = /^(\d+) blob ([0-9a-f]+)\t([\s\S]+)$/u.exec(record);
    if (match) result.set(slash(match[3]), { mode: match[1], blobOid: match[2] });
  }
  return result;
}

function blobState(root, entry, cache = new Map()) {
  if (!entry) return null;
  let value = cache.get(entry.blobOid);
  if (!value) {
    const bytes = git(root, ["cat-file", "blob", entry.blobOid], { buffer: true });
    value = { bytes: bytes.byteLength, sha256: sha256(bytes) };
    cache.set(entry.blobOid, value);
  }
  return { mode: entry.mode, blobOid: entry.blobOid, bytes: value.bytes, sha256: value.sha256 };
}

function candidatePaths(root, base, matcher) {
  const basePaths = parseNul(git(root, ["ls-tree", "-r", "--name-only", "-z", base], { buffer: true }));
  const visible = parseNul(git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { buffer: true }));
  return [...new Set([...basePaths, ...visible].map(slash).filter(matcher))].sort();
}

function prepareClone(source, target, revision, autoCrlf = false) {
  mkdirSync(dirname(target), { recursive: true });
  run("git", ["clone", "--local", "--no-hardlinks", "--no-checkout", source, target], { cwd: workRoot });
  git(target, ["config", "core.longpaths", "true"]);
  git(target, ["config", "core.autocrlf", autoCrlf ? "true" : "false"]);
  git(target, ["checkout", "--detach", revision]);
}

function stageCandidate(source, stage, base, matcher) {
  prepareClone(source, stage, base, true);
  const paths = candidatePaths(source, base, matcher);
  const sourceIndex = parseIndex(source);
  for (const path of paths) {
    const from = checkedPath(source, path);
    const to = checkedPath(stage, path);
    if (!existsSync(from)) {
      rmSync(to, { force: true });
      continue;
    }
    const metadata = lstatSync(from);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`unsupported candidate entry: ${path}`);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  }
  git(stage, ["add", "-A"]);
  let staged = parseIndex(stage);
  for (const path of paths) {
    if (!existsSync(checkedPath(source, path))) continue;
    const desired = sourceIndex.get(path)?.mode ?? "100644";
    if (staged.get(path)?.mode !== desired) {
      git(stage, ["update-index", desired === "100755" ? "--chmod=+x" : "--chmod=-x", "--", path]);
    }
  }
  staged = parseIndex(stage);
  const baseTree = parseTree(stage, base);
  const cache = new Map();
  const entries = paths.map((path) => ({
    path,
    base: blobState(stage, baseTree.get(path), cache),
    candidate: blobState(stage, staged.get(path), cache),
  }));
  const changedPaths = parseNul(git(stage, ["diff", "--cached", "--name-only", "-z", "HEAD"], { buffer: true })).map(slash);
  assert.ok(changedPaths.length > 0, "rollback scope must contain candidate changes");
  assert.ok(changedPaths.every(matcher), "rollback change escaped release scope");
  return {
    repository: { baseCommit: base, changedPaths, entries },
    forward: git(stage, ["diff", "--cached", "--binary", "--full-index", "HEAD"], { buffer: true }),
    reverse: git(stage, ["diff", "--cached", "--binary", "--full-index", "-R", "HEAD"], { buffer: true }),
  };
}

function applyPatch(root, bytes, check) {
  git(root, ["apply", ...(check ? ["--check"] : []), "--index", "--binary", "-"], { input: bytes, buffer: true });
}

function verifyIndex(root, repository, side, matcher) {
  const index = parseIndex(root);
  const expectedPaths = repository.entries.filter((entry) => entry[side]).map((entry) => entry.path);
  assert.deepEqual([...index.keys()].filter(matcher).sort(), expectedPaths, `${side} release path set`);
  const cache = new Map();
  for (const entry of repository.entries) {
    assert.deepEqual(blobState(root, index.get(entry.path), cache), entry[side], `${side} ${entry.path}`);
  }
  git(root, ["diff", "--exit-code"]);
}

function verifyIdentity(worker, pages) {
  const workerPackage = JSON.parse(readFileSync(join(worker, "package.json"), "utf8"));
  const workerSource = readFileSync(join(worker, "_worker.js"), "utf8");
  const pagesPackage = JSON.parse(readFileSync(join(pages, "package.json"), "utf8"));
  const releaseSource = readFileSync(join(pages, "scripts", "build-release.mjs"), "utf8");
  const usageHook = readFileSync(join(pages, "lib", "hooks", "useCloudflareUsage.ts"), "utf8");
  assert.equal(workerPackage.version, "2.0.0");
  assert.match(workerSource, /const API_CONTRACT_VERSION = ['"]2['"]/u);
  assert.match(workerSource, /avg \{ sampleInterval \}/u);
  assert.doesNotMatch(workerSource, /\$(?:scriptName|databaseId)\b/u);
  assert.equal(pagesPackage.version, "0.3.0");
  assert.match(releaseSource, /apiContract: 2/u);
  assert.match(releaseSource, /workerRange: ">=2\.0\.0 <3\.0\.0"/u);
  assert.match(usageHook, /REFRESH_COOLDOWN_MS = 30_000/u);
  assert.match(usageHook, /expectedUsageState/u);
}

function runDrill(manifest, patches) {
  const root = join(workRoot, `replay-${process.pid}-${randomUUID()}`);
  const worker = join(root, "UXUVideo");
  const pages = join(root, "UXUV-Pages");
  try {
    prepareClone(workerRoot, worker, manifest.repositories.worker.baseCommit);
    prepareClone(pagesRoot, pages, manifest.repositories.pages.baseCommit);
    for (const [target, patch] of [[worker, patches.workerForward], [pages, patches.pagesForward]]) {
      applyPatch(target, patch, true);
      applyPatch(target, patch, false);
    }
    verifyIndex(worker, manifest.repositories.worker, "candidate", workerScope);
    verifyIndex(pages, manifest.repositories.pages, "candidate", pagesScope);
    verifyIdentity(worker, pages);
    run(process.execPath, ["--check", "_worker.js"], { cwd: worker });

    for (const [target, patch] of [[worker, patches.workerReverse], [pages, patches.pagesReverse]]) {
      applyPatch(target, patch, true);
      applyPatch(target, patch, false);
    }
    verifyIndex(worker, manifest.repositories.worker, "base", workerScope);
    verifyIndex(pages, manifest.repositories.pages, "base", pagesScope);
    git(worker, ["diff", "--cached", "--exit-code", "HEAD"]);
    git(pages, ["diff", "--cached", "--exit-code", "HEAD"]);

    for (const [target, patch] of [[worker, patches.workerForward], [pages, patches.pagesForward]]) {
      applyPatch(target, patch, true);
      applyPatch(target, patch, false);
    }
    verifyIndex(worker, manifest.repositories.worker, "candidate", workerScope);
    verifyIndex(pages, manifest.repositories.pages, "candidate", pagesScope);
    verifyIdentity(worker, pages);
  } finally {
    const boundary = `${resolve(workRoot)}${sep}`;
    if (!resolve(root).startsWith(boundary)) throw new Error("refusing unsafe rollback cleanup");
    rmSync(root, { recursive: true, force: true });
  }
}

function patchRecord(path, bytes) {
  return { path: slash(relative(workerRoot, path)), bytes: bytes.byteLength, sha256: sha256(bytes) };
}

function generate() {
  mkdirSync(workRoot, { recursive: true });
  mkdirSync(evidenceRoot, { recursive: true });
  const priorManifest = JSON.parse(readFileSync(artifacts.manifest, "utf8"));
  const generationRoot = join(workRoot, `generate-${process.pid}-${randomUUID()}`);
  let worker;
  let pages;
  try {
    worker = stageCandidate(workerRoot, join(generationRoot, "UXUVideo"), priorManifest.repositories.worker.baseCommit, workerScope);
    pages = stageCandidate(pagesRoot, join(generationRoot, "UXUV-Pages"), priorManifest.repositories.pages.baseCommit, pagesScope);
  } finally {
    const boundary = `${resolve(workRoot)}${sep}`;
    if (!resolve(generationRoot).startsWith(boundary)) throw new Error("refusing unsafe generation cleanup");
    rmSync(generationRoot, { recursive: true, force: true });
  }
  const patches = {
    workerForward: worker.forward,
    workerReverse: worker.reverse,
    pagesForward: pages.forward,
    pagesReverse: pages.reverse,
  };
  const manifest = {
    schemaVersion: "section22-current-candidate-rollback/v1",
    candidateId,
    generatedAt: new Date().toISOString(),
    repositories: { worker: worker.repository, pages: pages.repository },
    patches: Object.fromEntries(Object.entries(patches).map(([name, bytes]) => [name, patchRecord(artifacts[name], bytes)])),
    phases: ["forward-current-candidate", "reverse-current-head-pair", "forward-restore-current-candidate"],
    authorization: { commit: false, push: false, deploy: false, remoteChanges: false },
  };
  runDrill(manifest, patches);
  for (const [name, bytes] of Object.entries(patches)) writeFileSync(artifacts[name], bytes);
  writeFileSync(artifacts.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write("Generated and replayed the Section 22 current-candidate rollback.\n");
}

function readEvidence() {
  const manifestText = readFileSync(artifacts.manifest, "utf8");
  assert.doesNotMatch(manifestText, /[A-Za-z]:[\\/]/u);
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.schemaVersion, "section22-current-candidate-rollback/v1");
  assert.equal(manifest.candidateId, candidateId);
  assert.deepEqual(manifest.phases, [
    "forward-current-candidate",
    "reverse-current-head-pair",
    "forward-restore-current-candidate",
  ]);
  assert.deepEqual(manifest.authorization, { commit: false, push: false, deploy: false, remoteChanges: false });
  const patches = {};
  for (const name of ["workerForward", "workerReverse", "pagesForward", "pagesReverse"]) {
    const bytes = readFileSync(artifacts[name]);
    assert.equal(manifest.patches[name].path, slash(relative(workerRoot, artifacts[name])));
    assert.equal(manifest.patches[name].bytes, bytes.byteLength);
    assert.equal(manifest.patches[name].sha256, sha256(bytes));
    assert.ok(bytes.byteLength > 0);
    patches[name] = bytes;
  }
  return { manifest, patches };
}

function verifyWorkingCandidate(root, repository, matcher) {
  const paths = candidatePaths(root, repository.baseCommit, matcher);
  assert.deepEqual(paths, repository.entries.map((entry) => entry.path));
  const index = parseIndex(root);
  for (const entry of repository.entries) {
    if (!entry.candidate) {
      assert.equal(existsSync(checkedPath(root, entry.path)), false, `candidate must omit ${entry.path}`);
      continue;
    }
    assert.equal(existsSync(checkedPath(root, entry.path)), true, `candidate must contain ${entry.path}`);
    const oid = text(git(root, ["hash-object", `--path=${entry.path}`, entry.path])).trim();
    assert.equal(oid, entry.candidate.blobOid, `working candidate ${entry.path}`);
    assert.equal(index.get(entry.path)?.mode ?? "100644", entry.candidate.mode, `working mode ${entry.path}`);
  }
}

if (process.argv.includes("--generate")) {
  generate();
} else {
  test("Section 22 current release sources reverse to the paired HEAD baseline and restore exactly", { timeout: 120_000 }, () => {
    const { manifest, patches } = readEvidence();
    verifyWorkingCandidate(workerRoot, manifest.repositories.worker, workerScope);
    verifyWorkingCandidate(pagesRoot, manifest.repositories.pages, pagesScope);
    runDrill(manifest, patches);
  });
}
