import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDeploymentProvider,
  isCloudflareDeployment,
  isVercelDeployment,
  shouldEnableVercelAnalytics,
} from '@/lib/config/deployment';
import { getRuntimeFeaturesForProvider } from '@/lib/config/runtime-features';

test('self-hosted deployments do not enable Vercel Analytics', () => {
  const env = {};

  assert.equal(isVercelDeployment(env), false);
  assert.equal(shouldEnableVercelAnalytics(env), false);
});

test('Vercel deployments enable Vercel Analytics', () => {
  assert.equal(shouldEnableVercelAnalytics({ VERCEL: '1' }), true);
  assert.equal(shouldEnableVercelAnalytics({ VERCEL_ENV: 'production' }), true);
});

test('unrelated environment variables do not enable Vercel Analytics', () => {
  assert.equal(shouldEnableVercelAnalytics({ CI: '1' }), false);
});

test('Cloudflare environments are unsupported and fail closed', () => {
  for (const env of [
    { CF_PAGES: '1' },
    { CF_PAGES_URL: 'https://example.pages.dev' },
    { WORKERS_CI: '1' },
  ]) {
    assert.equal(isCloudflareDeployment(env), true);
    assert.equal(getDeploymentProvider(env), 'unsupported-cloudflare');
    assert.equal(shouldEnableVercelAnalytics(env), false);
  }

  const features = getRuntimeFeaturesForProvider(getDeploymentProvider({ CF_PAGES: '1' }));
  assert.equal(features.restrictedManagedDeployment, true);
  assert.equal(features.mediaProxyEnabled, false);
  assert.equal(features.iptvEnabled, false);
});

test('unsupported Cloudflare wins when Vercel-like variables coexist', () => {
  const env = { CF_PAGES: '1', VERCEL: '1', VERCEL_ENV: 'production' };

  assert.equal(isVercelDeployment(env), true);
  assert.equal(getDeploymentProvider(env), 'unsupported-cloudflare');
  assert.equal(shouldEnableVercelAnalytics(env), false);
});
