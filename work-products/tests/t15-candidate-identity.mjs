import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const RELEASE_PREFIXES = ['app/', 'components/', 'lib/', 'public/', 'scripts/', 'types/'];
const RELEASE_ROOT_FILES = new Set([
  'eslint.config.mjs', 'next-env.d.ts', 'next.config.ts', 'package-lock.json', 'package.json',
  'playwright.config.ts', 'tsconfig.json',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function generatedFiles(root, relativeRoot) {
  const start = join(root, relativeRoot);
  if (!existsSync(start)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory).sort()) {
      const path = join(directory, entry);
      const metadata = lstatSync(path);
      if (metadata.isSymbolicLink()) throw new Error(`release scope contains a symbolic link: ${relative(root, path)}`);
      if (metadata.isDirectory()) visit(path);
      else if (metadata.isFile()) files.push(relative(root, path).replaceAll('\\', '/'));
    }
  };
  visit(start);
  return files;
}

export function pagesReleaseScopePaths(pagesRoot) {
  const repositoryFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: pagesRoot })
    .toString('utf8').split('\0').filter(Boolean)
    .filter((path) => RELEASE_ROOT_FILES.has(path) || RELEASE_PREFIXES.some((prefix) => path.startsWith(prefix)))
    .filter((path) => existsSync(join(pagesRoot, ...path.split('/'))));
  return [...new Set([
    ...repositoryFiles,
    ...generatedFiles(pagesRoot, 'out'),
    ...generatedFiles(pagesRoot, 'release/current'),
  ])].sort();
}

export function pagesReleaseIdentity(pagesRoot) {
  const paths = pagesReleaseScopePaths(pagesRoot);
  const digest = sha256(paths.map((path) => `${path}\0${sha256(readFileSync(join(pagesRoot, ...path.split('/'))))}`).join('\0'));
  return {
    fileCount: paths.length,
    sha256: digest,
    algorithm: 'sort release-scope paths; for each path hash bytes with SHA-256; hash path NUL digest records joined by NUL',
  };
}
