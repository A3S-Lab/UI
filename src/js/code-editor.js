(() => {
  const states = new WeakMap();

  const getLabel = (root, name, fallback) =>
    root.dataset[name] === undefined ? fallback : root.dataset[name];

  const getNumber = (root, name, fallback) => {
    const value = Number.parseInt(root.dataset[name] ?? "", 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const lineCount = (value) => (value ? value.split("\n").length : 1);

  // Keep the count useful for compact form editors: line breaks are represented
  // by the line count rather than counted as content characters.
  const characterCount = (value) =>
    Array.from(value).filter(
      (character) => character !== "\n" && character !== "\r",
    ).length;

  const positionAt = (value, offset) => {
    const safeOffset = Math.max(0, Math.min(offset, value.length));
    const before = value.slice(0, safeOffset);
    const line = lineCount(before);
    const lastBreak = before.lastIndexOf("\n");
    const column = safeOffset - lastBreak;
    return { line, column };
  };

  const getTextarea = (root) =>
    root.querySelector(":scope > section > textarea") ||
    root.querySelector("textarea");

  const getGutter = (root, textarea) => {
    const section = root.querySelector(":scope > section");
    if (!section || !textarea || textarea.parentElement !== section) {
      return { gutter: null, generated: false };
    }

    const existing = section.querySelector(
      ":scope > [data-code-editor-gutter]",
    );
    if (existing) return { gutter: existing, generated: false };

    const gutter = document.createElement("div");
    gutter.dataset.codeEditorGutter = "";
    gutter.setAttribute("aria-hidden", "true");
    gutter.setAttribute("role", "presentation");
    section.insertBefore(gutter, textarea);
    return { gutter, generated: true };
  };

  const lineText = (root, count) => {
    const gutter = root.querySelector(
      ":scope > section > [data-code-editor-gutter]",
    );
    if (!gutter) return;
    const previousCount = Number(gutter.dataset.lineCount || 0);
    if (previousCount === count) return;

    const fragment = document.createDocumentFragment();
    for (let index = 1; index <= count; index += 1) {
      const line = document.createElement("span");
      line.textContent = String(index);
      line.dataset.line = String(index);
      fragment.appendChild(line);
    }
    gutter.replaceChildren(fragment);
    gutter.dataset.lineCount = String(count);
  };

  const formatCount = (count, singular, plural) =>
    `${count} ${count === 1 ? singular : plural}`;

  const formatPosition = (root, line, column) => {
    const template = getLabel(root, "labelPosition", "Ln {line}, Col {column}");
    return template
      .replace("{line}", String(line))
      .replace("{column}", String(column));
  };

  const errorPosition = (error, value) => {
    const message = error instanceof Error ? error.message : "";
    const match = message.match(/position\s+(\d+)/i);
    const offset = match ? Number.parseInt(match[1], 10) : -1;
    if (!Number.isFinite(offset) || offset < 0) return null;
    return positionAt(value, offset);
  };

  const validationFor = (root) => {
    const validation = (root.dataset.validation || "").toLowerCase();
    if (root.dataset.validation !== undefined) {
      return validation === "json" ? "json" : "";
    }
    return (root.dataset.language || "").toLowerCase() === "json" ? "json" : "";
  };

  const emit = (root, name, detail) => {
    root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    if (name.startsWith("a3s:")) {
      root.dispatchEvent(
        new CustomEvent(name.replace("a3s:", "basecoat:"), {
          bubbles: true,
          detail,
        }),
      );
    }
  };

  const updateDirty = (root, state) => {
    const dirty = Boolean(
      state.textarea && state.textarea.value !== state.cleanValue,
    );
    root.dataset.dirty = String(dirty);

    const stateElement = root.querySelector("[data-code-editor-state]");
    if (!stateElement) return dirty;

    if (state.textarea?.disabled || root.dataset.disabled === "true") {
      stateElement.textContent = getLabel(root, "labelDisabled", "Disabled");
    } else if (state.textarea?.readOnly) {
      stateElement.textContent = getLabel(root, "labelReadonly", "Read only");
    } else if (dirty) {
      stateElement.textContent = getLabel(
        root,
        "labelDirty",
        "Unsaved changes",
      );
    } else {
      stateElement.textContent = getLabel(root, "labelSaved", "Saved");
    }
    return dirty;
  };

  const updateValidation = (root, state) => {
    const validation = validationFor(root);
    const message = root.querySelector("[data-code-editor-message]");
    if (!validation || !state.textarea) {
      root.removeAttribute("data-validation-state");
      if (state.textarea && state.validationManaged) {
        state.textarea.removeAttribute("aria-invalid");
      }
      if (message && state.validationManaged) {
        message.textContent = "";
        message.hidden = true;
        message.removeAttribute("role");
      }
      state.validationManaged = false;
      return "";
    }

    const value = state.textarea.value;
    if (!value.trim()) {
      root.dataset.validationState = "empty";
      if (state.validationManaged)
        state.textarea.removeAttribute("aria-invalid");
      if (message) {
        message.textContent = getLabel(root, "labelEmpty", "");
        message.hidden = !message.textContent;
        message.removeAttribute("role");
      }
      state.validationManaged = true;
      return "empty";
    }

    try {
      if (validation === "json") JSON.parse(value);
      root.dataset.validationState = "valid";
      state.textarea.removeAttribute("aria-invalid");
      state.validationManaged = true;
      if (message) {
        message.textContent = getLabel(root, "labelValid", "Valid JSON");
        message.hidden = false;
        message.setAttribute("role", "status");
      }
      return "valid";
    } catch (error) {
      const position = errorPosition(error, value);
      const prefix = getLabel(root, "labelInvalidPrefix", "Invalid JSON near");
      const suffix = position
        ? ` ${formatPosition(root, position.line, position.column)}`
        : "";
      root.dataset.validationState = "invalid";
      state.textarea.setAttribute("aria-invalid", "true");
      state.validationManaged = true;
      if (message) {
        message.textContent = `${prefix}${suffix}`;
        message.hidden = false;
        message.setAttribute("role", "alert");
      }
      return "invalid";
    }
  };

  const update = (root, state) => {
    const value = state.textarea?.value ?? "";
    const lines = lineCount(value);
    const characters = characterCount(value);
    const position = positionAt(
      value,
      state.textarea?.selectionStart ?? value.length,
    );
    if (state.textarea) {
      root.dataset.disabled = String(state.textarea.disabled);
    }
    const dirty = updateDirty(root, state);
    const validationState = updateValidation(root, state);

    const linesElement = root.querySelector("[data-code-editor-lines]");
    if (linesElement) {
      linesElement.textContent = formatCount(
        lines,
        getLabel(root, "labelLine", "line"),
        getLabel(root, "labelLines", "lines"),
      );
    }
    const charactersElement = root.querySelector(
      "[data-code-editor-characters]",
    );
    if (charactersElement) {
      charactersElement.textContent = formatCount(
        characters,
        getLabel(root, "labelCharacter", "character"),
        getLabel(root, "labelCharacters", "characters"),
      );
    }
    const positionElement = root.querySelector("[data-code-editor-position]");
    if (positionElement)
      positionElement.textContent = formatPosition(
        root,
        position.line,
        position.column,
      );
    lineText(root, lines);

    return { value, lines, characters, position, dirty, validationState };
  };

  const selectedLineRange = (textarea) => {
    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const effectiveEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const lineBreak = value.indexOf("\n", effectiveEnd);
    const lineEnd = lineBreak === -1 ? value.length : lineBreak;
    return {
      value,
      start,
      end,
      direction: textarea.selectionDirection,
      lineStart,
      lineEnd,
    };
  };

  const indentSelection = (textarea, size, outdent) => {
    const range = selectedLineRange(textarea);
    const indent = " ".repeat(size);

    if (range.start === range.end) {
      if (!outdent) {
        textarea.setRangeText(indent, range.start, range.end, "end");
        return true;
      }
      const line = range.value.slice(range.lineStart, range.lineEnd);
      const amount = line.startsWith("\t")
        ? 1
        : Math.min(size, (line.match(/^ */) || [""])[0].length);
      if (!amount) return false;
      textarea.setRangeText(
        "",
        range.lineStart,
        range.lineStart + amount,
        "preserve",
      );
      const nextPosition = Math.max(range.lineStart, range.start - amount);
      textarea.setSelectionRange(nextPosition, nextPosition, range.direction);
      return true;
    }

    const selected = range.value.slice(range.lineStart, range.lineEnd);
    const sourceLines = selected.split("\n");
    let removedBeforeStart = 0;
    let removedBeforeEnd = 0;
    const transformed = sourceLines
      .map((line, index) => {
        if (!outdent) return `${indent}${line}`;
        const amount = line.startsWith("\t")
          ? 1
          : Math.min(size, (line.match(/^ */) || [""])[0].length);
        const lineOffset =
          range.lineStart +
          sourceLines
            .slice(0, index)
            .reduce((sum, item) => sum + item.length + 1, 0);
        if (lineOffset < range.start)
          removedBeforeStart += Math.min(amount, range.start - lineOffset);
        if (lineOffset < range.end)
          removedBeforeEnd += Math.min(amount, range.end - lineOffset);
        return line.slice(amount);
      })
      .join("\n");

    if (transformed === selected) return false;
    textarea.setRangeText(
      transformed,
      range.lineStart,
      range.lineEnd,
      "select",
    );
    const delta = outdent
      ? -removedBeforeEnd
      : indent.length * sourceLines.length;
    const startDelta = outdent ? -removedBeforeStart : indent.length;
    const nextStart = Math.max(range.lineStart, range.start + startDelta);
    const nextEnd = Math.max(nextStart, range.end + delta);
    textarea.setSelectionRange(nextStart, nextEnd, range.direction);
    return true;
  };

  const initCodeEditor = (root) => {
    if (root.dataset.codeEditorInitialized) return;

    const textarea = getTextarea(root);
    const { gutter, generated } = getGutter(root, textarea);
    const state = {
      textarea,
      gutter,
      generatedGutter: generated,
      cleanValue: textarea?.value ?? "",
      validationManaged: false,
    };
    states.set(root, state);

    const indentSize = getNumber(root, "indentSize", 2);
    const updateState = () => update(root, state);
    const emitInput = () => {
      const detail = updateState();
      emit(root, "a3s:code-input", detail);
    };
    const syncGutter = () => {
      if (state.gutter && state.textarea)
        state.gutter.scrollTop = state.textarea.scrollTop;
    };

    const handleKeydown = (event) => {
      if (!state.textarea || state.textarea.disabled || state.textarea.readOnly)
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        const detail = updateState();
        emit(root, "a3s:code-save", detail);
        return;
      }
      if (
        event.key !== "Tab" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }
      event.preventDefault();
      const changed = indentSelection(
        state.textarea,
        indentSize,
        event.shiftKey,
      );
      if (changed) {
        state.textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    const handleSelection = () => updateState();
    const handleInput = () => emitInput();
    const handleScroll = () => syncGutter();
    const handleDocumentSelection = () => {
      if (document.activeElement === state.textarea) updateState();
    };

    if (textarea) {
      textarea.addEventListener("keydown", handleKeydown);
      textarea.addEventListener("input", handleInput);
      textarea.addEventListener("select", handleSelection);
      textarea.addEventListener("click", handleSelection);
      textarea.addEventListener("keyup", handleSelection);
      textarea.addEventListener("scroll", handleScroll, { passive: true });
      document.addEventListener("selectionchange", handleDocumentSelection);
    }

    root.markClean = () => {
      state.cleanValue = state.textarea?.value ?? "";
      const detail = updateState();
      emit(root, "a3s:code-clean", detail);
    };
    root.setValue = (value, options = {}) => {
      if (!state.textarea) return;
      const nextValue = String(value ?? "");
      state.textarea.value = nextValue;
      if (options.clean === true) state.cleanValue = nextValue;
      const detail = updateState();
      emit(root, "a3s:code-input", { ...detail, programmatic: true });
    };
    root.getValue = () => state.textarea?.value ?? "";
    root.refresh = updateState;

    updateState();
    syncGutter();
    root.dataset.codeEditorInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));

    root._destroy = () => {
      if (state.textarea) {
        state.textarea.removeEventListener("keydown", handleKeydown);
        state.textarea.removeEventListener("input", handleInput);
        state.textarea.removeEventListener("select", handleSelection);
        state.textarea.removeEventListener("click", handleSelection);
        state.textarea.removeEventListener("keyup", handleSelection);
        state.textarea.removeEventListener("scroll", handleScroll);
        document.removeEventListener(
          "selectionchange",
          handleDocumentSelection,
        );
      }
      if (state.generatedGutter) state.gutter?.remove();
      states.delete(root);
      delete root.markClean;
      delete root.setValue;
      delete root.getValue;
      delete root.refresh;
    };
  };

  if (window.basecoat) {
    window.basecoat.register("code-editor", {
      selector: ".code-editor:not([data-code-editor-initialized])",
      init: initCodeEditor,
      refresh: (root) => states.get(root) && update(root, states.get(root)),
    });
  }
})();
