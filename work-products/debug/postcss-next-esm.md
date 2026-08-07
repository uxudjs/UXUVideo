# Next webpack / PostCSS ESM 构建故障

日期：2026-08-07  
状态：已修复

## 复现

`npm run build` 在处理 `app/globals.css` 与 `components/player/web-fullscreen.css` 时稳定失败：Next 16.2.12 的 webpack PostCSS 加载器通过 CommonJS `require()` 装载 `postcss-preset-env@11.2.0`，触发 `ERR_REQUIRE_ESM`。

## 根因

- `postcss.config.mjs` 按 Next 要求使用插件名称字符串。
- Next 的自定义 PostCSS 加载器只接受字符串配置，并在内部调用 `require(pluginPath)`。
- `postcss-preset-env@11.2.0` 只导出 `dist/index.mjs`，没有 `exports["."].require` 条件入口。
- 项目 CSS 使用 `color-mix()`，不能通过删除插件规避故障。

## 最小修复

将 `postcss-preset-env` 从 `^11.2.0` 调整为 `^10.6.1` 并同步 lockfile。10.6.1 保留同一插件能力、支持 Node 18+，且为 `require` 提供 `dist/index.cjs`。PostCSS 配置与产品 CSS 均未修改。

## RED / GREEN

- RED：`work-products/tests/postcss-loader-compat.test.mjs` 检测到 v11 的 CommonJS 条件入口为 `undefined`。
- GREEN：降级后合同测试通过，并成功通过 Next 加载器处理最小 `color-mix()` CSS。

## 验证

- `node --test work-products/tests/baseline-contract.test.mjs work-products/tests/postcss-loader-compat.test.mjs`：4/4 通过。
- `npm test`：80/80 通过。
- `npm run build`：通过；完成 webpack 编译、TypeScript、10 个静态页面生成与 64 个 Chrome 69 客户端资源转译。
- `git diff --check`：通过，仅有既存 LF→CRLF 提示。

## 剩余不确定性

Browserslist 提示 `caniuse-lite` 数据已有 6 个月；这不是本故障原因，也不阻塞构建，本次未扩大范围更新依赖数据库。T01 记录的全仓 lint 与严格验证其他失败仍是独立问题。
