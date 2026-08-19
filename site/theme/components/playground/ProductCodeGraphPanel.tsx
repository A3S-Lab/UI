import { useEffect, useRef } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

const codeNodes = [
  { id: "main", label: "main.ts", path: "src/main.ts", kind: "entry", tone: "entry", size: 9, x: -110, y: 18, z: 34, degree: 4 },
  { id: "router", label: "router.ts", path: "src/router.ts", kind: "module", tone: "module", size: 7, x: -58, y: -54, z: -18, degree: 3 },
  { id: "workspace", label: "Workspace", path: "src/features/code/pages/workspace-page.tsx", kind: "component", tone: "component", size: 10, x: -24, y: 20, z: 72, degree: 6 },
  { id: "task-composer", label: "TaskComposer", path: "src/features/tasks/components/task-composer.tsx", kind: "component", tone: "component", size: 12, x: 46, y: -14, z: 96, degree: 7 },
  { id: "prompt-editor", label: "TaskPromptEditor", path: "src/features/tasks/components/task-prompt-editor.tsx", kind: "component", tone: "component", size: 8, x: 112, y: -38, z: 42, degree: 3 },
  { id: "suggestions", label: "composer-suggestions.ts", path: "src/features/tasks/components/composer-suggestion-ranking.ts", kind: "module", tone: "module", size: 6, x: 86, y: 48, z: -38, degree: 2 },
  { id: "resources", label: "session-resource-order.ts", path: "src/features/tasks/session-resource-order.ts", kind: "module", tone: "module", size: 7, x: 18, y: 78, z: 22, degree: 4 },
  { id: "tool-calls", label: "ToolCallTimeline", path: "src/features/tasks/components/tool-call-timeline.tsx", kind: "component", tone: "component", size: 8, x: -38, y: 92, z: -64, degree: 4 },
  { id: "runtime", label: "task-runtime-projection.ts", path: "src/features/tasks/components/task-runtime-projection.ts", kind: "module", tone: "module", size: 6, x: -92, y: 66, z: -92, degree: 3 },
  { id: "composer-test", label: "task-prompt-editor.test.tsx", path: "src/features/tasks/components/task-prompt-editor.test.tsx", kind: "test", tone: "test", size: 7, x: 72, y: -92, z: -48, degree: 3 },
  { id: "tool-test", label: "tool-call-file-diff.test.tsx", path: "src/features/tasks/components/tool-call-file-diff.test.tsx", kind: "test", tone: "test", size: 5, x: 138, y: -76, z: -8, degree: 1 },
  { id: "settings", label: "runtime.acl", path: "config/runtime.acl", kind: "config", tone: "config", size: 5, x: -6, y: -84, z: -104, degree: 2 },
] as const;

const codeEdges = [
  ["main", "router", 2, "import"],
  ["main", "workspace", 3, "import"],
  ["router", "workspace", 1, "import"],
  ["workspace", "task-composer", 3, "render"],
  ["task-composer", "prompt-editor", 3, "render"],
  ["task-composer", "suggestions", 1, "import"],
  ["task-composer", "resources", 2, "state"],
  ["task-composer", "tool-calls", 1, "render"],
  ["task-composer", "runtime", 1, "state"],
  ["settings", "runtime", 1, "config"],
  ["composer-test", "task-composer", 1, "test"],
  ["tool-test", "tool-calls", 1, "test"],
  ["resources", "tool-calls", 1, "state"],
  ["runtime", "tool-calls", 1, "state"],
  ["workspace", "resources", 1, "state"],
] as const;

export function ProductCodeGraphPanel({
  id,
  locale,
}: {
  id: string;
  locale: ProductPlaygroundLocale;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const zh = locale === "zh";

  useEffect(() => {
    window.a3sUI?.start();
    window.a3sUI?.initAll();
  }, []);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="code-graph product-session-code-graph"
      data-selected-node="task-composer"
      data-state="ready"
      data-view="graph"
      id={id}
      ref={rootRef}
    >
      <header>
        <div data-code-graph-identity>
          <strong id={`${id}-title`}>
            {zh ? "A3S Web / 本次变更依赖" : "A3S Web / change dependencies"}
          </strong>
          <small>
            {zh ? "12 个节点 · 15 条关系 · TypeScript" : "12 nodes · 15 relations · TypeScript"}
          </small>
        </div>
        <div data-code-graph-actions>
          <button aria-label={zh ? "缩小图谱" : "Zoom out"} className="btn" data-code-graph-action="zoom-out" data-size="icon-sm" data-variant="ghost" type="button">
            <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M20 20l-4-4" /></svg>
          </button>
          <button aria-label={zh ? "放大图谱" : "Zoom in"} className="btn" data-code-graph-action="zoom-in" data-size="icon-sm" data-variant="ghost" type="button">
            <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><circle cx="11" cy="11" r="7" /><path d="M8 11h6m-3-3v6M20 20l-4-4" /></svg>
          </button>
          <button aria-label={zh ? "重置视角" : "Reset view"} className="btn" data-code-graph-action="reset" data-size="icon-sm" data-variant="ghost" type="button">
            <ProductPlaygroundIcon name="refresh" />
          </button>
        </div>
      </header>
      <div data-code-graph-toolbar>
        <label className="input-group">
          <ProductPlaygroundIcon name="search" />
          <input aria-label={zh ? "筛选代码节点" : "Filter code nodes"} data-code-graph-search placeholder={zh ? "筛选文件、符号或类型" : "Filter files, symbols, or kinds"} type="search" />
        </label>
        <div aria-label={zh ? "图谱视图" : "Graph view"} className="button-group">
          <button aria-pressed="true" className="btn" data-code-graph-action="view-graph" data-code-graph-view="graph" data-size="sm" type="button">3D</button>
          <button aria-pressed="false" className="btn" data-code-graph-action="view-list" data-code-graph-view="list" data-size="sm" data-variant="outline" type="button">{zh ? "列表" : "List"}</button>
        </div>
        <div aria-label={zh ? "节点类型" : "Node kinds"} data-code-graph-legend>
          <span><i data-tone="entry" />{zh ? "入口" : "Entry"}</span>
          <span><i data-tone="component" />{zh ? "组件" : "Component"}</span>
          <span><i data-tone="test" />{zh ? "测试" : "Test"}</span>
          <span><i />{zh ? "模块" : "Module"}</span>
        </div>
      </div>
      <div data-code-graph-surface>
        <div aria-label={zh ? "可旋转的三维代码依赖图；使用方向键旋转，加减键缩放" : "Rotatable 3D dependency graph; use arrow keys to rotate and plus or minus to zoom"} data-code-graph-viewport role="img" tabIndex={0}>
          <canvas aria-hidden="true" data-code-graph-canvas />
          <div data-code-graph-empty hidden>
            {zh ? "没有节点符合当前筛选条件。" : "No nodes match the current filter."}
            <button className="btn" data-code-graph-action="clear-filter" data-size="sm" type="button">{zh ? "清除筛选" : "Clear filter"}</button>
          </div>
        </div>
        <ul aria-label={zh ? "代码节点列表" : "Code node list"} data-code-graph-list hidden>
          {codeNodes.map((node) => (
            <li
              aria-selected={node.id === "task-composer"}
              data-code-node
              data-node-id={node.id}
              data-node-kind={node.kind}
              data-node-label={node.label}
              data-node-path={node.path}
              data-node-size={node.size}
              data-node-tone={node.tone}
              data-node-x={node.x}
              data-node-y={node.y}
              data-node-z={node.z}
              key={node.id}
            >
              <button aria-pressed={node.id === "task-composer"} type="button">
                <i data-node-tone={node.tone} />
                <span data-node-copy><strong data-node-label>{node.label}</strong><small>{node.path}</small></span>
                <span data-node-degree>{node.degree}</span>
              </button>
            </li>
          ))}
        </ul>
        <div data-code-edges hidden>
          {codeEdges.map(([from, to, weight, kind]) => (
            <i data-code-edge data-edge-kind={kind} data-edge-weight={weight} data-from={from} data-to={to} key={`${from}-${to}`} />
          ))}
        </div>
        <aside aria-label={zh ? "选中节点详情" : "Selected node details"} data-code-graph-inspector>
          <header>
            <strong>{zh ? "选中节点" : "Selected node"}</strong>
            <p>{zh ? "点击背景清除选择；相邻关系保持高亮。" : "Click the background to clear selection; adjacent relations stay highlighted."}</p>
          </header>
          <dl>
            <div><dt>{zh ? "名称" : "Name"}</dt><dd data-code-graph-field="label">TaskComposer</dd></div>
            <div><dt>{zh ? "路径" : "Path"}</dt><dd data-code-graph-field="path">src/features/tasks/components/task-composer.tsx</dd></div>
            <div><dt>{zh ? "类型" : "Kind"}</dt><dd data-code-graph-field="kind">component</dd></div>
            <div><dt>{zh ? "连接" : "Links"}</dt><dd data-code-graph-field="connections">7</dd></div>
          </dl>
          <button className="btn" data-code-graph-action="clear-selection" data-size="sm" data-variant="outline" type="button">{zh ? "清除选择" : "Clear selection"}</button>
        </aside>
      </div>
      <footer>
        <output aria-live="polite" data-code-graph-status>{zh ? "已显示本次变更图谱" : "Change graph is ready"}</output>
        <span>{zh ? "拖动旋转 · 滚轮缩放 · 方向键可操作" : "Drag to rotate · Wheel to zoom · Arrow keys supported"}</span>
      </footer>
    </section>
  );
}
