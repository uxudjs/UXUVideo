# S22-R18 两仓最终门禁（BLOCKED）

- 时间：2026-08-21T20:45:37.2647683+08:00
- 任务：`S22-R18`
- attempt：`run-20260821-s22-r18-01`
- 结论：NO-GO / `RELEASE HOLD`
- 输入身份：`work-products/debug/execution-baselines/S22-R18/run-20260821-s22-r18-01/manifest.json` 已通过 v2 manifest 自审计、prewrite 与逐命令 inputs/protected/environment/generated-namespace 复验。

## 已执行结果

| 检查 | 退出码 | 结果 |
|---|---:|---|
| `node --check _worker.js` | 0 | Worker 语法通过 |
| `npm test` | 1 | 215 项中 214 pass、1 fail |
| 定向 `candidate-hygiene.test.mjs` | 1 | 9 项中 8 pass；候选卫生扫描因 `spawnSync git ENOBUFS` 失败 |
| Git 路径清单诊断 | 0 | Worker 1,255,045 bytes / 8,843 paths；Pages 30,522 bytes / 525 paths |

失败位于 `work-products/tests/candidate-hygiene.test.mjs:27`：`gitFiles()` 通过 `execFileSync` 一次读取 `git ls-files --cached --others --exclude-standard -z`，但没有显式 `maxBuffer`。当前 Worker 路径清单超过该调用的默认缓冲上限，因此在真正的秘密、机器路径与二进制内容扫描开始前抛出 `ENOBUFS`。这是可重复的测试基础设施容量失败，不是卫生扫描 GREEN，也不能降级为可忽略告警。

## Fail-closed 边界

- 按批准计划“任一门禁失败即 `RELEASE HOLD`”，R18 在首个失败后停止。
- 未执行 R18 的 Worker 大小/diff、Pages lint/tsc/E2E/build/release/test/diff、两仓身份与 manifest 扫描、活动名称扫描及本地 rollback drill。
- `execution-baseline-tool` 与三个 Pages Node test-work 均不存在；rollback namespace 仍为 none；release staging/backup 不存在；4173/4174 端口已释放；输入与五个 Pages 保护项仍通过基线复验。
- R15—R17 的既有本地 GREEN 证据保持有效，但不能替代 R18 的未执行门禁，也不形成最终两仓 GO。
- 未修改产品源、测试、依赖或版本；未清理失败证据，未联网，未执行 commit、push、部署或远程变更。

## 最小恢复路径

需要新的明确计划范围修复候选卫生测试的有界 Git 输出读取，例如为该 `execFileSync` 设置与现有 rollback drill 一致的显式大缓冲，并增加超过默认缓冲的回归覆盖。修复后必须使用新的任务/attempt 重跑完整两仓门禁；本 attempt 不重用、不覆盖。
