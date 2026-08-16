import { useState } from "react";
import { SceneState } from "./SceneState";
import { PlaygroundIcon } from "./PlaygroundIcon";
import { useWorkspace } from "./WorkspaceContext";

function CodeSurface() {
  const { locale } = useWorkspace();
  const [file, setFile] = useState("session.ts");
  const zh = locale === "zh";
  return (
    <div className="workbench-code" data-workbench-surface="code">
      <header>
        <nav aria-label={zh ? "打开的文件" : "Open files"}>
          {["session.ts", "sign-in.tsx", "session.test.ts"].map((name) => (
            <button
              type="button"
              key={name}
              aria-current={file === name ? "page" : undefined}
              onClick={() => setFile(name)}
            >
              <span data-file-state={name === "session.ts" ? "modified" : "clean"} />
              {name}
            </button>
          ))}
        </nav>
        <span>TypeScript</span>
      </header>
      <div className="workbench-code__body">
        <ol aria-label={zh ? `${file} 源代码` : `${file} source`}>
          <li><code><b>export</b> <b>async function</b> restoreSession(target: HTMLElement) {'{'}</code></li>
          <li><code>  <b>const</b> session = <b>await</b> sessionStore.current();</code></li>
          <li><code>  <b>if</b> (!session) <b>return</b> redirect(<i>&quot;/sign-in&quot;</i>);</code></li>
          <li data-code-highlight><code>  target.focus({'{'} preventScroll: <b>true</b> {'}'});</code></li>
          <li><code>  <b>return</b> session;</code></li>
          <li><code>{'}'}</code></li>
        </ol>
        <aside>
          <strong>{zh ? "内联检查" : "Inline check"}</strong>
          <p>{zh ? "焦点恢复在令牌刷新失败后仍可预测。" : "Focus recovery remains predictable after a failed token refresh."}</p>
          <span><PlaygroundIcon name="check" width="14" height="14" /> 12 / 12</span>
        </aside>
      </div>
      <footer>
        <span>Ln 4, Col 3</span><span>UTF-8</span><span>{zh ? "无问题" : "No problems"}</span>
      </footer>
    </div>
  );
}

function DesignSurface() {
  const { locale } = useWorkspace();
  const zh = locale === "zh";
  return (
    <div className="workbench-design" data-workbench-surface="design">
      <div className="workbench-design__toolbar" role="toolbar" aria-label={zh ? "画布工具" : "Canvas tools"}>
        <button type="button" aria-pressed="true"><PlaygroundIcon name="inspect" width="16" height="16" />{zh ? "选择" : "Select"}</button>
        <button type="button"><PlaygroundIcon name="play" width="16" height="16" />{zh ? "预览" : "Preview"}</button>
        <output>72%</output>
      </div>
      <div className="workbench-design__canvas">
        <article aria-label={zh ? "产品主页画板" : "Product homepage artboard"}>
          <header><strong>A3S</strong><nav>{zh ? "产品　文档　定价" : "Product　Docs　Pricing"}</nav><button type="button">{zh ? "开始" : "Start"}</button></header>
          <section><h2>{zh ? "把复杂工作变清晰。" : "Make complex work clear."}</h2><p>{zh ? "稳定的上下文边缘，开放的任务画布。" : "A stable context edge and an open task canvas."}</p><button type="button">{zh ? "创建工作区" : "Create workspace"}</button></section>
          <footer><span /><span /><span /></footer>
        </article>
      </div>
    </div>
  );
}

function WritingSurface() {
  const { locale } = useWorkspace();
  const zh = locale === "zh";
  return (
    <div className="workbench-writing" data-workbench-surface="write">
      <header><span>{zh ? "产品说明 / 工作区" : "Product brief / Workspace"}</span><span>{zh ? "已保存" : "Saved"}</span></header>
      <article contentEditable suppressContentEditableWarning aria-label={zh ? "文档编辑器" : "Document editor"}>
        <h1>{zh ? "工作区布局原则" : "Workspace layout principles"}</h1>
        <p>{zh ? "用户需要在不中断任务的情况下理解当前上下文、执行状态和可恢复操作。" : "People need to understand context, execution state, and recovery actions without leaving the task."}</p>
        <h2>{zh ? "保持任务连续" : "Preserve task continuity"}</h2>
        <p>{zh ? "资源、记录、变更与预览应围绕同一任务组织。面板位置可以变化，但信息关系不能漂移。" : "Resources, transcript, changes, and preview should orbit one task. Panels may move; their information relationships must not drift."}</p>
        <blockquote>{zh ? "布局是工作记忆的一部分。" : "Layout is part of working memory."}</blockquote>
      </article>
    </div>
  );
}

function WorkflowSurface() {
  const { locale } = useWorkspace();
  const zh = locale === "zh";
  return (
    <div className="workbench-flow" data-workbench-surface="workflow">
      <header><strong>{zh ? "发布验证" : "Release verification"}</strong><button type="button"><PlaygroundIcon name="play" width="15" height="15" />{zh ? "运行" : "Run"}</button></header>
      <div className="workbench-flow__canvas">
        <article data-node-state="complete"><span>1</span><div><strong>{zh ? "读取变更" : "Read changes"}</strong><small>Git diff</small></div></article>
        <i aria-hidden="true" />
        <article data-node-state="active"><span>2</span><div><strong>{zh ? "运行测试" : "Run tests"}</strong><small>Focused suite</small></div></article>
        <i aria-hidden="true" />
        <article><span>3</span><div><strong>{zh ? "视觉验收" : "Visual acceptance"}</strong><small>Desktop + mobile</small></div></article>
        <i aria-hidden="true" />
        <article><span>4</span><div><strong>{zh ? "请求批准" : "Request approval"}</strong><small>Release gate</small></div></article>
      </div>
    </div>
  );
}

const productRows = {
  automation: [
    ["视觉回归", "工作日 09:30", "success"],
    ["依赖审计", "每周一", "active"],
    ["发布摘要", "发布后", "neutral"],
  ],
  catalog: [
    ["Browser QA", "Web · 已安装", "success"],
    ["Release audit", "工程 · 可用", "active"],
    ["Document review", "内容 · 可用", "neutral"],
  ],
  channels: [
    ["GitHub", "Connected", "success"],
    ["Build runner", "Healthy", "success"],
    ["Design review", "Needs access", "warning"],
  ],
  settings: [
    ["工作区状态", "同步到本机", "success"],
    ["风险操作", "每次询问", "active"],
    ["更新通道", "稳定版", "neutral"],
  ],
} as const;

function ProductSurface() {
  const { locale, sceneId } = useWorkspace();
  const zh = locale === "zh";
  const rows = productRows[sceneId as keyof typeof productRows] ?? productRows.automation;
  const titles = {
    automation: zh ? "自动化" : "Automations",
    catalog: zh ? "能力目录" : "Catalog",
    channels: zh ? "连接" : "Connections",
    settings: zh ? "设置" : "Settings",
  };
  return (
    <div className="workbench-product" data-workbench-surface={sceneId}>
      <header><div><h2>{titles[sceneId as keyof typeof titles]}</h2><p>{zh ? "围绕当前项目管理真实运行状态。" : "Manage real operational state around the current project."}</p></div><button type="button">{zh ? "新建" : "New"}</button></header>
      <div role="list">
        {rows.map(([name, detail, status]) => (
          <article role="listitem" key={name}>
            <span data-product-icon><PlaygroundIcon name={sceneId === "catalog" ? "catalog" : sceneId === "channels" ? "channels" : sceneId === "settings" ? "settings" : "automation"} width="18" height="18" /></span>
            <div><strong>{name}</strong><small>{detail}</small></div>
            <span className="status-badge" data-state={status}>{status === "success" ? (zh ? "正常" : "Ready") : status === "warning" ? (zh ? "需处理" : "Action") : status === "active" ? (zh ? "运行中" : "Active") : (zh ? "就绪" : "Ready")}</span>
            <button type="button">{zh ? "打开" : "Open"}</button>
          </article>
        ))}
      </div>
    </div>
  );
}

export function WorkspaceSceneSurface() {
  const { locale, sceneId, state } = useWorkspace();
  if (state !== "ready") return <SceneState locale={locale} state={state} />;
  if (sceneId === "code") return <CodeSurface />;
  if (sceneId === "design") return <DesignSurface />;
  if (sceneId === "write") return <WritingSurface />;
  if (sceneId === "workflow") return <WorkflowSurface />;
  return <ProductSurface />;
}
