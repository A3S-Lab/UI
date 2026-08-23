import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "@rspress/core/theme";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductComposer } from "./ProductComposer";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import { ProductProjectAssetsWorkspace } from "./ProductProjectAssetsSurface";
import { ProductProjectBreadcrumb } from "./ProductProjectPrimitives";
import { ProductProjectPlanSurface } from "./ProductProjectPlanSurface";
import {
  ProductProjectPlanToolbar,
  type ProductProjectPlanDisplayOptions,
} from "./ProductProjectPlanToolbar";

type ProjectWorkspaceTab = "activity" | "assets" | "plan" | "tasks";

type ProjectActivityFilter = "mine" | "team";

type ProjectActivityItem = {
  action: string;
  actor: string;
  avatar: string;
  detail: string;
  id: string;
  label?: string;
  scope: "both" | ProjectActivityFilter;
  target?: "assets" | "session";
  time: string;
};

type ProjectTask = {
  id: string;
  progress: string;
  source: "member" | "project";
  state: "active" | "draft";
  summary: string;
  title: string;
};

type ProjectConfigurationSection = {
  description: string;
  detail?: {
    meta?: string;
    title: string;
  };
  id: string;
  requestLabel: string;
  title: string;
};

export function ProductProjectWorkspaceSurface({
  locale,
  onOpenModelSettings,
  projectHref,
  projectsHref,
  sessionHref,
}: {
  locale: ProductPlaygroundLocale;
  onOpenModelSettings: () => void;
  projectHref: string;
  projectsHref: string;
  sessionHref: string;
}) {
  const zh = locale === "zh";
  const [activeTab, setActiveTab] = useState<ProjectWorkspaceTab>("activity");
  const [activityComposerOpen, setActivityComposerOpen] = useState(false);
  const [activityFilter, setActivityFilter] =
    useState<ProjectActivityFilter>("mine");
  const [activityMessage, setActivityMessage] = useState("");
  const [activityMessages, setActivityMessages] = useState<string[]>([]);
  const [configurationOpen, setConfigurationOpen] = useState(true);
  const [configurationOverlay, setConfigurationOverlay] = useState(false);
  const [configurationStatus, setConfigurationStatus] = useState("");
  const [draftTask, setDraftTask] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [planCreateRequest, setPlanCreateRequest] = useState(0);
  const [planDisplayOptions, setPlanDisplayOptions] =
    useState<ProductProjectPlanDisplayOptions>({
      compact: false,
      showAssignees: true,
      showDates: true,
    });
  const [planMineOnly, setPlanMineOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const configurationCloseRef = useRef<HTMLButtonElement>(null);
  const configurationRef = useRef<HTMLElement>(null);
  const restoreConfigurationFocusRef = useRef(false);
  const configurationTriggerRef = useRef<HTMLButtonElement>(null);

  const closeConfiguration = useCallback(() => {
    restoreConfigurationFocusRef.current = true;
    setConfigurationOpen(false);
  }, []);

  const selectWorkspaceTab = useCallback((tab: ProjectWorkspaceTab) => {
    setActiveTab(tab);
    setQuery("");
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 86rem)");
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
    if (configurationOverlay) configurationCloseRef.current?.focus();
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
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeConfiguration, configurationOpen, configurationOverlay]);

  useEffect(() => {
    if (configurationOpen || !restoreConfigurationFocusRef.current) return;
    restoreConfigurationFocusRef.current = false;
    configurationTriggerRef.current?.focus();
  }, [configurationOpen]);

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

  const activityItems: ProjectActivityItem[] = [
    {
      action: zh
        ? "创建了任务并分配给你"
        : "created a task and assigned it to you",
      actor: "A3S",
      avatar: "A",
      detail: zh
        ? "发布前核对路由、交互状态和视觉验收证据。"
        : "Review routes, interaction states, and visual evidence before release.",
      id: "release-task",
      label: zh ? "发布就绪检查" : "Release readiness",
      scope: "both",
      target: "session",
      time: zh ? "今天 10:24" : "Today 10:24",
    },
    {
      action: zh ? "完成了自动化检查" : "completed an automated check",
      actor: zh ? "质量验收" : "Quality review",
      avatar: zh ? "验" : "Q",
      detail: zh
        ? "桌面端、移动端和暗色模式均无阻断问题。"
        : "Desktop, mobile, and dark mode have no blocking issues.",
      id: "visual-acceptance",
      label: zh ? "查看验收资产" : "Review acceptance assets",
      scope: "mine",
      target: "assets",
      time: zh ? "今天 09:52" : "Today 09:52",
    },
    {
      action: zh ? "更新了项目计划" : "updated the project plan",
      actor: zh ? "产品审查" : "Product review",
      avatar: zh ? "审" : "P",
      detail: zh
        ? "交互收敛阶段已完成 3 / 6 项，等待输入与文件流程复核。"
        : "Interaction convergence is 3 of 6 complete, pending composer and file-flow review.",
      id: "plan-update",
      label: zh ? "查看发布计划" : "Open release plan",
      scope: "both",
      time: zh ? "昨天 18:10" : "Yesterday 18:10",
    },
    {
      action: zh ? "上传了项目资料" : "uploaded a project asset",
      actor: "Mina",
      avatar: "M",
      detail: zh
        ? "质量评分表已加入项目资产，可在任务中通过 @ 引用。"
        : "The quality scorecard is now available to cite with @ in project tasks.",
      id: "scorecard-upload",
      label: "quality-scorecard.xlsx",
      scope: "team",
      target: "assets",
      time: zh ? "昨天 16:31" : "Yesterday 16:31",
    },
    {
      action: zh ? "关联了设计规范" : "linked the interface specification",
      actor: "Rui",
      avatar: "R",
      detail: zh
        ? "项目任务现在共享一致的布局、状态与交互约束。"
        : "Project tasks now share consistent layout, state, and interaction constraints.",
      id: "design-linked",
      label: "DESIGN.md",
      scope: "both",
      target: "assets",
      time: zh ? "周一" : "Monday",
    },
    {
      action: zh ? "邀请成员加入项目" : "invited members to the project",
      actor: zh ? "本地用户" : "Local user",
      avatar: zh ? "我" : "L",
      detail: zh
        ? "产品审查、界面实现和质量验收角色已共享项目上下文。"
        : "Product review, interface implementation, and quality acceptance now share project context.",
      id: "members-joined",
      scope: "both",
      time: zh ? "周一" : "Monday",
    },
  ];

  const visibleActivityItems = activityItems.filter(
    (item) => item.scope === "both" || item.scope === activityFilter,
  );

  const configurationSections: ProjectConfigurationSection[] = [
    {
      description: zh
        ? "欢迎来到项目空间。"
        : "Welcome to the project workspace.",
      detail: {
        title: zh
          ? "【你可以在这里探索】明确目标、约束与交付标准"
          : "Explore goals, constraints, and delivery standards here",
      },
      id: "instructions",
      requestLabel: zh ? "配置指令" : "Configure instructions",
      title: zh ? "指令" : "Instructions",
    },
    {
      description: zh
        ? "连接外部服务，扩展项目能力"
        : "Connect external services and extend project capabilities",
      id: "connectors",
      requestLabel: zh ? "添加连接器" : "Add connector",
      title: zh ? "连接器" : "Connectors",
    },
    {
      description: zh
        ? "配置项目专家，为成员提供专业服务"
        : "Configure project experts for specialized support",
      id: "assistants",
      requestLabel: zh ? "添加专家" : "Add expert",
      title: zh ? "专家" : "Experts",
    },
    {
      description: zh
        ? "配置项目技能，让任务精准执行"
        : "Configure project skills for precise task execution",
      id: "skills",
      requestLabel: zh ? "添加技能" : "Add skill",
      title: zh ? "技能" : "Skills",
    },
    {
      description: "",
      detail: {
        meta: zh ? "每天 09:00" : "Every day at 09:00",
        title: zh ? "生成每日验收摘要" : "Generate a daily acceptance summary",
      },
      id: "automation",
      requestLabel: zh ? "添加自动化" : "Add automation",
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

  const requestConfiguration = (id: string, title: string) => {
    window.dispatchEvent(
      new CustomEvent("a3s:playground-project-configuration-request", {
        detail: { id },
      }),
    );
    setConfigurationStatus(
      zh ? `已请求配置${title}` : `${title} configuration requested`,
    );
  };

  const publishActivityMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = activityMessage.trim();
    if (!message) return;
    setActivityMessages((current) => [message, ...current]);
    setActivityMessage("");
    setActivityComposerOpen(false);
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
                onClick={() => selectWorkspaceTab(tab.id)}
                onKeyDown={(event) => {
                  const currentIndex = tabs.findIndex(
                    (item) => item.id === tab.id,
                  );
                  const rtl =
                    window.getComputedStyle(event.currentTarget).direction ===
                    "rtl";
                  const nextIndex =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : event.key === "ArrowRight"
                          ? (currentIndex + (rtl ? -1 : 1) + tabs.length) %
                            tabs.length
                          : event.key === "ArrowLeft"
                            ? (currentIndex + (rtl ? 1 : -1) + tabs.length) %
                              tabs.length
                            : -1;
                  if (nextIndex < 0) return;
                  event.preventDefault();
                  const nextTab = tabs[nextIndex];
                  selectWorkspaceTab(nextTab.id);
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

          {activeTab === "assets" ? (
            <ProductProjectAssetsWorkspace
              locale={locale}
              onCreateTask={(assets) => {
                const names = assets.map((asset) => asset.name).join("、");
                setDraftTask(zh ? `检查 ${names}` : `Review ${names}`);
                selectWorkspaceTab("tasks");
              }}
            />
          ) : null}

          {activeTab !== "assets" ? (
            <div
              className="product-project-workspace__toolbar"
              data-project-toolbar={activeTab}
            >
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
                        <option value="project">
                          {zh ? "项目" : "Project"}
                        </option>
                        <option value="member">{zh ? "成员" : "Member"}</option>
                      </select>
                    </label>
                    <span
                      aria-label={
                        zh
                          ? "未分享的任务仅你可见，分享后项目成员可以协作"
                          : "Unshared tasks are visible only to you; project members can collaborate after sharing"
                      }
                      data-task-privacy
                      role="note"
                    >
                      <ProductPlaygroundIcon name="shield" />
                      <span data-task-privacy-wide>
                        {zh
                          ? "你的任务是私密的，除非你共享它们"
                          : "Your tasks stay private until you share them"}
                      </span>
                      <span data-task-privacy-compact>
                        {zh ? "未分享，仅你可见" : "Private until shared"}
                      </span>
                    </span>
                  </div>
                  <label data-focus-owner="container" data-search>
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
              ) : activeTab === "activity" ? (
                <>
                  <button
                    aria-expanded={activityComposerOpen}
                    data-activity-compose
                    onClick={() => setActivityComposerOpen((value) => !value)}
                    type="button"
                  >
                    <ProductPlaygroundIcon name="plus" />
                    {zh ? "发布留言" : "Post update"}
                  </button>
                  <div
                    aria-label={zh ? "动态筛选" : "Activity filter"}
                    data-activity-filters
                    role="group"
                  >
                    <button
                      aria-pressed={activityFilter === "mine"}
                      onClick={() => setActivityFilter("mine")}
                      type="button"
                    >
                      {zh ? "与我相关" : "Relevant to me"}
                    </button>
                    <button
                      aria-pressed={activityFilter === "team"}
                      onClick={() => setActivityFilter("team")}
                      type="button"
                    >
                      {zh ? "成员动态" : "Team activity"}
                    </button>
                  </div>
                </>
              ) : activeTab === "plan" ? (
                <ProductProjectPlanToolbar
                  displayOptions={planDisplayOptions}
                  locale={locale}
                  mineOnly={planMineOnly}
                  onAddTask={() => setPlanCreateRequest((value) => value + 1)}
                  onCreateView={() =>
                    window.dispatchEvent(
                      new CustomEvent(
                        "a3s:playground-plan-view-create-request",
                      ),
                    )
                  }
                  onDisplayOptionsChange={setPlanDisplayOptions}
                  onMineOnlyChange={setPlanMineOnly}
                  onQueryChange={setQuery}
                  query={query}
                />
              ) : null}
            </div>
          ) : null}

          {activeTab !== "assets" ? (
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
                          <Link
                            data-state={task.state}
                            data-task-row
                            href={sessionHref}
                            key={task.id}
                          >
                            <span data-task-icon>
                              <ProductPlaygroundIcon name="task-add" />
                            </span>
                            <span data-task-copy>
                              <span data-task-heading>
                                <strong>{task.title}</strong>
                                <i
                                  aria-label={
                                    zh ? "任务进行中" : "Task in progress"
                                  }
                                  data-task-status
                                />
                              </span>
                              <small className="sr-only">{task.summary}</small>
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
                            <ProductPlaygroundIcon
                              data-task-destination
                              name="arrow"
                            />
                          </Link>
                        ) : (
                          <article
                            data-draft-task
                            data-state={task.state}
                            data-task-row
                            key={task.id}
                          >
                            <span data-task-icon>
                              <ProductPlaygroundIcon name="document" />
                            </span>
                            <span data-task-copy>
                              <span data-task-heading>
                                <strong>{task.title}</strong>
                              </span>
                              <small className="sr-only">{task.summary}</small>
                            </span>
                            <span data-task-state>
                              <i aria-hidden="true" />
                              {zh ? "草稿" : "Draft"}
                            </span>
                            <span data-progress>{task.progress}</span>
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
                  <div className="product-project-workspace__activity-region">
                    {activityComposerOpen ? (
                      <form
                        className="product-project-workspace__activity-composer"
                        onSubmit={publishActivityMessage}
                      >
                        <label>
                          <span className="sr-only">
                            {zh ? "项目留言" : "Project update"}
                          </span>
                          <textarea
                            aria-label={zh ? "项目留言" : "Project update"}
                            autoFocus
                            onChange={(event) =>
                              setActivityMessage(event.currentTarget.value)
                            }
                            placeholder={
                              zh
                                ? "同步进展、提出问题或 @ 项目成员"
                                : "Share progress, raise a question, or @ a project member"
                            }
                            rows={3}
                            value={activityMessage}
                          />
                        </label>
                        <footer>
                          <small>
                            {zh
                              ? "留言会显示在项目动态中"
                              : "The update will appear in project activity"}
                          </small>
                          <div>
                            <button
                              onClick={() => {
                                setActivityComposerOpen(false);
                                setActivityMessage("");
                              }}
                              type="button"
                            >
                              {zh ? "取消" : "Cancel"}
                            </button>
                            <button
                              data-primary
                              disabled={!activityMessage.trim()}
                              type="submit"
                            >
                              {zh ? "发布" : "Post"}
                            </button>
                          </div>
                        </footer>
                      </form>
                    ) : null}
                    <ol className="product-project-workspace__activity">
                      {activityMessages.map((message, index) => (
                        <li data-posted key={`${message}-${index}`}>
                          <span aria-hidden="true" data-activity-avatar>
                            {zh ? "我" : "Y"}
                          </span>
                          <div>
                            <header>
                              <strong>{zh ? "你" : "You"}</strong>
                              <span>
                                {zh ? "发布了留言" : "posted an update"}
                              </span>
                            </header>
                            <p>{message}</p>
                          </div>
                          <time>{zh ? "刚刚" : "Now"}</time>
                        </li>
                      ))}
                      {visibleActivityItems.map((item) => (
                        <li data-activity-row key={item.id}>
                          <span aria-hidden="true" data-activity-avatar>
                            {item.avatar}
                          </span>
                          <div>
                            <header>
                              <strong>{item.actor}</strong>
                              <span>{item.action}</span>
                            </header>
                            <p className="sr-only">{item.detail}</p>
                            {item.label ? (
                              item.target === "session" ? (
                                <Link data-activity-target href={sessionHref}>
                                  <ProductPlaygroundIcon name="task-add" />
                                  {item.label}
                                </Link>
                              ) : (
                                <button
                                  data-activity-target
                                  onClick={() =>
                                    selectWorkspaceTab(
                                      item.target === "assets"
                                        ? "assets"
                                        : "plan",
                                    )
                                  }
                                  type="button"
                                >
                                  <ProductPlaygroundIcon
                                    name={
                                      item.target === "assets"
                                        ? "document"
                                        : "checklist"
                                    }
                                  />
                                  {item.label}
                                </button>
                              )
                            ) : null}
                          </div>
                          <time>{item.time}</time>
                        </li>
                      ))}
                    </ol>
                    <p className="product-project-workspace__activity-end">
                      {zh ? "没有更多动态" : "No more activity"}
                    </p>
                  </div>
                ) : null}

                {activeTab === "plan" ? (
                  <ProductProjectPlanSurface
                    createRequest={planCreateRequest}
                    displayOptions={planDisplayOptions}
                    locale={locale}
                    mineOnly={planMineOnly}
                    query={query}
                    sessionHref={sessionHref}
                  />
                ) : null}
              </section>
            </div>
          ) : null}

          <footer className="product-project-workspace__composer">
            <ProductComposer
              contextual
              initialWorkspace=""
              locale={locale}
              onConfigureModels={onOpenModelSettings}
              onSubmit={setDraftTask}
              placeholder={
                zh
                  ? "今天帮你做些什么？@ 引用资产文件、项目待办或调用技能"
                  : "What should we do next? Use @ for assets, project todos, or skills"
              }
              showExecutionTarget
              showPermissions
              submitSuccessMessage={
                zh
                  ? "已在项目中创建任务草稿。"
                  : "A task draft was created in the project."
              }
            />
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
                <output aria-live="polite" data-configuration-status>
                  {configurationStatus}
                </output>
                {configurationSections.map((section) => {
                  return (
                    <section key={section.id}>
                      <header>
                        <h3>{section.title}</h3>
                        <button
                          aria-label={section.requestLabel}
                          data-configuration-action={section.id}
                          onClick={() =>
                            requestConfiguration(section.id, section.title)
                          }
                          type="button"
                        >
                          <ProductPlaygroundIcon name="plus" />
                        </button>
                      </header>
                      <p>{section.description}</p>
                      {section.detail ? (
                        <div data-configuration-detail>
                          <strong>{section.detail.title}</strong>
                          {section.detail.meta ? (
                            <small>{section.detail.meta}</small>
                          ) : null}
                        </div>
                      ) : null}
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
