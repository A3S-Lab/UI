import {
  type KeyboardEventHandler,
  type RefCallback,
  type UIEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export const DATA_GRID_VIRTUAL_VIEWPORT_HEIGHT = 480;
export const DATA_GRID_VIRTUAL_OVERSCAN = 6;

const DESKTOP_ROW_ESTIMATE = 56;
const COMPACT_ROW_ESTIMATE = 196;
const COMPACT_ROW_GAP = 10;

export interface DataGridVirtualMetrics {
  readonly offsets: readonly number[];
  readonly sizes: readonly number[];
  readonly totalSize: number;
}

export interface DataGridVirtualWindow {
  readonly start: number;
  readonly end: number;
  readonly topSpacer: number;
  readonly bottomSpacer: number;
  readonly windowSize: number;
}

export function createDataGridVirtualMetrics(
  rowKeys: readonly string[],
  measurements: ReadonlyMap<string, number>,
  estimate: number,
  gap: number,
): DataGridVirtualMetrics {
  const offsets = [0];
  const sizes = rowKeys.map((key, index) => {
    const measured = measurements.get(key);
    const contentSize = measured !== undefined && measured > 0 ? measured : estimate;
    const size = contentSize + (index < rowKeys.length - 1 ? gap : 0);
    offsets.push(offsets[index] + size);
    return size;
  });
  return { offsets, sizes, totalSize: offsets[offsets.length - 1] };
}

function rowAtOffset(metrics: DataGridVirtualMetrics, offset: number): number {
  let lower = 0;
  let upper = metrics.sizes.length - 1;
  const boundedOffset = Math.max(0, Math.min(offset, Math.max(0, metrics.totalSize - 1)));
  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if ((metrics.offsets[middle + 1] ?? metrics.totalSize) <= boundedOffset) lower = middle + 1;
    else upper = middle;
  }
  return lower;
}

export function calculateDataGridVirtualWindow(
  metrics: DataGridVirtualMetrics,
  scrollOffset: number,
  viewportHeight: number,
  overscan: number,
): DataGridVirtualWindow {
  const count = metrics.sizes.length;
  if (count === 0) {
    return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0, windowSize: 0 };
  }
  const boundedOffset = Math.max(
    0,
    Math.min(scrollOffset, Math.max(0, metrics.totalSize - viewportHeight)),
  );
  const visibleStart = rowAtOffset(metrics, boundedOffset);
  const visibleEnd = rowAtOffset(
    metrics,
    Math.min(metrics.totalSize - 1, boundedOffset + Math.max(1, viewportHeight) - 1),
  );
  const start = Math.max(0, visibleStart - overscan);
  const end = Math.min(count, visibleEnd + overscan + 1);
  const topSpacer = metrics.offsets[start] ?? 0;
  const endOffset = metrics.offsets[end] ?? metrics.totalSize;
  const bottomSpacer = Math.max(0, metrics.totalSize - endOffset);
  return {
    start,
    end,
    topSpacer,
    bottomSpacer,
    windowSize: Math.max(0, endOffset - topSpacer),
  };
}

interface UseDataGridVirtualRowsOptions {
  enabled: boolean;
  rowKeys: readonly string[];
  viewportHeight: number;
  overscan: number;
  resetKey: string;
}

type DataGridVirtualAlignment = 'start' | 'center' | 'end';

interface DataGridVirtualScrollAnchor {
  readonly key: string;
  readonly align: DataGridVirtualAlignment;
}

function measuredHeight(element: Element): number {
  const height = element.getBoundingClientRect().height;
  return Number.isFinite(height) && height > 0 ? height : 0;
}

export function useDataGridVirtualRows(options: UseDataGridVirtualRowsOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | undefined>(undefined);
  const rowElementsRef = useRef(new Map<string, HTMLTableRowElement>());
  const rowCallbacksRef = useRef(new Map<string, RefCallback<HTMLTableRowElement>>());
  const measurementsRef = useRef(new Map<string, number>());
  const compactRef = useRef(false);
  const scrollAnchorRef = useRef<DataGridVirtualScrollAnchor | undefined>(undefined);
  const pendingScrollRef = useRef(0);
  const scrollFrameRef = useRef<number | undefined>(undefined);
  const resetKeyRef = useRef(options.resetKey);
  const enabledRef = useRef(options.enabled);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportExtent, setViewportExtent] = useState(options.viewportHeight);
  const [compact, setCompact] = useState(false);
  const [measurementRevision, setMeasurementRevision] = useState(0);

  const recordMeasurement = useCallback((key: string, height: number) => {
    if (height <= 0 || Math.abs((measurementsRef.current.get(key) ?? 0) - height) < 0.5) return;
    measurementsRef.current.set(key, height);
    setMeasurementRevision((current) => current + 1);
  }, []);

  const getRowRef = useCallback(
    (key: string): RefCallback<HTMLTableRowElement> => {
      const existing = rowCallbacksRef.current.get(key);
      if (existing) return existing;
      const callback: RefCallback<HTMLTableRowElement> = (element) => {
        const previous = rowElementsRef.current.get(key);
        if (previous && previous !== element) observerRef.current?.unobserve(previous);
        if (!element) {
          rowElementsRef.current.delete(key);
          return;
        }
        rowElementsRef.current.set(key, element);
        observerRef.current?.observe(element);
        if (typeof ResizeObserver === 'undefined') {
          recordMeasurement(key, measuredHeight(element));
        }
      };
      rowCallbacksRef.current.set(key, callback);
      return callback;
    },
    [recordMeasurement],
  );

  useEffect(() => {
    if (!options.enabled || typeof ResizeObserver === 'undefined') return;
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    const renderer = scrollElement.closest<HTMLElement>('.a3s-form-renderer');
    const updateEnvironment = () => {
      if (scrollElement.clientHeight > 0) setViewportExtent(scrollElement.clientHeight);
      const width = renderer?.clientWidth || scrollElement.clientWidth;
      if (width <= 0) return;
      const nextCompact = width <= 520;
      if (compactRef.current === nextCompact) return;
      compactRef.current = nextCompact;
      measurementsRef.current.clear();
      setCompact(nextCompact);
      setMeasurementRevision((current) => current + 1);
    };
    const observer = new ResizeObserver((entries) => {
      let measurementsChanged = false;
      for (const entry of entries) {
        if (entry.target === scrollElement || entry.target === renderer) {
          updateEnvironment();
          continue;
        }
        const element = entry.target as HTMLTableRowElement;
        const key = element.dataset.rowKey;
        const height = measuredHeight(element);
        if (!key || height <= 0) continue;
        if (Math.abs((measurementsRef.current.get(key) ?? 0) - height) < 0.5) continue;
        measurementsRef.current.set(key, height);
        measurementsChanged = true;
      }
      if (measurementsChanged) setMeasurementRevision((current) => current + 1);
    });
    observerRef.current = observer;
    observer.observe(scrollElement);
    if (renderer) observer.observe(renderer);
    for (const element of rowElementsRef.current.values()) observer.observe(element);
    updateEnvironment();
    return () => {
      observer.disconnect();
      observerRef.current = undefined;
    };
  }, [options.enabled]);

  useEffect(() => {
    const validKeys = new Set(options.rowKeys);
    for (const key of measurementsRef.current.keys()) {
      if (!validKeys.has(key)) measurementsRef.current.delete(key);
    }
    for (const key of rowCallbacksRef.current.keys()) {
      if (!validKeys.has(key) && !rowElementsRef.current.has(key)) {
        rowCallbacksRef.current.delete(key);
      }
    }
  }, [options.rowKeys]);

  const measurementSnapshot = useMemo(
    () => ({ revision: measurementRevision, values: new Map(measurementsRef.current) }),
    [measurementRevision],
  );
  const metrics = useMemo(() => {
    if (!options.enabled) return { offsets: [0], sizes: [], totalSize: 0 };
    return createDataGridVirtualMetrics(
      options.rowKeys,
      measurementSnapshot.values,
      compact ? COMPACT_ROW_ESTIMATE : DESKTOP_ROW_ESTIMATE,
      compact ? COMPACT_ROW_GAP : 0,
    );
  }, [compact, measurementSnapshot, options.enabled, options.rowKeys]);
  const range = options.enabled
    ? calculateDataGridVirtualWindow(metrics, scrollOffset, viewportExtent, options.overscan)
    : {
        start: 0,
        end: options.rowKeys.length,
        topSpacer: 0,
        bottomSpacer: 0,
        windowSize: metrics.totalSize,
      };

  const setScrollPosition = useCallback((nextOffset: number) => {
    const element = scrollRef.current;
    if (element) element.scrollTop = nextOffset;
    const resolvedOffset = element?.scrollTop ?? nextOffset;
    pendingScrollRef.current = resolvedOffset;
    setScrollOffset(resolvedOffset);
  }, []);

  const resolveScrollTarget = useCallback(
    (index: number, align: DataGridVirtualAlignment) => {
      const start = metrics.offsets[index];
      const size = metrics.sizes[index];
      const metricMaximum = Math.max(0, metrics.totalSize - viewportExtent);
      if (align === 'end' && index === metrics.sizes.length - 1) {
        const element = scrollRef.current;
        const domMaximum = element ? Math.max(0, element.scrollHeight - element.clientHeight) : 0;
        return Math.max(metricMaximum, domMaximum);
      }
      const target =
        align === 'start'
          ? start
          : align === 'end'
            ? start + size - viewportExtent
            : start - Math.max(0, (viewportExtent - size) / 2);
      return Math.max(0, Math.min(target, metricMaximum));
    },
    [metrics, viewportExtent],
  );

  useEffect(() => setViewportExtent(options.viewportHeight), [options.viewportHeight]);

  useEffect(() => {
    const resetChanged = resetKeyRef.current !== options.resetKey;
    const enabledChanged = enabledRef.current !== options.enabled;
    resetKeyRef.current = options.resetKey;
    enabledRef.current = options.enabled;
    if (resetChanged || enabledChanged) scrollAnchorRef.current = undefined;
    if (options.enabled && (resetChanged || enabledChanged)) setScrollPosition(0);
  }, [options.enabled, options.resetKey, setScrollPosition]);

  useEffect(() => {
    if (!options.enabled) return;
    const element = scrollRef.current;
    const maximumOffset = Math.max(
      0,
      metrics.totalSize - viewportExtent,
      element ? element.scrollHeight - element.clientHeight : 0,
    );
    if (scrollOffset > maximumOffset) setScrollPosition(maximumOffset);
  }, [metrics.totalSize, options.enabled, scrollOffset, setScrollPosition, viewportExtent]);

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== undefined && typeof window !== 'undefined') {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    [],
  );

  const onScroll = useCallback<UIEventHandler<HTMLDivElement>>((event) => {
    const nextOffset = event.currentTarget.scrollTop;
    if (Math.abs(nextOffset - pendingScrollRef.current) > 1) {
      scrollAnchorRef.current = undefined;
    }
    pendingScrollRef.current = nextOffset;
    if (scrollFrameRef.current !== undefined) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = undefined;
      setScrollOffset(pendingScrollRef.current);
    });
  }, []);

  const onKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (event) => {
      if (!options.enabled || event.target !== event.currentTarget) return;
      const maximumOffset = Math.max(
        0,
        metrics.totalSize - viewportExtent,
        event.currentTarget.scrollHeight - event.currentTarget.clientHeight,
      );
      let nextOffset: number | undefined;
      switch (event.key) {
        case 'Home':
          if (metrics.sizes.length > 0) {
            scrollAnchorRef.current = { key: options.rowKeys[0], align: 'start' };
            nextOffset = resolveScrollTarget(0, 'start');
          }
          break;
        case 'End':
          if (metrics.sizes.length > 0) {
            const index = metrics.sizes.length - 1;
            scrollAnchorRef.current = { key: options.rowKeys[index], align: 'end' };
            nextOffset = resolveScrollTarget(index, 'end');
          }
          break;
        case 'PageUp':
          scrollAnchorRef.current = undefined;
          nextOffset = Math.max(0, event.currentTarget.scrollTop - viewportExtent);
          break;
        case 'PageDown':
          scrollAnchorRef.current = undefined;
          nextOffset = Math.min(maximumOffset, event.currentTarget.scrollTop + viewportExtent);
          break;
        default:
          return;
      }
      if (nextOffset === undefined) return;
      event.preventDefault();
      setScrollPosition(nextOffset);
    },
    [
      metrics.sizes.length,
      metrics.totalSize,
      options.enabled,
      options.rowKeys,
      resolveScrollTarget,
      setScrollPosition,
      viewportExtent,
    ],
  );

  const scrollToIndex = useCallback(
    (index: number, align: DataGridVirtualAlignment = 'center') => {
      if (!options.enabled || index < 0 || index >= metrics.sizes.length) return false;
      scrollAnchorRef.current = { key: options.rowKeys[index], align };
      setScrollPosition(resolveScrollTarget(index, align));
      return true;
    },
    [
      metrics.sizes.length,
      options.enabled,
      options.rowKeys,
      resolveScrollTarget,
      setScrollPosition,
    ],
  );

  useEffect(() => {
    if (!options.enabled) return;
    const anchor = scrollAnchorRef.current;
    if (!anchor) return;
    const index = options.rowKeys.indexOf(anchor.key);
    if (index < 0) {
      scrollAnchorRef.current = undefined;
      return;
    }
    const target = resolveScrollTarget(index, anchor.align);
    const currentOffset = scrollRef.current?.scrollTop ?? scrollOffset;
    if (Math.abs(currentOffset - target) > 0.5) setScrollPosition(target);
  }, [options.enabled, options.rowKeys, resolveScrollTarget, scrollOffset, setScrollPosition]);

  return {
    enabled: options.enabled,
    scrollRef,
    onScroll,
    onKeyDown,
    getRowRef,
    scrollToIndex,
    range,
    viewportHeight: options.viewportHeight,
  };
}
