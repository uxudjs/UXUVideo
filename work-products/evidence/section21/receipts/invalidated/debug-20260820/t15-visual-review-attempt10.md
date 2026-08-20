# S21-T15 attempt 10 视觉候选审查

- 计划 SHA-256：`c06f97d5bf33c44455c1541f06801d6258b50acf4487bd04f45e43475d04dd30`
- 候选身份：Worker `2.0.0` / Pages `0.3.0` / API `2`
- 构建依赖：`esbuild@0.28.2`（package 与 lock 一致）
- 候选：121 张，18,471,671 bytes，combined SHA-256 `ba392ff93e963f2190dc91d03be4d3fff02dc9c5b36f2f828a793ba22fff6167`
- 自动化：Pages E2E `125/125`、Node `163/163 + 9/9`、性能与三阶段回滚 GREEN
- 视觉批准状态：`APPROVED`

## 覆盖矩阵

主矩阵为 9 个 surface × 3 个 locale × 4 个宽度，共 108 张；另有 13 张状态候选。

| Surface | zh-CN | zh-TW | en | 宽度 | 自动状态 | 人工视觉状态 |
| --- | --- | --- | --- | --- | --- | --- |
| home | ✓ | ✓ | ✓ | 320/768/1024/1440 | GREEN | APPROVED |
| favorites | ✓ | ✓ | ✓ | 320/768/1024/1440 | GREEN | APPROVED |
| premium | ✓ | ✓ | ✓ | 320/768/1024/1440 | GREEN | APPROVED |
| premium-favorites | ✓ | ✓ | ✓ | 320/768/1024/1440 | GREEN | APPROVED |
| premium-settings | ✓ | ✓ | ✓ | 320/768/1024/1440 | GREEN | APPROVED |
| settings | ✓ | ✓ | ✓ | 320/768/1024/1440 | GREEN | APPROVED |
| not-found | ✓ | ✓ | ✓ | 320/768/1024/1440 | GREEN | APPROVED |
| search-ready | ✓ | ✓ | ✓ | 320/768/1024/1440 | GREEN | APPROVED |
| player-ready | ✓ | ✓ | ✓ | 320/768/1024/1440 | GREEN | APPROVED |

状态候选：light、contrast-more、forced-colors、reduced-transparency、200% 文本、三语 setup-error，以及 synced/offline/quota/conflict/error 五种可见同步状态。

## 同步状态新增证据

- synced 行为门使用真实计时器证明约 3 秒后消失。
- offline、quota、conflict、error 行为门证明超过 3 秒仍持续可见。
- 五张状态图均执行视口内与浮动控件零重叠几何断言；覆盖 320/640@200%/768/1024/1440、三语与设置页。

## 代表截图

- [同步成功 zh-CN 1440](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/states-sync-synced-settings-zh-CN-1440.png)
- [离线 zh-TW 320](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/states-sync-offline-settings-zh-TW-320.png)
- [配额 en 768](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/states-sync-quota-settings-en-768.png)
- [冲突 zh-CN 1024](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/states-sync-conflict-settings-zh-CN-1024.png)
- [错误与 200% 文本 en 640](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/states-sync-error-text-200-settings-en-640.png)
- [搜索结果 en 320](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/routes-search-ready-en-320.png)
- [播放器 en 1024](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/routes-player-ready-en-1024.png)
- [普通设置 en 320](../../../../UXUV-Pages/work-products/tests/fixtures/ui-review/section21-candidate/routes-settings-en-320.png)

## 已知非阻断边界

- not-found 在三种 locale fixture 下均被捕获，但当前静态 404 文案为英文；本证据不宣称 404 文案已三语本地化。
- 1024 px 播放页的密集选集按钮仍可能以“第…”省略显示；来源、控制和交互边界完整。
- 320 px 英文设置的原生 select 文案较紧，但含义可辨、控件未越界。

## 用户决定

- decision：`APPROVED`
- decidedAt：`2026-08-20T16:36:56.2901054+08:00`
- exactApprovalText：`批准当前视觉候选 ba392ff93e963f2190dc91d03be4d3fff02dc9c5b36f2f828a793ba22fff6167`
- 本批准仅绑定上述 121 张候选及 combined SHA-256；后续任何产品、依赖、构建或截图字节变化均使其失效。
- 本视觉批准不授权 commit、push、deploy 或其他远程变更。
