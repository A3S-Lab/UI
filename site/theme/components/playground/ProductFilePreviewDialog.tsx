import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ProductFileEntry } from "./product-file-manager-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { formatFileDate } from "./useProductFileManager";
import { ProductFileTypeIcon } from "./ProductFileTypeIcon";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type PreviewPosition = {
  x: number;
  y: number;
};

type PreviewDragSession = {
  height: number;
  originX: number;
  originY: number;
  pointerId: number;
  startX: number;
  startY: number;
  width: number;
};

const previewViewportPadding = 12;

function clampPosition(
  value: PreviewPosition,
  width: number,
  height: number,
): PreviewPosition {
  return {
    x: Math.min(
      Math.max(previewViewportPadding, value.x),
      Math.max(
        previewViewportPadding,
        window.innerWidth - width - previewViewportPadding,
      ),
    ),
    y: Math.min(
      Math.max(previewViewportPadding, value.y),
      Math.max(
        previewViewportPadding,
        window.innerHeight - height - previewViewportPadding,
      ),
    ),
  };
}

export function ProductFilePreviewDialog({
  entry,
  locale,
  onClose,
  onDownload,
  onOpen,
  onRename,
  onRetry,
  onUseInTask,
}: {
  entry: ProductFileEntry;
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  onDownload: () => void;
  onOpen?: () => void;
  onRename: () => void;
  onRetry?: () => void;
  onUseInTask: () => void;
}) {
  const zh = locale === "zh";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragSessionRef = useRef<PreviewDragSession | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [position, setPosition] = useState<PreviewPosition>();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const resetPosition = () => setPosition(undefined);
    window.addEventListener("resize", resetPosition);
    return () => window.removeEventListener("resize", resetPosition);
  }, []);

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      event.button !== 0 ||
      fullscreen ||
      window.matchMedia("(max-width: 44rem)").matches ||
      (event.target as HTMLElement).closest("button")
    ) {
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    const bounds = dialog.getBoundingClientRect();
    dragSessionRef.current = {
      height: bounds.height,
      originX: event.clientX,
      originY: event.clientY,
      pointerId: event.pointerId,
      startX: bounds.left,
      startY: bounds.top,
      width: bounds.width,
    };
    setPosition({ x: bounds.left, y: bounds.top });
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    setPosition(
      clampPosition(
        {
          x: session.startX + event.clientX - session.originX,
          y: session.startY + event.clientY - session.originY,
        },
        session.width,
        session.height,
      ),
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    dragSessionRef.current = undefined;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const toggleFullscreen = () => {
    setDragging(false);
    dragSessionRef.current = undefined;
    setFullscreen((value) => !value);
  };

  const handleTitlebarDoubleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    toggleFullscreen();
  };

  return (
    <dialog
      aria-labelledby="product-file-preview-title"
      data-dragging={dragging ? "true" : undefined}
      data-file-preview-entry={entry.id}
      data-file-preview-dialog
      data-file-manager-quicklook
      data-fullscreen={fullscreen ? "true" : "false"}
      data-modal="true"
      data-positioned={position ? "true" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
      style={
        position
          ? ({
              left: `${position.x}px`,
              top: `${position.y}px`,
            } as CSSProperties)
          : undefined
      }
    >
      <header
        data-preview-titlebar
        onDoubleClick={handleTitlebarDoubleClick}
        onPointerCancel={endDrag}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
      >
        <span data-preview-window-title>
          <ProductPlaygroundIcon name="eye" />
          <span>
            <strong id="product-file-preview-title">
              {zh ? "文件预览" : "File preview"}
            </strong>
            <small>{entry.name}</small>
          </span>
        </span>
        <div data-preview-window-actions>
          {position && !fullscreen ? (
            <button
              aria-label={zh ? "将预览窗口居中" : "Center preview window"}
              onClick={() => setPosition(undefined)}
              type="button"
            >
              <ProductPlaygroundIcon name="center" />
            </button>
          ) : null}
          <button
            aria-label={
              fullscreen
                ? zh
                  ? "退出全屏预览"
                  : "Exit fullscreen preview"
                : zh
                  ? "全屏预览"
                  : "Enter fullscreen preview"
            }
            aria-pressed={fullscreen}
            onClick={toggleFullscreen}
            type="button"
          >
            <ProductPlaygroundIcon name={fullscreen ? "contract" : "expand"} />
          </button>
          <button
            aria-label={zh ? "关闭文件预览" : "Close file preview"}
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <ProductPlaygroundIcon name="close" />
          </button>
        </div>
      </header>

      <div data-file-preview-layout>
        <div data-quicklook-preview>
          <ProductFileTypeIcon entry={entry} size="preview" />
          <h2>{entry.name}</h2>
          <pre>
            {entry.preview?.[locale] ??
              (zh
                ? "此项目没有可用预览。"
                : "No preview is available for this item.")}
          </pre>
        </div>
        <dl>
          <div>
            <dt>{zh ? "类型" : "Kind"}</dt>
            <dd>{entry.type}</dd>
          </div>
          <div>
            <dt>{zh ? "大小" : "Size"}</dt>
            <dd>{entry.size}</dd>
          </div>
          <div>
            <dt>{zh ? "修改" : "Modified"}</dt>
            <dd>{formatFileDate(entry.modified, locale)}</dd>
          </div>
        </dl>
      </div>

      <footer>
        <button
          data-primary={!onOpen ? true : undefined}
          onClick={onUseInTask}
          type="button"
        >
          <ProductPlaygroundIcon name="task-add" />
          {zh ? "用于新任务" : "Use in new task"}
        </button>
        {onOpen ? (
          <button data-primary onClick={onOpen} type="button">
            <ProductPlaygroundIcon name="arrow" />
            {zh ? "打开" : "Open"}
          </button>
        ) : null}
        {onRetry ? (
          <button onClick={onRetry} type="button">
            <ProductPlaygroundIcon name="refresh" />
            {zh ? "重试导入" : "Retry import"}
          </button>
        ) : null}
        <button onClick={onRename} type="button">
          <ProductPlaygroundIcon name="edit" />
          {zh ? "重命名" : "Rename"}
        </button>
        <button onClick={onDownload} type="button">
          <ProductPlaygroundIcon name="download" />
          {zh ? "下载" : "Download"}
        </button>
      </footer>
    </dialog>
  );
}
