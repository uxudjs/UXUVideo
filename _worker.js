const WORKER_VERSION = '1.1.4';
const API_CONTRACT_VERSION = '1';
const PAGES_BASE_URL = 'https://uxudjs.github.io/UXUV-Pages/';
const PAGES_RELEASE_ROOT = new URL(PAGES_BASE_URL);
const MAX_STATIC_ASSET_BYTES = 5 * 1024 * 1024;
const PAGES_PUBLIC_PREFIX = PAGES_RELEASE_ROOT.pathname.replace(/\/$/, '');
const FRONTEND_UNAVAILABLE_HTML = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>UXUVideo 暂不可用</title><body><h1>UXUVideo 暂不可用</h1><p>FRONTEND_INTEGRITY_ERROR</p></body></html>';
const STATIC_CONTENT_TYPES = new Set([
  'application/json; charset=utf-8',
  'application/manifest+json; charset=utf-8',
  'font/woff',
  'font/woff2',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'image/x-icon',
  'text/css; charset=utf-8',
  'text/html; charset=utf-8',
  'text/javascript; charset=utf-8',
  'text/plain; charset=utf-8',
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function sha256(bytes) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export class UpstreamError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'UpstreamError';
    this.code = code;
    this.status = status;
  }
}

function ipv4Bytes(hostname) {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const bytes = parts.map(Number);
  return bytes.some((byte) => byte > 255) ? null : bytes;
}

function ipv6Bytes(hostname) {
  let host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const dotted = /(?:^|:)(\d+\.\d+\.\d+\.\d+)$/.exec(host);
  if (dotted) {
    const bytes = ipv4Bytes(dotted[1]);
    if (!bytes) return null;
    host = host.slice(0, -dotted[1].length)
      + `${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
  }
  const halves = host.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const groups = [...left, ...Array(missing).fill('0'), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.flatMap((group) => {
    const value = parseInt(group, 16);
    return [value >> 8, value & 0xff];
  });
}

function blockedIpv4(bytes) {
  const [a, b, c] = bytes;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && ((b === 0 && (c === 0 || c === 2)) || b === 168 || (b === 88 && c === 99)))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
    || (a === 203 && b === 0 && c === 113);
}

function blockedIpHostname(hostname) {
  const ipv4 = ipv4Bytes(hostname);
  if (ipv4) return blockedIpv4(ipv4);
  if (!hostname.includes(':')) return false;
  const ipv6 = ipv6Bytes(hostname);
  if (!ipv6) return true;
  const allZero = ipv6.every((byte) => byte === 0);
  const loopback = ipv6.slice(0, 15).every((byte) => byte === 0) && ipv6[15] === 1;
  const mappedIpv4 = ipv6.slice(0, 10).every((byte) => byte === 0)
    && ipv6[10] === 0xff && ipv6[11] === 0xff;
  return allZero || loopback || (ipv6[0] & 0xfe) === 0xfc
    || (ipv6[0] === 0xfe && (ipv6[1] & 0xc0) === 0x80)
    || ipv6[0] === 0xff
    || (ipv6[0] === 0x20 && ipv6[1] === 0x01 && ipv6[2] === 0x0d && ipv6[3] === 0xb8)
    || (mappedIpv4 && blockedIpv4(ipv6.slice(12)));
}

const BLOCKED_UPSTREAM_PORTS = new Set([
  '21', '22', '23', '25', '53', '110', '111', '135', '137', '138', '139', '143', '389', '445',
  '465', '512', '513', '514', '587', '993', '995', '1433', '1521', '2049', '2375', '2376',
  '3306', '3389', '5432', '5672', '6379', '8086', '9200', '11211', '27017',
]);

export function validateUpstreamUrl(input, base) {
  let url;
  try {
    url = base ? new URL(input, base) : new URL(input);
  } catch {
    throw new UpstreamError('UPSTREAM_URL_BLOCKED', 'Upstream URL is invalid.', 400);
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  const localName = hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
    || hostname === 'instance-data'
    || hostname.endsWith('.nip.io')
    || hostname.endsWith('.sslip.io');
  if (!['http:', 'https:'].includes(url.protocol)
    || url.username || url.password || !hostname || localName
    || blockedIpHostname(hostname) || BLOCKED_UPSTREAM_PORTS.has(url.port)) {
    throw new UpstreamError('UPSTREAM_URL_BLOCKED', 'Upstream URL is not allowed.', 400);
  }
  url.hash = '';
  return url;
}

export function sanitizeUpstreamHeaders(input, options = {}) {
  const source = new Headers(input);
  const headers = new Headers();
  const allowed = options.allowBodyHeaders
    ? ['accept', 'accept-language', 'content-type', 'if-modified-since', 'if-none-match', 'range']
    : ['accept', 'accept-language', 'if-modified-since', 'if-none-match', 'range'];
  for (const name of allowed) {
    const value = source.get(name);
    if (value && !/[\r\n]/.test(value)) headers.set(name, value.slice(0, 2048));
  }
  if (typeof options.userAgent === 'string' && options.userAgent.trim() && !/[\r\n]/.test(options.userAgent)) {
    headers.set('User-Agent', options.userAgent.trim().slice(0, 512));
  }
  if (typeof options.referer === 'string' && options.referer.trim()) {
    const referer = validateUpstreamUrl(options.referer.trim());
    headers.set('Referer', referer.href.slice(0, 2048));
  }
  return headers;
}

export function createRequestBudget(options = {}) {
  const maximumSubrequests = options.maxSubrequests ?? 50;
  const maximumWaiting = options.maxWaiting ?? 6;
  let subrequests = 0;
  let waiting = 0;
  return {
    begin() {
      if (subrequests >= maximumSubrequests) {
        throw new UpstreamError('SUBREQUEST_LIMIT', 'Upstream subrequest budget exhausted.', 429);
      }
      if (waiting >= maximumWaiting) {
        throw new UpstreamError('UPSTREAM_CONCURRENCY_LIMIT', 'Too many upstream responses are pending.', 429);
      }
      subrequests += 1;
      waiting += 1;
      let ended = false;
      return () => {
        if (!ended) waiting -= 1;
        ended = true;
      };
    },
    snapshot: () => ({ subrequests, waiting, maximumSubrequests, maximumWaiting }),
  };
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function controlledFetch(input, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const budget = options.budget ?? createRequestBudget();
  const maximumRedirects = options.maxRedirects ?? 3;
  let url = validateUpstreamUrl(input);
  let method = options.method ?? 'GET';
  let body = options.body;
  const headers = sanitizeUpstreamHeaders(options.headers, {
    allowBodyHeaders: body !== undefined,
    userAgent: options.userAgent,
    referer: options.referer,
  });

  for (let redirects = 0; ; redirects += 1) {
    const endWaiting = budget.begin();
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, Math.max(1, options.timeoutMs ?? 10_000));
    const externalAbort = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) externalAbort();
    else options.signal?.addEventListener('abort', externalAbort, { once: true });
    let response;
    try {
      response = await fetchImpl(url.href, { method, headers, body, redirect: 'manual', signal: controller.signal });
    } catch (error) {
      if (timedOut) throw new UpstreamError('UPSTREAM_TIMEOUT', 'Upstream response headers timed out.', 504);
      if (options.signal?.aborted) throw new UpstreamError('UPSTREAM_ABORTED', 'Upstream request was aborted.', 499);
      if (error instanceof UpstreamError) throw error;
      throw new UpstreamError('UPSTREAM_UNAVAILABLE', 'Upstream request failed.', 502);
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', externalAbort);
      endWaiting();
    }

    const location = response.headers.get('Location');
    if (!REDIRECT_STATUSES.has(response.status) || !location) return response;
    if (redirects >= maximumRedirects) {
      await response.body?.cancel();
      throw new UpstreamError('UPSTREAM_REDIRECT_LIMIT', 'Upstream redirect limit exceeded.', 502);
    }
    const next = validateUpstreamUrl(location, url);
    await response.body?.cancel();
    url = next;
    if (response.status === 303 && method !== 'HEAD') {
      method = 'GET';
      body = undefined;
      headers.delete('Content-Type');
    }
  }
}

export function limitReadableStream(stream, maximumBytes) {
  let total = 0;
  return stream.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
      total += bytes.byteLength;
      if (total > maximumBytes) {
        controller.error(new UpstreamError('UPSTREAM_BODY_TOO_LARGE', 'Upstream body exceeds the byte limit.', 413));
        return;
      }
      controller.enqueue(bytes);
    },
  }));
}

export async function readLimitedBody(response, maximumBytes) {
  const declared = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw new UpstreamError('UPSTREAM_BODY_TOO_LARGE', 'Upstream body exceeds the byte limit.', 413);
  }
  if (!response.body) return new Uint8Array();
  return new Uint8Array(await new Response(limitReadableStream(response.body, maximumBytes)).arrayBuffer());
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signUpstreamToken(secret, url, expiresAt) {
  if (typeof secret !== 'string' || secret.length < 32 || !Number.isSafeInteger(expiresAt) || expiresAt < 0) {
    throw new UpstreamError('SIGNING_UNAVAILABLE', 'Upstream signing configuration is invalid.', 503);
  }
  const payload = new TextEncoder().encode(`${expiresAt}\n${validateUpstreamUrl(url).href}`);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), payload));
  return `${expiresAt}.${bytesToBase64(signature).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

export async function verifyUpstreamToken(secret, url, token, now = Date.now()) {
  const match = /^(\d+)\.([A-Za-z0-9_-]{43})$/.exec(token ?? '');
  if (!match) return false;
  const expiresAt = Number(match[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now) return false;
  try {
    const payload = new TextEncoder().encode(`${expiresAt}\n${validateUpstreamUrl(url).href}`);
    return crypto.subtle.verify('HMAC', await hmacKey(secret), base64UrlToBytes(match[2]), payload);
  } catch {
    return false;
  }
}

export function createTokenBucket(options) {
  const entries = new Map();
  const limit = options.limit;
  const windowMs = options.windowMs;
  const now = options.now ?? Date.now;
  const maximumKeys = options.maximumKeys ?? 1024;
  return {
    consume(key) {
      const timestamp = now();
      let current = entries.get(key);
      if (!current || timestamp - current.startedAt >= windowMs) current = { startedAt: timestamp, count: 0 };
      if (!entries.has(key) && entries.size >= maximumKeys) {
        for (const [candidate, value] of entries) {
          if (timestamp - value.startedAt >= windowMs) entries.delete(candidate);
        }
        if (entries.size >= maximumKeys) return false;
      }
      if (current.count >= limit) return false;
      current.count += 1;
      entries.set(key, current);
      return true;
    },
  };
}

function compareSemver(left, right) {
  for (let index = 0; index < 3; index += 1) {
    const difference = Number(left[index]) - Number(right[index]);
    if (difference !== 0) return difference;
  }
  return 0;
}

function acceptsWorkerVersion(range) {
  const match = /^>=(\d+)\.(\d+)\.(\d+) <(\d+)\.(\d+)\.(\d+)$/.exec(range);
  const worker = /^(\d+)\.(\d+)\.(\d+)$/.exec(WORKER_VERSION);
  if (!match || !worker) return false;
  return compareSemver(worker.slice(1), match.slice(1, 4)) >= 0
    && compareSemver(worker.slice(1), match.slice(4, 7)) < 0;
}

function pagesReleaseUrl(path) {
  if (typeof path !== 'string'
    || path.length === 0
    || path.startsWith('/')
    || path.includes('\\')
    || path.includes(':')
    || path.includes('?')
    || path.includes('#')
    || path.split('/').includes('..')) return null;
  let url;
  try {
    url = new URL(path, PAGES_RELEASE_ROOT);
  } catch {
    return null;
  }
  return url.origin === PAGES_RELEASE_ROOT.origin
    && url.pathname.startsWith(PAGES_RELEASE_ROOT.pathname)
    && !url.username
    && !url.password
    && !url.search
    && !url.hash
    ? url.href
    : null;
}

function isSafeAssetPath(path) {
  return pagesReleaseUrl(path) !== null;
}

export async function validatePagesManifest(bytes) {
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('Pages manifest is not valid JSON.');
  }

  if (!isRecord(manifest)
    || manifest.schemaVersion !== 1) {
    throw new Error('Pages manifest release contract is invalid.');
  }
  if (typeof manifest.pagesVersion !== 'string'
    || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(manifest.pagesVersion)) {
    throw new Error('Pages manifest semantic version is invalid.');
  }
  if (manifest.apiContract !== Number(API_CONTRACT_VERSION)) {
    throw new Error('Pages manifest API contract is incompatible.');
  }
  if (typeof manifest.workerRange !== 'string' || !acceptsWorkerVersion(manifest.workerRange)) {
    throw new Error('Pages manifest worker range is incompatible.');
  }
  if (!isRecord(manifest.routes) || !isRecord(manifest.assets)) {
    throw new Error('Pages manifest route or asset map is invalid.');
  }

  for (const [assetKey, asset] of Object.entries(manifest.assets)) {
    if (!isRecord(asset)
      || !isSafeAssetPath(asset.path)
      || assetKey !== `/${asset.path}`
      || typeof asset.contentType !== 'string'
      || !STATIC_CONTENT_TYPES.has(asset.contentType)) {
      throw new Error('Pages manifest asset metadata is invalid.');
    }
  }

  for (const [route, assetPath] of Object.entries(manifest.routes)) {
    const routeIsCanonical = route === '/'
      || (/^\/[a-z0-9/-]+$/.test(route) && !route.endsWith('/'));
    const asset = manifest.assets[`/${assetPath}`];
    if (!routeIsCanonical
      || !isSafeAssetPath(assetPath)
      || !asset
      || asset.contentType !== 'text/html; charset=utf-8') {
      throw new Error('Pages manifest route mapping is invalid.');
    }
  }

  if (!manifest.assets['/404.html']) {
    throw new Error('Pages manifest is missing the fixed 404 document.');
  }
  return manifest;
}

export const D1_SCHEMA_VERSION = 1;

export const D1_SCHEMA_STATEMENTS = [
  {
    id: 'schema.accounts',
    sql: `CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('viewer', 'admin', 'super_admin')),
      permissions_json TEXT NOT NULL DEFAULT '[]',
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_iterations INTEGER NOT NULL CHECK (password_iterations > 0),
      session_version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  },
  {
    id: 'schema.sessions',
    sql: `CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      premium_until INTEGER,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    )`,
  },
  {
    id: 'schema.user_documents',
    sql: `CREATE TABLE IF NOT EXISTS user_documents (
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('config', 'library')),
      version INTEGER NOT NULL DEFAULT 1,
      payload_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (account_id, kind)
    )`,
  },
  {
    id: 'schema.rate_limits',
    sql: `CREATE TABLE IF NOT EXISTS rate_limits (
      bucket_key TEXT PRIMARY KEY NOT NULL,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`,
  },
  {
    id: 'schema.accounts_created_at_index',
    sql: 'CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at, id)',
  },
  {
    id: 'schema.accounts_role_index',
    sql: 'CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts(role, id)',
  },
  {
    id: 'schema.sessions_account_index',
    sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_account_created_at ON sessions(account_id, created_at, token_hash)',
  },
  {
    id: 'schema.sessions_expiry_index',
    sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at, token_hash)',
  },
  {
    id: 'schema.rate_limits_expiry_index',
    sql: 'CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at, bucket_key)',
  },
];

export const D1_QUERIES = {
  'account.by_username': {
    sql: '/* account.by_username */ SELECT id, username, display_name, role, permissions_json, password_hash, password_salt, password_iterations, session_version, created_at, updated_at FROM accounts WHERE username = ? LIMIT 1',
    expectedIndex: 'sqlite_autoindex_accounts_2',
  },
  'account.list': {
    sql: '/* account.list */ SELECT id, username, display_name, role, permissions_json, created_at, updated_at FROM accounts ORDER BY created_at, id LIMIT 8',
    expectedIndex: 'idx_accounts_created_at',
  },
  'account.super_admin_count': {
    sql: "SELECT COUNT(id) AS account_count FROM accounts WHERE role = 'super_admin' LIMIT 1",
    expectedIndex: 'idx_accounts_role',
  },
  'session.by_token': {
    sql: '/* session.by_token */ SELECT s.token_hash, s.account_id, s.premium_until, s.expires_at, s.created_at, s.last_seen_at, a.username, a.display_name, a.role, a.permissions_json, a.session_version FROM sessions AS s INNER JOIN accounts AS a ON a.id = s.account_id WHERE s.token_hash = ? LIMIT 1',
    expectedIndex: 'sqlite_autoindex_sessions_1',
  },
  'session.by_account': {
    sql: 'SELECT token_hash, expires_at, created_at, last_seen_at FROM sessions WHERE account_id = ? ORDER BY created_at DESC, token_hash LIMIT 5',
    expectedIndex: 'idx_sessions_account_created_at',
  },
  'session.expired': {
    sql: 'SELECT token_hash FROM sessions WHERE expires_at <= ? ORDER BY expires_at, token_hash LIMIT 20',
    expectedIndex: 'idx_sessions_expires_at',
  },
  'document.by_key': {
    sql: '/* document.by_key */ SELECT account_id, kind, version, payload_json, updated_at FROM user_documents WHERE account_id = ? AND kind = ? LIMIT 1',
    expectedIndex: 'sqlite_autoindex_user_documents_1',
  },
  'rate_limit.by_key': {
    sql: 'SELECT bucket_key, window_start, count, expires_at FROM rate_limits WHERE bucket_key = ? LIMIT 1',
    expectedIndex: 'sqlite_autoindex_rate_limits_1',
  },
  'rate_limit.expired': {
    sql: 'SELECT bucket_key FROM rate_limits WHERE expires_at <= ? ORDER BY expires_at, bucket_key LIMIT 20',
    expectedIndex: 'idx_rate_limits_expires_at',
  },
};

export const D1_LIMITS = {
  accounts: 8,
  sessionsPerAccount: 5,
  documentKinds: 2,
  documentMaxBytes: 512 * 1024,
  documentWriteIntervalSeconds: 60,
  sessionTouchIntervalHours: 6,
  dailyLoginAttempts: 1_000,
  dailyPremiumAttempts: 1_000,
  dailyAccountChanges: 100,
  dailyCleanupRows: 200,
  rateLimitBucketsPerAttempt: 2,
  maxRowsReadPerOperation: 20,
  storageOverheadReserveBytes: 4 * 1024 * 1024,
  writeRowsPerOperation: {
    document: 1,
    rateLimitBucket: 3,
    sessionCreate: 4,
    premiumSessionUpdate: 1,
    accountChange: 5,
    sessionTouch: 1,
    cleanup: 4,
  },
  warningRowsRead: 1_000_000,
  warningRowsWritten: 50_000,
  warningStorageBytes: 50 * 1024 * 1024,
};

export function estimateD1WorstCaseBudget() {
  const activeSessions = D1_LIMITS.accounts * D1_LIMITS.sessionsPerAccount;
  const documentWrites = D1_LIMITS.accounts
    * D1_LIMITS.documentKinds
    * (86_400 / D1_LIMITS.documentWriteIntervalSeconds);
  const rateLimitWrites = D1_LIMITS.dailyLoginAttempts
    + D1_LIMITS.dailyPremiumAttempts
    + D1_LIMITS.dailyAccountChanges;
  const sessionTouches = activeSessions * (24 / D1_LIMITS.sessionTouchIntervalHours);
  const cleanupRows = D1_LIMITS.dailyCleanupRows;
  const logicalChanges = documentWrites + rateLimitWrites + sessionTouches + cleanupRows;
  const amplification = D1_LIMITS.writeRowsPerOperation;
  const rowsWritten = (documentWrites * amplification.document)
    + (rateLimitWrites * D1_LIMITS.rateLimitBucketsPerAttempt * amplification.rateLimitBucket)
    + (D1_LIMITS.dailyLoginAttempts * amplification.sessionCreate)
    + (D1_LIMITS.dailyPremiumAttempts * amplification.premiumSessionUpdate)
    + (D1_LIMITS.dailyAccountChanges * amplification.accountChange)
    + (sessionTouches * amplification.sessionTouch)
    + (cleanupRows * amplification.cleanup);

  return {
    documentWrites,
    rateLimitWrites,
    sessionTouches,
    cleanupRows,
    logicalChanges,
    rowsRead: logicalChanges * D1_LIMITS.maxRowsReadPerOperation,
    rowsWritten,
    storageBytes: (D1_LIMITS.accounts * D1_LIMITS.documentKinds * D1_LIMITS.documentMaxBytes)
      + D1_LIMITS.storageOverheadReserveBytes,
  };
}

const schemaInitializationByDatabase = new WeakMap();

function d1MetricValue(result, name) {
  const value = Number(result?.meta?.[name] ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function logD1Query(requestId, queryId, result, startedAt) {
  console.log(JSON.stringify({
    event: 'd1.query',
    requestId,
    queryId,
    rowsRead: d1MetricValue(result, 'rows_read'),
    rowsWritten: d1MetricValue(result, 'rows_written'),
    durationMs: Math.max(0, d1MetricValue(result, 'duration') || (Date.now() - startedAt)),
  }));
}

async function initializeSchema(db, requestId) {
  const startedAt = Date.now();
  const statements = D1_SCHEMA_STATEMENTS.map(({ sql }) => db.prepare(sql));
  const results = await db.batch(statements);
  if (!Array.isArray(results)
    || results.length !== statements.length
    || results.some((result) => result?.success === false)) {
    throw new Error('D1 schema initialization failed.');
  }
  results.forEach((result, index) => {
    logD1Query(requestId, D1_SCHEMA_STATEMENTS[index].id, result, startedAt);
  });
  return D1_SCHEMA_VERSION;
}

export async function ensureSchema(env, requestId) {
  const db = env?.DB;
  if (!db || typeof db !== 'object'
    || typeof db.prepare !== 'function'
    || typeof db.batch !== 'function') {
    throw new Error('D1 binding DB is unavailable.');
  }

  let initialization = schemaInitializationByDatabase.get(db);
  if (!initialization) {
    initialization = initializeSchema(db, requestId);
    schemaInitializationByDatabase.set(db, initialization);
    initialization.catch(() => schemaInitializationByDatabase.delete(db));
  }
  return initialization;
}

function storageErrorCode(error) {
  const diagnostic = `${error?.name ?? ''} ${error?.code ?? ''} ${error?.message ?? ''}`;
  return /quota|sqlite_full|database or disk is full|storage limit/i.test(diagnostic)
    ? 'STORAGE_QUOTA_EXCEEDED'
    : 'STORAGE_UNAVAILABLE';
}

const AUTH_COOKIE_NAME = '__Host-uxuv_session';
const AUTH_BODY_MAX_BYTES = 16 * 1024;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_BYTES = 32;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const ACCOUNT_ROLES = new Set(['viewer', 'admin', 'super_admin']);
const ACCOUNT_PERMISSIONS = new Set([
  'source_management',
  'account_management',
  'danmaku_api',
  'data_management',
  'player_settings',
  'danmaku_appearance',
  'view_settings',
  'iptv_access',
  'iptv_source_management',
  'iptv_builtin_sources',
]);
let lastSessionCreatedAt = 0;

const AUTH_SQL = {
  insertBootstrapAccount: `/* account.insert_bootstrap */ INSERT INTO accounts (
    id, username, display_name, role, permissions_json, password_hash,
    password_salt, password_iterations, session_version, created_at, updated_at
  ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  WHERE NOT EXISTS (SELECT id FROM accounts LIMIT 1)
  RETURNING id, username, display_name, role, permissions_json, password_hash,
    password_salt, password_iterations, session_version, created_at, updated_at`,
  getAccountById: `/* account.by_id */ SELECT id, username, display_name, role,
    permissions_json, password_hash, password_salt, password_iterations,
    session_version, created_at, updated_at FROM accounts WHERE id = ? LIMIT 1`,
  insertAccount: `/* account.insert */ INSERT INTO accounts (
    id, username, display_name, role, permissions_json, password_hash,
    password_salt, password_iterations, session_version, created_at, updated_at
  ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?
  WHERE (SELECT COUNT(id) FROM accounts) < ?
    AND NOT EXISTS (SELECT id FROM accounts WHERE username = ? LIMIT 1)
  RETURNING id, username, display_name, role, permissions_json, created_at, updated_at`,
  updateAccount: `/* account.update */ UPDATE accounts SET
    display_name = ?, role = ?, permissions_json = ?,
    password_hash = COALESCE(?, password_hash),
    password_salt = COALESCE(?, password_salt),
    password_iterations = COALESCE(?, password_iterations),
    session_version = session_version + CASE WHEN ? IS NULL THEN 0 ELSE 1 END,
    updated_at = ?
  WHERE id = ? AND (
    role != 'super_admin' OR ? = 'super_admin' OR EXISTS (
      SELECT id FROM accounts WHERE role = 'super_admin' AND id != ? LIMIT 1
    )
  )
  RETURNING id, username, display_name, role, permissions_json, session_version,
    created_at, updated_at`,
  deleteAccount: `/* account.delete */ DELETE FROM accounts
    WHERE id = ? AND (
      role != 'super_admin' OR EXISTS (
        SELECT id FROM accounts WHERE role = 'super_admin' AND id != ? LIMIT 1
      )
    ) RETURNING id`,
  insertSession: `/* session.insert */ INSERT INTO sessions (
    token_hash, account_id, premium_until, expires_at, created_at, last_seen_at
  ) VALUES (?, ?, ?, ?, ?, ?)`,
  trimSessions: `/* session.trim */ DELETE FROM sessions
    WHERE account_id = ? AND token_hash NOT IN (
      SELECT token_hash FROM sessions WHERE account_id = ?
      ORDER BY created_at DESC, token_hash DESC LIMIT ?
    )`,
  deleteSession: '/* session.delete_token */ DELETE FROM sessions WHERE token_hash = ?',
  deleteAccountSessions: `/* session.delete_account */ DELETE FROM sessions
    WHERE account_id = ? AND EXISTS (
      SELECT id FROM accounts WHERE id = ? AND updated_at = ? AND session_version = ?
    )`,
  setPremium: `/* session.premium */ UPDATE sessions SET premium_until = ?
    WHERE token_hash = ? AND expires_at > ? RETURNING premium_until`,
  touchSession: `/* session.touch */ UPDATE sessions SET last_seen_at = ?
    WHERE token_hash = ? AND last_seen_at <= ?`,
  consumeRateLimit: `/* rate_limit.consume */ INSERT INTO rate_limits (
    bucket_key, window_start, count, expires_at
  ) VALUES (?, ?, 1, ?)
  ON CONFLICT(bucket_key) DO UPDATE SET
    window_start = excluded.window_start,
    count = CASE
      WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1
      ELSE 1
    END,
    expires_at = excluded.expires_at
  WHERE rate_limits.window_start != excluded.window_start OR rate_limits.count < ?
  RETURNING bucket_key, window_start, count, expires_at`,
  writeDocument: `/* document.cas */ INSERT INTO user_documents (
    account_id, kind, version, payload_json, updated_at
  ) VALUES (?, ?, 1, ?, ?)
  ON CONFLICT(account_id, kind) DO UPDATE SET
    version = user_documents.version + 1,
    payload_json = excluded.payload_json,
    updated_at = excluded.updated_at
  WHERE user_documents.version = ? AND user_documents.updated_at <= ?
  RETURNING account_id, kind, version, payload_json, updated_at`,
};

async function executeD1(db, requestId, queryId, sql, bindings = []) {
  const startedAt = Date.now();
  const statement = db.prepare(sql).bind(...bindings);
  const result = await statement.all();
  if (!result || result.success === false || !Array.isArray(result.results)) {
    throw new Error('D1 query failed.');
  }
  logD1Query(requestId, queryId, result, startedAt);
  return result;
}

async function executeD1Batch(db, requestId, specifications) {
  const startedAt = Date.now();
  const statements = specifications.map(({ sql, bindings }) => db.prepare(sql).bind(...bindings));
  const results = await db.batch(statements);
  if (!Array.isArray(results)
    || results.length !== statements.length
    || results.some((result) => result?.success === false)) {
    throw new Error('D1 transaction failed.');
  }
  results.forEach((result, index) => {
    logD1Query(requestId, specifications[index].queryId, result, startedAt);
  });
  return results;
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function randomToken(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function hashToken(token) {
  return bytesToBase64Url(await sha256(new TextEncoder().encode(token)));
}

function equalBytes(left, right) {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function equalSecrets(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    sha256(encoder.encode(left)),
    sha256(encoder.encode(right)),
  ]);
  return equalBytes(leftHash, rightHash);
}

async function derivePasswordHash(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: encoder.encode(salt),
  }, key, PBKDF2_KEY_BYTES * 8);
  return bytesToBase64Url(new Uint8Array(bits));
}

async function hashPassword(password) {
  const salt = randomToken(16);
  return {
    hash: await derivePasswordHash(password, salt),
    salt,
    iterations: PBKDF2_ITERATIONS,
  };
}

async function verifyPassword(password, account) {
  if (account.password_iterations !== PBKDF2_ITERATIONS) return false;
  const actual = await derivePasswordHash(password, account.password_salt);
  return equalSecrets(actual, account.password_hash);
}

function normalizeUsername(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '')
    : '';
}

async function readJsonBody(request, maximumBytes = AUTH_BODY_MAX_BYTES) {
  const declaredLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) return null;
  try {
    const value = JSON.parse(text);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function cookieValue(request, name) {
  const cookie = request.headers.get('Cookie') ?? '';
  for (const entry of cookie.split(';')) {
    const [key, ...value] = entry.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

function sessionCookie(token, persist) {
  return `${AUTH_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/${persist ? `; Max-Age=${SESSION_MAX_AGE_SECONDS}` : ''}`;
}

function clearedSessionCookie() {
  return `${AUTH_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function accountFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.display_name,
    role: row.role,
    customPermissions: JSON.parse(row.permissions_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function jsonRequest(request) {
  return /^application\/json\b/i.test(request.headers.get('Content-Type') ?? '');
}

function normalizedPermissions(value) {
  if (!Array.isArray(value) || value.some((permission) => !ACCOUNT_PERMISSIONS.has(permission))) {
    return null;
  }
  return [...new Set(value)];
}

function accountCreateInput(body) {
  const username = normalizeUsername(body?.username);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = typeof body?.role === 'string' ? body.role : '';
  const permissions = normalizedPermissions(body?.customPermissions ?? []);
  if (!username
    || username.length > 64
    || !name
    || name.length > 80
    || password.length < 8
    || password.length > 256
    || !ACCOUNT_ROLES.has(role)
    || !permissions) {
    return null;
  }
  return { username, name, password, role, permissions };
}

function accountPatchInput(body, current) {
  if (!isRecord(body) || Object.keys(body).length === 0 || Object.hasOwn(body, 'username')) return null;
  const name = Object.hasOwn(body, 'name')
    ? typeof body.name === 'string' ? body.name.trim() : ''
    : current.display_name;
  const role = Object.hasOwn(body, 'role') ? body.role : current.role;
  const permissions = Object.hasOwn(body, 'customPermissions')
    ? normalizedPermissions(body.customPermissions)
    : JSON.parse(current.permissions_json);
  const password = Object.hasOwn(body, 'password') ? body.password : null;
  if (!name
    || name.length > 80
    || typeof role !== 'string'
    || !ACCOUNT_ROLES.has(role)
    || !permissions
    || (password !== null && (typeof password !== 'string' || password.length < 8 || password.length > 256))) {
    return null;
  }
  return { name, role, permissions, password };
}

function publicSession(session) {
  return {
    accountId: session.account_id,
    profileId: session.account_id,
    username: session.username,
    name: session.display_name,
    role: session.role,
    customPermissions: JSON.parse(session.permissions_json),
    mode: 'managed',
  };
}

async function getAccountByUsername(db, requestId, username) {
  const result = await executeD1(
    db,
    requestId,
    'account.by_username',
    D1_QUERIES['account.by_username'].sql,
    [username],
  );
  return result.results[0] ?? null;
}

async function listAccountRows(db, requestId) {
  const result = await executeD1(
    db,
    requestId,
    'account.list',
    D1_QUERIES['account.list'].sql,
  );
  return result.results;
}

async function getAccountById(db, requestId, accountId) {
  const result = await executeD1(
    db,
    requestId,
    'account.by_id',
    AUTH_SQL.getAccountById,
    [accountId],
  );
  return result.results[0] ?? null;
}

async function bootstrapAccount(env, requestId, username, password, now) {
  const adminUsername = normalizeUsername(env.ADMIN_USERNAME || 'admin') || 'admin';
  if (username !== adminUsername || !(await equalSecrets(password, env.ADMIN_PASSWORD))) return null;
  if ((await listAccountRows(env.DB, requestId)).length > 0) return null;

  const credential = await hashPassword(password);
  const id = crypto.randomUUID();
  const result = await executeD1(
    env.DB,
    requestId,
    'account.insert_bootstrap',
    AUTH_SQL.insertBootstrapAccount,
    [
      id,
      username,
      env.ADMIN_DISPLAY_NAME || 'Administrator',
      'super_admin',
      '[]',
      credential.hash,
      credential.salt,
      credential.iterations,
      1,
      now,
      now,
    ],
  );
  return result.results[0] ?? getAccountByUsername(env.DB, requestId, username);
}

async function rateLimitBucketKey(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function consumeRateLimit(request, env, requestId, scope, subject, maximum, dailyMaximum) {
  const now = Date.now();
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  const dayStart = Math.floor(now / 86_400_000) * 86_400_000;
  const actor = request.headers.get('CF-Connecting-IP') || 'unknown';
  const [windowHash, dailyHash] = await Promise.all([
    rateLimitBucketKey(env.AUTH_SECRET, `${scope}:window:${actor}:${subject}`),
    rateLimitBucketKey(env.AUTH_SECRET, `${scope}:daily:${dayStart}`),
  ]);
  const results = await executeD1Batch(env.DB, requestId, [
    {
      queryId: `rate_limit.${scope}.window`,
      sql: AUTH_SQL.consumeRateLimit,
      bindings: [`rl:${scope}:w:${windowHash}`, windowStart, windowStart + (2 * RATE_LIMIT_WINDOW_MS), maximum],
    },
    {
      queryId: `rate_limit.${scope}.daily`,
      sql: AUTH_SQL.consumeRateLimit,
      bindings: [`rl:${scope}:d:${dailyHash}`, dayStart, dayStart + (2 * 86_400_000), dailyMaximum],
    },
  ]);
  return results.every((result) => result.results.length === 1);
}

async function createSession(env, requestId, account, now) {
  const token = randomToken(32);
  const tokenHash = await hashToken(token);
  const createdAt = Math.max(now, lastSessionCreatedAt + 1);
  lastSessionCreatedAt = createdAt;
  const expiresAt = now + (SESSION_MAX_AGE_SECONDS * 1000);
  await executeD1Batch(env.DB, requestId, [
    {
      queryId: 'session.insert',
      sql: AUTH_SQL.insertSession,
      bindings: [tokenHash, account.id, null, expiresAt, createdAt, now],
    },
    {
      queryId: 'session.trim',
      sql: AUTH_SQL.trimSessions,
      bindings: [account.id, account.id, D1_LIMITS.sessionsPerAccount],
    },
  ]);
  return { token, expiresAt };
}

async function getAuthSession(request, env, requestId) {
  const token = cookieValue(request, AUTH_COOKIE_NAME);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = await hashToken(token);
  const result = await executeD1(
    env.DB,
    requestId,
    'session.by_token',
    D1_QUERIES['session.by_token'].sql,
    [tokenHash],
  );
  const session = result.results[0];
  if (!session) return null;

  const now = Date.now();
  if (session.expires_at <= now) {
    await executeD1(env.DB, requestId, 'session.delete_expired', AUTH_SQL.deleteSession, [tokenHash]);
    return null;
  }
  if (session.last_seen_at <= now - (D1_LIMITS.sessionTouchIntervalHours * 60 * 60 * 1000)) {
    await executeD1(
      env.DB,
      requestId,
      'session.touch',
      AUTH_SQL.touchSession,
      [now, tokenHash, now - (D1_LIMITS.sessionTouchIntervalHours * 60 * 60 * 1000)],
    );
  }
  return { ...session, tokenHash };
}

function rateLimitedResult(requestId, routeId) {
  const result = authFailureResult(
    requestId,
    routeId,
    429,
    'RATE_LIMITED',
    'Too many attempts. Try again later.',
  );
  result.response.headers.set('Retry-After', '60');
  return result;
}

async function handleLogin(request, env, requestId, body) {
  const username = normalizeUsername(body?.username || env.ADMIN_USERNAME || 'admin');
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username || !password || password.length > 256) {
    return authFailureResult(requestId, 'auth', 400, 'INVALID_REQUEST', 'Username and password are required.');
  }
  if (!(await consumeRateLimit(
    request,
    env,
    requestId,
    'login',
    username,
    5,
    D1_LIMITS.dailyLoginAttempts,
  ))) {
    return rateLimitedResult(requestId, 'auth');
  }

  const now = Date.now();
  let account = await getAccountByUsername(env.DB, requestId, username);
  if (!account) account = await bootstrapAccount(env, requestId, username, password, now);
  if (!account || !(await verifyPassword(password, account))) {
    return authFailureResult(requestId, 'auth', 401, 'INVALID_CREDENTIALS', 'Invalid credentials.');
  }

  const session = await createSession(env, requestId, account, now);
  const response = jsonResponse({
    valid: true,
    session: publicSession({ ...account, account_id: account.id }),
    ...authConfig(env),
  }, requestId, 200, {
    'Set-Cookie': sessionCookie(session.token, env.PERSIST_SESSION !== 'false'),
  });
  return { routeId: 'auth', errorCode: null, response };
}

async function handlePremiumUnlock(request, env, requestId, body) {
  const session = await getAuthSession(request, env, requestId);
  if (!session) {
    return authFailureResult(requestId, 'auth', 401, 'AUTH_REQUIRED', 'Authentication is required.');
  }
  if (!(await consumeRateLimit(
    request,
    env,
    requestId,
    'premium',
    session.account_id,
    10,
    D1_LIMITS.dailyPremiumAttempts,
  ))) {
    return rateLimitedResult(requestId, 'auth');
  }

  const configuredPassword = typeof env.PREMIUM_PASSWORD === 'string' ? env.PREMIUM_PASSWORD : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const bypass = session.role === 'admin' || session.role === 'super_admin' || !configuredPassword;
  if (!bypass && (!password || password.length > 256
    || !(await equalSecrets(password, configuredPassword)))) {
    return authFailureResult(
      requestId,
      'auth',
      401,
      'INVALID_PREMIUM_CREDENTIALS',
      'Invalid Premium credentials.',
    );
  }

  if (!bypass) {
    const now = Date.now();
    const result = await executeD1(
      env.DB,
      requestId,
      'session.premium',
      AUTH_SQL.setPremium,
      [session.expires_at, session.tokenHash, now],
    );
    if (result.results.length === 0) {
      return authFailureResult(requestId, 'auth', 401, 'AUTH_REQUIRED', 'Authentication is required.');
    }
  }
  return {
    routeId: 'auth',
    errorCode: null,
    response: jsonResponse({ valid: true }, requestId),
  };
}

async function handleSession(request, env, requestId) {
  if (request.method === 'GET') {
    const session = await getAuthSession(request, env, requestId);
    return {
      routeId: 'auth-session',
      errorCode: null,
      response: jsonResponse(session
        ? { authenticated: true, session: publicSession(session) }
        : { authenticated: false, session: null }, requestId),
    };
  }

  const token = cookieValue(request, AUTH_COOKIE_NAME);
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    await executeD1(env.DB, requestId, 'session.delete_token', AUTH_SQL.deleteSession, [await hashToken(token)]);
  }
  return {
    routeId: 'auth-session',
    errorCode: null,
    response: jsonResponse({ success: true }, requestId, 200, {
      'Set-Cookie': clearedSessionCookie(),
    }),
  };
}

async function requireSuperAdmin(request, env, requestId, routeId) {
  const session = await getAuthSession(request, env, requestId);
  if (!session) {
    return { failure: authFailureResult(requestId, routeId, 401, 'AUTH_REQUIRED', 'Authentication is required.') };
  }
  if (session.role !== 'super_admin') {
    return { failure: authFailureResult(requestId, routeId, 403, 'SUPER_ADMIN_REQUIRED', 'Super admin access is required.') };
  }
  return { session };
}

async function accountChangeAllowed(request, env, requestId, session, routeId) {
  const allowed = await consumeRateLimit(
    request,
    env,
    requestId,
    'account',
    session.account_id,
    10,
    D1_LIMITS.dailyAccountChanges,
  );
  return allowed ? null : rateLimitedResult(requestId, routeId);
}

async function handleAccountsCollection(request, env, requestId) {
  const authorization = await requireSuperAdmin(request, env, requestId, 'auth-accounts');
  if (authorization.failure) return authorization.failure;

  if (request.method === 'GET') {
    const accounts = (await listAccountRows(env.DB, requestId)).map(accountFromRow);
    return {
      routeId: 'auth-accounts',
      errorCode: null,
      response: jsonResponse({
        loginMode: 'managed',
        managed: true,
        accounts,
        totalCount: accounts.length,
      }, requestId),
    };
  }

  if (!jsonRequest(request)) {
    return authFailureResult(requestId, 'auth-accounts', 415, 'UNSUPPORTED_MEDIA_TYPE', 'JSON is required.');
  }
  const limited = await accountChangeAllowed(
    request,
    env,
    requestId,
    authorization.session,
    'auth-accounts',
  );
  if (limited) return limited;
  const input = accountCreateInput(await readJsonBody(request));
  if (!input) {
    return authFailureResult(requestId, 'auth-accounts', 400, 'INVALID_ACCOUNT', 'Account fields are invalid.');
  }
  if (await getAccountByUsername(env.DB, requestId, input.username)) {
    return authFailureResult(requestId, 'auth-accounts', 409, 'USERNAME_EXISTS', 'Username already exists.');
  }

  const now = Date.now();
  const credential = await hashPassword(input.password);
  const result = await executeD1(env.DB, requestId, 'account.insert', AUTH_SQL.insertAccount, [
    crypto.randomUUID(),
    input.username,
    input.name,
    input.role,
    JSON.stringify(input.permissions),
    credential.hash,
    credential.salt,
    credential.iterations,
    now,
    now,
    D1_LIMITS.accounts,
    input.username,
  ]);
  const account = result.results[0];
  if (!account) {
    const code = await getAccountByUsername(env.DB, requestId, input.username)
      ? 'USERNAME_EXISTS'
      : 'ACCOUNT_LIMIT_REACHED';
    return authFailureResult(
      requestId,
      'auth-accounts',
      409,
      code,
      code === 'USERNAME_EXISTS' ? 'Username already exists.' : 'Account limit reached.',
    );
  }
  return {
    routeId: 'auth-accounts',
    errorCode: null,
    response: jsonResponse({ account: accountFromRow(account) }, requestId, 201),
  };
}

function accountIdFromRequest(request) {
  const value = normalizePath(new URL(request.url).pathname).split('/').at(-1) ?? '';
  return /^[A-Za-z0-9-]{1,64}$/.test(value) ? value : null;
}

async function handleAccountItem(request, env, requestId) {
  const authorization = await requireSuperAdmin(request, env, requestId, 'auth-account');
  if (authorization.failure) return authorization.failure;
  const accountId = accountIdFromRequest(request);
  const current = accountId ? await getAccountById(env.DB, requestId, accountId) : null;
  if (!current) {
    return authFailureResult(requestId, 'auth-account', 404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
  }
  const limited = await accountChangeAllowed(
    request,
    env,
    requestId,
    authorization.session,
    'auth-account',
  );
  if (limited) return limited;

  if (request.method === 'DELETE') {
    const result = await executeD1(
      env.DB,
      requestId,
      'account.delete',
      AUTH_SQL.deleteAccount,
      [accountId, accountId],
    );
    if (result.results.length === 0) {
      return authFailureResult(
        requestId,
        'auth-account',
        409,
        'LAST_SUPER_ADMIN',
        'The last super admin cannot be deleted.',
      );
    }
    return {
      routeId: 'auth-account',
      errorCode: null,
      response: jsonResponse({ success: true }, requestId),
    };
  }

  if (!jsonRequest(request)) {
    return authFailureResult(requestId, 'auth-account', 415, 'UNSUPPORTED_MEDIA_TYPE', 'JSON is required.');
  }
  const input = accountPatchInput(await readJsonBody(request), current);
  if (!input) {
    return authFailureResult(requestId, 'auth-account', 400, 'INVALID_ACCOUNT', 'Account fields are invalid.');
  }
  const credential = input.password === null ? null : await hashPassword(input.password);
  const now = Date.now();
  const updateBindings = [
    input.name,
    input.role,
    JSON.stringify(input.permissions),
    credential?.hash ?? null,
    credential?.salt ?? null,
    credential?.iterations ?? null,
    credential?.hash ?? null,
    now,
    accountId,
    input.role,
    accountId,
  ];
  const result = credential
    ? (await executeD1Batch(env.DB, requestId, [
      { queryId: 'account.update', sql: AUTH_SQL.updateAccount, bindings: updateBindings },
      {
        queryId: 'session.delete_account',
        sql: AUTH_SQL.deleteAccountSessions,
        bindings: [accountId, accountId, now, current.session_version + 1],
      },
    ]))[0]
    : await executeD1(env.DB, requestId, 'account.update', AUTH_SQL.updateAccount, updateBindings);
  const account = result.results[0];
  if (!account) {
    return authFailureResult(
      requestId,
      'auth-account',
      409,
      'LAST_SUPER_ADMIN',
      'The last super admin cannot be demoted.',
    );
  }
  return {
    routeId: 'auth-account',
    errorCode: null,
    response: jsonResponse({ account: accountFromRow(account) }, requestId),
  };
}

async function handleAuthRoute(request, env, requestId, route) {
  if (route.id === 'admin-usage') return handleAdminUsage(request, env, requestId);
  if (route.id === 'config') return handleRuntimeConfig(request, env, requestId);
  if (route.id === 'user-config' || route.id === 'user-sync') {
    return handleUserDocument(request, env, requestId, route);
  }
  if (LOW_FANOUT_ROUTE_IDS.has(route.id)) return handleLowFanoutRoute(request, env, requestId, route);
  if (HIGH_FANOUT_ROUTE_IDS.has(route.id)) return handleHighFanoutRoute(request, env, requestId, route);
  if (MEDIA_ROUTE_IDS.has(route.id)) return handleMediaRoute(request, env, requestId, route);
  if (route.id === 'auth') {
    if (request.method === 'GET') {
      return { routeId: route.id, errorCode: null, response: jsonResponse(authConfig(env), requestId) };
    }
    const bodyType = request.headers.get('Content-Type') ?? '';
    if (!/^application\/json\b/i.test(bodyType)) {
      return authFailureResult(requestId, route.id, 415, 'UNSUPPORTED_MEDIA_TYPE', 'JSON is required.');
    }
    const body = await readJsonBody(request);
    if (!body) {
      return authFailureResult(requestId, route.id, 400, 'INVALID_REQUEST', 'Request body is invalid.');
    }
    return body.type === 'premium'
      ? handlePremiumUnlock(request, env, requestId, body)
      : handleLogin(request, env, requestId, body);
  }
  if (route.id === 'auth-session') return handleSession(request, env, requestId);
  if (route.id === 'auth-accounts') return handleAccountsCollection(request, env, requestId);
  if (route.id === 'auth-account') return handleAccountItem(request, env, requestId);
  return null;
}

const ROUTES = [
  { id: 'app-update', pattern: /^\/api\/app-update$/, methods: ['GET'] },
  { id: 'auth-account', pattern: /^\/api\/auth\/accounts\/[^/]+$/, methods: ['PATCH', 'DELETE'] },
  { id: 'auth-accounts', pattern: /^\/api\/auth\/accounts$/, methods: ['GET', 'POST'] },
  { id: 'auth', pattern: /^\/api\/auth$/, methods: ['GET', 'POST'] },
  { id: 'auth-session', pattern: /^\/api\/auth\/session$/, methods: ['GET', 'DELETE'] },
  { id: 'config', pattern: /^\/api\/config$/, methods: ['GET'] },
  { id: 'danmaku', pattern: /^\/api\/danmaku$/, methods: ['GET', 'OPTIONS'] },
  { id: 'detail', pattern: /^\/api\/detail$/, methods: ['GET', 'POST'] },
  { id: 'douban-image', pattern: /^\/api\/douban\/image$/, methods: ['GET'] },
  { id: 'douban-recommend', pattern: /^\/api\/douban\/recommend$/, methods: ['GET'] },
  { id: 'douban-tags', pattern: /^\/api\/douban\/tags$/, methods: ['GET'] },
  { id: 'iptv', pattern: /^\/api\/iptv$/, methods: ['GET'] },
  { id: 'iptv-stream', pattern: /^\/api\/iptv\/stream$/, methods: ['GET', 'OPTIONS'] },
  { id: 'ping', pattern: /^\/api\/ping$/, methods: ['POST'] },
  { id: 'premium-category', pattern: /^\/api\/premium\/category$/, methods: ['GET', 'POST'] },
  { id: 'premium-types', pattern: /^\/api\/premium\/types$/, methods: ['GET', 'POST'] },
  { id: 'probe-resolution', pattern: /^\/api\/probe-resolution$/, methods: ['POST'], sse: true },
  { id: 'proxy', pattern: /^\/api\/proxy$/, methods: ['GET', 'OPTIONS'] },
  { id: 'search-parallel', pattern: /^\/api\/search-parallel$/, methods: ['POST'], sse: true },
  { id: 'source-import', pattern: /^\/api\/source-import$/, methods: ['POST'] },
  { id: 'user-config', pattern: /^\/api\/user\/config$/, methods: ['GET', 'POST'] },
  { id: 'user-sync', pattern: /^\/api\/user\/sync$/, methods: ['GET', 'POST'] },
  { id: 'admin-usage', pattern: /^\/api\/admin\/usage$/, methods: ['GET'] },
];

const AUTH_ROUTE_IDS = new Set([
  'auth',
  'auth-session',
  'auth-accounts',
  'auth-account',
  'premium-category',
  'premium-types',
]);
const DOCUMENT_ROUTE_IDS = new Set(['user-config', 'user-sync']);
const ADMIN_ROUTE_IDS = new Set(['admin-usage']);
const LOW_FANOUT_ROUTE_IDS = new Set([
  'app-update', 'danmaku', 'detail', 'douban-image', 'douban-recommend', 'douban-tags', 'ping', 'source-import',
]);

function normalizePath(pathname) {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '') || '/';
}

function responseHeaders(requestId, contentType, options = {}) {
  const headers = new Headers({
    'Cache-Control': options.cacheControl ?? 'no-store',
    'Content-Type': contentType,
    'X-Request-Id': requestId,
    'X-UXUV-Worker-Version': WORKER_VERSION,
    'X-UXUV-API-Contract': API_CONTRACT_VERSION,
  });
  if (options.pagesVersion) headers.set('X-UXUV-Pages-Version', options.pagesVersion);
  if (options.allow) headers.set('Allow', options.allow);
  return headers;
}

function errorResponse({ requestId, status, code, message, details = null, sse = false, allow, head = false }) {
  const payload = JSON.stringify({
    error: { code, message, requestId, details },
  });
  const contentType = sse
    ? 'text/event-stream; charset=utf-8'
    : 'application/json; charset=utf-8';
  const body = head ? null : sse ? `event: error\ndata: ${payload}\n\n` : payload;
  return new Response(body, {
    status,
    headers: responseHeaders(requestId, contentType, { allow }),
  });
}

function jsonResponse(body, requestId, status = 200, extraHeaders = {}) {
  const headers = responseHeaders(requestId, 'application/json; charset=utf-8');
  for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, value);
  return new Response(JSON.stringify(body), { status, headers });
}

function hasD1Binding(env) {
  return !!env?.DB
    && typeof env.DB === 'object'
    && typeof env.DB.prepare === 'function'
    && typeof env.DB.batch === 'function';
}

function authSetupMissing(env) {
  return !hasD1Binding(env)
    || typeof env.ADMIN_PASSWORD !== 'string'
    || env.ADMIN_PASSWORD.length === 0
    || typeof env.AUTH_SECRET !== 'string'
    || env.AUTH_SECRET.length < 32;
}

function authConfig(env) {
  return {
    hasAuth: true,
    loginMode: 'managed',
    persistSession: env.PERSIST_SESSION !== 'false',
    hasPremiumAuth: typeof env.PREMIUM_PASSWORD === 'string' && env.PREMIUM_PASSWORD.length > 0,
  };
}

function runtimeText(value, fallback, maximumLength) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return (normalized || fallback).slice(0, maximumLength);
}

function httpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : null;
  } catch {
    return null;
  }
}

function thirdPartyPublicUrl(value) {
  const normalized = httpsUrl(value);
  if (!normalized) return null;
  const parsed = new URL(normalized);
  return parsed.search || parsed.hash ? null : parsed.href;
}

const VIDEOTOGETHER_OFFICIAL_SCRIPT_URL = 'https://fastly.jsdelivr.net/gh/VideoTogether/VideoTogether@5bf6d155db7bdd19f02e7867036e98eee21f62fc/release/extension.website.user.js';
const VIDEOTOGETHER_OFFICIAL_SETTING_URL = 'https://2gether.video/zh-cn/guide/website_setting.html';
const VIDEOTOGETHER_OFFICIAL_CONNECT_SOURCES = [
  'https://videotogether.oss-cn-hangzhou.aliyuncs.com',
  'https://vt.panghair.com:5000',
  'wss://vt.panghair.com:5000',
  'https://api.begin0114.wiki',
  'https://release.begin0114.wiki',
  'https://api.2gether.video',
  'https://api.panghair.com',
  'https://2gether.video',
];

function videoTogetherRuntime(env = {}) {
  const disabled = ['false', '0'].includes(String(env.VIDEOTOGETHER_ENABLED ?? '').trim().toLowerCase());
  const scriptOverride = typeof env.VIDEOTOGETHER_SCRIPT_URL === 'string'
    && env.VIDEOTOGETHER_SCRIPT_URL.trim().length > 0;
  const settingOverride = typeof env.VIDEOTOGETHER_SETTING_URL === 'string'
    && env.VIDEOTOGETHER_SETTING_URL.trim().length > 0;
  const scriptUrl = scriptOverride
    ? thirdPartyPublicUrl(env.VIDEOTOGETHER_SCRIPT_URL)
    : VIDEOTOGETHER_OFFICIAL_SCRIPT_URL;
  const settingUrl = settingOverride
    ? thirdPartyPublicUrl(env.VIDEOTOGETHER_SETTING_URL)
    : VIDEOTOGETHER_OFFICIAL_SETTING_URL;
  const enabled = !disabled && !!scriptUrl;
  return {
    enabled,
    scriptUrl: enabled ? scriptUrl : null,
    settingUrl: enabled ? settingUrl : null,
  };
}

function siteIconUrl(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (/^\/(?!\/)/.test(normalized)) return normalized;
  return httpsUrl(normalized) ?? '/icon.png';
}

function adKeywords(value) {
  if (typeof value !== 'string') return [];
  return [...new Set(value
    .split(/[\n,]/)
    .map((keyword) => keyword.trim().slice(0, 128))
    .filter(Boolean))]
    .slice(0, 100);
}

function canAccessIptv(session) {
  if (!session) return false;
  if (session.role === 'super_admin' || session.role === 'admin') return true;
  return JSON.parse(session.permissions_json).includes('iptv_access');
}

async function handleRuntimeConfig(request, env, requestId) {
  let manifest;
  try {
    manifest = await loadPagesManifest();
  } catch (error) {
    const failureStage = error?.pagesStage ?? 'manifest.validate';
    return {
      event: 'frontend_integrity_error',
      routeId: 'config',
      errorCode: 'FRONTEND_INTEGRITY_ERROR',
      cacheStatus: 'bypass',
      upstreamClass: 'github-pages',
      failureStage,
      failureReason: frontendIntegrityReason(failureStage, error),
      ...frontendIntegrityException(error),
      response: errorResponse({
        requestId,
        status: 503,
        code: 'FRONTEND_INTEGRITY_ERROR',
        message: 'Frontend configuration is unavailable.',
      }),
    };
  }
  const session = await getAuthSession(request, env, requestId);
  const videoTogether = videoTogetherRuntime(env);
  const response = {
    release: {
      worker: WORKER_VERSION,
      pages: manifest.pagesVersion,
      apiContract: Number(API_CONTRACT_VERSION),
    },
    site: {
      name: runtimeText(env.SITE_NAME, 'UXUVideo', 80),
      title: runtimeText(env.SITE_TITLE, 'UXUVideo', 120),
      description: runtimeText(env.SITE_DESCRIPTION, '私人部署的视频聚合应用', 240),
      iconUrl: siteIconUrl(env.SITE_ICON_URL),
    },
    capabilities: {
      premium: typeof env.PREMIUM_PASSWORD === 'string' && env.PREMIUM_PASSWORD.length > 0,
      iptv: typeof env.IPTV_SOURCES === 'string' && env.IPTV_SOURCES.trim().length > 0,
      danmaku: typeof env.DANMAKU_API_URL === 'string' && env.DANMAKU_API_URL.trim().length > 0,
    },
    adKeywords: adKeywords(env.AD_KEYWORDS),
    thirdPartyScripts: {
      videoTogether,
    },
    authenticated: !!session,
  };

  if (session) {
    response.sources = {
      subscriptionSources: runtimeText(env.SUBSCRIPTION_SOURCES, '', 64 * 1024),
      iptvSources: canAccessIptv(session) ? runtimeText(env.IPTV_SOURCES, '', 64 * 1024) : '',
      mergeSources: env.MERGE_SOURCES === 'true' || env.MERGE_SOURCES === '1',
      danmakuApiUrl: runtimeText(env.DANMAKU_API_URL, '', 2048),
    };
  }

  return {
    routeId: 'config',
    errorCode: null,
    pagesVersion: manifest.pagesVersion,
    response: jsonResponse(response, requestId, 200, {
      'X-UXUV-Pages-Version': manifest.pagesVersion,
    }),
  };
}

const DOCUMENT_TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DOCUMENT_REQUEST_OVERHEAD_BYTES = 16 * 1024;

function emptyDocumentPayload(kind) {
  return kind === 'config'
    ? { fields: {}, sources: [], subscriptions: [], tombstones: [] }
    : { history: [], favorites: [], tombstones: [] };
}

function documentBody(kind, row) {
  if (!row) return { kind, version: 0, updatedAt: null, payload: emptyDocumentPayload(kind) };
  let payload;
  try {
    payload = JSON.parse(row.payload_json);
  } catch {
    throw new Error('Stored document JSON is invalid.');
  }
  return { kind, version: row.version, updatedAt: row.updated_at, payload };
}

async function getDocument(db, requestId, accountId, kind) {
  const result = await executeD1(
    db,
    requestId,
    'document.by_key',
    D1_QUERIES['document.by_key'].sql,
    [accountId, kind],
  );
  return result.results[0] ?? null;
}

function timestampedEntry(value, timestampName) {
  return isRecord(value)
    && typeof value.id === 'string'
    && /^[A-Za-z0-9_.:-]{1,160}$/.test(value.id)
    && Number.isSafeInteger(value[timestampName])
    && value[timestampName] >= 0;
}

function normalizeFields(value) {
  if (value === undefined) return {};
  if (!isRecord(value)) return null;
  const entries = [];
  for (const [key, field] of Object.entries(value)) {
    if (!/^[A-Za-z0-9_.-]{1,128}$/.test(key)
      || !isRecord(field)
      || !Object.hasOwn(field, 'value')
      || !Number.isSafeInteger(field.updatedAt)
      || field.updatedAt < 0) return null;
    entries.push([key, field]);
  }
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function normalizeRecords(value, timestampName = 'updatedAt') {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => !timestampedEntry(entry, timestampName))) return null;
  return value.map((entry) => ({ ...entry }));
}

function normalizeTombstones(value, allowedCollections, now) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const cutoff = now - DOCUMENT_TOMBSTONE_RETENTION_MS;
  const tombstones = [];
  for (const tombstone of value) {
    if (!isRecord(tombstone)
      || !allowedCollections.has(tombstone.collection)
      || typeof tombstone.id !== 'string'
      || !/^[A-Za-z0-9_.:-]{1,160}$/.test(tombstone.id)
      || !Number.isSafeInteger(tombstone.deletedAt)
      || tombstone.deletedAt < 0) return null;
    if (tombstone.deletedAt >= cutoff) tombstones.push({
      collection: tombstone.collection,
      id: tombstone.id,
      deletedAt: tombstone.deletedAt,
    });
  }
  return tombstones;
}

function normalizeDocumentPayload(kind, value, now) {
  if (!isRecord(value)) return null;
  const collections = kind === 'config'
    ? new Set(['sources', 'subscriptions'])
    : new Set(['history', 'favorites']);
  const tombstones = normalizeTombstones(value.tombstones, collections, now);
  if (!tombstones) return null;
  if (kind === 'config') {
    const fields = normalizeFields(value.fields);
    const sources = normalizeRecords(value.sources);
    const subscriptions = normalizeRecords(value.subscriptions);
    return fields && sources && subscriptions
      ? { fields, sources, subscriptions, tombstones }
      : null;
  }
  const history = normalizeRecords(value.history);
  const favorites = normalizeRecords(value.favorites);
  return history && favorites ? { history, favorites, tombstones } : null;
}

function newerEntry(left, right, timestampName) {
  if (!left) return right;
  if (right[timestampName] !== left[timestampName]) {
    return right[timestampName] > left[timestampName] ? right : left;
  }
  return JSON.stringify(right) > JSON.stringify(left) ? right : left;
}

function mergeTombstones(left, right) {
  const merged = new Map();
  for (const tombstone of [...left, ...right]) {
    const key = `${tombstone.collection}:${tombstone.id}`;
    merged.set(key, newerEntry(merged.get(key), tombstone, 'deletedAt'));
  }
  return [...merged.values()].sort((a, b) => a.collection.localeCompare(b.collection) || a.id.localeCompare(b.id));
}

function mergeRecords(left, right, tombstones, collection) {
  const merged = new Map();
  for (const record of [...left, ...right]) {
    merged.set(record.id, newerEntry(merged.get(record.id), record, 'updatedAt'));
  }
  for (const tombstone of tombstones) {
    if (tombstone.collection !== collection) continue;
    const record = merged.get(tombstone.id);
    if (!record || tombstone.deletedAt >= record.updatedAt) merged.delete(tombstone.id);
  }
  return [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function mergeFields(left, right) {
  const merged = new Map(Object.entries(left));
  for (const [key, field] of Object.entries(right)) {
    merged.set(key, newerEntry(merged.get(key), field, 'updatedAt'));
  }
  return Object.fromEntries([...merged.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function mergeDocumentPayload(kind, current, incoming) {
  const tombstones = mergeTombstones(current.tombstones, incoming.tombstones);
  if (kind === 'config') {
    return {
      fields: mergeFields(current.fields, incoming.fields),
      sources: mergeRecords(current.sources, incoming.sources, tombstones, 'sources'),
      subscriptions: mergeRecords(current.subscriptions, incoming.subscriptions, tombstones, 'subscriptions'),
      tombstones,
    };
  }
  return {
    history: mergeRecords(current.history, incoming.history, tombstones, 'history'),
    favorites: mergeRecords(current.favorites, incoming.favorites, tombstones, 'favorites'),
    tombstones,
  };
}

function parseIfMatch(value) {
  if (!value) return null;
  const match = /^(?:W\/)?"?(\d+)"?$/.exec(value.trim());
  const version = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(version) ? version : NaN;
}

async function readDocumentRequest(request) {
  const maximum = D1_LIMITS.documentMaxBytes + DOCUMENT_REQUEST_OVERHEAD_BYTES;
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > maximum) return { tooLarge: true };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximum) return { tooLarge: true };
  try {
    const value = JSON.parse(text);
    return isRecord(value) ? { value } : { invalid: true };
  } catch {
    return { invalid: true };
  }
}

function documentFailure(requestId, routeId, status, code, message, details = null) {
  return {
    routeId,
    errorCode: code,
    response: errorResponse({ requestId, status, code, message, details }),
  };
}

function documentSuccess(requestId, routeId, body) {
  return {
    routeId,
    errorCode: null,
    response: jsonResponse(body, requestId, 200, { ETag: `"${body.version}"` }),
  };
}

async function handleUserDocument(request, env, requestId, route) {
  const session = await getAuthSession(request, env, requestId);
  if (!session) {
    return documentFailure(requestId, route.id, 401, 'AUTH_REQUIRED', 'Authentication is required.');
  }
  const kind = route.id === 'user-config' ? 'config' : 'library';
  const currentRow = await getDocument(env.DB, requestId, session.account_id, kind);
  const currentBody = documentBody(kind, currentRow);
  if (request.method === 'GET') return documentSuccess(requestId, route.id, currentBody);
  if (!jsonRequest(request)) {
    return documentFailure(requestId, route.id, 415, 'UNSUPPORTED_MEDIA_TYPE', 'JSON is required.');
  }

  const requestBody = await readDocumentRequest(request);
  if (requestBody.tooLarge) {
    return documentFailure(requestId, route.id, 413, 'DOCUMENT_TOO_LARGE', 'Document exceeds 512 KiB.');
  }
  if (requestBody.invalid) {
    return documentFailure(requestId, route.id, 400, 'INVALID_DOCUMENT', 'Document request is invalid.');
  }
  const headerVersion = parseIfMatch(request.headers.get('If-Match'));
  const bodyVersion = requestBody.value.baseVersion;
  const baseVersion = headerVersion === null ? bodyVersion : headerVersion;
  if (!Number.isSafeInteger(baseVersion)
    || baseVersion < 0
    || (headerVersion !== null && Number.isSafeInteger(bodyVersion) && bodyVersion !== headerVersion)) {
    return documentFailure(requestId, route.id, 400, 'BASE_VERSION_REQUIRED', 'A valid base version is required.');
  }
  if (baseVersion !== currentBody.version) {
    return documentFailure(
      requestId,
      route.id,
      409,
      'SYNC_CONFLICT',
      'The document changed on another client.',
      { current: currentBody },
    );
  }

  const now = Date.now();
  const rawPayload = requestBody.value.payload;
  if (new TextEncoder().encode(JSON.stringify(rawPayload)).byteLength > D1_LIMITS.documentMaxBytes) {
    return documentFailure(requestId, route.id, 413, 'DOCUMENT_TOO_LARGE', 'Document exceeds 512 KiB.');
  }
  const incoming = normalizeDocumentPayload(kind, rawPayload, now);
  const current = normalizeDocumentPayload(kind, currentBody.payload, now);
  if (!incoming || !current) {
    return documentFailure(requestId, route.id, 400, 'INVALID_DOCUMENT', 'Document payload is invalid.');
  }
  const merged = mergeDocumentPayload(kind, current, incoming);
  const payloadJson = JSON.stringify(merged);
  if (new TextEncoder().encode(payloadJson).byteLength > D1_LIMITS.documentMaxBytes) {
    return documentFailure(requestId, route.id, 413, 'DOCUMENT_TOO_LARGE', 'Document exceeds 512 KiB.');
  }

  const cutoff = now - (D1_LIMITS.documentWriteIntervalSeconds * 1000);
  const write = await executeD1(env.DB, requestId, 'document.cas', AUTH_SQL.writeDocument, [
    session.account_id,
    kind,
    payloadJson,
    now,
    baseVersion,
    cutoff,
  ]);
  const saved = write.results[0];
  if (saved) return documentSuccess(requestId, route.id, documentBody(kind, saved));

  const latestBody = documentBody(kind, await getDocument(env.DB, requestId, session.account_id, kind));
  if (latestBody.version !== baseVersion) {
    return documentFailure(
      requestId,
      route.id,
      409,
      'SYNC_CONFLICT',
      'The document changed on another client.',
      { current: latestBody },
    );
  }
  const limited = documentFailure(
    requestId,
    route.id,
    429,
    'SYNC_RATE_LIMITED',
    'Documents can be written at most once per minute.',
  );
  limited.response.headers.set('Retry-After', '60');
  return limited;
}

const LOW_FANOUT_JSON_BYTES = 1024 * 1024;
const SOURCE_IMPORT_BYTES = 512 * 1024;
const APP_UPDATE_ARTIFACT_BYTES = 3 * 1024 * 1024;
const DOUBAN_IMAGE_BYTES = 10 * 1024 * 1024;
const DOUBAN_IMAGE_MIRRORS = ['img9.doubanio.com', 'img3.doubanio.com', 'img2.doubanio.com'];
const DOUBAN_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

function lowFanoutFailure(requestId, routeId, error) {
  const upstream = error instanceof UpstreamError;
  return {
    routeId,
    errorCode: upstream ? error.code : 'UPSTREAM_INVALID_RESPONSE',
    upstreamClass: 'controlled-fetch',
    response: errorResponse({
      requestId,
      status: upstream ? error.status : 502,
      code: upstream ? error.code : 'UPSTREAM_INVALID_RESPONSE',
      message: upstream ? error.message : 'Upstream response is invalid.',
    }),
  };
}

async function handleSourceImport(request, requestId) {
  if (!jsonRequest(request)) {
    throw new UpstreamError('UNSUPPORTED_MEDIA_TYPE', 'JSON is required.', 415);
  }
  const body = await readJsonBody(request);
  if (!body || typeof body.url !== 'string' || !body.url.trim() || body.url.length > 2048) {
    throw new UpstreamError('INVALID_REQUEST', 'A valid subscription URL is required.', 400);
  }
  const target = validateUpstreamUrl(body.url.trim());
  const response = await controlledFetch(target.href, {
    signal: request.signal,
    timeoutMs: 10_000,
    headers: { Accept: 'application/json, text/plain;q=0.9' },
    budget: createRequestBudget({ maxSubrequests: 4, maxWaiting: 1 }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new UpstreamError('UPSTREAM_HTTP_ERROR', `Upstream returned HTTP ${response.status}.`, 502);
  }
  const text = new TextDecoder().decode(await readLimitedBody(response, SOURCE_IMPORT_BYTES));
  return {
    routeId: 'source-import',
    errorCode: null,
    upstreamClass: 'controlled-fetch',
    response: jsonResponse({ text }, requestId),
  };
}

async function upstreamJson(url, budget, options = {}) {
  const response = await controlledFetch(url, { ...options, budget });
  if (!response.ok) {
    await response.body?.cancel();
    throw new UpstreamError('UPSTREAM_HTTP_ERROR', `Upstream returned HTTP ${response.status}.`, 502);
  }
  const bytes = await readLimitedBody(response, options.maximumBytes ?? LOW_FANOUT_JSON_BYTES);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new UpstreamError('UPSTREAM_INVALID_RESPONSE', 'Upstream JSON is invalid.', 502);
  }
}

function safeRepository(env) {
  const raw = runtimeText(env.UPDATE_REPOSITORY, 'uxudjs/UXUVideo', 160);
  const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(raw);
  return match ? { slug: raw, owner: match[1], name: match[2] }
    : { slug: 'uxudjs/UXUVideo', owner: 'uxudjs', name: 'UXUVideo' };
}

function safeBranch(env) {
  const branch = runtimeText(env.UPDATE_BRANCH, 'main', 160);
  return /^[A-Za-z0-9._/-]+$/.test(branch) && !branch.split('/').includes('..') ? branch : 'main';
}

function validReleaseEntry(entry) {
  return isRecord(entry)
    && /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(entry.version)
    && typeof entry.publishedAt === 'string'
    && typeof entry.title === 'string'
    && Array.isArray(entry.notes)
    && entry.notes.every((note) => typeof note === 'string');
}

function appUpdateSource(env) {
  const repository = safeRepository(env);
  const branch = safeBranch(env);
  const branchPath = branch.split('/').map(encodeURIComponent).join('/');
  const rawBase = `https://raw.githubusercontent.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/${branchPath}/`;
  return {
    repository: repository.slug,
    branch,
    manifestUrl: `${rawBase}app-release.json`,
    packageUrl: `${rawBase}package.json`,
    workerUrl: `${rawBase}_worker.js`,
    changelogUrl: `https://github.com/${repository.owner}/${repository.name}/blob/${branchPath}/CHANGELOG.md`,
    repositoryUrl: `https://github.com/${repository.owner}/${repository.name}`,
  };
}

async function loadAppUpdateState(source, budget) {
  let latestVersion = WORKER_VERSION;
  let latestRelease = null;
  let checkedRemotely = false;
  let usedRemoteManifest = false;
  try {
    const manifest = await upstreamJson(source.manifestUrl, budget, {
      headers: { Accept: 'application/json' }, maximumBytes: 256 * 1024,
    });
    if (isRecord(manifest) && typeof manifest.currentVersion === 'string' && Array.isArray(manifest.releases)) {
      latestVersion = manifest.currentVersion;
      latestRelease = manifest.releases.filter(validReleaseEntry).find((entry) => entry.version === latestVersion)
        ?? manifest.releases.filter(validReleaseEntry)[0] ?? null;
      checkedRemotely = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(latestVersion);
      usedRemoteManifest = checkedRemotely;
    }
  } catch {
    // Fall through to the bounded package.json compatibility check.
  }
  if (!checkedRemotely) {
    try {
      const remotePackage = await upstreamJson(source.packageUrl, budget, {
        headers: { Accept: 'application/json' }, maximumBytes: 64 * 1024,
      });
      if (isRecord(remotePackage) && /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(remotePackage.version)) {
        latestVersion = remotePackage.version;
        checkedRemotely = true;
      }
    } catch {
      // A failed update check is an informational 200 response.
    }
  }
  return { latestVersion, latestRelease, checkedRemotely, usedRemoteManifest };
}

async function handleAppUpdateArtifact(request, requestId, source, budget, state) {
  if (!state.checkedRemotely) {
    throw new UpstreamError('APP_UPDATE_FETCH_FAILED', 'The latest Worker release could not be verified.', 502);
  }
  const latestParts = /^(\d+)\.(\d+)\.(\d+)/.exec(state.latestVersion);
  const currentParts = /^(\d+)\.(\d+)\.(\d+)/.exec(WORKER_VERSION);
  if (latestParts && currentParts && compareSemver(latestParts.slice(1), currentParts.slice(1)) < 0) {
    throw new UpstreamError('APP_UPDATE_VERSION_MISMATCH', 'The latest Worker release is older than the current Worker.', 409);
  }
  let response;
  try {
    response = await controlledFetch(source.workerUrl, {
      signal: request.signal,
      timeoutMs: 10_000,
      maxRedirects: 0,
      headers: { Accept: 'text/javascript, text/plain;q=0.9' },
      budget,
    });
  } catch {
    throw new UpstreamError('APP_UPDATE_FETCH_FAILED', 'The latest Worker file could not be fetched.', 502);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new UpstreamError('APP_UPDATE_FETCH_FAILED', 'The latest Worker file could not be fetched.', 502);
  }
  const declared = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > APP_UPDATE_ARTIFACT_BYTES) {
    await response.body?.cancel();
    throw new UpstreamError('APP_UPDATE_ARTIFACT_TOO_LARGE', 'The latest Worker file exceeds 3 MiB.', 413);
  }
  let bytes;
  try {
    bytes = await readLimitedBody(response, APP_UPDATE_ARTIFACT_BYTES);
  } catch (error) {
    if (error instanceof UpstreamError && error.code === 'UPSTREAM_BODY_TOO_LARGE') {
      throw new UpstreamError('APP_UPDATE_ARTIFACT_TOO_LARGE', 'The latest Worker file exceeds 3 MiB.', 413);
    }
    throw new UpstreamError('APP_UPDATE_FETCH_FAILED', 'The latest Worker file could not be read.', 502);
  }
  const text = new TextDecoder().decode(bytes);
  const version = /(?:^|\n)\s*const\s+WORKER_VERSION\s*=\s*['"]([^'"]+)['"]\s*;/.exec(text)?.[1];
  if (!version) {
    throw new UpstreamError('APP_UPDATE_FETCH_FAILED', 'The latest Worker version could not be verified.', 502);
  }
  if (version !== state.latestVersion) {
    throw new UpstreamError('APP_UPDATE_VERSION_MISMATCH', 'The Worker file does not match the latest release version.', 409);
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const headers = responseHeaders(requestId, 'text/javascript; charset=utf-8', { cacheControl: 'private, no-store' });
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-UXUVideo-Worker-Version', version);
  headers.set('X-UXUVideo-Worker-SHA256', bytesToHex(new Uint8Array(digest)));
  return {
    routeId: 'app-update',
    errorCode: null,
    upstreamClass: 'github-raw',
    response: new Response(bytes, { status: 200, headers }),
  };
}

async function handleAppUpdate(request, env, requestId) {
  const artifact = new URL(request.url).searchParams.get('artifact');
  if (artifact && artifact !== 'worker') {
    throw new UpstreamError('INVALID_REQUEST', 'The requested update artifact is not supported.', 400);
  }
  const source = appUpdateSource(env);
  const budget = createRequestBudget({ maxSubrequests: artifact ? 3 : 2, maxWaiting: 2 });
  const state = await loadAppUpdateState(source, budget);
  if (artifact === 'worker') return handleAppUpdateArtifact(request, requestId, source, budget, state);
  const { latestVersion, latestRelease, checkedRemotely, usedRemoteManifest } = state;
  const latestParts = /^(\d+)\.(\d+)\.(\d+)/.exec(latestVersion);
  const currentParts = /^(\d+)\.(\d+)\.(\d+)/.exec(WORKER_VERSION);
  const comparison = checkedRemotely && latestParts && currentParts
    ? compareSemver(latestParts.slice(1), currentParts.slice(1))
    : 0;
  return {
    routeId: 'app-update',
    errorCode: null,
    upstreamClass: 'github-raw',
    response: jsonResponse({
      currentVersion: WORKER_VERSION,
      currentRelease: null,
      latestVersion,
      latestRelease,
      status: !checkedRemotely ? 'check-failed'
        : comparison > 0 ? 'update-available' : comparison < 0 ? 'ahead-of-remote' : 'up-to-date',
      updateAvailable: comparison > 0,
      checkedAt: new Date().toISOString(),
      checkedRemotely,
      usedRemoteManifest,
      source: { repository: source.repository, branch: source.branch, manifestUrl: source.manifestUrl,
        changelogUrl: source.changelogUrl, repositoryUrl: source.repositoryUrl },
      copy: { available: checkedRemotely, href: '/api/app-update?artifact=worker', version: latestVersion },
      ...(!checkedRemotely ? { error: '无法获取远程版本信息。' } : {}),
    }, requestId),
  };
}

const DANMAKU_CACHE = new Map();
const DANMAKU_CACHE_TTL_MS = 60 * 60 * 1000;

function danmakuMemoryCache(key) {
  const cached = DANMAKU_CACHE.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    DANMAKU_CACHE.delete(key);
    return null;
  }
  return { hit: true, value: cached.value };
}

async function readDanmakuCache(key) {
  const memory = danmakuMemoryCache(key);
  if (memory) return memory;
  const cache = globalThis.caches?.default;
  if (!cache) return null;
  try {
    const response = await cache.match(new Request(`https://uxuv.invalid/.danmaku-cache/${key}`));
    if (!response) return null;
    const value = await response.json();
    storeDanmakuMemoryCache(key, value);
    return { hit: true, value };
  } catch {
    return null;
  }
}

function storeDanmakuMemoryCache(key, value) {
  if (DANMAKU_CACHE.size >= 64) DANMAKU_CACHE.delete(DANMAKU_CACHE.keys().next().value);
  DANMAKU_CACHE.set(key, { value, expiresAt: Date.now() + DANMAKU_CACHE_TTL_MS });
}

async function storeDanmakuCache(key, value) {
  storeDanmakuMemoryCache(key, value);
  const cache = globalThis.caches?.default;
  if (!cache) return;
  try {
    await cache.put(new Request(`https://uxuv.invalid/.danmaku-cache/${key}`), new Response(JSON.stringify(value), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    }));
  } catch {
    // The bounded in-isolate cache remains available when Cache API storage fails.
  }
}

async function handleDanmaku(request, requestId) {
  if (request.method === 'OPTIONS') {
    return { routeId: 'danmaku', errorCode: null, response: new Response(null, { status: 204 }) };
  }
  const parameters = new URL(request.url).searchParams;
  const action = parameters.get('action');
  const apiUrl = parameters.get('apiUrl');
  if (!apiUrl || !['search', 'comments'].includes(action)) {
    throw new UpstreamError('INVALID_DANMAKU_REQUEST', 'Danmaku action or API URL is invalid.', 400);
  }
  const base = validateUpstreamUrl(apiUrl);
  const basePath = base.pathname.replace(/\/+$/, '');
  if (action === 'search') {
    const keyword = parameters.get('keyword');
    if (!keyword || keyword.length > 200) throw new UpstreamError('INVALID_DANMAKU_REQUEST', 'Danmaku keyword is invalid.', 400);
    base.pathname = `${basePath}/api/v2/search/episodes`;
    base.search = '';
    base.searchParams.set('anime', keyword);
  } else {
    const episodeId = parameters.get('episodeId');
    if (!episodeId || episodeId.length > 200) throw new UpstreamError('INVALID_DANMAKU_REQUEST', 'Danmaku episode is invalid.', 400);
    base.pathname = `${basePath}/api/v2/comment/${encodeURIComponent(episodeId)}`;
    base.search = '?withRelated=true';
  }
  const cacheKey = bytesToHex(await sha256(new TextEncoder().encode(base.href)));
  const cached = await readDanmakuCache(cacheKey);
  if (cached) {
    return { routeId: 'danmaku', errorCode: null, upstreamClass: 'danmaku-cache', response: jsonResponse(cached.value, requestId) };
  }
  const data = await upstreamJson(base.href, createRequestBudget({ maxSubrequests: 4 }), {
    headers: { Accept: 'application/json' }, userAgent: 'UXUVideo/1.0', maximumBytes: 2 * 1024 * 1024,
  });
  await storeDanmakuCache(cacheKey, data);
  return { routeId: 'danmaku', errorCode: null, upstreamClass: 'danmaku', response: jsonResponse(data, requestId) };
}

function sourceHeader(headers, name) {
  if (!isRecord(headers)) return null;
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return typeof entry?.[1] === 'string' ? entry[1] : null;
}

function normalizeVideoSource(value) {
  if (!isRecord(value)
    || typeof value.id !== 'string' || !/^[A-Za-z0-9_.:-]{1,160}$/.test(value.id)
    || typeof value.name !== 'string' || !value.name.trim()
    || typeof value.baseUrl !== 'string' || value.baseUrl.length > 2048) return null;
  const baseUrl = validateUpstreamUrl(value.baseUrl).href.replace(/\/+$/, '');
  const searchPath = typeof value.searchPath === 'string' ? value.searchPath.slice(0, 512) : '';
  const detailPath = typeof value.detailPath === 'string' ? value.detailPath.slice(0, 512) : '';
  return {
    id: value.id,
    name: value.name.slice(0, 160),
    baseUrl,
    searchPath,
    detailPath,
    headers: value.headers,
    enabled: value.enabled !== false,
    group: value.group === 'premium' ? 'premium' : 'normal',
  };
}

function parseEpisodes(value) {
  if (typeof value !== 'string') return [];
  return value.split('#').slice(0, 500).flatMap((entry, index) => {
    const separator = entry.indexOf('$');
    if (separator < 0) return [];
    const name = entry.slice(0, separator).trim();
    const rawUrl = entry.slice(separator + 1).trim();
    try {
      const url = validateUpstreamUrl(rawUrl).href;
      return [{ name: name || `第${index + 1}集`, url, index }];
    } catch {
      return [];
    }
  });
}

async function configuredSource(env, requestId, accountId, sourceId) {
  const row = await getDocument(env.DB, requestId, accountId, 'config');
  const document = documentBody('config', row);
  return document.payload.sources.find((source) => source.id === sourceId) ?? null;
}

async function handleDetail(request, env, requestId, session) {
  let id;
  let sourceValue;
  if (request.method === 'POST') {
    const body = jsonRequest(request) ? await readJsonBody(request) : null;
    id = body?.id;
    sourceValue = body?.source;
  } else {
    const parameters = new URL(request.url).searchParams;
    id = parameters.get('id');
    const sourceId = parameters.get('source');
    sourceValue = sourceId ? await configuredSource(env, requestId, session.account_id, sourceId) : null;
  }
  if (!['string', 'number'].includes(typeof id) || String(id).length > 256) {
    throw new UpstreamError('INVALID_DETAIL_REQUEST', 'Video ID is invalid.', 400);
  }
  const source = normalizeVideoSource(sourceValue);
  if (!source) throw new UpstreamError('INVALID_SOURCE', 'Video source configuration is invalid.', 400);
  const target = sourceTarget(source, source.detailPath || '/');
  target.searchParams.set('ac', 'detail');
  target.searchParams.set('ids', String(id));
  const data = await upstreamJson(target.href, createRequestBudget({ maxSubrequests: 3 }), {
    headers: { Accept: 'application/json' },
    userAgent: sourceHeader(source.headers, 'user-agent') ?? 'Mozilla/5.0',
    referer: sourceHeader(source.headers, 'referer') ?? undefined,
    maximumBytes: 2 * 1024 * 1024,
  });
  if (!isRecord(data) || ![0, 1].includes(data.code) || !Array.isArray(data.list) || !isRecord(data.list[0])) {
    throw new UpstreamError('DETAIL_NOT_FOUND', 'Video detail was not found.', 404);
  }
  const video = data.list[0];
  const playFrom = typeof video.vod_play_from === 'string' ? video.vod_play_from.split('$$$') : [];
  const playUrls = typeof video.vod_play_url === 'string' ? video.vod_play_url.split('$$$') : [];
  const m3u8 = playFrom.findIndex((entry) => entry.toLowerCase().includes('m3u8'));
  const selected = m3u8 >= 0 && m3u8 < playUrls.length ? m3u8 : 0;
  const detail = {};
  for (const key of ['vod_id', 'vod_name', 'vod_pic', 'vod_remarks', 'vod_year', 'vod_area', 'vod_actor', 'vod_director', 'vod_content', 'type_name', 'vod_lang']) {
    if (typeof video[key] === 'string' || typeof video[key] === 'number') detail[key] = video[key];
  }
  detail.episodes = parseEpisodes(playUrls[selected] ?? '');
  detail.source = source.id;
  detail.source_code = playFrom[selected] ?? '';
  return { routeId: 'detail', errorCode: null, upstreamClass: 'video-source', response: jsonResponse({ success: true, data: detail }, requestId) };
}

function doubanHeaders() {
  return { headers: { Accept: 'application/json' }, userAgent: DOUBAN_USER_AGENT, referer: 'https://movie.douban.com/' };
}

function doubanType(value) {
  if (value === null) return 'movie';
  if (!['movie', 'tv'].includes(value)) throw new UpstreamError('INVALID_DOUBAN_REQUEST', 'Douban type is invalid.', 400);
  return value;
}

function isDoubanImageUrl(value) {
  try {
    const url = validateUpstreamUrl(value);
    return url.protocol === 'https:' && /^img\d+\.doubanio\.com$/.test(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

async function handleDoubanJson(request, requestId, routeId) {
  const parameters = new URL(request.url).searchParams;
  const type = doubanType(parameters.get('type'));
  const target = new URL(routeId === 'douban-tags'
    ? 'https://movie.douban.com/j/search_tags'
    : 'https://movie.douban.com/j/search_subjects');
  target.searchParams.set('type', type);
  if (routeId === 'douban-tags') target.searchParams.set('source', 'index');
  else {
    const tag = (parameters.get('tag') || '热门').slice(0, 80);
    const pageLimit = Math.min(50, Math.max(1, Number(parameters.get('page_limit')) || 20));
    const pageStart = Math.min(10_000, Math.max(0, Number(parameters.get('page_start')) || 0));
    target.searchParams.set('tag', tag);
    target.searchParams.set('sort', 'recommend');
    target.searchParams.set('page_limit', String(Math.trunc(pageLimit)));
    target.searchParams.set('page_start', String(Math.trunc(pageStart)));
  }
  const data = await upstreamJson(target.href, createRequestBudget({ maxSubrequests: 2 }), {
    ...doubanHeaders(), maximumBytes: 1024 * 1024,
  });
  if (!isRecord(data)) throw new UpstreamError('UPSTREAM_INVALID_RESPONSE', 'Douban response is invalid.', 502);
  if (routeId === 'douban-recommend' && Array.isArray(data.subjects)) {
    data.subjects = data.subjects.slice(0, 50).filter(isRecord).map((subject) => {
      const cover = typeof subject.cover === 'string' ? isDoubanImageUrl(subject.cover) : null;
      return { ...subject, ...(cover ? { cover: `/api/douban/image?url=${encodeURIComponent(cover.href)}` } : {}) };
    });
  }
  return { routeId, errorCode: null, upstreamClass: 'douban', response: jsonResponse(data, requestId) };
}

function doubanImageCandidates(rawUrl) {
  const original = isDoubanImageUrl(rawUrl);
  if (!original) throw new UpstreamError('INVALID_DOUBAN_IMAGE', 'Douban image URL is invalid.', 400);
  return [original.hostname, ...DOUBAN_IMAGE_MIRRORS]
    .filter((hostname, index, values) => values.indexOf(hostname) === index)
    .map((hostname) => {
      const candidate = new URL(original.href);
      candidate.hostname = hostname;
      return candidate.href;
    });
}

async function handleDoubanImage(request, requestId) {
  const rawUrl = new URL(request.url).searchParams.get('url');
  if (!rawUrl) throw new UpstreamError('INVALID_DOUBAN_IMAGE', 'Douban image URL is required.', 400);
  const budget = createRequestBudget({ maxSubrequests: 4, maxWaiting: 1 });
  for (const candidate of doubanImageCandidates(rawUrl)) {
    try {
      const response = await controlledFetch(candidate, {
        ...doubanHeaders(), budget, maxRedirects: 0, timeoutMs: 8_000,
      });
      const contentType = response.headers.get('Content-Type') ?? '';
      const declared = Number(response.headers.get('Content-Length'));
      if (!response.ok || !response.body || !/^image\/(?:jpeg|png|gif|webp)$/i.test(contentType)
        || (Number.isFinite(declared) && declared > DOUBAN_IMAGE_BYTES)) {
        await response.body?.cancel();
        continue;
      }
      const headers = responseHeaders(requestId, contentType, { cacheControl: 'public, max-age=15720000' });
      return {
        routeId: 'douban-image', errorCode: null, upstreamClass: 'douban-image',
        response: new Response(limitReadableStream(response.body, DOUBAN_IMAGE_BYTES), { status: 200, headers }),
      };
    } catch {
      // Try the next fixed Douban mirror.
    }
  }
  throw new UpstreamError('UPSTREAM_UNAVAILABLE', 'Douban image is unavailable.', 502);
}

async function handlePing(request, requestId) {
  const body = jsonRequest(request) ? await readJsonBody(request) : null;
  if (typeof body?.url !== 'string') throw new UpstreamError('INVALID_PING_URL', 'Ping URL is invalid.', 400);
  validateUpstreamUrl(body.url);
  const budget = createRequestBudget({ maxSubrequests: 2, maxWaiting: 1 });
  let method = 'HEAD';
  let startedAt = performance.now();
  try {
    await controlledFetch(body.url, { method, budget, timeoutMs: 5_000 });
    return { routeId: 'ping', errorCode: null, upstreamClass: 'probe', response: jsonResponse({
      latency: Math.max(0, Math.round(performance.now() - startedAt)), success: true, timeout: false, method,
    }, requestId) };
  } catch {
    method = 'GET';
    startedAt = performance.now();
  }
  try {
    await controlledFetch(body.url, { method, headers: { Range: 'bytes=0-0' }, budget, timeoutMs: 5_000 });
    return { routeId: 'ping', errorCode: null, upstreamClass: 'probe', response: jsonResponse({
      latency: Math.max(0, Math.round(performance.now() - startedAt)), success: true, timeout: false, method,
    }, requestId) };
  } catch (error) {
    return { routeId: 'ping', errorCode: null, upstreamClass: 'probe', response: jsonResponse({
      latency: Math.max(0, Math.round(performance.now() - startedAt)), success: false,
      timeout: error instanceof UpstreamError && error.code === 'UPSTREAM_TIMEOUT', method,
    }, requestId) };
  }
}

async function handleLowFanoutRoute(request, env, requestId, route) {
  if (request.method === 'OPTIONS') return handleDanmaku(request, requestId);
  const session = await getAuthSession(request, env, requestId);
  if (!session) return authFailureResult(requestId, route.id, 401, 'AUTH_REQUIRED', 'Authentication is required.');
  try {
    if (route.id === 'app-update') return await handleAppUpdate(request, env, requestId);
    if (route.id === 'danmaku') return await handleDanmaku(request, requestId);
    if (route.id === 'detail') return await handleDetail(request, env, requestId, session);
    if (route.id === 'douban-image') return await handleDoubanImage(request, requestId);
    if (route.id === 'douban-recommend' || route.id === 'douban-tags') {
      return await handleDoubanJson(request, requestId, route.id);
    }
    if (route.id === 'ping') return await handlePing(request, requestId);
    if (route.id === 'source-import') return await handleSourceImport(request, requestId);
  } catch (error) {
    return lowFanoutFailure(requestId, route.id, error);
  }
  return null;
}

const HIGH_FANOUT_ROUTE_IDS = new Set([
  'premium-category', 'premium-types', 'probe-resolution', 'search-parallel',
]);
const MEDIA_ROUTE_IDS = new Set(['iptv', 'iptv-stream', 'proxy']);
const SEARCH_RATE_LIMIT = createTokenBucket({ limit: 6, windowMs: 60_000 });
const PROBE_RATE_LIMIT = createTokenBucket({ limit: 6, windowMs: 60_000 });
const MEDIA_RATE_LIMIT = createTokenBucket({ limit: 60, windowMs: 60_000 });
const AGGREGATE_CACHE = new Map();
const IPTV_PLAYLIST_CACHE = new Map();

function sessionProfile(session, env) {
  const paid = session.role === 'admin'
    || session.role === 'super_admin'
    || (!!env.PREMIUM_PASSWORD && session.premium_until > Date.now());
  return paid ? {
    name: 'paid', sources: 32, concurrency: 6, probeConcurrency: 6, videos: 2_000, probes: 50, variants: 4,
  } : {
    name: 'free', sources: 12, concurrency: 5, probeConcurrency: 3, videos: 500, probes: 6, variants: 2,
  };
}

function premiumSessionAllowed(session, env) {
  return session.role === 'admin'
    || session.role === 'super_admin'
    || !env.PREMIUM_PASSWORD
    || session.premium_until > Date.now();
}

function profileCapability(profile) {
  return {
    profile: profile.name,
    limits: {
      sources: profile.sources,
      searchConcurrency: profile.concurrency,
      maxPages: 3,
      videos: profile.videos,
      probeVideos: profile.probes,
      probeConcurrency: profile.probeConcurrency,
      probeVariants: profile.variants,
    },
  };
}

async function runConcurrent(items, concurrency, task, signal) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      if (signal?.aborted) throw new UpstreamError('UPSTREAM_ABORTED', 'Upstream request was aborted.', 499);
      const index = next;
      next += 1;
      await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
}

function sseResult(request, requestId, routeId, runner) {
  const encoder = new TextEncoder();
  const aborter = new AbortController();
  const cascadeAbort = () => aborter.abort(request.signal.reason);
  if (request.signal.aborted) cascadeAbort();
  else request.signal.addEventListener('abort', cascadeAbort, { once: true });
  let closed = false;
  const stream = new ReadableStream({
    start(controller) {
      const send = (data, event = null) => {
        if (closed || aborter.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`));
        } catch {
          aborter.abort();
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch { /* The reader may already be cancelled. */ }
      };
      Promise.resolve(runner(send, aborter.signal)).catch((error) => {
        if (aborter.signal.aborted) return;
        const code = error instanceof UpstreamError ? error.code : 'UPSTREAM_UNAVAILABLE';
        send({ error: { code, message: 'The upstream operation failed.', requestId, details: null } }, 'error');
      }).finally(() => {
        request.signal.removeEventListener('abort', cascadeAbort);
        close();
      });
    },
    cancel() {
      closed = true;
      aborter.abort();
      request.signal.removeEventListener('abort', cascadeAbort);
    },
  });
  return {
    routeId,
    errorCode: null,
    upstreamClass: routeId,
    response: new Response(stream, {
      headers: responseHeaders(requestId, 'text/event-stream; charset=utf-8'),
    }),
  };
}

function highFanoutFailure(requestId, route, error) {
  const status = error instanceof UpstreamError ? error.status : 502;
  const code = error instanceof UpstreamError ? error.code : 'UPSTREAM_UNAVAILABLE';
  return {
    routeId: route.id,
    errorCode: code,
    response: errorResponse({
      requestId,
      status,
      code,
      message: error instanceof UpstreamError ? error.message : 'The upstream operation failed.',
      sse: route.sse,
    }),
  };
}

function normalizeSources(values, profile) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new UpstreamError('INVALID_SOURCE', 'At least one video source is required.', 400);
  }
  if (values.length > profile.sources) {
    throw new UpstreamError(`${profile.name.toUpperCase()}_LIMIT_EXCEEDED`, `This profile allows at most ${profile.sources} sources.`, 400);
  }
  const sources = values.map(normalizeVideoSource);
  if (sources.some((source) => !source) || new Set(sources.map((source) => source.id)).size !== sources.length) {
    throw new UpstreamError('INVALID_SOURCE', 'Video source configuration is invalid.', 400);
  }
  return sources.filter((source) => source.enabled);
}

function sourceTarget(source, path) {
  const base = validateUpstreamUrl(source.baseUrl);
  const requestedPath = path.replace(/^\/+|\/+$/g, '');
  if (!requestedPath) return base;
  const basePath = base.pathname.replace(/^\/+|\/+$/g, '');
  const baseIsEndpoint = basePath === requestedPath
    || basePath.endsWith(`/${requestedPath}`)
    || /(?:^|\/)(?:provide\/vod|api\/json)$/.test(basePath)
    || /\.[a-z0-9]+$/i.test(basePath);
  if (baseIsEndpoint) return base;
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/${requestedPath}`;
  return validateUpstreamUrl(base.href);
}

function videoResult(value, source, latency) {
  if (!isRecord(value)
    || !['string', 'number'].includes(typeof value.vod_id)
    || typeof value.vod_name !== 'string') return null;
  const result = {
    vod_id: value.vod_id,
    vod_name: value.vod_name.slice(0, 500),
    source: source.id,
    sourceDisplayName: source.name,
    latency,
  };
  for (const key of ['vod_pic', 'type_name', 'vod_remarks', 'vod_year', 'vod_area', 'vod_actor', 'vod_director', 'vod_content', 'vod_lang']) {
    if (typeof value[key] === 'string') result[key] = value[key].slice(0, key === 'vod_content' ? 4_000 : 1_000);
  }
  return result;
}

async function searchSourcePage(source, query, page, budget, signal) {
  const target = sourceTarget(source, source.searchPath || '/');
  target.searchParams.set('ac', 'videolist');
  target.searchParams.set('wd', query);
  target.searchParams.set('pg', String(page));
  const started = performance.now();
  const data = await upstreamJson(target.href, budget, {
    signal,
    headers: { Accept: 'application/json' },
    userAgent: sourceHeader(source.headers, 'user-agent') ?? 'Mozilla/5.0',
    referer: sourceHeader(source.headers, 'referer') ?? undefined,
    timeoutMs: 20_000,
    maximumBytes: 2 * 1024 * 1024,
  });
  if (!isRecord(data) || !Array.isArray(data.list)) throw new UpstreamError('UPSTREAM_INVALID_RESPONSE', 'Search response is invalid.', 502);
  const latency = Math.max(0, Math.round(performance.now() - started));
  return {
    videos: data.list.slice(0, 500).map((item) => videoResult(item, source, latency)).filter(Boolean),
    pagecount: Math.min(3, Math.max(1, Number(data.pagecount) || 1)),
    latency,
  };
}

function handleParallelSearch(request, requestId, session, env, body) {
  const profile = sessionProfile(session, env);
  if (typeof body?.query !== 'string' || !body.query.trim() || body.query.length > 200) {
    throw new UpstreamError('INVALID_SEARCH_REQUEST', 'Search query is invalid.', 400);
  }
  const requestedSources = Array.isArray(body.sources) ? body.sources.slice(0, profile.sources) : body.sources;
  const sources = normalizeSources(requestedSources, profile);
  const firstPage = Math.min(3, Math.max(1, Number(body.page) || 1));
  if (!SEARCH_RATE_LIMIT.consume(session.token_hash)) {
    throw new UpstreamError('SEARCH_RATE_LIMITED', 'Search rate limit exceeded.', 429);
  }
  return sseResult(request, requestId, 'search-parallel', async (send, signal) => {
    const budget = createRequestBudget({ maxSubrequests: profile.sources * 3, maxWaiting: profile.concurrency });
    let completedSources = 0;
    let totalVideosFound = 0;
    let validSources = 0;
    let failedSources = 0;
    send({ type: 'start', totalSources: sources.length, capability: profileCapability(profile) });
    await runConcurrent(sources, profile.concurrency, async (source) => {
      let receivedValidResponse = false;
      try {
        for (let page = firstPage; page <= 3 && totalVideosFound < profile.videos; page += 1) {
          const result = await searchSourcePage(source, body.query.trim(), page, budget, signal);
          receivedValidResponse = true;
          const remaining = Math.max(0, profile.videos - totalVideosFound);
          const videos = result.videos.slice(0, remaining);
          totalVideosFound += videos.length;
          if (videos.length > 0) send({
            type: 'videos', videos, source: source.id, completedSources,
            totalSources: sources.length, latency: result.latency, pagecount: result.pagecount,
          });
          if (page >= result.pagecount) break;
        }
      } catch (error) {
        if (signal.aborted) throw error;
      }
      if (receivedValidResponse) validSources += 1;
      else failedSources += 1;
      completedSources += 1;
      send({ type: 'progress', completedSources, totalSources: sources.length, totalVideosFound });
    }, signal);
    if (signal.aborted) return;
    if (validSources === 0 && failedSources > 0) {
      console.log(JSON.stringify({
        event: 'search.sources_unavailable', requestId, routeId: 'search-parallel',
        errorCode: 'SEARCH_SOURCES_UNAVAILABLE', failedSources, totalSources: sources.length,
      }));
      send({
        type: 'error',
        error: {
          code: 'SEARCH_SOURCES_UNAVAILABLE',
          message: 'No video source returned a valid search response.',
          requestId,
          details: { failedSources, totalSources: sources.length },
        },
      });
      return;
    }
    send({ type: 'complete', totalVideosFound, totalSources: sources.length, maxPageCount: 3 });
  });
}

async function accountVideoSources(env, requestId, accountId) {
  const row = await getDocument(env.DB, requestId, accountId, 'config');
  return documentBody('config', row).payload.sources;
}

async function aggregateCacheKey(kind, profile, sources, parameters) {
  const bytes = new TextEncoder().encode(JSON.stringify({
    kind,
    profile: profile.name,
    sources: sources.map(({ id, baseUrl, searchPath }) => ({ id, baseUrl, searchPath })),
    parameters,
  }));
  return bytesToHex(await sha256(bytes));
}

function cachedAggregate(key) {
  const cached = AGGREGATE_CACHE.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    AGGREGATE_CACHE.delete(key);
    return null;
  }
  return cached.value;
}

function storeAggregate(key, value, ttlMs) {
  if (AGGREGATE_CACHE.size >= 64) AGGREGATE_CACHE.delete(AGGREGATE_CACHE.keys().next().value);
  AGGREGATE_CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function cleanPremiumCategoryLabel(label) {
  return label.normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}视频片区专]/gu, '');
}

export function mergePremiumCategories(categories) {
  const merged = [];
  for (const category of categories) {
    if (!category || typeof category.label !== 'string') continue;
    const label = category.label.trim().slice(0, 100);
    const value = `${category.sourceId}:${category.typeId}`;
    if (!label || !/^[A-Za-z0-9_.:-]{1,160}$/.test(String(category.sourceId)) || value.length > 256) continue;
    const cleaned = cleanPremiumCategoryLabel(label);
    const match = merged.find((entry) => {
      const existing = cleanPremiumCategoryLabel(entry.label);
      if (cleaned.length < 4 || existing.length < 4) return cleaned === existing;
      const chars = new Set(existing);
      let overlap = 0;
      for (const character of cleaned) if (chars.has(character)) overlap += 1;
      return overlap >= 4;
    });
    if (match) {
      if (!match.values.includes(value)) match.values.push(value);
    } else {
      merged.push({ label, values: [value] });
    }
  }
  return merged;
}

export function interleavePremiumResults(results, limit) {
  const videos = [];
  const longest = Math.max(0, ...results.map((items) => items.length));
  for (let item = 0; item < longest && videos.length < limit; item += 1) {
    for (const result of results) {
      if (result[item]) videos.push(result[item]);
      if (videos.length >= limit) break;
    }
  }
  return videos;
}

async function premiumSources(request, env, requestId, session, body, profile) {
  const raw = request.method === 'POST' ? body?.sources : await accountVideoSources(env, requestId, session.account_id);
  return normalizeSources(raw, profile);
}

async function handlePremiumTypes(request, env, requestId, session, body, profile) {
  const sources = await premiumSources(request, env, requestId, session, body, profile);
  const cacheKey = await aggregateCacheKey('types', profile, sources, {});
  const cached = cachedAggregate(cacheKey);
  if (cached) return { routeId: 'premium-types', errorCode: null, response: jsonResponse(cached, requestId) };
  const budget = createRequestBudget({ maxSubrequests: profile.sources, maxWaiting: profile.concurrency });
  const categories = [];
  await runConcurrent(sources, profile.concurrency, async (source) => {
    try {
      const target = sourceTarget(source, source.searchPath || '/');
      target.searchParams.set('ac', 'list');
      const data = await upstreamJson(target.href, budget, { maximumBytes: 1024 * 1024, timeoutMs: 8_000 });
      if (!isRecord(data) || !Array.isArray(data.class)) return;
      for (const entry of data.class.slice(0, 200)) {
        if (isRecord(entry) && ['string', 'number'].includes(typeof entry.type_id) && typeof entry.type_name === 'string') {
          categories.push({ sourceId: source.id, typeId: entry.type_id, label: entry.type_name.trim().slice(0, 100) });
        }
      }
    } catch {
      // A partial aggregate remains useful.
    }
  });
  const merged = mergePremiumCategories(categories);
  const tags = [{ id: 'recommend', label: '今日推荐', value: '' }, ...merged.map(({ label, values }) => ({
    id: bytesToBase64(new TextEncoder().encode(label)).replace(/=+$/, ''), label, value: values.join(','),
  }))];
  const value = { tags, capability: profileCapability(profile) };
  storeAggregate(cacheKey, value, 60 * 60 * 1000);
  return { routeId: 'premium-types', errorCode: null, upstreamClass: 'premium-sources', response: jsonResponse(value, requestId) };
}

async function handlePremiumCategory(request, env, requestId, session, body, profile) {
  const sources = await premiumSources(request, env, requestId, session, body, profile);
  const parameters = request.method === 'POST' ? body : Object.fromEntries(new URL(request.url).searchParams);
  const page = Math.min(3, Math.max(1, Number(parameters?.page) || 1));
  const limit = Math.min(profile.videos, Math.max(1, Number(parameters?.limit) || 20));
  const category = typeof parameters?.category === 'string' ? parameters.category.slice(0, 2_000) : '';
  const sourceTypes = new Map(category.split(',').flatMap((entry) => {
    const separator = entry.indexOf(':');
    return separator > 0 ? [[entry.slice(0, separator), entry.slice(separator + 1)]] : [];
  }));
  const targets = sourceTypes.size > 0 ? sources.filter(({ id }) => sourceTypes.has(id)) : sources;
  const cacheKey = await aggregateCacheKey('category', profile, targets, { page, limit, category });
  const cached = cachedAggregate(cacheKey);
  if (cached) return { routeId: 'premium-category', errorCode: null, response: jsonResponse(cached, requestId) };
  const budget = createRequestBudget({ maxSubrequests: profile.sources, maxWaiting: profile.concurrency });
  const results = new Array(targets.length).fill(null).map(() => []);
  await runConcurrent(targets, profile.concurrency, async (source, index) => {
    try {
      const target = sourceTarget(source, source.searchPath || '/');
      target.searchParams.set('ac', 'detail');
      target.searchParams.set('pg', String(page));
      if (sourceTypes.has(source.id)) target.searchParams.set('t', sourceTypes.get(source.id));
      const data = await upstreamJson(target.href, budget, { maximumBytes: 2 * 1024 * 1024, timeoutMs: 10_000 });
      if (!isRecord(data) || !Array.isArray(data.list)) return;
      results[index] = data.list.map((item) => videoResult(item, source, 0)).filter(Boolean);
    } catch {
      // A partial aggregate remains useful.
    }
  });
  const videos = interleavePremiumResults(results, limit);
  const value = { videos, capability: profileCapability(profile) };
  storeAggregate(cacheKey, value, 30 * 60 * 1000);
  return { routeId: 'premium-category', errorCode: null, upstreamClass: 'premium-sources', response: jsonResponse(value, requestId) };
}

function resolutionHint(...values) {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const dimensions = /(?:RESOLUTION=)?(\d{3,4})[xX](\d{3,4})/i.exec(value);
    if (dimensions) {
      const width = Number(dimensions[1]);
      const height = Number(dimensions[2]);
      const normalizedHeight = Math.min(width, height);
      const label = normalizedHeight >= 2160 ? '4K' : normalizedHeight >= 1440 ? '2K'
        : normalizedHeight >= 1080 ? '1080P' : normalizedHeight >= 720 ? '720P' : `${normalizedHeight}P`;
      return { width: Math.max(width, height), height: normalizedHeight, label, color: 'bg-gray-500' };
    }
    const quality = /(?:^|[^\d])(4k|2160p|1440p|1080p|720p)(?:[^\d]|$)/i.exec(value)?.[1]?.toLowerCase();
    if (quality) {
      const dimensionsByQuality = { '4k': [3840, 2160], '2160p': [3840, 2160], '1440p': [2560, 1440], '1080p': [1920, 1080], '720p': [1280, 720] };
      const [width, height] = dimensionsByQuality[quality];
      return { width, height, label: height === 2160 ? '4K' : `${height}P`, color: 'bg-gray-500' };
    }
  }
  return null;
}

function manifestVariants(content, baseUrl, maximum) {
  const variants = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length && variants.length < maximum; index += 1) {
    const line = lines[index].trim();
    let candidate = null;
    if (line.startsWith('#EXT-X-I-FRAME-STREAM-INF')) candidate = /URI="([^"]+)"/i.exec(line)?.[1] ?? null;
    else if (line.startsWith('#EXT-X-STREAM-INF')) candidate = lines[index + 1]?.trim() ?? null;
    if (!candidate || candidate.startsWith('#')) continue;
    try { variants.push(validateUpstreamUrl(candidate, new URL(baseUrl)).href); } catch { /* Ignore invalid variants. */ }
  }
  return variants;
}

async function upstreamText(url, budget, signal, maximumBytes = 1024 * 1024) {
  const response = await controlledFetch(url, {
    budget, signal, timeoutMs: 8_000, headers: { Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, text/plain' },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new UpstreamError('UPSTREAM_HTTP_ERROR', `Upstream returned HTTP ${response.status}.`, 502);
  }
  return new TextDecoder().decode(await readLimitedBody(response, maximumBytes));
}

async function probeVideo(video, source, profile, budget, signal) {
  try {
    const detailTarget = sourceTarget(source, source.detailPath || '/');
    detailTarget.searchParams.set('ac', 'detail');
    detailTarget.searchParams.set('ids', String(video.id));
    const detail = await upstreamJson(detailTarget.href, budget, { signal, maximumBytes: 2 * 1024 * 1024, timeoutMs: 10_000 });
    const item = isRecord(detail) && Array.isArray(detail.list) && isRecord(detail.list[0]) ? detail.list[0] : null;
    if (!item) throw new UpstreamError('DETAIL_NOT_FOUND', 'Video detail was not found.', 404);
    const episodes = parseEpisodes(typeof item.vod_play_url === 'string' ? item.vod_play_url.split('$$$')[0] : '');
    const episodeIndex = Math.min(episodes.length - 1, Math.max(0, Number(video.episodeIndex) || 0));
    const targetUrl = episodes[episodeIndex]?.url;
    if (!targetUrl) throw new UpstreamError('DETAIL_NOT_FOUND', 'Video episode was not found.', 404);
    const manifest = await upstreamText(targetUrl, budget, signal);
    let resolution = resolutionHint(manifest, targetUrl, item.vod_remarks);
    if (!resolution) {
      for (const variant of manifestVariants(manifest, targetUrl, profile.variants)) {
        resolution = resolutionHint(variant);
        if (!resolution) resolution = resolutionHint(await upstreamText(variant, budget, signal), variant);
        if (resolution) break;
      }
    }
    return { id: video.id, source: video.source, episodeIndex, resolution, resolutionOrigin: resolution ? 'manifest' : 'hint' };
  } catch (error) {
    if (signal.aborted) throw error;
    return { id: video.id, source: video.source, episodeIndex: video.episodeIndex, resolution: null, resolutionOrigin: 'manifest' };
  }
}

function handleResolutionProbe(request, requestId, session, env, body) {
  const profile = sessionProfile(session, env);
  if (!Array.isArray(body?.videos) || body.videos.length === 0) {
    throw new UpstreamError('INVALID_PROBE_REQUEST', 'Videos are required.', 400);
  }
  if (body.videos.length > profile.probes) {
    throw new UpstreamError(`${profile.name.toUpperCase()}_LIMIT_EXCEEDED`, `This profile allows at most ${profile.probes} videos.`, 400);
  }
  if (!PROBE_RATE_LIMIT.consume(session.token_hash)) {
    throw new UpstreamError('PROBE_RATE_LIMITED', 'Probe rate limit exceeded.', 429);
  }
  const sources = normalizeSources(body.sourceConfigs, profile);
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const videos = body.videos.map((video) => {
    if (!isRecord(video)
      || !['string', 'number'].includes(typeof video.id)
      || typeof video.source !== 'string'
      || !sourceMap.has(video.source)) throw new UpstreamError('INVALID_PROBE_REQUEST', 'Probe item is invalid.', 400);
    return { id: video.id, source: video.source, episodeIndex: video.episodeIndex };
  });
  return sseResult(request, requestId, 'probe-resolution', async (send, signal) => {
    const perVideo = 2 + profile.variants;
    const budget = createRequestBudget({ maxSubrequests: profile.probes * perVideo, maxWaiting: profile.probeConcurrency });
    send({ type: 'start', capability: profileCapability(profile) });
    await runConcurrent(videos, profile.probeConcurrency, async (video) => {
      send(await probeVideo(video, sourceMap.get(video.source), profile, budget, signal));
    }, signal);
    if (!signal.aborted) send({ done: true });
  });
}

async function handleHighFanoutRoute(request, env, requestId, route) {
  const session = await getAuthSession(request, env, requestId);
  if (!session) return authFailureResult(requestId, route.id, 401, 'AUTH_REQUIRED', 'Authentication is required.');
  if ((route.id === 'premium-category' || route.id === 'premium-types') && !premiumSessionAllowed(session, env)) {
    return authFailureResult(requestId, route.id, 403, 'PREMIUM_REQUIRED', 'Premium access is required.');
  }
  try {
    const body = request.method === 'POST' && jsonRequest(request)
      ? await readJsonBody(request, D1_LIMITS.documentMaxBytes)
      : null;
    if (request.method === 'POST' && !body) throw new UpstreamError('INVALID_REQUEST', 'JSON request body is invalid.', 400);
    const profile = sessionProfile(session, env);
    if (route.id === 'search-parallel') return handleParallelSearch(request, requestId, session, env, body);
    if (route.id === 'probe-resolution') return handleResolutionProbe(request, requestId, session, env, body);
    if (route.id === 'premium-types') return await handlePremiumTypes(request, env, requestId, session, body, profile);
    if (route.id === 'premium-category') return await handlePremiumCategory(request, env, requestId, session, body, profile);
  } catch (error) {
    return highFanoutFailure(requestId, route, error);
  }
  return null;
}

const MEDIA_TOKEN_TTL_MS = 10 * 60 * 1000;
const MEDIA_MANIFEST_BYTES = 1024 * 1024;
const MEDIA_MANIFEST_URI_LIMIT = 2_048;

function mediaTokenPayload(scope, target, userAgent, referer, expiresAt) {
  return new TextEncoder().encode(`${scope}\n${target}\n${userAgent}\n${referer}\n${expiresAt}`);
}

async function signMediaToken(signingKey, scope, target, userAgent, referer, expiresAt) {
  const signature = new Uint8Array(await crypto.subtle.sign(
    'HMAC', signingKey, mediaTokenPayload(scope, target, userAgent, referer, expiresAt),
  ));
  return `${expiresAt}.${bytesToBase64(signature).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

async function verifyMediaToken(secret, scope, target, userAgent, referer, token, now = Date.now()) {
  const match = /^(\d+)\.([A-Za-z0-9_-]{43})$/.exec(token ?? '');
  if (!match || typeof secret !== 'string' || secret.length < 32) return false;
  const expiresAt = Number(match[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now || expiresAt > now + MEDIA_TOKEN_TTL_MS + 5_000) return false;
  try {
    return crypto.subtle.verify(
      'HMAC', await hmacKey(secret), base64UrlToBytes(match[2]),
      mediaTokenPayload(scope, target, userAgent, referer, expiresAt),
    );
  } catch {
    return false;
  }
}

function safeMediaText(value, maximum, code, message) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > maximum || /[\r\n]/.test(text)) throw new UpstreamError(code, message, 400);
  return text;
}

function mediaRequestOptions(request, routeId) {
  const query = new URL(request.url).searchParams;
  const rawTarget = safeMediaText(query.get('url'), 8_192, 'INVALID_MEDIA_URL', 'Media URL is invalid.');
  if (!rawTarget) throw new UpstreamError('INVALID_MEDIA_URL', 'Media URL is required.', 400);
  const target = validateUpstreamUrl(rawTarget).href;
  const userAgent = safeMediaText(query.get('ua'), 512, 'INVALID_MEDIA_HEADER', 'Media user agent is invalid.');
  const rawReferer = safeMediaText(query.get('referer'), 2_048, 'INVALID_MEDIA_HEADER', 'Media referer is invalid.');
  const referer = rawReferer ? validateUpstreamUrl(rawReferer).href
    : routeId === 'iptv-stream' || routeId === 'iptv' ? `${new URL(target).origin}/` : '';
  const requestedAdMode = query.get('ad');
  const adFilterMode = ['keyword', 'heuristic', 'aggressive'].includes(requestedAdMode) ? requestedAdMode : 'off';
  const adKeywords = [...new Set(query.getAll('adkw').map((value) => safeMediaText(
    value, 40, 'INVALID_AD_FILTER', 'Ad filter keyword is invalid.',
  ).toLowerCase()).filter(Boolean))].slice(0, 32);
  return { target, userAgent, referer, token: query.get('token') ?? '', adFilterMode, adKeywords };
}

function sameOriginCors(request, headers) {
  const origin = request.headers.get('Origin');
  if (origin && origin === new URL(request.url).origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Vary', 'Origin');
  }
}

function mediaPreflight(request, requestId, routeId) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return authFailureResult(requestId, routeId, 403, 'ORIGIN_MISMATCH', 'Request origin is not allowed.');
  }
  const headers = responseHeaders(requestId, 'text/plain; charset=utf-8', { allow: 'GET, OPTIONS' });
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');
  sameOriginCors(request, headers);
  return { routeId, errorCode: null, response: new Response(null, { status: 204, headers }) };
}

function mediaFailure(requestId, routeId, error) {
  const known = error instanceof UpstreamError;
  return {
    routeId,
    errorCode: known ? error.code : 'UPSTREAM_UNAVAILABLE',
    upstreamClass: 'media',
    response: errorResponse({
      requestId,
      status: known ? error.status : 502,
      code: known ? error.code : 'UPSTREAM_UNAVAILABLE',
      message: known ? error.message : 'Media upstream is unavailable.',
    }),
  };
}

function mediaRelayStream(upstream, request, requestId, routeId) {
  const reader = upstream.getReader();
  let ended = false;
  let cancelRequested = false;
  const finish = (outcome, errorCode = null) => {
    if (ended) return;
    ended = true;
    request.signal.removeEventListener('abort', abort);
    console.log(JSON.stringify({ event: 'media.stream.end', requestId, routeId, outcome, errorCode }));
  };
  const abort = () => {
    cancelRequested = true;
    finish('client-cancel');
    void reader.cancel(request.signal.reason);
  };
  request.signal.addEventListener('abort', abort, { once: true });
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          finish('complete');
        } else controller.enqueue(value);
      } catch {
        if (cancelRequested) return;
        controller.error(new Error('Media upstream stream failed.'));
        finish('upstream-error', 'UPSTREAM_STREAM_ERROR');
      }
    },
    async cancel(reason) {
      cancelRequested = true;
      finish('client-cancel');
      await reader.cancel(reason);
    },
  });
}

function isMediaManifest(target, contentType) {
  const path = new URL(target).pathname.toLowerCase();
  return path.endsWith('.m3u8') || path.endsWith('.m3u')
    || /(?:mpegurl|x-mpegurl|x-scpls)/i.test(contentType);
}

async function mediaChildPath(routeId, target, userAgent, referer, signingKey, expiresAt, adFilterMode, adKeywords) {
  const token = await signMediaToken(signingKey, routeId, target, userAgent, referer, expiresAt);
  const query = new URLSearchParams({ url: target, token });
  if (userAgent) query.set('ua', userAgent);
  if (referer) query.set('referer', referer);
  if (adFilterMode !== 'off') {
    query.set('ad', adFilterMode);
    for (const keyword of adKeywords) query.append('adkw', keyword);
  }
  return `/api/${routeId === 'iptv-stream' ? 'iptv/stream' : 'proxy'}?${query}`;
}

const AD_INTERSTITIAL_MARKERS = [
  'class="com.apple.hls.interstitial"', 'x-asset-uri=', 'x-asset-list=',
  'x-playout-limit=', 'x-resume-offset=', 'cue="once"',
];
const AD_METADATA_PREFIXES = [
  '#EXT-X-ASSET:', '#EXT-X-CUE-OUT-CONT', '#EXT-X-PLACEMENT-OPPORTUNITY',
  '#EXT-OATCLS-SCTE35', '#EXT-X-SCTE35',
];
const SEGMENT_METADATA_PREFIXES = [
  '#EXTINF:', '#EXT-X-BYTERANGE:', '#EXT-X-DISCONTINUITY', '#EXT-X-PROGRAM-DATE-TIME:',
];

function mediaSegments(lines) {
  const segments = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('#EXTINF:')) continue;
    const duration = Number.parseFloat(line.slice('#EXTINF:'.length));
    let uriIndex = index + 1;
    while (uriIndex < lines.length && (!lines[uriIndex].trim() || lines[uriIndex].trim().startsWith('#'))) uriIndex += 1;
    if (uriIndex < lines.length) segments.push({
      metadataIndex: index,
      uriIndex,
      uri: lines[uriIndex].trim(),
      duration: Number.isFinite(duration) && duration >= 0 ? duration : 0,
    });
  }
  return segments;
}

function dominantSegmentDuration(segments) {
  const counts = new Map();
  for (const { duration } of segments) {
    if (duration <= 0) continue;
    const bucket = Math.round(duration * 2) / 2;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return [...counts].sort((left, right) => right[1] - left[1] || right[0] - left[0])[0]?.[0] ?? 0;
}

function stripDanglingDiscontinuities(lines) {
  const output = [];
  for (const line of lines) {
    if (line.trim() === '#EXT-X-DISCONTINUITY'
      && (output.length === 0 || output.at(-1).trim() === '#EXT-X-DISCONTINUITY')) continue;
    output.push(line);
  }
  while (output.at(-1)?.trim() === '#EXT-X-DISCONTINUITY') output.pop();
  return output;
}

export function filterMediaManifest(content, mode = 'off', keywords = []) {
  if (typeof content !== 'string' || mode === 'off' || !content.startsWith('#EXTM3U')) return content;
  if (!['keyword', 'heuristic', 'aggressive'].includes(mode)) return content;
  const normalizedKeywords = [...new Set(keywords.map((value) => String(value).trim().toLowerCase()).filter(Boolean))].slice(0, 32);
  const lines = content.split(/\r?\n/);
  const segments = mediaSegments(lines);
  const dominantDuration = dominantSegmentDuration(segments);
  const removed = new Set();
  let insideCue = false;
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    const lower = trimmed.toLowerCase();
    if (trimmed.startsWith('#EXT-X-CUE-OUT')) insideCue = true;
    if (insideCue) removed.add(index);
    if (trimmed.startsWith('#EXT-X-CUE-IN')) insideCue = false;
    if (AD_METADATA_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
      || (trimmed.startsWith('#EXT-X-DATERANGE:') && AD_INTERSTITIAL_MARKERS.some((marker) => lower.includes(marker)))) {
      removed.add(index);
    }
  }
  for (const segment of segments) {
    const lowerUri = segment.uri.toLowerCase();
    const keywordMatch = normalizedKeywords.some((keyword) => lowerUri.includes(keyword));
    const pathMatch = /(?:^|[\/_\-.])(?:ads?|commercial|promo|preroll|midroll|sponsor)(?:[\/_\-.]|$)/i.test(lowerUri);
    const durationOutlier = dominantDuration > 0 && segment.duration > 0
      && (segment.duration < Math.min(2.5, dominantDuration * 0.35) || segment.duration > dominantDuration * 2.5);
    const score = (pathMatch ? 3.5 : 0) + (durationOutlier ? 2 : 0);
    const heuristicMatch = mode === 'heuristic' ? score >= 5 : mode === 'aggressive' && score >= 3;
    if (!keywordMatch && !heuristicMatch && !removed.has(segment.uriIndex)) continue;
    for (let index = segment.metadataIndex; index <= segment.uriIndex; index += 1) removed.add(index);
    let previous = segment.metadataIndex - 1;
    while (previous >= 0 && SEGMENT_METADATA_PREFIXES.some((prefix) => lines[previous].trim().startsWith(prefix))) {
      removed.add(previous);
      previous -= 1;
    }
  }
  const keptSegments = segments.filter(({ uriIndex }) => !removed.has(uriIndex)).length;
  if (segments.length > 0 && keptSegments === 0) return content;
  const filtered = stripDanglingDiscontinuities(lines.filter((_line, index) => !removed.has(index))).join('\n');
  return filtered.startsWith('#EXTM3U') ? filtered : content;
}

async function rewriteMediaManifest(content, target, routeId, userAgent, referer, secret, adFilterMode, adKeywords) {
  const lines = filterMediaManifest(content, adFilterMode, adKeywords).split(/\r?\n/);
  const expiresAt = Date.now() + MEDIA_TOKEN_TTL_MS;
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new UpstreamError('SIGNING_UNAVAILABLE', 'Media signing configuration is invalid.', 503);
  }
  const signingKey = await hmacKey(secret);
  let rewrittenUris = 0;
  const child = async (value) => {
    rewrittenUris += 1;
    if (rewrittenUris > MEDIA_MANIFEST_URI_LIMIT) {
      throw new UpstreamError('MEDIA_MANIFEST_TOO_COMPLEX', 'Media manifest contains too many child resources.', 413);
    }
    return mediaChildPath(
      routeId, validateUpstreamUrl(value, new URL(target)).href, userAgent, referer, signingKey, expiresAt,
      adFilterMode, adKeywords,
    );
  };
  const output = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { output.push(line); continue; }
    if (!trimmed.startsWith('#')) { output.push(await child(trimmed)); continue; }
    const matches = [...line.matchAll(/URI="([^"]+)"/g)];
    let rewritten = line;
    for (const match of matches.reverse()) {
      const path = await child(match[1]);
      rewritten = `${rewritten.slice(0, match.index)}URI="${path}"${rewritten.slice(match.index + match[0].length)}`;
    }
    output.push(rewritten);
  }
  return output.join('\n');
}

function copyMediaHeaders(upstream, request, requestId) {
  const contentType = upstream.headers.get('Content-Type') || 'application/octet-stream';
  const headers = responseHeaders(requestId, contentType);
  for (const name of ['Content-Range', 'Accept-Ranges', 'Content-Length', 'ETag', 'Last-Modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  sameOriginCors(request, headers);
  return headers;
}

async function mediaUpstream(request, requestId, routeId, options, env) {
  const upstream = await controlledFetch(options.target, {
    timeoutMs: 20_000,
    signal: request.signal,
    headers: request.headers,
    userAgent: options.userAgent || 'Mozilla/5.0 (compatible; UXUVideo/1.0)',
    referer: options.referer || undefined,
    budget: createRequestBudget({ maxSubrequests: 4, maxWaiting: 1 }),
  });
  if (!upstream.ok && upstream.status !== 206) {
    await upstream.body?.cancel();
    if (routeId === 'proxy' && upstream.status === 403) {
      const headers = responseHeaders(requestId, 'text/plain; charset=utf-8');
      headers.set('Location', options.target);
      sameOriginCors(request, headers);
      return new Response(null, { status: 307, headers });
    }
    throw new UpstreamError('UPSTREAM_HTTP_ERROR', `Upstream returned HTTP ${upstream.status}.`, 502);
  }
  const contentType = upstream.headers.get('Content-Type') || '';
  if (isMediaManifest(options.target, contentType)) {
    const manifest = new TextDecoder().decode(await readLimitedBody(upstream, MEDIA_MANIFEST_BYTES));
    const rewritten = await rewriteMediaManifest(
      manifest, options.target, routeId, options.userAgent, options.referer, env.AUTH_SECRET,
      options.adFilterMode, options.adKeywords,
    );
    const headers = responseHeaders(requestId, 'application/vnd.apple.mpegurl; charset=utf-8');
    sameOriginCors(request, headers);
    return new Response(rewritten, { status: 200, headers });
  }
  const headers = copyMediaHeaders(upstream, request, requestId);
  const body = upstream.body ? mediaRelayStream(upstream.body, request, requestId, routeId) : null;
  return new Response(body, { status: upstream.status, headers });
}

function cachedIptvPlaylist(key) {
  const cached = IPTV_PLAYLIST_CACHE.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    IPTV_PLAYLIST_CACHE.delete(key);
    return null;
  }
  return cached.value;
}

async function handleIptvPlaylist(request, requestId, options) {
  const key = `${options.target}\n${options.userAgent}\n${options.referer}`;
  let text = cachedIptvPlaylist(key);
  let cacheStatus = 'hit';
  if (text === null) {
    cacheStatus = 'miss';
    const upstream = await controlledFetch(options.target, {
      timeoutMs: 20_000,
      signal: request.signal,
      userAgent: options.userAgent || 'Mozilla/5.0 (compatible; UXUVideo/1.0)',
      referer: options.referer,
      budget: createRequestBudget({ maxSubrequests: 4, maxWaiting: 1 }),
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      throw new UpstreamError('UPSTREAM_HTTP_ERROR', `Upstream returned HTTP ${upstream.status}.`, 502);
    }
    text = new TextDecoder().decode(await readLimitedBody(upstream, MEDIA_MANIFEST_BYTES));
    if (IPTV_PLAYLIST_CACHE.size >= 32) IPTV_PLAYLIST_CACHE.delete(IPTV_PLAYLIST_CACHE.keys().next().value);
    IPTV_PLAYLIST_CACHE.set(key, { value: text, expiresAt: Date.now() + (5 * 60 * 1000) });
  }
  const headers = responseHeaders(requestId, 'text/plain; charset=utf-8', { cacheControl: 'private, max-age=60' });
  sameOriginCors(request, headers);
  return { routeId: 'iptv', errorCode: null, upstreamClass: 'iptv-playlist', cacheStatus, response: new Response(text, { headers }) };
}

async function handleMediaRoute(request, env, requestId, route) {
  if (request.method === 'OPTIONS') return mediaPreflight(request, requestId, route.id);
  const hasToken = new URL(request.url).searchParams.has('token');
  try {
    if (route.id === 'iptv' && hasToken) throw new UpstreamError('MEDIA_TOKEN_INVALID', 'Media token is invalid.', 401);
    let session = null;
    if (!hasToken) {
      session = await getAuthSession(request, env, requestId);
      if (!session) return authFailureResult(requestId, route.id, 401, 'AUTH_REQUIRED', 'Authentication is required.');
      if ((route.id === 'iptv' || route.id === 'iptv-stream') && !canAccessIptv(session)) {
        return authFailureResult(requestId, route.id, 403, 'IPTV_ACCESS_REQUIRED', 'IPTV access is required.');
      }
      if (!MEDIA_RATE_LIMIT.consume(session.token_hash)) {
        throw new UpstreamError('MEDIA_RATE_LIMITED', 'Media request rate limit exceeded.', 429);
      }
    }
    const options = mediaRequestOptions(request, route.id);
    if (hasToken && !await verifyMediaToken(
      env.AUTH_SECRET, route.id, options.target, options.userAgent, options.referer, options.token,
    )) throw new UpstreamError('MEDIA_TOKEN_INVALID', 'Media token is invalid or expired.', 401);
    if (route.id === 'iptv') return await handleIptvPlaylist(request, requestId, options);
    return { routeId: route.id, errorCode: null, upstreamClass: 'media', response: await mediaUpstream(request, requestId, route.id, options, env) };
  } catch (error) {
    return mediaFailure(requestId, route.id, error);
  }
}

const USAGE_GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
const USAGE_CACHE_FRESH_MS = 5 * 60 * 1000;
const USAGE_CACHE_STALE_MS = 60 * 60 * 1000;
const USAGE_RESPONSE_MAX_BYTES = 512 * 1024;
const USAGE_LIMITS = Object.freeze({
  workersAccountRequests: 100_000,
  d1AccountRowsRead: 5_000_000,
  d1AccountRowsWritten: 100_000,
  d1AccountStorageBytes: 5_000_000_000,
  d1DatabaseStorageBytes: 500_000_000,
  d1ProjectRowsRead: 1_000_000,
  d1ProjectRowsWritten: 50_000,
});
const USAGE_LEVELS = Object.freeze(['normal', 'notice', 'warning', 'critical', 'exhausted']);
const USAGE_QUERY = `query Usage(
  $accountTag: string!
  $scriptName: string!
  $databaseId: string!
  $datetimeStart: Time!
  $datetimeEnd: Time!
  $dateStart: Date!
  $dateEnd: Date!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      accountWorkers: workersInvocationsAdaptive(
        limit: 1
        filter: { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
      ) { sum { requests errors } }
      scriptWorkers: workersInvocationsAdaptive(
        limit: 1
        filter: { scriptName: $scriptName, datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
      ) { sum { requests errors } }
      d1Usage: d1AnalyticsAdaptiveGroups(
        limit: 10000
        filter: { date_geq: $dateStart, date_leq: $dateEnd }
      ) { dimensions { databaseId } sum { rowsRead rowsWritten } }
      databaseD1: d1AnalyticsAdaptiveGroups(
        limit: 1
        filter: { databaseId: $databaseId, date_geq: $dateStart, date_leq: $dateEnd }
      ) { dimensions { databaseId } sum { rowsRead rowsWritten } }
      d1Storage: d1StorageAdaptiveGroups(
        limit: 10000
        filter: { date_geq: $dateStart, date_leq: $dateEnd }
      ) { dimensions { databaseId } max { databaseSizeBytes } }
      databaseStorage: d1StorageAdaptiveGroups(
        limit: 1
        filter: { databaseId: $databaseId, date_geq: $dateStart, date_leq: $dateEnd }
      ) { dimensions { databaseId } max { databaseSizeBytes } }
    }
  }
}`;

class UsageFailure extends Error {
  constructor(code, status) {
    super(code);
    this.name = 'UsageFailure';
    this.code = code;
    this.status = status;
  }
}

function usageConfiguration(env) {
  const names = [
    'CF_ANALYTICS_API_TOKEN',
    'CF_ACCOUNT_ID',
    'CF_WORKER_SCRIPT_NAME',
    'CF_D1_DATABASE_ID',
  ];
  const missing = names.filter((name) => typeof env?.[name] !== 'string' || env[name].trim().length === 0);
  if (missing.length > 0) return { configured: false, missing };
  return {
    configured: true,
    token: env.CF_ANALYTICS_API_TOKEN.trim(),
    accountId: env.CF_ACCOUNT_ID.trim(),
    scriptName: env.CF_WORKER_SCRIPT_NAME.trim(),
    databaseId: env.CF_D1_DATABASE_ID.trim(),
  };
}

function usagePeriod(nowMs) {
  const now = new Date(nowMs);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const resetsAt = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: now.toISOString(),
    resetsAt: resetsAt.toISOString(),
    date: start.toISOString().slice(0, 10),
  };
}

function usageInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(number));
}

function usageSum(groups, field) {
  return Array.isArray(groups)
    ? groups.reduce((total, group) => total + usageInteger(group?.sum?.[field]), 0)
    : 0;
}

function usageStorageSum(groups) {
  return Array.isArray(groups)
    ? groups.reduce((total, group) => total + usageInteger(group?.max?.databaseSizeBytes), 0)
    : 0;
}

function usageDatabaseGroups(primary, fallback, databaseId) {
  if (Array.isArray(primary) && primary.length > 0) return primary;
  return Array.isArray(fallback)
    ? fallback.filter((group) => group?.dimensions?.databaseId === databaseId)
    : [];
}

function usageLevel(value, limit, thresholds = [0.7, 0.85, 0.95, 1]) {
  const ratio = limit > 0 ? value / limit : 0;
  if (ratio >= thresholds[3]) return 'exhausted';
  if (ratio >= thresholds[2]) return 'critical';
  if (ratio >= thresholds[1]) return 'warning';
  if (ratio >= thresholds[0]) return 'notice';
  return 'normal';
}

function projectUsageLevel(value, limit) {
  if (value >= limit) return 'warning';
  if (value >= limit * 0.8) return 'notice';
  return 'normal';
}

function addUsageWarning(warnings, levels, codePrefix, level) {
  levels.push(level);
  if (level !== 'normal') warnings.push(`${codePrefix}_${level.toUpperCase()}`);
}

function highestUsageLevel(levels) {
  return levels.reduce((highest, level) => (
    USAGE_LEVELS.indexOf(level) > USAGE_LEVELS.indexOf(highest) ? level : highest
  ), 'normal');
}

function buildUsageData(payload, config, period, observedAt) {
  const account = payload?.data?.viewer?.accounts?.[0];
  if (!isRecord(account)) throw new UsageFailure('USAGE_UPSTREAM_ERROR', 502);

  const databaseUsage = usageDatabaseGroups(account.databaseD1, account.d1Usage, config.databaseId);
  const databaseStorage = usageDatabaseGroups(account.databaseStorage, account.d1Storage, config.databaseId);
  const workers = {
    accountRequests: usageSum(account.accountWorkers, 'requests'),
    scriptRequests: usageSum(account.scriptWorkers, 'requests'),
    accountErrors: usageSum(account.accountWorkers, 'errors'),
    scriptErrors: usageSum(account.scriptWorkers, 'errors'),
    accountLimit: USAGE_LIMITS.workersAccountRequests,
  };
  const d1 = {
    accountRowsRead: usageSum(account.d1Usage, 'rowsRead'),
    databaseRowsRead: usageSum(databaseUsage, 'rowsRead'),
    accountRowsWritten: usageSum(account.d1Usage, 'rowsWritten'),
    databaseRowsWritten: usageSum(databaseUsage, 'rowsWritten'),
    accountStorageBytes: usageStorageSum(account.d1Storage),
    databaseStorageBytes: usageStorageSum(databaseStorage),
    accountRowsReadLimit: USAGE_LIMITS.d1AccountRowsRead,
    accountRowsWrittenLimit: USAGE_LIMITS.d1AccountRowsWritten,
    accountStorageBytesLimit: USAGE_LIMITS.d1AccountStorageBytes,
    databaseStorageBytesLimit: USAGE_LIMITS.d1DatabaseStorageBytes,
    projectRowsReadGuardrail: USAGE_LIMITS.d1ProjectRowsRead,
    projectRowsWrittenGuardrail: USAGE_LIMITS.d1ProjectRowsWritten,
  };

  const warnings = [];
  const levels = [];
  addUsageWarning(warnings, levels, 'WORKERS_ACCOUNT', usageLevel(workers.accountRequests, workers.accountLimit));
  const d1Thresholds = [0.85, 0.85, 0.95, 1];
  addUsageWarning(warnings, levels, 'D1_ACCOUNT_READ', usageLevel(d1.accountRowsRead, d1.accountRowsReadLimit, d1Thresholds));
  addUsageWarning(warnings, levels, 'D1_ACCOUNT_WRITE', usageLevel(d1.accountRowsWritten, d1.accountRowsWrittenLimit, d1Thresholds));
  addUsageWarning(warnings, levels, 'D1_ACCOUNT_STORAGE', usageLevel(d1.accountStorageBytes, d1.accountStorageBytesLimit, d1Thresholds));
  addUsageWarning(warnings, levels, 'D1_DATABASE_STORAGE', usageLevel(d1.databaseStorageBytes, d1.databaseStorageBytesLimit, d1Thresholds));
  addUsageWarning(warnings, levels, 'D1_PROJECT_READ', projectUsageLevel(d1.databaseRowsRead, d1.projectRowsReadGuardrail));
  addUsageWarning(warnings, levels, 'D1_PROJECT_WRITE', projectUsageLevel(d1.databaseRowsWritten, d1.projectRowsWrittenGuardrail));

  return {
    configured: true,
    period: { start: period.start, end: period.end, resetsAt: period.resetsAt },
    workers,
    d1,
    level: highestUsageLevel(levels),
    warnings,
    observedAt,
    stale: false,
    source: 'cloudflare-graphql',
  };
}

async function usageCacheContext(config, period) {
  const fingerprint = bytesToHex(await sha256(new TextEncoder().encode(
    `${config.accountId}\0${config.scriptName}\0${config.databaseId}\0${period.date}`,
  )));
  const request = new Request(`https://uxuv.invalid/.usage-cache/${fingerprint}`);
  return { cache: globalThis.caches?.default ?? null, request };
}

async function readUsageCache(cacheContext) {
  if (!cacheContext.cache) return null;
  try {
    const response = await cacheContext.cache.match(cacheContext.request);
    if (!response) return null;
    const snapshot = await response.json();
    return Number.isFinite(snapshot?.cachedAt) && isRecord(snapshot?.data) ? snapshot : null;
  } catch {
    return null;
  }
}

async function writeUsageCache(cacheContext, snapshot) {
  if (!cacheContext.cache) return;
  try {
    await cacheContext.cache.put(cacheContext.request, new Response(JSON.stringify(snapshot), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }));
  } catch {
    // Analytics remain available even when Cache API storage is unavailable.
  }
}

async function fetchUsageData(config, period, observedAt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response;
  try {
    response = await globalThis.fetch(USAGE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: USAGE_QUERY,
        variables: {
          accountTag: config.accountId,
          scriptName: config.scriptName,
          databaseId: config.databaseId,
          datetimeStart: period.start,
          datetimeEnd: period.end,
          dateStart: period.date,
          dateEnd: period.date,
        },
      }),
      redirect: 'error',
      signal: controller.signal,
    });
  } catch {
    throw new UsageFailure('USAGE_UPSTREAM_ERROR', 502);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) throw new UsageFailure('USAGE_AUTH_FAILED', 502);
  if (response.status === 403) throw new UsageFailure('USAGE_FORBIDDEN', 502);
  if (response.status === 429) throw new UsageFailure('USAGE_RATE_LIMITED', 503);
  if (!response.ok) throw new UsageFailure('USAGE_UPSTREAM_ERROR', 502);

  let payload;
  try {
    const bytes = await readLimitedBody(response, USAGE_RESPONSE_MAX_BYTES);
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new UsageFailure('USAGE_UPSTREAM_ERROR', 502);
  }
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new UsageFailure('USAGE_UPSTREAM_ERROR', 502);
  }
  return buildUsageData(payload, config, period, observedAt);
}

function privateUsageResult(result) {
  result.response.headers.set('Cache-Control', 'private, no-store');
  return result;
}

function usageSuccessResult(requestId, data) {
  return {
    routeId: 'admin-usage',
    errorCode: null,
    upstreamClass: 'cloudflare-graphql',
    cacheStatus: data.stale ? 'stale' : 'miss',
    response: jsonResponse({ data }, requestId, 200, { 'Cache-Control': 'private, no-store' }),
  };
}

function usageFailureResult(requestId, failure) {
  const messages = {
    USAGE_AUTH_FAILED: 'Cloudflare analytics authentication failed.',
    USAGE_FORBIDDEN: 'Cloudflare analytics access is forbidden.',
    USAGE_RATE_LIMITED: 'Cloudflare analytics is temporarily rate limited.',
    USAGE_UPSTREAM_ERROR: 'Cloudflare analytics is temporarily unavailable.',
  };
  return privateUsageResult(authFailureResult(
    requestId,
    'admin-usage',
    failure.status ?? 502,
    failure.code ?? 'USAGE_UPSTREAM_ERROR',
    messages[failure.code] ?? messages.USAGE_UPSTREAM_ERROR,
  ));
}

function usageOriginFailure(request, requestId) {
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if ((origin && origin !== new URL(request.url).origin)
    || (fetchSite && fetchSite !== 'same-origin')) {
    return privateUsageResult(authFailureResult(
      requestId,
      'admin-usage',
      403,
      'ORIGIN_MISMATCH',
      'Request origin is not allowed.',
    ));
  }
  return null;
}

async function handleAdminUsage(request, env, requestId) {
  const originFailure = usageOriginFailure(request, requestId);
  if (originFailure) return originFailure;

  const authorization = await requireSuperAdmin(request, env, requestId, 'admin-usage');
  if (authorization.failure) return privateUsageResult(authorization.failure);

  const config = usageConfiguration(env);
  if (!config.configured) {
    return {
      routeId: 'admin-usage',
      errorCode: null,
      response: jsonResponse({ data: {
        configured: false,
        missing: config.missing,
        message: 'Cloudflare usage analytics is not configured.',
      } }, requestId, 200, { 'Cache-Control': 'private, no-store' }),
    };
  }

  const now = Date.now();
  const observedAt = new Date(now).toISOString();
  const period = usagePeriod(now);
  const cacheContext = await usageCacheContext(config, period);
  const cached = await readUsageCache(cacheContext);
  const cacheAge = cached ? now - cached.cachedAt : Number.POSITIVE_INFINITY;
  if (cacheAge >= 0 && cacheAge <= USAGE_CACHE_FRESH_MS) {
    const result = usageSuccessResult(requestId, cached.data);
    result.cacheStatus = 'hit';
    return result;
  }

  try {
    const data = await fetchUsageData(config, period, observedAt);
    await writeUsageCache(cacheContext, { cachedAt: now, data });
    return usageSuccessResult(requestId, data);
  } catch (error) {
    if (cached && cacheAge >= 0 && cacheAge <= USAGE_CACHE_STALE_MS) {
      const warnings = [...new Set([...(cached.data.warnings ?? []), 'USAGE_DATA_STALE'])];
      return usageSuccessResult(requestId, {
        ...cached.data,
        warnings,
        level: highestUsageLevel([cached.data.level, 'notice']),
        stale: true,
      });
    }
    return usageFailureResult(
      requestId,
      error instanceof UsageFailure ? error : new UsageFailure('USAGE_UPSTREAM_ERROR', 502),
    );
  }
}

function originError(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return { code: 'ORIGIN_REQUIRED', message: 'Request origin is required.' };
  if (origin !== new URL(request.url).origin) {
    return { code: 'ORIGIN_MISMATCH', message: 'Request origin is not allowed.' };
  }
  return null;
}

function authFailureResult(requestId, routeId, status, code, message) {
  return {
    routeId,
    errorCode: code,
    response: errorResponse({ requestId, status, code, message }),
  };
}

async function readResponseBytes(response) {
  const contentLength = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_STATIC_ASSET_BYTES) {
    throw new Error('Pages asset exceeds the verified size limit.');
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_STATIC_ASSET_BYTES) {
      await reader.cancel();
      throw new Error('Pages asset exceeds the verified size limit.');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchReleaseResponse(path) {
  const url = pagesReleaseUrl(path);
  if (!url) throw new Error('Pages release path is unsafe.');
  const response = await globalThis.fetch(url, {
    redirect: 'manual',
  });
  if (response.status !== 200) throw new Error('Pages release file is unavailable.');
  return response;
}

function markPagesStage(error, pagesStage) {
  const failure = error instanceof Error ? error : new Error('Pages request failed.');
  failure.pagesStage = pagesStage;
  return failure;
}

async function loadPagesManifest() {
  let response;
  try {
    response = await fetchReleaseResponse('release-manifest.json');
  } catch (error) {
    throw markPagesStage(error, 'manifest.fetch');
  }
  try {
    return await validatePagesManifest(await readResponseBytes(response));
  } catch (error) {
    throw markPagesStage(error, 'manifest.validate');
  }
}

function pagesLookupPath(pathname) {
  let path = normalizePath(pathname);
  if (path === PAGES_PUBLIC_PREFIX) return '/';
  if (path.startsWith(`${PAGES_PUBLIC_PREFIX}/`)) {
    path = path.slice(PAGES_PUBLIC_PREFIX.length);
  }
  return normalizePath(path);
}

function staticContentSecurityPolicy(env = {}) {
  const directives = [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https:",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  const { scriptUrl } = videoTogetherRuntime(env);
  if (scriptUrl) {
    const parsed = new URL(scriptUrl);
    directives[5] += ` ${scriptUrl}`;
    directives[10] += ` ${parsed.origin} wss://${parsed.host}`;
    directives[11] += ` ${parsed.origin}`;
    if (scriptUrl === VIDEOTOGETHER_OFFICIAL_SCRIPT_URL) {
      directives[10] += ` ${VIDEOTOGETHER_OFFICIAL_CONNECT_SOURCES.join(' ')}`;
      directives[11] += ' https://2gether.video';
    }
  }
  return directives.join('; ');
}

function applyStaticSecurityHeaders(headers, env) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=(), usb=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Content-Security-Policy', staticContentSecurityPolicy(env));
}

function canonicalMediaType(value) {
  if (typeof value !== 'string') return null;
  const [rawType, ...parameters] = value.toLowerCase().split(';').map((part) => part.trim());
  if (parameters.some((parameter) => parameter !== 'charset=utf-8')) return null;
  const type = rawType === 'application/javascript' ? 'text/javascript' : rawType;
  return parameters.length === 0 ? type : `${type}; charset=utf-8`;
}

function validateStaticAssetResponse(response, asset) {
  if (canonicalMediaType(response.headers.get('Content-Type')) !== canonicalMediaType(asset.contentType)) {
    throw new Error('Pages asset Content-Type mismatch.');
  }
  const rawLength = response.headers.get('Content-Length');
  if (rawLength === null) return null;
  if (!/^(0|[1-9]\d*)$/.test(rawLength)) {
    throw new Error('Pages asset Content-Length is invalid.');
  }
  const length = Number(rawLength);
  if (!Number.isSafeInteger(length)) throw new Error('Pages asset Content-Length is invalid.');
  if (length > MAX_STATIC_ASSET_BYTES) throw new Error('Pages asset exceeds the verified size limit.');
  return length;
}

function limitStaticAssetStream(stream) {
  if (!stream) return null;
  let total = 0;
  return stream.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
      total += bytes.byteLength;
      if (total > MAX_STATIC_ASSET_BYTES) {
        controller.error(new Error('Pages asset exceeds the verified size limit.'));
        return;
      }
      controller.enqueue(bytes);
    },
  }));
}

function staticResponse(body, contentLength, asset, requestId, status, head, env, pagesVersion) {
  const isHashedAsset = asset.path.startsWith('_next/static/');
  const cacheControl = isHashedAsset
    ? 'public, max-age=31536000, immutable'
    : 'no-cache, must-revalidate';
  const headers = responseHeaders(requestId, asset.contentType, { cacheControl, pagesVersion });
  if (contentLength !== null) headers.set('Content-Length', String(contentLength));
  applyStaticSecurityHeaders(headers, env);
  return new Response(head ? null : body, { status, headers });
}

function frontendUnavailableResponse(requestId, head, env, pagesVersion = null) {
  const bytes = new TextEncoder().encode(FRONTEND_UNAVAILABLE_HTML);
  const headers = responseHeaders(requestId, 'text/html; charset=utf-8', { pagesVersion });
  headers.set('Retry-After', '60');
  applyStaticSecurityHeaders(headers, env);
  return new Response(head ? null : bytes, { status: 503, headers });
}

function frontendIntegrityReason(stage, error) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'Pages asset exceeds the verified size limit.') return 'RESPONSE_TOO_LARGE';
  if (stage.endsWith('.fetch')) {
    return message === 'Pages release file is unavailable.'
      ? 'UPSTREAM_STATUS_REJECTED'
      : 'UPSTREAM_FETCH_FAILED';
  }
  if (message === 'Pages manifest is not valid JSON.') return 'MANIFEST_JSON_INVALID';
  if (message === 'Pages manifest release contract is invalid.') return 'MANIFEST_CONTRACT_INVALID';
  if (message === 'Pages manifest semantic version is invalid.') return 'MANIFEST_VERSION_INVALID';
  if (message === 'Pages manifest API contract is incompatible.') return 'MANIFEST_API_INCOMPATIBLE';
  if (message === 'Pages manifest worker range is incompatible.') return 'MANIFEST_RANGE_INCOMPATIBLE';
  if (message === 'Pages manifest route or asset map is invalid.') return 'MANIFEST_MAP_INVALID';
  if (message === 'Pages manifest asset metadata is invalid.') return 'MANIFEST_ASSET_METADATA_INVALID';
  if (message === 'Pages manifest route mapping is invalid.') return 'MANIFEST_ROUTE_MAPPING_INVALID';
  if (message === 'Pages manifest is missing the fixed 404 document.') return 'MANIFEST_404_MISSING';
  if (message === 'Pages asset Content-Type mismatch.') return 'ASSET_CONTENT_TYPE_MISMATCH';
  if (message === 'Pages asset Content-Length is invalid.') return 'ASSET_LENGTH_INVALID';
  return 'UNEXPECTED_ERROR';
}

function frontendIntegrityException(error) {
  const name = error instanceof Error && /^[A-Za-z][A-Za-z0-9.]{0,63}$/.test(error.name)
    ? error.name
    : 'UnknownError';
  const message = (error instanceof Error ? error.message : String(error ?? ''))
    .replace(/https?:\/\/[^\s"'<>]+/gi, '<url>')
    .replace(/\b(bearer|password|secret|token)\s*[:=]\s*[^\s,;]+/gi, '$1=<redacted>')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
  return {
    failureException: name,
    failureMessage: message || 'Unavailable',
  };
}

async function servePagesRequest(request, requestId, env) {
  let failureStage = 'manifest.fetch';
  let pagesVersion = null;
  try {
    const manifest = await loadPagesManifest();
    pagesVersion = manifest.pagesVersion;
    failureStage = 'asset.resolve';
    const path = pagesLookupPath(new URL(request.url).pathname);
    const routeAsset = Object.hasOwn(manifest.routes, path)
      ? `/${manifest.routes[path]}`
      : null;
    const assetKey = routeAsset
      ?? (Object.hasOwn(manifest.assets, path) ? path : '/404.html');
    const status = routeAsset || Object.hasOwn(manifest.assets, path) ? 200 : 404;
    const asset = manifest.assets[assetKey];
    failureStage = 'asset.fetch';
    const upstream = await fetchReleaseResponse(asset.path);
    failureStage = 'asset.validate';
    const contentLength = validateStaticAssetResponse(upstream, asset);
    const head = request.method === 'HEAD';
    if (head) await upstream.body?.cancel();
    const body = head ? null : limitStaticAssetStream(upstream.body);

    return {
      routeId: 'pages',
      errorCode: status === 404 ? 'PAGE_NOT_FOUND' : null,
      pagesVersion,
      cacheStatus: 'miss',
      upstreamClass: 'github-pages',
      response: staticResponse(body, contentLength, asset, requestId, status, head, env, pagesVersion),
    };
  } catch (error) {
    failureStage = error?.pagesStage ?? failureStage;
    return {
      event: 'frontend_integrity_error',
      routeId: 'pages',
      errorCode: 'FRONTEND_INTEGRITY_ERROR',
      pagesVersion,
      cacheStatus: 'bypass',
      upstreamClass: 'github-pages',
      failureStage,
      failureReason: frontendIntegrityReason(failureStage, error),
      ...frontendIntegrityException(error),
      response: frontendUnavailableResponse(requestId, request.method === 'HEAD', env, pagesVersion),
    };
  }
}

async function routeRequest(request, requestId, env) {
  const method = request.method.toUpperCase();
  const path = normalizePath(new URL(request.url).pathname);
  const isApi = path === '/api' || path.startsWith('/api/');

  if (isApi) {
    const route = ROUTES.find((candidate) => candidate.pattern.test(path));
    if (!route) {
      return {
        routeId: 'api.unknown',
        errorCode: 'API_ROUTE_NOT_FOUND',
        response: errorResponse({
          requestId,
          status: 404,
          code: 'API_ROUTE_NOT_FOUND',
          message: 'API route not found.',
          head: method === 'HEAD',
        }),
      };
    }

    if (!route.methods.includes(method)) {
      return {
        routeId: route.id,
        errorCode: 'METHOD_NOT_ALLOWED',
        response: errorResponse({
          requestId,
          status: 405,
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed for this route.',
          sse: route.sse,
          allow: route.methods.join(', '),
          head: method === 'HEAD',
        }),
      };
    }

    if ((AUTH_ROUTE_IDS.has(route.id) || DOCUMENT_ROUTE_IDS.has(route.id) || ADMIN_ROUTE_IDS.has(route.id)
      || LOW_FANOUT_ROUTE_IDS.has(route.id) || HIGH_FANOUT_ROUTE_IDS.has(route.id)
      || MEDIA_ROUTE_IDS.has(route.id))
      && authSetupMissing(env)) {
      return authFailureResult(
        requestId,
        route.id,
        503,
        'SETUP_REQUIRED',
        'Authentication setup is incomplete.',
      );
    }

    if ((AUTH_ROUTE_IDS.has(route.id) || DOCUMENT_ROUTE_IDS.has(route.id) || ADMIN_ROUTE_IDS.has(route.id)
      || LOW_FANOUT_ROUTE_IDS.has(route.id) || HIGH_FANOUT_ROUTE_IDS.has(route.id)
      || MEDIA_ROUTE_IDS.has(route.id))
      && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const failure = originError(request);
      if (failure) {
        return authFailureResult(requestId, route.id, 403, failure.code, failure.message);
      }
    }

    const mediaWithoutD1 = MEDIA_ROUTE_IDS.has(route.id)
      && (method === 'OPTIONS' || new URL(request.url).searchParams.has('token'));
    if (!mediaWithoutD1) {
      try {
        await ensureSchema(env, requestId);
      } catch (error) {
        const code = storageErrorCode(error);
        return {
          routeId: route.id,
          errorCode: code,
          response: errorResponse({
            requestId,
            status: 503,
            code,
            message: code === 'STORAGE_QUOTA_EXCEEDED'
              ? 'Storage quota is exhausted.'
              : 'Storage is unavailable.',
            sse: route.sse,
          }),
        };
      }
    }

    try {
      const handled = await handleAuthRoute(request, env, requestId, route);
      if (handled) return handled;
    } catch (error) {
      const code = storageErrorCode(error);
      return authFailureResult(
        requestId,
        route.id,
        503,
        code,
        code === 'STORAGE_QUOTA_EXCEEDED'
          ? 'Storage quota is exhausted.'
          : 'Storage is unavailable.',
      );
    }

    return {
      routeId: route.id,
      errorCode: 'ROUTE_NOT_IMPLEMENTED',
      response: errorResponse({
        requestId,
        status: 501,
        code: 'ROUTE_NOT_IMPLEMENTED',
        message: 'This API route is not implemented yet.',
        sse: route.sse,
      }),
    };
  }

  if (method !== 'GET' && method !== 'HEAD') {
    return {
      routeId: 'pages',
      errorCode: 'METHOD_NOT_ALLOWED',
      response: errorResponse({
        requestId,
        status: 405,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Static pages only support GET and HEAD.',
        allow: 'GET, HEAD',
      }),
    };
  }

  return servePagesRequest(request, requestId, env);
}

function logCompletion(request, result, requestId, startedAt) {
  const { response } = result;
  const entry = {
    event: result.event ?? 'request.complete',
    requestId,
    routeId: result.routeId,
    method: request.method.toUpperCase(),
    status: response.status,
    durationMs: Math.max(0, Date.now() - startedAt),
    workerVersion: WORKER_VERSION,
    pagesVersion: result.pagesVersion ?? null,
    apiContract: API_CONTRACT_VERSION,
    cacheStatus: result.cacheStatus ?? 'bypass',
    upstreamClass: result.upstreamClass ?? null,
    errorCode: result.errorCode,
  };
  if (result.failureStage) {
    entry.failureStage = result.failureStage;
    entry.failureReason = result.failureReason;
    entry.failureException = result.failureException;
    entry.failureMessage = result.failureMessage;
  }
  console.log(JSON.stringify(entry));
}

async function fetch(request, env = {}) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  let result;

  try {
    result = await routeRequest(request, requestId, env);
  } catch {
    result = {
      routeId: 'request',
      errorCode: 'INTERNAL_ERROR',
      response: errorResponse({
        requestId,
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'The request could not be processed.',
      }),
    };
  }

  logCompletion(request, result, requestId, startedAt);
  return result.response;
}

const worker = { fetch };

export default worker;
