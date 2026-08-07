import path from 'node:path';
import { finding } from '../core/finding.mjs';
import { request } from '../core/http.mjs';
import { writeJson } from '../core/files.mjs';

export function evaluateSecurityHeaders(headers, remote) {
  const checks = {
    contentTypeOptions: headers['x-content-type-options'] === 'nosniff',
    referrerPolicy: Boolean(headers['referrer-policy']),
    framing: Boolean(headers['x-frame-options'] || headers['content-security-policy']?.includes('frame-ancestors')),
    permissionsPolicy: Boolean(headers['permissions-policy']),
    contentSecurityPolicy: Boolean(headers['content-security-policy']),
    hsts: !remote || Boolean(headers['strict-transport-security']),
    noPoweredBy: !headers['x-powered-by'],
  };
  return { checks, missing: Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name) };
}

export function securityHeaderStatus(evaluation) {
  if (!evaluation) return 'SKIP';
  return evaluation.missing.length ? 'FAIL' : 'PASS';
}

export async function checkSecurityHeaders(ctx) {
  if (!ctx.state.appReady) return;
  const local = await request(ctx.config.localUrl);
  const remote = ctx.config.offline || !ctx.config.referenceUrl
    ? null
    : await request(ctx.config.referenceUrl);
  const localEval = evaluateSecurityHeaders(local.headers, false);
  const remoteEval = remote ? evaluateSecurityHeaders(remote.headers, true) : null;
  const assets = await Promise.all(['/manifest.json', '/sw.js', '/icon.png'].map(async (route) => ({ route, response: await request(`${ctx.config.localUrl}${route}`) })));
  const target = path.join(ctx.dirs.raw, 'security-headers.json');
  writeJson(target, { local, remote, localEval, remoteEval, assets });
  finding(ctx, {
    id: 'security.response-headers', category: 'security', title: 'Local application responses set the browser security-header baseline',
    status: securityHeaderStatus(localEval), severity: 'high', expected: 'nosniff, referrer, framing, permissions, CSP, no powered-by',
    actual: JSON.stringify({ missing: localEval.missing }),
    reason: localEval.missing.length ? 'One or more standard browser defenses are absent.' : 'The local surface provides the configured defense-in-depth headers.',
    evidence: [target], remediation: 'Define headers in Next.js or the hosting platform; use a restrictive CSP tested against required scripts.',
  });
  const remoteStatus = securityHeaderStatus(remoteEval);
  finding(ctx, {
    id: 'security.published-response-headers', category: 'security', title: 'Published responses set the browser security-header baseline',
    status: remoteStatus, severity: 'high', expected: 'Published HTTPS response with nosniff, referrer, framing, permissions, CSP, HSTS, no powered-by',
    actual: remoteEval ? JSON.stringify({ missing: remoteEval.missing })
      : ctx.config.offline ? '--offline' : '--reference-url not provided',
    reason: remoteStatus === 'SKIP' ? 'No published reference was supplied.'
      : remoteStatus === 'FAIL' ? 'One or more published browser defenses are absent.'
        : 'The published surface provides the configured defense-in-depth headers.',
    evidence: [target], remediation: 'Supply --reference-url and define missing headers on the hosting platform.',
  });
  const assetFailures = assets.filter((item) => item.response.status !== 200);
  finding(ctx, {
    id: 'runtime.pwa-assets', category: 'runtime', title: 'PWA manifest, service worker, and icon are reachable',
    status: assetFailures.length ? 'FAIL' : 'PASS', severity: 'medium', expected: 'HTTP 200 for all required PWA assets',
    actual: JSON.stringify(assets.map((item) => ({ route: item.route, status: item.response.status, bytes: item.response.bytes }))),
    reason: assetFailures.length ? 'At least one install/offline asset is missing.' : 'All declared PWA assets are served.', evidence: [target],
    remediation: 'Restore the missing public asset and verify its content type and cache behavior.',
  });
}
