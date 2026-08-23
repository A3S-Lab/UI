import { Link } from "@rspress/core/theme";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import {
  ProductPlaygroundIcon,
  type ProductPlaygroundIconName,
} from "./ProductPlaygroundIcon";
import type { ProductProjectPlanDisplayOptions } from "./ProductProjectPlanToolbar";

export type ProductProjectPlanGroupId =
  "backlog" | "active" | "paused" | "complete";

type ProductProjectPlanTask = {
  assignee: string;
  id: string;
  mine: boolean;
  status: ProductProjectPlanGroupId;
  time: string;
  title: string;
};

const groupOrder: ProductProjectPlanGroupId[] = [
  "backlog",
  "active",
  "paused",
  "complete",
];

function createInitialTasks(zh: boolean): ProductProjectPlanTask[] {
  return [
    {
      assignee: "R",
      id: "composer-resource-position",
      mine: true,
      status: "backlog",
      time: zh ? "1 个月前" : "1 month ago",
      title: zh
        ? "复核输入器资源选择与弹层定位"
        : "Review composer resource selection and overlay placement",
    },
    {
      assignee: "M",
      id: "session-hierarchy",
      mine: false,
      status: "backlog",
      time: zh ? "1 个月前" : "1 month ago",
      title: zh
        ? "校准会话详情的信息层级"
        : "Calibrate session-detail information hierarchy",
    },
    {
      assignee: "B",
      id: "mobile-acceptance",
      mine: false,
      status: "backlog",
      time: zh ? "1 个月前" : "1 month ago",
      title: zh
        ? "完成移动端逐页视觉验收"
        : "Complete page-by-page mobile visual acceptance",
    },
    {
      assignee: "R",
      id: "overlay-stacking",
      mine: true,
      status: "backlog",
      time: zh ? "1 个月前" : "1 month ago",
      title: zh
        ? "核对弹层堆叠与键盘关闭路径"
        : "Verify overlay stacking and keyboard dismissal",
    },
    {
      assignee: "R",
      id: "responsive-plan",
      mine: true,
      status: "backlog",
      time: zh ? "1 个月前" : "1 month ago",
      title: zh
        ? "统一计划页面的响应式节奏"
        : "Align responsive rhythm across the plan page",
    },
    {
      assignee: "R",
      id: "stable-routes",
      mine: true,
      status: "complete",
      time: zh ? "1 个月前" : "1 month ago",
      title: zh
        ? "稳定产品路由与首屏导航"
        : "Stabilize product routes and first-load navigation",
    },
    {
      assignee: "B",
      id: "acceptance-suite",
      mine: false,
      status: "complete",
      time: zh ? "1 个月前" : "1 month ago",
      title: zh
        ? "建立关键流程回归验收"
        : "Establish critical-flow regression acceptance",
    },
    {
      assignee: "R",
      id: "design-contract",
      mine: true,
      status: "complete",
      time: zh ? "1 个月前" : "1 month ago",
      title: zh
        ? "建立统一界面规范"
        : "Establish the unified interface specification",
    },
  ];
}

function getGroupCopy(
  group: ProductProjectPlanGroupId,
  zh: boolean,
): {
  add: string;
  icon: ProductPlaygroundIconName;
  title: string;
} {
  if (group === "active") {
    return {
      add: zh ? "添加进行中的任务" : "Add an in-progress task",
      icon: "progress",
      title: zh ? "进行中" : "In progress",
    };
  }
  if (group === "paused") {
    return {
      add: zh ? "添加已暂停的任务" : "Add a paused task",
      icon: "pause",
      title: zh ? "已暂停" : "Paused",
    };
  }
  if (group === "complete") {
    return {
      add: zh ? "添加已完成的任务" : "Add a completed task",
      icon: "check",
      title: zh ? "已完成" : "Complete",
    };
  }
  return {
    add: zh ? "添加待开始的任务" : "Add a task to start",
    icon: "minus",
    title: zh ? "待开始" : "To start",
  };
}

export function ProductProjectPlanSurface({
  createRequest,
  displayOptions,
  locale,
  mineOnly,
  query,
  sessionHref,
}: {
  createRequest: number;
  displayOptions: ProductProjectPlanDisplayOptions;
  locale: ProductPlaygroundLocale;
  mineOnly: boolean;
  query: string;
  sessionHref: string;
}) {
  const zh = locale === "zh";
  const [collapsedGroups, setCollapsedGroups] = useState<
    ProductProjectPlanGroupId[]
  >([]);
  const [creatingGroup, setCreatingGroup] =
    useState<ProductProjectPlanGroupId | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [tasks, setTasks] = useState<ProductProjectPlanTask[]>(() =>
    createInitialTasks(zh),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const nextTaskIdRef = useRef(1);
  const handledCreateRequest = useRef(createRequest);

  useEffect(() => {
    if (createRequest === handledCreateRequest.current) return;
    handledCreateRequest.current = createRequest;
    setCollapsedGroups((current) =>
      current.filter((group) => group !== "backlog"),
    );
    setCreatingGroup("backlog");
  }, [createRequest]);

  useEffect(() => {
    if (!creatingGroup) return;
    inputRef.current?.focus();
  }, [creatingGroup]);

  useEffect(() => {
    setTasks(createInitialTasks(zh));
    setDraftTitle("");
    setCreatingGroup(null);
  }, [zh]);

  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const visibleTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (!mineOnly || task.mine) &&
          (!normalizedQuery ||
            task.title.toLocaleLowerCase(locale).includes(normalizedQuery)),
      ),
    [locale, mineOnly, normalizedQuery, tasks],
  );

  const beginCreate = (group: ProductProjectPlanGroupId) => {
    setCollapsedGroups((current) => current.filter((item) => item !== group));
    setCreatingGroup(group);
    setDraftTitle("");
  };

  const createTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = draftTitle.trim();
    if (!title || !creatingGroup) return;
    setTasks((current) => [
      ...current,
      {
        assignee: "R",
        id: `plan-task-${nextTaskIdRef.current++}`,
        mine: true,
        status: creatingGroup,
        time: zh ? "刚刚" : "Now",
        title,
      },
    ]);
    setDraftTitle("");
    setCreatingGroup(null);
  };

  const toggleComplete = (taskId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === "complete" ? "backlog" : "complete",
              time: zh ? "刚刚" : "Now",
            }
          : task,
      ),
    );
  };

  return (
    <div
      aria-label={zh ? "项目计划任务" : "Project plan tasks"}
      className="product-project-plan"
      data-compact={displayOptions.compact ? "true" : undefined}
      data-show-assignees={displayOptions.showAssignees ? "true" : "false"}
      data-show-dates={displayOptions.showDates ? "true" : "false"}
    >
      {normalizedQuery && visibleTasks.length === 0 ? (
        <div className="product-project-plan__empty" role="status">
          <ProductPlaygroundIcon name="search" />
          <strong>
            {zh ? "没有匹配的计划任务" : "No matching plan tasks"}
          </strong>
          <span>
            {zh
              ? "尝试更换关键词或关闭成员筛选。"
              : "Try another query or disable the member filter."}
          </span>
        </div>
      ) : (
        groupOrder.map((group) => {
          const copy = getGroupCopy(group, zh);
          const groupTasks = visibleTasks.filter(
            (task) => task.status === group,
          );
          if (normalizedQuery && groupTasks.length === 0) return null;
          const collapsed = collapsedGroups.includes(group);
          return (
            <section
              className="product-project-plan__group"
              data-group={group}
              key={group}
            >
              <header>
                <button
                  aria-expanded={!collapsed}
                  aria-label={
                    collapsed
                      ? zh
                        ? `展开${copy.title}`
                        : `Expand ${copy.title}`
                      : zh
                        ? `折叠${copy.title}`
                        : `Collapse ${copy.title}`
                  }
                  data-plan-collapse
                  onClick={() =>
                    setCollapsedGroups((current) =>
                      current.includes(group)
                        ? current.filter((item) => item !== group)
                        : [...current, group],
                    )
                  }
                  type="button"
                >
                  <ProductPlaygroundIcon name="chevron" />
                </button>
                <span data-plan-status data-status={group}>
                  <ProductPlaygroundIcon name={copy.icon} />
                </span>
                <strong>{copy.title}</strong>
                <span data-plan-count>{groupTasks.length}</span>
                <button
                  aria-label={copy.add}
                  data-plan-add-task
                  onClick={() => beginCreate(group)}
                  type="button"
                >
                  <ProductPlaygroundIcon name="plus" />
                </button>
              </header>
              {!collapsed ? (
                <div className="product-project-plan__group-content">
                  {groupTasks.map((task) => (
                    <article data-plan-task key={task.id}>
                      <button
                        aria-label={
                          task.status === "complete"
                            ? zh
                              ? `将“${task.title}”恢复为待开始`
                              : `Restore ${task.title} to backlog`
                            : zh
                              ? `将“${task.title}”标记为完成`
                              : `Mark ${task.title} complete`
                        }
                        data-plan-check
                        onClick={() => toggleComplete(task.id)}
                        type="button"
                      >
                        {task.status === "complete" ? (
                          <ProductPlaygroundIcon name="check" />
                        ) : null}
                      </button>
                      <Link href={sessionHref}>{task.title}</Link>
                      {displayOptions.showAssignees ? (
                        <span
                          aria-label={
                            zh
                              ? `负责人 ${task.assignee}`
                              : `Assignee ${task.assignee}`
                          }
                          data-plan-assignee
                        >
                          {task.assignee}
                        </span>
                      ) : null}
                      {displayOptions.showDates ? (
                        <time>{task.time}</time>
                      ) : null}
                    </article>
                  ))}
                  {creatingGroup === group ? (
                    <form data-plan-create onSubmit={createTask}>
                      <span aria-hidden="true" />
                      <input
                        aria-label={zh ? "新任务标题" : "New task title"}
                        onChange={(event) =>
                          setDraftTitle(event.currentTarget.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key !== "Escape") return;
                          setCreatingGroup(null);
                          setDraftTitle("");
                        }}
                        placeholder={zh ? "输入任务标题" : "Enter a task title"}
                        ref={inputRef}
                        value={draftTitle}
                      />
                      <button disabled={!draftTitle.trim()} type="submit">
                        {zh ? "添加" : "Add"}
                      </button>
                      <button
                        aria-label={zh ? "取消添加任务" : "Cancel adding task"}
                        onClick={() => {
                          setCreatingGroup(null);
                          setDraftTitle("");
                        }}
                        type="button"
                      >
                        <ProductPlaygroundIcon name="close" />
                      </button>
                    </form>
                  ) : null}
                  {groupTasks.length === 0 && creatingGroup !== group ? (
                    <button
                      data-plan-empty-add
                      onClick={() => beginCreate(group)}
                      type="button"
                    >
                      <span aria-hidden="true" data-plan-empty-marker />
                      <span>{zh ? "输入待办标题" : "Enter a task title"}</span>
                      {displayOptions.showAssignees ? (
                        <span aria-hidden="true" data-plan-empty-assignee />
                      ) : null}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}
