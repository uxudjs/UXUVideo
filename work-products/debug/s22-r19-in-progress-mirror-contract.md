# S22-R19 执行态 todo 镜像合同修复

## 观察到的失败

- 失败 attempt：`run-20260821-s22-r19-01`
- 命令：`node --test work-products/tests/section22-final-gate-recovery-plan-contract.test.mjs`
- RED：6 项中 5 pass、1 fail。
- 失败位置：`work-products/tests/section22-final-gate-recovery-plan-contract.test.mjs:149`。
- R19 evidence 与 receipt 保持 immutable；本修复不改变或重用该 attempt。

## 根因

todo 同时包含：

1. 状态机说明中的 `in_progress`；
2. 状态表中的当前状态镜像；
3. 任务明细中的当前状态镜像。

原断言按全文匹配任意两次 `in_progress`，因此在合法执行态把要求存在的两处权威镜像误判为重复。该断言既没有区分说明文字，也没有限定表格与任务明细。

## 最小修复

- 移除全文级重复词断言。
- 新增 `assertInProgressMirrors()`，只统计：
  - `S22-R19` 状态表行；
  - 任务明细的 `状态：in_progress`。
- 对五种合法 todo 状态 fixture 验证：仅 `in_progress` 状态各有一处表格镜像和一处任务镜像，其他状态均为零。
- 未修改产品代码、依赖、版本、Pages 保护输入或历史 R19 evidence/receipt。

## 验证

| 检查 | 结果 |
|---|---|
| 聚焦 R19 计划合同 | 6/6 pass |
| 全部 Section 22 计划合同 | 25/25 pass |
| Worker 完整测试 | 222/222 pass |

## 剩余边界

该 GREEN 只证明流程合同修复，不补做 R19 未执行的 Worker/Pages 完整门禁，也不授权 commit、push、GitHub Pages 发布、Cloudflare Worker 部署或生产声明。必须创建全新任务与 attempt 从头执行完整门禁。

## 活动计划替换回归

首个 R20 候选替换活动 `plan.md/todo.md` 后，旧 R19 合同仍读取活动文件，导致它把合法的 R20 替换误报为 R19 历史漂移。最小修复继续限定在同一测试文件：

- R19 合同改读候选 `-05` 的 immutable plan snapshot 与 `blocked-r19-todo-v2.md`；
- approval snapshot 身份改由 R19 baseline manifest 中的两个 plan input 身份回放验证；
- 不读取新的活动 R20 plan/todo，不修改任何 R19 evidence、receipt、request、manifest 或 snapshot。

修复后旧 R19 合同 6/6，通过候选卫生与全部 Section 22 计划合同的组合验证 40/40。
