# S22-R20 跨 input-set 重复输入调试

> 状态：GREEN
> 日期：2026-08-22
> 范围：最终本地门禁 request 蓝图与计划合同

## 观察与复现

- R20 initial prestate 通过后，按批准蓝图 create-new 写入 v2 request。
- `execution-baseline.mjs create` 在 attempt/staging 写入前稳定失败：`inputs contains a duplicate or case alias`。
- 展平 R20 的 `governance` 与 `prior-validation-evidence` 后，唯一重复项为 `worker:work-products/debug/s22-r19-in-progress-mirror-contract.md`。
- 新增活动蓝图唯一性回归取得 RED：0/1，通过值中精确报告上述重复项。

## 根因

R20 计划合同只验证必需输入存在，没有验证多个 input set 展平后的全局唯一性。request 物化忠实保留重复项，而 v2 baseline 工具按安全合同拒绝重复或大小写 alias。

## 最小修复

- 冻结 R20 plan、blocked todo、request、evidence 与 receipt，旧 attempt 永久 consumed。
- R21 蓝图把调试证据放入唯一的 input set，并在 baseline create 前增加跨集合唯一性门禁。
- R20 历史合同改读冻结 plan/todo，并验证确切重复项、create 失败与 worker 未启动。
- 新活动合同要求所有 input set 展平后全局唯一。
- 首个 R21 候选的 prestate request 目录已更新但文件名仍残留 R20 attempt；合同在批准前以 4/6 捕获并由新的候选快照替代，未创建 task root 或 attempt。
- 独立 review 又捕获三个 Important：活动合同未调用真实 create validator、plan/snapshot 只按解码文本比较、generated namespace 大小写匹配与其余路径语义不一致；R20 五个冻结文件也缺少统一原始字节清单。
- `execution-baseline.mjs` 现导出无副作用的 `validateCreateRequest`，CLI 仅在主模块执行；活动合同直接复用真实 validator，并对大小写 alias 与 exclusion 缺口做负向证明。
- generated namespace inventory 排除与实际捕获统一采用大小写 alias 语义；新增回归先证明 case-only prefix 被漏过，再证明 create fail-closed。
- `r20-frozen-integrity.json` 逐文件绑定原始字节长度与 SHA-256；活动合同用 Buffer 比较 plan/snapshot 并重算五个冻结文件。

## 验证

| 验证 | 结果 |
|---|---|
| 活动唯一性 RED（R20） | 0/1 pass，精确报告 1 个重复项 |
| 冻结 R20 历史合同 | 6/6 pass |
| 活动唯一性 GREEN（R21） | 1/1 pass，49/49 inputs 唯一 |
| 首个 R21 候选合同 | 4/6 pass，捕获 request 文件名身份残留 |
| 候选 09 合同 | 8/8 pass；独立 review 后被候选 10 替代，未批准或启动 |
| 候选 10 合同 | 8/8 pass；直接复用真实 create validator、原始字节 plan/snapshot 比较与 R20 frozen integrity |
| generated namespace 聚焦回归 | 3/3 pass；含既有 anchored/terminal、case-only alias 与 CLI surface |
| 全部 Section 22 计划合同 | 39/39 pass |
| 候选卫生 | 10/10 pass |
| 候选卫生 | 10/10 pass |

## 边界

- 未修改 Worker/Pages 产品代码、依赖、版本或 Pages 保护输入。
- R21 仍是未批准计划候选；本调试修复不授权执行、commit、push、联网或部署。
