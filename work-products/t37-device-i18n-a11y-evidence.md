# T37 TV、WebView、三语与 WCAG 汇总证据

结论：**本地证据汇总完成，未新增产品行为**。现有垂直切片已经覆盖计划要求的响应式、键盘/遥控、本地化与 WCAG 边界；真实 TV、Android WebView 83 和物理设备仍不在本地声明范围。

## 响应式与输入方式

- `accessibility.e2e.spec.ts` 对 8 个静态入口逐一运行 320、768、1024、1440 四断点，共 32 个 viewport/AA 组合；均无横向溢出、严重/关键 axe 违规、控制台错误或跨源请求。
- 首页、搜索、收藏、历史、设置、Premium、IPTV 和播放器各自的切片 E2E 继续验证响应式布局、焦点和可操作状态。
- 320px 播放器验证触摸双击、控制栏与设备入口；768px 验证非窄屏输入布局；桌面验证键盘快捷键、Tab、范围控件和同源媒体边界。

## TV 与遥控

- `TVNavigationInitializer.tsx` 合并承担 KVideo 的 TV 检测与 10 英尺模式：SMART-TV UA 或无触控大屏启用 `tv-mode`。
- `useSpatialNavigation.ts` 只在 TV 模式处理方向键/Enter，并跳过隐藏、禁用、编辑中和 `data-no-spatial` 控件。
- SMART-TV Chromium E2E 证明 `tv-mode`、卡片左右空间移动及文本输入左右键不被劫持；播放器、Premium 收藏/首页和 IPTV 另有方向键隔离、焦点陷阱与 Escape 返回证据。
- 以上是本地模拟证据，不等于真实电视、遥控器或 Cast 设备证据；T39 保持 HOLD。

## WebView 83

- 生产构建完成后对 27 个客户端 JavaScript 资产执行 Chrome/WebView 83 目标转译。
- 定向单元测试证明 `??=`、`||=`、`&&=` 等逻辑赋值被降级且输出可由 JavaScript 解析；缺失资产根时失败关闭。
- 这是静态可解析边界，不等于真实 Android WebView 83 设备运行证明；T39 保持 HOLD。

## 三语与可访问性

- `LocaleProvider` 提供简体中文、繁体中文和英文的即时切换、旧值迁移、重载恢复与账户隔离。
- 登录、入口状态、导航、首页/搜索、收藏/历史、播放/弹幕、来源/导入、账户/同步/用量、IPTV、Premium 与数据管理均有三语 E2E 或合同证据。
- 全部 8 个静态入口在四断点运行 WCAG 2 A/AA/2.1 AA axe；严重/关键违规为 0。
- 语义区域、可访问名称、ARIA 状态、非颜色文本标签、Tab 顺序、自定义确认框/侧栏/导入弹窗焦点陷阱与关闭后焦点恢复均由现有切片测试覆盖。

## 定向与全量验证

- 定向静态合同：5/5（全局 provider/shell/TV 空间焦点/WebView 83 转译/缺失根失败关闭）。
- 定向浏览器：5/5（8 入口四断点 AA/viewport、Service Worker、全局 shell、滚动返回、SMART-TV 空间导航）。
- 汇总所依据的当前全量门禁：UXUV-Pages 静态 125/125、Playwright 101/101、生产构建/类型/ESLint 全绿；UXUVideo 85/85。

## 下一步与 HOLD

- T38 实施 VideoTogether 本地 mock/CSP 切片。
- 本任务不授权也不证明真实设备、真实第三方脚本、浏览器安装、commit、push、部署或生产环境；T39/T43-T48 继续 HOLD。
