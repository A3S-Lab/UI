(() => {
  const states = new WeakMap();
  const clamp = (value, minimum, maximum) =>
    Math.min(maximum, Math.max(minimum, value));

  const getElements = (root) => ({
    caption: root.querySelector("figcaption, [data-image-viewer-caption]"),
    image: root.querySelector("img"),
  });

  const synchronize = (root, state) => {
    root.dataset.state = root.hasAttribute("open") ? state.status : "closed";
    root.style.setProperty("--image-viewer-zoom", String(state.zoom));
    root.style.setProperty("--image-viewer-rotation", `${state.rotation}deg`);
  };

  const finalizeClose = (root, state, restoreFocus = true) => {
    state.status = "closed";
    synchronize(root, state);
    if (restoreFocus && state.trigger?.isConnected)
      state.trigger.focus({ preventScroll: true });
    state.trigger = null;
  };

  const refreshImageViewer = (root) => {
    const state = states.get(root);
    if (!state) return;
    Object.assign(state, getElements(root));
    synchronize(root, state);
  };

  const initImageViewer = (root) => {
    if (root.dataset.imageViewerInitialized) return;
    const ownOpenDescriptor = Object.getOwnPropertyDescriptor(root, "open");
    const nativeClose = root.close.bind(root);
    const elements = getElements(root);
    if (!elements.image) return;
    const state = {
      ...elements,
      rotation: 0,
      status: root.hasAttribute("open") ? "open" : "closed",
      trigger: null,
      restoreFocus: true,
      zoom: 1,
    };
    states.set(root, state);

    root.getState = () => ({
      open: root.hasAttribute("open"),
      rotation: state.rotation,
      source: state.image.currentSrc || state.image.src,
      status: state.status,
      zoom: state.zoom,
    });
    root.reset = (options = {}) => {
      state.rotation = 0;
      state.zoom = 1;
      synchronize(root, state);
      if (options.emit !== false) {
        root.dispatchEvent(
          new CustomEvent("a3s:image-viewer-change", {
            bubbles: true,
            detail: { ...root.getState(), source: options.source || "api" },
          }),
        );
      }
      return root.getState();
    };
    root.zoom = (value, options = {}) => {
      const numeric = Number(value);
      state.zoom = clamp(
        options.relative ? state.zoom + numeric : numeric,
        Number(root.dataset.minZoom) || 0.25,
        Number(root.dataset.maxZoom) || 4,
      );
      synchronize(root, state);
      root.dispatchEvent(
        new CustomEvent("a3s:image-viewer-change", {
          bubbles: true,
          detail: { ...root.getState(), source: options.source || "api" },
        }),
      );
      return state.zoom;
    };
    root.rotate = (degrees = 90, options = {}) => {
      state.rotation = (state.rotation + Number(degrees || 0)) % 360;
      synchronize(root, state);
      root.dispatchEvent(
        new CustomEvent("a3s:image-viewer-change", {
          bubbles: true,
          detail: { ...root.getState(), source: options.source || "api" },
        }),
      );
      return state.rotation;
    };
    root.openViewer = (source, options = {}) => {
      const trigger = options.trigger || document.activeElement;
      const detail = {
        source: typeof source === "string" ? source : source?.src,
        trigger,
      };
      const before = new CustomEvent("a3s:image-viewer-before-open", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (!root.dispatchEvent(before)) return false;
      state.trigger = trigger instanceof HTMLElement ? trigger : null;
      state.restoreFocus = options.restoreFocus !== false;
      if (detail.source) {
        state.status = "loading";
        state.image.src = detail.source;
      }
      if (options.alt !== undefined) state.image.alt = options.alt;
      if (state.caption && options.caption !== undefined)
        state.caption.textContent = options.caption;
      root.reset({ emit: false });
      if (!root.hasAttribute("open")) {
        try {
          root.showModal();
        } catch (_) {
          root.setAttribute("open", "");
        }
      }
      if (!detail.source || state.image.complete) state.status = "open";
      synchronize(root, state);
      if (options.focus !== false)
        queueMicrotask(() =>
          root
            .querySelector(
              "[data-image-viewer-toolbar] button:not(:disabled), [data-image-viewer-toolbar] [href]",
            )
            ?.focus({ preventScroll: true }),
        );
      root.dispatchEvent(
        new CustomEvent("a3s:image-viewer-open", {
          bubbles: true,
          detail: { ...root.getState(), trigger: state.trigger },
        }),
      );
      return true;
    };
    Object.defineProperty(root, "open", {
      configurable: true,
      value: root.openViewer,
      writable: true,
    });
    root.close = (returnValue = "", options = {}) => {
      if (!root.hasAttribute("open")) return true;
      state.restoreFocus = options.restoreFocus !== false;
      nativeClose(String(returnValue || ""));
      finalizeClose(root, state, state.restoreFocus);
      return true;
    };
    root.refresh = () => refreshImageViewer(root);

    const handleClick = (event) => {
      const action = event.target.closest("[data-image-viewer-action]");
      if (!action || !root.contains(action)) return;
      const value = action.dataset.imageViewerAction;
      if (value === "close") root.close("", { restoreFocus: true });
      if (value === "reset") root.reset({ source: "user" });
      if (value === "rotate")
        root.rotate(Number(action.dataset.degrees) || 90, { source: "user" });
      if (value === "zoom-in")
        root.zoom(0.25, { relative: true, source: "user" });
      if (value === "zoom-out")
        root.zoom(-0.25, { relative: true, source: "user" });
    };
    const handleWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      root.zoom(event.deltaY > 0 ? -0.15 : 0.15, {
        relative: true,
        source: "wheel",
      });
    };
    const handleLoad = () => {
      state.status = "open";
      synchronize(root, state);
    };
    const handleError = () => {
      state.status = "error";
      synchronize(root, state);
    };
    const handleCancel = (event) => {
      if (root.dataset.dismissible === "false") event.preventDefault();
    };
    const handleClose = () => finalizeClose(root, state, state.restoreFocus);
    root.addEventListener("click", handleClick);
    root.addEventListener("wheel", handleWheel, { passive: false });
    root.addEventListener("cancel", handleCancel);
    root.addEventListener("close", handleClose);
    state.image.addEventListener("load", handleLoad);
    state.image.addEventListener("error", handleError);
    root._destroy = () => {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("wheel", handleWheel);
      root.removeEventListener("cancel", handleCancel);
      root.removeEventListener("close", handleClose);
      state.image.removeEventListener("load", handleLoad);
      state.image.removeEventListener("error", handleError);
      root.close = nativeClose;
      if (ownOpenDescriptor)
        Object.defineProperty(root, "open", ownOpenDescriptor);
      else delete root.open;
      delete root.openViewer;
      delete root.getState;
      delete root.refresh;
      delete root.reset;
      delete root.rotate;
      delete root.zoom;
      states.delete(root);
    };

    root.dataset.imageViewerInitialized = "true";
    if (root.hasAttribute("open")) state.status = "open";
    synchronize(root, state);
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("image-viewer", {
      selector: ".image-viewer:not([data-image-viewer-initialized])",
      init: initImageViewer,
      refresh: refreshImageViewer,
    });
  }
})();
