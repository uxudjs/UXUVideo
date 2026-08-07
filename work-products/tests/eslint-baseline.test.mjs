import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const suppressionFile = new URL('../../eslint-suppressions.json', import.meta.url);

function runEslint(args = [], input) {
  return spawnSync(
    process.execPath,
    ['node_modules/eslint/bin/eslint.js', ...args],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      input,
    },
  );
}

test('ESLint baseline is bounded to the 139 legacy app errors', () => {
  const suppressions = JSON.parse(readFileSync(suppressionFile, 'utf8'));
  let count = 0;

  for (const [file, rules] of Object.entries(suppressions)) {
    assert.match(file, /^(app|components|lib)\//);
    for (const value of Object.values(rules)) {
      assert.equal(Number.isInteger(value.count), true);
      assert.equal(value.count > 0, true);
      count += value.count;
    }
  }

  assert.equal(count, 139);
  assert.equal(Object.hasOwn(suppressions, '_worker.js'), false);
});

test('repository lint succeeds with the bounded legacy baseline', () => {
  const result = runEslint();
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('the baseline does not disable rules for newly linted source', () => {
  const result = runEslint(
    ['--stdin', '--stdin-filename', 'work-products/tests/new-lint-target.ts'],
    'const value: any = 1;\nvoid value;\n',
  );

  assert.equal(result.status, 1);
  assert.match(result.stdout, /@typescript-eslint\/no-explicit-any/);
});
