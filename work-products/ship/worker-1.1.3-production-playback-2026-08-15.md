# Worker 1.1.3 生产发布门禁

结论：**NO-GO（真实播放）**。搜索已恢复并通过生产验证，但真实 HLS 播放仍未通过；不得把本轮标记为完整发布成功。

## 已发布候选

- Worker 1.1.1：提交 `4c10497d4e426fa76653b22056d1f22e84354171`，Cloudflare 部署 `db1c84cb`。
- Worker 1.1.2：提交 `018ec89`，将 HLS 清单 URI 上限由 512 提升为 2,048，并复用单个 HMAC key；Cloudflare 部署 `0bed5be9`。
- Worker 1.1.3：提交 `9a1c2150aaf3cdc83ead6484c5e1ce51b226745c`，仅对普通 `/api/proxy` 的已验证目标在上游返回 403 时回退 307；当前 Cloudflare 部署 `0df8ee8d`。
- 本地 `HEAD` 与 `origin/main` 均为 `9a1c2150aaf3cdc83ead6484c5e1ce51b226745c`。

## 生产验证

- `/api/config?cb=0df8ee8d`：Worker `1.1.3`、Pages `0.2.0`、已认证。
- 搜索“痴迷”：**GREEN**，返回 119 条结果，覆盖多个账户 D1 订阅源。
- 新浪线路：`readyState=0`、`currentTime=0`、时长为空，页面显示“媒体播放失败”。
- 非凡线路：相同失败；生产代理请求号 `4310f3e1-1b84-4d8a-9645-0389500a5d00`，补浏览器 User-Agent 与正确 Referer 后请求号 `d1db26ef-d718-4d6a-8c76-79d14aaceb6c`，上游仍为 403。
- 最大资源（搜索结果 `id=125409`）：Worker `1.1.3`，`readyState=0`、`currentTime=0`、时长为空，页面显示“媒体播放失败”。
- 无尽资源（搜索结果 `id=161319`）：Worker `1.1.3`，`readyState=0`、`currentTime=0`、时长为空，页面显示“媒体播放失败”。
- 307 回退分支已在生产生效，但 Hls.js 未能完成跨域重定向后的加载；没有观察到播放时间增长。

## Blocker

- 多个真实媒体上游拒绝 Cloudflare Worker 出口；浏览器端 Hls.js 也没有通过 Worker 的 307 回退完成加载。
- 修复需要评估并验证 Pages 播放器的浏览器直连回退，属于同级 `UXUV-Pages` 仓库的前端改动，超出本次 Worker 部署范围。

## Acknowledged

- 搜索问题已在生产解决。
- 订阅仍由用户在网页配置并保存到账户 D1 文档；本轮没有新增或修改 Worker 明文订阅变量、Secrets、D1 binding 或 schema。
- 本轮 Worker 本地门禁：`npm test` 104/104、`node --check _worker.js` 通过、gzip 39,767/3,145,728 bytes、`git diff --check` 通过、差异秘密扫描 0 命中。

## 回滚

- 当前 `0df8ee8d` 异常时可回滚至 `0bed5be9`（Worker 1.1.2）；这会移除 403 的 307 回退，但保留大型 HLS 清单修复。
- 若需回滚搜索修复前状态，上一生产基线为 `31f767e4`；该操作会重新引入大型订阅源搜索失败，不推荐。
