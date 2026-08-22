# 执行清单：SPEC 第 22 节最终终审恢复

> 状态：APPROVED / BLOCKED / RELEASE HOLD
> 候选 ID：`s22-account-usage-final-gate-audit-recovery-20260822-11`
> 执行策略：`serial`
> 安全并发上限：1
> 当前授权：用户已批准当前候选并授权 `@uxu-code:build auto`；R22 仅执行本地终审恢复，不在本任务内执行 commit、push、部署、联网或远程变更

## 历史与规划依据

- S22-R21 完整产品门禁全部 GREEN，但临时终审 wrapper 非零退出；attempt 已 blocked、consumed、只读冻结。
- `r21-frozen-integrity.json` 绑定 R21 plan/todo/request/manifest/evidence/receipt 的原始字节。
- 终审 wrapper 已通过独立 RED→GREEN 修复与 3/3 回归；R22 只补终审、卫生、diff、rollback 与证据收口。
- 本候选不修改产品代码、依赖、版本、Pages release 或七个保护输入。

## 批准基线

- 候选计划：`work-products/plan.md`
- create-new/no-replace 基线：`work-products/debug/approval-baselines/s22-account-usage-final-gate-audit-recovery-20260822-11/plan.md`
- 字节比对：`IDENTICAL`
- 批准状态：`APPROVED`
- 批准记录：`USER_EXPLICIT / 2026-08-22 / 批准当前计划并授权 @uxu-code:build auto`
- 批准范围：批准只记录 APPROVED；之后仍需用户另行调用 `@uxu-code:build auto`。不授权 commit、push、部署、联网或远程变更。

## 状态账本

- `work-products/todo.md` 仅由主代理写入；合法转换为 `pending → in_progress → completed | blocked`。
- checkbox 是显式状态的原子派生镜像：只有 `completed` 为 `[x]`。
- todo 仅作为 Worker repository 的精确 exclusion。

| 任务 | 状态 | 波次 | 依赖 | 并行 |
|---|---|---:|---|---|
| S22-R22 | blocked | 0 | R21 frozen-integrity | 否 |

## 任务清单

- [ ] S22-R22 冻结产品现场的最终终审恢复
  - 状态：blocked
  - 验证：R21 frozen-integrity、全新 v2 baseline、经测试终审、卫生、两仓 diff、rollback、terminal、evidence/receipt 审计。
  - 终态上限：`LOCAL CANDIDATE / RELEASE HOLD`。

## 下一道门

- R22 的产品继承门禁、终审、卫生、diff、rollback、evidence 与 terminal 全绿；receipt 文件实际字节也正确，但首次宿主输出回读包装器非零退出。
- R22 request、manifest、evidence、receipt 与 task temp 永久只读；不得修正并重跑同一 attempt。
- 后继候选必须使用新 task/attempt，并在执行前加入受测试的 byte-safe receipt audit；批准后仍需独立调用 `@uxu-code:build auto`。
