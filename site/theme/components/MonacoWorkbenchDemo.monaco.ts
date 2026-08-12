import type * as Monaco from "monaco-editor";

import type {
  WorkbenchFile,
  WorkbenchLocale,
} from "./MonacoWorkbenchDemo.data";

export type MonacoApi = typeof Monaco;
export type MonacoEditor = Monaco.editor.IStandaloneCodeEditor;
export type MonacoModel = Monaco.editor.ITextModel;

type MonacoEnvironment = {
  getWorker(workerId: string, label: string): Worker;
};

let monacoPromise: Promise<MonacoApi> | undefined;
let configured = false;

function formatAclDocument(source: string) {
  let depth = 0;
  return source
    .split("\n")
    .map((line) => {
      const content = line.trim();
      if (!content) return "";
      const syntax = content
        .replace(/#.*$/, "")
        .replace(/"(?:[^"\\]|\\.)*"/g, "");
      const openings = (syntax.match(/{/g) ?? []).length;
      const closings = (syntax.match(/}/g) ?? []).length;
      const leadingClosings = syntax.match(/^}+/)?.[0].length ?? 0;
      const indentationDepth = Math.max(0, depth - leadingClosings);
      const formatted = `${"  ".repeat(indentationDepth)}${content}`;
      depth = Math.max(0, depth + openings - closings);
      return formatted;
    })
    .join("\n");
}

function configureWorkers() {
  const scope = globalThis as typeof globalThis & {
    MonacoEnvironment?: MonacoEnvironment;
  };

  scope.MonacoEnvironment = {
    getWorker(_workerId, label) {
      if (label === "json") {
        return new Worker(
          new URL(
            "monaco-editor/esm/vs/language/json/json.worker.js",
            import.meta.url,
          ),
          { name: "a3s-monaco-json", type: "module" },
        );
      }
      if (label === "typescript" || label === "javascript") {
        return new Worker(
          new URL(
            "monaco-editor/esm/vs/language/typescript/ts.worker.js",
            import.meta.url,
          ),
          { name: "a3s-monaco-typescript", type: "module" },
        );
      }
      return new Worker(
        new URL(
          "monaco-editor/esm/vs/editor/editor.worker.js",
          import.meta.url,
        ),
        { name: "a3s-monaco-editor", type: "module" },
      );
    },
  };
}

function configureAclLanguage(monaco: MonacoApi) {
  monaco.languages.register({
    id: "a3s-acl",
    extensions: [".acl"],
    aliases: ["A3S ACL", "acl"],
  });
  monaco.languages.setLanguageConfiguration("a3s-acl", {
    comments: { lineComment: "#" },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string", "comment"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ],
  });
  monaco.languages.setMonarchTokensProvider("a3s-acl", {
    defaultToken: "",
    tokenPostfix: ".acl",
    keywords: [
      "agent",
      "allow",
      "context",
      "deny",
      "enabled",
      "memory",
      "models",
      "permissions",
      "providers",
      "queue",
      "skills",
    ],
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [
          /[a-zA-Z_][\w-]*/,
          { cases: { "@keywords": "keyword", "@default": "identifier" } },
        ],
        [/-?\d+(?:\.\d+)?/, "number"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
        [/[{}()[\]]/, "@brackets"],
        [/[=,]/, "delimiter"],
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/\\./, "string.escape.invalid"],
        [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
      ],
    },
  });
  monaco.languages.registerCompletionItemProvider("a3s-acl", {
    triggerCharacters: [" ", '"'],
    provideCompletionItems(model, position) {
      const range = model.getWordUntilPosition(position);
      const insertRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: range.startColumn,
        endColumn: range.endColumn,
      };
      return {
        suggestions: [
          {
            label: "agent",
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: "A3S Agent configuration block",
            documentation:
              "Creates an Agent with model, skills, and permission policy.",
            insertText:
              'agent "${1:name}" {\n  model = "${2:provider/model}"\n\n  permissions {\n    allow = [${3:"read(*)"}]\n    default_decision = "ask"\n  }\n}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: insertRange,
          },
          {
            label: "permissions",
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: "Allow/deny policy",
            insertText:
              'permissions {\n  allow = [${1:"read(*)"}]\n  deny = [${2:"bash(rm *)"}]\n  default_decision = "ask"\n}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: insertRange,
          },
          {
            label: "env",
            kind: monaco.languages.CompletionItemKind.Function,
            detail: "Read a value from the environment",
            insertText: 'env("${1:VARIABLE_NAME}")',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: insertRange,
          },
        ],
      };
    },
  });
  monaco.languages.registerHoverProvider("a3s-acl", {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position)?.word;
      const details: Record<string, string> = {
        agent: "Declares an A3S Code Agent configuration.",
        permissions:
          "Defines explicit allow and deny patterns. Unmatched actions use `default_decision`.",
        memory:
          "Configures conversation memory. Production deployments should choose a persistent store.",
      };
      if (!word || !details[word]) return null;
      return {
        range: new monaco.Range(
          position.lineNumber,
          model.getWordAtPosition(position)?.startColumn ?? position.column,
          position.lineNumber,
          model.getWordAtPosition(position)?.endColumn ?? position.column,
        ),
        contents: [{ value: `**${word}**` }, { value: details[word] }],
      };
    },
  });
  monaco.languages.registerDocumentFormattingEditProvider("a3s-acl", {
    provideDocumentFormattingEdits(model) {
      return [
        {
          range: model.getFullModelRange(),
          text: formatAclDocument(model.getValue()),
        },
      ];
    },
  });
}

function configureBuiltInLanguages(monaco: MonacoApi) {
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    allowNonTsExtensions: true,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    noEmit: true,
    strict: true,
    target: monaco.languages.typescript.ScriptTarget.ESNext,
  });
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    allowComments: false,
    enableSchemaRequest: false,
    schemas: [
      {
        uri: "https://a3s.dev/schemas/editor-workspace.json",
        fileMatch: ["file:///a3s-release-review/config/runtime.json"],
        schema: {
          type: "object",
          required: ["editor", "runtime"],
          properties: {
            editor: {
              type: "object",
              required: ["formatOnSave", "minimap", "tabSize"],
              properties: {
                formatOnSave: { type: "boolean" },
                minimap: { type: "boolean" },
                tabSize: { type: "integer", minimum: 1, maximum: 8 },
              },
            },
            runtime: {
              type: "object",
              required: ["provider", "telemetry"],
              properties: {
                provider: { enum: ["a3s-code"] },
                telemetry: { enum: ["disabled", "local"] },
              },
            },
          },
        },
      },
    ],
    validate: true,
  });
}

function configureThemes(monaco: MonacoApi) {
  monaco.editor.defineTheme("a3s-workbench-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword.acl", foreground: "6F42C1", fontStyle: "bold" },
      { token: "string.acl", foreground: "0B6B51" },
      { token: "comment.acl", foreground: "6B7280", fontStyle: "italic" },
      { token: "number.acl", foreground: "9A4E00" },
    ],
    colors: {
      "editor.background": "#F8F9FB",
      "editor.foreground": "#24262B",
      "editor.lineHighlightBackground": "#EEF2F8",
      "editor.selectionBackground": "#B9D2FF",
      "editor.inactiveSelectionBackground": "#D9E6FA",
      "editorLineNumber.foreground": "#8B9099",
      "editorLineNumber.activeForeground": "#3F4550",
      "editorCursor.foreground": "#2864E8",
      "editorIndentGuide.background1": "#E2E5EA",
      "editorIndentGuide.activeBackground1": "#AEB5C0",
      "editorGutter.background": "#F8F9FB",
      "editorWidget.background": "#FFFFFF",
      "editorWidget.border": "#D4D8E0",
      "editorSuggestWidget.selectedBackground": "#E5EEFF",
      "minimap.background": "#F8F9FB",
      "scrollbarSlider.background": "#939AA633",
      "scrollbarSlider.hoverBackground": "#71798655",
    },
  });
  monaco.editor.defineTheme("a3s-workbench-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword.acl", foreground: "C3A6FF", fontStyle: "bold" },
      { token: "string.acl", foreground: "7DD8B4" },
      { token: "comment.acl", foreground: "7F8795", fontStyle: "italic" },
      { token: "number.acl", foreground: "F0B96A" },
    ],
    colors: {
      "editor.background": "#11131A",
      "editor.foreground": "#E4E7EC",
      "editor.lineHighlightBackground": "#191D27",
      "editor.selectionBackground": "#244A78",
      "editor.inactiveSelectionBackground": "#20364F",
      "editorLineNumber.foreground": "#697180",
      "editorLineNumber.activeForeground": "#C6CBD3",
      "editorCursor.foreground": "#79A9FF",
      "editorIndentGuide.background1": "#272C36",
      "editorIndentGuide.activeBackground1": "#4A5261",
      "editorGutter.background": "#11131A",
      "editorWidget.background": "#1A1D26",
      "editorWidget.border": "#343946",
      "editorSuggestWidget.selectedBackground": "#243A5A",
      "minimap.background": "#11131A",
      "scrollbarSlider.background": "#AAB2C02B",
      "scrollbarSlider.hoverBackground": "#C0C7D044",
    },
  });
}

function configureMonaco(monaco: MonacoApi) {
  if (configured) return;
  configureAclLanguage(monaco);
  configureBuiltInLanguages(monaco);
  configureThemes(monaco);
  configured = true;
}

export async function loadMonaco(): Promise<MonacoApi> {
  if (!monacoPromise) {
    configureWorkers();
    monacoPromise = import("monaco-editor")
      .then((monaco) => {
        configureMonaco(monaco);
        return monaco;
      })
      .catch((error: unknown) => {
        monacoPromise = undefined;
        throw error;
      });
  }
  return monacoPromise;
}

export function createWorkspaceModels(
  monaco: MonacoApi,
  files: readonly WorkbenchFile[],
): Map<string, MonacoModel> {
  const models = new Map<string, MonacoModel>();
  for (const file of files) {
    const uri = monaco.Uri.parse(`file:///a3s-release-review/${file.path}`);
    monaco.editor.getModel(uri)?.dispose();
    models.set(
      file.path,
      monaco.editor.createModel(file.content, file.language, uri),
    );
  }
  return models;
}

export function applyWorkspaceMarkers(
  monaco: MonacoApi,
  models: Map<string, MonacoModel>,
  locale: WorkbenchLocale,
) {
  const model = models.get(".a3s/agent.acl");
  if (!model) return;
  const lineNumber = model
    .getLinesContent()
    .findIndex((line) => line.includes("max_entries = 1000"));
  if (lineNumber < 0) return;
  monaco.editor.setModelMarkers(model, "a3s-workbench", [
    {
      severity: monaco.MarkerSeverity.Warning,
      message:
        locale === "zh"
          ? "此示例配置尚未声明持久化存储；生产环境应选择持久化 Provider。"
          : "This sample has no persistent memory store; choose a persistent provider for production.",
      startLineNumber: lineNumber + 1,
      startColumn: 5,
      endLineNumber: lineNumber + 1,
      endColumn: model.getLineMaxColumn(lineNumber + 1),
      source: "A3S ACL",
    },
  ]);
}

export function themeForDocument(): string {
  return document.documentElement.classList.contains("dark")
    ? "a3s-workbench-dark"
    : "a3s-workbench-light";
}
