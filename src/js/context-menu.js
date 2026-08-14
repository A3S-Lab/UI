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

  const directChild = (root, selector) =>
    Array.from(root.children).find((child) => child.matches(selector)) || null;

  const getElements = (root) => ({
    content: directChild(root, '[data-context-content][role="menu"]'),
    trigger: directChild(root, "[data-context-trigger]"),
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

  const itemValue = (item) =>
    item.dataset.value ||
    item.getAttribute("value") ||
    item.textContent?.trim() ||
    "";

  const setActiveItem = (menu, item, focus = false) => {
    getAllMenuItems(menu).forEach((candidate) => {
      candidate.tabIndex = candidate === item ? 0 : -1;
      if (candidate === item) candidate.dataset.active = "true";
      else delete candidate.dataset.active;
    });
    if (focus) {
      if (item) item.focus({ preventScroll: true });
      else {
        menu.tabIndex = -1;
        menu.focus({ preventScroll: true });
      }
    }
  };

  const viewportBounds = () => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return {
        bottom: window.innerHeight,
        left: 0,
        right: window.innerWidth,
        top: 0,
      };
    }
    return {
      bottom: viewport.offsetTop + viewport.height,
      left: viewport.offsetLeft,
      right: viewport.offsetLeft + viewport.width,
      top: viewport.offsetTop,
    };
  };

  const clampPosition = (menu, x, y) => {
    const margin = 8;
    const rect = menu.getBoundingClientRect();
    const bounds = viewportBounds();
    return {
      x: Math.max(
        bounds.left + margin,
        Math.min(x, bounds.right - rect.width - margin),
      ),
      y: Math.max(
        bounds.top + margin,
        Math.min(y, bounds.bottom - rect.height - margin),
      ),
    };
  };

  const placeMenu = (menu, x, y) => {
    menu.style.left = "0px";
    menu.style.top = "0px";
    const position = clampPosition(menu, x, y);
    menu.style.left = `${position.x}px`;
    menu.style.top = `${position.y}px`;
    return position;
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
      parentMenuItem(submenu)?.setAttribute("aria-expanded", "false");
      getAllMenuItems(submenu).forEach((item) => {
        item.tabIndex = -1;
        delete item.dataset.active;
      });
    });
  };

  const openSubmenu = (root, item, focus = true) => {
    const submenu = submenuForItem(item);
    if (!submenu || getMenuItems(submenu).length === 0) return false;
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
    setActiveItem(submenu, getMenuItems(submenu)[0] || null, focus);
    return true;
  };

  const checkedState = (item) => {
    const role = item.getAttribute("role");
    return role === "menuitemcheckbox" || role === "menuitemradio"
      ? item.getAttribute("aria-checked") === "true"
      : null;
  };

  const setItemChecked = (item, checked) => {
    const role = item.getAttribute("role");
    if (role === "menuitemcheckbox") {
      item.setAttribute("aria-checked", String(Boolean(checked)));
      return true;
    }
    if (role !== "menuitemradio") return false;
    const menu = item.closest('[role="menu"]');
    const group = item.closest('[role="group"]');
    const radioItems =
      group && group.closest('[role="menu"]') === menu
        ? Array.from(group.querySelectorAll('[role="menuitemradio"]')).filter(
            (candidate) =>
              candidate.closest('[role="menu"]') === menu &&
              candidate.closest('[role="group"]') === group,
          )
        : getAllMenuItems(menu).filter(
            (candidate) =>
              candidate.getAttribute("role") === "menuitemradio" &&
              !candidate.closest('[role="group"]'),
          );
    radioItems.forEach((candidate) => {
      candidate.setAttribute(
        "aria-checked",
        String(Boolean(checked) && candidate === item),
      );
    });
    return true;
  };

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

  const selectItem = (root, state, item, options = {}) => {
    if (!item || isDisabled(item) || submenuForItem(item)) return false;
    const role = item.getAttribute("role");
    const checked =
      role === "menuitemcheckbox"
        ? !checkedState(item)
        : role === "menuitemradio"
          ? true
          : null;
    const detail = {
      checked,
      item,
      originalEvent: options.originalEvent || null,
      reason: options.reason || "select",
      source: options.source || "api",
      target: state.invocationTarget,
      value: itemValue(item),
    };
    const beforeEvent = new CustomEvent("a3s:context-menu-before-select", {
      bubbles: true,
      cancelable: true,
      detail,
    });
    if (options.before !== false && !root.dispatchEvent(beforeEvent))
      return false;

    if (checked !== null) setItemChecked(item, checked);
    root.dispatchEvent(
      new CustomEvent("a3s:context-menu-select", {
        bubbles: true,
        detail: { ...detail, checked: checkedState(item) },
      }),
    );
    if (options.close !== false) {
      root.close({
        reason: "select",
        restoreFocus: options.restoreFocus !== false,
        source: options.source || "api",
      });
    }
    return true;
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
      position: null,
      previousFocus: null,
      typeahead: "",
      typeaheadTimer: 0,
    };
    states.set(root, state);

    root.refresh = () => refreshContextMenu(root);
    root.getState = () => {
      const activeItem = root.querySelector(
        '[role="menu"] [data-active="true"]',
      );
      return {
        activeValue: activeItem ? itemValue(activeItem) : "",
        open: state.content.getAttribute("aria-hidden") !== "true",
        position: state.position ? { ...state.position } : null,
        target: state.invocationTarget,
      };
    };
    root.close = (value = {}) => {
      const options =
        typeof value === "boolean" ? { restoreFocus: value } : value || {};
      if (state.content.getAttribute("aria-hidden") === "true") return true;
      const detail = {
        reason: options.reason || "api",
        restoreFocus: options.restoreFocus !== false,
        source: options.source || "api",
        target: state.invocationTarget,
      };
      if (!options.force) {
        const beforeEvent = new CustomEvent("a3s:context-menu-before-close", {
          bubbles: true,
          cancelable: true,
          detail,
        });
        if (!root.dispatchEvent(beforeEvent)) return false;
      }

      closeSubmenu(state.content);
      state.content.setAttribute("aria-hidden", "true");
      state.content.style.removeProperty("left");
      state.content.style.removeProperty("top");
      root.dataset.state = "closed";
      if (
        detail.restoreFocus &&
        state.previousFocus instanceof HTMLElement &&
        state.previousFocus.isConnected
      ) {
        state.previousFocus.focus({ preventScroll: true });
      }
      root.dispatchEvent(
        new CustomEvent("a3s:context-menu-close", {
          bubbles: true,
          detail,
        }),
      );
      state.invocationTarget = null;
      state.position = null;
      state.previousFocus = null;
      return true;
    };
    root.openAt = (x, y, target = state.trigger, value = {}) => {
      const options =
        target && !(target instanceof Element) ? target : value || {};
      const invocationTarget =
        target instanceof Element
          ? target
          : options.target instanceof Element
            ? options.target
            : state.trigger;
      const targetRect = invocationTarget.getBoundingClientRect();
      const requestedX = Number(x);
      const requestedY = Number(y);
      const detail = {
        menu: state.content,
        reason: options.reason || "api",
        source: options.source || "api",
        target: invocationTarget,
        x: Number.isFinite(requestedX) ? requestedX : targetRect.left,
        y: Number.isFinite(requestedY) ? requestedY : targetRect.bottom,
      };
      const beforeEvent = new CustomEvent("a3s:context-menu-before-open", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (options.before !== false && !root.dispatchEvent(beforeEvent))
        return false;

      const wasOpen = state.content.getAttribute("aria-hidden") !== "true";
      root.refresh();
      if (getMenuItems(state.content).length === 0) return false;
      document.dispatchEvent(
        new CustomEvent("basecoat:popover", { detail: { source: root } }),
      );
      if (!wasOpen) state.previousFocus = document.activeElement;
      state.invocationTarget = invocationTarget;
      state.content.setAttribute("aria-hidden", "false");
      root.dataset.state = "open";
      closeSubmenu(state.content);
      state.position = placeMenu(state.content, detail.x, detail.y);
      setActiveItem(
        state.content,
        getMenuItems(state.content)[0] || null,
        options.focus !== false,
      );
      root.dispatchEvent(
        new CustomEvent("a3s:context-menu-open", {
          bubbles: true,
          detail: {
            ...detail,
            position: { ...state.position },
            x: state.position.x,
            y: state.position.y,
          },
        }),
      );
      return true;
    };
    root.open = (options = {}) => {
      const target =
        options.target instanceof Element ? options.target : state.trigger;
      const rect = target.getBoundingClientRect();
      const rtl = getComputedStyle(root).direction === "rtl";
      return root.openAt(rtl ? rect.right : rect.left, rect.bottom, target, {
        ...options,
        reason: options.reason || "anchor",
      });
    };
    root.focusItem = (value, options = {}) => {
      const item = Array.from(
        root.querySelectorAll(
          '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
        ),
      ).find((candidate) => itemValue(candidate) === String(value));
      if (!item || isDisabled(item)) return false;
      const menu = item.closest('[role="menu"]');
      const owner = parentMenuItem(menu);
      if (owner) openSubmenu(root, owner, false);
      setActiveItem(menu, item, options.focus !== false);
      return true;
    };
    root.select = (value, options = {}) => {
      const item = Array.from(
        root.querySelectorAll(
          '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
        ),
      ).find((candidate) => itemValue(candidate) === String(value));
      return selectItem(root, state, item, options);
    };
    root.setChecked = (value, checked = true) => {
      const item = Array.from(
        root.querySelectorAll(
          '[role="menuitemcheckbox"], [role="menuitemradio"]',
        ),
      ).find((candidate) => itemValue(candidate) === String(value));
      return item ? setItemChecked(item, checked) : false;
    };

    const handleContextMenu = (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !state.trigger.contains(target))
        return;
      event.preventDefault();
      root.openAt(event.clientX, event.clientY, target, {
        reason: "contextmenu",
        source: "pointer",
      });
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

    const handleKeydown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        state.trigger.contains(target) &&
        (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))
      ) {
        event.preventDefault();
        const rect = target.getBoundingClientRect();
        root.openAt(
          rect.left + Math.min(rect.width, 20),
          rect.top + Math.min(rect.height, 20),
          target,
          { reason: "keyboard", source: "keyboard" },
        );
        return;
      }
      if (state.content.getAttribute("aria-hidden") === "true") return;
      const item = target.closest(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
      );
      const menu = target.closest('[role="menu"]');
      if (!menu || !root.contains(menu)) return;
      const rtl = getComputedStyle(root).direction === "rtl";
      const openKey = rtl ? "ArrowLeft" : "ArrowRight";
      const closeKey = rtl ? "ArrowRight" : "ArrowLeft";

      if (event.key === "Escape") {
        event.preventDefault();
        root.close({ reason: "escape", source: "keyboard" });
      } else if (event.key === "Tab") {
        root.close({
          reason: "tab",
          restoreFocus: false,
          source: "keyboard",
        });
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
        if (!openSubmenu(root, item, true)) {
          selectItem(root, state, item, {
            originalEvent: event,
            reason: "keyboard",
            source: "keyboard",
          });
        }
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

    const handleClick = (event) => {
      const item = event.target.closest?.(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
      );
      if (!item || isDisabled(item) || !root.contains(item)) return;
      if (openSubmenu(root, item, true)) return;
      selectItem(root, state, item, {
        originalEvent: event,
        reason: event.detail === 0 ? "keyboard" : "pointer",
        source: event.detail === 0 ? "keyboard" : "pointer",
      });
    };

    const handleDocumentPointerDown = (event) => {
      if (!root.contains(event.target)) {
        root.close({
          reason: "outside-pointer",
          restoreFocus: false,
          source: "pointer",
        });
      }
    };
    const handleDocumentPopover = (event) => {
      if (event.detail?.source !== root) {
        root.close({
          force: true,
          reason: "another-overlay",
          restoreFocus: false,
          source: "system",
        });
      }
    };
    const handleViewportChange = (event) => {
      if (
        event.type === "scroll" &&
        event.target instanceof Node &&
        state.content.contains(event.target)
      ) {
        return;
      }
      root.close({
        force: true,
        reason: "viewport-change",
        restoreFocus: false,
        source: "system",
      });
    };

    root.addEventListener("contextmenu", handleContextMenu);
    root.addEventListener("keydown", handleKeydown);
    root.addEventListener("pointermove", handlePointerMove);
    root.addEventListener("click", handleClick);
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("basecoat:popover", handleDocumentPopover);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    root._destroy = () => {
      window.clearTimeout(state.typeaheadTimer);
      root.close({ force: true, reason: "destroy", restoreFocus: false });
      root.removeEventListener("contextmenu", handleContextMenu);
      root.removeEventListener("keydown", handleKeydown);
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("click", handleClick);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("basecoat:popover", handleDocumentPopover);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.visualViewport?.removeEventListener(
        "resize",
        handleViewportChange,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        handleViewportChange,
      );
      states.delete(root);
      delete root.close;
      delete root.focusItem;
      delete root.getState;
      delete root.open;
      delete root.openAt;
      delete root.refresh;
      delete root.select;
      delete root.setChecked;
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
