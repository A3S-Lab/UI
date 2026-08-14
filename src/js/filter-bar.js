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
      toggles
        .find((toggle) => !isDisabled(toggle))
        ?.setAttribute("aria-pressed", "true");
    });
  };

  const synchronize = (root, state) => {
    state.toggles.forEach((toggle) => {
      if (!toggle.hasAttribute("aria-pressed"))
        toggle.setAttribute("aria-pressed", "false");
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
  };

  const emitChange = (root, state, detail) => {
    root.dispatchEvent(
      new CustomEvent("a3s:filter-change", {
        bubbles: true,
        detail: { filters: activeFilters(state), ...detail },
      }),
    );
  };

  const refreshFilterBar = (root) => {
    const state = states.get(root);
    if (!state) return;
    Object.assign(state, getElements(root));
    synchronize(root, state);
  };

  const initFilterBar = (root) => {
    if (root.dataset.filterBarInitialized) return;
    const state = { chips: [], searchInputs: [], toggles: [] };
    states.set(root, state);

    root.refresh = () => refreshFilterBar(root);
    root.clear = () => {
      state.toggles.forEach((toggle) =>
        toggle.setAttribute("aria-pressed", "false"),
      );
      state.searchInputs.forEach((input) => {
        if ("value" in input) input.value = "";
      });
      state.chips.forEach((chip) => {
        chip.hidden = true;
      });
      synchronize(root, state);
      emitChange(root, state, { kind: "clear" });
    };

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clear = target.closest("[data-filter-clear]");
      if (clear && ownsElement(root, clear)) {
        root.clear();
        return;
      }

      const remove = target.closest("[data-filter-remove]");
      if (remove && ownsElement(root, remove)) {
        const chip = remove.closest("[data-filter-chip]");
        if (!chip) return;
        const matches = matchingToggles(state, chip);
        matches.forEach((toggle) =>
          toggle.setAttribute("aria-pressed", "false"),
        );
        chip.hidden = true;
        synchronize(root, state);
        emitChange(root, state, { kind: "remove", ...identity(chip) });
        matches
          .find((toggle) => !isDisabled(toggle))
          ?.focus({ preventScroll: true });
        return;
      }

      const toggle = target.closest("[data-filter-toggle]");
      if (!toggle || !ownsElement(root, toggle) || isDisabled(toggle)) {
        return;
      }
      const group = toggle.closest("[data-filter-group]");
      const single = group?.dataset.selection === "single";
      const required = group?.dataset.required === "true";
      const currentlyPressed = toggle.getAttribute("aria-pressed") === "true";
      if (single) {
        state.toggles.forEach((candidate) => {
          if (candidate.closest("[data-filter-group]") === group) {
            candidate.setAttribute("aria-pressed", "false");
          }
        });
      }
      toggle.setAttribute(
        "aria-pressed",
        String(required || !currentlyPressed),
      );
      synchronize(root, state);
      emitChange(root, state, {
        pressed: toggle.getAttribute("aria-pressed") === "true",
        kind: "toggle",
        ...identity(toggle),
      });
    };

    const handleInput = (event) => {
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
      emitChange(root, state, {
        kind: "search",
        name: input.name || "search",
        value: input.value,
      });
    };

    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root._destroy = () => {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("input", handleInput);
      states.delete(root);
      delete root.clear;
      delete root.refresh;
    };

    refreshFilterBar(root);
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
