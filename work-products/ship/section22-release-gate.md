# Section 22 发布门

- 日期：2026-08-22
- 候选：`s22-review-remediation-20260822-13`
- 本地身份：Worker `2.0.0` / Pages `0.3.0` / API Contract `2` / Worker range `>=2.0.0 <3.0.0`
- 结论：`GO`
- 边界：仅表示当前双仓本地候选可进入已授权的 commit、push、GitHub Pages 与 Cloudflare Workers 发布；远程 CI、部署和生产烟测仍须逐层验证。

## Blocker

- 无。

## Recommended

- 先发布 Pages，并确认稳定路径 `/UXUV-Pages/app/release-manifest.json` 返回 Pages `0.3.0` / API `2`；再部署 Worker，避免新 Worker 在 Pages 尚未就绪时失败关闭。
- 保留 Cloudflare Dashboard 中可能残留的 `CF_WORKER_SCRIPT_NAME` 与 `CF_D1_DATABASE_ID`，本轮不远程删除，以维持旧 Worker 回滚能力。
- Worker 部署后验证根路由、`/api/config`、未认证安全边界、响应版本头、结构化日志；若用量配置存在，再验证 `super_admin` 用量路径与 GraphQL 失败关闭。

## Acknowledged

- 当前公开 Pages 根发布为 `0.2.1` / API `1`；新的 `/app/` 稳定路径部署前为 404。这是预期发布顺序风险，不是当前本地候选身份。
- 最近一次远程 Pages 发布在旧候选的 Test 步骤失败；此前两次成功。当前候选的 Pages Node 测试、lint、类型检查、build、release build 与 128/128 E2E 已本地通过，推送后仍必须等待远程工作流结果。
- 已知应用域名当前返回旧 Next.js 配置，不是 API v2；仓库与公开发布面未发现旧 v2。仓库外不可观测消费者无法被绝对排除，但没有触发规格中的已发现兼容冲突。
- Pages 默认 npm mirror 不实现 audit endpoint；改用 npm 官方 registry 后为 0 vulnerabilities。Worker 原生 audit 同样为 0 vulnerabilities。
- Cloudflare GraphQL 的真实账户响应、Dashboard 变量、D1 binding 与生产日志尚未验证；查询实现对不支持字段、抽样、截断和不完整聚合失败关闭，生产完成结论必须等待部署后烟测。
- 本地未安装 `gh` 或全局 Wrangler；发布将使用现有 Git 凭据、GitHub Actions 与已登录 Cloudflare Dashboard，并逐步确认实际授权状态。

## 证据

- Worker：语法通过；`npm test` 262/262；gzip 40,189 / 3,145,728 bytes；audit 0 vulnerabilities；diff check 退出码 0。
- Pages：Node 164 + 10；lint；TypeScript；build 9 pages / 23 client assets；E2E 128/128；release build；audit 0 vulnerabilities；diff check 退出码 0。
- 成对门：7 routes、72 assets、manifest/actual `IDENTICAL`、退役名 0、task temp empty。
- 回滚：双仓当前候选在隔离克隆中反向回到成对 HEAD，再正向恢复，1/1。
- 卫生与审计：候选卫生 10/10；receipt/evidence auditor 4/4；R25 严格回执与 evidence binding `IDENTICAL`。
- Review：代码质量、安全与测试三路只读审查 finding 均已对账并回归。
- 独立暂存检出复验：修复 Windows 换行与未跟踪空临时目录的可复现边界后，Worker 262/262、Pages 164 + 10、lint、TypeScript、build、release build、Section 21/22 回滚与候选卫生均在只含暂存内容的双仓检出中通过；大体积 snapshots 未进入候选。

## 发布步骤

1. 只提交本轮候选所需的源代码、测试、文档和小型可审计证据；排除 `work-products/debug/execution-baselines/` 的大体积快照与其他原始临时产物。
2. 对暂存候选做秘密扫描、diff check 与独立 checkout 验证。
3. 推送 Pages `main`，等待 `Publish GitHub Pages` 与 GitHub Pages 发布完成，验证 `/app/` 清单和资产。
4. 推送 Worker `main`，再通过已登录 Cloudflare Dashboard 部署当前 `_worker.js`，不修改 D1 数据或删除旧变量。
5. 执行生产烟测并保留远程结果；任一关键安全、兼容或可用性检查失败立即停止后续扩大。

## 回滚步骤

1. Pages 未就绪时不部署新 Worker；旧 Pages `0.2.1` / API `1` 继续服务旧入口。
2. Worker 烟测失败时恢复 Cloudflare 中上一版 Worker 部署，确认旧 API 与认证边界恢复。
3. Pages 烟测失败时把 `gh-pages` 恢复到上一份成功发布，确认旧根发布清单与资产恢复。
4. 回滚不修改 D1 schema、D1 数据、Secret 或旧 Analytics 变量；恢复后重新检查健康、版本头与关键路由。
