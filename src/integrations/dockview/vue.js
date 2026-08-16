export * from "dockview-vue";
export {
  createDockviewLayoutPersistence,
  dockviewCommercialOnlyCapabilities,
  dockviewOpenSourceCapabilities,
  themeA3S,
} from "./shared.js";

import { onBeforeUnmount, shallowRef } from "vue";
import {
  createDockviewLayoutPersistence,
  resetDockviewLayout,
} from "./shared.js";

function useViewApi(options) {
  const api = shallowRef();
  const onReady = (event) => {
    api.value = event.api;
    options.onReady?.(event);
  };
  return { api, onReady };
}

export function useGridview(options = {}) {
  return useViewApi(options);
}

export function useSplitview(options = {}) {
  return useViewApi(options);
}

export function usePaneview(options = {}) {
  return useViewApi(options);
}

export function useDockviewLayout(options = {}) {
  const persistence =
    options.persistence || createDockviewLayoutPersistence(options);
  const api = shallowRef();
  const status = shallowRef("idle");
  let subscription = null;

  const onReady = (event) => {
    subscription?.dispose();
    const result =
      options.restore === false
        ? { status: "empty" }
        : persistence.restore(event.api);
    if (result.status !== "restored") options.initialize?.(event.api);
    subscription = persistence.bind(event.api);
    api.value = event.api;
    status.value = result.status;
    options.onReady?.(event, result);
  };

  const clear = () => persistence.clear();
  const restore = () => {
    if (!api.value) return { status: "unavailable" };
    const result = persistence.restore(api.value);
    status.value = result.status;
    return result;
  };
  const save = () => (api.value ? persistence.save(api.value) : false);
  const reset = () => {
    if (!api.value) return false;
    persistence.clear();
    resetDockviewLayout(api.value, options.initialize);
    status.value = "empty";
    return true;
  };

  onBeforeUnmount(() => {
    subscription?.dispose();
    subscription = null;
  });

  return { api, clear, onReady, reset, restore, save, status };
}
