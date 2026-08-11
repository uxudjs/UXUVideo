# T32 文档无关本地优先同步基础证据

状态：**本地实现与验证完成**；未新增或迁移具体配置、来源、订阅、收藏、历史文档，未执行真实 D1 变更、commit、push 或部署。

## 实现结果

- 新增 payload 无关的纯同步状态机，统一处理服务器确认、并发本地编辑和 409 冲突；具体 payload 合并策略由调用方注入。
- SyncProvider 只编排本地持久化、远端拉取/推送、阶段和调度，不再内联 revision 分支。
- `Retry-After` 在进入浏览器计时器前限制为 1 秒至 5 分钟，无效值回退 60 秒，避免溢出重试。
- 账户 localStorage 键继续使用编码后的账户 ID；本地变更先持久化为 dirty，再进行同源 `If-Match` CAS。
- 同步设置从只查看 config 改为聚合全部文档；loading/synced/pending/conflict/offline/quota/error 及重试按钮支持简体、繁体和英文。
- 本次重构产生的旧 `acceptedRemoteDocument` 孤儿已移除。

## RED / GREEN

- RED 0/3：缺少文档无关状态机、无限幅重试延迟、Provider 泛化委托与三语聚合状态。
- GREEN：同步基础/合并纯函数 7/7；payload 使用任意 `{ value }` fixture 证明状态机不依赖 config/library 结构。
- 定向浏览器 E2E 5/5：网络中断恢复、D1 不可用恢复、quota、非重试错误和双浏览器 409 收敛。
- 409 场景保留更新较新的本地值，按服务器新版本重试一次后收敛；错误场景均保留 localStorage dirty 数据。

## 最终本地门禁

- UXUV-Pages：`npm test` 122/122；`npx playwright test` 94/94；`npm run lint`、`npx tsc --noEmit`、生产构建与 `git diff --check` 通过。
- UXUVideo：`npm test` 85/85；`node --check _worker.js`、`npm run check:size`、`git diff --check` 通过；Worker gzip 37,064 / 3,145,728 bytes。
- 高置信秘密扫描无匹配。

## 验收映射

- PWA-011、PWA-012、PWA-013 转为 `pass`。
- PWA-007 至 PWA-010 仍为 `unverified`；配置/来源/订阅由 T33，普通/Premium 收藏与历史由 T34 逐类闭合。
