import { useState } from "react";
import { withBase } from "@rspress/core/runtime";
import type {
  ProductPlaygroundLocale,
  ProductResourceView,
} from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

const connectionCopy = {
  documents: {
    action: { en: "Connect documents", zh: "连接协作文档" },
    body: {
      en: "Use approved documents as task context while the host retains authorization and audit history.",
      zh: "将已授权文档作为任务上下文，授权与审计记录仍由宿主管理。",
    },
    permissions: [
      {
        description: {
          en: "Browse only the folders and documents you approve.",
          zh: "仅浏览你明确授权的文件夹与文档。",
        },
        icon: "files",
        title: { en: "Read documents", zh: "读取文档与内容" },
      },
      {
        description: {
          en: "Create or update a document only after explicit confirmation.",
          zh: "仅在明确确认后创建或更新文档。",
        },
        icon: "document",
        title: { en: "Manage approved files", zh: "管理已授权文件" },
      },
    ],
    title: { en: "Connect a document library", zh: "连接协作文档资料库" },
  },
  knowledge: {
    action: { en: "Connect knowledge", zh: "连接知识库" },
    body: {
      en: "Search approved knowledge sources and attach traceable excerpts to a task.",
      zh: "搜索已授权知识源，并将可追溯片段引用到任务中。",
    },
    permissions: [
      {
        description: {
          en: "Inspect authorized spaces, folders, and source structure.",
          zh: "查看已授权空间、目录与资料结构。",
        },
        icon: "knowledge",
        title: { en: "Browse knowledge", zh: "浏览知识资料" },
      },
      {
        description: {
          en: "Search and cite source content without changing it.",
          zh: "搜索并引用原始内容，不修改知识源。",
        },
        icon: "search",
        title: { en: "Search and cite", zh: "搜索并引用内容" },
      },
    ],
    title: { en: "Connect a knowledge source", zh: "连接知识资料源" },
  },
  mail: {
    action: { en: "Connect mailbox", zh: "连接邮箱" },
    body: {
      en: "Search approved messages and use selected threads as task context without sending automatically.",
      zh: "搜索已授权邮件并将选中会话用于任务上下文，不会自动发送消息。",
    },
    permissions: [
      {
        description: {
          en: "Search message metadata and content in approved folders.",
          zh: "在已授权文件夹中搜索邮件信息与内容。",
        },
        icon: "mail",
        title: { en: "Read approved mail", zh: "读取已授权邮件" },
      },
      {
        description: {
          en: "Prepare a draft, then require your confirmation before sending.",
          zh: "可准备草稿，发送前始终需要你的确认。",
        },
        icon: "checklist",
        title: { en: "Draft with confirmation", zh: "确认后使用草稿" },
      },
    ],
    title: { en: "Connect a mailbox", zh: "连接邮箱资料源" },
  },
} as const;

export function ProductConnectionSurface({
  locale,
  onUseInTask,
  resource,
}: {
  locale: ProductPlaygroundLocale;
  onUseInTask?: () => void;
  resource: Exclude<ProductResourceView, "files" | "inspiration">;
}) {
  const zh = locale === "zh";
  const [connected, setConnected] = useState(false);
  const copy = connectionCopy[resource];

  return (
    <section className="product-connection" data-connected={connected}>
      <div className="product-connection__marks" aria-hidden="true">
        <img alt="" height="46" src={withBase("/logo.png")} width="46" />
        <ProductPlaygroundIcon name="arrow" />
        <span>
          <ProductPlaygroundIcon
            name={
              resource === "mail"
                ? "mail"
                : resource === "documents"
                  ? "document"
                  : "knowledge"
            }
          />
        </span>
      </div>
      <h2>
        {connected
          ? zh
            ? "连接已就绪"
            : "Connection ready"
          : copy.title[locale]}
      </h2>
      <p>
        {connected
          ? zh
            ? "当前连接状态仅在此页面生效，可随时断开。"
            : "This connection state applies only to this page and can be disconnected at any time."
          : copy.body[locale]}
      </p>
      <section aria-label={zh ? "授权范围" : "Permission scope"}>
        <small>
          {connected
            ? zh
              ? "当前授权范围"
              : "Current permission scope"
            : zh
              ? "连接后将获得以下权限"
              : "The connection will request"}
        </small>
        {copy.permissions.map((permission) => (
          <article key={permission.title.en}>
            <ProductPlaygroundIcon name={permission.icon} />
            <span>
              <strong>{permission.title[locale]}</strong>
              <span>{permission.description[locale]}</span>
            </span>
          </article>
        ))}
      </section>
      <button
        data-primary={!connected ? true : undefined}
        onClick={() => setConnected((value) => !value)}
        type="button"
      >
        {connected ? (zh ? "断开连接" : "Disconnect") : copy.action[locale]}
      </button>
      {connected && onUseInTask ? (
        <button data-secondary onClick={onUseInTask} type="button">
          <ProductPlaygroundIcon name="task-add" />
          {zh ? "引用到新任务" : "Use in a new task"}
        </button>
      ) : null}
      <footer>
        <ProductPlaygroundIcon name="shield" />
        {zh
          ? "凭据、授权与远程数据由宿主管理，此组件不保存访问令牌。"
          : "Credentials, authorization, and remote data remain host-owned; this component stores no access token."}
      </footer>
    </section>
  );
}
