import { useMemo, useState, type ReactNode } from "react";
import type { ProductFileEntry } from "./product-file-manager-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import {
  ProductPdfWorkbench,
  ProductPresentationWorkbench,
  ProductSpreadsheetWorkbench,
} from "./ProductFileWorkbenchStructuredSurfaces";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export type ProductFileSurfaceProps = {
  entry: ProductFileEntry;
  locale: ProductPlaygroundLocale;
  mode: "edit" | "preview";
  onChange: (message?: string) => void;
  onStatus: (message: string) => void;
};

export function ProductFileWorkbenchSurface(props: ProductFileSurfaceProps) {
  if (props.entry.workbench === "document") {
    return <ProductDocumentWorkbench {...props} />;
  }
  if (props.entry.workbench === "spreadsheet") {
    return <ProductSpreadsheetWorkbench {...props} />;
  }
  if (props.entry.workbench === "presentation") {
    return <ProductPresentationWorkbench {...props} />;
  }
  if (props.entry.workbench === "pdf") {
    return <ProductPdfWorkbench {...props} />;
  }
  return <ProductCodeWorkbench {...props} />;
}

function ProductCodeWorkbench({
  entry,
  locale,
  mode,
  onChange,
  onStatus,
}: ProductFileSurfaceProps) {
  const zh = locale === "zh";
  const markdown = /\.mdx?$/i.test(entry.name);
  const [draft, setDraft] = useState(() => codeFixture(entry, locale));
  const [findOpen, setFindOpen] = useState(false);
  const lines = useMemo(() => draft.split("\n"), [draft]);

  return (
    <section className="product-code-workbench" data-file-surface>
      <header data-code-toolbar>
        <span>
          <ProductPlaygroundIcon name="code" />
          {markdown ? "Markdown" : entry.type}
        </span>
        <div>
          <button onClick={() => setFindOpen((value) => !value)} type="button">
            <ProductPlaygroundIcon name="search" />
            {zh ? "查找" : "Find"}
          </button>
          <button
            onClick={() =>
              onStatus(zh ? "格式检查通过" : "Formatting check passed")
            }
            type="button"
          >
            <ProductPlaygroundIcon name="checklist" />
            {zh ? "格式化" : "Format"}
          </button>
          <button
            onClick={() =>
              onStatus(zh ? "已定位到相关定义" : "Related definition located")
            }
            type="button"
          >
            <ProductPlaygroundIcon name="link" />
            {zh ? "定义" : "Definition"}
          </button>
        </div>
      </header>
      {findOpen ? (
        <form data-code-find onSubmit={(event) => event.preventDefault()}>
          <ProductPlaygroundIcon name="search" />
          <input
            aria-label={zh ? "在文件中查找" : "Find in file"}
            autoFocus
            placeholder={zh ? "在当前文件中查找" : "Find in current file"}
          />
          <small>1 / 3</small>
          <button
            aria-label={zh ? "关闭查找" : "Close find"}
            onClick={() => setFindOpen(false)}
            type="button"
          >
            <ProductPlaygroundIcon name="close" />
          </button>
        </form>
      ) : null}
      <nav aria-label={zh ? "打开的文件" : "Open files"} data-code-tabs>
        <button aria-selected="true" role="tab" type="button">
          <ProductPlaygroundIcon name={markdown ? "document" : "code"} />
          {entry.name}
          <i aria-label={zh ? "有本地更改" : "Has local changes"} />
        </button>
      </nav>
      <div data-code-canvas data-mode={mode}>
        {mode === "edit" ? (
          <>
            <ol aria-hidden="true" data-code-lines>
              {lines.map((_, index) => (
                <li key={index}>{index + 1}</li>
              ))}
            </ol>
            <textarea
              aria-label={zh ? `编辑 ${entry.name}` : `Edit ${entry.name}`}
              onChange={(event) => {
                setDraft(event.currentTarget.value);
                onChange(zh ? "代码已修改" : "Code changed");
              }}
              spellCheck={false}
              value={draft}
            />
          </>
        ) : markdown ? (
          <article data-markdown-preview>
            <span>{zh ? "实时预览" : "Live preview"}</span>
            <h1>{zh ? "发布就绪" : "Release readiness"}</h1>
            <p>
              {zh
                ? "公开契约必须在源码、适配器、文档和浏览器证据之间保持一致。"
                : "Public contracts must agree across source, adapters, documentation, and browser evidence."}
            </p>
            <h2>{zh ? "验收清单" : "Acceptance checklist"}</h2>
            <ul>
              <li>{zh ? "首次导航可点击" : "First navigation is clickable"}</li>
              <li>
                {zh ? "所有浮层保持在可见层" : "Every overlay remains visible"}
              </li>
              <li>
                {zh
                  ? "桌面与移动证据已关联"
                  : "Desktop and mobile evidence is linked"}
              </li>
            </ul>
            <pre>
              <code>{"npm --prefix site run check:site"}</code>
            </pre>
          </article>
        ) : (
          <pre data-code-preview>
            <code>
              {lines.map((line, index) => (
                <span key={index}>
                  {highlightCode(line)}
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
        )}
      </div>
      <footer data-code-status>
        <span>
          {lines.length} {zh ? "行" : "lines"}
        </span>
        <span>UTF-8</span>
        <span>LF</span>
        <span>{zh ? "代码导航就绪" : "Code navigation ready"}</span>
      </footer>
    </section>
  );
}

function ProductDocumentWorkbench({
  locale,
  mode,
  onChange,
  onStatus,
}: ProductFileSurfaceProps) {
  const zh = locale === "zh";
  const [activeTab, setActiveTab] = useState<
    "home" | "insert" | "layout" | "review"
  >("home");
  const tabs = [
    ["home", zh ? "开始" : "Home"],
    ["insert", zh ? "插入" : "Insert"],
    ["layout", zh ? "布局" : "Layout"],
    ["review", zh ? "审阅" : "Review"],
  ] as const;
  const tools = {
    home: [
      zh ? "正文" : "Body",
      zh ? "标题 1" : "Heading 1",
      zh ? "加粗" : "Bold",
      zh ? "项目符号" : "Bullets",
      zh ? "对齐" : "Align",
    ],
    insert: [
      zh ? "表格" : "Table",
      zh ? "图片" : "Image",
      zh ? "链接" : "Link",
      zh ? "引用" : "Citation",
      zh ? "分页" : "Page break",
    ],
    layout: [
      zh ? "页边距" : "Margins",
      zh ? "方向" : "Orientation",
      zh ? "分栏" : "Columns",
      zh ? "页眉" : "Header",
      zh ? "页码" : "Page number",
    ],
    review: [
      zh ? "批注" : "Comment",
      zh ? "修订" : "Track changes",
      zh ? "比较" : "Compare",
      zh ? "拼写" : "Spelling",
      zh ? "朗读" : "Read aloud",
    ],
  };

  return (
    <section
      className="product-document-workbench"
      data-file-surface
      data-preview={mode === "preview" ? "true" : undefined}
    >
      <header data-office-ribbon>
        <nav aria-label={zh ? "文档工具" : "Document tools"} role="tablist">
          {tabs.map(([id, label]) => (
            <button
              aria-selected={activeTab === id}
              key={id}
              onClick={() => setActiveTab(id)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
        <div role="toolbar">
          {tools[activeTab].map((tool, index) => (
            <button
              key={tool}
              onClick={() => {
                onChange(zh ? `已使用“${tool}”` : `${tool} applied`);
                onStatus(zh ? `已应用“${tool}”` : `${tool} applied`);
              }}
              type="button"
            >
              {index === 0 && activeTab !== "home" ? (
                <ProductPlaygroundIcon
                  name={
                    activeTab === "insert"
                      ? "plus"
                      : activeTab === "layout"
                        ? "document"
                        : "edit"
                  }
                />
              ) : null}
              {tool}
            </button>
          ))}
        </div>
      </header>
      <div data-document-layout>
        <aside aria-label={zh ? "页面" : "Pages"}>
          <strong>{zh ? "页面" : "Pages"}</strong>
          <button aria-current="page" type="button">
            <span data-page-thumbnail>
              <i />
              <i />
              <i />
              <i />
            </span>
            <small>1</small>
          </button>
          <button type="button">
            <span data-page-thumbnail>
              <i />
              <i />
              <i />
            </span>
            <small>2</small>
          </button>
        </aside>
        <main data-document-stage>
          <article
            aria-label={zh ? "文档第 1 页" : "Document page 1"}
            data-document-page
          >
            <header>
              <span>A3S / PRODUCT EXPERIENCE</span>
              <small>{zh ? "内部评审" : "Internal review"}</small>
            </header>
            <h1
              contentEditable={mode === "edit"}
              onInput={() => onChange()}
              suppressContentEditableWarning
            >
              {zh ? "产品体验验收说明" : "Product experience acceptance brief"}
            </h1>
            <p
              data-lead
              contentEditable={mode === "edit"}
              onInput={() => onChange()}
              suppressContentEditableWarning
            >
              {zh
                ? "把工作台体验从“看起来完整”推进到“每个关键路径都能验证、恢复和交付”。"
                : "Move the workspace from looking complete to making every critical path verifiable, recoverable, and shippable."}
            </p>
            <section>
              <h2>{zh ? "成功标准" : "Success criteria"}</h2>
              <ol>
                <li>
                  <strong>{zh ? "首次交互" : "First interaction"}</strong>
                  <span>
                    {zh
                      ? "导航、二级菜单和输入器在首屏即可操作。"
                      : "Navigation, submenus, and the composer work on first paint."}
                  </span>
                </li>
                <li>
                  <strong>{zh ? "完整上下文" : "Complete context"}</strong>
                  <span>
                    {zh
                      ? "工作区文件、技能、模型与权限在发送前可确认。"
                      : "Workspace files, skills, model, and permissions are reviewable before sending."}
                  </span>
                </li>
                <li>
                  <strong>{zh ? "可恢复交付" : "Recoverable delivery"}</strong>
                  <span>
                    {zh
                      ? "失败步骤、版本、产物和测试证据都能追溯。"
                      : "Failed steps, versions, artifacts, and test evidence remain traceable."}
                  </span>
                </li>
              </ol>
            </section>
            <aside data-document-callout>
              <ProductPlaygroundIcon name="warning" />
              <div>
                <strong>{zh ? "待补证据" : "Evidence required"}</strong>
                <p>
                  {zh
                    ? "移动端 200% 缩放与键盘焦点顺序仍需视觉验收。"
                    : "Mobile 200% zoom and keyboard focus order still need visual evidence."}
                </p>
              </div>
            </aside>
            <section data-document-decision>
              <h2>{zh ? "产品决策" : "Product decision"}</h2>
              <p>
                {zh
                  ? "文件编辑从文件入口进入；它服务于任务结果，不成为独立产品分区。"
                  : "File editing begins from Files. It serves task outcomes and does not become a separate product section."}
              </p>
            </section>
            <footer>
              <span>
                {zh ? "负责人：产品体验组" : "Owner: Product Experience"}
              </span>
              <span>1 / 2</span>
            </footer>
          </article>
        </main>
        <aside data-document-review>
          <header>
            <strong>{zh ? "审阅" : "Review"}</strong>
            <span>2</span>
          </header>
          <article>
            <span>M</span>
            <div>
              <strong>Mina</strong>
              <small>{zh ? "今天 10:18" : "Today 10:18"}</small>
              <p>
                {zh
                  ? "成功标准需要对应真实测试证据。"
                  : "Each success criterion needs real test evidence."}
              </p>
              <button
                onClick={() =>
                  onStatus(
                    zh ? "批注已标记为已解决" : "Comment marked resolved",
                  )
                }
                type="button"
              >
                {zh ? "解决" : "Resolve"}
              </button>
            </div>
          </article>
          <article>
            <span>R</span>
            <div>
              <strong>Rui</strong>
              <small>{zh ? "今天 09:42" : "Today 09:42"}</small>
              <p>
                {zh
                  ? "保留从快速查看进入编辑器的路径。"
                  : "Keep the path from Quick Look into the editor."}
              </p>
            </div>
          </article>
        </aside>
      </div>
      <footer data-office-status>
        <span>{zh ? "第 1 页，共 2 页" : "Page 1 of 2"}</span>
        <span>{zh ? "428 个字" : "428 words"}</span>
        <span>{zh ? "简体中文" : "English (US)"}</span>
        <span>100%</span>
      </footer>
    </section>
  );
}

function codeFixture(entry: ProductFileEntry, locale: ProductPlaygroundLocale) {
  if (/\.mdx?$/i.test(entry.name)) {
    return locale === "zh"
      ? "# 发布就绪\n\n公开契约必须在源码、适配器、文档和浏览器证据之间保持一致。\n\n## 验收清单\n\n- [x] 首次导航可点击\n- [x] 所有浮层保持在可见层\n- [ ] 关联桌面与移动证据\n\n```bash\nnpm --prefix site run check:site\n```"
      : "# Release readiness\n\nPublic contracts must agree across source, adapters, documentation, and browser evidence.\n\n## Acceptance checklist\n\n- [x] First navigation is clickable\n- [x] Every overlay remains visible\n- [ ] Link desktop and mobile evidence\n\n```bash\nnpm --prefix site run check:site\n```";
  }
  return ".product-composer {\n  position: relative;\n  display: grid;\n  min-width: 0;\n  overflow: visible;\n}\n\n.product-composer [data-overlay] {\n  position: fixed;\n  z-index: var(--ui-layer-popover);\n  inset: auto;\n}\n\n.product-composer:focus-within {\n  border-color: var(--ui-blue);\n}";
}

function highlightCode(line: string): ReactNode {
  const pieces = line.split(
    /("[^"]*"|'[^']*'|\/\/.*$|#[0-9a-fA-F]{3,8}|\b(?:const|let|var|function|return|display|position|overflow|z-index|inset|border-color)\b|\b\d+(?:\.\d+)?\b)/g,
  );
  return pieces.map((piece, index) => {
    const className = /^['"]/.test(piece)
      ? "token-string"
      : /^\/\//.test(piece)
        ? "token-comment"
        : /^#/.test(piece)
          ? "token-number"
          : /^(?:const|let|var|function|return|display|position|overflow|z-index|inset|border-color)$/.test(
                piece,
              )
            ? "token-keyword"
            : /^\d/.test(piece)
              ? "token-number"
              : undefined;
    return (
      <span className={className} key={`${piece}-${index}`}>
        {piece}
      </span>
    );
  });
}
