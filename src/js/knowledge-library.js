(() => {
  const states = new WeakMap();
  const validStates = new Set([
    "ready",
    "loading",
    "empty",
    "partial",
    "error",
    "offline",
    "permission-denied",
  ]);
  const validPhases = new Set([
    "ready",
    "queued",
    "running",
    "succeeded",
    "failed",
    "paused",
  ]);

  const ownsElement = (root, element) =>
    element?.closest?.(".knowledge-library") === root;

  const itemValue = (item) =>
    item?.dataset.knowledgeValue || item?.dataset.value || item?.id || "";

  const itemLabel = (item) =>
    item?.dataset.knowledgeLabel ||
    item?.querySelector("[data-knowledge-item-identity]")?.textContent?.trim() ||
    item?.textContent?.trim() ||
    itemValue(item);

  const phaseOf = (item) =>
    item?.dataset.knowledgePhase ||
    item?.querySelector("[data-knowledge-phase]")?.dataset.knowledgePhase ||
    "ready";

  const elements = (root) => ({
    details: Array.from(
      root.querySelectorAll("[data-knowledge-library-detail]"),
    ).filter((element) => ownsElement(root, element)),
    empty:
      Array.from(root.querySelectorAll("[data-knowledge-library-empty]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    filterButtons: Array.from(
      root.querySelectorAll("[data-knowledge-filter]"),
    ).filter((element) => ownsElement(root, element)),
    items: Array.from(root.querySelectorAll("[data-knowledge-item]")).filter(
      (element) => ownsElement(root, element),
    ),
    search:
      Array.from(root.querySelectorAll("[data-knowledge-library-search]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    stateRegions: Array.from(
      root.querySelectorAll("[data-knowledge-library-state]"),
    ).filter((element) => ownsElement(root, element)),
    viewport:
      Array.from(root.querySelectorAll("[data-knowledge-library-viewport]")).find(
        (element) => ownsElement(root, element),
      ) || null,
  });

  const searchControl = (state) => {
    if (state.search?.matches?.("input, textarea")) return state.search;
    return state.search?.querySelector?.("input, textarea") || null;
  };

  const filterSnapshot = (state) =>
    Object.freeze({ phase: state.phaseFilter, query: state.query });

  const selectedItem = (state) =>
    state.items.find((item) => item.getAttribute("aria-selected") === "true") ||
    null;

  const selectionSnapshot = (state) => {
    const item = selectedItem(state);
    return Object.freeze({ item, value: item ? itemValue(item) : "" });
  };

  const snapshot = (state) =>
    Object.freeze({
      filter: filterSnapshot(state),
      selection: selectionSnapshot(state),
      state: state.name,
      visible: state.items.filter((item) => !item.hidden).length,
    });

  const matchesPhase = (phase, filter) => {
    if (!filter || filter === "all") return true;
    if (filter === "attention") return ["failed", "paused"].includes(phase);
    if (filter === "updating") return ["queued", "running"].includes(phase);
    return phase === filter;
  };

  const applyFilter = (root, state, next) => {
    state.query = String(next.query ?? "");
    state.phaseFilter = String(next.phase || "all");
    const normalized = state.query.trim().toLocaleLowerCase();
    let visible = 0;
    state.items.forEach((item) => {
      const matchesQuery =
        !normalized ||
        `${itemLabel(item)} ${item.dataset.knowledgeSearch || ""}`
          .toLocaleLowerCase()
          .includes(normalized);
      const matches = matchesQuery && matchesPhase(phaseOf(item), state.phaseFilter);
      item.hidden = !matches;
      if (matches) visible += 1;
    });
    state.filterButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.knowledgeFilter === state.phaseFilter),
      );
    });
    const input = searchControl(state);
    if (input && input.value !== state.query) input.value = state.query;
    if (state.empty) state.empty.hidden = visible !== 0;
    root.dataset.filter = visible
      ? normalized || state.phaseFilter !== "all"
        ? "results"
        : "none"
      : "empty";
    const selected = selectedItem(state);
    if (selected?.hidden) writeSelection(state, null);
    return visible;
  };

  const normalizeFilter = (state, value) => {
    if (typeof value === "string") {
      return { phase: state.phaseFilter, query: value };
    }
    return {
      phase: value?.phase ?? state.phaseFilter,
      query: value?.query ?? state.query,
    };
  };

  const requestFilter = (root, state, value, options = {}) => {
    const previous = filterSnapshot(state);
    const current = normalizeFilter(state, value);
    if (
      previous.phase === current.phase &&
      previous.query === current.query &&
      !options.force
    ) {
      return true;
    }
    const detail = {
      current: Object.freeze({ ...current }),
      originalEvent: options.originalEvent || null,
      previous,
      source: options.source || "api",
    };
    if (
      options.before !== false &&
      !root.dispatchEvent(
        new CustomEvent("a3s:knowledge-before-filter-change", {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      )
    ) {
      const input = searchControl(state);
      if (input) input.value = previous.query;
      return false;
    }
    detail.count = applyFilter(root, state, current);
    if (options.emit !== false) {
      root.dispatchEvent(
        new CustomEvent("a3s:knowledge-filter-change", {
          bubbles: true,
          detail,
        }),
      );
    }
    return true;
  };

  const writeSelection = (state, item) => {
    state.items.forEach((candidate) => {
      const selected = Boolean(item) && candidate === item;
      candidate.setAttribute("aria-selected", String(selected));
      if (selected) candidate.setAttribute("aria-current", "true");
      else candidate.removeAttribute("aria-current");
      candidate.tabIndex = selected ? 0 : -1;
    });
    if (!item) {
      const first = state.items.find((candidate) => !candidate.hidden);
      if (first) first.tabIndex = 0;
    }
    const value = item ? itemValue(item) : "";
    state.details.forEach((detail) => {
      detail.hidden = detail.dataset.knowledgeDetailFor !== value;
    });
    state.selectedValue = value;
    return selectionSnapshot(state);
  };

  const requestSelection = (root, state, value, options = {}) => {
    const previous = selectionSnapshot(state);
    const item = value instanceof Element
      ? value.closest("[data-knowledge-item]")
      : state.items.find((candidate) => itemValue(candidate) === String(value || ""));
    if (item && (item.hidden || item.getAttribute("aria-disabled") === "true")) {
      return false;
    }
    const nextValue = item ? itemValue(item) : "";
    if (previous.value === nextValue && !options.force) return true;
    const detail = {
      current: Object.freeze({ item: item || null, value: nextValue }),
      originalEvent: options.originalEvent || null,
      previous,
      source: options.source || "api",
      value: nextValue,
    };
    if (
      options.before !== false &&
      !root.dispatchEvent(
        new CustomEvent("a3s:knowledge-before-selection-change", {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      )
    ) {
      return false;
    }
    const current = writeSelection(state, item || null);
    if (options.focus && item instanceof HTMLElement) {
      item.focus({ preventScroll: true });
    }
    root.dispatchEvent(
      new CustomEvent("a3s:knowledge-selection-change", {
        bubbles: true,
        detail: { ...detail, current },
      }),
    );
    return true;
  };

  const actionDetail = (state, action, value, options = {}) => ({
    action,
    originalEvent: options.originalEvent || null,
    selection: selectionSnapshot(state),
    source: options.source || "api",
    value: String(value || state.selectedValue || ""),
  });

  const runAction = (root, state, action, value, options = {}) => {
    if (!action) return false;
    if (action === "clear-filter") {
      return requestFilter(root, state, { phase: "all", query: "" }, options);
    }
    if (action === "close-detail") {
      return requestSelection(root, state, "", options);
    }
    const detail = actionDetail(state, action, value, options);
    if (
      options.before !== false &&
      !root.dispatchEvent(
        new CustomEvent("a3s:knowledge-before-action", {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      )
    ) {
      return false;
    }
    root.dispatchEvent(
      new CustomEvent("a3s:knowledge-action", { bubbles: true, detail }),
    );
    return true;
  };

  const setPhase = (root, state, value, phase, options = {}) => {
    const item = state.items.find((candidate) => itemValue(candidate) === String(value));
    if (!item || !validPhases.has(phase)) return false;
    const previous = phaseOf(item);
    if (previous === phase && !options.force) return true;
    item.dataset.knowledgePhase = phase;
    const phaseElement = item.querySelector("[data-knowledge-phase]");
    if (phaseElement) phaseElement.dataset.knowledgePhase = phase;
    applyFilter(root, state, filterSnapshot(state));
    root.dispatchEvent(
      new CustomEvent("a3s:knowledge-phase-change", {
        bubbles: true,
        detail: {
          current: phase,
          previous,
          source: options.source || "api",
          value: itemValue(item),
        },
      }),
    );
    return true;
  };

  const setState = (root, state, name, options = {}) => {
    const next = validStates.has(name) ? name : "ready";
    const previous = state.name;
    if (next === previous && !options.force) return snapshot(state);
    state.name = next;
    root.dataset.state = next;
    root.setAttribute("aria-busy", String(next === "loading"));
    state.stateRegions.forEach((region) => {
      region.hidden = region.dataset.knowledgeLibraryState !== next;
    });
    const terminal = !["ready", "partial"].includes(next);
    if (state.viewport) {
      state.viewport.hidden = terminal;
      state.viewport.toggleAttribute("inert", terminal);
    }
    root.dispatchEvent(
      new CustomEvent("a3s:knowledge-state-change", {
        bubbles: true,
        detail: { current: next, previous, source: options.source || "api" },
      }),
    );
    return snapshot(state);
  };

  const refresh = (root, options = {}) => {
    const state = states.get(root);
    if (!state) return null;
    const selectedValue = state.selectedValue;
    Object.assign(state, elements(root));
    state.items.forEach((item) => {
      item.setAttribute("aria-selected", String(itemValue(item) === selectedValue));
      item.tabIndex = -1;
    });
    applyFilter(root, state, filterSnapshot(state));
    writeSelection(
      state,
      state.items.find((item) => itemValue(item) === selectedValue) || null,
    );
    setState(root, state, state.name, { ...options, force: true });
    return snapshot(state);
  };

  const initKnowledgeLibrary = (root) => {
    if (root.dataset.knowledgeLibraryInitialized === "true") return;
    const initial = elements(root);
    const input = initial.search?.matches?.("input, textarea")
      ? initial.search
      : initial.search?.querySelector?.("input, textarea");
    const activeFilter = initial.filterButtons.find(
      (button) => button.getAttribute("aria-pressed") === "true",
    );
    const activeItem = initial.items.find(
      (item) => item.getAttribute("aria-selected") === "true",
    );
    const state = {
      ...initial,
      name: validStates.has(root.dataset.state) ? root.dataset.state : "ready",
      phaseFilter: activeFilter?.dataset.knowledgeFilter || "all",
      query: input?.value || "",
      selectedValue: activeItem ? itemValue(activeItem) : "",
    };
    states.set(root, state);

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const item = target.closest("[data-knowledge-item]");
      if (item && ownsElement(root, item)) {
        requestSelection(root, state, item, {
          focus: true,
          originalEvent: event,
          source: "user",
        });
        return;
      }
      const filter = target.closest("[data-knowledge-filter]");
      if (filter && ownsElement(root, filter)) {
        requestFilter(
          root,
          state,
          { phase: filter.dataset.knowledgeFilter, query: state.query },
          { originalEvent: event, source: "user" },
        );
        return;
      }
      const action = target.closest("[data-knowledge-action]");
      if (action && ownsElement(root, action)) {
        runAction(
          root,
          state,
          action.dataset.knowledgeAction,
          action.dataset.knowledgeValue,
          { originalEvent: event, source: "user" },
        );
      }
    };

    const handleInput = (event) => {
      const inputElement = searchControl(state);
      if (event.target !== inputElement) return;
      requestFilter(
        root,
        state,
        { phase: state.phaseFilter, query: inputElement.value },
        { originalEvent: event, source: "user" },
      );
    };

    const handleKeydown = (event) => {
      const item = event.target.closest?.("[data-knowledge-item]");
      if (!item) {
        if (event.key === "Escape") requestSelection(root, state, "", { source: "keyboard" });
        return;
      }
      const visible = state.items.filter(
        (candidate) => !candidate.hidden && candidate.getAttribute("aria-disabled") !== "true",
      );
      const index = Math.max(0, visible.indexOf(item));
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const nextIndex = event.key === "Home"
          ? 0
          : event.key === "End"
            ? visible.length - 1
            : event.key === "ArrowDown"
              ? Math.min(index + 1, visible.length - 1)
              : Math.max(index - 1, 0);
        const next = visible[nextIndex];
        if (next) requestSelection(root, state, next, { focus: true, source: "keyboard" });
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        requestSelection(root, state, item, { focus: true, source: "keyboard" });
      } else if (event.key === "Escape") {
        requestSelection(root, state, "", { source: "keyboard" });
      }
    };

    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root.addEventListener("keydown", handleKeydown);
    root.clearFilter = (options = {}) => requestFilter(
      root,
      state,
      { phase: "all", query: "" },
      options,
    );
    root.clearSelection = (options = {}) => requestSelection(root, state, "", options);
    root.getFilter = () => filterSnapshot(state);
    root.getSelection = () => selectionSnapshot(state);
    root.getState = () => snapshot(state);
    root.refresh = (options = {}) => refresh(root, options);
    root.runAction = (action, value, options = {}) => runAction(root, state, action, value, options);
    root.select = (value, options = {}) => requestSelection(root, state, value, options);
    root.setFilter = (value, options = {}) => requestFilter(root, state, value, options);
    root.setPhase = (value, phase, options = {}) => setPhase(root, state, value, phase, options);
    root.setState = (name, options = {}) => setState(root, state, name, options);
    root._destroy = () => {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("input", handleInput);
      root.removeEventListener("keydown", handleKeydown);
      states.delete(root);
      [
        "clearFilter",
        "clearSelection",
        "getFilter",
        "getSelection",
        "getState",
        "refresh",
        "runAction",
        "select",
        "setFilter",
        "setPhase",
        "setState",
      ].forEach((method) => delete root[method]);
    };

    refresh(root, { source: "init" });
    root.dataset.knowledgeLibraryInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("knowledge-library", {
      selector: ".knowledge-library:not([data-knowledge-library-initialized])",
      init: initKnowledgeLibrary,
      refresh,
    });
  }
})();
