import assert from 'node:assert/strict';
import test from 'node:test';

import worker, { validatePagesManifest } from '../../_worker.js';

const RELEASE_BASE_URL = 'https://uxudjs.github.io/UXUV-Pages/';
const encoder = new TextEncoder();

const defaultBodies = {
  '404.html': Buffer.from('<h1>Not found</h1>'),
  '_next/static/app.js': Buffer.from("console.log('UXUVideo');\n"),
  'index.html': Buffer.from('<h1>UXUVideo</h1>'),
  'settings/index.html': Buffer.from('<h1>Settings</h1>'),
};

function manifestFixture(overrides = {}) {
  const manifest = {
    schemaVersion: 1,
    pagesVersion: '0.2.1',
    apiContract: 1,
    workerRange: '>=1.0.0 <2.0.0',
    routes: {
      '/': 'index.html',
      '/settings': 'settings/index.html',
    },
    assets: {
      '/404.html': { path: '404.html', contentType: 'text/html; charset=utf-8' },
      '/_next/static/app.js': { path: '_next/static/app.js', contentType: 'text/javascript; charset=utf-8' },
      '/index.html': { path: 'index.html', contentType: 'text/html; charset=utf-8' },
      '/settings/index.html': { path: 'settings/index.html', contentType: 'text/html; charset=utf-8' },
    },
    ...overrides,
  };
  return structuredClone(manifest);
}

function bytes(manifest) {
  return encoder.encode(`${JSON.stringify(manifest)}\n`);
}

function chunkedBody(body, chunks, state) {
  const size = Math.max(1, Math.ceil(body.byteLength / chunks));
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      state.pulls += 1;
      if (offset >= body.byteLength) {
        controller.close();
        return;
      }
      const next = body.subarray(offset, Math.min(body.byteLength, offset + size));
      offset += next.byteLength;
      controller.enqueue(next);
      if (offset >= body.byteLength) controller.close();
    },
    cancel() {
      state.cancelled = true;
    },
  });
}

async function dispatch(path, options = {}) {
  const manifest = options.manifest ?? manifestFixture();
  const manifestBody = options.manifestBody ?? bytes(manifest);
  const bodies = { ...defaultBodies, ...options.bodies };
  const requests = [];
  const messages = [];
  const streamState = { pulls: 0, cancelled: false };
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    const outboundHeaders = new Headers(input instanceof Request ? input.headers : init.headers);
    requests.push({ url, headers: outboundHeaders, redirect: init.redirect });

    if (url === `${RELEASE_BASE_URL}release-manifest.json`) {
      if (options.manifestError) throw options.manifestError;
      return new Response(manifestBody, {
        status: options.manifestStatus ?? 200,
        headers: {
          'Content-Length': String(manifestBody.byteLength),
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    assert.equal(url.startsWith(RELEASE_BASE_URL), true, `unexpected Pages URL: ${url}`);
    const relativePath = decodeURIComponent(new URL(url).pathname).slice('/UXUV-Pages/'.length);
    const body = bodies[relativePath] ?? Buffer.from('missing');
    const asset = manifest.assets[`/${relativePath}`];
    const contentLength = options.contentLength ?? body.byteLength;
    const headers = new Headers({
      'Content-Type': options.assetContentType ?? asset?.contentType ?? 'application/octet-stream',
    });
    if (!options.omitContentLength) headers.set('Content-Length', String(contentLength));
    const responseBody = options.chunkCount
      ? chunkedBody(body, options.chunkCount, streamState)
      : body;
    return new Response(responseBody, {
      status: options.assetStatus ?? 200,
      headers,
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
    }), options.env ?? {}, {});
    return {
      response, requests, messages, streamState, manifest,
    };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }
}

test('accepts compatible Pages versions without commit, manifest SHA, or asset SHA fields', async () => {
  for (const pagesVersion of ['0.2.1', '0.3.0']) {
    const manifest = manifestFixture({ pagesVersion });
    assert.equal((await validatePagesManifest(bytes(manifest))).pagesVersion, pagesVersion);
  }

  const legacy = manifestFixture({
    pagesVersion: '0.2.2',
    gitCommit: 'a'.repeat(40),
  });
  for (const asset of Object.values(legacy.assets)) {
    asset.sha256 = 'A'.repeat(43) + '=';
    asset.sri = `sha256-${asset.sha256}`;
  }
  assert.equal((await validatePagesManifest(bytes(legacy))).pagesVersion, '0.2.2');
});

test('supports the five-case Pages compatibility migration matrix', async () => {
  const legacyManifest = manifestFixture({
    pagesVersion: '0.2.0',
    gitCommit: 'a'.repeat(40),
  });
  for (const asset of Object.values(legacyManifest.assets)) {
    asset.sha256 = 'intentionally-not-checked';
    asset.sri = 'sha256-intentionally-not-checked';
  }
  const legacy = await dispatch('/', {
    manifest: legacyManifest,
    bodies: { 'index.html': Buffer.from('legacy manifest') },
  });
  assert.equal(legacy.response.status, 200);
  assert.equal(await legacy.response.text(), 'legacy manifest');

  const currentManifest = manifestFixture({ pagesVersion: '0.2.1' });
  const current = await dispatch('/', {
    manifest: currentManifest,
    bodies: { 'index.html': Buffer.from('new manifest') },
  });
  assert.equal(current.response.status, 200);
  assert.equal(await current.response.text(), 'new manifest');

  const revised = await dispatch('/', {
    manifest: currentManifest,
    bodies: { 'index.html': Buffer.from('same version revision') },
  });
  assert.equal(revised.response.status, 200);
  assert.equal(await revised.response.text(), 'same version revision');

  const compatible = await dispatch('/', { manifest: manifestFixture({ pagesVersion: '0.3.0' }) });
  assert.equal(compatible.response.status, 200);
  assert.equal(compatible.response.headers.get('X-UXUV-Pages-Version'), '0.3.0');

  const incompatible = await dispatch('/', {
    manifest: manifestFixture({ workerRange: '>=2.0.0 <3.0.0' }),
  });
  assert.equal(incompatible.response.status, 503);
  assert.equal(JSON.parse(incompatible.messages[0]).failureReason, 'MANIFEST_RANGE_INCOMPATIBLE');
});

test('rejects invalid version and incompatible API or Worker ranges', async () => {
  await assert.rejects(
    validatePagesManifest(bytes(manifestFixture({ pagesVersion: 'latest' }))),
    /semantic version/i,
  );
  await assert.rejects(
    validatePagesManifest(bytes(manifestFixture({ apiContract: 2 }))),
    /API contract/i,
  );
  await assert.rejects(
    validatePagesManifest(bytes(manifestFixture({ workerRange: '>=2.0.0 <3.0.0' }))),
    /worker range/i,
  );
});

test('rejects unsafe manifest paths, unsupported MIME, and missing 404', async () => {
  const unsafe = manifestFixture();
  unsafe.assets['/../secret'] = { path: '../secret', contentType: 'text/plain; charset=utf-8' };
  await assert.rejects(validatePagesManifest(bytes(unsafe)), /asset metadata/i);

  for (const externalPath of [
    'https://evil.example/index.html',
    'http://169.254.169.254/latest/meta-data',
    'data:text/html,external',
    'C:/external/index.html',
  ]) {
    const external = manifestFixture();
    external.routes['/'] = externalPath;
    external.assets[`/${externalPath}`] = {
      path: externalPath,
      contentType: 'text/html; charset=utf-8',
    };
    await assert.rejects(
      validatePagesManifest(bytes(external)),
      /asset metadata/i,
      `${externalPath} escaped the fixed Pages release root`,
    );
  }

  const badMime = manifestFixture();
  badMime.assets['/index.html'].contentType = 'application/x-unsafe';
  await assert.rejects(validatePagesManifest(bytes(badMime)), /asset metadata/i);

  const missing404 = manifestFixture();
  delete missing404.assets['/404.html'];
  await assert.rejects(validatePagesManifest(bytes(missing404)), /404/i);
});

test('streams a compatible asset and reports the manifest version without forwarding credentials', async () => {
  const body = Buffer.from('x'.repeat(64));
  const manifest = manifestFixture({ pagesVersion: '0.4.3' });
  const result = await dispatch('/settings?token=must-not-leak', {
    manifest,
    bodies: { 'settings/index.html': body },
    chunkCount: 64,
  });

  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get('X-UXUV-Pages-Version'), '0.4.3');
  assert.equal(result.response.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(result.response.headers.get('Cache-Control'), 'no-cache, must-revalidate');
  assert.ok(result.streamState.pulls < 64, 'Worker buffered the complete Pages asset before returning');
  assert.deepEqual(Buffer.from(await result.response.arrayBuffer()), body);
  assert.equal(result.streamState.pulls, 64);

  assert.deepEqual(result.requests.map(({ url }) => url), [
    `${RELEASE_BASE_URL}release-manifest.json`,
    `${RELEASE_BASE_URL}settings/index.html`,
  ]);
  for (const request of result.requests) {
    assert.equal(request.redirect, 'manual');
    assert.equal(request.headers.has('Authorization'), false);
    assert.equal(request.headers.has('Cookie'), false);
  }
  assert.doesNotMatch(JSON.stringify(result.requests), /must-not-leak/);

  const entry = JSON.parse(result.messages[0]);
  assert.equal(entry.event, 'request.complete');
  assert.equal(entry.pagesVersion, '0.4.3');
});

test('fails closed on asset MIME and length boundary violations', async () => {
  const unexpectedStatus = await dispatch('/', { assetStatus: 201 });
  assert.equal(unexpectedStatus.response.status, 503);
  assert.equal(JSON.parse(unexpectedStatus.messages[0]).failureReason, 'UPSTREAM_STATUS_REJECTED');

  const wrongMime = await dispatch('/', { assetContentType: 'text/plain; charset=utf-8' });
  assert.equal(wrongMime.response.status, 503);
  assert.equal(JSON.parse(wrongMime.messages[0]).failureReason, 'ASSET_CONTENT_TYPE_MISMATCH');

  const missingCharset = await dispatch('/', { assetContentType: 'text/html' });
  assert.equal(missingCharset.response.status, 503);
  assert.equal(JSON.parse(missingCharset.messages[0]).failureReason, 'ASSET_CONTENT_TYPE_MISMATCH');

  const missingLength = await dispatch('/', { omitContentLength: true });
  assert.equal(missingLength.response.status, 503);
  assert.equal(JSON.parse(missingLength.messages[0]).failureReason, 'ASSET_LENGTH_INVALID');

  const oversized = await dispatch('/', { contentLength: 6 * 1024 * 1024 });
  assert.equal(oversized.response.status, 503);
  assert.equal(JSON.parse(oversized.messages[0]).failureReason, 'RESPONSE_TOO_LARGE');
});

test('returns the manifest 404 and fails closed on incompatible or unavailable manifests', async () => {
  const missing = await dispatch('/not-a-route');
  assert.equal(missing.response.status, 404);
  assert.deepEqual(Buffer.from(await missing.response.arrayBuffer()), defaultBodies['404.html']);
  assert.equal(JSON.parse(missing.messages[0]).errorCode, 'PAGE_NOT_FOUND');

  const incompatible = await dispatch('/', {
    manifest: manifestFixture({ workerRange: '>=2.0.0 <3.0.0' }),
  });
  assert.equal(incompatible.response.status, 503);
  assert.equal(JSON.parse(incompatible.messages[0]).failureReason, 'MANIFEST_RANGE_INCOMPATIBLE');

  const unavailable = await dispatch('/', { manifestStatus: 503 });
  assert.equal(unavailable.response.status, 503);
  assert.equal(JSON.parse(unavailable.messages[0]).failureReason, 'UPSTREAM_STATUS_REJECTED');
});
