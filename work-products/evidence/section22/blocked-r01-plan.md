# 恢复计划：SPEC 第 22 节账户级用量与本地门禁

> 状态：PLAN CANDIDATE / APPROVAL REQUIRED
> 候选 ID：`s22-account-usage-recovery-20260821-01`
> 规划日期：2026-08-21
> 执行策略：`serial`
> 安全并发上限：1
> 计划批准不授权：实现、commit、push、部署、Cloudflare/D1 远程变更

## 1. 规划依据、已采纳成果与边界

- 已批准规范：`work-products/SPEC.md` 第 22 节；接口、配置、安全、兼容、版本和本地发布边界均已确定，不需要重新规格化。
- 被替换的已批准计划：`work-products/evidence/section22/blocked-wave2-plan.md`；其 Wave 2 blocked 终态账本：`work-products/evidence/section22/blocked-wave2-todo.md`。两者均在本候选写入前以 create-new/no-replace 原始字节副本冻结。
- 采纳的已完成成果：旧计划 S22-T00、S22-T01、S22-T02 的产品、测试、历史证据、执行基线与完成 receipt 全部保留，不重新执行任务本身。
- 采纳的 S22-T03 成果：`README.md`、`CHANGELOG.md` 与 `work-products/tests/worker-only-boundary.test.mjs` 的三文件改动保留；其聚焦门禁 9/9 与 diff check 已通过。旧 attempt 的 blocked 结论仍保留，不改写为 completed。
- 唯一恢复缺口：`work-products/tests/cloudflare-usage-contract.test.mjs` 与 `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts` 仍包含两个退役配置名的完整字面量；这与已批准的“活动测试零命中”验收冲突，但对应兼容性与负向行为仍必须保留自动化证明。
- 用户确认的 Pages 并发既有状态：`../UXUV-Pages/package.json`、`../UXUV-Pages/work-products/tests/iptv-retirement-contract.test.mjs`、`../UXUV-Pages/work-products/tests/pages-deployment.test.mjs` 与 `../UXUV-Pages/work-products/tests/repository-test-isolation.test.mjs`。它们属于另一已完成的 GitHub Pages CI 修复任务，本计划仅将其作为只读保护输入，不取得写权限。
- 已知本地证据：Worker 用量聚焦门禁 8/8、Pages 用量 Playwright 7/7；并发 Pages CI 修复门禁为主 runner 163/163、Section 21 聚合 10/10、lint、TypeScript 与 Worker-only 9/9。恢复任务修改活动测试后仍必须重新运行相应门禁，不能继承绿色结论。
- 版本保持 Worker `2.0.0`、Pages `0.3.0`、API Contract `2` 与现有 Worker range；不安装依赖，不修改 D1 schema/binding，不删除远程旧变量。
- 本候选只规划剩余恢复与本地验证；最终状态上限为 `LOCAL CANDIDATE / RELEASE HOLD`。不授权 commit、push、部署、真实 Cloudflare 查询或远程配置变更。

## 2. 目标与验收总则

完成后必须同时满足：

1. 两个退役配置名的完整字面量不出现在活动运行代码、README、Pages 源码或活动测试；历史 SPEC、CHANGELOG、冻结计划/todo 与执行证据可保留明确历史记录。
2. Worker 测试仍证明远程遗留变量存在、缺失或变化均被忽略；Pages 测试仍证明未配置态只显示两个活动变量且不泄漏旧项目级文案。允许在测试运行时以分段构造生成兼容性键，但源文件不得保存完整退役名称。
3. 旧计划已完成/已采纳的账户级 API、严格 parser、四指标、三语言、四断点、阈值、axe、鉴权、stale 与 token 边界不回退。
4. Worker 与 Pages 的聚焦门禁、完整门禁、静态发布物、版本/API/range、回滚材料和证据一致。
5. 四个用户确认的 Pages 并发文件保持为只读既有输入；本计划不得覆盖、格式化或重新归因。
6. 最终只能报告本地候选与发布保持；本地绿色不代表生产验证或远程授权。

## 3. 执行策略、依赖图与波次

`fast requested: false`。执行策略：`serial`。安全并发上限：1。串行原因：本次调用没有精确的首参数 `fast`，且恢复任务依次迁移活动计划合同、修改跨仓测试、生成 Pages 发布物并完成最终集成；每一步都消费前一步的稳定字节与证据。

```text
S22-R00 -> S22-R01 -> S22-R02 -> S22-R03 -> S22-R04
```

| 波次 | Ready | Frozen | 上限 | 编辑 / 聚焦验证并行 | 串行集成屏障与解锁条件 |
|---|---|---|---:|---|---|
| Wave 0 | S22-R00 | S22-R01—R04 | 1 | 否 / 否 | 历史合同迁移与新恢复计划合同均通过，实际 diff 与 receipt 对账后解锁 R01。 |
| Wave 1 | S22-R01 | S22-R02—R04 | 1 | 否 / 否 | 两仓活动名称扫描零命中、兼容性/用量聚焦门禁和保护输入复核通过后解锁 R02。 |
| Wave 2 | S22-R02 | S22-R03—R04 | 1 | 否 / 否 | Worker 隔离门禁、证据、秘密/机器路径扫描和 diff 对账后解锁 R03。 |
| Wave 3 | S22-R03 | S22-R04 | 1 | 否 / 否 | Pages 全门禁、静态发布物、保护输入与 evidence receipt 对账后解锁 R04。 |
| Wave 4 | S22-R04 | 无 | 1 | 否 / 否 | 两仓最终集成、完整回归、发布物完整性和回滚证据全部通过后才可完成。 |

todo 由主代理单写；worker 不得改写计划、todo、共享证据或启动嵌套 worker。各任务的“写入/生成输出”只定义 worker target set 与 attempt 原始字节基线；主代理在启动前和回收后对 `work-products/todo.md` 的原子状态转换属于独立的编排账本事务，不授予 worker 写权限，也不把 todo 纳入会在启动前自致漂移的 worker target baseline。运行时宽度始终为 1，不允许从 serial 自动升级为 fast。

## 4. 任务合同

### S22-R00 — 冻结旧合同并切换恢复计划契约

- 目标：让旧 Section 22 合同继续验证冻结的 blocked 历史，同时为本恢复计划建立独立活动合同。
- 范围：worker 只迁移计划合同测试，不修改产品源、已冻结证据、SPEC、README、CHANGELOG、活动 plan 或 todo；主代理仍按编排账本合同记录本任务的 attempt 与终态。
- 依赖：无。
- 执行基线根：`work-products/debug/execution-baselines/S22-R00/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
- 读取：
  - `work-products/evidence/section22/blocked-wave2-plan.md`
  - `work-products/evidence/section22/blocked-wave2-todo.md`
  - `work-products/tests/section22-plan-contract.test.mjs`
  - `work-products/plan.md`
  - `work-products/todo.md`
- 写入：
  - `work-products/tests/section22-plan-contract.test.mjs`
  - `work-products/tests/section22-recovery-plan-contract.test.mjs`
  - `work-products/debug/execution-baselines/S22-R00/`
- 生成输出：无。
- 共享资源：`work-products/tests/` 与冻结 Section 22 证据（只读）。
- 验收：
  - 旧 Section 22 断言改读冻结 plan/todo，不删除、不放宽其七任务、fast 波次与状态合法性断言。
  - 新测试验证本候选五任务、线性依赖、serial 策略、完整任务字段、路径边界与只读保护输入；活动 todo 只验证合法状态、checkbox 镜像、至多一个 `in_progress` 和依赖前缀，不把“初始全 pending”固化为后续任务无法继续通过的断言。
  - 测试引用仅使用相对路径，不含机器绝对路径；候选 ID 不传播进任务断言。
- 聚焦验证：
  - `node --test work-products/tests/section22-plan-contract.test.mjs work-products/tests/section22-recovery-plan-contract.test.mjs`
- 波次与启动条件：Wave 0；仅在本候选明确批准、批准快照逐字节一致、全部恢复任务仍为 pending 且无残留 attempt 时启动。
- 编辑可并行：否。
- 聚焦验证可并行：否。
- 主代理集成责任：记录 R00 attempt 与完整基线，核对冻结来源、实际 diff、测试引用和终态 receipt 后解锁 R01。
- 失败/回滚：保留冻结证据；只回滚两个合同测试，不修改已采纳产品成果。

### S22-R01 — 清除活动测试中的退役名称字面量

- 目标：在保留兼容性与负向证明的同时，使两仓活动范围对两个退役配置名完整字面量零命中。
- 范围：只修改三个活动测试文件；不修改产品源、文档、版本、依赖、四个 Pages 保护文件或远程配置。
- 依赖：S22-R00。
- 执行基线根：`work-products/debug/execution-baselines/S22-R01/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
- 读取：
  - `_worker.js`
  - `README.md`
  - `work-products/SPEC.md` §22
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/tests/structured-logging.test.mjs`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - `../UXUV-Pages/app/`
  - `../UXUV-Pages/components/`
  - `../UXUV-Pages/lib/`
  - `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts`
  - `../UXUV-Pages/work-products/tests/app-flows.e2e.spec.ts`
  - `package.json`
  - `.git/` 所需元数据（只读，仅供 `git ls-files`、HEAD 与 diff/status 命令）
  - `../UXUV-Pages/package.json`
  - `../UXUV-Pages/playwright.config.ts`
  - `../UXUV-Pages/.git/` 所需元数据（只读，仅供 `git ls-files` 与 diff/status 命令）
  - `../UXUV-Pages/work-products/tests/iptv-retirement-contract.test.mjs`
  - `../UXUV-Pages/work-products/tests/pages-deployment.test.mjs`
  - `../UXUV-Pages/work-products/tests/repository-test-isolation.test.mjs`
- 写入：
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts`
  - `work-products/debug/execution-baselines/S22-R01/`
- 生成输出：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
- 共享资源：Worker Node test runner、Pages Playwright server 与全部声明的 Pages 生成路径；不得生成 `../UXUV-Pages/release/current/`。
- 验收：
  - Worker 兼容性测试使用运行时分段构造的旧键，继续证明遗留变量不参与配置、GraphQL 或缓存身份；源文件不保存完整退役名称。
  - Pages 负向测试使用分段构造的匹配器，继续证明 UI 只显示两个活动变量且无旧项目级文案；源文件不保存完整退役名称。
  - Worker 边界合同把活动 Worker 测试纳入名称扫描；显式两仓活动扫描对运行代码、README、Pages `app/components/lib` 与完整活动测试集合零命中。
  - 活动测试发现必须输出排序清单：Worker 以 `package.json` 的 `node --test work-products/tests` 目录发现规则为入口，扫描其命中的版本控制测试源；Pages 解析 `package.json` 的 Node test 参数，并按 `playwright.config.ts` 的 `testDir`、`testMatch` 与 `testIgnore` 发现 E2E。另以扫描全部版本控制 `work-products/tests/` 源文件（排除 `artifacts/`、`fixtures/`、`work/` 与明确 `testIgnore`）作为保守超集；任一集合命中即失败。
  - 四个 Pages 保护输入在 attempt 基线中另列为只读，并在任务前后逐字节一致。
- 聚焦验证：
  - `node --test work-products/tests/cloudflare-usage-contract.test.mjs work-products/tests/structured-logging.test.mjs work-products/tests/worker-only-boundary.test.mjs`
  - `node --check _worker.js`
  - 在 `../UXUV-Pages` 运行 `npx playwright test work-products/tests/usage-ui.e2e.spec.ts --config playwright.config.ts --workers=1`
  - 按验收定义发现并记录完整活动测试排序清单，对两仓活动路径执行完整退役名称扫描，零命中才通过。
  - 两仓分别运行 `git diff --check`。
- 波次与启动条件：Wave 1；S22-R00 completed 且 Wave 0 屏障已解锁。
- 编辑可并行：否。
- 聚焦验证可并行：否；本任务内部 Worker、Pages 与扫描命令串行。
- 主代理集成责任：记录三个手写目标、四个 Pages 生成路径和四个只读保护输入的 attempt 基线；核对实际 diff、RED/GREEN、发现清单、扫描与保护输入 receipt，原子更新 todo 后解锁 R02。
- 失败/回滚：保留失败截图/trace；只回滚三个活动测试，绝不覆盖四个 Pages 保护文件或已采纳产品源。

### S22-R02 — Worker 隔离门禁与证据

- 目标：在不读取 Pages 可变发布物的前提下验证已恢复的 Worker 候选。
- 范围：只运行 Worker 隔离门禁并写本地证据；不修改产品源、测试、Pages 生成物或远程状态。
- 依赖：S22-R01。
- 执行基线根：`work-products/debug/execution-baselines/S22-R02/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
- 读取：
  - `_worker.js`
  - `README.md`
  - `CHANGELOG.md`
  - `package.json`
  - `.git/` 所需元数据（只读，仅供 HEAD 与 diff/status 命令）
  - `scripts/check-worker-size.mjs`
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/tests/structured-logging.test.mjs`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - `work-products/tests/section22-plan-contract.test.mjs`
  - `work-products/tests/section22-recovery-plan-contract.test.mjs`
- 写入：
  - `work-products/evidence/section22/worker-validation.md`
  - `work-products/debug/execution-baselines/S22-R02/`
- 生成输出：无。
- 共享资源：Worker Node test runner；禁止读取或生成 `../UXUV-Pages/release/current/`。
- 验收：
  - 语法、账户级用量、结构化日志、认证/同源、Worker-only、旧/新计划合同、大小与活动配置名称门禁通过。
  - 高置信秘密与机器绝对路径扫描通过；命中必须人工分类，真实秘密立即停止。
  - 证据记录命令、退出码、时间、HEAD、工作树差异范围与局限，不声称生产验证。
- 聚焦验证：
  - `node --check _worker.js`
  - `node --test work-products/tests/cloudflare-usage-contract.test.mjs work-products/tests/structured-logging.test.mjs work-products/tests/worker-only-boundary.test.mjs work-products/tests/section22-plan-contract.test.mjs work-products/tests/section22-recovery-plan-contract.test.mjs`
  - `npm run check:size`
  - `git diff --check`
  - 对本计划列出的 Worker 活动文件执行秘密、机器绝对路径与退役名称扫描。
- 波次与启动条件：Wave 2；S22-R01 completed 且 Wave 1 屏障已解锁。
- 编辑可并行：否。
- 聚焦验证可并行：否。
- 主代理集成责任：记录 evidence 路径与 attempt 基线，核对命令退出码、扫描分类、实际 diff、receipt 和“不读取 Pages 发布物”边界，原子更新 todo 后解锁 R03。
- 失败/回滚：保留失败证据，不修复范围外问题；证据文件可重建，产品回滚交还对应实现任务。

### S22-R03 — Pages 全门禁与静态发布物重建

- 目标：验证 Pages 并重建可复制的本地静态发布候选。
- 范围：只验证 Pages、重建本地静态发布物并写 Pages 证据；不修改 Worker、依赖、四个保护文件或远程 Pages/Cloudflare 状态。
- 依赖：S22-R02。
- 执行基线根：`work-products/debug/execution-baselines/S22-R03/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
- 读取：
  - `../UXUV-Pages/` 工作树（不直接递归读取 `.git/`；写入/生成目标仍以下列清单为准）
  - `../UXUV-Pages/.git/` 所需元数据（只读，仅供测试内 `git ls-files` 与 diff/status 命令）
  - `_worker.js`
  - `../UXUV-Pages/package.json`
  - `../UXUV-Pages/work-products/tests/iptv-retirement-contract.test.mjs`
  - `../UXUV-Pages/work-products/tests/pages-deployment.test.mjs`
  - `../UXUV-Pages/work-products/tests/repository-test-isolation.test.mjs`
- 写入：
  - `../UXUV-Pages/work-products/evidence/section22/pages-validation.md`
  - `work-products/debug/execution-baselines/S22-R03/`
- 生成输出：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/`（完整根，包括 `current/`、`.tmp-current-*` 与 `.previous-current-*` 命名空间）
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/`
  - `../UXUV-Pages/work-products/tests/work/pwa-release/`
  - `../UXUV-Pages/work-products/tests/work/release-manifest/`
- 共享资源：Pages npm/Next/Playwright、release builder、三个 Node 测试 work 子目录与全部 Pages 生成目录；本任务独占。
- 验收：
  - `npm test`、lint、TypeScript、production build、完整 E2E、release build 与 diff check 全通过。
  - `release/current` manifest 声明 Pages `0.3.0`、API `2` 与现有 Worker range；其资产路径安全、MIME、排序清单与实际文件集合逐项一致。
  - `next-env.d.ts` 等非范围文件不漂移；生成物不含 token、机器绝对路径或退役项目级 UI 文案。
  - 四个 Pages 保护输入在 attempt 基线中另列为只读，任务前后逐字节一致；证据不把其改动归因于本计划。
  - 成功终态的 `release/` 只保留预期发布结构，不残留 `.tmp-current-*` 或 `.previous-current-*`；失败时保留并报告异常 staging/backup 状态，不静默清理或冒充成功。
  - 三个 Node 测试 work 子目录启动前必须为 missing；任一既有内容先阻塞并人工分类，成功终态仍必须为 missing，失败残留只报告、不静默删除。
- 聚焦验证：
  - 在 `../UXUV-Pages` 严格串行运行 `npm run lint`、`npx tsc --noEmit`、`npm run test:e2e`、最终一次 `npm run build`、`npm run release:build`、最终一次 `npm test`、`git diff --check`；最终 Node 合同必须读取刚生成的 `out/` 与 `release/current/`。
- 波次与启动条件：Wave 3；S22-R02 completed 且 Wave 2 屏障已解锁。
- 编辑可并行：否。
- 聚焦验证可并行：否；全部 Pages 命令串行。
- 主代理集成责任：记录 evidence、完整 `release/` 根、三个 Node 测试 work 子目录、其余生成路径、四个只读保护输入与 attempt 基线；核对实际 diff、release manifest、staging/backup 与 test-work 残留、非范围漂移和 receipt，原子更新 todo 后解锁 R04。
- 失败/回滚：保留失败产物与异常 staging/backup 状态供诊断；恢复/重建 `release/current` 前保留原 manifest 身份，不部署、不改依赖或保护文件。

### S22-R04 — 两仓集成、完整回归与本地发布门禁

- 目标：在生成物稳定后完成跨仓契约、完整套件、身份与回滚验证。
- 范围：只执行两仓本地集成门禁、重建验证所需 Pages 生成物并写最终证据；不修改产品源、测试、依赖、版本或远程状态。
- 依赖：S22-R03。
- 执行基线根：`work-products/debug/execution-baselines/S22-R04/`；主代理为本次 attempt 创建 create-new/no-replace 子目录。
- 读取：
  - `work-products/SPEC.md`
  - `work-products/plan.md`
  - `work-products/todo.md`
  - Worker 本次差异、测试、冻结 Section 22 历史与 `work-products/evidence/section22/`
  - `.git/` 所需元数据（只读，仅供 HEAD 与 diff/status 命令）
  - `../UXUV-Pages/` 工作树（不直接递归读取 `.git/`；写入/生成目标仍以下列清单为准）
  - `../UXUV-Pages/.git/` 所需元数据（只读，仅供测试内 `git ls-files`、HEAD 与 diff/status 命令）
  - `../UXUV-Pages/release/current/` 与 manifest
  - `../UXUV-Pages/package.json`
  - `../UXUV-Pages/work-products/tests/iptv-retirement-contract.test.mjs`
  - `../UXUV-Pages/work-products/tests/pages-deployment.test.mjs`
  - `../UXUV-Pages/work-products/tests/repository-test-isolation.test.mjs`
- 写入：
  - `work-products/evidence/section22/pair-validation.md`
  - `work-products/evidence/section22/receipts/S22-R04.json`
  - `work-products/debug/execution-baselines/S22-R04/`
- 生成输出：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/`（完整根，包括 `current/`、`.tmp-current-*` 与 `.previous-current-*` 命名空间）
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/`
  - `../UXUV-Pages/work-products/tests/work/pwa-release/`
  - `../UXUV-Pages/work-products/tests/work/release-manifest/`
- 共享资源：两仓完整测试套件、Pages 发布物、三个 Node 测试 work 子目录、最终 evidence 与 todo；主代理独占。
- 验收：
  - Worker `npm test`、语法、大小、diff check 与 Pages 全套门禁复核通过。
  - 跨仓证据证明账户级响应、四指标、版本/API/range、release manifest、活动名称零命中与回滚入口一致；活动测试集合使用 R01 的 package/Playwright 发现算法重新生成排序清单，不依赖手写文件子集。
  - 记录两仓语义基线、工作树状态、关键文件原始字节身份、manifest 资产清单与实际文件集合的一致性、验证时间与逐项退出码；内部逐字节复核结果不作为人类批准身份。
  - 四个 Pages 保护输入终态逐字节一致且归因保持分离。
  - 三个 Node 测试 work 子目录启动前和成功终态均为 missing；既有内容阻塞，失败残留仅报告。
  - 最终状态仅可为 `LOCAL CANDIDATE / RELEASE HOLD`；commit、push、部署和真实 Cloudflare 查询仍未授权、未验证。
- 聚焦验证：
  - 在 Worker 串行运行 `node --check _worker.js`、`npm test`、`npm run check:size`、`git diff --check`。
  - 在 Pages 严格串行运行 `npm run lint`、`npx tsc --noEmit`、`npm run test:e2e`、最终一次 `npm run build`、`npm run release:build`、最终一次 `npm test`、`git diff --check`；最终 Node 合同必须读取刚生成的 `out/` 与 `release/current/`。
  - 重新发现完整活动测试集合，复跑两仓活动名称/秘密/机器路径扫描，逐字节复核规范、计划、关键源和四个保护输入，并核对 release manifest 的安全路径、MIME、排序资产清单与实际文件集合逐项一致。
- 波次与启动条件：Wave 4；S22-R03 completed 且 Wave 3 屏障已解锁。
- 编辑可并行：否。
- 聚焦验证可并行：否；两仓命令与生成目录串行。
- 主代理集成责任：记录包含完整 `release/` 根、`tsconfig.tsbuildinfo` 与三个 Node 测试 work 子目录的 attempt 基线，亲自或单 worker 执行并对账两仓差异、生成物、保护输入、活动测试发现清单、回滚入口、receipt 与全部命令；只有全绿才由主代理原子更新终态 todo。
- 失败/回滚：任一门禁失败即 `RELEASE HOLD`；保留失败证据与异常 release staging/backup 状态，不自动提交、推送、部署或修改远程配置。实际清理或回滚仍需另行授权。

## 5. 路径、基线、所有权与失败规则

- 除显式以 `../UXUV-Pages/` 开头的路径外，所有仓库相对路径都以 Worker 仓库根目录解析。
- 每个任务只能使用其合同声明的 `work-products/debug/execution-baselines/S22-Rxx/` 根；主代理为每次 attempt 创建唯一 create-new/no-replace 子目录，worker 只读。
- 启动任务前，主代理原子记录 attempt ID、owner、排序后的规范写入/生成路径、每条路径的 `present-file | present-directory | missing`、snapshot root 与 `no_replace: true`。目录基线枚举完整后代并保存每个普通文件原始字节。
- R01 与 R03/R04 必须把四个 Pages 并发既有文件另列为 `protected_inputs`，保存原始字节并在任务前后比较；它们不是写集，任何漂移都阻塞且不得覆盖。
- R01/R03/R04 将 `../UXUV-Pages/tsconfig.tsbuildinfo` 作为生成目标纳入基线；R03/R04 冻结并拥有整个 `../UXUV-Pages/release/` 生成根，而不是只记录 `release/current/`。
- R03/R04 将 Pages 主测试实际写入的 `work-products/tests/work/kvideo-webview-compatibility/`、`pwa-release/` 与 `release-manifest/` 分别纳入生成基线；任何启动前既有内容都阻塞，避免测试的递归删除覆盖未知数据。
- R01—R04 仅按各任务读取清单访问所需 `.git/` 元数据；允许的 Git 操作限于只读发现、HEAD、status 与 diff，禁止 add、commit、checkout、reset、clean、stash、worktree 变更或任何 Git 元数据写入。
- 第一次写入前重新解析 Windows 大小写别名、祖先/后代、链接/realpath、生成输出别名、缓存与临时目录，并与 attempt 基线比较；任何存在性、类型、链接、字节、后代、owner 或路径身份漂移都阻塞。
- 每次只允许一个任务 `in_progress`。blocked attempt 不重写；恢复使用新任务 ID 和新 attempt。任何范围扩张、门禁失败或外部所有权漂移都停止后续任务。
- 主代理的 todo 状态写入是每个 attempt 事务的编排组成部分，但不属于 worker target set；worker prompt 必须继续明确禁止写 todo。
- 所有过程、证据和测试产物位于各自仓库的 `work-products/`；测试引用仓库文件使用相对路径，不持久化机器绝对路径。
- 不安装依赖；使用两仓现有 Node/npm/Playwright 环境。环境缺失或损坏时停止，不使用全局替代。

## 6. 计划阶段已知 RED 与批准语义

- 活动 `work-products/tests/section22-plan-contract.test.mjs` 仍绑定旧七任务 plan/todo；本候选替换活动 plan/todo 后，在 S22-R00 前预期失败。R00 必须先把它迁移到冻结的 blocked 历史，再新增恢复计划合同，不在规划阶段修改测试伪造绿色。
- 候选批准基线：`work-products/debug/approval-baselines/s22-account-usage-recovery-20260821-01/plan.md`；必须与当前候选 plan 原始字节完全一致且 create-new/no-replace。
- 用户在看到本候选前说出的“批准构建”确认了继续规划意图，但不能预先批准尚未生成的候选，也不调用 `@uxu-code:build`。
- 只有用户看到本候选后作出的清晰整句批准，才能由主代理逐字节核对批准快照并在 todo 记录批准 receipt。
- 计划批准本身不授权 build auto、commit、push、部署、网络、真实 Cloudflare/D1 操作或任何远程变更。
