# S22-R23 receipt 终态收口验证

- 时间：2026-08-22T15:25:08.7596757+08:00
- 任务：`S22-R23`
- attempt：`run-20260822-s22-r23-01`
- schema：`s22-receipt-audit-finalization-validation/v1`
- 本文件结论：`VALIDATIONS GREEN / PENDING FINAL TERMINAL AND RECEIPT AUDIT`
- 发布边界：成功上限为 `LOCAL CANDIDATE / RELEASE HOLD`；本任务不执行 commit、push、部署、联网或远程变更。

## 冻结验证链

- R21 完整产品门禁：Worker 237/237；Pages E2E 128/128；Pages Node 173/173；Worker size、Pages build/release、两仓 diff 与卫生全绿。
- R22 最终终审：Worker 2.0.0 / Pages 0.3.0 / API 2 / Worker range；7 routes；72 assets；manifest/actual identical；退役名 0；task temp empty。
- R22 rollback：隔离仓库 v2→v1→v2，1 pass、0 fail。
- R22 evidence 与 terminal verify 全绿；attempt 仅因 PowerShell 宿主输出回读附加换行而 consumed。
- `work-products/evidence/section22/r21-frozen-integrity.json` 与 `work-products/evidence/section22/r22-frozen-integrity.json` 的选择文件原始字节均由 R23 合同复验。

## byte-safe 修复

- `work-products/scripts/section22-receipt-audit.mjs` 直接读取原始 Buffer，不使用 PowerShell 对象输出层。
- 固定校验 canonical UTF-8、无 CR、恰好一个终止 LF、无 trailing whitespace、task/attempt/status、baseline、validation、terminal、授权边界、预期 receipt bytes/digest 与 evidence bytes/digest。
- 聚焦回归：3 pass、0 fail；额外宿主换行、错误预期摘要与 evidence drift 均 fail-closed。
- retained R22 receipt：4,429 bytes；evidence 4,750 bytes；预期身份和 evidence binding 均 `IDENTICAL`。

## R23 baseline

| 项目 | 结果 |
|---|---|
| approval snapshot | 活动计划与 candidate-owned snapshot 原始字节一致 |
| request | v2 / no-replace / fresh task 与 attempt |
| inputs | 24 个 immutable inputs |
| protected inputs | 7 个；含 Worker、Pages 保护文件、视觉候选与 `release/current` |
| repositories | 2 个 inventory |
| toolchain | execution baseline、final-gate audit、receipt audit 共 3 个入口 |
| environment | 8 个声明项；代理键 fail-closed 缺失 |
| targets | 本 evidence 与空 task temp |
| create / prewrite / inputs | 全部 GREEN |

执行基线：`work-products/debug/execution-baselines/S22-R23/run-20260822-s22-r23-01/manifest.json`。

## R23 验证结果

| 检查 | 退出码 | 结果 |
|---|---:|---|
| R23 计划合同 | 0 | 6 pass，0 fail；真实 v2 validator、24 inputs 唯一性、R22 frozen-integrity 与 7 个保护输入全绿 |
| receipt byte-safe 回归 | 0 | 3 pass，0 fail |
| retained R22 receipt CLI | 0 | 4,429 / 4,750 bytes；expected identity 与 evidence binding `IDENTICAL` |
| final-gate 回归 | 0 | 3 pass，0 fail |
| final-gate CLI | 0 | 版本/API/range、7 routes、72 assets、manifest/actual、退役名与 task temp 全绿 |
| 候选卫生 | 0 | 10 pass，0 fail |
| Worker `git diff --check` | 0 | 通过；仅行尾提示 |
| Pages `git diff --check` | 0 | 通过；仅行尾提示 |
| 预终态 baseline verify | 0 | 两仓 inventory、immutable inputs、环境、保护输入与空生成集合全绿 |

每条验证命令前均重新执行 baseline `inputs` phase；未观察到产品、release、保护输入或未声明仓库状态漂移。

## 收口条件

- R23 task temp 为空；release staging/backup 与 rollback namespace 均为空。
- `release/current`、七个保护输入与两仓 product inventory 未改变。
- 本 evidence 写入后必须通过独立内容/卫生审计与最终 terminal verify。
- R23 receipt 必须先形成 canonical UTF-8 + 单 LF 的预序列化 bytes，并取得内部 expected bytes/digest；create-new 后只能由受测试 receipt CLI 用原始 Buffer 验证 expected identity 与本 evidence 绑定。
- receipt CLI 输出 `IDENTICAL` 且 todo 原子更新为 completed 后，形成 `LOCAL CANDIDATE / RELEASE HOLD`，再进入 `@uxu-code:review` 与 `@uxu-code:ship`。
