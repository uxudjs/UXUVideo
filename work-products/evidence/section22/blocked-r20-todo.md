# 执行清单：SPEC 第 22 节最终本地门禁完成

> 状态：APPROVED / BLOCKED / RELEASE HOLD
> 候选 ID：`s22-account-usage-final-gate-completion-20260822-07`
> 执行策略：`serial`
> 安全并发上限：1
> 当前授权：本候选已批准并执行，但在 baseline create 前置合同处 BLOCKED；不授权 commit、push、部署、联网或远程变更

## 历史与规划依据

- S22-R15—R17 completed；S22-R18、S22-R19 blocked、consumed、只读。
- R19 blocked todo 的有效冻结副本：`work-products/evidence/section22/blocked-r19-todo-v2.md`。
- 首个 `blocked-r19-todo.md` 多一终止换行，保留为无批准效力的失败副本。
- `work-products/debug/s22-r19-in-progress-mirror-contract.md` 证明流程合同修复：聚焦 6/6、Section 22 计划合同 25/25、Worker 完整测试 222/222。
- 候选 `s22-account-usage-final-gate-completion-20260822-06` 未批准、未创建 attempt；因旧 R19 合同仍读取活动 plan/todo 而被替代，其 snapshot 只读保留。
- 本候选只规划一个全新 S22-R20 完整本地门禁，不修改产品代码、依赖、版本或 Pages 保护输入。

## 批准基线

- 候选计划：`work-products/plan.md`
- create-new/no-replace 基线：`work-products/debug/approval-baselines/s22-account-usage-final-gate-completion-20260822-07/plan.md`
- 字节比对：`IDENTICAL`
- 批准状态：`APPROVED`
- 批准记录：`USER_EXPLICIT / 2026-08-22 / 批准计划；@uxu-code:build auto`
- 批准范围：已授权执行当前候选的完整本地门禁；不授权 commit、push、部署、联网或远程变更。

## 状态账本

- `work-products/todo.md` 仅由主代理写入；合法转换为 `pending → in_progress → completed | blocked`。
- checkbox 是显式状态的原子派生镜像：只有 `completed` 为 `[x]`。
- todo 仅作为 Worker repository 的精确 exclusion。

| 任务 | 状态 | 波次 | 依赖 | 并行 |
|---|---|---:|---|---|
| S22-R20 | blocked | 0 | 无 | 否 |

## 任务清单

- [ ] S22-R20 两仓最终本地门禁完成
  - 状态：blocked
  - attempt：`run-20260822-s22-r20-01`（consumed）
  - request：`work-products/debug/execution-baselines/S22-R20/request-run-20260822-s22-r20-01.json`
  - evidence：`work-products/evidence/section22/final-gate-completion-validation.md`
  - receipt：`work-products/evidence/section22/receipts/S22-R20.json`
  - blocker：批准蓝图将 `work-products/debug/s22-r19-in-progress-mirror-contract.md` 同时放入 `governance` 与 `prior-validation-evidence`；展平后的 v2 request 被 baseline create 以 duplicate input fail-closed 拒绝。attempt/staging 未创建，worker 与产品门禁未启动。
  - 恢复边界：保留 request、evidence、receipt 与空 task temp；不得修改或复用本 task/attempt，须用新候选、task ID 与 attempt 从头执行。
  - 验证：新 v2 attempt、Worker/Pages 完整离线门禁、两仓身份与 manifest-actual 扫描、rollback、evidence/receipt 审计与 terminal verify。
  - 终态上限：`LOCAL CANDIDATE / RELEASE HOLD`。

## 下一道门

- 本候选已 fail-closed 终止，R20 attempt 永久 consumed。
- 先增加跨 input-set 唯一性回归，并修正下一候选蓝图。
- 新候选必须重新获得明确批准后才能执行。
