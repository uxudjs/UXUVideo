# 执行清单：SPEC 第 22 节最终本地门禁恢复

> 状态：APPROVED / BLOCKED / RELEASE HOLD
> 候选 ID：`s22-account-usage-final-gate-recovery-20260822-05`
> 执行策略：`serial`
> 安全并发上限：1
> 当前授权：当前候选已获用户明确批准，并已明确要求继续执行计划任务；仅授权本地执行 S22-R19，不授权 commit、push、部署、联网或 Cloudflare/D1 远程变更

## 规划依据与历史采纳

- 已批准规范：`work-products/SPEC.md` 第 22 节。
- S22-R15—R17 保持 completed；S22-R18、其 attempt 与 receipt 保持 blocked、只读、consumed。
- 旧批准计划原始字节保存在 `work-products/debug/approval-baselines/s22-account-usage-execution-recovery-20260821-02/plan.md`。
- 旧 blocked todo 已在替换前 create-new 冻结为 `work-products/evidence/section22/blocked-r18-todo.md`，并验证与当时活动 todo 原始字节一致；后续不得重写。
- 首个 R19 草案 `s22-account-usage-final-gate-recovery-20260821-03` 的 snapshot 原始字节比对失败，保留只读且不具批准效力。
- 候选 `s22-account-usage-final-gate-recovery-20260821-04` 的清晰批准未写入 todo：计划合同固定要求 `PENDING`，与批准及执行合法状态冲突；R19 未启动，旧 snapshot 保持只读且不适用于当前候选。
- 当前 `-05` 候选只修复计划合同的合法状态机，不修改业务代码或放宽完整门禁。
- `work-products/debug/s22-r18-candidate-hygiene-enobufs.md` 已证明 ENOBUFS 根因的 RED→GREEN 与 Worker 216/216；这不替代尚未完成的完整两仓门禁。
- 本候选只规划一个全新 R19 最终集成任务，不修改产品源、依赖、版本或 Pages 保护输入。

## 批准基线

- 候选计划：`work-products/plan.md`
- create-new/no-replace 基线：`work-products/debug/approval-baselines/s22-account-usage-final-gate-recovery-20260822-05/plan.md`
- 字节比对：`IDENTICAL`
- 批准状态：`APPROVED`
- 批准记录：`USER_EXPLICIT / 2026-08-22 / 继续执行plan任务`
- 批准范围：清晰批准只允许把本候选记录为 APPROVED；批准后仍需用户另行调用 `@uxu-code:build auto` 才允许本地执行 S22-R19。始终不授权 commit、push、部署、联网或远程变更。

## 状态账本

- `work-products/todo.md` 仅由主代理写入；合法转换为 `pending → in_progress → completed | blocked`。
- checkbox 是显式状态的原子派生镜像：只有 `completed` 为 `[x]`。
- todo 是编排例外，只作为 Worker repository 精确 exclusion，不进入 task target、snapshot、input、protected input、fingerprint 或 `orchestration_output`。

| 任务 | 状态 | 波次 | 依赖 | 并行 |
|---|---|---:|---|---|
| S22-R19 | blocked | 0 | 无 | 否 |

## 任务清单

- [ ] S22-R19 两仓最终门禁恢复与本地候选证据
  - 状态：blocked
  - 验证：新 v2 attempt、Worker/Pages 完整离线门禁、两仓身份与 manifest-actual 扫描、声明 namespace 内 rollback、流程 evidence/receipt 独立审计、保护输入与 terminal receipt。
  - 终态上限：`LOCAL CANDIDATE / RELEASE HOLD`。

## 当前预检

- 新候选批准目录、S22-R19 namespace/attempt/evidence/receipt、R19 task temp、baseline-tool work 与三个 Pages Node test-work 当前 missing。
- 六个 Pages `.env*` missing；端口 4173/4174 可绑定；release staging/backup 与 rollback namespace 当前无匹配。
- 本地 Node、npm、Chrome、Playwright、Next、esbuild、ESLint、TypeScript 与两仓 entrypoint 当前可用。
- `.next/`、`out/`、`release/`、Playwright artifacts、`tsconfig.tsbuildinfo` 与视觉草稿是允许的 present target 初态，执行时必须完整 snapshot。
- 所有动态状态必须在 attempt 创建前重验；任何漂移均 fail-closed，不通过清理用户文件、安装、联网或放宽合同绕过。

## 下一道门

- 用户需先以清晰整句批准当前计划；无需复制候选 ID。
- 批准只更新本 todo 的批准状态与记录，不启动执行。
- 批准后仍需另行调用 `@uxu-code:build auto`。

