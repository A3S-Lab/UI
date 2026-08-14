(() => {
  const states = new WeakMap();

  const reducedMotion = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  const resolveScrollOwner = (root) => {
    const selector = root.dataset.scrollTarget;
    if (selector) {
      try {
        const target = document.querySelector(selector);
        if (target) return target;
      } catch (_) {}
    }
    return root.closest("[data-scroll-owner]") || document.scrollingElement;
  };

  const metrics = (owner) => {
    if (
      owner === document.scrollingElement ||
      owner === document.documentElement ||
      owner === document.body
    ) {
      const element = document.scrollingElement || document.documentElement;
      return {
        distance: Math.max(
          0,
          element.scrollHeight - window.innerHeight - window.scrollY,
        ),
        scroll: (behavior) =>
          window.scrollTo({ behavior, top: element.scrollHeight }),
      };
    }
    return {
      distance: Math.max(
        0,
        owner.scrollHeight - owner.clientHeight - owner.scrollTop,
      ),
      scroll: (behavior) =>
        owner.scrollTo({ behavior, top: owner.scrollHeight }),
    };
  };

  const synchronize = (root, state, emit = true) => {
    const threshold = Math.max(0, Number(root.dataset.threshold) || 96);
    const visible =
      root.hasAttribute("data-always-visible") ||
      state.unread > 0 ||
      metrics(state.owner).distance > threshold;
    const changed = visible !== state.visible;
    state.visible = visible;
    root.hidden = !visible;
    root.dataset.state = visible
      ? state.unread > 0
        ? "unread"
        : "visible"
      : "hidden";
    root.setAttribute("aria-hidden", visible ? "false" : "true");
    if (changed && emit) {
      root.dispatchEvent(
        new CustomEvent("a3s:back-to-bottom-visibility-change", {
          bubbles: true,
          detail: { unread: state.unread, visible },
        }),
      );
    }
  };

  const refreshBackToBottom = (root) => {
    const state = states.get(root);
    if (!state) return;
    const owner = resolveScrollOwner(root);
    if (owner !== state.owner) {
      state.owner?.removeEventListener("scroll", state.handleScroll);
      state.owner = owner;
      state.owner?.addEventListener("scroll", state.handleScroll, {
        passive: true,
      });
    }
    state.count = root.querySelector("[data-unread-count]");
    synchronize(root, state, false);
  };

  const initBackToBottom = (root) => {
    if (root.dataset.backToBottomInitialized) return;
    const state = {
      count: root.querySelector("[data-unread-count]"),
      handleScroll: null,
      owner: resolveScrollOwner(root),
      unread: Math.max(0, Number(root.dataset.unread) || 0),
      visible: false,
    };
    states.set(root, state);

    root.getState = () => ({
      atBottom: metrics(state.owner).distance <= 1,
      unread: state.unread,
      visible: state.visible,
    });
    root.setUnread = (value) => {
      state.unread = Math.max(0, Number(value) || 0);
      root.dataset.unread = String(state.unread);
      if (state.count) {
        state.count.textContent = state.unread > 99 ? "99+" : String(state.unread);
        state.count.hidden = state.unread === 0;
      }
      synchronize(root, state);
      return root.getState();
    };
    root.scrollToBottom = (options = {}) => {
      const behavior =
        options.behavior || (reducedMotion() ? "auto" : "smooth");
      metrics(state.owner).scroll(behavior);
      if (options.clearUnread !== false) root.setUnread(0);
      root.dispatchEvent(
        new CustomEvent("a3s:back-to-bottom-activate", {
          bubbles: true,
          detail: { behavior, source: options.source || "api" },
        }),
      );
    };
    root.refresh = () => refreshBackToBottom(root);

    let frame = 0;
    state.handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        synchronize(root, state);
      });
    };
    const handleClick = () => root.scrollToBottom({ source: "user" });
    root.addEventListener("click", handleClick);
    state.owner?.addEventListener("scroll", state.handleScroll, {
      passive: true,
    });

    root._destroy = () => {
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener("click", handleClick);
      state.owner?.removeEventListener("scroll", state.handleScroll);
      states.delete(root);
      delete root.getState;
      delete root.refresh;
      delete root.scrollToBottom;
      delete root.setUnread;
    };

    root.dataset.backToBottomInitialized = "true";
    root.setUnread(state.unread);
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("back-to-bottom", {
      selector: ".back-to-bottom:not([data-back-to-bottom-initialized])",
      init: initBackToBottom,
      refresh: refreshBackToBottom,
    });
  }
})();
