# 第十恢复计划：第 22 节 review 缺陷修复与发布重验

> 候选 ID：`s22-review-remediation-20260822-13`
> 状态：AUTO-APPROVED / RELEASE HOLD
> 执行策略：`serial`
> 安全并发上限：1

## 1. 目标与依据

- R23 已完成原计划的 receipt 收口并永久保留；独立 `@uxu-code:review` 随后发现会阻断发布的真实缺陷，因此 R23 证据不得再代表修复后的产品候选。
- 用户已持续批准当前 Section 22 工作并显式调用 `@uxu-code:build auto`，本计划可在不扩大产品目标的前提下自动执行 review remediation。
- 权威需求仍为 `work-products/SPEC.md` 第 22 节及未被覆盖的既有合同：固定 10 秒上游边界、严格响应解析、手动刷新 30 秒冷却、权限降级不泄漏、离线和独立 checkout 可复现、当前候选可回滚、证据审计 fail closed。
- Cloudflare 官方文档确认 Adaptive 数据集可能返回抽样估算；无法证明未抽样时不得把结果声明为完整账户总量。

## 2. 成功标准

1. Worker 10 秒超时覆盖响应头与完整正文读取；慢正文安全返回脱敏错误。
2. Worker 查询并验证 Adaptive 分组的 `avg.sampleInterval`；任一分组缺失、非 1 或不可验证时 fail closed。
3. Worker 聚合边界覆盖 D1 两类 limit、分组结构、负数、小数、不安全整数、溢出、512 KiB 和缓存身份矩阵。
4. Pages 只接受语义自洽的 UTC 时段、固定正额度、告警集合和总体级别；非法或矛盾响应进入 error。
5. `super_admin` 权限关闭、账户切换或在途请求失效时清空旧用量；全局提醒还必须显式受 `enabled` 约束。
6. 手动刷新在 30 秒内 fail closed 拒绝重复触发，按钮在冷却期间禁用。
7. Pages E2E 导航期间零外部请求；性能基线归 Pages 自有证据；隔离检查覆盖全部活动 Node 与 Playwright 测试。
8. 新 Section 22 rollback 证据绑定修复后的当前候选，并在隔离目录验证“当前候选 → 当前 HEAD 配对基线 → 当前候选”。
9. receipt auditor 固定验证序列，验证 evidence 命名空间、task/attempt/schema/结论，并扫描绑定 evidence 的机器路径与可信秘密。
10. 两仓完整本地门、候选卫生、回滚、final-gate、receipt audit 与 `@uxu-code:ship` 全绿后才允许远程发布。

## 3. 任务与顺序

### S22-R24 — review 缺陷 RED 与最小修复

- 读取：Section 22 规格、R23 receipt/evidence、三路 review 结果涉及的 Worker/Pages 源码与测试。
- 写入：
  - Worker `_worker.js` 与 `work-products/tests/cloudflare-usage-contract.test.mjs`。
  - Pages `lib/hooks/useCloudflareUsage.ts`、`components/UsageAlertProvider.tsx`、`components/settings/CloudflareUsageSettings.tsx`、相关 E2E/隔离测试和 Pages 自有性能基线。
  - `work-products/scripts/section22-receipt-audit.mjs` 与对应测试。
  - 本轮 debug 证据，仅位于 `work-products/debug/`。
- 约束：不改 D1 schema、版本/API Contract、依赖、真实 Token/变量或远程配置；不覆盖 R21—R23 历史 receipt/evidence/baseline。
- 方法：每一类缺陷先运行可归因 RED，再做最小 GREEN；不引入新运行时依赖或构建层。
- 验收：聚焦 Worker Node 测试、Pages Node/E2E 测试、TypeScript、lint 与 diff check 通过。

### S22-R25 — 当前候选回滚、完整门与新收口

- 依赖：R24 全部 GREEN。
- 写入：新 Section 22 rollback 测试/证据、新 final validation、新 receipt 与本轮 todo 终态；不修改 R21—R23 历史证据。
- 回滚基线：两仓当前 `HEAD` 是上一对可兼容 Section 21 候选；修复后的工作树是新的 Section 22 候选。
- 本地门：
  - Worker：`node --check _worker.js`、`npm test`、`npm run check:size`、秘密/机器路径/二进制卫生、`git diff --check`。
  - Pages：`npm test`、`npm run lint`、现有本地 TypeScript CLI `--noEmit`、`npm run build`、`npm run test:e2e`、`npm run release:build`、发布清单复算、`git diff --check`。
  - 成对门：版本/API/range、路由、静态资产、退役名、当前候选 rollback、独立 checkout、离线边界与 evidence audit。
- receipt：使用全新 `S22-R25` / `run-20260822-s22-r25-01`，create-new，不复用 R23；固定验证 ID 和 evidence 语义必须由受测试 auditor 验证。
- 终态：只允许 `LOCAL CANDIDATE / RELEASE HOLD`；再进入 `@uxu-code:ship`。

## 4. 审查 finding 对账

| finding | 处理 |
|---|---|
| 上游正文可越过 10 秒 | R24 RED/GREEN，计时器延后至正文消费完成 |
| 失败请求可连续触发上游 | 恢复明确的 30 秒客户端冷却；服务端仍由 super_admin、同源和成功快照约束，不新增未经规格定义的 D1 写或负缓存 |
| 权限降级保留告警 | 禁用/账户变更清空状态，abort 后响应不得落地，Provider 检查 `enabled` |
| Adaptive 抽样未验证 | 请求并校验 `sampleInterval === 1`，否则不可用 |
| Pages 解析仅校验类型 | 重算时间、额度、warnings 与 level 语义 |
| 离线导航漏计 | 导航前取基线，导航后先断言零外部增量，再独立验证拒绝代理 |
| Pages-only checkout 不自包含 | 性能基线迁入 Pages，隔离测试覆盖活动 E2E/helper |
| rollback 仍是旧候选 | 生成新的 Section 22 当前候选回滚证明 |
| receipt/evidence 审计过宽 | 固定验证 ID、证据 schema/结论/身份与内容卫生 |

## 5. 失败与回滚

- 任一 RED 无法稳定复现、官方 GraphQL 字段不支持、保护输入发生外部漂移或完整门失败时立即保持 `RELEASE HOLD`，不部署。
- 产品修复可按本轮 diff 回滚；不修改 D1 数据、Cloudflare 变量或 Secret。
- R21—R23 是只读历史，不清理其 1.67 GB 本地快照，不把这些未跟踪快照隐式加入发布提交。

## 6. 授权边界

- 本计划的本地修复、测试、review 与 ship 已由持续目标及 `@uxu-code:build auto` 授权。
- commit、push、GitHub Pages 发布、Cloudflare Worker 部署与生产烟测仅在 ship GO 后按用户已明确批准的部署目标执行。
- 不远程删除遗留 `CF_WORKER_SCRIPT_NAME` 或 `CF_D1_DATABASE_ID`，不创建或轮换 Token。
