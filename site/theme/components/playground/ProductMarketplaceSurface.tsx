import { useMemo, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import {
  ProductPlaygroundIcon,
  type ProductPlaygroundIconName,
} from "./ProductPlaygroundIcon";

type ExtensionChannel = "beta" | "stable";
type MarketplaceSection = "extensions" | "sources";

type ProductExtension = {
  channel: ExtensionChannel;
  description: { en: string; zh: string };
  id: string;
  icon: ProductPlaygroundIconName;
  name: { en: string; zh: string };
  permissions: readonly { en: string; zh: string }[];
  publisher: string;
  version: string;
};

const extensions: readonly ProductExtension[] = [
  {
    id: "release-review",
    name: { en: "Release review", zh: "发布评审" },
    description: {
      en: "Collect build status, interaction evidence, and unresolved release risks in one review surface.",
      zh: "集中查看构建状态、交互证据与尚未解决的发布风险。",
    },
    publisher: "A3S Labs",
    version: "1.8.2",
    channel: "stable",
    icon: "checklist",
    permissions: [
      { en: "Read task evidence", zh: "读取任务证据" },
      { en: "Propose task context", zh: "提议任务上下文" },
    ],
  },
  {
    id: "dependency-watch",
    name: { en: "Dependency watch", zh: "依赖巡检" },
    description: {
      en: "Review package changes, security advisories, and compatibility locks before an update.",
      zh: "更新前检查依赖变化、安全通告与兼容性锁。",
    },
    publisher: "A3S Labs",
    version: "2.1.0",
    channel: "stable",
    icon: "shield",
    permissions: [
      { en: "Read package manifests", zh: "读取包清单" },
      { en: "Create a review draft", zh: "创建评审草稿" },
    ],
  },
  {
    id: "document-insights",
    name: { en: "Document insights", zh: "文档洞察" },
    description: {
      en: "Extract decisions, citations, tables, and action items from supported local documents.",
      zh: "从支持的本地文档中提取决策、引用、表格与行动项。",
    },
    publisher: "A3S Community",
    version: "0.9.4",
    channel: "beta",
    icon: "document",
    permissions: [
      { en: "Read selected files", zh: "读取所选文件" },
      { en: "Return structured results", zh: "返回结构化结果" },
    ],
  },
  {
    id: "workspace-map",
    name: { en: "Workspace map", zh: "工作区图谱" },
    description: {
      en: "Project ownership and dependency relationships into an explorable workspace map.",
      zh: "将所有权与依赖关系整理成可探索的工作区图谱。",
    },
    publisher: "A3S Community",
    version: "1.3.1",
    channel: "stable",
    icon: "project",
    permissions: [
      { en: "Read workspace structure", zh: "读取工作区结构" },
      { en: "Open referenced files", zh: "打开引用文件" },
    ],
  },
  {
    id: "local-preview",
    name: { en: "Local preview bridge", zh: "本地预览桥接" },
    description: {
      en: "Connect authorized local preview targets to device shells and task evidence.",
      zh: "将已授权的本地预览目标连接到设备外壳与任务证据。",
    },
    publisher: "A3S Labs",
    version: "1.5.0",
    channel: "stable",
    icon: "workspace",
    permissions: [
      { en: "Open a local preview URL", zh: "打开本地预览地址" },
      { en: "Capture bounded evidence", zh: "采集受控证据" },
    ],
  },
  {
    id: "mail-triage",
    name: { en: "Mail triage", zh: "邮件分拣" },
    description: {
      en: "Group selected messages, propose priorities, and prepare drafts without sending automatically.",
      zh: "整理所选邮件、建议优先级并准备草稿，不会自动发送。",
    },
    publisher: "A3S Community",
    version: "0.7.3",
    channel: "beta",
    icon: "mail",
    permissions: [
      { en: "Read approved messages", zh: "读取已授权邮件" },
      { en: "Prepare drafts", zh: "准备邮件草稿" },
    ],
  },
];

export function ProductMarketplaceSurface({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [section, setSection] = useState<MarketplaceSection>("extensions");
  const [channel, setChannel] = useState<"all" | ExtensionChannel>("all");
  const [installed, setInstalled] = useState<Set<string>>(
    new Set(["release-review", "local-preview"]),
  );
  const [installedOnly, setInstalledOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("release-review");
  const [hostId, setHostId] = useState<string>();
  const visibleExtensions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return extensions.filter(
      (extension) =>
        (channel === "all" || extension.channel === channel) &&
        (!installedOnly || installed.has(extension.id)) &&
        (!normalized ||
          `${extension.name.en} ${extension.name.zh} ${extension.publisher} ${extension.description.en} ${extension.description.zh}`
            .toLocaleLowerCase(locale)
            .includes(normalized)),
    );
  }, [channel, installed, installedOnly, locale, query]);
  const selected =
    extensions.find((extension) => extension.id === selectedId) ??
    extensions[0];
  const hostExtension = extensions.find((extension) => extension.id === hostId);

  if (hostExtension) {
    return (
      <ProductExtensionHost
        extension={hostExtension}
        locale={locale}
        onBack={() => setHostId(undefined)}
      />
    );
  }

  const toggleInstall = (id: string) => {
    setInstalled((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="product-marketplace" data-product-surface="marketplace">
      <header>
        <div>
          <span>
            <ProductPlaygroundIcon name="catalog" />
          </span>
          <div>
            <h1>{zh ? "扩展" : "Extensions"}</h1>
            <p>
              {zh
                ? "安装经过验证的功能扩展；技能、连接器和专家仍在能力目录中管理。"
                : "Install verified product extensions. Skills, connectors, and assistants remain in the capability directory."}
            </p>
          </div>
        </div>
        <div>
          <label>
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={zh ? "搜索扩展" : "Search extensions"}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={zh ? "搜索扩展" : "Search extensions"}
              type="search"
              value={query}
            />
          </label>
          <button
            aria-pressed={installedOnly}
            onClick={() => setInstalledOnly((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="check" />
            {zh ? `已安装 ${installed.size}` : `Installed ${installed.size}`}
          </button>
        </div>
      </header>

      <nav aria-label={zh ? "扩展页面" : "Extension pages"} role="tablist">
        <button
          aria-selected={section === "extensions"}
          onClick={() => setSection("extensions")}
          role="tab"
          type="button"
        >
          <ProductPlaygroundIcon name="catalog" />
          {zh ? "插件" : "Extensions"}
        </button>
        <button
          aria-selected={section === "sources"}
          onClick={() => setSection("sources")}
          role="tab"
          type="button"
        >
          <ProductPlaygroundIcon name="shield" />
          {zh ? "来源" : "Sources"}
        </button>
      </nav>

      {section === "sources" ? (
        <ProductExtensionSources locale={locale} />
      ) : (
        <div className="product-marketplace__workspace">
          <aside>
            <header>
              <strong>{zh ? "筛选" : "Filters"}</strong>
              <button
                disabled={channel === "all" && !installedOnly && !query}
                onClick={() => {
                  setChannel("all");
                  setInstalledOnly(false);
                  setQuery("");
                }}
                type="button"
              >
                {zh ? "清除" : "Clear"}
              </button>
            </header>
            <fieldset>
              <legend>{zh ? "发布通道" : "Release channel"}</legend>
              {(
                [
                  ["all", zh ? "全部" : "All"],
                  ["stable", zh ? "稳定版" : "Stable"],
                  ["beta", zh ? "测试版" : "Beta"],
                ] as const
              ).map(([id, label]) => (
                <label key={id}>
                  <input
                    checked={channel === id}
                    name="extension-channel"
                    onChange={() => setChannel(id)}
                    type="radio"
                  />
                  <span>{label}</span>
                  <small>
                    {id === "all"
                      ? extensions.length
                      : extensions.filter((item) => item.channel === id).length}
                  </small>
                </label>
              ))}
            </fieldset>
            <section>
              <ProductPlaygroundIcon name="shield" />
              <div>
                <strong>{zh ? "验证边界" : "Verified boundary"}</strong>
                <p>
                  {zh
                    ? "扩展在隔离宿主中运行，权限在安装前明确列出。"
                    : "Extensions run in an isolated host and list permissions before installation."}
                </p>
              </div>
            </section>
          </aside>

          <main>
            <header>
              <div>
                <h2>
                  {installedOnly
                    ? zh
                      ? "已安装"
                      : "Installed"
                    : zh
                      ? "精选扩展"
                      : "Featured extensions"}
                </h2>
                <p>
                  {zh
                    ? `${visibleExtensions.length} 个扩展可用`
                    : `${visibleExtensions.length} extensions available`}
                </p>
              </div>
              <select
                aria-label={zh ? "扩展排序" : "Sort extensions"}
                defaultValue="recommended"
              >
                <option value="recommended">
                  {zh ? "推荐优先" : "Recommended"}
                </option>
                <option value="updated">
                  {zh ? "最近更新" : "Recently updated"}
                </option>
                <option value="name">{zh ? "按名称" : "Name"}</option>
              </select>
            </header>
            {visibleExtensions.length ? (
              <div className="product-marketplace__directory">
                {visibleExtensions.map((extension) => (
                  <article
                    data-selected={
                      selected.id === extension.id ? "true" : undefined
                    }
                    key={extension.id}
                  >
                    <button
                      aria-label={`${zh ? "查看" : "Open"} ${extension.name[locale]}`}
                      onClick={() => setSelectedId(extension.id)}
                      type="button"
                    >
                      <span data-extension-icon>
                        <ProductPlaygroundIcon name={extension.icon} />
                      </span>
                      <span>
                        <strong>{extension.name[locale]}</strong>
                        <small>
                          {extension.publisher} · v{extension.version}
                        </small>
                        <p>{extension.description[locale]}</p>
                        <em data-channel={extension.channel}>
                          {extension.channel === "stable"
                            ? zh
                              ? "稳定版"
                              : "Stable"
                            : "Beta"}
                        </em>
                      </span>
                    </button>
                    <button
                      aria-label={
                        installed.has(extension.id)
                          ? `${zh ? "卸载" : "Uninstall"} ${extension.name[locale]}`
                          : `${zh ? "安装" : "Install"} ${extension.name[locale]}`
                      }
                      data-installed={
                        installed.has(extension.id) ? "true" : undefined
                      }
                      onClick={() => toggleInstall(extension.id)}
                      type="button"
                    >
                      <ProductPlaygroundIcon
                        name={installed.has(extension.id) ? "check" : "plus"}
                      />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="product-marketplace__empty" role="status">
                <ProductPlaygroundIcon name="search" />
                <strong>
                  {zh ? "没有匹配的扩展" : "No matching extensions"}
                </strong>
                <span>
                  {zh
                    ? "调整搜索或筛选条件后重试。"
                    : "Change the search or filters and try again."}
                </span>
              </div>
            )}
          </main>

          <aside className="product-marketplace__detail">
            <header>
              <span data-extension-icon>
                <ProductPlaygroundIcon name={selected.icon} />
              </span>
              <div>
                <strong>{selected.name[locale]}</strong>
                <small>
                  {selected.publisher} · v{selected.version}
                </small>
              </div>
            </header>
            <p>{selected.description[locale]}</p>
            <section>
              <h3>{zh ? "请求的权限" : "Requested permissions"}</h3>
              {selected.permissions.map((permission) => (
                <div key={permission.en}>
                  <ProductPlaygroundIcon name="check" />
                  <span>{permission[locale]}</span>
                </div>
              ))}
            </section>
            <dl>
              <div>
                <dt>{zh ? "通道" : "Channel"}</dt>
                <dd>
                  {selected.channel === "stable"
                    ? zh
                      ? "稳定版"
                      : "Stable"
                    : "Beta"}
                </dd>
              </div>
              <div>
                <dt>{zh ? "运行方式" : "Runtime"}</dt>
                <dd>{zh ? "隔离宿主" : "Isolated host"}</dd>
              </div>
              <div>
                <dt>{zh ? "更新" : "Updated"}</dt>
                <dd>{zh ? "本周" : "This week"}</dd>
              </div>
            </dl>
            <footer>
              {installed.has(selected.id) ? (
                <>
                  <button
                    data-primary
                    onClick={() => setHostId(selected.id)}
                    type="button"
                  >
                    {zh ? "打开扩展" : "Open extension"}
                  </button>
                  <button
                    onClick={() => toggleInstall(selected.id)}
                    type="button"
                  >
                    {zh ? "卸载" : "Uninstall"}
                  </button>
                </>
              ) : (
                <button
                  data-primary
                  onClick={() => toggleInstall(selected.id)}
                  type="button"
                >
                  <ProductPlaygroundIcon name="plus" />
                  {zh ? "安装扩展" : "Install extension"}
                </button>
              )}
            </footer>
          </aside>
        </div>
      )}
    </section>
  );
}

function ProductExtensionSources({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [refreshed, setRefreshed] = useState(false);
  const sources = [
    ["A3S verified", "registry.a3s.dev", zh ? "已验证" : "Verified", "18"],
    ["Local development", "127.0.0.1:7331", zh ? "仅本机" : "Local only", "3"],
  ] as const;
  return (
    <section className="product-marketplace__sources">
      <header>
        <div>
          <h2>{zh ? "扩展来源" : "Extension sources"}</h2>
          <p>
            {zh
              ? "来源身份变化会重新验证已打开的扩展。"
              : "Identity changes trigger re-verification for open extensions."}
          </p>
        </div>
        <button onClick={() => setRefreshed(true)} type="button">
          <ProductPlaygroundIcon name={refreshed ? "check" : "refresh"} />
          {refreshed
            ? zh
              ? "已刷新"
              : "Refreshed"
            : zh
              ? "刷新来源"
              : "Refresh sources"}
        </button>
      </header>
      <div role="table" aria-label={zh ? "扩展来源" : "Extension sources"}>
        <div data-header role="row">
          <span role="columnheader">{zh ? "来源" : "Source"}</span>
          <span role="columnheader">{zh ? "地址" : "Address"}</span>
          <span role="columnheader">{zh ? "信任" : "Trust"}</span>
          <span role="columnheader">{zh ? "扩展" : "Extensions"}</span>
        </div>
        {sources.map(([name, address, trust, count]) => (
          <button key={name} role="row" type="button">
            <span role="cell">
              <i>
                <ProductPlaygroundIcon name="database" />
              </i>
              <strong>{name}</strong>
            </span>
            <code role="cell">{address}</code>
            <em role="cell">
              <ProductPlaygroundIcon name="shield" />
              {trust}
            </em>
            <span role="cell">{count}</span>
          </button>
        ))}
      </div>
      <section>
        <ProductPlaygroundIcon name="warning" />
        <div>
          <strong>
            {zh
              ? "添加来源前先验证发布者"
              : "Verify the publisher before adding a source"}
          </strong>
          <p>
            {zh
              ? "来源可以提供可执行扩展。未知来源默认不会被加载。"
              : "Sources may provide executable extensions. Unknown sources are not loaded by default."}
          </p>
        </div>
        <button type="button">
          <ProductPlaygroundIcon name="plus" />
          {zh ? "添加来源" : "Add source"}
        </button>
      </section>
    </section>
  );
}

function ProductExtensionHost({
  extension,
  locale,
  onBack,
}: {
  extension: ProductExtension;
  locale: ProductPlaygroundLocale;
  onBack: () => void;
}) {
  const zh = locale === "zh";
  const [proposal, setProposal] = useState<"accepted" | "pending" | "rejected">(
    "pending",
  );
  return (
    <section
      className="product-extension-host"
      data-product-surface="extension-host"
    >
      <header>
        <button
          aria-label={zh ? "返回扩展市场" : "Back to extensions"}
          onClick={onBack}
          type="button"
        >
          <ProductPlaygroundIcon name="back" />
        </button>
        <span data-extension-icon>
          <ProductPlaygroundIcon name={extension.icon} />
        </span>
        <div>
          <strong>{extension.name[locale]}</strong>
          <small>{zh ? "隔离扩展宿主" : "Isolated extension host"}</small>
        </div>
        <em>
          <i />
          {zh ? "已验证" : "Verified"}
        </em>
        <button type="button">
          <ProductPlaygroundIcon name="refresh" />
          {zh ? "重新加载" : "Reload"}
        </button>
      </header>
      <main>
        <section className="product-extension-host__summary">
          <span>
            <ProductPlaygroundIcon name="report" />
          </span>
          <div>
            <small>{zh ? "发布候选" : "Release candidate"}</small>
            <h1>v0.3.0</h1>
            <p>
              {zh
                ? "关键检查已完成，可以开始最终评审。"
                : "Critical checks are complete and ready for final review."}
            </p>
          </div>
          <em>{zh ? "就绪" : "Ready"}</em>
        </section>
        <section className="product-extension-host__checks">
          {[
            [zh ? "构建与类型检查" : "Build and typecheck", "28s", "check"],
            [zh ? "交互路径" : "Interaction paths", "12 / 12", "check"],
            [
              zh ? "视觉证据" : "Visual evidence",
              zh ? "双端齐全" : "Both viewports",
              "eye",
            ],
            [zh ? "未解决风险" : "Open risks", "0", "shield"],
          ].map(([label, value, icon]) => (
            <article key={label}>
              <ProductPlaygroundIcon name={icon as ProductPlaygroundIconName} />
              <span>
                <strong>{label}</strong>
                <small>{value}</small>
              </span>
            </article>
          ))}
        </section>
        <section
          className="product-extension-host__proposal"
          data-state={proposal}
        >
          <header>
            <ProductPlaygroundIcon name="task-add" />
            <div>
              <strong>
                {zh ? "建议添加到任务上下文" : "Proposed task context"}
              </strong>
              <small>
                {zh
                  ? "由扩展提出，尚未写入当前任务"
                  : "Proposed by the extension; not yet added"}
              </small>
            </div>
          </header>
          <blockquote>
            {zh
              ? "发布候选 v0.3.0 已通过构建、交互和双端视觉验收，没有未解决风险。"
              : "Release candidate v0.3.0 passed build, interaction, and both viewport reviews with no open risks."}
          </blockquote>
          {proposal === "pending" ? (
            <footer>
              <button onClick={() => setProposal("rejected")} type="button">
                {zh ? "忽略" : "Dismiss"}
              </button>
              <button
                data-primary
                onClick={() => setProposal("accepted")}
                type="button"
              >
                {zh ? "添加到当前任务" : "Add to current task"}
              </button>
            </footer>
          ) : (
            <output>
              <ProductPlaygroundIcon
                name={proposal === "accepted" ? "check" : "close"}
              />
              {proposal === "accepted"
                ? zh
                  ? "已添加到任务草稿"
                  : "Added to the task draft"
                : zh
                  ? "已忽略提议"
                  : "Proposal dismissed"}
            </output>
          )}
        </section>
      </main>
      <footer>
        <ProductPlaygroundIcon name="shield" />
        {zh
          ? "扩展无法直接读取页面状态；上下文通过受审查的提议传递。"
          : "The extension cannot read ambient page state; context moves through reviewed proposals."}
      </footer>
    </section>
  );
}
