(() => {
  const states = new WeakMap();

  const ownsElement = (root, element) => element.closest(".data-grid") === root;

  const rowCheckbox = (root, row) =>
    Array.from(
      row.querySelectorAll('input[type="checkbox"][data-grid-select]'),
    ).find((checkbox) => ownsElement(root, checkbox)) || null;

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
    return { rowCheckboxes, rows, selectAll, sortButtons };
  };

  const selectedEntries = (state) =>
    state.rowCheckboxes.flatMap((checkbox) => {
      if (!checkbox.checked) return [];
      const row = checkbox.closest("tr");
      return [
        {
          row,
          value: checkbox.value || row?.dataset.value || "",
        },
      ];
    });

  const synchronizeSelection = (root, state, emit = false) => {
    state.rows.forEach((row) => {
      const checkbox = rowCheckbox(root, row);
      if (checkbox?.checked) row.dataset.state = "selected";
      else if (row.dataset.state === "selected") delete row.dataset.state;
    });

    const enabledCount = state.rowCheckboxes.length;
    const selected = selectedEntries(state);
    const selectedCount = selected.length;

    if (state.selectAll) {
      state.selectAll.checked =
        enabledCount > 0 && selectedCount === enabledCount;
      state.selectAll.indeterminate =
        selectedCount > 0 && selectedCount < enabledCount;
    }

    root.dataset.selection =
      selectedCount === 0
        ? "none"
        : selectedCount === enabledCount
          ? "all"
          : "some";
    root
      .querySelectorAll("[data-grid-selection-count], [data-selected-count]")
      .forEach((output) => {
        if (!ownsElement(root, output)) return;
        output.textContent = String(selectedCount);
      });
    root.querySelectorAll(".bulk-action-bar").forEach((bar) => {
      if (!ownsElement(root, bar)) return;
      bar.hidden = selectedCount === 0;
      bar.dataset.state = selectedCount > 0 ? "selected" : "empty";
    });

    if (!emit) return;
    root.dispatchEvent(
      new CustomEvent("a3s:data-grid-selection-change", {
        bubbles: true,
        detail: {
          rows: selected.map((entry) => entry.row),
          selectedCount,
          values: selected.map((entry) => entry.value),
        },
      }),
    );
  };

  const synchronizeSort = (state) => {
    state.sortButtons.forEach((button) => {
      const header = button.closest("th");
      if (!header) return;
      if (!header.hasAttribute("aria-sort"))
        header.setAttribute("aria-sort", "none");
      button.dataset.active = String(
        header.getAttribute("aria-sort") !== "none",
      );
    });
  };

  const refreshDataGrid = (root) => {
    const state = states.get(root);
    if (!state) return;
    Object.assign(state, getElements(root));
    synchronizeSelection(root, state);
    synchronizeSort(state);
  };

  const initDataGrid = (root) => {
    if (root.dataset.dataGridInitialized) return;

    const state = {
      rowCheckboxes: [],
      rows: [],
      selectAll: null,
      sortButtons: [],
    };
    states.set(root, state);
    root.refresh = () => refreshDataGrid(root);
    root.clearSelection = () => {
      state.rowCheckboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
      synchronizeSelection(root, state, true);
    };
    root.selectAll = (selected = true) => {
      state.rowCheckboxes.forEach((checkbox) => {
        checkbox.checked = Boolean(selected);
      });
      synchronizeSelection(root, state, true);
    };

    const handleChange = (event) => {
      const checkbox = event.target;
      if (
        !(checkbox instanceof HTMLInputElement) ||
        checkbox.type !== "checkbox"
      )
        return;
      if (!ownsElement(root, checkbox)) return;

      if (checkbox.matches("[data-grid-select-all]")) {
        state.rowCheckboxes.forEach((rowCheckbox) => {
          rowCheckbox.checked = checkbox.checked;
        });
      } else if (!checkbox.matches("[data-grid-select]")) {
        return;
      }
      synchronizeSelection(root, state, true);
    };

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clear = target.closest("[data-grid-clear-selection]");
      if (clear && ownsElement(root, clear)) {
        root.clearSelection();
        return;
      }

      const button = target.closest("[data-grid-sort]");
      if (!button || !ownsElement(root, button)) return;
      const header = button.closest("th");
      if (!header) return;

      const current = header.getAttribute("aria-sort") || "none";
      const cycle = button.dataset.sortCycle === "tri";
      const direction =
        current === "ascending"
          ? "descending"
          : current === "descending" && cycle
            ? "none"
            : "ascending";
      state.sortButtons.forEach((candidate) => {
        const candidateHeader = candidate.closest("th");
        if (candidateHeader && candidateHeader !== header) {
          candidateHeader.setAttribute("aria-sort", "none");
        }
      });
      header.setAttribute("aria-sort", direction);
      synchronizeSort(state);
      root.dispatchEvent(
        new CustomEvent("a3s:data-grid-sort", {
          bubbles: true,
          detail: {
            direction,
            key: button.dataset.gridSort || header.dataset.key || "",
          },
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
      delete root.refresh;
      delete root.selectAll;
    };

    refreshDataGrid(root);
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
