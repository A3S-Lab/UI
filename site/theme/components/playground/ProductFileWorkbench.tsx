import { useState, type FormEvent } from "react";
import type {
  ProductFileEntry,
  ProductFileWorkbenchKind,
} from "./product-file-manager-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductFileWorkbenchSurface } from "./ProductFileWorkbenchSurfaces";
import {
  ProductPlaygroundIcon,
  type ProductPlaygroundIconName,
} from "./ProductPlaygroundIcon";

export function ProductFileWorkbench({
  entry,
  locale,
  onBack,
}: {
  entry: ProductFileEntry;
  locale: ProductPlaygroundLocale;
  onBack: () => void;
}) {
  const zh = locale === "zh";
  const kind = entry.workbench ?? "code";
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [fileName, setFileName] = useState(entry.name);
  const [mode, setMode] = useState<"edit" | "preview">(
    kind === "pdf" ? "preview" : "edit",
  );
  const [proposalState, setProposalState] = useState<
    "idle" | "accepted" | "dismissed"
  >("idle");
  const [saveState, setSaveState] = useState<"saved" | "unsaved">("saved");
  const [status, setStatus] = useState(
    zh ? "已从本地工作空间打开" : "Opened from the local workspace",
  );
  const [versionsOpen, setVersionsOpen] = useState(false);

  const markChanged = (message?: string) => {
    setSaveState("unsaved");
    if (message) setStatus(message);
  };

  const save = () => {
    setSaveState("saved");
    setStatus(zh ? "所有更改已保存" : "All changes saved");
  };

  const askAssistant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = assistantPrompt.trim();
    if (!prompt) return;
    setAssistantQuestion(prompt);
    setAssistantPrompt("");
    setProposalState("idle");
  };

  return (
    <section
      aria-label={zh ? `编辑 ${fileName}` : `Edit ${fileName}`}
      className="product-file-workbench"
      data-assistant-open={assistantOpen ? "true" : undefined}
      data-workbench-kind={kind}
    >
      <header className="product-file-workbench__header">
        <button
          aria-label={zh ? "返回文件" : "Back to files"}
          data-file-workbench-back
          onClick={onBack}
          type="button"
        >
          <ProductPlaygroundIcon name="back" />
        </button>
        <span data-file-workbench-icon>
          <ProductPlaygroundIcon name={workbenchIcon(kind)} />
        </span>
        <div className="product-file-workbench__identity">
          <input
            aria-label={zh ? "文件名" : "File name"}
            onChange={(event) => {
              setFileName(event.currentTarget.value);
              markChanged();
            }}
            onBlur={() => {
              if (fileName.trim()) return;
              setFileName(entry.name);
            }}
            value={fileName}
          />
          <span>
            {fileExtension(fileName)}
            <i aria-hidden="true">·</i>
            {saveState === "saved"
              ? zh
                ? "已保存"
                : "Saved"
              : zh
                ? "有未保存更改"
                : "Unsaved changes"}
          </span>
        </div>
        <nav aria-label={zh ? "文件操作" : "File actions"}>
          <button
            aria-expanded={versionsOpen}
            aria-label={zh ? "版本记录" : "Version history"}
            onClick={() => setVersionsOpen((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="version" />
            <span>{zh ? "版本" : "Versions"}</span>
          </button>
          <button
            aria-label={zh ? "共享文件" : "Share file"}
            onClick={() =>
              setStatus(zh ? "共享链接已准备" : "Share link prepared")
            }
            type="button"
          >
            <ProductPlaygroundIcon name="share" />
            <span>{zh ? "共享" : "Share"}</span>
          </button>
          {kind !== "pdf" ? (
            <button
              aria-label={zh ? "保存文件" : "Save file"}
              data-primary
              onClick={save}
              type="button"
            >
              <ProductPlaygroundIcon name="check" />
              <span>{zh ? "保存" : "Save"}</span>
            </button>
          ) : null}
          {kind !== "pdf" ? (
            <div
              aria-label={zh ? "编辑或预览" : "Edit or preview"}
              role="group"
            >
              <button
                aria-label={zh ? "编辑文件" : "Edit file"}
                aria-pressed={mode === "edit"}
                onClick={() => setMode("edit")}
                type="button"
              >
                <ProductPlaygroundIcon name="edit" />
                <span>{zh ? "编辑" : "Edit"}</span>
              </button>
              <button
                aria-label={zh ? "预览文件" : "Preview file"}
                aria-pressed={mode === "preview"}
                onClick={() => setMode("preview")}
                type="button"
              >
                <ProductPlaygroundIcon name="eye" />
                <span>{zh ? "预览" : "Preview"}</span>
              </button>
            </div>
          ) : null}
          <button
            aria-label={
              assistantOpen
                ? zh
                  ? "关闭文件助手"
                  : "Close file assistant"
                : zh
                  ? "打开文件助手"
                  : "Open file assistant"
            }
            aria-pressed={assistantOpen}
            onClick={() => setAssistantOpen((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="assistant" />
            <span>{zh ? "助手" : "Assistant"}</span>
          </button>
        </nav>
      </header>

      {versionsOpen ? (
        <aside
          aria-label={zh ? "版本记录" : "Version history"}
          data-file-version-panel
        >
          <header>
            <div>
              <strong>{zh ? "版本记录" : "Version history"}</strong>
              <small>
                {zh
                  ? "此文件的可恢复检查点"
                  : "Recoverable checkpoints for this file"}
              </small>
            </div>
            <button
              aria-label={zh ? "关闭版本记录" : "Close version history"}
              onClick={() => setVersionsOpen(false)}
              type="button"
            >
              <ProductPlaygroundIcon name="close" />
            </button>
          </header>
          <ol>
            <li data-current="true">
              <span>
                <i />
              </span>
              <div>
                <strong>{zh ? "当前版本" : "Current version"}</strong>
                <small>{zh ? "刚刚 · 你" : "Just now · You"}</small>
              </div>
            </li>
            <li>
              <span>
                <i />
              </span>
              <div>
                <strong>
                  {zh ? "评审意见已合并" : "Review feedback merged"}
                </strong>
                <small>{zh ? "今天 10:18 · Mina" : "Today 10:18 · Mina"}</small>
              </div>
              <button
                onClick={() =>
                  setStatus(zh ? "已打开版本预览" : "Version preview opened")
                }
                type="button"
              >
                {zh ? "预览" : "Preview"}
              </button>
            </li>
            <li>
              <span>
                <i />
              </span>
              <div>
                <strong>{zh ? "首次导入" : "Initial import"}</strong>
                <small>
                  {zh ? "昨天 16:42 · 你" : "Yesterday 16:42 · You"}
                </small>
              </div>
              <button
                onClick={() =>
                  setStatus(zh ? "已打开版本预览" : "Version preview opened")
                }
                type="button"
              >
                {zh ? "预览" : "Preview"}
              </button>
            </li>
          </ol>
        </aside>
      ) : null}

      <div className="product-file-workbench__body">
        <ProductFileWorkbenchSurface
          entry={entry}
          locale={locale}
          mode={mode}
          onChange={markChanged}
          onStatus={setStatus}
        />
        {assistantOpen ? (
          <aside
            aria-label={zh ? "文件助手" : "File assistant"}
            data-file-assistant
          >
            <header>
              <span>
                <ProductPlaygroundIcon name="assistant" />
              </span>
              <div>
                <strong>{zh ? "文件助手" : "File assistant"}</strong>
                <small>{fileName}</small>
              </div>
              <button
                aria-label={zh ? "关闭文件助手" : "Close file assistant"}
                onClick={() => setAssistantOpen(false)}
                type="button"
              >
                <ProductPlaygroundIcon name="close" />
              </button>
            </header>
            <div data-file-assistant-context>
              <span>
                <ProductPlaygroundIcon name="link" />
                {zh ? "已限定到当前文件" : "Scoped to this file"}
              </span>
              <p>
                {zh
                  ? "可审阅内容、解释数据或提出可确认的修改。未经确认不会改写文件。"
                  : "Review content, explain data, or propose confirmable changes. The file is never rewritten without approval."}
              </p>
            </div>
            <section aria-live="polite" data-file-assistant-thread>
              {!assistantQuestion ? (
                <>
                  <strong>{zh ? "你可以这样问" : "Try asking"}</strong>
                  {[
                    zh
                      ? "找出最影响交付的风险"
                      : "Find the risks most likely to block delivery",
                    zh
                      ? "检查是否缺少验收证据"
                      : "Check for missing acceptance evidence",
                    zh
                      ? "把当前内容整理成执行摘要"
                      : "Turn this into an executive summary",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setAssistantPrompt(suggestion)}
                      type="button"
                    >
                      {suggestion}
                      <ProductPlaygroundIcon name="arrow" />
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <p data-author="user">{assistantQuestion}</p>
                  <article>
                    <span>
                      <ProductPlaygroundIcon name="assistant" />
                    </span>
                    <div>
                      <p>{assistantReply(kind, locale)}</p>
                      {proposalState === "idle" ? (
                        <section data-file-proposal>
                          <header>
                            <ProductPlaygroundIcon name="edit" />
                            <strong>
                              {zh ? "建议修改" : "Suggested change"}
                            </strong>
                          </header>
                          <p>{proposalText(kind, locale)}</p>
                          <footer>
                            <button
                              onClick={() => setProposalState("dismissed")}
                              type="button"
                            >
                              {zh ? "忽略" : "Dismiss"}
                            </button>
                            <button
                              data-primary
                              onClick={() => {
                                setProposalState("accepted");
                                markChanged(
                                  zh
                                    ? "建议已应用，等待保存"
                                    : "Suggestion applied, waiting to save",
                                );
                              }}
                              type="button"
                            >
                              {zh ? "应用" : "Apply"}
                            </button>
                          </footer>
                        </section>
                      ) : (
                        <small>
                          {proposalState === "accepted"
                            ? zh
                              ? "建议已应用，可继续审阅后保存。"
                              : "Suggestion applied. Review it before saving."
                            : zh
                              ? "已忽略建议，文件未发生变化。"
                              : "Suggestion dismissed. The file was not changed."}
                        </small>
                      )}
                    </div>
                  </article>
                </>
              )}
            </section>
            <form onSubmit={askAssistant}>
              <label>
                <span className="sr-only">
                  {zh ? "向文件助手提问" : "Ask the file assistant"}
                </span>
                <textarea
                  onChange={(event) =>
                    setAssistantPrompt(event.currentTarget.value)
                  }
                  placeholder={zh ? "询问当前文件…" : "Ask about this file…"}
                  rows={2}
                  value={assistantPrompt}
                />
              </label>
              <button
                aria-label={zh ? "发送" : "Send"}
                disabled={!assistantPrompt.trim()}
                type="submit"
              >
                <ProductPlaygroundIcon name="send" />
              </button>
            </form>
          </aside>
        ) : null}
      </div>
      <footer className="product-file-workbench__status">
        <span>
          <i data-state={saveState} />
          {saveState === "saved"
            ? zh
              ? "工作空间已同步"
              : "Workspace synced"
            : zh
              ? "本地更改"
              : "Local changes"}
        </span>
        <output aria-live="polite">{status}</output>
        <span>{kindLabel(kind, locale)}</span>
      </footer>
    </section>
  );
}

function workbenchIcon(
  kind: ProductFileWorkbenchKind,
): ProductPlaygroundIconName {
  if (kind === "code") return "code";
  if (kind === "spreadsheet") return "chart";
  if (kind === "presentation") return "presentation";
  if (kind === "pdf") return "report";
  return "document";
}

function fileExtension(name: string) {
  return name.split(".").pop()?.toLocaleUpperCase() || "FILE";
}

function kindLabel(
  kind: ProductFileWorkbenchKind,
  locale: ProductPlaygroundLocale,
) {
  const labels = {
    code: { en: "Code and Markdown workbench", zh: "代码与 Markdown 工作台" },
    document: { en: "Document workbench", zh: "文档工作台" },
    pdf: { en: "PDF review", zh: "PDF 审阅" },
    presentation: { en: "Presentation workbench", zh: "演示文稿工作台" },
    spreadsheet: { en: "Spreadsheet workbench", zh: "表格工作台" },
  };
  return labels[kind][locale];
}

function assistantReply(
  kind: ProductFileWorkbenchKind,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (kind === "spreadsheet")
    return zh
      ? "质量评分中有两个高风险项尚未关联证据，响应式验收的负责人也为空。建议先补齐证据与责任人，再计算发布结论。"
      : "Two high-risk quality items have no linked evidence, and responsive acceptance has no owner. Add evidence and ownership before calculating the release decision.";
  if (kind === "presentation")
    return zh
      ? "叙事顺序清楚，但第二页直接进入方案，缺少一页说明用户问题和当前影响。建议在方案前加入证据页。"
      : "The narrative is clear, but slide two jumps straight to the solution. Add one evidence slide explaining the user problem and current impact first.";
  if (kind === "pdf")
    return zh
      ? "报告覆盖桌面和移动视图，但没有记录键盘焦点顺序与 200% 缩放结果。当前证据不足以关闭可访问性验收。"
      : "The report covers desktop and mobile views, but does not record keyboard focus order or 200% zoom. Accessibility acceptance should remain open.";
  if (kind === "code")
    return zh
      ? "当前样式的浮层层级依赖局部堆叠上下文。建议把浮层挂到应用级层，并为触发器补充焦点恢复语义。"
      : "The overlay layer depends on a local stacking context. Move it to the application layer and add focus restoration semantics to the trigger.";
  return zh
    ? "目标与范围已经明确，但成功标准仍偏抽象。建议把“体验一致”拆成可观察的导航、输入、浮层与响应式验收项。"
    : "The goal and scope are clear, but success criteria remain abstract. Split “consistent experience” into observable navigation, input, overlay, and responsive checks.";
}

function proposalText(
  kind: ProductFileWorkbenchKind,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (kind === "spreadsheet")
    return zh
      ? "为缺失证据的单元格添加“待验收”状态，并在负责人列填入产品质量组。"
      : "Mark cells with missing evidence as “Needs review” and assign the product quality team.";
  if (kind === "presentation")
    return zh
      ? "在第 2 页前插入“用户影响”页，并引用视觉验收报告中的失败截图。"
      : "Insert a “User impact” slide before slide 2 and cite failed screenshots from the visual report.";
  if (kind === "pdf")
    return zh
      ? "创建一个待办，补充键盘焦点顺序与 200% 缩放证据。"
      : "Create a follow-up for keyboard focus order and 200% zoom evidence.";
  if (kind === "code")
    return zh
      ? "补充应用级浮层容器、碰撞边界与关闭后的焦点恢复说明。"
      : "Add an application-level overlay container, collision boundaries, and focus restoration notes.";
  return zh
    ? "把成功标准改为四项可验证结果，并链接对应的验收证据。"
    : "Rewrite success criteria as four verifiable outcomes and link each to acceptance evidence.";
}
