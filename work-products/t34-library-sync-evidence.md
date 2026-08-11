# T34 收藏与历史同步证据

状态：**本地实现与验证完成**；未连接或修改真实 D1，未执行 commit、push 或部署。

## 实现结果

- 普通/Premium 收藏与历史继续复用账户独立的 library 文档，本地写入即时生效，远端通过 T32 的同源 `If-Match` CAS 收敛。
- 收藏与历史使用 `standard:` / `premium:` 物理 ID 前缀和显式 `mode`；双 context 冲突后两个模式仍只渲染和修改自身记录。
- 30 天 tombstone 改为默认压住旧设备的晚到记录；只有本地已见过该 tombstone 后的显式重建才携带 `recreatedAt` 并恢复，避免旧设备离线进度复活远端删除。
- 历史仍保持 5 秒本地写节流、60 秒远端同步延迟和同标题去重；虚拟时钟证明离线进度先进入 dirty，再在恢复后按新版本重试。
- library payload 新增 schema 证据，允许合法前向字段，拒绝非法 ID、负时间戳和跨文档 tombstone collection。
- 全量门禁暴露了既有设置导入模态的焦点抖动：不稳定内联 `onClose` 会在同步重渲染时重装 autofocus effect；改为最新回调 ref 后，焦点 trap 只在模态挂载时安装一次。

## RED / GREEN

- RED 5/6：远端 tombstone 会被旧设备时间戳更晚的历史进度覆盖，导致已删除记录复活。
- GREEN：同步纯函数 7/7；旧设备晚到写入被 tombstone 压住，已见删除后的显式重建仍可恢复。
- 定向浏览器 E2E 2/2：普通/Premium 收藏覆盖 offline、quota、409 和恢复；历史覆盖远端删除、旧上下文离线进度、409 和防复活。
- 焦点门禁复现为 2/3，最小修复后连续 5/5，随后完整浏览器门禁全绿。

## 最终本地门禁

- UXUV-Pages：`npm test` 125/125；`npx playwright test` 98/98；焦点重复 5/5；`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` 通过。
- UXUVideo：`npm test` 85/85；`node --check _worker.js`、`npm run check:size`、`git diff --check` 通过；Worker gzip 37,064 / 3,145,728 bytes。
- 两仓高置信 AWS access key、GitHub token、OpenAI 风格 key 与私钥头扫描无匹配。

## 验收映射

- PWA-010、PWA-014 转为 `pass`；PWA-011 至 PWA-013 保持 `pass`。
- FAV-007/FAV-009、HIS-010/HIS-011、PRE-012 的跨设备与普通/Premium 隔离证据闭合。
- T35 仅负责按 KVideo 视觉聚合账户权限和所有文档类型的同步状态，不再改变 T32-T34 数据语义。
