import { useCallback, useEffect, useRef, useState } from "react";
import {
  capabilityDirectory,
  type ProductCapabilityCategory,
  type ProductCapabilityTab,
  type ProductLocalizedText,
} from "./product-playground-data";
import type { ProductPlaygroundIconName } from "./ProductPlaygroundIcon";

export type ProductCapabilityLifecycle =
  "attention" | "available" | "disabled" | "ready";

export type ProductCapabilityScope = "all-workspaces" | "current-workspace";

export type ProductCapabilityPreference = {
  description?: string;
  lifecycle: ProductCapabilityLifecycle;
  permissions?: boolean[];
  scope: ProductCapabilityScope;
  source?: string;
};

export type ProductCustomCapability = {
  category: ProductCapabilityCategory;
  description: string;
  id: string;
  label: string;
  source: string;
  tab: ProductCapabilityTab;
  tag: string;
};

export type ProductCapabilityRegistry = {
  custom: ProductCustomCapability[];
  records: Record<string, ProductCapabilityPreference>;
  version: 1;
};

export type ProductCapabilityDefinition = {
  category: ProductCapabilityCategory;
  custom: boolean;
  description: ProductLocalizedText;
  icon?: ProductPlaygroundIconName;
  id: string;
  label: ProductLocalizedText;
  source?: string;
  tab: ProductCapabilityTab;
  tag: ProductLocalizedText;
};

const STORAGE_KEY = "a3s-playground-capabilities-v1";
const CHANGE_EVENT = "a3s:playground-capabilities-change";

function slug(value: string) {
  return (
    value
      .normalize("NFKC")
      .toLocaleLowerCase("en")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-|-$/gu, "") || "custom"
  );
}

export function getProductCapabilityId(
  tab: ProductCapabilityTab,
  label: string,
) {
  const prefix =
    tab === "assistants"
      ? "assistant"
      : tab === "skills"
        ? "skill"
        : "connector";
  return `${prefix}:${slug(label)}`;
}

function createDefaultRegistry(): ProductCapabilityRegistry {
  const records: Record<string, ProductCapabilityPreference> = {};
  (Object.keys(capabilityDirectory) as ProductCapabilityTab[]).forEach(
    (tab) => {
      capabilityDirectory[tab].forEach((capability) => {
        const id = getProductCapabilityId(tab, capability.label.en);
        records[id] = {
          lifecycle: capability.owned ? "ready" : "available",
          scope: "current-workspace",
        };
      });
    },
  );

  const documentLibrary = getProductCapabilityId(
    "connectors",
    "Document library",
  );
  if (records[documentLibrary]) {
    records[documentLibrary] = {
      lifecycle: "attention",
      scope: "current-workspace",
    };
  }

  return { custom: [], records, version: 1 };
}

function normalizeRegistry(value: unknown): ProductCapabilityRegistry {
  const defaults = createDefaultRegistry();
  if (!value || typeof value !== "object") return defaults;
  const candidate = value as Partial<ProductCapabilityRegistry>;
  if (candidate.version !== 1) return defaults;

  const records = { ...defaults.records };
  if (candidate.records && typeof candidate.records === "object") {
    Object.entries(candidate.records).forEach(([id, preference]) => {
      if (!preference || typeof preference !== "object") return;
      const record = preference as ProductCapabilityPreference;
      const lifecycle = record.lifecycle;
      const scope = record.scope;
      if (
        !["attention", "available", "disabled", "ready"].includes(lifecycle) ||
        !["all-workspaces", "current-workspace"].includes(scope)
      ) {
        return;
      }
      const description =
        typeof record.description === "string"
          ? record.description.slice(0, 240)
          : undefined;
      const source =
        typeof record.source === "string"
          ? record.source.slice(0, 500)
          : undefined;
      const normalizedPermissions = Array.isArray(record.permissions)
        ? record.permissions.slice(0, 3).map(Boolean)
        : undefined;
      const permissions = normalizedPermissions?.some(Boolean)
        ? normalizedPermissions
        : undefined;
      records[id] = {
        ...(description ? { description } : {}),
        lifecycle,
        ...(permissions ? { permissions } : {}),
        scope,
        ...(source ? { source } : {}),
      };
    });
  }

  const custom = Array.isArray(candidate.custom)
    ? candidate.custom
        .filter(isCustomCapability)
        .slice(0, 24)
        .map((capability) => ({
          ...capability,
          description: capability.description.slice(0, 240),
          id: capability.id.slice(0, 120),
          label: capability.label.slice(0, 80),
          source: capability.source.slice(0, 500),
          tag: capability.tag.slice(0, 80),
        }))
    : [];
  custom.forEach((capability) => {
    records[capability.id] ??= {
      lifecycle: "ready",
      scope: "current-workspace",
    };
  });

  return { custom, records, version: 1 };
}

function isCustomCapability(value: unknown): value is ProductCustomCapability {
  if (!value || typeof value !== "object") return false;
  const candidate = value as ProductCustomCapability;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    candidate.label.trim().length > 0 &&
    typeof candidate.description === "string" &&
    typeof candidate.source === "string" &&
    ["assistants", "connectors", "skills"].includes(candidate.tab) &&
    [
      "content",
      "data",
      "engineering",
      "knowledge",
      "operations",
      "product",
    ].includes(candidate.category)
  );
}

function readRegistry() {
  const defaults = createDefaultRegistry();
  if (typeof window === "undefined") {
    return { registry: defaults, storageAvailable: true };
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return {
      registry: stored ? normalizeRegistry(JSON.parse(stored)) : defaults,
      storageAvailable: true,
    };
  } catch {
    return { registry: defaults, storageAvailable: false };
  }
}

function persistRegistry(registry: ProductCapabilityRegistry) {
  if (typeof window === "undefined") return false;
  let storageAvailable = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
  } catch {
    storageAvailable = false;
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: registry }));
  return storageAvailable;
}

export function getProductCapabilityDefinitions(
  tab: ProductCapabilityTab,
  registry: ProductCapabilityRegistry,
): ProductCapabilityDefinition[] {
  const builtIn = capabilityDirectory[tab].map((capability) => ({
    ...capability,
    custom: false,
    id: getProductCapabilityId(tab, capability.label.en),
    tab,
  }));
  const custom = registry.custom
    .filter((capability) => capability.tab === tab)
    .map<ProductCapabilityDefinition>((capability) => ({
      category: capability.category,
      custom: true,
      description: { en: capability.description, zh: capability.description },
      id: capability.id,
      label: { en: capability.label, zh: capability.label },
      source: capability.source,
      tab,
      tag: { en: capability.tag, zh: capability.tag },
    }));
  return [...builtIn, ...custom];
}

export function useProductCapabilityRegistry() {
  const [registry, setRegistry] = useState<ProductCapabilityRegistry>(() =>
    createDefaultRegistry(),
  );
  const registryRef = useRef(registry);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    const initial = readRegistry();
    registryRef.current = initial.registry;
    setRegistry(initial.registry);
    setStorageAvailable(initial.storageAvailable);
    const synchronize = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const next = normalizeRegistry(event.detail);
        registryRef.current = next;
        setRegistry(next);
      } else {
        const stored = readRegistry();
        registryRef.current = stored.registry;
        setRegistry(stored.registry);
        setStorageAvailable(stored.storageAvailable);
      }
    };
    window.addEventListener(CHANGE_EVENT, synchronize);
    window.addEventListener("storage", synchronize);
    return () => {
      window.removeEventListener(CHANGE_EVENT, synchronize);
      window.removeEventListener("storage", synchronize);
    };
  }, []);

  const updateRegistry = useCallback(
    (
      update: (current: ProductCapabilityRegistry) => ProductCapabilityRegistry,
    ) => {
      const next = normalizeRegistry(update(registryRef.current));
      registryRef.current = next;
      setRegistry(next);
      setStorageAvailable(persistRegistry(next));
      return next;
    },
    [],
  );

  const retryPersistence = useCallback(() => {
    setStorageAvailable(persistRegistry(registryRef.current));
  }, []);

  const setPreference = useCallback(
    (id: string, preference: ProductCapabilityPreference) => {
      updateRegistry((current) => ({
        ...current,
        records: { ...current.records, [id]: preference },
      }));
    },
    [updateRegistry],
  );

  const addCustom = useCallback(
    (
      capability: Omit<ProductCustomCapability, "id">,
      scope: ProductCapabilityScope,
      permissions?: boolean[],
    ) => {
      const baseId = getProductCapabilityId(capability.tab, capability.label);
      let id = baseId;
      let suffix = 2;
      while (registryRef.current.records[id]) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      updateRegistry((current) => ({
        ...current,
        custom: [...current.custom, { ...capability, id }],
        records: {
          ...current.records,
          [id]: {
            lifecycle: "ready",
            ...(permissions ? { permissions: permissions.slice(0, 3) } : {}),
            scope,
          },
        },
      }));
      return id;
    },
    [updateRegistry],
  );

  return {
    addCustom,
    registry,
    retryPersistence,
    setPreference,
    storageAvailable,
  };
}
