# Daily English · 亲子英语手账

每天 10–15 分钟，用家庭生活中的英文指令练习听懂与动作响应。首批包含 6 节日常课、1 节周测，26 条指令和 8 个测评任务。

仓库：[yizihan/DailyEnglish](https://github.com/yizihan/DailyEnglish) · [Pages 部署状态](https://github.com/yizihan/DailyEnglish/actions/workflows/deploy.yml)

## 本地启动

需要 Node.js 24.12 或更高版本。

```powershell
npm ci
npm run dev
```

打开终端给出的本地地址。开发服务器仅监听本机。普通用户使用已发布网址，不需要 Node.js。

## 已实现

- 今日推荐、课程搜索与场景筛选。
- 英文、中文、动作提示、发音说明与延伸表达。
- 孩子动作观察、家长答案揭示与自评。
- 首次完成后第 1/2/4/7 天复习，过期节点合并。
- localStorage 进度、JSON 导出和确认后替换导入。
- 仅使用设备本地英语语音；不可用时由家长示范。
- 手机适配、键盘操作、hash 深链接。

无账号、云同步、后台、在线 AI、遥测或额外业务 API。课程与资源从同一站点加载；不提供离线 PWA 保证。浏览器删除站点数据会清除进度，换设备或换站点域名前请导出备份。

## 内容来源

用户原稿在 content 根目录，标准化课程在 content/lessons。新课程参见 [内容维护说明](content/README.md)。首批是 AI 辅助课程的结构整理版，保留原稿发音提示，未经逐条专业语言审核。修订见 [内容修订记录](docs/内容修订记录.md)。

## 检查

```powershell
npm run content:check
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

浏览器测试在本机 4173 端口将 dist 挂载到 /DailyEnglish/，验证 GitHub 项目站路径；该端口需空闲。测试报告与截图在 test-results，默认不提交。生产本地预览：`npm run preview`。

## GitHub Pages 发布

目标仓库为 `yizihan/DailyEnglish`。站点地址以 Deploy Pages 工作流的成功部署结果为准。

1. 确认目标 GitHub 账号和课程内容的公开许可，再创建公开仓库。
2. 提交应用、标准化 Markdown、文档和 lockfile；不要提交个人进度、node_modules、dist、临时文件。PDF 默认忽略。
3. Settings → Pages → Source 选择 GitHub Actions。
4. main 推送或手动运行 Deploy Pages 工作流：先检查、测试和构建，再由官方 Pages Actions 发布。
5. 使用工作流返回的真实地址检查首页、课程深链接刷新、资源加载和进度恢复。

构建使用相对资源 base 与 hash 路由，可在仓库子路径或账号根路径托管。无需业务密钥或手工 PAT；Pages 部署使用 Actions 自带 token 和 OIDC。PR 工作流不部署。

回滚：revert 有问题的提交并重新发布，浏览器进度不受影响。停止公开网站在 Pages 设置取消发布。

## 项目结构

- src/components：指令、测评与评分组件。
- src/views：今日、课程、详情、复习、备份。
- src/domain：课程类型、日期复习、进度与备份校验。
- scripts/parser.ts：Markdown AST 校验与安全富文本生成。
- scripts/content.ts：生成索引与分课数据。
- tests / e2e：规则与浏览器测试。

项目协作见 [AGENTS.md](AGENTS.md)，首版范围见 [实施范围](docs/首版实施范围.md)。

## 许可

- 应用代码、样式、脚本、测试和配置：[MIT](LICENSE)。
- 课程与文档：[CC BY 4.0](LICENSE-CONTENT.md)，署名 yizihan 与 DailyEnglish 贡献者。
- 第三方依赖保留各自许可。
