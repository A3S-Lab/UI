import type { PlaygroundLocale, PlaygroundState } from "./playground-data";
import { PlaygroundIcon } from "./PlaygroundIcon";

const stateCopy: Record<
  Exclude<PlaygroundState, "ready">,
  {
    description: Record<PlaygroundLocale, string>;
    title: Record<PlaygroundLocale, string>;
  }
> = {
  loading: {
    title: { en: "Loading this workspace", zh: "正在加载工作区" },
    description: {
      en: "Current content stays in place while the latest state is restored.",
      zh: "恢复最新状态时会保留当前内容与上下文。",
    },
  },
  empty: {
    title: { en: "Nothing here yet", zh: "这里还没有内容" },
    description: {
      en: "Start the first item without leaving the current workspace.",
      zh: "无需离开当前工作区即可创建第一项内容。",
    },
  },
  error: {
    title: { en: "Workspace could not be restored", zh: "无法恢复工作区" },
    description: {
      en: "Your local input is safe. Retry the failed request or inspect details.",
      zh: "本地输入已保留。请重试失败请求或查看详情。",
    },
  },
  offline: {
    title: { en: "Working offline", zh: "当前处于离线状态" },
    description: {
      en: "Local browsing remains available. Remote actions will resume after reconnecting.",
      zh: "仍可浏览本地内容，重新连接后会恢复远程操作。",
    },
  },
  "permission-denied": {
    title: { en: "Permission required", zh: "需要额外权限" },
    description: {
      en: "Request the minimum required access or choose an available workspace.",
      zh: "请申请完成任务所需的最小权限，或选择可访问的工作区。",
    },
  },
};

export function SceneState({
  locale,
  state,
}: {
  locale: PlaygroundLocale;
  state: PlaygroundState;
}) {
  if (state === "ready") return null;

  if (state === "loading") {
    return (
      <section
        className="playground-scene-state"
        data-state={state}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="skeleton h-4 w-36" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-24 w-full" />
        <p>{stateCopy[state].description[locale]}</p>
      </section>
    );
  }

  const copy = stateCopy[state];
  const isBlocking = state === "error" || state === "permission-denied";
  return (
    <section
      className={isBlocking ? "alert" : "empty"}
      data-playground-state-panel
      data-state={state}
      data-variant={state === "error" ? "destructive" : "default"}
      role={state === "error" ? "alert" : "status"}
    >
      <PlaygroundIcon
        name={state === "error" ? "refresh" : "inspect"}
        width="20"
        height="20"
      />
      <div>
        <strong>{copy.title[locale]}</strong>
        <p>{copy.description[locale]}</p>
      </div>
      <button type="button" className="btn" data-size="sm">
        {state === "permission-denied"
          ? locale === "zh"
            ? "申请权限"
            : "Request access"
          : state === "empty"
            ? locale === "zh"
              ? "新建"
              : "Create"
            : locale === "zh"
              ? "重试"
              : "Retry"}
      </button>
    </section>
  );
}
