# 执行清单：第 22 节 review 缺陷修复

> 状态：LOCAL CANDIDATE / RELEASE HOLD
> 候选 ID：`s22-review-remediation-20260822-13`
> 执行策略：`serial`
> 安全并发上限：1
> 当前授权：用户持续批准 Section 22 当前计划并显式调用 `@uxu-code:build auto`；远程发布仍必须先通过 ship GO

## 冻结历史

- S22-R23 已完成并保留；其 receipt/evidence 只证明 review 前候选，不得覆盖或复用。
- 三路 review 均为只读；发现已逐项对账到新计划。
- R21—R23 的本地大体积 snapshots 保留，不清理，也不隐式加入发布提交。

## 批准基线

- 候选计划：`work-products/plan.md`
- 批准快照：`work-products/debug/approval-baselines/s22-review-remediation-20260822-13/plan.md`
- 批准状态：`AUTO-APPROVED`
- 批准依据：用户持续目标 + 当前消息中的 `@uxu-code:build auto`

## 状态账本

| 任务 | 状态 | 波次 | 依赖 | 并行 |
|---|---|---:|---|---|
| S22-R24 | completed | 0 | R23 + review findings | 否 |
| S22-R25 | completed | 1 | R24 | 否 |

## 任务清单

- [x] S22-R24 review 缺陷 RED 与最小修复
  - 状态：completed
  - 验证：Worker timeout/sampling/聚合边界；Pages parser/cooldown/权限；offline/checkout；receipt auditor。

- [x] S22-R25 当前候选回滚、完整门与新收口
  - 状态：completed
  - 验证：新 rollback、两仓完整门、成对 final-gate、新 evidence/receipt 全绿；进入独立 ship 门禁。

## 当前边界

- 当前为 `LOCAL CANDIDATE / RELEASE HOLD`；不 commit、push 或部署。
- R25 已 GREEN；只有 ship GO 后才执行已授权的远程发布和生产烟测。
