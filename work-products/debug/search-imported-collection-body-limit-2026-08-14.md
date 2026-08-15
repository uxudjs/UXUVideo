# 78 源搜索请求体被拒绝

## 复现

- 生产网页已登录，并通过设置页订阅导入 78 个有效视频源。
- 搜索“痴迷”时，页面显示 `JSON request body is invalid.`。
- `../tests/high-fanout-routes.test.mjs` 构造同形态的 78 源请求；请求体超过 16 KiB，修复前稳定返回 HTTP 400 `INVALID_REQUEST`。

## 根因

`../../_worker.js` 的通用 `readJsonBody` 固定使用 16 KiB 的认证请求上限。高扇出路由在应用账户的 12/32 源上限之前先解析完整来源集合，因此网页允许保存的合法来源集合会被认证限额提前拒绝。

订阅源的所有权仍在用户网页配置和账户 D1 文档中；本缺陷与 Worker 明文订阅变量无关，也不需要新增或修改该变量。

## 最小修复

- `readJsonBody` 保留 16 KiB 默认值，认证及其他小请求的边界不变。
- 仅高扇出路由显式使用既有 512 KiB 用户文档上限。
- 搜索进入业务逻辑后仍只执行账户允许的前 12/32 个源；未放宽并发、结果量或权限。

## 验证

- RED：78 源回归测试返回 400。
- GREEN：同一测试返回 200，并确认 Paid 账户只发起 32 个上游请求。
- 安全边界：超过 512 KiB 的高扇出请求仍返回 400，且不发起上游请求。
- 完整本地门禁：`npm test` 102/102、`node --check _worker.js`、gzip 39,685/3,145,728 bytes、差异秘密扫描和 `git diff --check` 均通过。
- 发布身份：Worker、`package.json`、lockfile、README、CHANGELOG 与版本断言已同步为 1.1.1。
- 待完成：commit、push、Cloudflare Worker 部署，以及部署后浏览器搜索/播放验证；这些动作不由本地门禁自动授权。

## 回滚

恢复 `readJsonBody` 的固定 16 KiB 上限及高扇出调用点即可回滚代码；该操作会重新引入大来源集合无法搜索的问题，不涉及 D1 数据迁移。
