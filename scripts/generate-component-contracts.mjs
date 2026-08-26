import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { components } from "../src/ai/manifest/index.js";
import { assertPrdQuality } from "./contract-quality.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const prdRoot = path.join(projectRoot, "product-requirements", "components");
const componentDetailsRoot = path.join(
  projectRoot,
  "product-requirements",
  "component-details",
);
const componentSuitePath = path.join(
  projectRoot,
  "tests",
  "e2e",
  "component-contracts.acl",
);
const coveragePath = path.join(
  projectRoot,
  "product-requirements",
  "component-coverage.json",
);
const checkOnly = process.argv.includes("--check");

function splitTableRow(line) {
  if (!line.startsWith("| ") || !line.endsWith("|")) return [];
  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function parseProductDecisions(source) {
  const decisions = new Map();
  for (const line of source.split(/\r?\n/u)) {
    const cells = splitTableRow(line);
    const slug = /^`([a-z0-9-]+)`$/u.exec(cells[1] ?? "")?.[1];
    if (!slug || cells.length < 5) continue;
    const [decision, priority = ""] = cells[2]
      .split("·")
      .map((value) => value.trim());
    decisions.set(slug, {
      contractId: cells[0],
      decision,
      priority,
      productBoundary: cells[3],
      adversarialProof: cells[4],
    });
  }
  return decisions;
}

function scenarioBlock(source, scenarioId) {
  const marker = `scenario "${scenarioId}"`;
  const start = source.indexOf(marker);
  if (start < 0) return undefined;
  const opening = source.indexOf("{", start + marker.length);
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
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unclosed scenario ${scenarioId}.`);
}

async function interactionScenarios() {
  const suiteRoot = path.join(projectRoot, "tests", "e2e");
  const suites = (await readdir(suiteRoot))
    .filter(
      (file) => file.endsWith(".acl") && file !== "component-contracts.acl",
    )
    .sort();
  const mapping = new Map();
  for (const suite of suites) {
    const source = await readFile(path.join(suiteRoot, suite), "utf8");
    for (const component of components) {
      const block = scenarioBlock(source, component.slug);
      if (!block) continue;
      const existing = mapping.get(component.slug);
      if (existing) {
        throw new Error(
          `${component.slug} has duplicate interaction scenarios in ${existing.suite} and ${suite}.`,
        );
      }
      mapping.set(component.slug, { block, suite });
    }
  }
  return mapping;
}

function guideIntroduction(source, fallback) {
  const lines = source.split(/\r?\n/u);
  const headingIndex = lines.findIndex((line) => /^#\s+/u.test(line));
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || /^(?:<|```|#|\||import\s|export\s|\{\/\*)/u.test(line)) {
      continue;
    }
    const paragraph = [line];
    for (let next = index + 1; next < lines.length; next += 1) {
      const continuation = lines[next].trim();
      if (!continuation || /^(?:<|```|#|\|)/u.test(continuation)) break;
      paragraph.push(continuation);
    }
    return paragraph.join(" ");
  }
  return fallback;
}

async function optionalComponentDetails(slug) {
  const filePath = path.join(componentDetailsRoot, `${slug}.md`);
  try {
    return {
      path: path.relative(projectRoot, filePath),
      source: await readFile(filePath, "utf8"),
    };
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

function formatList(values) {
  return values.length > 0
    ? values.map((value) => `\`${value}\``).join(", ")
    : "None";
}

const progressingStates = new Set([
  "awaiting",
  "busy",
  "capturing",
  "closing",
  "copying",
  "generating",
  "loading",
  "preparing",
  "recording",
  "renaming",
  "restoring",
  "running",
  "saving",
  "sending",
  "stopping",
  "streaming",
  "submitting",
  "uploading",
  "waiting",
]);
const positiveStates = new Set([
  "accepted",
  "approved",
  "complete",
  "copied",
  "installed",
  "restored",
  "saved",
  "sent",
  "succeeded",
  "success",
  "verified",
]);
const negativeStates = new Set([
  "blocked",
  "cancelled",
  "conflict",
  "danger",
  "denied",
  "destructive",
  "error",
  "expired",
  "failed",
  "invalid",
  "missing",
  "offline",
  "permission-denied",
  "problem",
  "rejected",
  "stale",
  "stopped",
  "timed-out",
  "unavailable",
  "unsupported",
  "unverified",
  "warning",
]);
const choiceStates = new Set([
  "active",
  "checked",
  "current",
  "indeterminate",
  "pressed",
  "selected",
  "unchecked",
  "visited",
]);
const disclosureStates = new Set([
  "closed",
  "collapsed",
  "context-open",
  "docked",
  "expanded",
  "floating",
  "hidden",
  "inspector-open",
  "mobile-open",
  "open",
  "sheet",
  "visible",
]);

function stateDescription(componentName, state) {
  if (progressingStates.has(state)) {
    return `${componentName} preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.`;
  }
  if (positiveStates.has(state)) {
    return `${componentName} presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.`;
  }
  if (negativeStates.has(state)) {
    return `${componentName} explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.`;
  }
  if (choiceStates.has(state)) {
    return `${componentName} exposes this choice or current-state relationship through native state or ARIA in addition to visual treatment.`;
  }
  if (disclosureStates.has(state)) {
    return `${componentName} keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.`;
  }
  if (state === "disabled" || state === "read-only" || state === "readonly") {
    return `${componentName} remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.`;
  }
  if (state === "empty") {
    return `${componentName} states what is absent and why when known, then offers only a valid next action.`;
  }
  if (state === "ready" || state === "idle" || state === "display") {
    return `${componentName} is stable, named, and ready for its primary reading or interaction job.`;
  }
  return `${componentName} communicates the \`${state}\` condition with explicit text, structure, or native state rather than color alone.`;
}

function stateSection(component) {
  return component.states
    .map(
      (state) => `- \`${state}\` — ${stateDescription(component.name, state)}`,
    )
    .join("\n");
}

function partSection(component) {
  const parts = Object.entries(component.parts);
  const lines = [
    `- Canonical root: \`${component.selector}\`${
      component.framework.tag ? ` on \`<${component.framework.tag}>\`` : ""
    }.`,
    `- Stable automation root: \`${component.test.selector}\`.`,
  ];
  if (parts.length > 0) {
    lines.push(
      `- Named parts: ${parts
        .map(([name, selector]) => `\`${name}\` (\`${selector}\`)`)
        .join("; ")}.`,
    );
  } else {
    lines.push(
      "- Named parts: none; consumers must not depend on incidental descendants.",
    );
  }
  if (component.actions.length > 0) {
    lines.push(
      `- Supported interaction intents: ${formatList(component.actions)}. Each intent targets the documented root or named part and must remain scoped to one instance.`,
    );
  } else {
    lines.push(
      "- This is a presentation contract. It must not invent click or keyboard behavior when the composed native elements do not own an action.",
    );
  }
  if (component.events.length > 0) {
    lines.push(`- Public events: ${formatList(component.events)}.`);
  }
  if (component.methods.length > 0) {
    lines.push(`- Public methods: ${formatList(component.methods)}.`);
  }
  return lines.join("\n");
}

function asynchronousCase(component, candidates, fallback) {
  const states = component.states.filter((state) => candidates.has(state));
  return states.length > 0 ? formatList(states) : fallback;
}

function contractPreviewSelectors(component) {
  const slug = component.slug;
  const publicSelector = component.test.selector.replaceAll('"', "'");
  const integrationPreview = `.a3s-preview[data-preview-component=${slug}][data-preview-integration=complete]`;
  const publicPreview =
    slug === "code-editor"
      ? `.a3s-preview[data-preview-component=${slug}]:has(.code-editor[aria-label='Workflow code editor'])`
      : integrationPreview;
  return {
    integrationPreview,
    publicPreview,
    publicRoot: `${publicPreview} ${publicSelector}`,
    publicSelector,
  };
}

const aclInteractionAliases = {
  check: ["check", "click", "press"],
  click: ["click", "press", "check", "uncheck"],
  contextClick: ["context_click"],
  doubleClick: ["double_click"],
  drag: ["drag"],
  fill: ["fill", "type"],
  focus: ["focus"],
  hover: ["hover"],
  press: ["press", "click"],
  select: ["select", "click", "press"],
  type: ["type", "fill"],
  uncheck: ["uncheck", "click", "press"],
  wheel: ["wheel"],
};

function aclIdentifier(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[^A-Za-z0-9_-]+/gu, "-")
    .toLowerCase();
}

function aclSelector(value) {
  return value.replaceAll('"', "'");
}

function behaviorActions(component, interaction) {
  return component.actions.filter((action) =>
    (aclInteractionAliases[action] ?? [action]).some((actionType) =>
      new RegExp(`\\b${actionType}\\s+"`, "u").test(interaction.block),
    ),
  );
}

function assertBehaviorContract(component, interaction) {
  const assertionCount = [...interaction.block.matchAll(/\bexpect\s+"/gu)]
    .length;
  if (assertionCount === 0) {
    throw new Error(
      `${interaction.suite}#${component.slug} must assert a component-specific outcome.`,
    );
  }

  const coveredActions = behaviorActions(component, interaction);
  if (component.actions.length > 0 && coveredActions.length === 0) {
    throw new Error(
      `${interaction.suite}#${component.slug} must exercise at least one supported interaction intent (${component.actions.join(", ")}).`,
    );
  }
  return coveredActions;
}

function stateMatrixRoot(component) {
  return `.a3s-component-state-matrix[open][data-component=${component.slug}]`;
}

function qualifiedStateSelector(component, state, selector) {
  const root = aclSelector(selector);
  if (component.slug === "field") {
    if (state === "empty") {
      return `${root}[data-state~='empty']:not([data-invalid]):has(> input[value='']:not([aria-invalid]):not(:disabled):not([readonly])):has(> [data-field-description]):has(> [data-field-message][hidden])`;
    }
    if (state === "ready") {
      return `${root}[data-state~='ready']:not([data-invalid]):has(> input[value='Agent Runtime']:not([aria-invalid]):not(:disabled):not([readonly])):has(> [data-field-description]):has(> [data-field-message][hidden])`;
    }
    if (state === "disabled") {
      return `${root}[data-state~='disabled'][data-disabled]:not([aria-disabled]):has(> input[disabled][value='Archived Runtime']):has(> [data-field-description])`;
    }
    if (state === "invalid") {
      return `${root}[data-state~='invalid'][data-invalid]:not([aria-invalid]):has(> input[aria-invalid=true][value='A']):has(> [data-field-message][role=alert]:not([hidden]))`;
    }
    if (state === "readonly") {
      return `${root}[data-state~='readonly'][data-readonly]:not([aria-readonly]):has(> input[readonly][value='Production Runtime']):has(> [data-field-description])`;
    }
  }
  if (component.slug === "input") {
    if (state === "empty") return `${root}[value='']`;
    if (state === "ready") return `${root}[value='alex@example.com']`;
    if (state === "disabled") {
      return `${root}[disabled][value='archived@example.com']`;
    }
    if (state === "invalid") {
      return `${root}[required][aria-invalid=true][value='owner@']:invalid`;
    }
    if (state === "readonly") {
      return `${root}[readonly][value='account-owner@example.com']`;
    }
  }
  if (component.slug === "input-group") {
    if (state === "empty") {
      return `${root}:not([aria-busy]):has(> input[value='']:not([aria-invalid]):not(:disabled):not([readonly]))`;
    }
    if (state === "ready") {
      return `${root}:not([aria-busy]):has(> input[value='runtime']:not([aria-invalid]):not(:disabled):not([readonly]))`;
    }
    if (state === "invalid") {
      return `${root}:has(> input[required][minlength='3'][aria-invalid=true][value='r']:invalid)`;
    }
    if (state === "loading") {
      return `${root}[aria-busy=true]:has(> input[value='runtime']:not(:disabled):not([readonly])):has(> [data-input-group-status][role=status])`;
    }
    if (state === "disabled") {
      return `${root}[data-disabled]:not([aria-disabled]):has(> input[disabled][value='archived'])`;
    }
    if (state === "readonly") {
      return `${root}[data-readonly]:not([aria-readonly]):has(> input[readonly][value='release'])`;
    }
  }
  if (component.slug === "radio-group") {
    if (state === "ready") {
      return `${root}:has(input[type=radio][value=comfortable]:checked)`;
    }
    if (state === "disabled") {
      return `${root}[aria-disabled=true]:has(input[type=radio][value=comfortable]:checked:disabled)`;
    }
    if (state === "invalid") {
      return `${root}[aria-invalid=true][data-validation-state=invalid]:has(input[type=radio][required][aria-invalid=true]:invalid):has([data-state-specimen-feedback][role=alert])`;
    }
  }
  if (component.slug === "native-select") {
    if (state === "disabled") return `${root}[disabled]`;
    if (state === "invalid") {
      return `${root}[required][aria-invalid=true]:invalid`;
    }
  }
  if (component.slug === "code-editor") {
    if (state === "ready") return `${root}[data-dirty=false]`;
    if (state === "dirty") return `${root}[data-dirty=true]`;
    if (state === "invalid") {
      return `${root}[data-validation-state=invalid]:has(textarea[aria-invalid=true])`;
    }
    if (state === "readonly") {
      return `${root}[data-readonly]:has(textarea[readonly])`;
    }
  }
  if (component.slug === "progress") {
    if (state === "ready") {
      return `${root}[role=progressbar][aria-valuenow='66']:has(> span[style*='width'][style*='66%'])`;
    }
    if (state === "complete") {
      return `${root}[role=progressbar][aria-valuenow='100']:has(> span[style*='width'][style*='100%'])`;
    }
    if (state === "indeterminate") {
      return `${root}[role=progressbar]:not([aria-valuenow]):has(> span:not([style*='width']))`;
    }
  }

  if (state === "dirty") return `${root}[data-dirty=true]`;
  if (state === "valid") return `${root}[data-validation-state=valid]`;
  if (state === "invalid") {
    return `${root}:is([aria-invalid=true],[data-validation-state=invalid],:has([aria-invalid=true]))`;
  }
  if (state === "disabled" || state === "unavailable") {
    return `${root}:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true]))`;
  }
  if (state === "readonly" || state === "read-only") {
    return `${root}:is([readonly],[aria-readonly=true],[data-readonly],:has([readonly]))`;
  }
  if (progressingStates.has(state)) return `${root}[aria-busy=true]`;
  if (state === "active") return `${root}[data-active=true]`;
  if (state === "selected") return `${root}[data-selected=true]`;
  if (state === "pressed") return `${root}[aria-pressed=true]`;
  if (state === "current" || state === "visited") {
    return `${root}[aria-current]`;
  }
  if (state === "checked") {
    return `${root}:is(:checked,[aria-checked=true],:has(:checked),:has([aria-checked=true]))`;
  }
  if (state === "unchecked") {
    return `${root}:is(input:not(:checked),[aria-checked=false],:has(input:not(:checked)),:has([aria-checked=false]))`;
  }
  if (state === "indeterminate") {
    return `${root}:is(:indeterminate,[aria-checked=mixed],:has(:indeterminate),:has([aria-checked=mixed]))`;
  }
  if (
    [
      "expanded",
      "open",
      "inspector-open",
      "context-open",
      "mobile-open",
    ].includes(state)
  ) {
    if (component.parts.trigger) {
      return `${root}:has(${aclSelector(component.parts.trigger)}[aria-expanded=true])`;
    }
    return `${root}:is([open],[aria-expanded=true])`;
  }
  if (state === "collapsed" || state === "closed") {
    if (component.parts.trigger) {
      return `${root}:has(${aclSelector(component.parts.trigger)}[aria-expanded=false])`;
    }
    return `${root}:is(:not([open]),[aria-expanded=false])`;
  }
  if (state === "hidden") return `${root}[hidden]`;
  if (state === "visible") return `${root}:not([hidden])`;
  return root;
}

function stateSpecimenSelector(component, state, selector) {
  const specimen = `${stateMatrixRoot(component)} [data-state-specimen=${state}]`;
  const qualified = qualifiedStateSelector(component, state, selector);
  if (
    component.slug === "progress" ||
    component.slug === "radio-group" ||
    (component.slug === "code-editor" &&
      ["invalid", "readonly"].includes(state))
  ) {
    return `${specimen} ${qualified}`;
  }
  return `${specimen}:has(${qualified})`;
}

function stateEvidenceSelectors(component) {
  return Object.fromEntries(
    Object.entries(component.test.states).map(([state, selector]) => [
      state,
      stateSpecimenSelector(component, state, selector),
    ]),
  );
}

function renderStateExpectations(component) {
  const semanticExpectations = Object.entries(stateEvidenceSelectors(component))
    .map(
      ([state, selector]) =>
        `        expect "semantic-state-${aclIdentifier(state)}" { visible = css("${selector}") }`,
    )
    .join("\n");
  const detailExpectations =
    component.slug === "code-editor"
      ? `
        expect "dirty-state-announcement" { text = "Unsaved changes" }
        expect "invalid-state-announcement" { text = "Invalid content" }
        expect "readonly-state-announcement" { text = "Read only" }`
      : component.slug === "input"
        ? `
        expect "empty-state-guidance-visible" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=empty] .field:has(label[for]):has(input.input[value='']):has([data-state-specimen-feedback])") }
        expect "ready-state-preserves-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=ready] input.input[value='alex@example.com']") }
        expect "disabled-state-preserves-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=disabled] input.input[disabled][value='archived@example.com']") }
        expect "disabled-state-reason-visible" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=disabled] [data-state-specimen-feedback]") }
        expect "invalid-state-is-native" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=invalid] input.input[required][aria-invalid=true][value='owner@']:invalid") }
        expect "invalid-state-error-visible" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=invalid] [data-state-specimen-feedback][role=alert]") }
        expect "readonly-state-preserves-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=readonly] input.input[readonly][value='account-owner@example.com']") }
        expect "readonly-state-reason-visible" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=readonly] [data-state-specimen-feedback]") }`
        : component.slug === "input-group"
          ? `
        expect "empty-group-stays-neutral" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=empty] .field:has(label[for]):has(.input-group:not([aria-busy]) > input[value='']:not([aria-invalid]):not(:disabled):not([readonly])):has([data-state-specimen-feedback])") }
        expect "ready-group-preserves-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=ready] .input-group > input[value='runtime']") }
        expect "invalid-group-preserves-native-recovery" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=invalid] .field[data-invalid]:has(.input-group > input[required][minlength='3'][aria-invalid=true][value='r']:invalid):has([data-state-specimen-feedback][role=alert])") }
        expect "loading-group-preserves-editable-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=loading] .input-group[aria-busy=true]:has(> input[value='runtime']:not(:disabled):not([readonly])):has(> [data-input-group-status][role=status])") }
        expect "disabled-group-preserves-value-and-reason" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=disabled] .field[data-disabled]:has(.input-group[data-disabled] > input[disabled][value='archived']):has([data-state-specimen-feedback])") }
        expect "readonly-group-preserves-submission-semantics" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=readonly] .field[data-readonly]:has(.input-group[data-readonly] > input[readonly][value='release']):has([data-state-specimen-feedback])") }`
        : component.slug === "field"
          ? `
        expect "empty-field-stays-neutral" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=empty] .field:not([data-invalid]):has(> input[value='']:not([aria-invalid])):has(> [data-field-description]):has(> [data-field-message][hidden])") }
        expect "ready-field-preserves-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=ready] .field:has(> input[value='Agent Runtime']):has(> [data-field-description])") }
        expect "disabled-field-uses-native-control-semantics" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=disabled] .field[data-disabled]:not([aria-disabled]):has(> input[disabled][value='Archived Runtime']):has(> [data-field-description])") }
        expect "invalid-field-explains-recovery" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=invalid] .field[data-invalid]:not([aria-invalid]):has(> input[aria-invalid=true][value='A'][aria-describedby]):has(> [data-field-message][role=alert]:not([hidden]))") }
        expect "readonly-field-preserves-native-semantics" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=readonly] .field[data-readonly]:not([aria-readonly]):has(> input[readonly][value='Production Runtime']):has(> [data-field-description])") }`
          : component.slug === "native-select"
            ? `
        expect "empty-state-preserves-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=empty] select.native-select:has(option[value='']:checked)") }
        expect "empty-state-guidance-visible" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=empty] [data-state-specimen-feedback]") }
        expect "ready-state-preserves-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=ready] select.native-select:has(option[value=apple]:checked)") }
        expect "disabled-state-preserves-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=disabled] select.native-select[disabled]:has(option[value=apple]:checked)") }
        expect "disabled-state-reason-visible" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=disabled] [data-state-specimen-feedback]") }
        expect "invalid-state-is-native" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=invalid] select.native-select[required][aria-invalid=true]:invalid") }
        expect "invalid-state-error-visible" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=invalid] [role=alert]") }`
            : component.slug === "radio-group"
              ? `
        expect "ready-state-preserves-one-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=ready] input[type=radio][value=comfortable]:checked") }
        expect "disabled-state-preserves-one-value" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=disabled] input[type=radio][value=comfortable]:checked:disabled") }
        expect "invalid-state-is-unselected-and-native" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=invalid] input[type=radio][required][aria-invalid=true]:invalid:not(:checked)") }
        expect "invalid-state-error-visible" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=invalid] [data-state-specimen-feedback][role=alert]") }`
              : component.slug === "dialog"
                ? `
        expect "open-state-content" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=open] dialog.dialog[open] > :is(div, article):has(header h2):has(section):has(footer button)") }`
                : component.slug === "bulk-action-bar"
                  ? `
        expect "empty-state-hides-region" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=empty] .bulk-action-bar[data-state=empty][hidden]") }
        expect "loading-state-disables-conflicts" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=loading] .bulk-action-bar[data-state=loading][aria-busy=true] [data-bulk-action]:not([data-bulk-clear])[disabled]") }
        expect "loading-state-keeps-clear-escape" { visible = css("${stateMatrixRoot(component)} [data-state-specimen=loading] .bulk-action-bar[data-state=loading][aria-busy=true] [data-bulk-clear]:not([disabled]):not([aria-disabled=true])") }`
                : "";
  return `${semanticExpectations}${detailExpectations}`;
}

function renderStateMatrixContract(component, publicPreview) {
  const stateSelectors = stateEvidenceSelectors(component);
  const firstStateSelector = Object.values(stateSelectors)[0];
  const postCloseExpectation =
    component.slug === "radio-group"
      ? `
        expect "live-selection-survives-state-matrix" { visible = css("${publicPreview} .radio-group input[type=radio][value=comfortable]:checked") }`
      : "";
  return `
        focus "focus-state-matrix" { target = css("${publicPreview} [data-preview-control=states]") }
        press "open-state-matrix" { key = "Enter" }
        wait "state-matrix-open" { visible = css("${stateMatrixRoot(component)}") }
        wait "state-specimens-ready" { visible = css("${firstStateSelector}") }
${renderStateExpectations(component)}
        screenshot "state-matrix" { path = "components/contracts/${component.slug}-states.png" }
        press "close-state-matrix" { key = "Escape" }
        expect "state-trigger-restored" { visible = css("${publicPreview} [data-preview-control=states]:focus") }${postCloseExpectation}`;
}

const transientComponentTriggers = new Map([
  ["dialog", "Open Dialog"],
  ["drawer", "Open Drawer"],
]);

function renderPublicRootActivation(component, visiblePublicTarget, phase) {
  const trigger = transientComponentTriggers.get(component.slug);
  if (trigger) {
    return `
        click "${phase}-open-public-root" { target = role("button", "${trigger}") }
        wait "${phase}-public-root-ready" { visible = css("${visiblePublicTarget}") }`;
  }
  if (component.slug === "toast" && phase === "light") {
    return `
        click "${phase}-create-public-root" { target = role("button", "Toast from front-end") }
        wait "${phase}-public-root-ready" { visible = css("${visiblePublicTarget}") }`;
  }
  return "";
}

function renderPublicRootClose(
  component,
  publicPreview,
  publicSelector,
  phase,
) {
  if (!transientComponentTriggers.has(component.slug)) return "";
  return `
        press "${phase}-close-public-root" { key = "Escape" }
        wait "${phase}-public-root-closed" { visible = css("${publicPreview}:not(:has(${publicSelector}[open]))") }`;
}

function renderActivatedContextExpectations(component, publicRoot, phase) {
  if (component.slug !== "dialog" || phase !== "dark") return "";
  return `
        expect "dark-dialog-theme-context" { visible = css("${publicRoot}[open][data-a3s-theme=dark][dir=rtl] > :is(div, article)") }
        expect "dark-dialog-content-contract" { visible = css("${publicRoot}[open][data-a3s-theme=dark][dir=rtl] > :is(div, article):has(h2):has(input):has(footer button)") }`;
}

function renderPrd({
  component,
  decision,
  details,
  interaction,
  introduction,
}) {
  const route = `/en/components/${component.slug}.html`;
  const visualScenario = `component-contract-${component.slug}`;
  const progress = asynchronousCase(
    component,
    progressingStates,
    "not owned by this component",
  );
  const failures = asynchronousCase(
    component,
    negativeStates,
    "represented by the host or a composed feedback component",
  );
  const empty = component.states.includes("empty")
    ? "`empty`"
    : "not a distinct component state";
  const attributes = Object.entries(component.framework.attributes)
    .map(([name, value]) => `\`${name}=${value}\``)
    .join(", ");
  const { publicPreview } = contractPreviewSelectors(component);
  const matrixRoot = stateMatrixRoot(component);
  const matrixScreenshot = `components/contracts/${component.slug}-states.png`;
  const matrixStateSelectors = Object.entries(stateEvidenceSelectors(component))
    .map(([state, selector]) => `  - \`${state}\`: \`${selector}\``)
    .join("\n");

  return `# ${component.name} Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | \`${decision.contractId}\` |
| Decision | ${decision.decision} |
| Priority | ${decision.priority} |
| Category | \`${component.category}\` |
| Public route | \`${route}\` |
| Stable selector | \`${component.test.selector}\` |
| Interaction scenario | \`${interaction.suite}#${component.slug}\` |
| Evidence scenario | \`tests/e2e/component-contracts.acl#${visualScenario}\` |${details ? `\n| Deep review source | \`${details.path}\` |` : ""}

## User problem

${introduction} The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **${decision.decision}**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

${decision.productBoundary}

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

${stateSection(component)}

## Interaction contract

${partSection(component)}${
    attributes
      ? `\n- Required root attributes: ${attributes}.`
      : "\n- Required root attributes: none beyond the documented native semantics and states."
  }

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: ${decision.adversarialProof}

## Accessibility

The canonical root ${
    component.framework.tag
      ? `uses \`<${component.framework.tag}>\` semantics`
      : "must use the most appropriate native element"
  } and exposes ${Object.keys(component.parts).length} named part${
    Object.keys(component.parts).length === 1 ? "" : "s"
  }. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. ${
    component.actions.length > 0
      ? `Keyboard users must be able to complete ${formatList(component.actions)} without a precise pointer.`
      : "Any interactive descendants retain their own native names and keyboard behavior; the root does not add a false role."
  } Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

${details ? `${details.source.trim()}\n\n` : ""}

## Failure, empty, and loading cases

- Progress states: ${progress}. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: ${empty}. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: ${failures}. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches \`${component.selector}\` and is annotated by the runtime as \`${component.test.selector}\`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at \`${matrixRoot}\`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: ${decision.adversarialProof}
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: \`${interaction.suite}\`, scenario \`${component.slug}\`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: \`tests/e2e/component-contracts.acl\`, scenario \`${visualScenario}\`.
- Route under test: \`http://127.0.0.1:4178/UI${route}\`.
- Stable root target: \`${component.test.selector}\` inside \`${publicPreview}\`.
- State-matrix screenshot: \`${matrixScreenshot}\`.
- Per-state evidence selectors:
${matrixStateSelectors}
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
`;
}

function renderComponentScenario(component) {
  const slug = component.slug;
  const timeoutMs = slug === "dialog" ? 120000 : 60000;
  const { integrationPreview, publicPreview, publicRoot, publicSelector } =
    contractPreviewSelectors(component);
  const visiblePublicTarget =
    slug === "dialog"
      ? `${publicRoot}[open] > :is(div, article)`
      : transientComponentTriggers.has(slug)
        ? `${publicRoot}[open]`
        : publicRoot;
  const lightActivation = renderPublicRootActivation(
    component,
    visiblePublicTarget,
    "light",
  );
  const lightClose = renderPublicRootClose(
    component,
    publicPreview,
    publicSelector,
    "light",
  );
  const darkActivation = renderPublicRootActivation(
    component,
    visiblePublicTarget,
    "dark",
  );
  const darkClose = renderPublicRootClose(
    component,
    publicPreview,
    publicSelector,
    "dark",
  );
  const darkContextExpectations = renderActivatedContextExpectations(
    component,
    publicRoot,
    "dark",
  );
  const compactActivation = renderPublicRootActivation(
    component,
    visiblePublicTarget,
    "compact",
  );
  const compactClose = renderPublicRootClose(
    component,
    publicPreview,
    publicSelector,
    "compact",
  );
  const compactPreparation =
    slug === "dialog"
      ? `
        navigate "compact-reload" { url = "http://127.0.0.1:4178/UI/en/components/${slug}.html" }
        wait "compact-loaded" { load = "networkidle" }
        wait "compact-page-ready" { visible = css("html:not([data-a3s-defer-init])") }
        wait "compact-preview-ready" { visible = css("${integrationPreview}[data-preview-source=ready]") }`
      : "";
  const compactPreviewState =
    slug === "dialog"
      ? "[data-preview-scheme=inherit][data-preview-direction=ltr]"
      : "[data-preview-scheme=dark][data-preview-direction=rtl]";
  const compactAnchor =
    slug === "code-editor"
      ? `
        focus "compact-anchor-public-preview" { target = css("${publicPreview} [data-preview-control=viewport][data-preview-viewport-option=phone][aria-pressed=false]") }
        expect "compact-anchor-visible" { visible = css("${publicPreview} [data-preview-control=viewport][data-preview-viewport-option=phone]:focus") }
        expect "compact-public-root-framed" {
            target = css("${visiblePublicTarget}")
            viewport_coverage_at_least = 75
        }`
      : "";
  const stateMatrixPreview =
    slug === "code-editor" ? integrationPreview : publicPreview;
  return `    scenario "component-contract-${slug}" {
        name = "${component.name} keeps one public contract across documentation integrations and responsive states"
        surface = "web"
        timeout_ms = ${timeoutMs}
        viewport "desktop" { width = 1440 height = 1000 }

        navigate "open" { url = "http://127.0.0.1:4178/UI/en/components/${slug}.html" }
        wait "loaded" { load = "networkidle" }
        wait "page-ready" { visible = css("html:not([data-a3s-defer-init])") }
        wait "preview-ready" { visible = css("${integrationPreview}[data-preview-source=ready]") }
        wait "public-preview-ready" { visible = css("${publicPreview}[data-preview-source=ready]") }${lightActivation}
        expect "public-root" { visible = css("${visiblePublicTarget}") }
        expect "light-ltr-contract" { visible = css("${publicPreview}[data-preview-scheme=inherit][data-preview-direction=ltr]") }
        screenshot "desktop-light" { path = "components/contracts/${slug}-desktop-light.png" }
${lightClose}${renderStateMatrixContract(component, stateMatrixPreview)}

        focus "focus-source" { target = css("${integrationPreview} [data-preview-control=source]") }
        press "open-source" { key = "Enter" }
        expect "source-open" { visible = css("${integrationPreview} [data-preview-source-panel]:not([hidden])") }
        expect "framework-panel" { visible = css("${integrationPreview} [data-component-integration=${slug}][data-mode=complete]") }
        focus "focus-html-tab" { target = css("${integrationPreview} [data-component-integration=${slug}] [role=tab]:nth-child(1)") }
        press "select-html" { key = "Enter" }
        expect "html-selected" { visible = css("${integrationPreview} [data-component-integration=${slug}][data-framework=html] [role=tab]:nth-child(1)[aria-selected=true]:focus") }
        press "select-react" { key = "ArrowRight" }
        expect "react-selected" { visible = css("${integrationPreview} [data-component-integration=${slug}][data-framework=react] [role=tab]:nth-child(2)[aria-selected=true]:focus") }
        press "select-vue" { key = "ArrowRight" }
        expect "vue-selected" { visible = css("${integrationPreview} [data-component-integration=${slug}][data-framework=vue] [role=tab]:nth-child(3)[aria-selected=true]:focus") }

        focus "focus-appearance" { target = css("${publicPreview} [data-preview-control=appearance]") }
        press "enable-dark-preview" { key = "Enter" }
        expect "dark-preview" { visible = css("${publicPreview}[data-preview-scheme=dark]") }
        focus "focus-direction" { target = css("${publicPreview} [data-preview-control=direction]") }
        press "enable-rtl-preview" { key = "Enter" }
        expect "rtl-preview" { visible = css("${publicPreview}[data-preview-direction=rtl]") }${darkActivation}
        expect "dark-public-root" { visible = css("${visiblePublicTarget}") }${darkContextExpectations}
        screenshot "desktop-dark-rtl" { path = "components/contracts/${slug}-desktop-dark-rtl.png" }
${darkClose}

        viewport "compact" { width = 390 height = 844 }${compactPreparation}${compactAnchor}
        expect "compact-preview" { visible = css("${publicPreview}${compactPreviewState}") }${compactActivation}
        expect "compact-public-root" { visible = css("${visiblePublicTarget}") }
        screenshot "capture-compact" { path = "components/contracts/${slug}-compact.png" }
        accessibility "tree" { path = "components/contracts/${slug}-accessibility.json" interactive = true }
        console "console" { path = "components/contracts/${slug}-console.json" clear = false }
        page_errors "errors" { path = "components/contracts/${slug}-errors.json" clear = false }
${compactClose}
    }`;
}

function renderSuite() {
  return `suite "a3s-ui-component-contracts" {
    version = 1

${components.map(renderComponentScenario).join("\n\n")}
}
`;
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
        `${path.relative(projectRoot, filePath)} is stale; run npm run generate:component-contracts.`,
      );
    }
    return;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, expected, "utf8");
}

const planSource = await readFile(
  path.join(projectRoot, "COMPONENT_OPTIMIZATION_PLAN.md"),
  "utf8",
);
const decisions = parseProductDecisions(planSource);
const interactions = await interactionScenarios();
const records = [];

if (!checkOnly) {
  await rm(prdRoot, { recursive: true, force: true });
  await mkdir(prdRoot, { recursive: true });
}

for (const component of components) {
  const decision = decisions.get(component.slug);
  if (!decision) {
    throw new Error(`Missing product decision for ${component.slug}.`);
  }
  const interaction = interactions.get(component.slug);
  if (!interaction) {
    throw new Error(`Missing interaction scenario for ${component.slug}.`);
  }
  const coveredActions = assertBehaviorContract(component, interaction);
  const guidePath = path.join(
    projectRoot,
    "site",
    "docs",
    "next",
    "en",
    "components",
    `${component.slug}.mdx`,
  );
  const guide = await readFile(guidePath, "utf8");
  const introduction = guideIntroduction(guide, decision.productBoundary);
  const details = await optionalComponentDetails(component.slug);
  const prdPath = path.join(prdRoot, `${component.slug}.md`);
  const prdSource = renderPrd({
    component,
    decision,
    details,
    interaction,
    introduction,
  });
  assertPrdQuality({
    label: `Product requirements for ${component.slug}`,
    source: prdSource,
    uniqueFragments: [
      decision.productBoundary,
      decision.adversarialProof,
      component.selector,
      component.test.selector,
    ],
  });
  await writeOrCheck(prdPath, prdSource);
  records.push({
    actions: component.actions,
    behaviorActions: coveredActions,
    category: component.category,
    contractId: decision.contractId,
    decision: decision.decision,
    evidenceScenario: `component-contract-${component.slug}`,
    evidenceSuite: "tests/e2e/component-contracts.acl",
    interactionScenario: component.slug,
    interactionSuite: `tests/e2e/${interaction.suite}`,
    name: component.name,
    priority: decision.priority,
    prd: `product-requirements/components/${component.slug}.md`,
    route: `/en/components/${component.slug}.html`,
    selector: component.test.selector,
    slug: component.slug,
    stateEvidenceScreenshot: `components/contracts/${component.slug}-states.png`,
    stateEvidenceSelectors: stateEvidenceSelectors(component),
    stateMatrixSelector: stateMatrixRoot(component),
    states: component.states,
    stateSelectors: component.test.states,
  });
}

const readme = `# Component Product Requirements

This directory contains one first-principles product requirements document for every public A3S UI component. The machine manifest, bilingual component guides, interaction scenarios, responsive evidence scenarios, and these PRDs form one release contract.

- Public components: ${components.length}
- Source of component truth: \`src/ai/manifest/index.js\`
- Product decisions: \`COMPONENT_OPTIMIZATION_PLAN.md\`
- Machine-readable mapping: \`product-requirements/component-coverage.json\`
- Deterministic visual contract: \`tests/e2e/component-contracts.acl\`

Run \`npm run generate:component-contracts\` after an intentional contract change. Run \`npm run check:component-contracts\` to reject missing, stale, duplicated, or shallow coverage before A3S Test admission.
`;
await writeOrCheck(path.join(prdRoot, "README.md"), readme);
await writeOrCheck(componentSuitePath, renderSuite());
await writeOrCheck(
  coveragePath,
  `${JSON.stringify({ schemaVersion: 1, components: records }, null, 2)}\n`,
);

console.log(
  `${checkOnly ? "Validated" : "Generated"} ${records.length} component PRDs and deterministic evidence scenarios.`,
);
