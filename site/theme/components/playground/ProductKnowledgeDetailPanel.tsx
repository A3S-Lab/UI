import { useEffect, useState } from "react";
import type { ProductKnowledgeBase } from "./product-knowledge-library-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type KnowledgeDetailTab = "overview" | "settings" | "sources";

export function ProductKnowledgeDetailPanel({
  base,
  locale,
  onClose,
  onDelete,
  onPinChange,
  onPolicyChange,
  onRename,
  onRequestCompilation,
}: {
  base: ProductKnowledgeBase;
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  onDelete: () => void;
  onPinChange: (pinned: boolean) => void;
  onPolicyChange: (policy: ProductKnowledgeBase["policy"]) => void;
  onRename: (name: string) => void;
  onRequestCompilation: () => void;
}) {
  const zh = locale === "zh";
  const [name, setName] = useState(base.name[locale]);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<KnowledgeDetailTab>("overview");
  const active = base.phase === "queued" || base.phase === "running";
  const phase = knowledgePhasePresentation(base, locale);

  useEffect(() => {
    setName(base.name[locale]);
    setTab("overview");
    setStatus("");
  }, [base.id, base.name, locale]);

  return (
    <aside
      aria-label={
        zh ? `${base.name.zh} 知识库管理` : `${base.name.en} knowledge management`
      }
      data-knowledge-library-detail
    >
      <header>
        <span data-knowledge-detail-mark>
          <ProductPlaygroundIcon name="knowledge" />
        </span>
        <span>
          <strong>{base.name[locale]}</strong>
          <small title={base.path}>{base.path}</small>
        </span>
        <button
          aria-label={zh ? "关闭知识库详情" : "Close knowledge details"}
          onClick={onClose}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>

      <div aria-label={zh ? "知识库详情" : "Knowledge details"} role="tablist">
        {(
          [
            ["overview", zh ? "概览" : "Overview"],
            ["sources", zh ? "来源" : "Sources"],
            ["settings", zh ? "设置" : "Settings"],
          ] as const
        ).map(([id, label]) => (
          <button
            aria-selected={tab === id}
            key={id}
            onClick={() => setTab(id)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div data-knowledge-detail-content>
        {tab === "overview" ? (
          <>
            <section data-knowledge-compilation data-phase={base.phase}>
              <header>
                <span>
                  <ProductPlaygroundIcon
                    name={
                      base.phase === "failed" || base.phase === "paused"
                        ? "warning"
                        : base.phase === "succeeded"
                          ? "check"
                          : "database"
                    }
                  />
                  <span>
                    <strong>{phase.label}</strong>
                    <small>{phase.description}</small>
                  </span>
                </span>
                {active ? <i aria-hidden="true" /> : null}
              </header>
              {base.error ? <p role={base.phase === "failed" ? "alert" : "status"}>{base.error[locale]}</p> : null}
              {base.pendingChanges && base.phase === "succeeded" ? (
                <p role="status">
                  {zh
                    ? "检测到来源变化，建议再次更新。"
                    : "Source changes were detected. Update again when ready."}
                </p>
              ) : null}
              <button
                data-primary
                disabled={active}
                onClick={onRequestCompilation}
                type="button"
              >
                <ProductPlaygroundIcon name={active ? "pause" : "refresh"} />
                {active
                  ? base.phase === "queued"
                    ? zh
                      ? "等待更新"
                      : "Queued"
                    : zh
                      ? "正在更新"
                      : "Updating"
                  : base.phase === "failed" || base.phase === "succeeded"
                    ? zh
                      ? "再次更新"
                      : "Update again"
                    : zh
                      ? "立即更新"
                      : "Update now"}
              </button>
            </section>

            <dl data-knowledge-stats>
              <div><dt>{zh ? "来源" : "Sources"}</dt><dd>{base.sourceCount}</dd></div>
              <div><dt>{zh ? "概念" : "Concepts"}</dt><dd>{base.conceptCount.toLocaleString(locale)}</dd></div>
              <div><dt>{zh ? "大小" : "Size"}</dt><dd>{formatBytes(base.bytes)}</dd></div>
              <div><dt>{zh ? "最近更新" : "Updated"}</dt><dd>{formatDate(base.updated, locale)}</dd></div>
            </dl>

            <section data-knowledge-description>
              <h2>{zh ? "关于此知识库" : "About this knowledge base"}</h2>
              <p>{base.description[locale]}</p>
              <span>
                <ProductPlaygroundIcon name="shield" />
                {zh
                  ? "内容保存在当前工作空间；组件不拥有同步和权限。"
                  : "Content stays in the current workspace; sync and permissions remain host-owned."}
              </span>
            </section>

            <section data-knowledge-recent-sources>
              <header>
                <h2>{zh ? "最近来源" : "Recent sources"}</h2>
                <button onClick={() => setTab("sources")} type="button">
                  {zh ? "查看全部" : "View all"}
                </button>
              </header>
              {base.sources.slice(0, 3).map((source) => (
                <article key={source.id}>
                  <ProductPlaygroundIcon name={source.kind.includes("Folder") ? "folder" : "document"} />
                  <span><strong>{source.name}</strong><small>{source.kind}</small></span>
                  <em data-source-status={source.status}>
                    {source.status === "indexed"
                      ? zh ? "已索引" : "Indexed"
                      : source.status === "pending"
                        ? zh ? "待处理" : "Pending"
                        : zh ? "已跳过" : "Skipped"}
                  </em>
                </article>
              ))}
            </section>
          </>
        ) : null}

        {tab === "sources" ? (
          <section data-knowledge-sources>
            <header>
              <span>
                <h2>{zh ? "知识来源" : "Knowledge sources"}</h2>
                <p>
                  {zh
                    ? "宿主负责读取、授权与同步；这里呈现可管理状态。"
                    : "The host owns reading, authorization, and sync; this surface presents manageable state."}
                </p>
              </span>
              <button onClick={() => setStatus(zh ? "已打开来源选择器。" : "Source picker opened.")} type="button">
                <ProductPlaygroundIcon name="plus" />
                {zh ? "添加来源" : "Add source"}
              </button>
            </header>
            <div role="list">
              {base.sources.map((source) => (
                <article key={source.id} role="listitem">
                  <span data-source-mark><ProductPlaygroundIcon name={source.kind.includes("Folder") || source.kind.includes("Vault") ? "folder" : "document"} /></span>
                  <span><strong>{source.name}</strong><small>{source.kind} · {formatDate(source.updated, locale)}</small></span>
                  <em data-source-status={source.status}>
                    {source.status === "indexed"
                      ? zh ? "已索引" : "Indexed"
                      : source.status === "pending"
                        ? zh ? "待处理" : "Pending"
                        : zh ? "已跳过" : "Skipped"}
                  </em>
                  <button aria-label={zh ? `管理 ${source.name}` : `Manage ${source.name}`} onClick={() => setStatus(zh ? `已选择来源“${source.name}”。` : `${source.name} selected.`)} type="button"><ProductPlaygroundIcon name="more" /></button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "settings" ? (
          <section data-knowledge-settings>
            <header>
              <h2>{zh ? "知识库设置" : "Knowledge settings"}</h2>
              <p>{zh ? "每次修改都应保留失败恢复路径。" : "Every mutation needs a recoverable failure path."}</p>
            </header>
            <form onSubmit={(event) => { event.preventDefault(); const value = name.trim(); if (!value) { setStatus(zh ? "名称不能为空。" : "Name cannot be empty."); return; } onRename(value); setStatus(zh ? "名称已保存。" : "Name saved."); }}>
              <label>
                <span>{zh ? "名称" : "Name"}</span>
                <input maxLength={80} onChange={(event) => setName(event.currentTarget.value)} value={name} />
              </label>
              <button type="submit">{zh ? "保存名称" : "Save name"}</button>
            </form>
            <label data-knowledge-setting-switch>
              <span>
                <strong>{zh ? "自动更新" : "Automatic updates"}</strong>
                <small>
                  {zh
                    ? "文件稳定后更新，且两次更新至少间隔 10 分钟。"
                    : "Update after files settle, with at least ten minutes between runs."}
                </small>
              </span>
              <input checked={base.policy === "smart_auto"} onChange={(event) => onPolicyChange(event.currentTarget.checked ? "smart_auto" : "manual")} role="switch" type="checkbox" />
            </label>
            <label data-knowledge-setting-switch>
              <span><strong>{zh ? "置顶知识库" : "Pin knowledge base"}</strong><small>{zh ? "在知识库列表顶部显示。" : "Keep this library at the top of the directory."}</small></span>
              <input checked={base.pinned} onChange={(event) => onPinChange(event.currentTarget.checked)} role="switch" type="checkbox" />
            </label>
            <section data-danger-zone>
              <span><strong>{zh ? "移除知识库" : "Remove knowledge base"}</strong><small>{zh ? "删除本地副本前需要再次确认。" : "Confirmation is required before removing the local copy."}</small></span>
              <button onClick={onDelete} type="button"><ProductPlaygroundIcon name="trash" />{zh ? "移除" : "Remove"}</button>
            </section>
          </section>
        ) : null}
      </div>
      <output aria-live="polite">{status}</output>
    </aside>
  );
}

export function knowledgePhasePresentation(base: ProductKnowledgeBase, locale: ProductPlaygroundLocale) {
  const zh = locale === "zh";
  if (base.phase === "queued") return { label: zh ? "等待更新" : "Queued", description: zh ? "已加入队列，稍后生成可搜索内容。" : "Queued to generate searchable content." };
  if (base.phase === "running") return { label: zh ? "正在更新" : "Updating", description: zh ? "正在整理来源并建立可搜索内容。" : "Organizing sources and building the searchable index." };
  if (base.phase === "succeeded") return { label: base.pendingChanges ? (zh ? "来源有变化" : "Sources changed") : zh ? "已更新" : "Up to date", description: zh ? "最近一次更新成功；失败时仍保留当前可用版本。" : "The latest update succeeded; failures retain the current usable version." };
  if (base.phase === "failed") return { label: zh ? "更新失败" : "Update failed", description: zh ? "上一版可搜索内容仍然可用。" : "The previous searchable version remains available." };
  if (base.phase === "paused") return { label: zh ? "自动更新已暂停" : "Automatic update paused", description: zh ? "检查来源后手动继续。" : "Review the sources before continuing manually." };
  return { label: zh ? "可以更新" : "Ready to update", description: zh ? "来源已准备好，更新后即可搜索和引用。" : "Sources are ready to become searchable and referenceable." };
}

function formatBytes(value: number) { if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`; return `${(value / (1024 * 1024)).toFixed(1)} MB`; }
function formatDate(value: string, locale: ProductPlaygroundLocale) { return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
