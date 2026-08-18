(() => {
  const states = new WeakMap();
  const terminalStates = new Set([
    "empty",
    "error",
    "loading",
    "offline",
    "permission-denied",
  ]);
  const validStates = new Set([
    "ready",
    "loading",
    "empty",
    "partial",
    "error",
    "offline",
    "permission-denied",
    "readonly",
  ]);
  const writeActions = new Set([
    "copy",
    "cut",
    "delete",
    "duplicate",
    "import",
    "move",
    "new-file",
    "new-folder",
    "paste",
    "rename",
  ]);

  const ownsElement = (root, element) =>
    element?.closest?.(".file-manager") === root;

  const itemValue = (item) =>
    item?.dataset.fileValue || item?.dataset.value || item?.id || "";

  const itemLabel = (item) =>
    item?.dataset.fileLabel ||
    item?.querySelector("[data-file-label]")?.textContent?.trim() ||
    item?.textContent?.trim() ||
    itemValue(item);

  const elements = (root) => ({
    empty:
      Array.from(root.querySelectorAll("[data-file-manager-empty]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    items: Array.from(root.querySelectorAll("[data-file-item]")).filter(
      (element) => ownsElement(root, element),
    ),
    preview:
      Array.from(root.querySelectorAll("[data-file-manager-preview]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    search:
      Array.from(root.querySelectorAll("[data-file-manager-search]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    stateRegions: Array.from(
      root.querySelectorAll("[data-file-manager-state]"),
    ).filter((element) => ownsElement(root, element)),
    viewport:
      Array.from(root.querySelectorAll("[data-file-manager-viewport]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    viewButtons: Array.from(root.querySelectorAll("[data-file-view]")).filter(
      (element) => ownsElement(root, element),
    ),
  });

  const searchControl = (state) => {
    if (state.search?.matches?.("input, textarea")) return state.search;
    return state.search?.querySelector?.("input, textarea") || null;
  };

  const selectedItems = (state) =>
    state.items.filter(
      (item) => item.getAttribute("aria-selected") === "true",
    );

  const selectionSnapshot = (state) =>
    Object.freeze({
      items: Object.freeze([...selectedItems(state)]),
      values: Object.freeze(selectedItems(state).map(itemValue)),
    });

  const snapshot = (state) =>
    Object.freeze({
      filter: state.filter,
      readonly: state.readonly,
      selection: selectionSnapshot(state),
      state: state.name,
      view: state.view,
      visible: state.items.filter((item) => !item.hidden).length,
    });

  const writeSelection = (state, values, focusValue) => {
    const selected = new Set(values.map(String));
    const visible = state.items.filter((item) => !item.hidden);
    state.items.forEach((item) => {
      item.setAttribute("aria-selected", String(selected.has(itemValue(item))));
      item.tabIndex = -1;
    });
    const focusItem =
      state.items.find((item) => itemValue(item) === String(focusValue || "")) ||
      visible.find((item) => selected.has(itemValue(item))) ||
      visible[0];
    if (focusItem) focusItem.tabIndex = 0;
    state.anchor = focusItem ? itemValue(focusItem) : "";
    return focusItem || null;
  };

  const emitSelection = (root, state, previous, options = {}) => {
    const current = selectionSnapshot(state);
    root.dispatchEvent(
      new CustomEvent("a3s:file-manager-selection-change", {
        bubbles: true,
        detail: {
          current,
          originalEvent: options.originalEvent || null,
          previous,
          source: options.source || "api",
          values: [...current.values],
        },
      }),
    );
    return current;
  };

  const requestSelection = (root, state, values, options = {}) => {
    const previous = selectionSnapshot(state);
    const requested = [...new Set([].concat(values || []).map(String))];
    const available = new Set(state.items.map(itemValue));
    const currentValues = requested.filter((value) => available.has(value));
    if (
      JSON.stringify(previous.values) === JSON.stringify(currentValues) &&
      !options.force
    ) {
      return true;
    }
    const detail = {
      current: Object.freeze({ values: Object.freeze([...currentValues]) }),
      originalEvent: options.originalEvent || null,
      previous,
      source: options.source || "api",
      values: [...currentValues],
    };
    if (
      options.before !== false &&
      !root.dispatchEvent(
        new CustomEvent("a3s:file-manager-before-selection-change", {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      )
    ) {
      return false;
    }
    const focusItem = writeSelection(
      state,
      currentValues,
      options.focusValue || currentValues.at(-1),
    );
    if (options.focus && focusItem instanceof HTMLElement) {
      focusItem.focus({ preventScroll: true });
    }
    emitSelection(root, state, previous, options);
    return true;
  };

  const rangeValues = (state, startValue, endValue) => {
    const visible = state.items.filter((item) => !item.hidden);
    const start = visible.findIndex((item) => itemValue(item) === startValue);
    const end = visible.findIndex((item) => itemValue(item) === endValue);
    if (start < 0 || end < 0) return [endValue];
    const [from, to] = start < end ? [start, end] : [end, start];
    return visible.slice(from, to + 1).map(itemValue);
  };

  const selectItem = (root, state, item, options = {}) => {
    if (!item || item.hidden || item.getAttribute("aria-disabled") === "true") {
      return false;
    }
    const value = itemValue(item);
    const current = [...selectionSnapshot(state).values];
    let values = [value];
    if (options.range && state.anchor) {
      values = rangeValues(state, state.anchor, value);
    } else if (options.additive) {
      values = current.includes(value)
        ? current.filter((candidate) => candidate !== value)
        : [...current, value];
    }
    return requestSelection(root, state, values, {
      ...options,
      focusValue: value,
    });
  };

  const applyFilter = (root, state, value) => {
    const query = String(value ?? "");
    const normalized = query.trim().toLocaleLowerCase();
    let visible = 0;
    state.items.forEach((item) => {
      const matches =
        !normalized ||
        `${itemLabel(item)} ${item.dataset.fileSearch || ""}`
          .toLocaleLowerCase()
          .includes(normalized);
      item.hidden = !matches;
      if (matches) visible += 1;
    });
    state.filter = query;
    root.dataset.filter = normalized ? (visible ? "results" : "empty") : "none";
    if (state.empty) state.empty.hidden = visible !== 0;
    const input = searchControl(state);
    if (input && input.value !== query) input.value = query;
    const selected = selectionSnapshot(state).values.filter((candidate) =>
      state.items.some(
        (item) => itemValue(item) === candidate && !item.hidden,
      ),
    );
    writeSelection(state, selected, state.anchor);
    return visible;
  };

  const requestFilter = (root, state, value, options = {}) => {
    const current = String(value ?? "");
    const previous = state.filter;
    if (current === previous && !options.force) return true;
    const detail = {
      current,
      originalEvent: options.originalEvent || null,
      previous,
      source: options.source || "api",
    };
    if (
      options.before !== false &&
      !root.dispatchEvent(
        new CustomEvent("a3s:file-manager-before-filter-change", {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      )
    ) {
      const input = searchControl(state);
      if (input) input.value = previous;
      return false;
    }
    detail.count = applyFilter(root, state, current);
    if (options.emit !== false) {
      root.dispatchEvent(
        new CustomEvent("a3s:file-manager-filter-change", {
          bubbles: true,
          detail,
        }),
      );
    }
    return true;
  };

  const setView = (root, state, view, options = {}) => {
    const next = view === "list" ? "list" : "grid";
    const previous = state.view;
    if (next === previous && !options.force) return next;
    state.view = next;
    if (state.viewport) state.viewport.dataset.view = next;
    root.dataset.view = next;
    state.viewButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.fileView === next));
    });
    if (options.emit !== false) {
      root.dispatchEvent(
        new CustomEvent("a3s:file-manager-view-change", {
          bubbles: true,
          detail: { current: next, previous, source: options.source || "api" },
        }),
      );
    }
    return next;
  };

  const openPreview = (root, state, value, options = {}) => {
    if (!state.preview) return false;
    const next = String(value || selectionSnapshot(state).values[0] || "");
    const panels = Array.from(state.preview.querySelectorAll("[data-preview-for]"));
    if (panels.length && !panels.some((panel) => panel.dataset.previewFor === next)) {
      return false;
    }
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.previewFor !== next;
    });
    state.preview.hidden = false;
    state.previewValue = next;
    root.dispatchEvent(
      new CustomEvent("a3s:file-manager-preview-change", {
        bubbles: true,
        detail: { open: true, source: options.source || "api", value: next },
      }),
    );
    return true;
  };

  const closePreview = (root, state, options = {}) => {
    if (!state.preview || state.preview.hidden) return false;
    const value = state.previewValue;
    state.preview.hidden = true;
    state.previewValue = "";
    root.dispatchEvent(
      new CustomEvent("a3s:file-manager-preview-change", {
        bubbles: true,
        detail: { open: false, source: options.source || "api", value },
      }),
    );
    return true;
  };

  const actionDetail = (state, action, target, options = {}) => ({
    action,
    originalEvent: options.originalEvent || null,
    selection: selectionSnapshot(state),
    source: options.source || "api",
    target: target || null,
    value: target ? itemValue(target) : "",
  });

  const runAction = (root, state, action, target, options = {}) => {
    if (!action || (state.readonly && writeActions.has(action))) return false;
    if (action === "clear-filter") return requestFilter(root, state, "", options);
    if (action === "close-preview") return closePreview(root, state, options);
    if (action === "preview") {
      return openPreview(root, state, itemValue(target), options);
    }
    const detail = actionDetail(state, action, target, options);
    if (
      options.before !== false &&
      !root.dispatchEvent(
        new CustomEvent("a3s:file-manager-before-action", {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      )
    ) {
      return false;
    }
    root.dispatchEvent(
      new CustomEvent("a3s:file-manager-action", { bubbles: true, detail }),
    );
    return true;
  };

  const setState = (root, state, name, options = {}) => {
    const next = validStates.has(name) ? name : "ready";
    const previous = state.name;
    if (next === previous && !options.force) return snapshot(state);
    state.name = next;
    state.readonly = next === "readonly" || options.readonly === true;
    root.dataset.state = next;
    root.setAttribute("aria-busy", String(next === "loading"));
    state.stateRegions.forEach((region) => {
      region.hidden = region.dataset.fileManagerState !== next;
    });
    if (state.viewport) {
      state.viewport.hidden = terminalStates.has(next);
      state.viewport.toggleAttribute("inert", terminalStates.has(next));
    }
    root.dispatchEvent(
      new CustomEvent("a3s:file-manager-state-change", {
        bubbles: true,
        detail: { current: next, previous, source: options.source || "api" },
      }),
    );
    return snapshot(state);
  };

  const refresh = (root, options = {}) => {
    const state = states.get(root);
    if (!state) return null;
    const selected = [...selectionSnapshot(state).values];
    Object.assign(state, elements(root));
    state.items.forEach((item) => {
      item.setAttribute("role", item.getAttribute("role") || "option");
      if (!item.hasAttribute("aria-selected")) item.setAttribute("aria-selected", "false");
    });
    if (state.viewport) {
      state.viewport.setAttribute("role", state.viewport.getAttribute("role") || "listbox");
      state.viewport.setAttribute("aria-multiselectable", "true");
    }
    applyFilter(root, state, state.filter);
    writeSelection(state, selected, state.anchor);
    setView(root, state, state.view, { emit: false, force: true });
    setState(root, state, state.name, { ...options, force: true });
    return snapshot(state);
  };

  const initFileManager = (root) => {
    if (root.dataset.fileManagerInitialized === "true") return;
    const initial = elements(root);
    const input = initial.search?.matches?.("input, textarea")
      ? initial.search
      : initial.search?.querySelector?.("input, textarea");
    const state = {
      ...initial,
      anchor: "",
      filter: input?.value || "",
      name: validStates.has(root.dataset.state) ? root.dataset.state : "ready",
      previewValue: "",
      readonly: root.dataset.state === "readonly",
      view: root.dataset.view || initial.viewport?.dataset.view || "grid",
    };
    states.set(root, state);

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const item = target.closest("[data-file-item]");
      if (item && ownsElement(root, item)) {
        selectItem(root, state, item, {
          additive: event.metaKey || event.ctrlKey,
          focus: true,
          originalEvent: event,
          range: event.shiftKey,
          source: "user",
        });
        return;
      }
      const view = target.closest("[data-file-view]");
      if (view && ownsElement(root, view)) {
        setView(root, state, view.dataset.fileView, { source: "user" });
        return;
      }
      const action = target.closest("[data-file-action]");
      if (action && ownsElement(root, action)) {
        runAction(
          root,
          state,
          action.dataset.fileAction,
          state.items.find((candidate) =>
            selectionSnapshot(state).values.includes(itemValue(candidate)),
          ),
          { originalEvent: event, source: "user" },
        );
      }
    };

    const handleInput = (event) => {
      const inputElement = searchControl(state);
      if (event.target !== inputElement) return;
      requestFilter(root, state, inputElement.value, {
        originalEvent: event,
        source: "user",
      });
    };

    const handleKeydown = (event) => {
      const visible = state.items.filter(
        (item) => !item.hidden && item.getAttribute("aria-disabled") !== "true",
      );
      const current = event.target.closest?.("[data-file-item]") ||
        visible.find((item) => item.tabIndex === 0) ||
        visible[0];
      const index = Math.max(0, visible.indexOf(current));
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "a") {
        event.preventDefault();
        requestSelection(root, state, visible.map(itemValue), {
          originalEvent: event,
          source: "user",
        });
        return;
      }
      if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const nextIndex = event.key === "Home"
          ? 0
          : event.key === "End"
            ? visible.length - 1
            : ["ArrowDown", "ArrowRight"].includes(event.key)
              ? Math.min(index + 1, visible.length - 1)
              : Math.max(index - 1, 0);
        const next = visible[nextIndex];
        if (next) selectItem(root, state, next, { focus: true, source: "keyboard" });
      } else if (event.key === " " && current) {
        event.preventDefault();
        openPreview(root, state, itemValue(current), { source: "keyboard" });
      } else if (event.key === "Enter" && current) {
        event.preventDefault();
        runAction(root, state, "open", current, { originalEvent: event, source: "keyboard" });
      } else if (["Backspace", "Delete"].includes(event.key) && selectionSnapshot(state).values.length) {
        event.preventDefault();
        runAction(root, state, "delete", current, { originalEvent: event, source: "keyboard" });
      } else if (event.key === "Escape") {
        if (!closePreview(root, state, { source: "keyboard" })) {
          requestSelection(root, state, [], { source: "keyboard" });
        }
      }
    };

    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root.addEventListener("keydown", handleKeydown);
    root.clearFilter = (options = {}) => requestFilter(root, state, "", options);
    root.clearSelection = (options = {}) => requestSelection(root, state, [], options);
    root.closePreview = (options = {}) => closePreview(root, state, options);
    root.getFilter = () => state.filter;
    root.getSelection = () => selectionSnapshot(state);
    root.getState = () => snapshot(state);
    root.getView = () => state.view;
    root.openPreview = (value, options = {}) => openPreview(root, state, value, options);
    root.refresh = (options = {}) => refresh(root, options);
    root.runAction = (action, value, options = {}) => runAction(
      root,
      state,
      action,
      state.items.find((item) => itemValue(item) === String(value || "")),
      options,
    );
    root.select = (values, options = {}) => requestSelection(root, state, values, options);
    root.setFilter = (value, options = {}) => requestFilter(root, state, value, options);
    root.setReadonly = (value = true) => setState(root, state, value ? "readonly" : "ready");
    root.setState = (name, options = {}) => setState(root, state, name, options);
    root.setView = (view, options = {}) => setView(root, state, view, options);
    root._destroy = () => {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("input", handleInput);
      root.removeEventListener("keydown", handleKeydown);
      states.delete(root);
      [
        "clearFilter",
        "clearSelection",
        "closePreview",
        "getFilter",
        "getSelection",
        "getState",
        "getView",
        "openPreview",
        "refresh",
        "runAction",
        "select",
        "setFilter",
        "setReadonly",
        "setState",
        "setView",
      ].forEach((method) => delete root[method]);
    };

    refresh(root, { source: "init" });
    root.dataset.fileManagerInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("file-manager", {
      selector: ".file-manager:not([data-file-manager-initialized])",
      init: initFileManager,
      refresh,
    });
  }
})();
