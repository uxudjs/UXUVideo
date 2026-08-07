# ESLint 存量错误基线调试记录

## 复现

- 原始命令：`npm run lint`
- 环境：Windows PowerShell、Node 20.19.2、ESLint 9.39.4、`eslint-config-next` 16.2.12。
- 稳定结果：72 个文件，139 errors、60 warnings，退出码 1。
- 分布：`components/` 71 errors，`lib/` 59 errors，`app/` 9 errors；`_worker.js`、`scripts/`、`tests/`、`work-products/` 均为 0 errors。
- 主要规则：`@typescript-eslint/no-explicit-any` 89、`react-hooks/set-state-in-effect` 18、`react-hooks/rules-of-hooks` 9、`react-hooks/refs` 8，其余 15。

## 假设与结论

1. **本次 Worker 变更引入失败：否。** 新增 Worker 与合同测试的聚焦 ESLint 为零问题；全仓计数与 T01 基线完全一致。
2. **配置或依赖意外漂移：否。** `eslint.config.mjs` 未修改；HEAD 已使用 Next 16.2.12、`eslint-plugin-react-hooks` 7.0.1 与同一推荐规则集。
3. **单一源码缺陷：否。** 139 项跨 72 个旧 Next 文件，批量改源码会超出一次调试的安全范围并引入行为回归风险。

根因是严格 Next/TypeScript/React Hooks 规则已启用，但旧应用从未清偿对应存量错误，导致 Lint 无法继续充当增量门禁。

## 最小修复

使用 ESLint 9 原生 bulk suppressions 生成根目录 `eslint-suppressions.json`：

- 仅按相对文件路径、规则和当前错误数量抑制旧错误；不修改或关闭规则。
- 只允许 `app/`、`components/`、`lib/` 条目，总数固定为 139。
- 不允许 `_worker.js`、`scripts/`、`tests/`、`work-products/` 或未来 `UXUV-Pages` 条目。
- 旧 warning 不抑制，当前 60 条仍完整显示。
- 新文件错误或同一文件/规则错误数量增加时，ESLint 仍失败。

`uxucode-debt:` 该基线只服务于旧 Next 到 Worker/Pages 的迁移。每次修复或移除旧文件后运行 `npx eslint --prune-suppressions`；在 CP5/T24 前必须清空并删除 `eslint-suppressions.json`，最终 Worker 与 UXUV-Pages 不接受存量抑制。

## RED / GREEN

- RED：`node --test work-products/tests/eslint-baseline.test.mjs` 为 1/3 通过；缺少基线文件，且全仓 Lint 仍退出 1。
- GREEN：同一命令 3/3 通过；锁定 139 条边界、全仓退出 0、新文件 `no-explicit-any` 仍退出 1。

## 验证

- `npm run lint`：通过，0 errors、60 warnings。
- `npm test`：80/80 通过。
- `npm run build`：通过；10 个静态页面，64 个客户端资源完成转译。
- `git diff --check`：通过，仅有既存 LF/CRLF 提示。

## 剩余限制

ESLint 的原生抑制按“文件 + 规则 + 数量”匹配，不锁定具体行；同一文件内等量替换一个旧错误可能仍被基线覆盖。因此它是迁移期间的增量防线，不是源码质量已修复的证明，也不能带入最终候选。
