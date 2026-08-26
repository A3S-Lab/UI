import { DeviceSimulatorSurface } from "../components/playground/DevicePreviewPanel";
import { ProductCodeGraphPanel } from "../components/playground/ProductCodeGraphPanel";
import { ProductCodeWorkbench } from "../components/playground/ProductCodeWorkbench";
import { ProductPlaygroundIcon } from "../components/playground/ProductPlaygroundIcon";
import { ProductTestLogViewer } from "../components/playground/ProductSessionExecution";
import type { ProductFileEntry } from "../components/playground/product-file-manager-data";
import type { ProductPlaygroundLocale } from "../components/playground/product-playground-data";

export type DockviewProductPanelKind =
  "canvas" | "context" | "output" | "preview";

const harnessCodeEntry: ProductFileEntry = {
  id: "harness-session-source",
  kind: "file",
  modified: "2026-08-24T03:18:08.918Z",
  name: "session.ts",
  owner: "Local",
  parentId: "root",
  preview: {
    en: 'export async function restoreSession(target: HTMLElement) {\n  const session = await sessionStore.current();\n  if (!session) return redirect("/sign-in");\n  target.focus({ preventScroll: true });\n  return session;\n}',
    zh: 'export async function restoreSession(target: HTMLElement) {\n  const session = await sessionStore.current();\n  if (!session) return redirect("/sign-in");\n  target.focus({ preventScroll: true });\n  return session;\n}',
  },
  size: "1.2 KB",
  sizeBytes: 1_228,
  type: "TypeScript",
  workbench: "code",
};

function ProductPanelFiles({ locale }: { locale: ProductPlaygroundLocale }) {
  const zh = locale === "zh";
  const rows = [
    ["src", "folder", ""],
    ["auth", "folder", ""],
    ["session.ts", "code", "M"],
    ["sign-in.tsx", "code", ""],
    ["tests", "folder", ""],
    ["session.test.ts", "checklist", ""],
  ] as const;

  return (
    <section
      aria-label={zh ? "工作区文件" : "Workspace files"}
      className="dockview-demo__files"
    >
      <header>
        <span>
          <strong>{zh ? "工作区" : "Workspace"}</strong>
          <small>a3s-ui</small>
        </span>
        <div>
          <button aria-label={zh ? "新建文件" : "New file"} type="button">
            <ProductPlaygroundIcon name="plus" />
          </button>
          <button aria-label={zh ? "刷新文件" : "Refresh files"} type="button">
            <ProductPlaygroundIcon name="refresh" />
          </button>
        </div>
      </header>
      <button className="dockview-demo__files-root" type="button">
        <ProductPlaygroundIcon name="down" />
        <ProductPlaygroundIcon name="folder" />
        <strong>a3s-ui</strong>
        <small>main</small>
      </button>
      <ul>
        {rows.map(([name, icon, state], index) => (
          <li
            data-depth={index === 1 || index === 3 || index === 5 ? 2 : 1}
            key={name}
          >
            <button
              aria-current={name === "session.ts" ? "page" : undefined}
              type="button"
            >
              <ProductPlaygroundIcon name={icon} />
              <span>{name}</span>
              {state ? <em>{state}</em> : null}
            </button>
          </li>
        ))}
      </ul>
      <footer>
        <span>
          <ProductPlaygroundIcon name="project" /> main*
        </span>
        <span>0 {zh ? "问题" : "issues"}</span>
      </footer>
    </section>
  );
}

function ProductPanelTask({ locale }: { locale: ProductPlaygroundLocale }) {
  const zh = locale === "zh";
  return (
    <section
      aria-label={zh ? "任务上下文" : "Task context"}
      className="dockview-demo__task"
    >
      <header>
        <span>
          <small>{zh ? "当前任务" : "Current task"}</small>
          <strong>{zh ? "修复会话恢复" : "Fix session recovery"}</strong>
        </span>
        <em>
          <i />
          {zh ? "执行中" : "Running"}
        </em>
      </header>
      <p>
        {zh
          ? "登录令牌刷新失败后焦点会丢失，请修复并补充回归测试。"
          : "Focus is lost after a failed token refresh. Repair it and add regression coverage."}
      </p>
      <ol>
        <li data-state="complete">
          <ProductPlaygroundIcon name="check" />
          <span>
            <strong>{zh ? "复现失败路径" : "Reproduce the failure"}</strong>
            <small>{zh ? "已确认" : "Confirmed"}</small>
          </span>
        </li>
        <li data-state="active">
          <ProductPlaygroundIcon name="progress" />
          <span>
            <strong>{zh ? "修复路由与焦点" : "Repair route and focus"}</strong>
            <small>session.ts</small>
          </span>
        </li>
        <li>
          <ProductPlaygroundIcon name="checklist" />
          <span>
            <strong>
              {zh
                ? "运行视觉与交互验收"
                : "Run visual and interaction acceptance"}
            </strong>
            <small>{zh ? "等待" : "Waiting"}</small>
          </span>
        </li>
      </ol>
      <footer>
        <ProductPlaygroundIcon name="shield" />
        <span>
          {zh ? "本地任务 · 默认权限" : "Local task · Default permissions"}
        </span>
      </footer>
    </section>
  );
}

function ProductPanelCode({ locale }: { locale: ProductPlaygroundLocale }) {
  return (
    <ProductCodeWorkbench
      dirty={false}
      entry={harnessCodeEntry}
      locale={locale}
      mode="edit"
      onChange={() => undefined}
      onSaved={() => undefined}
      onStatus={() => undefined}
      saveRevision={0}
    />
  );
}

function panelContent(
  id: string,
  kind: DockviewProductPanelKind,
  locale: ProductPlaygroundLocale,
) {
  if (id === "task") return <ProductPanelTask locale={locale} />;
  if (
    id.includes("context") ||
    id.includes("explorer") ||
    id.includes("files")
  ) {
    return <ProductPanelFiles locale={locale} />;
  }
  if (
    id.includes("terminal") ||
    id.includes("output") ||
    id.includes("history")
  ) {
    return <ProductTestLogViewer locale={locale} />;
  }
  if (id.includes("symbols")) {
    return <ProductCodeGraphPanel id={`${id}-graph`} locale={locale} />;
  }
  if (kind === "preview" && id.includes("grid")) {
    return <ProductCodeGraphPanel id={`${id}-graph`} locale={locale} />;
  }
  if (kind === "preview") {
    return <DeviceSimulatorSurface locale={locale} variant="compact" />;
  }
  return <ProductPanelCode locale={locale} />;
}

export function DockviewProductPanel({
  id,
  kind,
  locale,
}: {
  id: string;
  kind: DockviewProductPanelKind;
  locale: ProductPlaygroundLocale;
}) {
  return (
    <section
      className="dockview-demo__product-panel"
      data-demo-panel={id}
      data-kind={kind}
    >
      {panelContent(id, kind, locale)}
    </section>
  );
}
