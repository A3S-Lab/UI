import type { ProductFileEntry } from "./product-file-manager-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export type ProductFileTypeIconSize =
  "grid" | "list" | "navigation" | "preview";

type ProductFileVisualKind =
  | "archive"
  | "code"
  | "document"
  | "file"
  | "folder"
  | "image"
  | "media"
  | "pdf"
  | "presentation"
  | "spreadsheet";

export type ProductFileIconEntry = Pick<
  ProductFileEntry,
  "favorite" | "kind" | "name" | "type" | "workbench"
>;

const codeExtensions = new Set([
  "acl",
  "css",
  "go",
  "html",
  "java",
  "js",
  "json",
  "jsx",
  "md",
  "mdx",
  "py",
  "rb",
  "rs",
  "sh",
  "sql",
  "swift",
  "toml",
  "ts",
  "tsx",
  "vue",
  "xml",
  "yaml",
  "yml",
]);

const documentExtensions = new Set([
  "doc",
  "docx",
  "odt",
  "pages",
  "rtf",
  "txt",
]);

const spreadsheetExtensions = new Set(["csv", "numbers", "ods", "xls", "xlsx"]);

const presentationExtensions = new Set(["key", "odp", "ppt", "pptx"]);
const imageExtensions = new Set([
  "avif",
  "gif",
  "heic",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);
const archiveExtensions = new Set([
  "7z",
  "bz2",
  "gz",
  "rar",
  "tar",
  "tgz",
  "xz",
  "zip",
]);
const mediaExtensions = new Set([
  "aac",
  "flac",
  "m4a",
  "mkv",
  "mov",
  "mp3",
  "mp4",
  "ogg",
  "wav",
  "webm",
]);

const compactExtensionLabels: Readonly<Record<string, string>> = {
  javascript: "JS",
  jpeg: "JPG",
  markdown: "MD",
  powerpoint: "PPT",
  typescript: "TS",
};

function fileExtension(name: string) {
  const normalized = name.trim().toLocaleLowerCase("en-US");
  if (normalized.endsWith(".tar.gz")) return "tgz";
  const separator = normalized.lastIndexOf(".");
  if (separator <= 0 || separator === normalized.length - 1) return "";
  return normalized.slice(separator + 1);
}

export function productFileVisual(entry: ProductFileIconEntry): {
  kind: ProductFileVisualKind;
  label: string;
} {
  if (entry.kind === "folder") return { kind: "folder", label: "" };

  const extension = fileExtension(entry.name);
  let kind: ProductFileVisualKind = "file";

  if (extension === "pdf" || entry.workbench === "pdf") {
    kind = "pdf";
  } else if (
    spreadsheetExtensions.has(extension) ||
    entry.workbench === "spreadsheet"
  ) {
    kind = "spreadsheet";
  } else if (
    presentationExtensions.has(extension) ||
    entry.workbench === "presentation"
  ) {
    kind = "presentation";
  } else if (
    documentExtensions.has(extension) ||
    entry.workbench === "document"
  ) {
    kind = "document";
  } else if (imageExtensions.has(extension) || entry.type.includes("image")) {
    kind = "image";
  } else if (archiveExtensions.has(extension)) {
    kind = "archive";
  } else if (mediaExtensions.has(extension)) {
    kind = "media";
  } else if (codeExtensions.has(extension) || entry.workbench === "code") {
    kind = "code";
  }

  const typeLabel =
    entry.type.split(/\s+/)[0]?.toLocaleLowerCase("en-US") ?? "";
  const rawLabel = extension || compactExtensionLabels[typeLabel] || "file";
  const label =
    compactExtensionLabels[rawLabel] ??
    rawLabel.slice(0, 4).toLocaleUpperCase("en-US");

  return { kind, label };
}

export function ProductFileTypeIcon({
  entry,
  favorite = entry.favorite,
  size = "list",
}: {
  entry: ProductFileIconEntry;
  favorite?: boolean;
  size?: ProductFileTypeIconSize;
}) {
  const visual = productFileVisual(entry);

  return (
    <span
      aria-hidden="true"
      data-file-icon
      data-file-icon-size={size}
      data-file-type={visual.kind}
    >
      {visual.kind === "folder" ? (
        <svg data-file-folder viewBox="0 0 64 52">
          <path
            d="M5 10.5A4.5 4.5 0 0 1 9.5 6h14.2c1.5 0 2.9.7 3.8 1.9l3.4 4.6h23.6A4.5 4.5 0 0 1 59 17v5H5Z"
            data-folder-back
          />
          <path
            d="M4 20.5A4.5 4.5 0 0 1 8.5 16h47a4.5 4.5 0 0 1 4.4 5.4l-4.7 23A4.5 4.5 0 0 1 50.8 48H9.2a4.5 4.5 0 0 1-4.4-3.6L.1 21.4A4.5 4.5 0 0 1 4 20.5Z"
            data-folder-front
          />
          <path d="M8.5 21h47" data-folder-highlight />
        </svg>
      ) : (
        <>
          <svg data-file-sheet viewBox="0 0 48 56">
            <path
              d="M9 2.75h19.5L40 14.25v35A4.75 4.75 0 0 1 35.25 54H9a4.75 4.75 0 0 1-4.75-4.75V7.5A4.75 4.75 0 0 1 9 2.75Z"
              data-file-page
            />
            <path d="M28.5 2.75v8.5a3 3 0 0 0 3 3H40" data-file-fold />
            <path d="M11 20.5h13M11 25.5h8" data-file-lines />
          </svg>
          <span data-file-extension={visual.label}>{visual.label}</span>
        </>
      )}
      {favorite ? (
        <span data-file-favorite>
          <ProductPlaygroundIcon data-favorite name="heart" />
        </span>
      ) : null}
    </span>
  );
}
