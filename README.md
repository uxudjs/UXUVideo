# UXUVideo Worker

UXUVideo 是一个自托管的网页视频聚合界面：一个 Cloudflare Worker 提供登录、API、D1 数据与同源页面入口，UXUV-Pages 提供可独立发布的静态前端。

- 后端与静态入口：[`_worker.js`](./_worker.js)，版本 `1.1.4`，API Contract `1`。
- 前端：UXUV-Pages，固定公开根基址 `https://uxudjs.github.io/UXUV-Pages/`，不再使用版本目录。
- 数据：Cloudflare D1；不再使用 Next.js、Node 服务端或 Upstash Redis。

Worker 会校验 Pages release manifest 的语义版本、API Contract、`workerRange`、路由、MIME 与大小边界，再从自身域名流式提供页面和 API。它不固定 Pages commit 或 SHA，也不向公开 Pages 发送 Cookie、Authorization、Token、Secret 或对接密钥。直接访问 GitHub Pages 只显示部署指引，不建立认证会话。

> **项目声明：**本项目不提供、不托管、不分发任何视频内容或订阅源。部署者与用户只能接入自己有权使用且允许当前部署方式访问的来源；本项目不构成对可用性、合法性或生产适用性的保证。完整边界见[项目声明、安全与许可](#项目声明安全与许可)。

## 普通用户：从这里开始

1. 打开部署者提供的 **Cloudflare Worker 域名**。GitHub Pages 不是应用入口；直接访问 `https://uxudjs.github.io/UXUV-Pages/` 只显示部署指引，不会建立认证会话。
2. 使用部署者提供的账户登录。首次部署默认用户名为 `admin`，密码为部署者设置的 `ADMIN_PASSWORD`。
3. 点击右上角的用户首字符进入设置。单独添加来源时，在“个人视频源”填写名称与 HTTPS 接口地址。
4. 导入 JSON 订阅时，依次进入“设置 → 视频源管理 → 导入 → 订阅”，填写名称与订阅链接，选择“预览并添加订阅”，确认后导入有效来源。也可以在“导入”中粘贴 JSON、选择 JSON 文件或填写来源链接。
5. 等待设置页显示同步完成，然后返回首页搜索。第三方链接由已登录 Worker 在限制内读取，浏览器不会直接读取订阅链接。

更改会先保存在当前设备，再通过 Worker 同步到当前账户 D1 配置文档。账户自己的来源与订阅以网页设置和账户 D1 配置文档为准，不要写入 `_worker.js`、公开 Pages、README 或 Git 仓库。`SUBSCRIPTION_SOURCES` 仅用于部署者提供统一的系统预设订阅，不是普通用户的配置入口，也不应存放私人订阅。

## 部署者：5 分钟部署

1. 在 Cloudflare 创建 Worker，并将 `_worker.js` 作为完整 Worker 源码。
2. 创建 D1 数据库，将 Worker 的 D1 binding 命名为 `DB`。
3. 配置下面两个必需 Secret。
4. 部署 Worker，访问 Worker 自身域名；首次登录默认用户名为 `admin`，密码为 `ADMIN_PASSWORD`。
5. 登录后在网页设置中添加账户、来源和订阅；不要把真实账户数据或私人订阅写入源码。

不要把密码、Token、订阅源或真实账户数据提交到仓库。D1 表和索引由 Worker 在首次需要时幂等创建。

缺少 `DB`、`ADMIN_PASSWORD`，或 `AUTH_SECRET` 少于 32 字符时，认证会失败关闭并显示配置缺失。首次成功登录会在空 D1 中创建 `super_admin` 账户；D1 已存在任一账户后，`ADMIN_PASSWORD` 不再用于创建新的引导账户，现有账户使用 D1 中保存的密码凭据验证。

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
| `SUBSCRIPTION_SOURCES` | 部署者统一提供的系统预设订阅；认证后受控导入并同步到账户配置 |
| `IPTV_SOURCES` | 有 `iptv_access` 权限的账户可见的 IPTV 系统预设 |
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

## 项目声明、安全与许可

- 本项目只提供自托管软件，不提供、不托管、不分发任何视频、直播、弹幕、元数据、订阅源或账户服务。
- 内容、接口与订阅源的版权、许可、地区限制和服务条款由其各自权利人与提供方决定；部署者与用户负责确认并遵守适用法律及第三方条款。
- 搜索、订阅导入与播放会让部署者的 Worker 向所选第三方来源发出请求；账户数据保存在部署者自己的 Cloudflare D1 中。部署者负责 Cloudflare 账户、访问控制、Secret、日志、数据保留与隐私告知。
- Worker 会限制同源写入、私网目标、重定向、响应大小、超时、缓存和日志字段；这些保护只能降低风险，不能替代来源授权、账户安全或独立安全审查。
- 第三方来源、Cloudflare 和 VideoTogether 的可用性及行为不受本项目控制。本地测试、Free 预算护栏或示例配置不构成服务等级、合规性、安全性或生产可用承诺。
- 本项目沿用 [MIT License](./LICENSE)，保留原作者 Kuek Hao Yang 的版权归属，并按许可证“按原样”提供，不附带任何明示或默示担保。
