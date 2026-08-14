(() => {
  const states = new WeakMap();
  const sortDirections = new Set(["none", "ascending", "descending"]);
  const terminalStates = new Set(["empty", "error", "permission-denied"]);

  const ownsElement = (root, element) => element.closest(".data-grid") === root;

  const rowCheckbox = (root, row) =>
    Array.from(
      row.querySelectorAll('input[type="checkbox"][data-grid-select]'),
    ).find((checkbox) => ownsElement(root, checkbox)) || null;

  const rowValue = (row, checkbox = null) =>
    String(checkbox?.value || row?.dataset.value || "");

  const getElements = (root) => {
    const rows = Array.from(root.querySelectorAll("tbody > tr")).filter((row) =>
      ownsElement(root, row),
    );
    const rowCheckboxes = rows
      .map((row) => rowCheckbox(root, row))
      .filter((checkbox) => checkbox && !checkbox.disabled);
    const selectAll =
      Array.from(
        root.querySelectorAll(
          'thead input[type="checkbox"][data-grid-select-all]',
        ),
      ).find((checkbox) => ownsElement(root, checkbox)) || null;
    const sortButtons = Array.from(
      root.querySelectorAll("[data-grid-sort]"),
    ).filter((button) => ownsElement(root, button));
    const stateRegions = Array.from(
      root.querySelectorAll("[data-grid-state]"),
    ).filter((region) => ownsElement(root, region));
    const viewports = Array.from(
      root.querySelectorAll("[data-grid-viewport]"),
    ).filter((viewport) => ownsElement(root, viewport));
    return {
      rowCheckboxes,
      rows,
      selectAll,
      sortButtons,
      stateRegions,
      viewports,
    };
  };

  const snapshotSelection = (state, values = null) => {
    const selectedValues = values ? new Set(values) : null;
    const entries = state.rowCheckboxes.flatMap((checkbox) => {
      const row = checkbox.closest("tr");
      const value = rowValue(row, checkbox);
      if (selectedValues ? !selectedValues.has(value) : !checkbox.checked) {
        return [];
      }
      return [{ row, value }];
    });
    return Object.freeze({
      rows: Object.freeze(entries.map((entry) => entry.row)),
      selectedCount: entries.length,
      values: Object.freeze(entries.map((entry) => entry.value)),
    });
  };

  const cloneSelection = (selection) => ({
    rows: [...selection.rows],
    selectedCount: selection.selectedCount,
    values: [...selection.values],
  });

  const selectionsEqual = (left, right) =>
    left.selectedCount === right.selectedCount &&
    left.values.every((value, index) => value === right.values[index]);

  const synchronizeBulkActions = (root, selection) => {
    root.querySelectorAll(".bulk-action-bar").forEach((bar) => {
      if (!ownsElement(root, bar)) return;
      if (typeof bar.setSelection === "function") {
        bar.setSelection(selection.values, {
          emit: false,
          source: "data-grid",
        });
        return;
      }
      bar.hidden = selection.selectedCount === 0;
      bar.dataset.state = selection.selectedCount > 0 ? "selected" : "empty";
      bar.querySelectorAll("[data-selected-count]").forEach((output) => {
        output.textContent = String(selection.selectedCount);
      });
    });
  };

  const synchronizeSelection = (root, state) => {
    state.rows.forEach((row) => {
      const checkbox = rowCheckbox(root, row);
      if (checkbox?.checked) row.dataset.state = "selected";
      else if (row.dataset.state === "selected") delete row.dataset.state;
    });

    const selection = snapshotSelection(state);
    const enabledCount = state.rowCheckboxes.length;
    if (state.selectAll) {
      state.selectAll.checked =
        enabledCount > 0 && selection.selectedCount === enabledCount;
      state.selectAll.indeterminate =
        selection.selectedCount > 0 && selection.selectedCount < enabledCount;
    }

    root.dataset.selection =
      selection.selectedCount === 0
        ? "none"
        : selection.selectedCount === enabledCount
          ? "all"
          : "some";
    root
      .querySelectorAll("[data-grid-selection-count], [data-selected-count]")
      .forEach((output) => {
        if (ownsElement(root, output)) {
          output.textContent = String(selection.selectedCount);
        }
      });
    synchronizeBulkActions(root, selection);
    state.selection = selection;
    return selection;
  };

  const writeSelection = (state, values) => {
    const selectedValues = new Set(Array.from(values, String));
    state.rowCheckboxes.forEach((checkbox) => {
      const row = checkbox.closest("tr");
      checkbox.checked = selectedValues.has(rowValue(row, checkbox));
    });
  };

  const requestSelection = (root, state, values, options = {}) => {
    const previous = state.selection || snapshotSelection(state);
    const current = snapshotSelection(
      state,
      new Set(Array.from(values, String)),
    );
    if (selectionsEqual(previous, current) && !options.force) {
      writeSelection(state, previous.values);
      synchronizeSelection(root, state);
      return true;
    }

    const source = options.source || "api";
    const kind = options.kind || "set";
    const detail = {
      current: cloneSelection(current),
      kind,
      originalEvent: options.originalEvent || null,
      previous: cloneSelection(previous),
      source,
    };
    if (options.before !== false) {
      const beforeEvent = new CustomEvent(
        "a3s:data-grid-before-selection-change",
        { bubbles: true, cancelable: true, detail },
      );
      if (!root.dispatchEvent(beforeEvent)) {
        writeSelection(state, previous.values);
        synchronizeSelection(root, state);
        return false;
      }
    }

    writeSelection(state, current.values);
    const committed = synchronizeSelection(root, state);
    if (options.emit !== false) {
      root.dispatchEvent(
        new CustomEvent("a3s:data-grid-selection-change", {
          bubbles: true,
          detail: {
            ...detail,
            current: cloneSelection(committed),
            rows: [...committed.rows],
            selectedCount: committed.selectedCount,
            values: [...committed.values],
          },
        }),
      );
    }
    return true;
  };

  const sortSnapshot = (state) => {
    const button = state.sortButtons.find((candidate) => {
      const direction = candidate.closest("th")?.getAttribute("aria-sort");
      return direction && direction !== "none";
    });
    const header = button?.closest("th") || null;
    return Object.freeze({
      direction: header?.getAttribute("aria-sort") || "none",
      key: button?.dataset.gridSort || header?.dataset.key || "",
    });
  };

  const cloneSort = (sort) => ({ direction: sort.direction, key: sort.key });

  const synchronizeSort = (state) => {
    state.sortButtons.forEach((button) => {
      const header = button.closest("th");
      if (!header) return;
      if (!header.hasAttribute("aria-sort")) {
        header.setAttribute("aria-sort", "none");
      }
      button.dataset.active = String(
        header.getAttribute("aria-sort") !== "none",
      );
    });
    state.sort = sortSnapshot(state);
    return state.sort;
  };

  const writeSort = (state, sort) => {
    state.sortButtons.forEach((button) => {
      const header = button.closest("th");
      if (!header) return;
      const key = button.dataset.gridSort || header.dataset.key || "";
      header.setAttribute(
        "aria-sort",
        sort.direction !== "none" && key === sort.key ? sort.direction : "none",
      );
    });
  };

  const requestSort = (root, state, key, direction, options = {}) => {
    const normalizedDirection = sortDirections.has(direction)
      ? direction
      : "none";
    const current = {
      direction: key ? normalizedDirection : "none",
      key: normalizedDirection === "none" ? "" : String(key || ""),
    };
    const previous = state.sort || synchronizeSort(state);
    if (
      current.key === previous.key &&
      current.direction === previous.direction &&
      !options.force
    ) {
      return true;
    }

    const detail = {
      current: cloneSort(current),
      kind: options.kind || "sort",
      originalEvent: options.originalEvent || null,
      previous: cloneSort(previous),
      source: options.source || "api",
    };
    if (options.before !== false) {
      const beforeEvent = new CustomEvent("a3s:data-grid-before-sort", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (!root.dispatchEvent(beforeEvent)) return false;
    }

    writeSort(state, current);
    const committed = synchronizeSort(state);
    if (options.emit !== false) {
      root.dispatchEvent(
        new CustomEvent("a3s:data-grid-sort", {
          bubbles: true,
          detail: {
            ...detail,
            current: cloneSort(committed),
            direction: committed.direction,
            key: committed.key,
          },
        }),
      );
    }
    return true;
  };

  const stateRegionMatches = (region, name) => {
    const value = region.getAttribute("data-grid-state") || "";
    return value
      ? value.split(/\s+/).includes(name)
      : !["ready", "partial"].includes(name);
  };

  const synchronizeViewState = (root, state, message) => {
    let hasActiveRegion = false;
    state.stateRegions.forEach((region) => {
      const active = stateRegionMatches(region, state.viewState);
      region.hidden = !active;
      hasActiveRegion ||= active;
      if (active && message !== undefined) {
        const target = region.querySelector("[data-grid-state-message]");
        if (target) target.textContent = String(message);
      }
    });
    state.viewports.forEach((viewport) => {
      viewport.hidden = hasActiveRegion && terminalStates.has(state.viewState);
    });
    if (state.viewState === "loading") root.setAttribute("aria-busy", "true");
    else root.removeAttribute("aria-busy");
    root.dataset.state = state.viewState;
  };

  const refreshDataGrid = (root, options = {}) => {
    const state = states.get(root);
    if (!state) return;
    const selection = state.selection;
    const sort = state.sort;
    Object.assign(state, getElements(root));
    if (options.preserveSelection !== false && selection) {
      writeSelection(state, selection.values);
    }
    synchronizeSelection(root, state);
    if (options.preserveSort !== false && sort) writeSort(state, sort);
    synchronizeSort(state);
    synchronizeViewState(root, state);
  };

  const initDataGrid = (root) => {
    if (root.dataset.dataGridInitialized) return;

    const state = {
      rowCheckboxes: [],
      rows: [],
      selectAll: null,
      selection: null,
      sort: null,
      sortButtons: [],
      stateRegions: [],
      viewports: [],
      viewState: root.dataset.state || "ready",
    };
    states.set(root, state);

    root.getSelection = () => cloneSelection(state.selection);
    root.setSelection = (values, options = {}) =>
      requestSelection(root, state, values || [], options);
    root.toggleSelection = (value, selected, options = {}) => {
      const values = new Set(state.selection.values);
      const normalized = String(value);
      const shouldSelect =
        selected === undefined ? !values.has(normalized) : Boolean(selected);
      if (shouldSelect) values.add(normalized);
      else values.delete(normalized);
      return requestSelection(root, state, values, {
        ...options,
        kind: options.kind || "toggle",
      });
    };
    root.clearSelection = (options = {}) =>
      requestSelection(root, state, [], {
        ...options,
        kind: options.kind || "clear",
      });
    root.selectAll = (selected = true, options = {}) =>
      requestSelection(
        root,
        state,
        selected
          ? state.rowCheckboxes.map((checkbox) =>
              rowValue(checkbox.closest("tr"), checkbox),
            )
          : [],
        { ...options, kind: options.kind || "all" },
      );
    root.getSort = () => cloneSort(state.sort);
    root.setSort = (key, direction = "ascending", options = {}) =>
      requestSort(root, state, key, direction, options);
    root.getState = () => ({
      name: state.viewState,
      selection: cloneSelection(state.selection),
      sort: cloneSort(state.sort),
    });
    root.setState = (name, options = {}) => {
      const previous = state.viewState;
      const current = String(name || "ready");
      state.viewState = current;
      synchronizeViewState(root, state, options.message);
      if (previous !== current && options.emit !== false) {
        root.dispatchEvent(
          new CustomEvent("a3s:data-grid-state-change", {
            bubbles: true,
            detail: {
              current,
              message: options.message,
              previous,
              source: options.source || "api",
            },
          }),
        );
      }
      return root.getState();
    };
    root.refresh = (options = {}) => refreshDataGrid(root, options);

    const handleChange = (event) => {
      const checkbox = event.target;
      if (
        !(checkbox instanceof HTMLInputElement) ||
        checkbox.type !== "checkbox" ||
        !ownsElement(root, checkbox)
      ) {
        return;
      }

      if (checkbox.matches("[data-grid-select-all]")) {
        root.selectAll(checkbox.checked, {
          kind: "all",
          originalEvent: event,
          source: "user",
        });
        return;
      }
      if (!checkbox.matches("[data-grid-select]")) return;
      const row = checkbox.closest("tr");
      root.toggleSelection(rowValue(row, checkbox), checkbox.checked, {
        originalEvent: event,
        source: "user",
      });
    };

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clear = target.closest("[data-grid-clear-selection]");
      if (clear && ownsElement(root, clear)) {
        root.clearSelection({ originalEvent: event, source: "user" });
        return;
      }

      const sortButton = target.closest("[data-grid-sort]");
      if (sortButton && ownsElement(root, sortButton)) {
        const header = sortButton.closest("th");
        if (!header) return;
        const current = header.getAttribute("aria-sort") || "none";
        const cycle = sortButton.dataset.sortCycle === "tri";
        const direction =
          current === "ascending"
            ? "descending"
            : current === "descending" && cycle
              ? "none"
              : "ascending";
        requestSort(
          root,
          state,
          sortButton.dataset.gridSort || header.dataset.key || "",
          direction,
          { originalEvent: event, source: "user" },
        );
        return;
      }

      const action = target.closest("[data-grid-row-action]");
      if (!action || !ownsElement(root, action)) return;
      const row = action.closest("tr");
      const detail = {
        action: action.dataset.gridRowAction || "",
        item: action,
        originalEvent: event,
        row,
        source: "user",
        value: rowValue(row, row ? rowCheckbox(root, row) : null),
      };
      const beforeEvent = new CustomEvent("a3s:data-grid-before-row-action", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (!root.dispatchEvent(beforeEvent)) {
        event.preventDefault();
        return;
      }
      root.dispatchEvent(
        new CustomEvent("a3s:data-grid-row-action", {
          bubbles: true,
          detail,
        }),
      );
    };

    root.addEventListener("change", handleChange);
    root.addEventListener("click", handleClick);
    root._destroy = () => {
      root.removeEventListener("change", handleChange);
      root.removeEventListener("click", handleClick);
      states.delete(root);
      delete root.clearSelection;
      delete root.getSelection;
      delete root.getSort;
      delete root.getState;
      delete root.refresh;
      delete root.selectAll;
      delete root.setSelection;
      delete root.setSort;
      delete root.setState;
      delete root.toggleSelection;
    };

    refreshDataGrid(root, {
      preserveSelection: false,
      preserveSort: false,
    });
    root.dataset.dataGridInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("data-grid", {
      selector: ".data-grid:not([data-data-grid-initialized])",
      init: initDataGrid,
      refresh: refreshDataGrid,
    });
  }
})();
