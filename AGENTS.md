# Repository Guidelines

## 项目结构与模块组织

运行时只保留根目录 `_worker.js`。本地辅助脚本位于 `scripts/`，迁移计划、证据与所有测试位于 `work-products/`，测试固定放在 `work-products/tests/`。静态前端属于同级 `UXUV-Pages` 仓库；不要在本仓重新引入 Next.js UI、API route、Node 服务端或 Upstash。

## 构建、测试与开发命令

- `node --check _worker.js`：检查 Worker 语法。
- `npm test`：使用 Node 测试运行器执行 `work-products/tests/`。
- `npm run check:size`：检查 gzip 后 Worker 小于 3 MiB。

## 编码风格与命名

沿用 `_worker.js` 的原生 ESM 与 Web Platform API 风格，不添加运行时 npm 或本地文件依赖。优先小函数、明确上限、结构化错误和 fail-closed 安全边界；不要为单文件交付引入构建层。

## 测试指南

测试文件命名为 `*.test.mjs`，使用 `node:test` 与 `node:assert/strict`。修复缺陷先增加能复现问题的回归测试，再做最小修复。提交前至少运行 `node --check _worker.js`、`npm test`、`npm run check:size`、秘密扫描和 `git diff --check`。

## 提交与 Pull Request

采用 Conventional Commits，例如 `fix(auth): reject stale session`。每个提交与 PR 聚焦一个主题，说明本地验证、配置/兼容性影响与回滚；涉及 Pages UI 的改动应在 `UXUV-Pages` 仓库完成。

## 安全与配置

配置以 README 为准。不要提交密码、Token、订阅源或真实账户数据。认证、D1、代理、用量和部署改动必须注明默认值、Free 预算、兼容性、证据层级与回滚方式；本地全绿不等于授权 commit、push 或部署。
