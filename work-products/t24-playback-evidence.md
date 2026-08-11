# T24 播放生命周期本地证据

日期：2026-08-09

结论：**GREEN（仅本地实现与 fixture 证据）**。未执行 commit、push、Pages/Worker 部署、真实 Cloudflare/D1、真实第三方脚本或设备验证。

## 已闭合行为

- HLS 实例销毁、请求取消、0/2/3 网络重试上限和最多 2 次媒体恢复。
- `none`、`retry`、`always` 均只使用同源 `/api/proxy` 或 `/api/iptv/stream`；浏览器不直连上游。
- Range 206、上游取消传播、缓冲检测、按延迟有界切源和跨静态路由重载的失败链防回环。
- 5 秒本地历史节流、60 秒远端同步延迟、跨重载延迟保持、同标题单记录和 42/57 秒断点恢复。
- 三来源一次 SSE 分辨率探测、episode-scoped session cache、播放实测分辨率覆盖探测值、20/50/100 ms 稳定排序。

`PLY-S002` 为 SPEC 13.3 的 `approved-difference`：原 KVideo 的浏览器直连语义被安全边界替换为同源 Worker URL 上的原生解码与零自动网络重试。

## 验证结果

### UXUV-Pages

- T24 静态合同：4/4 PASS。
- T24 浏览器合同：3/3 PASS。
- 完整静态门：84/84 PASS。
- 完整 Playwright：76/76 PASS。
- `npm run build`、`npm run lint`、`tsc --noEmit`、`git diff --check`：PASS。
- 产品/工作产品秘密值模式扫描：0 命中。

### UXUVideo Worker

- 媒体/安全/预算聚焦合同：19/19 PASS。
- 完整 Worker：77/77 PASS。
- `node --check _worker.js`：PASS。
- Worker gzip：34925 / 3145728 bytes。
- `node:`、`require(`、`Buffer`、`process.` 运行时扫描：0 命中。
- 产品/工作产品秘密值模式扫描与 `git diff --check`：PASS。

## 证据边界

上述结果只证明当前两个脏工作树中的本地代码、静态导出和确定性浏览器/Worker fixture。真实 PiP/Cast、真实第三方媒体、Cloudflare Free 用量、D1 行数、部署与生产可用性仍未验证或授权。
