export function createD1Stub(options = {}) {
  const calls = {
    prepared: [],
    batches: [],
  };

  const db = {
    prepare(sql) {
      calls.prepared.push(sql);
      return { sql };
    },
    async batch(statements) {
      calls.batches.push(statements.map((statement) => statement.sql));
      if (options.batchError) throw options.batchError;
      return statements.map((statement, index) => ({
        success: true,
        meta: options.meta?.(statement.sql, index) ?? {
          rows_read: 0,
          rows_written: index + 1,
          duration: index,
        },
      }));
    },
  };

  return { db, calls };
}

export const EXPECTED_QUERY_PLANS = {
  'account.by_username': 'sqlite_autoindex_accounts_2',
  'account.list': 'idx_accounts_created_at',
  'account.super_admin_count': 'idx_accounts_role',
  'session.by_token': 'sqlite_autoindex_sessions_1',
  'session.by_account': 'idx_sessions_account_created_at',
  'session.expired': 'idx_sessions_expires_at',
  'document.by_key': 'sqlite_autoindex_user_documents_1',
  'rate_limit.by_key': 'sqlite_autoindex_rate_limits_1',
  'rate_limit.expired': 'idx_rate_limits_expires_at',
};

function authResult(results = [], rowsRead = 0, rowsWritten = 0) {
  return {
    success: true,
    results: results.map((row) => ({ ...row })),
    meta: {
      rows_read: rowsRead,
      rows_written: rowsWritten,
      duration: 0,
    },
  };
}

function statementMarker(sql) {
  return /^\/\*\s*([a-z0-9_.-]+)\s*\*\//i.exec(sql)?.[1] ?? null;
}

export function createAuthD1Stub() {
  const state = {
    accounts: new Map(),
    documents: new Map(),
    sessions: new Map(),
    rateLimits: new Map(),
  };
  const calls = {
    prepared: [],
    bindings: [],
    batches: [],
  };

  function accountByUsername(username) {
    return [...state.accounts.values()].find((account) => account.username === username) ?? null;
  }

  function hasOtherSuperAdmin(accountId) {
    return [...state.accounts.values()]
      .some((account) => account.id !== accountId && account.role === 'super_admin');
  }

  function execute(sql, bindings) {
    calls.bindings.push([...bindings]);
    const marker = statementMarker(sql);

    if (marker === 'account.by_username') {
      const account = accountByUsername(bindings[0]);
      return authResult(account ? [account] : [], Math.min(state.accounts.size, 1));
    }
    if (marker === 'account.list') {
      const accounts = [...state.accounts.values()]
        .sort((left, right) => left.created_at - right.created_at || left.id.localeCompare(right.id))
        .slice(0, 8);
      return authResult(accounts, accounts.length);
    }
    if (marker === 'account.insert_bootstrap') {
      if (state.accounts.size > 0 || accountByUsername(bindings[1])) return authResult([], state.accounts.size);
      const account = {
        id: bindings[0],
        username: bindings[1],
        display_name: bindings[2],
        role: bindings[3],
        permissions_json: bindings[4],
        password_hash: bindings[5],
        password_salt: bindings[6],
        password_iterations: bindings[7],
        session_version: bindings[8],
        created_at: bindings[9],
        updated_at: bindings[10],
      };
      state.accounts.set(account.id, account);
      return authResult([account], 0, 5);
    }
    if (marker === 'account.by_id') {
      const account = state.accounts.get(bindings[0]);
      return authResult(account ? [account] : [], account ? 1 : 0);
    }
    if (marker === 'account.insert') {
      if (state.accounts.size >= bindings[10] || accountByUsername(bindings[1])) {
        return authResult([], Math.min(state.accounts.size, bindings[10]));
      }
      const account = {
        id: bindings[0],
        username: bindings[1],
        display_name: bindings[2],
        role: bindings[3],
        permissions_json: bindings[4],
        password_hash: bindings[5],
        password_salt: bindings[6],
        password_iterations: bindings[7],
        session_version: 1,
        created_at: bindings[8],
        updated_at: bindings[9],
      };
      state.accounts.set(account.id, account);
      return authResult([account], state.accounts.size, 5);
    }
    if (marker === 'account.update') {
      const accountId = bindings[8];
      const current = state.accounts.get(accountId);
      if (!current || (current.role === 'super_admin'
        && bindings[9] !== 'super_admin'
        && !hasOtherSuperAdmin(accountId))) {
        return authResult([], current ? 2 : 1);
      }
      const hasPassword = bindings[3] !== null;
      const account = {
        ...current,
        display_name: bindings[0],
        role: bindings[1],
        permissions_json: bindings[2],
        password_hash: bindings[3] ?? current.password_hash,
        password_salt: bindings[4] ?? current.password_salt,
        password_iterations: bindings[5] ?? current.password_iterations,
        session_version: current.session_version + (hasPassword ? 1 : 0),
        updated_at: bindings[7],
      };
      state.accounts.set(accountId, account);
      return authResult([account], 2, 5);
    }
    if (marker === 'account.delete') {
      const accountId = bindings[0];
      const current = state.accounts.get(accountId);
      if (!current || (current.role === 'super_admin' && !hasOtherSuperAdmin(accountId))) {
        return authResult([], current ? 2 : 1);
      }
      state.accounts.delete(accountId);
      for (const [tokenHash, session] of state.sessions) {
        if (session.account_id === accountId) state.sessions.delete(tokenHash);
      }
      for (const key of state.documents.keys()) {
        if (key.startsWith(`${accountId}:`)) state.documents.delete(key);
      }
      return authResult([{ id: accountId }], 2, 5);
    }
    if (marker === 'session.by_token') {
      const session = state.sessions.get(bindings[0]);
      const account = session ? state.accounts.get(session.account_id) : null;
      return authResult(session && account ? [{ ...session, ...account }] : [], session ? 2 : 1);
    }
    if (marker === 'session.insert') {
      const session = {
        token_hash: bindings[0],
        account_id: bindings[1],
        premium_until: bindings[2],
        expires_at: bindings[3],
        created_at: bindings[4],
        last_seen_at: bindings[5],
      };
      state.sessions.set(session.token_hash, session);
      return authResult([], 0, 4);
    }
    if (marker === 'session.trim') {
      const [accountId, , limit] = bindings;
      const sessions = [...state.sessions.values()]
        .filter((session) => session.account_id === accountId)
        .sort((left, right) => right.created_at - left.created_at
          || right.token_hash.localeCompare(left.token_hash));
      const removed = sessions.slice(limit);
      removed.forEach((session) => state.sessions.delete(session.token_hash));
      return authResult([], sessions.length, removed.length * 4);
    }
    if (marker === 'session.delete_token') {
      const removed = state.sessions.delete(bindings[0]);
      return authResult([], 1, removed ? 4 : 0);
    }
    if (marker === 'session.delete_account') {
      const [accountId, expectedAccountId, updatedAt, sessionVersion] = bindings;
      const account = state.accounts.get(expectedAccountId);
      if (!account
        || accountId !== expectedAccountId
        || account.updated_at !== updatedAt
        || account.session_version !== sessionVersion) {
        return authResult([], account ? 1 : 0);
      }
      let removed = 0;
      for (const [tokenHash, session] of state.sessions) {
        if (session.account_id === accountId) {
          state.sessions.delete(tokenHash);
          removed += 1;
        }
      }
      return authResult([], removed, removed * 4);
    }
    if (marker === 'session.premium') {
      const [premiumUntil, tokenHash, now] = bindings;
      const session = state.sessions.get(tokenHash);
      if (!session || session.expires_at <= now) return authResult([], session ? 1 : 0);
      session.premium_until = premiumUntil;
      return authResult([{ premium_until: premiumUntil }], 1, 1);
    }
    if (marker === 'session.touch') {
      const [now, tokenHash, threshold] = bindings;
      const session = state.sessions.get(tokenHash);
      if (!session || session.last_seen_at > threshold) return authResult([], session ? 1 : 0);
      session.last_seen_at = now;
      return authResult([], 1, 1);
    }
    if (marker === 'document.by_key') {
      const document = state.documents.get(`${bindings[0]}:${bindings[1]}`);
      return authResult(document ? [document] : [], document ? 1 : 0);
    }
    if (marker === 'document.cas') {
      const [accountId, kind, payloadJson, updatedAt, baseVersion, cutoff] = bindings;
      const key = `${accountId}:${kind}`;
      const current = state.documents.get(key);
      if (current && (current.version !== baseVersion || current.updated_at > cutoff)) {
        return authResult([], 1, 0);
      }
      const document = {
        account_id: accountId,
        kind,
        version: current ? current.version + 1 : 1,
        payload_json: payloadJson,
        updated_at: updatedAt,
      };
      state.documents.set(key, document);
      return authResult([document], current ? 1 : 0, 1);
    }
    if (marker === 'rate_limit.consume') {
      const [bucketKey, windowStart, expiresAt, maximum] = bindings;
      const current = state.rateLimits.get(bucketKey);
      if (current?.window_start === windowStart && current.count >= maximum) {
        return authResult([], 1, 0);
      }
      const next = current?.window_start === windowStart
        ? { ...current, count: current.count + 1, expires_at: expiresAt }
        : { bucket_key: bucketKey, window_start: windowStart, count: 1, expires_at: expiresAt };
      state.rateLimits.set(bucketKey, next);
      return authResult([next], current ? 1 : 0, 3);
    }

    throw new Error(`Unhandled auth D1 statement: ${marker ?? sql}`);
  }

  function prepare(sql) {
    calls.prepared.push(sql);
    const createStatement = (bindings = []) => ({
      sql,
      bindings,
      bind(...values) {
        return createStatement(values);
      },
      all() {
        return Promise.resolve(execute(sql, bindings));
      },
      run() {
        return Promise.resolve(execute(sql, bindings));
      },
    });
    return createStatement();
  }

  const db = {
    prepare,
    async batch(statements) {
      calls.batches.push(statements.map(({ sql }) => sql));
      if (statements.every(({ sql }) => /^CREATE (?:TABLE|INDEX)/i.test(sql))) {
        return statements.map(() => authResult());
      }
      return statements.map((statement) => execute(statement.sql, statement.bindings));
    },
  };

  return { db, state, calls };
}
