# S22-R21 后置扫描 wrapper 失败诊断

> 日期：2026-08-22
> 任务：S22-R21 / `run-20260822-s22-r21-01`
> 范围：最终两仓 identity、retired-name、manifest-actual 与 task-temp 终态审计

## 观察

R21 已通过 Worker 237/237、Pages E2E 128/128、Pages Node 173/173、两仓 build/size/diff 与两仓卫生 10/10。后置临时 PowerShell wrapper 随后把 route value `index.html` 当成 `assets` property key；实际 property key 为 `/index.html`，文件身份位于 property value 的 `path`，因此合法根路由被误报为缺失。

同一 attempt 的 Playwright 还在共享 task temp 中保留 `playwright-transform-cache`。这与既有 Pages 验证现场一致，但 R21 计划错误要求 task temp 与初始空目录身份完全相同。

## 根因

1. 最终 audit 使用未受测试的一次性 PowerShell 逻辑，route key 与 asset path 两种命名空间混淆。
2. task temp 终态未按真实 Playwright 行为建模，导致成功执行也无法满足原合同。

## RED → GREEN

- 新增 `work-products/tests/section22-final-gate-audit.test.mjs`；初始因受测脚本不存在而 RED。
- 新增只读 `work-products/scripts/section22-final-gate-audit.mjs`，按 `assets[*].path` 匹配 routes，并要求 manifest 声明与实际文件集合完全一致。
- task temp 只允许为空，或只包含有界、无 link/reparse 的 `playwright-transform-cache`；其他任何条目 fail-closed。
- 脚本固定验证 Worker `2.0.0`、Pages `0.3.0`、API `2`、Worker range、7 routes、72 assets，以及活动源/活动测试中的两个退役 Cloudflare 名称零命中。
- 聚焦结果：3/3 pass；CLI 对 R21 保留候选只读复验为 GREEN，输出不含机器绝对路径。

## 恢复边界

R21 request、manifest/snapshots、evidence、receipt、task temp 与生成 Pages target 均保持只读；attempt consumed。下一恢复计划只能使用新的 task/attempt，并把本脚本与测试纳入 immutable inputs；不允许修正并重跑 R21。
