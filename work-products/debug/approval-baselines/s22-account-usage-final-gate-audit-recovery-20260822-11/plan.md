# 第八恢复计划：SPEC 第 22 节最终终审恢复

> 候选 ID：`s22-account-usage-final-gate-audit-recovery-20260822-11`
> 状态：PLAN CANDIDATE / PENDING APPROVAL / RELEASE HOLD
> `fast requested: false`
> 执行策略：`serial`
> 安全并发上限：1

## 1. 目标与依据

- 权威规格仍为 `work-products/SPEC.md` 第 22 节；产品接口、数据、安全、版本、兼容与 rollback 决策不变，无需新 specification。
- S22-R21 已在同一冻结 attempt 中通过 Worker 237/237、Pages E2E 128/128、Pages Node 173/173、两仓 build/size/diff 与两仓卫生 10/10。
- R21 随后的临时 PowerShell 终审把 route value `index.html` 误当成 assets property key，并把正常 Playwright transform cache 误作非法终态；该非零退出已使 R21 永久 consumed。
- `work-products/evidence/section22/r21-frozen-integrity.json` 绑定 R21 批准计划、blocked todo、request、manifest、evidence 与 receipt 的原始字节；不得修改或重跑 R21。
- RED→GREEN 修复位于 `work-products/scripts/section22-final-gate-audit.mjs` 与对应 3/3 测试。R22 只补齐缺失的终审、卫生、diff、rollback、terminal 与 receipt，不重复已冻结的完整产品门禁。

## 2. 成功标准

1. 使用全新 `S22-R22` / `run-20260822-s22-r22-01` v2 no-replace baseline，当前两仓 inventory、产品文件、Pages `release/current` 与保护输入在执行前后不变。
2. R21 frozen-integrity 逐文件原始字节复验通过，确认复用的是已完成完整产品门禁的同一现场。
3. 经测试的终审脚本验证 Worker `2.0.0`、Pages `0.3.0`、API `2`、Worker range、7 routes、72 assets、manifest/actual 精确一致、退役 Cloudflare 名称零命中与空 task temp。
4. candidate hygiene 10/10、两仓 `git diff --check` 与配对 rollback drill 通过；rollback namespace 终态为空。
5. evidence 与 receipt 独立审计、create-new 回读、baseline terminal verify 与 todo 原子完成全部通过。
6. 成功仅形成 `LOCAL CANDIDATE / RELEASE HOLD`；本计划不授权 commit、push、部署、联网或远程变更。

## 3. 波次

```text
Wave 0：S22-R22 pending
```

| 波次 | Ready | 上限 | 编辑 / 验证并行 | 屏障 |
|---|---|---:|---|---|
| Wave 0 | S22-R22 | 1 | 否 / 否 | 候选批准、独立 build 调用、prestate/request/baseline 全部通过 |

`work-products/todo.md` 仅由主代理写入；合法转换为 `pending → in_progress → completed | blocked`，checkbox 仅由显式状态派生。todo 只作为 Worker repository 的精确 exclusion。

## 4. 任务合同

### S22-R22 — 冻结产品现场的最终终审恢复

- 目标：基于 R21 已冻结的完整本地产品门禁，在新 attempt 中完成经测试的最终审计、rollback 与证据收口。
- 范围：只读验证两仓与 `release/current`，create-new 写 R22 baseline/evidence/receipt/task temp；不修改产品源、测试、依赖、版本、保护输入、Pages release、源仓 Git 元数据或远程状态。
- 依赖：R21 blocked evidence/receipt/request/manifest 与 frozen-integrity 完整存在；终审修复 3/3 GREEN。
- 执行基线根：`work-products/debug/execution-baselines/S22-R22/`；唯一 attempt 为 `run-20260822-s22-r22-01`。
- 读取：蓝图 `input_sets`、`protected_input_sets` 与 `toolchain_profiles` 的精确资源。
- 写入：`work-products/evidence/section22/final-gate-audit-recovery-validation.md`、`work-products/evidence/section22/receipts/S22-R22.json`、`work-products/debug/execution-baselines/S22-R22/` 与空 task temp。
- `orchestration_outputs`：`work-products/evidence/section22/receipts/S22-R22.json`。
- 验收：批准双门、R21 frozen-integrity、真实 v2 validator、逐命令 baseline verify、完整验证序列、terminal verify、evidence/receipt 审计与 todo 原子完成。
- 主代理集成责任：创建并回读 request/manifest、单写 todo、逐命令复验、汇总 evidence、terminal verify、预审计并 create-new 写 receipt。
- 失败/回滚：任一失败立即 RELEASE HOLD，写 blocked evidence/receipt，attempt 永久 consumed；不追加清理、不重试同一 ID、不执行远程动作。

## 5. 可执行 request 蓝图

<!-- S22_FINAL_GATE_AUDIT_RECOVERY_REQUEST_BLUEPRINT -->
```json
{
  "schema_version": "s22-final-gate-audit-recovery-request-blueprints/v1",
  "request_schema": "s22-execution-baseline-request/v2",
  "runtime": {
    "node_version": "v20.19.2",
    "npm_version": "10.8.2",
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
    "missing_inputs": [],
    "directory_protected_inputs": [
      "pages:work-products/tests/fixtures/ui-review/section21-candidate",
      "pages:release/current"
    ],
    "other_inputs": "regular file",
    "other_protected_inputs": "regular file",
    "toolchain_entrypoints": "regular file"
  },
  "input_sets": {
    "governance-and-r21-freeze": [
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
        "path": "work-products/debug/approval-baselines/s22-account-usage-final-gate-audit-recovery-20260822-11/plan.md"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/approval-baselines/s22-account-usage-final-gate-completion-recovery-20260822-10/plan.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/blocked-r21-todo.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/r21-frozen-integrity.json"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/execution-baselines/S22-R21/request-run-20260822-s22-r21-01.json"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/execution-baselines/S22-R21/run-20260822-s22-r21-01/manifest.json"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/execution-baselines/S22-R21/run-20260822-s22-r21-01/manifest.sha256"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/final-gate-completion-recovery-validation.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/receipts/S22-R21.json"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/s22-r21-post-scan-wrapper-contract.md"
      }
    ],
    "validated-toolchain-and-contracts": [
      {
        "repository": "worker",
        "path": "package.json"
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
        "path": "work-products/scripts/section22-final-gate-audit.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/section22-final-gate-audit.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/section22-final-gate-completion-recovery-plan-contract.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/section22-final-gate-audit-recovery-plan-contract.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/candidate-hygiene.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/section21-rollback-drill.test.mjs"
      }
    ],
    "rollback-evidence": [
      {
        "repository": "worker",
        "path": "work-products/evidence/section21/pair-rollback.json"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section21/release-runbook.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section21/worker-v1.reverse.patch"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section21/pages-v1.reverse.patch"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section21/worker-v2.forward.patch"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section21/pages-v2.forward.patch"
      }
    ]
  },
  "protected_input_sets": {
    "release-candidate-protected": [
      {
        "repository": "worker",
        "path": "_worker.js"
      },
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
      },
      {
        "repository": "pages",
        "path": "release/current"
      }
    ]
  },
  "toolchain_profiles": {
    "local-audit": [
      {
        "repository": "worker",
        "path": "work-products/scripts/execution-baseline.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/scripts/section22-final-gate-audit.mjs"
      }
    ]
  },
  "environment_profiles": {
    "offline-audit": {
      "fixed": [
        {
          "key": "GIT_OPTIONAL_LOCKS",
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
      "task_id": "S22-R22",
      "owner": "native-worker:s22_r22",
      "no_replace": true,
      "predecessor": null,
      "wave": 0,
      "attempt_id": "run-20260822-s22-r22-01",
      "attempt_root": "work-products/debug/execution-baselines/S22-R22/run-20260822-s22-r22-01",
      "request_path": "work-products/debug/execution-baselines/S22-R22/request-run-20260822-s22-r22-01.json",
      "repositories": [
        {
          "id": "worker",
          "root": ".",
          "exclude": [
            "work-products/todo.md",
            "work-products/evidence/section22/final-gate-audit-recovery-validation.md",
            "work-products/evidence/section22/receipts/S22-R22.json",
            "work-products/debug/execution-baselines/S22-R22",
            "work-products/debug/execution-baselines/S22-R22/run-20260822-s22-r22-01",
            "work-products/tests/work/section22-r22-temp"
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
          "path": "work-products/evidence/section22/final-gate-audit-recovery-validation.md"
        },
        {
          "repository": "worker",
          "path": "work-products/tests/work/section22-r22-temp"
        }
      ],
      "input_sets": [
        "governance-and-r21-freeze",
        "validated-toolchain-and-contracts",
        "rollback-evidence"
      ],
      "protected_input_set": "release-candidate-protected",
      "orchestration_outputs": [
        {
          "repository": "worker",
          "path": "work-products/evidence/section22/receipts/S22-R22.json"
        }
      ],
      "toolchain_profile": "local-audit",
      "environment_profile": "offline-audit",
      "task_temp": {
        "repository": "worker",
        "path": "work-products/tests/work/section22-r22-temp"
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
          "worker:work-products/debug/execution-baselines/S22-R22",
          "worker:work-products/debug/execution-baselines/S22-R22/run-20260822-s22-r22-01",
          "worker:work-products/evidence/section22/final-gate-audit-recovery-validation.md",
          "worker:work-products/evidence/section22/receipts/S22-R22.json",
          "worker:work-products/tests/work/section22-r22-temp"
        ],
        "create_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R22/run-20260822-s22-r22-01",
          "worker:work-products/evidence/section22/final-gate-audit-recovery-validation.md",
          "worker:work-products/evidence/section22/receipts/S22-R22.json"
        ],
        "create_must_be_regular_files": [
          "worker:work-products/debug/execution-baselines/S22-R22/request-run-20260822-s22-r22-01.json"
        ],
        "create_must_be_empty_directories": [
          "worker:work-products/tests/work/section22-r22-temp"
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
        "ports_must_be_free": [],
        "generated_namespace_matches": [],
        "paths_must_not_be_reparse_points": "all declared roots, resources, parents, and generated namespace anchors"
      },
      "validation_sequence": [
        "Worker node --test work-products/tests/section22-final-gate-audit-recovery-plan-contract.test.mjs",
        "Worker node --test work-products/tests/section22-final-gate-audit.test.mjs",
        "Worker node --test work-products/tests/candidate-hygiene.test.mjs",
        "Worker node work-products/scripts/section22-final-gate-audit.mjs --task-temp work-products/tests/work/section22-r22-temp",
        "Worker git diff --check",
        "Pages git diff --check",
        "Worker node --test work-products/tests/section21-rollback-drill.test.mjs",
        "Worker node work-products/scripts/section22-final-gate-audit.mjs --task-temp work-products/tests/work/section22-r22-temp",
        "main-agent evidence audit and pre-serialized receipt audit",
        "receipt create-new and byte-identical readback"
      ],
      "terminal_invariants": [
        "verify terminal GREEN",
        "R21 frozen-integrity GREEN",
        "task temp empty",
        "generated namespace terminal none",
        "release staging and backup absent",
        "release/current and seven protected inputs unchanged",
        "two repository inventories unchanged",
        "evidence and receipt independently audited",
        "receipt create-new after terminal",
        "LOCAL CANDIDATE / RELEASE HOLD"
      ]
    }
  ]
}
```

## 6. 执行与失败合同

- 创建顺序：候选批准快照原始字节一致 → todo APPROVED → 用户独立调用 `@uxu-code:build auto` → initial prestate → task root/temp/request → baseline create → manifest 自审计 → todo in_progress → 首条命令。
- 每条命令前复验 immutable inputs、环境、保护输入、generated namespace 与 target fingerprint；`GIT_OPTIONAL_LOCKS=0`。
- 成功：最终 evidence → 独立审计 → terminal verify → receipt 待写字节预审计 → create-new receipt → 原始字节回读 → todo completed。
- 失败：停止下游 → blocked evidence → terminal verify → blocked receipt → todo blocked；attempt consumed。
- 过程文件仅位于 `work-products/`，测试文件仅位于 `work-products/tests/`，测试引用使用仓库相对路径。

## 7. 批准门

- 候选计划：`work-products/plan.md`。
- create-new/no-replace 批准快照：`work-products/debug/approval-baselines/s22-account-usage-final-gate-audit-recovery-20260822-11/plan.md`。
- 批准必须绑定候选 ID 与上述两条路径；只把 todo 更新为 APPROVED。
- 执行还必须由用户另行调用 `@uxu-code:build auto`；批准和 build 均不授权 commit、push、部署、联网或远程变更。
