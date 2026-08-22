# S22-R22 冻结产品现场的最终终审恢复验证

- 时间：2026-08-22T14:58:55.6623183+08:00
- 任务：`S22-R22`
- attempt：`run-20260822-s22-r22-01`
- schema：`s22-final-gate-audit-recovery-validation/v1`
- 本文件结论：`VALIDATIONS GREEN / PENDING FINAL TERMINAL RECEIPT`
- 发布边界：本任务成功上限为 `LOCAL CANDIDATE / RELEASE HOLD`；不执行 commit、push、部署、联网或远程变更。

## 继承的完整产品门禁

R21 在被后置 wrapper 阻断前已经完成同一 Worker 2.0.0 / Pages 0.3.0 产品现场的完整本地验证：

| 检查 | 冻结结果 |
|---|---|
| Worker 语法 / 卫生 | GREEN / 10 pass |
| Worker 全套测试 | 237 pass，0 fail |
| Worker size | source 168,196 bytes；gzip 40,101 / 3,145,728 bytes |
| Pages lint / TypeScript | GREEN / GREEN |
| Pages E2E | 128 pass，0 fail；p95 RAF 8.5 ms、long task 0、dropped frame 0 |
| Pages build | 8 个静态入口；23 个 chrome83 客户端资产 |
| Pages release build | `release/current` verified；无 staging/backup 残留 |
| Pages Node 测试 | 173 pass，0 fail |
| 两仓 diff / 卫生 | GREEN / 10 pass |

上述结果由以下只读链绑定，R22 合同逐文件复验其原始字节：

- `work-products/evidence/section22/r21-frozen-integrity.json`
- `work-products/debug/execution-baselines/S22-R21/run-20260822-s22-r21-01/manifest.json`
- `work-products/evidence/section22/final-gate-completion-recovery-validation.md`
- `work-products/evidence/section22/receipts/S22-R21.json`

R21 的失败只发生在产品门禁之后的一次性 PowerShell wrapper：它把 route value `index.html` 当作 assets property key，并把正常 Playwright transform cache 误作非法终态。R21 已永久 consumed，未被修改或重跑。

## RED→GREEN 修复

- RED：`work-products/tests/section22-final-gate-audit.test.mjs` 初始因受测脚本不存在而失败。
- GREEN：`work-products/scripts/section22-final-gate-audit.mjs` 按 `assets[*].path` 匹配 route，精确核对 manifest/actual，并为 task temp 建模空目录或有界 Playwright transform cache。
- 聚焦回归：3 pass，0 fail。
- 诊断：`work-products/debug/s22-r21-post-scan-wrapper-contract.md`。

## R22 baseline

| 项目 | 结果 |
|---|---|
| approval snapshot | 活动计划与 candidate-owned snapshot 原始字节一致 |
| request | v2 / no-replace / fresh task 与 attempt |
| inputs | 27 个 immutable inputs |
| protected inputs | 7 个；含 Worker、Pages 保护文件、视觉候选与 `release/current` |
| repositories | 2 个完整 inventory |
| toolchain | 2 个本地脚本入口 |
| environment | 8 个声明项；代理键 fail-closed 缺失 |
| targets | evidence 与空 task temp |
| generated namespace | `section21-rb-` initial none / terminal none |
| create / prewrite / inputs | 全部 GREEN |

执行基线：`work-products/debug/execution-baselines/S22-R22/run-20260822-s22-r22-01/manifest.json`。

## R22 验证结果

| 检查 | 退出码 | 结果 |
|---|---:|---|
| R22 计划合同 | 0 | 6 pass，0 fail；真实 v2 validator、R21 frozen-integrity、27 inputs 唯一性与 7 个保护输入全绿 |
| 经测试的终审回归 | 0 | 3 pass，0 fail |
| 候选卫生 | 0 | 10 pass，0 fail |
| 终审 CLI（rollback 前） | 0 | Worker 2.0.0 / Pages 0.3.0 / API 2 / Worker range；7 routes；72 assets；manifest/actual identical；退役名 0；task temp empty |
| Worker `git diff --check` | 0 | 通过；仅行尾提示 |
| Pages `git diff --check` | 0 | 通过；仅行尾提示 |
| 配对 rollback drill | 0 | 1 pass，0 fail；隔离仓库完成 v2→v1→v2 重放 |
| 终审 CLI（rollback 后） | 0 | 身份、路由、资产、manifest/actual、退役名与 task temp 再次全绿 |
| 预终态 baseline verify | 0 | 两仓 inventory、immutable inputs、环境、7 个保护输入与 generated namespace 全绿 |

每条验证命令前均重新执行 baseline `inputs` phase；没有观察到产品、release、保护输入或未声明仓库状态漂移。

## 终态与下一门

- R22 task temp 为空；rollback namespace 为 none。
- Pages release staging/backup namespace 为空；`release/current` 与七个保护输入未改变。
- 两仓产品 inventory 未改变；R22 只新增声明的 baseline、evidence，receipt 将作为 orchestration output create-new 写入。
- 本 evidence 写入后必须通过独立内容审计与最终 terminal verify，再预序列化审计 receipt；只有 receipt 回读一致并将 todo 原子更新为 completed，才形成 `LOCAL CANDIDATE / RELEASE HOLD`。
- 后续仍需执行 `@uxu-code:review` 与 `@uxu-code:ship`；只有 ship GO 后，才进入用户已批准的 GitHub Pages 与 Cloudflare Workers 远程发布和生产烟测。
