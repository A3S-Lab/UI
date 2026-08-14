import { access, readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const docsRoot = path.join(siteRoot, "docs");
const outputRoot = path.join(siteRoot, "doc_build");
const base = "/UI/";

const requiredFiles = [
  "index.html",
  "en/index.html",
  "v0.2.0/index.html",
  "v0.2.0/en/index.html",
  "v0.1.0/index.html",
  "v0.1.0/en/index.html",
  "installation.html",
  "en/installation.html",
  "v0.2.0/installation.html",
  "v0.2.0/en/installation.html",
  "v0.1.0/installation.html",
  "v0.1.0/en/installation.html",
  "components/index.html",
  "en/components/index.html",
  "harness/index.html",
  "en/harness/index.html",
  "v0.2.0/components/index.html",
  "v0.2.0/en/components/index.html",
  "v0.1.0/components/index.html",
  "v0.1.0/en/components/index.html",
  "components/field.html",
  "en/components/field.html",
  "v0.2.0/components/field.html",
  "v0.2.0/en/components/field.html",
  "v0.1.0/components/field.html",
  "v0.1.0/en/components/field.html",
  "components/radio-group.html",
  "en/components/radio-group.html",
  "v0.2.0/components/radio-group.html",
  "v0.2.0/en/components/radio-group.html",
  "v0.1.0/components/radio-group.html",
  "v0.1.0/en/components/radio-group.html",
  "components/button-group.html",
  "en/components/button-group.html",
  "v0.2.0/components/button-group.html",
  "v0.2.0/en/components/button-group.html",
  "v0.1.0/components/button-group.html",
  "v0.1.0/en/components/button-group.html",
  "components/input-group.html",
  "en/components/input-group.html",
  "v0.2.0/components/input-group.html",
  "v0.2.0/en/components/input-group.html",
  "v0.1.0/components/input-group.html",
  "v0.1.0/en/components/input-group.html",
  "components/tree.html",
  "en/components/tree.html",
  "v0.2.0/components/tree.html",
  "v0.2.0/en/components/tree.html",
  "v0.1.0/components/tree.html",
  "v0.1.0/en/components/tree.html",
  "components/code-editor.html",
  "en/components/code-editor.html",
  "components/device-simulator.html",
  "en/components/device-simulator.html",
  "components/agent-composer.html",
  "en/components/agent-composer.html",
  "components/agent-transcript.html",
  "en/components/agent-transcript.html",
  "components/approval-request.html",
  "en/components/approval-request.html",
  "components/execution-item.html",
  "en/components/execution-item.html",
  "v0.2.0/components/code-editor.html",
  "v0.2.0/en/components/code-editor.html",
  "v0.1.0/components/code-editor.html",
  "v0.1.0/en/components/code-editor.html",
  "components/agent-workbench.html",
  "en/components/agent-workbench.html",
  "v0.2.0/components/agent-workbench.html",
  "v0.2.0/en/components/agent-workbench.html",
  "v0.1.0/components/agent-workbench.html",
  "v0.1.0/en/components/agent-workbench.html",
  "components/brand-lockup.html",
  "en/components/brand-lockup.html",
  "v0.2.0/components/brand-lockup.html",
  "v0.2.0/en/components/brand-lockup.html",
  "v0.1.0/components/brand-lockup.html",
  "v0.1.0/en/components/brand-lockup.html",
  "components/log-viewer.html",
  "en/components/log-viewer.html",
  "v0.2.0/components/log-viewer.html",
  "v0.2.0/en/components/log-viewer.html",
  "v0.1.0/components/log-viewer.html",
  "v0.1.0/en/components/log-viewer.html",
  "components/property-list.html",
  "en/components/property-list.html",
  "v0.2.0/components/property-list.html",
  "v0.2.0/en/components/property-list.html",
  "v0.1.0/components/property-list.html",
  "v0.1.0/en/components/property-list.html",
  "components/status-badge.html",
  "en/components/status-badge.html",
  "v0.2.0/components/status-badge.html",
  "v0.2.0/en/components/status-badge.html",
  "v0.1.0/components/status-badge.html",
  "v0.1.0/en/components/status-badge.html",
  "components/stepper.html",
  "en/components/stepper.html",
  "v0.2.0/components/stepper.html",
  "v0.2.0/en/components/stepper.html",
  "v0.1.0/components/stepper.html",
  "v0.1.0/en/components/stepper.html",
  "components/timeline.html",
  "en/components/timeline.html",
  "v0.2.0/components/timeline.html",
  "v0.2.0/en/components/timeline.html",
  "v0.1.0/components/timeline.html",
  "v0.1.0/en/components/timeline.html",
  "components/slider.html",
  "en/components/slider.html",
  "v0.2.0/components/slider.html",
  "v0.2.0/en/components/slider.html",
  "v0.1.0/components/slider.html",
  "v0.1.0/en/components/slider.html",
  "components/app-shell.html",
  "components/app-page.html",
  "en/components/app-page.html",
  "components/task-start.html",
  "en/components/task-start.html",
  "components/task-workspace.html",
  "en/components/task-workspace.html",
  "components/catalog.html",
  "en/components/catalog.html",
  "components/setting-row.html",
  "en/components/setting-row.html",
  "components/split-pane.html",
  "components/status-bar.html",
  "components/task-pane.html",
  "en/components/status-bar.html",
  "en/components/task-pane.html",
  "foundations/color.html",
  "patterns/task-workspace.html",
  "en/patterns/task-workspace.html",
  "patterns/new-task.html",
  "en/patterns/new-task.html",
  "patterns/capability-catalog.html",
  "en/patterns/capability-catalog.html",
  "patterns/settings-center.html",
  "en/patterns/settings-center.html",
  "patterns/projects.html",
  "en/patterns/projects.html",
  "patterns/automations.html",
  "en/patterns/automations.html",
  "llms.txt",
  "llms-full.txt",
  "en/llms.txt",
  "en/llms-full.txt",
  "a3s-ui-mark.svg",
  "social-card.svg",
  "logo.png",
  "device-preview.html",
  "assets/a3s-ui.css",
  "assets/a3s-cascade.css",
  "assets/a3s-ui.min.js",
];

const homepageExpectations = [
  {
    file: "index.html",
    markers: [
      'lang="zh"',
      "A3S 产品界面系统",
      "复杂界面，",
      "也该有清晰语法。",
      "复制安装命令",
      "npm install @a3s-lab/ui",
      "从一个控件，到整个工作台。",
      "公开组件组合",
      "data-a3s-customizer",
      'data-mobile-expanded="false"',
      'aria-live="polite"',
      'aria-pressed="true"',
      "<dt>89</dt>",
      "v0.2.0",
      "v0.1.0",
    ],
  },
  {
    file: "en/index.html",
    markers: [
      'lang="en"',
      "A3S PRODUCT INTERFACE SYSTEM",
      "Complex UI.",
      "Clear grammar.",
      "Copy install command",
      "npm install @a3s-lab/ui",
      "From one control to a complete workspace.",
      "PUBLIC COMPONENT COMPOSITION",
      "data-a3s-customizer",
      'aria-live="polite"',
      "<dt>89</dt>",
      "v0.2.0",
    ],
  },
  {
    file: "v0.2.0/index.html",
    markers: [
      'lang="zh"',
      "A3S 产品界面系统",
      "复杂界面，",
      "npm install @a3s-lab/ui@0.2.0",
      "<dt>64</dt>",
      "v0.2.0",
    ],
  },
  {
    file: "v0.2.0/en/index.html",
    markers: [
      'lang="en"',
      "A3S PRODUCT INTERFACE SYSTEM",
      "Complex UI.",
      "npm install @a3s-lab/ui@0.2.0",
      "<dt>64</dt>",
      "v0.2.0",
    ],
  },
  {
    file: "v0.1.0/index.html",
    markers: [
      'lang="zh"',
      "A3S 产品界面系统",
      "复杂界面，",
      "npm install @a3s-lab/ui@0.1.0",
      "<dt>64</dt>",
      "v0.1.0",
    ],
  },
  {
    file: "v0.1.0/en/index.html",
    markers: [
      'lang="en"',
      "A3S PRODUCT INTERFACE SYSTEM",
      "Complex UI.",
      "npm install @a3s-lab/ui@0.1.0",
      "<dt>64</dt>",
      "v0.1.0",
    ],
  },
];

const componentExpectations = ["", "v0.2.0/", "v0.1.0/"].flatMap(
  (versionPrefix) => [
    {
      file: `${versionPrefix}components/field.html`,
      markers: [
        'lang="zh"',
        'data-slider-demo="field"',
        "价格范围",
        "最高预算：",
        'aria-valuetext="US$800"',
        "单选按钮",
        "订阅方案",
        "字段组",
        "卡片式选项",
        "交互式组件预览",
        "实时预览",
      ],
    },
    {
      file: `${versionPrefix}en/components/field.html`,
      markers: [
        'lang="en"',
        'data-slider-demo="field"',
        "Price range",
        "Maximum budget:",
        'aria-valuetext="$800"',
        "Interactive component preview",
        "Live preview",
      ],
    },
    {
      file: `${versionPrefix}components/radio-group.html`,
      markers: [
        'lang="zh"',
        "单选组",
        'aria-label="视图密度"',
        ">宽松<",
        "卡片式选项",
        "订阅方案",
        "通知方式",
      ],
    },
    {
      file: `${versionPrefix}en/components/radio-group.html`,
      markers: [
        'lang="en"',
        "Radio Group",
        'aria-label="View density"',
        ">Comfortable<",
        "Choice Card",
        "Subscription Plan",
        "Notification Preferences",
      ],
    },
    {
      file: `${versionPrefix}components/button-group.html`,
      markers: [
        'lang="zh"',
        "按钮组负责连接子控件的边界与交互状态",
        'aria-label="搜索"',
        'placeholder="搜索…"',
        "拆分按钮",
      ],
    },
    {
      file: `${versionPrefix}en/components/button-group.html`,
      markers: [
        'lang="en"',
        'aria-label="Search"',
        'placeholder="Search..."',
        "Split",
      ],
    },
    {
      file: `${versionPrefix}components/input-group.html`,
      markers: [
        'lang="zh"',
        "12 条结果",
        "行内起始",
        "块级末端",
        'placeholder="输入密码"',
      ],
    },
    {
      file: `${versionPrefix}en/components/input-group.html`,
      markers: [
        'lang="en"',
        "12 results",
        "Inline start",
        "Block end",
        'placeholder="Enter password"',
      ],
    },
    {
      file: `${versionPrefix}components/slider.html`,
      markers: [
        'lang="zh"',
        'data-slider-demo="standalone"',
        'data-slider-demo="labeled"',
        'aria-label="音量"',
        ">温度<",
        'dir="rtl"',
      ],
    },
    {
      file: `${versionPrefix}en/components/slider.html`,
      markers: [
        'lang="en"',
        'data-slider-demo="standalone"',
        'data-slider-demo="labeled"',
        'aria-label="Volume"',
        ">Temperature<",
        'dir="rtl"',
      ],
    },
  ],
);

const nextCatalogExpectations = [
  {
    file: "components/index.html",
    markers: [
      'id="工具"',
      'id="harness"',
      'href="/UI/harness/index.html"',
      'href="/UI/components/scroll-area.html"',
      'href="/UI/components/theme-switcher.html"',
    ],
  },
  {
    file: "en/components/index.html",
    markers: [
      'id="utilities"',
      'id="harness"',
      'href="/UI/en/harness/index.html"',
      'href="/UI/en/components/scroll-area.html"',
      'href="/UI/en/components/theme-switcher.html"',
    ],
  },
];

const nextHarnessExpectations = [
  {
    file: "harness/index.html",
    markers: [
      'lang="zh"',
      ">Harness<",
      "任务与对话",
      "执行与审阅",
      'href="/UI/components/device-simulator.html"',
    ],
  },
  {
    file: "en/harness/index.html",
    markers: [
      'lang="en"',
      ">Harness<",
      "Task and conversation",
      "Execution and review",
      'href="/UI/en/components/device-simulator.html"',
    ],
  },
  {
    file: "components/device-simulator.html",
    markers: [
      'lang="zh"',
      'class="device-simulator"',
      "data-device-simulator-select",
      "data-device-simulator-preview",
      "data-device-simulator-native",
      "a3s:device-preview-request",
      "a3s-webview",
    ],
  },
  {
    file: "en/components/device-simulator.html",
    markers: [
      'lang="en"',
      ">Device Simulator<",
      'class="device-simulator"',
      "data-device-simulator-width",
      "data-device-simulator-height",
      "data-device-simulator-command",
      "a3s:device-preview-request",
    ],
  },
];

const nextTreeExpectations = [
  {
    file: "components/tree.html",
    markers: [
      'lang="zh"',
      "树形控件",
      'role="tree"',
      'aria-label="项目文件"',
      "data-tree-row",
      "data-tree-label",
      "a3s:tree-toggle",
    ],
  },
  {
    file: "en/components/tree.html",
    markers: [
      'lang="en"',
      ">Tree<",
      'role="tree"',
      'aria-label="Project files"',
      "data-tree-row",
      "data-tree-label",
      "a3s:tree-toggle",
    ],
  },
  {
    file: "v0.2.0/components/tree.html",
    markers: ["v0.2.0 不包含此组件", "不属于该历史版本的公开契约"],
  },
  {
    file: "v0.2.0/en/components/tree.html",
    markers: [
      "Not available in v0.2.0",
      "not part of this published package contract",
    ],
  },
  {
    file: "v0.1.0/components/tree.html",
    markers: ["v0.1.0 不包含此组件", "不属于该历史版本的公开契约"],
  },
  {
    file: "v0.1.0/en/components/tree.html",
    markers: [
      "Not available in v0.1.0",
      "not part of this published package contract",
    ],
  },
];

const nextCodeEditorExpectations = [
  {
    file: "components/code-editor.html",
    markers: [
      'lang="zh"',
      "代码编辑器",
      'data-workbench-locale="zh"',
      "data-monaco-host",
      "data-workbench-command-trigger",
      "示例工作区",
      'class="code-editor"',
      "data-code-editor-lines",
      "data-code-editor-position",
      'data-validation="json"',
      "export async function run(input: unknown) {",
      'aria-label="只读 YAML" readOnly=""',
    ],
  },
  {
    file: "en/components/code-editor.html",
    markers: [
      'lang="en"',
      ">Code Editor<",
      'data-workbench-locale="en"',
      "data-monaco-host",
      "data-workbench-command-trigger",
      "Illustrative workspace",
      'class="code-editor"',
      "data-code-editor-lines",
      "data-code-editor-position",
      'data-validation="json"',
      "export async function run(input: unknown) {",
      'aria-label="Read-only YAML" readOnly=""',
    ],
  },
  {
    file: "v0.2.0/components/code-editor.html",
    markers: ["v0.2.0 不包含此组件", "不属于该历史版本的公开契约"],
  },
  {
    file: "v0.2.0/en/components/code-editor.html",
    markers: [
      "Not available in v0.2.0",
      "not part of this published package contract",
    ],
  },
  {
    file: "v0.1.0/components/code-editor.html",
    markers: ["v0.1.0 不包含此组件", "不属于该历史版本的公开契约"],
  },
  {
    file: "v0.1.0/en/components/code-editor.html",
    markers: [
      "Not available in v0.1.0",
      "not part of this published package contract",
    ],
  },
];

const nextExtractedComponentExpectations = [
  {
    file: "components/agent-composer.html",
    markers: [
      'lang="zh"',
      'class="agent-composer"',
      'aria-label="已附加上下文"',
      "data-composer-queue",
    ],
  },
  {
    file: "en/components/agent-composer.html",
    markers: [
      'lang="en"',
      ">Agent Composer<",
      'class="agent-composer"',
      'aria-label="Attached context"',
    ],
  },
  {
    file: "components/agent-transcript.html",
    markers: [
      'lang="zh"',
      'class="agent-transcript"',
      'data-role="user"',
      'data-role="agent"',
    ],
  },
  {
    file: "en/components/agent-transcript.html",
    markers: [
      'lang="en"',
      ">Agent Transcript<",
      'class="agent-transcript"',
      "data-transcript-viewport",
    ],
  },
  {
    file: "components/agent-workbench.html",
    markers: [
      'lang="zh"',
      'class="agent-workbench"',
      "data-agent-canvas",
      "data-agent-activity",
    ],
  },
  {
    file: "en/components/agent-workbench.html",
    markers: [
      'lang="en"',
      ">Agent Workbench<",
      'class="agent-workbench"',
      "data-agent-inspector",
    ],
  },
  {
    file: "components/approval-request.html",
    markers: [
      'lang="zh"',
      'class="approval-request"',
      'data-state="pending"',
      'checked="" value="once"',
    ],
  },
  {
    file: "en/components/approval-request.html",
    markers: [
      'lang="en"',
      ">Approval Request<",
      'class="approval-request"',
      ">Permission scope<",
    ],
  },
  {
    file: "components/execution-item.html",
    markers: [
      'lang="zh"',
      'class="execution-item"',
      'data-state="running"',
      "data-execution-status",
    ],
  },
  {
    file: "en/components/execution-item.html",
    markers: [
      'lang="en"',
      ">Execution Item<",
      'class="execution-item"',
      "data-execution-disclosure",
    ],
  },
  {
    file: "components/brand-lockup.html",
    markers: [
      'lang="zh"',
      'class="brand-lockup"',
      "data-brand-mark",
      "data-brand-name",
    ],
  },
  {
    file: "en/components/brand-lockup.html",
    markers: [
      'lang="en"',
      ">Brand Lockup<",
      'class="brand-lockup"',
      "data-brand-identity",
    ],
  },
  {
    file: "components/log-viewer.html",
    markers: [
      'lang="zh"',
      'class="log-viewer"',
      "data-log-record",
      'role="log"',
    ],
  },
  {
    file: "en/components/log-viewer.html",
    markers: [
      'lang="en"',
      ">Log Viewer<",
      'class="log-viewer"',
      "data-log-gap",
    ],
  },
  {
    file: "components/property-list.html",
    markers: ['lang="zh"', 'class="property-list"', "<dt>", "<dd>"],
  },
  {
    file: "en/components/property-list.html",
    markers: [
      'lang="en"',
      ">Property List<",
      'class="property-list"',
      "<dt>Provider</dt>",
    ],
  },
  {
    file: "components/status-badge.html",
    markers: [
      'lang="zh"',
      'class="status-badge"',
      'data-state="active"',
      'data-state="danger"',
    ],
  },
  {
    file: "en/components/status-badge.html",
    markers: [
      'lang="en"',
      ">Status Badge<",
      'class="status-badge"',
      "data-indicator",
    ],
  },
  {
    file: "components/stepper.html",
    markers: [
      'lang="zh"',
      'class="stepper"',
      "data-step-marker",
      'aria-current="step"',
    ],
  },
  {
    file: "en/components/stepper.html",
    markers: [
      'lang="en"',
      ">Stepper<",
      'class="stepper"',
      'data-state="active"',
    ],
  },
  {
    file: "components/timeline.html",
    markers: [
      'lang="zh"',
      'class="timeline"',
      'data-state="success"',
      'aria-current="step"',
    ],
  },
  {
    file: "en/components/timeline.html",
    markers: [
      'lang="en"',
      ">Timeline<",
      'class="timeline"',
      'data-state="active"',
    ],
  },
];

const nextTaskPatternExpectations = [
  {
    file: "patterns/task-workspace.html",
    markers: [
      'lang="zh"',
      'class="app-shell"',
      'class="task-workspace"',
      'class="approval-request"',
      "data-app-navigation-trigger",
    ],
  },
  {
    file: "en/patterns/task-workspace.html",
    markers: [
      'lang="en"',
      ">Task Workspace<",
      'aria-label="Task transcript"',
      "data-task-inspector",
      "illustrative data",
    ],
  },
  {
    file: "patterns/new-task.html",
    markers: [
      'lang="zh"',
      'class="task-start',
      'class="agent-composer"',
      "data-task-suggestions",
    ],
  },
  {
    file: "en/patterns/new-task.html",
    markers: [
      'lang="en"',
      ">New Task<",
      'aria-label="Instruction"',
      'aria-label="Start a new task"',
    ],
  },
  {
    file: "en/patterns/capability-catalog.html",
    markers: [">Capability Catalog<", 'role="tablist"', "data-catalog-results"],
  },
  {
    file: "en/patterns/settings-center.html",
    markers: [
      ">Settings Center<",
      'class="settings-layout',
      'class="setting-row"',
    ],
  },
  {
    file: "en/patterns/projects.html",
    markers: [">Projects<", 'class="app-page', 'class="resource-grid"'],
  },
  {
    file: "en/patterns/automations.html",
    markers: [
      ">Automations<",
      'class="table-container"',
      "Recent automation runs",
    ],
  },
];
const disallowedPublicProductNames = [
  ["cod", "ex"].join(""),
  ["work", "buddy"].join(""),
];
const nextExtractedComponentHistoricalExpectations = [
  "agent-workbench",
  "brand-lockup",
  "log-viewer",
  "property-list",
  "status-badge",
  "stepper",
  "timeline",
].flatMap((route) =>
  ["v0.2.0", "v0.1.0"].flatMap((version) => [
    {
      file: `${version}/components/${route}.html`,
      markers: [`${version} 不包含此组件`, "不属于该历史版本的公开契约"],
    },
    {
      file: `${version}/en/components/${route}.html`,
      markers: [`Not available in ${version}`, "package contract"],
    },
  ]),
);

const switchExpectations = [
  {
    file: "components/app-shell.html",
    links: [
      "/UI/en/components/app-shell.html",
      "/UI/v0.2.0/components/app-shell.html",
      "/UI/v0.1.0/components/app-shell.html",
    ],
  },
  {
    file: "en/components/app-shell.html",
    links: [
      "/UI/components/app-shell.html",
      "/UI/v0.2.0/en/components/app-shell.html",
      "/UI/v0.1.0/en/components/app-shell.html",
    ],
  },
  {
    file: "v0.2.0/components/app-shell.html",
    links: [
      "/UI/components/app-shell.html",
      "/UI/v0.2.0/en/components/app-shell.html",
      "/UI/v0.1.0/components/app-shell.html",
    ],
  },
  {
    file: "v0.2.0/en/components/app-shell.html",
    links: [
      "/UI/en/components/app-shell.html",
      "/UI/v0.2.0/components/app-shell.html",
      "/UI/v0.1.0/en/components/app-shell.html",
    ],
  },
  {
    file: "v0.1.0/components/app-shell.html",
    links: [
      "/UI/components/app-shell.html",
      "/UI/v0.2.0/components/app-shell.html",
      "/UI/v0.1.0/en/components/app-shell.html",
    ],
  },
  {
    file: "v0.1.0/en/components/app-shell.html",
    links: [
      "/UI/en/components/app-shell.html",
      "/UI/v0.2.0/en/components/app-shell.html",
      "/UI/v0.1.0/components/app-shell.html",
    ],
  },
];

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(absolutePath)));
    } else if (entry.name.endsWith(".html")) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function collectMdxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMdxFiles(absolutePath)));
    } else if (entry.name.endsWith(".mdx")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function builtPathForMdx(mdxFile) {
  const [version, locale, ...routeParts] = path
    .relative(docsRoot, mdxFile)
    .split(path.sep);
  const outputParts = [];

  if (version !== "next") outputParts.push(version);
  if (locale === "en") outputParts.push(locale);
  outputParts.push(...routeParts);

  const outputFile = outputParts.join(path.sep).replace(/\.mdx$/, ".html");
  return path.join(outputRoot, outputFile);
}

async function resolvesToBuiltFile(relativeReference) {
  const decodedReference = decodeURIComponent(relativeReference);
  const candidates =
    decodedReference === "" || decodedReference.endsWith("/")
      ? [path.join(decodedReference, "index.html")]
      : [
          decodedReference,
          `${decodedReference}.html`,
          path.join(decodedReference, "index.html"),
        ];

  for (const candidate of candidates) {
    const outputPath = path.resolve(outputRoot, candidate);
    if (
      outputPath !== outputRoot &&
      !outputPath.startsWith(`${outputRoot}${path.sep}`)
    ) {
      continue;
    }

    try {
      if ((await stat(outputPath)).isFile()) return true;
    } catch {
      // Try the next supported Rspress output form.
    }
  }

  return false;
}

for (const file of requiredFiles) {
  await access(path.join(outputRoot, file));
}

const logoDigest = createHash("sha256")
  .update(await readFile(path.join(outputRoot, "logo.png")))
  .digest("hex");
if (
  logoDigest !==
  "72b94cf69a95dc6153f865c4f8742c0f67079caa876f35f8b2b5f970ea795a2d"
) {
  throw new Error("The built site does not contain the official A3S OS logo.");
}

const homepageHtml = await readFile(
  path.join(outputRoot, "index.html"),
  "utf8",
);
const cascadeIndex = homepageHtml.indexOf(
  `href="${base}assets/a3s-cascade.css"`,
);
const componentIndex = homepageHtml.indexOf(`href="${base}assets/a3s-ui.css"`);
const catalogIndex = homepageHtml.indexOf("ui-section ui-catalog");
const customizerIndex = homepageHtml.indexOf("ui-theme-customizer");

if (
  cascadeIndex === -1 ||
  componentIndex === -1 ||
  cascadeIndex > componentIndex
) {
  throw new Error(
    "The cascade-order stylesheet must load before the A3S component stylesheet.",
  );
}

if (
  catalogIndex === -1 ||
  customizerIndex === -1 ||
  catalogIndex > customizerIndex
) {
  throw new Error(
    "The component catalog must appear before the theme customizer on the homepage.",
  );
}

const runtimePreloadMarkup = `<link rel="preload" as="script" href="${base}assets/a3s-ui.min.js">`;
if (!homepageHtml.includes(runtimePreloadMarkup)) {
  throw new Error(
    "The A3S runtime must be preloaded for the post-hydration documentation loader.",
  );
}

if (!homepageHtml.includes("document.addEventListener('a3s:themechange'")) {
  throw new Error("The pre-hydration documentation theme bridge is missing.");
}

const rspressBootstrapMarker =
  "const saved = localStorage.getItem('rspress-theme-appearance')";
const rspressBootstrapIndex = homepageHtml.indexOf(rspressBootstrapMarker);
const rspressBootstrapOpen = homepageHtml.lastIndexOf(
  "<script",
  rspressBootstrapIndex,
);
const rspressBootstrapClose = homepageHtml.indexOf(
  "</script>",
  rspressBootstrapIndex,
);
if (
  rspressBootstrapIndex === -1 ||
  rspressBootstrapOpen === -1 ||
  rspressBootstrapClose === -1
) {
  throw new Error("The Rspress theme bootstrap must remain executable.");
}

for (const { file, markers } of [
  ...homepageExpectations,
  ...componentExpectations,
  ...nextCatalogExpectations,
  ...nextHarnessExpectations,
  ...nextTreeExpectations,
  ...nextCodeEditorExpectations,
  ...nextExtractedComponentExpectations,
  ...nextTaskPatternExpectations,
  ...nextExtractedComponentHistoricalExpectations,
]) {
  const html = await readFile(path.join(outputRoot, file), "utf8");
  for (const marker of markers) {
    if (!html.includes(marker)) {
      throw new Error(`${file} is missing expected marker: ${marker}`);
    }
  }
}

for (const { file, links } of switchExpectations) {
  const html = await readFile(path.join(outputRoot, file), "utf8");
  for (const link of links) {
    if (!html.includes(`href="${link}"`)) {
      throw new Error(`${file} is missing language/version link: ${link}`);
    }
  }
}

const compiledStyles = await readFile(
  path.join(outputRoot, "assets", "a3s-ui.css"),
  "utf8",
);
const styleExpectations = [
  {
    label: "Rspress reset layer is registered before Tailwind layers",
    matches: compiledStyles.startsWith("@layer rp-base;"),
  },
  {
    label: "A3S light primary action token is present",
    matches: compiledStyles.includes("--primary:#2864e8"),
  },
  {
    label: "A3S dark primary action token is present",
    matches: compiledStyles.includes("--primary:#6ca3ff"),
  },
  {
    label: "primary button contract is present",
    matches: compiledStyles.includes(
      ".btn:not([data-variant]),.btn[data-variant=primary]{background-color:var(--color-primary);color:var(--color-primary-foreground)}",
    ),
  },
  {
    label: "Device Simulator structure and Harness visuals are present",
    matches:
      compiledStyles.includes(".device-simulator") &&
      compiledStyles.includes("[data-device-simulator-workspace]"),
  },
];

for (const expectation of styleExpectations) {
  if (!expectation.matches) {
    throw new Error(`Built CSS invariant failed: ${expectation.label}`);
  }
}

const brokenReferences = [];
const publicBrandingLeaks = [];
const chineseTerminologyLeaks = [];
const disallowedChineseTerms = [
  "收音机",
  "无线电组",
  "无线电图标",
  "无线电输入",
  "现场组",
  "间歇范围输入",
  "微调器",
  "旋转器",
  "选择卡",
];
const htmlFiles = await collectHtmlFiles(outputRoot);
const mdxFiles = await collectMdxFiles(docsRoot);
const referencePattern = /(?:href|src)="([^"]+)"/g;
const previewSourceViolations = [];
let mdxPreviewCount = 0;

for (const mdxFile of mdxFiles) {
  const source = await readFile(mdxFile, "utf8");
  const sourcePreviewCount = (source.match(/<Preview\b/g) ?? []).length;
  const builtFile = builtPathForMdx(mdxFile);
  let html;

  try {
    html = await readFile(builtFile, "utf8");
  } catch {
    previewSourceViolations.push(
      `${path.relative(docsRoot, mdxFile)}: corresponding built page is missing`,
    );
    continue;
  }

  const builtPreviewCount = (html.match(/class="a3s-preview"/g) ?? []).length;
  mdxPreviewCount += sourcePreviewCount;
  if (sourcePreviewCount !== builtPreviewCount) {
    previewSourceViolations.push(
      `${path.relative(docsRoot, mdxFile)}: ${sourcePreviewCount} MDX previews, ${builtPreviewCount} built previews`,
    );
  }
}

let builtPreviewCount = 0;

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, "utf8");
  const relativeHtmlFile = path.relative(outputRoot, htmlFile);
  const previewCount = (html.match(/class="a3s-preview"/g) ?? []).length;
  builtPreviewCount += previewCount;
  const previewDetailsCount = (
    html.match(/<details class="a3s-preview__source"/g) ?? []
  ).length;
  const previewSourcePanelCount = (
    html.match(/data-preview-source-panel="true"/g) ?? []
  ).length;
  const previewStageCount = (html.match(/class="a3s-preview__stage"/g) ?? [])
    .length;
  const previewSourceCount = (html.match(/class="a3s-preview__source"/g) ?? [])
    .length;
  if (
    previewCount !== previewDetailsCount ||
    previewCount !== previewSourcePanelCount ||
    previewCount !== previewStageCount ||
    previewCount !== previewSourceCount ||
    (previewCount > 0 && !html.includes("rp-code-copy-button")) ||
    (previewCount > 0 && !html.includes("shiki"))
  ) {
    previewSourceViolations.push(
      `${relativeHtmlFile}: ${previewCount} previews, ${previewDetailsCount} source details, ${previewSourcePanelCount} source markers, ${previewStageCount} stages, ${previewSourceCount} source panels, copy=${html.includes("rp-code-copy-button")}, shiki=${html.includes("shiki")}`,
    );
  }
  const visibleText = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  if (/basecoat/i.test(visibleText)) {
    publicBrandingLeaks.push(relativeHtmlFile);
  }
  for (const productName of disallowedPublicProductNames) {
    if (visibleText.toLowerCase().includes(productName)) {
      publicBrandingLeaks.push(`${relativeHtmlFile} -> ${productName}`);
    }
  }
  if (!relativeHtmlFile.split(path.sep).includes("en")) {
    for (const term of disallowedChineseTerms) {
      if (visibleText.includes(term)) {
        chineseTerminologyLeaks.push(`${relativeHtmlFile} -> ${term}`);
      }
    }
  }
  const htmlWithGeneratedSelfLinksOmitted = html
    .replace(
      /<li class="rp-hover-group__item rp-hover-group__item--active"[^>]*>[\s\S]*?<\/li>/g,
      (item) => item.replace(/href="[^"]+"/, 'href="#current-version"'),
    )
    .replace(
      /<a[^>]*class="[^"]*rp-nav-screen-versions-group__item--active[^"]*"[^>]*>/g,
      (item) => item.replace(/href="[^"]+"/, 'href="#current-version"'),
    );

  for (const [, rawReference] of htmlWithGeneratedSelfLinksOmitted.matchAll(
    referencePattern,
  )) {
    if (
      rawReference.startsWith("#") ||
      rawReference.startsWith("data:") ||
      rawReference.startsWith("mailto:") ||
      rawReference.startsWith("tel:") ||
      /^[a-z]+:\/\//i.test(rawReference)
    ) {
      continue;
    }

    if (rawReference.startsWith("/") && !rawReference.startsWith(base)) {
      brokenReferences.push(
        `${path.relative(outputRoot, htmlFile)} -> ${rawReference} (outside ${base})`,
      );
      continue;
    }

    if (!rawReference.startsWith(base)) continue;

    const withoutBase = rawReference
      .slice(base.length)
      .split(/[?#]/, 1)[0]
      .replace(/\/+/g, "/");
    if (!(await resolvesToBuiltFile(withoutBase))) {
      brokenReferences.push(
        `${path.relative(outputRoot, htmlFile)} -> ${rawReference}`,
      );
    }
  }
}

if (mdxPreviewCount !== builtPreviewCount) {
  previewSourceViolations.push(
    `site total: ${mdxPreviewCount} MDX previews, ${builtPreviewCount} built previews`,
  );
}

if (brokenReferences.length > 0) {
  throw new Error(
    `Built-site reference check failed:\n${brokenReferences
      .map((reference) => `  - ${reference}`)
      .join("\n")}`,
  );
}

if (previewSourceViolations.length > 0) {
  throw new Error(
    `Preview source-view coverage failed:\n${previewSourceViolations
      .map((violation) => `  - ${violation}`)
      .join("\n")}`,
  );
}

if (publicBrandingLeaks.length > 0) {
  throw new Error(
    `Public website branding check failed:\n${publicBrandingLeaks
      .map((file) => `  - ${file}`)
      .join("\n")}`,
  );
}

if (chineseTerminologyLeaks.length > 0) {
  throw new Error(
    `Chinese terminology check failed:\n${chineseTerminologyLeaks
      .map((leak) => `  - ${leak}`)
      .join("\n")}`,
  );
}

console.log(
  `Verified ${requiredFiles.length} required files, ${mdxPreviewCount} MDX preview contracts, ${styleExpectations.length} CSS invariants, Chinese terminology, public branding, and references across ${htmlFiles.length} HTML pages.`,
);
