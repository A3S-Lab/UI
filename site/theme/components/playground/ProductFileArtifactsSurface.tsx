import { useMemo, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { productProjectName } from "./product-project-data";
import type { ProductTaskDraft } from "./product-composer-data";
import {
  ProductPlaygroundIcon,
  type ProductPlaygroundIconName,
} from "./ProductPlaygroundIcon";

type ArtifactKind =
  "code" | "document" | "pdf" | "presentation" | "spreadsheet";

type ProductTaskArtifact = {
  favorite?: boolean;
  icon: ProductPlaygroundIconName;
  kind: ArtifactKind;
  name: string;
  owner: string;
  size: string;
  type: Record<ProductPlaygroundLocale, string>;
  updated: Record<ProductPlaygroundLocale, string>;
  workspaceId: string;
};

const taskArtifacts: readonly ProductTaskArtifact[] = [
  {
    favorite: true,
    icon: "code",
    kind: "code",
    name: "release-readiness.md",
    owner: "A3S",
    size: "12 KB",
    type: { en: "Markdown", zh: "代码" },
    updated: { en: "Today, 16:42", zh: "今天 16:42" },
    workspaceId: "release-readiness",
  },
  {
    icon: "document",
    kind: "document",
    name: "experience-brief.docx",
    owner: "RoyLin",
    size: "84 KB",
    type: { en: "Document", zh: "文档" },
    updated: { en: "Today, 16:38", zh: "今天 16:38" },
    workspaceId: "experience-brief",
  },
  {
    favorite: true,
    icon: "chart",
    kind: "spreadsheet",
    name: "quality-scorecard.xlsx",
    owner: "A3S",
    size: "31 KB",
    type: { en: "Spreadsheet", zh: "表格" },
    updated: { en: "Today, 16:31", zh: "今天 16:31" },
    workspaceId: "quality-scorecard",
  },
  {
    icon: "presentation",
    kind: "presentation",
    name: "release-review.pptx",
    owner: "A3S",
    size: "2.4 MB",
    type: { en: "Presentation", zh: "演示文稿" },
    updated: { en: "Today, 16:24", zh: "今天 16:24" },
    workspaceId: "release-review",
  },
  {
    icon: "report",
    kind: "pdf",
    name: "visual-acceptance-report.pdf",
    owner: "RoyLin",
    size: "1.8 MB",
    type: { en: "PDF", zh: "PDF" },
    updated: { en: "Today, 16:18", zh: "今天 16:18" },
    workspaceId: "visual-acceptance-report",
  },
  {
    icon: "code",
    kind: "code",
    name: "device-shell-review.html",
    owner: "A3S",
    size: "19 KB",
    type: { en: "HTML", zh: "代码" },
    updated: { en: "Yesterday", zh: "昨天" },
    workspaceId: "device-shell-review-html",
  },
];

export function ProductFileArtifactsSurface({
  locale,
  onOpenWorkspace,
  onStartTask,
}: {
  locale: ProductPlaygroundLocale;
  onOpenWorkspace: (workspaceId: string) => void;
  onStartTask: (draft: Omit<ProductTaskDraft, "revision">) => void;
}) {
  const zh = locale === "zh";
  const [expanded, setExpanded] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [kind, setKind] = useState<"all" | ArtifactKind>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const visibleArtifacts = useMemo(
    () =>
      taskArtifacts.filter((artifact) => {
        const matchesKind = kind === "all" || artifact.kind === kind;
        const matchesFavorite = !favoritesOnly || artifact.favorite;
        const matchesQuery =
          !normalizedQuery ||
          [artifact.name, artifact.type.en, artifact.type.zh, artifact.owner]
            .join(" ")
            .toLocaleLowerCase(locale)
            .includes(normalizedQuery);
        return matchesKind && matchesFavorite && matchesQuery;
      }),
    [favoritesOnly, kind, locale, normalizedQuery],
  );

  return (
    <section
      aria-label={zh ? "任务成果" : "Task artifacts"}
      className="product-file-artifacts"
    >
      <div className="product-file-artifacts__filters">
        <label data-kind-filter>
          <ProductPlaygroundIcon name="filter" />
          <span className="sr-only">{zh ? "文件类型" : "File type"}</span>
          <select
            aria-label={zh ? "文件类型" : "File type"}
            onChange={(event) =>
              setKind(event.currentTarget.value as "all" | ArtifactKind)
            }
            value={kind}
          >
            <option value="all">{zh ? "全部类型" : "All types"}</option>
            <option value="code">{zh ? "代码" : "Code"}</option>
            <option value="document">{zh ? "文档" : "Documents"}</option>
            <option value="spreadsheet">{zh ? "表格" : "Spreadsheets"}</option>
            <option value="presentation">
              {zh ? "演示文稿" : "Presentations"}
            </option>
            <option value="pdf">PDF</option>
          </select>
        </label>
        <label data-artifact-search>
          <ProductPlaygroundIcon name="search" />
          <input
            aria-label={zh ? "搜索任务成果" : "Search task artifacts"}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={
              zh
                ? "搜索文件、任务或工作空间"
                : "Search files, tasks, or workspaces"
            }
            type="search"
            value={query}
          />
        </label>
        <label data-favorite-filter>
          <input
            checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.currentTarget.checked)}
            type="checkbox"
          />
          {zh ? "我的收藏" : "Favorites"}
        </label>
      </div>

      <div className="product-file-artifacts__table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{zh ? "名称" : "Name"}</th>
              <th scope="col">{zh ? "类型" : "Type"}</th>
              <th scope="col">{zh ? "更新人" : "Updated by"}</th>
              <th scope="col">{zh ? "更新时间" : "Updated"}</th>
              <th scope="col">{zh ? "大小" : "Size"}</th>
              <th scope="col">{zh ? "操作" : "Action"}</th>
            </tr>
          </thead>
          <tbody>
            <tr data-task-group>
              <th colSpan={6} scope="rowgroup">
                <button
                  aria-expanded={expanded}
                  onClick={() => setExpanded((value) => !value)}
                  type="button"
                >
                  <ProductPlaygroundIcon name="chevron" />
                  <span>{productProjectName[locale]}</span>
                  <small>
                    {zh
                      ? `${visibleArtifacts.length} 个成果`
                      : `${visibleArtifacts.length} artifacts`}
                  </small>
                </button>
              </th>
            </tr>
            {expanded
              ? visibleArtifacts.map((artifact) => (
                  <tr key={artifact.name}>
                    <th scope="row">
                      <button
                        onClick={() => onOpenWorkspace(artifact.workspaceId)}
                        type="button"
                      >
                        <span data-artifact-icon data-kind={artifact.kind}>
                          <ProductPlaygroundIcon name={artifact.icon} />
                        </span>
                        <span>{artifact.name}</span>
                        {artifact.favorite ? (
                          <ProductPlaygroundIcon data-favorite name="pin" />
                        ) : null}
                      </button>
                    </th>
                    <td>{artifact.type[locale]}</td>
                    <td>{artifact.owner}</td>
                    <td>{artifact.updated[locale]}</td>
                    <td>{artifact.size}</td>
                    <td>
                      <button
                        aria-label={
                          zh
                            ? `在新任务中引用 ${artifact.name}`
                            : `Use ${artifact.name} in a new task`
                        }
                        data-artifact-task
                        onClick={() =>
                          onStartTask({
                            prompt: zh
                              ? `继续处理任务成果 ${artifact.name}，先检查内容、当前状态和下一步修改。`
                              : `Continue working on the task artifact ${artifact.name}. First review its content, current state, and next changes.`,
                            resources: [
                              {
                                id: `artifact:${artifact.workspaceId}`,
                                kind: "file",
                                label: artifact.name,
                                meta: `${artifact.type[locale]} · ${artifact.size}`,
                              },
                            ],
                            workspace: "ui",
                          })
                        }
                        type="button"
                      >
                        <ProductPlaygroundIcon name="task-add" />
                        <span>{zh ? "引用" : "Use"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
        {visibleArtifacts.length === 0 ? (
          <div className="product-file-artifacts__empty" role="status">
            <ProductPlaygroundIcon name="search" />
            <strong>
              {zh ? "没有匹配的任务成果" : "No matching artifacts"}
            </strong>
            <span>
              {zh
                ? "调整类型、收藏条件或搜索关键词。"
                : "Change the type, favorites filter, or search term."}
            </span>
            <button
              onClick={() => {
                setFavoritesOnly(false);
                setKind("all");
                setQuery("");
              }}
              type="button"
            >
              {zh ? "清除筛选" : "Clear filters"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
