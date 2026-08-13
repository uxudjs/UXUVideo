# UXUVideo KVideo 迁移发布门（2026-08-13）

## 当前结论

**GO**。

产品代码、Pages 发布、Cloudflare Worker 部署、公开版本合同、KVideo 功能矩阵与生产 Edge 登录态复验均已闭合。该结论只判定当前已部署的精确 Worker/Pages 候选可发布，不授权新的提交、推送、部署或 D1/Secret 变更。

## 已闭合证据

- KVideo 固定基准：commit `28334f41407082ae1028fa4a4180bcc46d31c52a`、版本 `4.9.19`。
- 功能矩阵：`work-products/kvideo-parity-matrix.md` 共 273 项，272 个 `pass`、1 个 SPEC 13.3 `approved-difference`、零 `unverified`。
- Worker 权威源码：UXUVideo commit `9ba3f19d9743dd8c1aa5370686ffde93b3c1e595`；本地与 GitHub 原字节均为 165,661 bytes，SHA-256 均为 `d0640a7fc6655c70c7c3dab962ec0c7bbef1d1eb73b13307ece43e292074b09b`。
- Cloudflare：`my-blog` 活动且最新部署为 `a9872e9d`；编辑器无待部署改动。控制台实时请求日志连续返回 `200`，记录 Worker `1.1.0`、Pages `0.2.0`、API Contract `1`、`errorCode: null`。
- 公开 Worker：根页面、`/api/config`、匿名 session 均成功；CSP/HSTS 存在；未登录 artifact 返回稳定 `401 AUTH_REQUIRED`。
- Pages：UXUV-Pages `main` 为 `269cc6bceddfb081d73665e1dc035920fb238bbc`；发布 workflow `31620747975` 成功，系统 Pages workflow `31620826087` attempt 2 成功，`gh-pages` 为 `37e7b3ce8092102df8af161ba472aa2535b21a0f`。
- 公开资产：80 个资产加 manifest 与发布候选逐字节一致，零 mismatch；远端 tree 无 `0.1.2/`、`0.2.0/` 旧目录。
- 图标：生产 Worker、GitHub Pages 与 `../UXUV-Pages/public/icon.png` 完全一致，22,124 bytes，SHA-256 `853e99eb22093ee759d30a05e18a33de86cb4deb5cbe8c094afa391a3251b91d`；六档与两种 mask 预览已获用户批准。
- 本地门：UXUVideo 98/98；UXUV-Pages 139/139；Playwright 111/111；lint、TypeScript、生产构建、release 构建、Worker 语法/体积、秘密扫描、便携路径扫描和 `git diff --check` 均通过。
- 依赖审计：无 high/critical；Pages 仅有开发依赖 `esbuild@0.27.7` 的 low 告警，不进入静态生产运行时，强制修复会跨破坏性版本。
- Edge 生产登录态：右上角版本入口显示 `1.1.0`；弹窗当前/最新版本均为 `1.1.0`，点击复制后显示“最新 _worker.js 已复制”。系统剪贴板 CRLF 文本为 169,879 bytes；换行标准化后为 165,661 bytes，SHA-256 为 `d0640a7fc6655c70c7c3dab962ec0c7bbef1d1eb73b13307ece43e292074b09b`，源码内 `WORKER_VERSION` 为 `1.1.0`。
- Edge 设置界面：主页用户入口仅显示 `A`，可进入设置；设置页没有版本区块。“简体中文 / 繁體中文 / English”为同一 grid 行、三个 266 px 等宽按钮，8 px 间距；语言容器无 `small` 或说明段落。
- 最终复跑：UXUVideo 98/98、Worker 语法通过、gzip 39,474/3,145,728 bytes；UXUV-Pages 139/139、lint、TypeScript、生产构建、release 构建、Playwright 111/111；两仓 `git diff --check`、高置信秘密扫描与用户机器路径扫描通过。
- 精确身份：UXUVideo HEAD `9ba3f19d9743dd8c1aa5370686ffde93b3c1e595`、UXUV-Pages HEAD `269cc6bceddfb081d73665e1dc035920fb238bbc`，均与各自 `origin/main` 一致。Pages 工作树干净；UXUVideo 仅有本发布门过程文档未提交，不改变已部署候选。

## Blocker

- 无。

## Recommended

- 继续观察 Cloudflare `request.complete` 的 5xx、artifact 失败码与版本头；出现版本/字节不一致时按下方回滚。
- 跟踪 Pages 开发依赖 `esbuild@0.27.7` 的 low 告警；不要执行会跨破坏性版本的 `npm audit fix --force`，在下一次依赖升级中单独验证 `0.28.x`。

## 已闭合的原阻断证据

1. 已在 Edge 登录态打开 `https://uxuv.uxudjs.dpdns.org/`。
2. 已打开右上角版本入口并点击复制 Worker。
3. 弹窗与源码内 `WORKER_VERSION` 均为 `1.1.0`；复制内容与权威源码同一 SHA-256。
4. 已复核复制成功反馈、用户名设置入口、设置页无版本区块和三列语言布局。

## Acknowledged

- Edge 扩展未直接暴露 artifact 响应头；生产 UI 的已认证复制内容与权威 Worker 原字节一致，响应头合同由自动化测试覆盖。该可观测性缺口不改变复制 artifact 身份，也不构成本次发布阻断。
- 未执行真实 D1 schema/数据迁移、Secret 或 Analytics Token 修改；这些操作不属于本次发布范围。
- 过程文档仍在 UXUVideo 本地工作树中，未提交、未推送；本次 GO 针对已经部署且由 commit/SHA 固定的产品 artifact。

## 回滚

- Pages UI 回归：重新发布上一兼容 Pages artifact 到根目录；Worker 与 D1 保持不变。
- Worker artifact/兼容合同回归：在 Cloudflare 恢复上一 Worker deployment；不修改 D1 schema。
- 当前未执行真实 D1 schema/数据迁移、Secret 或 Analytics Token 修改。
