import { act, fireEvent, render, renderHook } from '@testing-library/react';
import {
  calculateDataGridVirtualWindow,
  createDataGridVirtualMetrics,
  useDataGridVirtualRows,
} from '../src/react/data-grid-virtual';

type VirtualRows = ReturnType<typeof useDataGridVirtualRows>;

interface HarnessDimensions {
  clientHeight: number;
  scrollHeight: number;
  scrollWidth: number;
  rendererWidth: number;
}

interface VirtualHarnessProps {
  enabled: boolean;
  rowKeys: readonly string[];
  resetKey: string;
  dimensions: HarnessDimensions;
  rowHeights: Readonly<Record<string, number>>;
  capture: (value: VirtualRows) => void;
  withRenderer?: boolean;
}

const resizeObserverDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');

class TestResizeObserver {
  static instances: TestResizeObserver[] = [];

  readonly observed = new Set<Element>();
  readonly unobserved: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
    this.unobserved.push(target);
  }

  disconnect() {
    this.disconnected = true;
    this.observed.clear();
  }

  emit(targets: readonly Element[]) {
    this.callback(
      targets.map((target) => ({ target }) as ResizeObserverEntry),
      this as unknown as ResizeObserver,
    );
  }
}

function installResizeObserver() {
  TestResizeObserver.instances = [];
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: TestResizeObserver,
  });
}

function removeResizeObserver() {
  Reflect.deleteProperty(globalThis, 'ResizeObserver');
}

function restoreResizeObserver() {
  TestResizeObserver.instances = [];
  if (resizeObserverDescriptor) {
    Object.defineProperty(globalThis, 'ResizeObserver', resizeObserverDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  }
}

function rect(height: number): DOMRect {
  return {
    bottom: height,
    height,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
}

function defineMetric(element: Element, property: string, value: () => number) {
  Object.defineProperty(element, property, { configurable: true, get: value });
}

function VirtualHarness(props: VirtualHarnessProps) {
  const virtual = useDataGridVirtualRows({
    enabled: props.enabled,
    rowKeys: props.rowKeys,
    viewportHeight: 100,
    overscan: 1,
    resetKey: props.resetKey,
  });
  props.capture(virtual);
  const visibleKeys = props.rowKeys.slice(virtual.range.start, virtual.range.end);
  const viewport = (
    <section
      aria-label="Rows"
      data-testid="viewport"
      ref={(element) => {
        virtual.scrollRef.current = element as HTMLDivElement | null;
        if (!element) return;
        defineMetric(element, 'clientHeight', () => props.dimensions.clientHeight);
        defineMetric(element, 'clientWidth', () => props.dimensions.scrollWidth);
        defineMetric(element, 'scrollHeight', () => props.dimensions.scrollHeight);
      }}
      onKeyDown={virtual.onKeyDown}
      onScroll={virtual.onScroll}
    >
      <button type="button" data-testid="viewport-child">
        Child
      </button>
      <table>
        <tbody>
          {visibleKeys.map((key) => {
            const bindRow = virtual.getRowRef(key);
            return (
              <tr
                data-row-key={key}
                key={key}
                ref={(element) => {
                  if (element) {
                    element.getBoundingClientRect = () => rect(props.rowHeights[key] ?? 56);
                  }
                  bindRow(element);
                }}
              >
                <td>{key}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
  if (props.withRenderer === false) return viewport;
  return (
    <div
      className="a3s-form-renderer"
      data-testid="renderer"
      ref={(element) => {
        if (element) {
          defineMetric(element, 'clientWidth', () => props.dimensions.rendererWidth);
        }
      }}
    >
      {viewport}
    </div>
  );
}

function rowElement(key: string, height: number) {
  const element = globalThis.document.createElement('tr');
  element.dataset.rowKey = key;
  element.getBoundingClientRect = () => rect(height);
  return element;
}

afterEach(() => restoreResizeObserver());

describe('data-grid row virtualization', () => {
  it('keeps the rendered window bounded across a large measured row set', () => {
    const keys = Array.from({ length: 1_000 }, (_, index) => `row-${index}`);
    const measurements = new Map<string, number>([
      ['row-0', 84],
      ['row-1', 72],
      ['row-2', 0],
      ['row-500', 96],
    ]);
    const metrics = createDataGridVirtualMetrics(keys, measurements, 56, 0);

    expect(metrics.totalSize).toBe(56_084);
    const first = calculateDataGridVirtualWindow(metrics, -100, 320, 3);
    expect(first.start).toBe(0);
    expect(first.end).toBeLessThan(16);
    expect(first.topSpacer).toBe(0);
    expect(first.bottomSpacer).toBeGreaterThan(55_000);

    const middle = calculateDataGridVirtualWindow(metrics, 28_000, 320, 3);
    expect(middle.start).toBeGreaterThan(490);
    expect(middle.start).toBeLessThanOrEqual(500);
    expect(middle.end).toBeGreaterThan(500);
    expect(middle.end - middle.start).toBeLessThan(20);
    expect(middle.topSpacer + middle.windowSize + middle.bottomSpacer).toBe(metrics.totalSize);

    const malformed = calculateDataGridVirtualWindow(
      { offsets: [], sizes: [10], totalSize: 10 },
      100,
      0,
      0,
    );
    expect(malformed).toEqual({
      start: 0,
      end: 1,
      topSpacer: 0,
      bottomSpacer: 0,
      windowSize: 10,
    });
    expect(
      calculateDataGridVirtualWindow({ offsets: [0], sizes: [10, 10], totalSize: 20 }, 5, 10, 0)
        .start,
    ).toBe(0);
  });

  it('returns an empty stable range when no rows are available', () => {
    const metrics = createDataGridVirtualMetrics([], new Map(), 56, 0);
    expect(calculateDataGridVirtualWindow(metrics, 100, 320, 6)).toEqual({
      start: 0,
      end: 0,
      topSpacer: 0,
      bottomSpacer: 0,
      windowSize: 0,
    });
  });

  it('measures compact rows, replaces observed elements and removes stale row state', () => {
    installResizeObserver();
    const dimensions: HarnessDimensions = {
      clientHeight: 280,
      scrollHeight: 1_600,
      scrollWidth: 400,
      rendererWidth: 400,
    };
    const rowHeights: Record<string, number> = { alpha: 240, beta: 206, gamma: 206 };
    let latest!: VirtualRows;
    const capture = (value: VirtualRows) => {
      latest = value;
    };
    const view = render(
      <VirtualHarness
        enabled
        rowKeys={['alpha', 'beta', 'gamma']}
        resetKey="initial"
        dimensions={dimensions}
        rowHeights={rowHeights}
        capture={capture}
      />,
    );
    const observer = TestResizeObserver.instances[0];
    const viewport = view.getByTestId('viewport');
    const renderer = view.getByTestId('renderer');
    expect(observer.observed.has(viewport)).toBe(true);
    expect(observer.observed.has(renderer)).toBe(true);

    act(() => observer.emit([viewport, renderer]));
    const alpha = view.container.querySelector<HTMLTableRowElement>('tr[data-row-key="alpha"]');
    if (!alpha) throw new Error('Expected alpha row.');
    act(() => observer.emit([alpha]));
    expect(latest.range.windowSize).toBeGreaterThan(240);
    act(() => observer.emit([alpha]));

    const missingKey = rowElement('', 100);
    const zeroHeight = rowElement('beta', 0);
    act(() => observer.emit([missingKey, zeroHeight]));

    dimensions.clientHeight = 0;
    dimensions.rendererWidth = 0;
    dimensions.scrollWidth = 0;
    act(() => observer.emit([viewport]));
    dimensions.scrollWidth = 800;
    act(() => observer.emit([renderer]));
    act(() => observer.emit([renderer]));

    const alphaRef = latest.getRowRef('alpha');
    expect(latest.getRowRef('alpha')).toBe(alphaRef);
    const replacement = rowElement('alpha', 252);
    act(() => alphaRef(replacement));
    expect(observer.unobserved).toContain(alpha);

    view.rerender(
      <VirtualHarness
        enabled
        rowKeys={['beta', 'gamma']}
        resetKey="initial"
        dimensions={dimensions}
        rowHeights={rowHeights}
        capture={capture}
      />,
    );
    expect(latest.getRowRef('beta')).toBe(latest.getRowRef('beta'));
    view.unmount();
    expect(observer.disconnected).toBe(true);

    dimensions.clientHeight = 100;
    dimensions.scrollWidth = 640;
    const withoutRenderer = render(
      <VirtualHarness
        enabled
        rowKeys={['solo']}
        resetKey="solo"
        dimensions={dimensions}
        rowHeights={{ solo: 56 }}
        capture={capture}
        withRenderer={false}
      />,
    );
    expect(
      TestResizeObserver.instances[1].observed.has(withoutRenderer.getByTestId('viewport')),
    ).toBe(true);
    withoutRenderer.unmount();

    renderHook(() =>
      useDataGridVirtualRows({
        enabled: true,
        rowKeys: ['detached'],
        viewportHeight: 100,
        overscan: 1,
        resetKey: 'detached',
      }),
    );
  });

  it('falls back to direct row measurements when ResizeObserver is unavailable', () => {
    removeResizeObserver();
    const hook = renderHook(() =>
      useDataGridVirtualRows({
        enabled: true,
        rowKeys: ['alpha', 'beta', 'gamma'],
        viewportHeight: 40,
        overscan: 0,
        resetKey: 'fallback',
      }),
    );
    const alphaRef = hook.result.current.getRowRef('alpha');
    expect(hook.result.current.getRowRef('alpha')).toBe(alphaRef);

    act(() => alphaRef(rowElement('alpha', 80)));
    expect(hook.result.current.range.windowSize).toBe(80);
    act(() => alphaRef(rowElement('alpha', 80.2)));
    act(() => hook.result.current.getRowRef('beta')(rowElement('beta', 0)));
    act(() => hook.result.current.getRowRef('gamma')(rowElement('gamma', Number.NaN)));
    act(() => alphaRef(null));

    act(() => expect(hook.result.current.scrollToIndex(2, 'end')).toBe(true));
    expect(hook.result.current.scrollToIndex(-1)).toBe(false);
    expect(hook.result.current.scrollToIndex(3)).toBe(false);
  });

  it('handles keyboard paging, measured end anchoring, manual scrolling and resets', () => {
    removeResizeObserver();
    const keys = Array.from({ length: 20 }, (_, index) => `row-${index}`);
    const dimensions: HarnessDimensions = {
      clientHeight: 100,
      scrollHeight: 1_200,
      scrollWidth: 640,
      rendererWidth: 640,
    };
    let latest!: VirtualRows;
    const capture = (value: VirtualRows) => {
      latest = value;
    };
    const props = {
      enabled: true,
      rowKeys: keys,
      resetKey: 'rows',
      dimensions,
      rowHeights: {} as Record<string, number>,
      capture,
    };
    const view = render(<VirtualHarness {...props} />);
    const viewport = view.getByTestId('viewport');

    expect(latest.scrollToIndex(-1)).toBe(false);
    expect(latest.scrollToIndex(keys.length)).toBe(false);
    act(() => expect(latest.scrollToIndex(5, 'start')).toBe(true));
    expect(viewport.scrollTop).toBe(280);
    act(() => latest.scrollToIndex(5));
    expect(viewport.scrollTop).toBe(258);
    act(() => latest.scrollToIndex(5, 'end'));
    expect(viewport.scrollTop).toBe(236);

    fireEvent.keyDown(viewport, { key: 'End' });
    expect(viewport.scrollTop).toBe(1_100);
    fireEvent.scroll(viewport);
    fireEvent.keyDown(viewport, { key: 'PageUp' });
    expect(viewport.scrollTop).toBe(1_000);
    fireEvent.keyDown(viewport, { key: 'PageDown' });
    expect(viewport.scrollTop).toBe(1_100);
    viewport.scrollTop = 20;
    fireEvent.keyDown(viewport, { key: 'PageUp' });
    expect(viewport.scrollTop).toBe(0);
    fireEvent.keyDown(viewport, { key: 'Home' });
    expect(viewport.scrollTop).toBe(0);

    viewport.scrollTop = 40;
    fireEvent.keyDown(view.getByTestId('viewport-child'), { key: 'End' });
    expect(viewport.scrollTop).toBe(40);
    fireEvent.keyDown(viewport, { key: 'ArrowDown' });
    expect(viewport.scrollTop).toBe(40);

    fireEvent.keyDown(viewport, { key: 'End' });
    dimensions.scrollHeight = 1_400;
    view.rerender(<VirtualHarness {...props} rowKeys={[...keys]} />);
    expect(viewport.scrollTop).toBe(1_300);

    viewport.scrollTop = 200;
    fireEvent.scroll(viewport);
    dimensions.scrollHeight = 1_600;
    view.rerender(<VirtualHarness {...props} rowKeys={[...keys]} />);
    expect(viewport.scrollTop).toBe(200);

    act(() => latest.scrollToIndex(10));
    view.rerender(<VirtualHarness {...props} rowKeys={keys.slice(0, 5)} />);
    expect(latest.range.end).toBeLessThanOrEqual(5);

    view.rerender(<VirtualHarness {...props} resetKey="filtered" />);
    expect(viewport.scrollTop).toBe(0);
    view.rerender(<VirtualHarness {...props} enabled={false} resetKey="filtered" />);
    expect(latest.enabled).toBe(false);
    expect(latest.range.end).toBe(keys.length);
    expect(latest.scrollToIndex(0)).toBe(false);
    viewport.scrollTop = 50;
    fireEvent.keyDown(viewport, { key: 'End' });
    expect(viewport.scrollTop).toBe(50);

    view.rerender(<VirtualHarness {...props} enabled rowKeys={[]} resetKey="empty" />);
    fireEvent.keyDown(viewport, { key: 'Home' });
    fireEvent.keyDown(viewport, { key: 'End' });
    expect(viewport.scrollTop).toBe(0);
  });

  it('coalesces scroll frames, clamps a shrinking model and cancels pending work', () => {
    removeResizeObserver();
    const originalRequest = window.requestAnimationFrame;
    const originalCancel = window.cancelAnimationFrame;
    let callback: FrameRequestCallback | undefined;
    const cancelled: number[] = [];
    window.requestAnimationFrame = (next) => {
      callback = next;
      return 91;
    };
    window.cancelAnimationFrame = (frame) => cancelled.push(frame);

    try {
      const dimensions: HarnessDimensions = {
        clientHeight: 100,
        scrollHeight: 0,
        scrollWidth: 640,
        rendererWidth: 640,
      };
      const keys = Array.from({ length: 20 }, (_, index) => `row-${index}`);
      let latest!: VirtualRows;
      const capture = (value: VirtualRows) => {
        latest = value;
      };
      const view = render(
        <VirtualHarness
          enabled
          rowKeys={keys}
          resetKey="clamp"
          dimensions={dimensions}
          rowHeights={{}}
          capture={capture}
        />,
      );
      const viewport = view.getByTestId('viewport');
      viewport.scrollTop = 900;
      fireEvent.scroll(viewport);
      viewport.scrollTop = 920;
      fireEvent.scroll(viewport);
      expect(callback).toBeDefined();
      act(() => callback?.(0));

      view.rerender(
        <VirtualHarness
          enabled
          rowKeys={keys.slice(0, 2)}
          resetKey="clamp"
          dimensions={dimensions}
          rowHeights={{}}
          capture={capture}
        />,
      );
      expect(viewport.scrollTop).toBe(12);

      viewport.scrollTop = 10;
      fireEvent.scroll(viewport);
      view.unmount();
      expect(cancelled).toContain(91);
      expect(latest.enabled).toBe(true);
    } finally {
      window.requestAnimationFrame = originalRequest;
      window.cancelAnimationFrame = originalCancel;
    }
  });
});
