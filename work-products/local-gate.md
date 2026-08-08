# T24 / CP5 本地总门

日期：2026-08-08

结论：**GO（CP5：可进入 T25 远端测试；不代表 Worker 已部署或可生产发布）**

## 精确身份与哈希

| 项目 | 观测值 | 证据边界 |
| --- | --- | --- |
| UXUVideo base HEAD | `28334f41407082ae1028fa4a4180bcc46d31c52a` | 当前工作树含未提交迁移，不是候选 commit |
| Worker 版本 / API Contract | `1.0.0` / `1` | `_worker.js` 常量与响应合同 |
| `_worker.js` SHA-256 | `78d1f38218febde31cec491bc15f6ea64f169d07f2f908ad933394d7a43097df` | 当前本地文件精确字节 |
| Worker 源码 / gzip | `144888` / `34469` bytes | gzip level 9；上限 `3145728` bytes |
| UXUVideo lock SHA-256 | `7928261645317b5639cd2d670d3e7e31c66da6eebb64c5a5e7f5512dd3e57c38` | 零依赖 lockfile |
| 当前 Worker Pages pin | `0.1.2` / `4bc847affa76755a5c99ce249d793aa43e0b83bb` / `27c06d4a2d3de542da0d6685fc89d8bf6d4d01f34ac52000fb8f1f3f8ec6f10c` | 已发布 `origin/gh-pages:0.1.2` 的精确合同 |
| UXUV-Pages `main` HEAD | `4bc847affa76755a5c99ce249d793aa43e0b83bb` | 已推送的 0.1.2 源码 commit |
| UXUV-Pages `gh-pages` HEAD | `64cf5c2541e7c4165ca84bf5a1b5fdd48a20821b` | 已推送并由 Pages 提供服务的发布 commit |
| 0.1.2 线上 manifest | `27c06d4a2d3de542da0d6685fc89d8bf6d4d01f34ac52000fb8f1f3f8ec6f10c` / `71` assets | 线上精确字节；manifest 内 `gitCommit` 匹配 `main` HEAD |
| UXUV-Pages lock SHA-256 | `f556299aaf0fd36febfb894a963df940202e6c067c1db8cc027c392272464ac8` | 已发布源码的 lockfile |

0.1.2 使用固定 `generateBuildId`。发布前连续构建及 `npm ci` 冷安装构建的本地验证清单 SHA-256 均为 `22c5d71ea5682e62c59aa062c1dc8a015949a4ef8a69b71367a393e90a5c490c`；发布清单包含最终 commit，因此其精确 SHA-256 为上表的 `27c06d4a…`。

## 本地验证

### UXUVideo

- Pages 完整性回归：RED 3/7（Worker 仍固定 0.1.1）→ GREEN 7/7（精确固定 0.1.2）。
- 线上 503 诊断回归：RED 4/7（日志丢失失败阶段）→ GREEN 7/7；仅增加固定枚举的 `failureStage` / `failureReason`，不记录异常原文、URL 或凭据。
- `node --check _worker.js`：PASS。
- `npm test`：74/74 PASS。
- `npm run check:size`：PASS，gzip `34098 / 3145728` bytes。
- Worker 运行时 `node:` / Upstash / `require(` / `Buffer` / `process.` 扫描：0 命中。
- 秘密值模式扫描：0 命中。
- `git diff --check`：PASS（仅换行提示）。

### UXUV-Pages 0.1.2 发布身份

- GitHub Actions Pages run #4：PASS。
- 线上根路径重定向到 `/UXUV-Pages/0.1.2/`。
- 8 个业务路由：HTTP 200。
- 线上 manifest：`pagesVersion=0.1.2`、`gitCommit=4bc847a…`、API Contract `1`、Worker range `>=1.0.0 <2.0.0`。
- 线上 manifest 列出的 71/71 资产：逐文件 SHA-256 与字节数匹配，0 失败。

### UXUV-Pages 0.1.2 发布前本地门

- `npm test`：28/28 PASS。
- `npm run lint`、`npx tsc --noEmit`、Next.js 16.3.0 build：PASS。
- `npx playwright test`：21/21 PASS。
- 真实 `out/` PWA/清单聚焦：5/5 PASS；71 assets。
- 官方 registry 生产依赖审计：0 vulnerabilities。
- 构建产物秘密值扫描与 `git diff --check`：PASS。

## CP5 闭合与剩余边界

1. UXUV-Pages 0.1.2 的源码 commit、发布 commit、线上 manifest SHA 与 71 个资产已形成可追溯的不可变身份。
2. Worker 已精确固定该身份，回归与本地总门全绿，因此本地候选可进入 T25。
3. 尚未创建或修改 Cloudflare 测试 Worker、测试 D1、Secret、Analytics Token，也未执行 Free/row metrics/30 分钟受控 HLS 门。

因此 CP5 为 GO，但整体部署/发布仍为 **NO-GO**。本轮未执行 UXUVideo commit、push、Worker/D1 修改或 Cloudflare 生产切换。

## 下一授权点

T25 需要单独授权后才能在隔离的测试 Worker/D1 上验证 Cloudflare Free 预算、row metrics、认证/同步/媒体合同与 30 分钟受控 HLS。T25 全绿后，T26 仍只给精确候选的发布/回滚 GO 或 NO-GO，不自动扩大 commit、push 或部署权限。
