# T38/T39 VideoTogether 能力证据

结论：**本地实现完成。** Worker 内置固定官方脚本入口并默认允许，账户内“一起看”开关默认关闭；用户无需提供脚本 URL。部署管理员仍可显式禁用，非法自定义 URL 继续失败关闭。

## 实现

- UXUV-Pages 恢复 KVideo 的账户级 `videoTogetherEnabled` 设置，默认 `false`，仅在播放器和 IPTV 页面显示入口。
- `VideoTogetherController` 覆盖管理员禁用、加载、加载失败、创建、加入、配置和三语状态。
- 官方异步 API 适配为 `window.videoTogetherExtension.CreateRoom/JoinRoom`，无密码房间传空字符串。
- 房间 ID 在第三方调用前验证，不写入 URL、浏览器持久存储或 Worker API。
- Worker `/api/config` 在未设置额外变量时返回固定官方入口；`VIDEOTOGETHER_ENABLED=false` 或 `0` 关闭。
- CSP 与 RuntimeConfig 共用同一个解析结果，避免配置与安全头漂移。

## RED / GREEN

- RED：原 Worker 零变量时返回 `enabled:false` 且 CSP 不允许官方入口；原 Pages 缺少账户级一起看设置。
- GREEN：Worker RuntimeConfig/CSP 聚焦测试 16/16；Pages 设置/桌面播放器静态合同 7/7；设置与桌面播放器 E2E 19/19；TypeScript 检查通过。

## 真实服务与设备分层

- Codex 内置浏览器已完成 VideoTogether 临时房间创建、第二标签加入、失败和退出流程。
- 固定顶层脚本 SHA-256 为 `4a4eb44eb4b822319348067a02f06574a6590af9efab9d73e7a4a6b6a2fbd1e9`，但官方 loader 仍请求其维护的动态二级资源；该风险已记录，不把它表述为首方完整性。
- Google Cast 首方合同以 SDK mock 验证；真实 Cast 与 Cloudflare 实例由用户部署后验收，不阻塞本地可复制 Worker 候选，也不声明为已验证。
