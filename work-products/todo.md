# KVideo 4.9.19 完整复刻任务清单

状态：**执行中；T01-T45/CP0-CP7 已完成；T46-T48 的 Worker 提交、部署与最终发布门保持 HOLD**。详细范围、验收、验证、依赖和回滚见 `work-products/plan.md`。

旧清单中已完成的 Worker/D1/登录/静态发布迁移继续作为架构基线，但“UXUV-Pages 已全面接管 UI”结论已撤销；T03-T10 已按当前计划完成本地实现与验证。

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

- [x] T31 复刻 PWA 安装与静态缓存生命周期；真实安装证据留给 T39/T47。
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
- [x] T42 使 `.github/workflows/pages.yml` 校验 `expectedCommit == GITHUB_SHA` 并生成 artifact manifest，形成内容冻结候选。
- [x] CP7 矩阵零 `unverified`、视觉连续两轮全绿、commit→artifact 发布身份合同可复现；`0.2.0` 本地清单为 80 assets / `c0931c5b…3a80`。

## Phase 8：精确身份与远端门

- [x] T43 已提交并推送 UXUV-Pages，公开发布身份固定到 `75b3dfbc20fbcfbd8d298056e57f3c34ab65539b`。
- [x] T44 已发布 `0.2.0`：`gh-pages` 为 `ebee3e674cbed5d7f577509162456823bd9a1da7`，公开 manifest 为 80 assets / `ddd6377e…175`。
- [x] T45 已验证 80/80 公开资产字节哈希，并更新本地 Worker pin 到 `0.2.0` / `75b3dfbc…539b` / `ddd6377e…175`；未 commit、未部署。
- [ ] **HOLD T46** 经独立授权提交 UXUVideo，冻结 Git object Worker 字节和 schema/migration 哈希。
- [ ] **HOLD T47** 上传 T46 精确字节，绑定 deployment ID/digest/远端 schema，并执行旧组合完整状态合同。
- [ ] **HOLD T48** 由 `@uxu-code:ship` 对全部精确身份给出最终 GO/NO-GO。
- [ ] CP8 Pages/Worker 字节身份、远端 schema 与“旧 Worker + Pages 0.1.2 + 同一 schema”完整状态证据齐全。

## 每任务固定检查

- [ ] 只处理一个任务或明确的 ≤5 文件子批次，未清理相邻代码。
- [ ] 产品修改前已有该用户能力 ID 对固定 0.1.2 commit 的可执行 RED；遗漏立即退回 T01/T02。
- [ ] 当前切片同步闭合三语、键盘/焦点、适用四断点、TV/遥控和错误/空/加载状态。
- [ ] 新测试位于相应仓库 `work-products/tests/`，仓库文件引用使用相对路径。
- [ ] 更新对应矩阵 ID 和证据，不以源码字符串、路由存在或页面 200 代替行为证明。
- [ ] 运行聚焦测试、相关检查点和 `git diff --check`。
- [ ] 未 reset/checkout/覆盖用户工作，未删除或覆盖 `0.1.2`。
- [ ] 未记录 Secret、密码、Cookie、真实账户、订阅或完整媒体 URL。
- [ ] 明确本地、第三方 mock/真实、Actions artifact、gh-pages、公开 Pages、Worker deployment、D1 schema、真实媒体/设备证据层级。

## 当前授权边界

- [x] 已批准：新版 SPEC 进入规划。
- [x] 已批准：本最终修订计划（用户调用 `@uxu-code:build auto`）。
- [x] 已批准：`@uxu-code:build auto` 范围内的本地业务实现。
- [x] 已批准：T39-T42 本地任务；真实 VideoTogether 脚本/临时房间已测试，真实 Cast 设备改为用户部署后验收，不阻断单文件 Worker 本地交付。
- [x] 已批准并完成：UXUV-Pages commit、push 与 `0.2.0` Pages 发布（T43-T44）。
- [ ] 未批准：UXUVideo Worker commit、push、部署及 T46-T48 远端状态变更；本轮不执行。
- [ ] 未批准：真实 D1、Secret、Analytics Token、生产数据迁移或不可逆 schema 变更。
