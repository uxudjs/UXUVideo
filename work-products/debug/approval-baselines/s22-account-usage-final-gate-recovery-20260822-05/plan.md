# 第五恢复计划：SPEC 第 22 节最终本地门禁

> 候选 ID：`s22-account-usage-final-gate-recovery-20260822-05`
> 候选状态：`PENDING APPROVAL`
> `fast requested: false`
> 执行策略：`serial`
> 安全并发上限：1
> 终态上限：`LOCAL CANDIDATE / RELEASE HOLD`
> 本计划不授权：实现、`@uxu-code:build auto`、commit、push、部署、联网或 Cloudflare/D1 远程变更

## 1. 规划依据与充分性

- 权威规格为 `work-products/SPEC.md` 第 22 节；账户级 API、严格解析、Pages 四指标、三语、四断点、鉴权、同源、stale、安全、兼容、版本与回滚决定均未改变。
- S22-R15、R16、R17 已由各自 completed receipt 证明完成；不重跑这些实现任务，也不改写其历史。
- S22-R18 的 attempt、request、manifest、snapshot、sidecar、`work-products/evidence/section22/pair-validation.md` 与 `receipts/S22-R18.json` 永久保持 blocked、只读且不可复用。
- R18 的唯一失败是 `candidate-hygiene.test.mjs` 枚举 Git 路径时触发 `ENOBUFS`。`work-products/debug/s22-r18-candidate-hygiene-enobufs.md` 已记录确定性 RED→GREEN、定向 10/10、Worker 完整 216/216、语法、大小与 diff 通过；修复没有修改产品逻辑或历史 R18。
- 旧批准计划的原始字节保存在 `work-products/debug/approval-baselines/s22-account-usage-execution-recovery-20260821-02/plan.md`；旧 blocked todo 已在本次规划替换前以原始字节一致方式 create-new 冻结为 `work-products/evidence/section22/blocked-r18-todo.md`，后续只读且不得再次写入。
- 首个 R19 草案快照 `s22-account-usage-final-gate-recovery-20260821-03` 因终止换行导致原始字节比对失败，保留只读且不具批准效力。
- 候选 `s22-account-usage-final-gate-recovery-20260821-04` 获得清晰用户批准，但其 todo 合同测试固定要求 `PENDING`，与批准后 `APPROVED` 及执行时 `in_progress` 的合法转换冲突；批准未写入 todo，R19 未启动，该快照保持只读且不适用于本替换候选。
- 本活动候选仅修复 `work-products/tests/section22-final-gate-recovery-plan-contract.test.mjs` 的计划态合同，使其严格接受 `PENDING/pending` 或 `APPROVED` 下的 `pending → in_progress → completed | blocked`，同时继续约束 checkbox、状态标题、批准记录和 plan/snapshot 原始字节一致；不修改业务代码或放宽任何执行门禁。
- 现有 debug 证据与批准规格已经给出目标、范围、约束和可验证验收；本候选只恢复尚未完成的最终本地门禁，不引入接口、数据、安全、架构、兼容或 rollback 新决定，因此无需新 specification。
- 四个 Pages 并发文件继续作为只读 `protected_inputs`：`package.json`、`work-products/tests/iptv-retirement-contract.test.mjs`、`pages-deployment.test.mjs`、`repository-test-isolation.test.mjs`。不要求 clean，不重新归因，不覆盖现有脏工作树。

## 2. 目标与验收总则

1. 使用全新 S22-R19 no-replace attempt 重新执行完整 Worker 与 Pages 本地离线门禁；不得续跑、修补或覆盖 R18。
2. Worker 语法、候选卫生、完整测试、大小与 diff 全绿；Pages 远程构建依赖静态扫描、lint、TypeScript、离线 E2E、build、release build、完整测试与 diff 全绿。
3. 两仓身份、秘密、机器路径、退役名称、版本/API/range、release manifest 与实际资产集合一致；流程 evidence/receipt 另行审计，不能把通用 candidate-hygiene 误报为覆盖 `work-products/evidence/section22/` 或 `work-products/debug/`。
4. rollback 仅在声明的 Pages generated namespace 内运行既有只读重放测试；两个源仓 `.git/` 永久只读，clone-local `.git/` 是唯一例外。
5. `pages:release` 只作为完整 target 保存初态与终态；其 `current` 子路径不得同时声明为 input。manifest/实际资产一致性在重建后的 target 上验证。
6. 五个 Pages 保护输入、批准视觉候选与所有 immutable inputs 终态不变；release staging/backup、Node test-work、task temp 与 rollback namespace 满足终态合同。
7. 成功仅形成 `LOCAL CANDIDATE / RELEASE HOLD`；本地全绿不授权 commit、push、部署、联网或远程状态变更。

规划时只读预检已确认：新候选批准目录、S22-R19 namespace/attempt/receipt/evidence、R19 task temp、baseline-tool test-work、三个 Pages Node test-work 均 missing；六个 Pages `.env*` missing；4173/4174 无监听；release staging/backup 与 rollback namespace 无匹配；本地 Node 20.19.2、npm 10.8.2、Chrome 151.0.7922.173、Playwright、Next、esbuild、ESLint、TypeScript 与两仓本地 entrypoint 可用。`.next/`、`out/`、`release/`、Playwright artifacts、`tsconfig.tsbuildinfo` 与视觉草稿允许 present，并必须作为完整 target snapshot。所有动态状态在 build attempt 创建前重新验证。

## 3. 执行策略、依赖图与波次

执行策略为 `serial`。只有一个不可拆的最终集成切片；Worker/Pages 完整测试、Pages 生成物、端口、共享 task temp、rollback namespace、证据与 todo 相互依赖，拆分或并发会造成目标/读取重叠和证据身份漂移。

```text
已冻结历史：S22-R15 completed → S22-R16 completed → S22-R17 completed → S22-R18 blocked
活动候选：S22-R19 pending
```

| 波次 | Ready | Frozen | 上限 | 编辑 / 聚焦验证并行 | 屏障与解锁条件 |
|---|---|---|---:|---|---|
| Wave 0 | S22-R19 | 无 | 1 | 否 / 否 | 新批准 receipt 与独立 `@uxu-code:build auto` 均存在；R19 prestate、request、manifest、输入、环境与保护项全部通过才可启动。 |

`work-products/todo.md` 是主代理单写编排账本：合法转换仅为 `pending → in_progress → completed | blocked`，checkbox 是其原子派生镜像。todo 不是 task target、snapshot、input、protected input、fingerprint 或 `orchestration_output`；它只允许作为 Worker repository 的精确 exclusion，并由主代理在 prewrite 后原子更新。

## 4. 任务合同

### S22-R19 — 两仓最终门禁恢复与本地候选证据

- 目标：在全新不可复用 attempt 中完成 R18 未形成的完整两仓本地发布门禁、证据审计与 rollback 重放。
- 范围：本候选批准前仅修复上述计划合同测试；S22-R19 执行时只运行本地验证、重建声明的 Pages 生成物，并 create-new 写 R19 evidence/receipt，不再修改产品源、测试、依赖、版本、保护输入、源仓 Git 元数据或远程状态。
- 依赖：无活动任务依赖；启动前必须验证历史 R15—R17 completed receipts、R18 blocked receipt/证据和 ENOBUFS debug GREEN 记录均存在且作为 immutable inputs 被新 manifest 捕获。
- 执行基线根：任务 namespace 为 `work-products/debug/execution-baselines/S22-R19/`；唯一 attempt ID 为 `run-20260821-s22-r19-01`，request 为 `work-products/debug/execution-baselines/S22-R19/request-run-20260821-s22-r19-01.json`，`attempt_root` 固定为 `work-products/debug/execution-baselines/S22-R19/run-20260821-s22-r19-01`。
- 读取：
  - `work-products/SPEC.md`、活动 plan、新候选批准快照、旧批准 plan、冻结 blocked R18 todo、baseline CLI 与五个计划合同测试
  - `_worker.js`、README、CHANGELOG、锁文件、Worker 完整测试与大小工具
  - R15—R18 receipts、R18 blocked pair evidence、R16/R17 validation evidence 与 ENOBUFS debug 记录
  - Pages 锁文件、离线 Playwright 配置/测试、本地工具链、六个 `.env*` missing 状态
  - 四个 Pages 保护文件与 `work-products/tests/fixtures/ui-review/section21-candidate`
  - `pages:release` 不进入 input；只通过完整 target 初态 snapshot 与逐命令 target fingerprint 读取
- 写入：
  - `work-products/evidence/section22/final-gate-recovery-validation.md`
  - `work-products/evidence/section22/receipts/S22-R19.json`
  - `work-products/debug/execution-baselines/S22-R19/`
  - `work-products/debug/execution-baselines/S22-R19/run-20260821-s22-r19-01`
- 生成输出：
  - `work-products/tests/work/execution-baseline-tool/`
  - `work-products/tests/work/section22-r19-temp/`
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/`
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/`
  - `../UXUV-Pages/work-products/tests/work/pwa-release/`
  - `../UXUV-Pages/work-products/tests/work/release-manifest/`
  - `../UXUV-Pages/work-products/tests/work/section21-candidate-draft/`
- `orchestration_outputs`：
  - `work-products/evidence/section22/receipts/S22-R19.json`
- Request 排除：
  - `work-products/todo.md`
  - `work-products/evidence/section22/final-gate-recovery-validation.md`
  - `work-products/evidence/section22/receipts/S22-R19.json`
  - `work-products/debug/execution-baselines/S22-R19/`
  - `work-products/debug/execution-baselines/S22-R19/run-20260821-s22-r19-01`
  - `work-products/tests/work/execution-baseline-tool/`
  - `work-products/tests/work/section22-r19-temp/`
  - `../UXUV-Pages/.next/`
  - `../UXUV-Pages/out/`
  - `../UXUV-Pages/release/`
  - `../UXUV-Pages/tsconfig.tsbuildinfo`
  - `../UXUV-Pages/work-products/tests/artifacts/playwright/`
  - `../UXUV-Pages/work-products/tests/work/kvideo-webview-compatibility/`
  - `../UXUV-Pages/work-products/tests/work/pwa-release/`
  - `../UXUV-Pages/work-products/tests/work/release-manifest/`
  - `../UXUV-Pages/work-products/tests/work/section21-candidate-draft/`
  - Worker repository 必须精确排除 todo；receipt 是主代理 create-new 编排输出，不进入 target/snapshot/fingerprint；不得 broad-exclude `work-products/`。
- 共享资源：两仓完整测试、Pages 生成物、端口 4173/4174、单一 R19 task temp、baseline-tool test-work、rollback namespace、最终 evidence/receipt 与 todo；全部由主代理独占。
- 验收：
  - attempt 创建前验证 plan 与新 no-replace snapshot 原始字节一致、todo 为 APPROVED 且存在独立 build-auto 调用；计划合同在 todo 的批准与执行合法状态中持续 GREEN；旧候选授权不得继承。
  - v2 request/manifest 精确冻结两仓 inputs、toolchain、环境、保护输入、targets 与 generated namespace；每条命令前运行 inputs/environment/protected/generated 验证。
  - Worker 先定向复跑候选卫生，再运行完整套件、语法、大小与 diff；Pages 在 build 前静态拒绝 `next/font` 与远程 CSS import，随后串行执行完整离线门禁。
  - rollback 命令固定为 `node --test work-products/tests/section21-rollback-drill.test.mjs`，不使用 `--generate`；仅允许测试在 `pages:work-products/tests/work/section21-rb-*` 内执行 `git clone --local --no-hardlinks --no-checkout`、clone-local config/checkout 与其自身边界校验后的 `finally` cleanup。两个源仓 `.git/` 永久只读。
  - 新 evidence 使用 `s22-final-gate-validation/v1`，receipt 使用 `s22-task-receipt/v1`；两者只保存 repository-relative 路径、净化命令结果与布尔/计数证据，不保存秘密或机器绝对路径。
  - 通用 candidate-hygiene 不覆盖流程目录。主代理先审计最终 evidence，再对待写 receipt 的精确序列化字节执行 schema、路径、秘密与历史引用审计；receipt create-new 后回读必须与预审计字节完全一致，之后才可完成 todo。
  - 完整 `pages:release` 是 target-only；重建后验证 manifest 与实际资产集合、版本 `2.0.0`/`0.3.0`、API Contract 2 与 Worker range 一致。
  - 五个保护输入不变；generated namespace 终态 none；release 无 staging/backup；三个 Pages Node test-work 与 baseline-tool work missing；共享 task temp 身份不漂移；terminal verify GREEN。
- 聚焦验证：
  - Worker：`node --check _worker.js`；`node --test work-products/tests/candidate-hygiene.test.mjs`；`npm test`；`npm run check:size`；`git diff --check`。
  - Pages：静态扫描 `next/font` 与远程 CSS import 零命中；`npm run lint`；`node node_modules/typescript/bin/tsc --noEmit`；`npm run test:e2e`；`npm run build`；`npm run release:build`；`npm test`；`git diff --check`。
  - 集成：两仓身份/秘密/机器路径/退役名称/manifest-actual 扫描；`node --test work-products/tests/section21-rollback-drill.test.mjs`；evidence/receipt 独立审计与 receipt 原始字节回读。
- 波次与启动条件：Wave 0；候选已明确批准且 plan/snapshot 原始字节一致，随后用户另行调用 `@uxu-code:build auto`；R19 namespace/attempt/evidence/receipt/task temp、baseline-tool work、三个 Pages Node test-work 与 rollback namespace missing，release transient namespace empty，端口可绑定，本地 entrypoints/Chrome 可用，路径无 reparse/alias 冲突，request/manifest 自审计通过。
- 编辑可并行：否；R19 不允许编辑产品或测试。
- 聚焦验证可并行：否；两仓命令与生成目录严格串行。
- 主代理集成责任：创建并回读 request/manifest，单写 todo，逐命令复验 inputs/environment/targets，汇总命令证据，执行 rollback 与流程证据独立审计，terminal verify 后 create-new 写 receipt，回读一致后原子完成或阻塞 todo。
- 失败/回滚：任一门禁失败即 `RELEASE HOLD` 并消费 attempt；主代理 create-new 写 blocked evidence/receipt，保留测试或 builder 自身 `finally` cleanup 后仍存在的失败产物，不追加清理。仅既有 subprocess 可清理其声明的 staging、Node test-work 或边界内 rollback clone；不提交、推送、部署、联网或修改远程配置。

## 5. 可执行 request 蓝图

下列 JSON 是 S22-R19 的批准绑定机器合同。主代理只可按引用展开为 `s22-execution-baseline-request/v2`；request 路径全部使用 repository-relative canonical POSIX 字符串、无尾 `/`、无 glob。task namespace 与空 task temp 由主代理在 create 前建立，attempt root 必须仍 missing。

<!-- S22_FINAL_GATE_RECOVERY_REQUEST_BLUEPRINT -->
```json
{
  "schema_version": "s22-final-gate-recovery-request-blueprints/v1",
  "request_schema": "s22-execution-baseline-request/v2",
  "runtime": {
    "node_version": "v20.19.2",
    "npm_version": "10.8.2",
    "chrome_channel": "Google Chrome",
    "chrome_version": "151.0.7922.173",
    "fallbacks_forbidden": ["npx", "install", "network"]
  },
  "failure_contract": {
    "request_location": "task baseline root outside attempt",
    "receipt_location": "task orchestration output",
    "attempt_id_terminal_state": "consumed",
    "create_failure_receipt": "create-new sanitized",
    "creating_staging": "may be atomically removed",
    "subprocess_declared_cleanup": "allowed and recorded",
    "main_agent_post_failure_cleanup": "forbidden",
    "retention": "all artifacts still present after subprocess cleanup"
  },
  "captured_resource_prestate": {
    "missing_inputs": [
      "pages:.env",
      "pages:.env.local",
      "pages:.env.development",
      "pages:.env.development.local",
      "pages:.env.production",
      "pages:.env.production.local"
    ],
    "directory_protected_inputs": ["pages:work-products/tests/fixtures/ui-review/section21-candidate"],
    "target_only_resources": ["pages:release"],
    "other_inputs": "regular file",
    "other_protected_inputs": "regular file",
    "toolchain_entrypoints": "regular file"
  },
  "input_sets": {
    "governance": [
      { "repository": "worker", "path": "work-products/SPEC.md" },
      { "repository": "worker", "path": "work-products/plan.md" },
      { "repository": "worker", "path": "work-products/debug/approval-baselines/s22-account-usage-final-gate-recovery-20260822-05/plan.md" },
      { "repository": "worker", "path": "work-products/debug/approval-baselines/s22-account-usage-execution-recovery-20260821-02/plan.md" },
      { "repository": "worker", "path": "work-products/evidence/section22/blocked-r18-todo.md" },
      { "repository": "worker", "path": "work-products/scripts/execution-baseline.mjs" },
      { "repository": "worker", "path": "work-products/tests/execution-baseline-tool.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/section22-plan-contract.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/section22-recovery-plan-contract.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/section22-baseline-recovery-plan-contract.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/section22-execution-recovery-plan-contract.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/section22-final-gate-recovery-plan-contract.test.mjs" }
    ],
    "worker-validation": [
      { "repository": "worker", "path": "_worker.js" },
      { "repository": "worker", "path": "README.md" },
      { "repository": "worker", "path": "CHANGELOG.md" },
      { "repository": "worker", "path": "package.json" },
      { "repository": "worker", "path": "package-lock.json" },
      { "repository": "worker", "path": "scripts/check-worker-size.mjs" },
      { "repository": "worker", "path": "work-products/tests/candidate-hygiene.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/cloudflare-usage-contract.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/structured-logging.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/worker-only-boundary.test.mjs" },
      { "repository": "worker", "path": "work-products/tests/section21-rollback-drill.test.mjs" }
    ],
    "pages-runtime": [
      { "repository": "pages", "path": "package-lock.json" },
      { "repository": "pages", "path": "node_modules/.package-lock.json" },
      { "repository": "pages", "path": ".env" },
      { "repository": "pages", "path": ".env.local" },
      { "repository": "pages", "path": ".env.development" },
      { "repository": "pages", "path": ".env.development.local" },
      { "repository": "pages", "path": ".env.production" },
      { "repository": "pages", "path": ".env.production.local" }
    ],
    "pages-offline-suite": [
      { "repository": "pages", "path": "playwright.config.ts" },
      { "repository": "pages", "path": "work-products/tests/usage-ui.e2e.spec.ts" },
      { "repository": "pages", "path": "work-products/tests/offline-boundary.e2e.spec.ts" },
      { "repository": "pages", "path": "work-products/tests/offline-reject-proxy.mjs" }
    ],
    "prior-validation-evidence": [
      { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R15.json" },
      { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R16.json" },
      { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R17.json" },
      { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R18.json" },
      { "repository": "worker", "path": "work-products/evidence/section22/worker-validation.md" },
      { "repository": "worker", "path": "work-products/evidence/section22/pair-validation.md" },
      { "repository": "worker", "path": "work-products/debug/s22-r18-candidate-hygiene-enobufs.md" },
      { "repository": "pages", "path": "work-products/evidence/section22/pages-validation.md" }
    ]
  },
  "protected_input_sets": {
    "pages-four-plus-visual": [
      { "repository": "pages", "path": "package.json" },
      { "repository": "pages", "path": "work-products/tests/iptv-retirement-contract.test.mjs" },
      { "repository": "pages", "path": "work-products/tests/pages-deployment.test.mjs" },
      { "repository": "pages", "path": "work-products/tests/repository-test-isolation.test.mjs" },
      { "repository": "pages", "path": "work-products/tests/fixtures/ui-review/section21-candidate" }
    ]
  },
  "toolchain_profiles": {
    "two-repository-full": [
      { "repository": "worker", "path": "work-products/scripts/execution-baseline.mjs" },
      { "repository": "worker", "path": "scripts/check-worker-size.mjs" },
      { "repository": "pages", "path": "node_modules/@playwright/test/cli.js" },
      { "repository": "pages", "path": "node_modules/next/dist/bin/next" },
      { "repository": "pages", "path": "node_modules/esbuild/bin/esbuild" },
      { "repository": "pages", "path": "node_modules/eslint/bin/eslint.js" },
      { "repository": "pages", "path": "node_modules/typescript/bin/tsc" }
    ]
  },
  "environment_profiles": {
    "pages-offline": {
      "fixed": [
        { "key": "GIT_OPTIONAL_LOCKS", "state": "present", "sensitive": false, "value": "0" },
        { "key": "PORT", "state": "present", "sensitive": false, "value": "4173" },
        { "key": "NEXT_TELEMETRY_DISABLED", "state": "present", "sensitive": false, "value": "1" },
        { "key": "SECTION21_REVIEW_FIXTURE", "state": "present", "sensitive": false, "value": "0" },
        { "key": "UXUV_WRITE_VISUAL_CANDIDATE", "state": "present", "sensitive": false, "value": "0" }
      ],
      "task_temp_sha256": ["TEMP", "TMP", "TMPDIR"],
      "absent": ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"],
      "preflight_absent_aliases": ["http_proxy", "https_proxy", "all_proxy", "no_proxy"]
    }
  },
  "tasks": [
    {
      "task_id": "S22-R19",
      "owner": "native-worker:s22_r19",
      "no_replace": true,
      "predecessor": null,
      "wave": 0,
      "attempt_id": "run-20260821-s22-r19-01",
      "attempt_root": "work-products/debug/execution-baselines/S22-R19/run-20260821-s22-r19-01",
      "request_path": "work-products/debug/execution-baselines/S22-R19/request-run-20260821-s22-r19-01.json",
      "repositories": [
        {
          "id": "worker",
          "root": ".",
          "exclude": [
            "work-products/todo.md",
            "work-products/evidence/section22/final-gate-recovery-validation.md",
            "work-products/evidence/section22/receipts/S22-R19.json",
            "work-products/debug/execution-baselines/S22-R19",
            "work-products/debug/execution-baselines/S22-R19/run-20260821-s22-r19-01",
            "work-products/tests/work/execution-baseline-tool",
            "work-products/tests/work/section22-r19-temp"
          ]
        },
        {
          "id": "pages",
          "root": "../UXUV-Pages",
          "exclude": [
            ".next",
            "out",
            "release",
            "tsconfig.tsbuildinfo",
            "work-products/tests/artifacts/playwright",
            "work-products/tests/work/kvideo-webview-compatibility",
            "work-products/tests/work/pwa-release",
            "work-products/tests/work/release-manifest",
            "work-products/tests/work/section21-candidate-draft"
          ]
        }
      ],
      "targets": [
        { "repository": "worker", "path": "work-products/evidence/section22/final-gate-recovery-validation.md" },
        { "repository": "worker", "path": "work-products/tests/work/execution-baseline-tool" },
        { "repository": "worker", "path": "work-products/tests/work/section22-r19-temp" },
        { "repository": "pages", "path": ".next" },
        { "repository": "pages", "path": "out" },
        { "repository": "pages", "path": "release" },
        { "repository": "pages", "path": "tsconfig.tsbuildinfo" },
        { "repository": "pages", "path": "work-products/tests/artifacts/playwright" },
        { "repository": "pages", "path": "work-products/tests/work/kvideo-webview-compatibility" },
        { "repository": "pages", "path": "work-products/tests/work/pwa-release" },
        { "repository": "pages", "path": "work-products/tests/work/release-manifest" },
        { "repository": "pages", "path": "work-products/tests/work/section21-candidate-draft" }
      ],
      "input_sets": ["governance", "worker-validation", "pages-runtime", "pages-offline-suite", "prior-validation-evidence"],
      "protected_input_set": "pages-four-plus-visual",
      "orchestration_outputs": [
        { "repository": "worker", "path": "work-products/evidence/section22/receipts/S22-R19.json" }
      ],
      "toolchain_profile": "two-repository-full",
      "environment_profile": "pages-offline",
      "task_temp": { "repository": "worker", "path": "work-products/tests/work/section22-r19-temp" },
      "generated_namespaces": [
        { "repository": "pages", "parent": "work-products/tests/work", "prefix": "section21-rb-", "initial": "none", "terminal": "none" }
      ],
      "prestate": {
        "initial_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R19",
          "worker:work-products/debug/execution-baselines/S22-R19/run-20260821-s22-r19-01",
          "worker:work-products/evidence/section22/final-gate-recovery-validation.md",
          "worker:work-products/evidence/section22/receipts/S22-R19.json",
          "worker:work-products/tests/work/execution-baseline-tool",
          "worker:work-products/tests/work/section22-r19-temp",
          "pages:.env",
          "pages:.env.local",
          "pages:.env.development",
          "pages:.env.development.local",
          "pages:.env.production",
          "pages:.env.production.local",
          "pages:work-products/tests/work/kvideo-webview-compatibility",
          "pages:work-products/tests/work/pwa-release",
          "pages:work-products/tests/work/release-manifest"
        ],
        "create_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R19/run-20260821-s22-r19-01",
          "worker:work-products/evidence/section22/final-gate-recovery-validation.md",
          "worker:work-products/evidence/section22/receipts/S22-R19.json",
          "worker:work-products/tests/work/execution-baseline-tool",
          "pages:.env",
          "pages:.env.local",
          "pages:.env.development",
          "pages:.env.development.local",
          "pages:.env.production",
          "pages:.env.production.local",
          "pages:work-products/tests/work/kvideo-webview-compatibility",
          "pages:work-products/tests/work/pwa-release",
          "pages:work-products/tests/work/release-manifest"
        ],
        "create_must_be_regular_files": [
          "worker:work-products/debug/execution-baselines/S22-R19/request-run-20260821-s22-r19-01.json"
        ],
        "create_must_be_empty_directories": [
          "worker:work-products/tests/work/section22-r19-temp"
        ],
        "preflight_namespaces_must_be_empty": [
          { "repository": "pages", "parent": "release", "prefix": ".tmp-current-" },
          { "repository": "pages", "parent": "release", "prefix": ".previous-current-" }
        ],
        "ports_must_be_free": [4173, 4174],
        "generated_namespace_matches": [],
        "paths_must_not_be_reparse_points": "all declared roots, resources, parents, and generated namespace anchors"
      },
      "validation_sequence": [
        "Worker node --check _worker.js",
        "Worker node --test work-products/tests/candidate-hygiene.test.mjs",
        "Worker npm test",
        "Worker npm run check:size",
        "Worker git diff --check",
        "Pages static remote-build dependency scan",
        "Pages npm run lint",
        "Pages node node_modules/typescript/bin/tsc --noEmit",
        "Pages npm run test:e2e",
        "Pages npm run build",
        "Pages npm run release:build",
        "Pages npm test",
        "Pages git diff --check",
        "two-repository identity secret path retired-name and manifest-actual scans",
        "Worker node --test work-products/tests/section21-rollback-drill.test.mjs",
        "main-agent evidence audit and pre-serialized receipt audit",
        "receipt create-new and byte-identical readback"
      ],
      "terminal_invariants": [
        "verify terminal GREEN",
        "shared task temp identity unchanged",
        "generated namespace terminal none",
        "release staging and backup absent",
        "baseline-tool and three Pages Node test-work paths missing",
        "pages-four-plus-visual unchanged",
        "release target-only manifest and actual assets consistent",
        "evidence and receipt independently audited",
        "receipt create-new after terminal",
        "LOCAL CANDIDATE / RELEASE HOLD"
      ]
    }
  ]
}
```

## 6. Baseline、身份、审计与失败规则

- Repository 映射只允许 `worker` → `.` 与 `pages` → `../UXUV-Pages`。所有资源路径 canonical、repository-relative、无 glob；任何 alias、reparse、owner 或路径重叠不确定性在写盘前停止。
- 新 task root、attempt root、request、evidence 与 receipt 都是唯一 no-replace 名称；任一已存在即零执行者 BLOCKED。R18 及更早历史 attempt/receipt/冻结文件全程只读。
- plan 与候选批准 snapshot 是 immutable inputs。attempt 创建前必须先验证 todo 的批准 receipt，再 stream-compare plan 与 snapshot 原始字节；旧候选批准或旧 build-auto 授权不能继承。
- 创建流程：批准双门检查 → initial prestate → 主代理建立 task root 与空 temp、写 root 内 request → create prestate/静态合同回读 → baseline create → manifest/snapshot 自审计 → `verify prewrite` → todo 原子转 `in_progress` → `verify inputs` → 动态端口/工具链/环境/保护项复验 → 首条命令。
- 每条命令前复验 inputs/environment/protected/generated namespace 并核对当前 target fingerprint。所有 Git 发现设置 `GIT_OPTIONAL_LOCKS=0`；源仓禁止 add、commit、checkout、reset、clean、stash、worktree 或其他 Git 元数据写入。
- rollback 唯一 Git 写例外位于 baseline 声明的 Pages `section21-rb-*` clone namespace；只允许既有测试的 local clone/config/checkout 与边界校验后的自身 cleanup，不授权源仓或网络写入。
- 成功流程：汇总所有命令 → 原子写最终 evidence → 独立审计 evidence → 固定 candidate target fingerprint → terminal verify → 对 receipt 待写精确字节预审计 → create-new 写 receipt → 原始字节回读一致 → todo 原子转 `completed`。
- 失败流程：立即停止下游命令 → 写净化 blocked evidence → terminal verify → 对 blocked receipt 待写字节预审计 → create-new 写 receipt并回读 → todo 原子转 `blocked`。attempt 永久 consumed；主代理不得追加清理或重试同一 ID。
- 所有过程、证据与测试产物仅位于两仓 `work-products/`；测试从最终目录使用仓库相对路径引用文件。

## 7. 批准边界

- 候选批准快照：`work-products/debug/approval-baselines/s22-account-usage-final-gate-recovery-20260822-05/plan.md`。呈交前必须 create-new/no-replace 且与活动 plan 原始字节一致。
- `work-products/todo.md` 当前只能记录 `PENDING`；本次 `@uxu-code:plan` 不构成批准。
- 用户后续以清晰整句批准时，主代理只 stream-compare plan/snapshot 并原子更新 todo 的批准状态与记录；用户无需复制或复述候选 ID。
- 计划批准仍不启动执行。只有批准完成后，用户另行调用 `@uxu-code:build auto` 才授权按本候选本地执行 S22-R19。
- 任何批准或 build 调用均不授权 commit、push、部署、联网、外部写入或 Cloudflare/D1 远程变更。
