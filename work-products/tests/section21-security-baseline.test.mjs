import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const frozenSecurityTests = [
  'work-products/tests/auth-d1.test.mjs',
  'work-products/tests/security-boundary.test.mjs',
  'work-products/tests/sync-cas.test.mjs',
  'work-products/tests/d1-free-budget.test.mjs',
  'work-products/tests/free-budget.test.mjs',
  'work-products/tests/source-import-route.test.mjs',
];
const frozenSha256 = new Map([
  ['work-products/tests/auth-d1.test.mjs', 'b0bbf033f6895e626765e6f3fa588c56e6a4428e7ad9ae0fce07fd05d7a92e66'],
  ['work-products/tests/security-boundary.test.mjs', '59bffafbce13dab3b1f16d0d8aa87fbf4527b4ba1607e0fdc71ae149307d907f'],
  ['work-products/tests/sync-cas.test.mjs', '3fb27fff0173795607f29f2ba67fa25a07a2e925269ea1f4ddf2604286063ed9'],
  ['work-products/tests/d1-free-budget.test.mjs', '411e38244c77b28d97a5ee0d4b75d2243b45cabe3ac338a21ac9720dd8bd4da0'],
  ['work-products/tests/free-budget.test.mjs', 'cf1c4e3b33953b606c0e13573af5695504a1dadb8e170c2df5b3a25716aabbde'],
  ['work-products/tests/source-import-route.test.mjs', '45d0895f4d02ec8be39a46131abf48e997a8c3116ed8ecf080300dc4820d67ba'],
]);

test('S21-T01 freezes complete authentication, D1, CSRF, SSRF, CAS, import, and budget assertions', () => {
  for (const path of frozenSecurityTests) {
    const actual = createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
    assert.equal(actual, frozenSha256.get(path), path);
  }
});

test('S21-T01 keeps authentication, D1, CSRF, SSRF, CAS, import, and Free-budget baselines green', () => {
  const { NODE_TEST_CONTEXT: _nodeTestContext, ...environment } = process.env;
  const result = spawnSync(process.execPath, ['--test', ...frozenSecurityTests], {
    cwd: root,
    encoding: 'utf8',
    env: { ...environment, NO_COLOR: '1' },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /# fail 0/);
  assert.match(`${result.stdout}\n${result.stderr}`, /# tests 31/);
});
