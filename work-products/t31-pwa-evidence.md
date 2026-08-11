# T31 PWA 安装与静态缓存生命周期证据

状态：**本地实现与自动验证完成**；真实常规浏览器安装/卸载未执行，PWA-003 按计划留给 T39/T47。未执行 commit、push、部署或仓库外安装。

## 实现结果

- manifest 恢复固定 KVideo 基线的 `orientation: "any"`，继续声明同源根入口、standalone 模式和 1024×1024 maskable 图标。
- Service Worker 安装事件用 `waitUntil()` 等待 `skipWaiting()`，升级时删除旧 UXUVideo/legacy cache，但保留无关 cache。
- 导航采用网络优先、离线回退；静态资源采用缓存优先；缓存写入失败只降级为网络响应，不再把成功请求变成失败。
- 非 GET、跨源、`/api/`、音视频扩展、audio/video destination、opaque、private 与 no-store 响应均不缓存。
- 固定 KVideo 无自定义安装按钮；安装仍由浏览器 manifest/Service Worker 能力提供，避免改变已批准视觉基线。

## RED / GREEN

- RED 4/7：manifest 缺方向声明；cache quota 会破坏成功响应；安装未延长至 `skipWaiting()` 完成。
- GREEN：PWA 合同测试 7/7；PWA 浏览器 E2E 2/2。
- 浏览器 E2E 证明 Chromium manifest 无解析错误；自动安装能力只报告 Playwright 无痕上下文固有限制 `in-incognito`。
- 浏览器 E2E 证明旧 `uxuv-static-0.1.1` 被清理、无关 cache 保留、API/媒体不进入 Cache Storage、受控在线刷新后离线文档可返回 200。

## 最终本地门禁

- UXUV-Pages：`npm test` 119/119；`npx playwright test` 92/92；`npm run lint`、`npx tsc --noEmit`、生产构建与 `git diff --check` 通过。
- UXUVideo：`npm test` 85/85；`node --check _worker.js`、`npm run check:size`、`git diff --check` 通过；Worker gzip 37,064 / 3,145,728 bytes。
- 视觉复核：standalone 能力 mock 下 320、768、1024、1440px 截图保持已批准壳层，无横向溢出；简体、繁体、英文与键盘焦点均覆盖。

## 待授权人工安装步骤

1. 在已授权且使用 HTTPS 的 Worker 候选域名，用常规 Chrome 配置文件打开 `/`；确认 DevTools Application → Manifest 无关键错误。
2. 从地址栏安装入口或浏览器菜单安装 UXUVideo；关闭标签页后从系统应用入口启动，确认以 standalone 窗口打开且 `/`、`/settings/` 可导航。
3. 在线完成一次受 Service Worker 控制的刷新；在 DevTools Network 切换 Offline 后直接刷新已访问路由，确认静态壳层加载，认证/API 不从 cache 伪造成功。
4. 在 Cache Storage 确认只有当前 `uxuv-static-<version>` 保存首方页面/静态资源，且不存在 `/api/`、认证或媒体 URL；升级候选后确认旧版本 cache 消失。
5. 回滚方式：卸载 PWA，并在 DevTools Application → Storage 清除该候选域名站点数据。

## 验收映射

- PWA-001、PWA-002、PWA-004、PWA-005、PWA-006 转为 `pass`。
- PWA-003 保持 `unverified`，直至 T39/T47 获得仓库外真实安装授权并记录证据。
