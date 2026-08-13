(() => {
  const toasterStates = new WeakMap();
  const toasts = new WeakMap();
  const ICONS = {
    success:
      '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    error:
      '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    info: '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    warning:
      '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  };

  function initToaster(toasterElement) {
    if (toasterElement.dataset.toasterInitialized) return;

    const state = {
      pauseReasons: new Set(),
    };
    toasterStates.set(toasterElement, state);

    const handleClick = (event) => {
      const control = event.target.closest(
        ".toast footer [data-toast-action], .toast footer [data-toast-cancel]",
      );
      if (control) closeToast(control.closest(".toast"));
    };
    const handleMouseEnter = () => pauseTimeouts(toasterElement, "pointer");
    const handleMouseLeave = () => resumeTimeouts(toasterElement, "pointer");
    const handleFocusIn = () => pauseTimeouts(toasterElement, "focus");
    const handleFocusOut = (event) => {
      if (!toasterElement.contains(event.relatedTarget)) {
        resumeTimeouts(toasterElement, "focus");
      }
    };

    toasterElement.addEventListener("mouseenter", handleMouseEnter);
    toasterElement.addEventListener("mouseleave", handleMouseLeave);
    toasterElement.addEventListener("focusin", handleFocusIn);
    toasterElement.addEventListener("focusout", handleFocusOut);
    toasterElement.addEventListener("click", handleClick);

    toasterElement.toast = (config = {}) => {
      const toastElement = createToast(config);
      toasterElement.appendChild(toastElement);
      initToast(toastElement);
      return toastElement;
    };
    toasterElement.closeAll = () => {
      toasterElement
        .querySelectorAll('.toast:not([aria-hidden="true"])')
        .forEach(closeToast);
    };

    toasterElement
      .querySelectorAll(".toast:not([data-toast-initialized])")
      .forEach(initToast);
    toasterElement._destroy = () => {
      toasterElement.removeEventListener("mouseenter", handleMouseEnter);
      toasterElement.removeEventListener("mouseleave", handleMouseLeave);
      toasterElement.removeEventListener("focusin", handleFocusIn);
      toasterElement.removeEventListener("focusout", handleFocusOut);
      toasterElement.removeEventListener("click", handleClick);
      toasterElement
        .querySelectorAll(".toast[data-toast-initialized]")
        .forEach((toast) => toast._destroy?.());
      toasterStates.delete(toasterElement);
      delete toasterElement.toast;
      delete toasterElement.closeAll;
    };
    toasterElement.dataset.toasterInitialized = "true";
    toasterElement.dispatchEvent(new CustomEvent("basecoat:initialized"));
  }

  function initToast(element) {
    if (element.dataset.toastInitialized) return;

    const parsedDuration = Number.parseInt(element.dataset.duration, 10);
    const timeoutDuration =
      parsedDuration === -1
        ? -1
        : parsedDuration ||
          (element.dataset.category === "error" ? 5000 : 3000);
    const owner = element.closest(".toaster");
    const state = {
      closed: false,
      owner,
      remainingTime: timeoutDuration,
      startTime: null,
      timeoutId: null,
    };
    toasts.set(element, state);

    if (
      timeoutDuration !== -1 &&
      !toasterStates.get(owner)?.pauseReasons.size
    ) {
      startTimeout(element, state);
    }

    element.close = () => closeToast(element);
    element._destroy = () => {
      clearTimeout(state.timeoutId);
      toasts.delete(element);
      delete element.close;
    };
    element.dataset.toastInitialized = "true";
  }

  function startTimeout(element, state) {
    if (state.closed || state.remainingTime === -1 || state.timeoutId) return;
    if (state.remainingTime <= 0) {
      closeToast(element);
      return;
    }

    state.startTime = Date.now();
    state.timeoutId = setTimeout(
      () => closeToast(element),
      state.remainingTime,
    );
  }

  function pauseTimeouts(toasterElement, reason) {
    const toasterState = toasterStates.get(toasterElement);
    if (!toasterState || toasterState.pauseReasons.has(reason)) return;

    const wasPaused = toasterState.pauseReasons.size > 0;
    toasterState.pauseReasons.add(reason);
    if (wasPaused) return;

    toasterElement
      .querySelectorAll('.toast:not([aria-hidden="true"])')
      .forEach((element) => {
        const state = toasts.get(element);
        if (!state?.timeoutId) return;

        clearTimeout(state.timeoutId);
        state.timeoutId = null;
        state.remainingTime = Math.max(
          0,
          state.remainingTime - (Date.now() - state.startTime),
        );
        state.startTime = null;
      });
  }

  function resumeTimeouts(toasterElement, reason) {
    const toasterState = toasterStates.get(toasterElement);
    if (!toasterState || !toasterState.pauseReasons.has(reason)) return;

    toasterState.pauseReasons.delete(reason);
    if (toasterState.pauseReasons.size > 0) return;

    toasterElement
      .querySelectorAll('.toast:not([aria-hidden="true"])')
      .forEach((element) => {
        const state = toasts.get(element);
        if (state) startTimeout(element, state);
      });
  }

  function closeToast(element) {
    const state = element ? toasts.get(element) : null;
    if (!state || state.closed) return;

    state.closed = true;
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
    element.setAttribute("aria-hidden", "true");

    let fallbackId;
    const remove = () => {
      clearTimeout(fallbackId);
      element.removeEventListener("transitionend", handleTransitionEnd);
      element.remove();
    };
    const handleTransitionEnd = (event) => {
      if (event.target === element) remove();
    };
    element.addEventListener("transitionend", handleTransitionEnd);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    fallbackId = setTimeout(remove, reducedMotion ? 0 : 350);
  }

  function appendIcon(content, icon) {
    if (icon instanceof Element) {
      content.append(icon.cloneNode(true));
      return;
    }
    if (typeof icon !== "string" || !icon.trim()) return;

    const template = document.createElement("template");
    template.innerHTML = icon.trim();
    const iconElement = template.content.firstElementChild;
    if (iconElement) content.append(iconElement);
  }

  function appendAction(footer, config, type) {
    if (!config?.label) return;

    const control =
      type === "action" && config.href
        ? document.createElement("a")
        : document.createElement("button");
    if (control instanceof HTMLButtonElement) control.type = "button";
    if (control instanceof HTMLAnchorElement) control.href = config.href;
    control.className = "btn";
    control.dataset[type === "action" ? "toastAction" : "toastCancel"] = "";
    if (type === "cancel") control.dataset.variant = "outline";
    control.textContent = String(config.label);

    const onClick = config.onClick ?? config.onclick;
    if (typeof onClick === "function") {
      control.addEventListener("click", onClick);
    }
    footer.append(control);
  }

  function createToast(config) {
    const {
      category = "info",
      title,
      description,
      action,
      cancel,
      duration,
      icon,
    } = config;

    const toastElement = document.createElement("div");
    toastElement.className = "toast";
    toastElement.setAttribute(
      "role",
      category === "error" ? "alert" : "status",
    );
    toastElement.setAttribute("aria-atomic", "true");
    if (category) toastElement.dataset.category = String(category);
    if (duration !== undefined)
      toastElement.dataset.duration = String(duration);

    const content = document.createElement("div");
    content.className = "toast-content";
    appendIcon(content, icon || (category && ICONS[category]));

    const message = document.createElement("section");
    if (title !== undefined && title !== null && title !== "") {
      const heading = document.createElement("h2");
      heading.textContent = String(title);
      message.append(heading);
    }
    if (
      description !== undefined &&
      description !== null &&
      description !== ""
    ) {
      const paragraph = document.createElement("p");
      paragraph.textContent = String(description);
      message.append(paragraph);
    }
    content.append(message);

    if (action?.label || cancel?.label) {
      const footer = document.createElement("footer");
      appendAction(footer, action, "action");
      appendAction(footer, cancel, "cancel");
      content.append(footer);
    }

    toastElement.append(content);
    return toastElement;
  }

  if (window.basecoat) {
    window.basecoat.register(
      "toaster",
      ".toaster:not([data-toaster-initialized])",
      initToaster,
    );
    window.basecoat.register(
      "toast",
      ".toast:not([data-toast-initialized])",
      initToast,
    );
  }
})();
