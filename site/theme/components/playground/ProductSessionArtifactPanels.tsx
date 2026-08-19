import { useEffect, useMemo, useState } from "react";
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
  const [copyStatus, setCopyStatus] = useState("");
  const activeArtifact = artifacts.find(
    (artifact) => artifact.id === activeArtifactId,
  );

  const copyArtifact = async () => {
    if (!activeArtifact) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.content);
      setCopyStatus(zh ? "内容已复制" : "Content copied");
    } catch {
      setCopyStatus(zh ? "无法复制内容" : "Unable to copy content");
    }
  };

  return (
    <section className="product-inspector-artifacts" id={id} role="tabpanel">
      {activeArtifact ? (
        <div className="product-inspector-artifacts__preview">
          <header>
            <button
              onClick={() => {
                setActiveArtifactId(null);
                setCopyStatus("");
              }}
              type="button"
            >
              <ProductPlaygroundIcon name="back" />
              {zh ? "返回" : "Back"}
            </button>
            <button onClick={copyArtifact} type="button">
              <ProductPlaygroundIcon name="copy" />
              {zh ? "复制" : "Copy"}
            </button>
          </header>
          <div className="product-inspector-artifacts__identity">
            <span>
              <ProductPlaygroundIcon name="document" />
            </span>
            <strong>{activeArtifact.name}</strong>
            <small>{activeArtifact.summary[locale]}</small>
          </div>
          <pre>
            <code>{activeArtifact.content}</code>
          </pre>
          <output aria-live="polite">{copyStatus}</output>
        </div>
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

  useEffect(() => {
    if (!artifacts.some((artifact) => artifact.id === selectedFileId)) {
      setSelectedFileId(artifacts[0]?.id ?? "");
    }
  }, [artifacts, selectedFileId]);

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
              ? `${artifacts.length} 个文件 · 仅显示本任务范围`
              : `${artifacts.length} files · Task scope only`}
          </small>
        </div>
        <span data-change>+42 −6</span>
      </header>
      <nav
        aria-label={zh ? "变更文件" : "Changed files"}
        className="product-inspector-files__tree"
      >
        <div>
          <ProductPlaygroundIcon name="folder" />
          <strong>workspace</strong>
          <small>{artifacts.length}</small>
        </div>
        {artifacts.map((artifact) => (
          <button
            aria-current={selectedFile?.id === artifact.id ? "true" : undefined}
            key={artifact.id}
            onClick={() => setSelectedFileId(artifact.id)}
            type="button"
          >
            <ProductPlaygroundIcon name="document" />
            <span>{artifact.name}</span>
            <small>{artifact.id === "tests" ? "+24" : "+18 −6"}</small>
          </button>
        ))}
      </nav>
      {selectedFile ? (
        <section className="product-inspector-diff">
          <header>
            <strong>{selectedFile.name}</strong>
            <span>
              <i>+{diffLines.filter((line) => line.kind === "added").length}</i>
              <b>
                −{diffLines.filter((line) => line.kind === "removed").length}
              </b>
            </span>
          </header>
          <div>
            <table
              aria-label={
                zh
                  ? `${selectedFile.name} 行级差异`
                  : `${selectedFile.name} line diff`
              }
            >
              <tbody>
                {diffLines.map((line, index) => (
                  <tr data-kind={line.kind} key={`${line.kind}-${index}`}>
                    <td>{line.oldLine}</td>
                    <td>{line.newLine}</td>
                    <td aria-hidden="true">
                      {line.kind === "added"
                        ? "+"
                        : line.kind === "removed"
                          ? "−"
                          : " "}
                    </td>
                    <td>
                      <code>{line.text || " "}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
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
