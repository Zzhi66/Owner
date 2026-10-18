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

## 当前代码结构

| 文件 / 目录 | 职责 |
| --- | --- |
| src/main.tsx、src/app/App.tsx | React 挂载、应用外壳、hash 导航与弹窗组合 |
| src/app/useWorkbench.ts | 空间选择、异步事务提交、Dexie 订阅、日期刷新 |
| src/data/indexeddb/、migrations/ | 数据库、存储适配、迁移与按领域日期复制 |
| src/domain/schemas.ts、ports/、src/shared/date/ | Zod 校验、存储接口、可注入日期服务 |
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

P1 优先保持界面等价，复用 HUD 样式；后续按组件逐步整理 CSS Modules。核心视觉仍为 SVG。P2 已安装 Dexie 4.4.6、Zod 4.6.7；数据库测试使用 fake-indexeddb 6.2.6。ECharts、Three.js 和真实 Agent 尚未接入。

`dist/` 是手写源码，不能删除、清空或加入忽略规则。Vite 输出固定为 `build/`；官方构建入口会拒绝其他输出路径，并在构建前后核对原型文件树和 SHA-256 指纹。不要绕过保护使用任意 outDir 构建。生成的 `build/` 不提交。

## 数据与地址边界

- 正式持久来源为 IndexedDB `owner.workbench.v2`，Dexie schema version 3。按领域分表，偏好与扩展存入空间 base，迁移原文与标记在独立表。
- UI 的 WorkbenchState 是数据库投影，不能额外写回旧 localStorage。领域存储接口在 src/domain/ports/workbench.ts，适配在 src/data/indexeddb/store.ts。
- 正式、示例和原型空间隔离。旧 key `owner.workbench.prototype.v1` 只读，先报告再复制；无效原文可下载和重新读取。迁移不依赖删除或重置原 key。
- 正式空间使用设备本地日历日期；原型与示例固定 2026-10-14。时间服务可注入 Clock，范围含今天，按日历日运算；睡眠按起床日期。
- 新记录元数据使用 UTC，旧未知创建时间为空，另记 migratedAt。旧净资产历史保留为 prototype 估值，正式净资产汇总与账户快照不冒充流水。
- 事务核对空间 revision 后写入；表单同时保留目标编辑基线。过期保存 / 删除拒绝覆盖且保留草稿，保存成功后再关闭表单。不同标签独立选择空间，记录使用 liveQuery 同步。
- 4173 为统一开发来源。4174、5175、file://、localhost 等来源不自动合并。P3 完整备份支持独立副本、同类型空间替换和恢复点回退；旧的显示记录导出不等于完整备份。
- 按领域日期复制时核对源 / 目标 revision、重复来源、日唯一冲突、账户冲突和目标上限，重建目标 ID 关联；未知来源由用户主动选择。
- 本地 Agent 任务写入 15 秒租期，过期任务在启动和周期检查中标为中断；有效租期内不打断另一标签的任务。没有真实 AI 或云同步。

详细表结构、迁移和已知限制见 [P2 日期与存储](P2_DATE_STORAGE.md)。

## P3 记录与恢复

- 新入口：领域详情「查看与管理全部记录」；设置「备份与恢复」「打开回收站」「配置习惯」；资产详情「查看账户快照」。
- src/domain/habits.ts 管理按日启用计划，domain/records.ts 管理删除及目标解关联。新增表单保留草稿与目标基线，保存成功后关闭。
- src/data/backup/ 提供格式校验、完整导出、独立副本、原子替换和恢复点；src/data/recovery/ 提供分组恢复，失败不覆盖当前数据。
- 数据库 version 2 加入回收站与恢复点并升级习惯定义，version 3 加入旧原文存档。保留 P2 的 version 1 声明以支持真实升级。
- 完整备份含所有空间、元数据、快照、回收站、恢复点及旧原文；不把任意 metadata 或凭据写入备份。旧显示记录 JSON 不直接导入。
- 替换与回退必须预览并校验目标 revision，事务内先建恢复点；相同来源类型才允许替换。新副本保留实体 ID 和关联，重映射空间与复制来源。
- 回收站恢复保持原 ID / 日期，冲突时保留两边。恢复目标不自动重绑旧待办，允许用户在待办编辑中选择。

字段、限制和验证范围见 [P3 记录闭环与备份](P3_RECORDS_BACKUP.md)。

## 验证与验收

修改后运行 `npm run check`。React 变更还运行 `npm run verify`。前者仅语法检查，后者包含静态检查、测试、类型与生产构建；均不能替代浏览器交互检查。P1 的当前验证状态与待检查项记录在 [迁移记录](P1_REACT_MIGRATION.md)。

按改动范围做浏览器检查，使用专用测试记录并在验证后清理，不重置用户存储或改动既有个人记录：

- 总览 → 各领域 → 返回，hash、刷新、前进后退和未知 hash 一致；顶部明确区分当前空间与真实 / 固定日期。
- 记录新增 / 编辑 / 取消 / 删除，保存与刷新保留；取消不写入；空值、零值、日期和数值边界清楚；保存失败保留草稿。
- 待办快速添加、撤销、完成；日程完成 / 恢复；目标最多 3 个，下一步加入待办去重。
- 心情与睡眠分别保存，历史随领域范围变化；资产金额隐藏、近况排序与主题偏好保留。
- Agent 开合、Esc、上下文、键盘标签、Enter / Shift+Enter、任务 / 产物、复制和导出；运行中收起继续完成，刷新或中断后，演示任务在租期到期检查时标为已中断。
- 弹窗打开焦点在内部、Esc 只关闭最上层弹窗、关闭后回到入口；可通过键盘操作主要功能。
- 375、768、1024、1440 像素以及窄屏弹窗、Agent 不横向溢出；减少动态效果偏好有效。
- 构建前后 dist/ 不变，生产预览可用，浏览器控制台无新增错误。

涉及损坏存储、保存异常或多标签冲突时，使用独立测试来源和测试存储；不要在用户正在使用的来源注入无效值。个人导出、备份及测试产生的个人记录不得提交 Git。

## 后续边界与版本管理

当前开发分支为 `codex/p3-records-backup`；GitHub 私有仓库为 https://github.com/Zzhi66/Owner。每次提交围绕一个可说明的变化，记录具体功能、检查结果和未覆盖范围；提交前运行 `git diff --check` 与相关检查。P0 历史报告保留原样。

P1 只做组件迁移和必要的过渡存储保护；P2 建立日期服务、Zod、Dexie 和记录空间隔离，P3 实施完整恢复与记录闭环，P4 接入正式图表并做第一版验收。模型密钥不能进入浏览器源码或仓库，真实模型、同步及桌面端按后续阶段实施。
