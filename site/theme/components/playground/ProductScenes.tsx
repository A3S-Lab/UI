import { PlaygroundIcon } from "./PlaygroundIcon";
import type { PlaygroundLocale } from "./playground-data";

export function AutomationScene({ locale }: { locale: PlaygroundLocale }) {
  return (
    <section
      className="app-page playground-automation-scene"
      data-playground-scene="automation"
    >
      <header>
        <div data-page-identity>
          <h2>{locale === "zh" ? "自动化" : "Automations"}</h2>
          <p>
            {locale === "zh"
              ? "按计划运行，并保留每次执行的结果与证据。"
              : "Run on schedule and retain the result and evidence from every execution."}
          </p>
        </div>
        <div data-page-actions>
          <select
            className="select"
            aria-label={locale === "zh" ? "筛选自动化" : "Filter automations"}
            defaultValue="all"
          >
            <option value="all">{locale === "zh" ? "全部" : "All"}</option>
            <option value="enabled">
              {locale === "zh" ? "已启用" : "Enabled"}
            </option>
          </select>
          <button type="button" className="btn">
            <PlaygroundIcon name="automation" width="16" height="16" />
            {locale === "zh" ? "新建任务" : "New task"}
          </button>
        </div>
      </header>
      <div data-page-content>
        <section className="setting-row playground-automation-policy">
          <div>
            <strong>
              {locale === "zh"
                ? "仅运行已启用的任务"
                : "Only enabled tasks will run"}
            </strong>
            <p>
              {locale === "zh"
                ? "关闭总开关会暂停全部计划，但不会删除历史。"
                : "Turning this off pauses schedules without deleting their history."}
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              defaultChecked
              aria-label={locale === "zh" ? "保持启用" : "Keep enabled"}
            />
            <span />
          </label>
        </section>
        <article className="playground-schedule" data-state="success">
          <header>
            <div>
              <h3>
                {locale === "zh" ? "每周项目摘要" : "Weekly project digest"}
              </h3>
              <p>
                {locale === "zh"
                  ? "每周五 17:00 · 下次运行 8 月 21 日"
                  : "Friday at 17:00 · Next run Aug 21"}
              </p>
            </div>
            <span className="status-badge" data-state="success">
              {locale === "zh" ? "正常" : "Healthy"}
            </span>
            <div data-schedule-actions>
              <button
                type="button"
                className="btn"
                data-size="icon-sm"
                data-variant="ghost"
                aria-label={locale === "zh" ? "立即运行" : "Run now"}
              >
                <PlaygroundIcon name="play" width="16" height="16" />
              </button>
              <label className="switch">
                <input
                  type="checkbox"
                  defaultChecked
                  aria-label={locale === "zh" ? "启用任务" : "Enable task"}
                />
                <span />
              </label>
            </div>
          </header>
          <section>
            <div>
              <small>{locale === "zh" ? "最近结果" : "Latest result"}</small>
              <p>
                {locale === "zh"
                  ? "已汇总 8 个完成项、3 个待审阅项和 1 个发布风险。"
                  : "Collected 8 completed items, 3 open reviews, and 1 release risk."}
              </p>
            </div>
            <dl className="property-list">
              <div>
                <dt>{locale === "zh" ? "完成" : "Completed"}</dt>
                <dd>8</dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "审阅" : "Reviews"}</dt>
                <dd>3</dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "风险" : "Risks"}</dt>
                <dd>1</dd>
              </div>
            </dl>
          </section>
          <footer className="tabs">
            <div
              role="tablist"
              aria-label={locale === "zh" ? "自动化详情" : "Automation details"}
            >
              <button type="button" role="tab" aria-selected="true">
                {locale === "zh" ? "输出" : "Output"}
              </button>
              <button type="button" role="tab" aria-selected="false">
                {locale === "zh" ? "运行" : "Runs"}
              </button>
              <button type="button" role="tab" aria-selected="false">
                {locale === "zh" ? "历史" : "History"}
              </button>
            </div>
          </footer>
        </article>
      </div>
    </section>
  );
}

export function CatalogScene({ locale }: { locale: PlaygroundLocale }) {
  const resources = [
    {
      name: locale === "zh" ? "网页检查" : "Web inspection",
      state: "installed",
      summary:
        locale === "zh"
          ? "打开页面、操作控件并保留证据。"
          : "Open pages, operate controls, and retain evidence.",
    },
    {
      name: locale === "zh" ? "文档交付" : "Document delivery",
      state: "available",
      summary:
        locale === "zh"
          ? "创建并校验可编辑文档。"
          : "Create and verify editable documents.",
    },
    {
      name: locale === "zh" ? "工作流运行器" : "Workflow runner",
      state: "update",
      summary:
        locale === "zh"
          ? "运行可恢复的多步骤自动化。"
          : "Run recoverable multi-step automations.",
    },
    {
      name: locale === "zh" ? "媒体预览" : "Media preview",
      state: "unavailable",
      summary:
        locale === "zh"
          ? "需要宿主授予本地文件权限。"
          : "Requires local file permission from the host.",
    },
  ] as const;
  return (
    <section
      className="catalog playground-catalog-scene"
      data-playground-scene="catalog"
    >
      <header>
        <div>
          <h2>{locale === "zh" ? "能力目录" : "Capability catalog"}</h2>
          <p>
            {locale === "zh"
              ? "先确认能力与权限，再把它加入当前工作区。"
              : "Review capability and permissions before adding it to the workspace."}
          </p>
        </div>
        <button type="button" className="btn" data-variant="outline">
          {locale === "zh" ? "管理来源" : "Manage sources"}
        </button>
      </header>
      <form className="filter-bar" role="search">
        <label data-filter-search>
          <span className="sr-only">
            {locale === "zh" ? "搜索能力" : "Search capabilities"}
          </span>
          <PlaygroundIcon name="search" width="16" height="16" />
          <input
            className="input"
            type="search"
            placeholder={
              locale === "zh" ? "搜索名称或用途…" : "Search by name or job…"
            }
          />
        </label>
        <div data-filter-controls>
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="secondary"
            aria-pressed="true"
          >
            {locale === "zh" ? "全部" : "All"}
          </button>
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="ghost"
          >
            {locale === "zh" ? "已安装" : "Installed"}
          </button>
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="ghost"
          >
            {locale === "zh" ? "可更新" : "Updates"}
          </button>
        </div>
        <output data-filter-summary>
          {resources.length} {locale === "zh" ? "项能力" : "capabilities"}
        </output>
      </form>
      <div className="resource-grid">
        {resources.map((resource) => (
          <article
            className="resource-card"
            data-state={resource.state}
            key={resource.name}
          >
            <figure>
              <PlaygroundIcon
                name={resource.state === "unavailable" ? "inspect" : "catalog"}
                width="22"
                height="22"
              />
            </figure>
            <section>
              <header>
                <strong>{resource.name}</strong>
                <span
                  className="status-badge"
                  data-state={
                    resource.state === "installed"
                      ? "success"
                      : resource.state === "unavailable"
                        ? "danger"
                        : "neutral"
                  }
                >
                  {resource.state === "installed"
                    ? locale === "zh"
                      ? "已安装"
                      : "Installed"
                    : resource.state === "update"
                      ? locale === "zh"
                        ? "可更新"
                        : "Update"
                      : resource.state === "unavailable"
                        ? locale === "zh"
                          ? "不可用"
                          : "Unavailable"
                        : locale === "zh"
                          ? "可用"
                          : "Available"}
                </span>
              </header>
              <p>{resource.summary}</p>
            </section>
            <footer>
              <button
                type="button"
                className="btn"
                data-size="sm"
                data-variant={
                  resource.state === "available" ? "default" : "outline"
                }
                disabled={resource.state === "unavailable"}
              >
                {resource.state === "installed"
                  ? locale === "zh"
                    ? "打开"
                    : "Open"
                  : resource.state === "update"
                    ? locale === "zh"
                      ? "更新"
                      : "Update"
                    : locale === "zh"
                      ? "查看"
                      : "Review"}
              </button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ChannelsScene({ locale }: { locale: PlaygroundLocale }) {
  const channels = [
    {
      name: locale === "zh" ? "移动端协作" : "Mobile collaboration",
      detail:
        locale === "zh"
          ? "已配对 · 最近同步 2 分钟前"
          : "Paired · Synced 2 minutes ago",
      state: "success",
    },
    {
      name: locale === "zh" ? "团队消息" : "Team messaging",
      detail:
        locale === "zh"
          ? "等待工作区授权"
          : "Waiting for workspace authorization",
      state: "warning",
    },
    {
      name: locale === "zh" ? "Webhook" : "Webhook",
      detail:
        locale === "zh" ? "未配置接收地址" : "No receiving endpoint configured",
      state: "neutral",
    },
  ] as const;
  return (
    <section
      className="app-page playground-channels-scene"
      data-playground-scene="channels"
    >
      <header>
        <div data-page-identity>
          <h2>{locale === "zh" ? "连接" : "Connections"}</h2>
          <p>
            {locale === "zh"
              ? "明确每个渠道能读取什么、可以执行什么。"
              : "Make each channel's read and action boundaries explicit."}
          </p>
        </div>
        <div data-page-actions>
          <button type="button" className="btn">
            {locale === "zh" ? "添加连接" : "Add connection"}
          </button>
        </div>
      </header>
      <div data-page-content>
        <section className="alert">
          <PlaygroundIcon name="channels" width="18" height="18" />
          <div>
            <strong>
              {locale === "zh"
                ? "消息只进入已选择的工作区"
                : "Messages enter selected workspaces only"}
            </strong>
            <p>
              {locale === "zh"
                ? "高权限操作仍需在当前设备确认。"
                : "High-impact actions still require confirmation on this device."}
            </p>
          </div>
        </section>
        <div className="playground-channel-list">
          {channels.map((channel) => (
            <article className="setting-row" key={channel.name}>
              <div>
                <strong>{channel.name}</strong>
                <p>{channel.detail}</p>
              </div>
              <span className="status-badge" data-state={channel.state}>
                {channel.state === "success"
                  ? locale === "zh"
                    ? "在线"
                    : "Online"
                  : channel.state === "warning"
                    ? locale === "zh"
                      ? "待处理"
                      : "Action needed"
                    : locale === "zh"
                      ? "未连接"
                      : "Not connected"}
              </span>
              <button
                type="button"
                className="btn"
                data-size="sm"
                data-variant="outline"
              >
                {channel.state === "success"
                  ? locale === "zh"
                    ? "管理"
                    : "Manage"
                  : locale === "zh"
                    ? "配置"
                    : "Configure"}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SettingsScene({ locale }: { locale: PlaygroundLocale }) {
  return (
    <section
      className="settings-layout playground-settings-scene"
      data-playground-scene="settings"
    >
      <aside data-settings-navigation>
        <header>
          <strong>{locale === "zh" ? "设置" : "Settings"}</strong>
        </header>
        <nav aria-label={locale === "zh" ? "设置分区" : "Settings sections"}>
          <button type="button" aria-current="page">
            {locale === "zh" ? "通用" : "General"}
          </button>
          <button type="button">
            {locale === "zh" ? "模型与路由" : "Models and routing"}
          </button>
          <button type="button">
            {locale === "zh" ? "工作区" : "Workspaces"}
          </button>
          <button type="button">
            {locale === "zh" ? "自动化" : "Automations"}
          </button>
          <button type="button">{locale === "zh" ? "存储" : "Storage"}</button>
        </nav>
      </aside>
      <main data-settings-content>
        <header>
          <div>
            <h2>{locale === "zh" ? "通用" : "General"}</h2>
            <p>
              {locale === "zh"
                ? "界面、语言与默认工作方式。"
                : "Appearance, language, and default working behavior."}
            </p>
          </div>
        </header>
        <section>
          <article className="setting-row">
            <div>
              <label htmlFor="playground-language">
                <strong>
                  {locale === "zh" ? "界面语言" : "Interface language"}
                </strong>
              </label>
              <p>
                {locale === "zh"
                  ? "更改后会保留当前页面。"
                  : "The current page is preserved when language changes."}
              </p>
            </div>
            <select
              id="playground-language"
              className="select"
              defaultValue={locale}
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
            </select>
          </article>
          <article className="setting-row">
            <div>
              <strong>
                {locale === "zh" ? "恢复上次工作区" : "Restore last workspace"}
              </strong>
              <p>
                {locale === "zh"
                  ? "启动时重新打开最后一次可访问的任务。"
                  : "Reopen the last accessible task at launch."}
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                defaultChecked
                aria-label={
                  locale === "zh" ? "恢复上次工作区" : "Restore last workspace"
                }
              />
              <span />
            </label>
          </article>
          <article className="setting-row">
            <div>
              <strong>
                {locale === "zh" ? "自动更新" : "Automatic updates"}
              </strong>
              <p>
                {locale === "zh"
                  ? "下载完成后由你决定何时重新启动。"
                  : "You decide when to restart after an update is downloaded."}
              </p>
            </div>
            <span className="status-badge" data-state="success">
              {locale === "zh" ? "已是最新" : "Up to date"}
            </span>
            <button
              type="button"
              className="btn"
              data-size="sm"
              data-variant="outline"
            >
              <PlaygroundIcon name="refresh" width="15" height="15" />
              {locale === "zh" ? "检查" : "Check"}
            </button>
          </article>
          <article className="setting-row">
            <div>
              <strong>{locale === "zh" ? "本地数据" : "Local data"}</strong>
              <p dir="ltr">/Users/demo/Library/Application Support/A3S</p>
            </div>
            <button
              type="button"
              className="btn"
              data-size="sm"
              data-variant="outline"
            >
              {locale === "zh" ? "更改位置" : "Change location"}
            </button>
          </article>
        </section>
      </main>
    </section>
  );
}
