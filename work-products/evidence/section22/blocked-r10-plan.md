# 第二恢复计划：SPEC 第 22 节账户级用量与本地门禁

> 状态：PLAN CANDIDATE / APPROVAL REQUIRED
> 候选 ID：`s22-account-usage-baseline-recovery-20260821-01`
> 规划日期：2026-08-21
> 执行策略：`serial`
> 安全并发上限：1
> 计划批准不授权：实现、commit、push、部署、Cloudflare/D1 远程变更

## 1. 规划依据、已采纳成果与边界

- 已批准规范：`work-products/SPEC.md` 第 22 节；接口、产品行为、安全、兼容、版本、Pages UI 与本地发布边界均已确定，不重新规格化。
- 被替换的批准计划及终态账本已冻结为 `work-products/evidence/section22/blocked-r01-plan.md` 与 `work-products/evidence/section22/blocked-r01-todo.md`；两者在本候选写入前已按 create-new/no-replace 保存原始字节。
- 采纳旧 Section 22 的 S22-T00—T03 产品/UI/文档成果，以及第一恢复计划 S22-R00 的合同迁移与 8/8 GREEN；不重跑、不改写历史 receipt。
- 第一恢复计划 S22-R01 在 worker 启动前 blocked：`work-products/debug/execution-baselines/S22-R01/run-20260821-s22-r01-01/manifest.json` 因 Windows 分隔符规范化错误，1621 个 file descendant 缺少 snapshot 相对路径并产生重复路径组。该 attempt、原始副本与 receipt 永久只读，不删除、不修补、不作为新基线输入。
- 失败审计已证明 S22-R01 worker 未启动；三个手写目标、四个 Pages 生成路径与四个保护输入未被该 attempt 改写。当前活动扫描仍在 Worker 测试 5 行、Pages 测试 1 行命中两个退役配置名完整字面量。
- 用户确认的 Pages 并发既有状态：`../UXUV-Pages/package.json`、`../UXUV-Pages/work-products/tests/iptv-retirement-contract.test.mjs`、`../UXUV-Pages/work-products/tests/pages-deployment.test.mjs` 与 `../UXUV-Pages/work-products/tests/repository-test-isolation.test.mjs`。它们继续作为只读 `protected_inputs`，不取得写权限、不重新归因。
- 版本保持 Worker `2.0.0`、Pages `0.3.0`、API Contract `2` 与现有 Worker range；不安装依赖，不修改 D1 schema/binding，不删除远程旧变量。
- 本候选只规划剩余本地恢复与验证；最终状态上限为 `LOCAL CANDIDATE / RELEASE HOLD`。不授权 commit、push、部署、联网、真实 Cloudflare 查询或远程配置变更。

## 2. 目标与验收总则

完成后必须同时满足：

1. 两个退役配置名的完整字面量不出现在活动运行代码、README、Pages 源码或活动测试；历史 SPEC、CHANGELOG、冻结 plan/todo、失败 attempt 与执行证据可保留明确历史记录。
2. Worker 测试仍证明遗留变量存在、缺失或变化均被运行时忽略；Pages 测试仍证明未配置态只显示两个活动变量且无旧项目级文案。测试可在运行时分段构造兼容性键，但源文件不得保存完整退役名称。
3. 已完成的账户级 API、严格 parser、四指标、三语言、四断点、阈值、axe、鉴权、stale 与 token 边界不回退。
4. 先以固定、无目录枚举的 bootstrap 建立可复跑且受测的 execution-baseline CLI；其后每个 attempt 使用全新任务 ID、全新 no-replace 根、完整 target snapshot、只读 input identity 与自审计，旧 S22-R01 永不重用。
5. 每个 build/test 输入集合在 worker 启动前、首次写入前、每条验证命令前与终态重验；活动 todo 仅按主代理编排合同验证合法状态，不伪装成静态输入。
6. Pages 构建关闭 Next 遥测；Playwright 通过本地拒绝代理 fail-closed 阻止非 loopback 请求，并由安全 RED/GREEN 合同证明。
7. Worker 与 Pages 的聚焦门禁、完整门禁、静态发布物、版本/API/range、回滚材料和证据一致；四个 Pages 并发文件保持只读且归因分离。

## 3. 执行策略、依赖图与波次

`fast requested: false`。执行策略：`serial`。安全并发上限：1。串行原因：本次调用没有精确首参数 `fast`；baseline CLI bootstrap、合同迁移、跨仓测试修复、Worker 门禁、Pages 发布物与最终集成逐项消费前一步稳定字节和 receipt。

```text
S22-R09 -> S22-R10 -> S22-R11 -> S22-R12 -> S22-R13 -> S22-R14
```

| 波次 | Ready | Frozen | 上限 | 编辑 / 聚焦验证并行 | 串行集成屏障与解锁条件 |
|---|---|---|---:|---|---|
| Wave 0 | S22-R09 | S22-R10—R14 | 1 | 否 / 否 | baseline CLI 与自测 GREEN，bootstrap receipt 对账后解锁 R10。 |
| Wave 1 | S22-R10 | S22-R11—R14 | 1 | 否 / 否 | 第一恢复合同迁移与本候选合同通过后解锁 R11。 |
| Wave 2 | S22-R11 | S22-R12—R14 | 1 | 否 / 否 | 新基线自审计、离线边界、活动名称零命中、聚焦门禁与保护输入复核后解锁 R12。 |
| Wave 3 | S22-R12 | S22-R13—R14 | 1 | 否 / 否 | Worker 隔离门禁、证据、扫描和 diff 对账后解锁 R13。 |
| Wave 4 | S22-R13 | S22-R14 | 1 | 否 / 否 | Pages 全门禁、静态发布物、保护输入和 receipt 对账后解锁 R14。 |
| Wave 5 | S22-R14 | 无 | 1 | 否 / 否 | 两仓完整回归、发布物/manifest、回滚与最终证据全部通过后才可完成。 |

todo 由主代理单写；worker 不得改写 plan、todo、共享证据或启动嵌套 worker。每个任务列出的执行基线根是主代理编排写入例外：它属于任务写入授权，但排除在 worker target/snapshot set 之外；主代理完成 create-new/no-replace 与自审计后仅供 worker 只读，禁止递归快照自身。除执行基线根外，任务“写入/生成输出”定义 worker targets；任务“读取”与第 5 节仓库清单定义 immutable inputs。活动 todo 按合法状态机单独验证，不纳入静态 input identity。运行时宽度始终为 1。

## 4. 任务合同

### S22-R09 — Bootstrap 可复跑 execution-baseline CLI

- 目标：用无目录遍历的固定 missing-target bootstrap 建立并测试后续任务唯一允许使用的 baseline 创建/验证工具。
- 范围：只新增一个流程 CLI 与一个测试；不修改产品源、现有测试、冻结证据、旧失败 attempt、plan、todo 或 Pages。
- 依赖：无。
- 执行基线根：`work-products/debug/execution-baselines/S22-R09/`；主代理按本任务固定 bootstrap 合同创建 create-new/no-replace attempt。
- 读取：
  - 本候选批准快照
  - 当前项目 Node 运行时版本
- 写入：
  - `work-products/scripts/`（新目录，仅允许 `execution-baseline.mjs`）
  - `work-products/tests/execution-baseline-tool.test.mjs`
  - `work-products/debug/execution-baselines/S22-R09/`（主代理编排写入；排除在 worker target/snapshot set 之外）
- 生成输出：
  - `work-products/tests/work/execution-baseline-tool/`
- 共享资源：Worker Node test runner；本任务独占固定三个 target 路径。
- 验收：
  - 启动前上述 CLI、测试和 test-work 三路径必须全部 missing；任一 present 即 `blocked / not-launched`，不得覆盖。
  - 主代理只为这三个已知路径创建 `s22-bootstrap-baseline/v1` manifest：排序固定路径、`state: missing`、`no_replace: true`、候选批准快照 SHA-256、Node 版本、owner/attempt/time；不执行目录遍历、不生成 snapshot 路径，因此不复用导致 R01 失败的算法。manifest create-new 后逐字段回读，再更新 todo。
  - RED：只写测试后，测试因 CLI missing 失败；GREEN：实现 CLI 后全部通过。不得先写 CLI 再伪造 RED。
  - CLI 固定支持：`create --request <repo-relative-json>`、`verify --manifest <repo-relative-json> --phase prewrite|inputs|terminal`、`fingerprint --request <repo-relative-json> --set targets|generated`；除 `create` 可写 request 指定的全新 attempt 根外，其余命令只读并向 stdout/stderr 输出结果。
  - 正式 manifest schema 固定为 `s22-execution-baseline/v1`，至少包含 `task_id`、`attempt_id`、`owner`、`no_replace`、`request_sha256`、`targets`、`snapshots`、`inputs`、`protected_inputs`、`repositories`、`toolchain`、`environment`、`generated_namespaces`。target present 文件/目录保存原始字节 snapshot；input 保存规范路径、类型、大小和 SHA-256；目录保存完整 descendant 路径/类型集合。
  - 工具拒绝空路径、绝对路径、非规范分隔符、重复/大小写别名、祖先后代重叠、越仓路径、链接/reparse、snapshot 缺失、源/快照集合或字节不一致、第二次 create 与 manifest 漂移。Windows 转分隔符使用字面量替换或非正则 API。
  - `prewrite` 必须验证 manifest/snapshot 自完整性、原始 targets、inputs、protected inputs 与 environment；`inputs` 重算并验证自完整性、immutable inputs、protected inputs 与 environment；`terminal` 再验证 namespace 终态策略并输出当前 target/generated fingerprint，由主代理与 worker 固定的 candidate digest/receipt 对比。
  - environment 验证必须对声明键集合、present/absent、非敏感固定值或敏感值 SHA-256 逐项重算；任何新增/缺失声明键、值或存在性漂移都失败，manifest/request/输出不得出现敏感原值。
  - 测试覆盖 file/directory/missing、repo inventory、protected input、environment 键集合/值/present-absent/敏感哈希、namespace、no-replace、输入/目标漂移、缺失 snapshot、重复/别名/链接与失败不变性；test-work 成功终态 missing。
- 聚焦验证：
  - `node --test work-products/tests/execution-baseline-tool.test.mjs`
  - `node --check work-products/scripts/execution-baseline.mjs`
  - 以 `GIT_OPTIONAL_LOCKS=0` 运行 `git diff --check -- work-products/scripts/execution-baseline.mjs work-products/tests/execution-baseline-tool.test.mjs`
- 波次与启动条件：Wave 0；仅在本候选明确批准、批准快照逐字节一致、R09—R14 全 pending、三个固定 target 与 R09 根 missing、旧失败 attempt 只读时启动。
- 编辑可并行：否。
- 聚焦验证可并行：否。
- 主代理集成责任：亲自创建/回读固定 bootstrap manifest；核对 RED/GREEN、CLI/test 实际 diff、test-work 终态和 receipt 后解锁 R10。
- 失败/回滚：保留失败 bootstrap 与测试输出，R10—R14 不启动；不自动删除、不修补旧 R01，不用未经验证的替代脚本继续。

### S22-R10 — 冻结第一恢复合同并切换第二恢复契约

- 目标：让第一恢复计划合同继续验证冻结的 R01-blocked 历史，同时为本候选建立独立活动合同。
- 范围：worker 只迁移/新增两个计划合同测试；不修改产品源、冻结证据、失败 attempt、SPEC、README、CHANGELOG、plan 或 todo。
- 依赖：S22-R09。
- 执行基线根：`work-products/debug/execution-baselines/S22-R10/`；主代理用已验证 CLI 创建/验证 request 与 no-replace attempt。
- 读取：
  - `work-products/scripts/execution-baseline.mjs`
  - `work-products/evidence/section22/blocked-r01-plan.md`
  - `work-products/evidence/section22/blocked-r01-todo.md`
  - `work-products/debug/execution-baselines/S22-R01/run-20260821-s22-r01-01/manifest.json`
  - `work-products/tests/section22-recovery-plan-contract.test.mjs`
  - 本候选批准快照与活动 todo（todo 仅作主代理编排状态输入）
  - 第 5 节 Worker 仓库输入清单
- 写入：
  - `work-products/tests/section22-recovery-plan-contract.test.mjs`
  - `work-products/tests/section22-baseline-recovery-plan-contract.test.mjs`
  - `work-products/debug/execution-baselines/S22-R10/`（主代理编排写入；排除在 worker target/snapshot set 之外）
- 生成输出：
  - `work-products/tests/work/execution-baseline-tool/`
- 共享资源：Worker Node test runner、冻结 Section 22 证据与旧失败 attempt（后二者只读）。
- 验收：
  - 主代理用 R09 CLI 创建 manifest，`prewrite` 自审计通过；更新 todo 后再次验证 immutable inputs，worker 首次写入前复验。
  - 现有恢复合同改读冻结 blocked-r01 plan/todo，不删除、不放宽 R00—R04 五任务、serial、路径/保护输入与状态合法性断言。
  - 新合同验证 R09—R14 六任务、线性依赖、serial、完整字段、新 CLI/schema/input identity、本地离线代理、任务临时目录、新基线根、旧 R01 只读隔离和四个 Pages 保护输入。
  - 新合同强制执行基线根只允许主代理编排写入、排除在 worker target/snapshot set 外且不得递归自快照；活动 todo 只验证合法状态、checkbox 镜像、至多一个 `in_progress` 和依赖前缀，不固化初始全 pending。
  - 所有仓库引用均为相对路径；测试不传播候选 ID。
- 聚焦验证：
  - `node --test work-products/tests/execution-baseline-tool.test.mjs work-products/tests/section22-plan-contract.test.mjs work-products/tests/section22-recovery-plan-contract.test.mjs work-products/tests/section22-baseline-recovery-plan-contract.test.mjs`
- 波次与启动条件：Wave 1；S22-R09 completed，R10 request/manifest create-new、自审计通过，todo 无 `in_progress` 后启动。
- 编辑可并行：否。
- 聚焦验证可并行：否。
- 主代理集成责任：每条命令前复验 inputs；核对冻结来源、失败 manifest 只读身份、实际 diff、测试、test-work 终态与 receipt 后解锁 R11。
- 失败/回滚：保留所有冻结历史；只回滚两个合同测试，不修改旧失败 attempt 或已采纳成果。

### S22-R11 — 清除活动测试退役名称并建立 Pages 离线边界

- 目标：保留兼容性/负向行为，使两仓活动范围对退役名称完整字面量零命中，并让所有后续 Playwright 通过本地拒绝代理 fail-closed。
- 范围：只修改两个 Worker 测试、Pages usage 测试、Playwright 配置，并新增离线 E2E 与本地拒绝代理；不修改产品源、文档、版本、依赖、四个 Pages 保护文件、旧失败 attempt 或远程配置。
- 依赖：S22-R10。
- 执行基线根：`work-products/debug/execution-baselines/S22-R11/`；主代理用 R09 CLI 创建/验证 request 与 no-replace attempt，禁止引用 S22-R01 元数据。
- 读取：
  - `_worker.js`、`README.md`、`work-products/SPEC.md` §22、`package.json`
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/tests/structured-logging.test.mjs`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - `../UXUV-Pages/app/`、`../UXUV-Pages/components/`、`../UXUV-Pages/lib/`
  - `../UXUV-Pages/package.json`、`../UXUV-Pages/package-lock.json`、`../UXUV-Pages/playwright.config.ts`
  - `../UXUV-Pages/node_modules/@playwright/test/cli.js`
  - `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts`
  - 四个 Pages `protected_inputs`
  - 第 5 节两仓输入清单与本地工具链身份
- 写入：
  - `work-products/tests/cloudflare-usage-contract.test.mjs`
  - `work-products/tests/worker-only-boundary.test.mjs`
  - `../UXUV-Pages/playwright.config.ts`
  - `../UXUV-Pages/work-products/tests/usage-ui.e2e.spec.ts`
  - `../UXUV-Pages/work-products/tests/offline-boundary.e2e.spec.ts`
  - `../UXUV-Pages/work-products/tests/offline-reject-proxy.mjs`
  - `work-products/debug/execution-baselines/S22-R11/`（主代理编排写入；排除在 worker target/snapshot set 之外）
- 生成输出：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/section22-r11-temp/`
- 共享资源：两仓测试发现、Pages Next/Playwright、本地端口 4173/4174、五个 Pages 生成路径；本任务独占，不生成 `release/`。
- 验收：
  - R11 manifest 对 targets 保存可回滚原始字节，对两仓 immutable inputs/repository inventories 保存身份；四个保护文件另列 `protected_inputs`。主代理/worker 在启动、首次写入、每条命令与终态按第 5 节复验。
  - 活动名称扫描先记录 Worker 5 行、Pages 1 行 RED；Worker 以运行时分段构造旧键，继续证明遗留变量不参与配置、GraphQL 或缓存身份；Pages 以分段构造匹配器，继续证明 UI 只显示两个活动变量。
  - 活动测试发现使用两仓 `package.json` 与 Pages `playwright.config.ts` 规则生成排序集合，并以版本控制可见测试作保守超集；排除 `artifacts/`、`fixtures/`、`work/` 和明确 testIgnore。RED/GREEN 使用同一确定性扫描实现与完整名称输入，不依赖手工计数。
  - `offline-boundary.e2e.spec.ts` 先断言项目 proxy 与 `NEXT_TELEMETRY_DISABLED=1`，不满足即在任何外部 fetch 前失败；GREEN 后才请求 `https://example.invalid/` 并证明它被 loopback reject proxy 拒绝，同时 baseURL 仍可访问。
  - `offline-reject-proxy.mjs` 仅监听 `127.0.0.1:4174`：`/health` 返回 200，普通代理请求与 CONNECT 均拒绝且不解析/连接目标主机。Playwright proxy 固定为该 loopback 端点，bypass 仅 `127.0.0.1,localhost`；webServer 为 app 与 reject proxy，app 环境固定 `PORT=4173`、`NEXT_TELEMETRY_DISABLED=1`、`SECTION21_REVIEW_FIXTURE=0`、`UXUV_WRITE_VISUAL_CANDIDATE=0`。
  - 所有 Pages 命令进程设置上述四个变量，本地 CLI 缺失/损坏即阻塞；不使用 `npx`、全局工具、安装或联网回退。`TEMP/TMP/TMPDIR` 指向 R11 专属生成目录。
  - 四个 Pages 保护输入任务前后逐字节一致；旧 S22-R01 全程只读。
- 聚焦验证：
  - 安全 RED：只新增 offline E2E 后，以 `NEXT_TELEMETRY_DISABLED=1` 运行本地 Playwright；它在检查缺失 proxy 时失败，不执行外部 fetch。
  - `node --test work-products/tests/cloudflare-usage-contract.test.mjs work-products/tests/structured-logging.test.mjs work-products/tests/worker-only-boundary.test.mjs`
  - `node --check _worker.js`
  - 在 `../UXUV-Pages` 以任务专属临时目录和 `NEXT_TELEMETRY_DISABLED=1` 运行 `node node_modules/@playwright/test/cli.js test work-products/tests/offline-boundary.e2e.spec.ts work-products/tests/usage-ui.e2e.spec.ts --config playwright.config.ts --workers=1`
  - 重新发现活动测试并执行两仓退役名称扫描；两仓分别以 `GIT_OPTIONAL_LOCKS=0` 运行 `git diff --check`。
- 波次与启动条件：Wave 2；S22-R10 completed，R11 request/manifest 完整自审计，端口 4173/4174 可绑定，本地 CLI 为普通文件，todo 无 `in_progress` 后启动。
- 编辑可并行：否。
- 聚焦验证可并行：否；Worker、Pages、扫描串行。
- 主代理集成责任：核对六个手写目标、五个生成路径、输入 identities、候选 target fingerprint、保护输入、离线 RED/GREEN、名称 RED/GREEN、实际 diff 与 receipt 后解锁 R12。
- 失败/回滚：基线或离线边界失败则停止；保留失败截图/trace/temp。只回滚六个活动目标，绝不覆盖保护文件、旧 attempt 或产品源。

### S22-R12 — Worker 隔离门禁与证据

- 目标：不读取 Pages 可变发布物，验证恢复后的 Worker 候选并写可复核证据。
- 范围：只运行 Worker 隔离门禁并写本地证据；不修改产品源、测试、Pages 生成物或远程状态。
- 依赖：S22-R11。
- 执行基线根：`work-products/debug/execution-baselines/S22-R12/`；主代理用 R09 CLI 创建/验证 request 与 no-replace attempt。
- 读取：
  - `_worker.js`、`README.md`、`CHANGELOG.md`、`package.json`、`package-lock.json`
  - `scripts/check-worker-size.mjs`
  - R09 CLI/测试、三代 Section 22 计划合同、账户用量/日志/Worker-only 测试
  - 第 5 节 Worker 仓库输入清单与工具链身份
- 写入：
  - `work-products/evidence/section22/worker-validation.md`
  - `work-products/debug/execution-baselines/S22-R12/`（主代理编排写入；排除在 worker target/snapshot set 之外）
- 生成输出：
  - `work-products/tests/work/section22-r12-temp/`
  - `work-products/tests/work/execution-baseline-tool/`
- 共享资源：Worker Node test runner；禁止读取或生成 `../UXUV-Pages/release/`。
- 验收：
  - R12 manifest、自审计、immutable input 复验与 candidate target fingerprint 全部符合第 5 节。
  - 语法、账户级用量、结构化日志、认证/同源、Worker-only、baseline CLI、三代计划合同、大小与活动名称门禁通过。
  - 高置信秘密与机器绝对路径扫描通过；命中人工分类，真实秘密立即停止。
  - 所有命令以 R12 专属 `TEMP/TMP/TMPDIR` 串行执行；证据记录命令、退出码、时间、HEAD、输入 identity、差异范围和局限，不声称生产验证。
- 聚焦验证：
  - `node --check _worker.js`
  - `node --test work-products/tests/execution-baseline-tool.test.mjs work-products/tests/cloudflare-usage-contract.test.mjs work-products/tests/structured-logging.test.mjs work-products/tests/worker-only-boundary.test.mjs work-products/tests/section22-plan-contract.test.mjs work-products/tests/section22-recovery-plan-contract.test.mjs work-products/tests/section22-baseline-recovery-plan-contract.test.mjs`
  - `npm run check:size`
  - 以 `GIT_OPTIONAL_LOCKS=0` 运行 `git diff --check`
  - 对 Worker 活动输入清单执行秘密、机器绝对路径与退役名称扫描。
- 波次与启动条件：Wave 3；S22-R11 completed，R12 request/manifest 自审计通过，Pages 发布物不在读取集。
- 编辑可并行：否。
- 聚焦验证可并行：否。
- 主代理集成责任：每条命令前复验 inputs；核对 evidence、CLI test-work/任务 temp、退出码、扫描分类、actual diff 与 receipt 后解锁 R13。
- 失败/回滚：保留失败证据与 temp，不修复范围外问题；证据可重建，产品回滚交还 R11。

### S22-R13 — Pages 全门禁与静态发布物重建

- 目标：在离线边界内验证 Pages，并重建可复制的本地静态发布候选。
- 范围：只验证 Pages、重建本地静态发布物并写 Pages 证据；不修改 Worker、依赖、保护输入或远程状态。
- 依赖：S22-R12。
- 执行基线根：`work-products/debug/execution-baselines/S22-R13/`；主代理用 R09 CLI 创建/验证 request 与 no-replace attempt。
- 读取：
  - 第 5 节 Pages 仓库输入清单、工具链身份与只读 Git identity
  - `_worker.js`
  - `../UXUV-Pages/package.json`、`../UXUV-Pages/package-lock.json`、`../UXUV-Pages/node_modules/.package-lock.json`
  - `../UXUV-Pages/node_modules/@playwright/test/cli.js`
  - `../UXUV-Pages/node_modules/typescript/bin/tsc`
  - 四个 Pages `protected_inputs`
  - `../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/`（只读已批准视觉候选）
- 写入：
  - `../UXUV-Pages/work-products/evidence/section22/pages-validation.md`
  - `work-products/debug/execution-baselines/S22-R13/`（主代理编排写入；排除在 worker target/snapshot set 之外）
- 生成输出：
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/`（完整根，含 `current/`、`.tmp-current-*`、`.previous-current-*`）
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/`
  - `../UXUV-Pages/work-products/tests/work/pwa-release/`
  - `../UXUV-Pages/work-products/tests/work/release-manifest/`
  - `../UXUV-Pages/work-products/tests/work/section21-candidate-draft/`
  - `../UXUV-Pages/work-products/tests/work/section22-r13-temp/`
- 共享资源：Pages npm/Next/Playwright、release builder、本地端口 4173/4174、Node test-work、视觉草稿、任务 temp 与全部 Pages 生成目录；本任务独占。
- 验收：
  - R13 manifest 冻结完整 Pages git-visible 输入集合（排除明确 write/generated paths）、lock/toolchain entrypoints、protected inputs、已批准视觉候选与 target 原始字节；每条命令前复验 inputs。
  - 两个本地 CLI 必须为普通文件；缺失或损坏即阻塞，不使用 `npx`、全局工具或安装/联网回退。
  - 所有 Pages 命令进程设置 `PORT=4173`、`NEXT_TELEMETRY_DISABLED=1`、`SECTION21_REVIEW_FIXTURE=0`、`UXUV_WRITE_VISUAL_CANDIDATE=0`，并把 `TEMP/TMP/TMPDIR` 指向 R13 专属目录；完整 E2E 必须包含 offline-boundary GREEN。
  - 已批准视觉候选前后逐字节一致；视觉草稿允许启动时 present 或 missing，但完整基线、自审计并终态对账。三个 Node test-work 子目录启动前必须 missing，既有内容先阻塞。
  - lint、TypeScript、完整 E2E、最终 production build、release build、最终 Node tests 与 diff check 全通过。
  - `release/current` manifest 声明 Pages `0.3.0`、API `2` 与现有 Worker range；安全路径、MIME、排序资产清单与实际文件集合逐项一致。
  - 四个保护输入前后逐字节一致；成功终态不残留 release staging/backup 或三个 Node test-work 子目录。视觉草稿与 R13 temp 可存在，但完整记入 receipt；非范围文件不漂移。
- 聚焦验证：
  - 在 `../UXUV-Pages` 严格串行运行 `npm run lint`、`node node_modules/typescript/bin/tsc --noEmit`、`npm run test:e2e`、最终一次 `npm run build`、`npm run release:build`、最终一次 `npm test`、`git diff --check`；所有命令使用上述环境，最终 Node 合同读取刚生成的 `out/` 与 `release/current/`。
- 波次与启动条件：Wave 4；S22-R12 completed，三个 Node test-work 子目录 missing，端口可绑定，R13 request/manifest 自审计通过。
- 编辑可并行：否。
- 聚焦验证可并行：否；全部 Pages 命令串行。
- 主代理集成责任：核对 evidence、完整 release 根、所有 test-work/temp/视觉目录、输入 identities、保护输入、manifest、实际 diff 与 terminal receipt 后解锁 R14。
- 失败/回滚：保留失败产物与异常 staging/backup/test-work/temp；不静默清理、不部署、不改依赖或保护文件。

### S22-R14 — 两仓集成、完整回归与本地发布门禁

- 目标：在生成物稳定后完成跨仓契约、完整套件、身份与回滚验证。
- 范围：只执行两仓本地集成门禁、重建验证所需 Pages 生成物并写最终证据；不修改产品源、测试、依赖、版本或远程状态。
- 依赖：S22-R13。
- 执行基线根：`work-products/debug/execution-baselines/S22-R14/`；主代理用 R09 CLI 创建/验证 request 与 no-replace attempt。
- 读取：
  - `work-products/SPEC.md`、本候选批准快照、活动 todo（仅编排状态）
  - 两仓第 5 节完整 input inventories、锁文件、工具链 entrypoints、HEAD 与差异
  - Worker 测试、冻结 Section 22 历史与 `work-products/evidence/section22/`
  - `../UXUV-Pages/release/current/` 与 manifest
  - 四个 Pages `protected_inputs`
  - `../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/`（只读已批准视觉候选）
- 写入：
  - `work-products/evidence/section22/pair-validation.md`
  - `work-products/evidence/section22/receipts/S22-R14.json`
  - `work-products/debug/execution-baselines/S22-R14/`（主代理编排写入；排除在 worker target/snapshot set 之外）
- 生成输出：
  - `work-products/tests/work/execution-baseline-tool/`
  - `work-products/tests/work/section22-r14-worker-temp/`
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/`（完整根，含 `current/`、`.tmp-current-*`、`.previous-current-*`）
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/`
  - `../UXUV-Pages/work-products/tests/work/pwa-release/`
  - `../UXUV-Pages/work-products/tests/work/release-manifest/`
  - `../UXUV-Pages/work-products/tests/work/section21-candidate-draft/`
  - `../UXUV-Pages/work-products/tests/work/section22-r14-pages-temp/`
  - `../UXUV-Pages/work-products/tests/work/section21-rb-*/`（动态 namespace；启动前不得有匹配项，终态不得残留）
- 共享资源：两仓完整测试、Pages 发布物、本地端口 4173/4174、Worker/Pages 任务 temp、rollback drill namespace、Node test-work、视觉草稿、最终 evidence 与 todo；主代理独占。
- 验收：
  - R14 manifest 冻结两仓完整 git-visible inputs（排除明确 write/generated paths）、toolchain/lock identities、protected inputs 与已批准视觉候选；每条命令前复验，任一漂移立即 `RELEASE HOLD`。
  - Worker 全套、语法、大小、diff 与 Pages 全套离线门禁全部通过；完整 E2E 继续证明非 loopback 被本地 reject proxy 拒绝。
  - Worker 命令以 R14 Worker temp 作为 `TEMP/TMP/TMPDIR`；Pages 命令以 R14 Pages temp 作为 `TEMP/TMP/TMPDIR`，并设置 `PORT=4173`、`NEXT_TELEMETRY_DISABLED=1`、`SECTION21_REVIEW_FIXTURE=0`、`UXUV_WRITE_VISUAL_CANDIDATE=0`。
  - Worker `npm test` 触发的 `section21-rb-*` namespace 纳入生成所有权；启动前零匹配，终态零匹配。baseline-tool test-work 与三个 Pages Node test-work 同样成功终态 missing；temp/视觉草稿可存在但完整对账。
  - rollback drill 只允许在声明的 `section21-rb-*` 生成 namespace 内执行 `git clone --local` 及临时 Git 元数据写入；源 Worker/Pages 仓库的 `.git/` 始终只读，drill 不联网。
  - 跨仓证据证明账户级响应、四指标、版本/API/range、release manifest、活动名称零命中和回滚入口一致；活动测试集合重新生成排序清单。
  - 记录两仓状态、关键文件原始字节身份、manifest 资产/实际文件集合、时间与逐项退出码；四个保护输入及已批准视觉候选终态逐字节一致。
  - release 成功终态无 staging/backup；最终状态仅为 `LOCAL CANDIDATE / RELEASE HOLD`。
- 聚焦验证：
  - 在 Worker 串行运行 `node --check _worker.js`、`npm test`、`npm run check:size`、`git diff --check`。
  - 在 Pages 严格串行运行 `npm run lint`、`node node_modules/typescript/bin/tsc --noEmit`、`npm run test:e2e`、最终一次 `npm run build`、`npm run release:build`、最终一次 `npm test`、`git diff --check`。
  - 所有 Git 命令设置 `GIT_OPTIONAL_LOCKS=0`；每条命令使用上述离线/临时环境并在前后验证 inputs/protected inputs。
  - 重新发现活动测试，复跑两仓活动名称/秘密/机器路径扫描，核对规范、批准计划、关键源、回滚 namespace 与 release manifest 的路径/MIME/排序资产/实际集合。
- 波次与启动条件：Wave 5；S22-R13 completed，R14 request/manifest 完整自审计，动态 rollback namespace 与四个可清理 test-work 零残留，端口可绑定。
- 编辑可并行：否。
- 聚焦验证可并行：否；两仓命令与生成目录串行。
- 主代理集成责任：对账两仓 inputs/diff、生成物、保护输入、活动测试清单、回滚入口、receipt 与全部命令；只有全绿才原子更新终态 todo。
- 失败/回滚：任一门禁失败即 `RELEASE HOLD`；保留失败证据与异常生成状态，不自动提交、推送、部署、联网或修改远程配置。清理/回滚需另行授权。

## 5. Baseline、输入身份、所有权与失败规则

- 除显式以 `../UXUV-Pages/` 开头的路径外，仓库相对路径均以 Worker 根解析。manifest、request、receipt 与测试不得保存机器绝对路径。
- 旧 `work-products/debug/execution-baselines/S22-R01/` 是只读失败历史；新任务不得写入、删除、修补、引用其 snapshot 作为活动基线或转移 owner。
- R09 只能使用其固定 bootstrap；R10—R14 只能使用 R09 通过 GREEN 的 CLI。每个 attempt request 位于自己的 `work-products/debug/execution-baselines/<task>/` 主代理编排根，声明唯一 attempt root；CLI 以 no-replace 创建 attempt，复制 request 原始字节并记录 SHA-256。
- 正式 request 明确列出 `targets`、`inputs`、`protected_inputs`、`repositories`、`toolchain`、`environment` 与 `generated_namespaces`。执行基线根和 todo 是主代理编排例外，不得进入 target/snapshot，也不得由 worker 写入。
- `repositories` 输入集合由 `git ls-files --cached --others --exclude-standard -z` 生成，使用 `GIT_OPTIONAL_LOCKS=0`，包含完整 git-visible file identity；只排除任务明确 write/generated paths、`.git/` 与 baseline 编排根。另记录 HEAD、排序 inventory identity、package/lock、`node_modules/.package-lock.json`（若存在）及计划点名的本地 CLI entrypoints；不把 ignored `node_modules/` 整树伪装成已冻结输入。
- 每个显式读取文件/目录必须属于 repository inventory、单列 input 或 protected input。input 目录枚举完整 descendant 路径/类型/大小/SHA-256；任一新增、删除、类型、字节、大小写别名、链接/reparse 或 realpath 漂移都失败。
- Pages request 还把 `.env`、`.env.local`、`.env.production`、`.env.production.local`、`.env.test`、`.env.test.local` 作为显式 present/missing inputs；扫描 git-visible 源中的 `process.env` 键并声明任务解析值。manifest 只保存非敏感固定值或敏感值 SHA-256，不持久化秘密；环境键/值身份在每条命令前复验。
- target present 文件/目录保存原始字节 snapshot；missing 保存状态。目录 descendant 与 snapshot 相对路径必须规范、非空、唯一，源/快照路径与类型集合完全相等，普通文件逐字节一致。动态 namespace 记录锚定父目录、固定前缀与启动/终态允许状态，不接受任意 glob。
- 创建后主代理运行 `verify --phase prewrite`；todo 原子转为 `in_progress` 后运行 `verify --phase inputs`；worker 首次写入前及每条验证命令前运行同一 inputs 验证。手写 targets 完成编辑后用只读 `fingerprint --set targets` 固定 candidate digest，并在每条命令前及回收时比较；`verify --phase terminal` 复核 baseline 自完整性、inputs/protected inputs、namespace 策略并输出最终 fingerprints，主代理与 worker receipt 对账。
- active todo 不做静态字节冻结，因为主代理必须合法转换状态；每次 CLI 验证同时由主代理验证 todo 状态机、checkbox 镜像、依赖前缀与至多一个 `in_progress`。批准 plan 必须始终与批准快照逐字节一致。
- 四个 Pages 并发文件在 R11/R13/R14 另列 `protected_inputs`；R13/R14 还保护已批准视觉候选。任何漂移都阻塞且不得覆盖。
- R11/R13/R14 固定 `NEXT_TELEMETRY_DISABLED=1`；所有 Playwright 使用 loopback reject proxy，禁止非 loopback。所有任务使用现有本地 Node/npm/CLI，不安装依赖，不使用 `npx`、全局替代或联网回退。
- 每次只允许一个任务 `in_progress`。blocked attempt 不重写；恢复必须再使用新任务 ID 和新 attempt。任一基线缺陷、输入漂移、范围扩张、门禁失败或所有权漂移都停止下游。
- 源 Worker/Pages 仓库的 Git 只允许 `GIT_OPTIONAL_LOCKS=0` 的只读发现、HEAD、status 与 diff；禁止 add、commit、checkout、reset、clean、stash、worktree 变更或其他 Git 元数据写入。唯一例外是 R14 既有 rollback drill 在已声明、可删除的 `section21-rb-*` 生成 namespace 内创建 `git clone --local` 临时仓库；该例外不授予源仓 Git 写权限或网络权限。
- 所有过程、证据和测试产物位于各自仓库 `work-products/`；测试引用仓库文件使用相对路径。失败生成物不静默删除，成功清理只允许测试自身既有 finally/after 合同完成。

## 6. 计划阶段已知 RED 与批准语义

- 活动 `work-products/tests/section22-recovery-plan-contract.test.mjs` 仍读取活动 plan/todo 并断言 R00—R04；本候选替换活动 plan/todo 后，在 S22-R10 前预期失败。R10 必须把旧断言路由到冻结 blocked-r01 历史，再新增本候选合同；规划阶段不修改测试伪造绿色。
- R09 的 execution-baseline 测试与 CLI 当前均 missing；R09 先写测试产生安全 RED，再实现 CLI 取得 GREEN。
- 活动退役名称扫描当前在 Worker 测试 5 行、Pages 测试 1 行命中；这是 S22-R11 的聚焦 RED。Pages offline-boundary 当前 missing，Playwright 尚未配置 reject proxy；R11 的安全 RED 必须在任何外部 fetch 前失败。
- 候选批准基线：`work-products/debug/approval-baselines/s22-account-usage-baseline-recovery-20260821-01/plan.md`；呈交前必须 create-new/no-replace，且与活动 plan 原始字节完全一致。
- 本次 `@uxu-code:plan` 调用不是批准。只有用户看到本候选后作出的清晰整句批准，才能在 todo 记录批准 receipt。
- 计划批准不调用 `@uxu-code:build`，也不授权 build auto、commit、push、部署、联网或真实 Cloudflare/D1 操作。
