<p align="center">
  <img src="./assets/readme/hero.svg" alt="A3S UI — 面向所有 A3S 界面的统一设计系统" width="1200">
</p>

<p align="center">
  <strong>Language / 语言:</strong>
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">中文</a>
</p>

<p align="center">
  面向任务工作区、文档工具与运维控制台的框架无关设计系统。
</p>

<p align="center">
  <a href="https://a3s-lab.github.io/UI/"><img alt="简体中文文档" src="https://img.shields.io/badge/docs-简体中文-315fc4?style=flat-square"></a>
  <a href="https://a3s-lab.github.io/UI/en/"><img alt="英文文档" src="https://img.shields.io/badge/docs-English-5f6875?style=flat-square"></a>
  <a href="https://a3s-lab.github.io/UI/playground.html"><img alt="A3S UI Playground" src="https://img.shields.io/badge/try-Playground-2864e8?style=flat-square"></a>
  <a href="https://github.com/A3S-Lab/UI/actions/workflows/pages.yml"><img alt="GitHub Pages 部署" src="https://img.shields.io/github/actions/workflow/status/A3S-Lab/UI/pages.yml?branch=main&style=flat-square&label=pages"></a>
  <a href="./LICENSE.md"><img alt="MIT 许可证" src="https://img.shields.io/badge/license-MIT-28a978?style=flat-square"></a>
</p>

## 一种视觉语言：从控件到工作台

A3S UI 将 A3S Office 中沉淀的交互模式沉淀为可复用的语义 HTML。它组合 Tailwind CSS v4、原生浏览器元素与小型原生 JavaScript 控制器——无需 React、Radix 或框架运行时。

系统现已公开 **116** 个公共组件契约：86 个通用组件覆盖控件、导航、内容、浮层与产品结构；30 个 Harness 组件则按任务、对话、执行、审查、证据、文件导航、知识管理、编辑、终端、日志与设备预览等工作流，为编码 Agent 分组。

<p align="center">
  <a href="https://a3s-lab.github.io/UI/"><img src="./assets/readme/docs-home.png" alt="A3S UI 中文文档首页与 Office Workbench 组件样例" width="1280"></a>
</p>

## 三步开始

从 npm 安装公共包：

```bash
npm install @a3s-lab/ui
```

加载 Tailwind 与完整 A3S 包：

```css
@import "tailwindcss";
@import "@a3s-lab/ui";
```

不运行 Tailwind 的应用可改为加载预编译包：

```css
@import "@a3s-lab/ui/cdn.css";
```

仅在界面使用交互式组合时导入运行时：

```js
import "@a3s-lab/ui/all";
```

然后用语义标记组合界面：

```html
<header class="workspace-header">
  <div data-workspace-identity>
    <h1>Production gateway</h1>
    <span>Configuration saved</span>
  </div>
  <div data-workspace-actions>
    <button type="button" class="btn">Deploy</button>
  </div>
</header>
```

拆分 CSS 导入、控制器级 JavaScript 导入与服务端渲染模板，见[安装指南](https://a3s-lab.github.io/UI/installation.html)。

## 组件家族

| 家族 | 包含的模式 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 输入与操作 | Button、Button Group、Bulk Action Bar、Copy Button、Editable Text、Form、Field、Input、Input Group、Hotkey Input、Textarea、Label |
| 选择与搜索 | Native Select、Select、Combobox、Filter Bar、Date Picker、Color Swatches、Image Select、Emoji Picker、Checkbox、Radio Group、Switch、Slider |
| 导航 | Activity Bar、Breadcrumb、Back to Bottom、Tabs、Pagination、Sidebar、Table of Contents |
| 浮层 | Alert Dialog、Dialog、Drawer、Dropdown Menu、Context Menu、Popover、Floating Panel、Image Viewer、Command、Tooltip |
| 反馈与状态 | Alert、Badge、Status Badge、Empty、Progress、Skeleton、Spinner、Streaming Text、Toast |
| 数据与内容 | Accordion、Collapsible、Avatar、Icon、File Type Icon、Image、Card、Item、Kbd、Markdown Surface、Highlighter、Code Diff、Snippet、Chart、Property List、Data Grid、Table、Sortable List、Stepper、Timeline、Tree |
| 布局与工作区 | App Shell、App Page、Catalog、Setting Row、Brand Lockup、Workspace Header、Toolbar、Ribbon、Settings Layout、Resource Card、Split Pane、Task Pane、Status Bar |
| Harness | Task Start、Task Workspace、Agent Composer、Agent Transcript、Agent Workbench、Context Selector、Message Status、Message Attachment、Message Citation、Follow-up Suggestions、Task Plan、Plan Step、Task Queue、Approval Request、Execution Item、Checkpoint、Tool Call、Tool Call Timeline、Tool Result、Change Review、Execution Evidence、Artifact Card、File Explorer、File Manager、Knowledge Library、3D Code Graph、Code Editor、Terminal、Log Viewer、Device Simulator |
| 工具 | Scroll Area、Theme Switcher |

可选的 Dockview 集成与语义清单并列，增加 Dock Workspace、Grid View、Split View、Pane View，且不改变 116 组件计数。它完整再导出 Dockview 8.1 的 MIT 表面（原生 TypeScript、React、Vue），并叠加 A3S 主题 token、版本化布局持久化，以及 Edge Group 安全的布局重置。

集成的 [Form 系统](https://a3s-lab.github.io/UI/components/form-system/) 提供确定性 Form Core、可视化 Designer、受控 Renderer、持久交互契约、Cloud 宿主适配器、CLI、Web Components、React Hook Form 集成，以及原生 Vue composable。其指南与交互示例直接位于 A3S UI 组件目录中。

每个组件指南都包含实时预览、最小用法、公共参数、状态与变体，以及无障碍说明。预览台会推导正确的控件、内容、浮层或工作区布局；手机与平板模式在隔离的 CSS viewport 中运行，使响应式 media query 使用所选宽度。浏览[完整组件目录](https://a3s-lab.github.io/UI/components/)。

## 设计基础

A3S 主题是完整设计系统，而不是叠在无关控件上的色板：

- **颜色** — 白与近黑产品表面，稀缺的 iris 焦点色、A3S 品牌蓝，以及保留的语义状态色。
- **字体** — 以应用为先的层级：密集标签与可读的长文文档。
- **间距** — 控件、面板、工具栏与文档画布的一致节奏。
- **形状与海拔** — 克制的圆角、边框与阴影，保持信息密度。
- **动效** — 短而有目的的过渡，并支持减少动效。
- **无障碍** — 语义元素、显式 ARIA 状态、键盘交互、RTL 感知布局，以及亮/暗主题。

## 应用级模式与 Harness

任务应用层是 A3S UI 与仅原语工具包的分界：

```text
App Shell
├── Activity Bar
├── Workspace Header
├── App Page
│   ├── Catalog
│   └── Settings Layout + Setting Row
├── Resource Card + Split Pane + Task Pane
└── Status Bar

Harness
├── Task Start + Task Workspace
├── Agent Composer + Agent Transcript + Agent Workbench
├── Task Plan + Plan Step + Task Queue
├── Approval Request + Execution Item + Tool Call
├── Change Review + Execution Evidence + Artifact Card + Checkpoint
└── File Explorer + Code Editor + Terminal + Log Viewer + Device Simulator

Dockview integration
├── Dock Workspace + Tabs + Tab Groups + Edge Groups
├── Floating Groups + Popout Windows + maximize/restore
├── Save/restore + custom state + complete event API
└── Grid View + Split View + Pane View
```

这些模式可独立复用，但其 token 与布局契约旨在组合成文档编辑器、任务工作区与可观测控制台。默认任务几何为：248px 导航区、760px 阅读栏、320–380px 可选检查器、36px 控件、44px 粗指针目标。响应式导航在低于 768px 时变为内含抽屉；检查器在低于 900px 时变为浮层，低于 520px 时变为底部抽屉。

Device Simulator 在缩放后的手机、平板与桌面硬件壳内保持精确 iframe viewport 尺寸，并为受信任的 `a3s-webview` 宿主暴露结构化原生预览边界。

双语模式指南覆盖 Task Workspace、New Task、Capability Catalog、Settings Center、Projects 与 Automations。仓库、终端、浏览器、传输、调度、持久化与策略逻辑仍由应用拥有。

独立的 [Playground](https://a3s-lab.github.io/UI/playground.html) 是双语、任务优先的 A3S 产品应用，而不是组件陈列或可停靠 IDE。其规范 `/playground` 路由族在一套连贯的桌面与紧凑屏流程中组合：持久任务与项目会话、基于 TipTap 的 composer、模型与 effort 控制、工作区引用、跟进队列、权限审查、工具调用证据、Finder 风格本地文件、代码与 Office/PDF 工作台、Knowledge、Memory、以截图驱动的 Inspiration 工作流、扩展、自动化与生产设置。遗留 `/app` URL 仍为路由别名。Playground 不在文档章节层级之内。

## 文档语言与版本

文档站与 A3S Code 网站使用同一套 Rspress、React 与 TypeScript 技术栈。简体中文为默认语言；每个已发布版本也提供英文文档。每个当前组件与 Harness 集成指南通过一套持久标签页同时呈现 HTML、React 与 Vue：框架正确的安装、必需导入、可高亮复制的示例，以及在公共契约有行为时匹配的 hooks / composables。

| 版本 | 简体中文 | English |
| -------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `next` | [默认文档](https://a3s-lab.github.io/UI/) | [英文文档](https://a3s-lab.github.io/UI/en/) |
| `v0.3.0` | [稳定版中文](https://a3s-lab.github.io/UI/v0.3.0/) | [稳定版英文](https://a3s-lab.github.io/UI/v0.3.0/en/) |
| `v0.2.0` | [稳定版中文](https://a3s-lab.github.io/UI/v0.2.0/) | [稳定版英文](https://a3s-lab.github.io/UI/v0.2.0/en/) |
| `v0.1.0` | [稳定版中文](https://a3s-lab.github.io/UI/v0.1.0/) | [稳定版英文](https://a3s-lab.github.io/UI/v0.1.0/en/) |

语言与版本切换会在目标树存在对应路由时保留当前页面。

## 包入口

| 导入 | 用途 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `@a3s-lab/ui` | 完整默认 A3S CSS 包 |
| `@a3s-lab/ui/base` | Token、工具类与结构组件 CSS（不含视觉样式） |
| `@a3s-lab/ui/components/{name}.css` | 单个组件的结构 CSS |
| `@a3s-lab/ui/styles/a3s.css` | 拆分导入构建用的 A3S 视觉基础 |
| `@a3s-lab/ui/runtime` | 共享生命周期与控制器注册表 |
| `@a3s-lab/ui/all` | 共享运行时 + 除 Chart 外全部自动初始化控制器 |
| `@a3s-lab/ui/{controller}` | 单个 JavaScript 控制器，如 `app-shell`、`task-workspace`、`tabs`、`split-pane`、`code-editor` 或 `device-simulator` |
| `@a3s-lab/ui/manifest` | 全部 116 个公共组件的机器可读元数据 |
| `@a3s-lab/ui/components.json` | JSON 组件选择器、部件、动作、状态与测试选择器 |
| `@a3s-lab/ui/ai` | DOM 标注、发现、选择器与快照辅助 |
| `@a3s-lab/ui/a3s-test` | 可直接运行的确定性工作流示例 |
| `@a3s-lab/ui/a3s-test/selectors` | 组件、部件、动作、ready 与状态选择器辅助 |
| `@a3s-lab/ui/react` | 可选的薄 React 适配器与类型化控制器 hooks；React 仍为 peer dependency |
| `@a3s-lab/ui/vue` | 可选的薄 Vue 适配器与类型化控制器 composables；Vue 仍为 peer dependency |
| `@a3s-lab/ui/dockview` | 完整原生 Dockview、Gridview、Splitview、Paneview API，外加 A3S 主题与持久化 |
| `@a3s-lab/ui/dockview/react` | 完整 React Dockview API，外加布局与视图 hooks |
| `@a3s-lab/ui/dockview/vue` | 完整 Vue 3 Dockview API，外加匹配 composables |
| `@a3s-lab/ui/dockview/css` | Dockview 基础 CSS 与 A3S 亮/暗主题变量 |
| `@a3s-lab/ui/form` | Form 文档、编译器、Designer、Renderer、适配器与集成契约 |
| `@a3s-lab/ui/form/core` | 框架无关的编译、规则、校验、补丁、语言目录与无头状态 |
| `@a3s-lab/ui/form/react` | React Designer、Renderer、文件上传、签名、数据源与检查器控件 |
| `@a3s-lab/ui/form/react-hooks` | 兼容 React Hook Form 的 `useA3SForm`、resolver、字段数组、订阅与 Renderer 绑定 |
| `@a3s-lab/ui/form/vue` | Vue 3 Designer 与 Renderer 适配器 |
| `@a3s-lab/ui/form/vue-hooks` | 原生 Vue `useA3SForm`、字段、字段数组、上下文、校验与 Renderer composables |
| `@a3s-lab/ui/form/web-component` | 框架中立的 `<a3s-form-designer>` 与 `<a3s-form-renderer>` 自定义元素 |
| `@a3s-lab/ui/form/cloud` | 类型化 A3S Cloud 宿主适配器 |
| `@a3s-lab/ui/form/a3s-ui.css` | 面向产品表面的 A3S UI + Form 布局与交互样式 |
| `@a3s-lab/ui/templates/*` | 用于服务端渲染应用的 Nunjucks 与 Jinja 模板 |

公共运行时命名空间为 `window.a3sUI`。遗留运行时别名仍保留以兼容。

可选语义运行时为匹配根标注 `data-a3s-components`，为部件标注 `data-a3s-parts`，为精确部件归属标注 `data-a3s-part-owners`，为当前状态标注 `data-a3s-state`。它不替代应用行为，也不引入框架运行时。原生 HTML、React、Vue 与确定性测试示例见双语[集成指南](https://a3s-lab.github.io/UI/integration.html)。

React 与 Vue 还暴露 `useA3SLocale`、`useA3STheme` 与 `useA3SMotion`。这些 hooks / composables 观察与原生 HTML 相同的根级 `lang`、`dir`、`data-theme`、`.dark` 与 media-query 契约；翻译资源、持久化与服务端协商仍由应用拥有。

运行时还会把打开的 `[data-popover]` 表面保持在可视 viewport 内。下拉菜单、popover、select 与 combobox 共享碰撞翻转、受限可用高度、实时滚动/缩放定位，以及逻辑 RTL 对齐。

## 开发

```bash
npm ci
npm ci --prefix site
npm run build
npm run check:coverage:strict
npm run check:framework-docs
npm run check:boundaries
npm run check:package
npm run docs:build
npm run test:e2e:a3s:check
npx playwright install chromium
npm run test:visual
```

本地运行文档站：`npm run docs:dev`。静态构建写入 `site/doc_build`，并从 `main` 部署到 GitHub Pages。

按组件与路由运行浏览器套件：`npm run test:e2e:a3s`。已报告的缺陷类会保留为页面级 A3S Test 回归，含动作-状态断言、截图、控制台输出与页面错误证据。场景默认串行，使有状态预览保持确定性；仅在浏览器适配器有足够隔离容量时设置 `A3S_TEST_MAX_PARALLEL`。命令期望 `PATH` 上有 `a3s-test`；本地适配器需要显式路径时使用 `A3S_TEST_BIN`、`A3S_TEST_BROWSER_DRIVER` 与 `A3S_TEST_BROWSER_EXECUTABLE`。

当前发布契约将 116 个公共组件、94 个 Playground 导出，以及 20 个 Harness 或 Playground 表面映射到 230 份实质性 PRD。已核对的 ACL 清单与证据总计见 `product-requirements/README.md`。`npm run test:e2e:a3s:check` 在浏览器运行前拒绝缺失、重复、浅层、过期或无效映射；机器可读索引位于 `product-requirements/`。

视觉检查使用 Playwright，含平台特定的桌面与紧凑基线。每个公共组件路由还有组件根几何与状态契约，以及浏览器诊断覆盖。设置 `A3S_UI_VISUAL_CHROMIUM_EXECUTABLE` 可复用系统 Chromium；默认本地端口被占用时设置 `A3S_UI_VISUAL_PORT`。这些检查有意不纳入 CI。

## 渊源与许可证

A3S UI 基于 [Basecoat](https://github.com/hunvreus/basecoat)（由 [Ronan Berder](https://github.com/hunvreus) 创建），并保留其对 [shadcn/ui](https://ui.shadcn.com/) 视觉语言的语义 HTML 诠释。A3S 主题与工作台组件在此基础上扩展，服务 A3S 产品。

以 [MIT License](./LICENSE.md) 发布。
