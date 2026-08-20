# Section 21 双仓发布与回滚运行手册

## 状态与授权边界

本文只描述 Worker `2.0.0` 与 Pages `0.3.0` 的成对候选顺序，以及冻结的 Worker `1.1.4` / Pages `0.2.1` 回滚身份。它不授权 commit、push、发布或部署，也不授权修改 Cloudflare、D1、Secret、绑定或远端流量。任何远端操作仍需单独批准，并只能在预先批准的维护窗内执行；本文不规定维护窗时长。

`pair-rollback.json` 中的 `drillBase` 是本地补丁演练基线，`productionRollback` 是 2026-08-15 生产记录冻结的历史身份。两者用途不同；本地补丁演练既不建立也不重新验证生产字节。

## 前向发布顺序

1. 先核对两仓候选 SHA、Pages release manifest、API Contract `2`、Worker 范围 `>=2.0.0 <3.0.0`、绑定清单和回滚身份；任一不符立即停止。
2. 先发布 Pages v2 到唯一公开根目录，随后逐字节核对根 `release-manifest.json` 与公开资产。此阶段旧 Worker 只能以保护性 `503` 拒绝不兼容 manifest，不得返回混搭页面。
3. Pages 根 manifest 与公开字节全部一致后，才激活 Worker v2。
4. 立即执行健康检查：Pages 根 manifest/公开字节、Worker `/api/config`、认证、同步和普通播放。任一检查失败，立即按下述顺序恢复发布前原配对。

## 回滚顺序

1. 先恢复 Pages v1 的唯一公开根目录，并核对冻结的 Pages main、gh-pages 与 manifest 身份。
2. Pages v1 根 manifest 与公开字节一致后，才恢复 Worker v1 的冻结部署版本。
3. 再次执行 Pages 根 manifest/公开字节、Worker `/api/config`、认证、同步和普通播放健康检查。

若第二步或任一健康检查未能在预先批准的维护窗内完成，立即恢复操作开始前的原配对；不得停留在 Worker/Pages 混搭状态。任一 SHA、manifest、公开字节、绑定或健康检查不符都必须停止，不得继续下一仓。

## 本地隔离演练

`section21-rollback-drill.test.mjs` 只在仓库忽略的临时双仓中执行：先成对物化 v2，双方反向补丁都通过检查后恢复 v1，验证 v1 合同和 v2 `videoSkipRules` 的保留能力，再在双方前向补丁都通过检查后恢复 v2。四份补丁是本地演练产物，不得直接当作已验证的生产回滚包；真实生产回滚只认 `pair-rollback.json` 中冻结的 `productionRollback` 身份及另行批准的远端程序。
