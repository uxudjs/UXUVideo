# FRONTEND_INTEGRITY_ERROR 诊断

## 现象

- `GET https://my-blog.y96hz26c5k.workers.dev/` 返回 `503` 与 `FRONTEND_INTEGRITY_ERROR`。
- 同一 Worker 的 `GET /api/config` 返回 `200`，报告 Worker `1.0.0`、Pages `0.2.0`、API contract `1`。
- Worker 的 `/index.html` 与 `/favicon.ico` 同样返回 `503`，故障位于静态 Pages 资源链路，而不是单一路由或浏览器缓存。

## 对照证据

- 当前公开 `release-manifest.json` 返回 `200`，Pages commit 为 `3e11e631248edfe547018023352e40d0147a660b`，原始字节 SHA-256 为 `e75c5aafe766ca1f532e49e076317616e429c97e7ddb7305929a8ccd8bebaed8`。
- 当前公开 `index.html` 的实际 SHA-256（Base64）为 `afLwcUQECxQmwBFkB+E007N7NY/H6K6ebFfvBHg9mak=`，与 manifest 完全一致。
- 仓库当前 Worker 读取同一份公开 manifest 与 `index.html` 时返回 `200`。
- 用户确认线上已经复制当前 Worker，因此本地 `200` 与线上 `503` 是 Node 和 Cloudflare Workers 运行时差异，不能再归因于旧 Worker。
- `/api/config` 成功证明 manifest 已经完成抓取与校验；首页只可能在后续资产抓取或资产响应校验阶段失败。
- 资产校验此前强制要求上游 `Content-Length`。Cloudflare Workers 会自动协商压缩，并由运行时管理流式响应长度，子请求响应不能被假定始终携带该头。

## 结论

线上 Pages 发布物自洽。高置信度根因是资产 `Content-Length` 在 Cloudflare 子请求环境中缺失，而旧校验把“由运行时管理长度”误判成完整性错误。这能同时解释 manifest/API 正常、本地 Node 正常，以及所有线上静态资源统一 `503`。

修复允许缺失 `Content-Length` 的响应进入已有的 5 MiB 限流流；非法或超限的已声明长度仍然 fail-closed。`work-products/tests/pages-integrity.test.mjs` 以 RED/GREEN 覆盖该运行时差异。生产确认仍需重新复制修复后的 `_worker.js`；本次诊断不执行 commit、push 或部署。

## 复现

只读线上探针：

```powershell
.\work-products\debug\probe-frontend-integrity.ps1
```

本地候选读取线上 Pages：

```powershell
node --input-type=module -e "import worker from './_worker.js'; const response=await worker.fetch(new Request('https://worker.example/'),{},{}); console.log(response.status, response.headers.get('X-UXUV-Pages-Version'));"
```
