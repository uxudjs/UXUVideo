# Worker 1.1.4 / Pages 0.2.1 生产发布门禁

## 结论

**GO（最终验收）**：Worker 与 Pages 已成功发布，版本、CSP、绑定、Actions、公开产物、API 与已登录生产浏览器证据均通过。真实搜索、JSON 订阅展示、同名来源聚合、来源切换和持续播放均已验证。

## 已发布

- Worker Git 提交：`86083e4a021ef26b40fa1e476c929ee203e0e3a4`。
- Worker 部署版本：`91716c0c-bb10-49e5-a077-56294a5d084b`；兼容日期 `2026-08-07`。
- Worker 生产 CSP：`media-src 'self' blob: https:`、`connect-src 'self' https:`，并保留既有 VideoTogether WSS/frame 来源。
- Pages main：`9e084f486953850f8de3d23bcd63cc2b71336b64`。
- Pages Actions：`31888735731`，结论 success；artifact `uxuv-pages-0.2.1-31888735731-1`，digest `sha256:817c2ffbf76a48a4fcbc5dfac7f94ad7cbe34e9f1426889ded7d98e9207c0bcb`。
- gh-pages：`af2969c9a02bd36dca9af0250822e6814490b4f6`。
- 公网 manifest：Pages 0.2.1，SHA-256 `4ce18dfefce655d51ec89fb6bb873f7f8f8308cc11c06abb1396f0cad8813086`；80/80 资产与该 gh-pages 提交逐字节一致。

## 生产验证

- `/api/config` 返回 Worker 1.1.4 / Pages 0.2.1 / API Contract 1。
- Worker 静态页面新 CSP 连续抽样 5/5 一致。
- 新 Worker 版本仍包含两个既有 Secret binding 与同一 D1 binding；没有 D1 schema、数据、Secret 或普通变量变更。
- 本地 Worker 105/105，Pages Node 143/143、Playwright 119/119，双方语法、构建、类型、lint、体积、diff 与秘密扫描门均通过。
- 2026-08-16 已登录生产浏览器显示同步成功和退出入口；设置页将订阅显示为 1 条 JSON 订阅（包含 78 个来源），没有展开内部来源。
- 初始主页仍使用旧缓存标识并加载旧静态包；改用 Pages 0.2.1 缓存标识重新加载后，脚本资产与本地 0.2.1 构建一致。
- 真实搜索“超级马力欧银河大电影”返回 35 条原始结果，并聚合为 4 张卡片：主影片 22 源、国语版 8 源、预告片 2 源、解说 3 源。
- 主影片页显示 22 个可切换来源；最大资源加载 720P 并从约 3 秒持续播放到 26 秒，随后切换到虎牙资源，保持约 26 秒进度并加载为 1080P。
- 播放器运行态为 `ready`，`data-proxy-mode=retry`、`data-playback-strategy=hls-retry`；实际媒体路径分类为 Worker `/api/proxy`，页面控制台无 warning/error。

## Blocker

- 无。

## Acknowledged

- 本次真实播放中 Worker 代理成功，因此未触发生产环境 HTTPS 直连回退分支；直连回退仍由 Pages 0.2.1 的自动化回归门覆盖，不将未发生的失败路径伪报为生产验证。
- 先前看到的逐源重复结果来自旧静态包缓存；刷新到 Pages 0.2.1 后无需额外产品代码修改即恢复同名聚合。

## 回滚

- Worker：将生产流量恢复到版本 `0df8ee8d-1b2f-4d0e-b9fb-5cfe9fd7a5f6`。
- Pages：revert `9e084f4` 与 `c971ea6` 后推送，等待同一 Pages 工作流恢复上一产物。
- 当前未观察到需要回滚的静态、API、绑定、发布产物或生产浏览器故障。
