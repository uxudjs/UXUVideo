# Worker 1.1.1 发布门禁

结论：**NO-GO（生产发布）**。本地候选全绿，但尚未获得 commit、push 与 Cloudflare Worker 部署的独立授权，生产仍运行 1.1.0，真实搜索仍返回 `JSON request body is invalid.`。

## Blocker

- 未 commit、未 push、未部署；生产搜索与播放无法用 1.1.1 复验。

## Recommended

- 授权后提交并推送 1.1.1 的精确候选，再将 `../../_worker.js` 部署到现有 Worker，保留原 D1 binding 与 Secrets。
- 部署后在已登录网页复测 78 源搜索、打开结果并验证真实播放；成功后再处理旧的错误单源记录。

## Acknowledged

- 订阅由用户在网页设置中配置并保存到账户 D1 文档；没有新增或修改 Worker 明文订阅变量。
- 认证请求默认 16 KiB、账户 12/32 源、并发、结果量和权限边界均未放宽；高扇出 JSON 请求仍以 512 KiB 拒绝超限载荷。
- 无 D1 schema 或数据迁移。

## 本地证据

- `npm test`：102/102。
- `node --check _worker.js`：通过。
- `npm run check:size`：39,685/3,145,728 bytes。
- `git diff --check`：通过。
- 新增差异秘密扫描：0 命中。

## 回滚

若部署后异常，恢复上一版 Worker 1.1.0 源码；D1 binding、Secrets 和账户数据无需变更。回滚会重新引入大来源集合搜索失败，随后应恢复 1.1.1 或等效修复。
