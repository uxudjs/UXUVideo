# S22-R20 活动 todo 合同误拒绝调试

> 状态：GREEN
> 日期：2026-08-22
> 范围：仅 `work-products/tests/section22-final-gate-completion-plan-contract.test.mjs`

## 观察与复现

- R20 候选在 `PENDING` 状态下聚焦合同为 5/5，但活动候选测试把结果硬编码为 `{ approval: "PENDING", rowState: "pending" }`。
- 同一文件的状态机合同明确允许 `APPROVED` 下的 `pending`、`in_progress`、`completed` 与 `blocked`。
- `package.json` 的完整测试入口为 `node --test work-products/tests`，因此批准后执行计划内 `npm test` 时必然加载该活动候选测试。
- 新增最小回归后取得确定性 RED：4/5 通过，合法 `APPROVED / pending` 被活动候选断言误拒绝。

## 根因

活动候选断言重复编码了规划时的初始状态，而没有复用同文件已经定义的合法状态机边界。这是测试假阴性，不是产品行为失败。

## 最小修复

- 保留 `todoState()` 对 header、批准记录、表格、任务状态与 checkbox 的全部一致性校验。
- 将活动候选断言改为接受唯一合法集合：`PENDING / pending`，以及 `APPROVED` 下的四种执行状态。
- 让现有五态 fixture 同时经过活动候选断言，防止再次把运行态锁死为初始态。

## 验证

| 验证 | 结果 |
|---|---|
| 聚焦 RED | 4/5 pass，合法批准态被拒绝 |
| 聚焦 GREEN | 5/5 pass |
| 全部 Section 22 计划合同 | 30/30 pass |

## 边界

- 未修改产品代码、依赖、版本、Pages 保护输入或计划快照。
- 未创建 S22-R20 attempt、执行基线、evidence 或 receipt。
- Worker/Pages 完整本地门禁仍须由 S22-R20 独立执行并形成新证据。
