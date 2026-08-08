# 贡献指南

UXUVideo 本仓只维护自包含 Cloudflare Worker。静态 UI 在同级 `UXUV-Pages` 仓库维护。

## 开发边界

- 运行时改动集中在 `_worker.js`；不要重新引入 Next.js、React、Upstash 或运行时 npm/本地文件依赖。
- 新测试放在 `work-products/tests/`，使用 `node:test` 与相对路径。
- 缺陷修复先写失败回归，再做最小修复；保留 D1、认证、代理、缓存、响应大小和超时的 fail-closed 边界。
- API 或 Pages 合同变化必须同步 README、CHANGELOG、版本常量和跨仓测试。
- 不提交密码、Token、真实来源或账户数据。

## 本地门禁

```powershell
node --check _worker.js
npm test
npm run check:size
git diff --check
```

PR 请使用 Conventional Commits 风格标题，说明变更范围、验证命令、配置/兼容性影响和回滚方式。涉及远端 Cloudflare、D1、Pages 或真实媒体的结论，必须与本地 fixture 证据分开陈述。
