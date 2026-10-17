# 开发指南

## 环境和运行

已在本机确认 Node.js 22.22.0、npm 10.9.4、Git 2.45.1。`.nvmrc` 记录当前验证过的 Node 版本；不要求安装版本管理器。

```sh
npm ci
npm run dev
npm run verify
```

Windows 若 PowerShell 限制 npm.ps1，可使用 `npm.cmd`。依赖使用精确版本和锁文件；TypeScript、typescript-eslint 升级时需一起检查兼容范围。

| 命令 | 用途 |
| --- | --- |
| npm run dev / npm run dev:app | React 开发应用，http://127.0.0.1:4173 |
| npm run dev:prototype | 保留的手写原型，http://127.0.0.1:4174 |
| npm run check | 现有原型和静态服务 JavaScript 语法检查 |
| npm run typecheck | 应用和工具配置的严格 TypeScript 检查 |
| npm run lint | 新源码、工具脚本及服务的静态规则检查 |
| npm run format / npm run format:check | 格式化 / 检查新工程文件，排除旧原型 |
| npm test / npm run test:watch | Vitest 单次 / 监听模式 |
| npm run build | 类型检查后输出 build/，校验 dist/ 完整性 |
| npm start / npm run preview:app | 构建后通过 http://127.0.0.1:5175 验证生产产物 |
| npm run verify | 依次完成语法、lint、格式、测试、类型与构建 |

所有服务只绑定本机，不静默换端口。端口占用时检查是否已有本项目服务，不终止未知进程。原型静态服务支持当前终端的 PORT 环境变量。新应用有热更新；手写原型编辑后需刷新。

P0 的旧端口信息保留在历史报告中；当前命令和地址以本指南为准。4173 现为 React 的统一开发入口。若该端口仍是旧静态服务，需要先停止已确认属于本项目的旧服务，再启动 React。

## P1 代码结构

| 文件 / 目录 | 职责 |
| --- | --- |
| src/main.tsx、src/app/App.tsx | React 挂载、应用外壳、hash 导航与弹窗组合 |
| src/app/usePrototype.ts | 过渡状态、草稿提交、localStorage 写入与跨标签更新 |
| src/components/ | SVG 图标及共享界面控件 |
| src/features/overview/ | 资产、待办、日程和可排序近况卡片 |
| src/features/details/ | 领域详情、时间切换与 SVG 趋势图 |
| src/features/records/ | 身体、饮食、习惯、投入、资产、心情、日程和目标编辑 |
| src/features/agent/ | 右侧 Agent 工作窗与可测试的本地汇总规则 |
| src/domain/models.ts、selectors.ts | 领域类型与纯统计、范围、金额选择器 |
| src/data/prototype.ts | 固定示例、旧结构校验、兼容与安全读写 |
| src/shared/styles/ | HUD 基础、保留的布局样式及 React 适配 |
| dist/ | 保留的手写原型结构、样式和演示逻辑 |
| server.cjs | 无依赖的旧原型静态服务 |
| scripts/build.mjs、scripts/build-path.mjs | 构建目录保护与原型完整性检查 |
| tests/ | 构建保护、过渡存储、统计与本地 Agent 边界测试 |

P1 优先保持界面等价，复用 HUD 样式；后续按组件逐步整理 CSS Modules。核心视觉仍为 SVG。Dexie、Zod、ECharts、Three.js 以及真实 Agent 均未在本阶段安装或接入。

`dist/` 是手写源码，不能删除、清空或加入忽略规则。Vite 输出固定为 `build/`；官方构建入口会拒绝其他输出路径，并在构建前后核对原型文件树和 SHA-256 指纹。不要绕过保护使用任意 outDir 构建。生成的 `build/` 不提交。

## 数据与地址边界

- P1 继续使用 localStorage key `owner.workbench.prototype.v1`，`schemaVersion: 1`，没有进行正式数据库迁移。
- 当前集合：daily、meals、sessions、habits、accounts、assetHistory、tasks、wellbeing、events、goals、notes、messages、agentTasks、artifacts。
- 偏好仍保存在同一结构：theme、range、selected、context、agentTab、hideMoney、order 等；未知扩展字段保留。
- “今天”仍是固定示例日期 2026-10-14；真实时区、跨天刷新、正式空间隔离和完整迁移在 P2 实施。
- React 接管原地址 `http://127.0.0.1:4173`，只能读取同一浏览器、同一来源保存的记录。P0 的 5173、旧原型新地址 4174、生产预览 5175、file:// 和 localhost 都是独立来源，不自动合并。
- 地址切换前应在原地址导出 JSON；P1 保留导出，但完整导入恢复仍在 P3 实施。不能通过平移历史日期或复制示例伪造迁移结果。

读取时校验记录结构，只对已知可兼容的偏好与缺省集合做规范化。缺少后加的 wellbeing、events、goals 时补为空集合；旧主题和默认卡片顺序按既有规则兼容；来源不明记录不会被删除或改标为正式记录。正在运行的旧 Agent 任务在重新读取后标为已中断，保留其任务和用户消息。

无效 JSON、未知版本、不可识别的记录或读存储失败时，保留原始值，提示警告并禁止写入；示例仅用于临时显示。写入前核对当前存储是否仍可识别，保存异常不提交编辑草稿。跨标签变动优先刷新已保存状态并提示冲突，不能静默覆盖另一标签内容；这不等于已经实现数据库事务或正式的多端冲突合并。

编辑器同时保存目标记录的打开时基线，在保存与删除时核对当前目标值。目标在其他页面改动或删除后，即使该页面已经同步最新全局状态，也拒绝用旧草稿覆盖或复活已删除目标；草稿保留供核对。无关记录和偏好变化不会被当作同一目标的冲突。身体 / 心情日期切换加载新日期记录时同步更新该日期基线。

## 验证与验收

修改后运行 `npm run check`。React 变更还运行 `npm run verify`。前者仅语法检查，后者包含静态检查、测试、类型与生产构建；均不能替代浏览器交互检查。P1 的当前验证状态与待检查项记录在 [迁移记录](P1_REACT_MIGRATION.md)。

按改动范围做浏览器检查，使用专用测试记录并在验证后清理，不重置用户存储或改动既有个人记录：

- 总览 → 各领域 → 返回，hash、刷新、前进后退和未知 hash 一致；顶部日期明确为示例。
- 记录新增 / 编辑 / 取消 / 删除，保存与刷新保留；取消不写入；空值、零值、日期和数值边界清楚；保存失败保留草稿。
- 待办快速添加、撤销、完成；日程完成 / 恢复；目标最多 3 个，下一步加入待办去重。
- 心情与睡眠分别保存，历史随领域范围变化；资产金额隐藏、近况排序与主题偏好保留。
- Agent 开合、Esc、上下文、键盘标签、Enter / Shift+Enter、任务 / 产物、复制和导出；运行中收起继续完成，刷新后旧运行任务中断。
- 弹窗打开焦点在内部、Esc 只关闭最上层弹窗、关闭后回到入口；可通过键盘操作主要功能。
- 375、768、1024、1440 像素以及窄屏弹窗、Agent 不横向溢出；减少动态效果偏好有效。
- 构建前后 dist/ 不变，生产预览可用，浏览器控制台无新增错误。

涉及损坏存储、保存异常或多标签冲突时，使用独立测试来源和测试存储；不要在用户正在使用的来源注入无效值。个人导出、备份及测试产生的个人记录不得提交 Git。

## 后续边界与版本管理

当前开发分支为 `feat/react-foundation`。每次提交围绕一个可说明的变化，记录具体功能、检查结果和未覆盖范围；提交前运行 `git diff --check` 与相关检查。P0 历史报告保留原样。

P1 只做组件迁移和必要的过渡存储保护；P2 建立日期服务、Zod、Dexie 和记录空间隔离，P3 实施完整恢复与记录闭环，P4 接入正式图表并做第一版验收。模型密钥不能进入浏览器源码或仓库，真实模型、同步及桌面端按后续阶段实施。
