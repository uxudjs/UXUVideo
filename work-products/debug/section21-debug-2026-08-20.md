# Section 21 review remediation debug record

Date: 2026-08-20

## Outcome

The confirmed product defects from the review were reproduced with focused RED tests and repaired. Product-level Worker and Pages checks are green. The release candidate remains deliberately fail-closed because the old T15 receipt does not identify the current Worker or Pages manifests, the old performance trace contains machine paths, and five new sync-state screenshots are not yet included in a regenerated binary receipt and visual approval.

## Root causes and repairs

- Upstream fetch accounting ended after headers. `controlledFetch` now keeps the timeout, abort listener, and concurrency budget active through bounded body consumption; `upstreamJson` consumes within that boundary.
- Server document validation relied mainly on byte size. Worker normalization now enforces the client collection, tombstone, field, and per-video skip-rule limits before D1 writes and after merges.
- Subscription resync trusted stored `sourceIds` as ownership. Sources now carry an explicit `subscriptionId`; replacement removes only sources actually owned by the same subscription and mode, rejects cross-owner ID collisions, and applies the subscription plus source mutation atomically.
- Grouped favorites toggled only the representative item and the home exact-match route mixed incompatible groups. Favorite operations now target the actually favorited group member, and exact home matches select one conservative type/year group.
- The formal Pages Node command excluded the T08 phase. The package command now runs the complete Section 21 contract.
- Project Pages mixed direct-public behavior with Worker assets. The public root now serves deployment guidance while the immutable Worker asset contract uses the stable `app/` subroot.
- Sync timing had only a source-string assertion and approved screenshots hid the status. Playwright now proves successful recovery remains visible for 2,999 ms and hides at 3,000 ms, proves offline/quota/conflict/error remain visible after 5 seconds, and captures five visible state candidates with viewport and floating-action geometry checks.
- Candidate hygiene treated ZIP files as opaque. It now parses bounded stored/deflated ZIP members recursively, rejects unsafe or unscannable archives, and scans textual members for secrets and machine paths.
- The security baseline removed every line containing `iptv` before hashing. It now freezes complete security test files byte-for-byte and runs all 31 assertions.
- The preapproval T15 JSON and later Markdown approval were contradictory. `t15-visual-approval.json` now chains the exact preapproval JSON, visual review, approval text, time, and candidate combined hash without granting commit, push, deploy, or remote-change authority.

## Validation observed

- Worker focused timeout and document-limit tests: 9/9 passed.
- Worker security baseline: 2/2 wrapper tests and 31/31 frozen security assertions passed.
- Worker syntax and gzip-size checks passed; gzip is 39,995 bytes against the 3 MiB limit.
- Pages Node suites: 163/163 and formal Section 21 9/9 passed.
- Pages TypeScript and ESLint passed.
- Pages build passed through the repository Playwright web server.
- Sync timing E2E: 4/4 passed.
- Visible sync candidate/geometry E2E: 1/1 passed and produced five screenshots.
- Direct Project Pages guidance/no-auth E2E: 1/1 passed.
- Both repositories passed `git diff --check`; line-ending conversion warnings remain informational.

## Intentional release blockers

`candidate-hygiene.test.mjs` is intentionally RED until a new candidate is generated:

- The T15 receipt hashes do not match current `_worker.js`, `package.json`, or `package-lock.json`.
- The historical performance trace contains repository-host machine paths inside textual ZIP members.
- The five new visible sync-state PNGs have no current binary allowlist receipt.

Before regenerating build, release, rollback, performance, binary, candidate, and visual-approval evidence, choose one dependency identity: retain the current Pages dependency manifest and accept it as the next candidate, or restore the previously evidenced manifest bytes. Do not update the old receipt in place.

No commit, push, deployment, Cloudflare change, or production claim was made.

## Attempt 12: rejected visual material remediation

### Outcome

Attempt 11 is retained as an immutable visual rejection. Attempt 12 replaces only the rejected visual candidate and its approval contract. The new candidate is locally green and visually ready, but S21-T15 remains `in_progress` with release `HOLD` until the user makes a new visual decision.

### Reproduction and root cause

- The old light and dark regular surfaces were close to opaque, so blur existed in CSS without producing visible background diffusion.
- The shared material had no explicit bright rim, dark lower edge, or restrained specular layer, so functional controls read as ordinary solid cards.
- The update and sync corner controls were not consistently included in the shared regular material selector.
- The human approval copy exposed machine identity values and asked the user to repeat them, although those values are only needed for internal evidence binding.

The first focused material-contract run was RED in two assertions because the old stylesheet had no sheen primitives. A focused accessibility run then exposed a second real defect: a legacy shared background variable made Premium content cards translucent. That variable now maps to the opaque content surface, while transparency is limited to the functional navigation and control layer.

### Smallest repair

- Reworked only the shared CSS material tokens and selectors needed for functional Liquid Glass: translucent semantic surfaces, backdrop diffusion, a bright upper rim, a dark lower edge, restrained sheen, and ambient light/dark backgrounds.
- Added the update and sync controls to the same material system.
- Kept content cards and settings panels opaque and blur-free.
- Extended existing contract, visual, accessibility, and performance assertions; no new runtime abstraction or business-code path was introduced for this visual repair.
- Changed the human decision contract to candidate label plus visible previews. Machine integrity remains internal.

### GREEN evidence

- Pages focused material contracts: 15/15 passed.
- Pages full Node suite: 163/163 plus formal Section 21 9/9 passed.
- Pages full browser suite: 125/125 passed.
- Dedicated performance trace: 1/1 passed; all three samples observed 8.5 ms p95 animation frames, zero long tasks, and zero dropped frames.
- Pages production build, release build, ESLint, TypeScript, dependency-tree check, and diff check passed.
- Worker full suite: 168/168 passed; syntax, gzip-size, dependency-tree, and diff checks passed.
- Rollback replay: 1/1 passed across bootstrap, reverse, and forward-restore phases.
- Evidence transition, archived rejection, validation receipt, and hygiene checks: 10/10 passed.
- In-app browser inspection passed at 1280x720 and 320x720. The narrow viewport had no horizontal overflow and retained the full 44 px action control.

### Remaining boundary

The candidate contains 121 screenshots and is `PENDING` visual review. No commit, push, PR, deployment, Cloudflare/D1/Secret change, remote audit, or production claim was made or authorized.

## Attempt 13: pre-presentation sync geometry and evidence-state remediation

### Outcome

Attempt 12 remains an internal pre-presentation rejection because its persistent sync overlay covered the settings back navigation and title at 320 px and 200% text. Attempt 13 preserves the accepted Liquid Glass material work, moves the global settings-route status into document flow, and closes the evidence transition and readiness-state gaps. The regenerated 121-image candidate is locally green and was approved by the user; release remains `HOLD`.

### RED evidence and corrections

- The attempt 12 screenshots reproduced the overlay/navigation intersection. The first implementation removed the global status from settings routes, but six existing app-flow assertions then failed because offline, quota, conflict, and synced phases were no longer globally observable. That run was stopped after the regression became deterministic.
- The corrected implementation preserves all timing and retry behavior, adds a settings-route class, and renders the same global status as a relative page-flow banner. The first focused geometry run then caught a real overlap with the fixed app-update trigger. Reserving the shared edge inset, control hit size, and an additional half-rem gap removed that overlap without weakening the assertion.
- The old evidence-generator tests inspected source strings only. The transition policy is now an executable pure guard with negative cases for illegal decisions, missing or drifted prior evidence/review, and zero writes after any failed validation; write authorization is single-use.
- Independent review found the generated `PENDING` approval conflicted with a stale `NOT_READY` task receipt and todo. A four-file readiness test reproduced the mismatch as RED; receipt, todo, review, and approval now agree on local `GREEN`, visual `PENDING`, release `HOLD`, and a single remaining user decision. Candidate hygiene also enforces the active receipt/approval/todo mapping.
- Independent review then found that attempts 11 and 12 had not retained attempt-specific PNG bytes: their archived links were broken or pointed at the mutable current-candidate directory, while the attempt 12 review and task receipt still contained predecision `PENDING` fields. A dedicated archive-closure test first failed because no correction chain existed. Two byte-bound correction receipts now preserve all rejected artifacts unchanged, mark the original previews unavailable, prohibit substitution from the current candidate, and identify the stale attempt 12 fields as superseded by its `REJECTED` and `userPresented: false` terminal state.

### GREEN evidence

- Focused sync and material contracts: 15/15 passed; focused visible-state geometry: 1/1 passed across 320/640@200%/768/1024/1440.
- Pages full Node suites: 163/163 plus formal Section 21 9/9 passed.
- Pages full browser suite: 125/125 passed.
- Dedicated performance trace: 1/1 passed; three-sample median p95 animation interval 10.2 ms, zero long tasks, and zero dropped frames.
- Pages production build, release build, ESLint, TypeScript, dependency-tree check, and diff check passed.
- Paired rollback generation and independent replay passed all bootstrap-v2, reverse-v1, and forward-restore-v2 phases.
- Candidate identity, archived rejection, recursive ZIP hygiene, validation receipt, and transition checks passed; the final candidate contains 121 screenshots and 137 receipted binary files.
- In-app browser inspection passed at desktop and 320 px. The narrow fail-closed page had no console warnings or horizontal overflow.
- The readiness consistency test passed after its recorded RED, and the combined plan/hygiene gate passed 33/33.
- The historical visual-archive closure test passed after its recorded RED; the combined plan, transition, validation, and recursive-hygiene gate passed 40/40.
- The terminal approval consistency test was updated first and reproduced the still-pending four-file state as RED. After the explicit user decision was recorded, approval, review, task receipt, and todo agreed on `completed`, visual `APPROVED`, local `GREEN`, and release `HOLD`.

### Final boundary

The user approved visual candidate 13, completing the local Section 21 plan. No commit, push, PR, deployment, Cloudflare/D1/Secret change, remote audit, or production claim was made or authorized; release remains `HOLD`.

## Attempt 14: post-ship candidate integrity and lifecycle remediation

### Outcome

The four blockers found by the final ship review were reproduced and repaired with focused regressions. The active evidence now describes visual candidate 14, all observed local automated gates are green, and release remains deliberately `HOLD` because the new candidate has not received a user visual decision.

Attempt 13 remains immutable historical approval evidence. It cannot approve attempt 14 because routine E2E changed the active PNG bytes and the Worker and rollback identities subsequently changed.

### Reproduction, root causes, and smallest repairs

- Declared `Content-Length` overflow and blocked redirect validation both threw before cancelling the owned upstream response body. Two focused stream tests first failed with `cancelled: false`; `controlledFetch` now cancels before either rejection.
- Four routine Playwright producers wrote directly to the formal visual candidate directory. A contract test first failed on all four producers. They now write to `work/section21-candidate-draft` by default and require explicit `UXUV_WRITE_VISUAL_CANDIDATE=1` for formal candidate generation.
- The rollback drill omitted `public/**`, so it never proved that the deployment-required `public/github-pages.html` appears in v2 and disappears in v1. The scope assertion first failed, then the regenerated pair passed all three replay phases with that file included.
- The active final acceptance matrix still bound attempt 10 while current evidence was attempt 14. A new dynamic binding test first failed on the plan SHA. The matrix now binds the current plan, Worker runtime and manifest, Pages manifest and release scope, candidate, trace, release manifest, rollback pair, and `PENDING` decision.
- The evidence transition previously required a rejection before replacing any prior decision, so it could not faithfully preserve an immutable approved attempt whose candidate bytes later drifted. The transition now permits replacement only when the prior approval chain validates and the candidate combined identity demonstrably differs. Attempt 13 approval was archived and invalidated for current bytes, not rewritten as a rejection.
- A native Playwright JSON report retained machine-absolute paths. Attempt 14 evidence was corrected through an explicit receipt: the raw report was discarded, a sanitized relative-path summary was retained, and the candidate images and pending visual decision were unchanged.

### RED/GREEN evidence

- Upstream response-body lifecycle: focused RED 5/7, then GREEN 7/7.
- Candidate producer ownership: contract RED 9/10 with eight missing ownership assertions, then GREEN 10/10; a real default Playwright run produced 12 draft screenshots and changed zero approved-candidate files.
- Rollback scope: deterministic RED before replay, then GREEN 1/1 across bootstrap-v2, reverse-v1, and forward-restore-v2.
- Matrix identity: deterministic RED on the stale plan binding, then candidate hygiene GREEN 9/9.
- Explicit candidate generation: full Pages E2E 125/125; 121 PNG, 41,548,276 bytes, combined SHA-256 `ecd34b9d3b650caa864039ceb899409358f7229782464e9fb8855a63bde8c9b3`.
- Pages native gates: Node 163/163 plus Section 21 10/10 and grouped-cache/settings-transfer 4/4; build, release build, ESLint, TypeScript, dependency tree, and diff check passed.
- Worker native gates: syntax passed; Node 175/175; gzip 40,217/3,145,728 bytes; empty runtime dependency tree and diff check passed.
- Performance: three-sample median p95 animation interval 8.5 ms, zero long tasks, and zero dropped frames. The sanitized trace was reused only after proving the Pages release-scope identity was byte-exact.

### Remaining boundary

Visual candidate 14 is `PENDING`. No commit, push, PR, deployment, Cloudflare/D1/Secret change, remote audit, or production claim was made or authorized.
