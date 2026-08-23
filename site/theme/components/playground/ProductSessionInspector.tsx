import { useState, type RefObject } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import {
  ProductPlaygroundIcon,
  type ProductPlaygroundIconName,
} from "./ProductPlaygroundIcon";
import {
  ProductSessionArtifactsPanel,
  ProductSessionFilesPanel,
} from "./ProductSessionArtifactPanels";
import { ProductSessionOverviewPanel } from "./ProductSessionOverviewPanel";
import {
  ProductSessionGraphPanel,
  ProductSessionPreviewPanel,
} from "./ProductSessionVisualPanels";
import type { ProductTaskArtifact } from "./product-task-session-state";

export type ProductSessionInspectorTab =
  "overview" | "artifacts" | "files" | "preview" | "graph";

export type ProductSessionContextDetails = {
  effort: string;
  mode: string;
  model: string;
  permissions: string;
  resources: string;
  workspace: string;
};

type ProductSessionInspectorProps = {
  activeTab: ProductSessionInspectorTab;
  artifacts: readonly ProductTaskArtifact[];
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  contextDetails?: ProductSessionContextDetails | null;
  created?: boolean;
  id: string;
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  onTabChange: (tab: ProductSessionInspectorTab) => void;
  overlay: boolean;
  panelRef: RefObject<HTMLElement | null>;
  project?: boolean;
};

export function ProductSessionInspector({
  activeTab,
  artifacts,
  closeButtonRef,
  contextDetails,
  created = false,
  id,
  locale,
  onClose,
  onTabChange,
  overlay,
  panelRef,
  project = false,
}: ProductSessionInspectorProps) {
  const zh = locale === "zh";
  const [graphExpanded, setGraphExpanded] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const tabs = [
    ["overview", zh ? "概览" : "Overview", "checklist"],
    ["artifacts", zh ? "产物" : "Artifacts", "document"],
    ["files", zh ? "文件" : "Files", "files"],
    ["preview", zh ? "预览" : "Preview", "eye"],
    ["graph", zh ? "图谱" : "Graph", "project"],
  ] as const satisfies readonly [
    ProductSessionInspectorTab,
    string,
    ProductPlaygroundIconName,
  ][];

  const selectTab = (tab: ProductSessionInspectorTab) => {
    if (tab !== "graph") setGraphExpanded(false);
    if (tab !== "preview") setPreviewExpanded(false);
    onTabChange(tab);
  };

  return (
    <aside
      aria-label={
        project
          ? zh
            ? "项目详情"
            : "Project details"
          : zh
            ? "任务详情"
            : "Task details"
      }
      aria-modal={overlay ? true : undefined}
      className="task-pane product-session-inspector"
      data-graph-expanded={graphExpanded ? "true" : undefined}
      data-preview-expanded={previewExpanded ? "true" : undefined}
      data-task-inspector=""
      id={id}
      ref={panelRef}
      role={overlay ? "dialog" : undefined}
    >
      <header className="product-session-inspector__header">
        <div>
          <strong>
            {project
              ? zh
                ? "项目详情"
                : "Project details"
              : zh
                ? "任务详情"
                : "Task details"}
          </strong>
          <small>
            <i data-state={created ? "ready" : "complete"} />
            {created
              ? zh
                ? "执行上下文已准备"
                : "Execution context ready"
              : zh
                ? "已完成并通过验证"
                : "Completed and verified"}
          </small>
        </div>
        <button
          aria-label={
            project
              ? zh
                ? "关闭项目详情"
                : "Close project details"
              : zh
                ? "关闭任务详情"
                : "Close task details"
          }
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>

      <div
        aria-label={
          project
            ? zh
              ? "项目详情视图"
              : "Project detail views"
            : zh
              ? "任务详情视图"
              : "Task detail views"
        }
        aria-orientation="horizontal"
        className="product-session-inspector__tabs"
        role="tablist"
      >
        {tabs.map(([tab, label, icon], index) => (
          <button
            aria-controls={`${id}-${tab}`}
            aria-selected={activeTab === tab}
            key={tab}
            onClick={() => selectTab(tab)}
            onKeyDown={(event) => {
              const direction = getComputedStyle(event.currentTarget).direction;
              const step =
                event.key === "ArrowRight"
                  ? direction === "rtl"
                    ? -1
                    : 1
                  : event.key === "ArrowLeft"
                    ? direction === "rtl"
                      ? 1
                      : -1
                    : 0;
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : step
                      ? (index + step + tabs.length) % tabs.length
                      : -1;
              if (nextIndex < 0) return;
              event.preventDefault();
              selectTab(tabs[nextIndex][0]);
              const controls =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                );
              window.requestAnimationFrame(() =>
                controls?.[nextIndex]?.focus(),
              );
            }}
            role="tab"
            tabIndex={activeTab === tab ? 0 : -1}
            title={label}
            type="button"
          >
            <ProductPlaygroundIcon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <section className="product-session-inspector__body">
        {activeTab === "overview" ? (
          <ProductSessionOverviewPanel
            artifacts={artifacts}
            contextDetails={contextDetails}
            created={created}
            id={`${id}-overview`}
            locale={locale}
            project={project}
          />
        ) : null}
        {activeTab === "artifacts" ? (
          <ProductSessionArtifactsPanel
            artifacts={artifacts}
            id={`${id}-artifacts`}
            locale={locale}
          />
        ) : null}
        {activeTab === "files" ? (
          <ProductSessionFilesPanel
            artifacts={artifacts}
            id={`${id}-files`}
            locale={locale}
          />
        ) : null}
        {activeTab === "preview" ? (
          <ProductSessionPreviewPanel
            expanded={previewExpanded}
            id={`${id}-preview`}
            locale={locale}
            onExpandedChange={setPreviewExpanded}
          />
        ) : null}
        {activeTab === "graph" ? (
          <ProductSessionGraphPanel
            expanded={graphExpanded}
            id={`${id}-graph`}
            locale={locale}
            onExpandedChange={setGraphExpanded}
          />
        ) : null}
      </section>
    </aside>
  );
}
