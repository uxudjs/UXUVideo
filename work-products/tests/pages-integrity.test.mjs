import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import worker, { validatePagesManifest } from '../../_worker.js';

const PAGES_REPOSITORY = fileURLToPath(new URL('../../../UXUV-Pages/', import.meta.url));
const RELEASE_REF = 'origin/gh-pages';
const RELEASE_VERSION = '0.1.2';
const RELEASE_BASE_URL = `https://uxudjs.github.io/UXUV-Pages/${RELEASE_VERSION}/`;
const RELEASE = {
  version: RELEASE_VERSION,
  gitCommit: '4bc847affa76755a5c99ce249d793aa43e0b83bb',
  manifestSha256: '27c06d4a2d3de542da0d6685fc89d8bf6d4d01f34ac52000fb8f1f3f8ec6f10c',
};

function releaseBlob(path) {
  return execFileSync('git', [
    '-C',
    PAGES_REPOSITORY,
    'show',
    `${RELEASE_REF}:${RELEASE_VERSION}/${path}`,
  ]);
}

const manifestBytes = releaseBlob('release-manifest.json');
const manifest = JSON.parse(manifestBytes.toString('utf8'));

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function contentTypeFor(path) {
  return Object.values(manifest.assets).find((asset) => asset.path === path)?.contentType
    ?? 'application/octet-stream';
}

async function dispatch(path, options = {}) {
  const messages = [];
  const requests = [];
  const redirectModes = [];
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const manifestBody = options.manifestBody ?? manifestBytes;

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    requests.push(url);
    redirectModes.push(init.redirect);

    if (url === `${RELEASE_BASE_URL}release-manifest.json`) {
      if (options.manifestError) throw options.manifestError;
      return new Response(manifestBody, {
        status: options.manifestStatus ?? 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    assert.equal(url.startsWith(RELEASE_BASE_URL), true, `unexpected Pages URL: ${url}`);
    const relativePath = decodeURIComponent(new URL(url).pathname)
      .slice(`/UXUV-Pages/${RELEASE_VERSION}/`.length);
    const status = options.assetStatus ?? 200;
    const exactBytes = status === 200 ? releaseBlob(relativePath) : Buffer.from('upstream failure');
    const body = options.mutateAsset ? options.mutateAsset(exactBytes, relativePath) : exactBytes;
    return new Response(body, {
      status,
      headers: {
        'Content-Length': String(options.contentLength ?? body.byteLength),
        'Content-Type': contentTypeFor(relativePath),
      },
    });
  };
  console.log = (message) => messages.push(String(message));

  try {
    const response = await worker.fetch(new Request(`https://worker.example${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: 'Bearer must-not-leak',
        Cookie: 'session=must-not-leak',
      },
    }), {}, {});
    return { response, requests, redirectModes, messages };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }
}

test('pins and validates the exact published release manifest bytes', async () => {
  assert.equal(sha256Hex(manifestBytes), RELEASE.manifestSha256);

  const validated = await validatePagesManifest(manifestBytes, RELEASE);

  assert.equal(validated.pagesVersion, RELEASE_VERSION);
  assert.equal(validated.gitCommit, RELEASE.gitCommit);
  assert.equal(validated.apiContract, 1);
  assert.equal(Object.keys(validated.routes).length, 8);
  assert.equal(Object.keys(validated.assets).length, 71);
});

test('serves verified HTML with fixed-version headers and no-cache policy', async () => {
  const {
    response, requests, redirectModes, messages,
  } = await dispatch('/settings?token=must-not-leak');

  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), releaseBlob('settings/index.html'));
  assert.equal(response.headers.get('Cache-Control'), 'no-cache, must-revalidate');
  assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(response.headers.get('X-UXUV-Pages-Version'), RELEASE_VERSION);
  assert.deepEqual(requests, [
    `${RELEASE_BASE_URL}release-manifest.json`,
    `${RELEASE_BASE_URL}settings/index.html`,
  ]);
  assert.deepEqual(redirectModes, ['manual', 'manual']);
  assert.doesNotMatch(requests.join('\n'), /must-not-leak/);

  assert.equal(messages.length, 1);
  const entry = JSON.parse(messages[0]);
  assert.equal(entry.event, 'request.complete');
  assert.equal(entry.routeId, 'pages');
  assert.equal(entry.status, 200);
  assert.equal(entry.pagesVersion, RELEASE_VERSION);
  assert.equal(entry.upstreamClass, 'github-pages');
});

test('maps only the fixed Pages prefix and gives hashed assets immutable caching', async () => {
  const assetPath = Object.keys(manifest.assets).find((path) => path.startsWith('/_next/static/'));
  assert.ok(assetPath);

  const { response, requests } = await dispatch(`/UXUV-Pages/${RELEASE_VERSION}${assetPath}`);

  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), releaseBlob(assetPath.slice(1)));
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
  assert.equal(requests.at(-1), `${RELEASE_BASE_URL}${assetPath.slice(1)}`);
  assert.doesNotMatch(requests.join('\n'), /\b(?:main|master|latest)\b/i);
});

test('returns the verified fixed 404 document for an unknown page', async () => {
  const { response, requests, messages } = await dispatch('/not-a-real-page');

  assert.equal(response.status, 404);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), releaseBlob('404.html'));
  assert.equal(response.headers.get('Cache-Control'), 'no-cache, must-revalidate');
  assert.equal(requests.at(-1), `${RELEASE_BASE_URL}404.html`);
  assert.equal(JSON.parse(messages[0]).errorCode, 'PAGE_NOT_FOUND');
});

test('fails closed with a built-in 503 when the manifest or asset bytes are altered', async () => {
  const tamperedManifest = Buffer.concat([manifestBytes, Buffer.from(' ')]);
  const manifestFailure = await dispatch('/', { manifestBody: tamperedManifest });
  assert.equal(manifestFailure.response.status, 503);
  assert.match(await manifestFailure.response.text(), /FRONTEND_INTEGRITY_ERROR/);
  assert.equal(manifestFailure.requests.length, 1);
  const manifestEntry = JSON.parse(manifestFailure.messages[0]);
  assert.equal(manifestEntry.event, 'frontend_integrity_error');
  assert.equal(manifestEntry.failureStage, 'manifest.validate');
  assert.equal(manifestEntry.failureReason, 'MANIFEST_SHA_MISMATCH');
  assert.doesNotMatch(manifestFailure.messages.join('\n'), /must-not-leak/);

  const assetFailure = await dispatch('/', {
    mutateAsset: (bytes) => Buffer.concat([bytes, Buffer.from('tampered')]),
  });
  assert.equal(assetFailure.response.status, 503);
  assert.match(await assetFailure.response.text(), /FRONTEND_INTEGRITY_ERROR/);
  const assetEntry = JSON.parse(assetFailure.messages[0]);
  assert.equal(assetEntry.event, 'frontend_integrity_error');
  assert.equal(assetEntry.failureStage, 'asset.validate');
  assert.equal(assetEntry.failureReason, 'ASSET_SHA_MISMATCH');
});

test('rejects incompatible manifests and transient upstream failures without unsafe fallback', async () => {
  const incompatible = {
    ...manifest,
    workerRange: '>=2.0.0 <3.0.0',
  };
  const incompatibleBytes = Buffer.from(`${JSON.stringify(incompatible, null, 2)}\n`);
  await assert.rejects(
    validatePagesManifest(incompatibleBytes, {
      ...RELEASE,
      manifestSha256: sha256Hex(incompatibleBytes),
    }),
    /worker range/i,
  );

  const upstreamFailure = await dispatch('/', { manifestStatus: 503 });
  assert.equal(upstreamFailure.response.status, 503);
  assert.equal(upstreamFailure.requests.length, 1);
  assert.doesNotMatch(upstreamFailure.requests.join('\n'), /\b(?:main|master|latest)\b/i);
  const upstreamEntry = JSON.parse(upstreamFailure.messages[0]);
  assert.equal(upstreamEntry.failureStage, 'manifest.fetch');
  assert.equal(upstreamEntry.failureReason, 'UPSTREAM_STATUS_REJECTED');

  const fetchFailure = await dispatch('/', {
    manifestError: new TypeError(
      'Network connection lost for https://example.invalid/release-manifest.json?token=must-not-leak',
    ),
  });
  assert.equal(fetchFailure.response.status, 503);
  const fetchEntry = JSON.parse(fetchFailure.messages[0]);
  assert.equal(fetchEntry.failureStage, 'manifest.fetch');
  assert.equal(fetchEntry.failureReason, 'UPSTREAM_FETCH_FAILED');
  assert.equal(fetchEntry.failureException, 'TypeError');
  assert.equal(fetchEntry.failureMessage, 'Network connection lost for <url>');
  assert.doesNotMatch(fetchFailure.messages.join('\n'), /must-not-leak/);
});

test('verifies HEAD content but returns no body and rejects oversized assets', async () => {
  const head = await dispatch('/favorites', { method: 'HEAD' });
  assert.equal(head.response.status, 200);
  assert.equal(await head.response.text(), '');

  const oversized = await dispatch('/', { contentLength: 6 * 1024 * 1024 });
  assert.equal(oversized.response.status, 503);
  assert.match(await oversized.response.text(), /FRONTEND_INTEGRITY_ERROR/);
  const oversizedEntry = JSON.parse(oversized.messages[0]);
  assert.equal(oversizedEntry.failureStage, 'asset.fetch');
  assert.equal(oversizedEntry.failureReason, 'RESPONSE_TOO_LARGE');
});
