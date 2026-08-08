import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../_worker.js';
import { createAuthD1Stub, createD1Stub } from './fixtures/d1.mjs';

const SECRETS = {
  ADMIN_PASSWORD: 'bootstrap-admin-password',
  AUTH_SECRET: 'auth-secret-with-at-least-thirty-two-bytes',
  PREMIUM_PASSWORD: 'premium-password',
};

async function request(path, options = {}) {
  const db = options.db ?? createD1Stub().db;
  const response = await worker.fetch(new Request(`https://worker.example${path}`, {
    method: options.method ?? 'GET',
    headers: options.headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }), { DB: db, ...SECRETS, ...options.env }, {});
  return response;
}

async function readError(response) {
  return (await response.json()).error;
}

async function login(db, username = 'admin', password = SECRETS.ADMIN_PASSWORD, ip = '192.0.2.1') {
  const response = await request('/api/auth', {
    db,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://worker.example',
      'CF-Connecting-IP': ip,
    },
    body: { username, password },
  });
  return {
    response,
    cookie: (response.headers.get('Set-Cookie') ?? '').split(';', 1)[0],
  };
}

async function accountRequest(db, cookie, path = '/api/auth/accounts', options = {}) {
  const headers = { Cookie: cookie, ...options.headers };
  if (options.method && options.method !== 'GET') headers.Origin = 'https://worker.example';
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  return request(path, { db, headers, ...options });
}

test('auth routes fail with SETUP_REQUIRED when DB or required secrets are missing or invalid', async () => {
  const missingDb = await worker.fetch(
    new Request('https://worker.example/api/auth'),
    { ...SECRETS },
    {},
  );
  assert.equal(missingDb.status, 503);
  assert.equal((await readError(missingDb)).code, 'SETUP_REQUIRED');

  const missingAdminPassword = await worker.fetch(
    new Request('https://worker.example/api/auth'),
    { DB: createD1Stub().db, AUTH_SECRET: SECRETS.AUTH_SECRET },
    {},
  );
  assert.equal(missingAdminPassword.status, 503);
  assert.equal((await readError(missingAdminPassword)).code, 'SETUP_REQUIRED');

  const missingAuthSecret = await worker.fetch(
    new Request('https://worker.example/api/auth'),
    { DB: createD1Stub().db, ADMIN_PASSWORD: SECRETS.ADMIN_PASSWORD },
    {},
  );
  assert.equal(missingAuthSecret.status, 503);
  assert.equal((await readError(missingAuthSecret)).code, 'SETUP_REQUIRED');

  const shortAuthSecret = await worker.fetch(
    new Request('https://worker.example/api/auth'),
    { DB: createD1Stub().db, ADMIN_PASSWORD: SECRETS.ADMIN_PASSWORD, AUTH_SECRET: 'too-short' },
    {},
  );
  assert.equal(shortAuthSecret.status, 503);
  assert.equal((await readError(shortAuthSecret)).code, 'SETUP_REQUIRED');
});

test('GET /api/auth exposes only the configured public authentication capabilities', async () => {
  const response = await request('/api/auth');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');

  const body = await response.json();
  assert.deepEqual(body, {
    hasAuth: true,
    loginMode: 'managed',
    persistSession: true,
    hasPremiumAuth: true,
  });
  assert.doesNotMatch(JSON.stringify(body), /bootstrap-admin-password|auth-secret|premium-password/);
});

test('bootstraps the admin into D1, stores only password and token hashes, and revokes logout', async () => {
  const { db, state } = createAuthD1Stub();
  const login = await request('/api/auth', {
    db,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://worker.example',
    },
    body: { username: 'admin', password: SECRETS.ADMIN_PASSWORD },
  });

  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.equal(loginBody.valid, true);
  assert.equal(loginBody.session.username, 'admin');
  assert.equal(loginBody.session.role, 'super_admin');
  assert.equal(loginBody.session.mode, 'managed');

  const setCookie = login.headers.get('Set-Cookie') ?? '';
  assert.match(setCookie, /^__Host-uxuv_session=[A-Za-z0-9_-]{43};/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.match(setCookie, /Path=\//);
  assert.doesNotMatch(setCookie, /Domain=/i);
  const cookie = setCookie.split(';', 1)[0];
  const rawToken = cookie.split('=', 2)[1];

  assert.equal(state.accounts.size, 1);
  const [account] = state.accounts.values();
  assert.notEqual(account.password_hash, SECRETS.ADMIN_PASSWORD);
  assert.notEqual(account.password_salt, SECRETS.ADMIN_PASSWORD);
  assert.equal(account.password_iterations, 100_000);
  assert.equal(state.sessions.size, 1);
  assert.equal(state.sessions.has(rawToken), false);

  const status = await request('/api/auth/session', {
    db,
    headers: { Cookie: cookie },
  });
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), {
    authenticated: true,
    session: loginBody.session,
  });

  const logout = await request('/api/auth/session', {
    db,
    method: 'DELETE',
    headers: { Cookie: cookie, Origin: 'https://worker.example' },
  });
  assert.equal(logout.status, 200);
  assert.equal((await logout.json()).success, true);
  assert.match(logout.headers.get('Set-Cookie') ?? '', /Max-Age=0/);
  assert.equal(state.sessions.size, 0);

  const afterLogout = await request('/api/auth/session', {
    db,
    headers: { Cookie: cookie },
  });
  assert.deepEqual(await afterLogout.json(), { authenticated: false, session: null });
});

test('keeps at most five sessions per account and rate-limits repeated login failures', async () => {
  const sessionStub = createAuthD1Stub();
  const cookies = [];
  for (let index = 0; index < 6; index += 1) {
    const response = await request('/api/auth', {
      db: sessionStub.db,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://worker.example',
        'CF-Connecting-IP': `192.0.2.${index + 1}`,
      },
      body: { username: 'admin', password: SECRETS.ADMIN_PASSWORD },
    });
    assert.equal(response.status, 200);
    cookies.push((response.headers.get('Set-Cookie') ?? '').split(';', 1)[0]);
  }
  assert.equal(sessionStub.state.sessions.size, 5);

  const evicted = await request('/api/auth/session', {
    db: sessionStub.db,
    headers: { Cookie: cookies[0] },
  });
  assert.deepEqual(await evicted.json(), { authenticated: false, session: null });

  const limitedStub = createAuthD1Stub();
  for (let index = 0; index < 5; index += 1) {
    const invalid = await request('/api/auth', {
      db: limitedStub.db,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://worker.example',
        'CF-Connecting-IP': '198.51.100.10',
      },
      body: { username: 'missing-user', password: 'wrong-password' },
    });
    assert.equal(invalid.status, 401);
  }
  const limited = await request('/api/auth', {
    db: limitedStub.db,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://worker.example',
      'CF-Connecting-IP': '198.51.100.10',
    },
    body: { username: 'missing-user', password: 'wrong-password' },
  });
  assert.equal(limited.status, 429);
  assert.equal((await readError(limited)).code, 'RATE_LIMITED');
  assert.equal(limited.headers.get('Retry-After'), '60');
});

test('allows only a super admin to list and create at most eight sanitized accounts', async () => {
  const { db, state } = createAuthD1Stub();
  const adminLogin = await login(db);
  assert.equal(adminLogin.response.status, 200);

  const initial = await accountRequest(db, adminLogin.cookie);
  assert.equal(initial.status, 200);
  const initialBody = await initial.json();
  assert.equal(initialBody.loginMode, 'managed');
  assert.equal(initialBody.managed, true);
  assert.equal(initialBody.totalCount, 1);
  assert.equal(initialBody.accounts[0].username, 'admin');
  assert.doesNotMatch(JSON.stringify(initialBody), /password_hash|password_salt|token_hash|bootstrap-admin-password/);

  let viewerId;
  for (let index = 1; index <= 7; index += 1) {
    const created = await accountRequest(db, adminLogin.cookie, '/api/auth/accounts', {
      method: 'POST',
      body: {
        username: `viewer-${index}`,
        name: `Viewer ${index}`,
        password: `viewer-password-${index}`,
        role: 'viewer',
        customPermissions: index === 1 ? ['iptv_access'] : [],
      },
    });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    if (index === 1) viewerId = createdBody.account.id;
    assert.equal(createdBody.account.username, `viewer-${index}`);
    assert.doesNotMatch(JSON.stringify(createdBody), /password_hash|password_salt|viewer-password/);
  }
  assert.equal(state.accounts.size, 8);

  const overLimit = await accountRequest(db, adminLogin.cookie, '/api/auth/accounts', {
    method: 'POST',
    body: {
      username: 'viewer-8',
      name: 'Viewer 8',
      password: 'viewer-password-8',
      role: 'viewer',
      customPermissions: [],
    },
  });
  assert.equal(overLimit.status, 409);
  assert.equal((await readError(overLimit)).code, 'ACCOUNT_LIMIT_REACHED');

  const anonymous = await request('/api/auth/accounts', { db });
  assert.equal(anonymous.status, 401);
  assert.equal((await readError(anonymous)).code, 'AUTH_REQUIRED');

  const viewerLogin = await login(db, 'viewer-1', 'viewer-password-1', '192.0.2.20');
  assert.equal(viewerLogin.response.status, 200);
  const forbidden = await accountRequest(db, viewerLogin.cookie);
  assert.equal(forbidden.status, 403);
  assert.equal((await readError(forbidden)).code, 'SUPER_ADMIN_REQUIRED');
  assert.ok(viewerId);
});

test('protects the last super admin and revokes sessions on password change or deletion', async () => {
  const { db, state } = createAuthD1Stub();
  const adminLogin = await login(db);
  const adminId = (await adminLogin.response.json()).session.accountId;

  const demoteLast = await accountRequest(db, adminLogin.cookie, `/api/auth/accounts/${adminId}`, {
    method: 'PATCH',
    body: { role: 'admin', password: 'replacement-admin-password' },
  });
  assert.equal(demoteLast.status, 409);
  assert.equal((await readError(demoteLast)).code, 'LAST_SUPER_ADMIN');
  const sessionAfterRejectedPatch = await request('/api/auth/session', {
    db,
    headers: { Cookie: adminLogin.cookie },
  });
  assert.equal((await sessionAfterRejectedPatch.json()).authenticated, true);

  const deleteLast = await accountRequest(db, adminLogin.cookie, `/api/auth/accounts/${adminId}`, {
    method: 'DELETE',
  });
  assert.equal(deleteLast.status, 409);
  assert.equal((await readError(deleteLast)).code, 'LAST_SUPER_ADMIN');

  const backup = await accountRequest(db, adminLogin.cookie, '/api/auth/accounts', {
    method: 'POST',
    body: {
      username: 'backup-admin',
      name: 'Backup Admin',
      password: 'backup-admin-password',
      role: 'super_admin',
      customPermissions: [],
    },
  });
  assert.equal(backup.status, 201);

  const viewer = await accountRequest(db, adminLogin.cookie, '/api/auth/accounts', {
    method: 'POST',
    body: {
      username: 'session-viewer',
      name: 'Session Viewer',
      password: 'old-viewer-password',
      role: 'viewer',
      customPermissions: [],
    },
  });
  assert.equal(viewer.status, 201);
  const viewerId = (await viewer.json()).account.id;
  const viewerLogin = await login(db, 'session-viewer', 'old-viewer-password', '192.0.2.30');
  assert.equal(viewerLogin.response.status, 200);

  const passwordChange = await accountRequest(db, adminLogin.cookie, `/api/auth/accounts/${viewerId}`, {
    method: 'PATCH',
    body: { password: 'new-viewer-password' },
  });
  assert.equal(passwordChange.status, 200);
  assert.equal((await passwordChange.json()).account.username, 'session-viewer');
  const revokedAfterPassword = await request('/api/auth/session', {
    db,
    headers: { Cookie: viewerLogin.cookie },
  });
  assert.deepEqual(await revokedAfterPassword.json(), { authenticated: false, session: null });

  const newViewerLogin = await login(db, 'session-viewer', 'new-viewer-password', '192.0.2.31');
  assert.equal(newViewerLogin.response.status, 200);
  const deleted = await accountRequest(db, adminLogin.cookie, `/api/auth/accounts/${viewerId}`, {
    method: 'DELETE',
  });
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), { success: true });
  assert.equal(state.accounts.has(viewerId), false);
  assert.equal([...state.sessions.values()].some((session) => session.account_id === viewerId), false);

  const revokedAfterDelete = await request('/api/auth/session', {
    db,
    headers: { Cookie: newViewerLogin.cookie },
  });
  assert.deepEqual(await revokedAfterDelete.json(), { authenticated: false, session: null });

  const demoted = await accountRequest(db, adminLogin.cookie, `/api/auth/accounts/${adminId}`, {
    method: 'PATCH',
    body: { role: 'admin' },
  });
  assert.equal(demoted.status, 200);
  assert.equal((await demoted.json()).account.role, 'admin');
});

test('stores Premium unlock on the current session and enforces it on Premium APIs', async () => {
  const { db, state } = createAuthD1Stub();
  const adminLogin = await login(db);
  const viewer = await accountRequest(db, adminLogin.cookie, '/api/auth/accounts', {
    method: 'POST',
    body: {
      username: 'premium-viewer',
      name: 'Premium Viewer',
      password: 'premium-viewer-password',
      role: 'viewer',
      customPermissions: [],
    },
  });
  assert.equal(viewer.status, 201);

  const viewerLogin = await login(db, 'premium-viewer', 'premium-viewer-password', '192.0.2.40');
  assert.equal(viewerLogin.response.status, 200);
  const locked = await request('/api/premium/category', {
    db,
    headers: { Cookie: viewerLogin.cookie },
  });
  assert.equal(locked.status, 403);
  assert.equal((await readError(locked)).code, 'PREMIUM_REQUIRED');

  for (let index = 0; index < 10; index += 1) {
    const invalid = await request('/api/auth', {
      db,
      method: 'POST',
      headers: {
        Cookie: viewerLogin.cookie,
        'Content-Type': 'application/json',
        Origin: 'https://worker.example',
      },
      body: { type: 'premium', password: 'wrong-premium-password' },
    });
    assert.equal(invalid.status, 401);
    assert.equal((await readError(invalid)).code, 'INVALID_PREMIUM_CREDENTIALS');
  }
  const limited = await request('/api/auth', {
    db,
    method: 'POST',
    headers: {
      Cookie: viewerLogin.cookie,
      'Content-Type': 'application/json',
      Origin: 'https://worker.example',
    },
    body: { type: 'premium', password: SECRETS.PREMIUM_PASSWORD },
  });
  assert.equal(limited.status, 429);

  state.rateLimits.clear();
  const unlocked = await request('/api/auth', {
    db,
    method: 'POST',
    headers: {
      Cookie: viewerLogin.cookie,
      'Content-Type': 'application/json',
      Origin: 'https://worker.example',
    },
    body: { type: 'premium', password: SECRETS.PREMIUM_PASSWORD },
  });
  assert.equal(unlocked.status, 200);
  assert.deepEqual(await unlocked.json(), { valid: true });
  assert.ok([...state.sessions.values()].some((session) => session.premium_until > Date.now()));

  const premium = await request('/api/premium/category', {
    db,
    headers: { Cookie: viewerLogin.cookie },
  });
  assert.equal(premium.status, 400);
  assert.equal((await readError(premium)).code, 'INVALID_SOURCE');

  const adminBypass = await request('/api/premium/types', {
    db,
    headers: { Cookie: adminLogin.cookie },
  });
  assert.equal(adminBypass.status, 400);
  assert.equal((await readError(adminBypass)).code, 'INVALID_SOURCE');

  const noPassword = await request('/api/premium/types', {
    db,
    env: { PREMIUM_PASSWORD: '' },
    headers: { Cookie: viewerLogin.cookie },
  });
  assert.equal(noPassword.status, 400);
  assert.equal((await readError(noPassword)).code, 'INVALID_SOURCE');
});

export { SECRETS, request };
