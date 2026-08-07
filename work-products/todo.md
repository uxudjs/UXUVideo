# UXUVideo Worker / UXUV-Pages 迁移任务清单

计划依据：`work-products/SPEC.md`（Approved）。执行细节、验收、验证和回滚见 `work-products/plan.md`。

## Phase 0：基线

- [x] T01 冻结脏工作树基线，区分现有失败与新回归，恢复可重复验证入口。

## Phase 1：合同与交付外壳

- [x] T02 以 RED 合同建立 22 路由 Worker 外壳、统一错误/版本头/日志。
  - 复验：聚焦合同 6/6、工作流测试 13/13、应用测试 80/80、Lint 0 错误（60 条旧警告）、生产构建与 `git diff --check` 通过。
- [x] T03 在空的 `../UXUV-Pages` 建立本地静态导出骨架；不创建远端内容。
  - RED 0/3 → GREEN 3/3；`npm ci`、Lint、8 路由静态构建通过，本地 HTTP 8/8 返回 200 且无表单/密码输入。内置浏览器拦截 localhost，未形成可视化或公开 Pages 证据。
- [ ] T04 生成不可变 release manifest、SHA-256/SRI/MIME 与覆盖保护。
  - 本地实现与合同已通过：测试 7/7，真实 `out/` 两次生成覆盖 8 路由/86 资产且清单字节一致；正式生成因 T04 源码尚未提交而失败关闭，等待独立 commit 授权后写入精确 SHA 并勾选。
- [ ] T05 Worker 固定 Pages 版本并实现完整性、缓存、404/503 与安全回退。
- [ ] CP1 通过：骨架可验证、无可变 Pages URL、旧 Next 尚未删除。

## Phase 2：身份、配置与同步

- [ ] T06 建立幂等 D1 schema、索引、row metrics 与 8.6 Free 预算测试。
- [ ] T07 实现认证、会话、账户、Premium 与持久低频限流 Worker 切片。
- [ ] T08 迁移登录、权限和账户管理 Pages 切片；Pages 直接入口无凭据提交。
- [ ] T09 实现 `/api/config`、RuntimeConfigProvider 与 config/session 启动态。
- [ ] T10 实现 config/library 的 ETag、CAS、409、合并和 tombstone。
- [ ] T11 迁移离线优先同步与配额错误 UI。
- [ ] CP2 通过：D1/认证/同步在本地闭环，缺配置与冲突失败关闭。

## Phase 3：内容与媒体

- [ ] T12 建立 SSRF、头白名单、超时、字节上限、Streams、签名和并发预算基础。
- [ ] T13 分路由族实现 app-update、danmaku、detail、Douban、ping。
- [ ] T14 分 ≤5 文件批次迁移首页、搜索展示与收藏静态切片。
- [ ] T15 实现 search-parallel、Premium 聚合与 probe-resolution Worker 切片。
- [ ] T16 分页面族迁移搜索/Premium/探测 UI。
- [ ] T17 分批实现 proxy 与 IPTV/stream，锁定 Range、HLS、token、取消和流式边界。
- [ ] T18 分批迁移播放器与 IPTV 静态页面。
- [ ] CP3 通过：所有代理类路由满足安全/Free 预算；受控本地流不冒充远端证明。

## Phase 4：用量、PWA 与完整 Pages 体验

- [ ] T19 实现 super_admin Cloudflare 用量 API、缓存/陈旧回退和 Token 零泄漏。
- [ ] T20 在主设置页加入用量卡和根级分级提醒。
- [ ] T21 收口 PWA、8 页面、核心 E2E、a11y、控制台、网络与四断点。
- [ ] CP4 通过：Pages 完整体验全绿，密码/Cookie/Token 扫描零命中。

## Phase 5：删除旧实现与本地候选

- [ ] T22 仅在替代合同全绿后分批移除 Next API、server、Upstash。
- [ ] T23 仅在 Pages 全面接管后收敛 UXUVideo 为 `_worker.js` 单文件交付。
- [ ] T24 运行两仓本地总门并记录精确候选 SHA/哈希与证据层级。
- [ ] CP5 通过：形成“可进入远端测试”的本地候选；未声明部署可用。

## Phase 6：需另行授权

- [ ] **HOLD T25** 发布不可变 Pages 候选并创建/修改测试 Worker + 测试 D1，执行 Cloudflare Free/row metrics/30 分钟受控 HLS 门。
- [ ] **HOLD T26** 对精确候选执行发布/回滚 GO/NO-GO；不自动 commit、push 或部署。
- [ ] CP6 通过：公开 Pages、测试 Cloudflare/D1 和受控长流证据齐全。

## 每任务固定检查

- [ ] 只处理一个任务或一个 ≤5 文件批次，未清理相邻代码。
- [ ] 新测试位于对应仓库 `work-products/tests/`，引用路径从最终位置相对解析。
- [ ] 先看到 RED，再做最小 GREEN；聚焦测试与 `git diff --check` 通过。
- [ ] 对比 T01 基线，未 reset/checkout/覆盖用户未提交改动。
- [ ] 未记录 Secret、密码、Cookie、真实账户、订阅或完整媒体 URL。
- [ ] 明确本地、Pages、Cloudflare 与真实第三方证据边界。

## 当前授权边界

- [x] 已批准：规格与本计划。
- [x] 已批准：本次 `@uxu-code:build auto` 范围内的本地业务实现。
- [x] 已批准：仅在 `UXUV-Pages` 创建初始 commit；已完成 `465d70cdf57c692960f5d092fa89f5bf29bfd73c`。
- [ ] 未批准：后续 commit 或任何 push。
- [ ] 未批准：创建/发布远端仓库或 GitHub Pages。
- [ ] 未批准：创建/修改真实 Worker、D1、Secret 或 Analytics Token。
- [ ] 未批准：生产部署、生产数据迁移或不可逆 schema 变更。
