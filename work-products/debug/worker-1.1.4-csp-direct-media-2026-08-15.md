# Worker 1.1.4 CSP 直连媒体证据

## 复现与根因

- Pages 0.2.1 的普通视频 `retry` 模式需要在 Worker 代理出现致命网络错误后，由浏览器直接请求用户订阅返回的 HTTPS 媒体。
- Worker 1.1.3 静态响应仍发送 `media-src 'self' blob:` 与受限 `connect-src`，因此浏览器会在网络请求前阻止外部媒体、HLS 清单、分片和密钥。

## RED / GREEN

- RED：`node --test work-products/tests/pages-integrity.test.mjs` 为 7/8；新增的真实静态响应头测试确认缺少 HTTPS 媒体权限。
- GREEN：CSP 基线改为 `media-src 'self' blob: https:` 与 `connect-src 'self' https:`；同一测试 8/8，相关版本与路由合同合计 35/35。
- 未使用 `*` 或 `http:`；现有 VideoTogether HTTPS/WSS 和 frame 边界继续由原逻辑追加。
- Pages 只允许普通视频的安全 HTTP(S) 目标进入直连候选；生产 HTTPS 页面实际只可加载 HTTPS，IPTV 与 `always` 模式仍使用 Worker。

## 本地门禁

- `npm test`：105/105。
- `node --check _worker.js`：通过。
- `npm run check:size`：166,923 bytes；gzip 39,769 / 3,145,728 bytes。
- `git diff --check`：通过，仅有既有 LF/CRLF 提示。

## 远端边界

- 本地 CLI 的 OAuth 用户与生产 Worker 所属账户不一致，读取生产部署列表返回认证错误；未修改任何账户配置或凭据。
- 应用内浏览器控制连接当前因本机运行时路径缺失而无法启动；在获得正确账户认证前不得把本地 GREEN 表述为已部署。
