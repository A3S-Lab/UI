import {
  createArtifact,
  createOfficeId,
  importOfficeFile,
  type DocumentContent,
  type OfficeArtifact,
  type OfficeArtifactContent,
  type OfficeFileImportProgress,
  type PresentationContent,
  type SpreadsheetContent,
} from "@a3s-lab/office/core";
import {
  defaultPdfiumWasmUrl,
  DocumentEditor,
  PdfViewer,
  PresentationEditor,
  SpreadsheetEditor,
} from "@a3s-lab/office/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductFileSurfaceProps } from "./ProductFileWorkbenchSurfaces";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import { getProductWorkspaceFile } from "./product-workspace-files";
import { useProductAppearance } from "./useProductAppearance";

type OfficeLoadState = "error" | "loading" | "ready";
type SeededOfficeEntry = {
  artifact: OfficeArtifact;
  pdfSource: Blob | null;
};

export function ProductOfficeWorkbench({
  entry,
  locale,
  mode,
  onChange,
  onSaved,
  onStatus,
}: ProductFileSurfaceProps) {
  const zh = locale === "zh";
  const { mode: colorMode } = useProductAppearance();
  const [initialSeed] = useState(() => ({
    entryId: entry.id,
    value: createSeededOfficeEntry(entry),
  }));
  const [artifact, setArtifact] = useState<OfficeArtifact | null>(
    initialSeed.value?.artifact ?? null,
  );
  const [error, setError] = useState("");
  const [loadState, setLoadState] = useState<OfficeLoadState>(
    initialSeed.value ? "ready" : "loading",
  );
  const [pdfSource, setPdfSource] = useState<Blob | null>(
    initialSeed.value?.pdfSource ?? null,
  );
  const [progress, setProgress] = useState<OfficeFileImportProgress | null>(
    null,
  );
  const [retryRevision, setRetryRevision] = useState(0);
  const userChangeIntentRef = useRef(false);
  const loadPdfSource = useCallback(async () => {
    if (!pdfSource) throw new Error("PDF source is not ready.");
    return pdfSource;
  }, [pdfSource]);

  useEffect(() => {
    const kind = entry.workbench;
    if (!kind || kind === "code") return;
    const controller = new AbortController();
    let active = true;
    setArtifact(null);
    setError("");
    setLoadState("loading");
    setPdfSource(null);
    setProgress(null);
    userChangeIntentRef.current = false;

    const open = async () => {
      try {
        const workspaceFile = entry.workspaceFileId
          ? getProductWorkspaceFile(entry.workspaceFileId)
          : undefined;
        if (workspaceFile?.state === "error") {
          throw new Error("The workspace file could not be read.");
        }
        if (workspaceFile?.state === "copying") {
          throw new Error("The workspace file is still being copied.");
        }

        if (workspaceFile) {
          const shell =
            kind === "pdf" ? null : createArtifact(templateForKind(kind));
          const imported = await importOfficeFile(workspaceFile.file, {
            ...(shell ? { artifactId: shell.id } : {}),
            ...(shell?.content.type === "spreadsheet"
              ? {
                  spreadsheetSheetIds: shell.content.sheets.flatMap((sheet) =>
                    sheet.id ? [sheet.id] : [],
                  ),
                }
              : {}),
            onProgress: (nextProgress) => {
              if (active) setProgress(nextProgress);
            },
            signal: controller.signal,
          });
          if (!active) return;
          setArtifact({
            ...imported,
            lastOpenedAt: Date.now(),
            title: fileTitle(entry.name),
          });
          if (kind === "pdf") setPdfSource(workspaceFile.file);
        } else {
          const seeded =
            initialSeed.entryId === entry.id
              ? initialSeed.value
              : createSeededOfficeEntry(entry);
          if (!seeded) throw new Error("Office seed data is not available.");
          setArtifact(seeded.artifact);
          setPdfSource(seeded.pdfSource);
        }
        if (!active) return;
        setLoadState("ready");
        onStatus(
          zh
            ? `已使用 A3S Office 打开“${entry.name}”`
            : `Opened “${entry.name}” with A3S Office`,
        );
      } catch (cause) {
        if (!active || controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setLoadState("error");
      }
    };

    void open();
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    entry.id,
    entry.name,
    entry.workbench,
    entry.workspaceFileId,
    initialSeed,
    retryRevision,
    zh,
  ]);

  const updateContent = useCallback(
    (content: OfficeArtifactContent) => {
      setArtifact((current) =>
        current
          ? {
              ...current,
              content,
              revision: current.revision + 1,
              updatedAt: Date.now(),
            }
          : current,
      );
      if (userChangeIntentRef.current) {
        onChange(zh ? "Office 文件已修改" : "Office file changed");
      }
    },
    [onChange, zh],
  );

  if (loadState === "error") {
    return (
      <section
        className="product-office-host"
        data-file-surface
        data-office-load-state="error"
        role="alert"
      >
        <div data-office-state>
          <span>
            <ProductPlaygroundIcon name="warning" />
          </span>
          <strong>
            {zh ? "无法打开此文件" : "This file could not be opened"}
          </strong>
          <p>
            {zh
              ? "文件仍保留在工作区。请重试；如果问题持续，可移除后重新导入。"
              : "The file remains in the workspace. Retry, or remove and import it again if the problem continues."}
          </p>
          <small>{error}</small>
          <button
            onClick={() => setRetryRevision((value) => value + 1)}
            type="button"
          >
            <ProductPlaygroundIcon name="refresh" />
            {zh ? "重试打开" : "Retry opening"}
          </button>
        </div>
      </section>
    );
  }

  if (loadState === "loading" || !artifact) {
    const percentage = progress ? Math.round(progress.progress * 100) : 0;
    return (
      <section
        className="product-office-host"
        data-file-surface
        data-office-load-state="loading"
        role="status"
      >
        <div data-office-state>
          <span data-office-spinner>
            <ProductPlaygroundIcon name="refresh" />
          </span>
          <strong>
            {zh ? "正在准备 Office 编辑器" : "Preparing the Office editor"}
          </strong>
          <p>
            {progress
              ? zh
                ? `正在解析 ${entry.name} · ${percentage}%`
                : `Parsing ${entry.name} · ${percentage}%`
              : zh
                ? "正在加载文件内核与编辑能力…"
                : "Loading the file kernel and editing capabilities…"}
          </p>
          <div aria-hidden="true" data-office-progress>
            <i
              style={{
                transform: `scaleX(${Math.max(6, percentage) / 100})`,
              }}
            />
          </div>
        </div>
      </section>
    );
  }

  const preview = mode === "preview";
  const saveStatus = zh ? "本次会话已保存" : "Saved in this session";
  const common = {
    className: "product-office-surface",
    preview,
    theme: colorMode,
  } as const;
  const armChangeTracking = () => {
    userChangeIntentRef.current = true;
  };

  if (artifact.content.type === "document") {
    return (
      <section
        className="product-office-host"
        data-file-surface
        data-office-load-state="ready"
        onBeforeInputCapture={armChangeTracking}
        onKeyDownCapture={armChangeTracking}
        onPointerDownCapture={armChangeTracking}
      >
        <DocumentEditor
          {...common}
          artifactId={artifact.id}
          content={artifact.content}
          defaultRibbonCollapsed={false}
          onChange={(content: DocumentContent) => updateContent(content)}
          saveStatus={saveStatus}
        />
      </section>
    );
  }

  if (artifact.content.type === "spreadsheet") {
    return (
      <section
        className="product-office-host"
        data-file-surface
        data-office-load-state="ready"
        onBeforeInputCapture={armChangeTracking}
        onKeyDownCapture={armChangeTracking}
        onPointerDownCapture={armChangeTracking}
      >
        <SpreadsheetEditor
          {...common}
          content={artifact.content}
          onChange={(content: SpreadsheetContent) => updateContent(content)}
          saveStatus={saveStatus}
        />
      </section>
    );
  }

  if (artifact.content.type === "presentation") {
    return (
      <section
        className="product-office-host"
        data-file-surface
        data-office-load-state="ready"
        onBeforeInputCapture={armChangeTracking}
        onKeyDownCapture={armChangeTracking}
        onPointerDownCapture={armChangeTracking}
      >
        <PresentationEditor
          {...common}
          content={artifact.content}
          onChange={(content: PresentationContent) => updateContent(content)}
          saveStatus={saveStatus}
        />
      </section>
    );
  }

  if (artifact.content.type === "pdf" && pdfSource) {
    return (
      <section
        className="product-office-host"
        data-file-surface
        data-office-load-state="ready"
      >
        <PdfViewer
          className="product-office-surface"
          fileName={entry.name}
          loadSource={loadPdfSource}
          onSave={async () => {
            onSaved(zh ? "PDF 更改已保存" : "PDF changes saved");
            return true;
          }}
          sourceKey={`${artifact.id}:${artifact.revision}`}
          theme={colorMode}
          wasmUrl={defaultPdfiumWasmUrl}
        />
      </section>
    );
  }

  return null;
}

function templateForKind(
  kind: NonNullable<ProductFileSurfaceProps["entry"]["workbench"]>,
) {
  if (kind === "spreadsheet") return "quarterly-plan";
  if (kind === "presentation") return "strategy-deck";
  return "project-brief";
}

function createSeededOfficeEntry(
  entry: ProductFileSurfaceProps["entry"],
): SeededOfficeEntry | null {
  const kind = entry.workbench;
  if (!kind || kind === "code" || entry.workspaceFileId) return null;

  if (kind !== "pdf") {
    const artifact = createArtifact(templateForKind(kind));
    return {
      artifact: { ...artifact, title: fileTitle(entry.name) },
      pdfSource: null,
    };
  }

  const pdfSource = createSeedPdf();
  const now = Date.now();
  return {
    artifact: {
      content: { pageCount: 2, type: "pdf" },
      createdAt: now,
      favorite: false,
      id: createOfficeId("playground-pdf"),
      kind: "pdf",
      lastOpenedAt: now,
      revision: 1,
      source: {
        contentType: "application/pdf",
        name: entry.name,
        size: pdfSource.size,
        updatedAt: now,
      },
      title: fileTitle(entry.name),
      updatedAt: now,
    },
    pdfSource,
  };
}

function fileTitle(name: string) {
  return name.replace(/\.[^.]+$/i, "") || name;
}

function createSeedPdf() {
  const firstPage = [
    "BT",
    "/F1 24 Tf",
    "72 742 Td",
    "(Visual acceptance report) Tj",
    "/F1 12 Tf",
    "0 -42 Td",
    "(Desktop, mobile, focus, and workspace evidence.) Tj",
    "0 -24 Td",
    "(Rendered by the A3S Office PDF viewer.) Tj",
    "ET",
  ].join("\n");
  const secondPage = [
    "BT",
    "/F1 24 Tf",
    "72 742 Td",
    "(Acceptance evidence) Tj",
    "/F1 12 Tf",
    "0 -42 Td",
    "(1. Navigation and overlay checks) Tj",
    "0 -24 Td",
    "(2. Desktop and mobile screenshots) Tj",
    "0 -24 Td",
    "(3. Keyboard and zoom follow-up) Tj",
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
    `<< /Length ${firstPage.length} >>\nstream\n${firstPage}\nendstream`,
    `<< /Length ${secondPage.length} >>\nstream\n${secondPage}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
