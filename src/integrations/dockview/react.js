export * from "dockview-react";
export {
  createDockviewLayoutPersistence,
  dockviewCommercialOnlyCapabilities,
  dockviewOpenSourceCapabilities,
  themeA3S,
} from "./shared.js";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDockviewLayoutPersistence,
  resetDockviewLayout,
} from "./shared.js";

function useViewApi(options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [api, setApi] = useState(null);
  const onReady = useCallback((event) => {
    setApi(event.api);
    optionsRef.current.onReady?.(event);
  }, []);
  return { api, onReady, ready: api !== null };
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
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const persistenceRef = useRef(null);
  if (!persistenceRef.current) {
    persistenceRef.current =
      options.persistence || createDockviewLayoutPersistence(options);
  }

  const apiRef = useRef(null);
  const subscriptionRef = useRef(null);
  const [api, setApi] = useState(null);
  const [status, setStatus] = useState("idle");

  useEffect(
    () => () => {
      subscriptionRef.current?.dispose();
      subscriptionRef.current = null;
    },
    [],
  );

  const onReady = useCallback((event) => {
    subscriptionRef.current?.dispose();
    const current = optionsRef.current;
    const persistence = persistenceRef.current;
    const result =
      current.restore === false
        ? { status: "empty" }
        : persistence.restore(event.api);

    if (result.status !== "restored") current.initialize?.(event.api);
    subscriptionRef.current = persistence.bind(event.api);
    apiRef.current = event.api;
    setApi(event.api);
    setStatus(result.status);
    current.onReady?.(event, result);
  }, []);

  const clear = useCallback(() => persistenceRef.current.clear(), []);
  const restore = useCallback(() => {
    if (!apiRef.current) return { status: "unavailable" };
    const result = persistenceRef.current.restore(apiRef.current);
    setStatus(result.status);
    return result;
  }, []);
  const save = useCallback(
    () =>
      apiRef.current ? persistenceRef.current.save(apiRef.current) : false,
    [],
  );
  const reset = useCallback(() => {
    if (!apiRef.current) return false;
    persistenceRef.current.clear();
    resetDockviewLayout(apiRef.current, optionsRef.current.initialize);
    setStatus("empty");
    return true;
  }, []);

  return { api, clear, onReady, reset, restore, save, status };
}
