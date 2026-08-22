# 执行清单：SPEC 第 22 节 Cloudflare 账户级用量收敛

> 状态：PARTIAL / WAVE 2 BLOCKED
> 候选 ID：`s22-account-usage-20260821-04`
> 执行策略：`fast`
> 安全并发上限：2
> 当前授权：本地 `@uxu-code:build auto` 已授权；未授权 commit、push、部署或远程 Cloudflare/D1 变更

## 批准基线

- 候选计划：`work-products/plan.md`
- create-new/no-replace 基线：`work-products/debug/approval-baselines/s22-account-usage-20260821-04/plan.md`
- 字节比对：`IDENTICAL`
- 批准状态：`APPROVED`
- 批准记录：用户于 2026-08-21 明确批准当前候选，并在同一消息中单独调用 `@uxu-code:build auto` 授权本地连续实施。
- 候选 `s22-account-usage-20260821-03`：`ABANDONED_PRE_APPROVAL`（任务断言仍传播顶层候选身份；快照只读保留，未提交批准）。
- 候选 `s22-account-usage-20260821-02`：`SUPERSEDED_AFTER_ZERO_WORKER_PREFLIGHT`；原批准记录与快照只读保留，未启动实现、未产生执行 attempt。
- 候选 `s22-account-usage-20260821-01`：`ABANDONED_PRE_APPROVAL`（格式校验失败，未覆盖其基线）。

## 批准时追加的表达约束

- 不使用内部完整性串表达、命名或要求批准计划及文件。
- 对话、计划、todo 与交付摘要统一使用候选 ID、相对路径、版本、日期或语义名称。
- 已批准计划及基线因不可变性不回写；其中既有哈希内容不得复制到后续执行记录或用户回复。
- 产品格式内部既有完整性字段不作为计划或文件的人类身份，也不作为批准口令。

## 状态账本

- `work-products/todo.md` 仅由主代理写入；合法状态转换为 `pending → in_progress → completed | blocked`。
- 下列 checkbox 是显式状态的原子派生镜像：只有 `completed` 可标记为 `[x]`，其余状态一律为 `[ ]`。
- S22-T00、S22-T01、S22-T02 均已有完成的 attempt、执行 snapshot 与终态 receipt；S22-T03 已有 blocked 终态 receipt；其余 pending 任务均没有 attempt、owner、执行 snapshot 或 receipt。

## 当前执行屏障

- Wave 0：S22-T00 completed，合同聚焦验证 30/30 通过，实际 diff 已由主代理对账。
- Wave 1 所有权处置：用户于 2026-08-21 明确说明 Pages 的 `package.json`、`work-products/tests/iptv-retirement-contract.test.mjs`、`work-products/tests/pages-deployment.test.mjs` 与新文件 `work-products/tests/repository-test-isolation.test.mjs` 来自另一并发任务，并要求纳入基线。
- 保护语义：上述四个路径作为 `user-confirmed-concurrent-prestate` 只读保护输入进入 S22-T02 attempt；不属于 S22-T02 写集，worker 不得修改。建立基线前连续两次原始字节与路径状态校验一致。
- Wave 1：S22-T01 主代理复验 8/8 与语法通过；S22-T02 主代理复验 Playwright 7/7；两项实际 diff 均与写集一致，四个只读保护输入终态 4/4 原始字节一致。Wave 1 completed，已解锁 S22-T03。
- 外部并发协调：负责四个保护路径的 GitHub Pages CI 任务已在 T02 终态后恢复 Pages 全门禁；S22-T03 仅写 Worker 文档/边界测试，不与其 Pages 写集冲突。
- Wave 2：S22-T03 的三文件聚焦验证为 9/9，diff check 通过，但活动名称扫描仍在 T01/T02 的活动测试中发现两个旧配置名。批准计划要求活动测试零命中，而 T03 无权修改 T01/T02 写集，因此 S22-T03 终态为 `blocked`。
- 安全处置：保留 S22-T03 已完成的 README、CHANGELOG 与边界合同改动及 RED/GREEN 证据；未创建 S22-T04/S22-T05 基线，未启动 Wave 3 worker，S22-T04—T06 保持锁定。恢复执行前需要修复不可变计划中的写集/验收冲突并取得相应批准。

| 任务 | 状态 | 波次 | 依赖 | 并行 |
|---|---|---:|---|---|
| S22-T00 | completed | 0 | 无 | 否 |
| S22-T01 | completed | 1 | S22-T00 | 与 T02 |
| S22-T02 | completed | 1 | S22-T00 | 与 T01 |
| S22-T03 | blocked | 2 | S22-T01、S22-T02 | 否 |
| S22-T04 | pending | 3 | S22-T03 | 与 T05 |
| S22-T05 | pending | 3 | S22-T03 | 与 T04 |
| S22-T06 | pending | 4 | S22-T04、S22-T05 | 否 |

## 任务清单

- [x] S22-T00 冻结第 21 节历史计划并切换活动计划契约
  - 状态：completed
  - attempt：`run-20260821-s22-t00-01`
  - owner：`native-worker:s22_t00`
  - snapshot root：`work-products/debug/execution-baselines/S22-T00/run-20260821-s22-t00-01`
  - no_replace：`true`
  - 写集基线（规范路径排序）：
    - `worker::work-products/evidence/section21/final-plan-identity.json`：`missing`
    - `worker::work-products/evidence/section21/final-plan.md`：`missing`
    - `worker::work-products/evidence/section21/final-todo.md`：`missing`
    - `worker::work-products/tests/section21-plan-contract.test.mjs`：`present-file`
    - `worker::work-products/tests/section22-plan-contract.test.mjs`：`missing`
  - 基线清单：`work-products/debug/execution-baselines/S22-T00/run-20260821-s22-t00-01/manifest.json`
  - 验证：`node --test work-products/tests/section21-plan-contract.test.mjs work-products/tests/section22-plan-contract.test.mjs`
  - terminal receipt：`completed`
    - 实际变化：`worker::work-products/evidence/section21/final-plan-identity.json`、`worker::work-products/evidence/section21/final-plan.md`、`worker::work-products/evidence/section21/final-todo.md`、`worker::work-products/tests/section21-plan-contract.test.mjs`、`worker::work-products/tests/section22-plan-contract.test.mjs`
    - RED：旧 Section 21 合同 `3 pass / 23 fail`，退出码 1，原因是仍读取活动 Section 22 plan/todo。
    - GREEN：双文件聚焦验证 `30 pass / 0 fail`，退出码 0；冻结 plan/todo 与 Git HEAD 原始字节一致。
    - scope exceptions：无。
  - 备注：开始前必须完成本候选的明确批准。

- [x] S22-T01 Worker 账户级用量 API
  - 状态：completed
  - attempt：`run-20260821-s22-t01-01`
  - owner：`native-worker:s22_t01`
  - snapshot root：`work-products/debug/execution-baselines/S22-T01/run-20260821-s22-t01-01`
  - no_replace：`true`
  - 写集基线（规范路径排序）：
    - `worker::_worker.js`：`present-file`
    - `worker::work-products/tests/cloudflare-usage-contract.test.mjs`：`present-file`
  - 基线清单：`work-products/debug/execution-baselines/S22-T01/run-20260821-s22-t01-01/manifest.json`
  - 验证：用量契约、结构化日志与语法聚焦门禁。
  - terminal receipt：`completed`
    - 实际变化：`worker::_worker.js`、`worker::work-products/tests/cloudflare-usage-contract.test.mjs`。
    - RED：用量合同 `0 pass / 6 fail`，退出码 1；证明旧配置依赖、项目级字段、旧缓存身份与不完整聚合仍被接受。
    - GREEN：用量合同与结构化日志 `8 pass / 0 fail`，退出码 0；`node --check _worker.js` 退出码 0；主代理复跑结果一致。
    - scope exceptions：无。

- [x] S22-T02 Pages 账户级消费者与界面
  - 状态：completed
  - attempt：`run-20260821-s22-t02-01`
  - owner：`native-worker:s22_t02`
  - snapshot root：`work-products/debug/execution-baselines/S22-T02/run-20260821-s22-t02-01`
  - no_replace：`true`
  - 写集与生成集基线（规范路径排序）：
    - `pages::.next`：`present-directory`
    - `pages::components/UsageAlertProvider.tsx`：`present-file`
    - `pages::components/settings/CloudflareUsageSettings.tsx`：`present-file`
    - `pages::lib/hooks/useCloudflareUsage.ts`：`present-file`
    - `pages::out`：`present-directory`
    - `pages::work-products/tests/app-flows.e2e.spec.ts`：`present-file`
    - `pages::work-products/tests/artifacts/playwright`：`present-directory`
    - `pages::work-products/tests/usage-ui.e2e.spec.ts`：`present-file`
  - 只读保护输入（用户确认的并发既有状态，不授权写入）：
    - `pages::package.json`：`present-file`
    - `pages::work-products/tests/iptv-retirement-contract.test.mjs`：`present-file`
    - `pages::work-products/tests/pages-deployment.test.mjs`：`present-file`
    - `pages::work-products/tests/repository-test-isolation.test.mjs`：`present-file`
  - 基线清单：`work-products/debug/execution-baselines/S22-T02/run-20260821-s22-t02-01/manifest.json`
  - 验证：usage UI Playwright 单文件、三语言、四断点、axe 与边界态。
  - terminal receipt：`completed`
    - 实际变化：五个手写目标及 `.next`、`out`、`work-products/tests/artifacts/playwright` 三个生成目录。
    - RED：聚焦 Playwright `4 pass / 3 fail`，退出码 1；证明旧 parser 拒绝精确账户级响应。
    - GREEN：聚焦 Playwright `7 pass / 0 fail`，退出码 0；主代理串行复跑结果一致。
    - 只读保护输入：终态 `4/4 IDENTICAL`；未被 S22-T02 写入。
    - scope exceptions：无。

- [ ] S22-T03 活动配置文档与边界契约
  - 状态：blocked
  - attempt：`run-20260821-s22-t03-01`
  - owner：`native-worker:s22_t03`
  - snapshot root：`work-products/debug/execution-baselines/S22-T03/run-20260821-s22-t03-01`
  - no_replace：`true`
  - 写集基线（规范路径排序）：
    - `worker::CHANGELOG.md`：`present-file`
    - `worker::README.md`：`present-file`
    - `worker::work-products/tests/worker-only-boundary.test.mjs`：`present-file`
  - 基线清单：`work-products/debug/execution-baselines/S22-T03/run-20260821-s22-t03-01/manifest.json`
  - 验证：Worker-only 边界测试与 diff check。
  - terminal receipt：`blocked`
    - 实际变化：`worker::CHANGELOG.md`、`worker::README.md`、`worker::work-products/tests/worker-only-boundary.test.mjs`；均在授权写集内。
    - RED：Worker-only 边界合同 `8 pass / 1 fail`，退出码 1；证明 README 仍把旧 Worker/D1 标识列为活动配置。
    - GREEN：Worker-only 边界合同 `9 pass / 0 fail`，退出码 0；`git diff --check` 退出码 0；主代理复跑结果一致。
    - 活动名称扫描：运行代码、README 与 Pages `app/components/lib` 零命中；`worker::work-products/tests/cloudflare-usage-contract.test.mjs` 命中 5 行，`pages::work-products/tests/usage-ui.e2e.spec.ts` 命中 1 行。
    - blocker：批准验收要求活动测试不出现 `CF_WORKER_SCRIPT_NAME` / `CF_D1_DATABASE_ID`，但命中文件属于已完成的 T01/T02 写集且不在 T03 写权限内；不得用 scope exception 忽略，也不得静默扩写。
    - scope exceptions：无。
    - remaining work：修订任务写集/依赖与验证合同后，移除活动测试中的完整旧名称并重新执行名称扫描及对应聚焦门禁。

- [ ] S22-T04 Worker 隔离门禁与证据
  - 状态：pending
  - 验证：不读取 Pages 可变发布物的 Worker 聚焦门禁、大小与扫描。

- [ ] S22-T05 Pages 全门禁与静态发布物重建
  - 状态：pending
  - 验证：test、lint、tsc、build、E2E、release build、diff check。

- [ ] S22-T06 两仓集成、完整回归与本地发布门禁
  - 状态：pending
  - 验证：两仓完整门禁、跨仓契约、原始字节/manifest 完整性、回滚与证据审计。
  - 终态上限：`LOCAL CANDIDATE / RELEASE HOLD`。

## 已知迁移 RED

- 当前 `work-products/tests/section21-plan-contract.test.mjs` 仍绑定已完成的第 21 节活动 plan/todo；在获批后由 S22-T00 首先迁移到冻结历史副本。
- 在 S22-T00 完成前，不把该预期失败解释为产品回归，也不在计划阶段修改测试。
