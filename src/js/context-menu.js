(() => {
  const states = new WeakMap();

  const isDisabled = (item) => item.matches(":disabled, [aria-disabled=true]");

  const getAllMenuItems = (menu) =>
    Array.from(
      menu.querySelectorAll(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
      ),
    ).filter((item) => item.closest('[role="menu"]') === menu);

  const getMenuItems = (menu) =>
    getAllMenuItems(menu).filter((item) => !isDisabled(item));

  const directMenu = (root, selector) =>
    Array.from(root.children).find((child) => child.matches(selector)) || null;

  const getElements = (root) => ({
    content: directMenu(root, '[data-context-content][role="menu"]'),
    trigger: directMenu(root, "[data-context-trigger]"),
  });

  const parentMenuItem = (menu) => {
    const owner = menu.closest("[data-context-submenu]");
    return owner
      ? Array.from(owner.children).find((child) =>
          child.matches('[aria-haspopup="menu"]'),
        ) || null
      : null;
  };

  const submenuForItem = (item) => {
    const owner = item.closest("[data-context-submenu]");
    if (!owner || item.parentElement !== owner) return null;
    return (
      Array.from(owner.children).find((child) =>
        child.matches('[data-context-submenu-content][role="menu"]'),
      ) || null
    );
  };

  const setActiveItem = (menu, item, focus = false) => {
    getAllMenuItems(menu).forEach((candidate) => {
      candidate.tabIndex = candidate === item ? 0 : -1;
      if (candidate === item) candidate.dataset.active = "true";
      else delete candidate.dataset.active;
    });
    if (focus && item) item.focus({ preventScroll: true });
  };

  const clampPosition = (menu, x, y) => {
    const margin = 8;
    const rect = menu.getBoundingClientRect();
    return {
      x: Math.max(margin, Math.min(x, window.innerWidth - rect.width - margin)),
      y: Math.max(
        margin,
        Math.min(y, window.innerHeight - rect.height - margin),
      ),
    };
  };

  const placeMenu = (menu, x, y) => {
    menu.style.left = "0px";
    menu.style.top = "0px";
    const position = clampPosition(menu, x, y);
    menu.style.left = `${position.x}px`;
    menu.style.top = `${position.y}px`;
  };

  const closeSubmenu = (menu) => {
    const menus = [
      ...(menu.matches('[data-context-submenu-content][role="menu"]')
        ? [menu]
        : []),
      ...menu.querySelectorAll('[data-context-submenu-content][role="menu"]'),
    ];
    menus.forEach((submenu) => {
      submenu.setAttribute("aria-hidden", "true");
      submenu.style.removeProperty("left");
      submenu.style.removeProperty("top");
      const ownerItem = parentMenuItem(submenu);
      ownerItem?.setAttribute("aria-expanded", "false");
      getAllMenuItems(submenu).forEach((item) => {
        item.tabIndex = -1;
        delete item.dataset.active;
      });
    });
  };

  const openSubmenu = (root, item, focus = true) => {
    const submenu = submenuForItem(item);
    if (!submenu) return false;
    const menu = item.closest('[role="menu"]');
    if (menu) {
      Array.from(
        menu.querySelectorAll('[data-context-submenu-content][role="menu"]'),
      )
        .filter(
          (candidate) =>
            candidate !== submenu &&
            parentMenuItem(candidate)?.closest('[role="menu"]') === menu,
        )
        .forEach((candidate) => closeSubmenu(candidate));
    }
    submenu.setAttribute("aria-hidden", "false");
    item.setAttribute("aria-expanded", "true");

    const itemRect = item.getBoundingClientRect();
    const rtl = getComputedStyle(root).direction === "rtl";
    submenu.style.left = "0px";
    submenu.style.top = "0px";
    const menuRect = submenu.getBoundingClientRect();
    const preferredX = rtl
      ? itemRect.left - menuRect.width + 4
      : itemRect.right - 4;
    placeMenu(submenu, preferredX, itemRect.top - 4);
    const first = getMenuItems(submenu)[0] || null;
    setActiveItem(submenu, first, focus);
    return true;
  };

  const itemValue = (item) =>
    item.dataset.value ||
    item.getAttribute("value") ||
    item.textContent?.trim() ||
    "";

  const refreshContextMenu = (root) => {
    const state = states.get(root);
    if (!state) return;
    Object.assign(state, getElements(root));
    if (!state.trigger || !state.content) return;
    root.querySelectorAll('[role="menu"]').forEach((menu) => {
      const items = getMenuItems(menu);
      setActiveItem(
        menu,
        items.find((item) => item.tabIndex === 0) || items[0] || null,
      );
    });
  };

  const initContextMenu = (root) => {
    if (root.dataset.contextMenuInitialized) return;
    const elements = getElements(root);
    if (!elements.trigger || !elements.content) {
      console.error(
        "Context menu requires direct data-context-trigger and data-context-content children.",
        root,
      );
      return;
    }

    const state = {
      ...elements,
      invocationTarget: null,
      previousFocus: null,
      typeahead: "",
      typeaheadTimer: 0,
    };
    states.set(root, state);

    root.refresh = () => refreshContextMenu(root);
    root.close = (restoreFocus = true) => {
      if (state.content.getAttribute("aria-hidden") === "true") return;
      closeSubmenu(state.content);
      state.content.setAttribute("aria-hidden", "true");
      state.content.style.removeProperty("left");
      state.content.style.removeProperty("top");
      root.dataset.state = "closed";
      if (
        restoreFocus &&
        state.previousFocus instanceof HTMLElement &&
        state.previousFocus.isConnected
      ) {
        state.previousFocus.focus({ preventScroll: true });
      }
      root.dispatchEvent(
        new CustomEvent("a3s:context-menu-close", {
          bubbles: true,
          detail: { target: state.invocationTarget },
        }),
      );
      state.invocationTarget = null;
      state.previousFocus = null;
    };
    root.openAt = (x, y, target = state.trigger) => {
      const wasOpen = state.content.getAttribute("aria-hidden") !== "true";
      document.dispatchEvent(
        new CustomEvent("basecoat:popover", { detail: { source: root } }),
      );
      root.refresh();
      if (!wasOpen) state.previousFocus = document.activeElement;
      state.invocationTarget = target;
      state.content.setAttribute("aria-hidden", "false");
      root.dataset.state = "open";
      closeSubmenu(state.content);
      placeMenu(state.content, x, y);
      const first = getMenuItems(state.content)[0] || null;
      setActiveItem(state.content, first, true);
      root.dispatchEvent(
        new CustomEvent("a3s:context-menu-open", {
          bubbles: true,
          detail: { menu: state.content, target, x, y },
        }),
      );
    };

    const handleContextMenu = (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !state.trigger.contains(target))
        return;
      event.preventDefault();
      root.openAt(event.clientX, event.clientY, target);
    };

    const handleTriggerKeydown = (event) => {
      if (
        !(event.target instanceof Element) ||
        !state.trigger.contains(event.target)
      )
        return;
      if (
        event.key !== "ContextMenu" &&
        !(event.shiftKey && event.key === "F10")
      )
        return;
      event.preventDefault();
      const rect = event.target.getBoundingClientRect();
      root.openAt(
        rect.left + Math.min(rect.width, 20),
        rect.top + Math.min(rect.height, 20),
        event.target,
      );
    };

    const move = (menu, direction) => {
      const items = getMenuItems(menu);
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement);
      const nextIndex =
        direction === "first"
          ? 0
          : direction === "last"
            ? items.length - 1
            : (Math.max(currentIndex, 0) + direction + items.length) %
              items.length;
      setActiveItem(menu, items[nextIndex], true);
    };

    const handleTypeahead = (event, menu) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.key.length !== 1 ||
        !event.key.trim()
      ) {
        return false;
      }
      window.clearTimeout(state.typeaheadTimer);
      state.typeahead += event.key.toLocaleLowerCase();
      state.typeaheadTimer = window.setTimeout(() => {
        state.typeahead = "";
      }, 600);
      const items = getMenuItems(menu);
      const currentIndex = items.indexOf(document.activeElement);
      for (let offset = 1; offset <= items.length; offset += 1) {
        const item = items[(Math.max(currentIndex, 0) + offset) % items.length];
        if (
          (item.textContent || "")
            .trim()
            .toLocaleLowerCase()
            .startsWith(state.typeahead)
        ) {
          setActiveItem(menu, item, true);
          return true;
        }
      }
      return false;
    };

    const handleMenuKeydown = (event) => {
      if (state.content.getAttribute("aria-hidden") === "true") return;
      const item = event.target.closest?.(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
      );
      const menu = event.target.closest?.('[role="menu"]');
      if (!menu || !root.contains(menu)) return;
      const rtl = getComputedStyle(root).direction === "rtl";
      const openKey = rtl ? "ArrowLeft" : "ArrowRight";
      const closeKey = rtl ? "ArrowRight" : "ArrowLeft";

      if (event.key === "Escape") {
        event.preventDefault();
        root.close(true);
      } else if (event.key === "Tab") {
        root.close(false);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        move(menu, 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        move(menu, -1);
      } else if (event.key === "Home") {
        event.preventDefault();
        move(menu, "first");
      } else if (event.key === "End") {
        event.preventDefault();
        move(menu, "last");
      } else if (event.key === openKey && item) {
        if (openSubmenu(root, item, true)) event.preventDefault();
      } else if (event.key === closeKey) {
        const ownerItem = parentMenuItem(menu);
        if (ownerItem) {
          event.preventDefault();
          closeSubmenu(menu);
          setActiveItem(ownerItem.closest('[role="menu"]'), ownerItem, true);
        }
      } else if ((event.key === "Enter" || event.key === " ") && item) {
        event.preventDefault();
        if (!openSubmenu(root, item, true)) item.click();
      } else if (handleTypeahead(event, menu)) {
        event.preventDefault();
      }
    };

    const handlePointerMove = (event) => {
      const item = event.target.closest?.(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
      );
      if (!item || isDisabled(item) || !root.contains(item)) return;
      const menu = item.closest('[role="menu"]');
      setActiveItem(menu, item, false);
      if (item.getAttribute("aria-haspopup") === "menu") {
        openSubmenu(root, item, false);
      } else {
        Array.from(
          menu.querySelectorAll('[data-context-submenu-content][role="menu"]'),
        )
          .filter(
            (candidate) =>
              parentMenuItem(candidate)?.closest('[role="menu"]') === menu,
          )
          .forEach((candidate) => closeSubmenu(candidate));
      }
    };

    const handleMenuClick = (event) => {
      const item = event.target.closest?.(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
      );
      if (!item || isDisabled(item) || !root.contains(item)) return;
      if (openSubmenu(root, item, true)) return;

      const role = item.getAttribute("role");
      if (role === "menuitemcheckbox") {
        item.setAttribute(
          "aria-checked",
          String(item.getAttribute("aria-checked") !== "true"),
        );
      } else if (role === "menuitemradio") {
        const menu = item.closest('[role="menu"]');
        const group = item.closest('[role="group"]');
        const radioItems =
          group && group.closest('[role="menu"]') === menu
            ? Array.from(
                group.querySelectorAll('[role="menuitemradio"]'),
              ).filter(
                (candidate) =>
                  candidate.closest('[role="menu"]') === menu &&
                  candidate.closest('[role="group"]') === group,
              )
            : getMenuItems(menu).filter(
                (candidate) =>
                  candidate.getAttribute("role") === "menuitemradio" &&
                  !candidate.closest('[role="group"]'),
              );
        radioItems.forEach((candidate) => {
          if (candidate.getAttribute("role") === "menuitemradio") {
            candidate.setAttribute("aria-checked", String(candidate === item));
          }
        });
      }

      root.dispatchEvent(
        new CustomEvent("a3s:context-menu-select", {
          bubbles: true,
          detail: {
            checked: item.getAttribute("aria-checked"),
            item,
            target: state.invocationTarget,
            value: itemValue(item),
          },
        }),
      );
      root.close(true);
    };

    const handleDocumentPointerDown = (event) => {
      if (!root.contains(event.target)) root.close(false);
    };
    const handleDocumentPopover = (event) => {
      if (event.detail.source !== root) root.close(false);
    };
    const handleViewportChange = (event) => {
      if (
        event.type === "scroll" &&
        event.target instanceof Node &&
        state.content.contains(event.target)
      ) {
        return;
      }
      root.close(false);
    };

    state.trigger.addEventListener("contextmenu", handleContextMenu);
    state.trigger.addEventListener("keydown", handleTriggerKeydown);
    state.content.addEventListener("keydown", handleMenuKeydown);
    state.content.addEventListener("pointermove", handlePointerMove);
    state.content.addEventListener("click", handleMenuClick);
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("basecoat:popover", handleDocumentPopover);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    root._destroy = () => {
      window.clearTimeout(state.typeaheadTimer);
      state.trigger.removeEventListener("contextmenu", handleContextMenu);
      state.trigger.removeEventListener("keydown", handleTriggerKeydown);
      state.content.removeEventListener("keydown", handleMenuKeydown);
      state.content.removeEventListener("pointermove", handlePointerMove);
      state.content.removeEventListener("click", handleMenuClick);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("basecoat:popover", handleDocumentPopover);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      states.delete(root);
      delete root.close;
      delete root.openAt;
      delete root.refresh;
    };

    state.content.setAttribute("aria-hidden", "true");
    root
      .querySelectorAll('[data-context-submenu-content][role="menu"]')
      .forEach((submenu) => submenu.setAttribute("aria-hidden", "true"));
    root.dataset.state = "closed";
    refreshContextMenu(root);
    root.dataset.contextMenuInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("context-menu", {
      selector: ".context-menu:not([data-context-menu-initialized])",
      init: initContextMenu,
      refresh: refreshContextMenu,
    });
  }
})();
