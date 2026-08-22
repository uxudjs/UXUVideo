# 执行清单：SPEC 第 22 节最终本地门禁恢复完成

> 状态：APPROVED / BLOCKED / RELEASE HOLD
> 候选 ID：`s22-account-usage-final-gate-completion-recovery-20260822-10`
> 执行策略：`serial`
> 安全并发上限：1
> 当前授权：用户已批准候选并调用 `@uxu-code:build auto`；仅授权本地 S22-R21，不授权 commit、push、部署、联网或远程变更

## 历史与规划依据

- S22-R15—R17 completed；S22-R18、S22-R19、S22-R20 blocked、consumed、只读。
- R20 request：`work-products/debug/execution-baselines/S22-R20/request-run-20260822-s22-r20-01.json`；attempt/staging 未创建，worker 与产品门禁未启动。
- R20 blocked 现场：`work-products/evidence/section22/final-gate-completion-validation.md`、`work-products/evidence/section22/receipts/S22-R20.json` 与 `work-products/evidence/section22/blocked-r20-todo.md`。
- `work-products/debug/s22-r20-duplicate-input-contract.md` 记录唯一性与 review remediation 的 RED→GREEN；R21 的 49 个 inputs 展平后全部唯一。
- 候选 `s22-account-usage-final-gate-completion-recovery-20260822-08` 未批准、未创建 task root 或 attempt；因 prestate request 文件名残留 R20 attempt 而被替代，其 snapshot 只读保留。
- 候选 `s22-account-usage-final-gate-completion-recovery-20260822-09` 未批准、未创建 task root 或 attempt；独立 review 发现真实 validator、原始字节完整性与 generated namespace 大小写语义缺口后被替代，其 snapshot 只读保留。
- 冻结 R20 合同通过 `r20-frozen-integrity.json` 绑定旧 plan/todo/request/evidence/receipt 的原始字节；新的活动合同允许所有合法批准/执行态。
- 本候选只规划一个全新 S22-R21 完整本地门禁，不修改产品代码、依赖、版本或 Pages 保护输入。

## 批准基线

- 候选计划：`work-products/plan.md`
- create-new/no-replace 基线：`work-products/debug/approval-baselines/s22-account-usage-final-gate-completion-recovery-20260822-10/plan.md`
- 字节比对：`IDENTICAL`
- 批准状态：`APPROVED`
- 批准记录：`USER_EXPLICIT / 2026-08-22 / 完成本轮修复后批准上述计划并调用 @uxu-code:build auto`
- 批准范围：批准只记录 APPROVED；之后仍需用户另行调用 `@uxu-code:build auto`。不授权 commit、push、部署、联网或远程变更。

## 状态账本

- `work-products/todo.md` 仅由主代理写入；合法转换为 `pending → in_progress → completed | blocked`。
- checkbox 是显式状态的原子派生镜像：只有 `completed` 为 `[x]`。
- todo 仅作为 Worker repository 的精确 exclusion。

| 任务 | 状态 | 波次 | 依赖 | 并行 |
|---|---|---:|---|---|
| S22-R21 | blocked | 0 | 无 | 否 |

## 任务清单

- [ ] S22-R21 两仓最终本地门禁恢复完成
  - 状态：blocked
  - 验证：跨 input-set 唯一性、新 v2 attempt、Worker/Pages 完整离线门禁、两仓身份与 manifest-actual 扫描、rollback、evidence/receipt 审计与 terminal verify。
  - 终态上限：`LOCAL CANDIDATE / RELEASE HOLD`。

## 下一道门

- candidate-owned approval snapshot 已创建并验证逐字节一致。
- 用户清晰批准当前计划，无需复制候选 ID。
- 批准后另行调用 `@uxu-code:build auto`。
