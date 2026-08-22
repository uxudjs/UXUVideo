# 执行清单：SPEC 第 22 节账户级用量恢复与本地门禁

> 状态：APPROVED / BUILD AUTO AUTHORIZED
> 候选 ID：`s22-account-usage-recovery-20260821-01`
> 执行策略：`serial`
> 安全并发上限：1
> 当前授权：执行本批准计划的本地 `build auto`；未授权 commit、push、部署或远程 Cloudflare/D1 变更

## 规划依据与采纳状态

- 已批准规范：`work-products/SPEC.md` 第 22 节。
- 旧计划冻结副本：`work-products/evidence/section22/blocked-wave2-plan.md`。
- 旧 blocked todo 冻结副本：`work-products/evidence/section22/blocked-wave2-todo.md`。
- 采纳旧计划 S22-T00—T02 completed 成果，以及 S22-T03 已完成的三文件改动与 blocked receipt；本候选五个任务只覆盖剩余恢复、验证和最终证据。
- 四个用户确认的 Pages 并发文件保持只读既有输入，不属于本计划写集。

## 批准基线

- 候选计划：`work-products/plan.md`
- create-new/no-replace 基线：`work-products/debug/approval-baselines/s22-account-usage-recovery-20260821-01/plan.md`
- 字节比对：`IDENTICAL`
- 批准状态：`APPROVED`
- 批准 receipt：2026-08-21，用户在看到冻结候选后明确回复“确认批准计划”，并在同一请求中调用 `@uxu-code:build auto`。
- 批准范围：仅连续执行本计划的本地 R00—R04；不授权 commit、push、部署、联网或远程 Cloudflare/D1 操作。

## 状态账本

- `work-products/todo.md` 仅由主代理写入；合法状态转换为 `pending → in_progress → completed | blocked`。
- checkbox 是显式状态的原子派生镜像：只有 `completed` 可标记 `[x]`，其余状态均为 `[ ]`。
- 批准执行前五个恢复任务均为 `pending`；后续 attempt、owner、snapshot 与 terminal receipt 按本账本逐任务追加。

| 任务 | 状态 | 波次 | 依赖 | 并行 |
|---|---|---:|---|---|
| S22-R00 | completed | 0 | 无 | 否 |
| S22-R01 | blocked | 1 | S22-R00 | 否 |
| S22-R02 | pending | 2 | S22-R01 | 否 |
| S22-R03 | pending | 3 | S22-R02 | 否 |
| S22-R04 | pending | 4 | S22-R03 | 否 |

## 任务清单

- [x] S22-R00 冻结旧合同并切换恢复计划契约
  - 状态：completed
  - attempt：`run-20260821-s22-r00-01`
  - owner：`native-worker:s22_r00`
  - execution snapshot：`work-products/debug/execution-baselines/S22-R00/run-20260821-s22-r00-01/manifest.json`（create-new/no-replace，启动前逐字节一致）
  - terminal receipt：旧合同 RED 0/4（exit 1）；冻结历史合同与恢复计划合同 GREEN 8/8（exit 0）；双文件实际写集、相对路径、批准计划身份与 diff check 均通过；无 scope exception。
  - 验证：旧 Section 22 冻结合同与可持续验证合法状态/依赖前缀的新恢复计划合同聚焦门禁。

- [ ] S22-R01 清除活动测试中的退役名称字面量
  - 状态：blocked
  - attempt：`run-20260821-s22-r01-01`
  - owner：`native-worker:s22_r01`（not launched）
  - execution snapshot：`work-products/debug/execution-baselines/S22-R01/run-20260821-s22-r01-01/manifest.json`（create-new/no-replace；保留失败原件，不修补、不覆盖）
  - terminal receipt：worker 未启动、三个手写目标与四个生成路径均未写入；四个 Pages 保护输入逐字节未变。基线复制保留了活动原始字节，但 manifest 的 Windows 分隔符规范化表达式失败，造成 1621 个 file descendant 缺少 snapshot 相对路径并出现重复 descendant path；按 no-replace 合同阻塞本任务及 R02—R04。
  - 验证：Worker 三文件聚焦门禁、Pages usage Playwright、两仓活动名称扫描与保护输入复核。

- [ ] S22-R02 Worker 隔离门禁与证据
  - 状态：pending
  - 验证：Worker 语法、聚焦测试、大小、diff、秘密/机器路径/退役名称扫描。

- [ ] S22-R03 Pages 全门禁与静态发布物重建
  - 状态：pending
  - 验证：lint、tsc、E2E、最终 build/release build、最终 test、diff、manifest 文件集合与保护输入复核。

- [ ] S22-R04 两仓集成、完整回归与本地发布门禁
  - 状态：pending
  - 验证：两仓完整门禁、跨仓契约、原始字节与 manifest/实际文件集合一致性、保护输入、回滚与证据审计。
  - 终态上限：`LOCAL CANDIDATE / RELEASE HOLD`。

## 已知计划迁移 RED

- 当前 `work-products/tests/section22-plan-contract.test.mjs` 仍验证已冻结的七任务计划但读取活动 plan/todo；替换为本候选后预期失败。
- S22-R00 将先把旧断言路由到冻结 blocked 历史，并新增本恢复候选合同；规划阶段不修改测试来伪造绿色。
