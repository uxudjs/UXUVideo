# 播放器上游 403 回归证据（2026-08-15）

## 观察

- 生产 Worker 1.1.2 已能接受 809/1,651 项 HLS 清单，但“痴迷”的新浪与非凡线路仍停在 `readyState=0`。
- 经生产 `/api/proxy` 请求新浪首个 TS 分片，上游返回 HTTP 403，请求号 `d4c555b0-def6-458c-9f9d-b112dad58d69`。
- 经生产 `/api/proxy` 请求非凡子清单，上游返回 HTTP 403，请求号 `4310f3e1-1b84-4d8a-9645-0389500a5d00`。
- 为非凡请求补充浏览器 User-Agent 与同源 Referer 后仍返回 403，请求号 `d1db26ef-d718-4d6a-8c76-79d14aaceb6c`。
- 相同媒体 URL 从用户网络直接请求返回 200/206，且响应含 `Access-Control-Allow-Origin: *`。

## 根因

这些真实媒体上游拒绝 Cloudflare Worker 出口，而不是订阅源、D1、Secret、请求头或 HLS 清单大小配置错误。

## 修复

- Worker 1.1.3 仅在普通 `/api/proxy` 已通过账户会话或子资源 token 校验、目标 URL 已通过上游 URL 校验，并且上游对 Worker 返回 403 时，返回 `307 Location` 到该已验证媒体 URL。
- 浏览器随后直接请求允许 CORS 的媒体上游；401、其他失败状态、IPTV 路由、私网阻断、清单上限、签名与同源边界保持不变。

## 回归

- RED：新增 403 媒体场景期望 307，旧实现实际返回 502。
- GREEN：403 返回 307、`Location` 为已验证目标、同源 CORS 与 `no-store` 保留；401 仍映射为 502。
- 全量：`npm test` 为 104/104；`node --check _worker.js`、`npm run check:size` 与 `git diff --check` 通过。
