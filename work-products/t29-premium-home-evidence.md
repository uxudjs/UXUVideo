# T29 Premium 首页、推荐、分类与搜索证据

状态：**本地实施与验证完成**。不包含 commit、push、部署、真实 Cloudflare/D1、真实 Premium 上游或实体 TV 设备证明。

## 交付结果

- UXUV-Pages 将 `/premium` 保持为独立入口，只读取 `group === "premium"` 的来源、收藏与历史；普通模式数据不会进入 Premium 推荐、分类请求或搜索请求。
- 新增 Premium 推荐与分页策略：只从最新 Premium 历史生成去重推荐词；分类页最多三页追加，按 `source + vod_id` 去重且不覆盖已有结果。
- Worker 分类标签按稳定首见顺序进行有界模糊合并；短标签要求清理后完全相同，较长标签要求至少四个字符重合。分类结果按来源轮询交错，避免单一来源独占首屏。
- Premium 首页具备三语加载、空、错误与授权失效状态；403 会立即回到服务端重新解锁边界。搜索继续使用同源 `/api/search`，分类与授权使用同源 Premium 路由。
- 搜索、推荐、分类与内容首行之间增加确定的 TV 纵向焦点交接；通用视频卡进入统一 `data-focusable` 模型并补齐三语可访问名称。
- 常规测试入口继续显式排除只用于冻结 RED 基线与矩阵审计的 `kvideo-capability-red.test.mjs`、`kvideo-feature-parity.test.mjs`，T29 两项静态测试已纳入发布门禁。

## RED / GREEN

- RED：Worker 聚合测试因缺少 `mergePremiumCategories` 与 `interleavePremiumResults` 导出而失败；Pages 策略/合同测试因 Premium 首页策略与三语/分页/焦点合同缺失而失败；浏览器测试首次捕获分类向内容区域移动时焦点落到固定悬浮控件。
- GREEN：Worker 聚合 2/2；Pages T29 静态策略/合同 4/4；Premium 浏览器 2/2。焦点修复作用于产品组件，未削弱 E2E 断言。

## 完整本地验证

- UXUV-Pages：`npm test` 112/112；`npx playwright test` 87/87；`npm run lint`、`npx tsc --noEmit` 与 Playwright 构建通过。
- UXUVideo：`npm test` 85/85；`node --check _worker.js`、`npm run check:size`、`git diff --check` 通过；Worker gzip 37,064 / 3,145,728 bytes。
- 视觉：Playwright 保存 320、768、1024、1440px Premium 搜索结果态；人工检查导航、标题、搜索、推荐、分类、结果计数与横向溢出，均通过。截图位于 UXUV-Pages `work-products/tests/artifacts/playwright/`。
- 安全：两仓高置信私钥/API key/access token/client secret 扫描无命中；测试仅使用合成密码和 token。

## 能力矩阵结论

PRE-001、PRE-007 至 PRE-011 转为 `pass`。PRE-002 至 PRE-004 继续沿用 T20 已验证结论；PRE-005、PRE-006 与完整 PRE-012 物理隔离等待 T30 闭合。
