# S22-R21 两仓最终本地门禁恢复完成（BLOCKED）

- 时间：2026-08-22T14:26:50.9311946+08:00
- 任务：`S22-R21`
- attempt：`run-20260822-s22-r21-01`
- schema：`s22-final-gate-validation/v1`
- 结论：NO-GO / `RELEASE HOLD`
- 执行边界：产品全量本地门禁已通过；后置两仓扫描命令因主代理 PowerShell 路由检查逻辑错误非零退出，按批准合同停止，未运行 rollback drill 或 ship。

## 已执行结果

| 检查 | 退出码 | 结果 |
|---|---:|---|
| 活动 plan 与批准 snapshot 原始字节比对 | 0 | 25,612 字节，完全一致 |
| R21 活动合同 | 0 | 8 pass，0 fail；真实 create validator、49 inputs 唯一性与 R20 frozen integrity 全绿 |
| 全部 Section 22 计划合同 | 0 | 39 pass，0 fail |
| generated namespace 聚焦回归 | 0 | 3 pass，0 fail；含 case-only prefix alias |
| initial prestate | 0 | 14 个缺失路径、2 个 release namespace、rollback namespace none、4173/4174 空闲、8 个代理键缺失 |
| request / baseline create | 0 | 49 inputs、12 targets、5 protected inputs、7 toolchain entrypoints、12 environment entries；manifest create-new |
| manifest 自审计 / prewrite / inputs | 0 | schema、self hash、task/attempt、声明计数与逐阶段验证通过 |
| Worker `node --check _worker.js` | 0 | GREEN |
| Worker 候选卫生 | 0 | 10 pass，0 fail |
| Worker `npm test` | 0 | 237 pass，0 fail |
| Worker `npm run check:size` | 0 | source 168,196 bytes；gzip 40,101 / 3,145,728 bytes |
| Worker `git diff --check` | 0 | 通过；仅行尾提示 |
| Pages 远程构建依赖静态扫描 | 0 | `next/font`、远程字体 import/domain 零命中 |
| Pages lint / TypeScript | 0 | GREEN / GREEN |
| Pages `npm run test:e2e` | 0 | 128 pass，0 fail；固定性能中位数 p95 RAF 8.5 ms、long task 0、dropped frame 0 |
| Pages `npm run build` | 0 | 8 个静态入口；23 个 chrome83 客户端资产 |
| Pages `npm run release:build` | 0 | `release/current` verified；无 staging/backup 残留 |
| Pages `npm test` | 0 | 主套件 163 pass + Section 21 10 pass = 173 pass，0 fail |
| Pages `git diff --check` | 0 | 通过；仅行尾提示 |
| 后置两仓卫生扫描 | 0 | 10 pass，0 fail；秘密、机器路径、未审阅二进制零命中 |
| 后置身份/退役名/manifest-actual 扫描 wrapper | 1 | 在 `/` 路由检查处抛出 `route absent from assets: /`，后续断言未完成 |

## 失败归因

后置扫描 wrapper 把 route value `index.html` 直接当作 `assets` 对象的 property key；manifest 的 property key 是 `/index.html`，而实际文件身份位于 property value 的 `path`。因此脚本在合法根路由上错误报缺失。该错误属于本次主代理临时 PowerShell 审计逻辑，不是产品、release manifest、秘密或退役名称回归。

批准计划规定任一命令失败后立即 `RELEASE HOLD`，同一 attempt 不得修正 wrapper 后重跑。R21 永久 consumed；不能用已通过的产品门禁替代尚未完成的后置扫描、rollback 与 ship。

## 终态现场

- baseline-tool work、Pages 的 `kvideo-webview-compatibility`、`pwa-release`、`release-manifest` 三个 Node test-work 均 missing。
- generated rollback namespace none；4173/4174 已释放；release staging/backup none。
- R21 task temp 保留 Playwright 自生成的 `playwright-transform-cache`；主代理未清理。其身份不再等于 baseline 初始空目录，因此终态手工不变量也不满足。
- 五个 Pages protected inputs 未由本任务编辑；由 terminal verify 复验。
- `.next`、`out`、`release/current`、`tsconfig.tsbuildinfo`、Playwright artifacts 与隔离视觉草稿保留为本 attempt 的 target 现场。

## 未执行

- 修正后的两仓 identity / retired-name / manifest-actual 扫描。
- `node --test work-products/tests/section21-rollback-drill.test.mjs`。
- 最终 evidence/receipt 成功审计、completed 状态与 `@uxu-code:ship` GO/NO-GO。
- commit、push、GitHub Pages 发布、Cloudflare Worker 部署或生产烟测。

## 恢复边界

保留本 evidence、request、manifest、snapshots、task temp 和即将创建的 receipt 不变。恢复必须使用新的候选、task ID 与 attempt：把后置身份/manifest-actual 审计写成受测试的仓库脚本，并明确 task temp 的可接受 terminal 状态，再从头执行完整本地门禁。
