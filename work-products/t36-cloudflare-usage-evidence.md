# T36 Cloudflare 用量卡证据

结论：**本地实施与验证完成**。super_admin 用量卡和根级分级提醒已按 KVideo 设置视觉接入；未调用真实 Cloudflare Analytics，未修改 Worker/D1，未 commit、push 或部署。

## 实施边界

- 用量卡保持在账户管理之后、播放设置之前，并使用共享 `SettingsSection` 的容器、边框、间距和响应式 token。
- 只展示 Workers 账户/本脚本请求、D1 账户/本数据库读写、D1 账户/本数据库存储及项目警戒线；不展示 Token 值。
- 总体级别、70/85/95/100 警戒线、UTC 重置倒计时、`observedAt`、stale、未配置和失败状态均有可见证据。
- 用量卡与根级 warning/critical/exhausted 提醒支持简体中文、繁体中文和英文；刷新按钮可由键盘和 TV 空间导航聚焦。
- 普通用户和 Pages 直访不请求 `/api/admin/usage`，不渲染精确用量或根级提醒。

## RED / GREEN

- RED：三次语言切换使 `/api/admin/usage` 总请求数从预期 2 次放大到 5 次；根因是用量钩子依赖随本地化会话失效文案变化的整个认证对象。
- GREEN：钩子用 ref 保留最新会话失效回调，只以账户 ID、权限和显式刷新驱动加载；三语切换不再重复请求，最终显式刷新后总数稳定为 2。
- 用量 UI 聚焦 E2E 5/5；Worker Cloudflare 用量合同 5/5。

## 视觉基线

- 用户已批准首次视觉基线；新增 UXUV-Pages `work-products/tests/fixtures/kvideo-4.9.19/t36-cloudflare-usage-1024.png`。
- 人工检查确认四指标、账户/项目边界、等级色和倒计时清晰，无敏感数据；刷新按钮保持单行。
- Playwright 以 `maxDiffPixelRatio: 0.005` 复验通过；320、768、1024、1440 四个断点无横向溢出。

## 完整本地门禁

- UXUV-Pages：`npm test` 125/125；`npx playwright test` 101/101；`npm run build`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 全绿。
- UXUVideo：`npm test` 85/85；`node --check _worker.js`、`npm run check:size`、`git diff --check` 全绿；Worker gzip 37,064 / 3,145,728 bytes。
- 两仓秘密扫描未发现 AWS access key、GitHub token、OpenAI 风格 key 或私钥候选；测试哨兵也未进入产品、存储、请求或页面内容。

## 下一步与 HOLD

- T37 只汇总既有 TV、WebView 83、三语与 WCAG 证据；发现遗漏必须退回原任务。
- 本任务不证明真实 Cloudflare Analytics、真实浏览器安装、设备、第三方脚本或生产环境；相关门禁继续由 T39/T43-T48 保持 HOLD。
