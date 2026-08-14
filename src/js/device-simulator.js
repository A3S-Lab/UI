(() => {
  const states = new WeakMap();
  const WIDTH_RANGE = { minimum: 240, maximum: 4000 };
  const HEIGHT_RANGE = { minimum: 180, maximum: 3000 };
  const supportedProtocols = new Set(["file:", "http:", "https:"]);
  const messages = {
    en: {
      copied: "Native preview command copied.",
      copyError: "Copy failed. Select the command and copy it manually.",
      invalidUrl:
        "Enter an HTTP, HTTPS, file, or relative URL without credentials.",
      loading: "Loading preview…",
      nativeRequested: "Native preview requested.",
      ready: ({ height, width }) => `Preview ready at ${width} × ${height}.`,
    },
    zh: {
      copied: "原生预览命令已复制。",
      copyError: "复制失败，请手动选择并复制命令。",
      invalidUrl: "请输入不含凭据的 HTTP、HTTPS、file 或相对 URL。",
      loading: "正在加载预览…",
      nativeRequested: "已请求原生预览。",
      ready: ({ height, width }) => `预览尺寸 ${width} × ${height}。`,
    },
  };

  const clamp = (value, range) =>
    Math.min(range.maximum, Math.max(range.minimum, value));

  const numericValue = (value, fallback, range) => {
    const parsed = Number(value);
    return clamp(
      Number.isFinite(parsed) ? Math.round(parsed) : fallback,
      range,
    );
  };

  const shellQuote = (value) => `'${String(value).replaceAll("'", `'"'"'`)}'`;

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // The selection fallback still works in restricted browser contexts.
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.readOnly = true;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("The browser rejected the copy operation.");
  };

  const initDeviceSimulator = (root) => {
    if (root.dataset.deviceSimulatorInitialized) return;

    const deviceSelect = root.querySelector("[data-device-simulator-select]");
    const widthInput = root.querySelector("[data-device-simulator-width]");
    const heightInput = root.querySelector("[data-device-simulator-height]");
    const orientationGroup = root.querySelector(
      "[data-device-simulator-orientation]",
    );
    const navigation = root.querySelector("[data-device-simulator-navigation]");
    const urlInput = root.querySelector("[data-device-simulator-url]");
    const workspace = root.querySelector("[data-device-simulator-workspace]");
    const preview = root.querySelector("[data-device-simulator-preview]");
    const screenStatus = root.querySelector(
      "[data-device-simulator-screen-status]",
    );
    const status = root.querySelector("[data-device-simulator-status]");
    const command = root.querySelector("[data-device-simulator-command]");
    const refreshButton = root.querySelector("[data-device-simulator-refresh]");
    const nativeButton = root.querySelector("[data-device-simulator-native]");
    const copyButton = root.querySelector(
      "[data-device-simulator-copy-command]",
    );

    if (
      !deviceSelect ||
      !widthInput ||
      !heightInput ||
      !orientationGroup ||
      !workspace ||
      !preview
    ) {
      return;
    }

    const abortController = new AbortController();
    const listenerOptions = { signal: abortController.signal };
    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => updateScale())
        : null;

    const language = () => {
      const lang =
        root.closest("[lang]")?.getAttribute("lang") ??
        document.documentElement.lang;
      return lang.toLowerCase().startsWith("zh") ? "zh" : "en";
    };

    const translate = (key, values = {}) => {
      const message = messages[language()][key];
      return typeof message === "function" ? message(values) : message;
    };

    const dimensions = () => ({
      width: numericValue(widthInput.value, 393, WIDTH_RANGE),
      height: numericValue(heightInput.value, 852, HEIGHT_RANGE),
    });

    const selectedOption = () =>
      deviceSelect.options[deviceSelect.selectedIndex] ?? null;

    const currentUrl = () => {
      const value = urlInput?.value.trim() || preview.getAttribute("src") || "";
      const url = new URL(value, document.baseURI);
      if (
        !supportedProtocols.has(url.protocol) ||
        url.username ||
        url.password
      ) {
        throw new Error("Unsupported preview URL.");
      }
      return url.href;
    };

    const currentTitle = () =>
      root.dataset.deviceTitle || preview.title || "A3S preview";

    const nativePreviewDetail = () => {
      const { height, width } = dimensions();
      const url = currentUrl();
      const title = currentTitle();
      const args = [
        "--url",
        url,
        "--width",
        String(width),
        "--height",
        String(height),
        "--title",
        title,
      ];
      return {
        args,
        command: `a3s-webview ${args.map(shellQuote).join(" ")}`,
        executable: "a3s-webview",
        height,
        title,
        url,
        width,
      };
    };

    const setStatus = (key, state = "ready") => {
      root.dataset.state = state;
      const value = translate(key, dimensions());
      if (status) status.textContent = value;
      if (screenStatus) {
        screenStatus.textContent = value;
        screenStatus.hidden = state === "ready";
      }
    };

    const updateCommand = () => {
      if (!command) return;
      try {
        command.textContent = nativePreviewDetail().command;
      } catch {
        command.textContent = "";
      }
    };

    function updateScale() {
      const { height, width } = dimensions();
      const styles = getComputedStyle(workspace);
      const horizontalPadding =
        Number.parseFloat(styles.paddingInlineStart) +
        Number.parseFloat(styles.paddingInlineEnd);
      const verticalPadding =
        Number.parseFloat(styles.paddingBlockStart) +
        Number.parseFloat(styles.paddingBlockEnd);
      const availableWidth = Math.max(
        1,
        workspace.clientWidth - horizontalPadding,
      );
      const availableHeight = Math.max(
        1,
        workspace.clientHeight - verticalPadding,
      );
      const scale =
        root.dataset.fit === "actual"
          ? 1
          : Math.max(
              0.1,
              Math.min(1, availableWidth / width, availableHeight / height),
            );
      root.style.setProperty("--device-simulator-scale", scale.toFixed(4));
      root.style.setProperty(
        "--device-simulator-scaled-width",
        `${(width * scale).toFixed(2)}px`,
      );
      root.style.setProperty(
        "--device-simulator-scaled-height",
        `${(height * scale).toFixed(2)}px`,
      );
      root.dataset.deviceScale = scale.toFixed(4);
    }

    const synchronizeOrientation = () => {
      const orientation =
        root.dataset.orientation === "landscape" ? "landscape" : "portrait";
      root.dataset.orientation = orientation;
      orientationGroup
        .querySelectorAll("[data-device-simulator-orientation-value]")
        .forEach((button) => {
          button.setAttribute(
            "aria-pressed",
            String(
              button.dataset.deviceSimulatorOrientationValue === orientation,
            ),
          );
        });
    };

    const synchronizeKind = (kind) => {
      if (["desktop", "phone", "tablet"].includes(kind)) {
        root.dataset.deviceKind = kind;
        return;
      }
      const { width } = dimensions();
      root.dataset.deviceKind =
        width < 600 ? "phone" : width < 1100 ? "tablet" : "desktop";
    };

    const emitChange = (source) => {
      const { height, width } = dimensions();
      root.dispatchEvent(
        new CustomEvent("a3s:device-change", {
          bubbles: true,
          detail: {
            device: root.dataset.device || "custom",
            height,
            kind: root.dataset.deviceKind,
            orientation: root.dataset.orientation,
            source,
            width,
          },
        }),
      );
    };

    const setSize = (width, height, { emit = true, source = "api" } = {}) => {
      const nextWidth = numericValue(width, 393, WIDTH_RANGE);
      const nextHeight = numericValue(height, 852, HEIGHT_RANGE);
      widthInput.value = String(nextWidth);
      heightInput.value = String(nextHeight);
      root.style.setProperty("--device-simulator-width", `${nextWidth}px`);
      root.style.setProperty("--device-simulator-height", `${nextHeight}px`);
      root.dataset.width = String(nextWidth);
      root.dataset.height = String(nextHeight);
      synchronizeKind(selectedOption()?.dataset.kind);
      updateScale();
      updateCommand();
      setStatus("ready");
      if (emit) emitChange(source);
    };

    const selectCustomDevice = () => {
      const custom = Array.from(deviceSelect.options).find(
        (option) => option.value === "custom",
      );
      if (custom) deviceSelect.value = custom.value;
      root.dataset.device = "custom";
      synchronizeKind();
    };

    const applySelectedDevice = (source = "preset") => {
      const option = selectedOption();
      if (!option || option.value === "custom") {
        selectCustomDevice();
        setSize(widthInput.value, heightInput.value, { source });
        return;
      }

      let width = numericValue(option.dataset.width, 393, WIDTH_RANGE);
      let height = numericValue(option.dataset.height, 852, HEIGHT_RANGE);
      const presetOrientation = option.dataset.orientation;
      if (["landscape", "portrait"].includes(presetOrientation)) {
        root.dataset.orientation = presetOrientation;
        synchronizeOrientation();
      }
      const orientation =
        root.dataset.orientation === "landscape" ? "landscape" : "portrait";
      if (
        (orientation === "landscape" && width < height) ||
        (orientation === "portrait" && width > height)
      ) {
        [width, height] = [height, width];
      }
      root.dataset.device = option.value;
      synchronizeKind(option.dataset.kind);
      setSize(width, height, { source });
    };

    const setOrientation = (orientation, source = "orientation") => {
      const next = orientation === "landscape" ? "landscape" : "portrait";
      if (next === root.dataset.orientation) return;
      root.dataset.orientation = next;
      synchronizeOrientation();
      const { height, width } = dimensions();
      setSize(height, width, { source });
    };

    const navigate = (value = urlInput?.value) => {
      if (urlInput && typeof value === "string") urlInput.value = value;
      let url;
      try {
        url = currentUrl();
      } catch {
        setStatus("invalidUrl", "error");
        return false;
      }

      setStatus("loading", "loading");
      preview.src = url;
      updateCommand();
      root.dispatchEvent(
        new CustomEvent("a3s:device-navigate", {
          bubbles: true,
          detail: { url },
        }),
      );
      return true;
    };

    const refreshPreview = () => {
      let url;
      try {
        url = currentUrl();
      } catch {
        setStatus("invalidUrl", "error");
        return;
      }
      setStatus("loading", "loading");
      preview.src = url;
    };

    const copyCommand = async () => {
      let detail;
      try {
        detail = nativePreviewDetail();
      } catch {
        setStatus("invalidUrl", "error");
        return false;
      }

      try {
        await copyText(detail.command);
        setStatus("copied");
        return true;
      } catch {
        setStatus("copyError", "error");
        return false;
      }
    };

    const openNative = async () => {
      let detail;
      try {
        detail = nativePreviewDetail();
      } catch {
        setStatus("invalidUrl", "error");
        return;
      }

      const request = new CustomEvent("a3s:device-preview-request", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail,
      });
      const handled = !root.dispatchEvent(request);
      if (handled) {
        setStatus("nativeRequested");
        return;
      }
      await copyCommand();
    };

    deviceSelect.addEventListener(
      "change",
      () => applySelectedDevice(),
      listenerOptions,
    );
    [widthInput, heightInput].forEach((input) => {
      input.addEventListener(
        "change",
        () => {
          selectCustomDevice();
          setSize(widthInput.value, heightInput.value, { source: "custom" });
        },
        listenerOptions,
      );
    });
    orientationGroup.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest(
          "[data-device-simulator-orientation-value]",
        );
        if (!button || !orientationGroup.contains(button)) return;
        setOrientation(button.dataset.deviceSimulatorOrientationValue);
      },
      listenerOptions,
    );
    navigation?.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        navigate();
      },
      listenerOptions,
    );
    refreshButton?.addEventListener("click", refreshPreview, listenerOptions);
    nativeButton?.addEventListener("click", openNative, listenerOptions);
    copyButton?.addEventListener("click", copyCommand, listenerOptions);
    preview.addEventListener(
      "load",
      () => {
        setStatus("ready");
        updateCommand();
      },
      listenerOptions,
    );
    preview.addEventListener(
      "error",
      () => setStatus("invalidUrl", "error"),
      listenerOptions,
    );

    root.setDevice = (device) => {
      const option = Array.from(deviceSelect.options).find(
        (candidate) => candidate.value === device,
      );
      if (!option) return false;
      deviceSelect.value = option.value;
      applySelectedDevice("api");
      return true;
    };
    root.setSize = (width, height) => {
      selectCustomDevice();
      setSize(width, height);
    };
    root.setOrientation = setOrientation;
    root.navigate = navigate;
    root.refreshPreview = refreshPreview;
    root.openNativePreview = openNative;
    root._destroy = () => {
      abortController.abort();
      resizeObserver?.disconnect();
      states.delete(root);
      delete root.setDevice;
      delete root.setSize;
      delete root.setOrientation;
      delete root.navigate;
      delete root.refreshPreview;
      delete root.openNativePreview;
    };

    synchronizeOrientation();
    applySelectedDevice("initialize");
    if (urlInput && !urlInput.value) {
      urlInput.value = preview.getAttribute("src") || "";
    }
    updateCommand();
    states.set(root, { updateScale });
    resizeObserver?.observe(workspace);
    requestAnimationFrame(updateScale);
    root.dataset.deviceSimulatorInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("device-simulator", {
      selector: ".device-simulator:not([data-device-simulator-initialized])",
      init: initDeviceSimulator,
      refresh: (root) => states.get(root)?.updateScale(),
    });
  }
})();
