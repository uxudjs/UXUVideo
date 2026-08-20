# KVideo 4.9.19 完整复刻对照矩阵

状态：**T40 Final；250 个当前用户能力已闭合为 249 个 `pass` 与 1 个 `approved-difference`；另保留 23 个 `approved-retired-by-SPEC-21` 历史行，零 `unverified`、零缺失映射**

权威源码：UXUVideo commit `28334f41407082ae1028fa4a4180bcc46d31c52a`（KVideo `4.9.19`）。

本矩阵的每个用户能力 ID 都是独立验收项。状态只允许：

- `unverified`：尚未完成规定的 RED/GREEN 和证据闭环。
- `pass`：固定基准入口、目标实现、自动测试均已验证。
- `approved-difference`：仅限 SPEC 13.3，且备注必须引用允许差异类别。

测试映射缩写：

| 缩写 | UXUV-Pages 测试文件 |
| --- | --- |
| `FEAT` | `work-products/tests/kvideo-feature-parity.test.mjs` |
| `VIS` | `work-products/tests/kvideo-visual-parity.e2e.spec.ts` |
| `HS` | `work-products/tests/kvideo-home-search-parity.e2e.spec.ts` |
| `PLY` | `work-products/tests/kvideo-player-parity.e2e.spec.ts` |
| `SET` | `work-products/tests/kvideo-settings-parity.e2e.spec.ts` |
| `IPD` | `work-products/tests/kvideo-iptv-device-parity.e2e.spec.ts` |
| `APP` | `work-products/tests/app-flows.e2e.spec.ts` |
| `MEDIA` | `work-products/tests/media-flows.e2e.spec.ts` |
| `A11Y` | `work-products/tests/accessibility.e2e.spec.ts` |

## GLB：全局设计、导航与状态

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| GLB-001 | Liquid Glass 设计系统 | `app/styles/variables.css`, `glass.css` | UXUV-Pages:`app/globals.css` | VIS | pass | 全局 token 合同与 33 份固定视觉基线 GREEN |
| GLB-002 | 原导航结构 | `components/layout/Navbar.tsx` | UXUV-Pages:`components/ContentNavigation.tsx` | VIS, A11Y | pass | SPEC 20 用户批准的减层顶栏：删除四个重复入口，首字符直达设置；八路由、键盘与四断点 GREEN |
| GLB-003 | 普通/Premium 模式入口 | `components/layout/Navbar.tsx` | UXUV-Pages:`components/ContentNavigation.tsx` | HS, VIS | pass | 服务端 Premium 授权与模式入口 E2E GREEN |
| GLB-004 | 站点图标和文案 | `app/layout.tsx`, `SiteIconProvider.tsx` | UXUV-Pages:`app/layout.tsx`, `components/SiteIconProvider.tsx` | APP, VIS | pass | 蓝灰 U/V 默认图标与 RuntimeConfig 自定义 `site.iconUrl` 优先合同 GREEN |
| GLB-005 | 深色主题 | `ThemeProvider.tsx` | UXUV-Pages:`components/ThemeProvider.tsx` | SET, VIS | pass | 深色主题持久化与视觉 E2E GREEN |
| GLB-006 | 浅色主题 | `ThemeProvider.tsx` | UXUV-Pages:`components/ThemeProvider.tsx` | SET, VIS | pass | 浅色主题持久化与视觉 E2E GREEN |
| GLB-007 | 跟随系统主题 | `ThemeProvider.tsx` | UXUV-Pages:`components/ThemeProvider.tsx` | SET, VIS | pass | system 模式与 prefers-color-scheme E2E GREEN |
| GLB-008 | 主题过渡 | `ThemeSwitcher.tsx`, `transitions.css` | UXUV-Pages:`components/ThemeSwitcher.tsx`, `app/globals.css` | VIS | pass | 主题过渡与 reduced-motion 合同 GREEN |
| GLB-009 | 滚动位置恢复 | `ScrollPositionManager.tsx` | UXUV-Pages:`components/ScrollPositionManager.tsx` | APP | pass | 账户设置与 sessionStorage 恢复 E2E GREEN |
| GLB-010 | 返回顶部 | `components/ui/BackToTop.tsx` | UXUV-Pages:`components/ui/BackToTop.tsx` | APP, VIS | pass | 滚动阈值、键盘和返回顶部 E2E GREEN |
| GLB-011 | 搜索/页面加载动画 | `SearchLoadingAnimation.tsx` | UXUV-Pages:`components/HomeExperience.tsx`, `app/globals.css` | HS, VIS | pass | 搜索加载、空态和失败态 E2E GREEN |
| GLB-012 | 原图标系统 | `components/ui/Icon.tsx`, `ui/icons/*` | UXUV-Pages:`components/ui/Icon.tsx`, `components/ui/icons/*` | VIS, A11Y | pass | 图标包装、aria-hidden 与可访问名称合同 GREEN |
| GLB-013 | 原悬停、按下、禁用状态 | `components/ui/*`, `effects.css` | UXUV-Pages:`components/ui/*`, `app/globals.css` | VIS | pass | hover/active/disabled/focus-visible 视觉合同 GREEN |
| GLB-014 | 模态框与确认框行为 | `ModalBackdrop.tsx`, `ConfirmDialog.tsx` | UXUV-Pages:`components/settings/*Modal.tsx`, `lib/hooks/useDialogFocusTrap.ts` | SET, A11Y | pass | focus trap、Escape、遮罩和焦点恢复 E2E GREEN |

## HOM：主页、豆瓣、标签与推荐

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| HOM-001 | 电影/电视剧切换 | `app/page.tsx`, `useHomePage.ts` | UXUV-Pages:`components/home/DiscoverControls.tsx`, `components/HomeExperience.tsx` | HS, VIS | pass | T08 类型切换 E2E + 固定坐标 |
| HOM-002 | 豆瓣标签浏览 | `usePopularMovies.ts` | UXUV-Pages:`components/home/DiscoverControls.tsx`, `lib/content/api-client.ts` | HS | pass | T08 服务端标签 E2E |
| HOM-003 | 豆瓣分类浏览 | `usePopularMovies.ts` | UXUV-Pages:`components/HomeExperience.tsx`, `lib/content/api-client.ts` | HS | pass | T08 type/tag 同源查询 E2E |
| HOM-004 | 推荐内容区 | `PopularFeatures.tsx` | UXUV-Pages:`components/HomeExperience.tsx`, `components/home/MovieGrid.tsx` | HS, VIS | pass | T05-T08 加载/空/错误/网格截图 |
| HOM-005 | 个性化推荐 | `usePersonalizedRecommendations.ts` | UXUV-Pages:`components/home/hooks/usePersonalizedRecommendations.ts`, `components/HomeExperience.tsx` | HS | pass | T09 两条历史启用、已看排除、交错去重、缓存与独立分页 E2E |
| HOM-006 | 标签添加 | `TagManager.tsx` | UXUV-Pages:`components/home/TagManager.tsx` | HS | pass | T09 添加与账户/模式/类型隔离持久化 E2E |
| HOM-007 | 标签删除 | `TagManager.tsx` | UXUV-Pages:`components/home/TagManager.tsx`, `components/home/hooks/useTagManager.ts` | HS | pass | T09 自定义标签删除且默认热门不可删除 |
| HOM-008 | 标签恢复默认 | `useTagManager.ts` | UXUV-Pages:`components/home/hooks/useTagManager.ts` | HS | pass | T09 恢复服务端默认并自动退出管理态 E2E |
| HOM-009 | 标签拖拽排序 | `SortableTag.tsx` | UXUV-Pages:`components/home/TagManager.tsx`, `components/home/hooks/useTagManager.ts` | HS, A11Y | pass | T09 Pointer/KeyboardSensor、键盘排序持久化、管理态 axe |
| HOM-010 | 无限滚动 | `useInfiniteScroll.ts` | UXUV-Pages:`lib/hooks/useInfiniteScroll.ts`, `components/home/MovieGrid.tsx` | HS | pass | T09 热门/个性化分页、追加去重、短页停止与取消隔离 E2E |
| HOM-011 | 海报失败占位 | `MovieCard.tsx`, `placeholder-poster.svg` | UXUV-Pages:`components/home/MovieCard.tsx`, `public/placeholder-poster.svg` | HS, VIS | pass | T05/T08 失败回退与批准截图 |
| HOM-012 | 演员/导演点击搜索 | `components/player/VideoMetadata.tsx` | UXUV-Pages:`components/player/VideoMetadata.tsx` | PLY, HS | pass | 固定 Douban 人物搜索链接、分隔符解析与可访问名称 E2E |
| HOM-013 | 普通/Premium 首页隔离 | `app/page.tsx`, `app/premium/page.tsx` | UXUV-Pages:`components/HomeExperience.tsx`, `components/premium/PremiumExperience.tsx` | HS, APP | pass | T08 分流入口 + 既有双模式来源隔离 E2E |

## SEA：搜索

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| SEA-001 | 多源 SSE 增量结果 | `useParallelSearch.ts`, `search-stream.ts` | UXUV-Pages:`lib/content/search-client.ts`, `components/HomeExperience.tsx` | HS | pass | 同源 SSE 增量、乱序和终止事件 E2E GREEN |
| SEA-002 | 搜索取消 | `useSearchAction.ts` | UXUV-Pages:`useSearchAction.ts` | HS | pass | AbortController 上游取消与保留增量结果 E2E 通过 |
| SEA-003 | 搜索历史查看 | `SearchHistoryDropdown.tsx` | UXUV-Pages:`components/search/SearchHistoryDropdown.tsx`, `lib/hooks/useSearchHistory.ts` | HS, VIS | pass | T10：账户/模式隔离、20 条容量及最近 10 条下拉；静态 44/44、E2E 47/47 |
| SEA-004 | 搜索历史复用 | `SearchHistoryListItem.tsx` | UXUV-Pages:`components/search/SearchBox.tsx`, `lib/hooks/useSearchHistory.ts` | HS | pass | T10：点击、Enter 与循环方向键复用原始查询；E2E 47/47 |
| SEA-005 | 搜索历史单项删除 | `SearchHistoryListItem.tsx` | UXUV-Pages:`components/search/SearchHistoryDropdown.tsx`, `components/search/SearchBox.tsx`, `lib/hooks/useSearchHistory.ts` | HS | pass | T10：指针与 Delete 键删除高亮项；axe 严重/关键 0，E2E 47/47 |
| SEA-006 | 搜索历史清空 | `SearchHistoryHeader.tsx` | UXUV-Pages:`components/search/SearchHistoryDropdown.tsx`, `lib/hooks/useSearchHistory.ts` | HS | pass | T10：立即清空当前账户/模式历史且不跨作用域；E2E 47/47 |
| SEA-007 | 繁简转换 | `chinese-convert.ts` | UXUV-Pages:`lib/utils/chinese-convert.ts`, `components/HomeExperience.tsx` | HS | pass | T10：仅 Worker-bound 查询转简体，输入与历史保留原文；静态 44/44、E2E 47/47 |
| SEA-008 | 普通结果展示 | `VideoGrid.tsx` | UXUV-Pages:`VideoGrid.tsx` | HS, VIS | pass | 增量 SSE、四断点固定基线与 axe 通过 |
| SEA-009 | 同名结果合并 | `VideoGroupCard.tsx` | UXUV-Pages:`VideoGroupCard.tsx` | HS | pass | trim + 不区分大小写分组 E2E 通过 |
| SEA-010 | 来源筛选 | `SourceBadges.tsx` | UXUV-Pages:`components/search/SearchResultControls.tsx` | HS | pass | 多选来源筛选与清除 E2E 通过 |
| SEA-011 | 类型筛选 | `TypeBadges.tsx` | UXUV-Pages:`components/search/SearchResultControls.tsx` | HS | pass | 规范化类型组合筛选 E2E 通过 |
| SEA-012 | 分组展开状态持久化 | `VideoGroupCard.tsx` | UXUV-Pages:`VideoGroupCard.tsx` | HS | pass | 展示模式按账户/模式隔离，分组来源会话状态可恢复 |
| SEA-013 | 来源徽章 | `SourceBadgeList.tsx` | UXUV-Pages:`SourceBadgeList.tsx` | HS, VIS | pass | 固定基线与字段 E2E 通过 |
| SEA-014 | 类型徽章 | `TypeBadgeList.tsx` | UXUV-Pages:`TypeBadgeList.tsx` | HS, VIS | pass | hover/focus 字段 E2E 通过 |
| SEA-015 | 语言徽章 | `LanguageBadges.tsx` | UXUV-Pages:`LanguageBadges.tsx` | HS, VIS | pass | 固定字段 E2E 通过 |
| SEA-016 | 清晰度徽章 | `useResolutionProbe.ts` | UXUV-Pages:`components/ResolutionProbeButton.tsx` | HS, VIS | pass | 同源按需探测，成功/失败且卡片保留 E2E 通过 |
| SEA-017 | 内容类目屏蔽 | `settings-store.ts` | UXUV-Pages:`lib/hooks/useSearchResultPreferences.ts` | HS, SET | pass | 账户/模式键、20 项有界持久化与过滤 E2E 通过 |
| SEA-018 | 实时来源延迟 | `useLatencyPing.ts` | UXUV-Pages:`lib/hooks/useLatencyPing.ts` | HS | pass | 显式启用、两源请求计数与失败保留策略通过 |
| SEA-019 | 相关性排序 | `lib/utils/sort.ts` | UXUV-Pages:`lib/utils/search-result-policy.ts` | HS | pass | 原始索引稳定 tie-break 合同通过 |
| SEA-020 | 延迟排序 | `lib/utils/sort.ts` | UXUV-Pages:`lib/utils/search-result-policy.ts` | HS | pass | 未知延迟末置与同源稳定顺序 E2E 通过 |
| SEA-021 | 发布时间排序 | `lib/utils/sort.ts` | UXUV-Pages:`lib/utils/search-result-policy.ts` | HS | pass | 升降序与稳定 tie-break 合同/E2E 通过 |
| SEA-022 | 评分排序 | `lib/utils/sort.ts` | UXUV-Pages:`lib/utils/search-result-policy.ts` | HS | pass | 数值规范化与稳定 tie-break 合同通过 |
| SEA-023 | 名称排序 | `lib/utils/sort.ts` | UXUV-Pages:`lib/utils/search-result-policy.ts` | HS | pass | zh-CN 双向排序与稳定 tie-break 合同通过 |
| SEA-024 | 搜索加载/空/失败状态 | `SearchResults.tsx`, `NoResults.tsx` | UXUV-Pages:`components/HomeExperience.tsx`, `components/search/SearchResults.tsx` | HS, VIS | pass | 加载、取消、空、失败状态与完整 E2E 通过 |

## SRC：来源、导入与订阅

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| SRC-001 | 既有账户来源兼容展示 | `SourceManager.tsx` | UXUV-Pages:`SourceManager.tsx` | SET, VIS | pass | 既有 legacy 来源保留为用户管理的“单独添加”来源，不显示系统默认徽章 |
| SRC-002 | 统一来源管理 | `UserSourceSettings.tsx` | UXUV-Pages:`SourceSettings.tsx`, `SourceManager.tsx` | SET | pass | 所有独立来源统一在视频源管理中添加、编辑与删除；订阅导入单独标记 |
| SRC-003 | Premium 来源展示 | `PremiumSourceSettings.tsx` | UXUV-Pages:`SourceSettings.tsx` | SET | pass | Premium 来源 CRUD/导入已由 T20 验证；T33 双 context payload 证明 Premium 记录在普通来源同步后保持独立 |
| SRC-004 | 添加来源 | `AddSourceModal.tsx` | UXUV-Pages:`AddSourceModal.tsx` | SET | pass | 中英文名称添加与本地文档断言 |
| SRC-005 | 编辑来源 | `SourceManager.tsx` | UXUV-Pages:`SourceManager.tsx` | SET | pass | `kvideo-settings-sources.e2e.spec.ts` |
| SRC-006 | 启停来源 | `SourceManager.tsx` | UXUV-Pages:`SourceManager.tsx` | SET | pass | `kvideo-settings-sources.e2e.spec.ts` |
| SRC-007 | 删除来源 | `SourceManager.tsx` | UXUV-Pages:`SourceManager.tsx` | SET | pass | 确认框、tombstone 与取消路径 |
| SRC-008 | 来源上移 | `SourceManager.tsx` | UXUV-Pages:`SourceManager.tsx` | SET | pass | 按钮排序策略与浏览器顺序 |
| SRC-009 | 来源下移 | `SourceManager.tsx` | UXUV-Pages:`SourceManager.tsx` | SET | pass | 按钮排序策略与浏览器顺序 |
| SRC-010 | 来源拖拽排序 | `SourceManager.tsx` | UXUV-Pages:`SourceManager.tsx` | SET, A11Y | pass | 键盘 DnD 后顺序断言 |
| SRC-011 | 来源折叠/显示全部 | `SourceSettings.tsx` | UXUV-Pages:`SourceSettings.tsx` | SET, VIS | pass | 12→10/12 展开边界 |
| SRC-012 | JSON 粘贴导入 | `JsonImportTab.tsx` | UXUV-Pages:`ImportModal.tsx` | SET | pass | 写前预览、Secret 整批拒绝、重复/部分无效报告 E2E |
| SRC-013 | 文件导入 | `FileImportTab.tsx` | UXUV-Pages:`ImportModal.tsx` | SET | pass | 合成 JSON 文件预览与 Escape 取消零写入 |
| SRC-014 | 链接导入 | `LinkImportTab.tsx` | UXUV-Pages:`ImportModal.tsx`, Worker:`/api/source-import` | SET | pass | 已认证同源边界、SSRF/重定向/512 KiB 限制与危险地址拒绝 |
| SRC-015 | 订阅导入 | `SubscriptionImportTab.tsx` | UXUV-Pages:`ImportModal.tsx` | SET | pass | 受控读取、预览确认后才写入来源与订阅 |
| SRC-016 | 订阅添加 | `useSubscriptionSync.ts` | UXUV-Pages:`SourceSettings.tsx` | SET | pass | 账户 config subscriptions 记录与来源 ID 绑定 |
| SRC-017 | 订阅更新 | `useSubscriptionSync.ts` | UXUV-Pages:`ImportModal.tsx` | SET | pass | 同订阅来源可预览更新，失败状态保留 |
| SRC-018 | 订阅管理/删除 | `SubscriptionImportTab.tsx` | UXUV-Pages:`ImportModal.tsx` | SET | pass | 确认删除只写 tombstone，不删除既有来源 |
| SRC-019 | 来源字段和 URL 校验 | `useAddSourceForm.ts` | UXUV-Pages:`useAddSourceForm.ts` | SET | pass | `source-settings-policy.ts` HTTP(S)/ID/默认路径 |
| SRC-020 | 来源错误提示 | `AddSourceModal.tsx` | UXUV-Pages:`AddSourceModal.tsx` | SET, VIS | pass | 三语错误与不安全协议 E2E |
| SRC-021 | 来源账户隔离 | `user-sources-store.ts` | UXUV-Pages:`document-store.ts`, `SourceSettings.tsx` | SET, APP | pass | 双账户本地文档与双 context CAS E2E；账户键、普通/Premium group 均无串写 |

## FAV：收藏

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| FAV-001 | 搜索页一键收藏 | `FavoriteButton.tsx` | UXUV-Pages:`FavoriteButton.tsx` | HS | pass | `favorites-contract.test.mjs`、`app-flows.e2e.spec.ts` |
| FAV-002 | 播放页一键收藏 | `FavoriteButton.tsx` | UXUV-Pages:`components/player/PlayerFavoriteButton.tsx` | PLY | pass | 模式绑定的一键收藏/取消与 100 项上限边界 |
| FAV-003 | 收藏网格 | `FavoritesGrid.tsx` | UXUV-Pages:`FavoritesGrid.tsx` | HS, VIS | pass | `kvideo-favorites.e2e.spec.ts` 四断点与 axe |
| FAV-004 | 收藏列表 | `FavoritesList.tsx` | UXUV-Pages:`FavoritesList.tsx` | HS, VIS | pass | `kvideo-favorites.e2e.spec.ts` 网格/列表切换 |
| FAV-005 | 收藏侧边栏 | `FavoritesSidebar.tsx` | UXUV-Pages:`FavoritesSidebar.tsx` | HS, VIS | pass | `kvideo-favorites.e2e.spec.ts` 键盘开关与模式过滤 |
| FAV-006 | 收藏单项删除 | `FavoritesItem.tsx` | UXUV-Pages:`FavoritesItem.tsx` | HS | pass | `kvideo-favorites.e2e.spec.ts` 单项删除 |
| FAV-007 | 普通/Premium 收藏隔离 | `favorites-store.ts` | UXUV-Pages:`library-isolation.ts`, `FavoritesExperience.tsx` | HS | pass | 同视频 ID 双模式；双 context 离线/quota/CAS 删除各自保留显式 mode 与独立 ID |
| FAV-008 | 收藏容量提示 | `FavoritesPageContent.tsx` | UXUV-Pages:`FavoritesPageContent.tsx` | HS | pass | `kvideo-favorites.e2e.spec.ts` 100/100 边界 |
| FAV-009 | 收藏账户隔离 | `favorites-store.ts` | UXUV-Pages:`document-store.ts`, `FavoritesExperience.tsx` | HS, APP | pass | 双账户本地键隔离及同账户双 context CAS 收敛 E2E |
| FAV-010 | 收藏空状态 | `FavoritesEmptyState.tsx` | UXUV-Pages:`FavoritesEmptyState.tsx` | HS, VIS | pass | `kvideo-favorites.e2e.spec.ts` 空账户状态 |
| FAV-011 | 收藏继续播放入口 | `FavoritesItem.tsx` | UXUV-Pages:`FavoritesItem.tsx` | HS, PLY | pass | `kvideo-favorites.e2e.spec.ts` `/player` 参数路由 |

## HIS：观看历史

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| HIS-001 | 自动记录剧集 | `history-store.ts` | UXUV-Pages:`components/player/hooks/usePlaybackHistory.ts` | PLY | pass | `kvideo-desktop-player.e2e.spec.ts` 真实播放事件记录当前剧集 |
| HIS-002 | 自动记录播放进度 | `usePlaybackPolling.ts` | UXUV-Pages:`components/player/hooks/usePlaybackHistory.ts` | PLY | pass | 5 秒本地节流；切源后进度保持并更新 |
| HIS-003 | 自动记录时长 | `usePlaybackPolling.ts` | UXUV-Pages:`components/player/hooks/usePlaybackHistory.ts` | PLY | pass | 仅在有效 duration 下记录；E2E 100 秒 fixture |
| HIS-004 | 断点续播 | `useVideoPlayer.ts` | UXUV-Pages:`MediaPlayer.tsx`, `usePlaybackHistory.ts` | PLY | pass | 历史 42 秒恢复；切源 57 秒恢复 |
| HIS-005 | 同标题去重 | `history-store.ts` | UXUV-Pages:`components/player/hooks/usePlaybackHistory.ts` | PLY | pass | 三来源切换保持单一 source-agnostic 历史 ID；远端同步延迟 60 秒且跨重载保持 |
| HIS-006 | 历史单项删除 | `HistoryItem.tsx` | UXUV-Pages:`HistoryItem.tsx` | PLY | pass | `kvideo-history.e2e.spec.ts` 删除确认 |
| HIS-007 | 清空全部历史 | `HistoryHeader.tsx` | UXUV-Pages:`HistoryHeader.tsx` | PLY | pass | `kvideo-history.e2e.spec.ts` 清空确认与 Escape 取消 |
| HIS-008 | 最多 50 条可见行为 | `history-store.ts` | UXUV-Pages:`history-store.ts` | PLY | pass | `kvideo-history.e2e.spec.ts` 52→50 且不删溢出记录 |
| HIS-009 | 历史侧边栏 | `WatchHistorySidebar.tsx` | UXUV-Pages:`WatchHistorySidebar.tsx` | PLY, VIS | pass | `kvideo-history.e2e.spec.ts` 三语/键盘/四断点/axe |
| HIS-010 | 普通/Premium 历史隔离 | `history-store.ts` | UXUV-Pages:`library-isolation.ts`, `usePlaybackHistory.ts` | PLY | pass | 双模式 ID/mode 隔离；普通进度冲突合并不修改 Premium 历史 |
| HIS-011 | 历史账户隔离 | `history-store.ts` | UXUV-Pages:`document-store.ts`, `usePlaybackHistory.ts` | PLY, APP | pass | 双账户本地键隔离；同账户双 context 删除/离线进度 CAS 收敛且不复活 |

## PLY-A：播放器外观与内容结构

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| PLY-A001 | KVideo 自定义播放器 | `CustomVideoPlayer.tsx` | UXUV-Pages:`components/media/MediaPlayer.tsx`, `components/player/desktop/DesktopControls.tsx` | PLY, VIS | pass | 自定义控制层、快捷键、隐藏与四断点 E2E GREEN；未使用原生 controls 替代 |
| PLY-A002 | 播放页顶部导航 | `PlayerNavbar.tsx` | UXUV-Pages:`components/player/PlayerNavbar.tsx` | PLY, VIS | pass | 返回、模式主页、设置、主题与三语入口 E2E |
| PLY-A003 | 视频元数据 | `VideoMetadata.tsx` | UXUV-Pages:`components/player/VideoMetadata.tsx` | PLY, VIS | pass | 海报、徽标、简介、演员/导演与移动简介页 E2E |
| PLY-A004 | 来源选择器 | `SourceSelector.tsx` | UXUV-Pages:`components/player/EpisodeList.tsx` | PLY | pass | 当前来源、切源与短 URL 保持 E2E |
| PLY-A005 | 选集 | `EpisodeList.tsx` | UXUV-Pages:`components/player/EpisodeList.tsx` | PLY | pass | 当前集、切集、URL 与历史入口 E2E |
| PLY-A006 | 播放器错误状态 | `PlayerError.tsx`, `VideoPlayerError.tsx` | UXUV-Pages:`PlayerExperience.tsx`, `MediaPlayer.tsx` | PLY, VIS | pass | 缺参、来源缺失、详情失败与媒体失败关闭状态 |
| PLY-A007 | 播放器空状态 | `VideoPlayerEmpty.tsx` | UXUV-Pages:`PlayerExperience.tsx` | PLY, VIS | pass | 零剧集确定性空状态 E2E |
| PLY-A008 | 播放器/选集顶部对齐 | `video-player.css` | UXUV-Pages:`app/globals.css` | VIS | pass | 1440 px 实测差值不超过 2 CSS px |
| PLY-A009 | 剧集列表/网格切换 | `EpisodeList.tsx` | UXUV-Pages:`components/player/EpisodeList.tsx` | PLY | pass | 列表/网格与当前集焦点 E2E |
| PLY-A010 | 每 50 集分页 | `EpisodeList.tsx` | UXUV-Pages:`components/player/EpisodeList.tsx` | PLY | pass | 51 集的 1-50/51-51 边界 E2E |
| PLY-A011 | 来源前五条折叠/展开 | `source-list-utils.ts` | UXUV-Pages:`components/player/EpisodeList.tsx` | PLY | pass | 7 来源默认 5 条与展开剩余 2 条 E2E |
| PLY-A012 | 来源按类型分组 | `source-list-utils.ts` | UXUV-Pages:`components/player/EpisodeList.tsx` | PLY | pass | Movie/Series 分组 E2E |
| PLY-A013 | 短链接行为 | `urlUtils.ts` | UXUV-Pages:`PlayerExperience.tsx` | PLY | pass | 旧长参数迁移为短 `gs` 且切源保持 E2E |
| PLY-A014 | sessionStorage 播放参数 | `urlUtils.ts` | UXUV-Pages:`lib/media/grouped-sources-cache.ts` | PLY | pass | 只保留白名单来源字段、200 项/100 缓存上限 E2E |

## PLY-C：播放器控制

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| PLY-C001 | 播放/暂停 | `DesktopLeftControls.tsx` | UXUV-Pages:`components/player/desktop/DesktopLeftControls.tsx` | PLY | pass | 虚拟媒体时钟验证中央与底栏播放/暂停 |
| PLY-C002 | 进度拖动 | `DesktopProgressBar.tsx` | UXUV-Pages:`components/player/desktop/DesktopProgressBar.tsx` | PLY | pass | range 输入与 600 秒虚拟时钟 E2E |
| PLY-C003 | 音量调整 | `DesktopVolumeControl.tsx` | UXUV-Pages:`components/player/desktop/DesktopVolumeControl.tsx` | PLY | pass | 音量 range 与上下键 10% 步进 E2E |
| PLY-C004 | 静音 | `DesktopVolumeControl.tsx` | UXUV-Pages:`components/player/desktop/DesktopVolumeControl.tsx` | PLY | pass | M 键与可访问名称切换 E2E |
| PLY-C005 | 倍速 | `DesktopSpeedMenu.tsx` | UXUV-Pages:`components/player/desktop/DesktopSpeedMenu.tsx` | PLY | pass | 0.5x 至 2x 菜单与 1.5x 媒体状态 E2E |
| PLY-C006 | 快进 | `useSkipControls.ts` | UXUV-Pages:`components/player/hooks/useSkipControls.ts` | PLY | pass | 按钮、L 与右方向键遵循 10 秒设置 |
| PLY-C007 | 快退 | `useSkipControls.ts` | UXUV-Pages:`components/player/hooks/useSkipControls.ts` | PLY | pass | 按钮、J 与左方向键遵循 10 秒设置 |
| PLY-C008 | 系统全屏 | `useFullscreenControls.ts` | UXUV-Pages:`components/player/hooks/useFullscreenControls.ts` | PLY | pass | 标准/退出事件与不可用态 capability mock E2E |
| PLY-C009 | 网页全屏 | `web-fullscreen.css` | UXUV-Pages:`app/globals.css` | PLY, VIS | pass | 320px 网页全屏、Escape/退出与 body 锁定 E2E |
| PLY-C010 | 标准 PiP | `useUtilities.ts` | UXUV-Pages:`components/player/hooks/usePictureInPicture.ts` | PLY | pass | 标准 PiP 平台 API 合同 GREEN；真实设备由用户部署后验收 |
| PLY-C011 | Android PiP | `android-pip-utils.ts` | UXUV-Pages:`components/player/hooks/usePictureInPicture.ts` | PLY, IPD | pass | `KVideoAndroid` bridge 合同 GREEN；真实设备由用户部署后验收 |
| PLY-C012 | Google Cast | `useCastControls.ts` | UXUV-Pages:`components/player/hooks/useCastControls.ts` | PLY | pass | SDK mock 验证同源 `/api/proxy`、连接和断开；真实 Cast 由用户验收 |
| PLY-C013 | 控制栏自动隐藏 | `useControlsVisibility.ts` | UXUV-Pages:`components/player/hooks/useControlsVisibility.ts` | PLY | pass | 冻结时钟验证 2999ms 可见、3000ms 隐藏，重复 5/5 |
| PLY-C014 | 桌面控制布局 | `components/player/desktop/*` | UXUV-Pages:`components/player/desktop/*` | PLY, VIS | pass | 已批准 1440px 左侧关键区 `maxDiffPixelRatio: 0.005` |
| PLY-C015 | 移动控制布局 | `useMobilePlayer.ts` | UXUV-Pages:`lib/hooks/useMobilePlayer.ts`, `components/player/desktop/DesktopDeviceControls.tsx` | PLY, VIS | pass | 320/768/TV 截图检查；触控笔电不误降级为窄屏布局 |
| PLY-C016 | 双击手势 | `useDoubleTap.ts` | UXUV-Pages:`lib/hooks/mobile/useDoubleTap.ts` | PLY | pass | 同侧 300ms 双击左右各快退/快进 10 秒 E2E |
| PLY-C017 | 屏幕方向处理 | `useScreenOrientation.ts` | UXUV-Pages:`lib/hooks/mobile/useScreenOrientation.ts` | PLY, IPD | pass | 移动全屏 lock landscape，退出/unmount unlock capability mock |
| PLY-C018 | 光标隐藏 | `cursor-visibility.ts` | UXUV-Pages:`lib/player/cursor-visibility.ts` | PLY | pass | 仅全屏、播放且控制层隐藏时生效 |
| PLY-C019 | 桌面键盘快捷键 | `useDesktopShortcuts.ts` | UXUV-Pages:`components/player/hooks/useDesktopShortcuts.ts` | PLY, A11Y | pass | Space/K、M、J/L、方向键与交互目标隔离 E2E |
| PLY-C020 | 实际分辨率徽章 | `useVideoResolution.ts` | UXUV-Pages:`components/player/hooks/useVideoResolution.ts` | PLY, VIS | pass | videoWidth/videoHeight resize 事件显示 1080P；播放实测覆盖探测缓存 |

## PLY-S：播放策略

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| PLY-S001 | HLS.js 生命周期 | `useHlsPlayer.ts` | UXUV-Pages:`components/player/hooks/useHlsPlayer.ts` | PLY, MEDIA | pass | 旧实例 destroy、AbortController 取消、网络/媒体错误有界恢复；静态合同 GREEN |
| PLY-S002 | 直连模式 | `useHlsPlayer.ts` | UXUV-Pages:`components/player/hooks/useHlsPlayer.ts` | PLY | approved-difference | SPEC 13.3 安全边界：原生解码仍访问同源 `/api/proxy`，不允许浏览器直连上游；E2E 验证零自动网络重试策略 |
| PLY-S003 | 智能重试模式 | `useHlsPlayer.ts` | UXUV-Pages:`components/player/hooks/useHlsPlayer.ts` | PLY, MEDIA | pass | T18 `retry` 持久化设置驱动 native/HLS 有界重试；E2E 模式徽章与同源媒体 URL |
| PLY-S004 | 总是代理模式 | `useHlsPlayer.ts` | UXUV-Pages:`components/player/hooks/useHlsPlayer.ts` | PLY, MEDIA | pass | T18 `always` 设置驱动最高有界恢复；E2E 保持同源 Worker 媒体路由 |
| PLY-S005 | Range 播放 | `useHlsPlayer.ts` | UXUV-Pages:`components/player/hooks/useHlsPlayer.ts`, Worker:`_worker.js` | PLY, MEDIA | pass | Worker `media-stream.test.mjs` 验证 Range 206 字节与取消上游传播 |
| PLY-S006 | 自动跳过片头 | `useAutoSkip.ts` | UXUV-Pages:`components/player/hooks/useAutoSkip.ts` | PLY | pass | 有限时长内跳转且不覆盖恢复进度；纯语义与虚拟媒体时钟 E2E GREEN |
| PLY-S007 | 自动跳过片尾 | `useAutoSkip.ts` | UXUV-Pages:`components/player/hooks/useAutoSkip.ts` | PLY | pass | 仅播放中进入有界片尾窗口，关闭自动连播时结束当前集 |
| PLY-S008 | 自动连播 | `usePlaybackPolling.ts` | UXUV-Pages:`components/player/hooks/useAutoSkip.ts`, `components/PlayerExperience.tsx` | PLY | pass | 片尾与 ended 来源级去重、最多推进一次且最后一集不越界 |
| PLY-S009 | 切集状态收敛 | `useVideoPlayer.ts` | UXUV-Pages:`components/PlayerExperience.tsx` | PLY | pass | 换集清除时间与失败链，来源切换保留当前时间；静态/E2E 合同 GREEN |
| PLY-S010 | 播放断点恢复 | `useVideoPlayer.ts` | UXUV-Pages:`MediaPlayer.tsx`, `usePlaybackHistory.ts` | PLY | pass | 历史与 URL `t` 两级恢复；E2E 42/57 秒证据 |
| PLY-S011 | 卡顿检测 | `useStallDetection.ts` | UXUV-Pages:`components/player/hooks/useStallDetection.ts` | PLY | pass | waiting→200ms 阈值→timeupdate 清除；E2E 缓冲提示 GREEN |
| PLY-S012 | 当前源失败自动切换 | `useVideoPlayer.ts` | UXUV-Pages:`components/PlayerExperience.tsx` | PLY | pass | 按延迟 B→C 有界切换；失败集合跨静态路由重载且不回环 |
| PLY-S013 | 来源延迟排序 | `source-latency.ts` | UXUV-Pages:`useLatencyPing.ts`, `grouped-sources-cache.ts` | PLY | pass | `/api/ping` 三源实测后按 20/50/100 ms 稳定排序并展示 |
| PLY-S014 | 全源实际分辨率探测 | `useResolutionProbe.ts` | UXUV-Pages:`useSourceResolutionProbe.ts`, `probe-client.ts` | PLY | pass | 单次 SSE 批次探测全部 3 源；复用 Worker Free/Paid 上限与 episode-scoped session cache |

## DAN：弹幕

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| DAN-001 | 聚合弹幕 API | `app/api/danmaku/route.ts` | UXUVideo:`_worker.js` | PLY | pass | 已登录、公开 URL、2 MiB、散列 Cache API 键与 1 小时缓存回归 |
| DAN-002 | 多用户弹幕 API 管理 | `UserDanmakuSettings.tsx` | UXUV-Pages:`components/settings/UserDanmakuSettings.tsx` | SET | pass | 账户隔离、上限与敏感 URL 失败关闭 E2E |
| DAN-003 | 用户弹幕 API 优先级 | `UserDanmakuSettings.tsx` | UXUV-Pages:`components/settings/UserDanmakuSettings.tsx`, `components/player/hooks/useDanmaku.ts` | SET, PLY | pass | 无系统默认时仍消费已选用户 API；DOM 不暴露 URL |
| DAN-004 | Canvas 渲染 | `DanmakuCanvas.tsx` | UXUV-Pages:`components/player/DanmakuCanvas.tsx` | PLY | pass | DPR/CSS 尺寸同步、最多 200 条活动弹幕 |
| DAN-005 | 滚动轨道 | `danmaku-canvas-utils.ts` | UXUV-Pages:`lib/player/danmaku-canvas-utils.ts` | PLY | pass | 虚拟时钟 Canvas 绘制证据 |
| DAN-006 | 顶部轨道 | `danmaku-canvas-utils.ts` | UXUV-Pages:`lib/player/danmaku-canvas-utils.ts` | PLY | pass | 独立顶部轨道和 4 秒期限 |
| DAN-007 | 底部轨道 | `danmaku-canvas-utils.ts` | UXUV-Pages:`lib/player/danmaku-canvas-utils.ts` | PLY | pass | 独立底部轨道受显示区域约束 |
| DAN-008 | 弹幕开关 | `useDanmaku.ts` | UXUV-Pages:`components/player/hooks/useDanmaku.ts`, `components/media/MediaPlayer.tsx` | PLY | pass | T18 同步设置实时控制请求与 Canvas |
| DAN-009 | 透明度 | `useDanmaku.ts` | UXUV-Pages:`components/player/DanmakuCanvas.tsx` | PLY, SET | pass | 0.4 Canvas globalAlpha E2E |
| DAN-010 | 字号 | `useDanmaku.ts` | UXUV-Pages:`components/player/DanmakuCanvas.tsx` | PLY, SET | pass | 24px 绘制与变更清轨回归 |
| DAN-011 | 显示区域 | `useDanmaku.ts` | UXUV-Pages:`components/player/DanmakuCanvas.tsx` | PLY, SET | pass | 25% 底部轨道边界 E2E |
| DAN-012 | 暂停/跳转/全屏联动 | `useDanmaku.ts` | UXUV-Pages:`components/player/DanmakuCanvas.tsx` | PLY | pass | 暂停冻结、跳转清轨、网页全屏尺寸收敛 E2E |
| DAN-013 | 无数据状态 | `DanmakuCanvas.tsx` | UXUV-Pages:`components/media/MediaPlayer.tsx` | PLY | pass | 无 Canvas 且视频继续播放 |
| DAN-014 | 弹幕错误状态 | `DanmakuCanvas.tsx` | UXUV-Pages:`components/media/MediaPlayer.tsx` | PLY | pass | 三语非阻断状态；视频继续播放 |

## ADS：广告过滤

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| ADS-001 | 关闭过滤 | `m3u8-ad-detector.ts` | UXUVideo:`_worker.js` | PLY, SET | pass | `off` 返回字节一致原清单；播放器可即时切换 |
| ADS-002 | 关键词过滤 | `m3u8-ad-detector.ts` | UXUVideo:`_worker.js` | PLY, SET | pass | 关键词命中移除完整片段并清理关联元数据 |
| ADS-003 | 智能启发式过滤 | `m3u8-ad-scoring.ts` | UXUVideo:`_worker.js` | PLY, SET | pass | 路径信号与时长离群组合达到保守阈值才过滤 |
| ADS-004 | 激进过滤 | `m3u8-ad-scoring.ts` | UXUVideo:`_worker.js` | PLY, SET | pass | 单一路径广告信号可过滤，仍受全删回退保护 |
| ADS-005 | 播放器内切换 | `DesktopMoreMenu.tsx` | UXUV-Pages:`components/player/desktop/DesktopAdFilterMenu.tsx` | PLY | pass | 四档 menuitemradio 即时更新设置与同源媒体 URL，E2E GREEN |
| ADS-006 | 自定义关键词 | `PlayerSettings.tsx` | UXUV-Pages:`components/settings/PlayerSettings.tsx`, Worker:`_worker.js` | SET, PLY | pass | 系统与账户关键词合并去重，最多 32 个且每个最多 40 字 |
| ADS-007 | HLS 清单过滤 | `m3u8-utils.ts` | UXUVideo:`_worker.js` | PLY, MEDIA | pass | 在同源签名子清单改写前过滤，子清单继承有界策略 |
| ADS-008 | 过滤失败安全 | `m3u8-filter-regression.test.ts` | UXUVideo:`work-products/tests/m3u8-ad-filter.test.mjs` | PLY, MEDIA | pass | 损坏输入或全删候选回退原清单，不返回损坏清单 |

## IPTV：直播电视

退役状态：`approved-retired-by-SPEC-21`。以下行仅作为已冻结历史复刻证据保留，不再表示当前 Pages 的可达功能或活跃验证入口。

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| IPTV-001 | M3U 来源 | `m3u-parser.ts` | UXUV-Pages:`lib/iptv/playlist.ts` | IPD | approved-retired-by-SPEC-21 | 相对 HTTP(S) URL、EXTINF/tvg/EXTVLCOPT 与 5,000 频道上限 fixture GREEN |
| IPTV-002 | M3U8 来源 | `m3u-parser.ts` | UXUV-Pages:`lib/iptv/playlist.ts` | IPD | approved-retired-by-SPEC-21 | M3U8 媒体 URL 与重复频道线路合并 fixture GREEN |
| IPTV-003 | JSON 频道源 | `IPTVSourceManager.tsx` | UXUV-Pages:`lib/iptv/playlist.ts` | IPD | approved-retired-by-SPEC-21 | 数组、channels/list/items/data、lives 嵌套及最多 3 层引用 GREEN |
| IPTV-004 | 自定义源管理 | `IPTVSourceManager.tsx` | UXUV-Pages:`components/iptv/IPTVSourceManager.tsx` | IPD, VIS | approved-retired-by-SPEC-21 | 新增、编辑、删除、稳定 ID、UA/Referer 与账户配置同步 E2E GREEN |
| IPTV-005 | 逐源缓存 | `iptv-store.ts` | UXUV-Pages:`lib/iptv/source-loader.ts` | IPD | approved-retired-by-SPEC-21 | 每根来源 5 分钟/16 项会话内存缓存，刷新显式绕过且缓存状态可见 |
| IPTV-006 | 最多三源并发 | `app/iptv/page.tsx` | UXUV-Pages:`lib/iptv/source-loader.ts` | IPD | approved-retired-by-SPEC-21 | 根来源与嵌套请求共享全局 3 并发限制，单元/E2E 最大并发均为 3 |
| IPTV-007 | 分组浏览 | `IPTVChannelGrid.tsx` | UXUV-Pages:`components/iptv/IPTVChannelBrowser.tsx` | IPD | approved-retired-by-SPEC-21 | 来源级分类与全部分类切换，分类变更重置分页 |
| IPTV-008 | 频道搜索 | `IPTVChannelGrid.tsx` | UXUV-Pages:`components/iptv/IPTVChannelBrowser.tsx` | IPD | approved-retired-by-SPEC-21 | 来源/分类内大小写无关搜索，零结果状态可见 |
| IPTV-009 | 频道分页 | `IPTVChannelGrid.tsx` | UXUV-Pages:`components/iptv/IPTVChannelBrowser.tsx` | IPD | approved-retired-by-SPEC-21 | 每页 100 条，205 条 fixture 依次显示 100/200/205 |
| IPTV-010 | 源→分类→频道三级导航 | `app/iptv/page.tsx` | UXUV-Pages:`components/iptv/IPTVChannelBrowser.tsx` | IPD, VIS | approved-retired-by-SPEC-21 | 左右跨层、上下层内循环；四断点截图与 320/1440 人工检查 GREEN |
| IPTV-011 | 多线路前三条折叠 | `IPTVPlayer.tsx` | UXUV-Pages:`components/iptv/IPTVPlayer.tsx` | IPD | approved-retired-by-SPEC-21 | 默认前三条、显式展开/收起，4 线路单元/E2E GREEN |
| IPTV-012 | 频道自动切源 | `IPTVPlayer.tsx` | UXUV-Pages:`components/iptv/IPTVPlayer.tsx` | IPD, MEDIA | approved-retired-by-SPEC-21 | 每条线路最多尝试一次，耗尽后保留明确错误；切台/切线销毁旧 HLS 与探测 |
| IPTV-013 | 频道延迟选择 | `IPTVPlayer.tsx` | UXUV-Pages:`lib/iptv/playback-policy.ts`, `components/iptv/IPTVPlayer.tsx` | IPD | approved-retired-by-SPEC-21 | 同源 `/api/ping`、最多 3 并发/12 线路，兼容等级内按延迟稳定排序 |
| IPTV-014 | UA 支持 | `iptv-store.ts` | UXUV-Pages:`lib/iptv/playlist.ts`, `components/IptvExperience.tsx` | IPD, MEDIA | approved-retired-by-SPEC-21 | 来源/频道 UA 经同源列表与播放路由传递；不进入直连请求 |
| IPTV-015 | Referer 支持 | `iptv-store.ts` | UXUV-Pages:`lib/iptv/playlist.ts`, `components/IptvExperience.tsx` | IPD, MEDIA | approved-retired-by-SPEC-21 | 仅接受 HTTP(S) Referer，经同源 `/api/iptv/stream` E2E 验证 |
| IPTV-016 | HLS 代理 | `app/api/iptv/stream/route.ts` | UXUVideo:`_worker.js` | IPD, MEDIA | approved-retired-by-SPEC-21 | 认证首请求、签名子资源、Range/取消传播与一 MiB manifest 上限 GREEN |
| IPTV-017 | HLS URL 重写 | `app/api/iptv/stream/route.ts` | UXUVideo:`_worker.js` | IPD, MEDIA | approved-retired-by-SPEC-21 | 相对 segment/key 重写为同作用域 `/api/iptv/stream` 签名 URL，跨路由 token 被拒绝 |
| IPTV-018 | 重定向处理 | `app/api/iptv/stream/route.ts` | UXUVideo:`_worker.js` | IPD, MEDIA | approved-retired-by-SPEC-21 | 手动逐跳、最多三次、每跳 URL/SSRF 重验并取消重定向响应体 |
| IPTV-019 | 超时处理 | `IPTVPlayer.tsx` | UXUV-Pages:`components/player/hooks/useHlsPlayer.ts`, UXUVideo:`_worker.js` | IPD, MEDIA | approved-retired-by-SPEC-21 | HLS manifest/level/fragment 与 Worker 响应头均 20 秒超时，504 显式分类 |
| IPTV-020 | 重试处理 | `IPTVPlayer.tsx` | UXUV-Pages:`components/iptv/IPTVPlayer.tsx`, `components/player/hooks/useHlsPlayer.ts` | IPD | approved-retired-by-SPEC-21 | 网络重试受设置上限约束，媒体恢复最多 2 次，线路故障有界切换 |
| IPTV-021 | HEVC/H.264 兼容选择 | `IPTVPlayer.tsx` | UXUV-Pages:`lib/iptv/playback-policy.ts`, `components/player/hooks/useHlsPlayer.ts` | IPD | approved-retired-by-SPEC-21 | URL 线路与 master level 均优先 H.264；HEVC-only 不支持时三语解释并失败关闭 |
| IPTV-022 | IPTV 播放器快捷键 | `IPTVPlayer.tsx` | UXUV-Pages:`components/iptv/IPTVPlayer.tsx`, `components/media/MediaPlayer.tsx` | IPD, A11Y | approved-retired-by-SPEC-21 | Space/K/J/L/方向键/M/F/W/P/Escape；E2E 证明方向键焦点不逃逸与 Escape 关闭 |
| IPTV-023 | IPTV 权限状态 | `PermissionGate.tsx` | UXUV-Pages:`components/IptvExperience.tsx` | IPD | approved-retired-by-SPEC-21 | 权限不足与部署禁用均显示三语解释且零播放列表请求 |

## PRE：Premium

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| PRE-001 | 独立 `/premium` 入口 | `app/premium/page.tsx` | UXUV-Pages:`app/premium/page.tsx`, `PremiumExperience.tsx` | HS, VIS | pass | 独立入口、三语、四断点、服务端授权恢复与 TV 焦点 E2E |
| PRE-002 | 服务端授权状态 | `PremiumPasswordGate.tsx` | UXUV-Pages:`lib/content/premium-client.ts`, `PremiumSettingsExperience.tsx` | APP, SET | pass | 同源服务端验证、403 失败关闭与重新解锁 E2E |
| PRE-003 | 独立来源 | `PremiumSourceSettings.tsx` | UXUV-Pages:`SourceSettings.tsx` | SET | pass | Premium 来源 CRUD/排序/批量导入与普通来源隔离 E2E |
| PRE-004 | 独立设置 | `app/premium/settings/page.tsx` | UXUV-Pages:`app/premium/settings/page.tsx` | SET, VIS | pass | 独立设置页、三语、四断点与 axe E2E |
| PRE-005 | 独立收藏 | `app/premium/favorites/page.tsx` | UXUV-Pages:`app/premium/favorites/page.tsx`, `FavoritesExperience.tsx`, `FavoritesSidebar.tsx` | HS, VIS | pass | Premium 收藏独立 ID、容量、链接与仅当前模式清空；双模式/账户及遥控确认框 E2E |
| PRE-006 | 独立历史 | `history-store.ts` | UXUV-Pages:`usePlaybackHistory.ts`, `WatchHistorySidebar.tsx` | PLY | pass | Premium 历史独立 ID、续播参数、50 条容量与仅当前模式清空 E2E |
| PRE-007 | 独立推荐 | `usePremiumHomePage.ts` | UXUV-Pages:`premium-home-policy.ts`, `PremiumExperience.tsx` | HS | pass | 推荐仅来自最新 Premium 历史；普通历史不会进入推荐 |
| PRE-008 | 分类模糊合并 | `usePremiumTagManager.ts` | UXUVideo:`_worker.js` | HS | pass | 稳定首见标签、短标签完全匹配与长标签四字符重合测试 |
| PRE-009 | 多源交错排列 | `PremiumContentGrid.tsx` | UXUVideo:`_worker.js`; UXUV-Pages:`PremiumExperience.tsx` | HS | pass | Worker 来源轮询交错与 Pages 来源徽标顺序 E2E |
| PRE-010 | Premium 搜索 | `usePremiumContent.ts` | UXUV-Pages:`PremiumExperience.tsx`, `search-client.ts` | HS | pass | Premium 来源隔离、同源流式搜索、加载/空/错误合同与三语 E2E |
| PRE-011 | 授权失效后重新验证 | `PremiumPasswordGate.tsx` | UXUV-Pages:`PremiumExperience.tsx`, `PremiumSettingsExperience.tsx` | APP, HS | pass | 首页或设置收到 403 后隐藏内容并要求重新输入密码 E2E |
| PRE-012 | 与普通模式物理隔离 | premium stores/hooks | UXUV-Pages:`library-isolation.ts`, `PasswordGate.tsx`, Premium components | FEAT, HS, SET | pass | 普通/Premium 显式 ID/mode 命名空间、过滤和账户重挂载；双 context 收藏/历史冲突后仍物理隔离 |

## SET：设置页

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| SET-001 | 原设置分区 | `app/settings/page.tsx` | UXUV-Pages:`app/settings/page.tsx` | SET, VIS | pass | 标准与 Premium 设置分区行为/视觉 E2E GREEN |
| SET-002 | 原设置层级 | `SettingsSection.tsx` | UXUV-Pages:`SettingsSection.tsx` | SET, VIS | pass | `SettingsSection.tsx` 与四断点 E2E |
| SET-003 | 原设置顺序 | `app/settings/page.tsx` | UXUV-Pages:`app/settings/page.tsx` | SET | pass | 固定 DOM 顺序 GREEN；架构区块仅增量插入 |
| SET-004 | 账户设置 | `AccountSettings.tsx` | UXUV-Pages:`AccountSettings.tsx` | SET | pass | KVideo 设置卡片、三语、`super_admin` CRUD、普通用户不请求、401 会话失效、自定义确认框与键盘焦点 E2E |
| SET-005 | 来源设置 | `SourceSettings.tsx` | UXUV-Pages:`SourceSettings.tsx` | SET | pass | `settings-sources-contract.test.mjs`、来源 E2E |
| SET-006 | 订阅设置 | `useSubscriptionSync.ts` | UXUV-Pages:`components/settings/ImportModal.tsx`, `SourceSettings.tsx` | SET | pass | `source-import-contract.test.mjs`、来源导入 E2E |
| SET-007 | 搜索排序设置 | `SortSettings.tsx` | UXUV-Pages:`components/settings/SortSettings.tsx` | SET | pass | `settings-preferences-contract.test.mjs`、设置偏好 E2E |
| SET-008 | 显示设置 | `DisplaySettings.tsx` | UXUV-Pages:`components/settings/DisplaySettings.tsx` | SET | pass | 三列语言直达、无语言说明小字；默认值、即时预览、四断点与账户隔离 GREEN |
| SET-009 | 主题设置 | `ThemeSwitcher.tsx` | UXUV-Pages:`components/ThemeSwitcher.tsx`, `ThemeProvider.tsx` | SET | pass | 旧全局值单次迁移、重载与双账户隔离 E2E |
| SET-010 | 播放器设置 | `PlayerSettings.tsx` | UXUV-Pages:`components/settings/PlayerSettings.tsx`, `lib/hooks/usePlayerSettings.ts` | SET | pass | 原默认值/范围、旧值单次迁移、权限与播放器快照 E2E |
| SET-011 | 片头片尾设置 | `PlayerSettings.tsx` | UXUV-Pages:`components/settings/PlayerSettings.tsx` | SET | pass | 0-600 秒、禁用依赖、保存/重载/账户隔离 E2E |
| SET-012 | 代理模式设置 | `PlayerSettings.tsx` | UXUV-Pages:`components/settings/PlayerSettings.tsx` | SET | pass | 三模式偏好与 same-origin 安全说明；实际策略留 T24 |
| SET-013 | 弹幕设置 | `UserDanmakuSettings.tsx` | UXUV-Pages:`PlayerSettings.tsx`, `UserDanmakuSettings.tsx` | SET | pass | 外观/API/优先项、三语、权限与敏感 URL E2E |
| SET-014 | 屏蔽分类设置 | `DisplaySettings.tsx` | UXUV-Pages:`components/settings/DisplaySettings.tsx` | SET | pass | `settings-preferences-contract.test.mjs`、设置偏好 E2E |
| SET-015 | 数据导入 | `ImportModal.tsx` | UXUV-Pages:`SettingsImportModal.tsx`, `DataSettings.tsx` | SET | pass | 标准模式整包校验、预览/取消零写入、敏感/Premium/超限整批拒绝与原子本地替换 E2E |
| SET-016 | 数据导出 | `ExportModal.tsx` | UXUV-Pages:`ExportModal.tsx`, `settings-transfer.ts` | SET | pass | 标准模式确定性 JSON 字节往返、历史范围选择和敏感字段失败关闭 E2E |
| SET-017 | 版本检查 | `AppVersionSettings.tsx` | UXUV-Pages:`components/AppUpdateControl.tsx`, UXUVideo:`/api/app-update` | SET | pass | 认证 shell 单入口、五状态弹窗、按需校验并复制最新 `_worker.js`；三语与安全链接 E2E GREEN |
| SET-018 | 语言设置 | `LocaleProvider.tsx` | UXUV-Pages:`components/LocaleProvider.tsx`, `components/settings/DisplaySettings.tsx` | SET | pass | 三语三等列即时切换、旧值迁移、重载与双账户隔离 E2E GREEN |
| SET-019 | Premium 独立设置 | `app/premium/settings/page.tsx` | UXUV-Pages:`app/premium/settings/page.tsx` | SET | pass | Premium 字段、来源、显示与排序均按 mode 隔离 E2E |
| SET-020 | Cloudflare 用量卡按原视觉插入 | target architecture addition | UXUV-Pages:`components/settings/CloudflareUsageSettings.tsx` | SET, VIS | pass | 账户后/播放前共享设置卡片；四指标、70/85/95/100、三语、权限/零请求、四断点与 1024px `0.005` 基线 |
| SET-021 | D1 同步状态按原视觉插入 | target architecture addition | UXUV-Pages:`components/settings/SyncSettings.tsx`, `components/SyncStatus.tsx` | SET, VIS | pass | 共享设置卡片、七种状态、三语、卡片内重试、四断点与 1024px `0.005` 视觉基线 |

## PWA：安装、缓存与同步

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| PWA-001 | Web App manifest | `public/manifest.json` | UXUV-Pages:`public/manifest.json` | APP, IPD | pass | Chromium manifest 解析无错误；scope/start URL/display/orientation 与固定基准一致 |
| PWA-002 | 应用图标 | `public/icon.png` | UXUV-Pages:`public/icon.png` | VIS | pass | 用户批准蓝灰 U/V 候选；1024×1024、六档缩放与圆形/圆角 mask 复核 GREEN |
| PWA-003 | 安装模式 | `manifest.json`, layout | UXUV-Pages:`public/manifest.json`, `app/layout.tsx` | IPD | pass | manifest/display/作用域与安装事件合同 GREEN；真实安装由用户部署后验收 |
| PWA-004 | Service Worker 注册 | `ServiceWorkerRegister.tsx` | UXUV-Pages:`ServiceWorkerRegister.tsx` | APP | pass | Worker 同源根作用域注册、直接 Pages 禁止注册、更新检查及等待安装生命周期已验证 |
| PWA-005 | 静态资源离线缓存 | `public/sw.js` | UXUV-Pages:`public/sw.js` | APP | pass | 版本化 cache、旧版本清理、在线刷新优先、离线壳层回退及缓存写失败降级 E2E |
| PWA-006 | API/认证/媒体缓存排除 | `public/sw.js` | UXUV-Pages:`public/sw.js` | APP, FEAT | pass | 实际 Cache Storage 验证 API 与媒体未写入，无关 cache 不被删除 |
| PWA-007 | 配置跨设备同步 | `useConfigSync.ts` | UXUV-Pages:`SyncProvider.tsx`, `AccountPreferenceBridge.tsx` | APP, SET | pass | 配置字段离线/网络中断/quota/错误/恢复及双 context 409 收敛；未知字段保留且 payload 严格匹配 Worker schema |
| PWA-008 | 来源跨设备同步 | `useCloudSync.ts` | UXUV-Pages:`SourceSettings.tsx`, `document-merge.ts` | APP, SET | pass | 普通来源本地即时写入，离线与 quota 保留 dirty，双 context 409 后与 Premium 来源共同收敛且 group 不串写 |
| PWA-009 | 订阅跨设备同步 | `useSubscriptionSync.ts` | UXUV-Pages:`ImportModal.tsx`, `SourceSettings.tsx` | APP, SET | pass | 订阅/导入来源离线、quota、恢复与双 context 409 收敛；删除 tombstone 防复活并保留 Premium mode |
| PWA-010 | 收藏/历史跨设备同步 | `sync-records.ts` | UXUV-Pages:`document-merge.ts`, `SyncProvider.tsx` | APP, HS, PLY | pass | 普通/Premium 收藏与历史本地即时写入；双 context 离线/quota/409 收敛，旧设备进度不能复活删除 |
| PWA-011 | 本地优先即时响应 | sync hooks/stores | UXUV-Pages:`SyncProvider.tsx`, `sync-engine.ts`, `document-store.ts` | APP | pass | 账户命名空间本地先写、dirty 队列、online/focus/人工恢复及全部文档聚合状态 E2E |
| PWA-012 | 冲突合并 | `sync-records.ts` | UXUV-Pages:`sync-engine.ts`, `document-merge.ts`, `document-client.ts` | APP | pass | payload 无关状态机、If-Match CAS、双浏览器 409 合并重试并收敛 |
| PWA-013 | 离线/等待/配额/错误状态 | `AutoSync.tsx` | UXUV-Pages:`SyncStatus.tsx`, `SyncSettings.tsx` | APP, VIS | pass | 全局与设置卡片覆盖 loading/synced/pending/conflict/offline/quota/error；本地保留、三语提示与键盘重试 E2E |
| PWA-014 | 恢复后重试 | sync hooks | UXUV-Pages:`SyncProvider.tsx`, `sync-engine.ts` | APP | pass | 配置、来源、订阅、收藏、历史均验证人工或 online 恢复；dirty 按最新 CAS 版本重试收敛 |

## DEV：响应式与设备

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| DEV-001 | 320 px 布局 | responsive styles | UXUV-Pages:responsive styles | VIS, IPD | pass | 8 入口 viewport/AA、切片布局与无横向溢出 E2E |
| DEV-002 | 768 px 布局 | responsive styles | UXUV-Pages:responsive styles | VIS, IPD | pass | 8 入口 viewport/AA、切片布局与播放器输入模式 E2E |
| DEV-003 | 1024 px 布局 | responsive styles | UXUV-Pages:responsive styles | VIS, IPD | pass | 8 入口 viewport/AA 与已批准关键区 `0.005` 基线 |
| DEV-004 | 1440 px 布局 | responsive styles | UXUV-Pages:responsive styles | VIS, IPD | pass | 8 入口 viewport/AA、桌面/TV/播放器布局 E2E |
| DEV-005 | 桌面交互 | device hooks | UXUV-Pages:device hooks | IPD | pass | Chromium 指针、键盘、快捷键、焦点与同源媒体 E2E |
| DEV-006 | 平板交互 | device hooks | UXUV-Pages:device hooks | IPD | pass | 768px 响应式、非窄屏输入模式、键盘与触控边界 E2E |
| DEV-007 | 手机触摸交互 | mobile hooks | UXUV-Pages:`lib/hooks/mobile/*`, `lib/hooks/useMobilePlayer.ts` | IPD, PLY | pass | 320px 双击、控制栏布局与设备入口 E2E |
| DEV-008 | TV 浏览器检测 | `useTVDetection.ts` | UXUV-Pages:`TVNavigationInitializer.tsx` | IPD | pass | SMART-TV UA/无触控大屏启用 `tv-mode`；本地模拟 E2E，真实设备仍 HOLD |
| DEV-009 | 10 英尺 UI | `TVContext.tsx` | UXUV-Pages:`TVNavigationInitializer.tsx`, responsive styles | IPD, VIS | pass | `tv-mode`、1280/1440 布局和遥控焦点本地模拟；真实设备仍 HOLD |
| DEV-010 | 遥控器空间导航 | `useSpatialNavigation.ts` | UXUV-Pages:`useSpatialNavigation.ts` | IPD | pass | 方向键/Enter、编辑控件隔离、隐藏/禁用过滤及卡片移动 E2E |
| DEV-011 | TV 焦点高亮 | `TVNavigationInitializer.tsx` | UXUV-Pages:`TVNavigationInitializer.tsx` | IPD, VIS | pass | `tv-mode` 焦点样式与方向键后 `:focus` 状态本地 E2E |
| DEV-012 | 播放器方向键隔离 | `useKeyboardNavigation.ts` | UXUV-Pages:`EpisodeList.tsx`, `PlayerExperience.tsx`, `components/media/MediaPlayer.tsx` | IPD, PLY | pass | 选集空间导航；播放器按钮方向键不逃逸，range 保留原生键盘行为 |
| DEV-013 | WebView 83 可解析边界 | transpiled client assets | UXUV-Pages:transpiled client assets | IPD, FEAT | pass | 生产构建转译 27 个资产；逻辑赋值降级/解析与缺失根失败关闭，真实设备仍 HOLD |

## I18N-A11Y：国际化与无障碍

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| A11Y-001 | 语义化 HTML | all routes | UXUV-Pages:all routes | A11Y | pass | 8 入口 landmark/heading/form/list/dialog 语义与 axe E2E |
| A11Y-002 | ARIA 状态/关系 | components | UXUV-Pages:components | A11Y | pass | live status、expanded/pressed/labelledby、dialog/alertdialog 关系 E2E |
| A11Y-003 | 焦点管理 | `focus-management.ts` | UXUV-Pages:`useSpatialNavigation.ts`, `useDialogFocusTrap.ts` | A11Y | pass | 登录错误、侧栏/弹窗、空间导航与关闭后焦点恢复 E2E |
| A11Y-004 | 模态焦点陷阱 | modal components | UXUV-Pages:modal components | A11Y | pass | Tab/Shift+Tab/Escape、确认框与侧栏循环焦点 E2E |
| A11Y-005 | 键盘完整操作 | all routes | UXUV-Pages:all routes | A11Y, IPD | pass | 全局 Tab/Enter/方向键与各切片键盘操作 E2E |
| A11Y-006 | 状态不只靠颜色 | badges/settings/player | UXUV-Pages:badges/settings/player | A11Y, VIS | pass | 同步、用量、媒体和错误状态均含文本/ARIA 标签 |
| A11Y-007 | 简体中文界面 | `LocaleProvider.tsx` | UXUV-Pages:`LocaleProvider.tsx` | A11Y, VIS | pass | 全局与垂直切片简体中文 E2E |
| A11Y-008 | 繁体中文界面 | `LocaleProvider.tsx` | UXUV-Pages:`LocaleProvider.tsx` | A11Y, VIS | pass | 全局与垂直切片繁体中文 E2E |
| A11Y-009 | 英语界面 | `LocaleProvider.tsx` | UXUV-Pages:`LocaleProvider.tsx` | A11Y, VIS | pass | 全局与垂直切片英文 E2E |
| A11Y-010 | 语言持久化 | `LocaleProvider.tsx` | UXUV-Pages:`LocaleProvider.tsx` | SET, A11Y | pass | 即时切换、旧值迁移、重载和双账户隔离 E2E |
| A11Y-011 | 原可访问名称与提示 | controls/dialogs | UXUV-Pages:controls/dialogs | A11Y | pass | role/name 定位、ARIA label/value/status 与错误提示 E2E |
| A11Y-012 | axe serious/critical 为 0 | all eight routes | UXUV-Pages:all eight routes | A11Y | pass | 8 入口 × 320/768/1024/1440 共 32 组合，serious/critical 0 |

## DAT：数据管理与更新

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| DAT-001 | 全设置 JSON 导出 | `ExportModal.tsx` | UXUV-Pages:`ExportModal.tsx`, `settings-transfer.ts` | SET | pass | schema v2 完整导出普通/Premium 数据并失败关闭敏感字段 E2E |
| DAT-002 | 全设置 JSON 导入 | `ImportModal.tsx` | UXUV-Pages:`SettingsImportModal.tsx`, `SyncProvider.tsx` | SET | pass | schema v2 双模式原子往返；v1 导入保留 Premium 活跃记录与 tombstone E2E |
| DAT-003 | 来源批量导入 | `source-import-utils.ts` | UXUV-Pages:`source-import-utils.ts` | SET | pass | 普通/Premium 四路径预览、整批拒绝与模式归属 E2E |
| DAT-004 | 账户数据隔离 | stores/profile-storage | UXUV-Pages:`components/SyncProvider.tsx`, `lib/sync/document-store.ts` | APP, SET | pass | 双账户及 standard/Premium 文档隔离 E2E GREEN |
| DAT-005 | 容量提示 | data/settings views | UXUV-Pages:`components/SyncStatus.tsx`, `components/settings/DataSettings.tsx` | SET | pass | 文档大小失败与本地数据保留 E2E GREEN |
| DAT-006 | 配额提示 | sync/settings views | UXUV-Pages:`components/SyncStatus.tsx`, `components/settings/SyncSettings.tsx` | SET, APP | pass | D1 配额、UTC 重置、清理和升级提示 E2E GREEN |
| DAT-007 | 应用版本检查 | `AppVersionSettings.tsx` | UXUV-Pages:`components/AppUpdateControl.tsx`, Worker:`/api/app-update` | SET | pass | 认证 shell 全局单入口；更新可用/最新/领先/失败状态与四断点 AA E2E |
| DAT-008 | 更新可用状态 | `AppVersionSettings.tsx` | UXUV-Pages:`components/AppUpdateControl.tsx` | SET | pass | update-available 提示、弹窗与安全复制 E2E GREEN |
| DAT-009 | 无需更新状态 | `AppVersionSettings.tsx` | UXUV-Pages:`components/AppUpdateControl.tsx` | SET | pass | up-to-date 与 ahead-of-remote E2E GREEN |
| DAT-010 | 检查失败状态 | `AppVersionSettings.tsx` | UXUV-Pages:`components/AppUpdateControl.tsx` | SET | pass | 检查失败保留版本、禁用复制并允许手动重试 E2E GREEN |

## EXT：第三方可选能力

| ID | 用户能力 | 固定基准入口 | 目标入口 | 测试映射 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| EXT-001 | VideoTogether 创建房间 | `VideoTogetherController.tsx` | UXUV-Pages:`components/VideoTogetherController.tsx` | PLY | pass | 产品官方异步 API E2E 与 T39 真实临时房间创建/退出 GREEN |
| EXT-002 | VideoTogether 加入房间 | `VideoTogetherController.tsx` | UXUV-Pages:`components/VideoTogetherController.tsx` | PLY | pass | 第二标签加入、缺失房间失败、退出与输入验证 GREEN |
| EXT-003 | VideoTogether 配置/禁用状态 | RuntimeFeatures + controller | UXUV-Pages:`components/RuntimeConfigProvider.tsx`, `components/VideoTogetherController.tsx`; UXUVideo:`_worker.js` | SET, PLY | pass | 零额外 URL 默认可用、账户默认关闭、管理员禁用与 CSP GREEN；动态二级资源风险已记录 |
| EXT-004 | Google Cast | `useCastControls.ts` | UXUV-Pages:`components/player/hooks/useCastControls.ts` | PLY | pass | SDK mock GREEN；真实 Cast 设备由用户部署后验收，不作已验证声明 |

## 唯一批准的架构差异登记（不属于对照 ID）

下表只登记 SPEC 13.3 已批准差异，不属于用户能力矩阵，不参与逐 ID RED 或 T40 状态统计。相关用户界面和正常成功路径仍必须由上表对应 ID 取得 `pass`。

| 差异类别 | 固定基准 | 目标架构 | 依据 |
| --- | --- | --- | --- |
| Next API → Worker Web API | `app/api/**/route.ts` | UXUVideo `_worker.js` 同源 21 路由 | SPEC 13.3 Worker 运行时 |
| Upstash → D1/CAS | `lib/server/redis.ts`, sync hooks | D1 + local-first + tombstone | SPEC 13.3 D1 与同步 |
| 旧登录 → HttpOnly session/角色权限 | auth routes/components | Worker session + PasswordGate | SPEC 13.3 登录与会话 |
| 安全/Free 上限 | old proxy routes | SSRF/CSRF/限流/受控流 | SPEC 13.3 安全边界 |
| Next standalone → 静态 Pages + Worker manifest gate | `next.config.ts` | 唯一 Pages 根目录 + semver/API/range gate | SPEC 13.3 静态发布 |
| 账户/用量/同步状态增量 UI | fixed commit 无对应区块 | KVideo `SettingsSection` 视觉插入 | SPEC 13.3 架构新增 UI |

## 完成门

1. 每个用户能力 ID 必须拥有保存在仓库中的 0.1.2 RED 证据和候选 GREEN 证据。
2. `FEAT` 必须证明 ID 唯一、固定提交存在、目标入口存在、测试映射可执行且状态值合法。
3. 任一 `unverified`、缺失行、未审批差异、视觉超阈值或安全门失败，完整复刻结论均为 NO-GO。
4. 固定提交源码审计若发现本表遗漏的可达行为，先新增稳定 ID，再实现；不得以“矩阵未列出”为删除理由。
