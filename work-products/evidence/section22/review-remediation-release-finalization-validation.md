# S22-R25 review 修复发布收口验证

- 时间：2026-08-22T16:36:21.8289075+08:00
- 任务：`S22-R25`
- attempt：`run-20260822-s22-r25-01`
- schema：`s22-release-finalization-validation/v1`
- 本文件结论：`VALIDATIONS GREEN / LOCAL CANDIDATE / RELEASE HOLD`
- 发布边界：本文件仅证明当前双仓本地候选；不等同于远程 CI、GitHub Pages、Cloudflare Workers 或生产验证。

## 当前候选

- Worker：`2.0.0`
- Pages：`0.3.0`
- API Contract：`2`
- Worker 接受的 Pages 范围：`>=2.0.0 <3.0.0`
- 批准候选：`s22-review-remediation-20260822-13`
- 批准计划与候选批准快照：原始字节 `IDENTICAL`

## 固定验证

| ID | 结果 | 证据摘要 |
|---|---|---|
| `worker-full-gate` | GREEN | `node --check _worker.js`；`npm test` 261/261；gzip 40,189 / 3,145,728 bytes；Worker `git diff --check` 退出码 0 |
| `pages-full-gate` | GREEN | `npm test` 164 + 10；lint；TypeScript `--noEmit`；build 9 pages / 23 client assets；E2E 128/128；release build；Pages `git diff --check` 全部退出码 0 |
| `paired-final-gate` | GREEN | final-gate 回归 3/3；CLI 复验 7 routes、72 assets、manifest/actual `IDENTICAL`、退役名 0、task temp empty |
| `section22-rollback` | GREEN | 隔离克隆中当前双仓候选反向回到成对 HEAD 基线，再正向恢复当前候选，1/1 |
| `candidate-hygiene` | GREEN | 机器路径、可信凭证、未审二进制与归档递归扫描 10/10；两仓 diff check 仅有行尾提示 |
| `evidence-audit` | GREEN | byte-safe receipt/evidence auditor 回归 4/4；固定 validation ID、证据身份、schema、结论与内容卫生均 fail-closed |
| `terminal-verify` | GREEN | 当前 plan 与批准快照一致；release manifest/actual 一致；release 临时目录与 rollback 工作命名空间无残留；R25 task temp 为空 |

## 修复覆盖

- Worker Cloudflare usage 请求对三组聚合都要求 `sampleInterval === 1`，并将同一个十秒超时覆盖到响应正文解析完成。
- Pages 对 usage payload 执行精确字段、UTC 日期、固定 Free 限额、warnings 与 level 的语义重算；权限或账户变化会清空旧数据并阻止 abort 后回写。
- 客户端失败刷新具有 30 秒冷却；Provider 仅在功能启用时显示告警。
- 离线 E2E 在导航前注册请求监听，并以拒绝代理独立证明外部网络不可达；Pages-only checkout 自包含性能基线与 E2E helper。
- 当前候选 rollback 覆盖两仓发布源，不复用 review 前的 R23 回滚证明。
- receipt auditor 固定发布收口 profile、七个 validation ID、证据命名空间与显式 legacy 开关。

## 保留与回滚

- R21–R23 receipt、evidence 和 execution baseline 为只读历史，未覆盖、未删除，也不隐式纳入发布提交。
- 当前候选可使用 `current-candidate-worker.reverse.patch` 与 `current-candidate-pages.reverse.patch` 回到成对 HEAD 基线；正向 patch 已在隔离克隆中证明可恢复。
- 未修改 D1 数据、Cloudflare 变量、Secret 或远程配置。
- 只有后续 `@uxu-code:ship` 返回 GO，才可进入用户已授权的 commit、push、部署与生产烟测。
