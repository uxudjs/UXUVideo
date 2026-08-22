# 执行清单：SPEC 第 22 节账户级用量第三恢复

> 状态：BLOCKED / RELEASE HOLD
> 候选 ID：`s22-account-usage-execution-recovery-20260821-02`
> 执行策略：`serial`
> 安全并发上限：1
> 当前授权：当前候选已批准并已单独调用 `@uxu-code:build auto`；仅授权按本候选本地连续执行 R15—R18，不授权 commit、push、部署、联网或远程 Cloudflare/D1 变更

## 规划依据与历史采纳

- 已批准规范：`work-products/SPEC.md` 第 22 节。
- 第二恢复失败 plan/todo 已按原始字节冻结为 `work-products/evidence/section22/blocked-r10-plan.md` 与 `blocked-r10-todo.md`。
- S22-R09 baseline CLI 成果已采纳；S22-R10 保持 blocked 历史，worker 未启动且目标未改变。两者不进入本活动任务镜像。
- R01/R10 attempt、request、manifest、snapshot、sidecar 与 receipt 永久只读，不重跑、不修补。
- baseline CLI 已升级到 v2 create 合同：显式 Worker/Pages 映射、todo/attempt/target/receipt 排除覆盖、无 glob exclusion 与 generated namespace inventory 隔离；旧 v1 manifest 仍可只读验证。三代历史计划合同已改读冻结文件，新活动合同单独验证当前 R15—R18。
- 四个 Pages 并发文件继续作为只读保护输入；不要求 clean、不重新归因。

## 批准基线

- 候选计划：`work-products/plan.md`
- create-new/no-replace 基线：`work-products/debug/approval-baselines/s22-account-usage-execution-recovery-20260821-02/plan.md`
- 字节比对：`IDENTICAL`
- 批准状态：`APPROVED`
- 批准记录：`USER_EXPLICIT / 2026-08-21 / 批准计划`
- 批准范围：本候选已获批准；仅在后续单独调用 `@uxu-code:build auto` 后允许本地连续执行 R15—R18；不授权 commit、push、部署、联网或远程变更。

## 状态账本

- `work-products/todo.md` 仅由主代理写入；合法转换为 `pending → in_progress → completed | blocked`。
- checkbox 是显式状态的原子派生镜像：只有 `completed` 为 `[x]`。
- 四个任务严格串行，至多一个 `in_progress`；下游只有在直接依赖 completed 且串行屏障/receipt 完整时解锁。

| 任务 | 状态 | 波次 | 依赖 | 并行 |
|---|---|---:|---|---|
| S22-R15 | completed | 0 | 无 | 否 |
| S22-R16 | completed | 1 | S22-R15 | 否 |
| S22-R17 | completed | 2 | S22-R16 | 否 |
| S22-R18 | blocked | 3 | S22-R17 | 否 |

## 任务清单

- [x] S22-R15 清除活动测试退役名称并建立 Pages 离线边界
  - 状态：completed
  - 验证：request 排除与 manifest 回读、名称 RED→GREEN、offline proxy RED→GREEN、focused Worker/Pages 测试、保护输入与 receipt。

- [x] S22-R16 Worker 隔离门禁与证据
  - 状态：completed
  - 验证：逐命令输入/环境复验、Worker 语法与 focused 合同、大小、diff、秘密/路径/名称扫描与 receipt。

- [x] S22-R17 Pages 全门禁与静态发布物重建
  - 状态：completed
  - 验证：本地 CLI/Chrome、禁遥测/离线 E2E、lint/tsc/build/release/final test、完整 release snapshot、保护输入与 receipt。

- [ ] S22-R18 两仓集成、完整回归与本地发布门禁
  - 状态：blocked
  - 验证：两仓完整离线门禁、rollback namespace、跨仓契约、manifest/实际集合、保护输入、terminal receipt 与证据审计。
  - 终态上限：`LOCAL CANDIDATE / RELEASE HOLD`。
  - Blocker：Worker `npm test` 为 214/215；候选卫生测试读取 1,255,045-byte Git 路径清单时触发 `spawnSync git ENOBUFS`。R18 按 fail-closed 合同停止，Pages、两仓身份扫描与 rollback drill 未执行；详见 `work-products/evidence/section22/pair-validation.md` 与 `work-products/evidence/section22/receipts/S22-R18.json`。

## 当前预检

- 结构性 blocker 已移除：活动依赖不再经过 blocked R10；R15—R18 使用全新 ID、固定 exact attempt root 与 missing baseline namespace。
- Section 21 历史候选卫生合同已改读冻结 final todo/内部证据并排除后续流程归档；当前 Worker 完整套件 `215/215`、baseline CLI 专项 `20/20`、活动恢复合同 `8/8` 与大小门均 GREEN。
- 规划时端口、工具链、Chrome、环境文件、test-work、rollback namespace、release staging/backup 与 reparse 检查均满足启动条件；Pages 当前 Node 套件 `10/10` GREEN。
- `.next/`、`out/`、`release/`、Playwright artifacts、`tsconfig.tsbuildinfo` 与视觉草稿是允许的 present target 初态，执行时完整快照。
- 动态状态必须在每个 attempt 创建前重验；真实漂移仍按 fail-closed 停止，不通过清理用户文件、安装、联网或放宽合同绕过。
