import { useEffect, useRef, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import type { ProductTaskQueuedFollowUp } from "./product-task-session-state";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductFollowUpQueue({
  items,
  locale,
  onMove,
  onPause,
  onRemove,
  onResume,
  onRunNext,
  onUpdate,
  paused,
  running,
}: {
  items: readonly ProductTaskQueuedFollowUp[];
  locale: ProductPlaygroundLocale;
  onMove: (id: string, offset: -1 | 1) => void;
  onPause: () => void;
  onRemove: (id: string) => void;
  onResume: () => void;
  onRunNext: () => void;
  onUpdate: (id: string, content: string) => void;
  paused: boolean;
  running: boolean;
}) {
  const zh = locale === "zh";
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    if (!editingId) return;
    window.requestAnimationFrame(() => {
      editRef.current?.focus();
      editRef.current?.select();
    });
  }, [editingId]);

  if (items.length === 0) return null;

  const closeEditing = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const saveEditing = () => {
    const value = editingValue.trim();
    if (!editingId || !value) return;
    onUpdate(editingId, value);
    closeEditing();
  };

  return (
    <section
      aria-label={zh ? "后续指令队列" : "Follow-up instruction queue"}
      className="product-follow-up-queue"
      data-paused={paused ? "true" : undefined}
      data-running={running ? "true" : undefined}
    >
      <header>
        <span>
          <ProductPlaygroundIcon name="list" />
          <span>
            <strong>{zh ? "后续指令" : "Follow-up instructions"}</strong>
            <small>
              {running
                ? paused
                  ? zh
                    ? "当前任务继续执行，队列已暂停"
                    : "The current run continues; the queue is paused"
                  : zh
                    ? "当前执行完成后按顺序继续"
                    : "Runs in order after the current turn"
                : paused
                  ? zh
                    ? "队列已暂停，需要主动恢复"
                    : "Paused until you resume it"
                  : zh
                    ? "等待执行"
                    : "Waiting to run"}
            </small>
          </span>
        </span>
        <div>
          {running ? (
            <button onClick={paused ? onResume : onPause} type="button">
              <ProductPlaygroundIcon name={paused ? "refresh" : "pause"} />
              {paused
                ? zh
                  ? "恢复后续"
                  : "Resume"
                : zh
                  ? "暂停后续"
                  : "Pause"}
            </button>
          ) : (
            <button onClick={onRunNext} type="button">
              <ProductPlaygroundIcon name="up" />
              {paused
                ? zh
                  ? "恢复并执行"
                  : "Resume and run"
                : zh
                  ? "执行下一条"
                  : "Run next"}
            </button>
          )}
        </div>
      </header>
      <ol>
        {items.map((item, index) => {
          const fileCount = item.context.resources.filter((resource) =>
            ["file", "folder", "selection"].includes(resource.kind),
          ).length;
          const skillCount = item.context.resources.filter(
            (resource) => resource.kind === "skill",
          ).length;
          const capabilityCount = item.context.resources.filter((resource) =>
            ["assistant", "connector"].includes(resource.kind),
          ).length;
          const metadata = [
            fileCount
              ? zh
                ? `${fileCount} 个文件上下文`
                : `${fileCount} file context${fileCount === 1 ? "" : "s"}`
              : "",
            skillCount
              ? zh
                ? `${skillCount} 个 Skill`
                : `${skillCount} Skill${skillCount === 1 ? "" : "s"}`
              : "",
            capabilityCount
              ? zh
                ? `${capabilityCount} 项能力`
                : `${capabilityCount} capabilit${capabilityCount === 1 ? "y" : "ies"}`
              : "",
            item.context.deepResearch
              ? zh
                ? "深度研究"
                : "Deep research"
              : "",
          ].filter(Boolean);
          const editing = editingId === item.id;

          return (
            <li data-editing={editing ? "true" : undefined} key={item.id}>
              <span aria-hidden="true">{index + 1}</span>
              {editing ? (
                <div data-queue-editor>
                  <textarea
                    aria-label={
                      zh
                        ? `编辑第 ${index + 1} 条后续指令`
                        : `Edit follow-up instruction ${index + 1}`
                    }
                    onChange={(event) =>
                      setEditingValue(event.currentTarget.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        closeEditing();
                      } else if (
                        event.key === "Enter" &&
                        (event.metaKey || event.ctrlKey)
                      ) {
                        event.preventDefault();
                        saveEditing();
                      }
                    }}
                    ref={editRef}
                    rows={2}
                    value={editingValue}
                  />
                  <div>
                    <small>
                      {zh ? "⌘/Ctrl + Enter 保存" : "⌘/Ctrl + Enter to save"}
                    </small>
                    <button onClick={closeEditing} type="button">
                      {zh ? "取消" : "Cancel"}
                    </button>
                    <button
                      data-primary
                      disabled={!editingValue.trim()}
                      onClick={saveEditing}
                      type="button"
                    >
                      {zh ? "保存" : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div data-queue-copy>
                    <strong>{item.content}</strong>
                    {metadata.length > 0 ? (
                      <small>{metadata.join(" · ")}</small>
                    ) : null}
                  </div>
                  <div data-queue-actions>
                    <button
                      aria-label={
                        zh
                          ? `提前第 ${index + 1} 条指令`
                          : `Move instruction ${index + 1} earlier`
                      }
                      disabled={index === 0}
                      onClick={() => onMove(item.id, -1)}
                      type="button"
                    >
                      <ProductPlaygroundIcon name="up" />
                    </button>
                    <button
                      aria-label={
                        zh
                          ? `后移第 ${index + 1} 条指令`
                          : `Move instruction ${index + 1} later`
                      }
                      data-direction="down"
                      disabled={index === items.length - 1}
                      onClick={() => onMove(item.id, 1)}
                      type="button"
                    >
                      <ProductPlaygroundIcon name="up" />
                    </button>
                    <button
                      aria-label={
                        zh
                          ? `编辑第 ${index + 1} 条指令`
                          : `Edit instruction ${index + 1}`
                      }
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingValue(item.content);
                      }}
                      type="button"
                    >
                      <ProductPlaygroundIcon name="edit" />
                    </button>
                    <button
                      aria-label={
                        zh
                          ? `移除第 ${index + 1} 条指令`
                          : `Remove instruction ${index + 1}`
                      }
                      onClick={() => onRemove(item.id)}
                      type="button"
                    >
                      <ProductPlaygroundIcon name="close" />
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
