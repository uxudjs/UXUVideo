import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { actionCoverageStatus } from '../../src/policy/action-coverage.mjs';

test('zero-control route surfaces always fail interaction coverage', () => {
  assert.equal(actionCoverageStatus({ quick: true, cappedRoutes: [], emptyRoutes: ['mobile:/'] }), 'FAIL');
});

test('action caps skip only quick runs and fail complete runs', () => {
  assert.equal(actionCoverageStatus({ quick: true, cappedRoutes: ['desktop:/settings'], emptyRoutes: [] }), 'SKIP');
  assert.equal(actionCoverageStatus({ quick: false, cappedRoutes: ['desktop:/settings'], emptyRoutes: [] }), 'FAIL');
});

test('Next production build remains part of static verification', () => {
  const source = fs.readFileSync(new URL('../../src/checks/static-tools.mjs', import.meta.url), 'utf8');
  assert.match(source, /'next-build'/);
});

test('upstream sync enforces the web-only policy before pushing main', () => {
  const source = fs.readFileSync(new URL('../../../.github/workflows/Github_Upstream_Sync.yml', import.meta.url), 'utf8');
  const policy = source.indexOf('node scripts/check-web-only.mjs');
  const push = source.indexOf('git push origin $TARGET_BRANCH');

  assert.ok(policy >= 0);
  assert.ok(push >= 0);
  assert.ok(policy < push);
});

test('action path replay verifies every expected state transition', () => {
  const source = fs.readFileSync(new URL('../../src/checks/ui-action-replay.mjs', import.meta.url), 'utf8');
  assert.match(source, /waitForTransition\(page, before\.snapshot\.hash\)/);
  assert.match(source, /current\.snapshot\.hash === expectedState\.hash/);
  assert.match(source, /stateDifference\(expectedState, current\.snapshot\)/);
  assert.match(source, /attempt <= 3/);
});
