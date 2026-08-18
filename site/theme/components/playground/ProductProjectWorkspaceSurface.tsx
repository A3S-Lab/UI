import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@rspress/core/theme";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductComposer } from "./ProductComposer";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import {
  ProductProjectBreadcrumb,
  ProductProjectPresence,
} from "./ProductProjectPrimitives";

type ProjectWorkspaceTab = "activity" | "assets" | "plan" | "tasks";

type ProjectTask = {
  id: string;
  progress: string;
  source: "member" | "project";
  state: "active" | "draft";
  summary: string;
  title: string;
};

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
  const [activeTab, setActiveTab] = useState<ProjectWorkspaceTab>("tasks");
  const [configurationOpen, setConfigurationOpen] = useState(true);
  const [configurationOverlay, setConfigurationOverlay] = useState(false);
  const [draftTask, setDraftTask] = useState("");
  const [enabledConfiguration, setEnabledConfiguration] = useState([
    "instructions",
    "automation",
  ]);
  const [inviteStatus, setInviteStatus] = useState("");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const configurationCloseRef = useRef<HTMLButtonElement>(null);
  const configurationRef = useRef<HTMLElement>(null);
  const configurationTriggerRef = useRef<HTMLButtonElement>(null);

  const closeConfiguration = useCallback(() => {
    setConfigurationOpen(false);
    window.requestAnimationFrame(() =>
      configurationTriggerRef.current?.focus(),
    );
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 72rem)");
    const update = () => {
      setConfigurationOverlay(mediaQuery.matches);
      setConfigurationOpen(!mediaQuery.matches);
    };
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!configurationOpen) return undefined;
    const focusFrame = configurationOverlay
      ? window.requestAnimationFrame(() =>
          configurationCloseRef.current?.focus(),
        )
      : undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && configurationOverlay) {
        event.preventDefault();
        closeConfiguration();
        return;
      }
      if (!configurationOverlay || event.key !== "Tab") return;
      const controls = [
        ...(configurationRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], select, input",
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
      if (focusFrame) window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeConfiguration, configurationOpen, configurationOverlay]);

  const tabs: Array<{
    id: ProjectWorkspaceTab;
    label: string;
  }> = [
    { id: "activity", label: zh ? "动态" : "Activity" },
    { id: "plan", label: zh ? "计划" : "Plan" },
    { id: "tasks", label: zh ? "任务" : "Tasks" },
    { id: "assets", label: zh ? "资产" : "Assets" },
  ];

  const tasks = useMemo<ProjectTask[]>(() => {
    const items: ProjectTask[] = [
      {
        id: "release-readiness",
        progress: "7 / 13",
        source: "project",
        state: "active",
        summary: zh
          ? "核对路由、交互与视觉验收证据"
          : "Review routes, interactions, and visual evidence",
        title: zh ? "发布就绪检查" : "Release readiness",
      },
    ];
    if (draftTask) {
      items.unshift({
        id: "draft",
        progress: zh ? "待开始" : "Ready",
        source: "member",
        state: "draft",
        summary: zh
          ? "刚刚创建，仅你可见"
          : "Created now and visible only to you",
        title: draftTask,
      });
    }
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return items.filter(
      (task) =>
        (stateFilter === "all" || task.state === stateFilter) &&
        (sourceFilter === "all" || task.source === sourceFilter) &&
        (!normalizedQuery ||
          (task.title + " " + task.summary)
            .toLocaleLowerCase(locale)
            .includes(normalizedQuery)),
    );
  }, [draftTask, locale, query, sourceFilter, stateFilter, zh]);

  const configurationSections = [
    {
      description: zh
        ? "定义项目目标、边界与交付标准"
        : "Define project goals, boundaries, and delivery standards",
      detail: zh
        ? "保持产品、文档与体验场路由独立；所有界面遵循统一设计规范。"
        : "Keep product, documentation, and experience routes separate while following one interface specification.",
      id: "instructions",
      title: zh ? "指令" : "Instructions",
    },
    {
      description: zh
        ? "连接外部服务与项目数据"
        : "Connect external services and project data",
      detail: zh
        ? "GitHub 与本地工作空间已准备，敏感操作需要确认。"
        : "GitHub and the local workspace are ready; sensitive actions require confirmation.",
      id: "connectors",
      title: zh ? "连接器" : "Connectors",
    },
    {
      description: zh
        ? "为成员提供专门的工作角色"
        : "Give members focused working roles",
      detail: zh
        ? "产品审查、界面实现与质量验收三个角色共享项目上下文。"
        : "Product review, interface implementation, and quality acceptance share project context.",
      id: "assistants",
      title: zh ? "专家" : "Experts",
    },
    {
      description: zh
        ? "复用稳定、可验证的执行流程"
        : "Reuse stable and verifiable workflows",
      detail: zh
        ? "界面审查、浏览器验收与发布检查均可在任务中调用。"
        : "Interface review, browser acceptance, and release checks are available to tasks.",
      id: "skills",
      title: zh ? "技能" : "Skills",
    },
    {
      description: zh
        ? "按计划持续运行项目检查"
        : "Run project checks on a schedule",
      detail: zh
        ? "每日 09:00 汇总回归结果；发布前执行完整视觉验收。"
        : "Summarize regressions daily at 09:00 and run full visual acceptance before release.",
      id: "automation",
      title: zh ? "自动化 · 1" : "Automation · 1",
    },
  ];

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setInviteStatus(zh ? "项目邀请链接已复制" : "Project invite link copied");
    } catch {
      setInviteStatus(
        zh ? "无法复制邀请链接" : "Unable to copy the invite link",
      );
    }
  };

  const toggleConfigurationSection = (id: string) => {
    setEnabledConfiguration((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <section
      className="product-project-workspace"
      data-configuration-open={configurationOpen ? "true" : undefined}
      data-product-surface="project"
    >
      <header className="product-project-workspace__header">
        <ProductProjectBreadcrumb
          locale={locale}
          projectHref={projectHref}
          projectsHref={projectsHref}
        />
        <div>
          <ProductProjectPresence locale={locale} />
          <button data-invite onClick={copyInvite} type="button">
            {zh ? "邀请" : "Invite"}
          </button>
          <button
            aria-controls="product-project-configuration"
            aria-expanded={configurationOpen}
            aria-label={
              configurationOpen
                ? zh
                  ? "关闭项目配置"
                  : "Close project configuration"
                : zh
                  ? "打开项目配置"
                  : "Open project configuration"
            }
            data-configuration-trigger
            onClick={() =>
              configurationOpen
                ? closeConfiguration()
                : setConfigurationOpen(true)
            }
            ref={configurationTriggerRef}
            type="button"
          >
            <ProductPlaygroundIcon name="collapse" />
          </button>
          <output aria-live="polite">{inviteStatus}</output>
        </div>
      </header>

      <div className="product-project-workspace__body">
        <section className="product-project-workspace__workbench">
          <nav
            aria-label={zh ? "项目工作区" : "Project workspace"}
            aria-orientation="horizontal"
            className="product-project-workspace__tabs"
            role="tablist"
          >
            {tabs.map((tab) => (
              <button
                aria-controls={"product-project-panel-" + tab.id}
                aria-selected={activeTab === tab.id}
                id={"product-project-tab-" + tab.id}
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setQuery("");
                }}
                onKeyDown={(event) => {
                  const currentIndex = tabs.findIndex(
                    (item) => item.id === tab.id,
                  );
                  const nextIndex =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : event.key === "ArrowRight"
                          ? (currentIndex + 1) % tabs.length
                          : event.key === "ArrowLeft"
                            ? (currentIndex - 1 + tabs.length) % tabs.length
                            : -1;
                  if (nextIndex < 0) return;
                  event.preventDefault();
                  const nextTab = tabs[nextIndex];
                  setActiveTab(nextTab.id);
                  setQuery("");
                  document
                    .getElementById("product-project-tab-" + nextTab.id)
                    ?.focus();
                }}
                role="tab"
                tabIndex={activeTab === tab.id ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="product-project-workspace__toolbar">
            {activeTab === "tasks" ? (
              <>
                <div>
                  <label>
                    <span className="sr-only">
                      {zh ? "任务状态" : "Task state"}
                    </span>
                    <select
                      aria-label={zh ? "任务状态" : "Task state"}
                      onChange={(event) =>
                        setStateFilter(event.currentTarget.value)
                      }
                      value={stateFilter}
                    >
                      <option value="all">
                        {zh ? "全部任务" : "All tasks"}
                      </option>
                      <option value="active">
                        {zh ? "进行中" : "In progress"}
                      </option>
                      <option value="draft">{zh ? "草稿" : "Drafts"}</option>
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">
                      {zh ? "任务来源" : "Task source"}
                    </span>
                    <select
                      aria-label={zh ? "任务来源" : "Task source"}
                      onChange={(event) =>
                        setSourceFilter(event.currentTarget.value)
                      }
                      value={sourceFilter}
                    >
                      <option value="all">
                        {zh ? "全部来源" : "All sources"}
                      </option>
                      <option value="project">{zh ? "项目" : "Project"}</option>
                      <option value="member">{zh ? "成员" : "Member"}</option>
                    </select>
                  </label>
                  <span>
                    {zh
                      ? "你的任务默认仅自己可见，分享后成员可协作"
                      : "Tasks stay private until you share them"}
                  </span>
                </div>
                <label data-search>
                  <ProductPlaygroundIcon name="search" />
                  <input
                    aria-label={zh ? "搜索任务标题" : "Search task titles"}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder={zh ? "搜索任务标题" : "Search task titles"}
                    type="search"
                    value={query}
                  />
                </label>
              </>
            ) : (
              <>
                <strong>
                  {activeTab === "activity"
                    ? zh
                      ? "最近 7 天"
                      : "Last 7 days"
                    : activeTab === "plan"
                      ? zh
                        ? "发布计划"
                        : "Release plan"
                      : zh
                        ? "共享项目资产"
                        : "Shared project assets"}
                </strong>
                {activeTab === "assets" ? (
                  <label data-search>
                    <ProductPlaygroundIcon name="search" />
                    <input
                      aria-label={zh ? "搜索项目资产" : "Search project assets"}
                      onChange={(event) => setQuery(event.currentTarget.value)}
                      placeholder={zh ? "搜索资产" : "Search assets"}
                      type="search"
                      value={query}
                    />
                  </label>
                ) : null}
              </>
            )}
          </div>

          <div className="product-project-workspace__viewport">
            <section
              aria-labelledby={"product-project-tab-" + activeTab}
              className="product-project-workspace__panel"
              id={"product-project-panel-" + activeTab}
              role="tabpanel"
            >
              {activeTab === "tasks" ? (
                <div className="product-project-workspace__task-list">
                  {tasks.length ? (
                    tasks.map((task) =>
                      task.id === "release-readiness" ? (
                        <Link href={sessionHref} key={task.id}>
                          <span data-task-icon>
                            <ProductPlaygroundIcon name="task-add" />
                          </span>
                          <span data-task-copy>
                            <strong>{task.title}</strong>
                            <small>{task.summary}</small>
                          </span>
                          <span
                            data-collaborators
                            aria-label={zh ? "3 位协作者" : "3 collaborators"}
                          >
                            <i>R</i>
                            <i>B</i>
                            <b>3</b>
                          </span>
                          <span data-progress>{task.progress}</span>
                          <ProductPlaygroundIcon name="more" />
                        </Link>
                      ) : (
                        <article data-draft-task key={task.id}>
                          <span data-task-icon>
                            <ProductPlaygroundIcon name="document" />
                          </span>
                          <span data-task-copy>
                            <strong>{task.title}</strong>
                            <small>{task.summary}</small>
                          </span>
                          <span data-task-state>
                            <i aria-hidden="true" />
                            {zh ? "草稿" : "Draft"}
                          </span>
                          <span data-progress>{task.progress}</span>
                          <ProductPlaygroundIcon name="more" />
                        </article>
                      ),
                    )
                  ) : (
                    <div
                      className="product-project-workspace__empty"
                      role="status"
                    >
                      <ProductPlaygroundIcon name="search" />
                      <strong>
                        {zh ? "没有匹配的任务" : "No matching tasks"}
                      </strong>
                      <span>
                        {zh
                          ? "调整筛选条件或清空搜索关键词。"
                          : "Adjust the filters or clear the search query."}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === "activity" ? (
                <ol className="product-project-workspace__activity">
                  <li>
                    <span>
                      <ProductPlaygroundIcon name="check" />
                    </span>
                    <div>
                      <strong>
                        {zh
                          ? "视觉验收记录已更新"
                          : "Visual acceptance evidence updated"}
                      </strong>
                      <p>
                        {zh
                          ? "桌面端、移动端和暗色模式已纳入发布检查。"
                          : "Desktop, mobile, and dark mode are included in release checks."}
                      </p>
                    </div>
                    <time>{zh ? "今天 10:24" : "Today 10:24"}</time>
                  </li>
                  <li>
                    <span>
                      <ProductPlaygroundIcon name="document" />
                    </span>
                    <div>
                      <strong>
                        {zh ? "设计规范已关联" : "Design specification linked"}
                      </strong>
                      <p>
                        {zh
                          ? "项目任务现在共享统一的视觉与交互约束。"
                          : "Project tasks now share one set of visual and interaction constraints."}
                      </p>
                    </div>
                    <time>{zh ? "昨天" : "Yesterday"}</time>
                  </li>
                  <li>
                    <span>
                      <ProductPlaygroundIcon name="assistant" />
                    </span>
                    <div>
                      <strong>
                        {zh ? "新增 2 位协作者" : "Two collaborators joined"}
                      </strong>
                      <p>
                        {zh
                          ? "产品审查与质量验收角色已加入项目。"
                          : "Product review and quality acceptance roles joined the project."}
                      </p>
                    </div>
                    <time>{zh ? "周一" : "Monday"}</time>
                  </li>
                </ol>
              ) : null}

              {activeTab === "plan" ? (
                <div className="product-project-workspace__plan">
                  <header>
                    <div>
                      <h2>
                        {zh
                          ? "发布前质量收敛"
                          : "Pre-release quality convergence"}
                      </h2>
                      <p>
                        {zh
                          ? "3 个里程碑 · 7 / 13 项完成"
                          : "3 milestones · 7 of 13 items complete"}
                      </p>
                    </div>
                    <span>{zh ? "进行中" : "In progress"}</span>
                  </header>
                  <ol>
                    <li data-complete>
                      <ProductPlaygroundIcon name="check" />
                      <span>
                        <strong>
                          {zh ? "稳定产品路由" : "Stabilize product routes"}
                        </strong>
                        <small>{zh ? "4 项已完成" : "4 items complete"}</small>
                      </span>
                      <time>{zh ? "已完成" : "Complete"}</time>
                    </li>
                    <li>
                      <ProductPlaygroundIcon name="update" />
                      <span>
                        <strong>
                          {zh
                            ? "统一组合模式界面"
                            : "Unify the application composition"}
                        </strong>
                        <small>{zh ? "3 / 6 项" : "3 of 6 items"}</small>
                      </span>
                      <time>{zh ? "今天" : "Today"}</time>
                    </li>
                    <li>
                      <ProductPlaygroundIcon name="calendar" />
                      <span>
                        <strong>
                          {zh ? "完成发布验收" : "Complete release acceptance"}
                        </strong>
                        <small>{zh ? "0 / 3 项" : "0 of 3 items"}</small>
                      </span>
                      <time>{zh ? "周五" : "Friday"}</time>
                    </li>
                  </ol>
                </div>
              ) : null}

              {activeTab === "assets" ? (
                <div className="product-project-workspace__assets">
                  {[
                    ["DESIGN.md", "Markdown", zh ? "今天" : "Today"],
                    [
                      "visual-acceptance",
                      zh ? "文件夹" : "Folder",
                      zh ? "今天" : "Today",
                    ],
                    [
                      "product-project-workflow.acl",
                      "ACL",
                      zh ? "昨天" : "Yesterday",
                    ],
                    [
                      "release-readiness.md",
                      "Markdown",
                      zh ? "周一" : "Monday",
                    ],
                  ]
                    .filter(([name]) =>
                      name
                        .toLocaleLowerCase(locale)
                        .includes(query.trim().toLocaleLowerCase(locale)),
                    )
                    .map(([name, type, updated]) => (
                      <button key={name} type="button">
                        <span>
                          <ProductPlaygroundIcon
                            name={
                              type === (zh ? "文件夹" : "Folder")
                                ? "folder"
                                : "document"
                            }
                          />
                        </span>
                        <span>
                          <strong>{name}</strong>
                          <small>{type}</small>
                        </span>
                        <span>{zh ? "项目共享" : "Project shared"}</span>
                        <time>{updated}</time>
                        <ProductPlaygroundIcon name="more" />
                      </button>
                    ))}
                </div>
              ) : null}
            </section>
          </div>

          <footer className="product-project-workspace__composer">
            <ProductComposer
              compact
              contextual
              initialWorkspace="ui"
              locale={locale}
              onSubmit={setDraftTask}
              placeholder={
                zh
                  ? "今天帮你做些什么？ @ 引用项目资产、待办或调用技能"
                  : "What should we do next? Use @ for project assets, todos, or skills"
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

        {configurationOpen ? (
          <>
            <button
              aria-hidden="true"
              className="product-project-workspace__configuration-backdrop"
              onClick={closeConfiguration}
              tabIndex={-1}
              type="button"
            />
            <aside
              aria-label={zh ? "项目配置" : "Project configuration"}
              aria-modal={configurationOverlay ? true : undefined}
              className="product-project-workspace__configuration"
              id="product-project-configuration"
              ref={configurationRef}
              role={configurationOverlay ? "dialog" : undefined}
            >
              <header>
                <h2>{zh ? "项目配置" : "Project configuration"}</h2>
                <button
                  aria-label={
                    zh ? "关闭项目配置" : "Close project configuration"
                  }
                  onClick={closeConfiguration}
                  ref={configurationCloseRef}
                  type="button"
                >
                  <ProductPlaygroundIcon name="collapse" />
                </button>
              </header>
              <div>
                {configurationSections.map((section) => {
                  const enabled = enabledConfiguration.includes(section.id);
                  return (
                    <section
                      data-enabled={enabled ? "true" : undefined}
                      key={section.id}
                    >
                      <header>
                        <h3>{section.title}</h3>
                        <button
                          aria-pressed={enabled}
                          aria-label={
                            enabled
                              ? zh
                                ? `移除${section.title}`
                                : `Remove ${section.title}`
                              : zh
                                ? `添加${section.title}`
                                : `Add ${section.title}`
                          }
                          onClick={() => toggleConfigurationSection(section.id)}
                          type="button"
                        >
                          <ProductPlaygroundIcon
                            name={enabled ? "close" : "plus"}
                          />
                        </button>
                      </header>
                      <p>{section.description}</p>
                      {enabled ? <div>{section.detail}</div> : null}
                    </section>
                  );
                })}
              </div>
            </aside>
          </>
        ) : null}
      </div>
    </section>
  );
}
