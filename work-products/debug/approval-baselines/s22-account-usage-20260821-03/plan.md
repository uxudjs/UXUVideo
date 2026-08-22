# 实施计划：SPEC 第 22 节 Cloudflare 账户级用量收敛

> 状态：PLAN CANDIDATE / APPROVAL REQUIRED
> 候选 ID：`s22-account-usage-20260821-03`
> 规划日期：2026-08-21
> 执行策略：`fast`
> 安全并发上限：2
> 计划批准不授权：实现、commit、push、部署、Cloudflare/D1 远程变更

## 1. 已批准依据与当前边界

- 规范：`work-products/SPEC.md` 第 22 节，已于 2026-08-21 明确批准。
- 规范身份：`work-products/SPEC.md` 第 22 节批准后的当前原始字节；批准基线由候选快照逐字节保护。
- Worker 基线：分支 `main` 的当前本地 HEAD；其中保留已完成的第 21 节 Worker 候选。
- Pages 基线：`../UXUV-Pages` 分支 `main` 的当前本地 HEAD；其中保留已完成的第 21 节 Pages 候选。
- 被替换的第 21 节活动计划与 todo：以 Worker Git HEAD 中的原始字节和版本控制对象身份作为冻结来源，不把内部完整性串作为人类批准身份。
- 第 21 节计划已经完成；本计划是第 22 节的新候选，旧 standing approval 不继承。
- 候选 `s22-account-usage-20260821-02` 在 `@uxu-code:build` 零 worker 预检中因任务 schema 与执行基线写域不完整而停止；未启动实现、未产生执行尝试，本候选只修复该计划合同。
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

| 波次 | Ready | Frozen | 上限 | 编辑 / 聚焦验证并行 | 串行集成屏障与解锁条件 |
|---|---|---|---:|---|---|
| Wave 0 | S22-T00 | S22-T01—T06 | 1 | 否 / 否 | T00 终态 receipt、实际 diff、历史字节身份与聚焦测试全部由主代理核对后，才解锁 Wave 1。 |
| Wave 1 | S22-T01、S22-T02 | S22-T03—T06 | 2 | 是 / 是 | 两个任务都终态，主代理逐项核对各自基线、写集、receipt 与聚焦结果；任一失败均锁住 T03。 |
| Wave 2 | S22-T03 | S22-T04—T06 | 1 | 否 / 否 | T03 终态 receipt、跨仓活动名称扫描与 diff 由主代理核对后，才解锁 Wave 3。 |
| Wave 3 | S22-T04、S22-T05 | S22-T06 | 2 | 是 / 是 | 两个任务都终态；主代理确认 T04 未读取 Pages 可变发布物、T05 独占 Pages 生成目录并核对全部 receipt 后，才解锁 T06。 |
| Wave 4 | S22-T06 | 无 | 1 | 否 / 否 | 主代理串行完成两仓集成、最终证据与 todo 对账；只有全部本地门禁通过才可把任务记为 completed。 |

`fast requested: true`。执行策略：`fast`。安全并发上限：2。全局串行原因：无；实际宽度始终取计划上限、宿主可用 worker 槽和已证明互斥的 ready 任务数三者最小值，只能降低。波次屏障强制执行；任何实际读/写/生成范围、链接身份、缓存或临时目录与声明不一致，都停止新任务并由主代理重新判定，不能静默扩大范围。任务内命令默认串行。todo 由主代理单写；worker 不得改写计划、todo、共享证据或启动嵌套 worker。

## 4. 任务合同

### S22-T00 — 冻结第 21 节历史计划并切换活动计划契约

- 目标：保留已完成计划的不可变证据，同时让活动契约测试验证第 22 节计划。
- 范围：仅冻结 Git HEAD 中的第 21 节计划证据并迁移计划合同测试；不修改产品运行代码、SPEC 或活动 plan/todo。
- 依赖：无。
- 执行基线根：`work-products/debug/execution-baselines/S22-T00/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
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
  - `work-products/debug/execution-baselines/S22-T00/`
- 生成输出：无。
- 共享资源：`work-products/tests/`、第 21 节证据目录、活动 plan/todo（只读）。
- 验收：
  - 历史 plan/todo 以 create-new/no-replace 方式写入，原始字节与 Git HEAD 来源完全一致，并把版本控制对象身份记录在冻结证据中。
  - 第 21 节断言改读冻结副本，不删除或放宽历史断言。
  - 新测试验证第 22 节批准依据、候选身份、所有任务、依赖图、fast 波次、路径边界、todo 初始状态。
  - 测试引用均使用相对路径，不包含机器绝对路径。
- 聚焦验证：
  - `node --test work-products/tests/section21-plan-contract.test.mjs work-products/tests/section22-plan-contract.test.mjs`
- 波次与启动条件：Wave 0；仅在本计划获得明确批准、批准快照逐字节一致、todo 全部任务仍为 pending 且无残留 attempt 时启动。
- 编辑可并行：否；它是后续任务的契约生产者。
- 聚焦验证可并行：否。
- 主代理集成责任：预先记录 attempt 与完整原始字节基线；worker 返回后核对历史来源、实际 diff、receipt 和聚焦结果，只由主代理原子更新 todo 并决定是否解锁 Wave 1。
- 失败/回滚：任何历史字节身份不一致即 fail closed；只撤销本任务新建的冻结副本与测试改动，不修改 Git 历史。

### S22-T01 — Worker 账户级用量 API

- 目标：以最小改动把用量查询、聚合、缓存和响应收敛为账户级。
- 范围：只修改 Worker 用量运行路径及其聚焦合同测试；不编辑 Pages、活动文档、版本号、依赖或远程配置。
- 依赖：S22-T00。
- 执行基线根：`work-products/debug/execution-baselines/S22-T01/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
- 读取：
  - `_worker.js`
  - `work-products/SPEC.md` §22
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/tests/structured-logging.test.mjs`
- 写入：
  - `_worker.js`
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/debug/execution-baselines/S22-T01/`
- 生成输出：无。
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
- 波次与启动条件：Wave 1；S22-T00 completed 且 Wave 0 串行屏障已解锁。
- 编辑可并行：是，仅可与 S22-T02 同波；两者读/写/生成与任务基线根均互斥。
- 聚焦验证可并行：是，仅与 S22-T02 的 Pages 聚焦验证并行；本任务内部命令串行。
- 主代理集成责任：在整批 worker 启动前记录 T01 基线与 attempt；回收后核对 Worker 实际 diff、响应合同与 receipt，不代替 worker 编辑共享源，仅在 T01/T02 都终态后更新 Wave 1 屏障。
- 失败/回滚：保留 RED/GREEN 证据；回滚本任务两文件，不触碰 Pages、远程变量或 D1。

### S22-T02 — Pages 账户级消费者与界面

- 目标：让 Pages 严格消费新 schema，并只呈现账户级四指标。
- 范围：只修改列出的 Pages 消费器、设置/告警组件与 E2E 测试；不编辑 Worker、Pages 发布目录或依赖。
- 依赖：S22-T00。
- 执行基线根：`work-products/debug/execution-baselines/S22-T02/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
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
  - `work-products/debug/execution-baselines/S22-T02/`
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
- 波次与启动条件：Wave 1；S22-T00 completed 且 Wave 0 串行屏障已解锁。
- 编辑可并行：是，仅可与 S22-T01 同波；两者读/写/生成与任务基线根均互斥。
- 聚焦验证可并行：是，仅与 S22-T01 的 Worker 聚焦验证并行；Pages 任务内部命令串行且独占自身生成目录。
- 主代理集成责任：在整批 worker 启动前记录 T02 五个源/测试文件、三个生成目录与任务基线根的状态；回收后核对实际 diff、Playwright 产物和 receipt，仅在 T01/T02 都终态后更新 Wave 1 屏障。
- 失败/回滚：保存失败截图/trace；回滚列出的五个源/测试文件，删除仅由本任务生成的临时构建物，不修改发布目录。

### S22-T03 — 活动配置文档与边界契约

- 目标：让活动 README、CHANGELOG 和仓库边界测试与两变量配置一致。
- 范围：只同步 Worker 活动 README、Unreleased CHANGELOG 与 Worker-only 边界测试；不改运行逻辑、Pages、版本号或依赖。
- 依赖：S22-T01、S22-T02。
- 执行基线根：`work-products/debug/execution-baselines/S22-T03/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
- 读取：
  - `README.md`
  - `CHANGELOG.md`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - `_worker.js`
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `../UXUV-Pages/lib/hooks/useCloudflareUsage.ts`
  - `../UXUV-Pages/components/settings/CloudflareUsageSettings.tsx`
  - `../UXUV-Pages/components/UsageAlertProvider.tsx`
  - `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts`
  - `../UXUV-Pages/work-products/tests/app-flows.e2e.spec.ts`
- 写入：
  - `README.md`
  - `CHANGELOG.md`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - `work-products/debug/execution-baselines/S22-T03/`
- 生成输出：无。
- 共享资源：活动配置名称扫描、版本契约。
- 验收：
  - README 的用量配置只保留 `CF_ACCOUNT_ID` 与 Secret `CF_ANALYTICS_API_TOKEN`，并明确账户级总量。
  - 旧两个名称不出现在活动运行代码、活动 README、Pages 源码或活动测试；历史 SPEC、CHANGELOG、冻结证据可作为明确历史记录保留。
  - CHANGELOG 的 Unreleased 记录账户级收敛；版本保持 Worker 2.0.0 / Pages 0.3.0 / API 2。
  - Worker-only 边界继续禁止在本仓引入 Pages/Node 服务端运行时。
- 聚焦验证：
  - `node --test work-products/tests/worker-only-boundary.test.mjs`
  - `git diff --check`
- 波次与启动条件：Wave 2；S22-T01、S22-T02 均 completed，Wave 1 全批 receipt 与实际 diff 已由主代理通过屏障。
- 编辑可并行：否；本任务消费 Wave 1 两侧的最终字段与文案。
- 聚焦验证可并行：否。
- 主代理集成责任：记录 T03 attempt 与基线，核对活动名称扫描、文档差异、边界测试与 receipt；确认未改版本/依赖后原子更新 todo 并决定是否解锁 Wave 3。
- 失败/回滚：回滚本任务三个文件；不改版本号、不改包依赖。

### S22-T04 — Worker 隔离门禁与证据

- 目标：在不读取 Pages 可变发布物的前提下验证 Worker 实现。
- 范围：只运行 Worker 隔离门禁并写本地证据；不修改产品源、测试、Pages 生成物或远程状态。
- 依赖：S22-T03。
- 执行基线根：`work-products/debug/execution-baselines/S22-T04/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
- 读取：
  - `_worker.js`
  - `README.md`
  - `CHANGELOG.md`
  - `package.json`
  - `scripts/check-worker-size.mjs`
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/tests/structured-logging.test.mjs`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - `work-products/tests/section22-plan-contract.test.mjs`
- 写入：
  - `work-products/evidence/section22/worker-validation.md`
  - `work-products/debug/execution-baselines/S22-T04/`
- 生成输出：无。
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
- 波次与启动条件：Wave 3；S22-T03 completed 且 Wave 2 串行屏障已解锁。
- 编辑可并行：是，仅可与 S22-T05 同波；本任务只写 Worker 证据与独立基线根。
- 聚焦验证可并行：是，仅与 S22-T05 的 Pages 门禁并行；不得运行会读取 Pages 发布物的全套 `npm test`。
- 主代理集成责任：预记录 T04 attempt 与证据路径基线；回收后核对命令退出码、扫描分类、实际 diff、receipt 及“未读取 Pages 可变发布物”边界，等待 T05 终态后统一处理 Wave 3 屏障。
- 失败/回滚：保留失败证据，不修复范围外问题；证据文件可重建，产品回滚交还对应实现任务。

### S22-T05 — Pages 全门禁与静态发布物重建

- 目标：验证 Pages 并重建可复制的本地静态发布候选。
- 范围：只验证 Pages、重建本地静态发布物并写 Pages 证据；不修改 Worker、依赖、远程 Pages 或 Cloudflare 状态。
- 依赖：S22-T03。
- 执行基线根：`work-products/debug/execution-baselines/S22-T05/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
- 读取：
  - `../UXUV-Pages/`（只读输入覆盖源码、配置、现有测试、`node_modules/` 与构建脚本；排除 `.git/`，写入/生成目标仍以下列清单为准）
  - `_worker.js`（只读的新响应 schema）
- 写入：
  - `../UXUV-Pages/work-products/evidence/section22/pages-validation.md`
  - `work-products/debug/execution-baselines/S22-T05/`
- 生成：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/current/`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
- 共享资源：Pages npm/Next/Playwright 与 release builder；本任务独占 Pages 生成目录。
- 验收：
  - `npm test`、lint、TypeScript、production build、完整 E2E、release build、diff check 全通过。
  - `release/current` manifest 仍声明 Pages 0.3.0、API 2、现有 Worker range，且其完整性字段可复算。
  - `next-env.d.ts` 等非范围文件不产生漂移；生成物不含 token、机器绝对路径或旧项目级 UI 文案。
- 聚焦验证（在 `../UXUV-Pages` 串行运行）：
  - `npm test`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
  - `npm run test:e2e`
  - `npm run release:build`
  - `git diff --check`
- 波次与启动条件：Wave 3；S22-T03 completed 且 Wave 2 串行屏障已解锁。
- 编辑可并行：是，仅可与 S22-T04 同波；本任务独占 Pages 源、证据与全部 Pages 生成目录。
- 聚焦验证可并行：是，仅与 S22-T04 的 Worker 隔离门禁并行；本任务内部全部 Pages 命令串行。
- 主代理集成责任：启动前记录 T05 证据、全部生成目录和任务基线根的完整状态；回收后核对 Pages 实际 diff、release manifest、receipt 与非范围漂移，等待 T04 终态后统一处理 Wave 3 屏障。
- 失败/回滚：保留 Playwright 失败产物；恢复/重建 `release/current` 前先记录原 manifest 身份，不部署，不改依赖。

### S22-T06 — 两仓集成、完整回归与本地发布门禁

- 目标：在生成物稳定后完成跨仓契约、完整套件、身份与回滚验证。
- 范围：只执行两仓本地集成门禁、重建验证所需 Pages 生成物并写最终证据；不修改产品源、依赖、版本或任何远程状态。
- 依赖：S22-T04、S22-T05。
- 执行基线根：`work-products/debug/execution-baselines/S22-T06/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
- 读取：
  - Worker 本次差异：`_worker.js`、`README.md`、`CHANGELOG.md`、`package.json`、`scripts/`、`work-products/tests/`、`work-products/evidence/section21/`、`work-products/evidence/section22/`
  - Pages 本次差异及门禁输入：`../UXUV-Pages/`（排除 `.git/`；写入/生成目标仍以下列清单为准）
  - `../UXUV-Pages/release/current/` 与 manifest
  - 第 21 节冻结计划/回滚证据
  - 第 22 节 Worker/Pages 验证证据
- 写入：
  - `work-products/evidence/section22/pair-validation.md`
  - `work-products/evidence/section22/receipts/S22-T06.json`
  - `work-products/debug/execution-baselines/S22-T06/`
- 生成：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/current/`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
- 共享资源：两仓完整测试套件、Pages 发布物、最终 todo；主代理独占。
- 验收：
  - Worker `npm test`、语法、大小、diff check 全通过；Pages 全套门禁复核通过。
  - 跨仓测试证明响应字段、四指标、版本/API/range、release manifest 和回滚入口一致。
  - 活动范围扫描证明旧两个变量只可能存在于明确历史证据/规范/CHANGELOG，不存在于运行读取、活动配置说明、Pages 输入或活动测试。
  - 记录两仓 HEAD 的语义基线、工作树状态、关键文件原始字节身份、发布物 manifest 完整性、验证时间和逐项命令退出码；内部完整性字段不作为人类批准身份。
  - 最终状态仅可为 `LOCAL CANDIDATE / RELEASE HOLD`；commit、push、部署和真实 Cloudflare 查询仍未授权、未验证。
- 验证（串行）：
  - 在 Worker：`node --check _worker.js`、`npm test`、`npm run check:size`、`git diff --check`
  - 在 Pages：`npm test`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`npm run test:e2e`、`npm run release:build`、`git diff --check`
  - 逐字节比对 SPEC、计划、两仓关键源文件，并复算 release manifest 已声明的完整性字段。
- 波次与启动条件：Wave 4；S22-T04、S22-T05 均 completed，Wave 3 全批 receipt、实际 diff 与生成目录状态已由主代理通过屏障。
- 编辑可并行：否；最终集成、Pages 生成目录与 todo 由主代理独占。
- 聚焦验证可并行：否；两仓命令按计划顺序串行。
- 主代理集成责任：亲自执行本任务或单 worker 后完整对账两仓差异、生成物、回滚入口、receipt 与全部命令；只有本地门禁全部通过才原子写入终态 todo，且终态仍为 `LOCAL CANDIDATE / RELEASE HOLD`。
- 失败/回滚：任一门禁失败即 NO-GO/RELEASE HOLD；不覆盖失败证据，不自动提交、推送、部署或修改远程配置。回滚使用第 21 节已冻结身份和 Pages 旧发布 manifest，实际回滚动作仍需另行授权。

## 5. 读写隔离与并行失效规则

- 除显式以 `../UXUV-Pages/` 开头的路径外，所有仓库相对路径都以 Worker 仓库根目录解析；不得根据 worker 当前目录改变路径身份。
- 每个任务只能使用其合同声明的 `work-products/debug/execution-baselines/S22-Txx/` 根；主代理在其中为每次 attempt 创建唯一 create-new/no-replace 子目录。该目录属于任务写范围，但 worker 只读，只有主代理可创建、校验和记账。
- 启动任何任务前，主代理在 todo 原子记录 attempt ID、owner、排序后的规范路径集、每条路径的 `present-file | present-directory | missing` 状态、snapshot root 与 `no_replace: true`。目录基线必须枚举完整后代集合并保存每个普通文件的原始字节；missing 路径只能独占创建。
- 第一次写入每个目标前，必须重新解析规范路径、Windows 大小写别名、祖先/后代、链接/realpath、生成输出别名以及共享锁、缓存和临时目录，并与 attempt 基线逐字节/逐后代集合比较；任何存在性、类型、链接、字节、后代、owner 或路径身份漂移都阻塞，不能串行降级。
- `S22-T01` 不得编辑 Pages；`S22-T02` 不得编辑 Worker。
- `S22-T04` 不得读取或生成 Pages `release/current/`，否则与 `S22-T05` 冲突并必须串行。
- 任何任务发现需要写入另一任务的写集、生成集、共享证据或 todo 时，先停止并由主代理重排，不静默扩大范围。
- 所有过程/证据/测试产物位于 `work-products/`；跨仓 Pages 产物位于其自身 `work-products/`。
- 测试和证据引用仓库文件必须使用相对路径；不得持久化任何机器绝对路径。
- 不安装依赖；使用两仓现有 Node/npm/Playwright 环境。环境缺失或损坏时停止并报告，不使用全局替代。

## 6. 计划阶段已知 RED 与批准语义

- 用新候选替换活动 `plan.md` / `todo.md` 后，旧 `section21-plan-contract.test.mjs` 在 S22-T00 执行前预期失败，因为它仍绑定第 21 节活动文件。这是已知、限时、可解释的计划迁移 RED，不在 `@plan` 阶段修改测试来伪造绿色。
- 本候选的批准基线：`work-products/debug/approval-baselines/s22-account-usage-20260821-03/plan.md`。它必须与当前候选计划原始字节完全一致，且 create-new/no-replace。
- 候选 `s22-account-usage-20260821-02` 已由本次结构修复取代；其计划、todo 批准记录与快照只读保留，不复制到后续 attempt、worker 或终态 receipt。
- 候选 `s22-account-usage-20260821-01` 因批准前 `git diff --check` 发现格式问题而废弃；其基线仅保留审计，不曾提交用户批准。
- 只有用户在看到候选 ID 后作出的新明确批准，才能把本计划转为 APPROVED 并授权从 S22-T00 开始构建。
- 之前对 SPEC 的“确认批准”、第 21 节 standing approval 或本次 `fast` 参数均不自动批准本计划，更不授权实现或发布。
