import { componentMap, components } from "./manifest/index.js";

const managedRootAttributes = [
  "data-a3s-component",
  "data-a3s-components",
  "data-a3s-state",
];
const managedPartAttribute = "data-a3s-parts";
const managedPartOwnerAttribute = "data-a3s-part-owners";

function tokens(value) {
  return (value ?? "").split(/\s+/).filter(Boolean);
}

function elementState(element) {
  const states = new Set();
  const explicitState = element.getAttribute("data-state");
  if (explicitState) {
    explicitState
      .split(/\s+/)
      .filter(Boolean)
      .forEach((state) => states.add(state));
  }

  if (
    element.matches(":disabled, [aria-disabled=true]") ||
    element.hasAttribute("data-disabled")
  ) {
    states.add("disabled");
  }
  if (element.matches("[aria-invalid=true], :user-invalid")) {
    states.add("invalid");
  }
  if (element.matches("[readonly], [aria-readonly=true]")) {
    states.add("readonly");
  }
  if (element.matches("[aria-busy=true]")) states.add("loading");
  if (element.hasAttribute("data-loading")) states.add("loading");
  if (element.matches("[hidden], [inert], [aria-hidden=true]")) {
    states.add("hidden");
  }

  if (element instanceof HTMLInputElement) {
    if (["checkbox", "radio"].includes(element.type)) {
      states.add(element.checked ? "checked" : "unchecked");
      if (element.indeterminate) states.add("indeterminate");
    }
  }

  const expanded = element.getAttribute("aria-expanded");
  if (expanded !== null) {
    states.add(expanded === "true" ? "expanded" : "collapsed");
  } else if (element instanceof HTMLDetailsElement) {
    states.add(element.open ? "open" : "closed");
  } else if (element instanceof HTMLDialogElement) {
    states.add(element.open ? "open" : "closed");
  }

  const pressed = element.getAttribute("aria-pressed");
  if (pressed === "true") states.add("pressed");
  const selected = element.getAttribute("aria-selected");
  if (selected === "true" || element.getAttribute("data-selected") === "true") {
    states.add("selected");
  }
  if (element.hasAttribute("aria-current")) states.add("current");
  if (element.getAttribute("data-active") === "true") states.add("active");

  if (
    element.matches(
      '[data-a3s-theme-toggle], button[onclick*=".theme.toggle"], button[data-preview-onclick*=".theme.toggle"]',
    )
  ) {
    states.add(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }

  const inspector = element.getAttribute("data-inspector");
  if (inspector === "open") states.add("inspector-open");
  const context = element.getAttribute("data-context");
  if (context === "open") states.add("context-open");
  const mobileNavigation = element.getAttribute("data-mobile-navigation");
  if (mobileNavigation === "open") states.add("mobile-open");
  const navigation = element.getAttribute("data-navigation");
  if (navigation) states.add(navigation);

  if (states.size === 0) states.add("ready");
  return [...states].join(" ");
}

function appendToken(element, attribute, token) {
  const values = new Set(tokens(element.getAttribute(attribute)));
  values.add(token);
  const value = [...values].join(" ");
  if (element.getAttribute(attribute) !== value) {
    element.setAttribute(attribute, value);
  }
}

function clearManagedParts(root, component) {
  if (Object.keys(component.parts).length === 0) return;
  const candidates = [
    root,
    ...root.querySelectorAll(
      `[${managedPartAttribute}], [${managedPartOwnerAttribute}]`,
    ),
  ];
  candidates.forEach((element) => {
    const owners = tokens(element.getAttribute(managedPartOwnerAttribute)).filter(
      (owner) => !owner.startsWith(`${component.slug}.`),
    );
    if (owners.length > 0) {
      element.setAttribute(managedPartOwnerAttribute, owners.join(" "));
      element.setAttribute(
        managedPartAttribute,
        [...new Set(owners.map((owner) => owner.slice(owner.indexOf(".") + 1)))].join(
          " ",
        ),
      );
    } else {
      element.removeAttribute(managedPartOwnerAttribute);
      element.removeAttribute(managedPartAttribute);
    }
  });
}

function annotateParts(root, component) {
  for (const [part, selector] of Object.entries(component.parts)) {
    let elements = [];
    try {
      if (root.matches(selector)) elements.push(root);
      elements.push(...root.querySelectorAll(selector));
    } catch {
      continue;
    }
    elements.forEach((element) => {
      appendToken(element, managedPartAttribute, part);
      appendToken(
        element,
        managedPartOwnerAttribute,
        `${component.slug}.${part}`,
      );
    });
  }
}

function annotateElement(element) {
  const matches = components.filter((component) => {
    try {
      return element.matches(component.selector);
    } catch {
      return false;
    }
  });
  const previousSlugs = tokens(element.getAttribute("data-a3s-components"));
  const matchesBySlug = new Map(matches.map((component) => [component.slug, component]));
  previousSlugs.forEach((slug) => {
    if (!matchesBySlug.has(slug) && componentMap[slug]) {
      clearManagedParts(element, componentMap[slug]);
    }
  });

  if (matches.length === 0) {
    managedRootAttributes.forEach((attribute) =>
      element.removeAttribute(attribute),
    );
    return [];
  }

  const slugs = matches.map((component) => component.slug);
  const primary = slugs[slugs.length - 1];
  const componentsValue = slugs.join(" ");
  const state = elementState(element);
  if (element.getAttribute("data-a3s-component") !== primary) {
    element.setAttribute("data-a3s-component", primary);
  }
  if (element.getAttribute("data-a3s-components") !== componentsValue) {
    element.setAttribute("data-a3s-components", componentsValue);
  }
  if (element.getAttribute("data-a3s-state") !== state) {
    element.setAttribute("data-a3s-state", state);
  }
  matches.forEach((component) => {
    clearManagedParts(element, component);
    annotateParts(element, component);
  });
  return matches;
}

function scan(root = document) {
  const scope =
    root instanceof Document || root instanceof Element ? root : document;
  const candidates = new Set();
  if (scope instanceof Element) candidates.add(scope);
  scope
    .querySelectorAll?.("[data-a3s-components]")
    .forEach((element) => candidates.add(element));
  components.forEach((component) => {
    try {
      scope
        .querySelectorAll(component.selector)
        .forEach((element) => candidates.add(element));
    } catch {
      // An unsupported selector cannot invalidate the rest of the manifest.
    }
  });
  candidates.forEach(annotateElement);
  return [...candidates].filter((element) =>
    element.hasAttribute("data-a3s-components"),
  );
}

function accessibleName(element) {
  const labelledBy = (element.getAttribute("aria-labelledby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  const nativeLabels =
    "labels" in element && element.labels
      ? [...element.labels]
          .map((label) => label.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" ")
      : "";
  return (
    element.getAttribute("aria-label")?.trim() ||
    labelledBy ||
    nativeLabels ||
    element.getAttribute("alt")?.trim() ||
    element.getAttribute("title")?.trim() ||
    element.textContent?.replace(/\s+/g, " ").trim() ||
    ""
  );
}

function snapshot(target = document) {
  scan(target);
  const scope = target instanceof Element || target instanceof Document ? target : document;
  const roots = new Set();
  if (scope instanceof Element && scope.matches("[data-a3s-components]")) {
    roots.add(scope);
  }
  scope
    .querySelectorAll("[data-a3s-components]")
    .forEach((element) => roots.add(element));
  return [...roots].map((element) => ({
    components: element
      .getAttribute("data-a3s-components")
      .split(/\s+/)
      .filter(Boolean),
    label: accessibleName(element),
    parts: [
      ...(element.hasAttribute(managedPartAttribute) ? [element] : []),
      ...element.querySelectorAll(`[${managedPartAttribute}]`),
    ]
      .filter((part) =>
        tokens(part.getAttribute(managedPartOwnerAttribute)).some((owner) =>
          tokens(element.getAttribute("data-a3s-components")).some((slug) =>
            owner.startsWith(`${slug}.`),
          ),
        ),
      )
      .map((part) => ({
        label: accessibleName(part),
        owners: tokens(part.getAttribute(managedPartOwnerAttribute)),
        parts: part
          .getAttribute(managedPartAttribute)
          .split(/\s+/)
          .filter(Boolean),
        tag: part.tagName.toLowerCase(),
      })),
    state: element.getAttribute("data-a3s-state") ?? "ready",
    tag: element.tagName.toLowerCase(),
  }));
}

function selector(slug, part) {
  const component = componentMap[slug];
  if (!component) throw new Error(`Unknown A3S UI component: ${slug}`);
  if (!part) return component.test.selector;
  const partSelector = component.test.parts[part];
  if (!partSelector) {
    throw new Error(`Unknown ${component.name} part: ${part}`);
  }
  return partSelector;
}

function find(slug, options = {}) {
  const query = selector(slug, options.part);
  const scope = options.root ?? document;
  const matches = new Set(scope.querySelectorAll(query));
  if (scope instanceof Element && scope.matches(query)) matches.add(scope);
  return [...matches];
}

let observer;
let scanFrame = 0;
let eventListenersAttached = false;
function scheduleScan() {
  if (scanFrame) return;
  scanFrame = requestAnimationFrame(() => {
    scanFrame = 0;
    scan(document);
  });
}

function refreshFromTarget(target) {
  if (!(target instanceof Element)) return;
  annotateElement(target);
  let ancestor = target.parentElement?.closest("[data-a3s-components]");
  while (ancestor) {
    annotateElement(ancestor);
    ancestor = ancestor.parentElement?.closest("[data-a3s-components]");
  }
}

function refreshFromEvent(event) {
  refreshFromTarget(event.target);
}

function start() {
  if (typeof document === "undefined") return;
  scan(document);
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    let contentChanged = false;
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        if (
          managedRootAttributes.includes(mutation.attributeName) ||
          mutation.attributeName === managedPartAttribute ||
          mutation.attributeName === managedPartOwnerAttribute
        ) {
          return;
        }
        refreshFromTarget(mutation.target);
        if (mutation.target === document.documentElement) scheduleScan();
        return;
      }
      if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
        contentChanged = true;
      }
    });
    if (contentChanged) scheduleScan();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  if (!eventListenersAttached) {
    document.addEventListener("change", refreshFromEvent, true);
    document.addEventListener("input", refreshFromEvent, true);
    document.addEventListener("toggle", refreshFromEvent, true);
    eventListenersAttached = true;
  }
}

function stop() {
  observer?.disconnect();
  observer = undefined;
  if (eventListenersAttached && typeof document !== "undefined") {
    document.removeEventListener("change", refreshFromEvent, true);
    document.removeEventListener("input", refreshFromEvent, true);
    document.removeEventListener("toggle", refreshFromEvent, true);
    eventListenersAttached = false;
  }
  if (scanFrame) cancelAnimationFrame(scanFrame);
  scanFrame = 0;
}

export const a3sAI = Object.freeze({
  components,
  find,
  getComponent: (slug) => componentMap[slug],
  managedAttributes: Object.freeze([
    ...managedRootAttributes,
    managedPartAttribute,
    managedPartOwnerAttribute,
  ]),
  scan,
  selector,
  snapshot,
  start,
  stop,
  version: 2,
});

if (typeof window !== "undefined") {
  window.a3sAI = a3sAI;
  if (window.a3sUI) window.a3sUI.ai = a3sAI;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

export { componentMap, components };
