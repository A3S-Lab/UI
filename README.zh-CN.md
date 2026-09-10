<p align="center">
  <img src="./assets/readme/hero.svg" alt="A3S UI — one design system for every A3S surface" width="1200">
</p>


<p align="center">
  <strong>Language / 语言:</strong>
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">中文</a>
</p>

<p align="center">
  用于任务工作区、文档工具和操作控制台的与框架无关的设计系统。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@a3s-lab/ui"><img alt="npm version" src="https://img.shields.io/npm/v/@a3s-lab/ui?style=flat-square&color=315fc4"></a>
  <a href="https://a3s-lab.github.io/UI/"><img alt="Documentation in Simplified Chinese" src="https://img.shields.io/badge/docs-简体中文-315fc4?style=flat-square"></a>
  <a href="https://a3s-lab.github.io/UI/en/"><img alt="Documentation in English" src="https://img.shields.io/badge/docs-English-5f6875?style=flat-square"></a>
  <a href="https://a3s-lab.github.io/UI/playground.html"><img alt="A3S UI Playground" src="https://img.shields.io/badge/try-Playground-2864e8?style=flat-square"></a>
  <a href="https://github.com/A3S-Lab/UI/actions/workflows/pages.yml"><img alt="GitHub Pages deployment" src="https://img.shields.io/github/actions/workflow/status/A3S-Lab/UI/pages.yml?branch=main&style=flat-square&label=pages"></a>
  <a href="./LICENSE.md"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-28a978?style=flat-square"></a>
</p>

## 一种视觉语言，从控件到工作台

A3S UI 将 A3S Office 中精炼的交互模式转变为可重用的语义 HTML。它结合了 Tailwind CSS v4、本机浏览器元素和小型普通 JavaScript 控制器，无需 React、Radix 或框架运行时。

该系统现在公开了 116 个公共组件合约。 86 个通用组件涵盖控件、导航、内容、覆盖和产品结构，而 30 个组件 Harness 则对编码代理的任务、对话、执行、审查、证据、文件导航、知识管理、编辑、终端、日志和设备预览工作流程进行分组。

<p align="center">
  <a href="https://a3s-lab.github.io/UI/"><img src="./assets/readme/docs-home.png" alt="A3S UI Chinese documentation homepage with the Office Workbench component specimen" width="1280"></a>
</p>

## 从三步开始

从 npm 安装公共包：

```bash
npm install @a3s-lab/ui
```

加载 Tailwind 和完整的 A3S 包：

```css
@import "tailwindcss";
@import "@a3s-lab/ui";
```

不运行 Tailwind 的应用程序可以改为加载预编译包：

```css
@import "@a3s-lab/ui/cdn.css";
```

仅当界面使用交互式组合时才导入运行时：

```js
import "@a3s-lab/ui/all";
```

然后用语义标记组成界面：

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

请参阅 [installation guide](https://a3s-lab.github.io/UI/installation.html) 了解拆分 CSS 导入、控制器级 JavaScript 导入和服务器渲染模板。

## 组件系列

|家庭|包含图案|
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|输入和行动|按钮、按钮组、批量操作栏、复制按钮、可编辑文本、表单、字段、输入、输入组、热键输入、文本区域和标签 |
|选择和搜索|本机选择、选择、组合框、过滤器栏、日期选择器、色样、图像选择、表情符号选择器、复选框、单选按钮组、开关和滑块 |
|导航 |活动栏、面包屑导航、返回底部、选项卡、分页、侧边栏和目录 |
|覆盖|警报对话框、对话框、抽屉式菜单、下拉菜单、上下文菜单、弹出框、浮动面板、图像查看器、命令和工具提示 |
|反馈和状态 |警报、徽章、状态徽章、空、进度、骨架、旋转器、流文本和 Toast |
|数据与内容|手风琴、可折叠、头像、图标、文件类型图标、图像、卡片、项目、Kbd、Markdown 表面、荧光笔、代码差异、代码段、图表、属性列表、数据网格、表格、可排序列表、步进器、时间轴和树 |
|布局和工作空间|应用程序外壳、应用程序页面、目录、设置行、品牌锁定、工作区标题、工具栏、功能区、设置布局、资源卡、拆分窗格、任务窗格和状态栏 |
|线束|任务启动、任务工作区、代理编写器、代理成绩单、代理工作台、上下文选择器、消息状态、消息附件、消息引用、后续建议、任务计划、计划步骤、任务队列、批准请求、执行项目、检查点、工具调用、工具调用时间线、工具结果、更改审核、执行证据、工件卡、文件资源管理器、文件管理器、知识库、3D 代码图、代码编辑器、终端、日志查看器、和设备模拟器|
|公用事业 |滚动区域和主题切换器 |

可选的 Dockview 集成位于语义清单旁边，并添加了 Dock 工作区、网格视图、拆分视图和窗格视图，而无需更改 116 个组件的数量。它为本机 TypeScript、React 和 Vue 重新导出完整的 Dockview 8.1 MIT 表面，然后添加 A3S 主题令牌、版本化布局持久性和 Edge Group 安全布局重置。

集成的 [Form system](https://a3s-lab.github.io/UI/components/form-system/) 添加了确定性 Form Core、可视化设计器、受控渲染器、持久交互合约、云主机适配器、CLI、Web 组件、React Hook Form 集成和本机 Vue 可组合项。它的指南和交互式示例直接位于 A3S UI 组件目录中。

每个组件指南都包含实时预览、最低限度使用、公共参数、状态和变体以及可访问性注释。预览阶段派生正确的控件、内容、覆盖或工作区布局，而手机和平板电脑模式在独立的 CSS 视口中运行，因此响应式媒体查询使用选定的宽度。浏览[complete component catalog](https://a3s-lab.github.io/UI/components/)。

## 设计基础

A3S 主题是一个完整的设计系统，而不是叠加在不相关控件上的调色板：

- **颜色** — 白色和近乎黑色的产品表面，虹膜焦点稀少，A3S 品牌蓝色，以及保留的语义状态。
- **排版** — 应用程序优先的层次结构，具有密集的标签和可读的长格式文档。
- **间距** — 控件、面板、工具栏和文档画布的一致节奏。
- **形状和高度** - 限制半径、边界和阴影，以保留信息密度。
- **运动** — 简短、有目的的过渡，具有减少运动的支持。
- **辅助功能** — 语义元素、显式 ARIA 状态、键盘交互、RTL 感知布局和浅色/深色主题。

## 应用规模模式和利用

任务应用层是 A3S UI 与纯原始套件的不同之处：

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

这些模式是独立可重用的，但它们的令牌和布局契约旨在组成文档编辑器、任务工作区和可观察性控制台。默认任务几何结构使用 248 像素导航区域、760 像素阅读列、320-380 像素可选检查器、36 像素控件和 44 像素粗指针目标。响应式导航成为 768 像素以下的包含式抽屉；检查员变为低于 900 像素的覆盖层和低于 520 像素的底部抽屉。

设备模拟器在缩放的手机、平板电脑和桌面硬件外壳内保留精确的 iframe 视口尺寸，然后为受信任的 `a3s-webview` 主机公开结构化的本机预览边界。

双语模式指南涵盖任务工作区、新任务、功能目录、设置中心、项目和自动化。应用程序继续拥有存储库、终端、浏览器、传输、调度、持久性和策略逻辑。

独立的 [Playground](https://a3s-lab.github.io/UI/playground.html) 是双语、任务优先的 A3S 产品应用程序，而不是组件展示或可停靠 IDE。其规范的 `/playground` 路线系列将持久任务和项目会话、基于 TipTap 的编辑器、模型和工作量控制、工作空间参考、后续队列、权限审查、工具调用证据、Finder 风格的本地文件、代码和 Office/PDF 工作台、知识、内存、屏幕截图主导的灵感工作流程、扩展、自动化和生产设置结合在一个连贯的桌面和紧凑屏幕流程中。旧版 `/app` URL 仍然是路由别名。 Playground 位于文档章节层次结构之外。

## 文档语言和版本

该文档网站使用与 A3S Code 网站相同的 Rspress、React 和 TypeScript 堆栈。默认语言为简体中文；每个发布的版本还提供英文文档。当前的每个组件和 Harness 集成指南都通过一个持久选项卡集来呈现 HTML、React 和 Vue，其中包含框架正确的安装、所需的导入、突出显示的可复制示例以及公共合约具有行为的匹配挂钩或可组合项。

|版本 | 简体中文 |英语 |
| -------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| `next` | [Default documentation](https://a3s-lab.github.io/UI/) | [English documentation](https://a3s-lab.github.io/UI/en/) |
| `v0.4.0` | [Stable Chinese](https://a3s-lab.github.io/UI/v0.4.0/) | [Stable English](https://a3s-lab.github.io/UI/v0.4.0/en/) |
| `v0.3.0` | [Stable Chinese](https://a3s-lab.github.io/UI/v0.3.0/) | [Stable English](https://a3s-lab.github.io/UI/v0.3.0/en/) |
| `v0.2.0` | [Stable Chinese](https://a3s-lab.github.io/UI/v0.2.0/) | [Stable English](https://a3s-lab.github.io/UI/v0.2.0/en/) |
| `v0.1.0` | [Stable Chinese](https://a3s-lab.github.io/UI/v0.1.0/) | [Stable English](https://a3s-lab.github.io/UI/v0.1.0/en/) |

只要目标树中存在该路由，语言和版本切换就会保留当前页面。

## 包入口点

|进口|目的|
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `@a3s-lab/ui` |完整的默认 A3S CSS 捆绑包 |
| `@a3s-lab/ui/base` |没有视觉样式的令牌、实用程序和结构组件 CSS |
| `@a3s-lab/ui/components/{name}.css` |一个组件的结构CSS |
| `@a3s-lab/ui/styles/a3s.css` |用于分割导入构建的 A3S 视觉基础 |
| `@a3s-lab/ui/runtime` |共享生命周期和控制器注册表|
| `@a3s-lab/ui/all` |共享运行时加上所有自动初始化控制器（图表 | 除外）
| `@a3s-lab/ui/{controller}` |一个 JavaScript 控制器，例如 `app-shell`、`task-workspace`、`tabs`、`split-pane`、`code-editor` 或 `device-simulator` |
| `@a3s-lab/ui/manifest` |所有 116 个公共组件的机器可读元数据 |
| `@a3s-lab/ui/components.json` | JSON 组件选择器、部件、操作、状态和测试选择器 |
| `@a3s-lab/ui/ai` | DOM 注释、发现、选择器和快照助手 |
| `@a3s-lab/ui/a3s-test` |准备运行的确定性工作流程示例 |
| `@a3s-lab/ui/a3s-test/selectors` |组件、部分、操作、就绪和状态选择器助手 |
| `@a3s-lab/ui/react` |可选的瘦 React 适配器和类型化控制器挂钩； React 仍然是对等依赖 |
| `@a3s-lab/ui/vue` |可选的瘦 Vue 适配器和类型化控制器可组合项； Vue 仍然是对等依赖 |
| `@a3s-lab/ui/dockview` |完整的本机 Dockview、Gridview、Splitview 和 Paneview API 以及 A3S 主题和持久性 |
| `@a3s-lab/ui/dockview/react` |完整的 React Dockview API 以及布局和视图挂钩 |
| `@a3s-lab/ui/dockview/vue` |完整的 Vue 3 Dockview API 以及匹配的可组合项 |
| `@a3s-lab/ui/dockview/css` | Dockview 基础 CSS 和 A3S 浅色/深色主题变量 |
| `@a3s-lab/ui/form` |表单文档、编译器、设计器、渲染器、适配器和集成合约 |
| `@a3s-lab/ui/form/core` |独立于框架的编译、规则、验证、补丁、区域设置目录和无头状态 |
| `@a3s-lab/ui/form/react` | React Designer、Renderer、文件上传、签名、数据源和检查器控件 |
| `@a3s-lab/ui/form/react-hooks` | React Hook Form 兼容`useA3SForm`、解析器、字段数组、订阅和渲染器绑定 |
| `@a3s-lab/ui/form/vue` | Vue 3 设计器和渲染器适配器 |
| `@a3s-lab/ui/form/vue-hooks` | Native Vue `useA3SForm`、字段、字段数组、上下文、验证和渲染器可组合项 |
| `@a3s-lab/ui/form/web-component` |框架中立的 `<a3s-form-designer>` 和 `<a3s-form-renderer>` 自定义元素 |
| `@a3s-lab/ui/form/cloud` |类型A3S Cloud主机适配器|
| `@a3s-lab/ui/form/a3s-ui.css` | A3S UI plus 产品界面的表单布局和交互样式 |
| `@a3s-lab/ui/templates/*` |用于服务器渲染应用程序的 Nunjucks 和 Jinja 模板 |

公共运行时命名空间是`window.a3sUI`。旧版运行时别名仍可用于兼容性。

可选的语义运行时用 `data-a3s-components` 注释匹配的根，用 `data-a3s-parts` 注释部分，用 `data-a3s-part-owners` 注释精确的部分所有权，用 `data-a3s-state` 注释当前状态。它不会取代应用程序行为或引入框架运行时。请参阅双语 [Integration guide](https://a3s-lab.github.io/UI/integration.html) 了解本机 HTML、React、Vue 和确定性测试示例。

React 和 Vue 还公开了 `useA3SLocale`、`useA3STheme` 和 `useA3SMotion`。这些钩子和可组合项与原生 HTML 遵循相同的根 `lang`、`dir`、`data-theme`、`.dark` 和媒体查询约定；翻译资源、持久性和服务器协商仍然由应用程序拥有。

运行时还会在视觉视口内保持打开的 `[data-popover]` 曲面。下拉菜单、弹出窗口、选择和组合框共享碰撞翻转、可用高度受限、实时滚动/调整大小定位和逻辑 RTL 对齐。

## 发展

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

使用 `npm run docs:dev` 在本地运行文档站点。静态构建写入`site/doc_build`并从`main`部署到GitHub Pages。

使用 `npm run test:e2e:a3s` 运行特定于组件和特定于路由的浏览器套件。报告的缺陷类保留为页面级A3S Test回归，包含操作状态断言、屏幕截图、控制台输出和页面错误证据。默认情况下，场景连续运行，因此状态预览保持确定性；仅当浏览器适配器有足够的隔离能力时才设置`A3S_TEST_MAX_PARALLEL`。该命令期望 `PATH` 上有 `a3s-test`；当本地适配器需要显式路径时，使用 `A3S_TEST_BIN`、`A3S_TEST_BROWSER_DRIVER` 和 `A3S_TEST_BROWSER_EXECUTABLE`。

发布合同目前将 116 个公共组件、94 个 Playground 导出以及 20 个 Harness 或 Playground 表面映射到 230 个实质性 PRD。检查的 ACL 库存和证据总数位于`product-requirements/README.md`。 `npm run test:e2e:a3s:check` 在浏览器运行之前拒绝丢失、重复、浅、陈旧或无效的映射；机器可读索引位于`product-requirements/`下。

视觉检查使用具有特定于平台的桌面和紧凑基线的 Playwright。每个公共组件路由还具有组件根几何结构和状态契约以及浏览器诊断覆盖范围。设置`A3S_UI_VISUAL_CHROMIUM_EXECUTABLE`以重用系统Chromium安装，并在默认本地端口被占用时设置`A3S_UI_VISUAL_PORT`；这些检查故意不属于 CI 的一部分。

## 血统和许可

A3S UI 建立在由 [Ronan Berder](https://github.com/hunvreus) 创建的 [Basecoat](https://github.com/hunvreus/basecoat) 的基础上，并保留其对 [shadcn/ui](https://ui.shadcn.com/) 视觉语言的语义 HTML 解释。 A3S 主题和工作台组件扩展了 A3S 产品的基础。

在[MIT License](./LICENSE.md)下发布。
