import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const baselineUrl = new URL('../baseline.md', import.meta.url);
const workerUrl = new URL('../../_worker.js', import.meta.url);

const expectedRoutes = [
  'app/api/app-update/route.ts',
  'app/api/auth/accounts/[accountId]/route.ts',
  'app/api/auth/accounts/route.ts',
  'app/api/auth/route.ts',
  'app/api/auth/session/route.ts',
  'app/api/config/route.ts',
  'app/api/danmaku/route.ts',
  'app/api/detail/route.ts',
  'app/api/douban/image/route.ts',
  'app/api/douban/recommend/route.ts',
  'app/api/douban/tags/route.ts',
  'app/api/iptv/route.ts',
  'app/api/iptv/stream/route.ts',
  'app/api/ping/route.ts',
  'app/api/premium/category/route.ts',
  'app/api/premium/types/route.ts',
  'app/api/probe-resolution/route.ts',
  'app/api/proxy/route.ts',
  'app/api/search-parallel/route.ts',
  'app/api/user/config/route.ts',
  'app/api/user/sync/route.ts',
];

const expectedPages = [
  'app/favorites/page.tsx',
  'app/iptv/page.tsx',
  'app/page.tsx',
  'app/player/page.tsx',
  'app/premium/favorites/page.tsx',
  'app/premium/page.tsx',
  'app/premium/settings/page.tsx',
  'app/settings/page.tsx',
];

async function readContract() {
  const markdown = await readFile(baselineUrl, 'utf8');
  const match = markdown.match(
    /<!-- baseline-contract:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- baseline-contract:end -->/,
  );
  assert.ok(match, 'baseline.md must contain the machine-readable contract block');
  return JSON.parse(match[1]);
}

test('T01 baseline freezes the original route and page inventories', async () => {
  const contract = await readContract();

  assert.equal(contract.schemaVersion, 1);
  assert.deepEqual(contract.inventory.apiRoutes, expectedRoutes);
  assert.deepEqual(contract.inventory.pages, expectedPages);
  assert.equal(contract.inventory.appTests.length, 22);
  assert.ok(contract.inventory.appTests.every((file) => /^tests\/.+\.test\.ts$/.test(file)));
});

test('S21-T14 keeps the historical baseline and separately locks the final 21-route Worker surface', async () => {
  const worker = await readFile(workerUrl, 'utf8');
  const routeBlock = worker.match(/const ROUTES = \[([\s\S]*?)\r?\n\];/);
  assert.ok(routeBlock, 'Worker ROUTES block is missing');
  assert.deepEqual([...routeBlock[1].matchAll(/id: '([^']+)'/g)].map((match) => match[1]), [
    'app-update', 'auth-account', 'auth-accounts', 'auth', 'auth-session', 'config', 'danmaku', 'detail',
    'douban-image', 'douban-recommend', 'douban-tags', 'ping', 'premium-category', 'premium-types',
    'probe-resolution', 'proxy', 'search-parallel', 'source-import', 'user-config', 'user-sync', 'admin-usage',
  ]);
});

test('T01 baseline records reproducible validation results without hiding failures', async () => {
  const contract = await readContract();
  const results = new Map(contract.validations.map((entry) => [entry.id, entry]));

  assert.deepEqual([...results.keys()], [
    'app-tests-explicit',
    'lint',
    'build',
    'diff-check',
    'verification-quick',
  ]);
  for (const result of results.values()) {
    assert.match(result.command, /\S/);
    assert.ok(Number.isInteger(result.exitCode));
    assert.ok(['pass', 'fail', 'blocked'].includes(result.classification));
    assert.match(result.evidence, /\S/);
  }
  assert.equal(results.get('app-tests-explicit').classification, 'pass');
  assert.equal(results.get('diff-check').classification, 'pass');
  assert.equal(contract.knownLimitations.npmTestGlob.classification, 'existing-blocker');
});

test('T01 baseline preserves a reviewable fingerprint of pre-existing user work', async () => {
  const contract = await readContract();
  const snapshot = contract.repositories.uxuVideo;

  assert.equal(snapshot.branch, 'main');
  assert.match(snapshot.trackedDiffSha256, /^[a-f0-9]{64}$/);
  assert.ok(snapshot.status.some((line) => line === ' M README.md'));
  assert.ok(snapshot.status.some((line) => line === ' D Dockerfile'));
  assert.ok(snapshot.status.some((line) => line === '?? scripts/check-web-only.mjs'));
  assert.equal(contract.repositories.uxuvPages.initialState, 'empty-unborn-main');
});
