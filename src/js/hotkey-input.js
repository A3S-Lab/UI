(() => {
  const states = new WeakMap();
  const modifierOrder = ["Control", "Alt", "Shift", "Meta"];
  const modifierKeys = new Set(modifierOrder);
  const ignoredKeys = new Set([
    "AltGraph",
    "Compose",
    "Dead",
    "Process",
    "Unidentified",
  ]);
  const keyAliases = new Map([
    [" ", "Space"],
    ["+", "Plus"],
    ["alt", "Alt"],
    ["cmd", "Meta"],
    ["command", "Meta"],
    ["control", "Control"],
    ["ctrl", "Control"],
    ["esc", "Escape"],
    ["meta", "Meta"],
    ["option", "Alt"],
    ["os", "Meta"],
    ["plus", "Plus"],
    ["shift", "Shift"],
    ["space", "Space"],
  ]);

  const isDisabled = (root, state) =>
    state.input?.disabled ||
    root.hasAttribute("data-disabled") ||
    state.authoredState === "disabled" ||
    root.getAttribute("aria-disabled") === "true";

  const resolveRestingState = (root, state) => {
    if (isDisabled(root, state)) return "disabled";
    if (
      root.getAttribute("aria-invalid") === "true" ||
      state.input?.getAttribute("aria-invalid") === "true" ||
      state.authoredState === "invalid"
    ) {
      return "invalid";
    }
    return "ready";
  };

  const describedElements = (input) =>
    String(input?.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter(Boolean);

  const getElements = (root) => {
    const input = root.querySelector("input");
    return {
      clear: root.querySelector("[data-hotkey-clear]"),
      feedback:
        describedElements(input).find((element) =>
          element.hasAttribute("data-hotkey-feedback"),
        ) || null,
      input,
      preview: root.querySelector("[data-hotkey-preview]"),
      status: root.querySelector("[data-hotkey-status]"),
    };
  };

  const normalizeKey = (key) => {
    const alias = keyAliases.get(key) || keyAliases.get(key.toLowerCase());
    if (alias) return alias;
    if (/^[a-z]$/i.test(key)) return key.toUpperCase();
    return key;
  };

  const parseCandidate = (value) => {
    const rawValue = String(value || "").trim();
    const parts = (rawValue === "+" ? ["Plus"] : rawValue.split("+"))
      .map((part) => part.trim())
      .filter(Boolean)
      .map(normalizeKey);
    const modifiers = modifierOrder.filter((modifier) =>
      parts.includes(modifier),
    );
    const keys = parts.filter((part) => !modifierKeys.has(part));
    const normalizedParts = [...modifiers, ...keys];
    return {
      canonical: normalizedParts.join("+"),
      modifierOnly: rawValue.length > 0 && keys.length === 0,
      parts: normalizedParts,
      rawValue,
      valid: rawValue.length === 0 || keys.length === 1,
    };
  };

  const parseValue = (value) => parseCandidate(value).parts;

  const eventValue = (event) => {
    const parts = [];
    if (event.ctrlKey) parts.push("Control");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");
    if (event.metaKey) parts.push("Meta");
    const key = normalizeKey(event.key);
    if (!modifierKeys.has(key)) parts.push(key);
    return parts;
  };

  const keyLabel = (key) => {
    const apple = /Mac|iPhone|iPad/.test(navigator.platform || "");
    const labels = apple
      ? {
          Alt: "⌥",
          Control: "⌃",
          Meta: "⌘",
          Plus: "+",
          Shift: "⇧",
        }
      : {
          Alt: "Alt",
          Control: "Ctrl",
          Meta: "Meta",
          Plus: "+",
          Shift: "Shift",
        };
    return labels[key] || key;
  };

  const restoreManagedInvalidState = (state) => {
    if (!state.ownsInputInvalid || !state.input) return;
    if (state.previousInputInvalid === null) {
      state.input.removeAttribute("aria-invalid");
    } else {
      state.input.setAttribute("aria-invalid", state.previousInputInvalid);
    }
    state.ownsInputInvalid = false;
    state.previousInputInvalid = null;
  };

  const clearRejection = (root, state) => {
    state.rejected = false;
    state.rejectionMessage = "";
    state.modifierOnly = false;
    root.removeAttribute("data-hotkey-rejected");
    restoreManagedInvalidState(state);
  };

  const recordingMessage = (root, state) =>
    state.modifierOnly
      ? root.dataset.modifierMessage || "Add a non-modifier key."
      : root.dataset.recordingMessage || state.recordingPlaceholder;

  const currentValueAnnouncement = (root, state) => {
    const renderedValue = parseValue(state.committedValue)
      .map(keyLabel)
      .join(" + ");
    return state.committedValue
      ? `${root.dataset.recordedAnnouncement || "Current shortcut"}: ${renderedValue}`
      : root.dataset.emptyAnnouncement || "No shortcut assigned.";
  };

  const announce = (state, message) => {
    if (state.status) state.status.textContent = message;
  };

  const synchronize = (root, state) => {
    if (!state.recording && !state.rejected) {
      state.restingState = resolveRestingState(root, state);
    }
    const renderedState = state.recording
      ? "recording"
      : state.rejected
        ? "invalid"
        : state.restingState;
    root.dataset.state = renderedState;
    state.renderedState = renderedState;
    root.dataset.hotkeyValue = state.value;
    root.dataset.hasValue = String(Boolean(state.value));
    if (state.recording) root.setAttribute("aria-busy", "true");
    else root.removeAttribute("aria-busy");
    root.toggleAttribute("data-hotkey-rejected", state.rejected);

    if (state.input) {
      state.input.value = state.recording ? "" : state.value;
      state.input.readOnly = true;
      state.input.autocomplete = "off";
      state.input.inputMode = "none";
      state.input.spellcheck = false;
      state.input.placeholder = state.recording
        ? state.recordingPlaceholder
        : state.idlePlaceholder;
      state.input.removeAttribute("aria-keyshortcuts");
      if (state.rejected) {
        if (!state.ownsInputInvalid) {
          state.previousInputInvalid = state.input.getAttribute("aria-invalid");
          state.ownsInputInvalid = true;
        }
        state.input.setAttribute("aria-invalid", "true");
      }
    }

    if (state.preview) {
      state.preview.replaceChildren(
        ...parseValue(state.value).map((key) => {
          const element = document.createElement("kbd");
          element.className = "kbd";
          element.textContent = keyLabel(key);
          return element;
        }),
      );
      state.preview.setAttribute("aria-hidden", "true");
      state.preview.hidden = !state.value || state.recording;
    }

    if (state.clear) {
      state.clear.hidden = !state.value || state.recording;
      state.clear.disabled = isDisabled(root, state);
      state.clear.tabIndex = -1;
    }

    if (state.feedback) {
      state.feedback.textContent = state.recording
        ? recordingMessage(root, state)
        : state.rejected
          ? state.rejectionMessage
          : state.idleFeedback;
      state.feedback.toggleAttribute("data-error", renderedState === "invalid");
    }

    if (state.status) {
      state.status.textContent = state.recording
        ? state.modifierOnly
          ? root.dataset.modifierAnnouncement || recordingMessage(root, state)
          : root.dataset.recordingAnnouncement ||
            "Recording shortcut. Press a key combination, or Escape to cancel."
        : state.rejected
          ? state.rejectionMessage ||
            root.dataset.rejectedAnnouncement ||
            "That shortcut is unavailable. Choose another."
          : currentValueAnnouncement(root, state);
    }
  };

  const emitRecordingChange = (root, recording, source, detail = {}) => {
    root.dispatchEvent(
      new CustomEvent("a3s:hotkey-recording-change", {
        bubbles: true,
        detail: { recording, source, ...detail },
      }),
    );
  };

  const refreshHotkeyInput = (root) => {
    const state = states.get(root);
    if (!state) return;
    if (root.dataset.state && root.dataset.state !== state.renderedState) {
      state.authoredState = root.dataset.state;
    }
    Object.assign(state, getElements(root));
    if (state.feedback && !state.recording && !state.rejected) {
      state.idleFeedback = state.feedback.textContent.trim();
    }
    if (state.recording && isDisabled(root, state)) {
      state.recording = false;
      state.value = state.committedValue;
    }
    synchronize(root, state);
  };

  const initHotkeyInput = (root) => {
    if (root.dataset.hotkeyInputInitialized) return;
    const elements = getElements(root);
    if (!elements.input) return;
    const state = {
      ...elements,
      authoredState: root.dataset.state || "ready",
      clearTabIndex: elements.clear?.getAttribute("tabindex") ?? null,
      idleFeedback: elements.feedback?.textContent.trim() || "",
      idlePlaceholder: elements.input.getAttribute("placeholder") || "",
      modifierOnly: false,
      ownsInputInvalid: false,
      previousInputInvalid: null,
      committedValue: root.dataset.hotkeyValue || elements.input.value || "",
      recording: false,
      recordingSequence: 0,
      recordingPlaceholder:
        root.dataset.recordingPlaceholder || "Press a key combination…",
      rejected: false,
      rejectionMessage: "",
      renderedState: "ready",
      restingState: "ready",
      value: root.dataset.hotkeyValue || elements.input.value || "",
    };
    states.set(root, state);

    const rejectCandidate = (value, previousValue, source, message) => {
      const wasRecording = state.recording;
      state.recording = false;
      state.value = state.committedValue;
      state.modifierOnly = false;
      state.rejected = true;
      state.rejectionMessage =
        String(message || "").trim() ||
        root.dataset.rejectedAnnouncement ||
        "That shortcut is unavailable. Choose another.";
      synchronize(root, state);
      if (wasRecording) {
        emitRecordingChange(root, false, source, { rejected: true });
      }
      root.dispatchEvent(
        new CustomEvent("a3s:hotkey-rejected", {
          bubbles: true,
          detail: {
            message: state.rejectionMessage,
            previousValue,
            source,
            value,
          },
        }),
      );
      return false;
    };

    root.getValue = () => state.committedValue;
    root.setValue = (value, options = {}) => {
      const candidate = parseCandidate(value);
      const nextValue = candidate.canonical;
      const source = options.source || "api";
      if (candidate.modifierOnly) {
        return rejectCandidate(
          nextValue,
          state.committedValue,
          source,
          root.dataset.modifierMessage || "Add a non-modifier key.",
        );
      }
      if (!candidate.valid) {
        return rejectCandidate(
          candidate.rawValue,
          state.committedValue,
          source,
          root.dataset.invalidMessage ||
            "Enter one complete key combination at a time.",
        );
      }
      if (nextValue === state.committedValue && !options.force) {
        state.value = state.committedValue;
        clearRejection(root, state);
        synchronize(root, state);
        return true;
      }

      const changeDetail = {
        previousValue: state.committedValue,
        source,
        value: nextValue,
      };
      let rejectionMessage = "";
      const beforeDetail = {
        ...changeDetail,
        reject(message) {
          rejectionMessage = String(message || "").trim();
        },
      };
      const before = new CustomEvent("a3s:hotkey-before-change", {
        bubbles: true,
        cancelable: true,
        detail: beforeDetail,
      });
      const accepted = root.dispatchEvent(before);
      if (!accepted || rejectionMessage) {
        return rejectCandidate(
          nextValue,
          state.committedValue,
          source,
          rejectionMessage,
        );
      }

      state.committedValue = nextValue;
      state.value = nextValue;
      clearRejection(root, state);
      synchronize(root, state);
      if (!nextValue && changeDetail.previousValue) {
        announce(
          state,
          root.dataset.clearedAnnouncement || "Shortcut cleared.",
        );
      }
      root.dispatchEvent(
        new CustomEvent("a3s:hotkey-change", {
          bubbles: true,
          detail: changeDetail,
        }),
      );
      return true;
    };
    root.clear = (options = {}) => root.setValue("", options);
    root.start = (options = {}) => {
      if (isDisabled(root, state)) return false;
      if (state.recording) return true;
      state.recordingSequence += 1;
      state.value = state.committedValue;
      state.recording = true;
      clearRejection(root, state);
      synchronize(root, state);
      if (options.focus !== false) {
        state.input.focus({ preventScroll: true });
      }
      emitRecordingChange(root, true, options.source || "api");
      return true;
    };
    root.stop = (options = {}) => {
      if (!state.recording) return true;
      const source = options.source || "api";
      const draftValue = state.value;
      const shouldCommitDraft = options.commitDraft === true;
      if (
        shouldCommitDraft &&
        draftValue !== state.committedValue &&
        !root.setValue(draftValue, { source })
      ) {
        return false;
      }
      state.recording = false;
      state.modifierOnly = false;
      state.value = state.committedValue;
      synchronize(root, state);
      if (options.restore) {
        const cancelled =
          root.dataset.cancelledAnnouncement || "Shortcut change cancelled.";
        announce(
          state,
          `${cancelled} ${currentValueAnnouncement(root, state)}`,
        );
      }
      emitRecordingChange(root, false, source, {
        restored: Boolean(options.restore),
      });
      return true;
    };
    root.refresh = () => refreshHotkeyInput(root);

    const handleFocus = () => root.start({ focus: false, source: "focus" });
    const handleBlur = () => {
      if (!state.recording) return;
      const recordingSequence = state.recordingSequence;
      queueMicrotask(() => {
        if (!state.recording || recordingSequence !== state.recordingSequence) {
          return;
        }
        if (!document.hasFocus() || document.visibilityState === "hidden") {
          root.stop({ restore: true, source: "window-blur" });
          return;
        }
        root.stop({ commitDraft: true, source: "blur" });
      });
    };
    const handleKeydown = (event) => {
      if (event.target !== state.input || event.isComposing) return;
      if (!state.recording) {
        if (
          ["Backspace", "Delete"].includes(event.key) &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          root.start({ focus: false, source: "keyboard" });
          state.value = "";
          synchronize(root, state);
          return;
        }
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          root.start({ focus: false, source: "keyboard" });
        }
        return;
      }
      if (event.key === "Tab") {
        root.stop({ commitDraft: true, source: "keyboard" });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        root.stop({ restore: true, source: "keyboard" });
        return;
      }
      if (
        ["Backspace", "Delete"].includes(event.key) &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        state.value = "";
        state.modifierOnly = false;
        synchronize(root, state);
        return;
      }
      if (ignoredKeys.has(event.key)) return;
      const normalizedKey = normalizeKey(event.key);
      if (modifierKeys.has(normalizedKey)) {
        event.preventDefault();
        state.modifierOnly = true;
        synchronize(root, state);
        return;
      }
      const parts = eventValue(event);
      if (parts.length === 0) return;
      event.preventDefault();
      state.modifierOnly = false;
      if (root.setValue(parts.join("+"), { source: "keyboard" })) {
        root.stop({ source: "keyboard" });
      }
    };
    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-hotkey-clear]")) {
        event.preventDefault();
        if (isDisabled(root, state)) return;
        root.start({ source: "clear" });
        state.value = "";
        state.modifierOnly = false;
        synchronize(root, state);
        return;
      }
      if (target === state.input && !state.recording) {
        root.start({ focus: false, source: "pointer" });
      }
    };
    const handleWindowBlur = () => {
      if (state.recording) {
        root.stop({ restore: true, source: "window-blur" });
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && state.recording) {
        root.stop({ restore: true, source: "visibility-change" });
      }
    };

    state.input.addEventListener("focus", handleFocus);
    state.input.addEventListener("blur", handleBlur);
    state.input.addEventListener("keydown", handleKeydown);
    root.addEventListener("click", handleClick);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    root._destroy = () => {
      state.input.removeEventListener("focus", handleFocus);
      state.input.removeEventListener("blur", handleBlur);
      state.input.removeEventListener("keydown", handleKeydown);
      root.removeEventListener("click", handleClick);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (state.clear) {
        if (state.clearTabIndex === null) {
          state.clear.removeAttribute("tabindex");
        } else {
          state.clear.setAttribute("tabindex", state.clearTabIndex);
        }
      }
      restoreManagedInvalidState(state);
      states.delete(root);
      delete root.clear;
      delete root.getValue;
      delete root.refresh;
      delete root.setValue;
      delete root.start;
      delete root.stop;
    };

    root.dataset.hotkeyInputInitialized = "true";
    synchronize(root, state);
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("hotkey-input", {
      selector: ".hotkey-input:not([data-hotkey-input-initialized])",
      init: initHotkeyInput,
      refresh: refreshHotkeyInput,
    });
  }
})();
