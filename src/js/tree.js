(() => {
  const states = new WeakMap();

  const isDisabled = (item) =>
    item.getAttribute("aria-disabled") === "true" ||
    item.getAttribute("data-disabled") === "true";

  const ownsItem = (root, item) => item.closest(".tree") === root;

  const getItems = (root) =>
    Array.from(root.querySelectorAll('[role="treeitem"]')).filter((item) =>
      ownsItem(root, item),
    );

  const getGroup = (item) =>
    Array.from(item.children).find((child) =>
      child.matches('[role="group"]'),
    ) || null;

  const getParentItem = (root, item) => {
    const parentGroup = item.parentElement?.closest('[role="group"]');
    if (!parentGroup || !root.contains(parentGroup)) return null;
    const parentItem = parentGroup.parentElement?.closest('[role="treeitem"]');
    return parentItem && ownsItem(root, parentItem) ? parentItem : null;
  };

  const getChildItems = (root, item) => {
    const group = getGroup(item);
    if (!group) return [];
    return Array.from(group.children).filter(
      (child) => child.matches('[role="treeitem"]') && ownsItem(root, child),
    );
  };

  const isVisible = (root, item) => {
    if (item.hidden || item.getAttribute("aria-hidden") === "true")
      return false;

    let parent = getParentItem(root, item);
    while (parent) {
      if (
        parent.hidden ||
        parent.getAttribute("aria-hidden") === "true" ||
        parent.getAttribute("aria-expanded") !== "true"
      ) {
        return false;
      }
      parent = getParentItem(root, parent);
    }
    return true;
  };

  const getEnabledVisibleItems = (root, state) =>
    state.items.filter((item) => isVisible(root, item) && !isDisabled(item));

  const getItemLabel = (item) => {
    const row = Array.from(item.children).find((child) =>
      child.hasAttribute("data-tree-row"),
    );
    return (
      item.getAttribute("aria-label") ||
      row?.querySelector("[data-tree-label]")?.textContent ||
      row?.textContent ||
      ""
    ).trim();
  };

  const getItemValue = (item) =>
    item.getAttribute("data-value") || item.id || getItemLabel(item);

  const scrollItemIntoTree = (root, item) => {
    const rootRect = root.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    if (itemRect.top < rootRect.top) {
      root.scrollTop -= rootRect.top - itemRect.top;
    } else if (itemRect.bottom > rootRect.bottom) {
      root.scrollTop += itemRect.bottom - rootRect.bottom;
    }
  };

  const setTabStop = (state, activeItem) => {
    state.items.forEach((item) => {
      item.setAttribute(
        "tabindex",
        item === activeItem && !isDisabled(item) ? "0" : "-1",
      );
    });
  };

  const focusItem = (root, state, item) => {
    if (!item || isDisabled(item) || !isVisible(root, item)) return;
    setTabStop(state, item);
    item.focus({ preventScroll: true });
    scrollItemIntoTree(root, item);
  };

  const selectItem = (root, state, item, focus = false, emit = true) => {
    if (!item || isDisabled(item) || !ownsItem(root, item)) return;

    const previous = state.items.find(
      (candidate) => candidate.getAttribute("aria-selected") === "true",
    );
    state.items.forEach((candidate) => {
      candidate.setAttribute(
        "aria-selected",
        candidate === item ? "true" : "false",
      );
    });

    if (focus) focusItem(root, state, item);
    if (!emit || previous === item) return;

    root.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: { item, value: getItemValue(item) },
      }),
    );
  };

  const setExpanded = (root, state, item, expanded, emit = true) => {
    const group = getGroup(item);
    if (!group || isDisabled(item)) return;

    const nextExpanded = Boolean(expanded);
    const previousExpanded = item.getAttribute("aria-expanded") === "true";
    item.setAttribute("aria-expanded", String(nextExpanded));
    group.hidden = !nextExpanded;

    const activeElement = document.activeElement;
    if (
      !nextExpanded &&
      activeElement instanceof Element &&
      group.contains(activeElement)
    ) {
      focusItem(root, state, item);
    }

    if (!emit || previousExpanded === nextExpanded) return;
    root.dispatchEvent(
      new CustomEvent("a3s:tree-toggle", {
        bubbles: true,
        detail: {
          expanded: nextExpanded,
          item,
          value: getItemValue(item),
        },
      }),
    );
  };

  const refreshTree = (root) => {
    const state = states.get(root);
    if (!state) return;

    state.items = getItems(root);
    state.items.forEach((item) => {
      const group = getGroup(item);
      if (group) {
        if (!item.hasAttribute("aria-expanded")) {
          item.setAttribute("aria-expanded", "false");
        }
        group.hidden = item.getAttribute("aria-expanded") !== "true";
      }
      if (isDisabled(item)) item.setAttribute("tabindex", "-1");
    });

    const visibleItems = getEnabledVisibleItems(root, state);
    const current = state.items.find(
      (item) =>
        item.getAttribute("tabindex") === "0" && visibleItems.includes(item),
    );
    const selected = state.items.find(
      (item) =>
        item.getAttribute("aria-selected") === "true" &&
        visibleItems.includes(item),
    );
    setTabStop(state, current || selected || visibleItems[0] || null);
  };

  const initTree = (root) => {
    if (root.dataset.treeInitialized) return;

    const state = {
      items: [],
      typeahead: "",
      typeaheadTimer: 0,
    };
    states.set(root, state);

    root.refresh = () => refreshTree(root);
    root.select = (item, focus = false) => selectItem(root, state, item, focus);
    root.expand = (item, expanded = true) =>
      setExpanded(root, state, item, expanded);
    root.toggle = (item) =>
      setExpanded(
        root,
        state,
        item,
        item.getAttribute("aria-expanded") !== "true",
      );

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const row = target.closest("[data-tree-row]");
      const item = row?.parentElement?.closest('[role="treeitem"]');
      if (
        !row ||
        !item ||
        row.parentElement !== item ||
        !ownsItem(root, item) ||
        isDisabled(item)
      ) {
        return;
      }

      selectItem(root, state, item, true);
      if (getGroup(item)) root.toggle(item);
    };

    const handleFocusIn = (event) => {
      const item = event.target?.closest?.('[role="treeitem"]');
      if (item && ownsItem(root, item) && !isDisabled(item)) {
        setTabStop(state, item);
      }
    };

    const handleTypeahead = (event, currentItem) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.key.length !== 1 ||
        event.key.trim() === ""
      ) {
        return false;
      }

      window.clearTimeout(state.typeaheadTimer);
      state.typeahead += event.key.toLocaleLowerCase();
      state.typeaheadTimer = window.setTimeout(() => {
        state.typeahead = "";
      }, 600);

      const items = getEnabledVisibleItems(root, state);
      if (items.length === 0) return false;
      const repeatedCharacter = Array.from(state.typeahead).every(
        (character) => character === state.typeahead[0],
      );
      const query = repeatedCharacter ? state.typeahead[0] : state.typeahead;
      const currentIndex = items.indexOf(currentItem);

      for (let offset = 1; offset <= items.length; offset += 1) {
        const item =
          items[(currentIndex + offset + items.length) % items.length];
        if (getItemLabel(item).toLocaleLowerCase().startsWith(query)) {
          event.preventDefault();
          focusItem(root, state, item);
          return true;
        }
      }
      return false;
    };

    const handleKeydown = (event) => {
      const currentItem = event.target?.closest?.('[role="treeitem"]');
      if (
        !currentItem ||
        !ownsItem(root, currentItem) ||
        isDisabled(currentItem)
      ) {
        return;
      }

      const visibleItems = getEnabledVisibleItems(root, state);
      const currentIndex = visibleItems.indexOf(currentItem);
      if (currentIndex === -1) return;

      const rtl = getComputedStyle(root).direction === "rtl";
      const expandKey = rtl ? "ArrowLeft" : "ArrowRight";
      const collapseKey = rtl ? "ArrowRight" : "ArrowLeft";
      let nextItem = null;

      if (event.key === "ArrowDown") {
        nextItem =
          visibleItems[Math.min(currentIndex + 1, visibleItems.length - 1)];
      } else if (event.key === "ArrowUp") {
        nextItem = visibleItems[Math.max(currentIndex - 1, 0)];
      } else if (event.key === "Home") {
        nextItem = visibleItems[0];
      } else if (event.key === "End") {
        nextItem = visibleItems[visibleItems.length - 1];
      } else if (event.key === expandKey) {
        const group = getGroup(currentItem);
        if (group && currentItem.getAttribute("aria-expanded") !== "true") {
          root.expand(currentItem, true);
        } else if (group) {
          nextItem = getChildItems(root, currentItem).find(
            (item) => !isDisabled(item) && isVisible(root, item),
          );
        }
      } else if (event.key === collapseKey) {
        if (
          getGroup(currentItem) &&
          currentItem.getAttribute("aria-expanded") === "true"
        ) {
          root.expand(currentItem, false);
        } else {
          nextItem = getParentItem(root, currentItem);
        }
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        root.select(currentItem);
        return;
      } else if (handleTypeahead(event, currentItem)) {
        return;
      } else {
        return;
      }

      event.preventDefault();
      if (nextItem) focusItem(root, state, nextItem);
    };

    root.addEventListener("click", handleClick);
    root.addEventListener("focusin", handleFocusIn);
    root.addEventListener("keydown", handleKeydown);

    root._destroy = () => {
      window.clearTimeout(state.typeaheadTimer);
      root.removeEventListener("click", handleClick);
      root.removeEventListener("focusin", handleFocusIn);
      root.removeEventListener("keydown", handleKeydown);
      states.delete(root);
      delete root.expand;
      delete root.refresh;
      delete root.select;
      delete root.toggle;
    };

    refreshTree(root);
    root.dataset.treeInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("tree", {
      selector: '.tree[role="tree"]:not([data-tree-initialized])',
      init: initTree,
      refresh: refreshTree,
    });
  }
})();
