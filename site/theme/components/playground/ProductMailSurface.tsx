import { useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import type { ProductTaskDraft } from "./product-composer-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

const mailboxAddress = "tasks@local.a3s.dev";

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
  const [accepted, setAccepted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(mailboxAddress);
      setFeedback(zh ? "邮箱地址已复制。" : "Mailbox address copied.");
    } catch {
      setFeedback(
        zh
          ? `复制失败，请手动复制 ${mailboxAddress}。`
          : `Copy failed. Copy ${mailboxAddress} manually.`,
      );
    }
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

      <section className="product-mail__service" data-connected={connected}>
        <header>
          <span aria-hidden="true">
            <ProductPlaygroundIcon name={connected ? "check" : "mail"} />
          </span>
          <div>
            <h2>
              {connected
                ? zh
                  ? "智能体邮箱已开通"
                  : "Agent mailbox is active"
                : zh
                  ? "开通 A3S 智能体邮箱"
                  : "Activate an A3S agent mailbox"}
            </h2>
            <p>
              {connected
                ? zh
                  ? "任务可以读取已授权邮件并准备草稿；发送前仍需要你的确认。"
                  : "Tasks can read approved mail and prepare drafts; sending still requires your confirmation."
                : zh
                  ? "系统将为本地用户创建专属邮箱，用于接收任务邮件和准备待确认草稿。"
                  : "A dedicated mailbox will receive task mail and prepare drafts that wait for your approval."}
            </p>
          </div>
        </header>

        {connected ? (
          <div className="product-mail__ready">
            <div>
              <small>{zh ? "邮箱地址" : "Mailbox address"}</small>
              <strong>{mailboxAddress}</strong>
            </div>
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
              {zh ? "创建任务" : "Create task"}
            </button>
            <button onClick={copyAddress} type="button">
              <ProductPlaygroundIcon name="document" />
              {zh ? "复制地址" : "Copy address"}
            </button>
            <button
              data-danger
              onClick={() => {
                setConnected(false);
                setAccepted(false);
                setFeedback(zh ? "邮箱已断开。" : "Mailbox disconnected.");
              }}
              type="button"
            >
              {zh ? "断开" : "Disconnect"}
            </button>
          </div>
        ) : (
          <div className="product-mail__consent">
            <label>
              <input
                checked={accepted}
                onChange={(event) => setAccepted(event.currentTarget.checked)}
                type="checkbox"
              />
              <span>
                {zh
                  ? "我已了解邮箱的数据使用范围和发送确认规则"
                  : "I understand the mailbox data scope and send-confirmation rules"}
              </span>
            </label>
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
              onClick={() => {
                setConnected(true);
                setDetailsOpen(false);
                setFeedback(zh ? "邮箱已开通。" : "Mailbox activated.");
              }}
              type="button"
            >
              {zh ? "确认开通" : "Activate mailbox"}
            </button>
          </div>
        )}

        {!connected && detailsOpen ? (
          <section className="product-mail__details" role="note">
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
      </section>

      <output aria-live="polite">{feedback}</output>
    </section>
  );
}
