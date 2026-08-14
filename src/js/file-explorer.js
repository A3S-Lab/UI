(() => {
  const states = new WeakMap();
  let renameErrorId = 0;
  const writeActions = new Set([
    "delete",
    "duplicate",
    "move",
    "new-file",
    "new-folder",
    "rename",
  ]);
  const terminalStates = new Set(["empty", "error", "permission-denied"]);

  const ownsElement = (root, element) =>
    element.closest(".file-explorer") === root;

  const treeItemValue = (item) =>
    item?.dataset.value ||
    item?.id ||
    item?.querySelector("[data-tree-label]")?.textContent?.trim() ||
    "";

  const treeItemLabel = (item) =>
    item?.querySelector(":scope > [data-tree-row] [data-tree-label]") || null;

  const getElements = (root) => {
    const tree = Array.from(root.querySelectorAll('.tree[role="tree"]')).find(
      (candidate) => ownsElement(root, candidate),
    );
    return {
      actions: Array.from(
        root.querySelectorAll(
          "[data-file-action], [data-context-content] [data-value]",
        ),
      ).filter((action) => ownsElement(root, action)),
      search:
        Array.from(root.querySelectorAll("[data-file-explorer-search]")).find(
          (input) => ownsElement(root, input),
        ) || null,
      stateRegions: Array.from(
        root.querySelectorAll("[data-file-explorer-state]"),
      ).filter((region) => ownsElement(root, region)),
      tree: tree || null,
      treeItems: tree
        ? Array.from(tree.querySelectorAll('[role="treeitem"]')).filter(
            (item) => item.closest(".tree") === tree,
          )
        : [],
      viewports: Array.from(
        root.querySelectorAll("[data-file-explorer-viewport]"),
      ).filter((viewport) => ownsElement(root, viewport)),
    };
  };

  const selectedItem = (state) =>
    state.treeItems.find(
      (item) => item.getAttribute("aria-selected") === "true",
    ) || null;

  const selectionSnapshot = (state, item = selectedItem(state)) =>
    Object.freeze({ item, value: item ? treeItemValue(item) : "" });

  const cloneSelection = (selection) => ({
    item: selection.item,
    value: selection.value,
  });

  const emitSelection = (root, state, current, metadata) => {
    const previous = state.selection;
    state.selection = current;
    state.pendingSelection = null;
    root.dispatchEvent(
      new CustomEvent("a3s:file-selection-change", {
        bubbles: true,
        detail: {
          current: cloneSelection(current),
          originalEvent: metadata.originalEvent || null,
          previous: cloneSelection(previous),
          source: metadata.source || "api",
          value: current.value,
        },
      }),
    );
  };

  const beforeSelection = (root, state, item, metadata) => {
    const current = selectionSnapshot(state, item);
    const previous = state.selection;
    if (current.item === previous.item && !metadata.force) return true;
    return root.dispatchEvent(
      new CustomEvent("a3s:file-before-selection-change", {
        bubbles: true,
        cancelable: true,
        detail: {
          current: cloneSelection(current),
          originalEvent: metadata.originalEvent || null,
          previous: cloneSelection(previous),
          source: metadata.source || "api",
          value: current.value,
        },
      }),
    );
  };

  const writeSelection = (state, item, focus = false) => {
    state.treeItems.forEach((candidate) => {
      candidate.setAttribute(
        "aria-selected",
        String(Boolean(item) && candidate === item),
      );
    });
    if (item && focus) {
      state.treeItems.forEach((candidate) => {
        candidate.tabIndex = candidate === item ? 0 : -1;
      });
      item.focus({ preventScroll: true });
    }
  };

  const requestSelection = (root, state, value, options = {}) => {
    const item =
      value instanceof Element
        ? value.closest('[role="treeitem"]')
        : state.treeItems.find(
            (candidate) => treeItemValue(candidate) === String(value),
          );
    if (!item || item.getAttribute("aria-disabled") === "true") return false;
    if (!beforeSelection(root, state, item, options)) return false;
    if (item === state.selection.item && !options.force) {
      if (options.focus) item.focus({ preventScroll: true });
      return true;
    }

    state.pendingSelection = {
      item,
      originalEvent: options.originalEvent || null,
      source: options.source || "api",
    };
    if (typeof state.tree?.select === "function") {
      state.tree.select(item, options.focus !== false);
    }
    if (state.pendingSelection) {
      writeSelection(state, item, options.focus !== false);
      emitSelection(root, state, selectionSnapshot(state, item), options);
    }
    return true;
  };

  const parentTreeItem = (item) =>
    item.parentElement
      ?.closest('[role="group"]')
      ?.parentElement?.closest('[role="treeitem"]') || null;

  const itemSearchText = (item) =>
    `${treeItemValue(item)} ${treeItemLabel(item)?.textContent || ""}`
      .trim()
      .toLocaleLowerCase();

  const isFileItem = (item) => !item.hasAttribute("aria-expanded");

  const matchingFileCount = (state, normalized) =>
    state.treeItems.filter(
      (item) =>
        isFileItem(item) &&
        (!normalized || itemSearchText(item).includes(normalized)),
    ).length;

  const updateFilterCount = (root, count) => {
    root.querySelectorAll("[data-file-filter-count]").forEach((output) => {
      if (ownsElement(root, output)) output.textContent = String(count);
    });
    root.querySelectorAll("[data-file-filter-empty]").forEach((region) => {
      if (ownsElement(root, region)) region.hidden = count !== 0;
    });
  };

  const applyFilter = (root, state, query) => {
    const normalized = query.trim().toLocaleLowerCase();
    if (normalized && !state.filterActive) {
      state.filterActive = true;
      state.treeItems.forEach((item) => {
        state.filterHidden.set(item, item.hidden);
        if (item.hasAttribute("aria-expanded")) {
          state.filterExpanded.set(
            item,
            item.getAttribute("aria-expanded") === "true",
          );
        }
      });
    }

    if (!normalized) {
      state.treeItems.forEach((item) => {
        item.hidden = state.filterHidden.get(item) || false;
        if (state.filterExpanded.has(item)) {
          item.setAttribute(
            "aria-expanded",
            String(state.filterExpanded.get(item)),
          );
        }
      });
      state.filterHidden = new WeakMap();
      state.filterExpanded = new Map();
      state.filterActive = false;
      state.filter = "";
      root.dataset.filter = "none";
      const count = matchingFileCount(state, "");
      updateFilterCount(root, count);
      state.tree?.refresh?.();
      return count;
    }

    const directMatches = new Set(
      state.treeItems.filter((item) =>
        itemSearchText(item).includes(normalized),
      ),
    );
    const visible = new Set(directMatches);
    directMatches.forEach((item) => {
      let parent = parentTreeItem(item);
      while (parent && state.tree?.contains(parent)) {
        visible.add(parent);
        parent.setAttribute("aria-expanded", "true");
        parent = parentTreeItem(parent);
      }
    });
    state.treeItems.forEach((item) => {
      item.hidden = !visible.has(item);
    });
    state.filter = query;
    root.dataset.filter = directMatches.size > 0 ? "results" : "empty";
    const count = matchingFileCount(state, normalized);
    updateFilterCount(root, count);
    state.tree?.refresh?.();
    return count;
  };

  const requestFilter = (root, state, query, options = {}) => {
    const previous = state.filter;
    const current = String(query ?? "");
    if (previous === current && !options.force) return true;
    const normalized = current.trim().toLocaleLowerCase();
    const previewCount = matchingFileCount(state, normalized);
    const detail = {
      count: previewCount,
      current,
      originalEvent: options.originalEvent || null,
      previous,
      source: options.source || "api",
    };
    const beforeEvent = new CustomEvent("a3s:file-before-filter-change", {
      bubbles: true,
      cancelable: true,
      detail,
    });
    if (options.before !== false && !root.dispatchEvent(beforeEvent)) {
      if (state.search && "value" in state.search)
        state.search.value = previous;
      return false;
    }

    if (state.search && "value" in state.search) state.search.value = current;
    detail.count = applyFilter(root, state, current);
    if (options.native !== false && options.source !== "user" && state.search) {
      state.suppressSearch = true;
      try {
        state.search.dispatchEvent(new Event("input", { bubbles: true }));
      } finally {
        state.suppressSearch = false;
      }
    }
    if (options.emit !== false) {
      root.dispatchEvent(
        new CustomEvent("a3s:file-filter-change", {
          bubbles: true,
          detail,
        }),
      );
    }
    const active = document.activeElement;
    if (
      active instanceof Element &&
      active.closest('[role="treeitem"]')?.hidden &&
      state.search instanceof HTMLElement
    ) {
      state.search.focus({ preventScroll: true });
    }
    return true;
  };

  const actionValue = (action) =>
    action.dataset.fileAction || action.dataset.value || "";

  const actionTarget = (state, target) =>
    target?.closest?.('[role="treeitem"]') || state.selection.item;

  const actionDetail = (state, action, item, options = {}) => ({
    action,
    item,
    originalEvent: options.originalEvent || null,
    selection: cloneSelection(state.selection),
    source: options.source || "api",
    value: treeItemValue(item),
  });

  const beforeAction = (root, state, action, item, options = {}) => {
    if (state.readonly && writeActions.has(action)) return false;
    return root.dispatchEvent(
      new CustomEvent("a3s:file-before-action", {
        bubbles: true,
        cancelable: true,
        detail: actionDetail(state, action, item, options),
      }),
    );
  };

  const emitAction = (root, state, action, item, options = {}) => {
    root.dispatchEvent(
      new CustomEvent("a3s:file-action", {
        bubbles: true,
        detail: actionDetail(state, action, item, options),
      }),
    );
  };

  const stateRegionMatches = (region, name) => {
    const value = region.getAttribute("data-file-explorer-state") || "";
    return value
      ? value.split(/\s+/).includes(name)
      : !["ready", "partial"].includes(name);
  };

  const synchronizeViewState = (root, state, options = {}) => {
    let activeRegion = false;
    state.stateRegions.forEach((region) => {
      const active = stateRegionMatches(region, state.viewState);
      region.hidden = !active;
      activeRegion ||= active;
      if (active && options.message !== undefined) {
        const target = region.querySelector("[data-file-state-message]");
        if (target) target.textContent = String(options.message);
      }
    });
    state.viewports.forEach((viewport) => {
      viewport.hidden =
        activeRegion &&
        (terminalStates.has(state.viewState) ||
          (state.viewState === "loading" && !options.preserveContent));
    });
    if (state.viewState === "loading") root.setAttribute("aria-busy", "true");
    else root.removeAttribute("aria-busy");
    root.dataset.state = state.viewState;
  };

  const setReadonlyActions = (root, state, readonly) => {
    state.actions.forEach((action) => {
      const value = actionValue(action);
      if (
        !writeActions.has(value) &&
        !action.hasAttribute("data-file-write-action")
      ) {
        return;
      }
      if (readonly) {
        if (!state.writeActionHidden.has(action)) {
          state.writeActionHidden.set(action, action.hidden);
        }
        action.hidden = true;
      } else {
        action.hidden = state.writeActionHidden.get(action) || false;
        state.writeActionHidden.delete(action);
      }
    });
    state.readonly = readonly;
    root.dataset.readonly = String(readonly);
  };

  const invalidRename = (name) =>
    !name || name === "." || name === ".." || /[\/\\\u0000-\u001f]/.test(name);

  const removeRenameEditor = (state, restoreLabel = true) => {
    const rename = state.renaming;
    if (!rename) return;
    rename.input.remove();
    rename.error?.remove();
    rename.label.hidden = false;
    if (restoreLabel) rename.label.textContent = rename.previousName;
    rename.item.removeAttribute("data-rename-state");
    state.renaming = null;
  };

  const createRenameEditor = (root, state, transaction, options = {}) => {
    const row = transaction.item.querySelector(":scope > [data-tree-row]");
    if (!row || !transaction.label) return false;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "input";
    input.value = transaction.name;
    input.setAttribute("data-file-editor", "");
    input.setAttribute(
      "aria-label",
      root.dataset.fileRenameLabel || "Rename file",
    );
    transaction.label.hidden = true;
    transaction.label.after(input);
    transaction.input = input;
    transaction.error = null;
    transaction.item.dataset.renameState = options.error ? "error" : "editing";
    state.renaming = transaction;
    if (options.error) root.setRenameError(options.error, { focus: false });
    if (options.focus !== false) {
      input.focus({ preventScroll: true });
      input.select();
    }
    return true;
  };

  const refreshFileExplorer = (root, options = {}) => {
    const state = states.get(root);
    if (!state) return;
    const selectionValue = state.selection.value;
    const filter = state.filter;
    const readonly = state.readonly;
    Object.assign(state, getElements(root));
    const item = state.treeItems.find(
      (candidate) => treeItemValue(candidate) === selectionValue,
    );
    state.selection = selectionSnapshot(state, item || selectedItem(state));
    if (filter) applyFilter(root, state, filter);
    setReadonlyActions(root, state, readonly);
    synchronizeViewState(root, state, options);
  };

  const initFileExplorer = (root) => {
    if (root.dataset.fileExplorerInitialized) return;
    const elements = getElements(root);
    if (!elements.tree) {
      console.error("File Explorer requires a descendant Tree.", root);
      return;
    }
    const state = {
      ...elements,
      filter: "",
      filterActive: false,
      filterExpanded: new Map(),
      filterHidden: new WeakMap(),
      lastRename: null,
      pendingSelection: null,
      readonly: root.dataset.readonly === "true",
      renaming: null,
      selection: null,
      suppressSearch: false,
      viewState: root.dataset.state || "ready",
      writeActionHidden: new WeakMap(),
    };
    state.selection = selectionSnapshot(state);
    states.set(root, state);

    root.getSelection = () => cloneSelection(state.selection);
    root.select = (value, options = {}) =>
      requestSelection(root, state, value, options);
    root.getFilter = () => state.filter;
    root.setFilter = (query, options = {}) =>
      requestFilter(root, state, query, options);
    root.clearFilter = (options = {}) =>
      requestFilter(root, state, "", {
        ...options,
        source: options.source || "api",
      });
    root.getState = () => ({
      filter: state.filter,
      name: state.viewState,
      readonly: state.readonly,
      renaming: state.renaming
        ? {
            name: state.renaming.input.value,
            previousName: state.renaming.previousName,
            value: treeItemValue(state.renaming.item),
          }
        : null,
      selection: cloneSelection(state.selection),
    });
    root.setState = (name, options = {}) => {
      const previous = state.viewState;
      state.viewState = String(name || "ready");
      synchronizeViewState(root, state, options);
      if (previous !== state.viewState && options.emit !== false) {
        root.dispatchEvent(
          new CustomEvent("a3s:file-state-change", {
            bubbles: true,
            detail: {
              current: state.viewState,
              message: options.message,
              previous,
              source: options.source || "api",
            },
          }),
        );
      }
      return root.getState();
    };
    root.setReadonly = (readonly = true, options = {}) => {
      const previous = state.readonly;
      setReadonlyActions(root, state, Boolean(readonly));
      if (state.readonly && state.renaming) {
        root.cancelRename({
          reason: "readonly",
          source: options.source || "api",
        });
      }
      if (previous !== state.readonly && options.emit !== false) {
        root.dispatchEvent(
          new CustomEvent("a3s:file-state-change", {
            bubbles: true,
            detail: {
              current: state.viewState,
              previous: state.viewState,
              readonly: state.readonly,
              source: options.source || "api",
            },
          }),
        );
      }
      return state.readonly;
    };
    root.runAction = (action, options = {}) => {
      const item = options.item || state.selection.item;
      const value = String(action || "");
      if (!value || !beforeAction(root, state, value, item, options))
        return false;
      if (value === "clear-filter" && !root.clearFilter(options)) return false;
      if (value === "rename") {
        if (!root.beginRename(item, options)) return false;
      }
      emitAction(root, state, value, item, options);
      return true;
    };
    root.beginRename = (value = state.selection.item, options = {}) => {
      if (state.readonly) return false;
      const item =
        value instanceof Element
          ? value.closest('[role="treeitem"]')
          : state.treeItems.find(
              (candidate) => treeItemValue(candidate) === String(value),
            );
      const label = treeItemLabel(item);
      if (!item || !label) return false;
      if (state.renaming?.item === item) return true;
      if (state.renaming)
        root.cancelRename({ reason: "replace", source: "system" });
      state.lastRename = null;
      const transaction = {
        error: null,
        input: null,
        item,
        label,
        name: label.textContent?.trim() || "",
        previousName: label.textContent?.trim() || "",
      };
      const detail = {
        item,
        name: transaction.name,
        phase: "begin",
        previousName: transaction.previousName,
        source: options.source || "api",
        value: treeItemValue(item),
      };
      const beforeEvent = new CustomEvent("a3s:file-before-rename", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (options.before !== false && !root.dispatchEvent(beforeEvent))
        return false;
      return createRenameEditor(root, state, transaction, options);
    };
    root.commitRename = (value, options = {}) => {
      const rename = state.renaming;
      if (!rename) return false;
      const name = String(value ?? rename.input.value).trim();
      if (invalidRename(name)) {
        root.setRenameError(
          root.dataset.fileInvalidName ||
            "Enter a valid name without path separators.",
        );
        return false;
      }
      const detail = {
        item: rename.item,
        name,
        phase: "commit",
        previousName: rename.previousName,
        source: options.source || "api",
        value: treeItemValue(rename.item),
      };
      const beforeEvent = new CustomEvent("a3s:file-before-rename", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (options.before !== false && !root.dispatchEvent(beforeEvent))
        return false;
      state.lastRename = { ...rename, name };
      rename.label.textContent = name;
      removeRenameEditor(state, false);
      if (options.focus !== false && rename.item.isConnected) {
        rename.item.focus({ preventScroll: true });
      }
      root.dispatchEvent(
        new CustomEvent("a3s:file-rename", { bubbles: true, detail }),
      );
      return true;
    };
    root.cancelRename = (options = {}) => {
      const rename = state.renaming;
      if (!rename) return false;
      const detail = {
        item: rename.item,
        name: rename.input.value,
        previousName: rename.previousName,
        reason: options.reason || "cancel",
        source: options.source || "api",
        value: treeItemValue(rename.item),
      };
      removeRenameEditor(state, true);
      root.dispatchEvent(
        new CustomEvent("a3s:file-rename-cancel", { bubbles: true, detail }),
      );
      if (options.focus !== false && rename.item.isConnected) {
        rename.item.focus({ preventScroll: true });
      }
      return true;
    };
    root.setRenameError = (message, options = {}) => {
      let rename = state.renaming;
      if (!rename && state.lastRename?.item.isConnected) {
        rename = {
          ...state.lastRename,
          error: null,
          input: null,
          name: state.lastRename.name,
        };
        rename.label.textContent = rename.previousName;
        createRenameEditor(root, state, rename, {
          focus: options.focus !== false,
        });
      }
      if (!rename) return false;
      rename.error?.remove();
      const error = document.createElement("span");
      error.setAttribute("data-file-rename-error", "");
      error.setAttribute("role", "alert");
      error.textContent = String(message || "Rename failed.");
      renameErrorId += 1;
      const errorId = `${root.id || "file-explorer"}-rename-error-${renameErrorId}`;
      error.id = errorId;
      rename.input.setAttribute("aria-invalid", "true");
      rename.input.setAttribute("aria-describedby", errorId);
      rename.item.querySelector(":scope > [data-tree-row]")?.after(error);
      rename.error = error;
      rename.item.dataset.renameState = "error";
      if (options.focus !== false) {
        rename.input.focus({ preventScroll: true });
        rename.input.select();
      }
      return true;
    };
    root.refresh = (options = {}) => refreshFileExplorer(root, options);

    const handleSelectionIntent = (event, source) => {
      const target = event.target;
      if (!(target instanceof Element) || target.matches("[data-file-editor]"))
        return;
      const item = target.closest('[role="treeitem"]');
      const row = item?.querySelector(":scope > [data-tree-row]");
      if (
        !row ||
        !item ||
        (!row.contains(target) && target !== item) ||
        !state.tree.contains(item)
      )
        return;
      if (item === state.selection.item) return;
      const options = { originalEvent: event, source };
      if (!beforeSelection(root, state, item, options)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      state.pendingSelection = { item, ...options };
    };

    const handleCaptureClick = (event) =>
      handleSelectionIntent(event, "pointer");
    const handleCaptureContextMenu = (event) => {
      const item = event.target?.closest?.('[role="treeitem"]');
      if (!item || !state.tree.contains(item) || item === state.selection.item)
        return;
      const accepted = requestSelection(root, state, item, {
        focus: true,
        originalEvent: event,
        source: "contextmenu",
      });
      if (!accepted) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const handleCaptureKeydown = (event) => {
      const editor = event.target?.closest?.("[data-file-editor]");
      if (editor) {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopImmediatePropagation();
          root.commitRename(editor.value, { source: "keyboard" });
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          root.cancelRename({ source: "keyboard" });
        }
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        handleSelectionIntent(event, "keyboard");
      }
    };
    const handleTreeChange = (event) => {
      if (event.target !== state.tree) return;
      const item = event.detail?.item || selectedItem(state);
      if (!item) return;
      const pending = state.pendingSelection;
      if (pending?.item === item) {
        emitSelection(root, state, selectionSnapshot(state, item), pending);
        return;
      }
      const options = { originalEvent: event, source: "tree" };
      if (!beforeSelection(root, state, item, options)) {
        writeSelection(state, state.selection.item, false);
        return;
      }
      emitSelection(root, state, selectionSnapshot(state, item), options);
    };
    const handleSearchInput = (event) => {
      if (state.suppressSearch || event.target !== state.search) return;
      requestFilter(root, state, state.search.value, {
        native: false,
        originalEvent: event,
        source: "user",
      });
    };
    const handleRenameInput = (event) => {
      if (!event.target.matches?.("[data-file-editor]")) return;
      event.target.removeAttribute("aria-invalid");
      event.target.removeAttribute("aria-describedby");
      state.renaming?.error?.remove();
      if (state.renaming) {
        state.renaming.error = null;
        state.renaming.item.dataset.renameState = "editing";
      }
    };
    const handleFocusOut = (event) => {
      if (!event.target.matches?.("[data-file-editor]") || !state.renaming)
        return;
      queueMicrotask(() => {
        if (!state.renaming || document.activeElement === state.renaming.input)
          return;
        if (root.dataset.renameBlur === "cancel") {
          root.cancelRename({
            focus: false,
            reason: "blur",
            source: "pointer",
          });
        } else {
          root.commitRename(state.renaming.input.value, { source: "pointer" });
        }
      });
    };
    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest("[data-file-action]");
      if (!action || !ownsElement(root, action)) return;
      const value = actionValue(action);
      const item = actionTarget(state, action);
      if (
        !root.runAction(value, {
          item,
          originalEvent: event,
          source: "user",
        })
      ) {
        event.preventDefault();
      }
    };
    const handleContextBeforeSelect = (event) => {
      const action = String(event.detail?.value || "");
      if (!action) return;
      const item = actionTarget(state, event.detail?.target);
      if (
        !beforeAction(root, state, action, item, {
          originalEvent: event.detail?.originalEvent,
          source: event.detail?.source || "context-menu",
        })
      ) {
        event.preventDefault();
      }
    };
    const handleContextSelect = (event) => {
      const action = String(event.detail?.value || "");
      if (!action) return;
      const item = actionTarget(state, event.detail?.target);
      const options = {
        originalEvent: event.detail?.originalEvent,
        source: event.detail?.source || "context-menu",
      };
      if (action === "rename") {
        queueMicrotask(() => root.beginRename(item, options));
      }
      emitAction(root, state, action, item, options);
    };

    root.addEventListener("click", handleCaptureClick, true);
    root.addEventListener("contextmenu", handleCaptureContextMenu, true);
    root.addEventListener("keydown", handleCaptureKeydown, true);
    root.addEventListener("change", handleTreeChange);
    root.addEventListener("input", handleSearchInput);
    root.addEventListener("input", handleRenameInput);
    root.addEventListener("focusout", handleFocusOut);
    root.addEventListener("click", handleClick);
    root.addEventListener(
      "a3s:context-menu-before-select",
      handleContextBeforeSelect,
    );
    root.addEventListener("a3s:context-menu-select", handleContextSelect);
    root._destroy = () => {
      removeRenameEditor(state, true);
      setReadonlyActions(root, state, false);
      root.removeEventListener("click", handleCaptureClick, true);
      root.removeEventListener("contextmenu", handleCaptureContextMenu, true);
      root.removeEventListener("keydown", handleCaptureKeydown, true);
      root.removeEventListener("change", handleTreeChange);
      root.removeEventListener("input", handleSearchInput);
      root.removeEventListener("input", handleRenameInput);
      root.removeEventListener("focusout", handleFocusOut);
      root.removeEventListener("click", handleClick);
      root.removeEventListener(
        "a3s:context-menu-before-select",
        handleContextBeforeSelect,
      );
      root.removeEventListener("a3s:context-menu-select", handleContextSelect);
      states.delete(root);
      delete root.beginRename;
      delete root.cancelRename;
      delete root.clearFilter;
      delete root.commitRename;
      delete root.getFilter;
      delete root.getSelection;
      delete root.getState;
      delete root.refresh;
      delete root.runAction;
      delete root.select;
      delete root.setFilter;
      delete root.setReadonly;
      delete root.setRenameError;
      delete root.setState;
    };

    if (state.search && "value" in state.search)
      state.filter = state.search.value;
    if (state.filter) applyFilter(root, state, state.filter);
    setReadonlyActions(root, state, state.readonly);
    synchronizeViewState(root, state);
    root.dataset.fileExplorerInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("file-explorer", {
      selector: ".file-explorer:not([data-file-explorer-initialized])",
      init: initFileExplorer,
      refresh: refreshFileExplorer,
    });
  }
})();
