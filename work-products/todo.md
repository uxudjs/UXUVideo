# UXUVideo Worker / UXUV-Pages 迁移任务清单

计划依据：`work-products/SPEC.md`（Approved）。执行细节、验收、验证和回滚见 `work-products/plan.md`。

## Phase 0：基线

- [x] T01 冻结脏工作树基线，区分现有失败与新回归，恢复可重复验证入口。

## Phase 1：合同与交付外壳

- [x] T02 以 RED 合同建立 22 路由 Worker 外壳、统一错误/版本头/日志。
  - 复验：聚焦合同 6/6、工作流测试 13/13、应用测试 80/80、Lint 0 错误（60 条旧警告）、生产构建与 `git diff --check` 通过。
- [x] T03 在空的 `../UXUV-Pages` 建立本地静态导出骨架；不创建远端内容。
  - RED 0/3 → GREEN 3/3；`npm ci`、Lint、8 路由静态构建通过，本地 HTTP 8/8 返回 200 且无表单/密码输入。内置浏览器拦截 localhost，未形成可视化或公开 Pages 证据。
- [x] T04 生成不可变 release manifest、SHA-256/SRI/MIME 与覆盖保护。
  - 正式清单：Pages `0.1.0`，commit `4005dba7a806e50346b868b1ef2fb2c070bc4c76`，API Contract 1，8 路由/86 资产；测试 7/7、Lint、类型检查、静态构建通过，两次 `release:build` 创建后验证一致，manifest SHA-256 `81f814a23ff699744ac684615d6540b4a1adf88c5054eba5b90062e5d466dc62`。
- [x] T05 Worker 固定 Pages 版本并实现完整性、缓存、404/503 与安全回退。
  - 固定公开 Pages `0.1.1`、源提交与清单 SHA；跨仓真实发布字节测试 RED 0/1 → 分段 GREEN 1/7 → 7/7，Worker 联合合同 13/13、应用 80/80、Lint 0 错误（60 条旧警告）、语法、生产构建与 `git diff --check` 通过。本地 Worker 对公开 `/settings` 只读实测返回 200/6868 字节；无已验证上一版本，429/5xx 安全失败为 503，不回退可变 URL。该证据不代表 Cloudflare 已部署。
- [x] CP1 通过：骨架可验证、无可变 Pages URL、旧 Next 尚未删除。

## Phase 2：身份、配置与同步

- [x] T06 建立幂等 D1 schema、索引、row metrics 与 8.6 Free 预算测试。
  - RED 0/1 → GREEN 4/4；四表/五索引通过单次 `DB.batch()` 幂等初始化，缺 DB/普通故障/配额分别失败关闭，9 项有界查询合同与脱敏 row metrics 已锁定。按 Cloudflare 官方索引计数及每次限流的双持久桶重算：25,500 次逻辑变更、510,000 行读、42,100 行写、12 MiB 存储，低于项目警戒线；联合合同 17/17、应用 80/80、Lint 0 错误（60 条旧警告）、语法、生产构建与差异检查通过。未创建真实 D1；真实 `meta`/EXPLAIN 仍属于远端门。
- [x] T07 实现认证、会话、账户、Premium 与持久低频限流 Worker 切片。
  - 分片 RED/GREEN 覆盖初始化管理员、PBKDF2、哈希会话 Cookie、登出撤销、每账户 5 会话、8 账户上限、仅 super_admin 管理、最后一个 super_admin 原子保护、改密/删除撤销、Premium 会话授权，以及登录/Premium/账户变更双桶 D1 限流。安全边界验证同源 Origin 在 D1 前拒绝，明文凭据、Secret 与原始 token 不进入 D1、响应体或日志。Worker 工作产品 34/34、应用 80/80、Lint 0 错误（60 条旧警告）、Worker 语法与生产构建通过。未创建或迁移真实 D1，未配置 Secret，未部署。
- [x] T08 迁移登录、权限和账户管理 Pages 切片；Pages 直接入口无凭据提交。
  - Pages 实现 Cookie-only PasswordGate、会话上下文、super_admin 权限门与账户创建/改权/删除 UI；`.github.io` 在认证请求前进入公开提示。静态合同 12/12、Chrome 生产静态导出回归 5/5、Lint、TypeScript 与 10 页生产构建通过；覆盖直连零认证请求、登录/退出、账户 CRUD、普通用户隔离、加载/过期会话、错误重试、零 localStorage 凭据及成功路径零控制台错误。未提交、推送或部署。
- [x] T09 实现 `/api/config`、RuntimeConfigProvider 与 config/session 启动态。
  - Worker `/api/config` 分离公开版本/站点/能力/广告/第三方开关与认证源配置，未登录不返回订阅/IPTV URL，viewer 无 `iptv_access` 时 IPTV 源为空，VideoTogether 默认关闭且仅接受 HTTPS。Pages 根 Provider 对 8 个入口并行加载 config/session，直连 `.github.io` 零 API，统一加载/错误状态并注入标题、描述和图标。Worker 工作产品 35/35、应用 80/80、Pages 静态合同 13/13、Chrome 回归 5/5、两仓 Lint（主仓 60 条旧警告）、类型、语法及生产构建通过。未连接真实 D1，未提交、推送或部署；Pages 发布前仍须升级不可变版本。
- [x] T10 实现 config/library 的 ETag、CAS、409、合并和 tombstone。
  - `/api/user/config` 与 `/api/user/sync` 使用账户/文档种类复合键、ETag/baseVersion 和 D1 原子 CAS；并发同版本写入仅一方成功，冲突返回含当前文档的 409。字段和记录按 `updatedAt` 收敛，删除墓碑保留 30 天；单账户/种类每分钟至多写一次，原始及合并后文档均限制 512 KiB。缺会话、跨源写入、D1 缺失/故障/配额均失败关闭。专注合同 14/14、Worker 工作产品 39/39、应用 80/80、Lint 0 错误（60 条旧警告）、Worker 语法、生产构建与差异检查通过。未连接真实 D1，未提交、推送或部署。
- [x] T11 迁移离线优先同步与配额错误 UI。
  - Pages 建立账户隔离的 config/library 本地文档队列、ETag/If-Match CAS 客户端、逐字段/记录合并与 30 天墓碑；本地修改先同步写入 localStorage，网络/存储故障与配额错误保持 dirty，恢复后显式重试。全局状态栏解释冲突、离线、等待写入和配额路径；设置页提供可观察的本地优先配置入口。纯函数 4/4、Pages 静态合同 17/17、Chrome 双 context/离线/配额回归 8/8、Lint、TypeScript、10 页生产构建与两仓差异检查通过。未连接真实 D1，未提交、推送或部署；Pages 发布前仍须升级不可变版本。
- [x] CP2 通过：D1/认证/同步在本地闭环，缺配置与冲突失败关闭。
  - 本地 stub 与 Chrome 双 context 已覆盖 D1 预算、登录/权限/会话、Runtime config、账户隔离同步、并发 409 合并、离线队列和配额提示。该检查点仅是本地闭环；不替代真实 Cloudflare D1、公开 Pages 或部署证明。

## Phase 3：内容与媒体

- [x] T12 建立 SSRF、头白名单、超时、字节上限、Streams、签名和并发预算基础。
  - URL/重定向逐跳校验、上游头白名单、50 次子请求与 6 个待响应头预算、超时映射、限长流、HMAC 子资源令牌及隔离级令牌桶均有回归；阶段完成时 Worker 51/51。
- [x] T13 分路由族实现 app-update、danmaku、detail、Douban、ping。
  - 7 条低扇出路由均要求会话并复用受控上游基础；目标回归 27/27、Worker 全量 57/57、`node --check _worker.js` 与 `git diff --check` 通过。
- [x] T14 分 ≤5 文件批次迁移首页、搜索展示与收藏静态切片。
  - Pages 首页/收藏页使用同源 SSE 搜索和同步文档，包含加载/空/错误、详情链接、继续观看与收藏增删；合同 19/19、Chrome E2E 10/10（含 320/768/1024/1440）、Lint/TypeScript/静态构建与两仓 `git diff --check` 通过。
- [x] T15 实现 search-parallel、Premium 聚合与 probe-resolution Worker 切片。
  - 同源 SSE 搜索、Premium 类型/分类聚合与清晰度探测均使用服务端会话、受控上游预算、Free/Paid 上限、取消传播及隔离级缓存；目标回归 27/27、Worker 全量 62/62、`node --check _worker.js` 与 `git diff --check` 通过。
- [x] T16 分页面族迁移搜索/Premium/探测 UI。
  - 搜索取消/错误/服务端能力、Premium 会话解锁/失效、分类/搜索/收藏/来源设置及按需清晰度探测均使用同源 API；Pages 合同 20/20、Chrome E2E 12/12（含四断点）、Lint/TypeScript/静态构建、Worker 62/62 与两仓 `git diff --check` 通过。
- [x] T17 分批实现 proxy 与 IPTV/stream，锁定 Range、HLS、token、取消和流式边界。
  - 首请求使用会话与 `iptv_access`，HLS 子资源使用 10 分钟精确 URL/路由/UA/Referer 绑定 token 且不读取 D1；同源 CORS、Range、20 秒响应头超时、1 MiB 清单上限、隔离级 IPTV 缓存、取消传播及流终止分类均有回归覆盖。定向 26/26、Worker 全量 66/66、`node --check _worker.js` 与 `git diff --check` 通过；未执行远端长流验证。
- [x] T18 分批迁移播放器与 IPTV 静态页面。
  - `/player` 与 `/iptv` 均为静态导出体验；详情/播放列表/媒体只访问 Worker 同源路径，HLS 生命周期、切集/切台取消、IPTV 权限/同步自定义源、token 过期和上游错误均有明确状态。Pages 合同 23/23、Chrome E2E 14/14（含四断点）、Lint/TypeScript/静态构建与两仓 `git diff --check` 通过。
- [x] CP3 通过：所有代理类路由满足安全/Free 预算；受控本地流不冒充远端证明。
  - Worker 全量 66/66，Pages 合同 23/23、Chrome E2E 14/14；证据仅覆盖本地 fixture、静态导出和本地 Chrome，不代表 Cloudflare、真实 IPTV 或 30 分钟远端 HLS。

## Phase 4：用量、PWA 与完整 Pages 体验

- [x] T19 实现 super_admin Cloudflare 用量 API、缓存/陈旧回退和 Token 零泄漏。
  - RED 0/5 → GREEN 5/5；权限/日志/路由聚焦回归 19/19，Worker 全量 71/71，旧应用单测 80/80，`node --check _worker.js` 通过。Cloudflare GraphQL 为官方合同对齐的 fixture 证据，尚未使用真实 Token 或远端请求。
- [x] T20 在主设置页加入用量卡和根级分级提醒。
  - usage-ui E2E RED 2/4 → GREEN 4/4；Pages 合同 23/23、Lint、TypeScript、生产 build 与完整 Chrome E2E 18/18 通过。覆盖 super_admin 四项指标、账户/项目边界、UTC 倒计时、陈旧/未配置/失败、全局 warning+ 横幅、普通用户/Pages 直访零请求、320/768/1024/1440 和卡片 axe 严重/关键 0。
- [x] T21 收口 PWA、8 页面、核心 E2E、a11y、控制台、网络与四断点。
  - 新增可安装 manifest、根级 Service Worker 与个人视频源设置；Service Worker 按当前候选 `uxuv-static-0.1.2` 清理旧缓存，并绕过 API、认证与媒体响应。Pages Node 合同 27/27、完整 Chrome E2E 21/21、Lint、TypeScript、生产 build、两仓 `git diff --check` 均通过；真实 `out/` 在临时工作区重算清单，8 个入口及 manifest/sw/icon 均进入逐字节校验。证据仅为本地静态导出与本地 Chrome，未覆盖公开 Pages。
- [x] CP4 通过：Pages 完整体验全绿，密码/Cookie/Token 扫描零命中。
  - 8 页面 × 320/768/1024/1440 的 axe serious/critical、横向溢出、控制台与敏感跨源门全绿；构建产物 `ADMIN_PASSWORD|AUTH_SECRET|CF_API_TOKEN|set-cookie:` 扫描 0 命中。未触碰不可变 `release/0.1.1`，也未发布新版本。

## Phase 5：删除旧实现与本地候选

- [x] T22 仅在替代合同全绿后分批移除 Next API、server、Upstash。
  - repository-boundary 守卫 RED 1/3 → GREEN 3/3；分批移除 21 个 `app/api` 路由、8 个 `lib/server` 模块、专用重试工具、7 个仅覆盖旧服务端的测试镜像及 `@upstash/redis`/`uncrypto` 锁文件条目。Worker 22 路由仍完整，Worker 全量 74/74、遗留 UI 单测 67/67、Lint 0 error、旧 UI 生产 build、`node --check _worker.js`、禁止项/跨仓引用扫描与两仓 `git diff --check` 全绿；未执行 commit、push 或部署。
- [x] T23 仅在 Pages 全面接管后收敛 UXUVideo 为 `_worker.js` 单文件交付。
  - worker-only 守卫 RED 1/4 → GREEN 4/4；候选移除旧 Next UI、静态资源、Node 构建配置/依赖、旧应用测试与旧验证框架，保留自包含 `_worker.js`、零依赖 Node 测试入口、本地压缩脚本、治理文档与 `work-products/`。README/CHANGELOG/贡献指南及仓库说明已改为 Worker 1.0.0 + Pages 0.1.1 合同。Worker 全量 74/74、边界聚焦 7/7、语法、秘密值扫描、运行时依赖扫描和 `git diff --check` 全绿；最终源码 143187 bytes，gzip level 9 为 34097 / 3145728 bytes。被安全审查阻止的本机忽略 `verification/` 缓存未递归删除，但候选中已无仍存在的已跟踪旧验证文件。
- [x] T24 运行两仓本地总门并记录精确候选 SHA/哈希与证据层级。
  - 执行时结论为 **NO-GO（发布身份未闭合）**；该阻塞随后由 CP5 闭合，详见 `work-products/local-gate.md`。当时最终门为 Worker 74/74、Pages 28/28、Playwright 21/21、Lint/TypeScript/Next 16.3.0 build/压缩/秘密扫描/diff 全绿，官方 registry 生产依赖审计 0 vulnerabilities；审查另以 RED/GREEN 修复 PWA 导航升级和短 `AUTH_SECRET` setup 缺陷。0.1.2 固定 build ID 的连续/冷安装清单哈希均为 `22c5d71ea5682e62c59aa062c1dc8a015949a4ef8a69b71367a393e90a5c490c`。当时尚无最终 commit/manifest，Worker 因此继续安全固定已发布 0.1.1。
- [x] CP5 通过：形成“可进入远端测试”的本地候选；未声明部署可用。
  - UXUV-Pages `0.1.2` 已发布：`main` commit `4bc847affa76755a5c99ce249d793aa43e0b83bb`、`gh-pages` commit `64cf5c2541e7c4165ca84bf5a1b5fdd48a20821b`、线上 manifest SHA-256 `27c06d4a2d3de542da0d6685fc89d8bf6d4d01f34ac52000fb8f1f3f8ec6f10c`，8 个业务路由与 71/71 资产均已验证。Worker 已同步精确 pin；完整性回归 RED 3/7 → GREEN 7/7，最终 Worker 74/74、语法、压缩、运行时依赖扫描、秘密值扫描与 `git diff --check` 全绿。该证据只闭合 Pages 发布身份和本地 Worker 候选，不证明 Cloudflare Worker/D1/HLS 可用。

## Phase 6：需另行授权

- [ ] **HOLD T25** 创建/修改测试 Worker + 测试 D1，执行 Cloudflare Free/row metrics/30 分钟受控 HLS 门。（Pages `0.1.2` 已发布；测试 Worker、D1、Analytics 与 HLS 门尚未授权或执行。）
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
- [x] 已批准并完成：`UXUV-Pages` 后续 commit、`main`/`gh-pages` push、Pages 分支源设置与 `0.1.2` 部署。
- [ ] 未批准：`UXUVideo` commit/push 或超出上述 Pages 发布的后续远端变更。
- [ ] 未批准：创建/修改真实 Worker、D1、Secret 或 Analytics Token。
- [ ] 未批准：Cloudflare 生产部署、生产数据迁移或不可逆 schema 变更。
