# T33 配置、来源与订阅同步证据

状态：**本地实现与验证完成**；未连接或修改真实 D1，未执行 commit、push 或部署。

## 实现结果

- 复核并保留现有本地即时写入链：账户偏好写入 config fields，普通/Premium 来源与订阅写入 config collections，再由 T32 的同源 `If-Match` CAS 队列远端收敛。
- config 远端文档验证补齐为与 Worker 相同的字段键、时间戳、record ID、collections 和 tombstone schema；未知但合法的字段和值原样保留。
- 普通与 Premium 来源继续使用明确 `group`，订阅继续使用明确 `mode`；账户文档仍使用编码账户 ID 的独立 localStorage 键。
- 来源和订阅均新增双浏览器上下文证据，覆盖本地先写、D1 不可用、quota、409 合并、恢复重试、未知字段保留和 Premium 数据不串写。
- 订阅删除使用 30 天 tombstone 合并语义；旧上下文恢复后不会复活已删订阅，已导入来源按既有产品合同保留。

## RED / GREEN

- RED 4/5：客户端只检查顶层 payload 形状，未拒绝非法字段键、负时间戳、非法 record ID 和错误 collection tombstone。
- GREEN：`sync-client.test.mjs` 5/5；严格 schema 与 Worker 一致，合法未知字段仍可前向兼容。
- 定向浏览器 E2E 2/2：普通来源与订阅分别完成离线/quota/409/恢复；订阅场景额外证明 tombstone 防复活。
- 既有配置场景继续覆盖网络中断、D1 不可用、quota、非重试错误、人工/online 恢复和双 context 409。

## 最终本地门禁

- UXUV-Pages：`npm test` 123/123；`npx playwright test` 96/96；`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` 通过。
- UXUVideo：`npm test` 85/85；`node --check _worker.js`、`npm run check:size`、`git diff --check` 通过；Worker gzip 37,064 / 3,145,728 bytes。
- 两仓高置信 AWS access key、GitHub token、OpenAI 风格 key 与私钥头扫描无匹配。

## 验收映射

- PWA-007、PWA-008、PWA-009 转为 `pass`。
- SRC-003 的 Premium 来源展示与 SRC-021 的账户/模式隔离证据闭合；既有 SET/SRC CRUD、导入、订阅 ID 保持 `pass`。
- PWA-010、PWA-014 仍为 `unverified`，由 T34 的普通/Premium 收藏与历史双设备同步闭合。
