import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { withBase } from "@rspress/core/runtime";
import { Link } from "@rspress/core/theme";
import {
  projectTemplates,
  type ProductPlaygroundLocale,
} from "./product-playground-data";
import { productProjectName } from "./product-project-data";
import {
  ProductComposer,
  type ProductComposerContext,
} from "./ProductComposer";
import type { ProductTaskDraft } from "./product-composer-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductStartSurface({
  initialDraft,
  locale,
  onCreateTask,
  onOpenModelSettings,
}: {
  initialDraft?: ProductTaskDraft | null;
  locale: ProductPlaygroundLocale;
  onCreateTask: (value: string, context: ProductComposerContext) => void;
  onOpenModelSettings: () => void;
}) {
  const zh = locale === "zh";
  const [mode, setMode] = useState<"code" | "design" | "office">("office");
  const [promptPreset, setPromptPreset] = useState({
    revision: initialDraft?.revision ?? 0,
    text: initialDraft?.prompt ?? "",
  });
  const modeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const modes = [
    ["office", zh ? "日常办公" : "Everyday work", "coffee"],
    ["code", zh ? "代码开发" : "Development", "code"],
    ["design", zh ? "设计创意" : "Design & creativity", "palette"],
  ] as const;
  const promptGroups = {
    office: zh
      ? ([
          ["文档处理", "document"],
          ["金融服务", "finance"],
          ["数据分析及可视化", "chart"],
          ["个人工作台", "workspace"],
          ["幻灯片", "presentation"],
          ["深度研究", "search"],
          ["产品管理", "project"],
          ["知识整理", "knowledge"],
        ] as const)
      : ([
          ["Document processing", "document"],
          ["Financial services", "finance"],
          ["Data analysis & visualization", "chart"],
          ["Personal workspace", "workspace"],
          ["Presentations", "presentation"],
          ["Deep research", "search"],
          ["Product management", "project"],
          ["Knowledge organization", "knowledge"],
        ] as const),
    code: zh
      ? ([
          ["理解代码库", "search"],
          ["实现产品功能", "code"],
          ["修复缺陷", "checklist"],
          ["运行测试", "report"],
          ["审查变更", "shield"],
          ["依赖图谱", "project"],
          ["代码预览", "workspace"],
          ["发布评审", "report"],
        ] as const)
      : ([
          ["Understand a codebase", "search"],
          ["Build a product feature", "code"],
          ["Fix a defect", "checklist"],
          ["Run tests", "report"],
          ["Review changes", "shield"],
          ["Map dependencies", "project"],
          ["Preview changes", "workspace"],
          ["Review a release", "report"],
        ] as const),
    design: zh
      ? ([
          ["界面评审", "palette"],
          ["交互原型", "product"],
          ["设备预览", "workspace"],
          ["无障碍检查", "shield"],
          ["内容结构", "document"],
          ["设计验收", "checklist"],
          ["交付标注", "document"],
          ["设计系统", "project"],
        ] as const)
      : ([
          ["Interface review", "palette"],
          ["Interaction prototype", "product"],
          ["Device preview", "workspace"],
          ["Accessibility check", "shield"],
          ["Content structure", "document"],
          ["Design acceptance", "checklist"],
          ["Delivery annotations", "document"],
          ["Design systems", "project"],
        ] as const),
  };
  const prompts = promptGroups[mode];

  useEffect(() => {
    if (!initialDraft) return;
    setPromptPreset({
      revision: initialDraft.revision,
      text: initialDraft.prompt,
    });
  }, [initialDraft]);

  const selectMode = (nextMode: typeof mode) => {
    setMode(nextMode);
    setPromptPreset((current) => ({
      revision: current.revision + 1,
      text: "",
    }));
  };

  const handleModeKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % modes.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + modes.length) % modes.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = modes.length - 1;
    }
    if (nextIndex === undefined) return;
    const nextMode = modes[nextIndex];
    if (!nextMode) return;
    event.preventDefault();
    selectMode(nextMode[0]);
    modeRefs.current[nextIndex]?.focus();
  };

  const setPrompt = (text: string) =>
    setPromptPreset((current) => ({
      revision: current.revision + 1,
      text,
    }));

  return (
    <section className="product-start" data-product-surface="start">
      <div className="product-start__content">
        <h1>{zh ? "A3S，我帮你" : "A3S, here to help"}</h1>
        <div aria-label={zh ? "任务类型" : "Task type"} role="tablist">
          {modes.map(([id, label, icon], index) => (
            <button
              aria-controls={`product-start-prompts-${id}`}
              aria-selected={mode === id}
              id={`product-start-mode-${id}`}
              key={id}
              onClick={() => selectMode(id)}
              onKeyDown={(event) => handleModeKeyDown(event, index)}
              ref={(node) => {
                modeRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={mode === id ? 0 : -1}
              type="button"
            >
              <ProductPlaygroundIcon name={icon} />
              {label}
            </button>
          ))}
        </div>
        <div
          aria-labelledby={`product-start-mode-${mode}`}
          className="product-start__prompts"
          id={`product-start-prompts-${mode}`}
          role="tabpanel"
        >
          {prompts.map(([prompt, icon]) => (
            <button
              aria-pressed={promptPreset.text === prompt}
              key={prompt}
              onClick={() => setPrompt(prompt)}
              type="button"
            >
              <ProductPlaygroundIcon name={icon} />
              {prompt}
            </button>
          ))}
        </div>
        <div className="product-start__composer">
          <ProductComposer
            contextual
            initialResources={initialDraft?.resources}
            initialWorkspace={initialDraft?.workspace ?? "ui"}
            initialValue={promptPreset.text}
            key={`${mode}-${promptPreset.revision}-${initialDraft?.revision ?? "direct"}`}
            locale={locale}
            onConfigureModels={onOpenModelSettings}
            onSubmit={onCreateTask}
          />
        </div>
        <p className="product-start__assurance">
          <ProductPlaygroundIcon name="shield" />
          {zh
            ? "任务在本地工作区中执行，文件变更会遵循当前权限边界。"
            : "Tasks run in the local workspace and file changes follow the current permission boundary."}
        </p>
      </div>
    </section>
  );
}

export function ProductAssistantSurface({
  filesHref,
  locale,
  onCreateTask,
  onOpenModelSettings,
  onOpenSettings,
}: {
  filesHref: string;
  locale: ProductPlaygroundLocale;
  onCreateTask: (value: string, context: ProductComposerContext) => void;
  onOpenModelSettings: () => void;
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
          <Link
            aria-label={zh ? "打开文件" : "Open files"}
            href={filesHref}
            title={zh ? "打开文件" : "Open files"}
          >
            <ProductPlaygroundIcon name="folder" />
          </Link>
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
          onConfigureModels={onOpenModelSettings}
          onSubmit={onCreateTask}
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
  const projectVisible = productProjectName[locale]
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
        <figure aria-hidden="true">
          <img
            alt=""
            height="400"
            src={withBase("/assets/images/project-collaboration.png")}
            width="1200"
          />
        </figure>
      </header>
      <section className="product-projects__owned">
        <div>
          <h2>{zh ? "我的项目" : "My projects"}</h2>
          <label data-focus-owner="container">
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={zh ? "搜索项目" : "Search projects"}
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
            <strong>{productProjectName[locale]}</strong>
            <small>{zh ? "最近更新 · 今天" : "Updated today"}</small>
            <ProductPlaygroundIcon data-project-destination name="arrow" />
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
