# SPEC 第 21 节审查缺陷修复

## 现象

- 聚合 RED 在首个断言失败后停止，后续缺口没有可归因证据。
- 旧 `/UXUV-Pages` 前缀仍依赖 Pages manifest；manifest 失败时会返回 503，而不是真实 404。
- 性能测试在缺少基线时自行写入文件，且没有把基线 CSS 绑定到不可变提交。
- inventory 生成器复用旧文件，分类也会把流程测试错标为 runtime。
- 候选卫生只按扩展名扫描文本，遗漏补丁、密钥、环境文件和常见凭据格式。

## 根因与最小修复

- 将 Worker 合同拆成独立顶层测试；Pages 静态合同使用软断言收集全部失败；关键浏览器流程拆成六个测试。
- 在 Worker 路由入口直接返回带安全头的本地 404，并覆盖 GET、HEAD、嵌套路径及零上游请求。
- 性能基线记录基线仓库提交；验证器只读，缺失、绑定不一致、视频未推进或 Long Task API 缺失均失败。
- 新增只读 inventory helper 与显式生成命令；分类以路径为先，Wave 2 使用独立不可变快照。
- 候选卫生按内容识别严格 UTF-8 文本，二进制证据要求 allowlist，并扩展凭据检测。
- 修正玻璃 token、降级、Reduced Motion 和 44 px 触控尺寸规则。

## 状态边界

旧 T01/T02/T06 收据由 `review-invalidation.json` 失效。当前计划 SHA 已变化，`todo.md` 保持 HOLD；T01/T02/T06 均为 `in_progress`，没有任务被重新标记完成，也没有创建 Wave 2 快照。

本轮未提交、未推送、未部署，未访问真实 Cloudflare、D1 或生产数据。

## 批准后账本恢复

用户随后明确批准计划 SHA `6ef4a9515b3929695b04b0886b3fca64680dce765b0a7f5f16dd6ceba64cd91a`。构建预检正确拒绝了 HOLD 状态下遗留的三个 `in_progress` 尝试及旧 SHA 收据。恢复动作把旧收据和补丁原字节归档到 `receipts/invalidated/ac7a5714/`，将 T01/T02/T06 恢复为 `pending`，并由新的账本合同防止审批 HOLD 再次持有活动任务。

## build auto 在 T03 后的阻断

- T03 先取得 5 条独立 RED，随后达到 5/5 聚焦 GREEN 与 51/51 相关安全、媒体回归 GREEN，Worker 当前产品切片为 `2.0.0` / API `2`。
- T01 冻结聚合仍包含 `S21-T02 keeps the v1 Worker and API identities`，永久要求 `1.1.4` / API `1`；已批准计划又禁止 T01 后修改该聚合，并要求 T15 运行全量测试。
- 因此 T03 要求的 v2 状态与 T15 冻结全量门互斥。当前保留最小 T03 实现，将其收据标记为 `blocked`，后续波次不解锁。正确恢复需要修订计划/阶段合同并重新批准新的计划 SHA；不能静默改写冻结断言。
