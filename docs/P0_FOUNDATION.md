# P0 · React 工程基础

日期：2026-10-17

## 交付范围

本阶段建立 React + TypeScript + Vite 工程基础，保留手写原型和既有浏览器记录。React 页面是明确标注阶段的开发入口，包含 HUD 样式基础与后续迁移模块说明。

现有记录、领域组件、图表和 Agent 浮窗仍由原型提供。数据库、日期服务、数据迁移和真实模型接入按后续阶段实施。

## 入口与构建

| 用途 | 命令 | 地址 / 输出 |
| --- | --- | --- |
| 原型 | npm run dev:prototype（或 npm run dev） | http://127.0.0.1:4173 |
| React 开发 | npm run dev:app | http://127.0.0.1:5173 |
| 生产构建 | npm run build | build/ |
| 构建预览 | npm run preview:app | http://127.0.0.1:5174 |
| 全套检查 | npm run verify | 语法、lint、格式、测试、类型与构建 |

端口均只绑定本机，不自动递增。新入口不读取旧 localStorage，没有执行记录迁移。

`scripts/build-path.mjs` 只允许输出到项目 `build/`，拒绝 `dist/`、源码、项目根目录和父目录。`scripts/build.mjs` 在调用 Vite 前校验输出路径，构建前后比较手写原型的文件树和 SHA-256 指纹。生成目录不会提交 Git。

## 工程约定

- 当前 Node 22.22.0 可用，依赖要求写在 engines 中。
- React 运行时、Vite、TypeScript 与检查工具使用精确依赖版本和锁文件。
- TypeScript 采用与 typescript-eslint 支持范围匹配的稳定版本。
- `.npmrc` 为后续新增依赖启用精确版本保存。
- 新样式使用 CSS Modules，全局 HUD 变量位于 `src/shared/styles/tokens.css`。
- ESLint 和 Prettier 的新工程检查不格式化或重写旧 `dist/` 原型。
- Git 忽略规则中的原始个人数据目录限定为根目录 `/data/`，不会误忽略后续 `src/data/` 源码。

## 验证记录

| 验证项 | 结果 |
| --- | --- |
| 干净重装 | `npm ci --offline --no-audit --no-fund` 成功，未依赖现有 node_modules |
| 依赖树 | `npm ls --depth=0` 成功，无不兼容依赖报告 |
| 原型语法、lint、格式 | 通过；TypeScript 规则只应用于 TS 源码，保留服务的 CommonJS 格式 |
| 类型检查 | 应用入口和 Vite / 测试配置通过 |
| 构建保护测试 | Vitest 7 项通过，覆盖合法路径、dist、根目录、父目录及路径回退 |
| 生产构建 | 成功输出到 build/；构建前后 dist/ 指纹一致 |
| 原型运行 | 4173 正常打开，保留既有界面和记录状态 |
| React 运行 | 5173 正常打开，工程阶段和待迁移模块标识明确 |
| 构建预览 | 5174 正常打开生产产物，浏览器无控制台错误 |
| 响应式 | 375、768、1024、1440 像素和 812×375 横屏，无横向溢出 |
| 导航与焦点 | 新入口跳转原型并返回正常；跳到内容后 main 获得焦点 |

已固定 React / React DOM 19.3.1、TypeScript 6.0.3、Vite 8.3.4、Vitest 5.0.5、ESLint 10.13.0，其他精确版本见 package.json 和锁文件。

这些检查验证 P0 工程可用性；不代表领域业务、数据库迁移或真实 Agent 已完成。

## 下一步

进入 P1：先迁移 AppShell、导航和顶部核心，再以资产卡片作为首个完整迁移单元。组件迁移期间保持原型日期与演示标识，日期与数据库切换单独在 P2 实施。
