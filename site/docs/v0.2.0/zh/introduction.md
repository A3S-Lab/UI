# 简介

A3S UI 是面向 A3S 产品、Coding Agent 工作区、运维控制台与文档工具的框架无关设计系统。

它把 A3S Office Playground 中经过验证的交互模式提炼为通用组件，同时不把应用绑定到 React。公共 API 由语义化 HTML、CSS 变量、明确的 `data-*` 属性，以及处理复合交互的轻量原生 JavaScript 运行时组成。

## 包含内容

- 颜色、排版、间距、形状与阴影、动效和可访问性六套设计基础。
- 52 篇指南，覆盖操作、表单、导航、浮层、反馈、数据展示、实用组件与完整工作台模式。
- 源自 Office 的应用模式：App Shell、Activity Bar、Workspace Header、Toolbar、Ribbon、Settings Layout、Resource Card、Split Pane、Task Pane、Status Bar 与 Resource Workbench。
- A3S 浅色和深色主题，并提供八套可选视觉风格。
- 面向服务端渲染应用的 Nunjucks 与 Jinja 模板。
- 提供实时预览、参数、变体、状态和可访问性说明的版本化文档站。

## 设计原则

1. **语义优先。** 先使用原生元素和正确的 ARIA 契约定义行为，再添加视觉样式。
2. **框架无关。** 同一套标记可用于 React、Vue、Astro、Rails、Django、Laravel 或纯 HTML。
3. **适合生产力工具的密度。** 控件保持紧凑，同时让标签、状态与焦点清晰可辨。
4. **通过组件管理配置。** 运维配置应使用结构化表单；原始源码编辑只作为高级能力保留。
5. **分层组合。** 设计基础驱动基础组件，基础组件再组合成完整应用模式。

## 项目基础

A3S UI 提供语义化、受 shadcn/ui 启发的组件模型，并加入产品主题、Office 衍生模式、完整分组文档和面向工作台的交互契约。

[安装 A3S UI](/installation) 或浏览[组件目录](/components/)。

## 参与贡献

- [源代码](https://github.com/A3S-Lab/UI)
- [问题反馈](https://github.com/A3S-Lab/UI/issues)
- [Pull Requests](https://github.com/A3S-Lab/UI/pulls)
