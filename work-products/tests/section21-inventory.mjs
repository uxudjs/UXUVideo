import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const INVENTORIES = [
  {
    name: 'root-prefix-inventory.txt',
    pattern: /UXUV-Pages/,
    negativeFile: 'work-products/tests/section21-ui-contract.test.mjs',
  },
  {
    name: 'iptv-default-source-inventory.txt',
    pattern: /IPTV|iptv|SUBSCRIPTION_SOURCES|DANMAKU_API_URL|subscriptionSources|iptvSources|danmakuApiUrl|RuntimeSourceSync|runtime-subscription-|kind:\s*["']system["']|useDanmaku/,
    negativeFile: 'work-products/tests/iptv-retirement-contract.test.mjs',
  },
];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function gitFiles(root) {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root })
    .toString('utf8').split('\0').filter(Boolean).sort();
}

export function decodeText(bytes) {
  if (bytes.subarray(0, Math.min(bytes.length, 8_192)).includes(0)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function baseClassification(path, negativeFile) {
  const normalized = path.replaceAll('\\', '/');
  if (normalized === negativeFile) return 'active-negative-test';
  if (normalized.startsWith('work-products/tests/')) return 'active-test';
  if (normalized.startsWith('work-products/')) return 'historical-evidence';
  return 'runtime';
}

export function classifyInventoryRow(name, repository, path, line, negativeFile) {
  const base = baseClassification(path, negativeFile);
  if (name !== 'root-prefix-inventory.txt') return base;
  if (repository === 'worker' && path === '_worker.js' && /https:\/\/uxudjs\.github\.io\/UXUV-Pages\//.test(line)) {
    return 'github-pages-physical';
  }
  if (repository === 'pages' && base === 'runtime') return 'worker-origin';
  return base;
}

export function inventoryRows(definition, repositories) {
  const rows = [];
  for (const repository of repositories) {
    for (const path of gitFiles(repository.root)) {
      if (path === 'work-products/todo.md' || path.startsWith('work-products/evidence/section21/')) continue;
      const absolute = join(repository.root, path);
      if (!existsSync(absolute) || lstatSync(absolute).isDirectory()) continue;
      const bytes = readFileSync(absolute);
      const text = decodeText(bytes);
      if (text === null) continue;
      const fileSha = sha256(bytes);
      text.split(/\r?\n/).forEach((line, index) => {
        definition.pattern.lastIndex = 0;
        if (!definition.pattern.test(line)) return;
        const classification = classifyInventoryRow(
          definition.name, repository.name, path, line, definition.negativeFile,
        );
        rows.push(`${repository.name}:${path}\t${index + 1}\t${classification}\t${fileSha}\t${line.trim()}`);
      });
    }
  }
  return rows.sort();
}

export function serializeInventory(planSha256, rows) {
  if (rows.length === 0) throw new Error('inventory is unexpectedly empty');
  return [
    `plan-sha256\t${planSha256}`,
    'columns\trepository:path\tline\tclassification\tfile-sha256\tmatching-line',
    ...rows,
    '',
  ].join('\n');
}
