# UXUVideo Worker

UXUVideo 现在由一个自包含的 Cloudflare Worker 与一个可独立发布的静态前端组成：

- 后端与静态入口：[`_worker.js`](./_worker.js)，版本 `1.1.3`，API Contract `1`。
- 前端：UXUV-Pages，固定公开根基址 `https://uxudjs.github.io/UXUV-Pages/`，不再使用版本目录。
- 数据：Cloudflare D1；不再使用 Next.js、Node 服务端或 Upstash Redis。

Worker 会校验 Pages release manifest 的语义版本、API Contract、`workerRange`、路由、MIME 与大小边界，再从自身域名流式提供页面和 API。它不固定 Pages commit 或 SHA，也不向公开 Pages 发送 Cookie、Authorization、Token、Secret 或对接密钥。直接访问 GitHub Pages 只显示部署指引，不建立认证会话。

## 部署

1. 在 Cloudflare 创建 Worker，并将 `_worker.js` 作为完整 Worker 源码。
2. 创建 D1 数据库，将 Worker 的 D1 binding 命名为 `DB`。
3. 配置下面两个必需 Secret。
4. 部署 Worker，访问 Worker 自身域名；首次登录默认用户名为 `admin`，密码为 `ADMIN_PASSWORD`。

不要把密码、Token、订阅源或真实账户数据提交到仓库。D1 表和索引由 Worker 在首次需要时幂等创建。

### 必需 Secret

| 名称 | 用途 |
| --- | --- |
| `ADMIN_PASSWORD` | 首个超级管理员的引导密码；D1 出现账户后不再用于新增引导账户 |
| `AUTH_SECRET` | 会话、限流键和媒体访问 token 的签名材料；必须使用至少 32 字符的高熵随机值 |

### 可选 Secret

| 名称 | 用途 |
| --- | --- |
| `PREMIUM_PASSWORD` | Premium 会话验证 |
| `CF_ANALYTICS_API_TOKEN` | super_admin 用量面板的只读 Cloudflare Analytics Token |

Cloudflare 用量功能采用全有或全无配置。设置 `CF_ANALYTICS_API_TOKEN` 时，还必须同时设置 `CF_ACCOUNT_ID`、`CF_WORKER_SCRIPT_NAME` 和 `CF_D1_DATABASE_ID`；缺少任意一项时，设置页显示“未配置”，不会发出 Analytics 请求。

### 普通变量

| 名称 | 用途 |
| --- | --- |
| `ADMIN_USERNAME` / `ADMIN_DISPLAY_NAME` | 首个管理员用户名与显示名 |
| `CF_ACCOUNT_ID` | 用量查询所属账户 |
| `CF_WORKER_SCRIPT_NAME` | 当前 Worker 脚本名 |
| `CF_D1_DATABASE_ID` | 当前项目使用的 D1 数据库 ID |
| `SITE_NAME` / `SITE_TITLE` / `SITE_DESCRIPTION` / `SITE_ICON_URL` | 站点品牌信息 |
| `SUBSCRIPTION_SOURCES` | 认证后可见的订阅源配置 |
| `IPTV_SOURCES` | 有 `iptv_access` 权限的账户可见的 IPTV 源配置 |
| `DANMAKU_API_URL` | 弹幕聚合 API |
| `MERGE_SOURCES` | `true` 或 `1` 时默认合并同名来源 |
| `AD_KEYWORDS` | 逗号或换行分隔的广告关键词 |
| `PERSIST_SESSION` | 设为 `false` 时使用非持久会话 Cookie |
| `VIDEOTOGETHER_ENABLED` | 一起看默认可用；设为 `false` 或 `0` 时由部署管理员关闭 |
| `VIDEOTOGETHER_SCRIPT_URL` / `VIDEOTOGETHER_SETTING_URL` | 可选 HTTPS 自定义覆盖；留空时使用 `_worker.js` 内置的固定官方入口，账户内开关仍默认关闭 |

VideoTogether 无需用户另找脚本 URL。账户管理员在应用的播放器设置中开启“一起看”后才会加载第三方脚本。官方入口的顶层文件已固定到 Git commit，但其上游 loader 仍可能请求 VideoTogether 自己维护的动态资源，因此不属于首方 Pages 完整性保证；不接受该边界时请设置 `VIDEOTOGETHER_ENABLED=false`。

## Cloudflare Free 与用量

当前实现以 Cloudflare Free 预算为保守目标：限制账户数、会话数、同步文档大小、写入频率、请求扇出、响应头等待和媒体清单大小。它是尽力而为的工程护栏，不是对未来套餐、真实来源质量或远端长连接稳定性的保证。

super_admin 设置页显示 Worker 请求、CPU、账户级 D1 行读写/存储，以及项目所用 D1 数据库的观测值。数据通过 Cloudflare GraphQL Analytics API 拉取，缓存 5 分钟；上游失败时最多回退 1 小时陈旧数据。Analytics Token 只用于 Worker 端请求，不进入 Pages、D1、缓存键或日志。

## 本地验证

无需安装运行时依赖：

```powershell
node --check _worker.js
npm test
npm run check:size
```

`npm test` 运行 `work-products/tests/` 中的 Worker 合同、D1、安全、预算、媒体、Pages 完整性与仓库边界测试。`check:size` 使用 gzip level 9 检查压缩后 Worker 是否小于 3 MiB。

证据边界必须明确区分：

- 本地单测只证明 fixture 与静态合同。
- 本地 Pages Playwright 只证明静态导出、浏览器流程、无障碍和同源网络边界。
- 只有单独授权的 Cloudflare 测试 Worker、测试 D1、真实 Analytics 和受控长流，才能证明远端行为。
- 本地全绿不等于已 commit、已 push、已部署或生产可用。

## 更新与回滚

GitHub Pages 根目录只保留当前兼容产物，每次 GitHub Actions 运行的 artifact 负责审计与回滚。兼容的 Pages 小修订可以独立发布，不要求更新 Worker；`pagesVersion` 必须是语义版本，但同一版本允许修订当前内容。只有 API Contract 或 `workerRange` 不再兼容当前 Worker 时，才必须先更新并验证 Worker。公开 Pages 无需配置任何对接密钥。

发布前保留上一份兼容 Pages artifact。若前端修订失败，重新发布上一份兼容 artifact 到 Pages 根目录并验证公开清单即可；只有 Worker 自身变更失败或兼容合同变化时才恢复上一版 `_worker.js`。`DB` binding、`ADMIN_PASSWORD`、`AUTH_SECRET` 及其他 Worker 私有配置不进入 Pages，本轮也未放宽其安全边界。D1 schema 变更必须保持向后兼容，回滚不得依赖破坏性迁移。

## 安全与许可

- 只接入你有权使用且允许当前部署方式访问的内容来源。
- Worker 会限制同源写入、私网目标、重定向、响应大小、超时、缓存和日志字段；这些保护不能替代来源授权与部署者自己的账户安全。
- 本项目沿用 [MIT License](./LICENSE)，保留原作者 Kuek Hao Yang 的版权归属。
