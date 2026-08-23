import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import type { ProductTaskArtifact } from "./product-task-session-state";

export function ProductSessionArtifactsPanel({
  artifacts,
  id,
  locale,
}: {
  artifacts: readonly ProductTaskArtifact[];
  id: string;
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const activeArtifact = artifacts.find(
    (artifact) => artifact.id === activeArtifactId,
  );

  useEffect(() => {
    window.a3sUI?.start();
    window.a3sUI?.initAll();
  }, [activeArtifactId]);

  return (
    <section className="product-inspector-artifacts" id={id} role="tabpanel">
      {activeArtifact ? (
        <article
          className="artifact-card product-inspector-artifacts__preview"
          data-state="complete"
          data-variant="inspector"
        >
          <header>
            <button
              onClick={() => {
                setActiveArtifactId(null);
              }}
              type="button"
            >
              <ProductPlaygroundIcon name="back" />
              {zh ? "返回" : "Back"}
            </button>
            <button
              className="btn copy-button"
              data-copy-error={
                zh ? "复制失败，请重试" : "Copy failed. Try again."
              }
              data-copy-success={zh ? "已复制" : "Copied"}
              data-copy-text={activeArtifact.content}
              data-size="sm"
              data-variant="ghost"
              type="button"
            >
              <ProductPlaygroundIcon name="copy" />
              <span data-copy-label>{zh ? "复制" : "Copy"}</span>
              <span aria-live="polite" data-copy-feedback />
            </button>
          </header>
          <section>
            <div className="product-inspector-artifacts__identity">
              <span>
                <ProductPlaygroundIcon name="document" />
              </span>
              <strong>{activeArtifact.name}</strong>
              <small>{activeArtifact.summary[locale]}</small>
            </div>
            <pre
              aria-label={
                zh
                  ? `${activeArtifact.name} 代码预览`
                  : `${activeArtifact.name} code preview`
              }
              className="highlighter"
              tabIndex={0}
            >
              <code>{renderArtifactLines(activeArtifact)}</code>
            </pre>
          </section>
          <footer>
            <span data-artifact-meta>
              {activeArtifact.kind} ·{" "}
              {countArtifactLines(activeArtifact.content)} {zh ? "行" : "lines"}
            </span>
          </footer>
        </article>
      ) : (
        <>
          <header className="product-inspector-section-heading">
            <div>
              <strong>{zh ? "交付产物" : "Deliverables"}</strong>
              <small>
                {zh
                  ? "集中查看任务生成和修改的文件"
                  : "Review files created or changed by this task"}
              </small>
            </div>
            <span>{artifacts.length}</span>
          </header>
          <div className="product-inspector-file-list">
            {artifacts.map((artifact) => (
              <button
                key={artifact.id}
                onClick={() => setActiveArtifactId(artifact.id)}
                type="button"
              >
                <span data-file-kind={artifact.kind.toLocaleLowerCase()}>
                  <ProductPlaygroundIcon name="document" />
                </span>
                <span>
                  <strong>{artifact.name}</strong>
                  <small>{artifact.summary[locale]}</small>
                </span>
                <ProductPlaygroundIcon name="chevron" />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function ProductSessionFilesPanel({
  artifacts,
  id,
  locale,
}: {
  artifacts: readonly ProductTaskArtifact[];
  id: string;
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [selectedFileId, setSelectedFileId] = useState(artifacts[0]?.id ?? "");
  const explorerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!artifacts.some((artifact) => artifact.id === selectedFileId)) {
      setSelectedFileId(artifacts[0]?.id ?? "");
    }
  }, [artifacts, selectedFileId]);

  useEffect(() => {
    const explorer = explorerRef.current;
    if (!explorer) return;
    const handleBeforeSelection = (event: Event) => {
      const value = (event as CustomEvent<{ value?: string }>).detail?.value;
      if (!value || !artifacts.some((artifact) => artifact.id === value)) {
        event.preventDefault();
      }
    };
    const handleSelection = (event: Event) => {
      const value = (event as CustomEvent<{ value?: string }>).detail?.value;
      if (value && artifacts.some((artifact) => artifact.id === value)) {
        setSelectedFileId(value);
      }
    };
    explorer.addEventListener(
      "a3s:file-before-selection-change",
      handleBeforeSelection,
    );
    explorer.addEventListener("a3s:file-selection-change", handleSelection);
    window.a3sUI?.start();
    window.a3sUI?.initAll();
    return () => {
      explorer.removeEventListener(
        "a3s:file-before-selection-change",
        handleBeforeSelection,
      );
      explorer.removeEventListener(
        "a3s:file-selection-change",
        handleSelection,
      );
    };
  }, [artifacts]);

  const selectedFile =
    artifacts.find((artifact) => artifact.id === selectedFileId) ??
    artifacts[0];
  const diffLines = useMemo(() => buildDiffLines(selectedFile), [selectedFile]);

  return (
    <section className="product-inspector-files" id={id} role="tabpanel">
      <header className="product-inspector-section-heading">
        <div>
          <strong>{zh ? "工作区变更" : "Workspace changes"}</strong>
          <small>
            {zh
              ? `${artifacts.length} 个文件 · 确定性预览数据`
              : `${artifacts.length} files · Deterministic preview data`}
          </small>
        </div>
        <span data-change>+42 −6</span>
      </header>
      <section
        aria-label={zh ? "变更文件" : "Changed files"}
        className="file-explorer product-inspector-files__explorer"
        data-readonly="true"
        data-state="ready"
        ref={explorerRef}
      >
        <div data-file-explorer-viewport>
          <div
            aria-label={zh ? "工作区变更文件树" : "Workspace change tree"}
            className="tree"
            role="tree"
          >
            <div
              aria-expanded="true"
              aria-selected="false"
              data-value="workspace"
              role="treeitem"
            >
              <div data-tree-row>
                <ProductPlaygroundIcon name="folder" />
                <span data-tree-label>workspace</span>
                <span data-tree-meta>{artifacts.length}</span>
              </div>
              <div role="group">
                {artifacts.map((artifact) => (
                  <div
                    aria-selected={selectedFile?.id === artifact.id}
                    data-value={artifact.id}
                    key={artifact.id}
                    role="treeitem"
                  >
                    <div data-tree-row>
                      <ProductPlaygroundIcon name="document" />
                      <span data-tree-label>{artifact.name}</span>
                      <span data-tree-meta>
                        {artifact.id === "tests" ? "+24" : "+18 −6"}
                      </span>
                      <span
                        aria-label={
                          artifact.id === "tests"
                            ? zh
                              ? "新增"
                              : "Added"
                            : zh
                              ? "已修改"
                              : "Modified"
                        }
                        data-file-status={
                          artifact.id === "tests" ? "added" : "modified"
                        }
                      >
                        {artifact.id === "tests" ? "A" : "M"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {selectedFile ? (
        <figure className="code-diff product-inspector-diff" data-line-numbers>
          <figcaption>
            <strong>{selectedFile.name}</strong>
            <span>
              <i>+{diffLines.filter((line) => line.kind === "added").length}</i>
              <b>
                −{diffLines.filter((line) => line.kind === "removed").length}
              </b>
            </span>
          </figcaption>
          <pre
            aria-label={
              zh
                ? `${selectedFile.name} 行级差异`
                : `${selectedFile.name} line diff`
            }
            tabIndex={0}
          >
            <code>
              {diffLines.map((line, index) => {
                const marker =
                  line.kind === "added"
                    ? "+"
                    : line.kind === "removed"
                      ? "−"
                      : " ";
                return (
                  <span data-diff-line={marker} key={`${line.kind}-${index}`}>
                    <span aria-hidden="true" data-diff-old-line>
                      {line.oldLine ?? ""}
                    </span>
                    <span aria-hidden="true" data-diff-new-line>
                      {line.newLine ?? ""}
                    </span>
                    <span aria-hidden="true" data-diff-marker>
                      {marker}
                    </span>
                    <span data-diff-code>{line.text || " "}</span>
                  </span>
                );
              })}
            </code>
          </pre>
        </figure>
      ) : null}
    </section>
  );
}

function countArtifactLines(content: string) {
  return content.replace(/\r\n?/gu, "\n").split("\n").length;
}

function renderArtifactLines(artifact: ProductTaskArtifact) {
  return artifact.content
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line, index) => (
      <span data-code-line key={`${artifact.id}-${index}`}>
        {highlightArtifactLine(line, artifact.kind)}
      </span>
    ));
}

function highlightArtifactLine(line: string, kind: string): ReactNode[] {
  if (kind.toLocaleLowerCase() === "markdown") {
    const heading = line.match(/^(#+)(\s.*)?$/u);
    if (heading) {
      return [
        <span data-code-token="heading" key="heading-marker">
          {heading[1]}
        </span>,
        heading[2] ?? "",
      ];
    }
    const listItem = line.match(/^(\s*)([-*])(\s.*)$/u);
    if (listItem) {
      return [
        listItem[1] ?? "",
        <span data-code-token="punctuation" key="list-marker">
          {listItem[2]}
        </span>,
        listItem[3] ?? "",
      ];
    }
    return [line];
  }

  const tokens: ReactNode[] = [];
  const pattern =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*$|\b(?:async|await|const|export|function|return|test|expect|true|false|null|undefined)\b|\b(?:string|number|boolean|void)\b)/gu;
  let cursor = 0;
  let tokenIndex = 0;
  for (const match of line.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) tokens.push(line.slice(cursor, start));
    const value = match[0];
    const token = value.startsWith("//")
      ? "comment"
      : /^["'`]/u.test(value)
        ? "string"
        : /^(?:string|number|boolean|void)$/u.test(value)
          ? "type"
          : "keyword";
    tokens.push(
      <span data-code-token={token} key={`${token}-${tokenIndex}`}>
        {value}
      </span>,
    );
    cursor = start + value.length;
    tokenIndex += 1;
  }
  if (cursor < line.length) tokens.push(line.slice(cursor));
  return tokens.length ? tokens : [line];
}

type DiffLine = {
  kind: "added" | "context" | "removed";
  newLine?: number;
  oldLine?: number;
  text: string;
};

function buildDiffLines(artifact?: ProductTaskArtifact): DiffLine[] {
  if (!artifact) return [];
  const source = artifact.content.replace(/\r\n?/gu, "\n").split("\n");
  if (artifact.id === "session") {
    return [
      {
        kind: "context",
        newLine: 1,
        oldLine: 1,
        text: source[0] ?? "",
      },
      {
        kind: "removed",
        oldLine: 2,
        text: "  const recoveryTarget = session.returnTo;",
      },
      {
        kind: "added",
        newLine: 2,
        text:
          source[1] ??
          "  const recoveryTarget = normalizeReturnPath(returnTo);",
      },
      ...source.slice(2, 7).map((text, index) => ({
        kind: "context" as const,
        newLine: index + 3,
        oldLine: index + 3,
        text,
      })),
    ];
  }
  return source.slice(0, 8).map((text, index) => ({
    kind: "added" as const,
    newLine: index + 1,
    text,
  }));
}
