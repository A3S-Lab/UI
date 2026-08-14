(() => {
  const states = new WeakMap();

  const ownsElement = (root, element) =>
    element.closest(".filter-bar") === root;

  const identity = (element) => ({
    name: element.dataset.filterName || "filter",
    value: element.dataset.filterValue || "",
  });

  const isDisabled = (element) =>
    element.matches(":disabled, [aria-disabled=true]");

  const resolveSearchControl = (element) => {
    if (element.matches("input, textarea")) return element;
    return element.querySelector("input[type=search], input, textarea");
  };

  const getElements = (root) => {
    const searchInputs = Array.from(
      root.querySelectorAll("[data-filter-search]"),
    )
      .filter((element) => ownsElement(root, element))
      .map((element) => resolveSearchControl(element))
      .filter((input) => input && ownsElement(root, input));
    return {
      chips: Array.from(root.querySelectorAll("[data-filter-chip]")).filter(
        (chip) => ownsElement(root, chip),
      ),
      searchInputs: [...new Set(searchInputs)],
      toggles: Array.from(root.querySelectorAll("[data-filter-toggle]")).filter(
        (toggle) => ownsElement(root, toggle),
      ),
    };
  };

  const searchName = (state, input) =>
    input.name ||
    input.dataset.filterName ||
    (state.searchInputs.length === 1
      ? "search"
      : `search${state.searchInputs.indexOf(input) + 1}`);

  const matchingToggles = (state, source) => {
    const target = identity(source);
    return state.toggles.filter((toggle) => {
      const candidate = identity(toggle);
      return candidate.name === target.name && candidate.value === target.value;
    });
  };

  const activeFilters = (state) =>
    state.toggles
      .filter((toggle) => toggle.getAttribute("aria-pressed") === "true")
      .map((toggle) => identity(toggle));

  const snapshotQuery = (state) =>
    Object.freeze({
      filters: Object.freeze(
        activeFilters(state).map((filter) => Object.freeze({ ...filter })),
      ),
      search: Object.freeze(
        Object.fromEntries(
          state.searchInputs.map((input) => [
            searchName(state, input),
            "value" in input ? input.value : "",
          ]),
        ),
      ),
    });

  const cloneQuery = (query) => ({
    filters: query.filters.map((filter) => ({ ...filter })),
    search: { ...query.search },
  });

  const queriesEqual = (left, right) =>
    JSON.stringify(left) === JSON.stringify(right);

  const defaultToggle = (toggles, group) => {
    const explicitValue = group.dataset.defaultValue;
    return (
      toggles.find(
        (toggle) =>
          !isDisabled(toggle) &&
          (toggle.dataset.default === "true" ||
            (explicitValue !== undefined &&
              identity(toggle).value === explicitValue)),
      ) || toggles.find((toggle) => !isDisabled(toggle))
    );
  };

  const ensureRequiredSelections = (state) => {
    const groups = new Set(
      state.toggles
        .map((toggle) => toggle.closest("[data-filter-group]"))
        .filter(
          (group) =>
            group?.dataset.selection === "single" &&
            group.dataset.required === "true",
        ),
    );
    groups.forEach((group) => {
      const toggles = state.toggles.filter(
        (toggle) => toggle.closest("[data-filter-group]") === group,
      );
      if (
        toggles.some((toggle) => toggle.getAttribute("aria-pressed") === "true")
      ) {
        return;
      }
      defaultToggle(toggles, group)?.setAttribute("aria-pressed", "true");
    });
  };

  const synchronize = (root, state) => {
    state.toggles.forEach((toggle) => {
      if (!toggle.hasAttribute("aria-pressed")) {
        toggle.setAttribute("aria-pressed", "false");
      }
    });
    ensureRequiredSelections(state);

    state.chips.forEach((chip) => {
      const matches = matchingToggles(state, chip);
      if (matches.length > 0) {
        chip.hidden = !matches.some(
          (toggle) => toggle.getAttribute("aria-pressed") === "true",
        );
      }
    });

    const visibleChips = state.chips.filter((chip) => !chip.hidden);
    root.querySelectorAll("[data-filter-active]").forEach((region) => {
      if (ownsElement(root, region)) region.hidden = visibleChips.length === 0;
    });
    root.dataset.filters = activeFilters(state).length > 0 ? "active" : "empty";
    state.current = snapshotQuery(state);
    return state.current;
  };

  const writeQuery = (state, query) => {
    const filterKeys = new Set(
      (query.filters || []).map(({ name, value }) => `${name}\u0000${value}`),
    );
    state.toggles.forEach((toggle) => {
      const { name, value } = identity(toggle);
      toggle.setAttribute(
        "aria-pressed",
        String(filterKeys.has(`${name}\u0000${value}`)),
      );
    });
    state.searchInputs.forEach((input) => {
      const name = searchName(state, input);
      if ("value" in input) input.value = String(query.search?.[name] ?? "");
    });
  };

  const dispatchNativeInputs = (state, names) => {
    state.suppressNative = true;
    try {
      state.searchInputs.forEach((input) => {
        if (!names.has(searchName(state, input))) return;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    } finally {
      state.suppressNative = false;
    }
  };

  const requestChange = (root, state, next, options = {}) => {
    const previous = state.current || snapshotQuery(state);
    writeQuery(state, next);
    const normalized = synchronize(root, state);
    writeQuery(state, previous);
    synchronize(root, state);

    if (queriesEqual(previous, normalized) && !options.force) return true;
    const detail = {
      current: cloneQuery(normalized),
      filters: normalized.filters.map((filter) => ({ ...filter })),
      kind: options.kind || "set",
      name: options.name,
      originalEvent: options.originalEvent || null,
      pressed: options.pressed,
      previous: cloneQuery(previous),
      search: { ...normalized.search },
      source: options.source || "api",
      value: options.value,
    };
    if (options.before !== false) {
      const beforeEvent = new CustomEvent("a3s:filter-before-change", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (!root.dispatchEvent(beforeEvent)) return false;
    }

    writeQuery(state, normalized);
    const committed = synchronize(root, state);
    if (options.nativeInputs?.size) {
      dispatchNativeInputs(state, options.nativeInputs);
    }
    if (options.emit !== false) {
      root.dispatchEvent(
        new CustomEvent("a3s:filter-change", {
          bubbles: true,
          detail: {
            ...detail,
            current: cloneQuery(committed),
            filters: committed.filters.map((filter) => ({ ...filter })),
            search: { ...committed.search },
          },
        }),
      );
    }
    return true;
  };

  const refreshFilterBar = (root, options = {}) => {
    const state = states.get(root);
    if (!state) return;
    const current = state.current;
    Object.assign(state, getElements(root));
    if (current && options.preserve !== false) writeQuery(state, current);
    synchronize(root, state);
    if (options.resetInitial) state.initial = cloneQuery(state.current);
  };

  const initFilterBar = (root) => {
    if (root.dataset.filterBarInitialized) return;
    const state = {
      chips: [],
      current: null,
      initial: null,
      searchInputs: [],
      suppressNative: false,
      toggles: [],
    };
    states.set(root, state);

    root.getFilters = () =>
      state.current.filters.map((filter) => ({ ...filter }));
    root.getSearch = () => ({ ...state.current.search });
    root.getState = () => cloneQuery(state.current);
    root.setFilters = (filters, options = {}) =>
      requestChange(
        root,
        state,
        { filters: Array.from(filters || []), search: state.current.search },
        { ...options, kind: options.kind || "filters" },
      );
    root.setSearch = (value, options = {}) => {
      const search = { ...state.current.search };
      const names = new Set();
      if (value && typeof value === "object") {
        Object.entries(value).forEach(([name, nextValue]) => {
          if (!(name in search)) return;
          search[name] = String(nextValue ?? "");
          names.add(name);
        });
      } else if (state.searchInputs[0]) {
        const name = searchName(state, state.searchInputs[0]);
        search[name] = String(value ?? "");
        names.add(name);
      }
      return requestChange(
        root,
        state,
        { filters: state.current.filters, search },
        {
          ...options,
          kind: options.kind || "search",
          nativeInputs: options.native === false ? null : names,
        },
      );
    };
    root.clear = (options = {}) =>
      requestChange(
        root,
        state,
        {
          filters: [],
          search: Object.fromEntries(
            Object.keys(state.current.search).map((name) => [name, ""]),
          ),
        },
        { ...options, kind: options.kind || "clear" },
      );
    root.resetFilters = (options = {}) =>
      requestChange(root, state, state.initial, {
        ...options,
        kind: options.kind || "reset",
      });
    root.refresh = (options = {}) => refreshFilterBar(root, options);

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clear = target.closest("[data-filter-clear]");
      if (clear && ownsElement(root, clear)) {
        root.clear({ originalEvent: event, source: "user" });
        return;
      }

      const remove = target.closest("[data-filter-remove]");
      if (remove && ownsElement(root, remove)) {
        const chip = remove.closest("[data-filter-chip]");
        if (!chip) return;
        const matches = matchingToggles(state, chip);
        const removeKeys = new Set(
          matches.map((toggle) => {
            const { name, value } = identity(toggle);
            return `${name}\u0000${value}`;
          }),
        );
        const accepted = requestChange(
          root,
          state,
          {
            filters: state.current.filters.filter(
              ({ name, value }) => !removeKeys.has(`${name}\u0000${value}`),
            ),
            search: state.current.search,
          },
          {
            ...identity(chip),
            kind: "remove",
            originalEvent: event,
            source: "user",
          },
        );
        if (accepted) {
          matches
            .find((toggle) => !isDisabled(toggle))
            ?.focus({ preventScroll: true });
        }
        return;
      }

      const toggle = target.closest("[data-filter-toggle]");
      if (!toggle || !ownsElement(root, toggle) || isDisabled(toggle)) return;
      const group = toggle.closest("[data-filter-group]");
      const single = group?.dataset.selection === "single";
      const required = group?.dataset.required === "true";
      const targetIdentity = identity(toggle);
      const currentKey = `${targetIdentity.name}\u0000${targetIdentity.value}`;
      const filterKeys = new Set(
        state.current.filters.map(({ name, value }) => `${name}\u0000${value}`),
      );
      const currentlyPressed = filterKeys.has(currentKey);
      if (single) {
        state.toggles.forEach((candidate) => {
          if (candidate.closest("[data-filter-group]") !== group) return;
          const { name, value } = identity(candidate);
          filterKeys.delete(`${name}\u0000${value}`);
        });
      }
      const pressed = required || !currentlyPressed;
      if (pressed) filterKeys.add(currentKey);
      else filterKeys.delete(currentKey);
      const filters = state.toggles
        .map((candidate) => identity(candidate))
        .filter(({ name, value }) => filterKeys.has(`${name}\u0000${value}`));
      requestChange(
        root,
        state,
        { filters, search: state.current.search },
        {
          ...targetIdentity,
          kind: "toggle",
          originalEvent: event,
          pressed,
          source: "user",
        },
      );
    };

    const handleInput = (event) => {
      if (state.suppressNative) return;
      const input = event.target;
      if (
        !(
          input instanceof HTMLInputElement ||
          input instanceof HTMLTextAreaElement
        ) ||
        !state.searchInputs.includes(input)
      ) {
        return;
      }
      const next = snapshotQuery(state);
      requestChange(root, state, next, {
        kind: "search",
        name: searchName(state, input),
        originalEvent: event,
        source: "user",
        value: input.value,
      });
    };

    const handleReset = (event) => {
      const accepted = root.resetFilters({
        originalEvent: event,
        source: "user",
      });
      event.preventDefault();
      if (!accepted) return;
      state.searchInputs.forEach((input) => {
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };

    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root.addEventListener("reset", handleReset);
    root._destroy = () => {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("input", handleInput);
      root.removeEventListener("reset", handleReset);
      states.delete(root);
      delete root.clear;
      delete root.getFilters;
      delete root.getSearch;
      delete root.getState;
      delete root.refresh;
      delete root.resetFilters;
      delete root.setFilters;
      delete root.setSearch;
    };

    refreshFilterBar(root, { preserve: false });
    state.initial = cloneQuery(state.current);
    root.dataset.filterBarInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("filter-bar", {
      selector: ".filter-bar:not([data-filter-bar-initialized])",
      init: initFilterBar,
      refresh: refreshFilterBar,
    });
  }
})();
