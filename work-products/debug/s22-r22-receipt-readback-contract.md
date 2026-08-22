# S22-R22 receipt byte-safe audit RED→GREEN

> 日期：2026-08-22
> 失败 attempt：S22-R22 / `run-20260822-s22-r22-01`

## RED

新增 `work-products/tests/section22-receipt-readback-audit.test.mjs`，首次运行因 `work-products/scripts/section22-receipt-audit.mjs` 不存在而失败。该测试固定三条边界：

1. 只接受 canonical UTF-8、无 CR、恰好一个终止 LF 的 receipt bytes。
2. 额外宿主输出换行与 evidence 字节漂移必须 fail-closed。
3. CLI 必须用原始 Buffer 读取并验证 retained R22 receipt 与 evidence 绑定，不经 PowerShell 对象输出层。

## GREEN

新增只读 `work-products/scripts/section22-receipt-audit.mjs`：

- 校验 repository-relative path、task/attempt/status、baseline 全绿、validation 全零、terminal green 与本地任务远程授权全 false。
- 对 receipt 使用原始 Buffer 做 UTF-8/LF/trailing-whitespace/machine-path 检查。
- 对 evidence 重新计算 bytes 与 SHA-256，并要求与 receipt 完全一致。
- CLI 输出只含 schema、语义身份、字节数与 `IDENTICAL`，错误消息移除仓库绝对路径。

聚焦结果：3 pass，0 fail；retained R22 receipt 为 4,429 bytes、evidence 4,750 bytes、binding `IDENTICAL`。

## 恢复边界

R22 的首次 readback wrapper 已经失败，后续 GREEN 只证明根因与后继工具合同，不能把 R22 改写为 completed。下一候选必须使用新 task/attempt，并把本脚本与测试纳入 immutable inputs。
