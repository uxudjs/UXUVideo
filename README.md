# UXUVideo Worker

UXUVideo 现在由一个自包含的 Cloudflare Worker 与一个不可变的静态前端组成：

- 后端与静态入口：[`_worker.js`](./_worker.js)，版本 `1.0.0`，API Contract `1`。
- 前端：UXUV-Pages `0.1.2`，固定基址 `https://uxudjs.github.io/UXUV-Pages/0.1.2/`。
- 数据：Cloudflare D1；不再使用 Next.js、Node 服务端或 Upstash Redis。

Worker 会校验 Pages release manifest 与资产 SHA-256，再从自身域名提供页面和 API。直接访问 GitHub Pages 只显示部署指引，不建立认证会话。

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
| `VIDEOTOGETHER_ENABLED` / `VIDEOTOGETHER_SCRIPT_URL` / `VIDEOTOGETHER_SETTING_URL` | 可选一起看集成；脚本 URL 必须为 HTTPS |

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

Pages 版本不可覆盖。新前端必须使用新的语义版本和完整 release manifest，先发布 Pages，再把 `_worker.js` 中的 Pages 版本、基址、commit 与 manifest SHA-256 同步到同一个精确候选。

发布 Worker 前保存上一版 `_worker.js` 的完整字节与 SHA-256。若新 Worker 失败，回滚到上一版 Worker；不要修改或覆盖已发布的 Pages `0.1.2`，前端回滚只恢复 Worker 对仍保留的旧版本 pin。D1 schema 变更必须保持向后兼容，回滚不得依赖破坏性迁移。

## 安全与许可

- 只接入你有权使用且允许当前部署方式访问的内容来源。
- Worker 会限制同源写入、私网目标、重定向、响应大小、超时、缓存和日志字段；这些保护不能替代来源授权与部署者自己的账户安全。
- 本项目沿用 [MIT License](./LICENSE)，保留原作者 Kuek Hao Yang 的版权归属。
