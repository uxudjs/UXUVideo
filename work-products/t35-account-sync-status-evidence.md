# T35 账户与同步状态证据

结论：**本地实施与验证完成**。账户管理和 D1 同步状态已按现有 KVideo 设置卡片视觉接入；未连接真实 D1，未 commit、push 或部署。

## 实施边界

- `super_admin` 可在独立账户设置卡片内刷新、创建、改权和删除账户；普通用户不请求也不渲染账户管理。
- 删除账户改为可聚焦、可循环 Tab、可 Escape 返回的自定义 `alertdialog`，不再依赖浏览器原生确认框。
- 账户卡片和同步卡片均使用共享 `SettingsSection`，保持与显示设置相同的容器、边框、间距和响应式行为。
- 同步卡片显示 `loading`、`synced`、`pending`、`conflict`、`offline`、`quota`、`error` 七种状态；离线、配额和错误状态提供卡片内重试。
- 简体中文、繁体中文和英文文案均已接入；所有交互控件可由键盘和 TV 空间导航聚焦。
- 账户接口返回 401 时会清除本地会话并安全返回登录门禁；无密码、Cookie、Token 或精确用量进入页面、日志或视觉基线。

## 视觉基线

- 用户已批准首次视觉基线。
- 新增 `t35-account-settings-1024.png` 与 `t35-sync-settings-1024.png`，均位于 UXUV-Pages 的 `work-products/tests/fixtures/kvideo-4.9.19/`。
- 人工检查确认两张基线无敏感数据；Playwright 以 `maxDiffPixelRatio: 0.005` 复验通过。
- 320、768、1024、1440 四个断点均无横向溢出。

## 状态与权限证据

- 账户 CRUD、`super_admin`/普通用户权限、三语切换、焦点陷阱、会话失效和视觉基线均由 `app-flows.e2e.spec.ts` 覆盖。
- config 与 library 文档的离线、本地待写、冲突、配额、错误和恢复路径均保持可见；来源、订阅、标准/Premium 收藏与历史不发生跨模式写入。
- 聚焦回归：13/13；完整 Playwright：100/100。

## 完整本地门禁

- UXUV-Pages：`npm test` 125/125；`npx playwright test` 100/100；`npm run build`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 全绿。
- UXUVideo：`npm test` 85/85；`node --check _worker.js`、`npm run check:size`、`git diff --check` 全绿；Worker gzip 37,064 / 3,145,728 bytes。
- 两仓秘密扫描未发现 AWS access key、GitHub token、OpenAI 风格 key 或私钥候选。

## 下一步与 HOLD

- T36 继续按 KVideo 视觉接入 Cloudflare 用量卡。
- 本任务不证明真实 D1、真实浏览器安装、设备、第三方脚本、Cloudflare 或生产环境；相关门禁继续由 T39/T43-T48 保持 HOLD。
