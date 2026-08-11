# T25 弹幕聚合、轨道与 Canvas 证据

日期：2026-08-09

结论：**GREEN；仅证明本地代码、确定性 Worker fixture 与锁定 Chromium 行为，不代表已 commit、push、部署或已验证真实第三方弹幕源/Cloudflare Cache API。**

## 已闭合范围

- 播放器通过已登录同源 `/api/danmaku` 顺序执行 `search` 与 `comments`，使用 Worker 合同的 `keyword` / `episodeId` 参数；请求可取消，错误不阻断视频。
- 已选账户用户 API 优先于系统默认；没有系统默认时仍可使用用户 API；用户 API URL 不进入播放器 DOM。
- Worker 仅代理公开 HTTP(S) JSON，最大 2 MiB，不转发 Cookie/Authorization；成功结果使用 SHA-256 Cache API 键和 1 小时 TTL，并有 64 项有界内存回退。
- 弹幕解析最多 5,000 条、单条最多 200 字、时间限制 24 小时；Canvas 最多 20 轨、200 条活动弹幕。
- Canvas 支持滚动、顶部、底部轨道，以及透明度、字号、显示区域；暂停冻结、跳转清轨、网页全屏/ResizeObserver/DPR 尺寸收敛。
- 空结果和上游错误显示三语非阻断状态，不创建 Canvas，不改变视频 ready/playing 状态。

## RED / GREEN

- 初始 RED：解析器、Canvas 工具、Hook 与播放器接线缺失，T25 定向静态测试 0/6。
- 契约 RED：前端错误发送 `anime`，Worker 要求 `keyword`；真实合同回归修复后 GREEN。
- 缓存 RED：相同弹幕请求重复访问上游；加入散列 Cache API/内存回退后仅一次上游请求。
- 用户 API RED：系统默认未配置时播放器停在 `idle`；去除错误能力门后已选用户 API 正常进入 `ready`。

## 验证结果

### UXUV-Pages

- T25 定向语义/合同：6/6 PASS。
- T25 虚拟时钟 Canvas E2E：3/3 PASS。
- 全量静态测试：90/90 PASS。
- 全量 Playwright：79/79 PASS。
- `npm run build`、`npm run lint`、`npx tsc --noEmit`、秘密扫描、`git diff --check`：PASS。

### UXUVideo Worker

- 弹幕聚合/缓存定向回归：1/1 PASS。
- 全量 Worker：77/77 PASS。
- `node --check _worker.js`：PASS。
- Worker gzip：35,305 / 3,145,728 bytes。
- Node 运行时依赖扫描、秘密扫描、`git diff --check`：PASS。

## 未验证边界

- 未访问真实第三方弹幕 API，未验证其可用性、合法性或数据质量。
- Cache API 的写入键与 TTL 已由 fixture 验证，但未在真实 Cloudflare isolate/多 PoP 上验证命中和淘汰。
- 未 commit、push、发布 Pages/Worker，也未改真实 Cloudflare/D1/账户数据。
