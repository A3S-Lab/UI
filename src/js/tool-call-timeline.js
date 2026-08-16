(() => {
  const states = new WeakMap();
  const activeStates = new Set(["preparing", "running"]);
  const attentionStates = new Set(["awaiting", "waiting"]);
  const problemStates = new Set([
    "cancelled",
    "denied",
    "error",
    "failed",
    "interrupted",
    "timed-out",
  ]);
  const completeStates = new Set(["success", "succeeded"]);

  const calls = (root) =>
    Array.from(root.querySelectorAll("[data-tool-call-list] > li > .tool-call")).filter(
      (call) => call.closest(".tool-call-timeline") === root,
    );

  const summarize = (root) => {
    const items = calls(root);
    const summary = {
      active: 0,
      attention: 0,
      completed: 0,
      problems: 0,
      total: items.length,
    };
    items.forEach((call) => {
      const name = call.dataset.state || "preparing";
      if (activeStates.has(name)) summary.active += 1;
      else if (attentionStates.has(name)) summary.attention += 1;
      else if (problemStates.has(name)) summary.problems += 1;
      else if (completeStates.has(name)) summary.completed += 1;
    });
    summary.state = summary.attention
      ? "attention"
      : summary.problems
        ? "problem"
        : summary.active
          ? "running"
          : summary.total
            ? "complete"
            : "idle";
    return Object.freeze(summary);
  };

  const synchronize = (root, state, options = {}) => {
    const previous = state.summary;
    state.summary = summarize(root);
    if (root.dataset.state !== state.summary.state) {
      root.dataset.state = state.summary.state;
    }
    root.setAttribute("aria-busy", String(state.summary.active > 0));
    const output = root.querySelector("[data-tool-timeline-status]");
    if (output) {
      output.dataset.active = String(state.summary.active);
      output.dataset.attention = String(state.summary.attention);
      output.dataset.completed = String(state.summary.completed);
      output.dataset.problems = String(state.summary.problems);
      output.dataset.total = String(state.summary.total);
    }
    if (
      options.emit !== false &&
      JSON.stringify(previous) !== JSON.stringify(state.summary)
    ) {
      root.dispatchEvent(
        new CustomEvent("a3s:tool-timeline-change", {
          bubbles: true,
          detail: { current: state.summary, previous },
        }),
      );
    }
    return state.summary;
  };

  const setHistory = (root, state, expanded, options = {}) => {
    root.toggleAttribute("data-history-expanded", expanded);
    calls(root).forEach((call, index, items) => {
      const item = call.closest("li");
      if (!item || !item.hasAttribute("data-tool-history")) return;
      item.hidden = !expanded && index < items.length - state.visibleLimit;
    });
    root
      .querySelectorAll('[data-tool-timeline-action="expand-history"]')
      .forEach((action) => {
        action.hidden = expanded;
      });
    root
      .querySelectorAll('[data-tool-timeline-action="collapse-history"]')
      .forEach((action) => {
        action.hidden = !expanded;
      });
    if (options.emit !== false) {
      root.dispatchEvent(
        new CustomEvent("a3s:tool-timeline-visibility-change", {
          bubbles: true,
          detail: { expanded, source: options.source || "api" },
        }),
      );
    }
    return expanded;
  };

  const initToolCallTimeline = (root) => {
    if (root.dataset.toolCallTimelineInitialized) return;
    const state = {
      summary: Object.freeze({}),
      visibleLimit: Math.max(1, Number(root.dataset.visibleCalls) || 4),
    };
    states.set(root, state);
    const observer = new MutationObserver(() => synchronize(root, state));
    observer.observe(root, {
      attributeFilter: ["data-state"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest("[data-tool-timeline-action]");
      if (!action || action.closest(".tool-call-timeline") !== root) return;
      const value = action.dataset.toolTimelineAction;
      if (value === "expand-history") root.expandHistory({ source: "user" });
      if (value === "collapse-history") root.collapseHistory({ source: "user" });
    };
    root.addEventListener("click", handleClick);
    root.collapseHistory = (options = {}) => setHistory(root, state, false, options);
    root.expandHistory = (options = {}) => setHistory(root, state, true, options);
    root.getSummary = () => state.summary;
    root.refresh = () => synchronize(root, state);
    root._destroy = () => {
      observer.disconnect();
      root.removeEventListener("click", handleClick);
      states.delete(root);
      ["collapseHistory", "expandHistory", "getSummary", "refresh"].forEach(
        (method) => delete root[method],
      );
    };
    setHistory(root, state, root.hasAttribute("data-history-expanded"), {
      emit: false,
      source: "initialization",
    });
    synchronize(root, state, { emit: false });
    root.dataset.toolCallTimelineInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("tool-call-timeline", {
      selector:
        ".tool-call-timeline:not([data-tool-call-timeline-initialized])",
      init: initToolCallTimeline,
      refresh: (root) => root.refresh?.(),
    });
  }
})();
