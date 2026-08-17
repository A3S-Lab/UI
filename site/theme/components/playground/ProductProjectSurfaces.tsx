import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@rspress/core/theme";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductComposer } from "./ProductComposer";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

const projectConversation = {
  en: [
    "Review release readiness for the project. Check the documentation routes, project navigation, and visual acceptance evidence before publishing.",
    "I reviewed the current project context and found one blocking workflow: the project card did not open a project workspace, so the child task had no durable route.",
    "The project path is now explicit, the sidebar retains project context, and the desktop and mobile acceptance checks are ready to run.",
  ],
  zh: [
    "发布前检查这个项目的就绪状态。请核对文档路由、项目导航和视觉验收证据。",
    "我检查了当前项目上下文，发现一个阻断流程：项目卡片没有进入项目工作区，因此子任务也没有稳定路由。",
    "项目路径现已明确，侧边栏会保留项目上下文，桌面端与移动端验收项也已准备完成。",
  ],
} as const;

const projectArtifacts = [
  {
    content: `export const projectRoutes = {
  workspace: "/app/projects/a3s-ui-experience",
  releaseReadiness:
    "/app/projects/a3s-ui-experience/sessions/release-readiness",
};`,
    id: "routes",
    kind: "TypeScript",
    name: "site/product-application-routes.ts",
    summary: {
      en: "Defines durable routes for the project and its release task.",
      zh: "为项目及其发布任务定义稳定路由。",
    },
  },
  {
    content: `scenario "project-session" {
    navigate "open-project" {
        url = "http://127.0.0.1:4178/UI/app/projects.html"
    }
    click "project-card" {
        target = role("link", "A3S UI 体验优化")
    }
    expect "workspace-route" {
        visible = css("[data-product-surface=project]")
    }
}`,
    id: "acceptance",
    kind: "ACL",
    name: "tests/e2e/product-project-workflow.acl",
    summary: {
      en: "Covers project entry, child-task navigation, and responsive state.",
      zh: "覆盖项目入口、子任务导航与响应式状态。",
    },
  },
  {
    content: `# Release readiness

- Project card opens the project workspace.
- Project navigation stays selected through child routes.
- The active child task is visible in the sidebar.
- Conversation, composer, and artifact inspection work on mobile.
- Light and dark visual acceptance evidence is retained.`,
    id: "review",
    kind: "Markdown",
    name: "release-readiness.md",
    summary: {
      en: "Records the workflow and visual acceptance criteria.",
      zh: "记录工作流与视觉验收标准。",
    },
  },
] as const;

function ProjectBreadcrumb({
  current,
  locale,
  projectHref,
  projectsHref,
}: {
  current?: string;
  locale: ProductPlaygroundLocale;
  projectHref: string;
  projectsHref: string;
}) {
  const zh = locale === "zh";
  return (
    <nav
      aria-label={zh ? "项目路径" : "Project path"}
      className="product-project-breadcrumb"
    >
      <Link href={projectsHref}>
        <ProductPlaygroundIcon name="folder" />
        <span>{zh ? "项目" : "Projects"}</span>
      </Link>
      <span aria-hidden="true">/</span>
      {current ? (
        <>
          <Link href={projectHref}>
            {zh ? "A3S UI 体验优化" : "A3S UI experience"}
          </Link>
          <span aria-hidden="true">/</span>
          <h1>{current}</h1>
        </>
      ) : (
        <h1>{zh ? "A3S UI 体验优化" : "A3S UI experience"}</h1>
      )}
    </nav>
  );
}

function ProjectPresence({ locale }: { locale: ProductPlaygroundLocale }) {
  const zh = locale === "zh";
  return (
    <div className="product-project-presence">
      <span data-collaborating>
        <i aria-hidden="true" />
        {zh ? "协同中" : "Collaborating"}
      </span>
      <span aria-label={zh ? "3 位项目成员" : "3 project members"}>
        <ProductPlaygroundIcon name="assistant" />3
      </span>
    </div>
  );
}

export function ProductProjectWorkspaceSurface({
  locale,
  projectHref,
  projectsHref,
  sessionHref,
}: {
  locale: ProductPlaygroundLocale;
  projectHref: string;
  projectsHref: string;
  sessionHref: string;
}) {
  const zh = locale === "zh";
  const [draftTask, setDraftTask] = useState("");

  return (
    <section
      className="product-project-workspace"
      data-product-surface="project"
    >
      <header className="product-project-workspace__header">
        <ProjectBreadcrumb
          locale={locale}
          projectHref={projectHref}
          projectsHref={projectsHref}
        />
        <div>
          <ProjectPresence locale={locale} />
          <Link data-new-task href={sessionHref}>
            <ProductPlaygroundIcon name="plus" />
            {zh ? "新建任务" : "New task"}
          </Link>
        </div>
      </header>

      <div className="product-project-workspace__viewport">
        <div className="product-project-workspace__content">
          <section className="product-project-workspace__intro">
            <span>
              <ProductPlaygroundIcon name="project" />
            </span>
            <div>
              <h2>{zh ? "A3S UI 体验优化" : "A3S UI experience"}</h2>
              <p>
                {zh
                  ? "集中管理界面规范、验收证据与发布任务，让每次调整都有明确上下文。"
                  : "Keep interface decisions, acceptance evidence, and release tasks in one shared context."}
              </p>
            </div>
            <ul aria-label={zh ? "项目概况" : "Project overview"}>
              <li>
                <strong>1</strong>
                <span>{zh ? "进行中的任务" : "Active task"}</span>
              </li>
              <li>
                <strong>6</strong>
                <span>{zh ? "共享资料" : "Shared assets"}</span>
              </li>
              <li>
                <strong>3</strong>
                <span>{zh ? "项目成员" : "Members"}</span>
              </li>
            </ul>
          </section>

          <section className="product-project-workspace__tasks">
            <header>
              <div>
                <h2>{zh ? "项目任务" : "Project tasks"}</h2>
                <p>
                  {zh
                    ? "所有任务共享项目资料、约束与验收上下文。"
                    : "Every task inherits the project's assets, constraints, and acceptance context."}
                </p>
              </div>
              <Link href={sessionHref}>
                <ProductPlaygroundIcon name="plus" />
                {zh ? "创建任务" : "Create task"}
              </Link>
            </header>
            <div>
              {draftTask ? (
                <div data-draft-task role="status">
                  <span>
                    <ProductPlaygroundIcon name="document" />
                  </span>
                  <span>
                    <strong>{draftTask}</strong>
                    <small>
                      {zh ? "刚刚创建 · 草稿" : "Created now · Draft"}
                    </small>
                  </span>
                  <small>{zh ? "待开始" : "Ready"}</small>
                </div>
              ) : null}
              <Link href={sessionHref}>
                <span>
                  <ProductPlaygroundIcon name="checklist" />
                </span>
                <span>
                  <strong>{zh ? "发布就绪检查" : "Release readiness"}</strong>
                  <small>
                    {zh
                      ? "核对路由、交互与视觉验收证据"
                      : "Review routes, interactions, and visual evidence"}
                  </small>
                </span>
                <span data-task-state>
                  <i aria-hidden="true" />
                  {zh ? "进行中" : "In progress"}
                </span>
                <ProductPlaygroundIcon name="chevron" />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <footer className="product-project-workspace__composer">
        <ProductComposer
          compact
          locale={locale}
          onSubmit={setDraftTask}
          placeholder={
            zh
              ? "在项目中创建任务，@ 引用共享资料，/ 调用技能"
              : "Create a project task. Use @ for shared assets or / for skills"
          }
          showPermissions={false}
          submitSuccessMessage={
            zh
              ? "已在项目中创建任务草稿。"
              : "A task draft was created in the project."
          }
        />
        <small>
          {zh
            ? "此处创建的任务会继承项目上下文"
            : "Tasks created here inherit the project context"}
        </small>
      </footer>
    </section>
  );
}

export function ProductProjectSessionSurface({
  locale,
  projectHref,
  projectsHref,
}: {
  locale: ProductPlaygroundLocale;
  projectHref: string;
  projectsHref: string;
}) {
  const zh = locale === "zh";
  const copy = projectConversation[locale];
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [artifactCopyStatus, setArtifactCopyStatus] = useState("");
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorOverlay, setInspectorOverlay] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const inspectorCloseRef = useRef<HTMLButtonElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const inspectorTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 60rem)");
    const update = () => setInspectorOverlay(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    window.requestAnimationFrame(() => inspectorTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!inspectorOpen) return undefined;

    const focusFrame = window.requestAnimationFrame(() =>
      inspectorCloseRef.current?.focus(),
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeInspector();
        return;
      }
      if (!inspectorOverlay || event.key !== "Tab") return;

      const controls = [
        ...(inspectorRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ) ?? []),
      ].filter((control) => control.getClientRects().length > 0);
      const first = controls.at(0);
      const last = controls.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeInspector, inspectorOpen, inspectorOverlay]);

  const matchCount = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (!normalizedQuery) return 0;
    return [...copy, ...followUps].reduce((count, value) => {
      const matches = value
        .toLocaleLowerCase(locale)
        .split(normalizedQuery).length;
      return count + Math.max(0, matches - 1);
    }, 0);
  }, [copy, followUps, locale, query]);

  const activeArtifact = projectArtifacts.find(
    (artifact) => artifact.id === activeArtifactId,
  );

  const copyArtifact = async () => {
    if (!activeArtifact) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.content);
      setArtifactCopyStatus(zh ? "内容已复制" : "Content copied");
    } catch {
      setArtifactCopyStatus(zh ? "无法复制内容" : "Unable to copy content");
    }
  };

  return (
    <section
      className="product-project-session product-session"
      data-inspector-open={inspectorOpen ? "true" : undefined}
      data-product-surface="project-session"
      data-search-open={searchOpen ? "true" : undefined}
    >
      <header className="product-session__header">
        <ProjectBreadcrumb
          current={zh ? "发布就绪检查" : "Release readiness"}
          locale={locale}
          projectHref={projectHref}
          projectsHref={projectsHref}
        />
        <div className="product-session__actions">
          <button
            aria-expanded={searchOpen}
            aria-label={zh ? "在项目会话中搜索" : "Search project conversation"}
            data-active={searchOpen ? "true" : undefined}
            onClick={() => setSearchOpen((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="search" />
          </button>
          <ProjectPresence locale={locale} />
          <button
            aria-controls="product-project-session-artifacts"
            aria-expanded={inspectorOpen}
            aria-label={
              inspectorOpen
                ? zh
                  ? "关闭项目产物"
                  : "Close project artifacts"
                : zh
                  ? "打开项目产物"
                  : "Open project artifacts"
            }
            data-active={inspectorOpen ? "true" : undefined}
            onClick={() =>
              inspectorOpen ? closeInspector() : setInspectorOpen(true)
            }
            ref={inspectorTriggerRef}
            type="button"
          >
            <ProductPlaygroundIcon name="workspace" />
          </button>
        </div>
      </header>

      {searchOpen ? (
        <form
          className="product-session__search"
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          <ProductPlaygroundIcon name="search" />
          <input
            aria-label={zh ? "搜索项目会话" : "Search project conversation"}
            autoFocus
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={zh ? "搜索项目会话" : "Search project conversation"}
            type="search"
            value={query}
          />
          <output aria-live="polite">
            {query.trim()
              ? zh
                ? `${matchCount} 个结果`
                : `${matchCount} ${matchCount === 1 ? "result" : "results"}`
              : zh
                ? "输入关键词"
                : "Enter a keyword"}
          </output>
          <button
            aria-label={zh ? "关闭项目会话搜索" : "Close project search"}
            onClick={() => {
              setSearchOpen(false);
              setQuery("");
            }}
            type="button"
          >
            <ProductPlaygroundIcon name="close" />
          </button>
        </form>
      ) : null}

      <div className="product-session__viewport">
        <ol aria-label={zh ? "项目会话记录" : "Project conversation history"}>
          <li data-role="user">
            <article>
              <p>{copy[0]}</p>
            </article>
          </li>
          <li data-role="assistant">
            <article>
              <header>
                <span>
                  <ProductPlaygroundIcon name="assistant" />
                  <strong>A3S</strong>
                </span>
              </header>
              <div className="product-session__response">
                <p>{copy[1]}</p>
                <details className="product-session__tool">
                  <summary>
                    <span data-tool-icon>
                      <ProductPlaygroundIcon name="search" />
                    </span>
                    <span data-tool-identity>
                      <strong>
                        {zh ? "检查项目工作流" : "Inspect project workflow"}
                      </strong>
                      <small>site/product-application-routes.ts</small>
                    </span>
                    <span data-tool-state>{zh ? "已完成" : "Complete"}</span>
                    <ProductPlaygroundIcon
                      data-tool-disclosure
                      name="chevron"
                    />
                  </summary>
                  <section>
                    <dl>
                      <div>
                        <dt>{zh ? "发现" : "Finding"}</dt>
                        <dd>
                          {zh
                            ? "项目卡片没有导航，子任务缺少稳定路径。"
                            : "The project card did not navigate and the child task lacked a durable path."}
                        </dd>
                      </div>
                      <div>
                        <dt>{zh ? "范围" : "Scope"}</dt>
                        <dd>
                          {zh
                            ? "2 条路由 · 3 个界面状态"
                            : "2 routes · 3 interface states"}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </details>
                <details className="product-session__tool" data-success>
                  <summary>
                    <span data-tool-icon>
                      <ProductPlaygroundIcon name="check" />
                    </span>
                    <span data-tool-identity>
                      <strong>
                        {zh ? "准备发布验收" : "Prepare release acceptance"}
                      </strong>
                      <small>
                        {zh
                          ? "桌面端 · 移动端 · 暗色"
                          : "Desktop · Mobile · Dark"}
                      </small>
                    </span>
                    <span data-tool-state>{zh ? "已就绪" : "Ready"}</span>
                    <ProductPlaygroundIcon
                      data-tool-disclosure
                      name="chevron"
                    />
                  </summary>
                  <section>
                    <pre>
                      {zh
                        ? "路由检查     已通过\n交互回归     已准备\n视觉验收     待执行"
                        : "Route checks       Passed\nInteraction suite  Ready\nVisual acceptance  Pending"}
                    </pre>
                  </section>
                </details>
                <p>{copy[2]}</p>
              </div>
            </article>
          </li>
          {followUps.map((message, index) => (
            <li data-role="user" key={`${message}-${index}`}>
              <article>
                <p>{message}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>

      <footer className="product-session__composer">
        <ProductComposer
          compact
          locale={locale}
          onSubmit={(message) =>
            setFollowUps((current) => [...current, message])
          }
          placeholder={
            zh
              ? "继续项目任务，@ 引用项目资料、待办或技能"
              : "Continue this task. Use @ for project assets, todos, or skills"
          }
          showPermissions={false}
        />
        <small>
          {zh
            ? "生成内容可能存在误差，请核实重要信息"
            : "Generated content may contain errors. Verify important information."}
        </small>
      </footer>

      {inspectorOpen ? (
        <>
          <button
            aria-hidden="true"
            className="product-session__inspector-backdrop"
            onClick={closeInspector}
            tabIndex={-1}
            type="button"
          />
          <aside
            aria-label={zh ? "项目产物" : "Project artifacts"}
            aria-modal={inspectorOverlay ? true : undefined}
            className="product-session__inspector"
            id="product-project-session-artifacts"
            ref={inspectorRef}
            role={inspectorOverlay ? "dialog" : undefined}
          >
            <header>
              <div>
                <strong>{zh ? "项目产物" : "Project artifacts"}</strong>
                <small>
                  {zh
                    ? `${projectArtifacts.length} 个文件 · 发布就绪检查`
                    : `${projectArtifacts.length} files · Release readiness`}
                </small>
              </div>
              <button
                aria-label={zh ? "关闭项目产物" : "Close project artifacts"}
                onClick={closeInspector}
                ref={inspectorCloseRef}
                type="button"
              >
                <ProductPlaygroundIcon name="close" />
              </button>
            </header>

            {activeArtifact ? (
              <section className="product-session__artifact-preview">
                <header>
                  <button
                    onClick={() => {
                      setActiveArtifactId(null);
                      setArtifactCopyStatus("");
                    }}
                    type="button"
                  >
                    <ProductPlaygroundIcon name="arrow" />
                    {zh ? "返回" : "Back"}
                  </button>
                  <button onClick={copyArtifact} type="button">
                    <ProductPlaygroundIcon name="document" />
                    {zh ? "复制" : "Copy"}
                  </button>
                </header>
                <div>
                  <span>
                    <ProductPlaygroundIcon name="document" />
                  </span>
                  <strong>{activeArtifact.name}</strong>
                  <small>{activeArtifact.summary[locale]}</small>
                </div>
                <pre>
                  <code>{activeArtifact.content}</code>
                </pre>
                <output aria-live="polite">{artifactCopyStatus}</output>
              </section>
            ) : (
              <div className="product-session__artifact-overview">
                <section>
                  <span>
                    <ProductPlaygroundIcon name="check" />
                  </span>
                  <div>
                    <strong>
                      {zh ? "项目工作流已建立" : "Project workflow established"}
                    </strong>
                    <small>
                      {zh
                        ? "项目入口、子任务路径与验收范围现已关联。"
                        : "Project entry, child-task routing, and acceptance scope are now connected."}
                    </small>
                  </div>
                </section>
                <div>
                  <header>
                    <strong>{zh ? "验收产物" : "Acceptance artifacts"}</strong>
                    <small>{projectArtifacts.length}</small>
                  </header>
                  {projectArtifacts.map((artifact) => (
                    <button
                      key={artifact.id}
                      onClick={() => {
                        setActiveArtifactId(artifact.id);
                        setArtifactCopyStatus("");
                      }}
                      type="button"
                    >
                      <span>
                        <ProductPlaygroundIcon name="document" />
                      </span>
                      <span>
                        <strong>{artifact.name}</strong>
                        <small>{artifact.kind}</small>
                      </span>
                      <ProductPlaygroundIcon name="chevron" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </>
      ) : null}
    </section>
  );
}
