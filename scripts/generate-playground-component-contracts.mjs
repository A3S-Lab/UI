import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertPrdQuality,
  assertSubstantiveField,
  assertUniqueValues,
} from "./contract-quality.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const playgroundRoot = path.join(
  projectRoot,
  "site",
  "theme",
  "components",
  "playground",
);
const requirementsRoot = path.join(
  projectRoot,
  "product-requirements",
  "playground-components",
);
const coveragePath = path.join(
  projectRoot,
  "product-requirements",
  "playground-component-coverage.json",
);
const boundarySuitePath = path.join(
  projectRoot,
  "tests",
  "e2e",
  "playground-component-boundaries.acl",
);
const checkOnly = process.argv.includes("--check");

const routes = {
  assistant: [
    "/playground/assistant.html",
    "[data-product-surface=assistant]",
    "playground-route-assistant",
  ],
  automations: [
    "/playground/automations.html",
    "[data-product-surface=automation]",
    "playground-route-automations",
  ],
  capabilities: [
    "/playground/capabilities.html",
    "[data-product-surface=catalog]",
    "playground-route-capabilities",
  ],
  documents: [
    "/playground/resources/documents.html",
    "[data-product-surface=resources][data-resource=documents]",
    "playground-route-documents",
  ],
  extensions: [
    "/playground/extensions.html",
    "[data-product-surface=marketplace]",
    "playground-route-extensions",
  ],
  files: [
    "/playground/resources/files.html",
    "[data-product-surface=files]",
    "playground-route-files",
  ],
  inspiration: [
    "/playground/resources/inspiration.html",
    "[data-product-surface=inspiration]",
    "playground-route-inspiration",
  ],
  knowledge: [
    "/playground/resources/knowledge.html",
    "[data-product-surface=knowledge]",
    "playground-route-knowledge",
  ],
  mail: [
    "/playground/resources/mail.html",
    "[data-product-surface=mail]",
    "playground-route-mail",
  ],
  memory: [
    "/playground/memory.html",
    "[data-product-surface=memory]",
    "playground-route-memory",
  ],
  project: [
    "/playground/projects/a3s-ui-experience.html",
    "[data-product-surface=project]",
    "playground-route-project",
  ],
  "project-session": [
    "/playground/projects/a3s-ui-experience/sessions/release-readiness.html",
    "[data-product-surface=project-session]",
    "playground-route-project-session",
  ],
  projects: [
    "/playground/projects.html",
    "[data-product-surface=projects]",
    "playground-route-projects",
  ],
  session: [
    "/playground/sessions/fix-session-recovery.html",
    "[data-product-surface=session]",
    "playground-route-session",
  ],
  start: [
    "/playground.html",
    "[data-product-surface=start]",
    "playground-route-start",
  ],
};

const suitePaths = {
  actionIcons: "tests/e2e/product-action-icon-semantics.acl",
  automation: "tests/e2e/product-automation-and-preview.acl",
  capability: "tests/e2e/product-capability-navigation.acl",
  composer: "tests/e2e/product-composer-controls.acl",
  globalSettings: "tests/e2e/product-global-and-settings-contracts.acl",
  icons: "tests/e2e/product-icon-semantics.acl",
  model: "tests/e2e/product-model-settings.acl",
  projectAssets: "tests/e2e/product-project-asset-preview.acl",
  projectPages: "tests/e2e/product-project-pages.acl",
  projectWorkflow: "tests/e2e/product-project-workflow.acl",
  resources: "tests/e2e/product-resource-surfaces.acl",
  session: "tests/e2e/product-session-detail.acl",
  task: "tests/e2e/product-task-creation.acl",
  workspace: "tests/e2e/product-workspace-capabilities.acl",
};

function splitName(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/gu, "$1 $2");
}

function slugify(name) {
  return splitName(name).toLowerCase().replaceAll(" ", "-");
}

function active(
  exportName,
  routeKey,
  suiteKey,
  behaviorScenario,
  target,
  job,
  ownership,
  risk,
) {
  const name = splitName(exportName);
  return {
    adversarial: `Acceptance for ${name} must prove ${risk}; malformed, stale, denied, empty, and excessively long fixture data must remain contained without fabricating host success.`,
    behaviorScenario,
    behaviorSuite: suitePaths[suiteKey],
    exportName,
    job: `People using the composed application need to ${job} without losing the task, resource, or decision context that made the action meaningful.`,
    ownership: `${name} owns ${ownership}. It does not own product routing services, remote APIs, credentials, authorization, persistence, scheduling, or irreversible side effects.`,
    routeKey,
    status: "active",
    target,
  };
}

function legacy(exportName, ownership, risk) {
  const name = splitName(exportName);
  return {
    adversarial: `The boundary test for ${name} must prove ${risk}; a passing result cannot rely on hiding the obsolete workspace with CSS or renaming its visible chrome.`,
    exportName,
    job: `Maintainers need to know that ${name} belongs only to the retired editor-style workspace tree so it cannot silently reappear in the current task-first Playground.`,
    ownership: `${name} may remain temporarily as source-compatible legacy code for its existing private consumers, while the current application owns no route, navigation item, product promise, or visible state for it. ${ownership}`,
    routeKey: "start",
    status: "legacy-unmounted",
    target: ".a3s-workspace-playground",
  };
}

const contracts = [
  active("DeviceSimulatorSurface", "session", "automation", "device-presets-and-more-menu", ".device-simulator[data-device-simulator-initialized=true]", "compare a real preview target across named device dimensions and recognizable hardware shells", "device selection, shell presentation, orientation, scale, refresh, and the bounded WebView command preview", "phone and desktop presets remain operable at compact width while overflow actions stay above the shell and preserve the selected device"),
  active("ProductApplication", "start", "capability", "global-search-navigation", "[data-product-application]", "enter any supported route directly and retain one coherent navigation and overlay boundary", "the documentation fixture application shell, route-to-surface selection, global overlays, responsive navigation state, and local task fixture handoff", "first-load hydration never blocks links, route replacement never flashes the retired workspace, and modal layers never leave the main canvas interactive"),
  active("ProductAutomationBuilder", "automations", "automation", "automation-builder-workflow", "[data-product-surface=automation-builder]", "create and validate a scheduled automation through a guided form instead of an ambiguous free-form configuration", "template selection, schedule fields, local validation, review, save feedback, and cancellation inside the deterministic fixture", "invalid schedules keep entered values, keyboard users can reach review and correction, and compact layout never separates errors from their controls"),
  active("ProductAutomationRunHistory", "automations", "workspace", "automation-run-recovery", ".product-run-history", "filter execution history, inspect one run, and choose a truthful recovery action", "run filtering, selection, detail disclosure, retry intent, and status feedback over deterministic history records", "failed and cancelled runs remain distinguishable, filter results never erase the current failure context, and retry cannot appear as completed before confirmation"),
  active("ProductAutomationSurface", "automations", "automation", "paused-manual-run", "[data-product-surface=automation]", "scan automations, understand schedule and health, and enter builder or history work without confusing definitions with runs", "automation tabs, deterministic template and list composition, selected definition state, pause intent, manual-run intent, and builder disclosure", "paused items cannot imply an active schedule, manual runs expose pending feedback, and master-detail content remains reachable on phones"),
  active("ProductCapabilityBrowse", "capabilities", "capability", "capability-first-navigation-desktop", "[data-product-surface=catalog] [data-directory-layout]", "compare assistants, skills, and connectors using category-appropriate information density and actions", "catalog search, filters, grouped results, selection entry points, quick actions, and empty-result explanation for the active capability tab", "tab changes preserve URL truth, filters do not strand focus, and dense skill or connector lists remain scannable without turning every entry into a decorative card"),
  active("ProductCapabilityDetailDialog", "capabilities", "capability", "capability-first-navigation-desktop", "dialog.product-capability-detail-dialog[open]", "inspect capability purpose, state, permissions, and next valid action before changing configuration", "modal detail hierarchy, status and provenance presentation, primary and destructive entry points, Escape handling, and focus return", "short viewports keep the title and footer reachable, destructive actions never bypass confirmation, and closing returns to the exact catalog entry"),
  active("ProductCapabilityRemoveDialog", "capabilities", "capability", "capability-overlays-mobile", "dialog.product-capability-remove[open]", "understand the consequences of removing a configured capability and either cancel or confirm explicitly", "the destructive confirmation copy, cancel and confirm actions, modal focus boundary, and return to the originating detail action", "nested dialogs remain correctly layered on phones, cancellation preserves configuration, and the destructive button cannot be mistaken for the safe default"),
  active("ProductCapabilityMark", "capabilities", "icons", "skill-card-icons", "[data-capability-id] img, [data-capability-id] svg[data-icon]", "recognize capability type and identity quickly while still reading a durable text name", "deterministic assistant imagery and semantic icon selection for capability entries without becoming the accessible name", "missing imagery falls back without layout shift, decorative marks stay hidden from assistive technology, and icons never substitute for state text"),
  active("ProductCapabilitySetupDialog", "capabilities", "capability", "capability-overlays-short-desktop", "dialog.product-capability-setup[open]", "review requested access, enter setup values, test a connection, and confirm only a validated configuration", "setup fields, permission explanation, connection-test states, local validation, footer actions, Escape handling, and trigger focus restoration", "failed connection tests retain values and recovery, short screens keep validation and actions visible, and no fixture copy suggests credentials are persisted here"),
  active("ProductCatalogSurface", "capabilities", "capability", "capability-first-navigation-desktop", "[data-product-surface=catalog]", "move between capability families and manage one item without losing catalog context", "capability-tab synchronization, selected item state, lifecycle dialog orchestration, and task-context callback composition", "direct links select the correct tab on first load, dialog completion updates only deterministic state, and mobile navigation never covers the catalog after selection"),
  active("ProductCodeGraphPanel", "session", "session", "session-detail-conversation", ".product-session-code-graph", "trace relationships among files and symbols, filter the graph, and inspect a selected node without a separate editor surface", "graph and list modes, search, zoom, pan controls, selection, detail copy, and the public code-graph controller boundary", "large graphs remain bounded, no-result filters stay recoverable, keyboard selection matches pointer selection, and expansion does not clip the session inspector"),
  active("ProductCodeWorkbench", "files", "workspace", "all-file-workbenches", ".product-code-workbench", "read, edit, preview, and save text or code files while retaining file-level context", "the public Code Editor root and controller, text editing fixture, preview mode, dirty state callbacks, keyboard and toolbar save acknowledgement, syntax presentation, and task-scoped proposal handoff", "long lines do not force page overflow, controller and React ownership never double-indent input, unsaved content is never labeled saved, preview cannot execute untrusted markup, and mobile tools remain reachable"),
  active("ProductComposer", "start", "composer", "composer-context-and-run-controls", ".product-composer", "express a task, attach bounded context, choose execution policy, and submit through one predictable input surface", "the rich-text task entry boundary, attachment and run-control orchestration, drag-and-drop intake intent, submission eligibility, and host callbacks", "focus uses a calm border instead of a double ring, empty or composing text cannot submit, dropped files remain explicit, and overlays never cover the active input"),
  active("ProductComposerResourcePicker", "start", "actionIcons", "composer-capability-actions", "[data-composer-resource-picker]", "search and attach one assistant or connector with enough identity and configuration state to choose safely", "popover search, option navigation, configured-state copy, selection callback, collision handling, Escape behavior, and trigger focus return", "empty searches explain recovery, long localized labels wrap, inactive connections are not presented as ready, and keyboard selection never drifts from the highlighted option"),
  active("ProductComposerExecutionTargetControl", "start", "composer", "composer-context-and-run-controls", "[data-composer-control=target]", "choose where a task may execute while understanding the security and availability consequences", "execution-target disclosure, selected option semantics, explanatory policy copy, local state change, and popover focus management", "unavailable targets remain disabled and explained, selection text updates atomically, and compact popovers stay within the viewport without obscuring the composer"),
  active("ProductComposerWorkspaceControl", "start", "composer", "composer-context-and-run-controls", "[data-composer-control=workspace]", "bind a task to the correct workspace by searching recognizable names and locations", "workspace disclosure, search, option list, selection, create-workspace intent, active-state copy, and focus restoration", "no matches preserve the query and recovery action, inaccessible workspaces cannot look selectable, and long paths remain distinguishable in compact layouts"),
  active("ProductComposerRunSettings", "start", "composer", "composer-context-and-run-controls", "[data-composer-control=run]", "select model and effort with immediate cost and behavior context before sending work", "model search, selected model summary, effort range, deep-research state, disclosure geometry, and controlled change callbacks", "missing models expose configuration recovery, rapid keyboard changes keep one selected value, and effort ticks remain understandable without color or pointer precision"),
  active("ProductComposerModeControl", "start", "composer", "composer-context-and-run-controls", "[data-composer-control=mode]", "choose the task mode and permission posture without translating opaque implementation flags", "mode options, permission guidance, selected state, keyboard navigation, disclosure close behavior, and the controlled mode callback", "read-only and editing permissions cannot be visually conflated, disabled modes remain skipped, and changing modes never discards the current draft"),
  active("ProductComposerSuggestions", "start", "actionIcons", "composer-capability-actions", "[data-composer-suggestions]", "browse workspace files or skills, understand hierarchy and state, and add an item to task context", "suggestion search and filtering, tree disclosure where applicable, option activation, already-added state, empty results, primary add intent, and focus return", "deep paths stay readable, duplicate attachments remain disabled, empty searches do not close unexpectedly, and keyboard navigation cannot select a hidden option"),
  active("ProductConnectionSurface", "documents", "resources", "document-connection-lifecycle", ".product-connection", "connect a document source, see exactly what access is requested, and recover or disconnect deliberately", "inactive, connecting, connected, failed, and disconnect-confirmation fixture states plus provider metadata and host intent events", "connection failure retains the provider choice, retry does not fabricate authorization, disconnect requires confirmation, and mobile actions stay adjacent to status"),
  active("ProductExtensionDetail", "extensions", "workspace", "extension-install-lifecycle", ".product-marketplace__detail", "review extension provenance, permissions, compatibility, and installation state before changing availability", "selected extension detail, permission disclosure, install and uninstall entry points, lifecycle feedback, and compact dialog presentation", "untrusted sources remain explicit, installation never looks complete while pending, uninstall explains retained artifacts, and closing restores the selected card"),
  active("ProductExtensionHost", "extensions", "workspace", "extension-host-boundary", "[data-product-surface=extension-host]", "open an installed extension inside an explicitly isolated host and review proposed task context before accepting it", "host isolation copy, reload states, bounded proposal preview, accept intent, and return to marketplace context", "reload failure remains inside the host, proposed content cannot mutate the task before acceptance, and the surface never implies arbitrary extension code runs with product authority"),
  active("ProductExtensionSources", "extensions", "workspace", "extension-source-management", "[role=table][aria-label='扩展来源']", "inspect trusted and pending extension sources, refresh safely, and add a source only after address validation", "source table semantics, refresh feedback, add-source dialog, HTTPS validation, trust state, and deterministic source insertion", "insecure remote addresses are rejected without clearing input, pending trust never loads executable content, and compact tables retain source identity and state"),
  active("ProductFileArtifactsSurface", "files", "resources", "files-mobile-hierarchy", ".product-file-artifacts", "scan task outputs by type, owner, recency, and favorite state before opening the right workspace", "artifact filters, search, grouped table disclosure, result count, open-workspace intent, and start-task intent over deterministic artifacts", "zero results keep filters editable, long names do not collapse metadata, keyboard table actions remain reachable, and the default view is not confused with the workspace filesystem"),
  active("ProductFileManagerSurface", "files", "resources", "files-mobile-hierarchy", "[data-product-surface=files]", "move between task artifacts and a Finder-style workspace while preserving the selected file workflow", "top-level file tabs, panel semantics, selected workbench handoff, return state, and composition of the public file-manager boundary", "switching tabs resets stale workbench selection, compact hierarchy remains navigable, and file operations never imply real filesystem authority in the fixture"),
  active("ProductFilePreviewDialog", "files", "resources", "files-icon-identity", "[data-file-preview-dialog]", "inspect one selected file in a movable or fullscreen preview before opening, renaming, downloading, or attaching it", "modal preview geometry, drag and fullscreen state, file metadata, task handoff actions, Escape cancellation, and exact trigger focus restoration", "the preview stays inside the viewport, fullscreen retains a visible close action, unsupported content remains inert text, and closing never loses the selected file"),
  active("ProductFileTypeIcon", "files", "resources", "files-icon-identity", "[data-file-icon]", "recognize file and folder kinds consistently across list, grid, preview, theme, and viewport changes", "extension classification, visual-kind mapping, four optical sizes, favorite status, decorative icon output, and deterministic fallback identity", "unknown and compound extensions retain a neutral identity, favorite state does not obscure the extension, document kinds are not confused, and icons never replace accessible file names"),
  active("ProductFileWorkbench", "files", "workspace", "workspace-file-intake-and-code-roundtrip", ".product-file-workbench", "continue work on a selected file with identity, save state, preview, versions, and a file-scoped assistant in one bounded surface", "workbench header, file identity, dirty and saved feedback, mode controls, version disclosure, assistant proposal flow, and close or back focus restoration", "renaming to empty recovers the original name, unsaved state survives view changes, assistant proposals require confirmation, and dialogs or mobile panels never lose their close action"),
  active("ProductFileWorkbenchSurface", "files", "workspace", "all-file-workbenches", "[data-workbench-kind]", "dispatch each admitted file kind to the correct code, Office, PDF, spreadsheet, or presentation viewing contract", "typed workbench selection and normalized callbacks while delegating Office formats to the shared Office integration instead of duplicating renderers", "unsupported kinds fail explicitly, Office loading and errors remain truthful, dirty callbacks are kind-safe, and no format silently falls back to misleading plain text"),
  active("ProductFollowUpQueue", "session", "actionIcons", "follow-up-queue-actions", ".product-follow-up-queue", "queue, reorder, edit, pause, remove, and run follow-up instructions while the current task is busy", "ordered queue presentation, item editing, move controls, pause state, next-run intent, removal, and deterministic status feedback", "first and last move controls disable correctly, empty edits cannot save, paused queues cannot look active, and reordering preserves each instruction identity"),
  active("ProductInspirationSurface", "inspiration", "resources", "inspiration-gallery-to-task", "[data-product-surface=inspiration]", "browse useful visual or document fragments, inspect provenance, favorite them, and turn one into deliberate task context", "search, type and favorite filtering, deterministic previews, detail dialog, provenance copy, favorite state, and start-task callback", "decorative previews never replace accessible names, empty filters remain recoverable, detail dialogs fit phones, and task conversion preserves the exact selected source"),
  active("ProductKnowledgeDetailPanel", "knowledge", "resources", "knowledge-source-management", "[data-knowledge-library-detail]", "understand one knowledge base's health, sources, indexing progress, errors, and available management actions", "selected-base summary, compilation state, source list, add and remove source dialogs, retry intent, and detail focus behavior", "failed updates retain the last usable version, duplicate sources are rejected, removing a source requires confirmation, and compact detail never hides recovery"),
  active("ProductKnowledgeLibrarySurface", "knowledge", "resources", "knowledge-library-recovery", ".product-knowledge-library[data-knowledge-library-initialized=true]", "find and manage durable knowledge bases while distinguishing ready, indexing, attention, failed, and empty conditions", "library search and filters, grouped list, selection, create and import flows, refresh feedback, deletion confirmation, and detail composition", "failed libraries remain selectable, create and import validation retain input, deletion cannot erase usable data without confirmation, and mobile master-detail navigation restores list focus"),
  active("ProductMailSurface", "mail", "resources", "mailbox-activation", "[data-product-surface=mail]", "connect mailbox context, browse messages, inspect one item, and start work from an explicitly selected message", "connection fixture states, mailbox list and detail selection, bounded message metadata, back action, and start-task callback", "disconnected state cannot show live messages, selection remains stable after filtering, unsafe content stays text, and mobile detail preserves a route back to the list"),
  active("ProductMarketplaceSurface", "extensions", "workspace", "extension-install-lifecycle", "[data-product-surface=marketplace]", "discover extensions and manage their lifecycle while separating directory browsing, source trust, detail review, and isolated execution", "marketplace tabs, search and sorting, selected extension, install state, source management composition, detail dialog mode, and host entry", "installed state survives deterministic reload, source trust remains visible, compact detail does not cover global recovery, and sorting never changes semantic selection"),
  active("ProductMemoryInspector", "memory", "workspace", "memory-inspector-mobile", ".product-memory__inspector", "inspect a memory's scope, provenance, source detail, and removal state without losing the timeline selection", "responsive inspector disclosure, source expansion, use-in-task intent, removal confirmation, undo, Escape behavior, and trigger focus restoration", "phone presentation behaves as a dialog, source evidence cannot become hidden state, removal stays reversible in the fixture, and closing returns to the exact memory record"),
  active("ProductMemorySurface", "memory", "workspace", "memory-evolution-workflow", "[data-product-surface=memory]", "review memories over time, inspect graph relationships, approve proposed evolution, and deliberately reuse context", "timeline, graph, and evolution tabs, selected record state, candidate review, graph controls, settings entry, and start-task handoff", "candidate acceptance creates traceable provenance, reopening removes generated state consistently, graph filters do not erase records, and compact inspector remains operable"),
  active("ProductNavigationSidebar", "start", "workspace", "sidebar-control-semantics", ".product-sidebar", "move among tasks, spaces, capabilities, resources, and global controls from a stable information hierarchy", "primary and secondary navigation, task and space disclosure, filters, account and notification layers, settings entry, current-page semantics, and compact drawer state", "the first click works after hydration, collapsed icons retain names, closed mobile navigation is inert, and every popover escapes surrounding stacking contexts"),
  active("ProductOfficeWorkbench", "files", "workspace", "all-file-workbenches", "[data-office-load-state=ready]", "preview and safely edit supported Office and PDF resources through the shared Office integration", "Office document creation, load and error states, viewer toolbar composition, save-back intent, print intent, and host status callbacks", "unsupported or failed conversions stay explicit, loading never appears editable, toolbar actions remain reachable on phones, and the fixture does not implement a parallel Office renderer"),
  active("ProductSearchDialog", "start", "capability", "global-search-navigation", "dialog.product-search-dialog[open]", "find tasks, resources, capabilities, and settings through one keyboard-first global command surface", "search indexing over deterministic destinations, grouped results, active option state, keyboard movement, selection dispatch, empty results, Escape handling, and focus return", "rapid queries never activate stale options, empty results keep the field focused, duplicate labels remain distinguishable by category, and opening a destination closes the modal first"),
  active("ProductAccountMenu", "start", "globalSettings", "account-menu-and-exit", ".product-account-menu[role=menu]", "review local identity, appearance, language, help, update, and exit actions from one predictable account menu", "menu semantics, appearance toggle, language link, settings entry points, update feedback, exit request, outside dismissal, Escape behavior, and trigger focus return", "destructive exit stays visually separated, update feedback does not imply completion, language switching preserves route context, and the menu stays above all document content"),
  active("ProductExitDialog", "start", "globalSettings", "account-menu-and-exit", "dialog.product-exit-dialog[open]", "understand what stopping the local fixture means and deliberately cancel or confirm the exit request", "the modal warning, retained-draft explanation, safe and destructive actions, backdrop and Escape cancellation, application exit event, and focus return", "cancel returns focus to the account trigger, confirmation cannot be accidental, compact text remains readable, and closing never leaves an invisible modal blocking the page"),
  active("ProductPlaygroundIcon", "start", "actionIcons", "composer-capability-actions", "svg[data-icon]", "recognize repeated navigation and action intents while relying on adjacent accessible names for meaning", "the internal icon name-to-path mapping, size and decorative SVG output, directional semantics, and consistent visual alignment across product fixtures", "icons never become the only accessible label, action and glyph meaning stay aligned, RTL-sensitive arrows remain correct, and unknown names cannot render a misleading fallback"),
  active("ProductProjectAssetsWorkspace", "project", "projectAssets", "project-asset-preview-desktop", ".product-project-assets-workspace", "organize project assets, inspect folders, filter and select files, open the correct preview, and create task context", "asset breadcrumb and toolbar state, table selection, folders, search and type filters, bulk actions, preview dialog orchestration, and focus restoration", "folder and selection state remain distinct, unsupported preview types are explicit, dialogs retain project context, compact tables preserve identity before actions, and the first visible row stays wholly below its sticky header after selection-driven layout changes"),
  active("ProductProjectPlanSurface", "project", "projectPages", "project-plan-page", ".product-project-plan", "scan grouped plan work, collapse status groups, complete items, and add a task in the right state", "plan grouping, task state and metadata, collapse controls, completion intent, inline creation, empty-group recovery, and display-option response", "collapsed groups retain counts, empty titles cannot create work, completion preserves item identity, hidden assignee or date columns do not remove accessible context, and inline creation focuses its title without depending on animation frames"),
  active("ProductProjectPlanToolbar", "project", "projectPages", "project-plan-page", "[data-plan-actions]", "search plan items, switch display density and metadata, and start creation without losing the current plan scope", "plan scope copy, search disclosure, view options, primary add action, responsive labels, option state, and live result feedback", "closing search preserves a nonempty query intentionally, compact controls retain names, toggles update the plan atomically, and overflow never covers the first task group"),
  active("ProductProjectPresence", "project-session", "projectWorkflow", "project-workspace-and-session", ".product-project-presence", "understand who is present in a shared project context without mistaking decorative avatars for authorization or live collaboration", "deterministic collaborator imagery, count and label presentation, compact overlap, and assistive text for fixture presence", "missing avatars retain names, overlap never hides the count, presence does not imply edit permission, and localized names remain legible"),
  active("ProductProjectBreadcrumb", "project", "projectWorkflow", "project-workspace-and-session", ".product-project-breadcrumb", "move from project or session context back to its parent while retaining an unambiguous current location", "ordered breadcrumb links, current-page text, separators, localized naming, and host-provided destinations", "long project names wrap without reversing hierarchy, the current item is not a false link, and compact layouts keep the parent target reachable"),
  active("ProductProjectSessionSurface", "project-session", "projectWorkflow", "project-workspace-and-session", "[data-product-surface=project-session]", "review one project-bound task conversation, evidence, artifacts, and follow-up actions without falling into a generic editor", "project session header, search, conversation, tool disclosures, deliverable summary, composer, inspector orchestration, and project breadcrumb context", "opening details never erases conversation scroll, mobile inspector is closable, artifacts stay project-bound, and seeded tool results remain clearly deterministic"),
  active("ProductProjectWorkspaceSurface", "project", "projectPages", "project-activity-page", "[data-product-surface=project]", "coordinate project activity, tasks, plan, assets, configuration, and sessions within one durable project hierarchy", "project tabs, activity and task views, plan and asset composition, configuration drawer, composer context, session links, and deterministic local state", "tab URLs and selected state remain truthful, configuration never blocks the workbench invisibly, mobile details receive initial focus without animation-frame timing, close restores the trigger, and no fixture action claims backend persistence"),
  active("ProductResourcesSurface", "documents", "resources", "document-connection-lifecycle", "[data-product-surface=resources]", "enter the correct mail, document, file, knowledge, or inspiration workflow through a resource-specific composition", "resource-to-surface dispatch and the shared start-task callback while keeping each resource's information architecture independent", "unknown resource state cannot render the wrong manager, connection surfaces remain honest, and switching routes does not carry incompatible selection or dialog state"),
  active("ProductSessionFilesPanel", "session", "session", "session-detail-conversation", ".product-inspector-files", "browse changed session files and inspect a compact diff while remaining inside the task detail context", "file explorer composition, selected file, diff presentation, line metadata, and panel semantics for the inspector's files tab", "large diffs scroll inside the panel, line spacing remains reviewable, selection and diff stay synchronized, and long paths do not push close controls away"),
  active("ProductSessionArtifactsPanel", "session", "session", "session-detail-conversation", ".product-inspector-artifacts", "review a produced artifact, inspect highlighted content, and copy it without leaving the session", "artifact list, selected preview, public artifact-card and highlighter composition, copy feedback, file identity, and inspector tab semantics", "empty artifacts explain absence, copy state is announced, long output remains contained, and selecting another artifact updates both identity and preview"),
  active("ProductSessionExecution", "session", "session", "session-detail-conversation", ".product-session-execution", "understand reasoning, tool calls, permission decisions, runtime agents, plan progress, and delivery outcome in chronological context", "execution disclosure, tool timeline, diff preview, public Log Viewer output, permission choices, plan states, delivery summary, and deterministic status transitions", "failed tools preserve input and output evidence, permission requests cannot auto-approve, completed plans collapse without hiding status, ordered logs retain sequence and stream identity, and streaming placeholders never fabricate completion"),
  active("ProductSessionInspector", "session", "session", "session-detail-conversation", ".product-session-inspector", "open task details and move among overview, artifacts, files, device preview, and graph without losing the conversation", "responsive inspector shell, tab semantics, selected tab, expanded preview and graph state, close behavior, focus return, and composed panel context", "only one tab is active, mobile inspector receives initial focus without animation-frame timing, traps and restores focus correctly, expansion retains close controls, and absent task data cannot produce misleading metrics"),
  active("ProductSessionMessageActions", "session", "session", "session-detail-conversation", ".product-session__message-actions", "copy, rate, read, save, or report an assistant response through controls whose icons and labels agree", "response action state, copy feedback, helpfulness toggles, speech intent, overflow menu, save-to-memory feedback, and host reporting intent", "repeated clicks do not create contradictory ratings, unavailable speech stays explicit, menus return focus, and icon-only buttons always retain durable names"),
  active("ProductSessionOverviewPanel", "session", "session", "session-detail-conversation", ".product-inspector-overview", "grasp task status, elapsed metrics, plan progress, execution policy, and context before opening deeper evidence", "summary status, metrics, plan-step list, runtime properties, context copy, and semantic overview tab panel composition", "metrics never imply live telemetry, incomplete steps remain distinct, long context wraps, and missing data produces an honest empty value rather than zeroed success"),
  active("ProductSessionSurface", "session", "task", "create-task-desktop", "[data-product-surface=session]", "continue a seeded or locally created task through conversation, execution evidence, details, search, and follow-up composition", "session state recovery, header and search, message list, execution composition, inspector, follow-up queue, task composer, stop intent, and local persistence status copy", "missing local sessions expose recovery, stopping does not erase queued work, compact inspector focus is deterministic without animation-frame timing, compact composer remains visible, and deterministic completion cannot be confused with a live backend run"),
  active("ProductSessionPreviewPanel", "session", "session", "session-detail-conversation", ".product-inspector-preview", "inspect a target in a compact device shell and deliberately expand it when detailed controls are needed", "preview panel heading, compact and expanded simulator variants, expansion state, collapse action, and inspector tab semantics", "expansion preserves the selected device and URL, compact controls remain accessible, empty targets state why, and shell chrome never reduces the actual preview to an unusable sliver"),
  active("ProductSessionGraphPanel", "session", "session", "session-detail-conversation", ".product-inspector-graph", "open a code dependency graph, expand it for analysis, filter nodes, and return to the normal inspector layout", "graph panel heading, expansion and collapse controls, embedded code graph, selected node state, and inspector layout callback", "expanded graph keeps navigation and close controls reachable, filters retain selection rules, empty results recover, and collapse restores the prior inspector topology"),
  active("IntegrationSettings", "start", "globalSettings", "settings-all-sections", ".product-settings__connection-list", "review local integration capabilities and change deterministic enabled state with clear host-authorization boundaries", "integration cards, connection status copy, configure and manage toggles, stable state feedback, and shared settings controls", "disabled or untrusted integrations never appear authorized, toggles keep identity and status aligned, and compact cards preserve permissions context"),
  active("ChannelSettings", "start", "globalSettings", "settings-all-sections", ".product-settings__channels", "choose a communication channel, understand its scope, and change its enabled state without confusing transport with task execution", "channel master-detail selection, enabled state, configuration controls, approval and notification settings, and shared settings primitives", "the local channel cannot be accidentally disabled, remote channels require explicit configuration, selection survives state changes, and phone layout keeps channel identity visible"),
  active("ProductSettingsDialog", "start", "globalSettings", "settings-all-sections", ".product-settings[open]", "navigate every settings domain inside a focused modal and return to the originating product context", "modal lifecycle, section navigation, selected section state, content scrolling, compact layout, Escape handling, close control, and initial-section synchronization", "all thirteen sections remain reachable, changing sections resets only content scroll, mobile navigation and content do not overlap, and closing leaves no inert or blocked page layer"),
  active("SystemSettings", "start", "globalSettings", "settings-all-sections", ".product-settings__storage", "configure language, update, runtime, proxy, storage, and device-level defaults with their consequences explained", "system-level fixture controls, storage summary, update preference, network and runtime toggles, and setting-change announcements", "invalid proxy or location values remain recoverable, storage figures stay clearly illustrative, and device settings do not imply remote policy changes"),
  active("AccountSettings", "start", "globalSettings", "settings-all-sections", ".product-settings__profile", "review local profile, edition, region, session, and account boundaries without implying a remote identity service", "profile summary, edition and region rows, local session information, deterministic account actions, and shared settings composition", "local-only identity stays explicit, destructive account actions require a separate host flow, and long account metadata remains readable on phones"),
  active("PersonalizationSettings", "start", "globalSettings", "settings-all-sections", ".product-settings__choice-group", "choose appearance, density, accent, and motion preferences with an immediate and accessible representation", "preference choice groups, selected state, accent options, reduced-motion respect, setting-change announcements, and deterministic preview state", "choices remain understandable without color, system appearance stays distinct from light or dark, and compact grids retain full labels and focus visibility"),
  active("MemorySettings", "start", "globalSettings", "settings-all-sections", ".product-settings__boundary", "set how future memories are created and scoped while keeping record review and deletion in the memory workspace", "memory enablement, default scope, policy explanation, shared rows and switches, and setting-change announcements", "disabling memory does not pretend to delete records, scope changes remain explicit, and policy copy prevents settings from becoming a parallel memory manager"),
  active("ExecutionSettings", "start", "globalSettings", "settings-all-sections", ".product-settings__boundary", "set default execution mode, approvals, isolation, and evidence retention before individual tasks tighten them", "default execution controls, security explanation, approval policy, workspace isolation, evidence preference, and setting-change announcements", "unsafe defaults cannot hide behind labels, disabled controls remain semantic, and changing defaults never mutates an already running task fixture"),
  active("AssistantSettings", "start", "globalSettings", "settings-all-sections", ".product-settings__group", "configure assistant-facing local integrations while seeing exactly which task context each integration may receive", "assistant integration grouping, deterministic enabled state, setup guide link, beta boundary copy, and shared switch controls", "enabling one integration does not imply host authorization, beta status stays visible, and unavailable integrations cannot look active after navigation"),
  active("ProductModelSettings", "start", "model", "model-provider-workflow", ".product-model-toolbar", "manage provider connections and model aliases from one coherent settings workspace", "provider list, selected provider, model catalog, add and edit model flow, deletion intent, status feedback, and model-manager layout", "duplicate model identifiers are rejected, provider failures retain edits, deletion cannot remove the active model silently, and compact master-detail navigation restores selection"),
  active("ProductModelProviderManager", "start", "model", "model-provider-workflow", ".product-model-manager", "inspect one provider, validate connection details, browse available models, and edit local model configuration safely", "provider connection editor, test states, model catalog, draft form, field validation, confirmation state, and controlled provider callbacks", "secret fields never enter committed evidence, connection failure preserves nonsecret input, invalid limits stay adjacent to fields, and unsaved drafts cannot appear connected"),
  active("SettingsSwitch", "start", "globalSettings", "settings-all-sections", ".product-settings__switch:has(input[role=switch])", "change a binary preference with native semantics, visible state, and a generous hit target", "the checkbox-backed switch state, disabled state, accessible label, controlled or initial value behavior, and the shared visual indicator", "checked state is never color-only, disabled switches cannot toggle, repeated keyboard activation stays synchronized, and labels remain the accessible name"),
  active("SettingsHeader", "start", "globalSettings", "settings-all-sections", ".product-settings__content-header", "identify the current settings domain and understand its scope before changing any values", "one semantic section heading and optional explanatory paragraph with stable spacing across every settings page", "long localized titles and descriptions wrap without displacing close controls, missing descriptions leave no empty gap, and heading hierarchy remains valid"),
  active("SettingsRow", "start", "globalSettings", "settings-all-sections", ".product-settings__row", "read a preference name and consequence beside the control that changes it", "row-level label copy, description, control alignment, responsive stacking, and a reusable semantic grouping boundary", "long descriptions do not detach from controls, compact rows preserve reading order, controls retain their own labels, and no row becomes clickable when only its control is interactive"),
  active("DataSettings", "start", "globalSettings", "settings-all-sections", ".product-settings__storage--large", "understand local data footprint, export scope, retention, and cache actions before requesting host operations", "storage summary, export intent, retention preference, cache intent, explanatory boundaries, and shared settings controls", "illustrative storage cannot look live, export never claims completion without a host result, cache clearing requires explicit action, and retention changes do not erase data immediately"),
  active("ShortcutSettings", "start", "globalSettings", "settings-all-sections", ".product-settings__shortcut-list", "search and review keyboard shortcuts by command and scope without editing an opaque keymap", "shortcut search, grouped command list, key presentation, no-result state, scope copy, and responsive list layout", "conflicting shortcuts remain distinguishable, no-result search retains input, key sequences are readable by assistive technology, and narrow rows do not truncate command names"),
  active("SecuritySettings", "start", "globalSettings", "settings-all-sections", ".product-settings__security-summary", "review privileged-action confirmation, trusted paths, credential isolation, and local sessions from one safety-focused page", "security summary, policy controls, trusted-path manager, session list, credential boundaries, and host intent events", "trusted paths cannot be added empty, credential state never exposes secrets, risky actions remain confirmed, and session removal does not claim success before host approval"),
  active("ProductSettingsSectionContent", "start", "globalSettings", "settings-all-sections", ".product-settings[open] main", "render exactly the settings component selected in navigation without leaking stale controls from another section", "typed settings-section dispatch, locale propagation, and one active content subtree within the owning dialog", "every section identifier resolves, switching cannot leave duplicate headings or focusable stale controls, and unknown values fail during development instead of showing the wrong page"),
  active("HelpSettings", "start", "globalSettings", "settings-all-sections", ".product-settings__about", "find diagnostics, documentation, issue reporting, version, and support boundaries without mixing help with product work", "about summary, diagnostic intent, documentation and issue links, version copy, support expectations, and shared settings rows", "links remain identifiable and safe, diagnostics do not claim results before execution, version copy stays consistent, and compact layout keeps all recovery actions reachable"),
  active("ProductStartSurface", "start", "task", "create-task-desktop", "[data-product-surface=start]", "start a new task by selecting task type, reviewing context, and using the primary rich composer above the fold", "task-type tabs, introductory hierarchy, initial draft hydration, composer composition, create-task callback, and model-settings recovery", "pending drafts hydrate once, tab changes do not clear input, empty tasks remain disabled, and desktop or phone layout keeps the composer visually dominant"),
  active("ProductAssistantSurface", "assistant", "globalSettings", "assistant-surface-controls", "[data-product-surface=assistant]", "begin assistant-focused work with direct access to file context, assistant configuration, and the same production composer contract", "assistant identity header, files and settings actions, quiet canvas, composer composition, task creation callback, and model-settings recovery", "assistant context never becomes a separate chat product, settings return to the same surface, compact controls remain reachable, and an empty composer cannot submit"),
  active("ProductProjectsSurface", "projects", "projectPages", "project-list-page", "[data-product-surface=projects]", "scan available projects by status and recent activity and enter the correct workspace confidently", "project page hierarchy, search, deterministic project cards or rows, status and activity copy, empty filtering, and project-link navigation", "search no-results retain the query, status is not color-only, long project names remain distinguishable, and the first project link works on direct page load"),
  legacy("DevicePreviewPanel", "Its only composition root is the retired workspace preview panel; the supported device fixture is Device Simulator Surface inside the current session inspector.", "the current start route contains no retired workspace root even though the source file also exports the supported simulator surface"),
  legacy("PlaygroundIcon", "Its icon vocabulary serves only the retired workspace scene; current product fixtures use Product Playground Icon with audited action semantics.", "no current route imports the retired icon renderer and its glyphs cannot reappear through an indirect workspace panel import"),
  legacy("SceneState", "It describes loading and error states only for the retired scene canvas, not for current task, session, or resource surfaces.", "current routes express their own empty and failure states and never mount the old scene-state panel"),
  legacy("WorkspaceProvider", "It provides scene and workspace state only to the retired editor-style panel tree and has no current product consumer.", "the current application import graph remains independent of the provider even though a provider produces no detectable DOM node"),
  legacy("InspectorPanel", "It is a dock panel from the retired workspace topology; current task details use Product Session Inspector as a secondary surface.", "no current route renders the old generic inspector or exposes a navigation action that can reveal it"),
  legacy("TerminalPanel", "It is a dock panel from the retired workspace topology; command evidence now stays inside chronological session execution.", "no current route renders an always-on generic terminal or confuses deterministic command previews with an interactive shell"),
  legacy("EmptyWorkspacePanel", "It is the watermark for the retired dock manager and is not a valid empty state for any current route.", "the current Playground never substitutes a generic editor watermark for route-specific empty, recovery, or first-use states"),
  legacy("ExplorerPanel", "It is a dock panel from the retired workspace topology; current file navigation uses the bounded file manager and inspector explorer contracts.", "no current route mounts the old generic explorer alongside the task-first navigation hierarchy"),
  legacy("TaskPanel", "It is a dock panel from the retired workspace topology; current task input and evidence are owned by task and session surfaces.", "no current route duplicates the composer or task detail inside an editor-style dock panel"),
  legacy("WorkspacePlayground", "It is the retired root that assembled movable editor panels and must not be used as the current Playground route shell.", "all current routes render Product Application directly and the retired workspace root stays absent at desktop and phone widths"),
  legacy("WorkspaceSceneSurface", "It is the retired editor scene canvas and has no role in the current route-specific task, project, resource, or session compositions.", "no current route brings back scene selection, editor chrome, or generic preview state through this component"),
];

const behaviorAssertionOverrides = {
  DataSettings: "data-section",
  ExecutionSettings: "execution-section",
  MemorySettings: "memory-section",
  ProductSettingsSectionContent: "settings-section-content",
  SettingsHeader: "system-header",
  SystemSettings: "system-section",
};

function bracedBlock(source, start, label) {
  const opening = source.indexOf("{", start);
  if (opening < 0) return undefined;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = opening; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unclosed ${label}.`);
}

function scenarioBlock(source, scenarioId) {
  const marker = `scenario "${scenarioId}"`;
  const start = source.indexOf(marker);
  if (start < 0) return undefined;
  return bracedBlock(source, start, `scenario ${scenarioId}`);
}

function scenarioActions(source) {
  const actions = [];
  const pattern = /^\s{8}([a-z_]+)\s+"([^"]+)"\s*\{/gmu;
  for (const match of source.matchAll(pattern)) {
    const block = bracedBlock(source, match.index, `action ${match[2]}`);
    if (!block) continue;
    actions.push({ block, id: match[2], type: match[1] });
  }
  return actions;
}

async function exportedComponents() {
  const files = (await readdir(playgroundRoot))
    .filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"))
    .sort();
  const exports = [];
  for (const file of files) {
    const source = await readFile(path.join(playgroundRoot, file), "utf8");
    const names = new Set();
    for (const match of source.matchAll(
      /^export\s+(?:function|const)\s+([A-Z][A-Za-z0-9_]*)\b/gmu,
    )) {
      names.add(match[1]);
    }
    for (const exportName of names) exports.push({ exportName, source: file });
  }
  return exports.sort((left, right) =>
    left.exportName.localeCompare(right.exportName),
  );
}

async function validateInventory() {
  const inventory = await exportedComponents();
  const inventoryNames = new Set(inventory.map((record) => record.exportName));
  const contractNames = new Set(contracts.map((record) => record.exportName));
  const missing = inventory.filter(
    (record) => !contractNames.has(record.exportName),
  );
  const orphaned = contracts.filter(
    (record) => !inventoryNames.has(record.exportName),
  );
  if (missing.length > 0 || orphaned.length > 0) {
    throw new Error(
      `Playground component inventory drift. Missing contracts: ${missing.map((record) => record.exportName).join(", ") || "none"}. Orphaned contracts: ${orphaned.map((record) => record.exportName).join(", ") || "none"}.`,
    );
  }

  const sources = new Map(
    inventory.map((record) => [record.exportName, record.source]),
  );
  for (const contract of contracts) contract.source = sources.get(contract.exportName);
  return inventory;
}

async function validateLegacyImports() {
  const legacyNames = new Set(
    contracts
      .filter((record) => record.status === "legacy-unmounted")
      .map((record) => record.exportName),
  );
  const allowedLegacyConsumers = new Set([
    "SceneState.tsx",
    "WorkspaceContext.tsx",
    "WorkspacePanels.tsx",
    "WorkspacePlayground.tsx",
    "WorkspaceSceneSurface.tsx",
  ]);
  const files = (await readdir(playgroundRoot))
    .filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"))
    .sort();
  for (const file of files) {
    const source = await readFile(path.join(playgroundRoot, file), "utf8");
    for (const statement of source.matchAll(/import[\s\S]*?from\s+"[^"]+";/gu)) {
      const importedBindings = statement[0].split(/\s+from\s+/u, 1)[0];
      for (const exportName of legacyNames) {
        if (
          new RegExp(`\\b${exportName}\\b`, "u").test(importedBindings) &&
          !allowedLegacyConsumers.has(file)
        ) {
          throw new Error(
            `${file} imports legacy-only Playground component ${exportName}.`,
          );
        }
      }
    }
  }
}

async function validateScenarioMapping() {
  const routeSuite = await readFile(
    path.join(projectRoot, "tests", "e2e", "playground-route-contracts.acl"),
    "utf8",
  );
  const suiteCache = new Map();
  for (const contract of contracts.filter((record) => record.status === "active")) {
    const [, , routeScenario] = routes[contract.routeKey];
    const routeBlock = scenarioBlock(routeSuite, routeScenario);
    if (!routeBlock) throw new Error(`Missing route scenario ${routeScenario}.`);
    for (const evidenceAction of [
      "viewport",
      "screenshot",
      "accessibility",
      "console",
      "page_errors",
    ]) {
      if (!new RegExp(`\\b${evidenceAction}\\s+"`, "u").test(routeBlock)) {
        throw new Error(`${routeScenario} lacks ${evidenceAction} evidence.`);
      }
    }

    let suiteSource = suiteCache.get(contract.behaviorSuite);
    if (!suiteSource) {
      suiteSource = await readFile(
        path.join(projectRoot, contract.behaviorSuite),
        "utf8",
      );
      suiteCache.set(contract.behaviorSuite, suiteSource);
    }
    const behaviorBlock = scenarioBlock(suiteSource, contract.behaviorScenario);
    if (!behaviorBlock) {
      throw new Error(
        `${contract.exportName} references missing scenario ${contract.behaviorSuite}#${contract.behaviorScenario}.`,
      );
    }
    if (!behaviorBlock.includes(contract.target)) {
      throw new Error(
        `${contract.behaviorSuite}#${contract.behaviorScenario} does not explicitly target ${contract.exportName} at ${contract.target}.`,
      );
    }
    if (!/\b(?:click|fill|focus|press|select|check|drag|wheel)\s+"/u.test(behaviorBlock)) {
      throw new Error(
        `${contract.behaviorSuite}#${contract.behaviorScenario} has no user interaction for ${contract.exportName}.`,
      );
    }
    for (const evidenceAction of ["console", "page_errors"]) {
      if (!new RegExp(`\\b${evidenceAction}\\s+"`, "u").test(behaviorBlock)) {
        throw new Error(
          `${contract.behaviorSuite}#${contract.behaviorScenario} lacks ${evidenceAction} evidence.`,
        );
      }
    }

    const assertions = scenarioActions(behaviorBlock).filter(
      (action) =>
        (action.type === "expect" || action.type === "wait") &&
        action.block.includes(contract.target),
    );
    if (assertions.length === 0) {
      throw new Error(
        `${contract.behaviorSuite}#${contract.behaviorScenario} has no direct wait or expectation for ${contract.exportName} at ${contract.target}.`,
      );
    }
    const behaviorAssertion =
      behaviorAssertionOverrides[contract.exportName] ?? assertions[0].id;
    if (!assertions.some((assertion) => assertion.id === behaviorAssertion)) {
      throw new Error(
        `${contract.exportName} maps to missing behavior assertion ${behaviorAssertion} in ${contract.behaviorSuite}#${contract.behaviorScenario}.`,
      );
    }
    contract.behaviorAssertion = behaviorAssertion;
    contract.behaviorEvidenceKey = `${contract.behaviorSuite}#${contract.behaviorScenario}#${behaviorAssertion}`;
  }
}

function renderPrd(contract) {
  const name = splitName(contract.exportName);
  const slug = slugify(contract.exportName);
  const [route, surfaceSelector, routeScenario] = routes[contract.routeKey];
  const active = contract.status === "active";
  const behaviorMapping = active
    ? `| Behavioral suite | \`${contract.behaviorSuite}\` |\n| Behavioral scenario | \`${contract.behaviorScenario}\` |\n| Behavior assertion | \`${contract.behaviorAssertion}\` |`
    : `| Boundary suite | \`tests/e2e/playground-component-boundaries.acl\` |\n| Boundary scenario | \`playground-legacy-${slug}\` |\n| Boundary assertion | \`legacy-workspace-absent\` |`;
  const behaviorParagraph = active
    ? `The component is exercised at \`${contract.target}\` by \`${contract.behaviorSuite}#${contract.behaviorScenario}\`. The uniquely assigned \`${contract.behaviorAssertion}\` action directly verifies this component inside that state-changing path; the route scenario independently owns direct-load, responsive, accessibility, console, page-error, and screenshot evidence.`
    : `The export has no supported visible target. \`tests/e2e/playground-component-boundaries.acl#playground-legacy-${slug}\` proves the current application renders without \`.a3s-workspace-playground\` at desktop and phone widths, while the generator rejects any active import of this legacy export.`;

  return `# ${name} Product Requirements

| Field | Contract |
| --- | --- |
| Export | \`${contract.exportName}\` |
| Source | \`site/theme/components/playground/${contract.source}\` |
| Classification | \`${contract.status}\` |
| Canonical route | \`${route}\` |
| Route surface | \`${surfaceSelector}\` |
| Route evidence | \`tests/e2e/playground-route-contracts.acl#${routeScenario}\` |
${behaviorMapping}

## User problem

${contract.job} This internal component is justified only as a reusable, deterministic composition boundary. Its requirements must describe the decision it supports rather than restating its export name or visual shape.

## Product boundary

${contract.ownership}

The UI repository owns design tokens, accessible interaction contracts, framework adapters, documentation, and deterministic composition fixtures. A host product owns real services, domain routing, data authority, user permissions, storage, synchronization, and external effects. Fixture callbacks can demonstrate intent, but they cannot turn this component into a second product implementation.

## States

${
    active
      ? `Required states are ready, focused, selected or expanded where applicable, compact, localized, dark, empty, unavailable, invalid, pending, successful, and failed. Only states owned by ${name} may change its local DOM; host-owned progress and outcomes remain explicit fixture inputs.`
      : `Required states are legacy-only and unmounted. The source may remain temporarily for private compatibility, but it has no ready, selected, loading, empty, error, route, or navigation state in the current Playground. A future removal must delete its contract and source together.`
  }

State changes preserve the user's last safe context. Visual styling never becomes the sole state signal, and hidden or inactive content leaves the pointer, keyboard, and accessibility paths consistently.

## Interaction contract

${behaviorParagraph}

${
    active
      ? `Pointer and keyboard paths must reach the same decision. Focus enters through a named native control, movement follows the widget's documented orientation, Escape cancels a transient layer, and focus returns to the exact trigger. The component target is \`${contract.target}\`; incidental descendants are not a supported automation API.`
      : `No current user interaction may mount or reveal this export. Source-level admission is part of the contract because providers and icon renderers may produce no unique DOM root. The boundary test therefore combines import-graph rejection with visible proof that the retired workspace root is absent.`
  }

## Responsive behavior

The canonical route is verified at 1440 × 1000 and 390 × 844. Reading order and focus order follow the semantic DOM, the owning region controls scrolling, and primary actions remain visible without page-level horizontal overflow. Compact disclosure must retain the current value and a recovery route; desktop width cannot be used to hide missing hierarchy.

Component-specific adversarial requirement: ${contract.adversarial}

## Accessibility

Every active control has a durable accessible name and uses the closest native element. Selected, expanded, disabled, busy, invalid, and modal state are expressed with native properties, text, or documented ARIA in addition to color and iconography. Focus remains visible without a heavy double ring, touch targets stay usable, reduced-motion preferences are respected, and localized labels can wrap. Legacy-only exports must remain absent from both the visual and accessibility trees.

## Failure, empty, and loading cases

Loading preserves useful geometry and names the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable integration. Validation errors stay adjacent to the value that needs correction and retain non-sensitive input. Runtime failure preserves the last safe selection, exposes retry only when retry is valid, and never claims persistence or external completion. Denied, stale, malformed, oversized, unsupported, and untrusted inputs remain bounded by the owning region.

## Acceptance criteria

- The export inventory contains exactly one \`${contract.exportName}\` declaration in \`site/theme/components/playground/${contract.source}\` and exactly one matching PRD and coverage record.
- The canonical route \`${route}\` loads directly and passes \`${routeScenario}\` with desktop and phone screenshots, accessibility evidence, console capture, and page-error capture.
- ${
    active
      ? `The real interaction path \`${contract.behaviorScenario}\` explicitly targets \`${contract.target}\`; its unique \`${contract.behaviorAssertion}\` assertion verifies this component while the same workflow proves a state-changing keyboard or pointer action.`
      : `The generated boundary scenario \`playground-legacy-${slug}\` proves the current Product Application does not mount the retired workspace root.`
  }
- Focus, selection, disclosure, disabled state, and cancellation remain semantically synchronized; transient layers restore focus to their exact trigger.
- Empty, pending, invalid, denied, stale, failed, and recovery cases keep prior context and never fabricate host authority or success.
- Desktop and compact layouts preserve the primary decision, visible focus, readable localized copy, bounded scrolling, and a reachable recovery action.
- The component-specific product boundary remains enforced: ${contract.ownership}
- The adversarial release condition passes without weakening selectors or assertions: ${contract.adversarial}
- Console and page-error evidence contain no unexpected runtime failures on the deterministic acceptance path.

## A3S Test mapping

- Direct route evidence: \`tests/e2e/playground-route-contracts.acl#${routeScenario}\` at \`http://127.0.0.1:4178/UI${route}\`.
- ${
    active
      ? `Behavior evidence: \`${contract.behaviorSuite}#${contract.behaviorScenario}\`, assertion \`${contract.behaviorAssertion}\`, with stable target \`${contract.target}\`.`
      : `Boundary evidence: \`tests/e2e/playground-component-boundaries.acl#playground-legacy-${slug}\`, plus the generator's active-import rejection.`
  }
- Required evidence is desktop and phone visual capture, an interactive accessibility tree, console output, page errors, and at least one deterministic state-changing action for every active component.
`;
}

function renderBoundaryScenario(contract) {
  const slug = slugify(contract.exportName);
  return `    scenario "playground-legacy-${slug}" {
        name = "${splitName(contract.exportName)} remains outside the current task-first Playground"
        surface = "web"
        timeout_ms = 60000
        viewport "desktop" { width = 1440 height = 1000 }

        navigate "open" { url = "http://127.0.0.1:4178/UI/playground.html" }
        wait "loaded" { load = "networkidle" }
        wait "current-application" { visible = css("[data-product-application][data-view=start]") }
        expect "current-composer" { visible = css("[data-product-surface=start] .product-composer") }
        expect "legacy-workspace-absent" { visible = css("[data-product-application]:not(:has(.a3s-workspace-playground))") }
        screenshot "capture-desktop" { path = "playground/boundaries/${slug}-desktop.png" }

        viewport "phone" { width = 390 height = 844 }
        expect "compact-current-application" { visible = css("[data-product-application][data-view=start]:not(:has(.a3s-workspace-playground))") }
        expect "compact-current-composer" { visible = css("[data-product-surface=start] .product-composer") }
        screenshot "capture-compact" { path = "playground/boundaries/${slug}-compact.png" }
        accessibility "tree" { path = "playground/boundaries/${slug}-accessibility.json" interactive = true }
        console "console" { path = "playground/boundaries/${slug}-console.json" clear = false }
        page_errors "errors" { path = "playground/boundaries/${slug}-errors.json" clear = false }
    }`;
}

async function writeOrCheck(filePath, expected) {
  if (checkOnly) {
    let actual;
    try {
      actual = await readFile(filePath, "utf8");
    } catch {
      throw new Error(`${path.relative(projectRoot, filePath)} is missing.`);
    }
    if (actual !== expected) {
      throw new Error(
        `${path.relative(projectRoot, filePath)} is stale; run npm run generate:playground-component-contracts.`,
      );
    }
    return;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, expected, "utf8");
}

await validateInventory();
await validateLegacyImports();
await validateScenarioMapping();
assertUniqueValues(contracts, "exportName", "Playground component export");
assertUniqueValues(contracts, "job", "Playground component user problem");
assertUniqueValues(contracts, "ownership", "Playground component boundary");
assertUniqueValues(contracts, "adversarial", "Playground adversarial condition");
assertUniqueValues(
  contracts.filter((record) => record.status === "active"),
  "behaviorEvidenceKey",
  "Playground component behavior evidence",
);

if (!checkOnly) {
  await rm(requirementsRoot, { recursive: true, force: true });
  await mkdir(requirementsRoot, { recursive: true });
}

const coverage = [];
for (const contract of contracts.sort((left, right) =>
  left.exportName.localeCompare(right.exportName),
)) {
  for (const [field, minLength] of [
    ["job", 110],
    ["ownership", 140],
    ["adversarial", 170],
  ]) {
    assertSubstantiveField({
      label: `${contract.exportName} ${field}`,
      minLength,
      value: contract[field],
    });
  }
  const slug = slugify(contract.exportName);
  const prd = `product-requirements/playground-components/${slug}.md`;
  const prdSource = renderPrd(contract);
  assertPrdQuality({
    label: `Product requirements for Playground component ${contract.exportName}`,
    source: prdSource,
    uniqueFragments: [contract.job, contract.ownership, contract.adversarial],
  });
  await writeOrCheck(path.join(projectRoot, prd), prdSource);
  const [route, surfaceSelector, routeScenario] = routes[contract.routeKey];
  coverage.push({
    behaviorAssertion:
      contract.status === "active"
        ? contract.behaviorAssertion
        : "legacy-workspace-absent",
    behaviorScenario:
      contract.status === "active"
        ? contract.behaviorScenario
        : `playground-legacy-${slug}`,
    behaviorSuite:
      contract.status === "active"
        ? contract.behaviorSuite
        : "tests/e2e/playground-component-boundaries.acl",
    exportName: contract.exportName,
    prd,
    route,
    routeScenario,
    routeSuite: "tests/e2e/playground-route-contracts.acl",
    selector: contract.target,
    source: `site/theme/components/playground/${contract.source}`,
    status: contract.status,
    surfaceSelector,
  });
}

const activeCount = coverage.filter((record) => record.status === "active").length;
const legacyCount = coverage.length - activeCount;
const readme = `# Playground Component Product Requirements

This directory contains one first-principles product requirements document for every PascalCase React component exported from \`site/theme/components/playground\`. These are internal deterministic composition fixtures, not additional public package APIs or product services.

- Active route components: ${activeCount}
- Legacy-only, unmounted components: ${legacyCount}
- Total covered exports: ${coverage.length}
- Machine-readable mapping with one unique A3S Test assertion per export: \`product-requirements/playground-component-coverage.json\`
- Active route evidence: \`tests/e2e/playground-route-contracts.acl\`
- Legacy boundary evidence: \`tests/e2e/playground-component-boundaries.acl\`

Run \`npm run generate:playground-component-contracts\` after changing the export inventory or an intentional fixture contract. The check command rejects missing exports, orphaned PRDs, shallow requirements, stale scenario mappings, and active imports of legacy-only workspace components.
`;
await writeOrCheck(path.join(requirementsRoot, "README.md"), readme);
await writeOrCheck(
  coveragePath,
  `${JSON.stringify({ schemaVersion: 1, components: coverage }, null, 2)}\n`,
);

const legacyContracts = contracts.filter(
  (record) => record.status === "legacy-unmounted",
);
const boundarySuite = `suite "a3s-ui-playground-component-boundaries" {
    version = 1

${legacyContracts.map(renderBoundaryScenario).join("\n\n")}
}
`;
await writeOrCheck(boundarySuitePath, boundarySuite);

console.log(
  `${checkOnly ? "Validated" : "Generated"} ${coverage.length} Playground component PRDs (${activeCount} active, ${legacyCount} legacy-only).`,
);
