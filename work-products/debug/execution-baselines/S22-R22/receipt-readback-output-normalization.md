# S22-R22 receipt 回读输出规范化诊断

> 日期：2026-08-22
> 任务：S22-R22 / `run-20260822-s22-r22-01`
> 结论：attempt blocked、consumed；不修改或复用

## 观察

`work-products/evidence/section22/receipts/S22-R22.json` 已 create-new 写入。首次回读包装器用 PowerShell `Get-Content -Raw` 的宿主输出文本直接与预序列化字符串比较：预期字符数 4,429，宿主输出字符数 4,431，因此包装器抛出 raw readback mismatch。

## 字节安全诊断

- 文件实际大小：4,429 bytes。
- UTF-8 文本字符数：4,429；CR 数 0；仅一个终止 LF。
- JSON 可解析，task/attempt/status/evidence 字段完整。
- 在同一 PowerShell 进程内把已解析对象 canonical `ConvertTo-Json`、CRLF→LF、追加单个终止 LF 后，与磁盘字节直接 `SequenceEqual`：`true`，两侧均 4,429 bytes。
- receipt 声明的 evidence 大小与当前 evidence 大小均为 4,750 bytes。

## 根因与边界

差异来自 PowerShell 对输出对象写入宿主流时附加的换行，不是 receipt 文件字节漂移。尽管 artifact 实际正确，首次声明的 `receipt create-new and byte-identical readback` 包装器已经非零退出。批准计划的 failure contract 不允许在同一 attempt 内用修正后的回读替代失败，因此：

- R22 永久 blocked、consumed。
- 已存在的 request、manifest、evidence、receipt 与 task temp 保持只读，不覆盖。
- 后继恢复必须使用新 task/attempt，并把 byte-safe receipt audit 写成受测试的仓库脚本后再执行。
