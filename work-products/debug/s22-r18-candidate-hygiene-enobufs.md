# S22-R18 candidate hygiene `ENOBUFS` 调试记录

## 结论

`work-products/tests/candidate-hygiene.test.mjs` 的 Git 文件枚举使用 `execFileSync` 一次缓冲完整 `git ls-files --cached --others --exclude-standard -z` 输出，但没有设置 `maxBuffer`。R18 时 Worker 输出为 1,255,045 bytes、8,843 paths，超过 Node.js 20.19.2 的 1 MiB 默认上限，因此子进程在实际卫生扫描前以 `spawnSync git ENOBUFS` 失败。

Node.js 20.19.2 官方 `child_process.execFileSync()` 文档说明：`maxBuffer` 是 stdout/stderr 的字节上限，超出时终止子进程，默认值为 `1024 * 1024`：
https://r2.nodejs.org/docs/v20.19.2/api/child_process.html#child_processexecfilesyncfile-args-options

## 最小修复

- 保留原 Git 可执行文件、参数、NUL 分隔解析、候选过滤和卫生规则。
- 为 `gitFiles()` 增加可注入执行函数，仅用于无外部进程的容量回归。
- 为实际 `execFileSync` 设置显式且有界的 128 MiB `maxBuffer`，与仓库现有 rollback drill 的子进程边界一致。
- 新增合成 1,048,578-byte Git 输出回归，证明配置容量超过 Node 默认值。

## RED

命令：

```text
node --test --test-name-pattern "Git file enumeration budgets output above the Node default buffer" work-products/tests/candidate-hygiene.test.mjs
```

结果：exit 1；新增回归报告 `maxBuffer missing cannot hold 1048578 bytes`。其他 9 项因名称过滤跳过。

## GREEN

| 验证 | 结果 |
|---|---|
| 同一超默认缓冲回归 | 1 pass，0 fail |
| `node --test work-products/tests/candidate-hygiene.test.mjs` | 10 pass，0 fail；真实候选卫生扫描完成 |
| `npm test` | 216 pass，0 fail |
| `node --check _worker.js` | exit 0 |
| `npm run check:size` | source 168196 bytes；gzip 40101 / 3145728 bytes |
| `git diff --check` | exit 0；仅现有工作树行尾提示 |

## 边界

- 本次只修改 `work-products/tests/candidate-hygiene.test.mjs` 中的 Git 枚举测试基础设施，并新增本调试记录；保留该文件已有未提交改动。
- 未修改产品逻辑、Pages 仓库、依赖、版本、历史 R18 receipt 或 todo 状态。
- 历史 `run-20260821-s22-r18-01` 仍是不可重用的 blocked attempt；本调试不代表 R18、Pages、跨仓身份、rollback、远程 CI 或生产门禁已重新执行。
- 未执行 commit、push、部署、安装或远程状态变更。
