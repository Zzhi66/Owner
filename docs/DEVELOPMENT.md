# 开发指南

## 环境和运行

已在本机确认 Node.js 22.22.0、npm 10.9.4、Git 2.45.1。`.nvmrc` 记录当前验证过的 Node 版本；不要求安装版本管理器。

```sh
npm ci
npm run dev:app
npm run verify
```

React 工程的依赖记录在 package.json 和锁文件中。Windows 若 PowerShell 限制 npm.ps1，可使用 `npm.cmd`。TypeScript 选用与 typescript-eslint 兼容的 6.0 系列，依赖升级时需一起检查兼容范围。

| 命令 | 用途 |
| --- | --- |
| npm run dev / npm start / npm run dev:prototype | 手写原型，http://127.0.0.1:4173 |
| npm run dev:app | React 开发入口及热更新，http://127.0.0.1:5173 |
| npm run check | 现有原型和静态服务语法检查 |
| npm run typecheck | 应用和工具配置的严格 TypeScript 检查 |
| npm run lint | 新源码、工具脚本及服务的静态规则检查 |
| npm run format / npm run format:check | 格式化 / 检查新工程文件，排除旧原型 |
| npm test / npm run test:watch | Vitest 单次 / 监听模式 |
| npm run build | 类型检查后输出 build/，校验 dist/ 完整性 |
| npm run preview:app | 本地预览构建结果，http://127.0.0.1:5174 |
| npm run verify | 依次完成语法、类型、lint、格式、测试与构建 |

所有服务只绑定本机。React 开发和预览使用 strictPort，不静默换端口；原型端口可通过当前终端的 PORT 环境变量调整。端口被占用时先检查是否已有本项目服务，不要终止未知进程。原型无热更新，编辑后刷新页面。

P0 的 React 页面仅为开发入口，不读写 localStorage 或 IndexedDB。两套入口当前不共享业务状态。切换正式数据源前，仍须按实现计划完成迁移和验证。

## 当前代码结构

| 文件 | 职责 |
| --- | --- |
| dist/index.html | 页面骨架、领域容器、Agent 与原生 dialog |
| dist/app.css | 基础布局及通用组件样式 |
| dist/jarvis.css | 当前 HUD 设计变量、视觉覆盖与响应式规则 |
| dist/app.js | 数据初始化、localStorage、视图、表单、图表和演示 Agent |
| server.cjs | 无依赖静态服务 |
| src/main.tsx、src/app/ | React 挂载入口与开发阶段页面 |
| src/shared/styles/ | HUD tokens 和通用样式 |
| scripts/build.mjs、scripts/build-path.mjs | 构建输出保护与原型完整性验证 |
| tests/ | 构建路径保护测试 |
| vite.config.ts、tsconfig*.json | 开发 / 构建 / 测试和类型检查配置 |
| reference/owner-jarvis-overview.jpg | 已确认的视觉基线 |
| docs/ROADMAP.md | 待实施开发顺序 |

`dist/` 是保留的手写原型源码，不能清空，也不应加入忽略规则。新源码位于 `src/`，Vite 输出固定到 `build/`。官方 `npm run build` 入口在调用 Vite 前拒绝其他输出目录，并在构建后核对原型文件 SHA-256 指纹。不要绕过入口用任意 outDir 构建。当前测试覆盖构建路径保护，业务测试与 CI 尚未建立。

## 数据边界

- localStorage key：`owner.workbench.prototype.v1`，当前 `schemaVersion: 1`。
- 当前集合：daily、meals、sessions、habits、accounts、assetHistory、tasks、wellbeing、events、goals、notes、messages、agentTasks、artifacts。
- 界面偏好：theme、range、selected、context、agentTab、hideMoney、order 等；后续与领域记录分离。
- 所有“今天”以原型日期 2026-10-14 为准。迁移到真实日期时必须同时处理本地时区、跨天刷新、历史数据和统计口径。
- 目前部分无效存储内容可能回退到示例数据。正式版应提示恢复并保留原数据，避免静默覆盖。
- localhost、127.0.0.1、不同端口与 file:// 的数据空间不同。测试更换地址前通过设置导出；当前尚无导入功能。

## 后续代码组织方向

后续按照 [实现计划](IMPLEMENTATION_PLAN.md) 迁移到 React + TypeScript + Vite。先建立骨架和组件边界，再分阶段迁移日期与数据，避免同时改变业务逻辑和页面表现：

- 数据层：实体校验、版本迁移、存储接口、示例数据。
- 业务层：日期范围、待办筛选、日程排序、目标转待办、各领域统计。
- 界面层：总览、领域详情、记录表单、Agent 面板及共享控件。
- 适配层：后续同步来源和 Agent 服务，通过明确接口替换演示实现。

目前仅建立 app、shared/styles 和工程工具，其他业务目录随实际迁移创建。领域服务、数据库及模型适配尚未实现。模型密钥不得放在浏览器源码或提交到仓库。

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
