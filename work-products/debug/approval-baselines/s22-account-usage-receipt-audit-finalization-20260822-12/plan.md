# 第九恢复计划：SPEC 第 22 节 receipt 终态收口

> 候选 ID：`s22-account-usage-receipt-audit-finalization-20260822-12`
> 状态：PLAN CANDIDATE / PENDING APPROVAL / RELEASE HOLD
> `fast requested: false`
> 执行策略：`serial`
> 安全并发上限：1

## 1. 目标与依据

- 权威规格仍为 `work-products/SPEC.md` 第 22 节，无产品需求歧义，不新建 specification。
- R21 已完成并冻结 Worker 237/237、Pages E2E 128/128、Pages Node 173/173、两仓 build/size/diff/卫生；其后置 route wrapper 失败，attempt consumed。
- R22 已完成并冻结经测试终审、两仓 diff、卫生 10/10、rollback 1/1、evidence 与 terminal verify；其 receipt 文件实际为 canonical 4,429 bytes，但首次 PowerShell 宿主输出回读附加换行并非零退出，attempt consumed。
- `work-products/evidence/section22/r22-frozen-integrity.json` 绑定 R22 的 plan/todo/request/manifest/evidence/receipt/诊断原始字节，不得覆盖或复用。
- `work-products/scripts/section22-receipt-audit.mjs` 使用原始 Buffer 校验 UTF-8/LF、预期长度与摘要、语义身份和 evidence 绑定；对应回归 3/3 GREEN。

## 2. 成功标准

1. 使用全新 `S22-R23` / `run-20260822-s22-r23-01` v2 no-replace baseline，冻结当前两仓 inventory、R21/R22 证据链与七个保护输入。
2. R22 frozen-integrity、retained R22 receipt byte-safe CLI、receipt audit 3/3 与当前 final-gate audit 全绿。
3. candidate hygiene 10/10、两仓 `git diff --check`、Pages `release/current` 身份和 task temp 终态全绿。
4. R23 evidence 独立审计并通过 final terminal verify。
5. R23 receipt 先预序列化得到内部 expected bytes/digest，create-new 后由受测试脚本按原始 Buffer 验证完全一致并绑定 evidence。
6. todo 原子完成后形成 `LOCAL CANDIDATE / RELEASE HOLD`；本计划不授权 commit、push、部署、联网或远程变更。

## 3. 波次

```text
Wave 0：S22-R23 pending
```

| 波次 | Ready | 上限 | 编辑 / 验证并行 | 屏障 |
|---|---|---:|---|---|
| Wave 0 | S22-R23 | 1 | 否 / 否 | 候选批准、独立 build 调用、prestate/request/baseline 全部通过 |

`work-products/todo.md` 仅由主代理写入；合法转换为 `pending → in_progress → completed | blocked`，checkbox 仅由显式状态派生。todo 只作为 Worker repository 的精确 exclusion。

## 4. 任务合同

### S22-R23 — 冻结验证链的 byte-safe receipt 收口

- 目标：不重跑完整产品门禁，在新 attempt 内重验冻结链、当前终审与 byte-safe receipt，形成可进入 review/ship 的本地候选。
- 范围：只读验证两仓与冻结证据，create-new 写 R23 baseline/evidence/receipt/task temp；不修改产品源、测试、依赖、版本、保护输入、Pages release、Git 元数据或远程状态。
- 依赖：R21/R22 frozen-integrity 完整；receipt audit RED→GREEN 3/3。
- 执行基线根：`work-products/debug/execution-baselines/S22-R23/`；唯一 attempt 为 `run-20260822-s22-r23-01`。
- 写入：`work-products/evidence/section22/final-receipt-audit-recovery-validation.md`、`work-products/evidence/section22/receipts/S22-R23.json`、R23 baseline 与空 task temp。
- 验收：批准双门、真实 v2 validator、逐命令 baseline verify、完整验证序列、terminal、受测试 receipt raw-byte audit、create-new 回读与 todo 原子完成。
- 失败/回滚：任一失败立即 RELEASE HOLD，写 blocked evidence/receipt，attempt 永久 consumed；不追加清理、不重试同一 ID、不执行远程动作。

## 5. 可执行 request 蓝图

<!-- S22_RECEIPT_AUDIT_FINALIZATION_REQUEST_BLUEPRINT -->
```json
{
  "schema_version": "s22-receipt-audit-finalization-request-blueprints/v1",
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
    "governance-and-frozen-chain": [
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
        "path": "work-products/debug/approval-baselines/s22-account-usage-receipt-audit-finalization-20260822-12/plan.md"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/approval-baselines/s22-account-usage-final-gate-audit-recovery-20260822-11/plan.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/blocked-r22-todo.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/r21-frozen-integrity.json"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/r22-frozen-integrity.json"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/execution-baselines/S22-R22/request-run-20260822-s22-r22-01.json"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/execution-baselines/S22-R22/run-20260822-s22-r22-01/manifest.json"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/execution-baselines/S22-R22/run-20260822-s22-r22-01/manifest.sha256"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/final-gate-audit-recovery-validation.md"
      },
      {
        "repository": "worker",
        "path": "work-products/evidence/section22/receipts/S22-R22.json"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/execution-baselines/S22-R22/receipt-readback-output-normalization.md"
      },
      {
        "repository": "worker",
        "path": "work-products/debug/s22-r22-receipt-readback-contract.md"
      }
    ],
    "validated-tools-and-contracts": [
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
        "path": "work-products/scripts/section22-receipt-audit.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/section22-receipt-readback-audit.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/section22-final-gate-audit-recovery-plan-contract.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/section22-receipt-audit-finalization-plan-contract.test.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/tests/candidate-hygiene.test.mjs"
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
    "local-finalization": [
      {
        "repository": "worker",
        "path": "work-products/scripts/execution-baseline.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/scripts/section22-final-gate-audit.mjs"
      },
      {
        "repository": "worker",
        "path": "work-products/scripts/section22-receipt-audit.mjs"
      }
    ]
  },
  "environment_profiles": {
    "offline-finalization": {
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
      "task_id": "S22-R23",
      "owner": "native-worker:s22_r23",
      "no_replace": true,
      "predecessor": null,
      "wave": 0,
      "attempt_id": "run-20260822-s22-r23-01",
      "attempt_root": "work-products/debug/execution-baselines/S22-R23/run-20260822-s22-r23-01",
      "request_path": "work-products/debug/execution-baselines/S22-R23/request-run-20260822-s22-r23-01.json",
      "repositories": [
        {
          "id": "worker",
          "root": ".",
          "exclude": [
            "work-products/todo.md",
            "work-products/evidence/section22/final-receipt-audit-recovery-validation.md",
            "work-products/evidence/section22/receipts/S22-R23.json",
            "work-products/debug/execution-baselines/S22-R23",
            "work-products/debug/execution-baselines/S22-R23/run-20260822-s22-r23-01",
            "work-products/tests/work/section22-r23-temp"
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
          "path": "work-products/evidence/section22/final-receipt-audit-recovery-validation.md"
        },
        {
          "repository": "worker",
          "path": "work-products/tests/work/section22-r23-temp"
        }
      ],
      "input_sets": [
        "governance-and-frozen-chain",
        "validated-tools-and-contracts"
      ],
      "protected_input_set": "release-candidate-protected",
      "orchestration_outputs": [
        {
          "repository": "worker",
          "path": "work-products/evidence/section22/receipts/S22-R23.json"
        }
      ],
      "toolchain_profile": "local-finalization",
      "environment_profile": "offline-finalization",
      "task_temp": {
        "repository": "worker",
        "path": "work-products/tests/work/section22-r23-temp"
      },
      "generated_namespaces": [],
      "prestate": {
        "initial_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R23",
          "worker:work-products/debug/execution-baselines/S22-R23/run-20260822-s22-r23-01",
          "worker:work-products/evidence/section22/final-receipt-audit-recovery-validation.md",
          "worker:work-products/evidence/section22/receipts/S22-R23.json",
          "worker:work-products/tests/work/section22-r23-temp"
        ],
        "create_must_be_missing": [
          "worker:work-products/debug/execution-baselines/S22-R23/run-20260822-s22-r23-01",
          "worker:work-products/evidence/section22/final-receipt-audit-recovery-validation.md",
          "worker:work-products/evidence/section22/receipts/S22-R23.json"
        ],
        "create_must_be_regular_files": [
          "worker:work-products/debug/execution-baselines/S22-R23/request-run-20260822-s22-r23-01.json"
        ],
        "create_must_be_empty_directories": [
          "worker:work-products/tests/work/section22-r23-temp"
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
          },
          {
            "repository": "pages",
            "parent": "work-products/tests/work",
            "prefix": "section21-rb-"
          }
        ],
        "ports_must_be_free": [],
        "paths_must_not_be_reparse_points": "all declared roots, resources, parents, and namespace anchors"
      },
      "validation_sequence": [
        "Worker node --test work-products/tests/section22-receipt-audit-finalization-plan-contract.test.mjs",
        "Worker node --test work-products/tests/section22-receipt-readback-audit.test.mjs",
        "Worker retained R22 receipt audit CLI with frozen expected bytes and digest",
        "Worker node --test work-products/tests/section22-final-gate-audit.test.mjs",
        "Worker node work-products/scripts/section22-final-gate-audit.mjs --task-temp work-products/tests/work/section22-r23-temp",
        "Worker node --test work-products/tests/candidate-hygiene.test.mjs",
        "Worker git diff --check",
        "Pages git diff --check",
        "main-agent evidence audit and terminal verify",
        "R23 receipt create-new and tested raw-byte audit with pre-serialized expected identity"
      ],
      "terminal_invariants": [
        "verify terminal GREEN",
        "R21 and R22 frozen-integrity GREEN",
        "task temp empty",
        "release staging rollback and backup namespaces absent",
        "release/current and seven protected inputs unchanged",
        "two repository inventories unchanged",
        "R23 receipt raw bytes and evidence binding IDENTICAL",
        "LOCAL CANDIDATE / RELEASE HOLD"
      ]
    }
  ]
}
```

## 6. 执行与失败合同

- 创建顺序：批准 snapshot 原始字节一致 → todo APPROVED → 用户独立调用 `@uxu-code:build auto` → initial prestate → request/temp → baseline create/prewrite → todo in_progress。
- 每条命令前复验 immutable inputs、环境、保护输入与 target fingerprint；`GIT_OPTIONAL_LOCKS=0`。
- receipt 顺序：构造 canonical UTF-8 + 单 LF bytes → 计算内部 expected bytes/digest → 预审计 JSON → create-new → 受测试 CLI 用原始 Buffer 对 expected identity、语义与 evidence 绑定一起验证。
- 成功：todo completed；失败：todo blocked、attempt consumed、保留现场，不重试同一 ID。
- 过程文件仅位于 `work-products/`，测试文件仅位于 `work-products/tests/`，测试引用使用仓库相对路径。

## 7. 批准门

- 候选计划：`work-products/plan.md`。
- create-new/no-replace 批准快照：`work-products/debug/approval-baselines/s22-account-usage-receipt-audit-finalization-20260822-12/plan.md`。
- 批准必须绑定当前候选与上述路径，只把 todo 更新为 APPROVED；执行仍需用户另行调用 `@uxu-code:build auto`。
- 批准与 build 均不授权 commit、push、部署、联网或远程变更。
