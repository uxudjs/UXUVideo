# 第三恢复计划：SPEC 第 22 节账户级用量与本地门禁

> 状态：PLAN CANDIDATE / APPROVAL REQUIRED
> 候选 ID：`s22-account-usage-execution-recovery-20260821-02`
> 规划日期：2026-08-21
> 执行策略：`serial`
> 安全并发上限：1
> 计划批准不授权：实现、commit、push、部署、联网或 Cloudflare/D1 远程变更

## 1. 规划依据、已采纳成果与边界

- 已批准规范：`work-products/SPEC.md` 第 22 节。账户级 API、严格解析、Pages 四指标、三语、四断点、安全、兼容、版本与回滚决定均已确定，无需重新规格化。
- 初始计划、第一恢复计划和第二恢复计划的终态分别冻结在 `work-products/evidence/section22/blocked-wave2-*`、`blocked-r01-*` 与 `blocked-r10-*`；冻结文件、R01/R10 attempt、request、manifest、snapshot、sidecar 与 receipt 永久只读。
- 采纳既有 Section 22 产品/UI/文档成果、S22-R00 合同迁移、S22-R09 baseline CLI 与本轮 todo-capture RED/GREEN 防重演修复；不重跑已完成任务，不把 blocked 历史改写为 completed。
- S22-R10 的唯一根因是 request 将活动 `work-products/todo.md` 纳入 immutable Worker repository inventory；合法状态更新后 `verify --phase inputs` 必然报告 `repository identity drift`。receipt 证明 worker 未启动且 changed paths 为空。
- 计划合同已在批准前分层：三代历史合同只读各自冻结 plan/todo，新活动合同只读当前 R15—R18。合同迁移不是 build 首任务，因此 build 零执行者预检无需先执行代码才能变绿。
- 用户确认的 Pages 并发既有状态继续作为只读 `protected_inputs`：`../UXUV-Pages/package.json`、`../UXUV-Pages/work-products/tests/iptv-retirement-contract.test.mjs`、`../UXUV-Pages/work-products/tests/pages-deployment.test.mjs`、`../UXUV-Pages/work-products/tests/repository-test-isolation.test.mjs`。不要求 clean、不重新归因。
- 版本保持 Worker `2.0.0`、Pages `0.3.0`、API Contract `2` 与现有 Worker range；不安装依赖，不修改 D1 schema/binding，不删除远程旧变量。
- 本候选仅规划剩余本地修复与验证；终态上限为 `LOCAL CANDIDATE / RELEASE HOLD`。

## 2. 目标、当前预检与验收总则

完成后必须同时满足：

1. 活动 Worker、README、Pages 源码与活动测试对两个退役配置名完整字面量零命中；历史 SPEC、CHANGELOG、冻结证据可保留。
2. Worker 测试仍证明遗留变量被忽略；Pages 只显示两个活动配置名与四个账户指标。兼容测试可在运行时分段构造旧键。
3. 账户级 API、严格 parser、阈值、鉴权、同源、stale、Token 零泄漏、三语、四断点与 axe 不回退。
4. 每个新 attempt 使用唯一任务 ID、全新 no-replace 根、完整 target snapshot、immutable/protected input identity、环境身份与自审计。
5. 活动 todo 永远是主代理编排状态：除 Worker repository 的精确 exclusion 外，不得与 attempt root、target、snapshot、input、protected input、orchestration output、toolchain entrypoint、generated namespace、repository files 或 fingerprint 相等或重叠。
6. 所有 receipt 都是主代理 create-new 编排输出，必须列入 `s22-execution-baseline-request/v2` 的 `orchestration_outputs` 并从 repository inventory 排除，但不进入 worker target/snapshot/fingerprint，避免循环身份。
7. Pages 关闭遥测；浏览器流量由 loopback reject proxy fail-closed；build 前静态拒绝新增 `next/font` 或其他已知远程构建依赖。
8. Worker、Pages、静态发布物、版本/API/range、回滚材料与跨仓证据一致；四个 Pages 保护输入保持原始字节。

规划时只读预检已确认：R15—R18 baseline 根均 missing；端口 4173/4174 无监听；本地 Playwright、Next、esbuild、ESLint、TypeScript 与 Chrome 可用；约定的 Pages `.env*` 文件均 missing；Node test-work、各任务 temp 与 rollback namespace 均无残留；`.next/`、`out/`、`release/`、Playwright artifacts、`tsconfig.tsbuildinfo` 与视觉草稿为允许的 present 初态且无 reparse。执行时必须重新验证，不能把本段当作未来状态证明。

## 3. 执行策略、依赖图与波次

`fast requested: false`。执行策略：`serial`。安全并发上限：1。串行原因：本次没有精确首参数 `fast`；跨仓测试修复、Worker 门禁、Pages 发布物和最终集成逐项消费前一步稳定字节与 receipt。

```text
S22-R15 -> S22-R16 -> S22-R17 -> S22-R18
```

| 波次 | Ready | Frozen | 上限 | 编辑 / 聚焦验证并行 | 串行集成屏障与解锁条件 |
|---|---|---|---:|---|---|
| Wave 0 | S22-R15 | S22-R16—R18 | 1 | 否 / 否 | 名称 RED→GREEN、离线代理 RED→GREEN、输入与保护项复验后解锁 R16。 |
| Wave 1 | S22-R16 | S22-R17—R18 | 1 | 否 / 否 | Worker 隔离门禁、证据、扫描与 receipt 对账后解锁 R17。 |
| Wave 2 | S22-R17 | S22-R18 | 1 | 否 / 否 | Pages 全门禁、静态发布物、保护输入与 receipt 对账后解锁 R18。 |
| Wave 3 | S22-R18 | 无 | 1 | 否 / 否 | 两仓完整回归、发布物、回滚与最终证据全部通过后完成。 |

todo 由主代理单写；worker 不得改写 plan、todo、receipt、共享证据或启动嵌套 worker。每个 baseline 根与 receipt 是主代理编排写入例外。除这两类例外外，任务“写入/生成输出”定义 worker targets；任务“读取”与第 5 节定义 immutable/protected inputs。运行时宽度始终为 1。

## 4. 任务合同

### S22-R15 — 清除活动测试退役名称并建立 Pages 离线边界

- 目标：保留兼容性负向证明，使两仓活动测试对退役名称完整字面量零命中，并让后续 Playwright 通过 loopback reject proxy fail-closed。
- 范围：只修改两个 Worker 测试、Pages Playwright 配置与 usage 测试，并新增离线 E2E/代理；不修改产品源、文档、版本、依赖、四个 Pages 保护文件或远程配置。
- 依赖：无。
- 执行基线根：任务 namespace 为 `work-products/debug/execution-baselines/S22-R15/`；唯一 attempt ID 为 `run-20260821-s22-r15-01`，request `attempt_root` 固定为 `work-products/debug/execution-baselines/S22-R15/run-20260821-s22-r15-01`；禁止引用 R01/R10 snapshot。
- 读取：
  - `work-products/plan.md`、候选批准快照、`work-products/SPEC.md` §22
  - `work-products/scripts/execution-baseline.mjs` 与四代计划合同测试
  - `_worker.js`、`README.md`、`package.json`、`package-lock.json`
  - `work-products/tests/cloudflare-usage-contract.test.mjs`、`structured-logging.test.mjs`、`worker-only-boundary.test.mjs`
  - `../UXUV-Pages/app/`、`../UXUV-Pages/components/`、`../UXUV-Pages/lib/`
  - `../UXUV-Pages/package.json`、`../UXUV-Pages/package-lock.json`、`../UXUV-Pages/node_modules/.package-lock.json`、`../UXUV-Pages/playwright.config.ts`
  - `../UXUV-Pages/node_modules/@playwright/test/cli.js`、`../UXUV-Pages/node_modules/next/dist/bin/next`、`../UXUV-Pages/node_modules/esbuild/bin/esbuild`
  - `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts` 与四个 Pages `protected_inputs`
- 写入：
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - `../UXUV-Pages/playwright.config.ts`
  - `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts`
  - `../UXUV-Pages/work-products/tests/offline-boundary.e2e.spec.ts`
  - `../UXUV-Pages/work-products/tests/offline-reject-proxy.mjs`
  - `work-products/evidence/section22/receipts/S22-R15.json`
  - `work-products/debug/execution-baselines/S22-R15/`
  - `work-products/debug/execution-baselines/S22-R15/run-20260821-s22-r15-01`
- 生成输出：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/section22-r15-temp/`
- `orchestration_outputs`：
  - `work-products/evidence/section22/receipts/S22-R15.json`
- Request 排除：
  - `work-products/todo.md`
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - `../UXUV-Pages/playwright.config.ts`
  - `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts`
  - `../UXUV-Pages/work-products/tests/offline-boundary.e2e.spec.ts`
  - `../UXUV-Pages/work-products/tests/offline-reject-proxy.mjs`
  - `work-products/evidence/section22/receipts/S22-R15.json`
  - `work-products/debug/execution-baselines/S22-R15/`
  - `work-products/debug/execution-baselines/S22-R15/run-20260821-s22-r15-01`
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/section22-r15-temp/`
  - Worker repository 必须精确排除 `work-products/todo.md`；receipt 为主代理 create-new 编排输出，不进入 worker target/snapshot/fingerprint；`orchestration_outputs` 使用 v2 request 字段且只列本任务 receipt。
- 共享资源：两仓测试发现、Pages build/Playwright、本地端口 4173/4174 与五个 Pages 生成路径；本任务独占，不生成 `release/`。
- 验收：
  - create 前回读 request，确认 todo、receipt、baseline 根及全部 write/generated 路径已按 repository 映射排除；manifest Worker files 不含 todo。prewrite 后更新 todo，再次 inputs GREEN 后才启动 worker。
  - 活动名称扫描先固定 Worker 5 行、Pages 1 行 RED；GREEN 后运行时分段构造旧键并保留忽略语义。
  - offline E2E 先在任何外部 fetch 前因缺失 proxy 安全 RED；GREEN 后 baseURL 可达而 `https://example.invalid/` 被本地代理拒绝。
  - 代理仅监听 `127.0.0.1:4174`；普通代理与 CONNECT 均拒绝且不解析目标。app 仅监听 4173。
  - 每条 Pages 命令设置 `GIT_OPTIONAL_LOCKS=0`、`PORT=4173`、`NEXT_TELEMETRY_DISABLED=1`、`SECTION21_REVIEW_FIXTURE=0`、`UXUV_WRITE_VISUAL_CANDIDATE=0`；`TEMP/TMP/TMPDIR` 指向预先安全创建并纳入 target 的 R15 temp，并以敏感哈希持久化。代理相关环境按 present/absent 与哈希冻结。
  - 首次 Playwright 前验证 npm/Node 版本、本地 Playwright/Next/esbuild entrypoint 与 Chrome；静态扫描拒绝 `next/font`。不使用 `npx`、全局替代、安装或联网回退。
  - 四个 Pages 保护输入终态逐字节一致。
- 聚焦验证：
  - 安全 offline RED 后运行本地 Playwright focused suite。
  - `node --test work-products/tests/cloudflare-usage-contract.test.mjs work-products/tests/structured-logging.test.mjs work-products/tests/worker-only-boundary.test.mjs`
  - `node --check _worker.js`
  - 在 Pages 运行 `node node_modules/@playwright/test/cli.js test work-products/tests/offline-boundary.e2e.spec.ts work-products/tests/usage-ui.e2e.spec.ts --config playwright.config.ts --workers=1`
  - 重新发现活动测试并运行两仓退役名称扫描与 `git diff --check`。
- 波次与启动条件：Wave 0；计划已批准且快照一致，四代计划合同 GREEN，R15 根 missing，端口可绑定，本地 CLI/Chrome 可用，输入与保护项稳定。
- 编辑可并行：否。
- 聚焦验证可并行：否；Worker、Pages 与扫描串行。
- 主代理集成责任：创建并回读 request/manifest；核对 RED/GREEN、targets、生成路径、环境、保护输入与 terminal verify；最后 create-new 写 receipt 并原子完成 todo。
- 失败/回滚：任何基线、端口、离线或保护输入失败即停止；保留子进程声明 cleanup 后仍存在的失败产物，receipt 记录退出证据与已清理路径；主代理不追加清理。需要回滚时只按完整 target snapshot 处理六个活动文件与五个生成路径，不覆盖保护文件、产品源或旧 attempt。

### S22-R16 — Worker 隔离门禁与证据

- 目标：不读取 Pages 可变发布物，验证恢复后的 Worker 候选并写可复核证据。
- 范围：只运行 Worker 隔离门禁并写证据；不修改产品源、测试、Pages 生成物或远程状态。
- 依赖：S22-R15。
- 执行基线根：任务 namespace 为 `work-products/debug/execution-baselines/S22-R16/`；唯一 attempt ID 为 `run-20260821-s22-r16-01`，request `attempt_root` 固定为 `work-products/debug/execution-baselines/S22-R16/run-20260821-s22-r16-01`。
- 读取：
  - `work-products/plan.md`、候选批准快照、`work-products/SPEC.md` §22
  - `_worker.js`、`README.md`、`CHANGELOG.md`、`package.json`、`package-lock.json`
  - `scripts/check-worker-size.mjs`、baseline CLI/测试、四代计划合同、账户用量/日志/Worker-only 测试
- 写入：
  - `work-products/evidence/section22/worker-validation.md`
  - `work-products/evidence/section22/receipts/S22-R16.json`
  - `work-products/debug/execution-baselines/S22-R16/`
  - `work-products/debug/execution-baselines/S22-R16/run-20260821-s22-r16-01`
- 生成输出：
  - `work-products/tests/work/section22-r16-temp/`
  - `work-products/tests/work/execution-baseline-tool/`
- `orchestration_outputs`：
  - `work-products/evidence/section22/receipts/S22-R16.json`
- Request 排除：
  - `work-products/todo.md`
  - `work-products/evidence/section22/worker-validation.md`
  - `work-products/evidence/section22/receipts/S22-R16.json`
  - `work-products/debug/execution-baselines/S22-R16/`
  - `work-products/debug/execution-baselines/S22-R16/run-20260821-s22-r16-01`
  - `work-products/tests/work/section22-r16-temp/`
  - `work-products/tests/work/execution-baseline-tool/`
  - Worker repository 必须精确排除 `work-products/todo.md`；receipt 为主代理 create-new 编排输出，不进入 worker target/snapshot/fingerprint；`orchestration_outputs` 使用 v2 request 字段且只列本任务 receipt。
- 共享资源：Worker Node test runner 与两个任务目录；禁止读取或生成 Pages release。
- 验收：
  - request/manifest 排除与 todo 状态转换顺序同 R15；每条命令前 inputs/protected/environment 复验。
  - 语法、账户用量、日志、认证/同源、Worker-only、baseline CLI、四代计划合同、大小与活动名称门禁通过。
  - 高置信秘密与机器绝对路径扫描通过；命中必须分类，真实秘密立即停止。
  - `TEMP/TMP/TMPDIR` 固定为预先安全创建并纳入 target 的 R16 temp并哈希持久化；所有 create/verify/test 子进程继承 `GIT_OPTIONAL_LOCKS=0`。证据记录命令、退出码、时间、输入身份、差异与局限。
- 聚焦验证：
  - `node --check _worker.js`
  - `node --test work-products/tests/execution-baseline-tool.test.mjs work-products/tests/cloudflare-usage-contract.test.mjs work-products/tests/structured-logging.test.mjs work-products/tests/worker-only-boundary.test.mjs work-products/tests/section22-plan-contract.test.mjs work-products/tests/section22-recovery-plan-contract.test.mjs work-products/tests/section22-baseline-recovery-plan-contract.test.mjs work-products/tests/section22-execution-recovery-plan-contract.test.mjs`
  - `npm run check:size`、Worker `git diff --check` 与活动输入秘密/机器路径/退役名称扫描。
- 波次与启动条件：Wave 1；R15 completed，R16 根与 task temp missing，request/manifest 自审计通过。
- 编辑可并行：否。
- 聚焦验证可并行：否。
- 主代理集成责任：复验 inputs；核对证据、test-work、task temp、扫描、terminal verify；最后写 receipt 并完成 todo。
- 失败/回滚：保留子进程声明 cleanup 后仍存在的失败证据与 task temp，receipt 记录 baseline 测试自行清理的 test-work；主代理不追加清理。证据可按 snapshot 回滚，不修改范围外问题。

### S22-R17 — Pages 全门禁与静态发布物重建

- 目标：在离线边界内验证 Pages，并重建可复制的本地静态发布候选。
- 范围：只验证 Pages、重建本地静态发布物并写证据；不修改 Worker、依赖、保护输入或远程状态。
- 依赖：S22-R16。
- 执行基线根：任务 namespace 为 `work-products/debug/execution-baselines/S22-R17/`；唯一 attempt ID 为 `run-20260821-s22-r17-01`，request `attempt_root` 固定为 `work-products/debug/execution-baselines/S22-R17/run-20260821-s22-r17-01`。
- 读取：
  - `work-products/plan.md`、候选批准快照、`_worker.js`
  - Pages 完整 git-visible 输入、`package.json`、`package-lock.json`、`node_modules/.package-lock.json`
  - 本地 Playwright、Next、esbuild、ESLint、TypeScript entrypoint 与 Chrome 可用性
  - 四个 Pages `protected_inputs` 与 `../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/`
- 写入：
  - `../UXUV-Pages/work-products/evidence/section22/pages-validation.md`
  - `work-products/evidence/section22/receipts/S22-R17.json`
  - `work-products/debug/execution-baselines/S22-R17/`
  - `work-products/debug/execution-baselines/S22-R17/run-20260821-s22-r17-01`
- 生成输出：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/`
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/`
  - `../UXUV-Pages/work-products/tests/work/pwa-release/`
  - `../UXUV-Pages/work-products/tests/work/release-manifest/`
  - `../UXUV-Pages/work-products/tests/work/section21-candidate-draft/`
  - `../UXUV-Pages/work-products/tests/work/section22-r17-temp/`
- `orchestration_outputs`：
  - `work-products/evidence/section22/receipts/S22-R17.json`
- Request 排除：
  - `work-products/todo.md`
  - `../UXUV-Pages/work-products/evidence/section22/pages-validation.md`
  - `work-products/evidence/section22/receipts/S22-R17.json`
  - `work-products/debug/execution-baselines/S22-R17/`
  - `work-products/debug/execution-baselines/S22-R17/run-20260821-s22-r17-01`
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/`
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/`
  - `../UXUV-Pages/work-products/tests/work/pwa-release/`
  - `../UXUV-Pages/work-products/tests/work/release-manifest/`
  - `../UXUV-Pages/work-products/tests/work/section21-candidate-draft/`
  - `../UXUV-Pages/work-products/tests/work/section22-r17-temp/`
  - Worker repository 必须精确排除 `work-products/todo.md`；receipt 为主代理 create-new 编排输出，不进入 worker target/snapshot/fingerprint；`orchestration_outputs` 使用 v2 request 字段且只列本任务 receipt。
- 共享资源：Pages npm/Next/Playwright/release builder、端口 4173/4174、完整 `release/` target、test-work、视觉草稿与 temp；本任务独占。
- 验收：
  - request/manifest 精确冻结 Pages git-visible inputs、env present/missing、lock/toolchain、保护输入、视觉候选和所有 target 原始字节；每条命令前复验。
  - `release/` 作为完整可回滚 target snapshot，不使用模糊 prefix；三个 Node test-work 启动前 missing。
  - 每条 Pages 命令显式继承 `GIT_OPTIONAL_LOCKS=0`、`PORT=4173`、`NEXT_TELEMETRY_DISABLED=1`、`SECTION21_REVIEW_FIXTURE=0`、`UXUV_WRITE_VISUAL_CANDIDATE=0` 与固定 proxy present/absent 状态；`TEMP/TMP/TMPDIR` 指向预先创建并纳入 target 的 R17 temp。app/loopback reject proxy 只绑定 4173/4174。
  - 所有命令使用 R17 temp 与 R15 的固定离线环境；完整 E2E 包含 offline-boundary GREEN。build 前静态拒绝 `next/font`。
  - lint、TypeScript、完整 E2E、最终 production build、release build、最终 Node tests 与 diff check 全通过。
  - `release/current` manifest 声明 Pages `0.3.0`、API `2` 与现有 Worker range，资产集合、路径、MIME 与排序一致。
  - 四个保护输入和批准视觉候选终态逐字节一致；成功终态无 release staging/backup 或三个 Node test-work。
- 聚焦验证：
  - 在 Pages 严格串行运行 `npm run lint`、`node node_modules/typescript/bin/tsc --noEmit`、`npm run test:e2e`、`npm run build`、`npm run release:build`、`npm test`、`git diff --check`。
- 波次与启动条件：Wave 2；R16 completed，R17 根与三个 Node test-work missing，端口可绑定，本地 entrypoints/Chrome 可用，request/manifest 自审计通过。
- 编辑可并行：否。
- 聚焦验证可并行：否；全部 Pages 命令串行。
- 主代理集成责任：核对证据、release target、test-work/temp/视觉目录、环境、保护输入、terminal verify；最后写 receipt 并完成 todo。
- 失败/回滚：保留 builder/测试自身 `finally` cleanup 后仍存在的失败产物与异常 staging/backup/test-work/temp；receipt 记录退出证据与已被子进程清理的路径，主代理不追加清理；不部署、不改依赖或保护输入。

### S22-R18 — 两仓集成、完整回归与本地发布门禁

- 目标：在生成物稳定后完成跨仓契约、完整套件、身份与回滚验证。
- 范围：只执行本地集成门禁、重建验证所需生成物并写最终证据；不修改产品源、测试、依赖、版本或远程状态。
- 依赖：S22-R17。
- 执行基线根：任务 namespace 为 `work-products/debug/execution-baselines/S22-R18/`；唯一 attempt ID 为 `run-20260821-s22-r18-01`，request `attempt_root` 固定为 `work-products/debug/execution-baselines/S22-R18/run-20260821-s22-r18-01`。
- 读取：
  - `work-products/SPEC.md`、`work-products/plan.md`、候选批准快照与两仓完整 git-visible inputs
  - 两仓锁文件、工具链、HEAD/差异、Worker 测试、冻结 Section 22 历史与 `work-products/evidence/section22/`
  - `../UXUV-Pages/release/current/`、四个 Pages `protected_inputs` 与批准视觉候选
  - 本地 Playwright、Next、esbuild、ESLint、TypeScript entrypoint 与 Chrome 可用性
- 写入：
  - `work-products/evidence/section22/pair-validation.md`
  - `work-products/evidence/section22/receipts/S22-R18.json`
  - `work-products/debug/execution-baselines/S22-R18/`
  - `work-products/debug/execution-baselines/S22-R18/run-20260821-s22-r18-01`
- 生成输出：
  - `work-products/tests/work/execution-baseline-tool/`
  - `work-products/tests/work/section22-r18-temp/`
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/`
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/`
  - `../UXUV-Pages/work-products/tests/work/pwa-release/`
  - `../UXUV-Pages/work-products/tests/work/release-manifest/`
  - `../UXUV-Pages/work-products/tests/work/section21-candidate-draft/`
- `orchestration_outputs`：
  - `work-products/evidence/section22/receipts/S22-R18.json`
- Request 排除：
  - `work-products/todo.md`
  - `work-products/evidence/section22/pair-validation.md`
  - `work-products/evidence/section22/receipts/S22-R18.json`
  - `work-products/debug/execution-baselines/S22-R18/`
  - `work-products/debug/execution-baselines/S22-R18/run-20260821-s22-r18-01`
  - `work-products/tests/work/execution-baseline-tool/`
  - `work-products/tests/work/section22-r18-temp/`
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/`
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/`
  - `../UXUV-Pages/work-products/tests/work/pwa-release/`
  - `../UXUV-Pages/work-products/tests/work/release-manifest/`
  - `../UXUV-Pages/work-products/tests/work/section21-candidate-draft/`
  - Worker repository 必须精确排除 `work-products/todo.md`；receipt 为主代理 create-new 编排输出，不进入 worker target/snapshot/fingerprint；`orchestration_outputs` 使用 v2 request 字段且只列本任务 receipt。
- 共享资源：两仓完整测试、Pages 发布物、端口、单一 R18 共享 temp、rollback namespace、test-work、视觉草稿、最终证据与 todo；主代理独占。
- 验收：
  - request/manifest 冻结两仓完整 inputs、toolchain、env、保护输入、批准视觉候选与 targets；每条命令前复验。
  - rollback 只用 `generated_namespaces` 的 `repository: pages`、`parent: work-products/tests/work`、`prefix: section21-rb-`，initial/terminal 均 none；request resource path 与 repository exclusion 不保存通配符。
  - Worker 全套、语法、大小、diff 与 Pages 全套离线门禁通过；Node build 前静态拒绝 `next/font` 与其他远程构建依赖。
  - `release/` 作为完整可回滚 target snapshot；不把 `release/current` 或模糊 prefix 当作替代。
  - 每条命令显式继承 `GIT_OPTIONAL_LOCKS=0`；Pages 固定 `PORT=4173`、`NEXT_TELEMETRY_DISABLED=1`、`SECTION21_REVIEW_FIXTURE=0`、`UXUV_WRITE_VISUAL_CANDIDATE=0` 与 proxy present/absent 状态，app/loopback reject proxy 只绑定 4173/4174；全部 Worker/Pages 子进程的 `TEMP/TMP/TMPDIR` 共用预先创建并纳入 Worker target 的 `work-products/tests/work/section22-r18-temp/`。
  - 单个 R18 request 只冻结上述一套共享 temp 环境；Pages 使用固定离线环境。baseline-tool 与三个 Pages Node test-work 成功终态 missing。
  - rollback drill 仅在声明 namespace 内 `git clone --local`；源仓 `.git/` 只读且不联网。
  - 跨仓证据证明账户响应、四指标、版本/API/range、release manifest、活动名称零命中与回滚入口一致。
  - 四个保护输入和批准视觉候选终态逐字节一致；release 无 staging/backup；终态仅 `LOCAL CANDIDATE / RELEASE HOLD`。
- 聚焦验证：
  - Worker：`node --check _worker.js`、`npm test`、`npm run check:size`、`git diff --check`。
  - Pages：`npm run lint`、`node node_modules/typescript/bin/tsc --noEmit`、`npm run test:e2e`、`npm run build`、`npm run release:build`、`npm test`、`git diff --check`。
  - 重建活动测试清单，复跑退役名称、秘密、机器路径与 manifest/实际资产集合扫描。
- 波次与启动条件：Wave 3；R17 completed，R18 根、四个可清理 test-work 与 rollback namespace无残留，端口可绑定，本地 entrypoints/Chrome 可用，request/manifest 自审计通过。
- 编辑可并行：否。
- 聚焦验证可并行：否；两仓命令与生成目录串行。
- 主代理集成责任：对账 inputs/diff、targets、保护输入、活动测试、回滚、terminal verify 与所有命令；最后写 receipt 并原子完成 todo。
- 失败/回滚：任一门禁失败即 `RELEASE HOLD`；保留子进程声明 cleanup 后仍存在的失败证据，receipt 记录 builder、测试及 rollback drill 自行清理的 staging/test-work/clone；主代理不追加清理、提交、推送、部署、联网或修改远程配置。

## 5. 可执行 request 蓝图

下列 JSON 是 R15—R18 的批准绑定机器合同。主代理仅可按 `input_sets`、`protected_input_sets`、`toolchain_profiles` 与 `environment_profiles` 的引用展开为 v2 request；环境 profile 仅把 `fixed`、`task_temp_sha256` 与 `absent` 展开进 request，`preflight_absent_aliases` 由主代理在 create 前独立拒绝。路径写入 request 时保持 repository-relative、无尾 `/`、无 glob。`task_temp` 在 create 前由主代理安全创建为空目录；三个敏感临时变量保存同一解析路径的摘要，不保存机器绝对路径。

<!-- S22_EXECUTION_REQUEST_BLUEPRINTS -->
```json
{
  "schema_version": "s22-execution-recovery-request-blueprints/v1",
  "request_schema": "s22-execution-baseline-request/v2",
  "runtime": {
    "node_version": "v20.19.2",
    "npm_version": "10.8.2",
    "chrome_channel": "Google Chrome",
    "chrome_version": "151.0.7922.173",
    "fallbacks_forbidden": ["npx", "install", "network"]
  },
  "failure_contract": {
    "request_location": "task baseline root outside attempt",
    "receipt_location": "task orchestration output",
    "create_failure_timing": "write sanitized receipt immediately",
    "attempt_id_terminal_state": "consumed",
    "creating_staging": "may be atomically removed",
    "subprocess_declared_cleanup": "allowed and recorded",
    "main_agent_post_failure_cleanup": "forbidden",
    "retention": "all artifacts still present after subprocess cleanup"
  },
  "captured_resource_prestate": {
    "missing_inputs": [
      "pages:.env",
      "pages:.env.local",
      "pages:.env.development",
      "pages:.env.development.local",
      "pages:.env.production",
      "pages:.env.production.local"
    ],
    "directory_protected_inputs": ["pages:work-products/tests/fixtures/ui-review/section21-candidate"],
    "other_inputs": "regular file",
    "other_protected_inputs": "regular file",
    "toolchain_entrypoints": "regular file"
  },
  "input_sets": {
    "governance": [
      { "repository": "worker", "path": "work-products/SPEC.md" },
      { "repository": "worker", "path": "work-products/plan.md" },
      { "repository": "worker", "path": "work-products/debug/approval-baselines/s22-account-usage-execution-recovery-20260821-02/plan.md" },
      { "repository": "worker", "path": "work-products/scripts/execution-baseline.mjs" },
      { "repository": "worker", "path": "work-products/tests/execution-baseline-tool.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/section22-plan-contract.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/section22-recovery-plan-contract.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/section22-baseline-recovery-plan-contract.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/section22-execution-recovery-plan-contract.test.mjs" }
    ],
    "worker-r15-read": [
      { "repository": "worker", "path": "_worker.js" },
      { "repository": "worker", "path": "work-products/tests/structured-logging.test.mjs" }
    ],
    "worker-validation": [
      { "repository": "worker", "path": "_worker.js" },
      { "repository": "worker", "path": "README.md" },
      { "repository": "worker", "path": "CHANGELOG.md" },
      { "repository": "worker", "path": "package.json" },
      { "repository": "worker", "path": "package-lock.json" },
      { "repository": "worker", "path": "scripts/check-worker-size.mjs" },
      { "repository": "worker", "path": "work-products/tests/cloudflare-usage-contract.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/structured-logging.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/worker-only-boundary.test.mjs" }
    ],
    "pages-runtime": [
      { "repository": "pages", "path": "package-lock.json" },
      { "repository": "pages", "path": "node_modules/.package-lock.json" },
      { "repository": "pages", "path": ".env" },
      { "repository": "pages", "path": ".env.local" },
      { "repository": "pages", "path": ".env.development" },
      { "repository": "pages", "path": ".env.development.local" },
      { "repository": "pages", "path": ".env.production" },
      { "repository": "pages", "path": ".env.production.local" }
    ],
    "pages-offline-suite": [
      { "repository": "pages", "path": "playwright.config.ts" },
      { "repository": "pages", "path": "work-products/tests/usage-ui.e2e.spec.ts" },
      { "repository": "pages", "path": "work-products/tests/offline-boundary.e2e.spec.ts" },
      { "repository": "pages", "path": "work-products/tests/offline-reject-proxy.mjs" }
    ],
    "prior-validation-evidence": [
      { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R15.json" },
      { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R16.json" },
      { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R17.json" },
      { "repository": "worker", "path": "work-products/evidence/section22/worker-validation.md" },
      { "repository": "pages", "path": "work-products/evidence/section22/pages-validation.md" }
    ]
  },
  "protected_input_sets": {
    "pages-four": [
      { "repository": "pages", "path": "package.json" },
      { "repository": "pages", "path": "work-products/tests/iptv-retirement-contract.test.mjs" },
      { "repository": "pages", "path": "work-products/tests/pages-deployment.test.mjs" },
      { "repository": "pages", "path": "work-products/tests/repository-test-isolation.test.mjs" }
    ],
    "pages-four-plus-visual": [
      { "repository": "pages", "path": "package.json" },
      { "repository": "pages", "path": "work-products/tests/iptv-retirement-contract.test.mjs" },
      { "repository": "pages", "path": "work-products/tests/pages-deployment.test.mjs" },
      { "repository": "pages", "path": "work-products/tests/repository-test-isolation.test.mjs" },
      { "repository": "pages", "path": "work-products/tests/fixtures/ui-review/section21-candidate" }
    ]
  },
  "toolchain_profiles": {
    "worker": [
      { "repository": "worker", "path": "work-products/scripts/execution-baseline.mjs" },
      { "repository": "worker", "path": "scripts/check-worker-size.mjs" }
    ],
    "pages-focused": [
      { "repository": "worker", "path": "work-products/scripts/execution-baseline.mjs" },
      { "repository": "pages", "path": "node_modules/@playwright/test/cli.js" },
      { "repository": "pages", "path": "node_modules/next/dist/bin/next" },
      { "repository": "pages", "path": "node_modules/esbuild/bin/esbuild" }
    ],
    "pages-full": [
      { "repository": "worker", "path": "work-products/scripts/execution-baseline.mjs" },
      { "repository": "pages", "path": "node_modules/@playwright/test/cli.js" },
      { "repository": "pages", "path": "node_modules/next/dist/bin/next" },
      { "repository": "pages", "path": "node_modules/esbuild/bin/esbuild" },
      { "repository": "pages", "path": "node_modules/eslint/bin/eslint.js" },
      { "repository": "pages", "path": "node_modules/typescript/bin/tsc" }
    ]
  },
  "environment_profiles": {
    "worker-local": {
      "fixed": [
        { "key": "GIT_OPTIONAL_LOCKS", "state": "present", "sensitive": false, "value": "0" }
      ],
      "task_temp_sha256": ["TEMP", "TMP", "TMPDIR"],
      "absent": ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"],
      "preflight_absent_aliases": ["http_proxy", "https_proxy", "all_proxy", "no_proxy"]
    },
    "pages-offline": {
      "fixed": [
        { "key": "GIT_OPTIONAL_LOCKS", "state": "present", "sensitive": false, "value": "0" },
        { "key": "PORT", "state": "present", "sensitive": false, "value": "4173" },
        { "key": "NEXT_TELEMETRY_DISABLED", "state": "present", "sensitive": false, "value": "1" },
        { "key": "SECTION21_REVIEW_FIXTURE", "state": "present", "sensitive": false, "value": "0" },
        { "key": "UXUV_WRITE_VISUAL_CANDIDATE", "state": "present", "sensitive": false, "value": "0" }
      ],
      "task_temp_sha256": ["TEMP", "TMP", "TMPDIR"],
      "absent": ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"],
      "preflight_absent_aliases": ["http_proxy", "https_proxy", "all_proxy", "no_proxy"]
    }
  },
  "tasks": [
    {
      "task_id": "S22-R15",
      "owner": "native-worker:s22_r15",
      "no_replace": true,
      "predecessor": null,
      "wave": 0,
      "attempt_id": "run-20260821-s22-r15-01",
      "attempt_root": "work-products/debug/execution-baselines/S22-R15/run-20260821-s22-r15-01",
      "request_path": "work-products/debug/execution-baselines/S22-R15/request-run-20260821-s22-r15-01.json",
      "repositories": [
        {
          "id": "worker",
          "root": ".",
          "exclude": [
            "work-products/todo.md",
            "work-products/tests/cloudflare-usage-contract.test.mjs",
            "work-products/tests/worker-only-boundary.test.mjs",
            "work-products/evidence/section22/receipts/S22-R15.json",
            "work-products/debug/execution-baselines/S22-R15",
            "work-products/debug/execution-baselines/S22-R15/run-20260821-s22-r15-01"
          ]
        },
        {
          "id": "pages",
          "root": "../UXUV-Pages",
          "exclude": [
            "playwright.config.ts",
            "work-products/tests/usage-ui.e2e.spec.ts",
            "work-products/tests/offline-boundary.e2e.spec.ts",
            "work-products/tests/offline-reject-proxy.mjs",
            ".next",
            "out",
            "tsconfig.tsbuildinfo",
            "work-products/tests/artifacts/playwright",
            "work-products/tests/work/section22-r15-temp"
          ]
        }
      ],
      "targets": [
        { "repository": "worker", "path": "work-products/tests/cloudflare-usage-contract.test.mjs" },
        { "repository": "worker", "path": "work-products/tests/worker-only-boundary.test.mjs" },
        { "repository": "pages", "path": "playwright.config.ts" },
        { "repository": "pages", "path": "work-products/tests/usage-ui.e2e.spec.ts" },
        { "repository": "pages", "path": "work-products/tests/offline-boundary.e2e.spec.ts" },
        { "repository": "pages", "path": "work-products/tests/offline-reject-proxy.mjs" },
        { "repository": "pages", "path": ".next" },
        { "repository": "pages", "path": "out" },
        { "repository": "pages", "path": "tsconfig.tsbuildinfo" },
        { "repository": "pages", "path": "work-products/tests/artifacts/playwright" },
        { "repository": "pages", "path": "work-products/tests/work/section22-r15-temp" }
      ],
      "input_sets": ["governance", "worker-r15-read", "pages-runtime"],
      "protected_input_set": "pages-four",
      "orchestration_outputs": [
        { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R15.json" }
      ],
      "toolchain_profile": "pages-focused",
      "environment_profile": "pages-offline",
      "task_temp": { "repository": "pages", "path": "work-products/tests/work/section22-r15-temp" },
      "generated_namespaces": [],
      "prestate": {
        "initial_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R15",
          "worker:work-products/debug/execution-baselines/S22-R15/run-20260821-s22-r15-01",
          "worker:work-products/evidence/section22/receipts/S22-R15.json",
          "pages:.env",
          "pages:.env.local",
          "pages:.env.development",
          "pages:.env.development.local",
          "pages:.env.production",
          "pages:.env.production.local",
          "pages:work-products/tests/offline-boundary.e2e.spec.ts",
          "pages:work-products/tests/offline-reject-proxy.mjs",
          "pages:work-products/tests/work/section22-r15-temp"
        ],
        "create_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R15/run-20260821-s22-r15-01",
          "worker:work-products/evidence/section22/receipts/S22-R15.json",
          "pages:.env",
          "pages:.env.local",
          "pages:.env.development",
          "pages:.env.development.local",
          "pages:.env.production",
          "pages:.env.production.local",
          "pages:work-products/tests/offline-boundary.e2e.spec.ts",
          "pages:work-products/tests/offline-reject-proxy.mjs"
        ],
        "create_must_be_regular_files": ["worker:work-products/debug/execution-baselines/S22-R15/request-run-20260821-s22-r15-01.json"],
        "create_must_be_empty_directories": ["pages:work-products/tests/work/section22-r15-temp"],
        "preflight_namespaces_must_be_empty": [],
        "ports_must_be_free": [4173, 4174]
      },
      "validation_sequence": [
        "node --test focused Worker contracts",
        "node --check _worker.js",
        "Pages Playwright offline-boundary and usage-ui with workers=1",
        "two-repository retired-name scan",
        "two-repository git diff --check"
      ],
      "terminal_invariants": ["verify terminal GREEN", "pages-four unchanged", "receipt create-new after terminal"]
    },
    {
      "task_id": "S22-R16",
      "owner": "native-worker:s22_r16",
      "no_replace": true,
      "predecessor": "S22-R15",
      "wave": 1,
      "attempt_id": "run-20260821-s22-r16-01",
      "attempt_root": "work-products/debug/execution-baselines/S22-R16/run-20260821-s22-r16-01",
      "request_path": "work-products/debug/execution-baselines/S22-R16/request-run-20260821-s22-r16-01.json",
      "repositories": [
        {
          "id": "worker",
          "root": ".",
          "exclude": [
            "work-products/todo.md",
            "work-products/evidence/section22/worker-validation.md",
            "work-products/evidence/section22/receipts/S22-R16.json",
            "work-products/debug/execution-baselines/S22-R16",
            "work-products/debug/execution-baselines/S22-R16/run-20260821-s22-r16-01",
            "work-products/tests/work/section22-r16-temp",
            "work-products/tests/work/execution-baseline-tool"
          ]
        }
      ],
      "targets": [
        { "repository": "worker", "path": "work-products/evidence/section22/worker-validation.md" },
        { "repository": "worker", "path": "work-products/tests/work/section22-r16-temp" },
        { "repository": "worker", "path": "work-products/tests/work/execution-baseline-tool" }
      ],
      "input_sets": ["governance", "worker-validation"],
      "protected_input_set": null,
      "orchestration_outputs": [
        { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R16.json" }
      ],
      "toolchain_profile": "worker",
      "environment_profile": "worker-local",
      "task_temp": { "repository": "worker", "path": "work-products/tests/work/section22-r16-temp" },
      "generated_namespaces": [],
      "prestate": {
        "initial_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R16",
          "worker:work-products/debug/execution-baselines/S22-R16/run-20260821-s22-r16-01",
          "worker:work-products/evidence/section22/receipts/S22-R16.json",
          "worker:work-products/tests/work/section22-r16-temp",
          "worker:work-products/tests/work/execution-baseline-tool"
        ],
        "create_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R16/run-20260821-s22-r16-01",
          "worker:work-products/evidence/section22/receipts/S22-R16.json",
          "worker:work-products/tests/work/execution-baseline-tool"
        ],
        "create_must_be_regular_files": ["worker:work-products/debug/execution-baselines/S22-R16/request-run-20260821-s22-r16-01.json"],
        "create_must_be_empty_directories": ["worker:work-products/tests/work/section22-r16-temp"],
        "preflight_namespaces_must_be_empty": [],
        "ports_must_be_free": []
      },
      "validation_sequence": [
        "node --check _worker.js",
        "node --test baseline usage logging worker-only and four plan contracts",
        "npm run check:size",
        "Worker secret path and retired-name scans",
        "Worker git diff --check"
      ],
      "terminal_invariants": ["verify terminal GREEN", "baseline-tool work missing", "receipt create-new after terminal"]
    },
    {
      "task_id": "S22-R17",
      "owner": "native-worker:s22_r17",
      "no_replace": true,
      "predecessor": "S22-R16",
      "wave": 2,
      "attempt_id": "run-20260821-s22-r17-01",
      "attempt_root": "work-products/debug/execution-baselines/S22-R17/run-20260821-s22-r17-01",
      "request_path": "work-products/debug/execution-baselines/S22-R17/request-run-20260821-s22-r17-01.json",
      "repositories": [
        {
          "id": "worker",
          "root": ".",
          "exclude": [
            "work-products/todo.md",
            "work-products/evidence/section22/receipts/S22-R17.json",
            "work-products/debug/execution-baselines/S22-R17",
            "work-products/debug/execution-baselines/S22-R17/run-20260821-s22-r17-01"
          ]
        },
        {
          "id": "pages",
          "root": "../UXUV-Pages",
          "exclude": [
            "work-products/evidence/section22/pages-validation.md",
            ".next",
            "out",
            "release",
            "tsconfig.tsbuildinfo",
            "work-products/tests/artifacts/playwright",
            "work-products/tests/work/kvideo-webview-compatibility",
            "work-products/tests/work/pwa-release",
            "work-products/tests/work/release-manifest",
            "work-products/tests/work/section21-candidate-draft",
            "work-products/tests/work/section22-r17-temp"
          ]
        }
      ],
      "targets": [
        { "repository": "pages", "path": "work-products/evidence/section22/pages-validation.md" },
        { "repository": "pages", "path": ".next" },
        { "repository": "pages", "path": "out" },
        { "repository": "pages", "path": "release" },
        { "repository": "pages", "path": "tsconfig.tsbuildinfo" },
        { "repository": "pages", "path": "work-products/tests/artifacts/playwright" },
        { "repository": "pages", "path": "work-products/tests/work/kvideo-webview-compatibility" },
        { "repository": "pages", "path": "work-products/tests/work/pwa-release" },
        { "repository": "pages", "path": "work-products/tests/work/release-manifest" },
        { "repository": "pages", "path": "work-products/tests/work/section21-candidate-draft" },
        { "repository": "pages", "path": "work-products/tests/work/section22-r17-temp" }
      ],
      "input_sets": ["governance", "worker-r15-read", "pages-runtime", "pages-offline-suite"],
      "protected_input_set": "pages-four-plus-visual",
      "orchestration_outputs": [
        { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R17.json" }
      ],
      "toolchain_profile": "pages-full",
      "environment_profile": "pages-offline",
      "task_temp": { "repository": "pages", "path": "work-products/tests/work/section22-r17-temp" },
      "generated_namespaces": [],
      "prestate": {
        "initial_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R17",
          "worker:work-products/debug/execution-baselines/S22-R17/run-20260821-s22-r17-01",
          "worker:work-products/evidence/section22/receipts/S22-R17.json",
          "pages:.env",
          "pages:.env.local",
          "pages:.env.development",
          "pages:.env.development.local",
          "pages:.env.production",
          "pages:.env.production.local",
          "pages:work-products/tests/work/kvideo-webview-compatibility",
          "pages:work-products/tests/work/pwa-release",
          "pages:work-products/tests/work/release-manifest",
          "pages:work-products/tests/work/section22-r17-temp"
        ],
        "create_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R17/run-20260821-s22-r17-01",
          "worker:work-products/evidence/section22/receipts/S22-R17.json",
          "pages:.env",
          "pages:.env.local",
          "pages:.env.development",
          "pages:.env.development.local",
          "pages:.env.production",
          "pages:.env.production.local",
          "pages:work-products/tests/work/kvideo-webview-compatibility",
          "pages:work-products/tests/work/pwa-release",
          "pages:work-products/tests/work/release-manifest"
        ],
        "create_must_be_regular_files": ["worker:work-products/debug/execution-baselines/S22-R17/request-run-20260821-s22-r17-01.json"],
        "create_must_be_empty_directories": ["pages:work-products/tests/work/section22-r17-temp"],
        "preflight_namespaces_must_be_empty": [
          { "repository": "pages", "parent": "release", "prefix": ".tmp-current-" },
          { "repository": "pages", "parent": "release", "prefix": ".previous-current-" }
        ],
        "ports_must_be_free": [4173, 4174]
      },
      "validation_sequence": [
        "npm run lint",
        "node node_modules/typescript/bin/tsc --noEmit",
        "npm run test:e2e",
        "npm run build",
        "npm run release:build",
        "npm test",
        "Pages git diff --check"
      ],
      "terminal_invariants": ["verify terminal GREEN", "release staging and backup absent", "three Node test-work paths missing", "pages-four-plus-visual unchanged", "receipt create-new after terminal"]
    },
    {
      "task_id": "S22-R18",
      "owner": "native-worker:s22_r18",
      "no_replace": true,
      "predecessor": "S22-R17",
      "wave": 3,
      "attempt_id": "run-20260821-s22-r18-01",
      "attempt_root": "work-products/debug/execution-baselines/S22-R18/run-20260821-s22-r18-01",
      "request_path": "work-products/debug/execution-baselines/S22-R18/request-run-20260821-s22-r18-01.json",
      "repositories": [
        {
          "id": "worker",
          "root": ".",
          "exclude": [
            "work-products/todo.md",
            "work-products/evidence/section22/pair-validation.md",
            "work-products/evidence/section22/receipts/S22-R18.json",
            "work-products/debug/execution-baselines/S22-R18",
            "work-products/debug/execution-baselines/S22-R18/run-20260821-s22-r18-01",
            "work-products/tests/work/execution-baseline-tool",
            "work-products/tests/work/section22-r18-temp"
          ]
        },
        {
          "id": "pages",
          "root": "../UXUV-Pages",
          "exclude": [
            ".next",
            "out",
            "release",
            "tsconfig.tsbuildinfo",
            "work-products/tests/artifacts/playwright",
            "work-products/tests/work/kvideo-webview-compatibility",
            "work-products/tests/work/pwa-release",
            "work-products/tests/work/release-manifest",
            "work-products/tests/work/section21-candidate-draft"
          ]
        }
      ],
      "targets": [
        { "repository": "worker", "path": "work-products/evidence/section22/pair-validation.md" },
        { "repository": "worker", "path": "work-products/tests/work/execution-baseline-tool" },
        { "repository": "worker", "path": "work-products/tests/work/section22-r18-temp" },
        { "repository": "pages", "path": ".next" },
        { "repository": "pages", "path": "out" },
        { "repository": "pages", "path": "release" },
        { "repository": "pages", "path": "tsconfig.tsbuildinfo" },
        { "repository": "pages", "path": "work-products/tests/artifacts/playwright" },
        { "repository": "pages", "path": "work-products/tests/work/kvideo-webview-compatibility" },
        { "repository": "pages", "path": "work-products/tests/work/pwa-release" },
        { "repository": "pages", "path": "work-products/tests/work/release-manifest" },
        { "repository": "pages", "path": "work-products/tests/work/section21-candidate-draft" }
      ],
      "input_sets": ["governance", "worker-validation", "pages-runtime", "pages-offline-suite", "prior-validation-evidence"],
      "protected_input_set": "pages-four-plus-visual",
      "orchestration_outputs": [
        { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R18.json" }
      ],
      "toolchain_profile": "pages-full",
      "environment_profile": "pages-offline",
      "task_temp": { "repository": "worker", "path": "work-products/tests/work/section22-r18-temp" },
      "generated_namespaces": [
        { "repository": "pages", "parent": "work-products/tests/work", "prefix": "section21-rb-", "initial": "none", "terminal": "none" }
      ],
      "prestate": {
        "initial_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R18",
          "worker:work-products/debug/execution-baselines/S22-R18/run-20260821-s22-r18-01",
          "worker:work-products/evidence/section22/receipts/S22-R18.json",
          "pages:.env",
          "pages:.env.local",
          "pages:.env.development",
          "pages:.env.development.local",
          "pages:.env.production",
          "pages:.env.production.local",
          "worker:work-products/tests/work/execution-baseline-tool",
          "worker:work-products/tests/work/section22-r18-temp",
          "pages:work-products/tests/work/kvideo-webview-compatibility",
          "pages:work-products/tests/work/pwa-release",
          "pages:work-products/tests/work/release-manifest"
        ],
        "create_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R18/run-20260821-s22-r18-01",
          "worker:work-products/evidence/section22/receipts/S22-R18.json",
          "pages:.env",
          "pages:.env.local",
          "pages:.env.development",
          "pages:.env.development.local",
          "pages:.env.production",
          "pages:.env.production.local",
          "worker:work-products/tests/work/execution-baseline-tool",
          "pages:work-products/tests/work/kvideo-webview-compatibility",
          "pages:work-products/tests/work/pwa-release",
          "pages:work-products/tests/work/release-manifest"
        ],
        "create_must_be_regular_files": ["worker:work-products/debug/execution-baselines/S22-R18/request-run-20260821-s22-r18-01.json"],
        "create_must_be_empty_directories": ["worker:work-products/tests/work/section22-r18-temp"],
        "preflight_namespaces_must_be_empty": [
          { "repository": "pages", "parent": "release", "prefix": ".tmp-current-" },
          { "repository": "pages", "parent": "release", "prefix": ".previous-current-" }
        ],
        "ports_must_be_free": [4173, 4174],
        "generated_namespace_matches": []
      },
      "validation_sequence": [
        "Worker node --check _worker.js",
        "Worker npm test",
        "Worker npm run check:size",
        "Worker git diff --check",
        "Pages npm run lint",
        "Pages node node_modules/typescript/bin/tsc --noEmit",
        "Pages npm run test:e2e",
        "Pages npm run build",
        "Pages npm run release:build",
        "Pages npm test",
        "Pages git diff --check",
        "two-repository identity evidence and manifest scans",
        "local rollback drill inside generated namespace"
      ],
      "terminal_invariants": ["verify terminal GREEN", "shared task temp identity unchanged", "generated namespace terminal none", "release staging and backup absent", "three Pages Node test-work paths missing", "pages-four-plus-visual unchanged", "receipt create-new after terminal", "LOCAL CANDIDATE / RELEASE HOLD"]
    }
  ]
}
```

## 6. Baseline、请求身份、所有权与失败规则

- 除显式 `../UXUV-Pages/` 路径外，计划路径以 Worker 根解析。Pages request 中的资源使用 `repository: pages` 与 Pages 仓库内相对路径，不把 `../UXUV-Pages/` 直接写入 request resource path。
- 本文清单中的目录末尾 `/` 仅用于人类辨识；request JSON 中的路径不得保留目录末尾 `/`，必须使用 CLI 接受的 canonical POSIX repository-relative 字符串。
- R01、R10 与三代冻结 plan/todo/receipt 全程只读。R15—R18 各使用唯一 attempt 与 missing baseline 根；任何 existing 根、alias、reparse 或 owner 冲突在创建前停止。
- 每个新 create request 固定使用 `s22-execution-baseline-request/v2`，明确列出 targets、inputs、protected inputs、`orchestration_outputs`、repositories、toolchain、environment 与 generated namespaces。baseline 根、receipt 与 todo 是主代理编排例外；worker 不得写它们。
- Repository 映射只允许 `worker` → `.` 与 `pages` → `../UXUV-Pages`；create 必须显式声明 Worker，任何隐式映射、别名 ID、错误 root 或 glob exclusion 都在写盘前拒绝。
- Worker `repositories.exclude` 必须精确包含 `work-products/todo.md`、本任务 baseline 根、receipt 与所有 Worker write/generated 路径；Pages exclude 必须包含全部 Pages write/generated 路径。不得笼统排除整个 `work-products/`。
- v2 request 的共享 invariant 在 create、verify 与 fingerprint 生效：todo 只允许作为 Worker repository 的精确 exclusion；任何 broad/descendant exclusion，或 todo 与 attempt root、targets、inputs、protected inputs、`orchestration_outputs`、toolchain entrypoints、generated namespaces 的双向重叠，均在写盘前拒绝。旧 v1 仅保留只读 verify 兼容。
- CLI create 在写入 attempt/staging 前机器校验 todo、attempt root、targets 与 `orchestration_outputs` 的排除覆盖；主代理还必须回读 manifest 与 fingerprint，确认所有派生面都不含 todo 或声明的可变路径。guard 不能替代 request 合同。
- plan 与批准快照是 immutable inputs。todo 不进入 target/snapshot/input/protected/repository files/fingerprint；每次 CLI 验证时由主代理单独验证状态机、checkbox、依赖前缀与至多一个 `in_progress`。
- repository inventory 使用 `GIT_OPTIONAL_LOCKS=0 git ls-files --cached --others --exclude-standard -z`，排除 task-owned mutable paths后冻结完整 git-visible identity。任务显式读取必须属于 inventory 或单列 input/protected input。
- Pages request 显式记录六个 `.env*` present/missing，扫描 git-visible `process.env` 键并声明解析值；敏感值与机器路径仅保存 SHA-256，不持久化原值。
- target present 文件/目录保存完整原始字节 snapshot，missing 保存状态；`release/` 是完整 target。动态 rollback 只用锚定 parent/prefix namespace，并由 CLI 从 repository inventory 动态排除匹配项，不使用 glob request path/exclusion。
- 创建流程固定：批准快照比对 → initial prestate 确认 task baseline 根与 task temp missing → 主代理创建 task 根、空 temp 与 root 内 request → create prestate 确认 request 为 regular file、temp 为空且 attempt 根仍 missing → request 静态合同/路径回读 → create → manifest/snapshot 自完整性与排除回读 → `verify prewrite` → todo 原子转 in_progress → `verify inputs` → 再确认端口/工具链/输入 → worker 首次写入。任一步失败时 worker 为零。
- 执行流程固定：每条命令前 `verify inputs` 与 todo/targets/environment 复核；编辑后固定 candidate target fingerprint；terminal verify 与命令证据对账；主代理 create-new 写 receipt；只有 receipt 完整才把 todo 原子转 completed。
- 本地 CLI 缺失、端口占用、protected input/环境/输入漂移、生成 namespace 残留或门禁失败均 fail-closed。它们是执行时真实状态门，不以规划时检查替代；不得通过清理用户文件、安装、联网或放宽合同绕过。
- CLI 为保证原子 create 可删除尚未成形的 `.creating` staging；主代理必须在 attempt 外保留原 request、净化错误与 create-failure receipt，并消费该 attempt ID，禁止修补或重试同一 ID。“保留失败产物”不承诺保留被原子清理的半成品 staging。
- “保留失败产物”同样不承诺保留 subprocess 在既有 `finally` 中声明清理的 release staging/backup、Node test-work 或 rollback clone；这些 cleanup 可以执行但必须在 receipt 记录，主代理失败后不得追加清理。
- 所有 Git 发现使用 `GIT_OPTIONAL_LOCKS=0`；禁止源仓 add、commit、checkout、reset、clean、stash 或其他 Git 元数据写入。仅 R18 rollback namespace 内允许临时 `git clone --local`。
- 所有过程、证据与测试产物位于各自仓库 `work-products/`；测试从最终目录用仓库相对路径引用文件。

## 7. 已知 RED、当前无阻塞项与批准语义

- baseline CLI 的 todo-capture 与 v2 isolation 合同已取得确定性 RED→GREEN：显式 Worker、固定双仓映射、无 glob exclusion、target/receipt 排除覆盖、隔离 fixture ledger 状态迁移、manifest 不含真实 todo、测试不得直接读写活动 todo 与 generated namespace inventory 隔离均有回归；完整工具回归、语法与 diff 门在本候选验证阶段复跑。
- 四代计划合同在本候选写入前以活动合同 RED 证明旧 plan/todo 不匹配；新增深层合同继续以确定性 RED 固定 v2、逐字段蓝图、工具链/环境、prestate、failure receipt 与批准快照缺口，写入后必须全部 GREEN。
- 活动退役名称扫描仍是 Worker 5 行、Pages 1 行；R15 负责 RED→GREEN。offline E2E 与 reject proxy 当前 missing；R15 的安全 RED 必须在任何外部 fetch 前失败。
- 规划时没有其他已成立的启动阻塞；动态端口、工具链、protected inputs、环境与生成路径仍必须在执行前重验。
- 候选批准基线：`work-products/debug/approval-baselines/s22-account-usage-execution-recovery-20260821-02/plan.md`，呈交前 create-new/no-replace 且与活动 plan 原始字节一致；旧 `-01` 草案快照保留只读但不具批准效力。
- 本次 `@uxu-code:plan` 与用户的修复请求不构成对尚未呈交候选的批准。只有用户看到候选后作出清晰整句批准，才能只在 todo 记录批准 receipt。
- 计划批准不调用 `@uxu-code:build`，也不授权 commit、push、部署、联网或远程 Cloudflare/D1 操作。
