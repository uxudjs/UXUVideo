# App update version identity debug — 2026-08-13

## Symptom

The local Worker candidate differed from GitHub `main`, but both declared `1.0.0`. `GET /api/app-update` therefore reported `up-to-date`, and the authenticated artifact endpoint returned the older remote `_worker.js`.

## Root cause

The backward-compatible global update/copy feature was left on the already released `1.0.0` identity. The update contract compared semantic versions, so two different byte streams with the same declared version were indistinguishable. The artifact endpoint verified that the downloaded source matched the remote version but did not reject a remote version older than the running Worker.

## RED evidence

- `work-products/tests/app-update-artifact.test.mjs`: remote `0.9.0` returned HTTP 200 and fetched `_worker.js`; expected HTTP 409 before the source request.
- `work-products/tests/worker-only-boundary.test.mjs`: Worker/package/lock/README/changelog were not synchronized at `1.1.0`.
- Focused baseline: 12 passed, 2 failed.

## Minimal fix

- Release the new backward-compatible feature as Worker `1.1.0`, synchronized across `_worker.js`, `package.json`, `package-lock.json`, `README.md`, and `CHANGELOG.md`.
- Before fetching artifact bytes, compare the verified remote version with `WORKER_VERSION`; return `409 APP_UPDATE_VERSION_MISMATCH` when remote is older.
- Keep the existing source-version equality, 3 MiB, authentication, redirect, and structured-error checks unchanged.

## GREEN evidence

- Focused affected suites: 27/27 passed.
- `node --check _worker.js`: passed.
- `npm test`: 98/98 passed.
- `npm run check:size`: source 165,661 bytes; gzip 39,474 / 3,145,728 bytes.
- Candidate secret-prefix scan: 0 matches.
- `git diff --check`: passed; only line-ending conversion warnings were emitted.
- Real read-only GitHub `main` probe: current `1.1.0`, remote `1.0.0`, status `ahead-of-remote`; artifact returned HTTP 409 `APP_UPDATE_VERSION_MISMATCH`, and remote `_worker.js` was not fetched.

## Evidence boundary

This proves the uncommitted local candidate and a read-only GitHub comparison. It does not prove a commit, push, Cloudflare deployment, production session, or production D1 state. Until the `1.1.0` source is intentionally published to the configured repository, the copy action must remain unavailable for this local/remote pairing.
