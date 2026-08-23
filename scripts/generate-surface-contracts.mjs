import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertPrdQuality } from "./contract-quality.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const requirementsRoot = path.join(
  projectRoot,
  "product-requirements",
  "surfaces",
);
const checkOnly = process.argv.includes("--check");

const harness = [
  {
    id: "dock-workspace",
    name: "Dock Workspace",
    route: "/harness/dock-workspace.html",
    selector: ".dockview-demo[data-mode=dock][data-ready=true]",
    scenario: "dock-workspace",
    problem:
      "Professional work surfaces need task context, an editor, preview, output, and resources to remain available while users rearrange their attention without losing state.",
    boundary:
      "The workspace owns panel composition, docking intent, tab focus, size constraints, maximize and restore, compact overflow, and a serializable view layout. The host owns panel data, permissions, business routing, popout security, and persistence policy.",
    states:
      "ready, docked, floating preview, maximized, restored, wide, and compact single-group",
    risk: "Dragging cannot be the only layout path; keyboard actions must float, maximize, restore, and reset, while compact mode keeps all five business tabs discoverable.",
  },
  {
    id: "grid-view",
    name: "Grid View",
    route: "/harness/grid-view.html",
    selector: ".dockview-demo[data-mode=grid][data-ready=true]",
    scenario: "grid-view",
    problem:
      "Analytical and monitoring surfaces need a stable two-dimensional grid whose regions can be resized without introducing tabs, panel lifecycle, or application routing.",
    boundary:
      "Grid View owns fixed-region sizing, separators, minimum dimensions, balanced and focus presets, and responsive containment. It does not own dynamic panel creation, domain data, saved dashboards, or authorization.",
    states: "initializing, ready, balanced, focus-canvas, wide, and compact",
    risk: "Every region must retain a useful minimum size, keyboard presets must offer an alternative to pointer resizing, and compact layouts must not clip the focused canvas.",
  },
  {
    id: "split-view",
    name: "Split View",
    route: "/harness/split-view.html",
    selector: ".dockview-demo[data-mode=split][data-ready=true]",
    scenario: "split-view",
    problem:
      "Ordered context, canvas, and preview regions need one-dimensional resizing when every region remains simultaneously meaningful and tabs would hide necessary context.",
    boundary:
      "Split View owns ordered panes, separators, minimum sizes, balanced and focus presets, and container adaptation. The host owns pane content, workflow state, persistence, and any decision to add or remove regions.",
    states: "initializing, ready, balanced, focus-canvas, wide, and compact",
    risk: "Separator and preset behavior must be keyboard reachable, DOM order must stay truthful, and the narrow topology must preserve all three regions without nested page scrolling.",
  },
  {
    id: "pane-view",
    name: "Pane View",
    route: "/harness/pane-view.html",
    selector: ".dockview-demo[data-mode=pane][data-ready=true]",
    scenario: "pane-view",
    problem:
      "Tool inspectors need titled regions that can be expanded, collapsed, and resized independently while keeping their identity visible and their content available on demand.",
    boundary:
      "Pane View owns pane headings, expansion state, size allocation, expand-all and collapse-all commands, and responsive stacking. The host owns the files, symbols, history data, and persistence of user preferences.",
    states:
      "initializing, mixed expansion, all collapsed, one expanded, all expanded, wide, and compact",
    risk: "Headings must remain real buttons with synchronized aria-expanded state, expanded bodies must receive usable height, and compact screenshots must prove content rather than title-only panes.",
  },
];

const workflowNodeAcceptance = {
  start: {
    localizedName: "工作流开始",
    edit: {
      target: ".a3s-form-field[data-a3s-form-path=workflow_name] input",
      value: "records.audit",
      assertion:
        ".a3s-form-field[data-a3s-form-path=workflow_name] input[value='records.audit']",
    },
    invalid: {
      target: ".a3s-form-field[data-a3s-form-path=workflow_name] input",
      assertion:
        ".a3s-form-field[data-a3s-form-path=workflow_name][data-invalid=true]:has(input[aria-invalid=true]:focus)",
      alert:
        ".a3s-form-field[data-a3s-form-path=workflow_name] .a3s-form-error[role=alert]",
    },
    resetAssertion:
      ".a3s-form-field[data-a3s-form-path=workflow_name] input[value='workflow.main']",
    validTarget: ".a3s-form-field[data-a3s-form-path=workflow_name] input",
    behavior:
      "Edit and apply the permanent workflow ID, reject an empty ID with focused textual validation, then recover the default without changing the selected start node.",
  },
  step: {
    localizedName: "执行步骤",
    edit: {
      target: ".a3s-form-field[data-a3s-form-path=step_name] input",
      value: "records.audit",
      assertion:
        ".a3s-form-field[data-a3s-form-path=step_name] input[value='records.audit']",
    },
    invalid: {
      target: ".a3s-form-field[data-a3s-form-path=step_name] input",
      assertion:
        ".a3s-form-field[data-a3s-form-path=step_name][data-invalid=true]:has(input[aria-invalid=true]:focus)",
      alert:
        ".a3s-form-field[data-a3s-form-path=step_name] .a3s-form-error[role=alert]",
    },
    resetAssertion:
      ".a3s-form-field[data-a3s-form-path=step_name] input[value='task.run']",
    validTarget: ".a3s-form-field[data-a3s-form-path=step_name] input",
    behavior:
      "Edit and apply the registered step handler, reject an empty handler with focused textual validation, then recover the safe default before running the node.",
  },
  batch: {
    localizedName: "批量执行步骤",
    edit: {
      target: "[data-a3s-form-path='steps.0.step_key']",
      value: "audit-record",
      assertion:
        "[data-a3s-form-path='steps.0.step_key'][value='audit-record']",
    },
    invalid: {
      target: "[data-a3s-form-path='steps.0.step_key']",
      assertion:
        ".a3s-form-flow-batch-list > li[data-invalid=true]:has([data-a3s-form-path='steps.0.step_key'][aria-invalid=true]:focus)",
      alert:
        ".a3s-form-field[data-a3s-form-path=steps] .a3s-form-flow-widget-errors [role=alert]",
    },
    resetAssertion: "[data-a3s-form-path='steps.0.step_key'][value='member-1']",
    validTarget: ".a3s-form-flow-batch",
    behavior:
      "Edit and apply the first durable batch member ID, reject an empty member ID in-place, expand the invalid member, and recover the default ordered member without losing the batch node.",
  },
  condition: {
    localizedName: "条件分支",
    edit: {
      target:
        ".a3s-form-field[data-a3s-form-path=expression] input[aria-label='要判断的字段']",
      value: "input.riskApproved",
      assertion:
        ".a3s-form-field[data-a3s-form-path=expression] input[aria-label='要判断的字段'][value='input.riskApproved']",
    },
    invalid: {
      target:
        ".a3s-form-field[data-a3s-form-path=expression] input[aria-label='要判断的字段']",
      assertion:
        ".a3s-form-field[data-a3s-form-path=expression][data-invalid=true]:has(:focus)",
      alert:
        ".a3s-form-field[data-a3s-form-path=expression] .a3s-form-error[role=alert]",
    },
    resetAssertion:
      ".a3s-form-field[data-a3s-form-path=expression] .a3s-form-flow-expression[data-mode=compare] input[aria-label='要判断的字段'][value='input.approved']",
    validTarget:
      ".a3s-form-field[data-a3s-form-path=expression] .a3s-form-flow-expression",
    behavior:
      "Edit and apply the condition field path, reject an empty expression path with focused analysis feedback, and restore the two-branch default while preserving the selected condition node.",
  },
  wait: {
    localizedName: "等待至",
    edit: {
      target:
        ".a3s-form-field[data-a3s-form-path=resume_at] input[aria-label='工作流字段路径']",
      value: "input.releaseAt",
      assertion:
        ".a3s-form-field[data-a3s-form-path=resume_at] input[aria-label='工作流字段路径'][value='input.releaseAt']",
    },
    invalid: {
      target:
        ".a3s-form-field[data-a3s-form-path=resume_at] input[aria-label='工作流字段路径']",
      assertion:
        ".a3s-form-field[data-a3s-form-path=resume_at][data-invalid=true]:has(:focus)",
      alert:
        ".a3s-form-field[data-a3s-form-path=resume_at] .a3s-form-error[role=alert]",
    },
    resetAssertion:
      ".a3s-form-field[data-a3s-form-path=resume_at] .a3s-form-flow-expression[data-mode=source] input[value='input.deadline']",
    validTarget:
      ".a3s-form-field[data-a3s-form-path=resume_at] .a3s-form-flow-expression",
    behavior:
      "Edit and apply the durable resume-time field path, reject an empty expression path, then restore the default saved-state deadline before running the wait node.",
  },
  hook: {
    localizedName: "等待外部回调",
    edit: {
      target: ".a3s-form-field[data-a3s-form-path=subject] input",
      value: "Approve audit release",
      assertion:
        ".a3s-form-field[data-a3s-form-path=subject] input[value='Approve audit release']",
    },
    invalid: {
      target: ".a3s-form-field[data-a3s-form-path=subject] input",
      assertion:
        ".a3s-form-field[data-a3s-form-path=subject][data-invalid=true]:has(input[aria-invalid=true]:focus)",
      alert:
        ".a3s-form-field[data-a3s-form-path=subject] .a3s-form-error[role=alert]",
    },
    resetAssertion:
      ".a3s-form-field[data-a3s-form-path=subject] input[value='Review workflow request']",
    validTarget: ".a3s-form-field[data-a3s-form-path=subject] input",
    behavior:
      "Edit and apply the audit-facing callback title, reject an empty request title, and recover the default title while retaining the callback node and token context.",
  },
  complete: {
    localizedName: "完成工作流",
    edit: {
      target:
        ".a3s-form-field[data-a3s-form-path=output_expression] input[aria-label='工作流字段路径']",
      value: "input.output",
      assertion:
        ".a3s-form-field[data-a3s-form-path=output_expression] input[aria-label='工作流字段路径'][value='input.output']",
    },
    invalid: {
      target:
        ".a3s-form-field[data-a3s-form-path=output_expression] input[aria-label='工作流字段路径']",
      assertion:
        ".a3s-form-field[data-a3s-form-path=output_expression][data-invalid=true]:has(:focus)",
      alert:
        ".a3s-form-field[data-a3s-form-path=output_expression] .a3s-form-error[role=alert]",
    },
    resetAssertion:
      ".a3s-form-field[data-a3s-form-path=output_expression] .a3s-form-flow-expression[data-mode=source] input[value='input']",
    validTarget:
      ".a3s-form-field[data-a3s-form-path=output_expression] .a3s-form-flow-expression",
    behavior:
      "Edit and apply the persisted success-result path, reject an empty output expression, and restore the default workflow input result before running the terminal node.",
  },
  fail: {
    localizedName: "标记工作流失败",
    edit: {
      mode: "source",
      modeTarget:
        ".a3s-form-field[data-a3s-form-path=error_expression] .a3s-form-flow-expression-mode select",
      target:
        ".a3s-form-field[data-a3s-form-path=error_expression] input[aria-label='工作流字段路径']",
      value: "input.failureReason",
      assertion:
        ".a3s-form-field[data-a3s-form-path=error_expression] .a3s-form-flow-expression[data-mode=source] input[value='input.failureReason']",
    },
    invalid: {
      target:
        ".a3s-form-field[data-a3s-form-path=error_expression] input[aria-label='工作流字段路径']",
      assertion:
        ".a3s-form-field[data-a3s-form-path=error_expression][data-invalid=true]:has(:focus)",
      alert:
        ".a3s-form-field[data-a3s-form-path=error_expression] .a3s-form-error[role=alert]",
    },
    resetAssertion:
      ".a3s-form-field[data-a3s-form-path=error_expression] .a3s-form-flow-expression[data-mode=template] textarea[aria-label='失败信息模板']",
    validTarget:
      ".a3s-form-field[data-a3s-form-path=error_expression] .a3s-form-flow-expression",
    behavior:
      "Switch the failure reason to a workflow field and apply it, reject an empty field path, then restore the explicit default failure template before running the terminal node fixture.",
  },
};

const workflowNodes = [
  [
    "start",
    "Workflow Start",
    "declare workflow identity, runtime entrypoint, input schema, and an optional idempotent run identity",
  ],
  [
    "step",
    "Run Step",
    "schedule one durable task with explicit input, retry, and exhausted-attempt behavior",
  ],
  [
    "batch",
    "Run Step Batch",
    "configure a non-empty ordered batch whose member identity remains durable across resume",
  ],
  [
    "condition",
    "Condition",
    "evaluate a side-effect-free expression and expose two stable control branches",
  ],
  [
    "wait",
    "Wait Until",
    "pause a durable run until a validated absolute UTC deadline or saved-state expression",
  ],
  [
    "hook",
    "Wait for Callback",
    "pause for a uniquely identified approval, webhook, UI action, or host event",
  ],
  [
    "complete",
    "Complete",
    "terminate successfully with a persisted JSON result produced by a validated expression",
  ],
  [
    "fail",
    "Fail Workflow",
    "terminate explicitly with a persisted error while keeping retry and compensation outside the node",
  ],
].map(([id, name, job]) => ({
  id: `workflow-${id}`,
  nodeType: `flow.${id}`,
  name,
  route: `/components/form-system/a3s-flow/${id}.html`,
  selector: `.a3s-form-workflow-node-preview[data-node-type='flow.${id}']`,
  panelSelector: `.a3s-form-flow-node-panel[data-node-type='flow.${id}']`,
  scenario: `workflow-node-${id}`,
  acceptance: workflowNodeAcceptance[id],
  problem: `Workflow authors need to ${job} without editing an untyped configuration blob or guessing which ports are available.`,
  boundary:
    "The node surface owns the typed manifest presentation, local field validation, port explanation, selected state, and controlled configuration callback. Flow owns graph and runtime semantics; the host owns credentials, authorization, persistence, compilation, registered handlers, and side effects.",
  states:
    "ready, selected, editing, invalid, read-only, running, succeeded, and failed where applicable",
  risk: "Compatibility-node pages must remain explicit migration surfaces, preserve the node discriminator and unknown fields, and never imply that a visual example executes or persists a workflow.",
}));

const workflow = [
  {
    id: "workflow-dag-embedding",
    name: "Flow 1.0 DAG Node Configuration",
    route: "/components/form-system/workflow-node-embedding.html",
    selector: ".a3s-doc-workflow-studio[data-panel-open=true]",
    scenario: "workflow-dag-embedding",
    acceptance: {
      ...workflowNodeAcceptance.condition,
      prepare: "select-condition",
      panelSelector:
        ".a3s-form-flow-node-panel[data-node-type='flow.condition']",
      behavior:
        "Open the node library, filter and select Condition, edit and invalidate its expression, recover defaults without changing selection, then close, reopen, and run that same DAG node.",
    },
    problem:
      "Workflow authors need one coherent library, canvas-node, and inspector contract for selecting and configuring a typed DAG node without losing graph context.",
    boundary:
      "The embedded studio owns node discovery, selected-node presentation, controlled field editing, inspector disclosure, and local demonstration results. Flow owns graph validation and execution ordering; the host owns manifests beyond the built-in catalog, credentials, authorization, persistence, compilation, and execution.",
    states:
      "ready, library closed or open, node selected, inspector open or closed, editing, validating, running, succeeded, failed, and read-only",
    risk: "The canvas, node library, and inspector must stay synchronized by node type; closing and reopening the inspector must preserve focus and selection; mobile layout must not create an unreachable fixed panel.",
  },
  ...workflowNodes,
];

const playground = [
  [
    "start",
    "New Task",
    "/playground.html",
    "start",
    "[data-product-surface=start]",
    "compose a task with workspace, model, effort, capability, and resource context before submission",
  ],
  [
    "assistant",
    "Assistant",
    "/playground/assistant.html",
    "assistant",
    "[data-product-surface=assistant]",
    "start focused work with an assistant configuration while retaining access to files and model settings",
  ],
  [
    "projects",
    "Projects",
    "/playground/projects.html",
    "projects",
    "[data-product-surface=projects]",
    "scan durable projects, understand their status, and enter the correct workspace",
  ],
  [
    "project",
    "Project Workspace",
    "/playground/projects/a3s-ui-experience.html",
    "project",
    "[data-product-surface=project]",
    "coordinate project activity, plan, tasks, assets, configuration, and sessions without leaving project context",
  ],
  [
    "project-session",
    "Project Session",
    "/playground/projects/a3s-ui-experience/sessions/release-readiness.html",
    "project-session",
    "[data-product-surface=project-session]",
    "review one project-bound session and its execution evidence without turning the session into a generic editor",
  ],
  [
    "capabilities",
    "Capabilities",
    "/playground/capabilities.html",
    "catalog",
    "[data-product-surface=catalog]",
    "discover, inspect, configure, and remove assistants, skills, and connectors with explicit lifecycle and permission boundaries",
  ],
  [
    "automations",
    "Automations",
    "/playground/automations.html",
    "automation",
    "[data-product-surface=automation]",
    "create, inspect, pause, run, and recover scheduled work while keeping schedule and run history distinguishable",
  ],
  [
    "memory",
    "Memory",
    "/playground/memory.html",
    "memory",
    "[data-product-surface=memory]",
    "review durable memories, approve candidate changes, inspect provenance, and attach relevant context to a task",
  ],
  [
    "extensions",
    "Extensions",
    "/playground/extensions.html",
    "marketplace",
    "[data-product-surface=marketplace]",
    "inspect extension capability, source, permission, installation, and failure states before changing local availability",
  ],
  [
    "files",
    "My Files",
    "/playground/resources/files.html",
    "resources",
    "[data-product-surface=files]",
    "navigate workspace files, select and preview resources, and express file-operation intent through a bounded manager",
  ],
  [
    "mail",
    "Mail",
    "/playground/resources/mail.html",
    "resources",
    "[data-product-surface=mail]",
    "connect and browse mailbox context, then start a task from an explicitly selected message",
  ],
  [
    "documents",
    "Documents",
    "/playground/resources/documents.html",
    "resources",
    "[data-product-surface=resources][data-resource=documents]",
    "connect an authorized document provider and reuse approved documents as task context",
  ],
  [
    "knowledge",
    "Knowledge",
    "/playground/resources/knowledge.html",
    "resources",
    "[data-product-surface=knowledge]",
    "manage knowledge bases and sources, understand ingestion health, and start work from selected durable context",
  ],
  [
    "inspiration",
    "Inspiration",
    "/playground/resources/inspiration.html",
    "resources",
    "[data-product-surface=inspiration]",
    "browse useful fragments, inspect their provenance, and deliberately convert one into structured work",
  ],
  [
    "session",
    "Seeded Session",
    "/playground/sessions/fix-session-recovery.html",
    "session",
    "[data-product-surface=session]",
    "inspect a deterministic conversation, execution history, files, graph, and device preview in one task-first session",
  ],
  [
    "created-session",
    "Current Session",
    "/playground/sessions/current.html",
    "created-session",
    "[data-product-surface=session]",
    "continue a locally created task, manage follow-up work, and recover honestly when no persisted session exists",
  ],
].map(([id, name, route, view, selector, job]) => ({
  id: `playground-${id}`,
  name,
  route,
  view,
  selector,
  scenario: `playground-route-${id}`,
  problem: `People evaluating the composition need to ${job}.`,
  boundary:
    "This route is a deterministic, in-memory integration fixture for reusable UI contracts. It may demonstrate host callbacks and recovery states, but it does not own real routing services, APIs, persistence, permissions, filesystem authority, scheduling, or domain orchestration.",
  states:
    "ready plus route-specific empty, loading, partial, error, selected, open, compact-navigation, and recovery states",
  risk: "The route must preserve one task-first information hierarchy, keep global navigation separate from the work canvas, expose truthful empty and failure states, and remain usable at 390px without imitating a second production backend.",
}));

function renderPrd(surface, group, suite) {
  const stableRoot =
    group === "playground"
      ? `[data-product-application][data-view=${surface.view}] ${surface.selector}`
      : surface.selector;
  const acceptanceDetail = surface.acceptance?.behavior
    ? `\n\nWorkflow-specific acceptance: ${surface.acceptance.behavior}`
    : "";
  const evidenceDetail = surface.acceptance
    ? ` An additional invalid-state screenshot is required at \`workflow/contracts/${surface.id}-invalid.png\`.`
    : "";
  return `# ${surface.name} Product Requirements

| Field | Contract |
| --- | --- |
| Surface group | \`${group}\` |
| Route | \`${surface.route}\` |
| Stable selector | \`${stableRoot}\` |
| A3S Test suite | \`${suite}\` |
| A3S Test scenario | \`${surface.scenario}\` |

## User problem

${surface.problem}

## Product boundary

${surface.boundary}

## States

The required state vocabulary is ${surface.states}. State transitions preserve prior user context, never fabricate host success, and keep selection, focus, and disclosure synchronized with semantic attributes.

## Interaction contract

The stable acceptance root is \`${stableRoot}\`. Pointer and keyboard users must reach the same primary actions. Keyboard focus enters through named controls, activation uses native Enter or Space behavior, Escape or a repeated toggle closes transient layers where applicable, and focus returns to the control that opened the layer. Resizing or dragging always has a keyboard-accessible preset or command.${acceptanceDetail}

## Responsive behavior

Desktop evidence uses 1440 × 1000 and compact evidence uses 390 × 844. The semantic reading order remains stable, the owning region controls scrolling, mobile navigation becomes inert while closed, and no primary value or recovery action is hidden behind clipping. ${surface.risk}

## Accessibility

The surface has a named region or application landmark, real headings, labeled controls, visible focus, and state expressed through native properties or documented ARIA. Closed navigation and modal layers are removed from the keyboard path. Status changes use bounded announcements, reduced motion is respected, and visual tone never carries meaning alone.

## Failure, empty, and loading cases

Loading preserves geometry and identifies the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable host integration. Errors retain the last safe context, state the failed operation, and expose retry only when deterministic recovery exists. Denied, offline, stale, malformed, and unsupported cases remain explicit and cannot silently become success.

## Acceptance criteria

- The route resolves directly on first load and exposes \`${stableRoot}\` after hydration.
- The primary user job and current state are understandable before any secondary detail is opened.
- Keyboard focus and activation prove the primary interaction boundary without depending on drag, hover, or precise pointing.
- Desktop and compact screenshots show complete, aligned content with no page-level horizontal overflow.
- Accessibility evidence contains the named surface, its controls, and truthful expanded, selected, disabled, or inert state.
- Console and page-error evidence contain no runtime failures.
- Component-specific edit, rejection, recovery, panel disclosure, focus return, running, and successful-result transitions are deterministic where this surface owns them.${
    surface.acceptance?.behavior
      ? ` The exact workflow proof is: ${surface.acceptance.behavior}`
      : ""
  }
- Product-specific risk is covered: ${surface.risk}

## A3S Test mapping

- Suite: \`${suite}\`.
- Scenario: \`${surface.scenario}\`.
- Preview URL: \`http://127.0.0.1:4178/UI${surface.route}\`.
- Stable target: \`${stableRoot}\`.
- Evidence: desktop screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.${evidenceDetail} Harness and Workflow interaction scenarios additionally prove their component-specific keyboard state transitions, invalid-state focus, reset recovery, disclosure focus return, and running-to-result transition.
`;
}

function renderPlaygroundScenario(surface) {
  const root = `[data-product-application][data-view=${surface.view}]`;
  const target = `${root} ${surface.selector}`;
  return `    scenario "${surface.scenario}" {
        name = "${surface.name} route preserves its desktop and compact application contract"
        surface = "web"
        timeout_ms = 60000
        viewport "desktop" { width = 1440 height = 1000 }

        navigate "open" { url = "http://127.0.0.1:4178/UI${surface.route}" }
        wait "loaded" { load = "networkidle" }
        wait "route-ready" { visible = css("${root}") }
        expect "surface-ready" { visible = css("${target}") }
        focus "focus-search" { target = css("${root} .product-sidebar__window button[aria-label='搜索']") }
        expect "search-focused" { visible = css("${root} .product-sidebar__window button[aria-label='搜索']:focus") }
        screenshot "capture-desktop" { path = "playground/routes/${surface.id}-desktop.png" }

        viewport "compact" { width = 390 height = 844 }
        expect "closed-navigation-inert" { visible = css("${root}:has(.product-sidebar[inert])") }
        focus "focus-mobile-navigation" { target = css("${root} .product-application__mobile-menu") }
        press "open-mobile-navigation" { key = "Enter" }
        expect "mobile-navigation-open" { visible = css("${root} .product-sidebar[data-mobile-open=true]:not([inert])") }
        screenshot "compact-open" { path = "playground/routes/${surface.id}-compact.png" }
        focus "focus-mobile-close" { target = css("${root} .product-sidebar__window button[aria-label='关闭应用导航']") }
        press "close-mobile-navigation" { key = "Enter" }
        wait "mobile-navigation-closed" { visible = css("${root}:has(.product-sidebar[inert])") }
        accessibility "tree" { path = "playground/routes/${surface.id}-accessibility.json" interactive = true }
        console "console" { path = "playground/routes/${surface.id}-console.json" clear = false }
        page_errors "errors" { path = "playground/routes/${surface.id}-errors.json" clear = false }
    }`;
}

function renderWorkflowScenario(surface) {
  const acceptance = surface.acceptance;
  if (!acceptance) {
    throw new Error(
      `${surface.id} is missing workflow-specific acceptance metadata.`,
    );
  }
  const initialPanelExpectation = surface.panelSelector
    ? `\n        expect "configuration-panel" { visible = css("${surface.panelSelector}") }`
    : `\n        expect "selected-node" { visible = css(".a3s-form-workflow-node-preview[data-selected=true]") }`;
  const panelSelector = acceptance.panelSelector ?? surface.panelSelector;
  if (!panelSelector) {
    throw new Error(
      `${surface.id} is missing its active workflow panel selector.`,
    );
  }
  const activeNodeSelector = surface.nodeType
    ? surface.selector
    : ".a3s-form-workflow-node-preview[data-node-type='flow.condition']";
  const activeNodeFocusSelector = `${activeNodeSelector} > .a3s-form-workflow-node-preview-select`;
  const panelTarget = (selector) => `${panelSelector} ${selector}`;
  const preparation =
    acceptance.prepare === "select-condition"
      ? `
        expect "initial-step-selected" { visible = css(".a3s-form-workflow-node-preview[data-node-type='flow.step'][data-selected=true]") }
        focus "focus-open-library" { target = css(".a3s-doc-workflow-studio__library-toggle") }
        press "open-library" { key = "Enter" }
        expect "node-library-open" { visible = css(".a3s-doc-workflow-studio[data-palette-open=true] .a3s-doc-workflow-library") }
        type "filter-condition" { target = css(".a3s-doc-workflow-library input[aria-label='搜索节点']") value = "条件" }
        expect "condition-result" { visible = css(".a3s-doc-workflow-library__list button[data-node-tone=cyan]") }
        focus "focus-condition-result" { target = css(".a3s-doc-workflow-library__list button[data-node-tone=cyan]") }
        press "select-condition" { key = "Enter" }
        wait "condition-selected" { visible = css("${activeNodeSelector}[data-selected=true]") }
        expect "condition-panel-matched" { visible = css("${panelSelector}") }
        expect "library-closed-after-selection" { visible = css(".a3s-doc-workflow-studio[data-palette-open=false]") }`
      : "";
  const editMode = acceptance.edit.modeTarget
    ? `
        select "choose-edit-mode" { target = css("${panelTarget(acceptance.edit.modeTarget)}") values = ["${acceptance.edit.mode}"] }
        expect "edit-mode-selected" { visible = css("${panelTarget(`${acceptance.edit.modeTarget}:has(option[value=${acceptance.edit.mode}]:checked)`)}") }`
    : "";

  return `    scenario "${surface.scenario}" {
        name = "${surface.name} proves node-specific edit, rejection, recovery, disclosure, and run behavior"
        surface = "web"
        timeout_ms = 90000
        viewport "desktop" { width = 1440 height = 1000 }

        navigate "open" { url = "http://127.0.0.1:4178/UI${surface.route}" }
        wait "loaded" { load = "networkidle" }
        wait "page-ready" { visible = css("html:not([data-a3s-defer-init])") }
        wait "surface-ready" { visible = css("${surface.selector}") }${initialPanelExpectation}${preparation}${editMode}

        fill "edit-node-field" { target = css("${panelTarget(acceptance.edit.target)}") value = ${JSON.stringify(acceptance.edit.value)} }
        type "synchronize-edit-input" { target = css("${panelTarget(acceptance.edit.target)}") value = "x" }
        focus "focus-edit-input" { target = css("${panelTarget(acceptance.edit.target)}") }
        press "remove-edit-sentinel" { key = "Backspace" }
        expect "edited-value-visible" { target = css("${panelTarget(acceptance.edit.target)}") value = ${JSON.stringify(acceptance.edit.value)} }
        focus "focus-apply-edit" { target = css("${panelTarget(".a3s-form-actions button[data-variant=primary]")}") }
        expect "edited-draft-preserved" { target = css("${panelTarget(acceptance.edit.target)}") value = ${JSON.stringify(acceptance.edit.value)} }
        press "apply-valid-edit" { key = "Enter" }
        expect "edit-applied" { text = "已应用「${acceptance.localizedName}」配置。" }

        fill "enter-invalid-value" { target = css("${panelTarget(acceptance.invalid.target)}") value = "" }
        type "synchronize-invalid-input" { target = css("${panelTarget(acceptance.invalid.target)}") value = "x" }
        focus "focus-invalid-input" { target = css("${panelTarget(acceptance.invalid.target)}") }
        press "remove-invalid-sentinel" { key = "Backspace" }
        focus "focus-apply-invalid" { target = css("${panelTarget(".a3s-form-actions button[data-variant=primary]")}") }
        expect "invalid-draft-preserved" { target = css("${panelTarget(acceptance.invalid.target)}") value = "" }
        press "reject-invalid-value" { key = "Enter" }
        wait "invalid-state-visible" { visible = css("${panelTarget(acceptance.invalid.assertion)}") }
        expect "invalid-message-visible" { visible = css("${panelTarget(acceptance.invalid.alert)}") }
        screenshot "capture-invalid" { path = "workflow/contracts/${surface.id}-invalid.png" }

        focus "focus-reset" { target = css("${panelTarget(".a3s-form-workflow-node-panel-header button[aria-label='恢复默认值']")}") }
        press "request-reset" { key = "Enter" }
        expect "reset-confirmation" { visible = css("${panelTarget(".a3s-form-workflow-node-panel-header button[aria-label='再次点击确认恢复']:focus")}") }
        press "confirm-reset" { key = "Enter" }
        wait "default-restored" { visible = css("${panelTarget(acceptance.resetAssertion)}") }
        expect "validation-cleared" { valid = css("${panelTarget(acceptance.validTarget)}") }
        expect "reset-announced" { text = "已恢复「${acceptance.localizedName}」默认配置。" }

        focus "focus-close-panel" { target = css("${panelTarget(".a3s-form-workflow-node-panel-header button[aria-label='关闭面板']")}") }
        press "close-panel" { key = "Enter" }
        wait "panel-closed" { visible = css(".a3s-doc-workflow-studio[data-panel-open=false]") }
        wait "node-focus-restored" { visible = css("${activeNodeFocusSelector}:focus") }
        press "reopen-panel" { key = "Enter" }
        wait "panel-reopened" { visible = css("${panelSelector}") }
        expect "recovered-context-preserved" { visible = css("${panelTarget(acceptance.resetAssertion)}") }

        focus "focus-run-node" { target = css("${panelTarget(".a3s-form-workflow-node-panel-header button[aria-label='运行节点']")}") }
        press "run-node" { key = "Enter" }
        wait "running-state" { visible = css("${activeNodeSelector}[data-status=running]") }
        wait "successful-state" { visible = css("${activeNodeSelector}[data-status=success]") }
        focus "focus-last-run" { target = css("${panelTarget(".a3s-form-workflow-node-tabs > button:nth-child(2)")}") }
        press "show-last-run" { key = "Enter" }
        expect "successful-result" { visible = css("${panelTarget(".a3s-doc-workflow-run-result[data-status=success]")}") }
        screenshot "capture-desktop" { path = "workflow/contracts/${surface.id}-desktop.png" }

        viewport "compact" { width = 390 height = 844 }
        expect "compact-surface" { visible = css("${surface.selector}") }
        expect "compact-panel" { visible = css("${panelSelector}") }
        expect "compact-result" { visible = css("${panelTarget(".a3s-doc-workflow-run-result[data-status=success]")}") }
        screenshot "capture-compact" { path = "workflow/contracts/${surface.id}-compact.png" }
        accessibility "tree" { path = "workflow/contracts/${surface.id}-accessibility.json" interactive = true }
        console "console" { path = "workflow/contracts/${surface.id}-console.json" clear = false }
        page_errors "errors" { path = "workflow/contracts/${surface.id}-errors.json" clear = false }
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
        `${path.relative(projectRoot, filePath)} is stale; run npm run generate:surface-contracts.`,
      );
    }
    return;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, expected, "utf8");
}

if (!checkOnly) {
  await rm(requirementsRoot, { recursive: true, force: true });
}

const groups = [
  ["harness", harness, "tests/e2e/harness-workspaces.acl"],
  ["workflow", workflow, "tests/e2e/workflow-surface-contracts.acl"],
  ["playground", playground, "tests/e2e/playground-route-contracts.acl"],
];
const coverage = [];
for (const [group, surfaces, suite] of groups) {
  for (const surface of surfaces) {
    const prd = `product-requirements/surfaces/${group}/${surface.id}.md`;
    const prdSource = renderPrd(surface, group, suite);
    assertPrdQuality({
      label: `Product requirements for ${surface.id}`,
      source: prdSource,
      uniqueFragments: [
        surface.problem,
        surface.boundary,
        surface.risk,
        ...(surface.acceptance?.behavior ? [surface.acceptance.behavior] : []),
      ],
    });
    await writeOrCheck(path.join(projectRoot, prd), prdSource);
    coverage.push({
      acceptance: surface.acceptance
        ? {
            behavior: surface.acceptance.behavior,
            editSelector: surface.acceptance.edit.target,
            invalidSelector: surface.acceptance.invalid.assertion,
            invalidScreenshot: `workflow/contracts/${surface.id}-invalid.png`,
            resetSelector: surface.acceptance.resetAssertion,
            validSelector: surface.acceptance.validTarget,
          }
        : undefined,
      group,
      name: surface.name,
      prd,
      route: surface.route,
      scenario: surface.scenario,
      selector:
        group === "playground"
          ? `[data-product-application][data-view=${surface.view}] ${surface.selector}`
          : surface.selector,
      suite,
    });
  }
}

const workflowSuite = `suite "a3s-ui-workflow-surface-contracts" {
    version = 1

${workflow.map(renderWorkflowScenario).join("\n\n")}
}
`;
const playgroundSuite = `suite "a3s-ui-playground-route-contracts" {
    version = 1

${playground.map(renderPlaygroundScenario).join("\n\n")}
}
`;
await writeOrCheck(
  path.join(projectRoot, "tests", "e2e", "workflow-surface-contracts.acl"),
  workflowSuite,
);
await writeOrCheck(
  path.join(projectRoot, "tests", "e2e", "playground-route-contracts.acl"),
  playgroundSuite,
);
await writeOrCheck(
  path.join(projectRoot, "product-requirements", "surface-coverage.json"),
  `${JSON.stringify({ schemaVersion: 1, surfaces: coverage }, null, 2)}\n`,
);

console.log(
  `${checkOnly ? "Validated" : "Generated"} ${coverage.length} Harness, Workflow, and Playground surface PRDs.`,
);
