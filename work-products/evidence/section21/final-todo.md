# SPEC 第 21 节执行状态账本

状态：**LOCAL PLAN COMPLETE / VISUAL APPROVED / RELEASE HOLD**

- 绑定计划：`work-products/plan.md`
- 内部计划漂移检测：由机器证据处理，不作为人工审批门
- 计划模式：`fast = false`
- 安全并发上限：`1`
- 唯一写入者：主代理
- 当前批准：用户于 2026-08-19 明确批准当前及后续计划；人工审批只使用候选标签与可见预览
- 替代关系：T08 attempt 1 已归档且 attempt 2 完成；T09 attempt 1 在业务写入前发现弹幕唯一入口/Premium 验证边界遗漏并归档；T10 attempt 1 在业务写入前发现 Premium 聚合目标与旧活动测试所有权冲突并归档；T11 attempt 1 在业务写入前发现 `MediaPlayer` 数据通路写集遗漏并归档；T13 attempt 1 的材质写入已保留并由 attempt 2 完成；T14 attempt 1 在业务写入前发现 fresh release 验证顺序与退休字段导入提示遗漏并归档；T14 attempt 2 的文档、导入提示、fresh release 与回滚证据写入已归档并由 attempt 3 接管；T15 attempt 1 的全量 E2E 在 117/122 暴露四项旧测试合同、两项真实布局遮挡、API 1 视觉 fixture 与成功性能 trace 缺口，已归档并由 attempt 2 精确接管；T15 attempt 2 的测试、API 2 候选与性能 trace 写入已归档并由 attempt 3 接管；T15 attempt 3 已修复播放器 sticky 顶栏纵向遮挡，但在 200% 文本缩放门发现播放器动作区、主题控件与历史浮动按钮产生 38 px 横向溢出，已归档并由 attempt 4 精确接管；T15 attempt 4 已闭合该 reflow，但内置浏览器在 320 px 测得历史浮动按钮与跳过设置入口相交 1900 px²，已归档并由 attempt 5 精确接管；T15 attempt 5 已闭合该碰撞，但正式全量 `123/124` 暴露标签管理旧绝对坐标断言未同步首页浮层避让，已归档并由 attempt 6 以 test-only 基线同步接管；attempt 6 已达成 `124/124`、fresh release 与候选冻结，但最终视觉抽检同时发现 320 px 历史浮动按钮与第三个可见标签相交 `252 px²`、英文移动播放器标题/控制区内部裁切，以及繁中播放器候选被滚动恢复竞态截走顶栏，现已归档并由 attempt 7 精确接管；attempt 7 已闭合三项视觉 blocker、达到正式 E2E `124/124` 并生成 fresh 性能 trace，但 Codex 内置浏览器在 320 px 经典滚动条下测得第二标签右侧 11 px 进入横向裁剪区，已归档并由 attempt 8 精确接管；attempt 8 已闭合经典滚动条边界并再次达到 `124/124`，但最终视觉抽检拒绝 320 px 搜索结果卡与两侧浮钮、1024 px 播放器来源卡与历史浮钮的交互遮挡，现已归档并由 attempt 9 精确接管；attempt 9 的 116 图批准仅保留为历史记录，后续产品、依赖、构建与测试字节变化使其不再覆盖当前候选；用户已固定 `esbuild@0.28.2` 并授权 attempt 10 重新生成收据；attempt 10 的 121 图候选已获得用户视觉批准；attempt 10 的收据与视觉批准已按原字节归档，review/debug 的产品与证据合同变更由 attempt 11 接管；既有修订均不失效 T01—T14
- attempt 11 最终处置：自动化与稳定性证据仅作为历史事实保留；用户因未达到 iOS 27 Liquid Glass 视觉要求而明确拒绝，不能再转为批准或被新生成器覆盖
- attempt 12 最终处置：材质修复与自动化作为历史事实保留；内部预呈交复核发现同步状态遮挡设置页返回入口和标题，该候选未呈交用户并已归档
- attempt 13 最终处置：用户视觉批准作为不可变历史事实保留；ship 门禁中的常规 E2E 覆盖了活动候选截图，且后续 Worker 生命周期与配对回滚证据已修复，因此批准不再覆盖当前字节，失效链已归档
- 当前执行：`S21-T15` attempt 14 `completed`；视觉候选 14 已获用户批准，本地计划完成，发布保持 HOLD

## 状态合同

允许状态为 `pending`、`in_progress`、`blocked`、`failed`、`completed`。每个任务的显式 `state` 是权威值；checkbox 是同一次原子更新产生的派生镜像，只有 `completed` 可勾选。依赖、写集、串行屏障、回滚与解锁条件只引用绑定计划第 2、4、7、8 节，不在本账本复制。当前计划已批准且计划字节不可变；任务仍只可由已调用的实现流程按依赖串行启动。

## Serial 0

- [x] `S21-T01`｜state: `completed`｜deps: `none`｜修复基线身份并重新冻结跨仓合同

## Serial 1

- [x] `S21-T02`｜state: `completed`｜deps: `S21-T01`｜Worker 根路由合同复验

## Serial 2

- [x] `S21-T06`｜state: `completed`｜deps: `S21-T01`｜Liquid Glass 基础材质与可访问性降级复验

## Serial 3

- [x] `S21-T03`｜state: `completed`｜deps: `S21-T02`｜Worker 来源所有权与 IPTV 后端退役

## Serial 4

- [x] `S21-T05`｜state: `completed`｜deps: `S21-T02,S21-T06`｜Pages 根入口、角落状态与窗口生命周期

## Serial 5

- [x] `S21-T04`｜state: `completed`｜deps: `S21-T03`｜Worker 单来源 8 秒放弃与局部成功

## Serial 6

- [x] `S21-T07`｜state: `completed`｜deps: `S21-T05,S21-T06`｜搜索合并、卡片动作与折叠工具栏

## Serial 7

- [x] `S21-T08`｜state: `completed`｜deps: `S21-T03,S21-T05,S21-T06`｜Pages 系统默认与 IPTV 运行表面退役

## Serial 8

- [x] `S21-T09`｜state: `completed`｜deps: `S21-T08`｜统一视频源与用户弹幕 API 管理

## Serial 9

- [x] `S21-T10`｜state: `completed`｜deps: `S21-T09`｜设置页六域信息架构与响应式控件

## Serial 10

- [x] `S21-T11`｜state: `completed`｜deps: `S21-T10`｜逐视频片头片尾规则与同步迁移

## Serial 11

- [x] `S21-T12`｜state: `completed`｜deps: `S21-T05,S21-T06,S21-T11`｜播放器影院布局、顶栏与网页全视窗

## Serial 12

- [x] `S21-T13`｜state: `completed`｜deps: `S21-T07,S21-T10,S21-T12`｜其余页面与弹层材质收敛

## Serial 13

- [x] `S21-T14`｜state: `completed`｜deps: `S21-T04,S21-T08,S21-T13`｜README、版本与双仓发布合同同步

## Serial 14

- [x] `S21-T15`｜state: `completed`｜deps: `S21-T14`｜attempt 13 批准已按原字节归档但不覆盖当前候选；视觉候选 14 已获用户批准，本地计划完成，发布保持 HOLD

## 审批与远程边界

持续计划批准已生效，并通过既有 `@uxu-code:build auto` 与当前 `@uxu-code:debug` 调用完成本地串行修复。机器证据只在后台完成完整性绑定；人工视觉审批只展示候选标签与代表预览。用户已确认批准视觉候选 14，本地计划完成，发布保持 HOLD；该视觉批准不授权 commit、push、PR、GitHub Pages 发布、Cloudflare 部署、D1/Secret 变更或生产结论。
