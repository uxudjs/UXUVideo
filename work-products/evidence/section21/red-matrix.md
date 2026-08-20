# SPEC 第 21 节最终验收矩阵

- 绑定计划 SHA-256：`cbbc27518ec5db9579a80373ecdcb989d102f25addd6e5e7329beffe3e4d95ff`
- 执行任务：`S21-T15` attempt 14
- 候选身份：Worker `2.0.0` / Pages `0.3.0` / API `2`
- 视觉候选：121 张，41,548,276 bytes，combined SHA-256 `ecd34b9d3b650caa864039ceb899409358f7229782464e9fb8855a63bde8c9b3`
- 产品绑定：Worker runtime `1f712fcb4f6d497a78591aca0597b37e01deffcde1712f3f2a3af49f0ab3c3ab`；Worker manifest `34fcb3eaa7f1afcbda393a8cacede3a177f88f7f5133858428dedbb4f0c82db7`；Pages manifest `381621298e7ce5125843c3aec80b352ecdcf0b42ea646578b9c39444522692d5`；Pages release scope `6d7994163aaeb016f9893b3e16ba68ab646f052732ab5845b5c5eac3f08ba9df`。
- 当前结论：23 项本地自动技术证据已闭合；视觉候选 14 的决定为 `APPROVED`，本地计划完成，发布继续 HOLD。
- 证据边界：本地测试、静态发布字节与隔离回滚演练不证明已 commit、push、deploy、真实 D1 或生产状态。

| # | SPEC 21.8 验收项 | 历史 RED / 风险 | 最终自动证据 | 人工 / 证据边界 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 1 | 根路径唯一，旧前缀真实 404 | Worker 剥离旧前缀、Pages 使用 basePath | Worker/Pages 根路由与 404 合同；E2E 125/125 | not-found 静态文案仍为英文，不宣称三语 404 | GREEN |
| 2 | 版本右上、同步左上、成功 3 秒隐藏 | 角落 token 与隐藏合同缺失 | 真实计时器证明成功约 3 秒消失，offline/quota/conflict/error 持续；五张可见状态图通过视口与零重叠几何门 | 五张状态图已纳入获批的候选 14 | AUTOMATED GREEN / USER APPROVED |
| 3 | 动漫/电视剧分组隔离 | 两条结果错误合并 | S21-T07 grouping/flows/search strategy；完整 E2E | search-ready 候选复核 PASS | GREEN |
| 4 | 探测/星标不重叠 | 触控尺寸不足、动作区相交风险 | 44 px/8 px 几何、四断点 search tests | 结果卡动作可见且无覆盖 | GREEN |
| 5 | 工具栏默认折叠且两项同排 | 缺少折叠状态 | S21-T07 UI/flows 与 search-ready 行为 | 窄屏单列仍保持交互 | GREEN |
| 6 | Paid/Free 提示紧凑 | 旧独立占位样式 | S21-T07 UI、三语四宽候选 | 内部视觉复核 PASS | GREEN |
| 7 | 品牌归零且不 reload/不清持久数据 | focus 与逻辑根路径失败 | S21-T05 flows、sync-client、完整 E2E | 仅清瞬时搜索状态 | GREEN |
| 8 | 无默认来源/弹幕，保留账户数据 | 环境回灌与 RuntimeSourceSync 可达 | S21-T08/T09 UI、Worker API2、来源/同步/安全回归 | 未读取或改写真实账户数据 | GREEN |
| 9 | 设置六域、唯一来源入口、响应式 | 六域与唯一入口合同缺失 | 设置合同/E2E、三语四宽、200% 状态候选 | 普通/Premium 设置代表图 PASS | GREEN |
| 10 | 21 路由且 IPTV 全退役，普通媒体不回归 | 23 路由与 IPTV 页面可达 | Worker 21 路由、retirement/media/manifest 合同 | 历史负向兼容字段仅作清理证据 | GREEN |
| 11 | 逐视频跳过与 200 项上限 | 全局跳过字段 | auto-skip/sync/data/player 合同与 E2E | 未迁移真实配置 | GREEN |
| 12 | 影院单列与横向选集 | 右侧栏与窄屏 panel 裁切 | player shell 三语四宽、panel containment、cinema 回归 | player-ready 320/1024/1440 复核 PASS | GREEN |
| 13 | 网页全视窗隐藏返回顶部 | BackToTop 不感知全视窗 | S21-T12 UI/player E2E | 未调用原生应用壳 | GREEN |
| 14 | 顶栏无语言切换 | PlayerNavbar 保留 locale select | global/player shell 合同 | 三语由设置入口切换 | GREEN |
| 15 | 播放器上下边界误差不超过 1 px | 无共享宽度与 sticky inset | 四断点边缘、sticky 外盒与 glass 几何 | 320/1024 候选无纵向遮挡 | GREEN |
| 16 | 收藏移入播放顶栏 | 收藏仍在正文 | S21-T12 UI/player E2E | 44 px 命中区保持 | GREEN |
| 17 | 播放设置入口显示 Unicode 首字 | 仍为齿轮图标 | player shell/Unicode 合同 | 三语候选可见 | GREEN |
| 18 | 主页无继续观看但历史/恢复/推荐保留 | 主页仍有继续观看横栏 | home/history/player 回归与候选 | 不删除存储中的历史记录 | GREEN |
| 19 | 切换窗口不刷新 | focus 触发额外拉取 | S21-T05 flows、sync-client | 未依赖真实浏览器后台策略 | GREEN |
| 20 | 单源 8 秒放弃且局部成功 | timeout 为 20 秒 | Worker T04、高扇出、结构化日志合同 | 无真实第三方源请求 | GREEN |
| 21 | Liquid Glass 层级、降级、性能与 AA | token/层级缺失及多轮响应式碰撞 | axe、三语四宽、13 状态、fresh 3 样本性能；p95 中位 8.5 ms、长任务 0、掉帧 0 | 自动布局与性能无 blocker；121 图 combined SHA-256 `ecd34b9d…8c9b3` 已获用户批准 | AUTOMATED GREEN / USER APPROVED |
| 22 | README 法律与来源边界准确 | 退休变量与旧回滚措辞 | T14 README/worker-only 合同、最终 Worker Node 175/175 | 法律文案只陈述批准边界 | GREEN |
| 23 | 两仓完整本地门与证据分层 | 证据、allowlist、fresh release/rollback 不完整 | Pages E2E 125/125、Node 163/163 + 10/10 + 定向 4/4、lint/tsc/build；Worker 175/175、size；137/137 二进制；三阶段 rollback | 无远程动作；自动技术候选与视觉候选 14 均已闭合 | LOCAL GREEN / VISUAL APPROVED |

## 最终命令与身份摘要

- Pages：`npm run test:e2e` 125/125；`npm run build` → `npm run release:build` → `npm test` 163/163 + Section 21 10/10；grouped cache/settings transfer 4/4；lint 与显式 typecheck GREEN；package/lock 均固定 `esbuild@0.28.2`。
- Worker：语法 GREEN；`npm test` 175/175；gzip 40,217 / 3,145,728 bytes；空运行时依赖树。
- 候选性能：sanitized trace SHA-256 `94e84a3e81562d4c9ef0be3a2fe7f121ae45a43579c4c7c7e3f80e64aa704122`；该 trace 从 attempt 13 复用，且验证收据证明 Pages release-scope identity 精确一致；递归 ZIP 扫描未发现机器路径。
- Pages release：`out` 的 71 个 payload 在 `release/current` 逐路径/bytes 一致；manifest 覆盖 72 个 release asset（另含 LICENSE），SHA-256 `0b477934c6a3a6cc3e3080c43bc353ac28ba47b6f39e8c411fd9d95712007674`。
- 回滚：pair SHA-256 `956fef83a9abe266234539d250b7b063892b8acd5f4743612d3d3c6eb58cb080`；Pages scope 明确覆盖 `public/**`；bootstrap-v2、reverse-v1、forward-restore-v2 三阶段均 passed。
- 二进制：121 PNG + 16 ZIP = 137；missing/extra/duplicate/mismatch 均为 0。
- 视觉决定：`APPROVED`；用户批准文本为“批准视觉候选 14”；attempt 13 的历史批准仍因候选字节漂移而失效。
- Recommended：外部 registry 的 `npm audit --audit-level=high` 与签名审计未获单独网络授权，记为 unperformed，不阻断本地候选。
