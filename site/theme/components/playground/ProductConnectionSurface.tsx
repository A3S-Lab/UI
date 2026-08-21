import { useEffect, useRef, useState } from "react";
import { withBase } from "@rspress/core/runtime";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

const documentConnectionStorageKey = "a3s-playground-document-connection";
const documentConnectionStorageEvent =
  "a3s:playground-document-connection-change";

type ConnectionFeedback = {
  message: string;
  tone: "success" | "warning";
};

type StoredConnection = {
  connected: boolean;
  storageAvailable: boolean;
};

const permissions = [
  {
    description: {
      en: "Browse only the folders and documents you explicitly approve.",
      zh: "仅浏览你明确授权的文件夹与文档。",
    },
    icon: "files",
    title: { en: "Read documents", zh: "读取文档与内容" },
  },
  {
    description: {
      en: "Create or update a document only after you confirm the action.",
      zh: "仅在你明确确认后创建或更新文档。",
    },
    icon: "document",
    title: { en: "Confirmed document changes", zh: "确认后管理文档" },
  },
] as const;

function readDocumentConnection(): StoredConnection {
  if (typeof window === "undefined") {
    return { connected: false, storageAvailable: true };
  }

  try {
    const stored = window.localStorage.getItem(documentConnectionStorageKey);
    if (!stored) return { connected: false, storageAvailable: true };

    try {
      const parsed = JSON.parse(stored) as { connected?: unknown };
      return {
        connected: parsed.connected === true,
        storageAvailable: true,
      };
    } catch {
      return { connected: false, storageAvailable: true };
    }
  } catch {
    return { connected: false, storageAvailable: false };
  }
}

function persistDocumentConnection(connected: boolean) {
  if (typeof window === "undefined") return false;

  try {
    if (connected) {
      window.localStorage.setItem(
        documentConnectionStorageKey,
        JSON.stringify({ connected: true, version: 1 }),
      );
    } else {
      window.localStorage.removeItem(documentConnectionStorageKey);
    }
    window.dispatchEvent(
      new CustomEvent(documentConnectionStorageEvent, {
        detail: { connected },
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function ProductConnectionSurface({
  locale,
  onUseInTask,
}: {
  locale: ProductPlaygroundLocale;
  onUseInTask: () => void;
}) {
  const zh = locale === "zh";
  const connectionTimerRef = useRef<number | null>(null);
  const disconnectDialogRef = useRef<HTMLDialogElement>(null);
  const disconnectTriggerRef = useRef<HTMLButtonElement>(null);
  const [accepted, setAccepted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [feedback, setFeedback] = useState<ConnectionFeedback | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    const synchronize = (event?: Event) => {
      if (
        event instanceof StorageEvent &&
        event.key !== null &&
        event.key !== documentConnectionStorageKey
      ) {
        return;
      }

      if (event instanceof CustomEvent && event.detail) {
        setConnected(event.detail.connected === true);
        setConnecting(false);
        setStorageAvailable(true);
        setHydrated(true);
        return;
      }

      const stored = readDocumentConnection();
      setConnected(stored.connected);
      setConnecting(false);
      setStorageAvailable(stored.storageAvailable);
      setHydrated(true);
      if (!stored.storageAvailable) {
        setFeedback({
          message: zh
            ? "浏览器未允许读取连接状态；本页仍可使用，但离开后不会保留。"
            : "Browser storage is unavailable. This page still works, but the connection will not persist.",
          tone: "warning",
        });
      }
    };

    synchronize();
    window.addEventListener("storage", synchronize);
    window.addEventListener(documentConnectionStorageEvent, synchronize);
    return () => {
      window.removeEventListener("storage", synchronize);
      window.removeEventListener(documentConnectionStorageEvent, synchronize);
      if (connectionTimerRef.current !== null) {
        window.clearTimeout(connectionTimerRef.current);
      }
    };
  }, [zh]);

  const updateConnection = (nextConnected: boolean) => {
    const persisted = persistDocumentConnection(nextConnected);
    setConnected(nextConnected);
    setConnecting(false);
    setStorageAvailable(persisted);
    setAccepted(false);
    setFeedback(
      persisted
        ? nextConnected
          ? {
              message: zh
                ? "协作文档已连接，授权范围已保存在此浏览器。"
                : "Documents connected. The permission scope was saved in this browser.",
              tone: "success",
            }
          : null
        : {
            message: nextConnected
              ? zh
                ? "协作文档已在当前页面连接，但浏览器未允许保存。离开前请重试。"
                : "Documents are connected on this page, but browser storage is unavailable. Retry before leaving."
              : zh
                ? "连接已在当前页面断开，但浏览器未允许更新保存状态。离开前请重试。"
                : "The connection is closed on this page, but browser storage could not be updated. Retry before leaving.",
            tone: "warning",
          },
    );
  };

  const beginConnection = () => {
    if (!accepted || connecting) return;
    setFeedback(null);
    setConnecting(true);
    connectionTimerRef.current = window.setTimeout(() => {
      connectionTimerRef.current = null;
      updateConnection(true);
    }, 500);
  };

  const retryPersistence = () => {
    const persisted = persistDocumentConnection(connected);
    setStorageAvailable(persisted);
    setFeedback(
      persisted
        ? {
            message: connected
              ? zh
                ? "连接状态已保存。"
                : "Connection state saved."
              : zh
                ? "断开状态已保存。"
                : "Disconnected state saved.",
            tone: "success",
          }
        : {
            message: zh
              ? "仍无法保存，请检查浏览器存储权限后重试。"
              : "Still unable to save. Check browser storage permissions and retry.",
            tone: "warning",
          },
    );
  };

  const openDisconnectDialog = () => {
    disconnectDialogRef.current?.showModal();
  };

  const closeDisconnectDialog = () => {
    disconnectDialogRef.current?.close();
  };

  const state = !hydrated
    ? "loading"
    : connecting
      ? "connecting"
      : connected
        ? "active"
        : "inactive";

  return (
    <section
      aria-busy={state === "loading" || state === "connecting"}
      className="product-connection"
      data-connected={connected}
      data-state={state}
    >
      <div className="product-connection__marks" aria-hidden="true">
        <img alt="" height="46" src={withBase("/logo.png")} width="46" />
        <ProductPlaygroundIcon
          name={
            state === "loading" || state === "connecting" ? "refresh" : "arrow"
          }
        />
        <span>
          <ProductPlaygroundIcon name={connected ? "check" : "document"} />
        </span>
      </div>

      <h2>
        {state === "loading"
          ? zh
            ? "正在检查协作文档连接"
            : "Checking document connection"
          : state === "connecting"
            ? zh
              ? "正在确认授权范围"
              : "Confirming permission scope"
            : connected
              ? zh
                ? "协作文档已连接"
                : "Documents connected"
              : zh
                ? "连接协作文档资料库"
                : "Connect a document library"}
      </h2>
      <p>
        {state === "loading"
          ? zh
            ? "正在读取此浏览器保存的授权状态。"
            : "Reading the permission state saved in this browser."
          : state === "connecting"
            ? zh
              ? "正在建立安全连接并保存你确认的访问范围。"
              : "Establishing a secure connection and saving the scope you approved."
            : connected
              ? zh
                ? "任务可以读取已授权资料；创建或修改文档前仍需要你的确认。"
                : "Tasks can read approved sources; creating or changing a document still requires your confirmation."
              : zh
                ? "将已授权文档作为任务上下文，授权与审计记录仍由宿主管理。"
                : "Use approved documents as task context while the host retains authorization and audit history."}
      </p>

      <section
        aria-label={zh ? "授权范围" : "Permission scope"}
        className="product-connection__scope"
      >
        <small>
          {connected
            ? zh
              ? "当前授权范围"
              : "Current permission scope"
            : zh
              ? "连接后将获得以下权限"
              : "The connection will request"}
        </small>
        {permissions.map((permission) => (
          <article key={permission.title.en}>
            <ProductPlaygroundIcon name={permission.icon} />
            <span>
              <strong>{permission.title[locale]}</strong>
              <span>{permission.description[locale]}</span>
            </span>
          </article>
        ))}
      </section>

      {!connected && hydrated ? (
        <label className="product-connection__consent">
          <input
            checked={accepted}
            disabled={connecting}
            onChange={(event) => setAccepted(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>
            {zh
              ? "我已了解文档的数据使用范围和写入确认规则"
              : "I understand the document data scope and write-confirmation rules"}
          </span>
        </label>
      ) : null}

      <div
        className="product-connection__actions"
        data-single={!connected ? true : undefined}
      >
        <button
          aria-disabled={connecting || undefined}
          aria-busy={connecting || undefined}
          data-primary
          disabled={state === "loading" || (!connected && !accepted)}
          onClick={connected ? onUseInTask : beginConnection}
          type="button"
        >
          {connecting ? <span aria-hidden="true" /> : null}
          {state === "loading"
            ? zh
              ? "正在检查连接"
              : "Checking connection"
            : state === "connecting"
              ? zh
                ? "正在连接"
                : "Connecting"
              : connected
                ? zh
                  ? "用于新任务"
                  : "Use in new task"
                : zh
                  ? "连接协作文档"
                  : "Connect documents"}
          {connected ? <ProductPlaygroundIcon name="task-add" /> : null}
        </button>
        {connected ? (
          <button
            data-danger
            onClick={openDisconnectDialog}
            ref={disconnectTriggerRef}
            type="button"
          >
            {zh ? "断开" : "Disconnect"}
          </button>
        ) : null}
      </div>

      {feedback ? (
        <div
          className="product-connection__feedback"
          data-tone={feedback.tone}
          role="status"
        >
          <ProductPlaygroundIcon
            name={feedback.tone === "success" ? "check" : "warning"}
          />
          <span>{feedback.message}</span>
          {!storageAvailable ? (
            <button onClick={retryPersistence} type="button">
              <ProductPlaygroundIcon name="refresh" />
              {zh ? "重试保存" : "Retry saving"}
            </button>
          ) : null}
        </div>
      ) : null}

      <footer className="product-connection__privacy">
        <ProductPlaygroundIcon name="shield" />
        {zh
          ? "凭据、授权与远程数据由宿主管理，此组件不保存访问令牌。"
          : "Credentials, authorization, and remote data remain host-owned; this component stores no access token."}
      </footer>

      <dialog
        aria-describedby="product-document-disconnect-description"
        aria-labelledby="product-document-disconnect-title"
        className="product-connection__dialog"
        onClose={() => disconnectTriggerRef.current?.focus()}
        ref={disconnectDialogRef}
      >
        <span aria-hidden="true" className="product-connection__dialog-icon">
          <ProductPlaygroundIcon name="warning" />
        </span>
        <div>
          <h2 id="product-document-disconnect-title">
            {zh ? "断开协作文档？" : "Disconnect documents?"}
          </h2>
          <p id="product-document-disconnect-description">
            {zh
              ? "断开后，新任务将无法读取此资料库；已经添加到任务中的引用不会被删除。"
              : "New tasks will lose access to this library. References already attached to tasks will not be deleted."}
          </p>
        </div>
        <footer>
          <button onClick={closeDisconnectDialog} type="button">
            {zh ? "取消" : "Cancel"}
          </button>
          <button
            data-danger
            onClick={() => {
              closeDisconnectDialog();
              updateConnection(false);
            }}
            type="button"
          >
            {zh ? "确认断开" : "Disconnect"}
          </button>
        </footer>
      </dialog>
    </section>
  );
}
