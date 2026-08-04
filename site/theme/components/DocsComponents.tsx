import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  useLang,
  useSite,
  useVersion,
  withBase,
} from '@rspress/core/runtime';
import Chart, { type ChartConfiguration } from 'chart.js/auto';

declare global {
  interface Window {
    basecoat?: {
      initAll: (options?: { force?: boolean }) => void;
    };
  }
}

const attributeAliases: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  autocomplete: 'autoComplete',
  maxlength: 'maxLength',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
};

const eventAliases: Record<string, string> = {
  onclick: 'onClick',
  onchange: 'onChange',
  oninput: 'onInput',
  onkeydown: 'onKeyDown',
  onkeyup: 'onKeyUp',
  onpointerdown: 'onPointerDown',
  onpointerup: 'onPointerUp',
  onsubmit: 'onSubmit',
};

function parseStyleAttribute(value: string): CSSProperties {
  const entries = value
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator === -1) return null;
      const property = declaration.slice(0, separator).trim();
      const propertyValue = declaration.slice(separator + 1).trim();
      const reactProperty = property.startsWith('--')
        ? property
        : property.replace(/-([a-z])/g, (_, letter: string) =>
            letter.toUpperCase(),
          );
      return [reactProperty, propertyValue] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  return Object.fromEntries(entries) as CSSProperties;
}

function createInlineHandler(source: string) {
  const evaluate = Function('event', source) as (
    this: EventTarget,
    event: Event,
  ) => void;

  return (event: { currentTarget: EventTarget; preventDefault: () => void }) => {
    evaluate.call(event.currentTarget, event as unknown as Event);
  };
}

function normalizePreviewNode(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.map(normalizePreviewNode);
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<Record<string, unknown>>;
  const normalizedProps: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(element.props)) {
    if (name === 'children') continue;

    const attributeAlias = attributeAliases[name];
    if (attributeAlias) {
      normalizedProps[name] = undefined;
      normalizedProps[attributeAlias] = value;
      continue;
    }

    const eventAlias = eventAliases[name];
    if (eventAlias && typeof value === 'string') {
      normalizedProps[name] = undefined;
      normalizedProps[eventAlias] = createInlineHandler(value);
      continue;
    }

    if (name === 'style' && typeof value === 'string') {
      normalizedProps.style = parseStyleAttribute(value);
      continue;
    }

    normalizedProps[name] = value;
  }

  normalizedProps.children = normalizePreviewNode(element.props.children as ReactNode);
  return cloneElement(element, normalizedProps);
}

function initializeDocumentationDemos(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-checkbox-table]').forEach((table) => {
    if (table.dataset.demoCheckboxTableInitialized) return;
    table.dataset.demoCheckboxTableInitialized = 'true';
    const selectAll = table.querySelector<HTMLInputElement>(
      "thead input[type='checkbox']",
    );
    const rowCheckboxes = Array.from(
      table.querySelectorAll<HTMLInputElement>("tbody input[type='checkbox']"),
    );

    const synchronize = () => {
      rowCheckboxes.forEach((checkbox) => {
        const row = checkbox.closest<HTMLElement>('tr');
        if (!row) return;
        if (checkbox.checked) row.dataset.state = 'selected';
        else row.removeAttribute('data-state');
      });

      if (!selectAll || rowCheckboxes.length === 0) return;
      const selected = rowCheckboxes.filter((checkbox) => checkbox.checked).length;
      selectAll.checked = selected === rowCheckboxes.length;
      selectAll.indeterminate = selected > 0 && selected < rowCheckboxes.length;
    };

    selectAll?.addEventListener('change', () => {
      rowCheckboxes.forEach((checkbox) => {
        checkbox.checked = Boolean(selectAll.checked);
      });
      synchronize();
    });
    rowCheckboxes.forEach((checkbox) =>
      checkbox.addEventListener('change', synchronize),
    );
    synchronize();
  });

  window.basecoat?.initAll();
}

function handleDocumentationDemoClick(event: ReactMouseEvent<HTMLDivElement>) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>('[data-demo-shell-toggle]');
  if (!button) return;

  const shell = button.closest<HTMLElement>('.app-shell');
  if (!shell) return;
  const expanded = shell.dataset.navigation !== 'collapsed';
  shell.dataset.navigation = expanded ? 'collapsed' : 'expanded';
  button.setAttribute('aria-expanded', String(!expanded));
  button.setAttribute(
    'aria-label',
    expanded ? 'Expand navigation' : 'Collapse navigation',
  );
}

type PreviewProps = HTMLAttributes<HTMLDivElement> & {
  class?: string;
  children: ReactNode;
};

export function Preview({ children, className, class: htmlClass }: PreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (canvasRef.current) initializeDocumentationDemos(canvasRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [children]);

  return (
    <section className="a3s-preview" aria-label="Interactive component preview">
      <header className="a3s-preview__header">
        <span>
          <i aria-hidden="true" /> Live preview
        </span>
        <small>HTML · CSS · JavaScript</small>
      </header>
      <div className="a3s-preview__stage">
        <div
          ref={canvasRef}
          onClick={handleDocumentationDemoClick}
          className={['a3s-preview__canvas', 'rp-not-doc', className, htmlClass]
            .filter(Boolean)
            .join(' ')}
        >
          {normalizePreviewNode(children)}
        </div>
      </div>
    </section>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <div className="a3s-steps">{children}</div>;
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="a3s-step">
      <div className="a3s-step__rail" aria-hidden="true">
        <span />
      </div>
      <div className="a3s-step__body">
        <h3>{title}</h3>
        {children}
      </div>
    </section>
  );
}

export function CodeGroup({ children }: { children: ReactNode }) {
  return <div className="a3s-code-group">{Children.toArray(children)}</div>;
}

type CalloutProps = {
  action?: { label: string; href: string };
  children: ReactNode;
  icon?: string;
  title?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
};

export function Callout({
  action,
  children,
  title,
  type = 'info',
}: CalloutProps) {
  const language = useLang();
  const version = useVersion();
  const { site } = useSite();
  const routePrefix = [
    version && version !== site.multiVersion.default ? version : '',
    language !== site.lang ? language : '',
  ]
    .filter(Boolean)
    .join('/');
  const actionHref = action
    ? action.href.startsWith('/')
      ? withBase(
          `/${[routePrefix, action.href.replace(/^\/+/, '')]
            .filter(Boolean)
            .join('/')}`,
        )
      : action.href
    : undefined;

  return (
    <aside className="a3s-callout" data-type={type}>
      <span className="a3s-callout__mark" aria-hidden="true">
        {type === 'warning' ? '!' : type === 'danger' ? '×' : 'i'}
      </span>
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
      {action && actionHref ? (
        <a href={actionHref} className="a3s-callout__action">
          {action.label} <span aria-hidden="true">→</span>
        </a>
      ) : null}
    </aside>
  );
}

type ChartDemoVariant =
  | 'bar'
  | 'line'
  | 'step'
  | 'stacked'
  | 'donut'
  | 'radar';

function chartConfiguration(variant: ChartDemoVariant): ChartConfiguration {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const gridColor = 'rgba(123, 132, 148, 0.16)';
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: variant === 'donut' || variant === 'radar' } },
    scales:
      variant === 'donut' || variant === 'radar'
        ? undefined
        : {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: gridColor } },
          },
  };

  if (variant === 'donut') {
    return {
      type: 'doughnut',
      data: {
        labels: ['Direct', 'Search', 'Social', 'Referral'],
        datasets: [
          {
            data: [42, 31, 17, 10],
            backgroundColor: ['#4f7ff0', '#28a978', '#9a63df', '#e4a43b'],
            borderWidth: 0,
          },
        ],
      },
      options: commonOptions,
    };
  }

  if (variant === 'radar') {
    return {
      type: 'radar',
      data: {
        labels: ['Speed', 'Quality', 'Safety', 'Reach', 'Control', 'Clarity'],
        datasets: [
          {
            label: 'A3S UI',
            data: [86, 92, 88, 78, 91, 94],
            borderColor: '#4f7ff0',
            backgroundColor: 'rgba(79, 127, 240, 0.18)',
            pointBackgroundColor: '#4f7ff0',
          },
        ],
      },
      options: commonOptions,
    };
  }

  const isLine = variant === 'line' || variant === 'step';
  return {
    type: isLine ? 'line' : 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Desktop',
          data: [186, 305, 237, 273, 209, 314],
          borderColor: '#4f7ff0',
          backgroundColor: isLine ? 'rgba(79, 127, 240, 0.14)' : '#4f7ff0',
          fill: isLine,
          stepped: variant === 'step',
          tension: variant === 'line' ? 0.35 : 0,
          stack: variant === 'stacked' ? 'traffic' : undefined,
        },
        {
          label: 'Mobile',
          data: [80, 200, 120, 190, 130, 220],
          borderColor: '#28a978',
          backgroundColor: isLine ? 'rgba(40, 169, 120, 0.08)' : '#71c9a8',
          fill: isLine,
          tension: variant === 'line' ? 0.35 : 0,
          stack: variant === 'stacked' ? 'traffic' : undefined,
        },
      ],
    },
    options: commonOptions,
  };
}

export function ChartDemo({ variant = 'bar' }: { variant?: ChartDemoVariant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, chartConfiguration(variant));
    return () => chart.destroy();
  }, [variant]);

  return (
    <div className="a3s-chart-demo">
      <canvas ref={canvasRef} aria-label={`${variant} chart preview`} />
    </div>
  );
}
