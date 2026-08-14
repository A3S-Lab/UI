export type WorkbenchLocale = "en" | "zh";

export type WorkbenchFile = {
  path: string;
  name: string;
  compactLabel: string;
  language: "a3s-acl" | "json" | "markdown" | "typescript";
  content: string;
};

const agentConfiguration = `# Release review agent
agent "release-auditor" {
  model = "a3s/default"

  skills {
    path = ".a3s/skills"
    enabled = ["release-evidence"]
  }

  permissions {
    allow = [
      "read(*)",
      "grep(*)",
      "bash(cargo test *)"
    ]
    deny = ["bash(rm *)", "write(secrets/**)"]
    default_decision = "ask"
  }

  memory {
    enabled = true
    max_entries = 1000
  }
}`;

const releaseReview = `export type ChangeSet = {
  revision: string;
  files: readonly string[];
};

export type ReviewEvidence = {
  summary: string;
  commands: readonly string[];
  approved: boolean;
};

export async function reviewRelease(
  changeSet: ChangeSet,
): Promise<ReviewEvidence> {
  const commands = ["cargo fmt --check", "cargo test --workspace"];
  const approved = changeSet.files.every(
    (file) => !file.startsWith("secrets/"),
  );

  return {
    summary: approved
      ? \`Revision \${changeSet.revision} is ready for review.\`
      : "Protected files require a human decision.",
    commands,
    approved,
  };
}`;

const runtimeSettings = `{
  "editor": {
    "formatOnSave": true,
    "minimap": true,
    "tabSize": 2
  },
  "runtime": {
    "provider": "a3s-code",
    "telemetry": "local"
  }
}`;

const readme = `# Release review workspace

This illustrative workspace shows a production-style Monaco integration for
A3S configuration and TypeScript review logic.

## Keyboard shortcuts

- **Ctrl/Cmd + Shift + P** opens the command palette.
- **Ctrl/Cmd + S** marks the active model as saved.
- **Ctrl/Cmd + J** toggles the bottom panel.
`;

export const workbenchFiles: readonly WorkbenchFile[] = [
  {
    path: ".a3s/agent.acl",
    name: "agent.acl",
    compactLabel: "ACL",
    language: "a3s-acl",
    content: agentConfiguration,
  },
  {
    path: "src/release-review.ts",
    name: "release-review.ts",
    compactLabel: "TS",
    language: "typescript",
    content: releaseReview,
  },
  {
    path: "config/runtime.json",
    name: "runtime.json",
    compactLabel: "{}",
    language: "json",
    content: runtimeSettings,
  },
  {
    path: "README.md",
    name: "README.md",
    compactLabel: "MD",
    language: "markdown",
    content: readme,
  },
] as const;

export type WorkbenchCopy = {
  workspace: string;
  illustrative: string;
  commandCenter: string;
  openCommandCenter: string;
  explorer: string;
  search: string;
  sourceControl: string;
  files: string;
  openEditors: string;
  filterFiles: string;
  noFiles: string;
  changes: string;
  loading: string;
  loadError: string;
  retry: string;
  saved: string;
  unsaved: string;
  saveAnnouncement: string;
  problems: string;
  output: string;
  terminal: string;
  warning: string;
  warningDetail: string;
  outputReady: string;
  outputIndexed: string;
  terminalPrompt: string;
  togglePanel: string;
  closePanel: string;
  line: string;
  column: string;
  spaces: string;
  encoding: string;
  branch: string;
  commandPalette: string;
  commandSearch: string;
  noCommands: string;
  close: string;
  formatDocument: string;
  toggleMinimap: string;
  toggleBottomPanel: string;
  openAgentConfig: string;
  switchTheme: string;
  commandComplete: string;
};

const copy: Record<WorkbenchLocale, WorkbenchCopy> = {
  en: {
    workspace: "Release review",
    illustrative: "Illustrative workspace",
    commandCenter: "Search commands or files",
    openCommandCenter: "Open command palette",
    explorer: "Explorer",
    search: "Search",
    sourceControl: "Source Control",
    files: "A3S-RELEASE-REVIEW",
    openEditors: "OPEN EDITORS",
    filterFiles: "Filter workspace files",
    noFiles: "No matching files",
    changes: "CHANGES",
    loading: "Starting Monaco language services…",
    loadError: "Monaco could not start in this browser.",
    retry: "Retry",
    saved: "Saved",
    unsaved: "Unsaved changes",
    saveAnnouncement: "Active file saved",
    problems: "Problems",
    output: "Output",
    terminal: "Terminal",
    warning: "1 warning",
    warningDetail:
      "Memory is enabled without persistent storage in this illustrative configuration.",
    outputReady: "[A3S] Monaco worker pool ready",
    outputIndexed: "[A3S] Indexed 4 workspace files and ACL completions",
    terminalPrompt: "a3s test --changed",
    togglePanel: "Toggle bottom panel",
    closePanel: "Close bottom panel",
    line: "Ln",
    column: "Col",
    spaces: "Spaces: 2",
    encoding: "UTF-8",
    branch: "main",
    commandPalette: "Command Palette",
    commandSearch: "Type a command",
    noCommands: "No commands found",
    close: "Close",
    formatDocument: "Format Document",
    toggleMinimap: "View: Toggle Minimap",
    toggleBottomPanel: "View: Toggle Panel",
    openAgentConfig: "File: Open Agent Configuration",
    switchTheme: "Preferences: Switch Color Theme",
    commandComplete: "Command completed",
  },
  zh: {
    workspace: "Release 审查",
    illustrative: "示例工作区",
    commandCenter: "搜索命令或文件",
    openCommandCenter: "打开命令面板",
    explorer: "资源管理器",
    search: "搜索",
    sourceControl: "源代码管理",
    files: "A3S-RELEASE-REVIEW",
    openEditors: "打开的编辑器",
    filterFiles: "筛选工作区文件",
    noFiles: "没有匹配的文件",
    changes: "更改",
    loading: "正在启动 Monaco 语言服务…",
    loadError: "当前浏览器无法启动 Monaco。",
    retry: "重试",
    saved: "已保存",
    unsaved: "有未保存修改",
    saveAnnouncement: "已保存当前文件",
    problems: "问题",
    output: "输出",
    terminal: "终端",
    warning: "1 个警告",
    warningDetail: "此示例配置启用了记忆，但尚未配置持久化存储。",
    outputReady: "[A3S] Monaco Worker 池已就绪",
    outputIndexed: "[A3S] 已索引 4 个工作区文件和 ACL 补全项",
    terminalPrompt: "a3s test --changed",
    togglePanel: "切换底部面板",
    closePanel: "关闭底部面板",
    line: "行",
    column: "列",
    spaces: "空格: 2",
    encoding: "UTF-8",
    branch: "main",
    commandPalette: "命令面板",
    commandSearch: "输入命令",
    noCommands: "没有匹配的命令",
    close: "关闭",
    formatDocument: "格式化文档",
    toggleMinimap: "视图: 切换 Minimap",
    toggleBottomPanel: "视图: 切换面板",
    openAgentConfig: "文件: 打开 Agent 配置",
    switchTheme: "首选项: 切换颜色主题",
    commandComplete: "命令已完成",
  },
};

export function getWorkbenchCopy(locale: WorkbenchLocale): WorkbenchCopy {
  return copy[locale];
}
