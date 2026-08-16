(() => {
  const states = new WeakMap();
  const NODE_RENDER_LIMIT = 600;
  const EDGE_RENDER_LIMIT = 4000;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const ownsElement = (root, element) =>
    element?.closest?.(".code-graph") === root;

  const elementData = (root) => {
    const nodes = Array.from(root.querySelectorAll("[data-code-node]"))
      .filter((element) => ownsElement(root, element))
      .map((element, index) => ({
        element,
        id:
          element.dataset.nodeId ||
          element.dataset.value ||
          `node-${index + 1}`,
        kind: element.dataset.nodeKind || "module",
        label:
          element.dataset.nodeLabel ||
          element.querySelector("[data-node-label]")?.textContent?.trim() ||
          element.textContent?.trim() ||
          `Node ${index + 1}`,
        path: element.dataset.nodePath || "",
        size: clamp(Number(element.dataset.nodeSize) || 4, 1, 24),
        tone: element.dataset.nodeTone || element.dataset.nodeKind || "module",
        x: Number.isFinite(Number(element.dataset.nodeX))
          ? Number(element.dataset.nodeX)
          : seededCoordinate(index, 0),
        y: Number.isFinite(Number(element.dataset.nodeY))
          ? Number(element.dataset.nodeY)
          : seededCoordinate(index, 1),
        z: Number.isFinite(Number(element.dataset.nodeZ))
          ? Number(element.dataset.nodeZ)
          : seededCoordinate(index, 2),
      }));
    const edges = Array.from(root.querySelectorAll("[data-code-edge]"))
      .filter((element) => ownsElement(root, element))
      .map((element, index) => ({
        element,
        from: element.dataset.from || "",
        id: element.dataset.edgeId || `edge-${index + 1}`,
        kind: element.dataset.edgeKind || "import",
        to: element.dataset.to || "",
        weight: clamp(Number(element.dataset.edgeWeight) || 1, 0.25, 8),
      }))
      .filter((edge) => edge.from && edge.to);
    return { edges, nodes };
  };

  function seededCoordinate(index, axis) {
    const value = Math.sin((index + 1) * (axis + 2) * 12.9898) * 43758.5453;
    return (value - Math.floor(value) - 0.5) * 180;
  }

  const graphElements = (root) => ({
    canvas:
      Array.from(root.querySelectorAll("[data-code-graph-canvas]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    empty:
      Array.from(root.querySelectorAll("[data-code-graph-empty]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    inspector:
      Array.from(root.querySelectorAll("[data-code-graph-inspector]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    list:
      Array.from(root.querySelectorAll("[data-code-graph-list]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    search:
      Array.from(root.querySelectorAll("[data-code-graph-search]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    status:
      Array.from(root.querySelectorAll("[data-code-graph-status]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    viewport:
      Array.from(root.querySelectorAll("[data-code-graph-viewport]")).find(
        (element) => ownsElement(root, element),
      ) || null,
  });

  const synchronizeLiveElements = (root, state) => {
    Object.assign(state, graphElements(root));
    const liveNodes = new Map(
      Array.from(root.querySelectorAll("[data-code-node]"))
        .filter((element) => ownsElement(root, element))
        .map((element, index) => [
          element.dataset.nodeId ||
            element.dataset.value ||
            `node-${index + 1}`,
          element,
        ]),
    );
    state.nodes.forEach((node) => {
      const element = liveNodes.get(node.id);
      if (element) node.element = element;
    });
    return state;
  };

  const snapshot = (state) =>
    Object.freeze({
      edges: state.edges.length,
      filter: state.filter,
      nodes: state.nodes.length,
      selectedId: state.selectedId,
      state: state.name,
      totalEdges: state.totalEdges,
      totalNodes: state.totalNodes,
      truncated: state.truncated,
      view: state.view,
      visibleNodes: state.visibleNodes.length,
      zoom: state.zoom,
    });

  const palette = (root) => {
    const style = getComputedStyle(root);
    const variable = (name, fallback) =>
      style.getPropertyValue(name).trim() || fallback;
    return {
      background: variable("--code-graph-background", "#0d1118"),
      edge: variable("--code-graph-edge", "rgb(122 142 170 / 34%)"),
      edgeActive: variable("--code-graph-edge-active", "#6ca3ff"),
      label: variable("--code-graph-label", "#eef4ff"),
      labelMuted: variable("--code-graph-label-muted", "#a8b3c6"),
      node: variable("--code-graph-node", "#7c899f"),
      nodeAccent: variable("--code-graph-node-accent", "#6ca3ff"),
      nodeConfig: variable("--code-graph-node-config", "#efb861"),
      nodeEntry: variable("--code-graph-node-entry", "#69d3a5"),
      nodeTest: variable("--code-graph-node-test", "#9b92ff"),
      selected: variable("--code-graph-selected", "#ffffff"),
    };
  };

  const nodeColor = (node, colors) => {
    if (node.tone === "entry") return colors.nodeEntry;
    if (node.tone === "test") return colors.nodeTest;
    if (node.tone === "config") return colors.nodeConfig;
    if (["component", "function", "symbol"].includes(node.tone)) {
      return colors.nodeAccent;
    }
    return colors.node;
  };

  const scheduleDraw = (root, state) => {
    if (state.frame) return;
    state.frame = requestAnimationFrame(() => {
      state.frame = 0;
      drawGraph(root, state);
    });
  };

  const rotateNode = (node, state) => {
    const cosYaw = Math.cos(state.yaw);
    const sinYaw = Math.sin(state.yaw);
    const cosPitch = Math.cos(state.pitch);
    const sinPitch = Math.sin(state.pitch);
    const yawX = node.x * cosYaw - node.z * sinYaw;
    const yawZ = node.x * sinYaw + node.z * cosYaw;
    return {
      x: yawX,
      y: node.y * cosPitch - yawZ * sinPitch,
      z: node.y * sinPitch + yawZ * cosPitch,
    };
  };

  const projectNode = (node, state, width, height) => {
    const rotated = rotateNode(node, state);
    const camera = 420 / state.zoom;
    const depth = Math.max(120, camera - rotated.z);
    const perspective = camera / depth;
    return {
      depth,
      perspective,
      radius: clamp((2.4 + node.size * 0.34) * perspective, 2.25, 12),
      x: width / 2 + rotated.x * perspective * state.fitScale,
      y: height / 2 + rotated.y * perspective * state.fitScale,
    };
  };

  const connectedIds = (state, id) => {
    const result = new Set(id ? [id] : []);
    if (!id) return result;
    state.visibleEdges.forEach((edge) => {
      if (edge.from === id) result.add(edge.to);
      if (edge.to === id) result.add(edge.from);
    });
    return result;
  };

  const drawGraph = (root, state) => {
    synchronizeLiveElements(root, state);
    const canvas = state.canvas;
    const viewport = state.viewport;
    const context = canvas?.getContext?.("2d");
    if (!canvas || !viewport || !context || state.view !== "graph") return;
    const bounds = viewport.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const colors = palette(root);
    context.clearRect(0, 0, width, height);
    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);

    const projected = new Map(
      state.visibleNodes.map((node) => [
        node.id,
        { node, ...projectNode(node, state, width, height) },
      ]),
    );
    state.projected = projected;
    const activeId = state.selectedId || state.hoveredId;
    const connected = connectedIds(state, activeId);

    state.visibleEdges
      .map((edge) => ({
        edge,
        from: projected.get(edge.from),
        to: projected.get(edge.to),
      }))
      .filter((item) => item.from && item.to)
      .sort(
        (left, right) =>
          right.from.depth + right.to.depth - (left.from.depth + left.to.depth),
      )
      .forEach(({ edge, from, to }) => {
        const active =
          activeId && (edge.from === activeId || edge.to === activeId);
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.lineWidth = active ? 1.6 : clamp(edge.weight * 0.55, 0.45, 1.3);
        context.globalAlpha = activeId && !active ? 0.12 : active ? 0.82 : 0.34;
        context.strokeStyle = active ? colors.edgeActive : colors.edge;
        context.stroke();
      });

    const labelNodes = [...projected.values()]
      .sort((left, right) => left.depth - right.depth)
      .slice(0, 16);
    [...projected.values()]
      .sort((left, right) => right.depth - left.depth)
      .forEach((point) => {
        const selected = point.node.id === state.selectedId;
        const hovered = point.node.id === state.hoveredId;
        const dimmed = activeId && !connected.has(point.node.id);
        context.beginPath();
        context.arc(
          point.x,
          point.y,
          selected ? point.radius * 1.45 : point.radius,
          0,
          Math.PI * 2,
        );
        context.globalAlpha = dimmed ? 0.2 : 0.96;
        context.fillStyle = selected
          ? colors.selected
          : nodeColor(point.node, colors);
        context.fill();
        if (selected || hovered) {
          context.globalAlpha = 0.72;
          context.lineWidth = 2;
          context.strokeStyle = colors.edgeActive;
          context.stroke();
        }
      });

    context.font = '500 11px Geist, "HarmonyOS Sans SC", system-ui, sans-serif';
    context.textBaseline = "middle";
    labelNodes.forEach((point) => {
      if (
        point.node.id !== state.selectedId &&
        point.node.id !== state.hoveredId &&
        point.node.size < 5
      ) {
        return;
      }
      const label = truncate(point.node.label, 30);
      const x = point.x + point.radius + 5;
      const width = context.measureText(label).width;
      context.globalAlpha =
        activeId && !connected.has(point.node.id) ? 0.28 : 0.92;
      context.fillStyle = colors.background;
      context.fillRect(x - 3, point.y - 9, width + 6, 18);
      context.fillStyle =
        point.node.id === activeId ? colors.label : colors.labelMuted;
      context.fillText(label, x, point.y);
    });
    context.globalAlpha = 1;
  };

  const truncate = (value, limit) =>
    value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;

  const updateInspector = (state) => {
    if (!state.inspector) return;
    const node = state.nodes.find((item) => item.id === state.selectedId);
    state.inspector.toggleAttribute("data-empty", !node);
    state.inspector
      .querySelectorAll("[data-code-graph-field]")
      .forEach((field) => {
        const key = field.dataset.codeGraphField;
        if (!node) {
          field.textContent = field.dataset.emptyValue || "—";
        } else if (key === "connections") {
          field.textContent = String(
            state.edges.filter(
              (edge) => edge.from === node.id || edge.to === node.id,
            ).length,
          );
        } else {
          field.textContent = String(node[key] ?? "—");
        }
      });
  };

  const applyFilter = (root, state, value, options = {}) => {
    synchronizeLiveElements(root, state);
    const current = String(value ?? "");
    const previous = state.filter;
    const detail = {
      current,
      previous,
      source: options.source || "api",
    };
    if (
      options.before !== false &&
      !root.dispatchEvent(
        new CustomEvent("a3s:code-graph-before-filter-change", {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      )
    ) {
      if (state.search) state.search.value = previous;
      return false;
    }
    state.filter = current;
    const query = current.trim().toLocaleLowerCase();
    state.visibleNodes = query
      ? state.nodes.filter((node) =>
          `${node.label} ${node.path} ${node.kind}`
            .toLocaleLowerCase()
            .includes(query),
        )
      : [...state.nodes];
    const ids = new Set(state.visibleNodes.map((node) => node.id));
    state.visibleEdges = state.edges.filter(
      (edge) => ids.has(edge.from) && ids.has(edge.to),
    );
    state.nodes.forEach((node) => {
      node.element.hidden = !ids.has(node.id);
    });
    if (state.search && state.search.value !== current)
      state.search.value = current;
    if (state.empty) state.empty.hidden = state.visibleNodes.length > 0;
    root.toggleAttribute("data-filter-empty", state.visibleNodes.length === 0);
    if (state.selectedId && !ids.has(state.selectedId)) {
      state.selectedId = null;
      updateInspector(state);
    }
    scheduleDraw(root, state);
    root.dispatchEvent(
      new CustomEvent("a3s:code-graph-filter-change", {
        bubbles: true,
        detail: { ...detail, count: state.visibleNodes.length },
      }),
    );
    return true;
  };

  const selectNode = (root, state, id, options = {}) => {
    synchronizeLiveElements(root, state);
    const node = id
      ? state.nodes.find((item) => item.id === String(id)) || null
      : null;
    if (id && !node) return false;
    const previous = state.selectedId;
    const current = node?.id || null;
    if (previous === current && !options.force) return true;
    const detail = {
      current,
      node,
      previous,
      source: options.source || "api",
    };
    if (
      options.before !== false &&
      !root.dispatchEvent(
        new CustomEvent("a3s:code-graph-before-selection-change", {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      )
    ) {
      return false;
    }
    state.selectedId = current;
    state.nodes.forEach((item) => {
      const selected = item.id === current;
      item.element.setAttribute("aria-selected", String(selected));
      item.element
        .querySelector("button")
        ?.setAttribute("aria-pressed", String(selected));
    });
    updateInspector(state);
    scheduleDraw(root, state);
    root.dispatchEvent(
      new CustomEvent("a3s:code-graph-selection-change", {
        bubbles: true,
        detail,
      }),
    );
    return true;
  };

  const setView = (root, state, view, options = {}) => {
    synchronizeLiveElements(root, state);
    const current = view === "list" ? "list" : "graph";
    const previous = state.view;
    state.view = current;
    root.dataset.view = current;
    if (state.viewport) state.viewport.hidden = current !== "graph";
    if (state.canvas) state.canvas.hidden = current !== "graph";
    if (state.list) state.list.hidden = current !== "list";
    root.querySelectorAll("[data-code-graph-view]").forEach((control) => {
      control.setAttribute(
        "aria-pressed",
        String(control.dataset.codeGraphView === current),
      );
    });
    if (current === "graph") scheduleDraw(root, state);
    if (previous !== current || options.force) {
      root.dispatchEvent(
        new CustomEvent("a3s:code-graph-view-change", {
          bubbles: true,
          detail: { current, previous, source: options.source || "api" },
        }),
      );
    }
    return current;
  };

  const setGraphState = (root, state, name, options = {}) => {
    synchronizeLiveElements(root, state);
    const previous = state.name;
    state.name = String(name || "ready");
    root.dataset.state = state.name;
    root.setAttribute("aria-busy", String(state.name === "loading"));
    if (state.status && options.message !== undefined) {
      state.status.textContent = String(options.message);
    }
    if (previous !== state.name || options.force) {
      root.dispatchEvent(
        new CustomEvent("a3s:code-graph-state-change", {
          bubbles: true,
          detail: {
            current: state.name,
            previous,
            source: options.source || "api",
          },
        }),
      );
    }
    return snapshot(state);
  };

  const fitScaleFor = (nodes) => {
    const extent = nodes.reduce(
      (value, node) =>
        Math.max(value, Math.abs(node.x), Math.abs(node.y), Math.abs(node.z)),
      1,
    );
    return clamp(125 / extent, 0.45, 2.2);
  };

  const limitGraph = (nodes, edges, selectedId = null) => {
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    const nodeIds = new Set(nodes.map((node) => node.id));
    const degree = new Map(
      nodes.map((node) => [node.id, { count: 0, weight: 0 }]),
    );
    const neighbours = new Set();
    edges.forEach((edge) => {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) return;
      const from = degree.get(edge.from);
      const to = degree.get(edge.to);
      if (from) {
        from.count += 1;
        from.weight += edge.weight;
      }
      if (to) {
        to.count += 1;
        to.weight += edge.weight;
      }
      if (edge.from === selectedId) neighbours.add(edge.to);
      if (edge.to === selectedId) neighbours.add(edge.from);
    });
    const rankedNodes = [...nodes].sort((left, right) => {
      const rank = (node) =>
        node.id === selectedId
          ? 4
          : neighbours.has(node.id)
            ? 3
            : node.tone === "entry"
              ? 2
              : 1;
      const leftDegree = degree.get(left.id) || { count: 0, weight: 0 };
      const rightDegree = degree.get(right.id) || { count: 0, weight: 0 };
      return (
        rank(right) - rank(left) ||
        rightDegree.count - leftDegree.count ||
        rightDegree.weight - leftDegree.weight ||
        right.size - left.size ||
        left.label.localeCompare(right.label)
      );
    });
    const limitedNodes = rankedNodes.slice(0, NODE_RENDER_LIMIT);
    const kept = new Set(limitedNodes.map((node) => node.id));
    const limitedEdges = edges
      .filter((edge) => kept.has(edge.from) && kept.has(edge.to))
      .sort((left, right) => {
        const leftSelected = left.from === selectedId || left.to === selectedId;
        const rightSelected =
          right.from === selectedId || right.to === selectedId;
        return (
          Number(rightSelected) - Number(leftSelected) ||
          right.weight - left.weight
        );
      })
      .slice(0, EDGE_RENDER_LIMIT);
    return {
      edges: limitedEdges,
      nodes: limitedNodes,
      totalEdges,
      totalNodes,
      truncated:
        limitedNodes.length < totalNodes || limitedEdges.length < totalEdges,
    };
  };

  const initCodeGraph = (root) => {
    if (root.dataset.codeGraphInitialized) return;
    const elements = graphElements(root);
    const sourceData = elementData(root);
    const data = limitGraph(
      sourceData.nodes,
      sourceData.edges,
      root.dataset.selectedNode || null,
    );
    const context = elements.canvas?.getContext?.("2d") || null;
    const state = {
      ...elements,
      ...data,
      context,
      filter: elements.search?.value || "",
      fitScale: fitScaleFor(data.nodes),
      frame: 0,
      hoveredId: null,
      name:
        root.dataset.state ||
        (context ? (data.truncated ? "partial" : "ready") : "unsupported"),
      pitch: -0.16,
      projected: new Map(),
      selectedId: root.dataset.selectedNode || null,
      totalEdges: data.totalEdges,
      totalNodes: data.totalNodes,
      truncated: data.truncated,
      view: root.dataset.view === "list" || !context ? "list" : "graph",
      visibleEdges: [...data.edges],
      visibleNodes: [...data.nodes],
      yaw: 0.58,
      zoom: 1,
    };
    states.set(root, state);
    if (!state.viewport || !state.canvas || !state.list) return;
    state.viewport.tabIndex =
      state.viewport.tabIndex >= 0 ? state.viewport.tabIndex : 0;

    const resizeObserver = new ResizeObserver(() => scheduleDraw(root, state));
    resizeObserver.observe(root);
    const eventOwnsViewport = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return false;
      const viewport = target.closest("[data-code-graph-viewport]");
      return Boolean(viewport && ownsElement(root, viewport));
    };
    const handleSearch = (event) => {
      const target = event.target;
      if (
        !(target instanceof HTMLInputElement) ||
        !target.matches("[data-code-graph-search]") ||
        !ownsElement(root, target)
      ) {
        return;
      }
      applyFilter(root, state, target.value, { source: "user" });
    };

    let pointer = null;
    const handlePointerDown = (event) => {
      synchronizeLiveElements(root, state);
      if (!eventOwnsViewport(event)) return;
      if (state.view !== "graph" || event.button !== 0) return;
      pointer = {
        id: event.pointerId,
        moved: 0,
        x: event.clientX,
        y: event.clientY,
      };
      state.viewport.setPointerCapture?.(event.pointerId);
      root.toggleAttribute("data-dragging", true);
    };
    const handlePointerMove = (event) => {
      synchronizeLiveElements(root, state);
      if (!eventOwnsViewport(event)) return;
      if (state.view !== "graph") return;
      const bounds = state.canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      if (pointer?.id === event.pointerId) {
        const dx = event.clientX - pointer.x;
        const dy = event.clientY - pointer.y;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.moved += Math.abs(dx) + Math.abs(dy);
        state.yaw += dx * 0.009;
        state.pitch = clamp(state.pitch + dy * 0.008, -1.18, 1.18);
        scheduleDraw(root, state);
        return;
      }
      let hovered = null;
      let distance = Infinity;
      state.projected.forEach((point, id) => {
        const nextDistance = Math.hypot(point.x - x, point.y - y);
        if (nextDistance <= point.radius + 6 && nextDistance < distance) {
          hovered = id;
          distance = nextDistance;
        }
      });
      if (hovered !== state.hoveredId) {
        state.hoveredId = hovered;
        state.viewport.style.cursor = hovered ? "pointer" : "grab";
        scheduleDraw(root, state);
      }
    };
    const handlePointerUp = (event) => {
      synchronizeLiveElements(root, state);
      if (!eventOwnsViewport(event)) return;
      if (pointer?.id !== event.pointerId) return;
      const moved = pointer.moved;
      pointer = null;
      root.removeAttribute("data-dragging");
      state.viewport.releasePointerCapture?.(event.pointerId);
      if (moved < 5)
        selectNode(root, state, state.hoveredId, { source: "canvas" });
    };
    const handleWheel = (event) => {
      synchronizeLiveElements(root, state);
      if (!eventOwnsViewport(event)) return;
      if (state.view !== "graph") return;
      event.preventDefault();
      state.zoom = clamp(
        state.zoom * (event.deltaY > 0 ? 0.9 : 1.1),
        0.45,
        2.8,
      );
      scheduleDraw(root, state);
    };
    const handleKeydown = (event) => {
      synchronizeLiveElements(root, state);
      if (!eventOwnsViewport(event)) return;
      if (state.view !== "graph") return;
      const actions = {
        ArrowDown: () => (state.pitch = clamp(state.pitch + 0.1, -1.18, 1.18)),
        ArrowLeft: () => (state.yaw -= 0.12),
        ArrowRight: () => (state.yaw += 0.12),
        ArrowUp: () => (state.pitch = clamp(state.pitch - 0.1, -1.18, 1.18)),
        Home: () => root.resetView(),
        "+": () => root.zoomIn(),
        "=": () => root.zoomIn(),
        "-": () => root.zoomOut(),
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
      scheduleDraw(root, state);
    };
    const handleClick = (event) => {
      synchronizeLiveElements(root, state);
      const target = event.target;
      if (!(target instanceof Element)) return;
      const node = target.closest("[data-code-node]");
      if (node && ownsElement(root, node)) {
        selectNode(root, state, node.dataset.nodeId || node.dataset.value, {
          source: "list",
        });
        return;
      }
      const view = target.closest("[data-code-graph-view]");
      if (view && ownsElement(root, view)) {
        setView(root, state, view.dataset.codeGraphView, { source: "user" });
        return;
      }
      const action = target.closest("[data-code-graph-action]");
      if (!action || !ownsElement(root, action)) return;
      const value = action.dataset.codeGraphAction;
      if (value === "reset") root.resetView();
      if (value === "zoom-in") root.zoomIn();
      if (value === "zoom-out") root.zoomOut();
      if (value === "clear-filter") root.clearFilter();
      if (value === "clear-selection") root.clearSelection();
    };

    root.addEventListener("input", handleSearch);
    root.addEventListener("pointerdown", handlePointerDown);
    root.addEventListener("pointermove", handlePointerMove);
    root.addEventListener("pointerup", handlePointerUp);
    root.addEventListener("pointercancel", handlePointerUp);
    root.addEventListener("wheel", handleWheel, { passive: false });
    root.addEventListener("keydown", handleKeydown);
    root.addEventListener("click", handleClick);

    root.clearFilter = (options = {}) => applyFilter(root, state, "", options);
    root.clearSelection = (options = {}) =>
      selectNode(root, state, null, options);
    root.getFilter = () => state.filter;
    root.getSelection = () =>
      state.nodes.find((node) => node.id === state.selectedId) || null;
    root.getState = () => snapshot(state);
    root.refresh = () => {
      Object.assign(state, graphElements(root));
      const source = elementData(root);
      const next = limitGraph(source.nodes, source.edges, state.selectedId);
      state.nodes = next.nodes;
      state.edges = next.edges;
      state.totalEdges = next.totalEdges;
      state.totalNodes = next.totalNodes;
      state.truncated = next.truncated;
      state.fitScale = fitScaleFor(next.nodes);
      applyFilter(root, state, state.filter, {
        before: false,
        source: "refresh",
      });
      return snapshot(state);
    };
    root.resetView = () => {
      state.pitch = -0.16;
      state.yaw = 0.58;
      state.zoom = 1;
      state.fitScale = fitScaleFor(state.visibleNodes);
      scheduleDraw(root, state);
      return snapshot(state);
    };
    root.select = (id, options = {}) => selectNode(root, state, id, options);
    root.setData = (value, options = {}) => {
      if (
        !value ||
        !Array.isArray(value.nodes) ||
        !Array.isArray(value.edges)
      ) {
        throw new TypeError(
          "CodeGraph.setData expects { nodes, edges } arrays.",
        );
      }
      const nextNodes = value.nodes.map((node, index) => ({
        element: node.element || document.createElement("li"),
        id: String(node.id || `node-${index + 1}`),
        kind: String(node.kind || "module"),
        label: String(node.label || node.id || `Node ${index + 1}`),
        path: String(node.path || ""),
        size: clamp(Number(node.size) || 4, 1, 24),
        tone: String(node.tone || node.kind || "module"),
        x: Number(node.x) || seededCoordinate(index, 0),
        y: Number(node.y) || seededCoordinate(index, 1),
        z: Number(node.z) || seededCoordinate(index, 2),
      }));
      const nextEdges = value.edges.map((edge, index) => ({
        element: edge.element || document.createElement("li"),
        from: String(edge.from || ""),
        id: String(edge.id || `edge-${index + 1}`),
        kind: String(edge.kind || "import"),
        to: String(edge.to || ""),
        weight: clamp(Number(edge.weight) || 1, 0.25, 8),
      }));
      const limited = limitGraph(nextNodes, nextEdges, state.selectedId);
      state.nodes = limited.nodes;
      state.edges = limited.edges;
      state.totalEdges = limited.totalEdges;
      state.totalNodes = limited.totalNodes;
      state.truncated = limited.truncated;
      state.fitScale = fitScaleFor(state.nodes);
      if (limited.truncated && options.state !== false) {
        setGraphState(root, state, "partial", {
          message: options.truncatedMessage,
          source: options.source || "api",
        });
      }
      applyFilter(root, state, state.filter, {
        before: false,
        source: options.source || "api",
      });
      return snapshot(state);
    };
    root.setFilter = (value, options = {}) =>
      applyFilter(root, state, value, options);
    root.setState = (name, options = {}) =>
      setGraphState(root, state, name, options);
    root.setView = (view, options = {}) => setView(root, state, view, options);
    root.zoomIn = () => {
      state.zoom = clamp(state.zoom * 1.2, 0.45, 2.8);
      scheduleDraw(root, state);
      return state.zoom;
    };
    root.zoomOut = () => {
      state.zoom = clamp(state.zoom / 1.2, 0.45, 2.8);
      scheduleDraw(root, state);
      return state.zoom;
    };
    root._destroy = () => {
      cancelAnimationFrame(state.frame);
      resizeObserver.disconnect();
      root.removeEventListener("input", handleSearch);
      root.removeEventListener("pointerdown", handlePointerDown);
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerup", handlePointerUp);
      root.removeEventListener("pointercancel", handlePointerUp);
      root.removeEventListener("wheel", handleWheel);
      root.removeEventListener("keydown", handleKeydown);
      root.removeEventListener("click", handleClick);
      states.delete(root);
      [
        "clearFilter",
        "clearSelection",
        "getFilter",
        "getSelection",
        "getState",
        "refresh",
        "resetView",
        "select",
        "setData",
        "setFilter",
        "setState",
        "setView",
        "zoomIn",
        "zoomOut",
      ].forEach((method) => delete root[method]);
    };

    applyFilter(root, state, state.filter, { before: false, source: "init" });
    setView(root, state, state.view, { force: true, source: "init" });
    setGraphState(root, state, state.name, { force: true, source: "init" });
    if (state.selectedId)
      selectNode(root, state, state.selectedId, { before: false, force: true });
    root.dataset.codeGraphInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("code-graph", {
      selector: ".code-graph:not([data-code-graph-initialized])",
      init: initCodeGraph,
      refresh: (root) => root.refresh?.(),
    });
  }
})();
