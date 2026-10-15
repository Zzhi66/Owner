# 开发指南

## 环境和运行

已在本机确认 Node.js 22.22.0、npm 10.9.4、Git 2.45.1。`.nvmrc` 记录当前验证过的 Node 版本；不要求安装版本管理器。

```sh
npm ci
npm run dev
npm run check
```

项目当前没有第三方依赖。`npm ci` 用于校验锁文件并准备一致环境，运行原型无需下载前端框架。Windows 若 PowerShell 限制 npm.ps1，可使用 `npm.cmd`。

服务地址为 http://127.0.0.1:4173，只绑定本机。`npm start` 与 `npm run dev` 等价。没有热更新，编辑后刷新页面。端口被占用时先检查是否已有本项目服务，不要终止未知进程。PowerShell 可通过 `$env:PORT = '4174'` 在当前终端指定其他端口。

## 当前代码结构

| 文件 | 职责 |
| --- | --- |
| dist/index.html | 页面骨架、领域容器、Agent 与原生 dialog |
| dist/app.css | 基础布局及通用组件样式 |
| dist/jarvis.css | 当前 HUD 设计变量、视觉覆盖与响应式规则 |
| dist/app.js | 数据初始化、localStorage、视图、表单、图表和演示 Agent |
| server.cjs | 无依赖静态服务 |
| reference/owner-jarvis-overview.jpg | 已确认的视觉基线 |
| docs/ROADMAP.md | 待实施开发顺序 |

`dist/` 目前是源码，不能清空，也不应加入忽略规则。正式引入构建工具时，先迁移源码到新的源目录，再定义构建输出；不能让构建命令覆盖唯一的源码。当前没有 build 命令、CI 或完整测试套件。

## 数据边界

- localStorage key：`owner.workbench.prototype.v1`，当前 `schemaVersion: 1`。
- 当前集合：daily、meals、sessions、habits、accounts、assetHistory、tasks、wellbeing、events、goals、notes、messages、agentTasks、artifacts。
- 界面偏好：theme、range、selected、context、agentTab、hideMoney、order 等；后续与领域记录分离。
- 所有“今天”以原型日期 2026-10-14 为准。迁移到真实日期时必须同时处理本地时区、跨天刷新、历史数据和统计口径。
- 目前部分无效存储内容可能回退到示例数据。正式版应提示恢复并保留原数据，避免静默覆盖。
- localhost、127.0.0.1、不同端口与 file:// 的数据空间不同。测试更换地址前通过设置导出；当前尚无导入功能。

## 后续代码组织方向

先拆开数据与界面，再决定是否引入框架，避免同时改变业务逻辑和页面表现：

- 数据层：实体校验、版本迁移、存储接口、示例数据。
- 业务层：日期范围、待办筛选、日程排序、目标转待办、各领域统计。
- 界面层：总览、领域详情、记录表单、Agent 面板及共享控件。
- 适配层：后续同步来源和 Agent 服务，通过明确接口替换演示实现。

这些是开发方向，当前尚未创建或实现这些模块。模型密钥不得放在浏览器源码或提交到仓库。

## 验收

基础检查：`npm run check` 检查服务和前端 JavaScript 的语法。CSS、可访问性和浏览器行为需另行验证。

按改动范围检查：

- 总览 → 领域详情 → 返回，hash、刷新及浏览器前进后退一致。
- 新记录保存与刷新保留，取消编辑不写入；空值与数值边界提示清楚。
- 待办添加、撤销、完成；日程完成 / 恢复；目标下一步去重。
- 资产隐藏状态、卡片排序和外观偏好仍能保留。
- Agent 开合、Esc、上下文传递及任务 / 产物切换。
- 375、768、1024、1440 像素宽度，弹窗与悬浮窗不溢出；键盘可到达主要操作。
- 测试采用专用记录，不能重置真实用户状态。涉及迁移时先导出备份，并添加针对迁移与业务边界的自动化测试。

## 版本管理

主分支 `main`，后续较大的工作使用 `feat/`、`fix/` 或 `refactor/` 分支。保持一次提交围绕一个可说明的变化，提交前检查 `git diff --check` 和 `npm run check`。

真实数据、数据库、导出、凭据和本机工具配置不提交。当前仅准备本地仓库；远程托管、CI 服务与发布环境之后按需要配置。
