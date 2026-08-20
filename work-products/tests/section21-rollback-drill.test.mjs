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
const evidenceRoot = join(workerRoot, "work-products", "evidence", "section21");
const workRoot = join(pagesRoot, "work-products", "tests", "work");

const DRILL_BASE = {
  worker: "0a4c697cdb37692b31d313a231b6f8eaae54dfa3",
  pages: "9e084f486953850f8de3d23bcd63cc2b71336b64",
};

const PRODUCTION_ROLLBACK = {
  evidence: "work-products/ship/worker-1.1.4-pages-0.2.1-production-2026-08-15.md",
  frozenAt: "2026-08-15",
  liveReverifiedInT14: false,
  worker: {
    sourceCommit: "86083e4a021ef26b40fa1e476c929ee203e0e3a4",
    deploymentId: "91716c0c-bb10-49e5-a077-56294a5d084b",
  },
  pages: {
    mainCommit: "9e084f486953850f8de3d23bcd63cc2b71336b64",
    ghPagesCommit: "af2969c9a02bd36dca9af0250822e6814490b4f6",
    manifestSha256: "4ce18dfefce655d51ec89fb6bb873f7f8f8308cc11c06abb1396f0cad8813086",
  },
};

const WORKER_INCLUDE = ["README.md", "CHANGELOG.md", "_worker.js", "package.json", "package-lock.json"];
const PAGES_INCLUDE = [
  ".github/workflows/pages.yml",
  "app/**",
  "components/**",
  "lib/**",
  "public/**",
  "scripts/**",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "playwright.config.ts",
];
const SCOPE_EXCLUSIONS = [
  "work-products/evidence/**",
  "work-products/plan.md",
  "work-products/todo.md",
  "work-products/SPEC.md",
  "work-products/debug/**",
  "work-products/tests/fixtures/ui-review/section21-candidate/**",
  ".next/**",
  "node_modules/**",
  "out/**",
  "release/**",
];

const ARTIFACTS = {
  pair: join(evidenceRoot, "pair-rollback.json"),
  runbook: join(evidenceRoot, "release-runbook.md"),
  workerReverse: join(evidenceRoot, "worker-v1.reverse.patch"),
  pagesReverse: join(evidenceRoot, "pages-v1.reverse.patch"),
  workerForward: join(evidenceRoot, "worker-v2.forward.patch"),
  pagesForward: join(evidenceRoot, "pages-v2.forward.patch"),
};

const EXPECTED_IDENTITIES = {
  v1: {
    workerVersion: "1.1.4",
    workerApiContract: 1,
    pagesVersion: "0.2.1",
    pagesApiContract: 1,
    workerRange: ">=1.0.0 <2.0.0",
  },
  v2: {
    workerVersion: "2.0.0",
    workerApiContract: 2,
    pagesVersion: "0.3.0",
    pagesApiContract: 2,
    workerRange: ">=2.0.0 <3.0.0",
  },
};

function slash(path) {
  return path.replaceAll("\\", "/");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function outputText(value) {
  return Buffer.isBuffer(value) ? value.toString("utf8") : String(value ?? "");
}

function run(file, args, options = {}) {
  const result = spawnSync(file, args, {
    cwd: options.cwd,
    input: options.input,
    encoding: options.buffer ? undefined : "utf8",
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const detail = [outputText(result.stdout), outputText(result.stderr)].filter(Boolean).join("\n").trim();
    throw new Error(
      file + " " + args.join(" ") + " failed"
        + (result.status === null ? "" : " (" + result.status + ")")
        + (result.error ? ": " + result.error.message : "")
        + (detail ? "\n" + detail : ""),
    );
  }
  return result.stdout ?? (options.buffer ? Buffer.alloc(0) : "");
}

function git(root, args, options = {}) {
  return run("git", ["-c", "core.longpaths=true", "-C", root, ...args], options);
}

function parseNul(value) {
  return outputText(value).split("\0").filter(Boolean);
}

function checkedRepoPath(root, path) {
  const normalized = slash(path);
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error("Unsafe repository path: " + path);
  }
  const target = resolve(root, ...normalized.split("/"));
  if (!target.startsWith(resolve(root) + sep)) throw new Error("Path escaped repository: " + path);
  return target;
}

function workerScope(path) {
  return WORKER_INCLUDE.includes(slash(path));
}

function pagesScope(path) {
  const normalized = slash(path);
  return PAGES_INCLUDE.filter((item) => !item.endsWith("/**")).includes(normalized)
    || ["app/", "components/", "lib/", "public/", "scripts/"].some((prefix) => normalized.startsWith(prefix));
}

function safeRemove(path) {
  const target = resolve(path);
  const boundary = resolve(workRoot) + sep;
  if (!target.startsWith(boundary) || target === resolve(workRoot)) {
    throw new Error("Refusing to remove non-drill path: " + target);
  }
  rmSync(target, { force: true, recursive: true });
}

function prepareClone(source, target, commit, autoCrlf) {
  mkdirSync(dirname(target), { recursive: true });
  run(
    "git",
    ["-c", "core.longpaths=true", "clone", "--local", "--no-hardlinks", "--no-checkout", source, target],
    { cwd: workRoot },
  );
  git(target, ["config", "core.longpaths", "true"]);
  git(target, ["config", "core.autocrlf", autoCrlf ? "true" : "false"]);
  git(target, ["checkout", "--detach", commit]);
}

function parseIndex(root) {
  const records = parseNul(git(root, ["ls-files", "--stage", "-z"], { buffer: true }));
  const result = new Map();
  for (const record of records) {
    const match = /^(\d+) ([0-9a-f]+) (\d)\t([\s\S]+)$/.exec(record);
    if (!match || match[3] !== "0") throw new Error("Unexpected index record: " + record);
    result.set(slash(match[4]), { mode: match[1], blobOid: match[2] });
  }
  return result;
}

function parseTree(root, revision) {
  const records = parseNul(git(root, ["ls-tree", "-r", "-z", revision], { buffer: true }));
  const result = new Map();
  for (const record of records) {
    const match = /^(\d+) blob ([0-9a-f]+)\t([\s\S]+)$/.exec(record);
    if (match) result.set(slash(match[3]), { mode: match[1], blobOid: match[2] });
  }
  return result;
}

function blobState(root, entry, cache) {
  if (!entry) return null;
  let cached = cache.get(entry.blobOid);
  if (!cached) {
    const bytes = git(root, ["cat-file", "blob", entry.blobOid], { buffer: true });
    cached = { sha256: sha256(bytes), bytes: bytes.byteLength };
    cache.set(entry.blobOid, cached);
  }
  return { sha256: cached.sha256, blobOid: entry.blobOid, mode: entry.mode, bytes: cached.bytes };
}

function scopeManifestSha(paths, side) {
  return sha256(Buffer.from(JSON.stringify(paths.map((entry) => ({ path: entry.path, state: entry[side] })))));
}

function candidateScopePaths(sourceRoot, base, matcher) {
  const basePaths = parseNul(git(sourceRoot, ["ls-tree", "-r", "--name-only", "-z", base], { buffer: true }));
  const candidatePaths = parseNul(
    git(sourceRoot, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { buffer: true }),
  );
  return [...new Set([...basePaths, ...candidatePaths].map(slash).filter(matcher))].sort();
}

function stageCandidate(sourceRoot, stageRoot, base, matcher) {
  const paths = candidateScopePaths(sourceRoot, base, matcher);
  const sourceIndex = parseIndex(sourceRoot);
  for (const path of paths) {
    const source = checkedRepoPath(sourceRoot, path);
    const target = checkedRepoPath(stageRoot, path);
    if (!existsSync(source)) {
      rmSync(target, { force: true });
      continue;
    }
    const stat = lstatSync(source);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Unsupported release-source entry: " + path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  git(stageRoot, ["add", "-A"]);

  let stagedIndex = parseIndex(stageRoot);
  for (const path of paths) {
    if (!existsSync(checkedRepoPath(sourceRoot, path))) continue;
    const desired = sourceIndex.get(path)?.mode ?? "100644";
    if (!["100644", "100755"].includes(desired)) throw new Error("Unsupported Git mode: " + desired + " " + path);
    const staged = stagedIndex.get(path);
    if (staged && staged.mode !== desired) {
      git(stageRoot, ["update-index", desired === "100755" ? "--chmod=+x" : "--chmod=-x", "--", path]);
    }
  }
  stagedIndex = parseIndex(stageRoot);

  const changedPaths = parseNul(
    git(stageRoot, ["diff", "--cached", "--name-only", "-z", "HEAD"], { buffer: true }),
  ).map(slash);
  if (changedPaths.length === 0) throw new Error("Rollback scope has no candidate changes.");
  for (const path of changedPaths) {
    if (!matcher(path)) throw new Error("Staged path escaped rollback scope: " + path);
  }

  const tree = parseTree(stageRoot, base);
  const cache = new Map();
  const manifestPaths = paths.map((path) => ({
    path,
    v1: blobState(stageRoot, tree.get(path), cache),
    v2: blobState(stageRoot, stagedIndex.get(path), cache),
  }));
  const forward = git(
    stageRoot,
    ["diff", "--cached", "--binary", "--full-index", "--no-ext-diff", "HEAD"],
    { buffer: true },
  );
  const reverse = git(
    stageRoot,
    ["diff", "--cached", "--binary", "--full-index", "--no-ext-diff", "-R", "HEAD"],
    { buffer: true },
  );
  if (forward.byteLength === 0 || reverse.byteLength === 0) throw new Error("Generated patch is empty.");

  return {
    changedPaths,
    paths: manifestPaths,
    manifests: {
      v1: scopeManifestSha(manifestPaths, "v1"),
      v2: scopeManifestSha(manifestPaths, "v2"),
    },
    forward,
    reverse,
  };
}

function generateRepository(sourceRoot, base, matcher, name, generationRoot) {
  const stageRoot = join(generationRoot, name);
  prepareClone(sourceRoot, stageRoot, base, true);
  return stageCandidate(sourceRoot, stageRoot, base, matcher);
}

function verifyManifest(root, repository, side, matcher) {
  const actual = parseIndex(root);
  const expectedPaths = repository.paths.filter((entry) => entry[side] !== null).map((entry) => entry.path);
  const actualPaths = [...actual.keys()].filter(matcher).sort();
  assert.deepEqual(actualPaths, expectedPaths, side + " rollback scope path set");

  const cache = new Map();
  for (const entry of repository.paths) {
    const expected = entry[side];
    const indexed = actual.get(entry.path);
    if (expected === null) {
      assert.equal(indexed, undefined, side + " should not contain " + entry.path);
      assert.equal(existsSync(checkedRepoPath(root, entry.path)), false, side + " worktree should omit " + entry.path);
      continue;
    }
    assert.ok(indexed, side + " is missing " + entry.path);
    const state = blobState(root, indexed, cache);
    assert.deepEqual(state, expected, side + " canonical state " + entry.path);
  }
  assert.equal(scopeManifestSha(repository.paths, side), repository.manifests[side]);
  git(root, ["diff", "--exit-code"]);
}

function applyPatch(root, patch, check) {
  const mode = check ? ["--check", "--index"] : ["--index"];
  git(root, ["apply", ...mode, "--binary", "-"], { input: patch, buffer: true });
}

function applyPaired(clones, patches, direction) {
  const selected = direction === "forward"
    ? [{ root: clones.worker, patch: patches.workerForward }, { root: clones.pages, patch: patches.pagesForward }]
    : [{ root: clones.worker, patch: patches.workerReverse }, { root: clones.pages, patch: patches.pagesReverse }];
  for (const item of selected) applyPatch(item.root, item.patch, true);
  for (const item of selected) applyPatch(item.root, item.patch, false);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function verifyIdentity(clones, expected) {
  const workerPackage = readJson(join(clones.worker, "package.json"));
  const workerLock = readJson(join(clones.worker, "package-lock.json"));
  const workerSource = readFileSync(join(clones.worker, "_worker.js"), "utf8");
  assert.equal(workerPackage.version, expected.workerVersion);
  assert.equal(workerLock.version, expected.workerVersion);
  assert.equal(workerLock.packages[""].version, expected.workerVersion);
  assert.equal(
    /const WORKER_VERSION = ['"]([^'"]+)['"]/.exec(workerSource)?.[1],
    expected.workerVersion,
  );
  assert.equal(
    Number(/const API_CONTRACT_VERSION = ['"](\d+)['"]/.exec(workerSource)?.[1]),
    expected.workerApiContract,
  );

  const pagesPackage = readJson(join(clones.pages, "package.json"));
  const pagesLock = readJson(join(clones.pages, "package-lock.json"));
  const nextConfig = readFileSync(join(clones.pages, "next.config.ts"), "utf8");
  const buildRelease = readFileSync(join(clones.pages, "scripts", "build-release.mjs"), "utf8");
  assert.equal(pagesPackage.version, expected.pagesVersion);
  assert.equal(pagesLock.version, expected.pagesVersion);
  assert.equal(pagesLock.packages[""].version, expected.pagesVersion);
  assert.match(nextConfig, new RegExp("uxuv-pages-" + expected.pagesVersion.replaceAll(".", "\\.")));
  assert.ok(buildRelease.includes("apiContract: " + expected.pagesApiContract));
  assert.ok(buildRelease.includes('workerRange: "' + expected.workerRange + '"'));
}

function runV1Contracts(clones) {
  run(process.execPath, ["--check", "_worker.js"], { cwd: clones.worker });
  run(process.execPath, [
    "--test",
    "work-products/tests/pages-integrity.test.mjs",
    "work-products/tests/sync-cas.test.mjs",
    "work-products/tests/source-import-route.test.mjs",
    "work-products/tests/auth-d1.test.mjs",
    "work-products/tests/security-boundary.test.mjs",
  ], { cwd: clones.worker });
  run(process.execPath, [
    "--test",
    "work-products/tests/runtime-config-contract.test.mjs",
    "work-products/tests/sync-client.test.mjs",
    "work-products/tests/sync-foundation.test.mjs",
    "work-products/tests/source-import-contract.test.mjs",
    "work-products/tests/release-manifest.test.mjs",
    "work-products/tests/data-settings-contract.test.mjs",
    "work-products/tests/auth-ui-contract.test.mjs",
    "work-products/tests/same-origin-boundary.test.mjs",
  ], { cwd: clones.pages });
}

function runV1Compatibility(clones) {
  const esbuild = join(pagesRoot, "node_modules", "esbuild", "bin", "esbuild");
  assert.equal(existsSync(esbuild), true, "the repository-local esbuild runtime is required");
  const fixtureRoot = join(clones.pages, "work-products", "tests", "work", "section21-v1-compat");
  const entry = join(fixtureRoot, "fixture.ts");
  const bundle = join(fixtureRoot, "fixture.mjs");
  mkdirSync(fixtureRoot, { recursive: true });
  const source = [
    'import assert from "node:assert/strict";',
    'import { previewSettingsImport } from "../../../../lib/data/settings-transfer";',
    'import { createLocalDocument, isRemoteDocument, mergePayload, updateConfigField } from "../../../../lib/sync/document-merge";',
    "const now = 1735689600000;",
    'const rules = { "standard:fixture:video": { introSeconds: 12, outroSeconds: 24, updatedAt: now } };',
    'const config = { fields: { videoSkipRules: { value: rules, updatedAt: now } }, sources: [], subscriptions: [], tombstones: [] };',
    'const envelope = { schemaVersion: 2, product: "UXUVideo", mode: "all", exportedAt: new Date(now).toISOString(),',
    "  included: { searchHistory: false, watchHistory: false }, config,",
    "  library: { history: [], favorites: [], tombstones: [] }, preferences: { standard: {}, premium: {} } };",
    "const preview = previewSettingsImport(JSON.stringify(envelope));",
    "assert.deepEqual(preview.envelope.config.fields.videoSkipRules.value, rules);",
    'const local = updateConfigField(createLocalDocument("config"), "videoSkipRules", rules, now);',
    "assert.deepEqual(local.payload.fields.videoSkipRules.value, rules);",
    'const merged = mergePayload("config", createLocalDocument("config").payload, local.payload, now);',
    "assert.deepEqual(merged.fields.videoSkipRules.value, rules);",
    'const remote = { kind: "config", version: 1, updatedAt: now, payload: merged };',
    'assert.equal(isRemoteDocument(remote, "config"), true);',
    "assert.deepEqual(remote.payload.fields.videoSkipRules.value, rules);",
    'process.stdout.write("VIDEO_SKIP_RULES_V1_PRESERVED");',
    "",
  ].join("\n");
  writeFileSync(entry, source);
  run(process.execPath, [
    esbuild,
    entry,
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--tsconfig=tsconfig.json",
    "--log-level=warning",
    "--outfile=" + bundle,
  ], { cwd: clones.pages });
  const output = run(process.execPath, [bundle], { cwd: clones.pages });
  assert.match(output, /VIDEO_SKIP_RULES_V1_PRESERVED/);
}

function runDrill(repositories, patches) {
  mkdirSync(workRoot, { recursive: true });
  const drillRoot = join(workRoot, "section21-rb-" + process.pid + "-" + randomUUID());
  const clones = {
    worker: join(drillRoot, "UXUVideo"),
    pages: join(drillRoot, "UXUV-Pages"),
  };
  try {
    prepareClone(workerRoot, clones.worker, DRILL_BASE.worker, false);
    prepareClone(pagesRoot, clones.pages, DRILL_BASE.pages, false);

    applyPaired(clones, patches, "forward");
    verifyManifest(clones.worker, repositories.worker, "v2", workerScope);
    verifyManifest(clones.pages, repositories.pages, "v2", pagesScope);
    verifyIdentity(clones, EXPECTED_IDENTITIES.v2);

    applyPaired(clones, patches, "reverse");
    verifyManifest(clones.worker, repositories.worker, "v1", workerScope);
    verifyManifest(clones.pages, repositories.pages, "v1", pagesScope);
    verifyIdentity(clones, EXPECTED_IDENTITIES.v1);
    runV1Contracts(clones);
    runV1Compatibility(clones);

    applyPaired(clones, patches, "forward");
    verifyManifest(clones.worker, repositories.worker, "v2", workerScope);
    verifyManifest(clones.pages, repositories.pages, "v2", pagesScope);
    verifyIdentity(clones, EXPECTED_IDENTITIES.v2);

    return {
      phases: [
        { name: "bootstrap-v2", status: "passed", verification: "paired apply checks, scope manifests, identity" },
        { name: "reverse-v1", status: "passed", verification: "paired apply checks, scope manifests, v1 contracts, videoSkipRules preservation" },
        { name: "forward-restore-v2", status: "passed", verification: "paired apply checks, scope manifests, identity" },
      ],
      compatibility: {
        field: "videoSkipRules",
        status: "passed",
        behavior: "v1 import, timestamped config merge, and remote validation preserve the unknown v2 field",
      },
    };
  } finally {
    if (existsSync(drillRoot)) safeRemove(drillRoot);
  }
}

function patchMetadata(path, bytes, direction, repository) {
  return {
    path: slash(relative(workerRoot, path)),
    repository,
    direction,
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
  };
}

function generateArtifacts() {
  mkdirSync(workRoot, { recursive: true });
  mkdirSync(evidenceRoot, { recursive: true });
  const generationRoot = join(workRoot, "section21-rb-generate-" + process.pid + "-" + randomUUID());
  let worker;
  let pages;
  try {
    worker = generateRepository(workerRoot, DRILL_BASE.worker, workerScope, "UXUVideo", generationRoot);
    pages = generateRepository(pagesRoot, DRILL_BASE.pages, pagesScope, "UXUV-Pages", generationRoot);
  } finally {
    if (existsSync(generationRoot)) safeRemove(generationRoot);
  }

  const patches = {
    workerReverse: worker.reverse,
    pagesReverse: pages.reverse,
    workerForward: worker.forward,
    pagesForward: pages.forward,
  };
  const repositories = {
    worker: {
      baseCommit: DRILL_BASE.worker,
      pathCount: worker.paths.length,
      changedPathCount: worker.changedPaths.length,
      changedPaths: worker.changedPaths,
      manifests: worker.manifests,
      paths: worker.paths,
    },
    pages: {
      baseCommit: DRILL_BASE.pages,
      pathCount: pages.paths.length,
      changedPathCount: pages.changedPaths.length,
      changedPaths: pages.changedPaths,
      manifests: pages.manifests,
      paths: pages.paths,
    },
  };
  const drill = runDrill(repositories, patches);

  writeFileSync(ARTIFACTS.workerReverse, patches.workerReverse);
  writeFileSync(ARTIFACTS.pagesReverse, patches.pagesReverse);
  writeFileSync(ARTIFACTS.workerForward, patches.workerForward);
  writeFileSync(ARTIFACTS.pagesForward, patches.pagesForward);

  const pair = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    hashMode: "git-index-blob-sha256",
    drillBase: {
      worker: { commit: DRILL_BASE.worker, role: "local committed patch base" },
      pages: { commit: DRILL_BASE.pages, role: "local committed patch base" },
    },
    productionRollback: PRODUCTION_ROLLBACK,
    scope: {
      worker: { include: WORKER_INCLUDE, kind: "release source only" },
      pages: { include: PAGES_INCLUDE, kind: "release source only" },
      exclusions: SCOPE_EXCLUSIONS,
    },
    identities: EXPECTED_IDENTITIES,
    patches: {
      workerReverse: patchMetadata(ARTIFACTS.workerReverse, patches.workerReverse, "v2-to-v1", "worker"),
      pagesReverse: patchMetadata(ARTIFACTS.pagesReverse, patches.pagesReverse, "v2-to-v1", "pages"),
      workerForward: patchMetadata(ARTIFACTS.workerForward, patches.workerForward, "v1-to-v2", "worker"),
      pagesForward: patchMetadata(ARTIFACTS.pagesForward, patches.pagesForward, "v1-to-v2", "pages"),
    },
    repositories,
    phases: drill.phases,
    compatibility: drill.compatibility,
    authorization: { commit: false, push: false, deploy: false, remoteChanges: false },
  };
  writeFileSync(ARTIFACTS.pair, JSON.stringify(pair, null, 2) + "\n");
  process.stdout.write("Generated and replayed Section 21 paired rollback evidence.\n");
}

function readValidatedEvidence() {
  for (const path of Object.values(ARTIFACTS)) assert.equal(existsSync(path), true, "missing " + slash(relative(workerRoot, path)));
  const text = readFileSync(ARTIFACTS.pair, "utf8");
  assert.doesNotMatch(text, /[A-Za-z]:[\\/]/, "pair evidence must not contain a machine path");
  const pair = JSON.parse(text);
  assert.equal(pair.schemaVersion, 1);
  assert.equal(pair.hashMode, "git-index-blob-sha256");
  assert.equal(pair.drillBase.worker.commit, DRILL_BASE.worker);
  assert.equal(pair.drillBase.pages.commit, DRILL_BASE.pages);
  assert.deepEqual(pair.productionRollback, PRODUCTION_ROLLBACK);
  assert.notEqual(pair.drillBase.worker.commit, pair.productionRollback.worker.sourceCommit);
  assert.deepEqual(pair.scope.worker.include, WORKER_INCLUDE);
  assert.deepEqual(pair.scope.pages.include, PAGES_INCLUDE);
  assert.ok(PAGES_INCLUDE.includes("public/**"), "Pages rollback scope must include public release sources");
  assert.deepEqual(pair.scope.exclusions, SCOPE_EXCLUSIONS);
  assert.deepEqual(pair.identities, EXPECTED_IDENTITIES);
  assert.deepEqual(pair.authorization, { commit: false, push: false, deploy: false, remoteChanges: false });

  const patchNames = ["workerReverse", "pagesReverse", "workerForward", "pagesForward"];
  const patches = {};
  for (const name of patchNames) {
    const bytes = readFileSync(ARTIFACTS[name]);
    assert.equal(pair.patches[name].path, slash(relative(workerRoot, ARTIFACTS[name])));
    assert.equal(pair.patches[name].sha256, sha256(bytes));
    assert.equal(pair.patches[name].bytes, bytes.byteLength);
    assert.ok(bytes.byteLength > 0);
    patches[name] = bytes;
  }
  for (const [name, repository, matcher] of [
    ["worker", pair.repositories.worker, workerScope],
    ["pages", pair.repositories.pages, pagesScope],
  ]) {
    assert.equal(repository.baseCommit, DRILL_BASE[name]);
    assert.equal(repository.pathCount, repository.paths.length);
    assert.equal(repository.changedPathCount, repository.changedPaths.length);
    assert.deepEqual(repository.paths.map((entry) => entry.path), [...repository.paths.map((entry) => entry.path)].sort());
    assert.equal(new Set(repository.paths.map((entry) => entry.path)).size, repository.pathCount);
    assert.ok(repository.paths.every((entry) => matcher(entry.path)));
    assert.ok(repository.changedPaths.every(matcher));
    assert.equal(repository.manifests.v1, scopeManifestSha(repository.paths, "v1"));
    assert.equal(repository.manifests.v2, scopeManifestSha(repository.paths, "v2"));
  }
  const githubPages = pair.repositories.pages.paths.find(({ path }) => path === "public/github-pages.html");
  assert.ok(githubPages?.v2, "Pages v2 rollback evidence must materialize public/github-pages.html");
  assert.equal(githubPages.v1, null, "Pages v1 must not retain public/github-pages.html");
  assert.deepEqual(pair.phases.map(({ name, status }) => ({ name, status })), [
    { name: "bootstrap-v2", status: "passed" },
    { name: "reverse-v1", status: "passed" },
    { name: "forward-restore-v2", status: "passed" },
  ]);
  assert.equal(pair.compatibility.field, "videoSkipRules");
  assert.equal(pair.compatibility.status, "passed");
  return { pair, patches };
}

if (process.argv.includes("--generate")) {
  generateArtifacts();
} else {
  test("S21-T14 paired rollback patches replay v2 to v1 and restore v2 in isolated repositories", { timeout: 600_000 }, () => {
    const { pair, patches } = readValidatedEvidence();
    const replay = runDrill(pair.repositories, patches);
    assert.deepEqual(replay.phases, pair.phases);
    assert.deepEqual(replay.compatibility, pair.compatibility);
  });
}
