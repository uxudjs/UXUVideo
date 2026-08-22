# 实施计划：SPEC 第 22 节 Cloudflare 账户级用量收敛

> 状态：PLAN CANDIDATE / APPROVAL REQUIRED
> 候选 ID：`s22-account-usage-20260821-02`
> 规划日期：2026-08-21
> 执行策略：`fast`
> 安全并发上限：2
> 计划批准不授权：实现、commit、push、部署、Cloudflare/D1 远程变更

## 1. 已批准依据与当前边界

- 规范：`work-products/SPEC.md` 第 22 节，已于 2026-08-21 明确批准。
- 规范原始字节 SHA-256：`ef1864ff60e40a3610781395ec6c347137e571485fcd545857adc059dc31bf81`。
- Worker 基线：分支 `main`，HEAD `9185950b8c1a5cae4204f244369bf711e0f36b44`。
- Pages 基线：`../UXUV-Pages` 分支 `main`，HEAD `47b6b76b9d2f8b7069ab43e8b036f0724b431586`。
- 被替换的第 21 节计划原始字节 SHA-256：`cbbc27518ec5db9579a80373ecdcb989d102f25addd6e5e7329beffe3e4d95ff`；Git blob：`4d0e814ba20ef7042b11731eb2a1bb77e5f2bdcd`。
- 被替换的第 21 节 todo 原始字节 SHA-256：`83405ce04e83775b6acda6bbf277dc277c093ec09b8eecf74d7917360ca82909`；Git blob：`846e05b23ceba9a13b9bff8b3b8566ab4fec3d85`。
- 第 21 节计划已经完成；本计划是第 22 节的新候选，旧 standing approval 不继承。
- 当前确认的实现事实：
  - Worker 仍读取 `CF_ACCOUNT_ID`、`CF_ANALYTICS_API_TOKEN`、`CF_WORKER_SCRIPT_NAME`、`CF_D1_DATABASE_ID`，并返回账户级与项目级混合字段。
  - Pages 仍解析、显示 Worker script 与 D1 database/project 细分字段。
  - 第 21 节计划契约测试直接绑定当前 `plan.md` / `todo.md`，必须先迁移到不可变历史副本。
- 版本决策：继续使用尚未发布的 Worker `2.0.0`、Pages `0.3.0`、API Contract `2` 和现有 Worker 兼容范围；只补充 Unreleased 变更说明，不制造无依据版本跃迁。
- 停止条件：若构建前发现 API Contract v2 已在生产或存在未纳入范围的外部消费者，立即停止并重新规格化，不进入兼容性猜测。
- 不新增依赖，不修改 D1 schema/binding，不删除远程旧变量，不执行网络、commit、push 或部署。

## 2. 目标与验收总则

完成后必须同时满足：

1. 用量功能仅依赖普通变量 `CF_ACCOUNT_ID` 与 Secret `CF_ANALYTICS_API_TOKEN`。
2. `CF_WORKER_SCRIPT_NAME` 与 `CF_D1_DATABASE_ID` 不再参与运行时读取、缺失项、GraphQL 变量/过滤、缓存身份、活动文档、Pages 输入或活动测试；远程遗留值仅被忽略。
3. Worker 返回 SPEC §22.5 的精确账户级 schema；只允许 `WORKERS_ACCOUNT`、`D1_ACCOUNT_READ`、`D1_ACCOUNT_WRITE`、`D1_ACCOUNT_STORAGE` 与 `USAGE_DATA_STALE`。
4. GraphQL 对账户下全部 Workers 与全部 D1 数据库聚合；无法证明完整性时 fail closed，不把截断或单项目数据冒充账户总量。
5. Pages 显示四个账户指标，三语言、四断点、阈值、可访问性、未配置/过期/错误/鉴权边界均有自动化证据。
6. Worker 与 Pages 的版本、契约、静态发布物、回滚材料和跨仓配对证据一致；最终结论只能是本地候选，不得声称生产已验证。

## 3. 依赖图与执行波次

```text
S22-T00 ─┬─> S22-T01 ─> S22-T03 ─┬─> S22-T04 ─┐
         │                        │            │
         └─> S22-T02 ────────────┴─> S22-T05 ─┴─> S22-T06
```

| 波次 | 可启动任务 | 并发上限 | 启动条件 |
|---|---|---:|---|
| Wave 0 | S22-T00 | 1 | 新计划获明确批准 |
| Wave 1 | S22-T01、S22-T02 | 2 | T00 通过；两个任务跨仓且写集、生成集互斥 |
| Wave 2 | S22-T03 | 1 | Wave 1 全部通过 |
| Wave 3 | S22-T04、S22-T05 | 2 | T03 通过；T04 禁止读取 Pages 可变发布物 |
| Wave 4 | S22-T06 | 1 | T04、T05 均通过 |

`fast requested: true`。全局串行原因：无。波次屏障仍强制执行；任何实际读/写/生成范围与声明不一致，都降级为串行并记录原因。任务内命令默认串行。todo 由主代理单写；子任务不得并发改写计划、todo 或同一证据文件。

## 4. 任务合同

### S22-T00 — 冻结第 21 节历史计划并切换活动计划契约

- 目标：保留已完成计划的不可变证据，同时让活动契约测试验证第 22 节计划。
- 依赖：无。
- 读取：
  - Git HEAD 中的 `work-products/plan.md`、`work-products/todo.md`
  - `work-products/tests/section21-plan-contract.test.mjs`
  - 当前候选 `work-products/plan.md`、`work-products/todo.md`
- 写入：
  - `work-products/evidence/section21/final-plan.md`
  - `work-products/evidence/section21/final-todo.md`
  - `work-products/evidence/section21/final-plan-identity.json`
  - `work-products/tests/section21-plan-contract.test.mjs`
  - `work-products/tests/section22-plan-contract.test.mjs`
- 共享资源：`work-products/tests/`、第 21 节证据目录、活动 plan/todo（只读）。
- 验收：
  - 历史 plan/todo 以 create-new/no-replace 方式写入，字节哈希、Git blob、基线 commit 与本计划 §1 一致。
  - 第 21 节断言改读冻结副本，不删除或放宽历史断言。
  - 新测试验证第 22 节批准依据、候选身份、所有任务、依赖图、fast 波次、路径边界、todo 初始状态。
  - 测试引用均使用相对路径，不包含机器绝对路径。
- 聚焦验证：
  - `node --test work-products/tests/section21-plan-contract.test.mjs work-products/tests/section22-plan-contract.test.mjs`
- 可并行：否；它是后续任务的契约生产者。
- 失败/回滚：任何历史字节身份不一致即 fail closed；只撤销本任务新建的冻结副本与测试改动，不修改 Git 历史。

### S22-T01 — Worker 账户级用量 API

- 目标：以最小改动把用量查询、聚合、缓存和响应收敛为账户级。
- 依赖：S22-T00。
- 读取：
  - `_worker.js`
  - `work-products/SPEC.md` §22
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/tests/structured-logging.test.mjs`
- 写入：
  - `_worker.js`
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
- 共享资源：Worker 用量处理器、GraphQL mock、Node test runner。
- 验收：
  - 仅检查两个配置项；旧两个变量存在、缺失或变化均不影响配置状态、查询或缓存键。
  - GraphQL 不声明/传入 `scriptName` 或 `databaseId` 过滤变量；汇总全部 Workers 和全部 D1 数据库。
  - D1 storage 可按 `dimensions.databaseId` 对每库取最大值后求和，但不得接受外部数据库 ID 作为过滤。
  - 对分页/limit 截断、缺失节点、非有限值或不可证明完整的聚合 fail closed。
  - 精确返回 `workers.accountRequests/accountErrors/accountLimit` 与 `d1.accountRowsRead/accountRowsWritten/accountStorageBytes` 及三个账户额度；删除项目级字段与 guardrail。
  - 鉴权、同源、token 不回传、TTL/陈旧缓存语义维持。
- 聚焦验证：
  - `node --test work-products/tests/cloudflare-usage-contract.test.mjs work-products/tests/structured-logging.test.mjs`
  - `node --check _worker.js`
- 可并行：是，仅可与 S22-T02 同波；写集无交集。
- 失败/回滚：保留 RED/GREEN 证据；回滚本任务两文件，不触碰 Pages、远程变量或 D1。

### S22-T02 — Pages 账户级消费者与界面

- 目标：让 Pages 严格消费新 schema，并只呈现账户级四指标。
- 依赖：S22-T00。
- 读取：
  - `../UXUV-Pages/lib/hooks/useCloudflareUsage.ts`
  - `../UXUV-Pages/components/settings/CloudflareUsageSettings.tsx`
  - `../UXUV-Pages/components/UsageAlertProvider.tsx`
  - `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts`
  - `../UXUV-Pages/work-products/tests/app-flows.e2e.spec.ts`
- 写入：
  - `../UXUV-Pages/lib/hooks/useCloudflareUsage.ts`
  - `../UXUV-Pages/components/settings/CloudflareUsageSettings.tsx`
  - `../UXUV-Pages/components/UsageAlertProvider.tsx`
  - `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts`
  - `../UXUV-Pages/work-products/tests/app-flows.e2e.spec.ts`
- 生成但不手工编辑：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
- 共享资源：Pages build/Playwright server；不得在本任务生成 `release/current/`。
- 验收：
  - parser 严格接受 SPEC §22.5 字段，拒绝旧项目级/缺字段/非有限值响应。
  - 设置页和告警只显示 Workers 请求、D1 读取、D1 写入、D1 存储四个账户指标，无 script/database/project 文案。
  - 未配置态只列两个变量；三语言、320/768/1024/1440 四断点、阈值 70/85/95/100、axe、stale/error/auth、viewer/direct Pages 不请求、token 不泄露均被覆盖。
- 聚焦验证：
  - 在 `../UXUV-Pages` 运行 `npx playwright test work-products/tests/usage-ui.e2e.spec.ts --config playwright.config.ts --workers=1`
- 可并行：是，仅可与 S22-T01 同波；跨仓写集互斥。
- 失败/回滚：保存失败截图/trace；回滚列出的五个源/测试文件，删除仅由本任务生成的临时构建物，不修改发布目录。

### S22-T03 — 活动配置文档与边界契约

- 目标：让活动 README、CHANGELOG 和仓库边界测试与两变量配置一致。
- 依赖：S22-T01、S22-T02。
- 读取：
  - `README.md`
  - `CHANGELOG.md`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - 两仓已修改的用量文件
- 写入：
  - `README.md`
  - `CHANGELOG.md`
  - `work-products/tests/worker-only-boundary.test.mjs`
- 共享资源：活动配置名称扫描、版本契约。
- 验收：
  - README 的用量配置只保留 `CF_ACCOUNT_ID` 与 Secret `CF_ANALYTICS_API_TOKEN`，并明确账户级总量。
  - 旧两个名称不出现在活动运行代码、活动 README、Pages 源码或活动测试；历史 SPEC、CHANGELOG、冻结证据可作为明确历史记录保留。
  - CHANGELOG 的 Unreleased 记录账户级收敛；版本保持 Worker 2.0.0 / Pages 0.3.0 / API 2。
  - Worker-only 边界继续禁止在本仓引入 Pages/Node 服务端运行时。
- 聚焦验证：
  - `node --test work-products/tests/worker-only-boundary.test.mjs`
  - `git diff --check`
- 可并行：否；消费 Wave 1 两侧的最终字段与文案。
- 失败/回滚：回滚本任务三个文件；不改版本号、不改包依赖。

### S22-T04 — Worker 隔离门禁与证据

- 目标：在不读取 Pages 可变发布物的前提下验证 Worker 实现。
- 依赖：S22-T03。
- 读取：
  - `_worker.js`
  - `README.md`
  - `CHANGELOG.md`
  - Worker 用量、日志、安全、大小和边界测试
- 写入：
  - `work-products/evidence/section22/worker-validation.md`
- 共享资源：Worker Node test runner；禁止读取 `../UXUV-Pages/release/current/`。
- 验收：
  - 语法、用量契约、结构化日志、认证/同源、大小、活动配置名称与秘密/机器路径扫描通过。
  - 证据记录命令、退出码、时间、HEAD、工作树差异范围和局限；不得写成生产验证。
- 聚焦验证：
  - `node --check _worker.js`
  - `node --test work-products/tests/cloudflare-usage-contract.test.mjs work-products/tests/structured-logging.test.mjs work-products/tests/worker-only-boundary.test.mjs work-products/tests/section22-plan-contract.test.mjs`
  - `npm run check:size`
  - `git diff --check`
  - 对本计划列出的活动文件执行高置信秘密与机器绝对路径扫描；命中即人工分类，真实秘密即停止。
- 可并行：是，仅可与 S22-T05 同波；不得运行会读取 Pages 发布物的全套 `npm test`。
- 失败/回滚：保留失败证据，不修复范围外问题；证据文件可重建，产品回滚交还对应实现任务。

### S22-T05 — Pages 全门禁与静态发布物重建

- 目标：验证 Pages 并重建可复制的本地静态发布候选。
- 依赖：S22-T03。
- 读取：
  - Pages 源码、测试、`package.json`、`scripts/build-release.mjs`
  - Worker 新 schema（只读）
- 写入：
  - `../UXUV-Pages/work-products/evidence/section22/pages-validation.md`
- 生成：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/current/`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
- 共享资源：Pages npm/Next/Playwright 与 release builder；本任务独占 Pages 生成目录。
- 验收：
  - `npm test`、lint、TypeScript、production build、完整 E2E、release build、diff check 全通过。
  - `release/current` manifest 仍声明 Pages 0.3.0、API 2、现有 Worker range，哈希可复算。
  - `next-env.d.ts` 等非范围文件不产生漂移；生成物不含 token、机器绝对路径或旧项目级 UI 文案。
- 聚焦验证（在 `../UXUV-Pages` 串行运行）：
  - `npm test`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
  - `npm run test:e2e`
  - `npm run release:build`
  - `git diff --check`
- 可并行：是，仅可与 S22-T04 同波。
- 失败/回滚：保留 Playwright 失败产物；恢复/重建 `release/current` 前先记录原 manifest 身份，不部署，不改依赖。

### S22-T06 — 两仓集成、完整回归与本地发布门禁

- 目标：在生成物稳定后完成跨仓契约、完整套件、身份与回滚验证。
- 依赖：S22-T04、S22-T05。
- 读取：
  - 两仓全部本次差异
  - `../UXUV-Pages/release/current/` 与 manifest
  - 第 21 节冻结计划/回滚证据
  - 第 22 节 Worker/Pages 验证证据
- 写入：
  - `work-products/evidence/section22/pair-validation.md`
  - `work-products/evidence/section22/receipts/S22-T06.json`
- 共享资源：两仓完整测试套件、Pages 发布物、最终 todo；主代理独占。
- 验收：
  - Worker `npm test`、语法、大小、diff check 全通过；Pages 全套门禁复核通过。
  - 跨仓测试证明响应字段、四指标、版本/API/range、release manifest 和回滚入口一致。
  - 活动范围扫描证明旧两个变量只可能存在于明确历史证据/规范/CHANGELOG，不存在于运行读取、活动配置说明、Pages 输入或活动测试。
  - 记录两仓 HEAD、工作树状态、关键文件 SHA-256、发布物身份、验证时间和逐项命令退出码。
  - 最终状态仅可为 `LOCAL CANDIDATE / RELEASE HOLD`；commit、push、部署和真实 Cloudflare 查询仍未授权、未验证。
- 验证（串行）：
  - 在 Worker：`node --check _worker.js`、`npm test`、`npm run check:size`、`git diff --check`
  - 在 Pages：`npm test`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`npm run test:e2e`、`npm run release:build`、`git diff --check`
  - 复算并比对 SPEC、计划、两仓关键源文件与 release manifest 哈希。
- 可并行：否；最终集成与 todo 只有主代理可写。
- 失败/回滚：任一门禁失败即 NO-GO/RELEASE HOLD；不覆盖失败证据，不自动提交、推送、部署或修改远程配置。回滚使用第 21 节已冻结身份和 Pages 旧发布 manifest，实际回滚动作仍需另行授权。

## 5. 读写隔离与并行失效规则

- `S22-T01` 不得编辑 Pages；`S22-T02` 不得编辑 Worker。
- `S22-T04` 不得读取或生成 Pages `release/current/`，否则与 `S22-T05` 冲突并必须串行。
- 任何任务发现需要写入另一任务的写集、生成集、共享证据或 todo 时，先停止并由主代理重排，不静默扩大范围。
- 所有过程/证据/测试产物位于 `work-products/`；跨仓 Pages 产物位于其自身 `work-products/`。
- 测试和证据引用仓库文件必须使用相对路径；不得落入 `C:\\Users\\...` 等机器路径。
- 不安装依赖；使用两仓现有 Node/npm/Playwright 环境。环境缺失或损坏时停止并报告，不使用全局替代。

## 6. 计划阶段已知 RED 与批准语义

- 用新候选替换活动 `plan.md` / `todo.md` 后，旧 `section21-plan-contract.test.mjs` 在 S22-T00 执行前预期失败，因为它仍绑定第 21 节活动文件。这是已知、限时、可解释的计划迁移 RED，不在 `@plan` 阶段修改测试来伪造绿色。
- 本候选的批准基线：`work-products/debug/approval-baselines/s22-account-usage-20260821-02/plan.md`。它必须与当前候选计划原始字节完全一致，且 create-new/no-replace。
- 候选 `s22-account-usage-20260821-01` 因批准前 `git diff --check` 发现格式问题而废弃；其基线仅保留审计，不曾提交用户批准。
- 只有用户在看到候选 ID 后作出的新明确批准，才能把本计划转为 APPROVED 并授权从 S22-T00 开始构建。
- 之前对 SPEC 的“确认批准”、第 21 节 standing approval 或本次 `fast` 参数均不自动批准本计划，更不授权实现或发布。
