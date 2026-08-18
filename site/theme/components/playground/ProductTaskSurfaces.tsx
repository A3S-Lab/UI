import { useState } from "react";
import { withBase } from "@rspress/core/runtime";
import { Link } from "@rspress/core/theme";
import {
  projectTemplates,
  type ProductPlaygroundLocale,
} from "./product-playground-data";
import {
  ProductComposer,
  type ProductComposerContext,
} from "./ProductComposer";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

function ProjectDiagram() {
  return (
    <svg
      aria-hidden="true"
      className="product-projects__diagram"
      fill="none"
      viewBox="0 0 660 210"
    >
      <path
        data-link
        d="M69 63c21-31 76-35 104-8 18-30 70-29 89 1M335 55c18-28 65-29 86-3 25-29 74-23 91 9M538 59c19-24 55-25 76-2"
      />
      <g data-person>
        <path
          data-solid
          d="M88 70c2-18 14-27 30-27 15 0 26 8 30 24-8-6-16-8-25-5-10 3-17 8-24 17Z"
        />
        <path data-surface d="M98 69c0 18 7 29 21 29 13 0 21-10 22-28" />
        <path d="M104 78h.01M130 78h.01M113 89c4 3 8 3 12 0" />
        <path data-surface d="M85 161c1-37 12-58 34-61 22 4 36 26 38 61" />
        <path d="M99 112c5 20 9 35 14 49M142 113c-5 20-9 35-14 49" />
        <g data-device>
          <path data-surface d="m88 119 47-9 9 38-47 9Z" />
          <path d="m99 126 24-5m-21 14 29-6m-27 15 21-5" />
        </g>
      </g>
      <g data-person>
        <path
          data-solid
          d="M226 72c-4-17 8-31 27-32 20-1 34 13 31 32-7-7-13-9-22-8-14 2-22 8-31 16Z"
        />
        <path data-surface d="M232 68c0 19 8 31 23 31 14 0 22-11 23-31" />
        <path d="M240 78h.01M267 78h.01M248 90c4 2 8 2 12 0" />
        <path data-surface d="M215 161c2-37 16-58 40-61 24 4 39 26 41 61" />
        <path d="M236 111c-10 11-18 23-25 36M274 111c9 12 18 23 26 36" />
        <g data-device>
          <path data-surface d="M220 131h73l9 30h-91Z" />
          <path d="M249 143h15M208 161h98" />
        </g>
      </g>
      <g data-robot>
        <path d="M370 62v-9m-5-6 5 6 5-6" />
        <path
          data-surface
          d="M336 78c0-17 13-30 30-30h15c17 0 30 13 30 30v28c0 17-13 30-30 30h-15c-17 0-30-13-30-30Z"
        />
        <path
          data-solid
          d="M347 80c0-10 8-18 18-18h18c10 0 18 8 18 18v14c0 10-8 18-18 18h-18c-10 0-18-8-18-18Z"
        />
        <path data-accent d="M361 86v8M387 86v8" />
        <path d="M336 88h-8v18h8M411 88h8v18h-8M353 131l-8 30M395 131l8 30" />
        <path data-surface d="M335 143h78l8 18h-94Z" />
      </g>
      <g data-person>
        <path
          data-solid
          d="M503 68c1-18 13-29 31-29 18 0 31 11 32 29-8-7-17-9-27-7-12 2-21 8-29 16Z"
        />
        <path data-surface d="M510 67c0 19 8 31 24 31 14 0 23-11 24-31" />
        <path d="M518 77h.01M546 77h.01M525 89c4 3 9 3 13 0M514 75h12m8 0h14m-22 0h8" />
        <path data-surface d="M486 161c2-37 18-58 47-62 26 5 42 27 44 62" />
        <path d="M508 113c6 18 13 33 20 48M555 113c-6 18-13 33-20 48" />
        <g data-device>
          <path data-surface d="M548 111h43v51h-43Z" />
          <path d="M557 122h25M557 132h19M557 142h23" />
        </g>
      </g>
      <g data-floating>
        <rect data-surface x="157" y="28" width="53" height="30" rx="7" />
        <path d="M171 40h24M171 48h14M176 58l-7 8v-8" />
        <rect data-surface x="446" y="31" width="48" height="28" rx="7" />
        <path d="M458 43h23M458 50h14M467 59l5 7v-7" />
        <path data-surface d="M600 24h27v35h-27Z" />
        <path d="M607 35h13M607 43h13M607 51h9" />
      </g>
      <path d="M38 162h586" />
      <path data-accent d="M632 83v20m-10-10h20" />
      <circle data-accent cx="633" cy="138" r="8" />
    </svg>
  );
}

export function ProductStartSurface({
  locale,
  onCreateTask,
}: {
  locale: ProductPlaygroundLocale;
  onCreateTask: (value: string, context: ProductComposerContext) => void;
}) {
  const zh = locale === "zh";
  const [mode, setMode] = useState("office");
  const [promptPreset, setPromptPreset] = useState({ revision: 0, text: "" });
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityDetail, setActivityDetail] = useState(false);
  const modes = [
    ["office", zh ? "日常办公" : "Everyday work", "coffee"],
    ["code", zh ? "代码开发" : "Development", "code"],
    ["design", zh ? "设计创意" : "Design & creativity", "palette"],
  ] as const;
  const prompts = zh
    ? ([
        ["文档处理", "document"],
        ["金融服务", "finance"],
        ["数据分析及可视化", "chart"],
        ["个人工作台", "workspace"],
        ["幻灯片", "presentation"],
        ["深度研究", "search"],
        ["视频生成", "video"],
        ["产品管理", "product"],
      ] as const)
    : ([
        ["Document processing", "document"],
        ["Financial services", "finance"],
        ["Data analysis & visualization", "chart"],
        ["Personal workspace", "workspace"],
        ["Presentations", "presentation"],
        ["Deep research", "search"],
        ["Video generation", "video"],
        ["Product management", "product"],
      ] as const);

  return (
    <section className="product-start" data-product-surface="start">
      <button
        aria-expanded={activityOpen}
        className="product-start__activity-trigger"
        onClick={() => setActivityOpen((value) => !value)}
        type="button"
      >
        <ProductPlaygroundIcon name="gift" />
        <span>
          {zh ? "完成任务赢体验额度" : "Complete tasks, earn credits"}
        </span>
        <ProductPlaygroundIcon name="chevron" />
      </button>
      {activityOpen ? (
        <aside
          aria-label={zh ? "活动" : "Activity"}
          className="product-start__activity-card"
        >
          <header>
            <strong>
              <ProductPlaygroundIcon name="gift" />
              {zh ? "活动" : "Activity"}
            </strong>
            <button
              aria-label={zh ? "关闭活动" : "Close activity"}
              onClick={() => setActivityOpen(false)}
              type="button"
            >
              <ProductPlaygroundIcon name="close" />
            </button>
          </header>
          <p>
            {activityDetail
              ? zh
                ? "今天完成 1 个任务，即可领取本地运行时体验额度。"
                : "Complete one task today to unlock local runtime credits."
              : zh
                ? "完成今日任务，解锁本地运行时体验额度。"
                : "Complete today’s task and unlock local runtime credits."}
          </p>
          <button
            aria-pressed={activityDetail}
            onClick={() => setActivityDetail((value) => !value)}
            type="button"
          >
            {activityDetail
              ? zh
                ? "收起详情"
                : "Hide details"
              : zh
                ? "查看活动"
                : "View activity"}
          </button>
        </aside>
      ) : null}
      <div className="product-start__content">
        <h1>{zh ? "A3S，我帮你" : "A3S, here to help"}</h1>
        <div aria-label={zh ? "任务类型" : "Task type"} role="tablist">
          {modes.map(([id, label, icon]) => (
            <button
              aria-selected={mode === id}
              key={id}
              onClick={() => {
                setMode(id);
                setPromptPreset((current) => ({
                  revision: current.revision + 1,
                  text: "",
                }));
              }}
              role="tab"
              type="button"
            >
              <ProductPlaygroundIcon name={icon} />
              {label}
            </button>
          ))}
        </div>
        <div className="product-start__prompts">
          {prompts.map(([prompt, icon]) => (
            <button
              aria-pressed={promptPreset.text === prompt}
              key={prompt}
              onClick={() =>
                setPromptPreset((current) => ({
                  revision: current.revision + 1,
                  text: prompt,
                }))
              }
              type="button"
            >
              <ProductPlaygroundIcon name={icon} />
              {prompt}
            </button>
          ))}
        </div>
        <div className="product-start__composer">
          <img alt="" height="58" src={withBase("/logo.png")} width="58" />
          <ProductComposer
            contextual
            initialValue={promptPreset.text}
            key={`${mode}-${promptPreset.revision}`}
            locale={locale}
            onSubmit={onCreateTask}
          />
        </div>
      </div>
    </section>
  );
}

export function ProductAssistantSurface({
  locale,
  onCreateTask,
  onOpenSettings,
}: {
  locale: ProductPlaygroundLocale;
  onCreateTask: (value: string, context: ProductComposerContext) => void;
  onOpenSettings: () => void;
}) {
  const zh = locale === "zh";
  return (
    <section className="product-assistant" data-product-surface="assistant">
      <header>
        <div>
          <h1>{zh ? "本地助理" : "Local assistant"}</h1>
          <span data-ready>
            {zh ? "已连接：" : "Connected:"}
            <strong>
              <i>
                <ProductPlaygroundIcon name="check" />
              </i>
              {zh ? "本地运行时" : "Local runtime"}
            </strong>
          </span>
          <button
            aria-label={zh ? "助理设置" : "Assistant settings"}
            onClick={onOpenSettings}
            type="button"
          >
            <ProductPlaygroundIcon name="settings" />
          </button>
        </div>
      </header>
      <div className="product-assistant__canvas" />
      <div className="product-assistant__composer">
        <ProductComposer
          compact
          locale={locale}
          onSubmit={onCreateTask}
          showPermissions={false}
        />
        <p>
          {zh
            ? "内容由 A3S 生成，请核实重要信息"
            : "Content is generated by A3S. Verify important information."}
        </p>
      </div>
    </section>
  );
}

export function ProductProjectsSurface({
  locale,
  projectHref,
}: {
  locale: ProductPlaygroundLocale;
  projectHref: string;
}) {
  const zh = locale === "zh";
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const projectVisible = (zh ? "A3S UI 体验优化" : "A3S UI experience")
    .toLocaleLowerCase(locale)
    .includes(query.trim().toLocaleLowerCase(locale));
  return (
    <section className="product-projects" data-product-surface="projects">
      <header className="product-projects__hero">
        <div>
          <h1>{zh ? "项目" : "Projects"}</h1>
          <p>
            {zh
              ? "多人协同，打造高效团队"
              : "Bring every role together in one effective team."}
          </p>
          <button
            data-primary
            onClick={() =>
              setNotice(
                zh ? "项目创建流程已准备。" : "Project creation is ready.",
              )
            }
            type="button"
          >
            <ProductPlaygroundIcon name="plus" />
            {zh ? "新建项目" : "New project"}
          </button>
        </div>
        <ProjectDiagram />
      </header>
      <section className="product-projects__owned">
        <div>
          <h2>{zh ? "我的项目" : "My projects"}</h2>
          <label>
            <ProductPlaygroundIcon name="search" />
            <input
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={zh ? "搜索项目" : "Search projects"}
              type="search"
              value={query}
            />
          </label>
        </div>
        {projectVisible ? (
          <Link href={projectHref}>
            <span>
              <ProductPlaygroundIcon name="project" />
            </span>
            <strong>{zh ? "A3S UI 体验优化" : "A3S UI experience"}</strong>
            <small>{zh ? "最近更新 · 今天" : "Updated today"}</small>
            <ProductPlaygroundIcon name="more" />
          </Link>
        ) : (
          <p role="status">{zh ? "没有匹配的项目" : "No matching projects"}</p>
        )}
      </section>
      <section className="product-projects__templates">
        <h2>{zh ? "从模板创建" : "Start from a template"}</h2>
        <div>
          {projectTemplates.map((template) => (
            <button
              aria-pressed={selectedTemplate === template.label.en}
              key={template.label.en}
              onClick={() => {
                setSelectedTemplate(template.label.en);
                setNotice(
                  zh
                    ? `已选择“${template.label.zh}”模板。`
                    : `${template.label.en} template selected.`,
                );
              }}
              type="button"
            >
              <span>
                <ProductPlaygroundIcon name="project" />
              </span>
              <span>
                <strong>{template.label[locale]}</strong>
                <small>{template.description[locale]}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <output aria-live="polite">{notice}</output>
    </section>
  );
}
