import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { findWebOnlyViolations } from '../../../scripts/check-web-only.mjs';
import { verificationChange } from '../../src/checks/preflight.mjs';

test('only verification-folder changes satisfy the publishing boundary', () => {
  assert.equal(verificationChange(' M verification/src/main.mjs'), true);
  assert.equal(verificationChange('?? verification/history/catalog.json'), true);
  assert.equal(verificationChange(' M package.json'), false);
  assert.equal(verificationChange(' D tests/example.test.ts'), false);
  assert.equal(verificationChange(' M .github/workflows/release.yml'), false);
});

test('renames are judged by their final destination', () => {
  assert.equal(verificationChange('R  old.test.ts -> verification/tests/regression/old.test.ts'), true);
  assert.equal(verificationChange('R  verification/old.mjs -> app/old.mjs'), false);
});

test('the complete runner repeats the workspace boundary check after all tools', () => {
  const source = fs.readFileSync(new URL('../../src/main.mjs', import.meta.url), 'utf8');
  assert.match(source, /checkWorkspaceBoundary\(ctx, 'postflight'\)/);
});

test('web-only policy rejects deployment packaging and native app surfaces', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kvideo-web-only-'));
  try {
    fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
    fs.mkdirSync(path.join(root, 'android-tv'));
    fs.mkdirSync(path.join(root, 'verification'));
    fs.writeFileSync(path.join(root, 'Dockerfile'), 'FROM scratch\n');
    fs.writeFileSync(path.join(root, '.github', 'workflows', 'cloudflare-deploy.yml'), 'name: deploy\n');
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      scripts: { 'pages:build': 'next-on-pages' },
      devDependencies: { '@cloudflare/next-on-pages': '1.0.0' },
    }));
    fs.writeFileSync(path.join(root, 'verification', 'package.json'), JSON.stringify({
      devDependencies: { wrangler: '4.0.0' },
    }));

    assert.deepEqual(findWebOnlyViolations(root), [
      '.github/workflows/cloudflare-deploy.yml',
      'Dockerfile',
      'android-tv',
      'package.json: dependency @cloudflare/next-on-pages',
      'package.json: script pages:build',
      'verification/package.json: dependency wrangler',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
