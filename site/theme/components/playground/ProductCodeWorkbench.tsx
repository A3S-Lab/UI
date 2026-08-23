import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { ProductFileSurfaceProps } from "./ProductFileWorkbenchSurfaces";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import {
  getProductWorkspaceFile,
  updateProductWorkspaceFileContents,
} from "./product-workspace-files";

type CodeLoadState = "error" | "loading" | "ready";

type CodeEditorElement = HTMLElement & {
  markClean?: () => void;
  refresh?: () => void;
};

const savedStaticDrafts = new Map<string, string>();

export function ProductCodeWorkbench({
  dirty,
  entry,
  locale,
  mode,
  onChange,
  onSaved,
  onStatus,
  saveRevision,
}: ProductFileSurfaceProps) {
  const zh = locale === "zh";
  const markdown = /\.mdx?$/i.test(entry.name);
  const staticDraftKey = `${entry.id}:${locale}`;
  const staticSource =
    savedStaticDrafts.get(staticDraftKey) ??
    entry.preview?.[locale] ??
    codeFixture(entry.name, locale);
  const [activeMatch, setActiveMatch] = useState(0);
  const [draft, setDraft] = useState(() =>
    entry.workspaceFileId ? "" : staticSource,
  );
  const [error, setError] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [loadState, setLoadState] = useState<CodeLoadState>(
    entry.workspaceFileId ? "loading" : "ready",
  );
  const [retryRevision, setRetryRevision] = useState(0);
  const [wordWrap, setWordWrap] = useState(true);
  const editorRef = useRef<CodeEditorElement>(null);
  const lastSavedRevisionRef = useRef(saveRevision);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setError("");
      if (!entry.workspaceFileId) {
        setDraft(staticSource);
        setLoadState("ready");
        return;
      }

      setDraft("");
      setLoadState("loading");
      try {
        const workspaceFile = getProductWorkspaceFile(entry.workspaceFileId);
        if (!workspaceFile) {
          throw new Error(
            zh
              ? "工作区记录已不存在，请返回文件列表后重新导入。"
              : "The workspace record no longer exists. Return to Files and import it again.",
          );
        }
        if (workspaceFile.state === "copying") {
          throw new Error(
            zh
              ? "文件仍在复制到工作区，请稍候后重试。"
              : "The file is still being copied into the workspace. Retry shortly.",
          );
        }
        if (workspaceFile.state === "error") {
          throw new Error(
            zh
              ? "浏览器无法读取此文件，请在文件列表中重试导入。"
              : "The browser could not read this file. Retry the import from Files.",
          );
        }
        const contents = await workspaceFile.file.text();
        if (!active) return;
        setDraft(contents);
        setLoadState("ready");
        onStatus(
          zh
            ? `已读取工作区文件“${entry.name}”`
            : `Loaded workspace file “${entry.name}”`,
        );
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setLoadState("error");
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [
    entry.id,
    entry.name,
    entry.transferState,
    entry.workspaceFileId,
    onStatus,
    retryRevision,
    staticSource,
    zh,
  ]);

  useEffect(() => {
    if (
      saveRevision === lastSavedRevisionRef.current ||
      loadState !== "ready"
    ) {
      return;
    }
    lastSavedRevisionRef.current = saveRevision;
    try {
      if (entry.workspaceFileId) {
        updateProductWorkspaceFileContents(
          entry.workspaceFileId,
          draftRef.current,
        );
      } else {
        savedStaticDrafts.set(staticDraftKey, draftRef.current);
      }
      editorRef.current?.markClean?.();
    } catch {
      onChange(
        zh ? "保存失败，文件仍有本地更改" : "Save failed; local changes remain",
      );
    }
  }, [
    entry.workspaceFileId,
    loadState,
    onChange,
    saveRevision,
    staticDraftKey,
    zh,
  ]);

  useEffect(() => {
    if (loadState !== "ready" || mode !== "edit") return;
    const editor = editorRef.current;
    if (!editor) return;

    const handleSave = () => {
      onSaved(zh ? "已通过快捷键保存" : "Saved with keyboard shortcut");
    };

    editor.addEventListener("a3s:code-save", handleSave);
    window.a3sUI?.start();
    window.a3sUI?.initAll();
    const frame = window.requestAnimationFrame(() => editor.refresh?.());

    return () => {
      window.cancelAnimationFrame(frame);
      editor.removeEventListener("a3s:code-save", handleSave);
    };
  }, [entry.id, loadState, mode, onSaved, zh]);

  const lines = useMemo(() => draft.split("\n"), [draft]);
  const characters = useMemo(
    () =>
      Array.from(draft).filter(
        (character) => character !== "\n" && character !== "\r",
      ).length,
    [draft],
  );
  const matchOffsets = useMemo(
    () => findOccurrences(draft, findQuery),
    [draft, findQuery],
  );

  useEffect(() => {
    setActiveMatch(0);
  }, [findQuery]);

  useEffect(() => {
    if (activeMatch >= matchOffsets.length) setActiveMatch(0);
  }, [activeMatch, matchOffsets.length]);

  const commitDraft = (nextDraft: string, message: string) => {
    setDraft(nextDraft);
    onChange(message);
  };

  const moveToMatch = (offset: number) => {
    if (matchOffsets.length === 0) {
      onStatus(
        findQuery
          ? zh
            ? `未找到“${findQuery}”`
            : `No matches for “${findQuery}”`
          : zh
            ? "输入要查找的内容"
            : "Enter a search term",
      );
      return;
    }
    const next =
      (activeMatch + offset + matchOffsets.length) % matchOffsets.length;
    setActiveMatch(next);
    const start = matchOffsets[next];
    const textarea = textareaRef.current;
    if (textarea && mode === "edit") {
      textarea.focus();
      textarea.setSelectionRange(start, start + findQuery.length);
      editorRef.current?.refresh?.();
    }
    onStatus(
      zh
        ? `第 ${next + 1} 项，共 ${matchOffsets.length} 项`
        : `Match ${next + 1} of ${matchOffsets.length}`,
    );
  };

  const formatDraft = () => {
    const formatted = `${draft
      .replace(/\r\n?/gu, "\n")
      .replace(/[ \t]+$/gmu, "")
      .replace(/\n{3,}$/u, "\n\n")
      .replace(/\n*$/u, "")}\n`;
    if (formatted === draft) {
      onStatus(zh ? "当前文件无需格式化" : "The file is already formatted");
      return;
    }
    commitDraft(
      formatted,
      zh ? "已格式化，等待保存" : "Formatted; waiting to save",
    );
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLocaleLowerCase() === "f"
    ) {
      event.preventDefault();
      setFindOpen(true);
    }
  };

  if (loadState === "error") {
    return (
      <section
        className="product-code-workbench"
        data-code-load-state="error"
        data-file-surface
      >
        <div data-code-state role="alert">
          <span>
            <ProductPlaygroundIcon name="warning" />
          </span>
          <strong>
            {zh ? "无法读取代码文件" : "The code file could not be read"}
          </strong>
          <p>{error}</p>
          <button
            onClick={() => setRetryRevision((value) => value + 1)}
            type="button"
          >
            <ProductPlaygroundIcon name="refresh" />
            {zh ? "重试读取" : "Retry"}
          </button>
        </div>
      </section>
    );
  }

  if (loadState === "loading") {
    return (
      <section
        className="product-code-workbench"
        data-code-load-state="loading"
        data-file-surface
      >
        <div data-code-state role="status">
          <span data-code-spinner>
            <ProductPlaygroundIcon name="refresh" />
          </span>
          <strong>
            {zh ? "正在读取工作区文件" : "Reading the workspace file"}
          </strong>
          <p>{entry.name}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={zh ? `${entry.name} 代码编辑器` : `${entry.name} code editor`}
      className={`product-code-workbench${mode === "edit" ? " code-editor" : ""}`}
      data-a3s-components={mode === "edit" ? "code-editor" : undefined}
      data-code-load-state="ready"
      data-dirty={String(dirty)}
      data-file-surface
      data-indent-size="2"
      data-label-character={zh ? "个字符" : "character"}
      data-label-characters={zh ? "个字符" : "characters"}
      data-label-dirty={zh ? "有未保存更改" : "Unsaved changes"}
      data-label-line={zh ? "行" : "line"}
      data-label-lines={zh ? "行" : "lines"}
      data-label-position={
        zh ? "行 {line}，列 {column}" : "Ln {line}, Col {column}"
      }
      data-label-saved={zh ? "已保存" : "Saved"}
      data-language={languageKey(entry.name, entry.type)}
      data-line-numbers="true"
      data-wrap={String(wordWrap)}
      key={`${entry.id}:${mode}`}
      ref={editorRef}
    >
      <header data-code-toolbar>
        <div data-code-editor-file>
          <ProductPlaygroundIcon name="code" />
          <strong>{entry.name}</strong>
          <span
            aria-label={zh ? "文件状态" : "File status"}
            data-code-editor-dirty-indicator
          />
        </div>
        <div data-code-editor-actions>
          <span data-code-editor-language>
            {languageLabel(entry.name, entry.type)}
          </span>
          <button
            aria-expanded={findOpen}
            onClick={() => setFindOpen((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="search" />
            {zh ? "查找" : "Find"}
          </button>
          <button
            disabled={mode !== "edit"}
            onClick={formatDraft}
            type="button"
          >
            <ProductPlaygroundIcon name="checklist" />
            {zh ? "格式化" : "Format"}
          </button>
          <button
            aria-pressed={wordWrap}
            onClick={() => setWordWrap((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="list" />
            {zh ? "自动换行" : "Wrap"}
          </button>
        </div>
      </header>
      {findOpen ? (
        <form
          data-code-find
          onSubmit={(event) => {
            event.preventDefault();
            moveToMatch(1);
          }}
        >
          <ProductPlaygroundIcon name="search" />
          <input
            aria-label={zh ? "在文件中查找" : "Find in file"}
            autoFocus
            onChange={(event) => setFindQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setFindOpen(false);
              } else if (event.key === "Enter" && event.shiftKey) {
                event.preventDefault();
                moveToMatch(-1);
              }
            }}
            placeholder={zh ? "在当前文件中查找" : "Find in current file"}
            value={findQuery}
          />
          <small aria-live="polite">
            {findQuery
              ? `${matchOffsets.length === 0 ? 0 : activeMatch + 1} / ${matchOffsets.length}`
              : "—"}
          </small>
          <button
            aria-label={zh ? "上一个匹配项" : "Previous match"}
            disabled={matchOffsets.length === 0}
            onClick={() => moveToMatch(-1)}
            type="button"
          >
            <ProductPlaygroundIcon name="back" />
          </button>
          <button
            aria-label={zh ? "下一个匹配项" : "Next match"}
            disabled={matchOffsets.length === 0}
            onClick={() => moveToMatch(1)}
            type="button"
          >
            <ProductPlaygroundIcon name="forward" />
          </button>
          <button
            aria-label={zh ? "关闭查找" : "Close find"}
            onClick={() => setFindOpen(false)}
            type="button"
          >
            <ProductPlaygroundIcon name="close" />
          </button>
        </form>
      ) : null}
      <nav
        aria-label={zh ? "打开的文件" : "Open files"}
        data-code-tabs
        role="tablist"
      >
        <button
          aria-selected="true"
          data-dirty={dirty ? "true" : undefined}
          role="tab"
          type="button"
        >
          <ProductPlaygroundIcon name={markdown ? "document" : "code"} />
          <span>{entry.name}</span>
          {dirty ? (
            <i aria-label={zh ? "有本地更改" : "Has local changes"} />
          ) : null}
        </button>
      </nav>
      <section
        data-code-canvas
        data-code-wrap={wordWrap ? "true" : "false"}
        data-mode={mode}
      >
        {mode === "edit" ? (
          <>
            <div aria-hidden="true" data-code-editor-gutter data-code-lines />
            <textarea
              aria-label={zh ? `编辑 ${entry.name}` : `Edit ${entry.name}`}
              onChange={(event) =>
                commitDraft(
                  event.currentTarget.value,
                  zh ? "代码已修改" : "Code changed",
                )
              }
              onKeyDown={handleEditorKeyDown}
              ref={textareaRef}
              spellCheck={false}
              value={draft}
              wrap={wordWrap ? "soft" : "off"}
            />
          </>
        ) : markdown ? (
          <article data-code-editor-viewport data-markdown-preview>
            <span>{zh ? "Markdown 预览" : "Markdown preview"}</span>
            <div>{renderMarkdown(draft, zh)}</div>
          </article>
        ) : (
          <pre data-code-editor-viewport data-code-preview>
            <code>
              {lines.map((line, index) => (
                <span key={index}>
                  {highlightCode(line)}
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
        )}
      </section>
      <footer data-code-status>
        <div data-code-editor-info>
          <span aria-live="polite" data-code-editor-state>
            {dirty
              ? zh
                ? "有未保存更改"
                : "Unsaved changes"
              : zh
                ? "已保存"
                : "Saved"}
          </span>
          <span data-code-editor-lines>
            {lines.length} {zh ? "行" : lines.length === 1 ? "line" : "lines"}
          </span>
          <span data-code-editor-characters>
            {characters}{" "}
            {zh ? "个字符" : characters === 1 ? "character" : "characters"}
          </span>
        </div>
        <div data-code-editor-meta>
          {mode === "edit" ? (
            <output
              aria-label={zh ? "光标位置" : "Cursor position"}
              data-code-editor-position
            >
              {zh ? "行 1，列 1" : "Ln 1, Col 1"}
            </output>
          ) : (
            <span>{zh ? "只读预览" : "Read-only preview"}</span>
          )}
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </footer>
    </section>
  );
}

function findOccurrences(source: string, query: string) {
  const normalizedQuery = query.toLocaleLowerCase();
  if (!normalizedQuery) return [];
  const normalizedSource = source.toLocaleLowerCase();
  const offsets: number[] = [];
  let cursor = 0;
  while (cursor <= normalizedSource.length - normalizedQuery.length) {
    const offset = normalizedSource.indexOf(normalizedQuery, cursor);
    if (offset < 0) break;
    offsets.push(offset);
    cursor = offset + Math.max(1, normalizedQuery.length);
  }
  return offsets;
}

function languageLabel(name: string, fallback: string) {
  const extension = name.split(".").pop()?.toLocaleLowerCase();
  const labels: Record<string, string> = {
    css: "CSS",
    html: "HTML",
    js: "JavaScript",
    jsx: "JavaScript JSX",
    json: "JSON",
    md: "Markdown",
    mdx: "MDX",
    py: "Python",
    rs: "Rust",
    ts: "TypeScript",
    tsx: "TypeScript JSX",
    txt: "Plain text",
    vue: "Vue",
  };
  return extension ? (labels[extension] ?? fallback) : fallback;
}

function languageKey(name: string, fallback: string) {
  return (
    name.split(".").pop()?.toLocaleLowerCase() ?? fallback.toLocaleLowerCase()
  );
}

function renderMarkdown(source: string, zh: boolean) {
  const lines = source.replace(/\r\n?/gu, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```\s*([^\s]*)/u);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/u.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <section data-markdown-code key={`code-${index}`}>
          <header>{fence[1] || "text"}</header>
          <pre>
            <code>{code.join("\n")}</code>
          </pre>
        </section>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/u);
    if (heading) {
      const content = renderInlineMarkdown(heading[2]);
      blocks.push(
        heading[1].length === 1 ? (
          <h1 key={`heading-${index}`}>{content}</h1>
        ) : heading[1].length === 2 ? (
          <h2 key={`heading-${index}`}>{content}</h2>
        ) : (
          <h3 key={`heading-${index}`}>{content}</h3>
        ),
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/u.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^[-*]\s+(?:\[([ xX])\]\s+)?(.+)$/u);
        if (!item) break;
        const checked = item[1]
          ? item[1].toLocaleLowerCase() === "x"
          : undefined;
        items.push(
          <li
            data-checked={checked === undefined ? undefined : String(checked)}
            key={`item-${index}`}
          >
            {checked === undefined ? null : (
              <span aria-hidden="true" data-markdown-check>
                {checked ? <ProductPlaygroundIcon name="check" /> : null}
              </span>
            )}
            <span>{renderInlineMarkdown(item[2])}</span>
          </li>,
        );
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`}>{items}</ul>);
      continue;
    }

    if (/^>\s?/u.test(line)) {
      const quotes: string[] = [];
      while (index < lines.length && /^>\s?/u.test(lines[index])) {
        quotes.push(lines[index].replace(/^>\s?/u, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${index}`}>
          {renderInlineMarkdown(quotes.join(" "))}
        </blockquote>,
      );
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(?:#{1,3}\s+|```|[-*]\s+|>\s?)/u.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${index}`}>
        {renderInlineMarkdown(paragraph.join(" "))}
      </p>,
    );
  }

  return blocks.length > 0 ? (
    blocks
  ) : (
    <div data-markdown-empty>
      <ProductPlaygroundIcon name="document" />
      <p>
        {zh
          ? "此文件还没有可预览的内容。"
          : "This file has no content to preview yet."}
      </p>
    </div>
  );
}

function renderInlineMarkdown(source: string) {
  return source
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/gu)
    .filter(Boolean)
    .map((piece, index) =>
      piece.startsWith("`") && piece.endsWith("`") ? (
        <code key={`${piece}-${index}`}>{piece.slice(1, -1)}</code>
      ) : piece.startsWith("**") && piece.endsWith("**") ? (
        <strong key={`${piece}-${index}`}>{piece.slice(2, -2)}</strong>
      ) : (
        piece
      ),
    );
}

function codeFixture(name: string, locale: "en" | "zh") {
  if (/\.mdx?$/i.test(name)) {
    return locale === "zh"
      ? "# 发布就绪\n\n公开契约必须在源码、适配器、文档和浏览器证据之间保持一致。\n\n## 验收清单\n\n- [x] 首次导航可点击\n- [x] 所有浮层保持在可见层\n- [ ] 关联桌面与移动证据\n\n```bash\nnpm --prefix site run check:site\n```"
      : "# Release readiness\n\nPublic contracts must agree across source, adapters, documentation, and browser evidence.\n\n## Acceptance checklist\n\n- [x] First navigation is clickable\n- [x] Every overlay remains visible\n- [ ] Link desktop and mobile evidence\n\n```bash\nnpm --prefix site run check:site\n```";
  }
  return "// New workspace file\n";
}

function highlightCode(line: string): ReactNode {
  const pieces = line.split(
    /("[^"]*"|'[^']*'|\/\/.*$|#[0-9a-fA-F]{3,8}|\b(?:const|let|var|function|return|display|position|overflow|z-index|inset|border-color|import|export|from|type|interface|class|async|await)\b|\b\d+(?:\.\d+)?\b)/g,
  );
  return pieces.map((piece, index) => {
    const className = /^['"]/.test(piece)
      ? "token-string"
      : /^\/\//.test(piece)
        ? "token-comment"
        : /^#/.test(piece)
          ? "token-number"
          : /^(?:const|let|var|function|return|display|position|overflow|z-index|inset|border-color|import|export|from|type|interface|class|async|await)$/.test(
                piece,
              )
            ? "token-keyword"
            : /^\d/.test(piece)
              ? "token-number"
              : undefined;
    return (
      <span className={className} key={`${piece}-${index}`}>
        {piece}
      </span>
    );
  });
}
