import { PlaygroundIcon } from "./PlaygroundIcon";
import type { PlaygroundLocale } from "./playground-data";

function Composer({ locale }: { locale: PlaygroundLocale }) {
  return (
    <form className="agent-composer" data-layout="compact">
      <textarea
        aria-label={locale === "zh" ? "任务指令" : "Task instruction"}
        placeholder={
          locale === "zh"
            ? "描述下一步，或用 @ 添加上下文…"
            : "Describe the next step, or add context with @…"
        }
      />
      <footer>
        <div data-composer-tools>
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="ghost"
          >
            {locale === "zh" ? "添加上下文" : "Add context"}
          </button>
          <span data-composer-status>{locale === "zh" ? "自动" : "Auto"}</span>
        </div>
        <div data-composer-actions>
          <button
            type="submit"
            className="btn"
            data-size="icon-sm"
            aria-label={locale === "zh" ? "发送" : "Send"}
          >
            <PlaygroundIcon name="play" width="16" height="16" />
          </button>
        </div>
      </footer>
    </form>
  );
}

export function CodeScene({ locale }: { locale: PlaygroundLocale }) {
  return (
    <div className="playground-code-scene" data-playground-scene="code">
      <main className="playground-code-main">
        <section
          className="agent-transcript"
          aria-label={locale === "zh" ? "任务记录" : "Task transcript"}
        >
          <ol data-transcript-viewport>
            <li data-role="user">
              <article>
                <div data-message-content>
                  {locale === "zh"
                    ? "检查登录流程的改动，运行测试，并说明剩余风险。"
                    : "Review the sign-in changes, run tests, and explain remaining risks."}
                </div>
              </article>
            </li>
            <li data-role="agent">
              <article>
                <header>
                  <strong>{locale === "zh" ? "执行记录" : "Execution"}</strong>
                  <time>10:42</time>
                </header>
                <div data-message-content>
                  <p>
                    {locale === "zh"
                      ? "我先核对受影响的路由与会话恢复逻辑，然后运行聚焦测试。"
                      : "I checked the affected routes and session recovery before running focused tests."}
                  </p>
                </div>
                <details className="execution-item" data-state="success" open>
                  <summary>
                    <span data-execution-icon>
                      <PlaygroundIcon name="check" width="15" height="15" />
                    </span>
                    <span data-execution-identity>
                      <strong>
                        {locale === "zh"
                          ? "运行登录回归"
                          : "Run sign-in regression"}
                      </strong>
                      <small>npm test -- sign-in</small>
                    </span>
                    <span
                      className="status-badge"
                      data-state="success"
                      data-execution-status
                    >
                      {locale === "zh" ? "通过" : "Passed"}
                    </span>
                    <span data-execution-disclosure>›</span>
                  </summary>
                  <section>
                    <pre>12 tests passed · 0 failed · 4.8s</pre>
                  </section>
                </details>
                <div data-message-content>
                  <p>
                    {locale === "zh"
                      ? "测试已通过。需要重点审阅令牌刷新失败后的焦点恢复。"
                      : "Tests pass. Focus restoration after token refresh failure remains the main review point."}
                  </p>
                </div>
              </article>
            </li>
          </ol>
        </section>
        <Composer locale={locale} />
      </main>
      <aside
        className="task-pane playground-inspector"
        aria-label={locale === "zh" ? "变更检查器" : "Change inspector"}
      >
        <header>
          <strong>{locale === "zh" ? "变更" : "Changes"}</strong>
          <span className="badge" data-variant="secondary">
            3
          </span>
        </header>
        <section className="change-review">
          <ul data-review-files>
            <li data-state="selected">
              <code>src/auth/session.ts</code>
              <small>+18 −6</small>
            </li>
            <li>
              <code>src/routes/sign-in.tsx</code>
              <small>+12 −3</small>
            </li>
            <li>
              <code>tests/sign-in.test.ts</code>
              <small>+24</small>
            </li>
          </ul>
          <div
            className="playground-diff"
            aria-label={locale === "zh" ? "差异预览" : "Diff preview"}
          >
            <code data-line="−">return redirect(&quot;/login&quot;)</code>
            <code data-line="+">return restoreFocus(target)</code>
            <code data-line="+">return redirect(&quot;/login&quot;)</code>
          </div>
        </section>
      </aside>
    </div>
  );
}

export function DesignScene({ locale }: { locale: PlaygroundLocale }) {
  return (
    <div className="playground-design-scene" data-playground-scene="design">
      <aside
        className="playground-layers"
        aria-label={locale === "zh" ? "图层" : "Layers"}
      >
        <header>
          <strong>{locale === "zh" ? "页面与图层" : "Pages and layers"}</strong>
        </header>
        <div
          className="tree"
          role="tree"
          aria-label={locale === "zh" ? "设计图层" : "Design layers"}
        >
          <div
            role="treeitem"
            aria-expanded="true"
            aria-selected="true"
            data-value="homepage"
          >
            <span data-tree-row>
              <PlaygroundIcon name="folder" width="15" height="15" />
              <span data-tree-label>
                {locale === "zh" ? "产品主页" : "Product homepage"}
              </span>
            </span>
            <div role="group">
              <div role="treeitem" data-value="hero">
                <span data-tree-row>
                  <PlaygroundIcon name="inspect" width="15" height="15" />
                  <span data-tree-label>Hero</span>
                </span>
              </div>
              <div role="treeitem" data-value="features">
                <span data-tree-row>
                  <PlaygroundIcon name="inspect" width="15" height="15" />
                  <span data-tree-label>
                    {locale === "zh" ? "能力区" : "Features"}
                  </span>
                </span>
              </div>
              <div role="treeitem" data-value="footer">
                <span data-tree-row>
                  <PlaygroundIcon name="inspect" width="15" height="15" />
                  <span data-tree-label>
                    {locale === "zh" ? "页脚" : "Footer"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <main
        className="playground-canvas"
        aria-label={locale === "zh" ? "设计画布" : "Design canvas"}
      >
        <div
          className="toolbar"
          role="toolbar"
          aria-label={locale === "zh" ? "画布工具" : "Canvas tools"}
        >
          <button
            type="button"
            className="btn"
            data-size="icon-sm"
            data-variant="ghost"
            aria-label={locale === "zh" ? "选择" : "Select"}
          >
            <PlaygroundIcon name="inspect" width="16" height="16" />
          </button>
          <button
            type="button"
            className="btn"
            data-size="icon-sm"
            data-variant="ghost"
            aria-label={locale === "zh" ? "预览" : "Preview"}
          >
            <PlaygroundIcon name="play" width="16" height="16" />
          </button>
          <output>72%</output>
        </div>
        <div className="playground-canvas-viewport">
          <article
            className="playground-artboard"
            aria-label={locale === "zh" ? "主页画板" : "Homepage artboard"}
          >
            <header>
              <small>A3S WORKSPACE</small>
              <button type="button">
                {locale === "zh" ? "开始使用" : "Get started"}
              </button>
            </header>
            <section>
              <h2>
                {locale === "zh"
                  ? "让复杂工作保持清晰。"
                  : "Keep complex work clear."}
              </h2>
              <p>
                {locale === "zh"
                  ? "一个稳定的上下文边缘，一块开放的任务画布。"
                  : "A stable edge for context and an open canvas for the task."}
              </p>
            </section>
            <div>
              <span />
              <span />
              <span />
            </div>
          </article>
        </div>
        <footer>
          <span>{locale === "zh" ? "主页 · 桌面" : "Homepage · Desktop"}</span>
          <span>1280 × 800</span>
        </footer>
      </main>
      <aside
        className="task-pane playground-inspector"
        aria-label={locale === "zh" ? "设计审阅" : "Design review"}
      >
        <header>
          <strong>{locale === "zh" ? "设计审阅" : "Design review"}</strong>
          <span className="status-badge" data-state="active">
            3 / 3
          </span>
        </header>
        <section>
          <p>
            {locale === "zh"
              ? "完善移动端层级，并验证主操作在 320px 下仍可见。"
              : "Tighten mobile hierarchy and verify the primary action remains visible at 320px."}
          </p>
          <ol className="task-plan">
            <li className="plan-step" data-state="complete">
              <span data-plan-marker>
                <PlaygroundIcon name="check" width="13" height="13" />
              </span>
              <span data-step-identity>
                <strong>
                  {locale === "zh" ? "检查参考" : "Review references"}
                </strong>
              </span>
            </li>
            <li className="plan-step" data-state="complete">
              <span data-plan-marker>
                <PlaygroundIcon name="check" width="13" height="13" />
              </span>
              <span data-step-identity>
                <strong>
                  {locale === "zh"
                    ? "生成响应式布局"
                    : "Build responsive layout"}
                </strong>
              </span>
            </li>
            <li className="plan-step" data-state="active">
              <span data-plan-marker>3</span>
              <span data-step-identity>
                <strong>
                  {locale === "zh" ? "验证原型" : "Verify prototype"}
                </strong>
              </span>
            </li>
          </ol>
        </section>
        <Composer locale={locale} />
      </aside>
    </div>
  );
}

export function WriteScene({ locale }: { locale: PlaygroundLocale }) {
  return (
    <div className="playground-write-scene" data-playground-scene="write">
      <aside className="playground-document-tree">
        <header>
          <strong>{locale === "zh" ? "发布资料" : "Launch content"}</strong>
        </header>
        <nav aria-label={locale === "zh" ? "文档" : "Documents"}>
          <button type="button">
            <PlaygroundIcon name="folder" width="15" height="15" />
            {locale === "zh" ? "草稿" : "Drafts"}
          </button>
          <button type="button">
            <PlaygroundIcon name="folder" width="15" height="15" />
            {locale === "zh" ? "研究" : "Research"}
          </button>
          <button type="button" aria-current="page">
            <PlaygroundIcon name="file" width="15" height="15" />
            release-notes.md
          </button>
          <button type="button">
            <PlaygroundIcon name="file" width="15" height="15" />
            launch-checklist.md
          </button>
        </nav>
      </aside>
      <main className="playground-document">
        <div
          className="toolbar"
          role="toolbar"
          aria-label={locale === "zh" ? "写作工具" : "Writing tools"}
        >
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="ghost"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="ghost"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="ghost"
          >
            H2
          </button>
          <span data-toolbar-spacer />
          <span className="status-badge" data-state="success">
            {locale === "zh" ? "已保存" : "Saved"}
          </span>
        </div>
        <article
          contentEditable
          suppressContentEditableWarning
          aria-label={locale === "zh" ? "文档编辑器" : "Document editor"}
        >
          <h1>
            {locale === "zh"
              ? "以一个清晰的发布说明开始"
              : "Start with a clear release note"}
          </h1>
          <p>
            {locale === "zh"
              ? "先说明用户获得了什么，再补充迁移方式、已知限制和验证证据。"
              : "Lead with what users gain, then cover migration, known limits, and verification evidence."}
          </p>
          <h2>{locale === "zh" ? "本次更新" : "What changed"}</h2>
          <ul>
            <li>
              {locale === "zh"
                ? "任务恢复更可靠"
                : "More reliable task recovery"}
            </li>
            <li>
              {locale === "zh"
                ? "文件审阅保留焦点"
                : "File review preserves focus"}
            </li>
          </ul>
        </article>
      </main>
      <aside className="task-pane playground-inspector">
        <header>
          <strong>{locale === "zh" ? "写作助手" : "Writing assistant"}</strong>
        </header>
        <section>
          <div className="empty" data-variant="compact">
            <strong>
              {locale === "zh" ? "选择文本开始" : "Select text to begin"}
            </strong>
            <p>
              {locale === "zh"
                ? "总结、改写或核对当前段落。"
                : "Summarize, revise, or verify the current paragraph."}
            </p>
          </div>
          <div data-playground-suggestions>
            <button type="button" className="item">
              <strong>
                {locale === "zh" ? "总结文档" : "Summarize document"}
              </strong>
              <small>
                {locale === "zh"
                  ? "提取重点与风险"
                  : "Extract key points and risks"}
              </small>
            </button>
            <button type="button" className="item">
              <strong>
                {locale === "zh" ? "改善选中文本" : "Improve selection"}
              </strong>
              <small>
                {locale === "zh"
                  ? "增强清晰度与语气"
                  : "Improve clarity and tone"}
              </small>
            </button>
          </div>
        </section>
        <Composer locale={locale} />
      </aside>
    </div>
  );
}

export function WorkflowScene({ locale }: { locale: PlaygroundLocale }) {
  return (
    <div className="playground-workflow-scene" data-playground-scene="workflow">
      <main className="playground-flow-canvas">
        <header
          className="toolbar"
          role="toolbar"
          aria-label={locale === "zh" ? "工作流工具" : "Workflow tools"}
        >
          <button type="button" className="btn" data-size="sm">
            <PlaygroundIcon name="play" width="15" height="15" />
            {locale === "zh" ? "运行" : "Run"}
          </button>
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="outline"
          >
            {locale === "zh" ? "验证" : "Validate"}
          </button>
          <span data-toolbar-spacer />
          <output>
            {locale === "zh" ? "上次保存于 10:42" : "Saved at 10:42"}
          </output>
        </header>
        <div data-flow-viewport>
          <article
            className="playground-flow-node"
            data-kind="trigger"
            data-state="complete"
          >
            <small>{locale === "zh" ? "触发器" : "Trigger"}</small>
            <strong>
              {locale === "zh" ? "每周五 17:00" : "Friday at 17:00"}
            </strong>
            <span data-port="output" />
          </article>
          <article
            className="playground-flow-node"
            data-kind="agent"
            data-state="active"
          >
            <span data-port="input" />
            <small>{locale === "zh" ? "任务" : "Task"}</small>
            <strong>
              {locale === "zh" ? "汇总本周项目" : "Summarize the week"}
            </strong>
            <p>
              {locale === "zh"
                ? "收集完成项、审阅与风险"
                : "Collect completed work, reviews, and risks"}
            </p>
            <span data-port="output" />
          </article>
          <article className="playground-flow-node" data-kind="approval">
            <span data-port="input" />
            <small>{locale === "zh" ? "审批" : "Approval"}</small>
            <strong>
              {locale === "zh" ? "发布前确认" : "Confirm before publish"}
            </strong>
          </article>
          <svg
            aria-hidden="true"
            viewBox="0 0 700 320"
            preserveAspectRatio="none"
          >
            <path d="M180 92 C245 92 230 164 305 164" />
            <path d="M455 164 C525 164 510 236 585 236" />
          </svg>
        </div>
      </main>
      <aside className="task-pane playground-inspector">
        <header>
          <strong>{locale === "zh" ? "节点配置" : "Node configuration"}</strong>
          <span className="badge">2</span>
        </header>
        <section>
          <div className="field">
            <label htmlFor="playground-workflow-name">
              {locale === "zh" ? "名称" : "Name"}
            </label>
            <input
              id="playground-workflow-name"
              className="input"
              defaultValue={
                locale === "zh" ? "汇总本周项目" : "Summarize the week"
              }
            />
          </div>
          <div className="field">
            <label htmlFor="playground-workflow-policy">
              {locale === "zh" ? "执行策略" : "Execution policy"}
            </label>
            <select
              id="playground-workflow-policy"
              className="select"
              defaultValue="review"
            >
              <option value="review">
                {locale === "zh" ? "发布前审批" : "Review before publish"}
              </option>
              <option value="auto">
                {locale === "zh" ? "自动运行" : "Run automatically"}
              </option>
            </select>
          </div>
          <section
            className="timeline"
            aria-label={locale === "zh" ? "运行历史" : "Run history"}
          >
            <ol>
              <li data-state="success">
                <strong>
                  {locale === "zh" ? "运行成功" : "Run succeeded"}
                </strong>
                <time>10:42</time>
              </li>
              <li data-state="warning">
                <strong>
                  {locale === "zh" ? "等待审批" : "Waiting for approval"}
                </strong>
                <time>{locale === "zh" ? "昨天" : "Yesterday"}</time>
              </li>
            </ol>
          </section>
        </section>
      </aside>
    </div>
  );
}
