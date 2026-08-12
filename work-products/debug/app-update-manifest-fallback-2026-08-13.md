# `/api/app-update` manifest 回退故障

日期：2026-08-13

## 复现

当前 GitHub 更新源的 `app-release.json` 返回 404，`package.json` 与 `_worker.js` 可用。修复前，以已认证请求调用本地候选：

- `GET /api/app-update` 返回 HTTP 200，但状态为 `check-failed`；
- `GET /api/app-update?artifact=worker` 返回 HTTP 502 `APP_UPDATE_FETCH_FAILED`。

回归测试 `work-products/tests/app-update-artifact.test.mjs` 在修复前得到 `502 !== 200`。

## 根因

`appUpdateSource` 内的 `rawBase` 是局部变量；`loadAppUpdateState` 在另一个函数作用域直接使用该变量拼接 `package.json` URL。manifest 缺失时产生 `ReferenceError`，随后被兼容回退的 `catch` 转换为检查失败。

## 修复

让 `appUpdateSource` 显式返回固定的 `packageUrl`，`loadAppUpdateState` 只使用 `source.packageUrl`。未改变仓库/分支白名单、鉴权、请求预算、大小上限或错误合同。

## 验证

- 新增 manifest 404 → `package.json` → `_worker.js` 回归测试：RED 后 7/7 GREEN；
- Worker 完整测试：96/96 GREEN；
- `node --check _worker.js`：GREEN；
- Worker gzip：39,422 B / 3 MiB；
- 真实 GitHub 路径：metadata 为 `up-to-date`，artifact 返回 HTTP 200。

## 剩余发布条件

远端与本地 Worker 都声明 `1.0.0`，但字节不同。代码故障已修复，但发布前仍需通过独立版本和冻结发布源保证一键复制得到待部署候选；本次调试未提交、推送或部署。
