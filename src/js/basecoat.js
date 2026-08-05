(() => {
  const componentRegistry = {};
  let observer = null;
  const positionedPopovers = new Set();
  const popoverOriginalStyles = new WeakMap();
  const popoverCleanupTimers = new WeakMap();
  const managedPopoverProperties = [
    "--available-height",
    "bottom",
    "left",
    "margin",
    "max-height",
    "max-width",
    "min-height",
    "min-width",
    "right",
    "top",
    "translate",
  ];
  let popoverPositionFrame = 0;
  let popoverResizeObserver = null;
  let popoverListenersActive = false;

  const parsePopoverNumber = (value, fallback) => {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const savePopoverStyles = (popover) => {
    if (popoverOriginalStyles.has(popover)) return;
    popoverOriginalStyles.set(
      popover,
      managedPopoverProperties.map((property) => ({
        property,
        priority: popover.style.getPropertyPriority(property),
        value: popover.style.getPropertyValue(property),
      })),
    );
  };

  const restorePopoverStyles = (popover, release = false) => {
    const originalStyles = popoverOriginalStyles.get(popover);
    if (!originalStyles) return;

    originalStyles.forEach(({ property, priority, value }) => {
      if (value) popover.style.setProperty(property, value, priority);
      else popover.style.removeProperty(property);
    });
    if (release) popoverOriginalStyles.delete(popover);
  };

  const getViewportBounds = () => {
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    return { bottom: top + height, left, right: left + width, top };
  };

  const getPhysicalSide = (side, direction) => {
    if (side === "inline-start") return direction === "rtl" ? "right" : "left";
    if (side === "inline-end") return direction === "rtl" ? "left" : "right";
    return ["bottom", "left", "right", "top"].includes(side) ? side : "bottom";
  };

  const getOppositeSide = (side) =>
    ({ bottom: "top", left: "right", right: "left", top: "bottom" })[side];

  const getAvailableSpace = (anchorRect, viewport, padding, offset) => ({
    bottom: viewport.bottom - padding - anchorRect.bottom - offset,
    left: anchorRect.left - viewport.left - padding - offset,
    right: viewport.right - padding - anchorRect.right - offset,
    top: anchorRect.top - viewport.top - padding - offset,
  });

  const getOffsetParentOrigin = (popover) => {
    const offsetParent = popover.offsetParent;
    if (!(offsetParent instanceof Element)) return { left: 0, top: 0 };

    const rect = offsetParent.getBoundingClientRect();
    const element = offsetParent instanceof HTMLElement ? offsetParent : null;
    return {
      left: rect.left + (element?.clientLeft ?? 0) - (element?.scrollLeft ?? 0),
      top: rect.top + (element?.clientTop ?? 0) - (element?.scrollTop ?? 0),
    };
  };

  const positionPopover = (popover) => {
    if (
      !popover.isConnected ||
      popover.getAttribute("aria-hidden") !== "false" ||
      popover.dataset.collision === "none"
    ) {
      return;
    }

    const anchor = popover.parentElement;
    if (!anchor) return;

    savePopoverStyles(popover);
    restorePopoverStyles(popover);

    const anchorRect = anchor.getBoundingClientRect();
    const naturalSize = {
      height: popover.offsetHeight,
      width: popover.offsetWidth,
    };
    const direction = getComputedStyle(anchor).direction;
    const preferredSide = getPhysicalSide(popover.dataset.side, direction);
    const preferredAlign = ["center", "end", "start"].includes(
      popover.dataset.align,
    )
      ? popover.dataset.align
      : "start";
    const offset = Math.max(
      0,
      parsePopoverNumber(popover.dataset.sideOffset, 4),
    );
    const padding = Math.max(
      0,
      parsePopoverNumber(popover.dataset.collisionPadding, 8),
    );
    const viewport = getViewportBounds();
    const available = getAvailableSpace(anchorRect, viewport, padding, offset);
    const oppositeSide = getOppositeSide(preferredSide);
    const requiredSpace = ["bottom", "top"].includes(preferredSide)
      ? naturalSize.height
      : naturalSize.width;
    const resolvedSide =
      requiredSpace > available[preferredSide] &&
      available[oppositeSide] > available[preferredSide]
        ? oppositeSide
        : preferredSide;
    const availableWidth = ["left", "right"].includes(resolvedSide)
      ? Math.max(0, available[resolvedSide])
      : Math.max(0, viewport.right - viewport.left - padding * 2);
    const availableHeight = ["bottom", "top"].includes(resolvedSide)
      ? Math.max(0, available[resolvedSide])
      : Math.max(0, viewport.bottom - viewport.top - padding * 2);

    popover.style.setProperty("--available-height", `${availableHeight}px`);
    popover.style.maxWidth = `${availableWidth}px`;
    popover.style.maxHeight = `${availableHeight}px`;

    let popoverSize = {
      height: popover.offsetHeight,
      width: popover.offsetWidth,
    };
    if (popoverSize.width > availableWidth) {
      popover.style.minWidth = "0";
    }
    if (popoverSize.height > availableHeight) {
      popover.style.minHeight = "0";
    }
    popoverSize = {
      height: popover.offsetHeight,
      width: popover.offsetWidth,
    };
    let left;
    let top;

    if (["bottom", "top"].includes(resolvedSide)) {
      top =
        resolvedSide === "bottom"
          ? anchorRect.bottom + offset
          : anchorRect.top - offset - popoverSize.height;
      if (preferredAlign === "center") {
        left = anchorRect.left + (anchorRect.width - popoverSize.width) / 2;
      } else {
        const alignToLeft =
          (preferredAlign === "start" && direction !== "rtl") ||
          (preferredAlign === "end" && direction === "rtl");
        left = alignToLeft
          ? anchorRect.left
          : anchorRect.right - popoverSize.width;
      }
    } else {
      left =
        resolvedSide === "right"
          ? anchorRect.right + offset
          : anchorRect.left - offset - popoverSize.width;
      if (preferredAlign === "center") {
        top = anchorRect.top + (anchorRect.height - popoverSize.height) / 2;
      } else {
        top =
          preferredAlign === "start"
            ? anchorRect.top
            : anchorRect.bottom - popoverSize.height;
      }
    }

    left = Math.min(
      Math.max(left, viewport.left + padding),
      viewport.right - padding - popoverSize.width,
    );
    top = Math.min(
      Math.max(top, viewport.top + padding),
      viewport.bottom - padding - popoverSize.height,
    );

    const origin = getOffsetParentOrigin(popover);
    popover.style.bottom = "auto";
    popover.style.left = `${left - origin.left}px`;
    popover.style.margin = "0";
    popover.style.right = "auto";
    popover.style.top = `${top - origin.top}px`;
    popover.style.translate = "none";
    popover.dataset.a3sPositioned = "true";
    popover.dataset.resolvedAlign = preferredAlign;
    popover.dataset.resolvedSide = resolvedSide;
  };

  const schedulePopoverPositioning = () => {
    if (popoverPositionFrame) cancelAnimationFrame(popoverPositionFrame);
    popoverPositionFrame = requestAnimationFrame(() => {
      popoverPositionFrame = 0;
      positionedPopovers.forEach(positionPopover);
    });
  };

  const startPopoverListeners = () => {
    if (popoverListenersActive) return;
    document.addEventListener("scroll", schedulePopoverPositioning, true);
    window.addEventListener("resize", schedulePopoverPositioning);
    window.visualViewport?.addEventListener(
      "resize",
      schedulePopoverPositioning,
    );
    window.visualViewport?.addEventListener(
      "scroll",
      schedulePopoverPositioning,
    );
    popoverListenersActive = true;
  };

  const stopPopoverListeners = () => {
    if (!popoverListenersActive || positionedPopovers.size > 0) return;
    document.removeEventListener("scroll", schedulePopoverPositioning, true);
    window.removeEventListener("resize", schedulePopoverPositioning);
    window.visualViewport?.removeEventListener(
      "resize",
      schedulePopoverPositioning,
    );
    window.visualViewport?.removeEventListener(
      "scroll",
      schedulePopoverPositioning,
    );
    popoverListenersActive = false;
  };

  const startPopoverPositioning = (popover) => {
    const cleanupTimer = popoverCleanupTimers.get(popover);
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
      popoverCleanupTimers.delete(popover);
    }
    if (popover.dataset.collision === "none") {
      stopPopoverPositioning(popover, true);
      return;
    }

    positionedPopovers.add(popover);
    startPopoverListeners();
    if (typeof ResizeObserver === "function") {
      popoverResizeObserver ??= new ResizeObserver(schedulePopoverPositioning);
      popoverResizeObserver.observe(popover);
      if (popover.parentElement)
        popoverResizeObserver.observe(popover.parentElement);
    }
    positionPopover(popover);
  };

  const finishPopoverCleanup = (popover, force = false) => {
    if (!force && popover.getAttribute("aria-hidden") === "false") return;
    restorePopoverStyles(popover, true);
    delete popover.dataset.a3sPositioned;
    delete popover.dataset.resolvedAlign;
    delete popover.dataset.resolvedSide;
    popoverCleanupTimers.delete(popover);
  };

  const stopPopoverPositioning = (popover, immediate = false) => {
    positionedPopovers.delete(popover);
    popoverResizeObserver?.unobserve(popover);
    if (popover.parentElement)
      popoverResizeObserver?.unobserve(popover.parentElement);
    stopPopoverListeners();

    const cleanupTimer = popoverCleanupTimers.get(popover);
    if (cleanupTimer) clearTimeout(cleanupTimer);
    if (immediate) {
      finishPopoverCleanup(popover, true);
      return;
    }

    popoverCleanupTimers.set(
      popover,
      setTimeout(() => finishPopoverCleanup(popover), 200),
    );
  };

  const syncPopoverPositioning = (popover) => {
    if (popover.getAttribute("aria-hidden") === "false") {
      startPopoverPositioning(popover);
    } else {
      stopPopoverPositioning(popover);
    }
  };

  const registerComponent = (name, selectorOrOptions, initFunction) => {
    const options =
      typeof selectorOrOptions === "object"
        ? selectorOrOptions
        : { selector: selectorOrOptions, init: initFunction };

    componentRegistry[name] = {
      selector: options.selector,
      init: options.init,
      refresh: options.refresh,
    };
  };

  const initComponent = (element, componentName) => {
    const component = componentRegistry[componentName];
    if (!component) return;

    try {
      component.init(element);
      if (element.hasAttribute(`data-${componentName}-initialized`)) {
        element.dataset.basecoatComponent = componentName;
      }
    } catch (error) {
      console.error(`Failed to initialize ${componentName}:`, error);
      if (typeof element._destroy === "function") {
        try {
          element._destroy();
        } catch (destroyError) {
          console.error(
            `Failed to clean up ${componentName} after initialization error:`,
            destroyError,
          );
        }
      }
      delete element._destroy;
      element.removeAttribute(`data-${componentName}-initialized`);
      delete element.dataset.basecoatComponent;
    }
  };

  const destroyComponent = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    const componentName = element.dataset?.basecoatComponent;

    if (typeof element._destroy === "function") {
      try {
        element._destroy();
      } catch (error) {
        console.error("Failed to destroy A3S UI component:", error);
      }
    }

    delete element._destroy;
    if (componentName)
      element.removeAttribute(`data-${componentName}-initialized`);
    delete element.dataset.basecoatComponent;
  };

  const destroyRemovedComponents = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.isConnected) return;

    if (node.matches("[data-popover]")) stopPopoverPositioning(node, true);
    node
      .querySelectorAll("[data-popover]")
      .forEach((popover) => stopPopoverPositioning(popover, true));

    if (node.dataset?.basecoatComponent) destroyComponent(node);
    node
      .querySelectorAll("[data-basecoat-component]")
      .forEach(destroyComponent);
  };

  const uniqueElements = (elements) => Array.from(new Set(elements));

  const getComponentElements = (componentName, selector, force = false) => {
    const elements = Array.from(document.querySelectorAll(selector));
    if (force) {
      elements.push(
        ...document.querySelectorAll(
          `[data-basecoat-component="${componentName}"]`,
        ),
      );
    }
    return uniqueElements(elements);
  };

  const initAllComponents = (options = {}) => {
    const force = options.force === true;
    Object.entries(componentRegistry).forEach(([name, { selector }]) => {
      getComponentElements(name, selector, force).forEach((element) => {
        const wasComponent = element.dataset?.basecoatComponent === name;
        if (force) destroyComponent(element);
        if (wasComponent || element.matches(selector))
          initComponent(element, name);
      });
    });
  };

  const initNewComponents = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    Object.entries(componentRegistry).forEach(([name, { selector }]) => {
      if (node.matches(selector)) initComponent(node, name);
      node
        .querySelectorAll(selector)
        .forEach((element) => initComponent(element, name));
    });
  };

  const refreshComponent = (element) => {
    if (!element) return;
    if (typeof element.refresh === "function") {
      element.refresh();
      return;
    }

    const componentName = element.dataset?.basecoatComponent;
    const component = componentName ? componentRegistry[componentName] : null;
    if (component?.refresh) {
      component.refresh(element);
    }
  };

  const startObserver = () => {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(initNewComponents);
        mutation.removedNodes.forEach(destroyRemovedComponents);
        if (mutation.type !== "attributes") return;

        const target = mutation.target;
        if (target.matches("[data-popover]")) {
          syncPopoverPositioning(target);
          return;
        }
        if (target.closest("[data-popover][aria-hidden='false']")) {
          schedulePopoverPositioning();
        }
      });
    });

    observer.observe(document.body, {
      attributeFilter: ["aria-hidden"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    document
      .querySelectorAll("[data-popover][aria-hidden='false']")
      .forEach(startPopoverPositioning);
  };

  const stopObserver = () => {
    if (!observer) return;
    observer.disconnect();
    observer = null;
    positionedPopovers.forEach((popover) =>
      stopPopoverPositioning(popover, true),
    );
  };

  const initRegisteredComponent = (componentName, options = {}) => {
    const component = componentRegistry[componentName];
    if (!component) {
      console.warn(`Component '${componentName}' not found in registry`);
      return;
    }

    const force = options.force === true;
    getComponentElements(componentName, component.selector, force).forEach(
      (element) => {
        const wasComponent =
          element.dataset?.basecoatComponent === componentName;
        if (force) destroyComponent(element);
        if (wasComponent || element.matches(component.selector))
          initComponent(element, componentName);
      },
    );
  };

  const initAllRegisteredComponents = (options = {}) => {
    initAllComponents(options);
  };

  const setTheme = (mode) => {
    const dark = mode === "dark";
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("themeMode", dark ? "dark" : "light");
    } catch (_) {}
    const detail = {
      mode: dark ? "dark" : "light",
      preference: dark ? "dark" : "light",
    };
    document.dispatchEvent(new CustomEvent("a3s:themechange", { detail }));
    document.dispatchEvent(new CustomEvent("basecoat:themechange", { detail }));
  };

  const getTheme = () =>
    document.documentElement.classList.contains("dark") ? "dark" : "light";

  const runtime = {
    register: registerComponent,
    init: initRegisteredComponent,
    initAll: initAllRegisteredComponents,
    refresh: refreshComponent,
    start: startObserver,
    stop: stopObserver,
    theme: {
      get: getTheme,
      set: setTheme,
      toggle: () => setTheme(getTheme() === "dark" ? "light" : "dark"),
    },
  };
  window.a3sUI = runtime;
  window.basecoat = runtime;

  document.addEventListener("DOMContentLoaded", () => {
    initAllComponents();
    startObserver();
  });
})();
