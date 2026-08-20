import { useSyncExternalStore } from "react";
import type { ProductComposerWorkspace } from "./product-composer-data";
import type { ProductFileWorkbenchKind } from "./product-file-manager-data";

export type ProductWorkspaceFileState = "copying" | "error" | "ready";

export type ProductWorkspaceFileErrorCode = "file-too-large" | "read-failed";

export type ProductWorkspaceFile = {
  errorCode?: ProductWorkspaceFileErrorCode;
  file: File;
  id: string;
  importedAt: string;
  mimeType: string;
  name: string;
  originalName: string;
  parentId: string;
  state: ProductWorkspaceFileState;
  workspace: Exclude<ProductComposerWorkspace, "">;
};

export type ProductWorkspaceFileRejection = {
  code: "batch-limit" | "file-too-large";
  file: File;
};

export type ProductWorkspaceFileBatch = {
  completion: Promise<readonly ProductWorkspaceFile[]>;
  duplicateIds: readonly string[];
  records: readonly ProductWorkspaceFile[];
  rejected: readonly ProductWorkspaceFileRejection[];
};

export const productWorkspaceFileBatchLimit = 20;
export const productWorkspaceFileSizeLimit = 100 * 1024 * 1024;

let snapshot: readonly ProductWorkspaceFile[] = [];
const listeners = new Set<() => void>();

function emit(next: readonly ProductWorkspaceFile[]) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProductWorkspaceFiles() {
  return snapshot;
}

export function useProductWorkspaceFiles() {
  return useSyncExternalStore(
    subscribe,
    getProductWorkspaceFiles,
    getProductWorkspaceFiles,
  );
}

export function queueProductWorkspaceFiles(
  files: readonly File[],
  {
    parentId = "root",
    workspace = "ui",
  }: {
    parentId?: string;
    workspace?: ProductComposerWorkspace;
  } = {},
): ProductWorkspaceFileBatch {
  const targetWorkspace = workspace || "ui";
  const accepted: ProductWorkspaceFile[] = [];
  const duplicates: string[] = [];
  const rejected: ProductWorkspaceFileRejection[] = [];
  const candidates = files.slice(0, productWorkspaceFileBatchLimit);

  files.slice(productWorkspaceFileBatchLimit).forEach((file) => {
    rejected.push({ code: "batch-limit", file });
  });

  let next = [...snapshot];
  candidates.forEach((file) => {
    if (file.size > productWorkspaceFileSizeLimit) {
      rejected.push({ code: "file-too-large", file });
      return;
    }

    const duplicate = next.find(
      (record) =>
        record.parentId === parentId &&
        record.workspace === targetWorkspace &&
        record.originalName === file.name &&
        record.file.size === file.size &&
        record.file.lastModified === file.lastModified,
    );
    if (duplicate) {
      accepted.push(duplicate);
      duplicates.push(duplicate.id);
      return;
    }

    const record: ProductWorkspaceFile = {
      file,
      id: createWorkspaceFileId(),
      importedAt: new Date().toISOString(),
      mimeType: file.type || "application/octet-stream",
      name: resolveWorkspaceFileName(file.name, next, parentId),
      originalName: file.name,
      parentId,
      state: "copying",
      workspace: targetWorkspace,
    };
    accepted.push(record);
    next.push(record);
  });

  if (next.length !== snapshot.length) emit(next);

  const completion = Promise.all(
    accepted.map((record) =>
      duplicates.includes(record.id)
        ? record.state === "error"
          ? retryProductWorkspaceFile(record.id)
          : Promise.resolve(record)
        : verifyProductWorkspaceFile(record.id),
    ),
  );

  return {
    completion,
    duplicateIds: duplicates,
    records: accepted,
    rejected,
  };
}

export function retryProductWorkspaceFile(id: string) {
  const record = snapshot.find((item) => item.id === id);
  if (!record) return Promise.reject(new Error("Workspace file not found."));
  updateProductWorkspaceFile(id, {
    errorCode: undefined,
    state: "copying",
  });
  return verifyProductWorkspaceFile(id);
}

export function removeProductWorkspaceFiles(ids: readonly string[]) {
  if (ids.length === 0) return;
  const targets = new Set(ids);
  const next = snapshot.filter((record) => !targets.has(record.id));
  if (next.length !== snapshot.length) emit(next);
}

export function renameProductWorkspaceFile(id: string, name: string) {
  const record = snapshot.find((item) => item.id === id);
  const normalized = name.trim();
  if (!record || !normalized) return;
  const peers = snapshot.filter((item) => item.id !== id);
  updateProductWorkspaceFile(id, {
    name: resolveWorkspaceFileName(normalized, peers, record.parentId),
  });
}

export function updateProductWorkspaceFileContents(
  id: string,
  contents: string,
) {
  const record = snapshot.find((item) => item.id === id);
  if (!record) throw new Error("Workspace file not found.");
  const file = new File([contents], record.name, {
    lastModified: Date.now(),
    type: record.mimeType.startsWith("text/") ? record.mimeType : "text/plain",
  });
  const updated = {
    ...record,
    file,
    mimeType: file.type,
    state: "ready" as const,
  };
  emit(snapshot.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export function moveProductWorkspaceFile(id: string, parentId: string) {
  const record = snapshot.find((item) => item.id === id);
  if (!record || record.parentId === parentId) return;
  const peers = snapshot.filter((item) => item.id !== id);
  updateProductWorkspaceFile(id, {
    name: resolveWorkspaceFileName(record.name, peers, parentId),
    parentId,
  });
}

export function getProductWorkspaceFile(id: string) {
  return snapshot.find((record) => record.id === id);
}

export function inferProductWorkspaceFileWorkbench(
  name: string,
): ProductFileWorkbenchKind | undefined {
  const extension = name.split(".").pop()?.toLocaleLowerCase();
  if (!extension) return undefined;
  if (["doc", "docx", "odt"].includes(extension)) return "document";
  if (["csv", "ods", "xls", "xlsx"].includes(extension)) return "spreadsheet";
  if (["odp", "ppt", "pptx"].includes(extension)) return "presentation";
  if (extension === "pdf") return "pdf";
  if (
    [
      "css",
      "html",
      "js",
      "json",
      "jsx",
      "md",
      "mdx",
      "py",
      "rs",
      "ts",
      "tsx",
      "txt",
      "vue",
    ].includes(extension)
  )
    return "code";
  return undefined;
}

export function productWorkspaceFileType(name: string) {
  const extension = name.split(".").pop()?.toLocaleLowerCase();
  const labels: Record<string, string> = {
    csv: "CSV",
    doc: "Word document",
    docx: "Word document",
    ods: "OpenDocument spreadsheet",
    odp: "OpenDocument presentation",
    odt: "OpenDocument text",
    pdf: "PDF document",
    ppt: "PowerPoint presentation",
    pptx: "PowerPoint presentation",
    xls: "Excel workbook",
    xlsx: "Excel workbook",
  };
  return extension
    ? (labels[extension] ?? extension.toLocaleUpperCase())
    : "File";
}

async function verifyProductWorkspaceFile(id: string) {
  const record = snapshot.find((item) => item.id === id);
  if (!record) throw new Error("Workspace file not found.");
  try {
    await record.file.slice(0, Math.min(record.file.size, 64)).arrayBuffer();
    return updateProductWorkspaceFile(id, {
      errorCode: undefined,
      state: "ready",
    });
  } catch {
    return updateProductWorkspaceFile(id, {
      errorCode: "read-failed",
      state: "error",
    });
  }
}

function updateProductWorkspaceFile(
  id: string,
  patch: Partial<Omit<ProductWorkspaceFile, "file" | "id">>,
) {
  let updated: ProductWorkspaceFile | undefined;
  const next = snapshot.map((record) => {
    if (record.id !== id) return record;
    updated = { ...record, ...patch };
    return updated;
  });
  if (!updated) throw new Error("Workspace file not found.");
  emit(next);
  return updated;
}

function resolveWorkspaceFileName(
  requestedName: string,
  records: readonly ProductWorkspaceFile[],
  parentId: string,
) {
  const names = new Set(
    records
      .filter((record) => record.parentId === parentId)
      .map((record) => record.name.toLocaleLowerCase()),
  );
  if (!names.has(requestedName.toLocaleLowerCase())) return requestedName;
  const dot = requestedName.lastIndexOf(".");
  const stem = dot > 0 ? requestedName.slice(0, dot) : requestedName;
  const extension = dot > 0 ? requestedName.slice(dot) : "";
  let index = 2;
  while (names.has(`${stem} (${index})${extension}`.toLocaleLowerCase())) {
    index += 1;
  }
  return `${stem} (${index})${extension}`;
}

function createWorkspaceFileId() {
  const value =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `workspace-file-${value}`;
}
