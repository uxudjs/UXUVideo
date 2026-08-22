# 执行清单：SPEC 第 22 节账户级用量第二恢复

> 状态：BLOCKED / RELEASE HOLD
> 候选 ID：`s22-account-usage-baseline-recovery-20260821-01`
> 执行策略：`serial`
> 安全并发上限：1
> 当前授权：本次本地 `build auto` 已在 R10 输入基线复验失败后停止；未授权 commit、push、部署、联网或远程 Cloudflare/D1 变更

## 规划依据与采纳状态

- 已批准规范：`work-products/SPEC.md` 第 22 节。
- 第一恢复计划冻结副本：`work-products/evidence/section22/blocked-r01-plan.md`。
- 第一恢复 blocked todo 冻结副本：`work-products/evidence/section22/blocked-r01-todo.md`。
- 采纳既有 Section 22 产品/UI/文档成果，以及第一恢复计划 S22-R00 completed 合同迁移；不重跑已完成任务。
- S22-R01 失败 attempt 保持只读，worker 从未启动；本候选使用全新 R09—R14 和全新基线根。
- 四个用户确认的 Pages 并发文件继续作为只读保护输入。

## 批准基线

- 候选计划：`work-products/plan.md`
- create-new/no-replace 基线：`work-products/debug/approval-baselines/s22-account-usage-baseline-recovery-20260821-01/plan.md`
- 字节比对：`IDENTICAL`
- 批准状态：`APPROVED`
- 批准 receipt：2026-08-21，用户在看到冻结候选后明确回复“批准计划”，并在同一请求中调用 `@uxu-code:build auto`。
- 批准范围：仅连续执行本计划的本地 R09—R14；不授权 commit、push、部署、联网或远程 Cloudflare/D1 操作。

## 状态账本

- `work-products/todo.md` 仅由主代理写入；合法状态转换为 `pending → in_progress → completed | blocked`。
- checkbox 是显式状态的原子派生镜像：只有 `completed` 可标记 `[x]`，其余状态均为 `[ ]`。
- 六个新恢复任务按线性依赖推进；当前至多一个 `in_progress`，每个任务的 attempt、owner、execution snapshot 与 terminal receipt 随状态转换记录。

| 任务 | 状态 | 波次 | 依赖 | 并行 |
|---|---|---:|---|---|
| S22-R09 | completed | 0 | 无 | 否 |
| S22-R10 | blocked | 1 | S22-R09 | 否 |
| S22-R11 | pending | 2 | S22-R10 | 否 |
| S22-R12 | pending | 3 | S22-R11 | 否 |
| S22-R13 | pending | 4 | S22-R12 | 否 |
| S22-R14 | pending | 5 | S22-R13 | 否 |

## 任务清单

- [x] S22-R09 Bootstrap 可复跑 execution-baseline CLI
  - 状态：completed
  - attempt：`run-20260821-s22-r09-01`
  - owner：`native-worker:s22_r09`
  - execution snapshot：`work-products/debug/execution-baselines/S22-R09/run-20260821-s22-r09-01/manifest.json`（`s22-bootstrap-baseline/v1`，create-new/no-replace，逐字段回读通过）
  - terminal receipt：`work-products/evidence/section22/receipts/S22-R09.json`
  - 验证：固定 missing-target bootstrap、CLI/test 安全 RED→GREEN、schema/no-replace/目录/输入/保护/namespace 自审计与 test-work 终态。

- [ ] S22-R10 冻结第一恢复合同并切换第二恢复契约
  - 状态：blocked
  - attempt：`run-20260821-s22-r10-01`
  - owner：`native-worker:s22_r10`
  - execution snapshot：`work-products/debug/execution-baselines/S22-R10/run-20260821-s22-r10-01/manifest.json`（`s22-execution-baseline/v1`，prewrite 自审计通过）
  - terminal receipt：`work-products/evidence/section22/receipts/S22-R10.json`
  - blocker：正式 baseline request 未把活动 `work-products/todo.md` 排除出仓库 inventory；合法的 `pending → in_progress` 更新后，`verify --phase inputs` 以 `repository identity drift` 失败。worker 未启动，两个手写目标未改变。
  - 恢复边界：保留本 attempt 不变；按批准计划失败规则，需使用新任务 ID 与新 attempt 的恢复候选，不能覆写或复用本 attempt。
  - 验证：baseline CLI、三代 Section 22 计划合同、R09—R14 线性合同、旧失败 attempt 只读隔离与基线根非递归编排例外。

- [ ] S22-R11 清除活动测试退役名称并建立 Pages 离线边界
  - 状态：pending
  - 验证：完整 input/target baseline、名称 RED→GREEN、loopback reject proxy 安全 RED→GREEN、本地 CLI Pages usage Playwright 与保护输入复核。

- [ ] S22-R12 Worker 隔离门禁与证据
  - 状态：pending
  - 验证：输入身份逐命令复核、Worker 语法/聚焦测试/大小/diff、任务 temp、秘密/机器路径/退役名称扫描。

- [ ] S22-R13 Pages 全门禁与静态发布物重建
  - 状态：pending
  - 验证：输入身份逐命令复核、本地 CLI、禁遥测/离线 E2E、视觉草稿/批准候选隔离、任务 temp、lint/tsc/build/release/final test、manifest 与保护输入。

- [ ] S22-R14 两仓集成、完整回归与本地发布门禁
  - 状态：pending
  - 验证：两仓完整离线门禁、逐命令输入身份、任务 temp、rollback drill namespace、跨仓契约、原始字节、manifest/实际集合、保护输入与证据审计。
  - 终态上限：`LOCAL CANDIDATE / RELEASE HOLD`。

## 已知计划迁移 RED

- 当前 `work-products/tests/section22-recovery-plan-contract.test.mjs` 仍断言活动 R00—R04 plan/todo；替换为本候选后预期失败。
- S22-R10 将把该合同路由到冻结 blocked-r01 历史，并新增本候选合同；规划阶段不修改测试伪造绿色。
- 当前活动退役名称扫描仍有 Worker 5 行与 Pages 1 行命中，由 S22-R11 执行 RED→GREEN。
