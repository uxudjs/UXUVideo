# T30 Premium 收藏、历史与本地物理隔离证据

状态：**本地实现与验证完成**；未执行 commit、push、Pages/Worker 部署、真实 Cloudflare/D1 变更或跨设备同步。

## 实现结果

- 普通与 Premium 收藏/历史使用显式且互斥的本地记录 ID；旧版无前缀记录仅归普通模式，Premium 必须显式标记。
- 收藏页、收藏侧边栏和历史侧边栏只读取、删除当前模式记录；Premium 卡片与续播链接保留 `premium=1`。
- 收藏容量保持 100 条，历史容量保持 50 条；本地修改仍复用现有账户同步文档，跨设备 Premium 同步留给 T34。
- 账户切换通过账户 ID 重挂载同步视图，清除上一账户内存态，同时保留各账户各自数据。
- 清空确认改为三语自定义对话框；Tab、方向键、Escape、焦点回归及嵌套确认均受焦点陷阱约束。

## RED / GREEN

- 初始 RED 0/5：缺少记录命名空间、焦点陷阱、账户视图重挂载、Premium 链接和自定义确认框。
- 浏览器回归首次暴露收藏侧边栏低于粘性导航的层级问题；提高侧边栏层级后指针操作恢复。
- 第二次浏览器回归暴露嵌套确认框未自动聚焦；为收藏/历史确认状态增加显式初始焦点与关闭后焦点恢复。
- GREEN：T30 合同/策略测试 5/5；Premium 资料库 E2E 3/3；相关收藏、历史及 Premium 资料库 E2E 6/6。

## 最终本地门禁

- UXUV-Pages：`npm test` 117/117；完整 Playwright 90/90；最终样式调整后相关 Playwright 6/6；`npm run lint`、`npx tsc --noEmit`、`git diff --check` 通过。
- UXUVideo：`npm test` 85/85；`node --check _worker.js`、`npm run check:size`、`git diff --check` 通过；Worker gzip 37,064 / 3,145,728 bytes。
- 视觉复核：320、768、1024、1440px Premium 收藏页截图均无横向溢出、标题异常换行、模态逃逸或导航遮挡。
- 高置信秘密扫描未发现 AWS access key、GitHub token、OpenAI 风格 key 或私钥头。

## 验收映射

- PRE-005、PRE-006、PRE-012 已转为 `pass`。
- 本任务只证明本地模式/账户隔离；跨设备同步载荷与冲突合并仍由 T34 验证。
