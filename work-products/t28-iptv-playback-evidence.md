# T28 IPTV 多线路播放与兼容策略证据

状态：**本地实施与验证完成**。不包含 commit、push、部署、真实 Cloudflare/D1、真实 IPTV 上游或实体设备证明。

## 交付结果

- UXUV-Pages 新增 `components/iptv/IPTVPlayer.tsx` 与 `lib/iptv/playback-policy.ts`：线路默认显示前三条、可展开全部；最多三并发经同源 `/api/ping` 测量延迟；失败后在未尝试线路内有界切换。
- H.264 线路优先于未知与 HEVC 线路；HLS master manifest 优先选择 AVC level。仅有 HEVC 且浏览器不支持时，播放器显示三语兼容说明与明确失败状态。
- 切台、切线与关闭播放器通过 React key、HLS `destroy()` 和 `AbortController.abort()` 取消旧探测/旧流；播放请求仍只进入同源 `/api/iptv/stream`，UA/Referer 保持原受保护传递路径。
- IPTV 接入桌面/TV 控制层：Space/K、J/L、方向键、M、F/W/P 与 Escape；播放器焦点范围阻止方向键逃逸，Escape 关闭直播。
- Worker 运行时代码无需修改：现有受控 fetch 已具备逐跳 SSRF 复验、最多三次重定向、20 秒响应头超时、签名子资源、HLS URL 重写、Range 与取消传播。

## RED / GREEN

- RED：新增策略与播放器合同前，Pages T28 测试因 `IPTVPlayer.tsx`、`playback-policy.ts` 不存在而 0/6；Worker 重定向测试先暴露断言使用了错误的既有错误码，校正为 `UPSTREAM_URL_BLOCKED` 后验证既有失败关闭合同。
- GREEN：`iptv-playback-policy.test.mjs` 与 `iptv-playback-contract.test.mjs` 6/6；`iptv-stream-resilience.test.mjs` 2/2；IPTV/媒体浏览器回归 5/5。

## 完整本地验证

- UXUV-Pages：`npm test` 108/108；`npx playwright test` 85/85；`npm run lint`、`npx tsc --noEmit` 通过；Playwright 构建通过。
- UXUVideo：`npm test` 83/83；`node --check _worker.js`、`npm run check:size`、`git diff --check` 通过；Worker gzip 36,759 / 3,145,728 bytes。
- 视觉：Playwright 保存 320px 与 1440px IPTV 播放态；人工检查线路顺序、选中态、折叠/展开、播放器状态与横向溢出，均通过。截图位于 UXUV-Pages `work-products/tests/artifacts/playwright/`。
- 安全：两仓高置信秘密扫描无新增命中；fixture 仅使用合成 token/密码。

## 能力矩阵结论

IPTV-011 至 IPTV-022 均转为 `pass`。IPTV-014、IPTV-015、IPTV-023 继续沿用 T27 已验证结论。
