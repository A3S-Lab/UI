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

The stable acceptance root is \`${stableRoot}\`. Pointer and keyboard users must reach the same primary actions. Keyboard focus enters through named controls, activation uses native Enter or Space behavior, Escape or a repeated toggle closes transient layers where applicable, and focus returns to the control that opened the layer. Resizing or dragging always has a keyboard-accessible preset or command.

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
- Component-specific edit, rejection, recovery, disclosure, and focus-return transitions are deterministic where this surface owns them.
- Product-specific risk is covered: ${surface.risk}

## A3S Test mapping

- Suite: \`${suite}\`.
- Scenario: \`${surface.scenario}\`.
- Preview URL: \`http://127.0.0.1:4178/UI${surface.route}\`.
- Stable target: \`${stableRoot}\`.
- Evidence: desktop screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log. Harness scenarios additionally prove their component-specific keyboard state transitions and focus recovery.
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
      ],
    });
    await writeOrCheck(path.join(projectRoot, prd), prdSource);
    coverage.push({
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

const playgroundSuite = `suite "a3s-ui-playground-route-contracts" {
    version = 1

${playground.map(renderPlaygroundScenario).join("\n\n")}
}
`;
await writeOrCheck(
  path.join(projectRoot, "tests", "e2e", "playground-route-contracts.acl"),
  playgroundSuite,
);
await writeOrCheck(
  path.join(projectRoot, "product-requirements", "surface-coverage.json"),
  `${JSON.stringify({ schemaVersion: 1, surfaces: coverage }, null, 2)}\n`,
);

console.log(
  `${checkOnly ? "Validated" : "Generated"} ${coverage.length} Harness and Playground surface PRDs.`,
);
