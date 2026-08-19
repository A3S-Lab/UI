import { useState } from "react";
import type { ProductFileSurfaceProps } from "./ProductFileWorkbenchSurfaces";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

const scoreRows = [
  ["Navigation", "First click", "Passed", "Mina", "98"],
  ["Composer", "Context controls", "Passed", "Rui", "96"],
  ["Overlays", "Viewport collision", "Needs review", "Mina", "74"],
  ["Responsive", "390 × 844", "Needs review", "Unassigned", "68"],
  ["Accessibility", "Keyboard order", "In progress", "Rui", "82"],
  ["Visual", "Desktop evidence", "Passed", "Automation", "94"],
] as const;

export function ProductSpreadsheetWorkbench({
  locale,
  mode,
  onChange,
  onStatus,
}: ProductFileSurfaceProps) {
  const zh = locale === "zh";
  const [activeCell, setActiveCell] = useState("E4");
  const [activeTab, setActiveTab] = useState<
    "home" | "insert" | "data" | "review"
  >("home");
  const [formula, setFormula] = useState("=AVERAGE(E2:E7)");
  const tabs = [
    ["home", zh ? "开始" : "Home"],
    ["insert", zh ? "插入" : "Insert"],
    ["data", zh ? "数据" : "Data"],
    ["review", zh ? "审阅" : "Review"],
  ] as const;
  const tools = {
    home: [
      zh ? "粘贴" : "Paste",
      zh ? "字体" : "Font",
      zh ? "边框" : "Borders",
      zh ? "对齐" : "Align",
      zh ? "百分比" : "Percent",
    ],
    insert: [
      zh ? "表格" : "Table",
      zh ? "图表" : "Chart",
      zh ? "透视表" : "Pivot",
      zh ? "链接" : "Link",
    ],
    data: [
      zh ? "排序" : "Sort",
      zh ? "筛选" : "Filter",
      zh ? "分列" : "Text to columns",
      zh ? "数据验证" : "Validation",
    ],
    review: [
      zh ? "批注" : "Comment",
      zh ? "保护" : "Protect",
      zh ? "更改记录" : "Changes",
      zh ? "检查" : "Inspect",
    ],
  };

  return (
    <section
      className="product-spreadsheet-workbench"
      data-file-surface
      data-preview={mode === "preview" ? "true" : undefined}
    >
      <header data-office-ribbon>
        <nav aria-label={zh ? "表格工具" : "Spreadsheet tools"} role="tablist">
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
          {tools[activeTab].map((tool) => (
            <button
              key={tool}
              onClick={() => {
                onChange();
                onStatus(zh ? `已应用“${tool}”` : `${tool} applied`);
              }}
              type="button"
            >
              {tool}
            </button>
          ))}
        </div>
      </header>
      <div data-formula-bar>
        <label>
          <span className="sr-only">{zh ? "当前单元格" : "Current cell"}</span>
          <input readOnly value={activeCell} />
        </label>
        <strong>ƒx</strong>
        <label>
          <span className="sr-only">{zh ? "公式" : "Formula"}</span>
          <input
            onChange={(event) => {
              setFormula(event.currentTarget.value);
              onChange();
            }}
            readOnly={mode === "preview"}
            value={formula}
          />
        </label>
      </div>
      <div data-spreadsheet-layout>
        <main data-spreadsheet-grid>
          <table
            aria-label={zh ? "质量验收评分表" : "Quality acceptance scorecard"}
          >
            <thead>
              <tr>
                <th />
                <th>A</th>
                <th>B</th>
                <th>C</th>
                <th>D</th>
                <th>E</th>
              </tr>
            </thead>
            <tbody>
              <tr data-heading>
                <th>1</th>
                <td>{zh ? "领域" : "Area"}</td>
                <td>{zh ? "验收项" : "Check"}</td>
                <td>{zh ? "状态" : "Status"}</td>
                <td>{zh ? "负责人" : "Owner"}</td>
                <td>{zh ? "评分" : "Score"}</td>
              </tr>
              {scoreRows.map((row, rowIndex) => (
                <tr key={row[0]}>
                  <th>{rowIndex + 2}</th>
                  {row.map((cell, columnIndex) => {
                    const cellId = `${String.fromCharCode(65 + columnIndex)}${rowIndex + 2}`;
                    return (
                      <td
                        aria-selected={activeCell === cellId}
                        data-status={
                          columnIndex === 2
                            ? cell.toLocaleLowerCase().replaceAll(" ", "-")
                            : undefined
                        }
                        key={cellId}
                        onClick={() => {
                          setActiveCell(cellId);
                          setFormula(columnIndex === 4 ? cell : `="${cell}"`);
                        }}
                      >
                        {translateScoreCell(cell, locale)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr data-summary>
                <th>8</th>
                <td colSpan={4}>
                  {zh ? "平均质量评分" : "Average quality score"}
                </td>
                <td
                  aria-selected={activeCell === "E8"}
                  onClick={() => {
                    setActiveCell("E8");
                    setFormula("=AVERAGE(E2:E7)");
                  }}
                >
                  85.3
                </td>
              </tr>
            </tbody>
          </table>
        </main>
        <aside data-spreadsheet-insights>
          <header>
            <ProductPlaygroundIcon name="chart" />
            <div>
              <strong>{zh ? "质量概览" : "Quality overview"}</strong>
              <small>{zh ? "6 个验收域" : "6 acceptance areas"}</small>
            </div>
          </header>
          <figure aria-label={zh ? "质量评分 85" : "Quality score 85"}>
            <svg viewBox="0 0 120 70">
              <path d="M12 58 C30 49 37 54 51 38 S75 33 84 22 101 21 108 10" />
              <path d="M12 58H108" />
            </svg>
            <figcaption>
              <strong>85</strong>
              <span>/ 100</span>
            </figcaption>
          </figure>
          <dl>
            <div>
              <dt>{zh ? "已通过" : "Passed"}</dt>
              <dd>3</dd>
            </div>
            <div>
              <dt>{zh ? "需复核" : "Needs review"}</dt>
              <dd>2</dd>
            </div>
            <div>
              <dt>{zh ? "进行中" : "In progress"}</dt>
              <dd>1</dd>
            </div>
          </dl>
          <button
            onClick={() =>
              onStatus(
                zh ? "已筛选待复核项目" : "Filtered to items needing review",
              )
            }
            type="button"
          >
            <ProductPlaygroundIcon name="filter" />
            {zh ? "查看待复核项" : "Show review items"}
          </button>
        </aside>
      </div>
      <footer data-sheet-tabs>
        <button aria-label={zh ? "新建工作表" : "New sheet"} type="button">
          <ProductPlaygroundIcon name="plus" />
        </button>
        <button aria-current="page" type="button">
          {zh ? "发布评分" : "Release score"}
        </button>
        <button type="button">{zh ? "原始证据" : "Raw evidence"}</button>
        <span>
          {zh ? "平均值：85.3 · 计数：6" : "Average: 85.3 · Count: 6"}
        </span>
      </footer>
    </section>
  );
}

export function ProductPresentationWorkbench({
  locale,
  mode,
  onChange,
  onStatus,
}: ProductFileSurfaceProps) {
  const zh = locale === "zh";
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "home" | "insert" | "design" | "transitions"
  >("home");
  const slides = [
    {
      kicker: "A3S UI",
      title: zh
        ? "让每个关键路径都经得起验收"
        : "Make every critical path stand up to acceptance",
      type: "cover",
    },
    {
      kicker: zh ? "用户影响" : "USER IMPACT",
      title: zh
        ? "细节问题会累积成信任问题"
        : "Small interaction defects become trust defects",
      type: "evidence",
    },
    {
      kicker: zh ? "产品结构" : "PRODUCT STRUCTURE",
      title: zh ? "一个工作台，一条清晰路径" : "One workspace, one clear path",
      type: "structure",
    },
    {
      kicker: zh ? "发布标准" : "RELEASE BAR",
      title: zh
        ? "以证据结束，而不是以实现结束"
        : "Finish with evidence, not implementation",
      type: "metrics",
    },
  ] as const;
  const tabs = [
    ["home", zh ? "开始" : "Home"],
    ["insert", zh ? "插入" : "Insert"],
    ["design", zh ? "设计" : "Design"],
    ["transitions", zh ? "切换" : "Transitions"],
  ] as const;
  const selected = slides[activeSlide]!;

  return (
    <section
      className="product-presentation-workbench"
      data-file-surface
      data-preview={mode === "preview" ? "true" : undefined}
    >
      <header data-office-ribbon>
        <nav
          aria-label={zh ? "演示文稿工具" : "Presentation tools"}
          role="tablist"
        >
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
          <button
            onClick={() => onStatus(zh ? "已添加文本框" : "Text box added")}
            type="button"
          >
            {zh ? "文本框" : "Text box"}
          </button>
          <button
            onClick={() =>
              onStatus(zh ? "已打开布局选择" : "Layout chooser opened")
            }
            type="button"
          >
            {zh ? "布局" : "Layout"}
          </button>
          <button
            onClick={() => {
              onChange();
              onStatus(zh ? "已应用主题" : "Theme applied");
            }}
            type="button"
          >
            {zh ? "主题" : "Theme"}
          </button>
          <button
            onClick={() =>
              onStatus(
                zh ? "正在从当前页播放" : "Presenting from current slide",
              )
            }
            type="button"
          >
            <ProductPlaygroundIcon name="presentation" />
            {zh ? "从当前页播放" : "Present"}
          </button>
        </div>
      </header>
      <div data-presentation-layout>
        <aside aria-label={zh ? "幻灯片" : "Slides"}>
          {slides.map((slide, index) => (
            <button
              aria-current={activeSlide === index ? "page" : undefined}
              key={slide.title}
              onClick={() => setActiveSlide(index)}
              type="button"
            >
              <small>{index + 1}</small>
              <span data-slide-mini data-type={slide.type}>
                <i>{slide.kicker}</i>
                <strong>{slide.title}</strong>
              </span>
            </button>
          ))}
          <button
            data-add-slide
            onClick={() =>
              onStatus(
                zh
                  ? "已在当前页后添加新页"
                  : "New slide added after current slide",
              )
            }
            type="button"
          >
            <ProductPlaygroundIcon name="plus" />
            {zh ? "新建幻灯片" : "New slide"}
          </button>
        </aside>
        <main data-presentation-stage>
          <article data-slide-canvas data-type={selected.type}>
            <header>
              <span>{selected.kicker}</span>
              <small>0{activeSlide + 1}</small>
            </header>
            <h1
              contentEditable={mode === "edit"}
              onInput={() => onChange()}
              suppressContentEditableWarning
            >
              {selected.title}
            </h1>
            {selected.type === "cover" ? (
              <>
                <p>
                  {zh
                    ? "统一输入、执行、文件、证据与恢复体验"
                    : "One coherent experience for input, execution, files, evidence, and recovery"}
                </p>
                <div data-slide-orbit>
                  <i />
                  <i />
                  <i />
                  <span>A3S</span>
                </div>
              </>
            ) : null}
            {selected.type === "evidence" ? (
              <div data-slide-evidence>
                <section>
                  <strong>07</strong>
                  <span>
                    {zh ? "关键交互缺陷" : "critical interaction defects"}
                  </span>
                </section>
                <section>
                  <strong>03</strong>
                  <span>{zh ? "首次访问阻断" : "first-visit blockers"}</span>
                </section>
                <section>
                  <strong>02</strong>
                  <span>{zh ? "缺失的视觉证据" : "missing visual proofs"}</span>
                </section>
              </div>
            ) : null}
            {selected.type === "structure" ? (
              <div data-slide-flow>
                <span>{zh ? "任务" : "Task"}</span>
                <i />
                <span>{zh ? "上下文" : "Context"}</span>
                <i />
                <span>{zh ? "执行" : "Execution"}</span>
                <i />
                <span>{zh ? "交付" : "Delivery"}</span>
              </div>
            ) : null}
            {selected.type === "metrics" ? (
              <div data-slide-metrics>
                <section>
                  <strong>100%</strong>
                  <span>
                    {zh ? "关键路由可访问" : "critical routes accessible"}
                  </span>
                </section>
                <section>
                  <strong>2×</strong>
                  <span>
                    {zh ? "视觉验收视口" : "visual acceptance viewports"}
                  </span>
                </section>
                <section>
                  <strong>0</strong>
                  <span>{zh ? "被遮挡浮层" : "obscured overlays"}</span>
                </section>
              </div>
            ) : null}
            <footer>
              <span>A3S LAB</span>
              <span>{zh ? "产品体验评审" : "Product experience review"}</span>
            </footer>
          </article>
          <label data-speaker-notes>
            <span>{zh ? "演讲者备注" : "Speaker notes"}</span>
            <textarea
              onChange={() => onChange()}
              placeholder={zh ? "添加演讲者备注…" : "Add speaker notes…"}
              readOnly={mode === "preview"}
              value={
                zh
                  ? "强调验收标准来自真实用户路径，而不是组件数量。"
                  : "Emphasize that acceptance follows real user journeys, not component count."
              }
            />
          </label>
        </main>
      </div>
      <footer data-office-status>
        <span>
          {zh
            ? `第 ${activeSlide + 1} 页，共 ${slides.length} 页`
            : `Slide ${activeSlide + 1} of ${slides.length}`}
        </span>
        <span>{zh ? "已检查可访问性" : "Accessibility checked"}</span>
        <span>16:9</span>
        <span>82%</span>
      </footer>
    </section>
  );
}

export function ProductPdfWorkbench({
  locale,
  onStatus,
}: ProductFileSurfaceProps) {
  const zh = locale === "zh";
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(90);
  const pages = [
    zh ? "执行摘要" : "Executive summary",
    zh ? "桌面端证据" : "Desktop evidence",
    zh ? "移动端证据" : "Mobile evidence",
    zh ? "可访问性" : "Accessibility",
  ];

  return (
    <section className="product-pdf-workbench" data-file-surface>
      <header data-pdf-toolbar>
        <div>
          <button
            aria-label={zh ? "上一页" : "Previous page"}
            disabled={page === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            <ProductPlaygroundIcon name="back" />
          </button>
          <label>
            <input
              aria-label={zh ? "页码" : "Page number"}
              onChange={(event) =>
                setPage(
                  Math.min(
                    pages.length,
                    Math.max(1, Number(event.currentTarget.value) || 1),
                  ),
                )
              }
              type="number"
              value={page}
            />
            <span>/ {pages.length}</span>
          </label>
          <button
            aria-label={zh ? "下一页" : "Next page"}
            disabled={page === pages.length}
            onClick={() =>
              setPage((value) => Math.min(pages.length, value + 1))
            }
            type="button"
          >
            <ProductPlaygroundIcon name="forward" />
          </button>
        </div>
        <label data-pdf-search>
          <ProductPlaygroundIcon name="search" />
          <input
            aria-label={zh ? "在 PDF 中查找" : "Find in PDF"}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={zh ? "在文档中查找" : "Find in document"}
            type="search"
            value={query}
          />
          {query ? <small>2</small> : null}
        </label>
        <div>
          <button
            aria-label={zh ? "缩小" : "Zoom out"}
            onClick={() => setZoom((value) => Math.max(50, value - 10))}
            type="button"
          >
            −
          </button>
          <span>{zoom}%</span>
          <button
            aria-label={zh ? "放大" : "Zoom in"}
            onClick={() => setZoom((value) => Math.min(160, value + 10))}
            type="button"
          >
            +
          </button>
          <button
            onClick={() =>
              onStatus(zh ? "打印预览已准备" : "Print preview prepared")
            }
            type="button"
          >
            <ProductPlaygroundIcon name="document" />
            {zh ? "打印" : "Print"}
          </button>
          <button
            onClick={() => onStatus(zh ? "下载已准备" : "Download prepared")}
            type="button"
          >
            <ProductPlaygroundIcon name="download" />
            {zh ? "下载" : "Download"}
          </button>
        </div>
      </header>
      <div data-pdf-layout>
        <aside aria-label={zh ? "页面缩略图" : "Page thumbnails"}>
          {pages.map((title, index) => (
            <button
              aria-current={page === index + 1 ? "page" : undefined}
              key={title}
              onClick={() => setPage(index + 1)}
              type="button"
            >
              <span data-pdf-thumbnail>
                <i />
                <strong>{index + 1}</strong>
                <em>{title}</em>
              </span>
              <small>{index + 1}</small>
            </button>
          ))}
        </aside>
        <main data-pdf-stage>
          <article
            data-pdf-page
            style={{ "--pdf-zoom": zoom / 100 } as React.CSSProperties}
          >
            <header>
              <span>A3S TEST EVIDENCE</span>
              <small>0{page}</small>
            </header>
            <h1>{pages[page - 1]}</h1>
            {page === 1 ? (
              <>
                <p data-lead>
                  {zh
                    ? "核心任务路径已完成桌面与移动端视觉验收，剩余风险集中在焦点顺序与高倍缩放。"
                    : "Critical task paths passed desktop and mobile visual review. Remaining risk is concentrated in focus order and high zoom."}
                </p>
                <section data-pdf-score>
                  <strong>92</strong>
                  <span>{zh ? "体验就绪分" : "experience readiness"}</span>
                  <div>
                    <i style={{ width: "92%" }} />
                  </div>
                </section>
                <h2>{zh ? "验收结论" : "Acceptance decision"}</h2>
                <ul>
                  <li>
                    {zh
                      ? "首次访问导航已恢复"
                      : "First-visit navigation is restored"}
                  </li>
                  <li>
                    {zh
                      ? "输入器浮层不再被父级裁切"
                      : "Composer overlays are no longer clipped"}
                  </li>
                  <li>
                    {zh
                      ? "文件工作台保持在文件信息架构内"
                      : "File workbenches stay within Files"}
                  </li>
                </ul>
              </>
            ) : (
              <>
                <figure data-pdf-evidence>
                  <div>
                    <ProductPlaygroundIcon
                      name={
                        page === 2
                          ? "workspace"
                          : page === 3
                            ? "files"
                            : "shield"
                      }
                    />
                  </div>
                  <figcaption>
                    <strong>{pages[page - 1]}</strong>
                    <span>
                      {page === 2
                        ? "1440 × 960"
                        : page === 3
                          ? "390 × 844"
                          : zh
                            ? "键盘 + 200% 缩放"
                            : "Keyboard + 200% zoom"}
                    </span>
                  </figcaption>
                </figure>
                <h2>{zh ? "观察结果" : "Observed result"}</h2>
                <p>
                  {zh
                    ? "关键控件保持可见、可聚焦并具有明确的当前状态。浮层不会被内容区或固定标题栏遮挡。"
                    : "Critical controls remain visible, focusable, and clearly stateful. Overlays are not obscured by content or fixed chrome."}
                </p>
                <aside data-pdf-note>
                  <ProductPlaygroundIcon
                    name={page === 4 ? "warning" : "check"}
                  />
                  <span>
                    {page === 4
                      ? zh
                        ? "还需补充 200% 缩放截图。"
                        : "A 200% zoom screenshot is still required."
                      : zh
                        ? "证据已关联到对应验收项。"
                        : "Evidence is linked to its acceptance check."}
                  </span>
                </aside>
              </>
            )}
            <footer>
              <span>Visual acceptance report</span>
              <span>
                {page} / {pages.length}
              </span>
            </footer>
          </article>
        </main>
      </div>
      <footer data-office-status>
        <span>{zh ? `${pages.length} 页` : `${pages.length} pages`}</span>
        <span>
          {query
            ? zh
              ? `找到 2 处“${query}”`
              : `2 matches for “${query}”`
            : zh
              ? "文本可选择"
              : "Text selectable"}
        </span>
        <span>{zoom}%</span>
      </footer>
    </section>
  );
}

function translateScoreCell(value: string, locale: "zh" | "en") {
  if (locale === "en") return value;
  const values: Record<string, string> = {
    Accessibility: "可访问性",
    Automation: "自动化",
    Composer: "输入器",
    "Context controls": "上下文控件",
    "Desktop evidence": "桌面端证据",
    "First click": "首次点击",
    "In progress": "进行中",
    Navigation: "导航",
    "Needs review": "需复核",
    Overlays: "浮层",
    Passed: "已通过",
    Responsive: "响应式",
    "Viewport collision": "视口碰撞",
    Visual: "视觉",
    "Keyboard order": "键盘顺序",
    Unassigned: "未分配",
  };
  return values[value] ?? value;
}
