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

function behaviorComponents() {
  return components.filter(
    (component) => component.events.length > 0 || component.methods.length > 0,
  );
}

function typeUnion(values) {
  return values.length > 0 ? values.map(jsString).join(" | ") : "never";
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
  const hooks = behaviorComponents()
    .map((component) => {
      const exportName = kebabToPascal(component.slug);
      return `export function use${exportName}(options) {
  return useA3SComponent(${jsString(component.slug)}, options);
}`;
    })
    .join("\n\n");

  return `import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function isReady(element, slug) {
  return (element.getAttribute("data-a3s-components") ?? "")
    .split(/\\s+/)
    .includes(slug);
}

const rtlLocalePattern = /^(?:ar|fa|he|ps|ur)(?:-|$)/i;

function configRoot(root) {
  return root ?? (typeof document === "undefined" ? null : document.documentElement);
}

function localeSnapshot(root, fallbackLocale = "zh-CN") {
  const locale = root?.lang || fallbackLocale;
  return {
    direction: root?.dir || (rtlLocalePattern.test(locale) ? "rtl" : "ltr"),
    locale,
  };
}

function themeSnapshot(root) {
  const preference = root?.dataset.theme;
  const theme = ["dark", "light", "system"].includes(preference)
    ? preference
    : root?.classList.contains("dark")
      ? "dark"
      : "light";
  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
  return {
    resolvedTheme: theme === "system" ? (systemDark ? "dark" : "light") : theme,
    theme,
  };
}

function applyTheme(root, theme) {
  if (!root || !["dark", "light", "system"].includes(theme)) return null;
  root.dataset.theme = theme;
  const snapshot = themeSnapshot(root);
  root.classList.toggle("dark", snapshot.resolvedTheme === "dark");
  root.style.colorScheme = snapshot.resolvedTheme;
  return snapshot;
}

export function useA3SLocale(options = {}) {
  const root = configRoot(options.root);
  const fallbackLocale = options.fallbackLocale ?? "zh-CN";
  const read = useCallback(
    () => localeSnapshot(root, fallbackLocale),
    [fallbackLocale, root],
  );
  const [state, setState] = useState(read);

  useEffect(() => {
    setState(read());
    if (!root || typeof MutationObserver === "undefined") return;
    const synchronize = () => setState(read());
    const observer = new MutationObserver(synchronize);
    observer.observe(root, { attributeFilter: ["dir", "lang"], attributes: true });
    window.addEventListener("languagechange", synchronize);
    return () => {
      observer.disconnect();
      window.removeEventListener("languagechange", synchronize);
    };
  }, [read, root]);

  const setLocale = useCallback(
    (locale, direction) => {
      if (!root) return localeSnapshot(null, locale || fallbackLocale);
      const nextLocale = String(locale || fallbackLocale);
      root.lang = nextLocale;
      root.dir = direction || (rtlLocalePattern.test(nextLocale) ? "rtl" : "ltr");
      const next = localeSnapshot(root, fallbackLocale);
      setState(next);
      root.dispatchEvent(
        new CustomEvent("a3s:locale-change", { bubbles: true, detail: next }),
      );
      return next;
    },
    [fallbackLocale, root],
  );

  return useMemo(
    () => Object.freeze({ ...state, setLocale }),
    [setLocale, state],
  );
}

export function useA3STheme(options = {}) {
  const root = configRoot(options.root);
  const read = useCallback(() => themeSnapshot(root), [root]);
  const [state, setState] = useState(read);

  useEffect(() => {
    setState(read());
    if (!root || typeof MutationObserver === "undefined") return;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const synchronize = () => {
      const next = themeSnapshot(root);
      if (next.theme === "system") {
        root.classList.toggle("dark", next.resolvedTheme === "dark");
        root.style.colorScheme = next.resolvedTheme;
      }
      setState(next);
    };
    const observer = new MutationObserver(synchronize);
    observer.observe(root, {
      attributeFilter: ["class", "data-theme"],
      attributes: true,
    });
    media?.addEventListener?.("change", synchronize);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", synchronize);
    };
  }, [read, root]);

  const setTheme = useCallback(
    (theme) => {
      const next = applyTheme(root, theme);
      if (!next) return state;
      setState(next);
      root.dispatchEvent(
        new CustomEvent("a3s:theme-change", { bubbles: true, detail: next }),
      );
      return next;
    },
    [root, state],
  );

  return useMemo(
    () => Object.freeze({ ...state, setTheme }),
    [setTheme, state],
  );
}

export function useA3SMotion() {
  const [media] = useState(() =>
    typeof window === "undefined"
      ? null
      : window.matchMedia?.("(prefers-reduced-motion: reduce)"),
  );
  const [reducedMotion, setReducedMotion] = useState(media?.matches === true);
  useEffect(() => {
    if (!media) return;
    const synchronize = () => setReducedMotion(media.matches);
    synchronize();
    media.addEventListener?.("change", synchronize);
    return () => media.removeEventListener?.("change", synchronize);
  }, [media]);
  return useMemo(
    () => Object.freeze({ reducedMotion }),
    [reducedMotion],
  );
}

export function useA3SComponent(slug, options = {}) {
  const definition = componentMap[slug];
  if (!definition) throw new Error(\`Unknown A3S UI component: \${slug}\`);

  const eventNames = Object.keys(options.events ?? {});
  for (const eventName of eventNames) {
    if (!definition.events.includes(eventName)) {
      throw new Error(\`Unsupported \${definition.name} event: \${eventName}\`);
    }
  }

  const [element, setElement] = useState(null);
  const [ready, setReady] = useState(false);
  const eventsRef = useRef(options.events ?? {});
  const onReadyRef = useRef(options.onReady);
  const readyElementsRef = useRef(new WeakSet());
  eventsRef.current = options.events ?? {};
  onReadyRef.current = options.onReady;

  const ref = useCallback((nextElement) => {
    setElement(nextElement);
    if (!nextElement) setReady(false);
  }, []);

  useEffect(() => {
    if (!element) return;

    const listeners = definition.events.map((eventName) => {
      const listener = (event) => eventsRef.current[eventName]?.(event);
      element.addEventListener(eventName, listener);
      return [eventName, listener];
    });
    const markReady = () => {
      if (!isReady(element, slug)) return false;
      setReady(true);
      if (!readyElementsRef.current.has(element)) {
        readyElementsRef.current.add(element);
        onReadyRef.current?.(element);
      }
      return true;
    };
    const observer = markReady()
      ? null
      : new MutationObserver(() => markReady());
    observer?.observe(element, {
      attributeFilter: ["data-a3s-components"],
      attributes: true,
    });

    return () => {
      observer?.disconnect();
      listeners.forEach(([eventName, listener]) =>
        element.removeEventListener(eventName, listener),
      );
    };
  }, [definition, element, slug]);

  const call = useCallback(
    (method, ...args) => {
      if (!definition.methods.includes(method)) {
        throw new Error(\`Unsupported \${definition.name} method: \${method}\`);
      }
      const implementation = element?.[method];
      if (typeof implementation !== "function") {
        throw new Error(\`\${definition.name}.\${method} is not ready.\`);
      }
      return implementation.apply(element, args);
    },
    [definition, element],
  );

  return useMemo(
    () => Object.freeze({ call, definition, element, ready, ref }),
    [call, definition, element, ready, ref],
  );
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
    const setElement = useCallback(
      (element) => {
        localRef.current = element;
        assignRef(forwardedRef, element);
      },
      [forwardedRef],
    );
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
        ref: setElement,
      },
      children,
    );
  });
  Component.displayName = definition.name.replace(/\\s+/g, "");
  Component.a3s = definition;
  return Component;
}

${declarations}

${hooks}

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
  const hookDeclarations = behaviorComponents()
    .map((component) => {
      const exportName = kebabToPascal(component.slug);
      return `export type ${exportName}Event = ${typeUnion(component.events)};
export type ${exportName}Method = ${typeUnion(component.methods)};
export function use${exportName}(
  options?: A3SHookOptions<${exportName}Event>,
): A3SHookResult<${exportName}Method>;`;
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

export type A3SEventHandler = (event: Event) => void;
export type A3SHookOptions<EventName extends string = string> = {
  events?: Partial<Record<EventName, A3SEventHandler>>;
  onReady?: (element: HTMLElement) => void;
};
export type A3SHookResult<MethodName extends string = string> = Readonly<{
  call<Result = unknown>(method: MethodName, ...args: unknown[]): Result;
  definition: ComponentDefinition;
  element: HTMLElement | null;
  ready: boolean;
  ref: (element: HTMLElement | null) => void;
}>;

export type A3SDirection = "ltr" | "rtl";
export type A3STheme = "dark" | "light" | "system";
export type A3SResolvedTheme = Exclude<A3STheme, "system">;
export type A3SConfigRootOptions = { root?: HTMLElement | null };
export type A3SLocaleOptions = A3SConfigRootOptions & {
  fallbackLocale?: string;
};
export type A3SLocaleHookResult = Readonly<{
  direction: A3SDirection;
  locale: string;
  setLocale(locale: string, direction?: A3SDirection): {
    direction: A3SDirection;
    locale: string;
  };
}>;
export type A3SThemeHookResult = Readonly<{
  resolvedTheme: A3SResolvedTheme;
  setTheme(theme: A3STheme): {
    resolvedTheme: A3SResolvedTheme;
    theme: A3STheme;
  };
  theme: A3STheme;
}>;
export type A3SMotionHookResult = Readonly<{ reducedMotion: boolean }>;

export function useA3SLocale(options?: A3SLocaleOptions): A3SLocaleHookResult;
export function useA3STheme(options?: A3SConfigRootOptions): A3SThemeHookResult;
export function useA3SMotion(): A3SMotionHookResult;

export function createA3SComponent(slug: string): A3SComponent;
export function useA3SComponent<
  EventName extends string = string,
  MethodName extends string = string,
>(
  slug: string,
  options?: A3SHookOptions<EventName>,
): A3SHookResult<MethodName>;
${declarations}
${hookDeclarations}
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
  const hooks = behaviorComponents()
    .map((component) => {
      const exportName = kebabToPascal(component.slug);
      return `export function use${exportName}(options) {
  return useA3SComponent(${jsString(component.slug)}, options);
}`;
    })
    .join("\n\n");

  return `import { defineComponent, h, onBeforeUnmount, onMounted, readonly, ref, shallowRef, watch } from "vue";
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

function resolveElement(reference) {
  if (typeof HTMLElement !== "undefined" && reference instanceof HTMLElement) {
    return reference;
  }
  const element = reference?.element;
  return typeof HTMLElement !== "undefined" && element instanceof HTMLElement
    ? element
    : null;
}

function isReady(element, slug) {
  return (element.getAttribute("data-a3s-components") ?? "")
    .split(/\\s+/)
    .includes(slug);
}

const rtlLocalePattern = /^(?:ar|fa|he|ps|ur)(?:-|$)/i;

function configRoot(root) {
  return root ?? (typeof document === "undefined" ? null : document.documentElement);
}

function localeSnapshot(root, fallbackLocale = "zh-CN") {
  const locale = root?.lang || fallbackLocale;
  return {
    direction: root?.dir || (rtlLocalePattern.test(locale) ? "rtl" : "ltr"),
    locale,
  };
}

function themeSnapshot(root) {
  const preference = root?.dataset.theme;
  const theme = ["dark", "light", "system"].includes(preference)
    ? preference
    : root?.classList.contains("dark")
      ? "dark"
      : "light";
  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
  return {
    resolvedTheme: theme === "system" ? (systemDark ? "dark" : "light") : theme,
    theme,
  };
}

function applyTheme(root, theme) {
  if (!root || !["dark", "light", "system"].includes(theme)) return null;
  root.dataset.theme = theme;
  const snapshot = themeSnapshot(root);
  root.classList.toggle("dark", snapshot.resolvedTheme === "dark");
  root.style.colorScheme = snapshot.resolvedTheme;
  return snapshot;
}

export function useA3SLocale(options = {}) {
  const root = configRoot(options.root);
  const fallbackLocale = options.fallbackLocale ?? "zh-CN";
  const initial = localeSnapshot(root, fallbackLocale);
  const locale = ref(initial.locale);
  const direction = ref(initial.direction);
  let observer;
  const synchronize = () => {
    const next = localeSnapshot(root, fallbackLocale);
    locale.value = next.locale;
    direction.value = next.direction;
    return next;
  };
  const setLocale = (value, nextDirection) => {
    if (!root) return localeSnapshot(null, value || fallbackLocale);
    const nextLocale = String(value || fallbackLocale);
    root.lang = nextLocale;
    root.dir = nextDirection || (rtlLocalePattern.test(nextLocale) ? "rtl" : "ltr");
    const next = synchronize();
    root.dispatchEvent(
      new CustomEvent("a3s:locale-change", { bubbles: true, detail: next }),
    );
    return next;
  };
  onMounted(() => {
    synchronize();
    if (!root || typeof MutationObserver === "undefined") return;
    observer = new MutationObserver(synchronize);
    observer.observe(root, { attributeFilter: ["dir", "lang"], attributes: true });
    window.addEventListener("languagechange", synchronize);
  });
  onBeforeUnmount(() => {
    observer?.disconnect();
    if (typeof window !== "undefined")
      window.removeEventListener("languagechange", synchronize);
  });
  return Object.freeze({
    direction: readonly(direction),
    locale: readonly(locale),
    setLocale,
  });
}

export function useA3STheme(options = {}) {
  const root = configRoot(options.root);
  const initial = themeSnapshot(root);
  const theme = ref(initial.theme);
  const resolvedTheme = ref(initial.resolvedTheme);
  let media;
  let observer;
  const synchronize = () => {
    const next = themeSnapshot(root);
    if (root && next.theme === "system") {
      root.classList.toggle("dark", next.resolvedTheme === "dark");
      root.style.colorScheme = next.resolvedTheme;
    }
    theme.value = next.theme;
    resolvedTheme.value = next.resolvedTheme;
    return next;
  };
  const setTheme = (value) => {
    const next = applyTheme(root, value);
    if (!next) return synchronize();
    theme.value = next.theme;
    resolvedTheme.value = next.resolvedTheme;
    root.dispatchEvent(
      new CustomEvent("a3s:theme-change", { bubbles: true, detail: next }),
    );
    return next;
  };
  onMounted(() => {
    synchronize();
    if (!root || typeof MutationObserver === "undefined") return;
    media = window.matchMedia?.("(prefers-color-scheme: dark)");
    observer = new MutationObserver(synchronize);
    observer.observe(root, {
      attributeFilter: ["class", "data-theme"],
      attributes: true,
    });
    media?.addEventListener?.("change", synchronize);
  });
  onBeforeUnmount(() => {
    observer?.disconnect();
    media?.removeEventListener?.("change", synchronize);
  });
  return Object.freeze({
    resolvedTheme: readonly(resolvedTheme),
    setTheme,
    theme: readonly(theme),
  });
}

export function useA3SMotion() {
  const reducedMotion = ref(false);
  let media;
  const synchronize = () => {
    reducedMotion.value = media?.matches === true;
  };
  onMounted(() => {
    media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    synchronize();
    media?.addEventListener?.("change", synchronize);
  });
  onBeforeUnmount(() => media?.removeEventListener?.("change", synchronize));
  return Object.freeze({ reducedMotion: readonly(reducedMotion) });
}

export function useA3SComponent(slug, options = {}) {
  const definition = componentMap[slug];
  if (!definition) throw new Error(\`Unknown A3S UI component: \${slug}\`);

  const eventNames = Object.keys(options.events ?? {});
  for (const eventName of eventNames) {
    if (!definition.events.includes(eventName)) {
      throw new Error(\`Unsupported \${definition.name} event: \${eventName}\`);
    }
  }

  const componentRef = shallowRef(null);
  const element = shallowRef(null);
  const ready = ref(false);
  const readyElements = new WeakSet();

  watch(
    componentRef,
    (reference, _previous, onCleanup) => {
      const root = resolveElement(reference);
      element.value = root;
      ready.value = false;
      if (!root) return;

      const listeners = definition.events.map((eventName) => {
        const listener = (event) => options.events?.[eventName]?.(event);
        root.addEventListener(eventName, listener);
        return [eventName, listener];
      });
      const markReady = () => {
        if (!isReady(root, slug)) return false;
        ready.value = true;
        if (!readyElements.has(root)) {
          readyElements.add(root);
          options.onReady?.(root);
        }
        return true;
      };
      const observer = markReady()
        ? null
        : new MutationObserver(() => markReady());
      observer?.observe(root, {
        attributeFilter: ["data-a3s-components"],
        attributes: true,
      });

      onCleanup(() => {
        observer?.disconnect();
        listeners.forEach(([eventName, listener]) =>
          root.removeEventListener(eventName, listener),
        );
      });
    },
    { flush: "post" },
  );

  const call = (method, ...args) => {
    if (!definition.methods.includes(method)) {
      throw new Error(\`Unsupported \${definition.name} method: \${method}\`);
    }
    const implementation = element.value?.[method];
    if (typeof implementation !== "function") {
      throw new Error(\`\${definition.name}.\${method} is not ready.\`);
    }
    return implementation.apply(element.value, args);
  };

  return Object.freeze({
    call,
    componentRef,
    definition,
    element: readonly(element),
    ready: readonly(ready),
  });
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

${hooks}

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
  const hookDeclarations = behaviorComponents()
    .map((component) => {
      const exportName = kebabToPascal(component.slug);
      return `export type ${exportName}Event = ${typeUnion(component.events)};
export type ${exportName}Method = ${typeUnion(component.methods)};
export function use${exportName}(
  options?: A3SHookOptions<${exportName}Event>,
): A3SComposableResult<${exportName}Method>;`;
    })
    .join("\n");
  return `import type { DefineComponent, Ref, ShallowRef } from "vue";
import type { ComponentDefinition } from "../ai/manifest.js";

export type A3SComponentProps = {
  as?: string | object | Function;
  onReady?: (element: HTMLElement) => void;
} & Record<string, unknown>;

export type A3SComponent = DefineComponent<A3SComponentProps> & {
  a3s: ComponentDefinition;
};

export type A3SEventHandler = (event: Event) => void;
export type A3SHookOptions<EventName extends string = string> = {
  events?: Partial<Record<EventName, A3SEventHandler>>;
  onReady?: (element: HTMLElement) => void;
};
export type A3SComponentReference =
  | HTMLElement
  | { readonly element?: HTMLElement | null }
  | null;
export type A3SComposableResult<MethodName extends string = string> = Readonly<{
  call<Result = unknown>(method: MethodName, ...args: unknown[]): Result;
  componentRef: ShallowRef<A3SComponentReference>;
  definition: ComponentDefinition;
  element: Readonly<ShallowRef<HTMLElement | null>>;
  ready: Readonly<Ref<boolean>>;
}>;

export type A3SDirection = "ltr" | "rtl";
export type A3STheme = "dark" | "light" | "system";
export type A3SResolvedTheme = Exclude<A3STheme, "system">;
export type A3SConfigRootOptions = { root?: HTMLElement | null };
export type A3SLocaleOptions = A3SConfigRootOptions & {
  fallbackLocale?: string;
};
export type A3SLocaleComposableResult = Readonly<{
  direction: Readonly<Ref<A3SDirection>>;
  locale: Readonly<Ref<string>>;
  setLocale(locale: string, direction?: A3SDirection): {
    direction: A3SDirection;
    locale: string;
  };
}>;
export type A3SThemeComposableResult = Readonly<{
  resolvedTheme: Readonly<Ref<A3SResolvedTheme>>;
  setTheme(theme: A3STheme): {
    resolvedTheme: A3SResolvedTheme;
    theme: A3STheme;
  };
  theme: Readonly<Ref<A3STheme>>;
}>;
export type A3SMotionComposableResult = Readonly<{
  reducedMotion: Readonly<Ref<boolean>>;
}>;

export function useA3SLocale(
  options?: A3SLocaleOptions,
): A3SLocaleComposableResult;
export function useA3STheme(
  options?: A3SConfigRootOptions,
): A3SThemeComposableResult;
export function useA3SMotion(): A3SMotionComposableResult;

export function createA3SComponent(slug: string): A3SComponent;
export function useA3SComponent<
  EventName extends string = string,
  MethodName extends string = string,
>(
  slug: string,
  options?: A3SHookOptions<EventName>,
): A3SComposableResult<MethodName>;
${declarations}
${hookDeclarations}
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
  hooks: readonly string[];
  framework: Readonly<{
    attributes: Readonly<Record<string, string>>;
    className: string;
    tag: string;
  }>;
  name: string;
  methods: readonly string[];
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
  const duplicates = slugs.filter(
    (slug, index) => slugs.indexOf(slug) !== index,
  );
  const missing = documented.filter((slug) => !slugs.includes(slug));
  const undocumented = slugs.filter((slug) => !documented.includes(slug));
  if (duplicates.length || missing.length || undocumented.length) {
    throw new Error(
      `AI component manifest coverage failed: duplicates=${duplicates.join(",") || "none"}; missing=${missing.join(",") || "none"}; undocumented=${undocumented.join(",") || "none"}`,
    );
  }
  for (const component of components) {
    if (!component.selector || component.states.length === 0) {
      throw new Error(
        `${component.slug} is missing a selector or state contract.`,
      );
    }
    for (const action of component.actions) {
      if (
        !component.test.actions[action] ||
        !component.test.actionTargets[action]
      ) {
        throw new Error(
          `${component.slug}.${action} is missing an A3S Test action target.`,
        );
      }
    }
    for (const state of component.states) {
      if (!component.test.states[state]) {
        throw new Error(
          `${component.slug}.${state} is missing a state selector.`,
        );
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
  writeFile(
    path.join(outputRoot, "manifest.js"),
    createManifestModule(manifestJson),
  ),
  writeFile(path.join(outputRoot, "manifest.d.ts"), createManifestTypes()),
  writeFile(
    path.join(outputRoot, "runtime.js"),
    createRuntimeBundle(runtimeSource),
  ),
  writeFile(path.join(outputRoot, "runtime.d.ts"), createRuntimeTypes()),
  writeFile(path.join(outputRoot, "a3s-test.acl"), createA3STestExamples()),
  writeFile(
    path.join(outputRoot, "a3s-test", "selectors.js"),
    createA3STestSelectors(),
  ),
  writeFile(
    path.join(outputRoot, "a3s-test", "selectors.d.ts"),
    createA3STestSelectorTypes(),
  ),
  writeFile(
    path.join(outputRoot, "frameworks", "react.js"),
    createReactAdapter(),
  ),
  writeFile(
    path.join(outputRoot, "frameworks", "react.d.ts"),
    createReactTypes(),
  ),
  writeFile(path.join(outputRoot, "frameworks", "vue.js"), createVueAdapter()),
  writeFile(path.join(outputRoot, "frameworks", "vue.d.ts"), createVueTypes()),
]);

console.log(
  `Generated AI, A3S Test, React, and Vue assets for ${components.length} components.`,
);
