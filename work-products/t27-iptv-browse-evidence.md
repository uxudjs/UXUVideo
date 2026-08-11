# T27 IPTV 来源、分组、搜索与三级浏览证据

日期：2026-08-09

结论：**GREEN；仅证明本地解析、确定性 Worker fixture、锁定 Chromium 与四断点截图，不代表已 commit、push、部署、真实 IPTV 源可用性或真实 TV 遥控器表现。**

## 已闭合范围

- M3U/M3U8 支持相对 URL、分组、tvg 字段、`#EXTVLCOPT` 与 EXTINF UA/Referer；同源重复频道合并为有界多线路。
- JSON 支持数组、`channels/list/items/data` 与 `lives[].channels`；TVBox/OK 风格 `lives`/`urls` 引用最多 25 项、最多 3 层。
- 根来源、嵌套引用与自定义来源仅接受 HTTP(S)；最多 32 个来源、5,000 个频道、每页 100 个频道。
- 所有来源/嵌套请求共享 3 并发限制；每个根来源使用 5 分钟、16 项有界内存缓存，刷新可显式绕过；单源失败不清空其他来源。
- 自定义来源支持新增、编辑、删除、稳定 ID、UA 与 Referer，并通过账户配置文档跨设备同步；回滚不会删除已有来源。
- 浏览 UI 提供来源→分类→频道三栏、搜索、分页、加载/缓存/空/失败状态；左右键跨层、上下键层内循环，所有动作保留 `data-focusable`。
- IPTV 权限不足和部署禁用均显示三语解释，不发起播放列表请求；来源级 UA/Referer 最终进入同源 `/api/iptv/stream`。

## RED / GREEN

- 初始 RED：解析/加载模块与来源管理、三级浏览组件缺失，T27 定向测试 0/8。
- 解析/并发 GREEN：M3U、JSON、引用、分页、三并发、缓存和部分失败 6/6。
- UI GREEN：组件接线、三阶段焦点、三语状态 2/2；React effect 派生状态经 ESLint 拒绝后改为事件重置与渲染时派生。
- 兼容回归：旧 IPTV E2E 曾依赖硬编码中文；浏览器上下文显式固定 `zh-CN` 后，新三语产品行为与旧流程共同 GREEN。

## 验证结果

### UXUV-Pages

- T27 定向语义/合同：8/8 PASS。
- T27 浏览器 E2E：2/2 PASS；与既有媒体流程组合：4/4 PASS。
- 全量静态测试：102/102 PASS。
- 全量 Playwright：84/84 PASS；新增 UA/Referer 播放断言后 T27 再验 2/2 PASS。
- 320/768/1024/1440 截图与无横向溢出检查：PASS；人工查看 320/1440 极值布局：PASS。
- `npm run build`、`npm run lint`、`npx tsc --noEmit`、秘密扫描、`git diff --check`：PASS。

### UXUVideo Worker

- T27 未修改 Worker；既有 `/api/iptv` 与 `/api/iptv/stream` 权限/同源合同由组合 E2E 复用。
- 最近全量 Worker：81/81 PASS；Worker gzip：36,759 / 3,145,728 bytes。

## 未验证边界

- 未访问真实 M3U/M3U8/JSON IPTV 源，未声明源合法性、可用性、频道完整度或延迟。
- 缓存是浏览器会话内有界内存缓存，不持久化频道清单；真实刷新频率与源规模性能尚未在生产负载验证。
- 未使用真实 TV 遥控器、HEVC 设备、重定向链或真实 Cloudflare isolate；播放多线路与兼容策略留给 T28。
- 未 commit、push、发布 Pages/Worker，也未改真实 Cloudflare/D1/账户数据。
