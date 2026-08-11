# T26 广告过滤、自动跳过与自动连播证据

日期：2026-08-09

结论：**GREEN；仅证明本地代码、确定性 HLS fixture 与锁定 Chromium 行为，不代表已 commit、push、部署、真实上游 HLS 广告识别率或真实设备表现。**

## 已闭合范围

- Worker 在同源媒体代理内、签名子清单改写前执行广告过滤；`off` 保持原清单字节不变，`keyword`、`heuristic`、`aggressive` 保持分级语义。
- 过滤仅移除完整媒体片段及相关 cue/interstitial 元数据；若输入损坏或规则会移除全部片段，返回原始可播放清单，避免生成损坏清单。
- 过滤模式与最多 32 个、每个最多 40 字的关键词通过同源 `/api/proxy` 传递；子清单继承同一有界策略，不引入浏览器直连上游。
- 桌面播放器提供四档可访问菜单，切换后立即更新账户设置与媒体 URL；速度菜单与广告菜单互斥，打开菜单时控制层不会自动隐藏。
- 片头跳过限制在有限时长内，恢复进度大于 0 时不覆盖用户进度；片尾与 `ended` 共用来源级去重，最多推进一次，最后一集不越界。
- 关闭自动连播时，片尾只结束当前集；切集会重置片头、片尾和去重状态。

## RED / GREEN

- 初始 RED：HLS 过滤器、自动跳过纯函数、统一 hook、播放器广告菜单与接线均缺失。
- Worker RED：代理仍返回 sponsor 片段；加入过滤前置与子清单策略传播后 GREEN。
- 测试边界修正：媒体客户端模块含既有详情/IPTV `fetch`，将“URL 构造器不得 fetch”断言收窄到 `buildMediaUrl` 函数，产品代码无需规避误报。
- 浏览器 GREEN：片头、片尾、`ended`、末集边界、关闭连播与四档过滤切换均由虚拟媒体时钟验证。

## 验证结果

### UXUV-Pages

- T26 定向语义/合同：4/4 PASS。
- T26 虚拟媒体时钟 E2E：3/3 PASS。
- 全量静态测试：94/94 PASS。
- 全量 Playwright：82/82 PASS。
- `npm run build`、`npm run lint`、`npx tsc --noEmit`、秘密扫描、`git diff --check`：PASS。

### UXUVideo Worker

- 广告过滤纯语义/代理链路：4/4 PASS。
- 全量 Worker：81/81 PASS。
- `node --check _worker.js`：PASS。
- Worker gzip：36,759 / 3,145,728 bytes。
- Node 运行时依赖扫描、秘密扫描、`git diff --check`：PASS。

## 未验证边界

- 未访问真实第三方 HLS；启发式命中率、上游变体与误杀率只由恶意/边界 fixture 证明 fail-safe，不是生产识别率声明。
- 未在真实 Cloudflare isolate、移动设备、TV、PiP 或 Cast 设备上验证播放自动化。
- 未 commit、push、发布 Pages/Worker，也未改真实 Cloudflare/D1/账户数据。
