# S22-R20 两仓最终本地门禁完成（BLOCKED）

- 时间：2026-08-22T12:56:33.7758217+08:00
- 任务：`S22-R20`
- attempt：`run-20260822-s22-r20-01`
- schema：`s22-final-gate-validation/v1`
- 结论：NO-GO / `RELEASE HOLD`
- 执行边界：baseline create 在 attempt root 或 staging root 写入前失败；worker 未启动，产品验证未开始。

## 已执行结果

| 检查 | 退出码 | 结果 |
|---|---:|---|
| 活动 plan 与批准 snapshot 原始字节比对 | 0 | 24,352 字节，完全一致 |
| 用户批准与 `@uxu-code:build auto` ledger | 0 | 当前候选批准态合同 5/5 通过 |
| R20 活动 todo 合同 RED→GREEN | 0 | 聚焦 5/5；全部 Section 22 计划合同 30/30 |
| 候选卫生 | 0 | 10/10 |
| initial prestate | 0 | 45 inputs、5 protected inputs、7 toolchain entrypoints、离线环境与端口全部通过 |
| request 物化 | 0 | create-new 写入 task root；12 targets、45 inputs、5 protected inputs |
| baseline create | 1 | `inputs contains a duplicate or case alias` |

## 失败

批准蓝图将 `worker:work-products/debug/s22-r19-in-progress-mirror-contract.md` 同时放入 `governance` 与 `prior-validation-evidence`。R20 request 按蓝图展平后包含一个重复 input，`execution-baseline.mjs` 的 v2 request 校验在创建 attempt/staging 前 fail-closed 拒绝。

这是计划蓝图的输入集合缺陷，不是 Worker 或 Pages 产品门禁失败。request 已按 no-replace 合同保留，本 attempt 永久 consumed，禁止编辑 request 后重试或复用。

## 终态现场

- `work-products/debug/execution-baselines/S22-R20/request-run-20260822-s22-r20-01.json`：保留。
- attempt root：missing。
- `.creating` staging：missing。
- `work-products/tests/work/section22-r20-temp`：存在且为空；未做主代理失败后清理。
- generated namespace：initial none。
- manifest 与 snapshot：未创建，因此 `verify prewrite|inputs|terminal` 均不可执行。
- Pages 保护输入：仅 initial prestate 已验证；没有运行产品命令。

## 未执行

- Worker：`node --check _worker.js`、完整 `npm test`、大小与 diff。
- Pages：远程依赖静态扫描、lint、TypeScript、离线 E2E、build、release build、完整测试与 diff。
- 两仓身份、秘密、机器路径、退役名称、manifest-actual 扫描。
- rollback drill、receipt 后置完整门禁、最终 ship gate。
- commit、push、GitHub Pages 发布、Cloudflare Worker 部署或生产烟测。

## 恢复边界

保留本 evidence、request 与即将创建的 receipt 不变。恢复必须用新的候选、task ID 和 attempt，先对蓝图展平后的跨 input-set 唯一性增加回归，再从头执行完整本地门禁。
