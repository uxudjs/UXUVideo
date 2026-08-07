# Repository Guidelines

## 项目结构与模块组织

项目仅保留 Next.js 网页能力：页面与 API 路由位于 `app/`，可复用界面位于 `components/`，业务逻辑、Hooks、状态、服务端代码和工具函数位于 `lib/`，共享声明位于 `types/`。静态资源放在 `public/`，文档放在 `docs/`，构建辅助脚本放在 `scripts/`。应用回归测试位于 `tests/`；完整验证器及其自测位于 `verification/`，其生成的 `artifacts/`、`cache/` 不应手工编辑。

## 构建、测试与开发命令

- `npm install`：按锁文件安装依赖。
- `npm run dev`：在本地启动开发服务器；需要局域网访问时设置 `ALLOW_LAN_ACCESS=true`。
- `npm test`：通过 `tsx` 和 Node 测试运行器执行 `tests/**/*.test.ts`。
- `npm run lint`：运行 Next.js/TypeScript ESLint 规则。
- `npm run build`：生成生产构建并转译客户端静态资源。
- `./verification/run`：在 Bash/WSL 中执行严格验证链；快速排查可用 `--quick`。

## 编码风格与命名

保持 TypeScript `strict`，优先具体类型或 `unknown`，避免 `any`。沿用相邻文件格式（通常为 2 空格缩进），不要为统一格式制造无关 diff；以 `npm run lint` 为准。使用函数式 React 组件。组件文件使用 `PascalCase.tsx`，Hooks 使用 `useFeature.ts`，工具与类型文件使用 `kebab-case.ts`，常量使用 `UPPER_SNAKE_CASE`。源码文件原则上不超过 150 行；超限时按单一职责拆分。

## 测试指南

测试文件命名为 `*.test.ts`，使用 `node:test` 与 `node:assert/strict`，测试标题应描述可观察行为。修复缺陷时添加能复现问题的回归测试；涉及验证框架时分别使用 `verification/tests/regression/` 或 `verification/tests/harness/`。提交前至少运行 `npm test`、`npm run lint` 和 `npm run build`；完整验证链声明执行 100% 应用覆盖率检查。

## 提交与 Pull Request

历史与 `CONTRIBUTING.md` 均采用 Conventional Commits，例如 `feat(player): add playback speed`、`fix(sync): reject invalid records`。每个提交与 PR 聚焦一个主题。PR 应说明变更与验证步骤，关联 Issue（如 `Fixes #123`），列出配置或文档影响，并为 UI 改动提供截图或录屏。`main` 仅通过 PR 合并；请求评审前确认测试、Lint、生产构建及相关文档均已更新。

## 安全与配置

配置优先使用 README 记录的环境变量；不要提交密码、令牌、订阅源或真实账户数据。涉及认证、代理或部署行为的改动，应在 PR 中注明默认值、兼容性与回滚方式。
