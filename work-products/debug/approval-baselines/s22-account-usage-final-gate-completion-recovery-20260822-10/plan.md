# 第七恢复计划：SPEC 第 22 节最终本地门禁完成

> 候选 ID：`s22-account-usage-final-gate-completion-recovery-20260822-10`
> 候选状态：`PENDING APPROVAL`
> `fast requested: false`
> 执行策略：`serial`
> 安全并发上限：1
> 终态上限：`LOCAL CANDIDATE / RELEASE HOLD`
> 本计划不授权：commit、push、部署、联网或 Cloudflare/D1 远程变更

## 1. 规划依据与充分性

- 权威规格仍为 `work-products/SPEC.md` 第 22 节；产品接口、数据、安全、版本、兼容与 rollback 决策不变，无需新 specification。
- S22-R15—R17 completed；S22-R18—R20 的 blocked evidence、receipt、request、manifest/snapshot（若已创建）均为 immutable、consumed，不得覆盖或复用。
- R20 在 baseline create 前 fail-closed：批准蓝图把 `work-products/debug/s22-r19-in-progress-mirror-contract.md` 同时列入 `governance` 与 `prior-validation-evidence`，展平后的 v2 request 被拒绝为 duplicate input。
- R20 attempt/staging 未创建、worker 未启动、产品门禁未开始；request、blocked todo、evidence、receipt 与空 task temp 保持现场。
- `work-products/tests/section22-final-gate-completion-plan-contract.test.mjs` 已绑定冻结 R20 plan/todo/request/evidence/receipt；新的活动合同先取得唯一性 RED，再要求 R21 蓝图展平后全局唯一。
- 首个 R21 候选 `s22-account-usage-final-gate-completion-recovery-20260822-08` 未批准、未创建 task root 或 attempt；其 prestate request 文件名残留 R20 attempt，经合同 RED 后由后继候选替代。
- 候选 `s22-account-usage-final-gate-completion-recovery-20260822-09` 同样未批准、未创建 task root 或 attempt；独立 review 发现活动合同未调用真实 create validator、plan/snapshot 仅按解码文本比较、R20 历史未绑定完整原始字节，以及 generated namespace 大小写匹配与其余路径语义不一致。本候选只修复这些门禁合同，旧 snapshot 只读保留。
- 五个 Pages 并发文件/目录继续作为只读 protected inputs：`package.json`、三个测试文件与批准视觉候选目录。
- 本候选只恢复完整本地门禁，不编辑产品源、依赖、版本或 Pages 保护输入。

## 2. 目标与验收总则

1. 使用全新 S22-R21 no-replace attempt 从头执行完整 Worker 与 Pages 离线门禁，不续跑 R20。
2. baseline create 前验证所有 input set 展平后全局唯一；活动合同在 pending、approved、in_progress、completed 与 blocked 状态均合法。
3. Worker 语法、候选卫生、完整测试、大小与 diff 全绿；Pages 远程依赖静态扫描、lint、TypeScript、离线 E2E、build、release build、完整测试与 diff 全绿。
4. 两仓身份、秘密、机器路径、退役名称、版本/API/range、release manifest 与实际资产集合一致。
5. rollback 仅在声明的 Pages clone-local namespace 内运行既有只读重放测试；源仓 `.git/` 永久只读。
6. 五个 Pages 保护输入、批准视觉候选与所有 immutable inputs 终态不变；生成 namespace、端口、task temp 与测试 work 满足终态合同。
7. 成功仅形成 `LOCAL CANDIDATE / RELEASE HOLD`，不授权任何远程动作。

## 3. 执行策略与波次

执行策略为 `serial`。Worker/Pages 生成物、端口、task temp、rollback namespace、evidence、receipt 与 todo 共享状态，不并行。

```text
冻结历史：S22-R15 completed → S22-R16 completed → S22-R17 completed → S22-R18 blocked → S22-R19 blocked → S22-R20 blocked
活动候选：S22-R21 pending
```

| 波次 | Ready | 上限 | 编辑 / 验证并行 | 屏障 |
|---|---|---:|---|---|
| Wave 0 | S22-R21 | 1 | 否 / 否 | 候选批准、独立 build 调用、input 唯一性、prestate/request/baseline 全部通过 |

`work-products/todo.md` 仅由主代理写入；合法转换为 `pending → in_progress → completed | blocked`，checkbox 仅由显式状态派生。todo 只作为 Worker repository 的精确 exclusion。

## 4. 任务合同

### S22-R21 — 两仓最终本地门禁恢复完成

- 目标：在全新 attempt 中完成 Worker 2.0.0 / Pages 0.3.0 的完整本地发布门禁、证据审计与 rollback 重放。
- 范围：仅运行本地验证、重建声明的 Pages 生成物，并 create-new 写 R21 evidence/receipt；不修改产品源、测试、依赖、版本、保护输入、源仓 Git 元数据或远程状态。
- 依赖：R15—R17 completed receipts 与 R18—R20 blocked receipts/evidence/request 存在且作为 immutable inputs。
- 执行基线根：`work-products/debug/execution-baselines/S22-R21/`；唯一 attempt 为 `run-20260822-s22-r21-01`。
- 读取：蓝图 `input_sets`、`protected_input_sets` 与 `toolchain_profiles` 的精确资源。
- 写入：`work-products/evidence/section22/final-gate-completion-recovery-validation.md`、`work-products/evidence/section22/receipts/S22-R21.json`、`work-products/debug/execution-baselines/S22-R21/`。
- 生成输出：蓝图 `targets` 与 `generated_namespaces` 的精确集合。
- `orchestration_outputs`：`work-products/evidence/section22/receipts/S22-R21.json`。
- Request 排除：蓝图两仓 `repositories[].exclude` 的精确集合；不得 broad-exclude `work-products/`。
- 共享资源：两仓完整测试、Pages 生成物、4173/4174、task temp、baseline-tool work、rollback namespace、evidence、receipt 与 todo；主代理独占。
- 验收：跨 input-set 唯一性、逐条命令前 verify inputs/environment/protected/generated/target fingerprint、完整验证序列、terminal verify、evidence/receipt 独立审计、receipt create-new 回读、todo 原子完成全部通过。
- 聚焦验证：蓝图 `validation_sequence` 的完整串行序列。
- 波次与启动条件：Wave 0；批准快照原始字节一致、todo APPROVED、用户另行调用 `@uxu-code:build auto`；所有 no-replace/prestate、端口、环境、入口、路径身份与 input 唯一性检查通过。
- 编辑可并行：否。
- 聚焦验证可并行：否。
- 主代理集成责任：创建并回读 request/manifest、单写 todo、逐命令复验、汇总 evidence、terminal verify、预审计并 create-new 写 receipt。
- 失败/回滚：任一失败立即 RELEASE HOLD，写 blocked evidence/receipt，attempt 永久 consumed；不追加清理、不重试同一 ID、不执行远程动作。

## 5. 可执行 request 蓝图

<!-- S22_FINAL_GATE_COMPLETION_RECOVERY_REQUEST_BLUEPRINT -->
```json
{
  "schema_version": "s22-final-gate-completion-recovery-request-blueprints/v1",
  "request_schema": "s22-execution-baseline-request/v2",
  "runtime": {
    "node_version": "v20.19.2",
    "npm_version": "10.8.2",
    "chrome_channel": "Google Chrome",
    "chrome_version": "151.0.7922.173",
    "fallbacks_forbidden": [
      "npx",
      "install",
      "network"
    ]
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
    "directory_protected_inputs": [
      "pages:work-products/tests/fixtures/ui-review/section21-candidate"
    ],
    "target_only_resources": [
      "pages:release"
    ],
    "other_inputs": "regular file",
    "other_protected_inputs": "regular file",
    "toolchain_entrypoints": "regular file"
  },
  "input_sets": {
    "governance": [
      {
        "repository": "worker",
        "path": "work-products/SPEC.md"
      },
      {
        "repository": "worker",
        "path": "work-products/plan.md"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/approval-baselines/s22-account-usage-final-gate-completion-recovery-20260822-10/plan.md"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/approval-baselines/s22-account-usage-final-gate-completion-recovery-20260822-09/plan.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/blocked-r20-todo.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/r20-frozen-integrity.json"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/execution-baselines/S22-R20/request-run-20260822-s22-r20-01.json"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/s22-r20-active-todo-contract.md"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/s22-r20-duplicate-input-contract.md"
      },
      {
        "repository": "worker",
        "path": "work-products/scripts/execution-baseline.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/execution-baseline-tool.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/section22-final-gate-completion-plan-contract.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/section22-final-gate-completion-recovery-plan-contract.test.mjs"
      }
    ],
    "worker-validation": [
      {
        "repository": "worker",
        "path": "_worker.js"
      },
      {
        "repository": "worker",
        "path": "README.md"
      },
      {
        "repository": "worker",
        "path": "CHANGELOG.md"
      },
      {
        "repository": "worker",
        "path": "package.json"
      },
      {
        "repository": "worker",
        "path": "package-lock.json"
      },
      {
        "repository": "worker",
        "path": "scripts/check-worker-size.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/candidate-hygiene.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/cloudflare-usage-contract.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/structured-logging.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/worker-only-boundary.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/section21-rollback-drill.test.mjs"
      }
    ],
    "pages-runtime": [
      {
        "repository": "pages",
        "path": "package-lock.json"
      },
      {
        "repository": "pages",
        "path": "node_modules/.package-lock.json"
      },
      {
        "repository": "pages",
        "path": ".env"
      },
      {
        "repository": "pages",
        "path": ".env.local"
      },
      {
        "repository": "pages",
        "path": ".env.development"
      },
      {
        "repository": "pages",
        "path": ".env.development.local"
      },
      {
        "repository": "pages",
        "path": ".env.production"
      },
      {
        "repository": "pages",
        "path": ".env.production.local"
      }
    ],
    "pages-offline-suite": [
      {
        "repository": "pages",
        "path": "playwright.config.ts"
      },
      {
        "repository": "pages",
        "path": "work-products/tests/usage-ui.e2e.spec.ts"
      },
      {
        "repository": "pages",
        "path": "work-products/tests/offline-boundary.e2e.spec.ts"
      },
      {
        "repository": "pages",
        "path": "work-products/tests/offline-reject-proxy.mjs"
      }
    ],
    "prior-validation-evidence": [
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/receipts/S22-R15.json"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/receipts/S22-R16.json"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/receipts/S22-R17.json"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/receipts/S22-R18.json"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/receipts/S22-R19.json"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/receipts/S22-R20.json"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/worker-validation.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/pair-validation.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/final-gate-recovery-validation.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/final-gate-completion-validation.md"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/s22-r18-candidate-hygiene-enobufs.md"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/s22-r19-in-progress-mirror-contract.md"
      },
      {
        "repository": "pages",
        "path": "work-products/evidence/section22/pages-validation.md"
      }
    ]
  },
  "protected_input_sets": {
    "pages-four-plus-visual": [
      {
        "repository": "pages",
        "path": "package.json"
      },
      {
        "repository": "pages",
        "path": "work-products/tests/iptv-retirement-contract.test.mjs"
      },
      {
        "repository": "pages",
        "path": "work-products/tests/pages-deployment.test.mjs"
      },
      {
        "repository": "pages",
        "path": "work-products/tests/repository-test-isolation.test.mjs"
      },
      {
        "repository": "pages",
        "path": "work-products/tests/fixtures/ui-review/section21-candidate"
      }
    ]
  },
  "toolchain_profiles": {
    "two-repository-full": [
      {
        "repository": "worker",
        "path": "work-products/scripts/execution-baseline.mjs"
      },
      {
        "repository": "worker",
        "path": "scripts/check-worker-size.mjs"
      },
      {
        "repository": "pages",
        "path": "node_modules/@playwright/test/cli.js"
      },
      {
        "repository": "pages",
        "path": "node_modules/next/dist/bin/next"
      },
      {
        "repository": "pages",
        "path": "node_modules/esbuild/bin/esbuild"
      },
      {
        "repository": "pages",
        "path": "node_modules/eslint/bin/eslint.js"
      },
      {
        "repository": "pages",
        "path": "node_modules/typescript/bin/tsc"
      }
    ]
  },
  "environment_profiles": {
    "pages-offline": {
      "fixed": [
        {
          "key": "GIT_OPTIONAL_LOCKS",
          "state": "present",
          "sensitive": false,
          "value": "0"
        },
        {
          "key": "PORT",
          "state": "present",
          "sensitive": false,
          "value": "4173"
        },
        {
          "key": "NEXT_TELEMETRY_DISABLED",
          "state": "present",
          "sensitive": false,
          "value": "1"
        },
        {
          "key": "SECTION21_REVIEW_FIXTURE",
          "state": "present",
          "sensitive": false,
          "value": "0"
        },
        {
          "key": "UXUV_WRITE_VISUAL_CANDIDATE",
          "state": "present",
          "sensitive": false,
          "value": "0"
        }
      ],
      "task_temp_sha256": [
        "TEMP",
        "TMP",
        "TMPDIR"
      ],
      "absent": [
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "NO_PROXY"
      ],
      "preflight_absent_aliases": [
        "http_proxy",
        "https_proxy",
        "all_proxy",
        "no_proxy"
      ]
    }
  },
  "tasks": [
    {
      "task_id": "S22-R21",
      "owner": "native-worker:s22_r21",
      "no_replace": true,
      "predecessor": null,
      "wave": 0,
      "attempt_id": "run-20260822-s22-r21-01",
      "attempt_root": "work-products/debug/execution-baselines/S22-R21/run-20260822-s22-r21-01",
      "request_path": "work-products/debug/execution-baselines/S22-R21/request-run-20260822-s22-r21-01.json",
      "repositories": [
        {
          "id": "worker",
          "root": ".",
          "exclude": [
            "work-products/todo.md",
            "work-products/evidence/section22/final-gate-completion-recovery-validation.md",
            "work-products/evidence/section22/receipts/S22-R21.json",
            "work-products/debug/execution-baselines/S22-R21",
            "work-products/debug/execution-baselines/S22-R21/run-20260822-s22-r21-01",
            "work-products/tests/work/execution-baseline-tool",
            "work-products/tests/work/section22-r21-temp"
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
        {
          "repository": "worker",
          "path": "work-products/evidence/section22/final-gate-completion-recovery-validation.md"
        },
        {
          "repository": "worker",
          "path": "work-products/tests/work/execution-baseline-tool"
        },
        {
          "repository": "worker",
          "path": "work-products/tests/work/section22-r21-temp"
        },
        {
          "repository": "pages",
          "path": ".next"
        },
        {
          "repository": "pages",
          "path": "out"
        },
        {
          "repository": "pages",
          "path": "release"
        },
        {
          "repository": "pages",
          "path": "tsconfig.tsbuildinfo"
        },
        {
          "repository": "pages",
          "path": "work-products/tests/artifacts/playwright"
        },
        {
          "repository": "pages",
          "path": "work-products/tests/work/kvideo-webview-compatibility"
        },
        {
          "repository": "pages",
          "path": "work-products/tests/work/pwa-release"
        },
        {
          "repository": "pages",
          "path": "work-products/tests/work/release-manifest"
        },
        {
          "repository": "pages",
          "path": "work-products/tests/work/section21-candidate-draft"
        }
      ],
      "input_sets": [
        "governance",
        "worker-validation",
        "pages-runtime",
        "pages-offline-suite",
        "prior-validation-evidence"
      ],
      "protected_input_set": "pages-four-plus-visual",
      "orchestration_outputs": [
        {
          "repository": "worker",
          "path": "work-products/evidence/section22/receipts/S22-R21.json"
        }
      ],
      "toolchain_profile": "two-repository-full",
      "environment_profile": "pages-offline",
      "task_temp": {
        "repository": "worker",
        "path": "work-products/tests/work/section22-r21-temp"
      },
      "generated_namespaces": [
        {
          "repository": "pages",
          "parent": "work-products/tests/work",
          "prefix": "section21-rb-",
          "initial": "none",
          "terminal": "none"
        }
      ],
      "prestate": {
        "initial_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R21",
          "worker:work-products/debug/execution-baselines/S22-R21/run-20260822-s22-r21-01",
          "worker:work-products/evidence/section22/final-gate-completion-recovery-validation.md",
          "worker:work-products/evidence/section22/receipts/S22-R21.json",
          "worker:work-products/tests/work/execution-baseline-tool",
          "worker:work-products/tests/work/section22-r21-temp",
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
          "worker:work-products/debug/execution-baselines/S22-R21/run-20260822-s22-r21-01",
          "worker:work-products/evidence/section22/final-gate-completion-recovery-validation.md",
          "worker:work-products/evidence/section22/receipts/S22-R21.json",
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
          "worker:work-products/debug/execution-baselines/S22-R21/request-run-20260822-s22-r21-01.json"
        ],
        "create_must_be_empty_directories": [
          "worker:work-products/tests/work/section22-r21-temp"
        ],
        "preflight_namespaces_must_be_empty": [
          {
            "repository": "pages",
            "parent": "release",
            "prefix": ".tmp-current-"
          },
          {
            "repository": "pages",
            "parent": "release",
            "prefix": ".previous-current-"
          }
        ],
        "ports_must_be_free": [
          4173,
          4174
        ],
        "generated_namespace_matches": [],
        "paths_must_not_be_reparse_points": "all declared roots, resources, parents, and generated namespace anchors"
      },
      "validation_sequence": [
        "Worker node --test work-products/tests/section22-final-gate-completion-recovery-plan-contract.test.mjs",
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

## 6. 基线、审计与失败规则

- Repository 映射只允许 Worker `.` 与 Pages `../UXUV-Pages`；所有路径 canonical、repository-relative、无 glob、无 alias/reparse/祖先重叠。
- approval snapshot、旧 plan、blocked todo、requests、receipts、evidence、debug notes 与保护输入均为 immutable inputs。
- 创建顺序：批准双门 → input 跨集合唯一性 → initial prestate → task root/temp/request → baseline create → manifest 自审计 → verify prewrite → todo in_progress → verify inputs → 动态复验 → 首条命令。
- 每条命令前复验 immutable inputs、环境、保护输入、generated namespace 与 target fingerprint；`GIT_OPTIONAL_LOCKS=0`。
- 成功：最终 evidence → 独立审计 → terminal verify → receipt 待写字节预审计 → create-new receipt → 原始字节回读 → todo completed。
- 失败：停止下游 → blocked evidence → terminal verify（manifest 未创建时明确记为 unavailable）→ blocked receipt → todo blocked；attempt consumed。
- 过程文件仅位于 `work-products/`，测试文件仅位于 `work-products/tests/`，测试引用使用仓库相对路径。

## 7. 批准边界

- 候选批准快照：`work-products/debug/approval-baselines/s22-account-usage-final-gate-completion-recovery-20260822-10/plan.md`。
- 当前 todo 只能记录 PENDING；本次 `@uxu-code:plan` 不构成批准。
- 清晰批准只允许原子记录 APPROVED；只有批准后用户另行调用 `@uxu-code:build auto` 才执行 S22-R21。
- 任何批准或 build 均不授权 commit、push、部署、联网或 Cloudflare/D1 远程变更。
