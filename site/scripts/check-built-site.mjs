import { access, readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const docsRoot = path.join(siteRoot, "docs");
const standalonePagesRoot = path.join(siteRoot, "pages");
const outputRoot = path.join(siteRoot, "doc_build");
const base = "/UI/";
const removedIntegrationName = ["lang", "flow"].join("");
const removedFormRoute = ["playground", "forms"].join("/");

const requiredFiles = [
  "index.html",
  "en/index.html",
  "components/form-system/index.html",
  "en/components/form-system/index.html",
  "components/form-system/framework-hooks.html",
  "en/components/form-system/framework-hooks.html",
  "v0.2.0/index.html",
  "v0.2.0/en/index.html",
  "v0.1.0/index.html",
  "v0.1.0/en/index.html",
  "installation.html",
  "en/installation.html",
  "playground.html",
  "en/playground.html",
  "playground/assistant.html",
  "en/playground/assistant.html",
  "playground/automations.html",
  "en/playground/automations.html",
  "playground/capabilities.html",
  "en/playground/capabilities.html",
  "playground/memory.html",
  "en/playground/memory.html",
  "playground/extensions.html",
  "en/playground/extensions.html",
  "playground/projects.html",
  "en/playground/projects.html",
  "playground/projects/a3s-ui-experience.html",
  "en/playground/projects/a3s-ui-experience.html",
  "playground/projects/a3s-ui-experience/sessions/release-readiness.html",
  "en/playground/projects/a3s-ui-experience/sessions/release-readiness.html",
  "playground/sessions/fix-session-recovery.html",
  "en/playground/sessions/fix-session-recovery.html",
  "playground/resources/files.html",
  "en/playground/resources/files.html",
  "playground/resources/mail.html",
  "en/playground/resources/mail.html",
  "playground/resources/documents.html",
  "en/playground/resources/documents.html",
  "playground/resources/knowledge.html",
  "en/playground/resources/knowledge.html",
  "playground/resources/inspiration.html",
  "en/playground/resources/inspiration.html",
  "app.html",
  "en/app.html",
  "app/projects/a3s-ui-experience.html",
  "en/app/projects/a3s-ui-experience.html",
  "app/projects/a3s-ui-experience/sessions/release-readiness.html",
  "en/app/projects/a3s-ui-experience/sessions/release-readiness.html",
  "sessions/fix-session-recovery.html",
  "en/sessions/fix-session-recovery.html",
  "sessions/fix-session-recovery/workspace.html",
  "en/sessions/fix-session-recovery/workspace.html",
  "v0.2.0/installation.html",
  "v0.2.0/en/installation.html",
  "v0.1.0/installation.html",
  "v0.1.0/en/installation.html",
  "components/index.html",
  "en/components/index.html",
  "harness/index.html",
  "en/harness/index.html",
  "harness/dock-workspace.html",
  "en/harness/dock-workspace.html",
  "harness/grid-view.html",
  "en/harness/grid-view.html",
  "harness/split-view.html",
  "en/harness/split-view.html",
  "harness/pane-view.html",
  "en/harness/pane-view.html",
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
  "components/file-manager.html",
  "en/components/file-manager.html",
  "components/knowledge-library.html",
  "en/components/knowledge-library.html",
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
  "llms.txt",
  "llms-full.txt",
  "en/llms.txt",
  "en/llms-full.txt",
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
      "复杂界面，",
      "也该有清晰语法。",
      "复制安装命令",
      "npm install @a3s-lab/ui",
      "从一个控件，到整个工作台。",
      "结构化表单",
      'href="/UI/harness/index.html"',
      "公开组件组合",
      "data-a3s-customizer",
      'data-mobile-expanded="false"',
      'aria-live="polite"',
      'aria-pressed="true"',
      "<dt>116</dt>",
      "v0.2.0",
      "v0.1.0",
    ],
  },
  {
    file: "en/index.html",
    markers: [
      'lang="en"',
      "Complex UI.",
      "Clear grammar.",
      "Copy install command",
      "npm install @a3s-lab/ui",
      "From one control to a complete workspace.",
      "Structured forms",
      'href="/UI/en/harness/index.html"',
      "PUBLIC COMPONENT COMPOSITION",
      "data-a3s-customizer",
      'aria-live="polite"',
      "<dt>116</dt>",
      "v0.2.0",
    ],
  },
  {
    file: "v0.2.0/index.html",
    markers: [
      'lang="zh"',
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
      markers:
        versionPrefix === ""
          ? [
              'lang="zh"',
              'data-field-primary-demo="zh"',
              'data-preview-component="field"',
              'data-preview-integration="complete"',
              'data-component-integration="field"',
              "工作区显示名称",
              "填写要求",
              "禁用和只读",
              "发布窗口",
              'data-orientation="responsive"',
              'dir="rtl"',
            ]
          : [
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
      markers:
        versionPrefix === ""
          ? [
              'lang="en"',
              'data-field-primary-demo="en"',
              'data-preview-component="field"',
              'data-preview-integration="complete"',
              'data-component-integration="field"',
              "Workspace display name",
              "Requirement clarity",
              "Disabled and read-only",
              "Release window",
              'data-orientation="responsive"',
              'dir="rtl"',
            ]
          : [
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
      markers:
        versionPrefix === ""
          ? [
              'lang="zh"',
              "单选组",
              'aria-labelledby="density-label-zh"',
              ">宽松<",
              "卡片式选项",
              "订阅方案",
              "通知方式",
            ]
          : [
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
      markers:
        versionPrefix === ""
          ? [
              'lang="en"',
              "Radio Group",
              'aria-labelledby="density-label-en"',
              ">Comfortable<",
              "Choice cards",
              "Subscription plan",
              "Notification preference",
            ]
          : [
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
      markers:
        versionPrefix === ""
          ? [
              'lang="zh"',
              "按钮组把作用于同一对象、层级相同的相邻操作连接起来",
              'aria-label="消息操作"',
              'aria-label="选择发布方式"',
              "拆分操作",
            ]
          : [
              'lang="zh"',
              "按钮组负责连接子控件的边界与交互状态",
              'aria-label="搜索"',
              'placeholder="搜索…"',
              "拆分按钮",
            ],
    },
    {
      file: `${versionPrefix}en/components/button-group.html`,
      markers:
        versionPrefix === ""
          ? [
              'lang="en"',
              "Button Group joins adjacent actions that operate on the same object",
              'aria-label="Message actions"',
              'aria-label="Choose publishing method"',
              "Split action",
            ]
          : [
              'lang="en"',
              'aria-label="Search"',
              'placeholder="Search..."',
              "Split",
            ],
    },
    {
      file: `${versionPrefix}components/input-group.html`,
      markers:
        versionPrefix === ""
          ? [
              'lang="zh"',
              'data-preview-component="input-group"',
              'data-preview-integration="complete"',
              'data-component-integration="input-group"',
              'id="input-group-project-search-zh"',
              "校验与恢复",
              "禁用与只读",
              "有界多行输入",
            ]
          : [
              'lang="zh"',
              "12 条结果",
              "行内起始",
              "块级末端",
              'placeholder="输入密码"',
            ],
    },
    {
      file: `${versionPrefix}en/components/input-group.html`,
      markers:
        versionPrefix === ""
          ? [
              'lang="en"',
              'data-preview-component="input-group"',
              'data-preview-integration="complete"',
              'data-component-integration="input-group"',
              'id="input-group-project-search-en"',
              "Validation and recovery",
              "Disabled and read-only",
              "Bounded multiline input",
            ]
          : [
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
      "data-component-catalog",
      'placeholder="按名称、英文名或分组搜索…"',
      "9 个职责分组，可搜索 116 个组件",
      'data-component-group="harness"',
      'href="/UI/components/scroll-area.html"',
      'href="/UI/components/theme-switcher.html"',
    ],
  },
  {
    file: "en/components/index.html",
    markers: [
      "data-component-catalog",
      'placeholder="Search by name, slug, or group…"',
      "9 task groups across 116 searchable components",
      'data-component-group="harness"',
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
      "会话与消息",
      "执行与授权",
      "审阅与证据",
      'href="/UI/components/device-simulator.html"',
    ],
  },
  {
    file: "en/harness/index.html",
    markers: [
      'lang="en"',
      ">Harness<",
      "Conversation and messages",
      "Execution and approval",
      "Review and evidence",
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
      'aria-label="已附加资源"',
      "data-composer-queue",
    ],
  },
  {
    file: "en/components/agent-composer.html",
    markers: [
      'lang="en"',
      ">Task Composer<",
      'class="agent-composer"',
      'aria-label="Attached resources"',
    ],
  },
  {
    file: "components/file-manager.html",
    markers: [
      'lang="zh"',
      'class="file-manager"',
      "data-file-manager-viewport",
      "a3s:file-manager-before-action",
    ],
  },
  {
    file: "en/components/file-manager.html",
    markers: [
      'lang="en"',
      ">File Manager<",
      'class="file-manager"',
      "a3s:file-manager-before-action",
    ],
  },
  {
    file: "components/knowledge-library.html",
    markers: [
      'lang="zh"',
      'class="knowledge-library"',
      "data-knowledge-library-viewport",
      "a3s:knowledge-before-action",
    ],
  },
  {
    file: "en/components/knowledge-library.html",
    markers: [
      'lang="en"',
      ">Knowledge Library<",
      'class="knowledge-library"',
      "a3s:knowledge-before-action",
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

const playgroundExpectations = [
  {
    file: "playground.html",
    markers: [
      'lang="zh"',
      'class="a3s-product-application-page"',
      'class="agent-workbench a3s-product-application rp-not-doc"',
      "data-product-application",
      'data-direction-contract="user-pinned-operate-v5-3-3"',
      'data-view="start"',
      'aria-label="应用导航"',
      'aria-label="主要页面"',
      'href="/UI/playground/projects.html"',
      'href="/UI/playground/memory.html"',
      'href="/UI/playground/extensions.html"',
      'href="/UI/playground/resources/files.html"',
      'data-product-surface="start"',
      'aria-label="任务输入"',
      "A3S，我帮你",
    ],
  },
  {
    file: "en/playground.html",
    markers: [
      'lang="en"',
      'class="a3s-product-application-page"',
      'class="agent-workbench a3s-product-application rp-not-doc"',
      "data-product-application",
      'data-direction-contract="user-pinned-operate-v5-3-3"',
      'data-view="start"',
      'aria-label="Application navigation"',
      'aria-label="Primary pages"',
      'href="/UI/en/playground/projects.html"',
      'href="/UI/en/playground/memory.html"',
      'href="/UI/en/playground/extensions.html"',
      'href="/UI/en/playground/resources/files.html"',
      'data-product-surface="start"',
      'aria-label="Task composer"',
      "A3S, here to help",
    ],
  },
];
const productApplicationExpectations = [
  {
    file: "playground/automations.html",
    markers: [
      'data-view="automation"',
      'data-product-surface="automation"',
      'aria-label="自动化视图"',
      ">从模板开始<",
      "data-automation-runtime",
    ],
  },
  {
    file: "en/playground/automations.html",
    markers: [
      'data-view="automation"',
      'data-product-surface="automation"',
      'aria-label="Automation view"',
      ">Start from a template<",
      "data-automation-runtime",
    ],
  },
  {
    file: "playground/projects/a3s-ui-experience.html",
    markers: [
      'data-view="project"',
      'data-product-surface="project"',
      'aria-label="项目路径"',
      'aria-label="项目工作区"',
      'aria-label="项目配置"',
      ">AnyBuddy<",
      'href="/UI/playground/projects/a3s-ui-experience/sessions/release-readiness.html"',
    ],
  },
  {
    file: "en/playground/projects/a3s-ui-experience.html",
    markers: [
      'data-view="project"',
      'data-product-surface="project"',
      'aria-label="Project path"',
      'aria-label="Project workspace"',
      'aria-label="Project configuration"',
      ">AnyBuddy<",
      'href="/UI/en/playground/projects/a3s-ui-experience/sessions/release-readiness.html"',
    ],
  },
  {
    file: "playground/projects/a3s-ui-experience/sessions/release-readiness.html",
    markers: [
      'data-view="project-session"',
      'data-product-surface="project-session"',
      ">发布就绪检查<",
      'aria-label="打开项目详情"',
      'aria-label="项目会话记录"',
    ],
  },
  {
    file: "en/playground/projects/a3s-ui-experience/sessions/release-readiness.html",
    markers: [
      'data-view="project-session"',
      'data-product-surface="project-session"',
      ">Release readiness<",
      'aria-label="Open project details"',
      'aria-label="Project conversation history"',
    ],
  },
  {
    file: "playground/sessions/fix-session-recovery.html",
    markers: [
      'data-view="session"',
      'data-product-surface="session"',
      ">修复会话恢复<",
      'aria-label="打开任务详情"',
    ],
  },
  {
    file: "en/playground/sessions/fix-session-recovery.html",
    markers: [
      'data-view="session"',
      'data-product-surface="session"',
      ">Fix session recovery<",
      'aria-label="Open task details"',
    ],
  },
  {
    file: "playground/memory.html",
    markers: [
      'data-view="memory"',
      'data-product-surface="memory"',
      ">记忆<",
      'aria-label="记忆视图"',
      'aria-label="搜索记忆"',
    ],
  },
  {
    file: "en/playground/memory.html",
    markers: [
      'data-view="memory"',
      'data-product-surface="memory"',
      ">Memory<",
      'aria-label="Memory views"',
      'aria-label="Search memory"',
    ],
  },
  {
    file: "playground/extensions.html",
    markers: [
      'data-view="marketplace"',
      'data-product-surface="marketplace"',
      ">扩展<",
      'aria-label="扩展页面"',
      'aria-label="搜索扩展"',
    ],
  },
  {
    file: "en/playground/extensions.html",
    markers: [
      'data-view="marketplace"',
      'data-product-surface="marketplace"',
      ">Extensions<",
      'aria-label="Extension pages"',
      'aria-label="Search extensions"',
    ],
  },
  {
    file: "playground/resources/files.html",
    markers: [
      'data-view="resources"',
      'data-product-surface="files"',
      'aria-label="文件视图"',
      'data-file-view="artifacts"',
      "experience-brief.docx",
      "quality-scorecard.xlsx",
      "release-review.pptx",
      "visual-acceptance-report.pdf",
    ],
  },
  {
    file: "en/playground/resources/files.html",
    markers: [
      'data-view="resources"',
      'data-product-surface="files"',
      'aria-label="File view"',
      'data-file-view="artifacts"',
      "experience-brief.docx",
      "quality-scorecard.xlsx",
      "release-review.pptx",
      "visual-acceptance-report.pdf",
    ],
  },
];
const disallowedPublicProductNames = [
  ["cod", "ex"].join(""),
  ["work", "buddy"].join(""),
  removedIntegrationName,
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
      "/UI/v0.2.0/components/app-shell",
      "/UI/v0.1.0/components/app-shell",
    ],
  },
  {
    file: "en/components/app-shell.html",
    links: [
      "/UI/components/app-shell.html",
      "/UI/v0.2.0/en/components/app-shell",
      "/UI/v0.1.0/en/components/app-shell",
    ],
  },
  {
    file: "v0.2.0/components/app-shell.html",
    links: [
      "/UI/components/app-shell",
      "/UI/v0.2.0/en/components/app-shell.html",
      "/UI/v0.1.0/components/app-shell",
    ],
  },
  {
    file: "v0.2.0/en/components/app-shell.html",
    links: [
      "/UI/en/components/app-shell",
      "/UI/v0.2.0/components/app-shell.html",
      "/UI/v0.1.0/en/components/app-shell",
    ],
  },
  {
    file: "v0.1.0/components/app-shell.html",
    links: [
      "/UI/components/app-shell",
      "/UI/v0.2.0/components/app-shell",
      "/UI/v0.1.0/en/components/app-shell.html",
    ],
  },
  {
    file: "v0.1.0/en/components/app-shell.html",
    links: [
      "/UI/en/components/app-shell",
      "/UI/v0.2.0/en/components/app-shell",
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

function htmlElementByExactClass(markup, className) {
  const classIndex = markup.indexOf(`class="${className}"`);
  if (classIndex < 0) return "";

  const elementStart = markup.lastIndexOf("<", classIndex);
  const openingTag = markup.slice(elementStart).match(/^<([a-z][\w-]*)\b/iu);
  if (!openingTag) return "";

  const tagName = openingTag[1];
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "giu");
  tagPattern.lastIndex = elementStart;
  let depth = 0;

  for (const match of markup.matchAll(tagPattern)) {
    if (match.index < elementStart) continue;
    if (match[0].startsWith("</")) depth -= 1;
    else if (!match[0].endsWith("/>")) depth += 1;
    if (depth === 0) {
      return markup.slice(elementStart, match.index + match[0].length);
    }
  }

  return "";
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

const forbiddenFiles = [
  `${removedFormRoute}/index.html`,
  `components/form-system/${removedIntegrationName}-compatibility.html`,
  `en/components/form-system/${removedIntegrationName}-compatibility.html`,
  "workflow/index.html",
  "en/workflow/index.html",
  "components/form-system/workflow-node-embedding.html",
  "en/components/form-system/workflow-node-embedding.html",
  ...[
    "batch",
    "complete",
    "condition",
    "fail",
    "hook",
    "start",
    "step",
    "wait",
  ].flatMap((node) => [
    `components/form-system/a3s-flow/${node}.html`,
    `en/components/form-system/a3s-flow/${node}.html`,
  ]),
];
for (const file of forbiddenFiles) {
  try {
    await access(path.join(outputRoot, file));
  } catch (error) {
    if (error?.code === "ENOENT") continue;
    throw error;
  }
  throw new Error(
    `The built site still publishes removed Form surface: ${file}`,
  );
}

if ((await readdir(outputRoot)).includes("form")) {
  throw new Error(
    "The built site still publishes the removed standalone /UI/form/ site.",
  );
}

const integratedFormExpectations = [
  {
    file: "components/form-system/index.html",
    markers: [
      "Form 系统",
      "@a3s-lab/ui/form/core",
      "@a3s-lab/ui/form/react-hooks",
      "@a3s-lab/ui/form/vue-hooks",
    ],
  },
  {
    file: "en/components/form-system/index.html",
    markers: [
      "Form system",
      "@a3s-lab/ui/form/core",
      "@a3s-lab/ui/form/react-hooks",
      "@a3s-lab/ui/form/vue-hooks",
    ],
  },
  {
    file: "components/form-system/framework-hooks.html",
    markers: ["React Hook Form", "Vue composables", "useA3SFieldArray"],
  },
  {
    file: "en/components/form-system/framework-hooks.html",
    markers: ["React Hook Form", "Vue composables", "useA3SFieldArray"],
  },
];

for (const expectation of integratedFormExpectations) {
  const html = await readFile(path.join(outputRoot, expectation.file), "utf8");
  for (const marker of expectation.markers) {
    if (!html.includes(marker)) {
      throw new Error(
        `${expectation.file} is missing integrated Form marker: ${marker}`,
      );
    }
  }
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

if (
  !/document\.addEventListener\(["']a3s:themechange["']/u.test(homepageHtml)
) {
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
  ...playgroundExpectations,
  ...productApplicationExpectations,
  ...nextExtractedComponentHistoricalExpectations,
]) {
  const html = await readFile(path.join(outputRoot, file), "utf8");
  for (const marker of markers) {
    if (!html.includes(marker)) {
      throw new Error(`${file} is missing expected marker: ${marker}`);
    }
  }
}

for (const file of [
  "components/combobox.html",
  "en/components/combobox.html",
]) {
  const html = await readFile(path.join(outputRoot, file), "utf8");
  const firstPreviewIndex = html.indexOf('class="a3s-preview"');
  const firstSourceIndex = html.indexOf(
    'class="a3s-preview__source"',
    firstPreviewIndex,
  );
  const integrationIndex = html.indexOf(
    'class="a3s-preview-integration"',
    firstPreviewIndex,
  );

  if (
    firstPreviewIndex === -1 ||
    firstSourceIndex === -1 ||
    integrationIndex < firstSourceIndex ||
    html.includes('class="component-intro"')
  ) {
    throw new Error(
      `${file} must integrate framework code inside its first preview source disclosure.`,
    );
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
    label: "Playground light surface and neutral action tokens are present",
    matches:
      compiledStyles.includes("--a3s-canvas:#f6f6f6") &&
      compiledStyles.includes("--a3s-paper:#fff") &&
      compiledStyles.includes("--a3s-action:#171717") &&
      compiledStyles.includes("--primary:var(--a3s-action)"),
  },
  {
    label: "Playground dark surface and neutral action tokens are present",
    matches:
      compiledStyles.includes("--a3s-canvas:#111112") &&
      compiledStyles.includes("--a3s-paper:#171718") &&
      compiledStyles.includes("--a3s-action:#f2f2f3"),
  },
  {
    label: "A3S OS light and dark accent and selection tokens are present",
    matches:
      compiledStyles.includes("--a3s-accent:#1456f0") &&
      compiledStyles.includes("--a3s-accent:#4380f9") &&
      compiledStyles.includes("--a3s-selection:#eef4ff") &&
      compiledStyles.includes("--a3s-selection:#17223b") &&
      compiledStyles.includes("--accent:var(--a3s-selection)"),
  },
  {
    label: "neutral primary actions and blue choice selection remain separate",
    matches:
      compiledStyles.includes(
        ".btn:not([data-variant]),.btn[data-variant=primary]{background-color:var(--color-primary);color:var(--color-primary-foreground)}",
      ) && compiledStyles.includes("background-color:var(--a3s-accent)"),
  },
  {
    label: "Playground control and panel radii are present",
    matches:
      compiledStyles.includes("--a3s-radius:.625rem") &&
      compiledStyles.includes("--a3s-radius-lg:.875rem"),
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
const removedFormSurfaceLeaks = [];
const chineseTerminologyLeaks = [];
const invalidHtmlNesting = [];
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
const standalonePageFiles = await collectMdxFiles(standalonePagesRoot);
const referencePattern = /(?:href|src)="([^"]+)"/g;
const previewSourceViolations = [];
const componentFrameworkIntegrationViolations = [];
let componentFrameworkIntegrationCount = 0;
let mdxPreviewCount = 0;

const documentationPlaygroundPages = mdxFiles.filter(
  (file) => path.basename(file, path.extname(file)) === "playground",
);
if (documentationPlaygroundPages.length > 0) {
  throw new Error(
    `Playground must be registered as a standalone route, not documentation: ${documentationPlaygroundPages
      .map((file) => path.relative(docsRoot, file))
      .join(", ")}`,
  );
}

const standalonePageNames = standalonePageFiles
  .map((file) =>
    path.relative(standalonePagesRoot, file).split(path.sep).join("/"),
  )
  .sort();
const expectedStandalonePageNames = [
  "app.en.mdx",
  "app.zh.mdx",
  "playground.en.mdx",
  "playground.zh.mdx",
];
if (
  standalonePageNames.length !== expectedStandalonePageNames.length ||
  standalonePageNames.some(
    (file, index) => file !== expectedStandalonePageNames[index],
  )
) {
  throw new Error(
    `Standalone route sources do not match the expected page set: ${standalonePageNames.join(", ")}`,
  );
}

for (const mdxFile of mdxFiles) {
  const source = await readFile(mdxFile, "utf8");
  const sourcePreviewCount = (source.match(/<Preview\b/g) ?? []).length;
  const builtFile = builtPathForMdx(mdxFile);
  const sourceParts = path.relative(docsRoot, mdxFile).split(path.sep);
  const isStructuredFormGuide =
    sourceParts[0] === "next" &&
    ["en", "zh"].includes(sourceParts[1]) &&
    sourceParts[2] === "components" &&
    sourceParts[3] === "form-system";
  const isVersionedComponentGuide =
    ["next", "v0.3.0", "v0.2.0", "v0.1.0"].includes(sourceParts[0]) &&
    ["en", "zh"].includes(sourceParts[1]) &&
    sourceParts[2] === "components" &&
    sourceParts[3] !== "index.mdx" &&
    !isStructuredFormGuide;
  const isHarnessLayoutGuide =
    sourceParts[0] === "next" &&
    ["en", "zh"].includes(sourceParts[1]) &&
    sourceParts[2] === "harness" &&
    [
      "dock-workspace.mdx",
      "grid-view.mdx",
      "split-view.mdx",
      "pane-view.mdx",
    ].includes(sourceParts[3]);
  const isUnavailableComponentGuide =
    /not part of this\s+published\s+package contract/u.test(source) ||
    /not part of this stable documentation snapshot/u.test(source) ||
    /不属于该历史版本的公开契约/u.test(source) ||
    /不属于此稳定版文档快照/u.test(source);
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

  if (
    (isVersionedComponentGuide || isHarnessLayoutGuide) &&
    !isUnavailableComponentGuide
  ) {
    componentFrameworkIntegrationCount += 1;
    const relativeSource = path.relative(docsRoot, mdxFile);
    const firstPreviewStart = html.indexOf('<section class="a3s-preview"');
    const nextPreviewStart = html.indexOf(
      '<section class="a3s-preview"',
      firstPreviewStart + 1,
    );
    const preview =
      firstPreviewStart >= 0
        ? html.slice(
            firstPreviewStart,
            nextPreviewStart >= 0 ? nextPreviewStart : html.length,
          )
        : "";
    const sourcePanelStart = preview.indexOf('class="a3s-preview__source"');
    const integrationStart = preview.indexOf('class="a3s-preview-integration"');
    const integration = htmlElementByExactClass(
      preview,
      "a3s-preview-integration",
    );
    const localizedLabels =
      sourceParts[1] === "zh"
        ? ["安装", "示例", "入口"]
        : ["Install", "Example", "Entry"];
    const componentSlug = path.basename(mdxFile, path.extname(mdxFile));
    const version = sourceParts[0];
    const installMarker =
      version === "next"
        ? "npm install @a3s-lab/ui"
        : version === "v0.1.0"
          ? "npm install github:A3S-Lab/UI#d2799d3914d2d291fbf0c2c3e638e2380ce266c0"
          : `npm install @a3s-lab/ui@${version.slice(1)}`;
    const integrationDependencyMarkers = isHarnessLayoutGuide
      ? ["dockview@8.1.0"]
      : componentSlug === "agent-composer"
        ? ["@tiptap/core", "@tiptap/markdown", "@tiptap/starter-kit"]
        : componentSlug === "chart"
          ? ["chart.js"]
          : [];
    const requiredMarkers = [
      'data-preview-integration="complete"',
      'data-mode="complete"',
      ">HTML</button>",
      ">React</button>",
      ">Vue</button>",
      installMarker,
      "@a3s-lab/ui/a3s.css",
      `data-framework-contract="${version === "next" ? "adapter" : "semantic"}"`,
      'class="a3s-preview-integration__note"',
      'class="a3s-preview-integration__workspace"',
      'data-code-file="example"',
      'class="shiki css-variables"',
      ...integrationDependencyMarkers,
      ...localizedLabels,
    ];
    const missingMarkers = requiredMarkers.filter(
      (marker) => !preview.includes(marker),
    );
    const workspaceCount = (
      integration.match(/class="a3s-preview-integration__workspace"/g) ?? []
    ).length;
    const copyCount = (
      integration.match(/class="[^"]*\brp-code-copy-button\b[^"]*"/g) ?? []
    ).length;
    const wrapCount = (
      integration.match(/class="[^"]*\brp-code-wrap-button\b[^"]*"/g) ?? []
    ).length;
    const exampleStart = integration.indexOf('data-code-file="example"');
    const exampleEnd = integration.indexOf(
      "a3s-preview-integration__note",
      exampleStart,
    );
    const htmlExample =
      exampleStart >= 0 && exampleEnd > exampleStart
        ? integration.slice(exampleStart, exampleEnd)
        : "";
    const encodedExampleTags = [
      ...htmlExample.matchAll(/&lt;([a-z][\w-]*)\b/gu),
    ].map((match) => match[1]);
    const hasInvalidExample =
      !encodedExampleTags.some((tagName) => tagName !== "script") ||
      /(?:Component content|Component summary|组件内容|组件摘要)/u.test(
        htmlExample,
      );
    const hasLegacyFrameworkSections =
      /<h2\b[^>]*\bid="(?:react|vue)"/u.test(html) ||
      html.includes("a3s-framework-tabs") ||
      html.includes("component-intro");
    const integrationIsNestedInSource =
      sourcePanelStart >= 0 && integrationStart > sourcePanelStart;

    if (
      missingMarkers.length > 0 ||
      workspaceCount !== 1 ||
      copyCount !== 3 ||
      wrapCount !== 0 ||
      hasInvalidExample ||
      hasLegacyFrameworkSections ||
      !integrationIsNestedInSource
    ) {
      componentFrameworkIntegrationViolations.push(
        `${relativeSource}: missing=${missingMarkers.join(",") || "none"}; workspaces=${workspaceCount}; copy=${copyCount}; wrap=${wrapCount}; invalid-example=${hasInvalidExample}; legacy=${hasLegacyFrameworkSections}; nested=${integrationIsNestedInSource}`,
      );
    }
  }
}

let builtPreviewCount = 0;

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, "utf8");
  const relativeHtmlFile = path.relative(outputRoot, htmlFile);
  if (html.toLocaleLowerCase("en").includes(removedFormRoute)) {
    removedFormSurfaceLeaks.push(relativeHtmlFile);
  }
  const documentMarkup = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  const invalidParagraphContent =
    /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?<(?:address|article|aside|blockquote|div|dl|fieldset|footer|form|h[1-6]|header|hr|menu|nav|ol|p|pre|section|table|ul)\b/giu;
  for (const match of documentMarkup.matchAll(invalidParagraphContent)) {
    invalidHtmlNesting.push(
      `${relativeHtmlFile}: ${match[0].replace(/\s+/g, " ").slice(0, 160)}`,
    );
  }
  const previewCount = (html.match(/class="a3s-preview"/g) ?? []).length;
  builtPreviewCount += previewCount;
  const previewToggleCount = (
    html.match(
      /<button\b(?=[^>]*\baria-controls="[^"]+")(?=[^>]*\baria-expanded="false")(?=[^>]*\btitle="(?:Show source|Show integration code|展开源码|展开接入代码)")[^>]*>/g,
    ) ?? []
  ).length;
  const previewSourcePanelCount = (
    html.match(/data-preview-source-panel="true"/g) ?? []
  ).length;
  const previewStageCount = (html.match(/class="a3s-preview__stage"/g) ?? [])
    .length;
  const previewSourceCount = (html.match(/class="a3s-preview__source"/g) ?? [])
    .length;
  const hiddenPreviewSourceCount = (
    html.match(
      /<div\b(?=[^>]*class="a3s-preview__source")(?=[^>]*data-preview-source-panel="true")(?=[^>]*hidden="")[^>]*>/g,
    ) ?? []
  ).length;
  if (
    previewCount !== previewToggleCount ||
    previewCount !== previewSourcePanelCount ||
    previewCount !== previewStageCount ||
    previewCount !== previewSourceCount ||
    previewCount !== hiddenPreviewSourceCount ||
    (previewCount > 0 && !html.includes("rp-code-copy-button")) ||
    (previewCount > 0 && !html.includes("shiki"))
  ) {
    previewSourceViolations.push(
      `${relativeHtmlFile}: ${previewCount} previews, ${previewToggleCount} source toggles, ${previewSourcePanelCount} source markers, ${previewStageCount} stages, ${previewSourceCount} source panels, ${hiddenPreviewSourceCount} initially hidden, copy=${html.includes("rp-code-copy-button")}, shiki=${html.includes("shiki")}`,
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
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, "")
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, "")
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

if (componentFrameworkIntegrationViolations.length > 0) {
  throw new Error(
    `Component framework integration coverage failed:\n${componentFrameworkIntegrationViolations
      .map((violation) => `  - ${violation}`)
      .join("\n")}`,
  );
}

if (invalidHtmlNesting.length > 0) {
  throw new Error(
    `Built-site HTML nesting check failed:\n${invalidHtmlNesting
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

if (removedFormSurfaceLeaks.length > 0) {
  throw new Error(
    `Removed Form route is still referenced by built pages:\n${removedFormSurfaceLeaks
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
  `Verified ${requiredFiles.length} required files, ${componentFrameworkIntegrationCount} component framework integrations, ${mdxPreviewCount} MDX preview contracts, ${styleExpectations.length} CSS invariants, Chinese terminology, public branding, and references across ${htmlFiles.length} HTML pages.`,
);
