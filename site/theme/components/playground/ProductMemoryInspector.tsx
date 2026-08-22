import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  productMemoryKindCopy,
  type ProductMemoryRecord,
} from "./product-memory-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductMemoryInspector({
  compact,
  locale,
  onClose,
  onRequestRemoval,
  onUndoRemoval,
  onUseInTask,
  open,
  record,
  removalPending,
}: {
  compact: boolean;
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  onRequestRemoval: () => void;
  onUndoRemoval: () => void;
  onUseInTask: () => void;
  open: boolean;
  record: ProductMemoryRecord;
  removalPending: boolean;
}) {
  const zh = locale === "zh";
  const detailId = useId().replaceAll(":", "");
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const removalCancelRef = useRef<HTMLButtonElement>(null);
  const removalTriggerRef = useRef<HTMLButtonElement>(null);
  const sourceDetailRef = useRef<HTMLElement>(null);
  const sourceTriggerRef = useRef<HTMLButtonElement>(null);
  const undoButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setConfirmingRemoval(false);
    setSourceOpen(false);
  }, [record.id]);

  useEffect(() => {
    if (!compact || !open) return;
    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [compact, open, record.id]);

  useEffect(() => {
    if (!confirmingRemoval) return;
    const frame = window.requestAnimationFrame(() => {
      removalCancelRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [confirmingRemoval]);

  useEffect(() => {
    if (!sourceOpen) return;
    const frame = window.requestAnimationFrame(() => {
      sourceDetailRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sourceOpen]);

  const restoreFocus = (target: { current: HTMLElement | null }) => {
    window.requestAnimationFrame(() => target.current?.focus());
  };

  const closeSource = () => {
    setSourceOpen(false);
    restoreFocus(sourceTriggerRef);
  };

  const cancelRemoval = () => {
    setConfirmingRemoval(false);
    restoreFocus(removalTriggerRef);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (confirmingRemoval) {
        cancelRemoval();
        return;
      }
      if (sourceOpen) {
        closeSource();
        return;
      }
      if (compact) onClose();
      return;
    }
    if (!compact || event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <aside
      aria-describedby={`${detailId}-description`}
      aria-labelledby={`${detailId}-title`}
      aria-modal={compact ? true : undefined}
      className="product-memory__inspector"
      data-open={open ? "true" : "false"}
      data-removal={removalPending ? "pending" : undefined}
      onKeyDown={handleKeyDown}
      role={compact ? "dialog" : undefined}
    >
      <header>
        <span data-kind={record.kind}>
          <ProductPlaygroundIcon name="brain" />
        </span>
        <div>
          <small>{productMemoryKindCopy[record.kind][locale]}</small>
          <strong id={`${detailId}-title`}>{record.title[locale]}</strong>
        </div>
        <button
          aria-label={zh ? "关闭记忆详情" : "Close memory details"}
          data-memory-inspector-close
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>

      {removalPending ? (
        <section data-memory-removal-status role="status">
          <ProductPlaygroundIcon name="warning" />
          <div>
            <strong>{zh ? "已请求遗忘" : "Removal requested"}</strong>
            <small>
              {zh
                ? "此记忆已立即停止用于新任务；在宿主完成清理前可撤销。"
                : "This memory is immediately excluded from new tasks and can be restored until host cleanup completes."}
            </small>
          </div>
        </section>
      ) : null}

      <p id={`${detailId}-description`}>{record.body[locale]}</p>
      <dl>
        <div>
          <dt>{zh ? "范围" : "Scope"}</dt>
          <dd>
            {record.scope === "workspace"
              ? zh
                ? "当前工作空间"
                : "Workspace"
              : zh
                ? "个人"
                : "Personal"}
          </dd>
        </div>
        <div>
          <dt>{zh ? "来源" : "Source"}</dt>
          <dd>{record.source[locale]}</dd>
        </div>
        <div>
          <dt>{zh ? "更新" : "Updated"}</dt>
          <dd>{record.time[locale]}</dd>
        </div>
      </dl>

      <section data-memory-trace-summary>
        <ProductPlaygroundIcon name="shield" />
        <div>
          <strong>{zh ? "可追溯来源" : "Traceable source"}</strong>
          <small>
            {zh
              ? "原始任务、文件或确认记录仍然可用。"
              : "The originating task, file, or confirmation record remains available."}
          </small>
        </div>
      </section>

      {sourceOpen ? (
        <section
          aria-label={zh ? "记忆来源证据" : "Memory source evidence"}
          data-memory-source-detail
          id={`${detailId}-source`}
          ref={sourceDetailRef}
          tabIndex={-1}
        >
          <header>
            <strong>{zh ? "来源证据" : "Source evidence"}</strong>
            <button
              aria-label={zh ? "关闭来源证据" : "Close source evidence"}
              onClick={closeSource}
              type="button"
            >
              <ProductPlaygroundIcon name="close" />
            </button>
          </header>
          <p>{record.evidence[locale]}</p>
          <dl>
            <div>
              <dt>{zh ? "定位" : "Locator"}</dt>
              <dd>{record.sourceLocator}</dd>
            </div>
            <div>
              <dt>{zh ? "记忆标识" : "Memory ID"}</dt>
              <dd>{record.id}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {confirmingRemoval ? (
        <section data-memory-removal-confirmation>
          <ProductPlaygroundIcon name="warning" />
          <div>
            <strong>
              {zh ? "请求遗忘这条记忆？" : "Request removal of this memory?"}
            </strong>
            <small>
              {zh
                ? "它会立即停止用于新任务。来源文件与审计记录由宿主按保留策略处理。"
                : "It will immediately stop contributing to new tasks. Source files and audit records follow the host retention policy."}
            </small>
          </div>
          <footer>
            <button
              onClick={cancelRemoval}
              ref={removalCancelRef}
              type="button"
            >
              {zh ? "取消" : "Cancel"}
            </button>
            <button
              data-danger
              onClick={() => {
                setConfirmingRemoval(false);
                onRequestRemoval();
                restoreFocus(undoButtonRef);
              }}
              type="button"
            >
              {zh ? "确认请求" : "Confirm request"}
            </button>
          </footer>
        </section>
      ) : null}

      {!confirmingRemoval ? (
        <footer>
          <button
            data-primary
            disabled={removalPending}
            onClick={onUseInTask}
            type="button"
          >
            <ProductPlaygroundIcon name="task-add" />
            {zh ? "用于新任务" : "Use in new task"}
          </button>
          <button
            aria-controls={`${detailId}-source`}
            aria-expanded={sourceOpen}
            onClick={() => setSourceOpen((value) => !value)}
            ref={sourceTriggerRef}
            type="button"
          >
            <ProductPlaygroundIcon name="link" />
            {sourceOpen
              ? zh
                ? "收起来源"
                : "Hide source"
              : zh
                ? "查看来源"
                : "View source"}
          </button>
          {removalPending ? (
            <button
              onClick={() => {
                onUndoRemoval();
                restoreFocus(removalTriggerRef);
              }}
              ref={undoButtonRef}
              type="button"
            >
              <ProductPlaygroundIcon name="refresh" />
              {zh ? "撤销遗忘" : "Undo removal"}
            </button>
          ) : (
            <button
              data-danger
              onClick={() => {
                setSourceOpen(false);
                setConfirmingRemoval(true);
              }}
              ref={removalTriggerRef}
              type="button"
            >
              <ProductPlaygroundIcon name="trash" />
              {zh ? "请求遗忘" : "Request removal"}
            </button>
          )}
        </footer>
      ) : null}
    </aside>
  );
}
