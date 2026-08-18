import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import type { AgentComposerTrigger } from "../../../../src/integrations/tiptap/react.js";
import {
  productComposerCommands,
  productComposerSkills,
  productComposerWorkspace,
  type ProductComposerResource,
  type ProductComposerWorkspaceNode,
} from "./product-composer-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export type ProductComposerSuggestionKind = AgentComposerTrigger["kind"];

export type ProductComposerSuggestionsHandle = {
  activateActive: () => boolean;
  closeActive: () => boolean;
  moveActive: (offset: number) => void;
  moveToEdge: (edge: "end" | "start") => void;
  openActive: () => boolean;
};

type FileRow = {
  depth: number;
  node: ProductComposerWorkspaceNode;
};

type ListRow = {
  description: string;
  id: string;
  label: string;
  meta: string;
};

export const ProductComposerSuggestions = forwardRef<
  ProductComposerSuggestionsHandle,
  {
    id: string;
    kind: ProductComposerSuggestionKind;
    locale: ProductPlaygroundLocale;
    onActiveDescendantChange: (id?: string) => void;
    onSelectCommand: (id: string) => void;
    onSelectFile: (resource: ProductComposerResource) => void;
    onSelectSkill: (resource: ProductComposerResource) => void;
    query: string;
    resources: readonly ProductComposerResource[];
  }
>(function ProductComposerSuggestions(
  {
    id,
    kind,
    locale,
    onActiveDescendantChange,
    onSelectCommand,
    onSelectFile,
    onSelectSkill,
    query,
    resources,
  },
  ref,
) {
  const zh = locale === "zh";
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["src", "site"]),
  );
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const fileRows = useMemo(
    () => flattenWorkspace(productComposerWorkspace, expanded, normalizedQuery),
    [expanded, normalizedQuery],
  );
  const listRows = useMemo<ListRow[]>(() => {
    const source =
      kind === "skill"
        ? productComposerSkills.map((item) => ({
            description: item.description[locale],
            id: item.id,
            label: `$${item.label}`,
            meta: item.scope[locale],
          }))
        : kind === "command"
          ? productComposerCommands.map((item) => ({
              description: item.description[locale],
              id: item.id,
              label: item.label,
              meta: zh ? "内置" : "Built-in",
            }))
          : [];
    if (!normalizedQuery) return source;
    return source.filter((item) =>
      `${item.label} ${item.description} ${item.meta}`
        .toLocaleLowerCase(locale)
        .includes(normalizedQuery),
    );
  }, [kind, locale, normalizedQuery, zh]);
  const rowCount = kind === "file" ? fileRows.length : listRows.length;
  const currentIndex = Math.min(activeIndex, Math.max(0, rowCount - 1));
  const activeId = rowCount > 0 ? `${id}-${currentIndex}` : undefined;

  useEffect(() => {
    setActiveIndex(0);
  }, [kind, normalizedQuery]);

  useEffect(() => {
    if (activeIndex >= rowCount) setActiveIndex(Math.max(0, rowCount - 1));
  }, [activeIndex, rowCount]);

  useEffect(() => {
    onActiveDescendantChange(activeId);
    return () => onActiveDescendantChange(undefined);
  }, [activeId, onActiveDescendantChange]);

  const activate = (index: number) => {
    if (kind === "file") {
      const row = fileRows[index];
      if (!row) return false;
      if (row.node.kind === "directory") {
        setExpanded((current) => {
          const next = new Set(current);
          if (next.has(row.node.id)) next.delete(row.node.id);
          else next.add(row.node.id);
          return next;
        });
        return true;
      }
      onSelectFile({
        id: row.node.id,
        kind: "file",
        label: row.node.name,
        meta: row.node.meta[locale],
      });
      return true;
    }
    const row = listRows[index];
    if (!row) return false;
    if (kind === "skill") {
      onSelectSkill({
        id: row.id,
        kind: "skill",
        label: row.label,
        meta: row.meta,
      });
    } else {
      onSelectCommand(row.id);
    }
    return true;
  };

  const openActive = () => {
    if (kind !== "file") return false;
    const row = fileRows[currentIndex];
    if (!row || row.node.kind !== "directory") return false;
    if (!expanded.has(row.node.id)) {
      setExpanded((current) => new Set(current).add(row.node.id));
    }
    return true;
  };

  const closeActive = () => {
    if (kind !== "file") return false;
    const row = fileRows[currentIndex];
    if (!row) return false;
    if (row.node.kind === "directory" && expanded.has(row.node.id)) {
      setExpanded((current) => {
        const next = new Set(current);
        next.delete(row.node.id);
        return next;
      });
      return true;
    }
    const parentIndex = findParentIndex(fileRows, currentIndex);
    if (parentIndex < 0) return false;
    setActiveIndex(parentIndex);
    return true;
  };

  useImperativeHandle(
    ref,
    () => ({
      activateActive: () => activate(currentIndex),
      closeActive,
      moveActive: (offset) =>
        setActiveIndex((index) =>
          Math.max(0, Math.min(index + offset, Math.max(0, rowCount - 1))),
        ),
      moveToEdge: (edge) =>
        setActiveIndex(edge === "start" ? 0 : Math.max(0, rowCount - 1)),
      openActive,
    }),
    [closeActive, currentIndex, openActive, rowCount],
  );

  const title =
    kind === "file"
      ? zh
        ? "工作区文件"
        : "Workspace files"
      : kind === "skill"
        ? zh
          ? "选择技能"
          : "Choose a skill"
        : zh
          ? "内置指令"
          : "Built-in commands";
  const marker = kind === "file" ? "@" : kind === "skill" ? "$" : "/";
  const alreadyAdded = new Set(resources.map((resource) => resource.id));

  return (
    <section
      aria-label={title}
      className="product-composer-suggestions"
      data-composer-suggestions
      data-popover
    >
      <header>
        <span>
          <ProductPlaygroundIcon
            name={kind === "file" ? "folder" : kind === "skill" ? "brain" : "code"}
          />
          <strong>{title}</strong>
        </span>
        <kbd>{marker}</kbd>
      </header>
      {query ? (
        <p>
          {zh ? `筛选“${query}”` : `Filtering “${query}”`}
        </p>
      ) : null}
      {kind === "file" ? (
        <div aria-label={title} id={id} role="tree">
          {fileRows.map((row, index) => {
            const directory = row.node.kind === "directory";
            const open = directory && expanded.has(row.node.id);
            const added = alreadyAdded.has(row.node.id);
            return (
              <button
                aria-expanded={directory ? open : undefined}
                aria-level={row.depth + 1}
                aria-selected={index === currentIndex}
                data-added={added ? "true" : undefined}
                id={`${id}-${index}`}
                key={row.node.id}
                onClick={() => activate(index)}
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => setActiveIndex(index)}
                role="treeitem"
                style={{ paddingInlineStart: `${8 + row.depth * 18}px` }}
                type="button"
              >
                <span data-tree-chevron>
                  {directory ? (
                    <ProductPlaygroundIcon name="chevron" />
                  ) : null}
                </span>
                <ProductPlaygroundIcon name={directory ? "folder" : "document"} />
                <span data-composer-suggestion-copy>
                  <strong>{row.node.name}</strong>
                  <small>{row.node.meta[locale]}</small>
                </span>
                {added ? (
                  <span data-suggestion-state>
                    <ProductPlaygroundIcon name="check" />
                    {zh ? "已添加" : "Added"}
                  </span>
                ) : null}
              </button>
            );
          })}
          {fileRows.length === 0 ? (
            <div data-suggestion-empty role="status">
              <ProductPlaygroundIcon name="search" />
              <strong>{zh ? "没有匹配的工作区文件" : "No matching workspace files"}</strong>
              <span>
                {zh ? "换一个名称或路径继续搜索。" : "Try another name or path."}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div aria-label={title} id={id} role="listbox">
          {listRows.map((row, index) => {
            const added = kind === "skill" && alreadyAdded.has(row.id);
            return (
              <button
                aria-selected={index === currentIndex}
                data-added={added ? "true" : undefined}
                id={`${id}-${index}`}
                key={row.id}
                onClick={() => activate(index)}
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => setActiveIndex(index)}
                role="option"
                type="button"
              >
                <span data-composer-suggestion-icon>
                  <ProductPlaygroundIcon name={kind === "skill" ? "brain" : "code"} />
                </span>
                <span data-composer-suggestion-copy>
                  <strong>{row.label}</strong>
                  <small>{row.description}</small>
                </span>
                <em>{added ? (zh ? "已添加" : "Added") : row.meta}</em>
              </button>
            );
          })}
          {listRows.length === 0 ? (
            <div data-suggestion-empty role="status">
              <ProductPlaygroundIcon name="search" />
              <strong>
                {zh
                  ? kind === "skill"
                    ? "没有匹配的已启用技能"
                    : "没有匹配的指令"
                  : kind === "skill"
                    ? "No matching enabled skills"
                    : "No matching commands"}
              </strong>
            </div>
          ) : null}
        </div>
      )}
      <footer>
        <span><kbd>↑</kbd><kbd>↓</kbd> {zh ? "选择" : "select"}</span>
        <span><kbd>Enter</kbd> {zh ? "展开 / 添加" : "open / add"}</span>
        <span><kbd>Esc</kbd> {zh ? "关闭" : "close"}</span>
      </footer>
    </section>
  );
});

function flattenWorkspace(
  nodes: readonly ProductComposerWorkspaceNode[],
  expanded: ReadonlySet<string>,
  query: string,
) {
  const rows: FileRow[] = [];
  const visit = (
    entries: readonly ProductComposerWorkspaceNode[],
    depth: number,
  ) => {
    entries.forEach((node) => {
      const visible = !query || nodeMatches(node, query);
      if (!visible) return;
      rows.push({ depth, node });
      if (
        node.kind === "directory" &&
        node.children &&
        (query || expanded.has(node.id))
      ) {
        visit(node.children, depth + 1);
      }
    });
  };
  visit(nodes, 0);
  return rows;
}

function nodeMatches(node: ProductComposerWorkspaceNode, query: string): boolean {
  const text = `${node.name} ${node.id} ${node.meta.en} ${node.meta.zh}`.toLocaleLowerCase();
  return (
    text.includes(query) ||
    Boolean(node.children?.some((child) => nodeMatches(child, query)))
  );
}

function findParentIndex(rows: readonly FileRow[], activeIndex: number) {
  const row = rows[activeIndex];
  if (!row || row.depth === 0) return -1;
  for (let index = activeIndex - 1; index >= 0; index -= 1) {
    if (rows[index]?.depth === row.depth - 1) return index;
  }
  return -1;
}
