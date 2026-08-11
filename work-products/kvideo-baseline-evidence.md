# KVideo 4.9.19 T01 基线冻结证据

状态：T01 本地证据；不授权 commit、push、部署或真实 Cloudflare/D1/第三方操作。

## 冻结身份

| 身份 | Git commit | Git tree | 版本 |
| --- | --- | --- | --- |
| KVideo 权威参考 | `28334f41407082ae1028fa4a4180bcc46d31c52a` | 由 `source-inventory.json` 固定并由测试重算 | `4.9.19` |
| UXUVideo Worker | `e7e397e520f90433f98eb1f929fc5d135bacfec0` | 由 `source-inventory.json` 固定并由测试重算 | `1.0.0` |
| UXUV-Pages | `4bc847affa76755a5c99ce249d793aa43e0b83bb` | 由 `source-inventory.json` 固定并由测试重算 | `0.1.2` |

## T01 开始前工作树

`UXUVideo`：`main...origin/main [ahead 2]`，已有用户/规划修改为 `work-products/SPEC.md`、`work-products/plan.md`、`work-products/todo.md`，以及未跟踪的 `work-products/kvideo-parity-matrix.md`。这些内容均保留，未 reset、checkout 或覆盖。

`UXUV-Pages`：`main...origin/main`，开始 T01 前工作树干净。T01 只在 `work-products/tests/` 新增合同测试、生成器和固定清单。

固定 KVideo 参考不是第三个可变工作树，而是 UXUVideo 对象库内可由 `git cat-file -t`、`git rev-parse <commit>^{tree}` 与 `git ls-tree` 重算的不可变 Git 身份。

## 可复验命令

在 UXUV-Pages 仓库运行：

```powershell
node work-products/tests/generate-kvideo-source-inventory.mjs
node --test work-products/tests/kvideo-feature-parity.test.mjs
```

生成器从测试文件最终位置使用相对仓库关系定位 UXUVideo，不在产物中保存机器绝对路径。合同测试验证三个身份、273 个唯一能力 ID、必填列、测试映射、状态值域、六项无 ID 架构差异及完整源码对象清单。
