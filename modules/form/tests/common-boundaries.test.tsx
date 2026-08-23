import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  assertCompiled,
  type DataSourceCoordinator,
  type FormPlan,
  resolveFormLocaleCatalog,
  type UiNode,
} from '../src/core';
import { useNativeDataGridDialog } from '../src/react/data-grid-dialog';
import { DesignerIcon } from '../src/react/designer-icons';
import {
  productionProfileIdForNode,
  resolveDesignerNodeUxProfile,
} from '../src/react/designer-node-profiles';
import { handlePanelTabKey } from '../src/react/designer-tabs';
import { useFormErrorFocus } from '../src/react/error-focus';
import { FieldHelp } from '../src/react/field-help';
import { MatrixWidget } from '../src/react/matrix-widget';
import { type FormWidgetProps, NativeWidget } from '../src/react/native-widget';
import type { FormNodeRegistry } from '../src/react/node-registry';
import { useStableRepeaterRows } from '../src/react/repeater-state';
import { subscribedNodePropsEqual } from '../src/react/subscriptions';
import { createDocument, createWizardDocument } from './fixtures';

const messages = resolveFormLocaleCatalog('en-US').messages;

function widgetProps(overrides: Partial<FormWidgetProps> = {}): FormWidgetProps {
  return {
    id: 'field-control',
    node: { id: 'field', kind: 'field', widget: 'text', label: 'Field' },
    value: undefined,
    disabled: false,
    invalid: false,
    required: false,
    options: [],
    dataSource: {
      options: [],
      status: 'static',
      query: '',
      searchable: false,
      hasMore: false,
      loadingMore: false,
      pageError: false,
      activate: () => undefined,
      setQuery: () => undefined,
      retry: () => undefined,
      loadMore: () => undefined,
    },
    messages,
    locale: 'en-US',
    onChange: () => undefined,
    ...overrides,
  };
}

describe('shared form boundary behavior', () => {
  it('discloses long and multiline field guidance without hiding short help', () => {
    const short = render(<FieldHelp id="short-help" label="Name" description="Your full name." />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Your full name.').getAttribute('id')).toBe('short-help');
    short.unmount();

    const longDescription = 'A'.repeat(181);
    const long = render(
      <FieldHelp id="long-help" label="Guidance" description={longDescription} />,
    );
    const more = screen.getByRole('button', { name: 'Show more help for Guidance' });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    const less = screen.getByRole('button', { name: 'Show less help for Guidance' });
    expect(less.textContent).toBe('Less');
    expect(screen.getByText(longDescription).getAttribute('data-expanded')).toBe('true');
    fireEvent.click(less);
    expect(screen.getByRole('button', { name: 'Show more help for Guidance' }).textContent).toBe(
      'More',
    );
    long.unmount();

    render(<FieldHelp id="lines-help" label="Notes" description={'First line\nSecond line'} />);
    expect(screen.getByRole('button', { name: 'Show more help for Notes' })).toBeTruthy();
  });

  it('resolves empty, three-column, host-defined, and flow layout profiles', () => {
    const document = createDocument();
    const emptyColumns: UiNode = {
      id: 'empty-columns',
      kind: 'group',
      layout: 'columns',
    };
    expect(productionProfileIdForNode(emptyColumns, document)).toBeUndefined();

    document.ui.nodes.push(
      { id: 'column-a', kind: 'group' },
      { id: 'column-b', kind: 'group' },
      { id: 'column-c', kind: 'group' },
    );
    const threeColumns: UiNode = {
      id: 'three-columns',
      kind: 'group',
      layout: 'columns',
      children: ['column-a', 'missing', 'column-b', 'column-c'],
    };
    expect(productionProfileIdForNode(threeColumns, document)).toBe('columns-3');

    const registry: FormNodeRegistry = {
      'host.editor': {
        kind: 'field',
        catalog: {
          section: 'host',
          sectionLabel: 'Host controls',
          label: 'Host editor',
          description: 'Edits a host-owned value.',
          glyph: 'H',
        },
        render: () => null,
      },
    };
    const host = resolveDesignerNodeUxProfile(
      { id: 'host', kind: 'field', widget: 'host.editor' },
      document,
      registry,
    );
    expect(host).toEqual(
      expect.objectContaining({ id: 'custom:host.editor', editor: 'host', glyph: 'H' }),
    );

    const flow = resolveDesignerNodeUxProfile(
      { id: 'column', kind: 'group', layout: 'flow' },
      document,
    );
    expect(flow.id).toBe('column');
  });

  it('ignores panel navigation when the active panel is absent', () => {
    let prevented = false;
    let changed = false;
    const button = document.createElement('button');
    handlePanelTabKey(
      {
        key: 'ArrowRight',
        currentTarget: button,
        preventDefault: () => {
          prevented = true;
        },
      } as ReactKeyboardEvent<HTMLButtonElement>,
      ['components', 'outline'],
      'settings',
      () => {
        changed = true;
      },
    );
    expect(prevented).toBe(false);
    expect(changed).toBe(false);
  });

  it('renders the remaining shared icon and native checkbox help state', () => {
    const icon = render(<DesignerIcon name="play" />);
    expect(icon.container.querySelector('path')).toBeTruthy();
    icon.unmount();

    render(
      <NativeWidget
        {...widgetProps({
          id: 'acknowledgement',
          node: {
            id: 'acknowledgement',
            kind: 'field',
            widget: 'checkbox',
            label: 'Acknowledge',
            description: 'Confirm that the details are correct.',
          },
        })}
      />,
    );
    expect(screen.getByText('Confirm that the details are correct.')).toBeTruthy();
    expect(screen.getByText('Acknowledge').classList.contains('is-required')).toBe(false);
  });

  it('keeps empty matrix labeling, disabled state, and internal focus transitions explicit', () => {
    let blurs = 0;
    const view = render(
      <MatrixWidget
        {...widgetProps({
          id: 'empty-matrix',
          labelledBy: 'matrix-label',
          disabled: true,
          node: {
            id: 'matrix',
            kind: 'field',
            widget: 'matrix-single',
            matrix: { rows: [], columns: [] },
          },
          onBlur: () => {
            blurs += 1;
          },
        })}
      />,
    );
    const fieldset = view.container.querySelector('fieldset') as HTMLFieldSetElement;
    const empty = screen.getByText(messages.matrixEmpty);
    expect(fieldset.getAttribute('aria-labelledby')).toBe('matrix-label');
    expect(fieldset.hasAttribute('aria-label')).toBe(false);
    expect(fieldset.disabled).toBe(true);
    fireEvent.blur(fieldset, { relatedTarget: empty });
    expect(blurs).toBe(0);
    fireEvent.blur(fieldset, { relatedTarget: null });
    expect(blurs).toBe(1);
  });

  it('does not attempt to open a native dialog before its ref is attached', () => {
    expect(() => renderHook(() => useNativeDataGridDialog({ current: null }))).not.toThrow();
  });

  it('recovers a repeater key by canonical value after a reference match consumes its position', () => {
    const alpha = { name: 'Alpha' };
    const beta = { name: 'Beta' };
    const { result, rerender } = renderHook(
      ({ items }: { items: Array<{ name: string }> }) => useStableRepeaterRows(items),
      { initialProps: { items: [alpha, beta] } },
    );
    const [alphaKey, betaKey] = result.current.rows.map((row) => row.key);

    rerender({ items: [beta, { name: 'Alpha' }] });

    expect(result.current.rows.map((row) => row.key)).toEqual([betaKey, alphaKey]);
  });

  it('compares widget-free subscriptions and rejects unresolved row templates', () => {
    const source = assertCompiled(createDocument());
    const nameNode = source.nodeById.name;
    const plan: FormPlan = {
      ...source,
      nodeById: { ...source.nodeById, name: { ...nameNode, widget: undefined } },
      nodeSubscriptions: { ...source.nodeSubscriptions, name: [] },
    };
    const coordinator = {} as DataSourceCoordinator;
    const getValue = () => ({ name: 'Ada' });
    const onChange = () => undefined;
    const onFieldBlur = () => undefined;
    const common = {
      plan,
      nodeId: 'name',
      value: { name: 'Ada' },
      errorMap: new Map(),
      validatingPaths: new Set<string>(),
      dataSourceCoordinator: coordinator,
      getValue,
      onChange,
      onFieldBlur,
      prefix: 'form',
      messages: {},
    };
    expect(subscribedNodePropsEqual(common, { ...common, value: { name: 'Ada' } })).toBe(true);

    const unresolved: FormPlan = {
      ...plan,
      nodeSubscriptions: { ...plan.nodeSubscriptions, name: ['rows.*.name'] },
    };
    expect(
      subscribedNodePropsEqual(
        { ...common, plan: unresolved },
        { ...common, plan: unresolved, value: { name: 'Ada' } },
      ),
    ).toBe(false);
  });

  it('focuses field shells that are themselves invalid, described, or tabbable', () => {
    const plan = assertCompiled(createWizardDocument());
    for (const attributes of [
      { 'aria-invalid': 'true' },
      { 'aria-describedby': 'workspace-help' },
      { tabindex: '0' },
    ]) {
      const form = document.createElement('form');
      const field = document.createElement('input');
      field.dataset.a3sFormPath = 'workspaceName';
      for (const [name, value] of Object.entries(attributes)) field.setAttribute(name, value);
      form.append(field);
      document.body.append(form);
      const focus = renderHook(() =>
        useFormErrorFocus({
          formRef: { current: form },
          plan,
          prefix: 'field',
          revealValuePath: () => false,
        }),
      );
      act(() => focus.result.current('workspaceName'));
      expect(document.activeElement).toBe(field);
      focus.unmount();
      form.remove();
    }
  });

  it('falls through an unhandled virtual-grid reveal and focuses a template fallback', () => {
    const source = assertCompiled(createWizardDocument());
    const workspace = source.nodeById['workspace-name'];
    const templateNode = {
      ...workspace,
      id: 'template-field',
      valuePath: 'other',
      valuePathTemplate: 'items.*.name',
    };
    const plan: FormPlan = {
      ...source,
      nodes: [...source.nodes, templateNode],
      nodeById: { ...source.nodeById, [templateNode.id]: templateNode },
    };
    const form = document.createElement('form');
    const grid = document.createElement('div');
    grid.dataset.a3sFormVirtualGrid = 'true';
    grid.dataset.a3sFormPath = 'items';
    let revealEvents = 0;
    grid.addEventListener('a3s-form-reveal-path', () => {
      revealEvents += 1;
    });
    form.append(grid);
    document.body.append(form);
    const fallback = document.createElement('button');
    fallback.id = 'template-template-field';
    document.body.append(fallback);
    const focus = renderHook(() =>
      useFormErrorFocus({
        formRef: { current: form },
        plan,
        prefix: 'template',
        revealValuePath: () => false,
      }),
    );

    act(() => focus.result.current('items.0.name'));

    expect(revealEvents).toBe(1);
    expect(document.activeElement).toBe(fallback);
    focus.unmount();
    form.remove();
    fallback.remove();
  });
});
