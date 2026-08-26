import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { componentMap } from "../src/ai/manifest/index.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const controllerSlugs = new Set([
  "back-to-bottom",
  "copy-button",
  "editable-text",
  "emoji-picker",
  "floating-panel",
  "image-viewer",
  "sortable-list",
  "streaming-text",
  "table-of-contents",
]);

const docs = {
  "back-to-bottom": {
    zh: [
      "回到底部",
      "在持续追加内容的滚动区域中，让离开最新位置的用户一步回到末尾，并明确提示尚未阅读的更新数量。",
      "它只管理滚动位置和未读计数，不拥有消息传输、已读回执或列表虚拟化。内容较短或没有持续追加时，不应显示这个操作。",
      "按钮需要可理解的名称；更新计数通过可见文本表达。滚动遵循减弱动态效果偏好，且不在新内容到达时强制抢走用户位置。",
    ],
    en: [
      "Back to Bottom",
      "Returns people to the newest content in an append-only scroll region and exposes how many updates arrived while they were reading earlier content.",
      "It owns scroll position and an unread count only. Transport, read receipts, and list virtualization remain with the host. Do not show it for short or non-streaming content.",
      "Give the button a clear name and render the update count as text. Scrolling honors reduced-motion preferences and never drags a reader away when new content arrives.",
    ],
    attrs: 'data-always-visible data-unread="3"',
    children:
      "<span data-back-to-bottom-label>Latest output</span><span data-unread-count>3</span>",
    read: "getState",
  },
  "code-diff": {
    zh: [
      "代码差异",
      "以逐行、可滚动且可复制的方式呈现代码变更，让增加、删除和上下文在不依赖颜色的情况下可辨认。",
      "代码差异负责阅读呈现，不负责生成补丁、解析版本库或决定变更是否可信。复杂审查流程应组合变更审查与审批组件。",
      "每行必须保留加减符号或文字含义。代码方向固定为从左到右，容器支持键盘聚焦和横向滚动。",
    ],
    en: [
      "Code Diff",
      "Presents code changes as readable, scrollable lines so additions, removals, and context remain distinguishable without relying on color alone.",
      "Code Diff owns reading presentation. It does not generate patches, inspect repositories, or decide whether a change is trusted. Compose it with review and approval surfaces for full workflows.",
      "Keep a visible plus, minus, or textual meaning on every changed line. Code remains left-to-right, keyboard focusable, and horizontally scrollable.",
    ],
    children:
      '<figcaption>src/session.ts</figcaption><pre tabIndex="0"><code><span data-diff-line="-">return reconnect()</span><span data-diff-line="+">return reconnect(&#123; retry: 3 &#125;)</span></code></pre>',
  },
  collapsible: {
    zh: [
      "折叠内容",
      "使用原生 details 元素收纳次要说明，同时让标题、展开状态和无脚本降级路径保持清晰。",
      "折叠内容适合补充信息，不应用来隐藏完成任务所必需的字段、错误或主要操作。多个互斥区段应使用 Accordion。",
      "summary 保持原生键盘行为和可见焦点。禁用状态必须同时阻止指针与键盘操作，内容顺序不随视觉折叠改变。",
    ],
    en: [
      "Collapsible",
      "Uses the native details element to contain secondary explanation while preserving a clear label, state, and no-script fallback.",
      "Collapsible is for supplemental content. Never hide required fields, errors, or primary actions inside it. Use Accordion when several sections need coordinated exclusivity.",
      "The summary retains native keyboard behavior and visible focus. Disabled state blocks pointer and keyboard use, and collapsing never changes reading order.",
    ],
    attrs: "open",
    children:
      "<summary>Why this permission is needed</summary><div data-collapsible-content>The folder is read only until access is approved.</div>",
  },
  "color-swatches": {
    zh: [
      "颜色样本",
      "以原生单选或复选输入表达有限、可命名的颜色集合，并让选择状态在色彩之外仍然清楚。",
      "颜色样本不适合任意颜色输入、主题预览或只靠色相区分的状态。任意取色应交给宿主的专业颜色工具。",
      "每个样本必须有可访问名称，选中态具有轮廓和原生输入状态，低视力用户不需要识别色名即可完成选择。",
    ],
    en: [
      "Color Swatches",
      "Expresses a finite, named color set with native radio or checkbox inputs and keeps selection understandable beyond hue alone.",
      "It is not an arbitrary color picker, theme preview, or a substitute for text status. Free-form color work belongs in a host-owned specialist tool.",
      "Every swatch needs an accessible name. Selection combines an outline with native input state so people never need to identify a color by sight alone.",
    ],
    attrs: 'aria-label="Accent color"',
    children:
      '<label><input type="radio" name="accent" defaultChecked aria-label="Iris" /><span data-swatch style="--swatch-color:#5b57d9"></span></label><label><input type="radio" name="accent" aria-label="Blue" /><span data-swatch style="--swatch-color:#249bf6"></span></label>',
  },
  "copy-button": {
    zh: [
      "复制按钮",
      "复制代码、命令或标识符，并在同一操作位置提供进行中、成功和失败反馈。",
      "复制按钮不应隐藏下载、分享或授权行为。敏感值必须由宿主明确提供，组件不会自行读取剪贴板或受保护数据。",
      "标签在反馈期间仍保持动作含义，结果由实时区域播报。失败信息说明浏览器拒绝了复制，并允许用户重试或手动选择。",
    ],
    en: [
      "Copy Button",
      "Copies code, commands, or identifiers and reports pending, success, and failure in the same action location.",
      "Copy must not disguise download, sharing, or authorization. The host explicitly supplies sensitive values; the component never reads the clipboard or protected data on its own.",
      "The label keeps its action meaning while a live region reports the result. Failure copy explains that the browser rejected copying and leaves a retry or manual-selection path.",
    ],
    attrs:
      'data-copy-text="npm install @a3s-lab/ui" data-copy-success="Copied" data-copy-error="Copy failed"',
    children:
      '<span data-copy-label>Copy command</span><span data-copy-feedback aria-live="polite"></span>',
    read: "getState",
  },
  "date-picker": {
    zh: [
      "日期输入",
      "通过原生日期输入收集一个日历日期，并保留浏览器、语言环境与移动平台已经提供的选择体验。",
      "日期输入不处理时区、日期范围、重复计划或自然语言解析。需要多个相互约束日期时，应由表单组合负责验证和说明。",
      "始终使用可见 label，并在字段旁说明格式、范围和错误原因。不要以占位符代替标签。",
    ],
    en: [
      "Date Picker",
      "Collects one calendar date through the native input, preserving the browser, locale, and mobile platform selection experience.",
      "It does not own time zones, date ranges, recurrence, or natural-language parsing. A form composition validates and explains relationships between multiple dates.",
      "Always provide a visible label and explain format, bounds, and errors beside the field. A placeholder is never the label.",
    ],
    attrs: 'type="date" value="2026-08-14" aria-label="Target date"',
    void: true,
  },
  "editable-text": {
    zh: [
      "行内编辑文本",
      "在读取上下文中安全地切换到短文本编辑，并保留保存、取消、校验和焦点返回路径。",
      "行内编辑只适合单个低风险值。多字段编辑、长内容、受保护操作或需要审批的变更应进入完整表单或对话流程。",
      "编辑、保存与取消均可由键盘完成。Escape 恢复原值，提交失败保留输入和焦点，状态变化不会造成布局跳跃。",
    ],
    en: [
      "Editable Text",
      "Moves safely between reading and editing a short value while retaining save, cancel, validation, and focus-return paths.",
      "Inline editing suits one low-risk value. Multi-field changes, long content, protected actions, and approval work belong in a full form or dialog flow.",
      "Editing, saving, and cancelling are keyboard reachable. Escape restores the prior value, failure preserves input and focus, and state changes avoid layout jumps.",
    ],
    children:
      '<div data-editable-display><span data-editable-value>Release notes</span><button type="button" class="btn" data-size="sm" data-variant="ghost" data-editable-action="edit">Edit</button></div><form data-editable-form><input class="input" value="Release notes" aria-label="Title" /><button type="submit" class="btn" data-size="sm" data-editable-action="save">Save</button><button type="button" class="btn" data-size="sm" data-variant="ghost" data-editable-action="cancel">Cancel</button></form>',
    read: "getState",
  },
  "emoji-picker": {
    zh: [
      "表情选择器",
      "在可搜索、可键盘遍历的有限集合中选择一个表情，并把选择结果作为普通文本交给宿主。",
      "组件不管理最近使用、皮肤偏好、远程表情包或消息发送。大型目录应由宿主提供分组、虚拟化和本地化搜索数据。",
      "每个表情按钮需要名称，方向键在可见结果中移动，空结果明确播报。表情是内容，不承担无文字界面图标的职责。",
    ],
    en: [
      "Emoji Picker",
      "Selects one emoji from a searchable, keyboard-navigable finite set and returns it to the host as ordinary text.",
      "It does not own recents, skin-tone preferences, remote packs, or message sending. Large catalogs need host-provided grouping, virtualization, and localized search data.",
      "Every emoji button has a name, arrow keys move through visible results, and empty search is announced. Emoji is content here, never an unlabeled interface icon.",
    ],
    attrs: 'aria-label="Choose a reaction"',
    children:
      '<input class="input" type="search" placeholder="Search reactions" aria-label="Search reactions" /><div data-emoji-grid role="listbox"><button type="button" data-emoji-value="👍" aria-label="Thumbs up">👍</button><button type="button" data-emoji-value="🎉" aria-label="Celebrate">🎉</button><button type="button" data-emoji-value="❤️" aria-label="Love">❤️</button><p hidden data-emoji-empty>No reactions match.</p></div>',
    read: "getState",
  },
  "file-type-icon": {
    zh: [
      "文件类型图标",
      "在文件列表和附件中提供稳定、克制的类型提示，同时让真实文件名继续承担主要识别职责。",
      "图标不判断文件安全性、可执行能力或 MIME 真实性。品牌与供应商图形由宿主通过通用图标槽提供。",
      "装饰性图标使用 aria-hidden；仅显示图标时必须提供文件类型名称。扩展名文字保持可读，不能只靠颜色区分。",
    ],
    en: [
      "File Type Icon",
      "Provides a stable, restrained type cue in file lists and attachments while the actual filename remains the primary identifier.",
      "The icon does not decide file safety, executability, or MIME truth. Brand and provider graphics remain host-owned assets supplied through the generic icon slot.",
      "Decorative instances use aria-hidden. Icon-only instances need a file-type name, and extension text remains readable without color recognition.",
    ],
    attrs:
      'role="img" aria-label="TypeScript file" style="--file-color:#249bf6"',
    children: "<span data-file-extension>TS</span>",
  },
  "floating-panel": {
    zh: [
      "浮动面板",
      "让检查器、辅助工具或短期上下文停靠在主要任务旁，并在窄屏上自然转为底部面板。",
      "浮动面板不等于通用卡片，也不用于必须中断用户的确认。宿主拥有持久化位置、尺寸和工作区布局。",
      "关闭操作可由 Escape 触发并把焦点还给开启者。停靠、浮动与移动端面板保持同一内容顺序和操作语义。",
    ],
    en: [
      "Floating Panel",
      "Keeps an inspector, helper, or temporary context beside the primary task and naturally becomes a bottom sheet on narrow screens.",
      "It is not a generic card or a protected confirmation surface. The host owns persisted position, size, and workspace layout.",
      "Escape can close the panel and restore focus to its opener. Docked, floating, and mobile presentations preserve content order and action meaning.",
    ],
    attrs: 'data-position="docked" data-state="open"',
    children:
      '<header><strong>Inspector</strong><button type="button" class="btn" data-size="sm" data-variant="ghost" data-floating-panel-action="close">Close</button></header><section><p>Review the selected resource without leaving the task.</p></section>',
    read: "getState",
  },
  form: {
    zh: [
      "表单",
      "把相关字段、校验摘要和提交操作组织为一个可恢复的任务，并保留浏览器原生提交语义。",
      "表单负责交互结构，不负责网络请求、权限或业务校验。不要把不相关设置塞进同一表单，也不要用禁用按钮代替具体错误说明。",
      "错误靠近字段并可从摘要定位；提交中保留输入，失败后保持焦点上下文。所有字段都需要持久可见的标签。",
    ],
    en: [
      "Form",
      "Organizes related fields, validation summary, and submission into one recoverable task while preserving native browser semantics.",
      "Form owns interaction structure, not requests, permission, or business validation. Do not group unrelated settings or replace specific errors with a permanently disabled submit button.",
      "Errors sit beside their field and can be reached from the summary. Submission preserves input, failure preserves focus context, and every field has a persistent label.",
    ],
    children:
      '<label class="field"><span class="label">Workspace name</span><input class="input" name="name" value="Research" required /></label><footer><button type="submit" class="btn">Save workspace</button></footer>',
  },
  highlighter: {
    zh: [
      "代码高亮器",
      "呈现已经由可信渲染器处理的代码，并支持聚焦、横向滚动与局部标记。",
      "组件不执行代码、不推断语言，也不接收未经净化的 HTML。语法标记和安全边界属于宿主渲染器。",
      "代码方向固定从左到右，颜色具有足够对比度，局部强调同时使用背景或结构而非只改变文字颜色。",
    ],
    en: [
      "Highlighter",
      "Presents code already processed by a trusted renderer with keyboard focus, horizontal scrolling, and bounded emphasis.",
      "It never executes code, guesses a language, or accepts unsanitized HTML. Tokenization and the trust boundary belong to the host renderer.",
      "Code remains left-to-right, colors meet contrast requirements, and highlighted regions use structure or background rather than color alone.",
    ],
    attrs: 'tabIndex="0"',
    children:
      '<code><span data-code-line>const status = <mark>"ready"</mark>;</span><span data-code-line>render(status);</span></code>',
  },
  icon: {
    zh: [
      "图标",
      "为宿主提供统一尺寸、笔画和对齐的图形槽，适用于装饰提示或带有明确名称的独立图标。",
      "图标不内置供应商品牌，也不能替代按钮标签和状态文字。官方品牌标识使用 Brand Lockup，不通过普通 Icon 伪装。",
      "装饰图标使用 aria-hidden；承担信息时使用 role=img 和名称。不要用 Unicode 字符代替一致的图标资产。",
    ],
    en: [
      "Icon",
      "Provides a consistent size, stroke, and alignment slot for decorative cues or independently named graphics supplied by the host.",
      "It contains no provider branding and never replaces button labels or status text. Official identity uses Brand Lockup instead of masquerading as a generic icon.",
      "Decorative icons use aria-hidden; informative icons use role=img and a name. Unicode characters are not substitutes for a coherent icon asset.",
    ],
    attrs: 'role="img" aria-label="Verified"',
    children:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>',
  },
  image: {
    zh: [
      "图像",
      "将图像、替代文字、说明和加载状态组合成稳定的阅读单元，避免内容载入造成布局跳动。",
      "组件不做远程代理、内容审核或图片编辑。缩放查看属于 Image Viewer，选择任务属于 Image Select。",
      "信息图像需要准确 alt，装饰图像使用空 alt。尺寸或宽高比应预先声明，错误状态提供文字说明和恢复路径。",
    ],
    en: [
      "Image",
      "Combines an image, alternative text, caption, and loading state into a stable reading unit that avoids layout shift.",
      "It does not proxy remote media, moderate content, or edit pixels. Enlarged inspection belongs to Image Viewer and choice tasks belong to Image Select.",
      "Informative images need accurate alt text; decorative images use empty alt. Declare dimensions or aspect ratio and provide textual recovery for failure.",
    ],
    attrs: 'data-state="ready" data-aspect="square"',
    children:
      '<img src="/logo.png" alt="Official A3S OS mark" width="480" height="480" /><figcaption>Official identity asset rendered with a stable aspect ratio.</figcaption>',
  },
  "image-select": {
    zh: [
      "图像选择",
      "把少量视觉候选项表达为原生单选或复选任务，并在缩略图之外保留名称和选择状态。",
      "它不适合大型媒体库、上传管理或精细裁剪。候选超过一屏时应使用带搜索、分页和加载状态的宿主集合。",
      "每项由原生输入承载状态并具备文字名称。缩略图只是辅助信息，键盘焦点和选中轮廓清晰可见。",
    ],
    en: [
      "Image Select",
      "Expresses a small visual choice set through native radio or checkbox inputs while preserving names and selection beyond the thumbnail.",
      "It is not a media library, upload manager, or crop tool. Sets larger than one screen need a host collection with search, pagination, and loading states.",
      "Native inputs carry state and every option has text. Thumbnails are supporting information, with clear keyboard focus and selected outlines.",
    ],
    attrs: 'aria-label="Cover treatment"',
    children:
      '<div data-image-option><input id="cover-light" type="radio" name="cover" defaultChecked /><label htmlFor="cover-light"><span data-image-preview style="background:#f7f7f8"></span>Light surface</label></div><div data-image-option><input id="cover-dark" type="radio" name="cover" /><label htmlFor="cover-dark"><span data-image-preview style="background:#202024"></span>Dark surface</label></div>',
  },
  "image-viewer": {
    zh: [
      "图像查看器",
      "在受保护的全屏阅读层中检查图像细节，并提供缩放、旋转、复位和明确关闭路径。",
      "查看器不编辑原文件、不保存变换，也不替代图库导航。资源授权、下载与可信来源由宿主负责。",
      "打开后焦点进入工具栏，Escape 关闭并返回开启者。缩放可由按钮完成，不依赖滚轮或多点触控。",
    ],
    en: [
      "Image Viewer",
      "Inspects image detail in a protected full-screen reading layer with zoom, rotate, reset, and an explicit close path.",
      "The viewer never edits the source, persists transforms, or replaces gallery navigation. Authorization, download, and source trust remain with the host.",
      "Focus enters the toolbar on open; Escape closes and returns to the opener. Zoom remains available through buttons without requiring a wheel or gesture.",
    ],
    attrs:
      'open data-state="open" style="position:relative;inline-size:100%;block-size:20rem;margin:0"',
    children:
      '<div data-image-viewer-toolbar><strong>Image preview</strong><div><button type="button" class="btn" data-size="sm" data-variant="ghost" data-image-viewer-action="zoom-out">Zoom out</button><button type="button" class="btn" data-size="sm" data-variant="ghost" data-image-viewer-action="zoom-in">Zoom in</button><button type="button" class="btn" data-size="sm" data-variant="ghost" data-image-viewer-action="close">Close</button></div></div><figure><img src="/logo.png" alt="Official A3S OS mark" /></figure><p data-image-viewer-caption>Inspect without changing the source asset.</p>',
    read: "getState",
  },
  "markdown-surface": {
    zh: [
      "Markdown 内容面",
      "为已净化的 Markdown 输出提供一致的阅读层级、代码、表格、媒体和自定义渲染槽。",
      "组件不解析不可信 HTML，不加载远程渲染器，也不决定链接是否安全。图表、数学与媒体插槽由宿主显式注册。",
      "标题层级保持连续，链接可见且可聚焦，代码方向从左到右。表格和代码在窄屏拥有自己的滚动边界。",
    ],
    en: [
      "Markdown Surface",
      "Provides a coherent reading hierarchy for sanitized Markdown output, code, tables, media, and explicit custom-renderer slots.",
      "It does not parse untrusted HTML, load remote renderers, or decide whether links are safe. Diagram, math, and media slots are registered explicitly by the host.",
      "Heading levels stay continuous, links are visible and focusable, and code remains left-to-right. Tables and code own bounded overflow on narrow screens.",
    ],
    children:
      '<h2>Run summary</h2><p>The task completed with <strong>three verified changes</strong>.</p><pre tabIndex="0"><code>npm run release:check</code></pre><blockquote>Review generated output before publishing.</blockquote>',
  },
  snippet: {
    zh: [
      "代码片段",
      "把一个可复用的短命令或标识符与复制操作放在同一边界中，兼顾扫描和窄屏滚动。",
      "Snippet 不承担多行语法高亮、执行或下载。长代码使用 Highlighter，差异使用 Code Diff，实际执行由宿主处理。",
      "代码保持从左到右并可横向滚动；复制按钮有清楚名称和结果反馈，键盘用户无需选择文本即可复用。",
    ],
    en: [
      "Snippet",
      "Places one reusable short command or identifier beside its copy action in a boundary that scans well and survives narrow screens.",
      "Snippet does not own multiline highlighting, execution, or download. Use Highlighter for long code, Code Diff for changes, and the host for execution.",
      "Code stays left-to-right and horizontally scrollable. The copy action has a clear name and result feedback so keyboard users need not select text manually.",
    ],
    children:
      '<code>npm install @a3s-lab/ui</code><button type="button" class="btn copy-button" data-size="sm" data-copy-text="npm install @a3s-lab/ui"><span data-copy-label>Copy</span><span data-copy-feedback aria-live="polite"></span></button>',
  },
  "sortable-list": {
    zh: [
      "可排序列表",
      "重排一个规模有限的有序集合，并为拖拽与键盘操作提供相同的顺序结果、取消和状态播报。",
      "组件不持久化顺序、不处理跨列表业务规则，也不适合上千项数据。宿主在 before 事件中验证权限并在失败时恢复快照。",
      "手柄可聚焦，空格拾取，方向键移动，Enter 放下，Escape 取消。实时区域播报项目名称和新位置。",
    ],
    en: [
      "Sortable List",
      "Reorders a bounded ordered collection and gives pointer and keyboard paths the same result, cancellation, and status announcement.",
      "It does not persist order, decide cross-list business rules, or scale to thousands of rows. The host validates permission before reordering and restores snapshots after failure.",
      "Handles are focusable: Space picks up, arrows move, Enter drops, and Escape cancels. A live region announces the item and new position.",
    ],
    children:
      '<li data-sortable-item data-sortable-id="research"><button type="button" data-sortable-handle aria-label="Move Research"></button><span>Research</span></li><li data-sortable-item data-sortable-id="review"><button type="button" data-sortable-handle aria-label="Move Review"></button><span>Review</span></li><li data-sortable-item data-sortable-id="publish"><button type="button" data-sortable-handle aria-label="Move Publish"></button><span>Publish</span></li><li class="sr-only" aria-live="polite" data-sortable-status></li>',
    read: "getOrder",
  },
  "streaming-text": {
    zh: [
      "流式文本",
      "在内容逐步到达时保持稳定的阅读区域，并明确区分生成中、暂停、完成和失败。",
      "组件不建立网络连接、不解析富文本，也不自动滚动父容器。传输、中止、重试和可信渲染属于宿主。",
      "更新使用 polite 实时区域，减弱动态效果下仍保留静态状态提示。完成或错误必须有可读文字，不能只靠闪烁光标。",
    ],
    en: [
      "Streaming Text",
      "Maintains a stable reading region while content arrives incrementally and distinguishes streaming, paused, complete, and failure states.",
      "It opens no network connection, parses no rich text, and never scrolls a parent automatically. Transport, abort, retry, and trusted rendering belong to the host.",
      "Updates use a polite live region and reduced motion retains a static status cue. Completion and failure have readable text rather than relying on a blinking caret.",
    ],
    attrs: 'data-state="streaming" aria-live="polite"',
    children:
      "<span data-streaming-content>Checking package contracts and visual states</span><span data-streaming-status>Receiving verified output…</span>",
    read: "getState",
  },
  "table-of-contents": {
    zh: [
      "页内目录",
      "把长页面的标题层级转为可扫描导航，并在阅读过程中同步当前区段。",
      "页内目录不生成错误的标题结构，也不替代站点导航。宿主负责稳定 ID、内容层级和路由滚动偏移。",
      "链接使用真实锚点和 aria-current，焦点顺序遵循文档。窄屏可横向滚动，但不会改变标题的阅读顺序。",
    ],
    en: [
      "Table of Contents",
      "Turns a long page heading hierarchy into scannable navigation and follows the current section as reading progresses.",
      "It does not repair an invalid heading outline or replace site navigation. The host owns stable IDs, content hierarchy, and route scroll offsets.",
      "Links use real anchors and aria-current, with focus order matching the document. Narrow screens may scroll the list horizontally without changing reading order.",
    ],
    attrs: 'aria-label="On this page"',
    children:
      '<ol><li><a href="#overview" aria-current="location">Overview</a></li><li><a href="#contract">Contract</a></li><li><a href="#accessibility">Accessibility</a></li></ol>',
    read: "getState",
  },
};

function pascal(value) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function htmlAttributes(value) {
  return value
    .replaceAll("defaultChecked", "checked")
    .replaceAll("tabIndex", "tabindex")
    .replaceAll("readOnly", "readonly");
}

function reactStyle(value) {
  const declarations = value
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(":");
      const property = declaration.slice(0, separator).trim();
      const styleValue = declaration.slice(separator + 1).trim();
      const key = property.startsWith("--")
        ? JSON.stringify(property)
        : property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      return `${key}: ${JSON.stringify(styleValue)}`;
    });
  return `style={{ ${declarations.join(", ")} }}`;
}

function reactMarkup(value) {
  return value
    .replace(/\bclass=/g, "className=")
    .replace(/\bfor=/g, "htmlFor=")
    .replace(/\btabindex=/g, "tabIndex=")
    .replace(/\breadonly(?=[\s>])/g, "readOnly")
    .replace(/\bstyle="([^"]*)"/g, (_, style) => reactStyle(style));
}

function preview(slug, locale, entry, definition) {
  const label = entry[locale][0];
  const root =
    `<${definition.framework.tag} class="${definition.framework.className}"${entry.attrs ? ` ${entry.attrs}` : ""}${entry.void ? " />" : `>${entry.children || label}</${definition.framework.tag}>`}`.replaceAll(
      "/logo.png",
      "../../../public/logo.png",
    );
  if (slug === "back-to-bottom") {
    return `<div data-scroll-owner style="position:relative;min-height:10rem;inline-size:100%;padding:1rem;border:1px solid var(--border);border-radius:8px;overflow:hidden">
  <p>${locale === "zh" ? "你正在阅读较早的输出，新内容会在底部继续到达。" : "You are reading earlier output while new content continues below."}</p>
  ${root}
</div>`;
  }
  return root;
}

function codeMarkup(definition, entry) {
  return htmlAttributes(
    `<${definition.framework.tag} class="${definition.framework.className}"${entry.attrs ? ` ${entry.attrs}` : ""}${entry.void ? " />" : `>\n  ${entry.children || definition.name}\n</${definition.framework.tag}>`}`,
  );
}

function frameworkExamples(slug, entry, definition, locale) {
  const name = pascal(slug);
  const behavior =
    definition.events.length > 0 || definition.methods.length > 0;
  const hook = `use${name}`;
  const htmlAttr = entry.attrs ? ` ${htmlAttributes(entry.attrs)}` : "";
  const reactAttr = entry.attrs ? ` ${reactMarkup(entry.attrs)}` : "";
  const child = entry.children || entry[locale][0];
  const reactRoot = entry.void
    ? `<${name}${behavior ? ` ref={control.ref}` : ""}${reactAttr} />`
    : `<${name}${behavior ? ` ref={control.ref}` : ""}${reactAttr}>\n      ${reactMarkup(child)}\n    </${name}>`;
  const react = `import { ${name}${behavior ? `, ${hook}` : ""} } from "@a3s-lab/ui/react";

export function Example() {
${behavior ? `  const control = ${hook}();\n` : ""}  return (
    ${reactRoot}
  );
}`;
  const vueRoot = entry.void
    ? `<${name}${behavior ? ` ref="componentRef"` : ""}${htmlAttr} />`
    : `<${name}${behavior ? ` ref="componentRef"` : ""}${htmlAttr}>\n    ${htmlAttributes(child)}\n  </${name}>`;
  const vue = `<script setup>
import { ${name}${behavior ? `, ${hook}` : ""} } from "@a3s-lab/ui/vue";
${behavior ? `\nconst control = ${hook}();\nconst componentRef = control.componentRef;` : ""}
</script>

<template>
  ${vueRoot}
</template>`;
  return { react, vue };
}

function list(values) {
  return values.length ? values.map((value) => `\`${value}\``).join(", ") : "—";
}

function render(slug, locale, entry) {
  const definition = componentMap[slug];
  const publicEvents = definition.events.filter(
    (eventName) => !eventName.startsWith("basecoat:"),
  );
  const [title, intro, boundary, accessibility] = entry[locale];
  const sample = preview(slug, locale, entry, definition);
  const canonical = codeMarkup(definition, entry);
  const frameworks = frameworkExamples(slug, entry, definition, locale);
  const zh = locale === "zh";
  const controller = controllerSlugs.has(slug)
    ? `
### ${zh ? "独立控制器" : "Standalone controller"}

\`\`\`js
import "@a3s-lab/ui/runtime";
import "@a3s-lab/ui/${slug}";

const component = document.querySelector(${JSON.stringify(definition.selector)});
component.${entry.read || definition.methods[0]}();
\`\`\`

${zh ? "控制器是幂等的；完整包可改为一次导入 `@a3s-lab/ui/all`。宿主通过可取消的 `before-*` 事件执行权限与业务校验。" : "The controller is idempotent; the complete package can instead import `@a3s-lab/ui/all` once. The host performs permission and business validation through cancelable `before-*` events."}
`
    : "";
  return `# ${title}

${intro}

<Preview class="w-full">
${sample}
</Preview>

## ${zh ? "使用方式" : "Usage"}

\`\`\`html
${canonical}
\`\`\`
${controller}
## React

\`\`\`tsx
${frameworks.react}
\`\`\`

${definition.events.length || definition.methods.length ? (zh ? `\`use${pascal(slug)}\` 返回同一 DOM 契约的 \`ref\`、就绪状态、事件订阅和受类型约束的方法调用；它不会创建框架专属状态。` : `\`use${pascal(slug)}\` exposes the same DOM contract through a ref, readiness state, event subscriptions, and typed method calls. It introduces no framework-only state.`) : zh ? "该组件没有额外行为控制器，React 适配器只渲染标准语义根。" : "This component has no behavior controller; the React adapter only renders its semantic root."}

## Vue

\`\`\`vue
${frameworks.vue}
\`\`\`

${definition.events.length || definition.methods.length ? (zh ? `\`use${pascal(slug)}\` 与 React hook 暴露相同的事件和方法集合，模板仍输出同一个根类与原生属性。` : `\`use${pascal(slug)}\` exposes the same event and method set as the React hook while the template retains the same root class and native attributes.`) : zh ? "Vue 适配器不包装额外容器，也不改变原生属性。" : "The Vue adapter adds no wrapper and does not alter native attributes."}

## ${zh ? "契约" : "Contract"}

| ${zh ? "接口" : "Surface"} | ${zh ? "值" : "Value"} |
| --- | --- |
| ${zh ? "根选择器" : "Root selector"} | \`${definition.selector}\` |
| ${zh ? "原生根元素" : "Native root"} | \`<${definition.framework.tag}>\` |
| ${zh ? "状态" : "States"} | ${list(definition.states)} |
| ${zh ? "事件" : "Events"} | ${list(publicEvents)} |
| ${zh ? "方法" : "Methods"} | ${list(definition.methods)} |

## ${zh ? "产品边界" : "Product boundary"}

${boundary}

${zh ? "组件只发布可复用的交互边界。数据获取、持久化、权限、可信内容与业务实体继续由宿主产品拥有。" : "The component publishes a reusable interaction boundary only. Data fetching, persistence, permission, trusted content, and business entities remain host-owned."}

## ${zh ? "可访问性" : "Accessibility"}

${accessibility}
`;
}

for (const [slug, entry] of Object.entries(docs)) {
  for (const locale of ["en", "zh"]) {
    const root = path.join(
      projectRoot,
      "site",
      "docs",
      "next",
      locale,
      "components",
    );
    await mkdir(root, { recursive: true });
    await writeFile(
      path.join(root, `${slug}.mdx`),
      render(slug, locale, entry),
    );
  }
}

console.log(
  `Generated ${Object.keys(docs).length * 2} expanded component guides.`,
);
