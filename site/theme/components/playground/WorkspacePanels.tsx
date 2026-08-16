import type { FunctionComponent } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import AgentComposerDemo from "../../mdx/AgentComposerDemo";
import { DevicePreviewPanel } from "./DevicePreviewPanel";
import { PlaygroundIcon } from "./PlaygroundIcon";
import { WorkspaceSceneSurface } from "./WorkspaceSceneSurface";
import { useWorkspace } from "./WorkspaceContext";

const sceneFiles = {
  automation: ["automations.acl", "schedules", "runs", "evidence"],
  catalog: ["capabilities", "installed", "policies", "sources"],
  channels: ["connections", "routes", "credentials", "health"],
  code: ["src", "auth", "session.ts", "sign-in.tsx", "tests", "session.test.ts"],
  design: ["pages", "Homepage", "Header", "Hero", "Workspace", "Footer"],
  settings: ["workspace", "permissions", "appearance", "updates"],
  workflow: ["release-flow.acl", "nodes", "policies", "fixtures"],
  write: ["brief.md", "research", "sources.md", "outline.md", "draft.md"],
} as const;

export function ExplorerPanel() {
  const { locale, sceneId } = useWorkspace();
  const zh = locale === "zh";
  const files = sceneFiles[sceneId];
  return (
    <aside className="workbench-explorer" aria-label={zh ? "资源管理器" : "Explorer"}>
      <header>
        <strong>{zh ? "资源管理器" : "Explorer"}</strong>
        <span>
          <button type="button" aria-label={zh ? "新建文件" : "New file"}>+</button>
          <button type="button" aria-label={zh ? "刷新资源" : "Refresh resources"}><PlaygroundIcon name="refresh" width="14" height="14" /></button>
        </span>
      </header>
      <details open>
        <summary><PlaygroundIcon name="folder" width="15" height="15" /><strong>a3s-ui</strong><small>main</small></summary>
        <ul>
          {files.map((file, index) => {
            const folder = !file.includes(".") && index < 3;
            return (
              <li key={file} data-selected={file === "session.ts" || file === "Homepage" ? "true" : undefined}>
                <button type="button" draggable aria-label={file}>
                  <PlaygroundIcon name={folder ? "folder" : "file"} width="14" height="14" />
                  <span>{file}</span>
                  {file === "session.ts" || file === "draft.md" ? <i aria-label={zh ? "已修改" : "Modified"}>M</i> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </details>
      <details>
        <summary><PlaygroundIcon name="search" width="15" height="15" /><strong>{zh ? "搜索结果" : "Search results"}</strong><small>4</small></summary>
        <p>{zh ? "输入关键词以搜索当前工作区。" : "Enter a term to search this workspace."}</p>
      </details>
      <footer><span>main*</span><span>4↓ 1↑</span></footer>
    </aside>
  );
}

export function TaskPanel() {
  const { locale } = useWorkspace();
  const zh = locale === "zh";
  return (
    <section className="workbench-task" aria-label={zh ? "任务" : "Task"}>
      <header>
        <div><strong>{zh ? "修复会话恢复" : "Fix session recovery"}</strong><span className="status-badge" data-state="active">{zh ? "执行中" : "Running"}</span></div>
        <p>{zh ? "检查登录改动、运行测试并说明剩余风险。" : "Review sign-in changes, run tests, and explain remaining risk."}</p>
      </header>
      <ol className="workbench-task__transcript">
        <li data-role="user"><article>{zh ? "焦点在令牌刷新失败后会丢失，请定位并修复。" : "Focus is lost after token refresh fails. Find and fix the cause."}</article></li>
        <li data-role="assistant">
          <article>
            <header><strong>{zh ? "执行记录" : "Execution"}</strong><time>10:42</time></header>
            <p>{zh ? "已确认失败路径跳过了焦点恢复，并补充聚焦回归。" : "The failure path skipped focus restoration. I added focused regression coverage."}</p>
            <details className="execution-item" data-state="success" open>
              <summary>
                <span data-execution-icon><PlaygroundIcon name="check" width="14" height="14" /></span>
                <span data-execution-identity><strong>{zh ? "运行会话测试" : "Run session tests"}</strong><small>npm test -- session</small></span>
                <span className="status-badge" data-state="success">{zh ? "通过" : "Passed"}</span>
                <span data-execution-disclosure>›</span>
              </summary>
              <section><pre>12 passed · 0 failed · 4.8s</pre></section>
            </details>
            <p>{zh ? "下一步检查移动端返回登录页后的键盘顺序。" : "Next I am checking keyboard order after returning to sign-in on mobile."}</p>
          </article>
        </li>
      </ol>
      <div className="workbench-task__composer"><AgentComposerDemo /></div>
    </section>
  );
}

const inspectorCopy = {
  automation: { title: ["运行策略", "Run policy"], rows: [["并发", "2"], ["失败重试", "2 次"], ["证据保留", "14 天"]] },
  catalog: { title: ["能力详情", "Capability"], rows: [["来源", "Verified"], ["权限", "Workspace"], ["更新", "Automatic"]] },
  channels: { title: ["连接详情", "Connection"], rows: [["健康", "99.98%"], ["延迟", "126 ms"], ["权限", "Read / Write"]] },
  code: { title: ["变更审阅", "Change review"], rows: [["文件", "3"], ["新增", "+54"], ["删除", "−9"]] },
  design: { title: ["设计检查", "Design review"], rows: [["断点", "3"], ["对比度", "AA"], ["待处理", "1"]] },
  settings: { title: ["策略摘要", "Policy summary"], rows: [["本机", "允许"], ["网络", "询问"], ["风险操作", "阻止"]] },
  workflow: { title: ["节点配置", "Node settings"], rows: [["超时", "8 min"], ["重试", "1"], ["失败策略", "Pause"]] },
  write: { title: ["文档检查", "Document review"], rows: [["字数", "1,284"], ["引用", "6"], ["建议", "3"]] },
} as const;

export function InspectorPanel() {
  const { locale, sceneId } = useWorkspace();
  const zh = locale === "zh";
  const copy = inspectorCopy[sceneId];
  return (
    <aside className="workbench-inspector" aria-label={copy.title[zh ? 0 : 1]}>
      <header><strong>{copy.title[zh ? 0 : 1]}</strong><button type="button">•••</button></header>
      <section>
        <dl>{copy.rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      {sceneId === "code" ? (
        <section className="workbench-inspector__changes">
          <header><strong>{zh ? "文件" : "Files"}</strong><span>3</span></header>
          <button type="button" aria-current="page"><code>src/auth/session.ts</code><small>+18 −6</small></button>
          <button type="button"><code>src/routes/sign-in.tsx</code><small>+12 −3</small></button>
          <button type="button"><code>tests/session.test.ts</code><small>+24</small></button>
          <pre><code><del>return redirect(&quot;/login&quot;)</del>{"\n"}<ins>target.focus({'{'} preventScroll: true {'}'})</ins>{"\n"}<ins>return redirect(&quot;/login&quot;)</ins></code></pre>
        </section>
      ) : (
        <section className="workbench-inspector__note">
          <strong>{zh ? "下一项" : "Next"}</strong>
          <p>{zh ? "验证当前选择在键盘、触控和窄屏下仍可恢复。" : "Verify the current selection remains recoverable with keyboard, touch, and narrow screens."}</p>
          <button type="button">{zh ? "标记完成" : "Mark complete"}</button>
        </section>
      )}
    </aside>
  );
}

export function TerminalPanel() {
  const { locale } = useWorkspace();
  const zh = locale === "zh";
  return (
    <section className="workbench-terminal terminal" aria-label={zh ? "终端" : "Terminal"}>
      <header><nav><button type="button" aria-current="page">Terminal</button><button type="button">Problems <span>0</span></button><button type="button">Output</button></nav><span>zsh　＋　⌫</span></header>
      <pre><code><span>$ npm test -- session</span>{"\n"}<b>PASS</b> tests/session.test.ts{ "\n" }  ✓ restores focus after refresh failure{ "\n" }  ✓ preserves return route{ "\n" }  ✓ announces recovery state{ "\n\n" }<strong>Tests: 12 passed, 12 total</strong>{ "\n" }<span>$ <i aria-hidden="true" /></span></code></pre>
    </section>
  );
}

export function EmptyWorkspacePanel() {
  const { locale } = useWorkspace();
  return (
    <section className="workbench-watermark">
      <PlaygroundIcon name="inspect" width="28" height="28" />
      <strong>{locale === "zh" ? "打开一个面板" : "Open a panel"}</strong>
      <p>{locale === "zh" ? "从活动栏选择任务、文件、预览或终端。" : "Choose task, files, preview, or terminal from the activity bar."}</p>
    </section>
  );
}

export const workspacePanelComponents: Record<
  string,
  FunctionComponent<IDockviewPanelProps>
> = {
  editor: WorkspaceSceneSurface,
  explorer: ExplorerPanel,
  inspector: InspectorPanel,
  preview: DevicePreviewPanel,
  task: TaskPanel,
  terminal: TerminalPanel,
};
