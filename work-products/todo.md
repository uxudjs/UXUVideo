# KVideo 4.9.19 完整复刻与定向 UI/更新任务清单

状态：**T54-T68、CP9-local 与 CP10-remote 均已完成；Worker 1.1.0、Pages 0.2.0 与生产 Edge 登录态复验已闭合；最终发布门 GO**。详细范围、验收、验证、依赖和回滚见 `work-products/plan.md`。

旧清单中已完成的 Worker/D1/登录/静态发布迁移继续作为架构基线；T42-T45 的 commit/SHA/pin 只记录 2026-08-10 的历史发布事实，不再是当前运行时发布合同。

## Phase 0：逐项权威基准

- [x] T01 冻结三方基线，用户能力使用稳定 ID，架构差异使用无 ID 登记表。
- [x] T02 为每个用户能力 ID 建立固定 KVideo 参考和 UXUV-Pages 0.1.2 RED。
- [x] CP0 固定提交、273 个用户能力 ID、截图/DOM 基准与逐 ID RED 可复验。（用户已批准首次视觉基线）

## Phase 1：首批可用纵向流程

- [x] T03 恢复 KVideo 浏览器依赖与兼容工具。
- [x] T04 复刻安全登录纵向切片，包含实际所需样式、原语和状态。
- [x] T05 复刻登录后的基础首页纵向切片。
- [x] T06 复刻全局导航、主题、语言与 TV 导航流程。
- [x] T07 闭合公开直访、设置缺失与会话失效流程。
- [x] CP1 登录、基础首页、导航/主题/语言/TV 均可独立 GREEN，无横向空基础层。

## Phase 2：首页、搜索与本地资料库

- [x] T08 复刻首页与豆瓣发现流程，包含 TV 遥控焦点。
- [x] T09 复刻标签管理、推荐与无限滚动。
- [x] T10 复刻搜索输入、历史、繁简转换和遥控操作。
- [x] T11 复刻搜索结果分组、卡片与徽章。
- [x] T12 复刻筛选、排序、延迟与清晰度探测。
- [x] T13 复刻收藏资料库与搜索收藏；只验本地行为。
- [x] T14 复刻历史资料库与管理；只验本地行为。
- [x] CP2 首页、搜索、收藏/历史本地能力对应 ID 转为 GREEN。

## Phase 3：全部设置

- [x] T15 复刻设置壳层、普通来源管理和遥控焦点；同步留给 T33。
- [x] T16 复刻导入、订阅、批量来源及 TV/遥控模态行为。
- [x] T17 复刻显示、主题、语言与搜索排序设置。
- [x] T18 复刻播放器、跳过、代理、弹幕与广告设置。
- [x] T19 复刻普通模式数据导入导出、版本检查和遥控模态。
- [x] T20 依赖 T19，复刻 Premium 来源/设置并独占完整普通/Premium JSON 往返闭环。
- [x] CP3 原设置分区、顺序、控件、本地数据和完整导入导出恢复。

## Phase 4：自定义播放器

- [x] T21 复刻播放页壳层、元数据、来源、选集、收藏及方向键隔离。
- [x] T22 复刻桌面自定义播放器控制层。
- [x] T23 复刻移动/TV 输入、全屏、PiP 与 Cast mock/禁用态；真实设备留给 T39。
- [x] T24 复刻 HLS/代理/卡顿/切源，并接入设置及历史自动记录/断点。
- [x] T25 复刻弹幕聚合、轨道与 Canvas。
- [x] T26 复刻广告过滤、自动跳过与自动连播。
- [x] CP4 自定义播放器及播放生命周期全部达到固定基准。

## Phase 5：IPTV 与 Premium

- [x] T27 复刻 IPTV 来源、分组、搜索、三级浏览和遥控导航。
- [x] T28 复刻 IPTV 多线路播放、兼容策略和 TV 快捷键。
- [x] T29 复刻 Premium 首页、推荐、分类、搜索和遥控网格。
- [x] T30 复刻 Premium 收藏/历史、本地物理隔离及遥控侧边栏/模态；同步留给 T34。
- [x] CP5 IPTV 与 Premium 全部小规模成功/失败路径闭环。

## Phase 6：PWA、同步、新增 UI 与设备

- [x] T31 复刻 PWA 安装与静态缓存生命周期；真实安装证据留给 T39/T54-T55。
- [x] T32 建立文档无关、可独立回滚的本地优先同步基础。
- [x] T33 逐类接入配置、来源与订阅同步。
- [x] T34 接入普通/Premium 收藏与历史同步。
- [x] T35 依赖 T33/T34，接入账户与所有文档类型的 D1 同步状态。
- [x] T36 按 KVideo 视觉接入 Cloudflare 用量卡。
- [x] T37 只汇总 TV、WebView 83、三语与 WCAG 证据；遗漏退回所属切片。
- [x] T38 复刻 VideoTogether mock/禁用、配置、CSP 和遥控菜单；不加载真实脚本。
- [x] T39 固定真实 VideoTogether 入口并以 Codex 内置浏览器完成临时房间流程；Cast 首方 API 合同 GREEN，真实设备由用户部署后验收且不作已验证声明。
- [x] CP6 本地功能、真实 VideoTogether 房间与分层第三方证据全绿；Cloudflare/PWA/Cast 实际环境仍属于用户部署验收。

## Phase 7：完整性与本地候选

- [x] T40 聚合既有证据闭合 273 个 ID：272 `pass`、1 `approved-difference`、零 `unverified`。
- [x] T41 八路由 × 四断点全页视觉连续两轮 32/32 GREEN；关键区 ≤0.005、DOM 主布局 ≤2 CSS px。
- [x] T42（历史）使 `.github/workflows/pages.yml` 校验 `expectedCommit == GITHUB_SHA` 并生成 artifact manifest，形成当时的内容冻结候选。
- [x] CP7（历史）矩阵零 `unverified`、视觉连续两轮全绿、`0.2.0` 候选可复现。

## Phase 8：历史精确身份结果

- [x] T43（历史）已提交并推送 UXUV-Pages，公开发布身份曾固定到 `75b3dfbc20fbcfbd8d298056e57f3c34ab65539b`。
- [x] T44（历史）已发布 `0.2.0`：`gh-pages` 为 `ebee3e674cbed5d7f577509162456823bd9a1da7`，公开 manifest 为 80 assets / `ddd6377e…175`。
- [x] T45（历史）已验证 80/80 公开资产字节哈希，并把本地 Worker pin 到 `0.2.0` / `75b3dfbc…539b` / `ddd6377e…175`；该 pin 现由 T49-T53 取代，未部署。
- [x] 原 T46-T48 已取代且禁止执行。

## Phase 9：Pages 兼容发布本地迁移

- [x] T49 已建立两仓 RED：UXUVideo 13/18 预期失败，UXUV-Pages 7/15 预期失败；根因均为旧 pin/旧发布结构，无测试语法或环境故障。
- [x] T50 已最小修改 `_worker.js`：聚焦门 18/18 GREEN，动态传播兼容 manifest 版本并流式返回资产；旧版本/commit/SHA pin 已移除，Pages 请求不携带对接密钥。
- [x] T51 已简化 UXUV-Pages 发布脚本/workflow：聚焦门 15/15 GREEN；使用单一 `release/current`、根目录发布和可修订同版本产物，移除 runtime/published commit/SHA/SRI 与版本目录逻辑。
- [x] T52 已同步 README/CHANGELOG/边界测试：Pages 无对接密钥，兼容小改可独立发布，仅 API Contract/`workerRange` 不兼容才需更新 Worker；文档边界门 5/5 GREEN。
- [x] T53 已跑五组合兼容矩阵与两仓全门：Worker 89/89、Pages 130/130、Playwright 107/107、lint/build/语法/体积/秘密/diff 门均通过；未执行 commit、push、Pages 发布或 Worker 部署。
- [x] CP8-local 已闭合：无 runtime commit/SHA/Pages 密钥；旧/新 manifest 均可由新 Worker 加载；同版本修订与新兼容版本无需 Worker；不兼容合同失败关闭。

## Phase 10：第 20 节本地定向 UI/更新增补

- [x] T54 只写顶部导航与首字符设置入口 RED，锁定四个删除项、普通/Premium href、Unicode/空名/直接文本和零全名泄露。
- [x] T55 只写全局更新、三列语言和默认图标 RED，并把新增合同纳入 UXUV-Pages `npm test`。
- [x] T56 只写 Worker `artifact=worker` RED，保护默认 metadata GET、鉴权和 23 路径合同。
- [x] CP9A 三组 RED 失败原因明确，既有无关合同仍 GREEN，未修改产品代码。
- [x] T57 让 `ContentNavigation` 删除 GitHub/收藏/独立设置/语言，只保留首字符设置入口及原品牌/IPTV/主题/退出能力。
- [x] T58 让普通/Premium 语言设置始终三等列，仅显示简体中文/繁體中文/English，保留三语持久化与其他 helper text。
- [x] T59 在同一 `/api/app-update` 路由实现鉴权、按需、限长、版本一致、SHA-256 和稳定 401/409/413/502 的 Worker 源码响应。
- [x] CP9B 顶栏、语言和 Worker artifact 分别 GREEN，三者可独立回滚。
- [x] T60 把旧版本设置组件迁为唯一全局更新控件，闭合五状态、单 overlay、焦点、重试和安全复制，不保留两份实现。
- [x] T61 只在认证 `application-shell` 挂载一次更新控件，并从普通/Premium 设置页移除大型版本首块；非认证分支零入口/零请求。
- [x] T62 闭合四断点、安全区、200% 缩放、reduced-motion、八路由单入口、无障碍和无卡片套卡片 E2E。
- [x] CP9C 单一全局控件、八路由/非认证边界、四断点与无障碍合同 GREEN。
- [x] T63 生成固定蓝灰色的 1024 PNG U/V 默认图标与六档/两 mask 审阅 fixture；运行时自定义图标继续优先。
- [x] T64 用户已审阅并明确批准图标、顶栏、版本入口/弹窗和语言区；第 20 节局部视觉基线已按原阈值冻结。
- [x] CP9D 用户已审阅并明确批准图标候选与受影响区域局部视觉基线。
- [x] T65 已运行两仓全门并闭合 SPEC 20.10；结果仅代表本地工作树候选。
- [x] CP9-local 顶栏、语言、全局更新、按需复制、U/V 图标与局部视觉审批全部闭合，未 commit/push/发布/部署。

## Phase 11：一次性远端迁移与清理

- [x] **T66** Worker `1.1.0` 已部署，公开/控制台冒烟与 Edge 生产登录态 artifact 复制、版本、源码 SHA-256 均通过。
- [x] **T67** 已授权并发布第 20 节 Pages；两个 Actions workflow 成功，公开字节一致，`gh-pages` 旧版本目录为零。
- [x] **T68** `@uxu-code:ship` 已重跑；部署身份、公开字节、生产 Edge 登录态 artifact/设置 UI 与两仓最终门全部通过，结论 GO。
- [x] CP10-remote 公开根 manifest/路由/版本头和第 20 节 UI 正确，旧版本目录清理完成，后续兼容 Pages 小改无需重新部署 Worker。

## 每任务固定检查

- [x] 只处理一个任务或明确的 ≤5 文件子批次，未清理相邻代码。
- [x] 产品修改前已有该用户能力 ID 对固定 0.1.2 commit 的可执行 RED；遗漏立即退回 T01/T02。
- [x] 当前切片同步闭合三语、键盘/焦点、适用四断点、TV/遥控和错误/空/加载状态。
- [x] 新测试位于相应仓库 `work-products/tests/`，仓库文件引用使用相对路径。
- [x] 更新对应矩阵 ID 和证据，不以源码字符串、路由存在或页面 200 代替行为证明。
- [x] 运行聚焦测试、相关检查点和 `git diff --check`。
- [x] 未 reset/checkout/覆盖用户工作；本地实施未删除任何远端发布物。
- [x] 未记录 Secret、密码、Cookie、真实账户、订阅或完整媒体 URL。
- [x] 明确本地、第三方 mock/真实、Actions artifact、gh-pages、公开 Pages、Worker deployment、D1 schema、真实媒体/设备证据层级。
- [x] Pages 请求未发送 Cookie、Authorization、Token、Secret 或任何对接密钥。
- [x] 任何版本头/运行时配置若包含 Pages 版本，都来自已验证 manifest，不来自 Worker 硬编码值。
- [x] 第 20 节只改 SPEC 20.7 表面；无 `.ico`、新依赖、新业务路由、认证/D1/media 变更或全站 CSS/组件库重写。
- [x] 默认 `/api/app-update` JSON 向后兼容；源码只在显式点击后获取，ahead/check-failed/loading 禁止复制，失败不复用陈旧候选。
- [x] 八个认证路由共享一个版本入口；公开/登录/加载/错误分支零入口、零提前更新请求。
- [x] T64 的图标和局部视觉基线于 2026-08-11 获用户明确批准，未通过自动快照接受或放宽阈值掩盖差异。

## 当前授权边界

- [x] 已批准：2026-08-11 Pages 兼容发布规格进入规划（用户调用 `@uxu-code:plan`）。
- [x] 已批准：2026-08-11 SPEC 第 20 节及 20.3 五项解释进入规划（用户直接调用 `@uxu-code:plan`）。
- [x] 已批准：用户于 2026-08-11 调用 `@uxu-code:build auto`，批准本次计划修订稿并授权连续本地实施 T54-T63。
- [x] 已批准并完成：用户调用 `@uxu-code:build auto` 后完成 T49-T53 本地实施。
- [x] 已批准：T39-T42 本地任务；真实 VideoTogether 脚本/临时房间已测试，真实 Cast 设备改为用户部署后验收，不阻断单文件 Worker 本地交付。
- [x] 已批准并完成：UXUV-Pages commit、push 与 `0.2.0` Pages 发布（T43-T44）。
- [x] 已批准：T54-T63 的本地产品、测试与图标候选实施；不含 commit、push、发布、部署或真实资源操作。
- [x] 已批准：用户于 2026-08-11 回复“批准四项候选”，批准图标、顶栏、版本入口/弹窗和语言区，并授权继续 T65 本地总门。
- [x] 已批准并执行：用户授权同步 Worker 1.1.0 权威源码、Cloudflare Worker 与 GitHub Pages 发布；T66-T67 与生产 Edge 登录态复验已完成。
- [ ] 未批准：真实 D1、Secret、Analytics Token、生产数据迁移或不可逆 schema 变更。
