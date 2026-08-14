(() => {
  const states = new WeakMap();

  const owns = (root, item) => item.closest(".sortable-list") === root;
  const getItems = (root) =>
    Array.from(root.querySelectorAll("[data-sortable-item]")).filter((item) =>
      owns(root, item),
    );
  const itemId = (item, index) =>
    item.dataset.sortableId || item.id || String(index);
  const order = (state) =>
    state.items.map((item, index) => itemId(item, index));

  const announce = (state, message) => {
    if (state.status) state.status.textContent = message;
  };

  const synchronize = (root, state) => {
    state.items.forEach((item, index) => {
      if (!item.dataset.sortableId)
        item.dataset.sortableId = `a3s-sortable-${++state.sequence}`;
      item.dataset.sortableIndex = String(index);
      const handle = item.querySelector("[data-sortable-handle]");
      if (!handle) return;
      if (!handle.matches("button, [tabindex]")) handle.tabIndex = 0;
      handle.setAttribute(
        "aria-grabbed",
        state.active === item ? "true" : "false",
      );
      handle.draggable = !root.hasAttribute("data-disabled");
    });
    root.dataset.state = state.mode;
  };

  const refreshSortableList = (root) => {
    const state = states.get(root);
    if (!state) return;
    state.items = getItems(root);
    state.status = root.querySelector("[data-sortable-status]");
    synchronize(root, state);
  };

  const resolveIndex = (state, value) => {
    if (Number.isInteger(value)) return value;
    if (value instanceof Element) return state.items.indexOf(value);
    return state.items.findIndex(
      (item, index) => itemId(item, index) === String(value),
    );
  };

  const initSortableList = (root) => {
    if (root.dataset.sortableListInitialized) return;
    const state = {
      active: null,
      items: getItems(root),
      mode: "ready",
      snapshot: [],
      status: root.querySelector("[data-sortable-status]"),
      sequence: 0,
    };
    states.set(root, state);

    root.getOrder = () => [...order(state)];
    root.move = (from, to, options = {}) => {
      if (
        root.hasAttribute("data-disabled") ||
        root.getAttribute("aria-disabled") === "true"
      )
        return false;
      refreshSortableList(root);
      const fromIndex = resolveIndex(state, from);
      const toIndex = Math.max(
        0,
        Math.min(state.items.length - 1, resolveIndex(state, to)),
      );
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return false;
      const item = state.items[fromIndex];
      const previousOrder = root.getOrder();
      const detail = {
        from: fromIndex,
        item,
        previousOrder,
        source: options.source || "api",
        to: toIndex,
      };
      const before = new CustomEvent("a3s:sortable-before-reorder", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (!root.dispatchEvent(before)) return false;
      const reference =
        toIndex > fromIndex
          ? state.items[toIndex].nextSibling
          : state.items[toIndex];
      root.insertBefore(item, reference);
      refreshSortableList(root);
      const nextOrder = root.getOrder();
      announce(
        state,
        options.message ||
          `Moved ${itemId(item, toIndex)} to position ${toIndex + 1} of ${state.items.length}.`,
      );
      root.dispatchEvent(
        new CustomEvent("a3s:sortable-reorder", {
          bubbles: true,
          detail: { ...detail, order: nextOrder },
        }),
      );
      return true;
    };
    root.cancel = (options = {}) => {
      if (!state.snapshot.length) return false;
      const itemMap = new Map(
        state.items.map((item, index) => [itemId(item, index), item]),
      );
      state.snapshot.forEach((id) => {
        const item = itemMap.get(id);
        if (item) root.append(item);
      });
      state.active = null;
      state.mode = "ready";
      refreshSortableList(root);
      announce(state, options.message || "Reorder cancelled.");
      root.dispatchEvent(
        new CustomEvent("a3s:sortable-cancel", {
          bubbles: true,
          detail: { order: root.getOrder(), source: options.source || "api" },
        }),
      );
      return true;
    };
    root.refresh = () => refreshSortableList(root);

    const handleKeydown = (event) => {
      if (
        root.hasAttribute("data-disabled") ||
        root.getAttribute("aria-disabled") === "true"
      )
        return;
      const handle = event.target.closest("[data-sortable-handle]");
      const item = handle?.closest("[data-sortable-item]");
      if (!item || !owns(root, item)) return;
      refreshSortableList(root);
      const index = state.items.indexOf(item);
      if ((event.key === " " || event.key === "Enter") && !state.active) {
        event.preventDefault();
        state.snapshot = root.getOrder();
        state.active = item;
        state.mode = "keyboard";
        synchronize(root, state);
        announce(
          state,
          `Picked up ${itemId(item, index)} at position ${index + 1}.`,
        );
        return;
      }
      if (state.active !== item) return;
      if ([" ", "Enter"].includes(event.key)) {
        event.preventDefault();
        state.active = null;
        state.snapshot = [];
        state.mode = "ready";
        synchronize(root, state);
        announce(state, `Dropped at position ${index + 1}.`);
      } else if (event.key === "Escape") {
        event.preventDefault();
        root.cancel({ source: "keyboard" });
        handle.focus({ preventScroll: true });
      } else if (["ArrowUp", "ArrowLeft"].includes(event.key)) {
        event.preventDefault();
        if (root.move(item, index - 1, { source: "keyboard" }))
          handle.focus({ preventScroll: true });
      } else if (["ArrowDown", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        if (root.move(item, index + 1, { source: "keyboard" }))
          handle.focus({ preventScroll: true });
      } else if (event.key === "Home") {
        event.preventDefault();
        if (root.move(item, 0, { source: "keyboard" }))
          handle.focus({ preventScroll: true });
      } else if (event.key === "End") {
        event.preventDefault();
        if (root.move(item, state.items.length - 1, { source: "keyboard" }))
          handle.focus({ preventScroll: true });
      }
    };
    const handleDragStart = (event) => {
      if (
        root.hasAttribute("data-disabled") ||
        root.getAttribute("aria-disabled") === "true"
      )
        return;
      const handle = event.target.closest("[data-sortable-handle]");
      const item = handle?.closest("[data-sortable-item]");
      if (!item || !owns(root, item)) return;
      state.snapshot = root.getOrder();
      state.active = item;
      state.mode = "dragging";
      item.dataset.dragging = "true";
      event.dataTransfer?.setData(
        "text/plain",
        itemId(item, state.items.indexOf(item)),
      );
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      synchronize(root, state);
    };
    const handleDragOver = (event) => {
      const item = event.target.closest("[data-sortable-item]");
      if (!state.active || !item || !owns(root, item)) return;
      event.preventDefault();
      state.items.forEach((candidate) => delete candidate.dataset.dropTarget);
      item.dataset.dropTarget = "true";
    };
    const handleDrop = (event) => {
      const item = event.target.closest("[data-sortable-item]");
      if (!state.active || !item || !owns(root, item)) return;
      event.preventDefault();
      refreshSortableList(root);
      root.move(state.active, state.items.indexOf(item), { source: "drag" });
    };
    const handleDragEnd = () => {
      state.items.forEach((item) => {
        delete item.dataset.dragging;
        delete item.dataset.dropTarget;
      });
      state.active = null;
      state.snapshot = [];
      state.mode = "ready";
      synchronize(root, state);
    };
    root.addEventListener("keydown", handleKeydown);
    root.addEventListener("dragstart", handleDragStart);
    root.addEventListener("dragover", handleDragOver);
    root.addEventListener("drop", handleDrop);
    root.addEventListener("dragend", handleDragEnd);
    root._destroy = () => {
      root.removeEventListener("keydown", handleKeydown);
      root.removeEventListener("dragstart", handleDragStart);
      root.removeEventListener("dragover", handleDragOver);
      root.removeEventListener("drop", handleDrop);
      root.removeEventListener("dragend", handleDragEnd);
      states.delete(root);
      delete root.cancel;
      delete root.getOrder;
      delete root.move;
      delete root.refresh;
    };

    root.dataset.sortableListInitialized = "true";
    synchronize(root, state);
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("sortable-list", {
      selector: ".sortable-list:not([data-sortable-list-initialized])",
      init: initSortableList,
      refresh: refreshSortableList,
    });
  }
})();
