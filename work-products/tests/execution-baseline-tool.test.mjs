import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  access,
  mkdir,
  readFile,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testsDirectory, '../..');
const cliRelativePath = 'work-products/scripts/execution-baseline.mjs';
const cliPath = resolve(repositoryRoot, cliRelativePath);
const workRelativePath = 'work-products/tests/work/execution-baseline-tool';
const workPath = resolve(repositoryRoot, workRelativePath);
const todoPath = 'work-products/todo.md';
const archivedExecutionBaselines = 'work-products/debug/execution-baselines';
const currentRollbackWork = 'work-products/debug/section22-current-candidate-rollback-work';
const stableRepositoryExcludes = [archivedExecutionBaselines, currentRollbackWork];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const posixJoin = (...parts) => parts.filter(Boolean).join('/');

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};

const commandEnvironment = (overrides = {}, absent = []) => {
  const environment = { ...process.env, ...overrides };
  for (const key of absent) delete environment[key];
  return environment;
};

const runCli = (args, options = {}) => spawnSync(
  process.execPath,
  [cliRelativePath, ...args],
  {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: commandEnvironment(options.env, options.absent),
  },
);

const expectSuccess = (result, label) => {
  assert.equal(
    result.status,
    0,
    `${label}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return JSON.parse(result.stdout);
};

const expectFailure = (result, label) => {
  assert.notEqual(result.status, 0, `${label} unexpectedly succeeded`);
  return `${result.stdout}\n${result.stderr}`;
};

const prepareCase = async (name) => {
  const relative = posixJoin(workRelativePath, name);
  const absolute = resolve(repositoryRoot, relative);
  await rm(absolute, { recursive: true, force: true });
  await mkdir(absolute, { recursive: true });
  return { relative, absolute };
};

const resource = (path, repository = 'worker') => ({ repository, path });

const requestFor = (caseRoot, overrides = {}) => {
  const attemptId = overrides.attempt_id ?? 'attempt-01';
  const attemptRoot = overrides.attempt_root ?? posixJoin(caseRoot.relative, attemptId);
  return {
    schema_version: 's22-execution-baseline-request/v2',
    task_id: overrides.task_id ?? 'S22-R09-TEST',
    attempt_id: attemptId,
    owner: overrides.owner ?? 'test:execution-baseline-tool',
    no_replace: true,
    attempt_root: attemptRoot,
    targets: overrides.targets ?? [],
    inputs: overrides.inputs ?? [],
    protected_inputs: overrides.protected_inputs ?? [],
    orchestration_outputs: overrides.orchestration_outputs ?? [],
    repositories: overrides.repositories ?? [{
      id: 'worker',
      root: '.',
      exclude: [...new Set([...stableRepositoryExcludes, caseRoot.relative, todoPath, attemptRoot])],
    }],
    toolchain: overrides.toolchain ?? {
      node_version: process.version,
      entrypoints: [],
    },
    environment: overrides.environment ?? [],
    generated_namespaces: overrides.generated_namespaces ?? [],
  };
};

const writeRequest = async (caseRoot, request, name = 'request.json') => {
  const relativePath = posixJoin(caseRoot.relative, name);
  const raw = `${JSON.stringify(request, null, 2)}\n`;
  await writeFile(resolve(repositoryRoot, relativePath), raw);
  return { relativePath, raw };
};

const createBaseline = async (caseRoot, request, options = {}) => {
  const requestFile = await writeRequest(caseRoot, request, options.requestName);
  const result = runCli(['create', '--request', requestFile.relativePath], options);
  const manifestRelativePath = posixJoin(request.attempt_root, 'manifest.json');
  return {
    ...requestFile,
    result,
    manifestRelativePath,
    manifestPath: resolve(repositoryRoot, manifestRelativePath),
  };
};

const verifyBaseline = (manifestRelativePath, phase, options = {}) => runCli(
  ['verify', '--manifest', manifestRelativePath, '--phase', phase],
  options,
);

const fingerprint = (requestRelativePath, set, options = {}) => runCli(
  ['fingerprint', '--request', requestRelativePath, '--set', set],
  options,
);

const findPath = (entries, path) => {
  const entry = entries.find((candidate) => candidate.path === path);
  assert.ok(entry, `missing manifest entry for ${path}`);
  return entry;
};

after(async () => {
  await rm(workPath, { recursive: true, force: true });
});

test('execution baseline CLI exists before the contract suite runs', async () => {
  const metadata = await stat(cliPath);
  assert.equal(metadata.isFile(), true);
});

test('create snapshots file/directory/missing targets and records immutable declarations', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('capture');
  const targetFile = posixJoin(caseRoot.relative, 'target-file.txt');
  const targetDirectory = posixJoin(caseRoot.relative, 'target-directory');
  const targetNestedFile = posixJoin(targetDirectory, 'nested/data.bin');
  const targetEmptyDirectory = posixJoin(targetDirectory, 'empty');
  const missingTarget = posixJoin(caseRoot.relative, 'missing-target.txt');
  const inputDirectory = posixJoin(caseRoot.relative, 'input-directory');
  const inputFile = posixJoin(inputDirectory, 'input.txt');
  const protectedFile = posixJoin(caseRoot.relative, 'protected.txt');
  const generatedParent = posixJoin(caseRoot.relative, 'generated');
  const orchestrationReceipt = posixJoin(caseRoot.relative, 'receipt.json');

  await mkdir(resolve(repositoryRoot, dirname(targetNestedFile)), { recursive: true });
  await mkdir(resolve(repositoryRoot, targetEmptyDirectory), { recursive: true });
  await mkdir(resolve(repositoryRoot, inputDirectory), { recursive: true });
  await mkdir(resolve(repositoryRoot, generatedParent), { recursive: true });
  await writeFile(resolve(repositoryRoot, targetFile), 'target bytes\n');
  await writeFile(resolve(repositoryRoot, targetNestedFile), Buffer.from([0, 1, 2, 255]));
  await writeFile(resolve(repositoryRoot, inputFile), 'immutable input\n');
  await writeFile(resolve(repositoryRoot, protectedFile), 'protected input\n');

  const request = requestFor(caseRoot, {
    targets: [resource(targetFile), resource(targetDirectory), resource(missingTarget)],
    inputs: [resource(inputDirectory)],
    protected_inputs: [resource(protectedFile)],
    orchestration_outputs: [resource(orchestrationReceipt)],
    toolchain: {
      node_version: process.version,
      entrypoints: [resource(cliRelativePath)],
    },
    environment: [
      { key: 'S22_R09_FIXED', state: 'present', sensitive: false, value: 'fixed-value' },
      { key: 'S22_R09_SENSITIVE', state: 'present', sensitive: true, sha256: sha256('secret-value') },
      { key: 'S22_R09_ABSENT', state: 'absent', sensitive: false },
    ],
    generated_namespaces: [{
      repository: 'worker',
      parent: generatedParent,
      prefix: 'run-',
      initial: 'none',
      terminal: 'none',
    }],
  });
  const options = {
    env: { S22_R09_FIXED: 'fixed-value', S22_R09_SENSITIVE: 'secret-value' },
    absent: ['S22_R09_ABSENT'],
  };
  const created = await createBaseline(caseRoot, request, options);
  const createOutput = expectSuccess(created.result, 'create baseline');
  assert.equal(createOutput.schema_version, 's22-create-result/v1');
  assert.equal(createOutput.manifest, created.manifestRelativePath);

  const manifestRaw = await readFile(created.manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  assert.equal(manifest.schema_version, 's22-execution-baseline/v2');
  assert.equal(manifest.task_id, request.task_id);
  assert.equal(manifest.attempt_id, request.attempt_id);
  assert.equal(manifest.owner, request.owner);
  assert.equal(manifest.no_replace, true);
  assert.equal(manifest.request_sha256, sha256(created.raw));
  assert.deepEqual(
    Object.keys(manifest).filter((key) => [
      'task_id',
      'attempt_id',
      'owner',
      'no_replace',
      'request_sha256',
      'targets',
      'snapshots',
      'inputs',
      'protected_inputs',
      'orchestration_outputs',
      'repositories',
      'toolchain',
      'environment',
      'generated_namespaces',
    ].includes(key)).sort(),
    [
      'environment',
      'inputs',
      'no_replace',
      'owner',
      'orchestration_outputs',
      'protected_inputs',
      'repositories',
      'request_sha256',
      'snapshots',
      'targets',
      'task_id',
      'toolchain',
      'generated_namespaces',
      'attempt_id',
    ].sort(),
  );

  assert.equal(findPath(manifest.targets, targetFile).identity.type, 'file');
  assert.equal(findPath(manifest.targets, targetDirectory).identity.type, 'directory');
  assert.equal(findPath(manifest.targets, missingTarget).identity.state, 'missing');
  assert.deepEqual(
    findPath(manifest.targets, targetDirectory).identity.descendants.map((entry) => [entry.path, entry.type]),
    [['empty', 'directory'], ['nested', 'directory'], ['nested/data.bin', 'file']],
  );
  assert.equal(findPath(manifest.inputs, inputDirectory).identity.descendants[0].path, 'input.txt');
  assert.equal(findPath(manifest.protected_inputs, protectedFile).identity.sha256, sha256('protected input\n'));
  assert.deepEqual(manifest.orchestration_outputs, [resource(orchestrationReceipt)]);
  assert.equal(manifest.toolchain.node_version, process.version);
  assert.deepEqual(
    manifest.environment.map((entry) => entry.key).sort(),
    ['S22_R09_ABSENT', 'S22_R09_FIXED', 'S22_R09_SENSITIVE'],
  );
  assert.equal(manifest.environment.find((entry) => entry.key === 'S22_R09_SENSITIVE').sha256, sha256('secret-value'));
  assert.equal(created.raw.includes('secret-value'), false);
  assert.equal(created.raw.includes(repositoryRoot), false);
  assert.equal(manifestRaw.includes('secret-value'), false);
  assert.equal(manifestRaw.includes(repositoryRoot), false);
  assert.equal(manifest.generated_namespaces[0].initial_matches.length, 0);

  const fileSnapshot = findPath(manifest.snapshots, targetFile);
  const directorySnapshot = findPath(manifest.snapshots, targetDirectory);
  assert.equal(
    await readFile(resolve(repositoryRoot, fileSnapshot.snapshot_path), 'utf8'),
    'target bytes\n',
  );
  assert.deepEqual(
    await readFile(resolve(repositoryRoot, directorySnapshot.descendants.find((entry) => entry.path === 'nested/data.bin').snapshot_path)),
    Buffer.from([0, 1, 2, 255]),
  );
  assert.equal(await readFile(resolve(repositoryRoot, posixJoin(request.attempt_root, 'request.json')), 'utf8'), created.raw);

  const prewrite = expectSuccess(
    verifyBaseline(created.manifestRelativePath, 'prewrite', options),
    'verify prewrite',
  );
  assert.equal(prewrite.phase, 'prewrite');
  const firstFingerprint = expectSuccess(fingerprint(created.relativePath, 'targets', options), 'fingerprint targets');
  const secondFingerprint = expectSuccess(fingerprint(created.relativePath, 'targets', options), 'repeat target fingerprint');
  assert.deepEqual(secondFingerprint, firstFingerprint);

  const beforeSecondCreate = await readFile(created.manifestPath);
  expectFailure(runCli(['create', '--request', created.relativePath], options), 'second create');
  assert.deepEqual(await readFile(created.manifestPath), beforeSecondCreate);

  const requestCopyPath = resolve(repositoryRoot, request.attempt_root, 'request.json');
  const legacyRequest = JSON.parse(await readFile(requestCopyPath, 'utf8'));
  legacyRequest.schema_version = 's22-execution-baseline-request/v1';
  delete legacyRequest.orchestration_outputs;
  const legacyRequestRaw = `${JSON.stringify(legacyRequest, null, 2)}\n`;
  await writeFile(requestCopyPath, legacyRequestRaw);
  const legacyManifest = JSON.parse(manifestRaw);
  legacyManifest.schema_version = 's22-execution-baseline/v1';
  legacyManifest.request_sha256 = sha256(legacyRequestRaw);
  delete legacyManifest.orchestration_outputs;
  const legacyManifestRaw = `${JSON.stringify(legacyManifest, null, 2)}\n`;
  await writeFile(created.manifestPath, legacyManifestRaw);
  await writeFile(
    resolve(repositoryRoot, request.attempt_root, 'manifest.sha256'),
    `${sha256(legacyManifestRaw)}\n`,
  );
  expectSuccess(
    verifyBaseline(created.manifestRelativePath, 'prewrite', options),
    'verify legacy v1 manifest compatibility',
  );
});

test('verify detects target/input/protected/environment drift without exposing a sensitive value', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('drift');
  const target = posixJoin(caseRoot.relative, 'target.txt');
  const input = posixJoin(caseRoot.relative, 'input.txt');
  const protectedInput = posixJoin(caseRoot.relative, 'protected.txt');
  await writeFile(resolve(repositoryRoot, target), 'target-original');
  await writeFile(resolve(repositoryRoot, input), 'input-original');
  await writeFile(resolve(repositoryRoot, protectedInput), 'protected-original');

  const request = requestFor(caseRoot, {
    targets: [resource(target)],
    inputs: [resource(input)],
    protected_inputs: [resource(protectedInput)],
    environment: [
      { key: 'S22_R09_FIXED', state: 'present', sensitive: false, value: 'fixed-value' },
      { key: 'S22_R09_SENSITIVE', state: 'present', sensitive: true, sha256: sha256('private-token') },
      { key: 'S22_R09_ABSENT', state: 'absent', sensitive: false },
    ],
  });
  const stable = {
    env: { S22_R09_FIXED: 'fixed-value', S22_R09_SENSITIVE: 'private-token' },
    absent: ['S22_R09_ABSENT'],
  };
  const created = await createBaseline(caseRoot, request, stable);
  expectSuccess(created.result, 'create drift baseline');

  await writeFile(resolve(repositoryRoot, target), 'target-drifted');
  expectFailure(verifyBaseline(created.manifestRelativePath, 'prewrite', stable), 'target drift at prewrite');
  expectSuccess(verifyBaseline(created.manifestRelativePath, 'inputs', stable), 'inputs phase ignores mutable target');
  await writeFile(resolve(repositoryRoot, target), 'target-original');

  await writeFile(resolve(repositoryRoot, input), 'input-drifted');
  expectFailure(verifyBaseline(created.manifestRelativePath, 'inputs', stable), 'input drift');
  await writeFile(resolve(repositoryRoot, input), 'input-original');

  await writeFile(resolve(repositoryRoot, protectedInput), 'protected-drifted');
  expectFailure(verifyBaseline(created.manifestRelativePath, 'inputs', stable), 'protected input drift');
  await writeFile(resolve(repositoryRoot, protectedInput), 'protected-original');

  expectFailure(
    verifyBaseline(created.manifestRelativePath, 'inputs', {
      ...stable,
      env: { S22_R09_FIXED: 'changed-value', S22_R09_SENSITIVE: 'private-token' },
    }),
    'non-sensitive environment drift',
  );
  const secretFailure = expectFailure(
    verifyBaseline(created.manifestRelativePath, 'inputs', {
      ...stable,
      env: { S22_R09_FIXED: 'fixed-value', S22_R09_SENSITIVE: 'do-not-print-this-secret' },
    }),
    'sensitive environment drift',
  );
  assert.equal(secretFailure.includes('do-not-print-this-secret'), false);
  expectFailure(
    verifyBaseline(created.manifestRelativePath, 'inputs', {
      env: { S22_R09_FIXED: 'fixed-value', S22_R09_SENSITIVE: 'private-token', S22_R09_ABSENT: 'now-present' },
    }),
    'absent environment key becomes present',
  );
  const missingPresentFailure = expectFailure(
    verifyBaseline(created.manifestRelativePath, 'inputs', {
      env: { S22_R09_SENSITIVE: 'private-token' },
      absent: ['S22_R09_FIXED', 'S22_R09_ABSENT'],
    }),
    'declared-present environment key becomes absent',
  );
  assert.equal(missingPresentFailure.includes('private-token'), false);
  expectSuccess(verifyBaseline(created.manifestRelativePath, 'inputs', stable), 'restored immutable state');
});

test('verify audits manifest, request copy, snapshots, and snapshot path/type/byte sets', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('self-integrity');
  const target = posixJoin(caseRoot.relative, 'target.txt');
  await writeFile(resolve(repositoryRoot, target), 'snapshot-original');
  const request = requestFor(caseRoot, { targets: [resource(target)] });
  const created = await createBaseline(caseRoot, request);
  expectSuccess(created.result, 'create self-integrity baseline');
  const manifestRaw = await readFile(created.manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const snapshotPath = resolve(repositoryRoot, findPath(manifest.snapshots, target).snapshot_path);
  const snapshotRaw = await readFile(snapshotPath);

  await unlink(snapshotPath);
  expectFailure(verifyBaseline(created.manifestRelativePath, 'inputs'), 'missing snapshot');
  await writeFile(snapshotPath, snapshotRaw);
  expectSuccess(verifyBaseline(created.manifestRelativePath, 'inputs'), 'restored snapshot');

  await writeFile(snapshotPath, 'snapshot-corrupted');
  expectFailure(verifyBaseline(created.manifestRelativePath, 'inputs'), 'snapshot byte mismatch');
  await writeFile(snapshotPath, snapshotRaw);

  const extraSnapshot = resolve(dirname(snapshotPath), 'undeclared-extra');
  await writeFile(extraSnapshot, 'extra');
  expectFailure(verifyBaseline(created.manifestRelativePath, 'inputs'), 'snapshot set mismatch');
  await unlink(extraSnapshot);

  const requestCopy = resolve(repositoryRoot, posixJoin(request.attempt_root, 'request.json'));
  const requestCopyRaw = await readFile(requestCopy);
  await writeFile(requestCopy, `${created.raw} `);
  expectFailure(verifyBaseline(created.manifestRelativePath, 'inputs'), 'request copy drift');
  await writeFile(requestCopy, requestCopyRaw);

  const manifestSidecar = resolve(repositoryRoot, posixJoin(request.attempt_root, 'manifest.sha256'));
  assert.equal(await exists(manifestSidecar), true);
  await writeFile(created.manifestPath, manifestRaw.replace(request.owner, 'tampered-owner'));
  expectFailure(verifyBaseline(created.manifestRelativePath, 'inputs'), 'manifest drift');
  await writeFile(created.manifestPath, manifestRaw);
  expectSuccess(verifyBaseline(created.manifestRelativePath, 'inputs'), 'restored self-integrity');
});

test('create rejects a Worker repository inventory that captures the mutable todo ledger', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('mutable-todo-ledger');
  const request = requestFor(caseRoot, {
    repositories: [{
      id: 'worker',
      root: '.',
      exclude: [...stableRepositoryExcludes, posixJoin(caseRoot.relative, 'attempt-01')],
    }],
  });

  const created = await createBaseline(caseRoot, request);
  const output = expectFailure(created.result, 'mutable todo ledger inventory');
  assert.match(output, /worker repository exclusion must explicitly include work-products\/todo\.md/u);
  assert.equal(await exists(resolve(repositoryRoot, request.attempt_root)), false);
  assert.equal(await exists(resolve(repositoryRoot, `${request.attempt_root}.creating`)), false);
});

test('create rejects equal and bidirectionally overlapping todo paths on every v2 request surface', { concurrency: false }, async () => {
  const pathCases = [
    ['equal', todoPath],
    ['ancestor', 'work-products'],
    ['descendant', `${todoPath}/child`],
  ];
  const resourceSurfaces = [
    ['target', (path) => ({ targets: [resource(path)] })],
    ['input', (path) => ({ inputs: [resource(path)] })],
    ['protected-input', (path) => ({ protected_inputs: [resource(path)] })],
    ['orchestration-output', (path) => ({ orchestration_outputs: [resource(path)] })],
    ['toolchain-entrypoint', (path) => ({
      toolchain: { node_version: process.version, entrypoints: [resource(path)] },
    })],
  ];

  for (const [surface, overrideFor] of resourceSurfaces) {
    for (const [relation, path] of pathCases) {
      const caseRoot = await prepareCase(`todo-${surface}-${relation}`);
      const request = requestFor(caseRoot, overrideFor(path));
      const created = await createBaseline(caseRoot, request);
      const output = expectFailure(created.result, `todo ${surface} ${relation}`);
      assert.match(output, /work-products\/todo\.md must not overlap/u);
      assert.equal(await exists(resolve(repositoryRoot, request.attempt_root)), false);
      assert.equal(await exists(resolve(repositoryRoot, `${request.attempt_root}.creating`)), false);
    }
  }

  const namespaceCases = [
    ['ancestor-match', { parent: 'work-products', prefix: 'todo' }],
    ['equal-parent', { parent: todoPath, prefix: 'child-' }],
    ['descendant-parent', { parent: `${todoPath}/child`, prefix: 'run-' }],
  ];
  for (const [relation, declaration] of namespaceCases) {
    const caseRoot = await prepareCase(`todo-generated-${relation}`);
    const request = requestFor(caseRoot, {
      generated_namespaces: [{
        repository: 'worker',
        ...declaration,
        initial: 'none',
        terminal: 'none',
      }],
    });
    const created = await createBaseline(caseRoot, request);
    assert.match(expectFailure(created.result, `todo generated ${relation}`), /work-products\/todo\.md must not overlap/u);
    assert.equal(await exists(resolve(repositoryRoot, request.attempt_root)), false);
    assert.equal(await exists(resolve(repositoryRoot, `${request.attempt_root}.creating`)), false);
  }

  for (const [relation, attemptRoot] of pathCases) {
    const caseRoot = await prepareCase(`todo-attempt-${relation}`);
    const request = requestFor(caseRoot, { attempt_root: attemptRoot });
    const created = await createBaseline(caseRoot, request);
    assert.match(expectFailure(created.result, `todo attempt ${relation}`), /request\.attempt_root must not overlap/u);
    assert.equal(await exists(resolve(repositoryRoot, `${request.attempt_root}.creating`)), false);
  }
});

test('v2 fingerprint applies the shared todo-isolation invariant without attempt side effects', { concurrency: false }, async () => {
  const cases = [
    ['target-ancestor', { targets: [resource('work-products')] }],
    ['input-descendant', { inputs: [resource(`${todoPath}/child`)] }],
    ['protected-equal', { protected_inputs: [resource(todoPath)] }],
    ['orchestration-ancestor', { orchestration_outputs: [resource('work-products')] }],
    ['toolchain-descendant', {
      toolchain: { node_version: process.version, entrypoints: [resource(`${todoPath}/child`)] },
    }],
    ['generated-match', {
      generated_namespaces: [{
        repository: 'worker', parent: 'work-products', prefix: 'todo', initial: 'none', terminal: 'none',
      }],
    }],
  ];
  for (const [name, override] of cases) {
    const caseRoot = await prepareCase(`fingerprint-todo-${name}`);
    const request = requestFor(caseRoot, override);
    const requestFile = await writeRequest(caseRoot, request);
    const output = expectFailure(fingerprint(requestFile.relativePath, 'targets'), `fingerprint todo ${name}`);
    assert.match(output, /work-products\/todo\.md must not overlap/u);
    assert.equal(await exists(resolve(repositoryRoot, request.attempt_root)), false);
    assert.equal(await exists(resolve(repositoryRoot, `${request.attempt_root}.creating`)), false);
  }

  for (const [relation, attemptRoot] of [
    ['equal', todoPath],
    ['ancestor', 'work-products'],
    ['descendant', `${todoPath}/child`],
  ]) {
    const caseRoot = await prepareCase(`fingerprint-todo-attempt-${relation}`);
    const request = requestFor(caseRoot, { attempt_root: attemptRoot });
    const requestFile = await writeRequest(caseRoot, request);
    const output = expectFailure(fingerprint(requestFile.relativePath, 'targets'), `fingerprint todo attempt ${relation}`);
    assert.match(output, /request\.attempt_root must not overlap/u);
    assert.equal(await exists(resolve(repositoryRoot, `${request.attempt_root}.creating`)), false);
  }
});

test('v2 create and fingerprint reject broad todo exclusion masks', { concurrency: false }, async () => {
  for (const [relation, mask] of [['ancestor', 'work-products'], ['descendant', `${todoPath}/child`]]) {
    const caseRoot = await prepareCase(`todo-exclude-${relation}`);
    const attemptRoot = posixJoin(caseRoot.relative, 'attempt-01');
    const request = requestFor(caseRoot, {
      repositories: [{
        id: 'worker',
        root: '.',
        exclude: [...stableRepositoryExcludes, caseRoot.relative, todoPath, mask, attemptRoot],
      }],
    });
    const requestFile = await writeRequest(caseRoot, request);
    const fingerprintOutput = expectFailure(fingerprint(requestFile.relativePath, 'targets'), `fingerprint todo exclude ${relation}`);
    assert.match(fingerprintOutput, /worker repository exclusion must not overlap work-products\/todo\.md/u);
    const created = await createBaseline(caseRoot, request, { requestName: `create-${relation}.json` });
    assert.match(expectFailure(created.result, `create todo exclude ${relation}`), /worker repository exclusion must not overlap work-products\/todo\.md/u);
    assert.equal(await exists(resolve(repositoryRoot, request.attempt_root)), false);
    assert.equal(await exists(resolve(repositoryRoot, `${request.attempt_root}.creating`)), false);
  }
});

test('v2 verify revalidates todo isolation before using an internally consistent manifest', { concurrency: false }, async () => {
  const mutations = [
    ['orchestration', (request) => request.orchestration_outputs.push(resource(todoPath))],
    ['broad-exclude', (request) => request.repositories[0].exclude.push('work-products')],
    ['attempt-root', (request) => { request.attempt_root = `${todoPath}/child`; }],
  ];
  for (const [name, mutate] of mutations) {
    const caseRoot = await prepareCase(`verify-todo-${name}`);
    const request = requestFor(caseRoot);
    const created = await createBaseline(caseRoot, request);
    expectSuccess(created.result, `create verify todo ${name}`);

    const requestCopyPath = resolve(repositoryRoot, request.attempt_root, 'request.json');
    const requestCopy = JSON.parse(await readFile(requestCopyPath, 'utf8'));
    mutate(requestCopy);
    const requestRaw = `${JSON.stringify(requestCopy, null, 2)}\n`;
    await writeFile(requestCopyPath, requestRaw);
    const manifest = JSON.parse(await readFile(created.manifestPath, 'utf8'));
    manifest.request_sha256 = sha256(requestRaw);
    const manifestRaw = `${JSON.stringify(manifest, null, 2)}\n`;
    await writeFile(created.manifestPath, manifestRaw);
    const sidecarPath = resolve(repositoryRoot, request.attempt_root, 'manifest.sha256');
    await writeFile(sidecarPath, `${sha256(manifestRaw)}\n`);

    const before = await Promise.all([
      readFile(requestCopyPath),
      readFile(created.manifestPath),
      readFile(sidecarPath),
    ]);
    const output = expectFailure(verifyBaseline(created.manifestRelativePath, 'inputs'), `verify todo ${name}`);
    assert.match(output, /work-products\/todo\.md|request\.attempt_root/u);
    assert.deepEqual(await Promise.all([
      readFile(requestCopyPath),
      readFile(created.manifestPath),
      readFile(sidecarPath),
    ]), before);
    assert.equal(await exists(resolve(repositoryRoot, `${request.attempt_root}.creating`)), false);
  }
});

test('create requires the canonical Worker repository declaration', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('missing-worker-repository');
  const request = requestFor(caseRoot, { repositories: [] });
  const created = await createBaseline(caseRoot, request);
  const output = expectFailure(created.result, 'missing Worker repository declaration');
  assert.match(output, /create requires the canonical worker repository declaration/u);
  assert.equal(await exists(resolve(repositoryRoot, request.attempt_root)), false);
});

test('repository declarations reject aliases and glob-shaped exclusions', { concurrency: false }, async () => {
  const aliasCase = await prepareCase('repository-alias');
  const aliased = requestFor(aliasCase, {
    repositories: [{ id: 'mirror', root: '../UXUV-Pages', exclude: stableRepositoryExcludes }],
  });
  const aliasResult = await createBaseline(aliasCase, aliased);
  assert.match(expectFailure(aliasResult.result, 'repository alias'), /repository id mirror is unsupported/u);

  const globCase = await prepareCase('repository-glob');
  const withGlob = requestFor(globCase);
  withGlob.repositories[0].exclude.push('work-products/tests/work/section21-rb-*');
  const globResult = await createBaseline(globCase, withGlob);
  assert.match(expectFailure(globResult.result, 'glob exclusion'), /repository excludes must not contain glob syntax/u);
});

test('create requires every mutable resource to be covered by its repository exclusions', { concurrency: false }, async () => {
  for (const [name, field] of [['target', 'targets'], ['orchestration', 'orchestration_outputs']]) {
    const caseRoot = await prepareCase(`unexcluded-${name}`);
    const attemptRoot = posixJoin(caseRoot.relative, 'attempt-01');
    const request = requestFor(caseRoot, {
      [field]: [resource(posixJoin(caseRoot.relative, `${name}.json`))],
      repositories: [{
        id: 'worker',
        root: '.',
        exclude: [...stableRepositoryExcludes, 'work-products/todo.md', attemptRoot],
      }],
    });
    const created = await createBaseline(caseRoot, request);
    const output = expectFailure(created.result, `unexcluded ${name}`);
    assert.match(output, new RegExp(`${field}\\[0\\] is not covered by repository exclusions`, 'u'));
    assert.equal(await exists(resolve(repositoryRoot, request.attempt_root)), false);
  }
});

test('repository inventory records git-visible identities and rejects additions', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('repository');
  const request = requestFor(caseRoot, {
    repositories: [{
      id: 'worker',
      root: '.',
      exclude: [
        ...stableRepositoryExcludes,
        'work-products/todo.md',
        posixJoin(caseRoot.relative, 'attempt-01'),
      ],
    }],
  });
  const created = await createBaseline(caseRoot, request);
  expectSuccess(created.result, 'create repository baseline');
  const manifest = JSON.parse(await readFile(created.manifestPath, 'utf8'));
  assert.equal(manifest.repositories.length, 1);
  assert.equal(manifest.repositories[0].id, 'worker');
  assert.equal(manifest.repositories[0].root, '.');
  assert.match(manifest.repositories[0].head, /^[0-9a-f]{40}$/u);
  assert.match(manifest.repositories[0].inventory_sha256, /^[0-9a-f]{64}$/u);
  assert.ok(manifest.repositories[0].files.length > 0);
  assert.equal(manifest.repositories[0].files.some((entry) => entry.path === 'work-products/todo.md'), false);
  assert.equal(manifest.repositories[0].files.some((entry) => entry.path.includes('\\')), false);

  const driftFile = resolve(caseRoot.absolute, 'repo-drift.txt');
  await writeFile(driftFile, 'new untracked inventory file');
  expectFailure(verifyBaseline(created.manifestRelativePath, 'inputs'), 'repository inventory addition');
  await unlink(driftFile);
  expectSuccess(verifyBaseline(created.manifestRelativePath, 'inputs'), 'restored repository inventory');
});

test('an explicitly excluded fixture ledger transition does not drift', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('excluded-todo-transition');
  const fixtureLedger = posixJoin(caseRoot.relative, 'fixture-ledger.md');
  const fixtureLedgerPath = resolve(repositoryRoot, fixtureLedger);
  const attemptRoot = posixJoin(caseRoot.relative, 'attempt-01');
  await writeFile(fixtureLedgerPath, '- [ ] pending\n');
  const request = requestFor(caseRoot, {
    repositories: [{
      id: 'worker',
      root: '.',
      exclude: [...stableRepositoryExcludes, todoPath, fixtureLedger, attemptRoot],
    }],
  });
  try {
    const created = await createBaseline(caseRoot, request);
    expectSuccess(created.result, 'create excluded fixture ledger baseline');
    const manifest = JSON.parse(await readFile(created.manifestPath, 'utf8'));
    assert.equal(manifest.repositories[0].files.some((entry) => entry.path === todoPath), false);

    await writeFile(fixtureLedgerPath, '- [ ] in_progress\n');
    expectSuccess(verifyBaseline(created.manifestRelativePath, 'inputs'), 'verify excluded fixture ledger transition');
  } finally {
    await unlink(fixtureLedgerPath);
  }
});

test('baseline-tool tests never read or write the active todo ledger directly', async () => {
  const source = await readFile(fileURLToPath(import.meta.url), 'utf8');
  const ioNames = ['read', 'write'].map((verb) => `${verb}File`).join('|');
  const activeTodoIdentifier = ['todo', 'Path'].join('');
  const activeTodoLiteral = ['work-products', 'todo\\.md'].join('\\/');
  const directActiveTodoIo = new RegExp(
    `(?:${ioNames})\\s*\\([^;]{0,400}?(?:\\b${activeTodoIdentifier}\\b|${activeTodoLiteral})[^;]*\\);`,
    'u',
  );
  assert.doesNotMatch(source, directActiveTodoIo);
});

test('generated namespaces enforce anchored prefixes and terminal state while returning fingerprints', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('namespace');
  const generatedParent = posixJoin(caseRoot.relative, 'generated');
  await mkdir(resolve(repositoryRoot, generatedParent), { recursive: true });
  const request = requestFor(caseRoot, {
    repositories: [{
      id: 'worker',
      root: '.',
      exclude: [...stableRepositoryExcludes, 'work-products/todo.md', posixJoin(caseRoot.relative, 'attempt-01')],
    }],
    generated_namespaces: [{
      repository: 'worker',
      parent: generatedParent,
      prefix: 'run-',
      initial: 'none',
      terminal: 'none',
    }],
  });
  const created = await createBaseline(caseRoot, request);
  expectSuccess(created.result, 'create namespace baseline');
  const initialFingerprint = expectSuccess(fingerprint(created.relativePath, 'generated'), 'generated fingerprint');
  assert.equal(initialFingerprint.set, 'generated');
  assert.deepEqual(initialFingerprint.entries[0].matches, []);

  const generatedRun = resolve(repositoryRoot, generatedParent, 'run-one');
  await mkdir(generatedRun);
  await writeFile(resolve(generatedRun, 'artifact.txt'), 'generated');
  const residue = expectFailure(verifyBaseline(created.manifestRelativePath, 'terminal'), 'terminal namespace residue');
  assert.match(residue, /generated namespace terminal state is not empty/u);
  await rm(generatedRun, { recursive: true, force: true });
  const terminal = expectSuccess(verifyBaseline(created.manifestRelativePath, 'terminal'), 'clean terminal namespace');
  assert.equal(terminal.phase, 'terminal');
  assert.match(terminal.targets_fingerprint.digest, /^[0-9a-f]{64}$/u);
  assert.match(terminal.generated_fingerprint.digest, /^[0-9a-f]{64}$/u);

  await mkdir(resolve(repositoryRoot, generatedParent, 'run-preexisting'));
  const blockedRequest = requestFor(caseRoot, {
    attempt_id: 'attempt-initial-blocked',
    generated_namespaces: request.generated_namespaces,
  });
  const blocked = await createBaseline(caseRoot, blockedRequest, { requestName: 'blocked-request.json' });
  expectFailure(blocked.result, 'initial namespace violation');
  assert.equal(await exists(resolve(repositoryRoot, blockedRequest.attempt_root)), false);
});

test('generated namespace matching rejects case-only prefix aliases', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('namespace-case-alias');
  const generatedParent = posixJoin(caseRoot.relative, 'generated');
  await mkdir(resolve(repositoryRoot, generatedParent, 'run-preexisting'), { recursive: true });
  const request = requestFor(caseRoot, {
    generated_namespaces: [{
      repository: 'worker',
      parent: generatedParent,
      prefix: 'RUN-',
      initial: 'none',
      terminal: 'none',
    }],
  });
  const created = await createBaseline(caseRoot, request);
  const failure = expectFailure(created.result, 'case-only namespace prefix alias');
  assert.match(failure, /generated namespace initial state is not empty/u);
  assert.equal(await exists(resolve(repositoryRoot, request.attempt_root)), false);
});

test('create rejects noncanonical, aliased, overlapping, escaping, and duplicate paths without mutation', { concurrency: false }, async () => {
  const cases = [
    ['empty', [resource('')]],
    ['absolute', [resource('C:/escape.txt')]],
    ['backslash', [resource('work-products\\bad.txt')]],
    ['dot-segment', [resource('work-products/./bad.txt')]],
    ['parent-segment', [resource('../escape.txt')]],
    ['duplicate', [resource('work-products/missing.txt'), resource('work-products/missing.txt')]],
    ['case-alias', [resource('work-products/Missing.txt'), resource('work-products/missing.txt')]],
    ['ancestor-overlap', [resource('work-products/missing'), resource('work-products/missing/child')]],
  ];

  for (const [name, targets] of cases) {
    const caseRoot = await prepareCase(`invalid-${name}`);
    const sentinel = resolve(caseRoot.absolute, 'sentinel.txt');
    await writeFile(sentinel, 'unchanged');
    const request = requestFor(caseRoot, { targets });
    const created = await createBaseline(caseRoot, request);
    expectFailure(created.result, `invalid path ${name}`);
    assert.equal(await exists(resolve(repositoryRoot, request.attempt_root)), false, name);
    assert.equal(await exists(resolve(repositoryRoot, `${request.attempt_root}.creating`)), false, name);
    assert.equal(await readFile(sentinel, 'utf8'), 'unchanged');
  }
});

test('create rejects a link or reparse target and leaves no attempt', { concurrency: false }, async (context) => {
  const caseRoot = await prepareCase('link');
  const realDirectory = resolve(caseRoot.absolute, 'real-directory');
  const linkDirectory = resolve(caseRoot.absolute, 'linked-directory');
  await mkdir(realDirectory);
  await writeFile(resolve(realDirectory, 'data.txt'), 'data');
  try {
    await symlink(realDirectory, linkDirectory, 'junction');
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      context.skip(`junction creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  const request = requestFor(caseRoot, {
    targets: [resource(posixJoin(caseRoot.relative, 'linked-directory'))],
  });
  const created = await createBaseline(caseRoot, request);
  expectFailure(created.result, 'link/reparse target');
  assert.equal(await exists(resolve(repositoryRoot, request.attempt_root)), false);
});

test('fingerprint resolves the explicitly declared sibling Pages repository without persisting absolute paths', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('pages-repository');
  const request = requestFor(caseRoot, {
    targets: [resource('package.json', 'pages')],
    repositories: [{ id: 'pages', root: '../UXUV-Pages', exclude: stableRepositoryExcludes }],
  });
  const requestFile = await writeRequest(caseRoot, request);
  const result = runCli(['fingerprint', '--request', requestFile.relativePath, '--set', 'targets']);
  const output = expectSuccess(result, 'fingerprint Pages target');
  assert.equal(output.entries[0].repository, 'pages');
  assert.equal(output.entries[0].path, 'package.json');
  assert.equal(output.entries[0].identity.type, 'file');
  assert.equal(result.stdout.includes(resolve(repositoryRoot, '../UXUV-Pages')), false);
});

test('CLI accepts only the fixed command/flag/phase/set surface', { concurrency: false }, async () => {
  const caseRoot = await prepareCase('surface');
  const request = requestFor(caseRoot);
  const requestFile = await writeRequest(caseRoot, request);
  expectFailure(runCli(['unknown']), 'unknown command');
  expectFailure(runCli(['create']), 'missing request flag');
  expectFailure(runCli(['create', '--request', requestFile.relativePath, '--extra']), 'unknown create flag');
  expectFailure(runCli(['verify', '--manifest', 'missing.json', '--phase', 'other']), 'unknown verify phase');
  expectFailure(runCli(['fingerprint', '--request', requestFile.relativePath, '--set', 'other']), 'unknown fingerprint set');
});
