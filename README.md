# UXUVideo

基于 Cloudflare Workers 与 D1 的自托管视频聚合应用，提供多来源搜索、在线播放、账号管理和跨设备同步。当前 Worker 版本 `1.1.4`。

应用界面由 UXUV-Pages 提供，实际使用请访问你部署的 Worker 域名。本项目不内置视频内容或订阅源，部署后需自行配置合法来源。

### 主要功能

- 🔍 **聚合搜索** - 同时搜索多个视频源，并按来源、类型、语言等条件筛选结果
- ▶️ **在线播放** - 支持常见 HLS 视频、播放记录、收藏、弹幕与广告关键词过滤
- 👤 **账号管理** - 支持管理员与普通账号，来源、收藏和历史记录按账号隔离
- ☁️ **跨设备同步** - 账号设置与资料通过部署者自己的 D1 数据库同步
- 📺 **扩展体验** - 支持 IPTV、Premium、PWA、电视遥控导航和 VideoTogether 一起看
- 🌐 **多语言界面** - 支持简体中文、繁体中文和英语

### 部署使用

#### 1. 准备配置

- 创建 Cloudflare D1 数据库，并以 `DB` 绑定到 Worker
- 设置 `ADMIN_PASSWORD` 作为首次管理员密码
- 设置不少于 32 字符的高强度 `AUTH_SECRET`

#### 2. 创建 Worker

在 Cloudflare Dashboard 新建 Worker，粘贴仓库根目录的 [`_worker.js`](./_worker.js)，绑定 `DB` 并添加上述两个 Secret，然后部署。

#### 3. 首次登录

访问 Worker 域名，使用用户名 `admin` 和 `ADMIN_PASSWORD` 登录。首次登录会创建管理账号，之后请在应用设置中新增和管理其他账号。

`https://uxudjs.github.io/UXUV-Pages/` 是公开界面资源地址，GitHub Pages 不是应用入口；直接访问只会显示部署提示。

### 使用方法

1. 登录后点击右上角的用户首字符进入设置。
2. 添加单个来源：在“个人视频源”填写名称和 HTTPS 接口地址。
3. 添加订阅：进入“设置 → 视频源管理 → 导入 → 订阅”，填写名称和链接，预览后导入有效来源。
4. 等待设置页显示同步完成，返回首页即可搜索和播放。

网页设置是普通用户配置视频源和订阅的入口。同一账号的设置会通过部署者的 D1 数据库同步，方便在不同设备继续使用。订阅链接由 Worker 读取，浏览器不会直接请求该链接。

`SUBSCRIPTION_SOURCES` 仅适合部署者提供统一预设；个人或家庭账号应在网页中分别维护自己的来源和订阅。不要把密码、Token、私人订阅或真实账号数据写入源码或提交到仓库。

### 环境变量

| 名称 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- | :--- |
| `DB` | D1 绑定 | ✅ | 无 | 保存账号、会话和用户数据 |
| `ADMIN_PASSWORD` | Secret | ✅ | 无 | 首次管理员登录密码 |
| `AUTH_SECRET` | Secret | ✅ | 无 | 登录会话安全密钥，至少 32 字符 |
| `ADMIN_USERNAME` | 变量 | ❌ | `admin` | 首次管理员用户名 |
| `ADMIN_DISPLAY_NAME` | 变量 | ❌ | `admin` | 首次管理员显示名称 |
| `PREMIUM_PASSWORD` | Secret | ❌ | 关闭 | Premium 访问密码 |
| `SITE_NAME` / `SITE_TITLE` / `SITE_DESCRIPTION` / `SITE_ICON_URL` | 变量 | ❌ | 内置值 | 站点名称、标题、说明和图标 |
| `SUBSCRIPTION_SOURCES` | 变量 | ❌ | 空 | 部署者统一提供的系统预设订阅 |
| `IPTV_SOURCES` | 变量 | ❌ | 空 | IPTV 系统预设 |
| `DANMAKU_API_URL` | 变量 | ❌ | 空 | 系统预设弹幕 API |
| `MERGE_SOURCES` | 变量 | ❌ | `false` | 设为 `true` 或 `1` 时默认合并同名来源 |
| `AD_KEYWORDS` | 变量 | ❌ | 空 | 逗号或换行分隔的广告关键词 |
| `PERSIST_SESSION` | 变量 | ❌ | `true` | 设为 `false` 时关闭持久登录 |
| `VIDEOTOGETHER_ENABLED` | 变量 | ❌ | `true` | 允许账号开启一起看；账号内默认关闭，设为 `false` 或 `0` 可全局禁用 |
| `VIDEOTOGETHER_SCRIPT_URL` / `VIDEOTOGETHER_SETTING_URL` | 变量 | ❌ | 内置值 | 可选的 HTTPS 自定义入口 |
| `CF_ANALYTICS_API_TOKEN` | Secret | ❌ | 关闭 | Cloudflare 用量面板的只读 Token |
| `CF_ACCOUNT_ID` / `CF_WORKER_SCRIPT_NAME` / `CF_D1_DATABASE_ID` | 变量 | ❌ | 空 | 用量面板对应的账号、Worker 和 D1 标识 |

启用 Cloudflare 用量面板时，最后两行配置需要同时填写；未完整配置时，设置页会显示“未配置”。

### 使用限制

- 项目以 Cloudflare Free 套餐和个人使用场景为主要目标，实际额度与计费以 Cloudflare 当前规则为准。
- 搜索和播放质量取决于你配置的第三方来源；部分来源可能限制 Cloudflare 网络访问。
- IPTV、弹幕和 VideoTogether 均为可选功能。VideoTogether 会加载其第三方资源，不需要时可通过 `VIDEOTOGETHER_ENABLED=false` 关闭。

### 更新与回滚

- 界面的小版本更新通常会自动生效，无需重新配置账号或 D1。
- 更新 Worker 前请保留当前 `_worker.js` 副本，然后在 Cloudflare Dashboard 替换源码并重新部署。
- 如果新 Worker 出现问题，恢复上一份 `_worker.js` 即可；不要删除现有 D1 数据库或 Secret。

### 免责声明

- 本项目仅供学习、研究与个人自托管使用，请遵守所在地法律法规以及内容来源的许可和服务条款。
- 本项目不提供视频内容或订阅源，也不保证第三方来源、Cloudflare、IPTV、弹幕或 VideoTogether 的可用性。
- 部署者负责保护 Cloudflare 账号、Secret 和用户数据，并自行承担使用第三方服务产生的费用与风险。
- 本项目沿用 [MIT License](./LICENSE)，保留原作者 Kuek Hao Yang 的版权归属，并按许可证“按原样”提供。
