import { useEffect, useRef, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import type { ProductTaskDraft } from "./product-composer-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

const mailboxAddress = "tasks@local.a3s.dev";
const mailboxStorageKey = "a3s-playground-agent-mailbox";
const mailboxStorageEvent = "a3s:playground-mailbox-change";

type MailboxFeedback = {
  message: string;
  tone: "error" | "success" | "warning";
};

function readMailboxConnection() {
  if (typeof window === "undefined") {
    return { connected: false, storageAvailable: true };
  }

  try {
    const stored = window.localStorage.getItem(mailboxStorageKey);
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

function persistMailboxConnection(connected: boolean) {
  if (typeof window === "undefined") return false;

  try {
    if (connected) {
      window.localStorage.setItem(
        mailboxStorageKey,
        JSON.stringify({ connected: true, version: 1 }),
      );
    } else {
      window.localStorage.removeItem(mailboxStorageKey);
    }
    window.dispatchEvent(
      new CustomEvent(mailboxStorageEvent, { detail: { connected } }),
    );
    return true;
  } catch {
    return false;
  }
}

export function ProductMailSurface({
  locale,
  onStartTask,
  startHref,
}: {
  locale: ProductPlaygroundLocale;
  onStartTask: (draft: Omit<ProductTaskDraft, "revision">) => void;
  startHref: string;
}) {
  const zh = locale === "zh";
  const disconnectDialogRef = useRef<HTMLDialogElement>(null);
  const disconnectTriggerRef = useRef<HTMLButtonElement>(null);
  const [accepted, setAccepted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [feedback, setFeedback] = useState<MailboxFeedback | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    const synchronize = (event?: Event) => {
      if (
        event instanceof StorageEvent &&
        event.key !== null &&
        event.key !== mailboxStorageKey
      ) {
        return;
      }

      if (event instanceof CustomEvent && event.detail) {
        setConnected(event.detail.connected === true);
        setStorageAvailable(true);
        setHydrated(true);
        return;
      }

      const stored = readMailboxConnection();
      setConnected(stored.connected);
      setStorageAvailable(stored.storageAvailable);
      setHydrated(true);
      if (!stored.storageAvailable) {
        setFeedback({
          message: zh
            ? "浏览器未允许读取邮箱状态；本页仍可使用，但离开后不会保留。"
            : "Browser storage is unavailable. This page still works, but its mailbox state will not persist.",
          tone: "warning",
        });
      }
    };

    synchronize();
    window.addEventListener("storage", synchronize);
    window.addEventListener(mailboxStorageEvent, synchronize);
    return () => {
      window.removeEventListener("storage", synchronize);
      window.removeEventListener(mailboxStorageEvent, synchronize);
    };
  }, [zh]);

  const updateConnection = (nextConnected: boolean) => {
    const persisted = persistMailboxConnection(nextConnected);
    setConnected(nextConnected);
    setStorageAvailable(persisted);
    setAccepted(false);
    setDetailsOpen(false);
    setFeedback(
      persisted
        ? null
        : {
            message: nextConnected
              ? zh
                ? "邮箱已为当前页面开通，但浏览器未允许保存。离开前请重试。"
                : "Mailbox activated for this page, but browser storage is unavailable. Retry before leaving."
              : zh
                ? "邮箱已在当前页面断开，但浏览器未允许更新保存状态。离开前请重试。"
                : "Mailbox disconnected on this page, but browser storage could not be updated. Retry before leaving.",
            tone: "warning",
          },
    );
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(mailboxAddress);
      setFeedback({
        message: zh ? "邮箱地址已复制。" : "Mailbox address copied.",
        tone: "success",
      });
    } catch {
      setFeedback({
        message: zh
          ? `复制失败，请手动复制 ${mailboxAddress}。`
          : `Copy failed. Copy ${mailboxAddress} manually.`,
        tone: "error",
      });
    }
  };

  const retryPersistence = () => {
    const persisted = persistMailboxConnection(connected);
    setStorageAvailable(persisted);
    setFeedback({
      message: persisted
        ? zh
          ? "邮箱状态已保存。"
          : "Mailbox state saved."
        : zh
          ? "仍无法保存邮箱状态，请检查浏览器存储权限。"
          : "Mailbox state still cannot be saved. Check browser storage permissions.",
      tone: persisted ? "success" : "error",
    });
  };

  const openDisconnectDialog = () => {
    disconnectDialogRef.current?.showModal();
  };

  const closeDisconnectDialog = () => {
    disconnectDialogRef.current?.close();
  };

  return (
    <section
      className="product-mail"
      data-product-surface="mail"
      data-resource="mail"
    >
      <a
        aria-label={zh ? "返回新建任务" : "Back to new task"}
        className="product-mail__back"
        href={startHref}
      >
        <ProductPlaygroundIcon name="arrow" />
      </a>
      <header>
        <h1>{zh ? "智能体邮箱" : "Agent mailbox"}</h1>
        <p>
          {zh
            ? "使用专属任务邮箱接收待处理邮件，并在发送前确认每一封草稿。"
            : "Receive work in a dedicated task mailbox and confirm every draft before it is sent."}
        </p>
      </header>

      <section
        aria-busy={!hydrated}
        className="product-mail__service"
        data-connected={connected}
        data-state={!hydrated ? "loading" : connected ? "active" : "inactive"}
      >
        <header>
          <span aria-hidden="true">
            <ProductPlaygroundIcon
              name={!hydrated ? "refresh" : connected ? "check" : "mail"}
            />
          </span>
          <div>
            <h2>
              {!hydrated
                ? zh
                  ? "正在检查邮箱状态"
                  : "Checking mailbox status"
                : connected
                  ? zh
                    ? "智能体邮箱已开通"
                    : "Agent mailbox is active"
                  : zh
                    ? "开通 A3S 智能体邮箱"
                    : "Activate an A3S agent mailbox"}
            </h2>
            <p>
              {!hydrated
                ? zh
                  ? "正在读取此浏览器保存的连接。"
                  : "Reading the connection saved in this browser."
                : connected
                  ? zh
                    ? "任务可以读取已授权邮件并准备草稿；发送前仍需要你的确认。"
                    : "Tasks can read approved mail and prepare drafts; sending still requires your confirmation."
                  : zh
                    ? "系统将为本地用户创建专属邮箱，用于接收任务邮件和准备待确认草稿。"
                    : "A dedicated mailbox will receive task mail and prepare drafts that wait for your approval."}
            </p>
          </div>
        </header>

        {!hydrated ? (
          <div className="product-mail__loading" role="status">
            <span aria-hidden="true" />
            {zh ? "正在恢复邮箱连接…" : "Restoring mailbox connection…"}
          </div>
        ) : connected ? (
          <div className="product-mail__ready">
            <div className="product-mail__address">
              <small>{zh ? "邮箱地址" : "Mailbox address"}</small>
              <code>{mailboxAddress}</code>
            </div>
            <div className="product-mail__actions">
              <button onClick={copyAddress} type="button">
                <ProductPlaygroundIcon name="copy" />
                {zh ? "复制地址" : "Copy address"}
              </button>
              <button
                data-danger
                onClick={openDisconnectDialog}
                ref={disconnectTriggerRef}
                type="button"
              >
                {zh ? "断开" : "Disconnect"}
              </button>
              <button
                data-primary
                onClick={() =>
                  onStartTask({
                    prompt: zh
                      ? "检查智能体邮箱中的待处理邮件，按紧急程度归类，并为需要回复的邮件准备待确认草稿。"
                      : "Review pending messages in the agent mailbox, prioritize them, and prepare confirmation-required drafts for replies.",
                    resources: [
                      {
                        id: "connector:agent-mailbox",
                        kind: "connector",
                        label: zh ? "智能体邮箱" : "Agent mailbox",
                        meta: mailboxAddress,
                      },
                    ],
                    workspace: "ui",
                  })
                }
                type="button"
              >
                <ProductPlaygroundIcon name="task-add" />
                {zh ? "用于新任务" : "Use in new task"}
              </button>
            </div>
          </div>
        ) : (
          <div className="product-mail__consent">
            <label htmlFor="product-mail-consent">
              <input
                checked={accepted}
                id="product-mail-consent"
                onChange={(event) => setAccepted(event.currentTarget.checked)}
                type="checkbox"
              />
              <span>
                {zh
                  ? "我已了解邮箱的数据使用范围和发送确认规则"
                  : "I understand the mailbox data scope and send-confirmation rules"}
              </span>
            </label>
            <div className="product-mail__actions">
              <button
                aria-expanded={detailsOpen}
                data-details
                onClick={() => setDetailsOpen((value) => !value)}
                type="button"
              >
                {detailsOpen
                  ? zh
                    ? "收起说明"
                    : "Hide details"
                  : zh
                    ? "查看说明"
                    : "View details"}
              </button>
              <button
                data-primary
                disabled={!accepted}
                onClick={() => updateConnection(true)}
                type="button"
              >
                {zh ? "确认开通" : "Activate mailbox"}
              </button>
            </div>
          </div>
        )}

        {!connected && hydrated && detailsOpen ? (
          <section
            aria-label={zh ? "邮箱服务说明" : "Mailbox service details"}
            className="product-mail__details"
            role="note"
          >
            <div>
              <ProductPlaygroundIcon name="mail" />
              <span>
                <strong>{zh ? "读取范围" : "Read scope"}</strong>
                <small>
                  {zh
                    ? "仅处理发送到此专属地址的邮件，不读取个人邮箱。"
                    : "Only mail sent to this dedicated address is processed; personal inboxes are not read."}
                </small>
              </span>
            </div>
            <div>
              <ProductPlaygroundIcon name="shield" />
              <span>
                <strong>{zh ? "发送保护" : "Send protection"}</strong>
                <small>
                  {zh
                    ? "每一封外发邮件都需要明确确认，不会自动发送。"
                    : "Every outgoing message requires explicit confirmation and is never sent automatically."}
                </small>
              </span>
            </div>
          </section>
        ) : null}

        {feedback ? (
          <div
            className="product-mail__feedback"
            data-tone={feedback.tone}
            role={feedback.tone === "error" ? "alert" : "status"}
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
      </section>

      <dialog
        aria-describedby="product-mail-disconnect-description"
        aria-labelledby="product-mail-disconnect-title"
        className="product-mail__dialog"
        onClose={() => disconnectTriggerRef.current?.focus()}
        ref={disconnectDialogRef}
      >
        <span aria-hidden="true" className="product-mail__dialog-icon">
          <ProductPlaygroundIcon name="warning" />
        </span>
        <div>
          <h2 id="product-mail-disconnect-title">
            {zh ? "断开智能体邮箱？" : "Disconnect agent mailbox?"}
          </h2>
          <p id="product-mail-disconnect-description">
            {zh
              ? "断开后，新任务将无法读取此邮箱；已经添加到任务中的邮件内容不会被删除。"
              : "New tasks will lose mailbox access. Mail content already attached to tasks will not be deleted."}
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
