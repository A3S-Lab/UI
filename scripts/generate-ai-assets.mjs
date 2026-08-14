import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { components } from "../src/ai/manifest/index.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputRoot = path.join(projectRoot, "generated", "ai");
const englishComponentsRoot = path.join(
  projectRoot,
  "site",
  "docs",
  "next",
  "en",
  "components",
);

function kebabToPascal(value) {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

function jsString(value) {
  return JSON.stringify(value);
}

function serializeManifest() {
  return JSON.stringify(
    {
      name: "@a3s-lab/ui",
      schema: "https://a3s.dev/schemas/ui-component-manifest-v2.json",
      version: 2,
      components,
    },
    null,
    2,
  );
}

function createRuntimeBundle(source) {
  return source
    .replace(
      /^import \{ componentMap, components \} from "\.\/manifest\/index\.js";\n/,
      `const components = ${JSON.stringify(components)};\nconst componentMap = Object.freeze(Object.fromEntries(components.map((component) => [component.slug, component])));\n`,
    )
    .replace(/\nexport \{ componentMap, components \};\n?$/, "\n");
}

function createReactAdapter() {
  const declarations = components
    .map((component) => {
      const exportName = kebabToPascal(component.slug);
      return `export const ${exportName} = createA3SComponent(${jsString(component.slug)});`;
    })
    .join("\n");
  const mapEntries = components
    .map(
      (component) =>
        `  ${jsString(component.slug)}: ${kebabToPascal(component.slug)},`,
    )
    .join("\n");

  return `import React, { forwardRef, useEffect, useRef } from "react";
import { componentMap } from "../ai/manifest.js";

let runtimePromise;
function loadRuntime() {
  if (typeof window === "undefined") return Promise.resolve();
  runtimePromise ??= Promise.all([
    import("../js/all.js"),
    import("../ai/runtime.js"),
  ]);
  return runtimePromise;
}

function reactAttributes(attributes) {
  const aliases = {
    autofocus: "autoFocus",
    class: "className",
    for: "htmlFor",
    maxlength: "maxLength",
    readonly: "readOnly",
    tabindex: "tabIndex",
  };
  return Object.fromEntries(
    Object.entries(attributes).map(([name, value]) => [
      aliases[name] ?? name,
      value,
    ]),
  );
}

function assignRef(ref, value) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function mergeClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function createA3SComponent(slug) {
  const definition = componentMap[slug];
  if (!definition) throw new Error(\`Unknown A3S UI component: \${slug}\`);

  const Component = forwardRef(function A3SComponent(
    { as, children, className, onReady, ...props },
    forwardedRef,
  ) {
    const localRef = useRef(null);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const Element = as ?? definition.framework.tag;
    useEffect(() => {
      const element = localRef.current;
      if (!element) return;
      let active = true;
      loadRuntime().then(() => {
        if (!active) return;
        window.a3sUI?.start();
        window.a3sUI?.initAll();
        window.a3sAI?.scan(element);
        onReadyRef.current?.(element);
      });
      return () => {
        active = false;
        element._destroy?.();
      };
    }, []);

    return React.createElement(
      Element,
      {
        ...reactAttributes(definition.framework.attributes),
        ...props,
        className: mergeClassNames(definition.framework.className, className),
        ref: (element) => {
          localRef.current = element;
          assignRef(forwardedRef, element);
        },
      },
      children,
    );
  });
  Component.displayName = definition.name.replace(/\\s+/g, "");
  Component.a3s = definition;
  return Component;
}

${declarations}

export const components = Object.freeze({
${mapEntries}
});
`;
}

function createReactTypes() {
  const declarations = components
    .map((component) => {
      const exportName = kebabToPascal(component.slug);
      return `export const ${exportName}: A3SComponent;`;
    })
    .join("\n");

  return `import type { AllHTMLAttributes, ElementType, ForwardRefExoticComponent, ReactNode, RefAttributes } from "react";
import type { ComponentDefinition } from "../ai/manifest.js";

export type A3SComponentProps = Omit<AllHTMLAttributes<HTMLElement>, "as"> & {
  as?: ElementType;
  children?: ReactNode;
  onReady?: (element: HTMLElement) => void;
};

export type A3SComponent = ForwardRefExoticComponent<
  A3SComponentProps & RefAttributes<HTMLElement>
> & { a3s: ComponentDefinition };

export function createA3SComponent(slug: string): A3SComponent;
${declarations}
export const components: Readonly<Record<string, A3SComponent>>;
`;
}

function createVueAdapter() {
  const declarations = components
    .map((component) => {
      const exportName = kebabToPascal(component.slug);
      return `export const ${exportName} = createA3SComponent(${jsString(component.slug)});`;
    })
    .join("\n");
  const mapEntries = components
    .map(
      (component) =>
        `  ${jsString(component.slug)}: ${kebabToPascal(component.slug)},`,
    )
    .join("\n");

  return `import { defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { componentMap } from "../ai/manifest.js";

let runtimePromise;
function loadRuntime() {
  if (typeof window === "undefined") return Promise.resolve();
  runtimePromise ??= Promise.all([
    import("../js/all.js"),
    import("../ai/runtime.js"),
  ]);
  return runtimePromise;
}

function mergeClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function createA3SComponent(slug) {
  const definition = componentMap[slug];
  if (!definition) throw new Error(\`Unknown A3S UI component: \${slug}\`);

  const Component = defineComponent({
    name: \`A3S\${definition.name.replace(/\\s+/g, "")}\`,
    inheritAttrs: false,
    props: {
      as: { type: [String, Object, Function], default: undefined },
      onReady: { type: Function, default: undefined },
    },
    setup(props, { attrs, expose, slots }) {
      const root = ref(null);
      let active = true;
      expose({
        get element() {
          return root.value;
        },
      });
      onMounted(async () => {
        if (!root.value) return;
        await loadRuntime();
        if (!active || !root.value) return;
        window.a3sUI?.start();
        window.a3sUI?.initAll();
        window.a3sAI?.scan(root.value);
        props.onReady?.(root.value);
      });
      onBeforeUnmount(() => {
        active = false;
        root.value?._destroy?.();
      });
      return () =>
        h(
          props.as ?? definition.framework.tag,
          {
            ...definition.framework.attributes,
            ...attrs,
            class: mergeClassNames(
              definition.framework.className,
              attrs.class,
            ),
            ref: root,
          },
          slots.default?.(),
        );
    },
  });
  Component.a3s = definition;
  return Component;
}

${declarations}

export const components = Object.freeze({
${mapEntries}
});
`;
}

function createVueTypes() {
  const declarations = components
    .map((component) => {
      const exportName = kebabToPascal(component.slug);
      return `export const ${exportName}: A3SComponent;`;
    })
    .join("\n");
  return `import type { DefineComponent } from "vue";
import type { ComponentDefinition } from "../ai/manifest.js";

export type A3SComponentProps = {
  as?: string | object | Function;
  onReady?: (element: HTMLElement) => void;
} & Record<string, unknown>;

export type A3SComponent = DefineComponent<A3SComponentProps> & {
  a3s: ComponentDefinition;
};

export function createA3SComponent(slug: string): A3SComponent;
${declarations}
export const components: Readonly<Record<string, A3SComponent>>;
`;
}

function createManifestModule(manifest) {
  return `export const manifest = Object.freeze(${manifest});
export const components = manifest.components;
export const componentMap = Object.freeze(
  Object.fromEntries(components.map((component) => [component.slug, component])),
);
export function getComponent(slug) { return componentMap[slug]; }
export function listComponents(category) {
  return category ? components.filter((component) => component.category === category) : [...components];
}
`;
}

function createManifestTypes() {
  return `export type ComponentDefinition = Readonly<{
  actions: readonly string[];
  category: string;
  events: readonly string[];
  framework: Readonly<{
    attributes: Readonly<Record<string, string>>;
    className: string;
    tag: string;
  }>;
  name: string;
  parts: Readonly<Record<string, string>>;
  selector: string;
  slug: string;
  states: readonly string[];
  test: Readonly<{
    actionTargets: Readonly<Record<string, Readonly<{ part: string | null; selector: string }>>>;
    actions: Readonly<Record<string, string>>;
    parts: Readonly<Record<string, string>>;
    readySelector: string;
    selector: string;
    states: Readonly<Record<string, string>>;
  }>;
  version: number;
}>;
export const manifest: Readonly<{ name: string; schema: string; version: number; components: readonly ComponentDefinition[] }>;
export const components: readonly ComponentDefinition[];
export const componentMap: Readonly<Record<string, ComponentDefinition>>;
export function getComponent(slug: string): ComponentDefinition | undefined;
export function listComponents(category?: string): ComponentDefinition[];
`;
}

function createRuntimeTypes() {
  return `import type { ComponentDefinition } from "./manifest.js";
export type A3SSnapshot = {
  components: string[];
  label: string;
  parts: Array<{ label: string; owners: string[]; parts: string[]; tag: string }>;
  state: string;
  tag: string;
};
export const components: readonly ComponentDefinition[];
export const componentMap: Readonly<Record<string, ComponentDefinition>>;
export const a3sAI: Readonly<{
  components: readonly ComponentDefinition[];
  find(slug: string, options?: { part?: string; root?: ParentNode }): Element[];
  getComponent(slug: string): ComponentDefinition | undefined;
  managedAttributes: readonly string[];
  scan(root?: Document | Element): Element[];
  selector(slug: string, part?: string): string;
  snapshot(target?: Document | Element): A3SSnapshot[];
  start(): void;
  stop(): void;
  version: 2;
}>;
`;
}

function createA3STestSelectors() {
  return `import { componentMap, components } from "../manifest.js";

function definition(slug) {
  const component = componentMap[slug];
  if (!component) throw new Error(\`Unknown A3S UI component: \${slug}\`);
  return component;
}

export function componentSelector(slug) {
  return definition(slug).test.selector;
}

export function readySelector(slug) {
  return definition(slug).test.readySelector;
}

export function partSelector(slug, part) {
  const component = definition(slug);
  const selector = component.test.parts[part];
  if (!selector) throw new Error(\`Unknown \${component.name} part: \${part}\`);
  return selector;
}

export function actionSelector(slug, action) {
  const component = definition(slug);
  const selector = component.test.actions[action];
  if (!selector) throw new Error(\`Unsupported \${component.name} action: \${action}\`);
  return selector;
}

export function stateSelector(slug, state) {
  const component = definition(slug);
  const selector = component.test.states[state];
  if (!selector) throw new Error(\`Unknown \${component.name} state: \${state}\`);
  return selector;
}

export const selectors = Object.freeze(
  Object.fromEntries(
    components.map((component) => [
      component.slug,
      Object.freeze({
        actions: component.test.actions,
        parts: component.test.parts,
        ready: component.test.readySelector,
        root: component.test.selector,
        states: component.test.states,
      }),
    ]),
  ),
);
`;
}

function createA3STestSelectorTypes() {
  return `export type ComponentSelectors = Readonly<{
  actions: Readonly<Record<string, string>>;
  parts: Readonly<Record<string, string>>;
  ready: string;
  root: string;
  states: Readonly<Record<string, string>>;
}>;
export function componentSelector(slug: string): string;
export function readySelector(slug: string): string;
export function partSelector(slug: string, part: string): string;
export function actionSelector(slug: string, action: string): string;
export function stateSelector(slug: string, state: string): string;
export const selectors: Readonly<Record<string, ComponentSelectors>>;
`;
}

function createA3STestExamples() {
  const preferred = [
    ["agent-composer", "input", "fill", "Draft the release plan"],
    ["agent-composer", "submit", "click"],
    ["agent-transcript", "viewport", "expect"],
    ["task-workspace", "inspectorTrigger", "click"],
    ["approval-request", "approve", "click"],
  ];
  return `suite "a3s-ui-agent-workflow" {
    version = 1

    scenario "semantic-agent-workflow" {
        name = "Drive a task workflow through the A3S UI semantic contract"
        surface = "web"
        timeout_ms = 45000
        navigate "open" { url = "http://127.0.0.1:3000/tasks/new" }
        wait "ready" { visible = css("[data-a3s-components~=task-workspace][data-a3s-state]") }
${preferred
  .map(([slug, part, action, value]) => {
    const component = components.find((item) => item.slug === slug);
    const selector = component.test.parts[part];
    if (action === "fill") {
      return `        fill "${slug}-${part}" { target = css(${jsString(selector)}) value = ${jsString(value)} }`;
    }
    if (action === "expect") {
      return `        expect "${slug}-${part}" { visible = css(${jsString(selector)}) }`;
    }
    return `        click "${slug}-${part}" { target = css(${jsString(selector)}) }`;
  })
  .join("\n")}
    }
}
`;
}

async function assertCoverage() {
  const documented = (await readdir(englishComponentsRoot))
    .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
    .map((file) => path.basename(file, ".mdx"))
    .sort();
  const slugs = components.map((component) => component.slug).sort();
  const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
  const missing = documented.filter((slug) => !slugs.includes(slug));
  const undocumented = slugs.filter((slug) => !documented.includes(slug));
  if (duplicates.length || missing.length || undocumented.length) {
    throw new Error(
      `AI component manifest coverage failed: duplicates=${duplicates.join(",") || "none"}; missing=${missing.join(",") || "none"}; undocumented=${undocumented.join(",") || "none"}`,
    );
  }
  for (const component of components) {
    if (!component.selector || component.states.length === 0) {
      throw new Error(`${component.slug} is missing a selector or state contract.`);
    }
    for (const action of component.actions) {
      if (!component.test.actions[action] || !component.test.actionTargets[action]) {
        throw new Error(`${component.slug}.${action} is missing an A3S Test action target.`);
      }
    }
    for (const state of component.states) {
      if (!component.test.states[state]) {
        throw new Error(`${component.slug}.${state} is missing a state selector.`);
      }
    }
  }
}

await assertCoverage();
await mkdir(path.join(outputRoot, "frameworks"), { recursive: true });
await mkdir(path.join(outputRoot, "a3s-test"), { recursive: true });
const runtimeSource = await readFile(
  path.join(projectRoot, "src", "ai", "runtime.js"),
  "utf8",
);
const manifestJson = serializeManifest();
await Promise.all([
  writeFile(path.join(outputRoot, "components.json"), `${manifestJson}\n`),
  writeFile(path.join(outputRoot, "manifest.js"), createManifestModule(manifestJson)),
  writeFile(path.join(outputRoot, "manifest.d.ts"), createManifestTypes()),
  writeFile(path.join(outputRoot, "runtime.js"), createRuntimeBundle(runtimeSource)),
  writeFile(path.join(outputRoot, "runtime.d.ts"), createRuntimeTypes()),
  writeFile(path.join(outputRoot, "a3s-test.acl"), createA3STestExamples()),
  writeFile(path.join(outputRoot, "a3s-test", "selectors.js"), createA3STestSelectors()),
  writeFile(path.join(outputRoot, "a3s-test", "selectors.d.ts"), createA3STestSelectorTypes()),
  writeFile(path.join(outputRoot, "frameworks", "react.js"), createReactAdapter()),
  writeFile(path.join(outputRoot, "frameworks", "react.d.ts"), createReactTypes()),
  writeFile(path.join(outputRoot, "frameworks", "vue.js"), createVueAdapter()),
  writeFile(path.join(outputRoot, "frameworks", "vue.d.ts"), createVueTypes()),
]);

console.log(
  `Generated AI, A3S Test, React, and Vue assets for ${components.length} components.`,
);
