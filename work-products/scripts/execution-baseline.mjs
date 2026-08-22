import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  access,
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '../..');
const workspaceParent = dirname(repositoryRoot);
const LEGACY_REQUEST_SCHEMA = 's22-execution-baseline-request/v1';
const REQUEST_SCHEMA = 's22-execution-baseline-request/v2';
const LEGACY_MANIFEST_SCHEMA = 's22-execution-baseline/v1';
const MANIFEST_SCHEMA = 's22-execution-baseline/v2';
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const REPOSITORY_ROOTS = new Map([
  ['worker', '.'],
  ['pages', '../UXUV-Pages'],
]);
const TODO_LEDGER_PATH = 'work-products/todo.md';

const fail = (message) => {
  throw new Error(message);
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const stableDigest = (value) => sha256(JSON.stringify(value));
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const toPosixLiteral = (value) => value.replaceAll('\\', '/');
const semanticPath = (value) => toPosixLiteral(value).toLowerCase();
const pathsOverlap = (left, right) => {
  const leftPath = left.toLowerCase();
  const rightPath = right.toLowerCase();
  return leftPath === rightPath
    || leftPath.startsWith(`${rightPath}/`)
    || rightPath.startsWith(`${leftPath}/`);
};

const pathExists = async (path) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};

const assertExactKeys = (value, allowed, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort(compareText);
  const expected = [...allowed].sort(compareText);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} has an invalid key set`);
};

const canonicalPath = (value, label, options = {}) => {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} path must be non-empty`);
  if (value.includes('\0') || value.includes('\\')) fail(`${label} path must use canonical POSIX separators`);
  if (isAbsolute(value) || /^[A-Za-z]:/u.test(value)) fail(`${label} path must be repository-relative`);
  if (options.allowRepositoryRoot && (value === '.' || value === '../UXUV-Pages')) return value;
  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    fail(`${label} path contains a noncanonical segment`);
  }
  return value;
};

const resolveWithin = (root, canonical, label) => {
  const absolute = resolve(root, ...canonical.split('/'));
  const fromRoot = relative(root, absolute);
  if (fromRoot === '..' || fromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(fromRoot)) {
    fail(`${label} escapes its repository`);
  }
  return absolute;
};

const normalizeRepositoryDeclarations = (repositories) => {
  if (!Array.isArray(repositories)) fail('repositories must be an array');
  const ids = new Set();
  const roots = new Set();
  return repositories.map((entry, index) => {
    assertExactKeys(entry, ['id', 'root', 'exclude'], `repositories[${index}]`);
    if (typeof entry.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(entry.id)) {
      fail(`repositories[${index}].id is invalid`);
    }
    const idKey = entry.id.toLowerCase();
    if (!REPOSITORY_ROOTS.has(idKey)) fail(`repository id ${entry.id} is unsupported`);
    if (entry.id !== idKey) fail(`repository id ${entry.id} must use canonical lowercase`);
    if (ids.has(idKey)) fail('repository ids contain a duplicate or case alias');
    ids.add(idKey);
    const root = canonicalPath(entry.root, `repositories[${index}].root`, { allowRepositoryRoot: true });
    if (root !== REPOSITORY_ROOTS.get(idKey)) fail(`repository ${entry.id} root is invalid`);
    const rootKey = root.toLowerCase();
    if (roots.has(rootKey)) fail('repository roots contain a duplicate or case alias');
    roots.add(rootKey);
    if (!Array.isArray(entry.exclude)) fail(`repositories[${index}].exclude must be an array`);
    const excludes = entry.exclude.map((path, excludeIndex) => canonicalPath(
      path,
      `repositories[${index}].exclude[${excludeIndex}]`,
    )).sort(compareText);
    const excludeKeys = new Set();
    for (const path of excludes) {
      if (/[*?\[\]]/u.test(path)) fail('repository excludes must not contain glob syntax');
      const key = path.toLowerCase();
      if (excludeKeys.has(key)) fail('repository excludes contain a duplicate or case alias');
      excludeKeys.add(key);
    }
    return { id: entry.id, root, exclude: excludes };
  }).sort((left, right) => compareText(left.id.toLowerCase(), right.id.toLowerCase()));
};

const repositoryMappings = (repositories) => {
  const mappings = new Map();
  for (const repository of repositories) {
    const key = repository.id.toLowerCase();
    mappings.set(key, {
      id: repository.id,
      root: repository.root,
      absolute: repository.root === '.'
        ? repositoryRoot
        : resolve(repositoryRoot, '..', 'UXUV-Pages'),
      declared: repository,
    });
  }
  return mappings;
};

const normalizeResources = (entries, label, mappings) => {
  if (!Array.isArray(entries)) fail(`${label} must be an array`);
  const normalized = entries.map((entry, index) => {
    assertExactKeys(entry, ['repository', 'path'], `${label}[${index}]`);
    if (typeof entry.repository !== 'string' || entry.repository.length === 0) {
      fail(`${label}[${index}].repository is invalid`);
    }
    const mapping = mappings.get(entry.repository.toLowerCase());
    if (!mapping) fail(`${label}[${index}] references an undeclared repository`);
    return {
      repository: mapping.id,
      path: canonicalPath(entry.path, `${label}[${index}]`),
    };
  }).sort((left, right) => compareText(
    `${left.repository.toLowerCase()}\0${left.path.toLowerCase()}`,
    `${right.repository.toLowerCase()}\0${right.path.toLowerCase()}`,
  ));
  const keys = new Set();
  for (const entry of normalized) {
    const key = `${entry.repository.toLowerCase()}\0${entry.path.toLowerCase()}`;
    if (keys.has(key)) fail(`${label} contains a duplicate or case alias`);
    keys.add(key);
  }
  return normalized;
};

const assertNoResourceOverlap = (groups) => {
  const entries = groups.flatMap(([group, values]) => values.map((value) => ({ group, ...value })));
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const right = entries[rightIndex];
      if (left.repository.toLowerCase() !== right.repository.toLowerCase()) continue;
      const leftPath = left.path.toLowerCase();
      const rightPath = right.path.toLowerCase();
      if (
        leftPath === rightPath
        || leftPath.startsWith(`${rightPath}/`)
        || rightPath.startsWith(`${leftPath}/`)
      ) {
        fail(`${left.group} and ${right.group} contain duplicate, aliased, or overlapping paths`);
      }
    }
  }
};

const normalizeToolchain = (toolchain, mappings) => {
  assertExactKeys(toolchain, ['node_version', 'entrypoints'], 'toolchain');
  if (typeof toolchain.node_version !== 'string' || toolchain.node_version.length === 0) {
    fail('toolchain.node_version is invalid');
  }
  return {
    node_version: toolchain.node_version,
    entrypoints: normalizeResources(toolchain.entrypoints, 'toolchain.entrypoints', mappings),
  };
};

const normalizeEnvironment = (environment) => {
  if (!Array.isArray(environment)) fail('environment must be an array');
  const keys = new Set();
  return environment.map((entry, index) => {
    const label = `environment[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(`${label} must be an object`);
    if (typeof entry.key !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(entry.key)) {
      fail(`${label}.key is invalid`);
    }
    const keyAlias = entry.key.toLowerCase();
    if (keys.has(keyAlias)) fail('environment contains a duplicate or case alias');
    keys.add(keyAlias);
    if (entry.state === 'absent') {
      assertExactKeys(entry, ['key', 'state', 'sensitive'], label);
      if (entry.sensitive !== false) fail(`${label} absent keys must be non-sensitive`);
      return { key: entry.key, state: 'absent', sensitive: false };
    }
    if (entry.state !== 'present' || typeof entry.sensitive !== 'boolean') {
      fail(`${label} state or sensitivity is invalid`);
    }
    if (entry.sensitive) {
      assertExactKeys(entry, ['key', 'state', 'sensitive', 'sha256'], label);
      if (!SHA256_PATTERN.test(entry.sha256)) fail(`${label}.sha256 is invalid`);
      return { key: entry.key, state: 'present', sensitive: true, sha256: entry.sha256 };
    }
    assertExactKeys(entry, ['key', 'state', 'sensitive', 'value'], label);
    if (typeof entry.value !== 'string') fail(`${label}.value must be a string`);
    return { key: entry.key, state: 'present', sensitive: false, value: entry.value };
  }).sort((left, right) => compareText(left.key.toLowerCase(), right.key.toLowerCase()));
};

const normalizeNamespaces = (namespaces, mappings) => {
  if (!Array.isArray(namespaces)) fail('generated_namespaces must be an array');
  const keys = new Set();
  return namespaces.map((entry, index) => {
    const label = `generated_namespaces[${index}]`;
    assertExactKeys(entry, ['repository', 'parent', 'prefix', 'initial', 'terminal'], label);
    const mapping = mappings.get(String(entry.repository).toLowerCase());
    if (!mapping) fail(`${label} references an undeclared repository`);
    const parent = canonicalPath(entry.parent, `${label}.parent`);
    if (
      typeof entry.prefix !== 'string'
      || entry.prefix.length === 0
      || entry.prefix === '.'
      || entry.prefix === '..'
      || entry.prefix.includes('/')
      || entry.prefix.includes('\\')
      || /[*?\[\]]/u.test(entry.prefix)
    ) fail(`${label}.prefix is invalid`);
    if (!['none', 'capture'].includes(entry.initial)) fail(`${label}.initial is invalid`);
    if (!['none', 'unchanged', 'any'].includes(entry.terminal)) fail(`${label}.terminal is invalid`);
    const key = `${mapping.id.toLowerCase()}\0${parent.toLowerCase()}\0${entry.prefix.toLowerCase()}`;
    if (keys.has(key)) fail('generated namespaces contain a duplicate or case alias');
    keys.add(key);
    return {
      repository: mapping.id,
      parent,
      prefix: entry.prefix,
      initial: entry.initial,
      terminal: entry.terminal,
    };
  }).sort((left, right) => compareText(
    `${left.repository.toLowerCase()}\0${left.parent.toLowerCase()}\0${left.prefix.toLowerCase()}`,
    `${right.repository.toLowerCase()}\0${right.parent.toLowerCase()}\0${right.prefix.toLowerCase()}`,
  ));
};

const assertV2TodoIsolation = (request) => {
  if (pathsOverlap(request.attempt_root, TODO_LEDGER_PATH)) {
    fail(`request.attempt_root must not overlap ${TODO_LEDGER_PATH}`);
  }

  for (const [label, resources] of [
    ['targets', request.targets],
    ['inputs', request.inputs],
    ['protected_inputs', request.protected_inputs],
    ['orchestration_outputs', request.orchestration_outputs],
    ['toolchain.entrypoints', request.toolchain.entrypoints],
  ]) {
    if (resources.some((resource) => (
      resource.repository === 'worker' && pathsOverlap(resource.path, TODO_LEDGER_PATH)
    ))) {
      fail(`${TODO_LEDGER_PATH} must not overlap ${label}`);
    }
  }

  for (const namespace of request.generated_namespaces) {
    if (namespace.repository !== 'worker') continue;
    const parent = namespace.parent.toLowerCase();
    const todo = TODO_LEDGER_PATH.toLowerCase();
    const parentAtOrBelowTodo = parent === todo || parent.startsWith(`${todo}/`);
    const parentAboveTodo = todo.startsWith(`${parent}/`);
    const todoChild = parentAboveTodo
      ? todo.slice(parent.length + 1).split('/')[0]
      : null;
    if (parentAtOrBelowTodo || (todoChild !== null && todoChild.startsWith(namespace.prefix.toLowerCase()))) {
      fail(`${TODO_LEDGER_PATH} must not overlap generated_namespaces`);
    }
  }

  const worker = request.repositories.find((repository) => repository.id === 'worker');
  if (!worker) return;
  const broadTodoMask = worker.exclude.find((path) => (
    path !== TODO_LEDGER_PATH && pathsOverlap(path, TODO_LEDGER_PATH)
  ));
  if (broadTodoMask) {
    fail(`worker repository exclusion must not overlap ${TODO_LEDGER_PATH}: ${broadTodoMask}`);
  }
  if (!worker.exclude.includes(TODO_LEDGER_PATH)) {
    fail(`worker repository exclusion must explicitly include ${TODO_LEDGER_PATH}`);
  }
};

const validateRequest = (request, options = {}) => {
  if (!request || typeof request !== 'object' || Array.isArray(request)) fail('request must be an object');
  const legacy = request.schema_version === LEGACY_REQUEST_SCHEMA;
  if (!legacy && request.schema_version !== REQUEST_SCHEMA) fail('request schema is invalid');
  if (options.requireCurrentSchema && legacy) fail(`create requires request schema ${REQUEST_SCHEMA}`);
  const allowedKeys = [
    'schema_version',
    'task_id',
    'attempt_id',
    'owner',
    'no_replace',
    'attempt_root',
    'targets',
    'inputs',
    'protected_inputs',
    'repositories',
    'toolchain',
    'environment',
    'generated_namespaces',
  ];
  if (!legacy) allowedKeys.push('orchestration_outputs');
  assertExactKeys(request, allowedKeys, 'request');
  for (const field of ['task_id', 'attempt_id', 'owner']) {
    if (typeof request[field] !== 'string' || request[field].length === 0 || request[field].includes('\n')) {
      fail(`request.${field} is invalid`);
    }
  }
  if (request.no_replace !== true) fail('request.no_replace must be true');
  const attemptRoot = canonicalPath(request.attempt_root, 'request.attempt_root');
  const repositories = normalizeRepositoryDeclarations(request.repositories);
  const mappings = repositoryMappings(repositories);
  const targets = normalizeResources(request.targets, 'targets', mappings);
  const inputs = normalizeResources(request.inputs, 'inputs', mappings);
  const protectedInputs = normalizeResources(request.protected_inputs, 'protected_inputs', mappings);
  const orchestrationOutputs = normalizeResources(
    legacy ? [] : request.orchestration_outputs,
    'orchestration_outputs',
    mappings,
  );
  assertNoResourceOverlap([
    ['targets', targets],
    ['inputs', inputs],
    ['protected_inputs', protectedInputs],
    ['orchestration_outputs', orchestrationOutputs],
  ]);
  const normalized = {
    schema_version: request.schema_version,
    task_id: request.task_id,
    attempt_id: request.attempt_id,
    owner: request.owner,
    no_replace: true,
    attempt_root: attemptRoot,
    targets,
    inputs,
    protected_inputs: protectedInputs,
    orchestration_outputs: orchestrationOutputs,
    repositories,
    toolchain: normalizeToolchain(request.toolchain, mappings),
    environment: normalizeEnvironment(request.environment),
    generated_namespaces: normalizeNamespaces(request.generated_namespaces, mappings),
    mappings,
  };
  if (!legacy) assertV2TodoIsolation(normalized);
  if (!attemptRoot.startsWith('work-products/')) fail('request.attempt_root must stay under work-products');
  for (const entry of [...targets, ...inputs, ...protectedInputs, ...orchestrationOutputs]) {
    if (entry.repository.toLowerCase() !== 'worker') continue;
    if (pathsOverlap(entry.path, attemptRoot)) fail('attempt root overlaps a declared resource');
  }
  return normalized;
};

const assertRepositoryRoots = async (mappings) => {
  const seen = new Set();
  for (const mapping of mappings.values()) {
    const key = semanticPath(mapping.absolute);
    if (seen.has(key)) continue;
    seen.add(key);
    const metadata = await lstat(mapping.absolute);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) fail(`repository ${mapping.id} root is not a regular directory`);
    const actual = await realpath(mapping.absolute);
    if (semanticPath(actual) !== semanticPath(mapping.absolute)) fail(`repository ${mapping.id} root crosses a link or reparse boundary`);
  }
};

const assertExistingAncestors = async (root, absolute, label) => {
  const fromRoot = relative(root, absolute);
  if (fromRoot === '..' || fromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(fromRoot)) {
    fail(`${label} escapes its repository`);
  }
  const segments = toPosixLiteral(fromRoot).split('/').filter(Boolean);
  let current = root;
  for (const segment of segments) {
    current = resolve(current, segment);
    let metadata;
    try {
      metadata = await lstat(current);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    if (metadata.isSymbolicLink()) fail(`${label} crosses a link or reparse boundary`);
    const actual = await realpath(current);
    if (semanticPath(actual) !== semanticPath(current)) fail(`${label} crosses a link or reparse boundary`);
  }
};

const assertRegularControlFile = async (root, absolute, label) => {
  await assertExistingAncestors(root, absolute, label);
  const metadata = await lstat(absolute);
  if (metadata.isSymbolicLink() || !metadata.isFile()) fail(`${label} is not a regular file`);
  const actual = await realpath(absolute);
  if (semanticPath(actual) !== semanticPath(absolute)) fail(`${label} crosses a link or reparse boundary`);
};

const hashFile = async (path) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
};

const inspectPath = async (root, canonical, label) => {
  const absolute = resolveWithin(root, canonical, label);
  await assertExistingAncestors(root, absolute, label);
  let metadata;
  try {
    metadata = await lstat(absolute);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { state: 'missing', type: 'missing', size: 0, sha256: null };
    }
    throw error;
  }
  if (metadata.isSymbolicLink()) fail(`${label} is a link or reparse point`);
  const actual = await realpath(absolute);
  if (semanticPath(actual) !== semanticPath(absolute)) fail(`${label} crosses a link or reparse boundary`);
  if (metadata.isFile()) {
    return {
      state: 'present',
      type: 'file',
      size: metadata.size,
      sha256: await hashFile(absolute),
    };
  }
  if (!metadata.isDirectory()) fail(`${label} has an unsupported filesystem type`);

  const descendants = [];
  const aliases = new Set();
  const walk = async (directory, prefix = '') => {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => compareText(left.name, right.name));
    for (const child of children) {
      const childPath = prefix ? `${prefix}/${child.name}` : child.name;
      const alias = childPath.toLowerCase();
      if (aliases.has(alias)) fail(`${label} descendants contain a duplicate or case alias`);
      aliases.add(alias);
      const childAbsolute = resolve(directory, child.name);
      const childMetadata = await lstat(childAbsolute);
      if (childMetadata.isSymbolicLink()) fail(`${label} contains a link or reparse point`);
      const childRealPath = await realpath(childAbsolute);
      if (semanticPath(childRealPath) !== semanticPath(childAbsolute)) fail(`${label} contains a link or reparse boundary`);
      if (childMetadata.isDirectory()) {
        descendants.push({ path: childPath, type: 'directory', size: 0, sha256: null });
        await walk(childAbsolute, childPath);
      } else if (childMetadata.isFile()) {
        descendants.push({
          path: childPath,
          type: 'file',
          size: childMetadata.size,
          sha256: await hashFile(childAbsolute),
        });
      } else {
        fail(`${label} contains an unsupported filesystem type`);
      }
    }
  };
  await walk(absolute);
  descendants.sort((left, right) => compareText(left.path, right.path));
  return {
    state: 'present',
    type: 'directory',
    size: descendants.filter((entry) => entry.type === 'file').reduce((total, entry) => total + entry.size, 0),
    sha256: stableDigest(descendants),
    descendants,
  };
};

const captureResources = async (resources, mappings, label) => Promise.all(resources.map(async (entry) => {
  const mapping = mappings.get(entry.repository.toLowerCase());
  return {
    repository: entry.repository,
    path: entry.path,
    identity: await inspectPath(mapping.absolute, entry.path, `${label} ${entry.repository}:${entry.path}`),
  };
}));

const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const assertCapturedResources = async (expected, mappings, label) => {
  const declarations = expected.map(({ repository, path }) => ({ repository, path }));
  const actual = await captureResources(declarations, mappings, label);
  if (!sameValue(actual, expected)) fail(`${label} identity drift`);
};

const captureEnvironment = (declarations) => declarations.map((entry) => {
  const present = Object.prototype.hasOwnProperty.call(process.env, entry.key);
  if (entry.state === 'absent') {
    if (present) fail(`environment key ${entry.key} presence drift`);
    return entry;
  }
  if (!present) fail(`environment key ${entry.key} presence drift`);
  if (entry.sensitive) {
    if (sha256(process.env[entry.key]) !== entry.sha256) fail(`environment key ${entry.key} value drift`);
  } else if (process.env[entry.key] !== entry.value) {
    fail(`environment key ${entry.key} value drift`);
  }
  return entry;
});

const captureToolchain = async (toolchain, mappings) => {
  if (process.version !== toolchain.node_version) fail('Node runtime version drift');
  return {
    node_version: process.version,
    entrypoints: await captureResources(toolchain.entrypoints, mappings, 'toolchain entrypoint'),
  };
};

const isExcluded = (path, exclusions) => exclusions.some((excluded) => (
  path.toLowerCase() === excluded.toLowerCase()
  || path.toLowerCase().startsWith(`${excluded.toLowerCase()}/`)
));

const isGeneratedNamespacePath = (path, repositoryId, namespaces) => namespaces.some((namespace) => {
  if (namespace.repository.toLowerCase() !== repositoryId.toLowerCase()) return false;
  const candidate = semanticPath(path);
  const parent = `${semanticPath(namespace.parent)}/`;
  if (!candidate.startsWith(parent)) return false;
  const child = candidate.slice(parent.length).split('/')[0];
  return child.startsWith(namespace.prefix.toLowerCase());
});

const assertCreateRequestContract = (request) => {
  const worker = request.repositories.find((repository) => repository.id === 'worker');
  if (!worker) fail('create requires the canonical worker repository declaration');
  if (!worker.exclude.includes(request.attempt_root)) {
    fail('worker repository exclusion must explicitly include the attempt root');
  }
  for (const [label, resources] of [
    ['targets', request.targets],
    ['orchestration_outputs', request.orchestration_outputs],
  ]) {
    for (let index = 0; index < resources.length; index += 1) {
      const resource = resources[index];
      const repository = request.repositories.find((entry) => entry.id === resource.repository);
      if (!isExcluded(resource.path, repository.exclude)) {
        fail(`${label}[${index}] is not covered by repository exclusions`);
      }
    }
  }
};

export const validateCreateRequest = (request) => {
  const normalized = validateRequest(request, { requireCurrentSchema: true });
  assertCreateRequestContract(normalized);
  return normalized;
};

const git = (mapping, args) => {
  const result = spawnSync('git', ['-C', mapping.absolute, ...args], {
    encoding: null,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.status !== 0) fail(`read-only Git discovery failed for repository ${mapping.id}`);
  return result.stdout;
};

const captureRepositories = async (
  repositories,
  mappings,
  attemptRoot,
  generatedNamespaces,
) => Promise.all(repositories.map(async (repository) => {
  const mapping = mappings.get(repository.id.toLowerCase());
  const exclusions = [...repository.exclude];
  if (mapping.root === '.') {
    exclusions.push(attemptRoot, `${attemptRoot}.creating`);
  }
  const inventoryBuffer = git(mapping, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']);
  const paths = inventoryBuffer.toString('utf8').split('\0').filter(Boolean).map(toPosixLiteral).filter(
    (path) => path !== '.git'
      && !path.startsWith('.git/')
      && !isExcluded(path, exclusions)
      && !isGeneratedNamespacePath(path, repository.id, generatedNamespaces),
  ).sort(compareText);
  const aliases = new Set();
  const files = [];
  for (const path of paths) {
    canonicalPath(path, `repository ${repository.id} inventory`);
    const alias = path.toLowerCase();
    if (aliases.has(alias)) fail(`repository ${repository.id} inventory contains a duplicate or case alias`);
    aliases.add(alias);
    const identity = await inspectPath(mapping.absolute, path, `repository ${repository.id} inventory ${path}`);
    if (identity.state !== 'present' || identity.type !== 'file') {
      fail(`repository ${repository.id} inventory entry is not a regular file`);
    }
    files.push({ path, size: identity.size, sha256: identity.sha256 });
  }
  const head = git(mapping, ['rev-parse', '--verify', 'HEAD']).toString('utf8').trim();
  if (!/^[0-9a-f]{40,64}$/u.test(head)) fail(`repository ${repository.id} HEAD identity is invalid`);
  return {
    id: repository.id,
    root: repository.root,
    exclude: repository.exclude,
    head,
    inventory_sha256: stableDigest(files),
    files,
  };
}));

const captureNamespace = async (namespace, mappings) => {
  const mapping = mappings.get(namespace.repository.toLowerCase());
  const parentAbsolute = resolveWithin(mapping.absolute, namespace.parent, 'generated namespace parent');
  await assertExistingAncestors(mapping.absolute, parentAbsolute, 'generated namespace parent');
  let parentMetadata;
  try {
    parentMetadata = await lstat(parentAbsolute);
  } catch (error) {
    if (error.code === 'ENOENT') return { ...namespace, matches: [] };
    throw error;
  }
  if (parentMetadata.isSymbolicLink() || !parentMetadata.isDirectory()) {
    fail('generated namespace parent is not a regular directory');
  }
  const actualParent = await realpath(parentAbsolute);
  if (semanticPath(actualParent) !== semanticPath(parentAbsolute)) fail('generated namespace parent crosses a link or reparse boundary');
  const namespacePrefix = namespace.prefix.toLowerCase();
  const children = (await readdir(parentAbsolute))
    .filter((name) => name.toLowerCase().startsWith(namespacePrefix))
    .sort(compareText);
  const aliases = new Set();
  const matches = [];
  for (const name of children) {
    const alias = name.toLowerCase();
    if (aliases.has(alias)) fail('generated namespace contains a duplicate or case alias');
    aliases.add(alias);
    const path = `${namespace.parent}/${name}`;
    matches.push({ name, identity: await inspectPath(mapping.absolute, path, `generated namespace ${name}`) });
  }
  return { ...namespace, matches };
};

const captureNamespaces = async (namespaces, mappings) => Promise.all(
  namespaces.map((namespace) => captureNamespace(namespace, mappings)),
);

const namespaceManifestEntries = (captured) => captured.map(({ matches, ...declaration }) => ({
  ...declaration,
  initial_matches: matches,
}));

const assertInitialNamespaces = (captured) => {
  for (const namespace of captured) {
    if (namespace.initial === 'none' && namespace.matches.length !== 0) {
      fail('generated namespace initial state is not empty');
    }
  }
};

const assertNamespacesForPhase = (manifestEntries, captured, phase) => {
  for (let index = 0; index < manifestEntries.length; index += 1) {
    const expected = manifestEntries[index];
    const actual = captured[index];
    if (phase !== 'terminal') {
      if (!sameValue(actual.matches, expected.initial_matches)) fail('generated namespace changed before writes');
      continue;
    }
    if (expected.terminal === 'none' && actual.matches.length !== 0) fail('generated namespace terminal state is not empty');
    if (expected.terminal === 'unchanged' && !sameValue(actual.matches, expected.initial_matches)) {
      fail('generated namespace terminal state changed');
    }
  }
};

const fingerprintTargets = async (targets, mappings) => {
  const entries = await captureResources(targets, mappings, 'fingerprint target');
  return {
    schema_version: 's22-fingerprint/v1',
    set: 'targets',
    digest: stableDigest(entries),
    entries,
  };
};

const fingerprintGenerated = async (namespaces, mappings) => {
  const captured = await captureNamespaces(namespaces, mappings);
  const entries = captured.map(({ matches, ...declaration }) => ({ ...declaration, matches }));
  return {
    schema_version: 's22-fingerprint/v1',
    set: 'generated',
    digest: stableDigest(entries),
    entries,
  };
};

const snapshotPath = (attemptRoot, index, suffix) => `${attemptRoot}/snapshots/targets/${String(index).padStart(4, '0')}/${suffix}`;

const writeTargetSnapshots = async (targets, mappings, attemptRoot, stagingRoot) => {
  const snapshots = [];
  await mkdir(resolve(stagingRoot, 'snapshots', 'targets'), { recursive: true });
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    if (target.identity.state === 'missing') {
      snapshots.push({
        repository: target.repository,
        path: target.path,
        state: 'missing',
        type: 'missing',
      });
      continue;
    }
    const mapping = mappings.get(target.repository.toLowerCase());
    const source = resolveWithin(mapping.absolute, target.path, 'snapshot source');
    const indexDirectory = resolve(stagingRoot, 'snapshots', 'targets', String(index).padStart(4, '0'));
    await mkdir(indexDirectory, { recursive: false });
    if (target.identity.type === 'file') {
      const destination = resolve(indexDirectory, 'file');
      await copyFile(source, destination);
      snapshots.push({
        repository: target.repository,
        path: target.path,
        state: 'present',
        type: 'file',
        size: target.identity.size,
        sha256: target.identity.sha256,
        snapshot_path: snapshotPath(attemptRoot, index, 'file'),
      });
      continue;
    }
    const treeRoot = resolve(indexDirectory, 'tree');
    await mkdir(treeRoot, { recursive: false });
    const descendants = [];
    for (const descendant of target.identity.descendants) {
      const destination = resolveWithin(treeRoot, descendant.path, 'directory snapshot destination');
      const storedPath = snapshotPath(attemptRoot, index, `tree/${descendant.path}`);
      if (descendant.type === 'directory') {
        await mkdir(destination, { recursive: true });
      } else {
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(resolveWithin(source, descendant.path, 'directory snapshot source'), destination);
      }
      descendants.push({ ...descendant, snapshot_path: storedPath });
    }
    snapshots.push({
      repository: target.repository,
      path: target.path,
      state: 'present',
      type: 'directory',
      size: target.identity.size,
      sha256: target.identity.sha256,
      snapshot_path: snapshotPath(attemptRoot, index, 'tree'),
      descendants,
    });
  }
  return snapshots;
};

const artifactPhysicalPath = (artifactPath, attemptRoot, physicalRoot) => {
  canonicalPath(artifactPath, 'artifact path');
  const prefix = `${attemptRoot}/`;
  if (!artifactPath.startsWith(prefix)) fail('artifact path escapes attempt root');
  return resolveWithin(physicalRoot, artifactPath.slice(prefix.length), 'artifact path');
};

const addExpectedSnapshotPath = (expected, relativePath, type, identity = {}) => {
  const parts = relativePath.split('/');
  for (let index = 1; index < parts.length; index += 1) {
    const parent = parts.slice(0, index).join('/');
    if (!expected.has(parent)) expected.set(parent, { path: parent, type: 'directory', size: 0, sha256: null });
  }
  expected.set(relativePath, {
    path: relativePath,
    type,
    size: type === 'file' ? identity.size : 0,
    sha256: type === 'file' ? identity.sha256 : null,
  });
};

const verifySnapshotSet = async (manifest, physicalRoot) => {
  if (manifest.snapshots.length !== manifest.targets.length) fail('snapshot and target sets differ');
  const expected = new Map();
  expected.set('targets', { path: 'targets', type: 'directory', size: 0, sha256: null });
  for (let index = 0; index < manifest.targets.length; index += 1) {
    const target = manifest.targets[index];
    const snapshot = manifest.snapshots[index];
    if (snapshot.repository !== target.repository || snapshot.path !== target.path) fail('snapshot and target paths differ');
    if (target.identity.state === 'missing') {
      if (!sameValue(snapshot, {
        repository: target.repository,
        path: target.path,
        state: 'missing',
        type: 'missing',
      })) fail('missing target snapshot declaration is invalid');
      continue;
    }
    if (snapshot.state !== 'present' || snapshot.type !== target.identity.type) fail('snapshot type differs from target');
    const prefix = `${manifest.attempt_root}/snapshots/`;
    if (!snapshot.snapshot_path.startsWith(prefix)) fail('snapshot path escapes snapshot root');
    const relativeSnapshot = snapshot.snapshot_path.slice(prefix.length);
    addExpectedSnapshotPath(expected, relativeSnapshot, snapshot.type, target.identity);
    if (snapshot.size !== target.identity.size || snapshot.sha256 !== target.identity.sha256) fail('snapshot identity differs from target');
    if (target.identity.type === 'directory') {
      if (!Array.isArray(snapshot.descendants) || snapshot.descendants.length !== target.identity.descendants.length) {
        fail('directory snapshot descendant set differs from target');
      }
      for (let childIndex = 0; childIndex < target.identity.descendants.length; childIndex += 1) {
        const targetChild = target.identity.descendants[childIndex];
        const snapshotChild = snapshot.descendants[childIndex];
        const expectedChild = {
          ...targetChild,
          snapshot_path: `${snapshot.snapshot_path}/${targetChild.path}`,
        };
        if (!sameValue(snapshotChild, expectedChild)) fail('directory snapshot descendant declaration differs from target');
        addExpectedSnapshotPath(
          expected,
          snapshotChild.snapshot_path.slice(prefix.length),
          snapshotChild.type,
          snapshotChild,
        );
      }
    }
  }
  const snapshotsRoot = resolve(physicalRoot, 'snapshots');
  const actual = await inspectPath(physicalRoot, 'snapshots', 'snapshot root');
  if (actual.state !== 'present' || actual.type !== 'directory') fail('snapshot root is missing');
  const expectedEntries = [...expected.values()].sort((left, right) => compareText(left.path, right.path));
  if (!sameValue(actual.descendants, expectedEntries)) fail('snapshot path/type/byte set differs from manifest');
  if (!(await pathExists(snapshotsRoot))) fail('snapshot root is missing');
};

const legacyManifestAllowedKeys = [
  'schema_version',
  'task_id',
  'attempt_id',
  'owner',
  'no_replace',
  'created_at',
  'attempt_root',
  'request_path',
  'request_sha256',
  'targets',
  'snapshots',
  'inputs',
  'protected_inputs',
  'repositories',
  'toolchain',
  'environment',
  'generated_namespaces',
];
const manifestAllowedKeys = [...legacyManifestAllowedKeys, 'orchestration_outputs'];

const validateManifestDeclarations = (manifest, request) => {
  const expectedSchema = request.schema_version === LEGACY_REQUEST_SCHEMA
    ? LEGACY_MANIFEST_SCHEMA
    : MANIFEST_SCHEMA;
  if (manifest.schema_version !== expectedSchema) fail('manifest schema is invalid');
  assertExactKeys(
    manifest,
    expectedSchema === LEGACY_MANIFEST_SCHEMA ? legacyManifestAllowedKeys : manifestAllowedKeys,
    'manifest',
  );
  for (const field of ['task_id', 'attempt_id', 'owner', 'no_replace', 'attempt_root']) {
    if (manifest[field] !== request[field]) fail(`manifest ${field} differs from request`);
  }
  if (!manifest.request_path.startsWith(`${manifest.attempt_root}/`)) fail('manifest request path escapes attempt root');
  if (!SHA256_PATTERN.test(manifest.request_sha256)) fail('manifest request SHA-256 is invalid');
  const expectedTargets = manifest.targets.map(({ repository, path }) => ({ repository, path }));
  const expectedInputs = manifest.inputs.map(({ repository, path }) => ({ repository, path }));
  const expectedProtected = manifest.protected_inputs.map(({ repository, path }) => ({ repository, path }));
  if (!sameValue(expectedTargets, request.targets)) fail('manifest target declarations differ from request');
  if (!sameValue(expectedInputs, request.inputs)) fail('manifest input declarations differ from request');
  if (!sameValue(expectedProtected, request.protected_inputs)) fail('manifest protected input declarations differ from request');
  if (expectedSchema !== LEGACY_MANIFEST_SCHEMA && !sameValue(
    manifest.orchestration_outputs,
    request.orchestration_outputs,
  )) fail('manifest orchestration output declarations differ from request');
  if (!sameValue(manifest.environment, request.environment)) fail('manifest environment declarations differ from request');
  if (manifest.toolchain.node_version !== request.toolchain.node_version) fail('manifest toolchain declaration differs from request');
  if (!sameValue(
    manifest.toolchain.entrypoints.map(({ repository, path }) => ({ repository, path })),
    request.toolchain.entrypoints,
  )) fail('manifest toolchain entrypoints differ from request');
  if (!sameValue(
    manifest.repositories.map(({ id, root, exclude }) => ({ id, root, exclude })),
    request.repositories,
  )) fail('manifest repository declarations differ from request');
  if (!sameValue(
    manifest.generated_namespaces.map(({ initial_matches, ...entry }) => entry),
    request.generated_namespaces,
  )) fail('manifest generated namespace declarations differ from request');
};

const loadManifest = async (manifestRelativePath) => {
  const canonical = canonicalPath(manifestRelativePath, 'manifest');
  if (!canonical.startsWith('work-products/') || !canonical.endsWith('/manifest.json')) {
    fail('manifest must be a work-products attempt manifest');
  }
  const absolute = resolveWithin(repositoryRoot, canonical, 'manifest');
  const sidecarAbsolute = resolve(dirname(absolute), 'manifest.sha256');
  await assertRegularControlFile(repositoryRoot, absolute, 'manifest');
  await assertRegularControlFile(repositoryRoot, sidecarAbsolute, 'manifest integrity sidecar');
  const raw = await readFile(absolute);
  const sidecar = await readFile(sidecarAbsolute, 'utf8');
  if (sidecar !== `${sha256(raw)}\n`) fail('manifest integrity drift');
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    fail('manifest JSON is invalid');
  }
  const requestCopyAbsolute = artifactPhysicalPath(manifest.request_path, manifest.attempt_root, dirname(absolute));
  await assertRegularControlFile(repositoryRoot, requestCopyAbsolute, 'request copy');
  const requestRaw = await readFile(requestCopyAbsolute);
  if (sha256(requestRaw) !== manifest.request_sha256) fail('request copy integrity drift');
  let requestDocument;
  try {
    requestDocument = JSON.parse(requestRaw);
  } catch {
    fail('request copy JSON is invalid');
  }
  const request = validateRequest(requestDocument);
  validateManifestDeclarations(manifest, request);
  if (dirname(canonical).replaceAll('\\', '/') !== manifest.attempt_root) fail('manifest location differs from attempt root');
  await assertRepositoryRoots(request.mappings);
  await verifySnapshotSet(manifest, dirname(absolute));
  return { manifest, request };
};

const createManifest = async (requestRelativePath) => {
  const canonicalRequestPath = canonicalPath(requestRelativePath, 'request');
  if (!canonicalRequestPath.startsWith('work-products/')) fail('request must stay under work-products');
  const requestAbsolutePath = resolveWithin(repositoryRoot, canonicalRequestPath, 'request');
  await assertRegularControlFile(repositoryRoot, requestAbsolutePath, 'request');
  const requestRaw = await readFile(requestAbsolutePath);
  let requestDocument;
  try {
    requestDocument = JSON.parse(requestRaw);
  } catch {
    fail('request JSON is invalid');
  }
  const request = validateCreateRequest(requestDocument);
  await assertRepositoryRoots(request.mappings);
  const attemptAbsolute = resolveWithin(repositoryRoot, request.attempt_root, 'attempt root');
  const stagingRelative = `${request.attempt_root}.creating`;
  const stagingAbsolute = resolveWithin(repositoryRoot, stagingRelative, 'staging root');
  if (await pathExists(attemptAbsolute)) fail('attempt root already exists; no-replace create rejected');
  if (await pathExists(stagingAbsolute)) fail('staging root already exists; no-replace create rejected');

  const targets = await captureResources(request.targets, request.mappings, 'target');
  const inputs = await captureResources(request.inputs, request.mappings, 'input');
  const protectedInputs = await captureResources(request.protected_inputs, request.mappings, 'protected input');
  const repositories = await captureRepositories(
    request.repositories,
    request.mappings,
    request.attempt_root,
    request.generated_namespaces,
  );
  const toolchain = await captureToolchain(request.toolchain, request.mappings);
  const environment = captureEnvironment(request.environment);
  const generated = await captureNamespaces(request.generated_namespaces, request.mappings);
  assertInitialNamespaces(generated);

  let stagingCreated = false;
  try {
    await mkdir(stagingAbsolute, { recursive: false });
    stagingCreated = true;
    await writeFile(resolve(stagingAbsolute, 'request.json'), requestRaw, { flag: 'wx' });
    const snapshots = await writeTargetSnapshots(targets, request.mappings, request.attempt_root, stagingAbsolute);

    await assertCapturedResources(targets, request.mappings, 'target');
    await assertCapturedResources(inputs, request.mappings, 'input');
    await assertCapturedResources(protectedInputs, request.mappings, 'protected input');
    const repositoriesAfterCopy = await captureRepositories(
      request.repositories,
      request.mappings,
      request.attempt_root,
      request.generated_namespaces,
    );
    if (!sameValue(repositoriesAfterCopy, repositories)) fail('repository identity drift during create');
    const toolchainAfterCopy = await captureToolchain(request.toolchain, request.mappings);
    if (!sameValue(toolchainAfterCopy, toolchain)) fail('toolchain identity drift during create');
    captureEnvironment(request.environment);
    const namespacesAfterCopy = await captureNamespaces(request.generated_namespaces, request.mappings);
    if (!sameValue(namespacesAfterCopy, generated)) fail('generated namespace drift during create');

    const manifest = {
      schema_version: MANIFEST_SCHEMA,
      task_id: request.task_id,
      attempt_id: request.attempt_id,
      owner: request.owner,
      no_replace: true,
      created_at: new Date().toISOString(),
      attempt_root: request.attempt_root,
      request_path: `${request.attempt_root}/request.json`,
      request_sha256: sha256(requestRaw),
      targets,
      snapshots,
      inputs,
      protected_inputs: protectedInputs,
      orchestration_outputs: request.orchestration_outputs,
      repositories,
      toolchain,
      environment,
      generated_namespaces: namespaceManifestEntries(generated),
    };
    const manifestRaw = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(resolve(stagingAbsolute, 'manifest.json'), manifestRaw, { flag: 'wx' });
    await writeFile(resolve(stagingAbsolute, 'manifest.sha256'), `${sha256(manifestRaw)}\n`, { flag: 'wx' });
    await verifySnapshotSet(manifest, stagingAbsolute);
    await rename(stagingAbsolute, attemptAbsolute);
    stagingCreated = false;
    return {
      schema_version: 's22-create-result/v1',
      manifest: `${request.attempt_root}/manifest.json`,
      task_id: request.task_id,
      attempt_id: request.attempt_id,
    };
  } catch (error) {
    if (stagingCreated) await rm(stagingAbsolute, { recursive: true, force: true });
    throw error;
  }
};

const verifyManifest = async (manifestRelativePath, phase) => {
  const { manifest, request } = await loadManifest(manifestRelativePath);
  await assertCapturedResources(manifest.inputs, request.mappings, 'input');
  await assertCapturedResources(manifest.protected_inputs, request.mappings, 'protected input');
  const repositories = await captureRepositories(
    request.repositories,
    request.mappings,
    request.attempt_root,
    request.generated_namespaces,
  );
  if (!sameValue(repositories, manifest.repositories)) fail('repository identity drift');
  const toolchain = await captureToolchain(request.toolchain, request.mappings);
  if (!sameValue(toolchain, manifest.toolchain)) fail('toolchain identity drift');
  const environment = captureEnvironment(request.environment);
  if (!sameValue(environment, manifest.environment)) fail('environment declaration drift');
  if (phase === 'prewrite') await assertCapturedResources(manifest.targets, request.mappings, 'target');
  const namespaces = await captureNamespaces(request.generated_namespaces, request.mappings);
  assertNamespacesForPhase(manifest.generated_namespaces, namespaces, phase);
  return {
    schema_version: 's22-verification/v1',
    phase,
    task_id: manifest.task_id,
    attempt_id: manifest.attempt_id,
    targets_fingerprint: await fingerprintTargets(request.targets, request.mappings),
    generated_fingerprint: await fingerprintGenerated(request.generated_namespaces, request.mappings),
  };
};

const loadRequestForFingerprint = async (requestRelativePath) => {
  const canonical = canonicalPath(requestRelativePath, 'request');
  if (!canonical.startsWith('work-products/')) fail('request must stay under work-products');
  const absolute = resolveWithin(repositoryRoot, canonical, 'request');
  await assertRegularControlFile(repositoryRoot, absolute, 'request');
  const raw = await readFile(absolute);
  let document;
  try {
    document = JSON.parse(raw);
  } catch {
    fail('request JSON is invalid');
  }
  const request = validateRequest(document);
  await assertRepositoryRoots(request.mappings);
  return request;
};

const parseOptions = (command, args) => {
  if (args.length % 2 !== 0) fail(`${command} arguments are invalid`);
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag.startsWith('--') || typeof value !== 'string' || value.length === 0 || values.has(flag)) {
      fail(`${command} arguments are invalid`);
    }
    values.set(flag, value);
  }
  return values;
};

const run = async () => {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'create') {
    const options = parseOptions(command, args);
    if (options.size !== 1 || !options.has('--request')) fail('create requires only --request');
    return createManifest(options.get('--request'));
  }
  if (command === 'verify') {
    const options = parseOptions(command, args);
    if (options.size !== 2 || !options.has('--manifest') || !options.has('--phase')) {
      fail('verify requires only --manifest and --phase');
    }
    const phase = options.get('--phase');
    if (!['prewrite', 'inputs', 'terminal'].includes(phase)) fail('verify phase is invalid');
    return verifyManifest(options.get('--manifest'), phase);
  }
  if (command === 'fingerprint') {
    const options = parseOptions(command, args);
    if (options.size !== 2 || !options.has('--request') || !options.has('--set')) {
      fail('fingerprint requires only --request and --set');
    }
    const set = options.get('--set');
    if (!['targets', 'generated'].includes(set)) fail('fingerprint set is invalid');
    const request = await loadRequestForFingerprint(options.get('--request'));
    return set === 'targets'
      ? fingerprintTargets(request.targets, request.mappings)
      : fingerprintGenerated(request.generated_namespaces, request.mappings);
  }
  fail('command must be create, verify, or fingerprint');
};

const sanitizeError = (error) => {
  let message = error instanceof Error ? error.message : 'unknown failure';
  for (const prefix of [repositoryRoot, workspaceParent]) {
    message = message.replaceAll(prefix, '<workspace>');
    message = message.replaceAll(toPosixLiteral(prefix), '<workspace>');
  }
  return message;
};

const isMainModule = typeof process.argv[1] === 'string'
  && semanticPath(resolve(process.argv[1])) === semanticPath(fileURLToPath(import.meta.url));

if (isMainModule) {
  try {
    const output = await run();
    process.stdout.write(`${JSON.stringify(output)}\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${sanitizeError(error)}\n`);
    process.exitCode = 1;
  }
}
