import { act, fireEvent, render, screen } from '@testing-library/react';
import { useMemo, useState } from 'react';
import {
  type JsonObject,
  type JsonSchema,
  type JsonValue,
  resolveFormLocaleCatalog,
  type UiNode,
  type UiOption,
} from '../src/core';
import {
  createWorkflowConfigurationWidgetRegistry,
  type WorkflowConfigurationWidgetCallbacks,
} from '../src/react';
import type { FormDataSourceState } from '../src/react/data-source';
import type { FormWidgetProps } from '../src/react/native-widget';
import { WORKFLOW_CONFIGURATION_WIDGETS } from '../src/workflow';

const idleDataSource: FormDataSourceState = {
  options: [],
  status: 'ready',
  query: '',
  searchable: false,
  hasMore: false,
  loadingMore: false,
  pageError: false,
  activate: () => undefined,
  setQuery: () => undefined,
  retry: () => undefined,
  loadMore: () => undefined,
};

interface WidgetHarnessProps {
  id: string;
  widget: string;
  initialValue?: JsonValue;
  externalValue?: JsonValue;
  schema?: JsonSchema;
  options?: UiOption[];
  customProps?: JsonObject;
  disabled?: boolean;
  callbacks?: WorkflowConfigurationWidgetCallbacks;
  labelledBy?: string;
  omitLabel?: boolean;
  omitPlaceholder?: boolean;
}

function WidgetHarness({
  id,
  widget,
  initialValue,
  externalValue,
  schema = { type: 'string' },
  options = [],
  customProps,
  disabled = false,
  callbacks,
  labelledBy,
  omitLabel = false,
  omitPlaceholder = false,
}: WidgetHarnessProps) {
  const [internalValue, setValue] = useState<JsonValue | undefined>(initialValue);
  const value = externalValue === undefined ? internalValue : externalValue;
  const registry = useMemo(() => createWorkflowConfigurationWidgetRegistry(callbacks), [callbacks]);
  const Widget = registry[widget];
  if (!Widget) throw new Error(`Missing widget: ${widget}`);
  const node: UiNode = {
    id,
    kind: 'field',
    label: omitLabel ? undefined : id,
    widget,
    placeholder: omitPlaceholder ? undefined : `Enter ${id}`,
    customProps,
  };
  const props: FormWidgetProps = {
    id: `${id}-control`,
    node,
    valuePath: id,
    schema,
    value,
    disabled,
    invalid: false,
    options,
    dataSource: idleDataSource,
    messages: resolveFormLocaleCatalog('en').messages,
    locale: 'en',
    labelledBy,
    onChange: setValue,
  };
  return (
    <div>
      <Widget {...props} />
      <output data-testid={`${id}-value`}>{JSON.stringify(value)}</output>
    </div>
  );
}

describe('workflow configuration widget metadata and actions', () => {
  it('uses Langflow list insertion labels from either metadata spelling', () => {
    render(
      <>
        <WidgetHarness
          id="Camel operations"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.sortableList}
          initialValue={[]}
          schema={{ type: 'array', items: {} }}
          customProps={{
            listAddLabel: 'Add a policy',
            sourceOptions: [{ name: 'Allow' }],
          }}
        />
        <WidgetHarness
          id="Source operations"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.sortableList}
          initialValue={[]}
          schema={{ type: 'array', items: {} }}
          customProps={{
            list_add_label: 'Add a route',
            sourceOptions: [{ name: 'Primary' }],
          }}
        />
      </>,
    );

    expect(screen.getByRole('option', { name: 'Add a policy' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Add a route' })).toBeTruthy();
  });

  it('enforces sortable-list limits and presents option icon metadata', () => {
    render(
      <WidgetHarness
        id="Storage"
        widget={WORKFLOW_CONFIGURATION_WIDGETS.sortableList}
        initialValue={[{ name: 'Local', icon: 'hard-drive' }]}
        schema={{ type: 'array', items: {} }}
        customProps={{
          limit: 1,
          sourceOptions: [
            { name: 'Local', icon: 'hard-drive' },
            { name: 'AWS', icon: 'Amazon' },
          ],
        }}
      />,
    );

    const addControl = screen.getByLabelText('Add Storage') as HTMLSelectElement;
    expect(addControl.disabled).toBe(true);
    expect(screen.getByTitle('hard-drive')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'AWS · Amazon' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Move Local up' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move Local down' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Local' }));
    expect(addControl.disabled).toBe(false);
    fireEvent.change(addControl, { target: { value: 'AWS' } });

    expect(screen.getByTestId('Storage-value').textContent).toContain('AWS');
    expect(screen.getByTestId('Storage-value').textContent).not.toContain('Local');
    expect(addControl.disabled).toBe(true);
  });

  it('gives multiline fields a bounded editor with an explicit expansion control', () => {
    render(
      <WidgetHarness
        id="Agent Instructions"
        widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
        initialValue={'First line\nSecond line'}
        customProps={{ controlWidget: 'textarea' }}
      />,
    );

    const textarea = screen.getByRole('textbox', { name: 'Agent Instructions' });
    const expand = screen.getByRole('button', { name: 'Expand Agent Instructions editor' });
    expect(
      textarea.closest('.a3s-form-workflow-source-editor')?.getAttribute('data-expanded'),
    ).toBeNull();
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('2 lines')).toBeTruthy();

    fireEvent.click(expand);
    expect(
      textarea.closest('.a3s-form-workflow-source-editor')?.getAttribute('data-expanded'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Collapse Agent Instructions editor' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('uses and labels finite slider range metadata', () => {
    render(
      <WidgetHarness
        id="Threshold"
        widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
        initialValue={0.7}
        schema={{ type: 'number', minimum: 0, maximum: 1, multipleOf: 0.1 }}
        customProps={{ controlWidget: 'slider' }}
      />,
    );

    const slider = screen.getByRole('slider', { name: 'Threshold' }) as HTMLInputElement;
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('1');
    expect(slider.step).toBe('0.1');
    expect(screen.getByText('Min 0')).toBeTruthy();
    expect(screen.getByText('Max 1')).toBeTruthy();
    expect(screen.getByText('Step 0.1')).toBeTruthy();
  });

  it('routes copy and data-display button actions through explicit host callbacks', () => {
    interface CopyRequest {
      nodeId: string;
      valuePath?: string;
      value: JsonValue | undefined;
    }
    interface DataDisplayActionRequest extends CopyRequest {
      buttonText: string;
      buttonIcon?: string;
    }
    const copies: CopyRequest[] = [];
    const displayActions: DataDisplayActionRequest[] = [];
    const callbacks = {
      onCopyField: (request: CopyRequest) => copies.push(request),
      onDataDisplayAction: (request: DataDisplayActionRequest) => displayActions.push(request),
    };

    render(
      <>
        <WidgetHarness
          id="Endpoint"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          initialValue="https://example.test/hooks/1"
          customProps={{ controlWidget: 'textarea', copyField: true }}
          callbacks={callbacks}
        />
        <WidgetHarness
          id="Agent card"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.dataDisplay}
          initialValue={{ name: 'Research agent' }}
          schema={{ type: 'object' }}
          customProps={{ buttonText: 'View agent card', buttonIcon: 'id-card' }}
          callbacks={callbacks}
        />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy Endpoint' }));
    fireEvent.click(screen.getByRole('button', { name: 'View agent card' }));

    expect(copies).toEqual([
      {
        nodeId: 'Endpoint',
        valuePath: 'Endpoint',
        value: 'https://example.test/hooks/1',
      },
    ]);
    expect(displayActions).toEqual([
      {
        nodeId: 'Agent card',
        valuePath: 'Agent card',
        value: { name: 'Research agent' },
        buttonText: 'View agent card',
        buttonIcon: 'id-card',
      },
    ]);
    expect(screen.getByTitle('id-card')).toBeTruthy();
  });

  it('debounces automatic refreshes, marks their trigger, and clears pending work', () => {
    interface RefreshRequest {
      nodeId: string;
      valuePath?: string;
      value: JsonValue | undefined;
      trigger: 'manual' | 'automatic';
    }
    const refreshes: RefreshRequest[] = [];
    const callbacks = {
      onRefreshField: (request: RefreshRequest) => refreshes.push(request),
    };
    rs.useFakeTimers();
    try {
      const { unmount } = render(
        <WidgetHarness
          id="Live query"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          initialValue="initial"
          customProps={{
            controlWidget: 'text',
            realTimeRefresh: true,
            refreshButton: true,
          }}
          callbacks={callbacks}
        />,
      );

      act(() => rs.runAllTimers());
      expect(refreshes).toEqual([]);

      const input = screen.getByLabelText('Live query');
      fireEvent.change(input, { target: { value: 'draft' } });
      act(() => rs.advanceTimersByTime(200));
      fireEvent.change(input, { target: { value: 'final' } });
      act(() => rs.advanceTimersByTime(249));
      expect(refreshes).toEqual([]);
      act(() => rs.advanceTimersByTime(1));
      expect(refreshes).toEqual([
        {
          nodeId: 'Live query',
          valuePath: 'Live query',
          value: 'final',
          trigger: 'automatic',
        },
      ]);

      fireEvent.click(screen.getByRole('button', { name: 'Refresh Live query' }));
      expect(refreshes.at(-1)).toEqual({
        nodeId: 'Live query',
        valuePath: 'Live query',
        value: 'final',
        trigger: 'manual',
      });

      fireEvent.change(input, { target: { value: 'pending' } });
      unmount();
      act(() => rs.runAllTimers());
      expect(refreshes).toHaveLength(2);
    } finally {
      rs.useRealTimers();
    }
  });

  it('ignores rehydrated JSON-equivalent values and refreshes once for a semantic change', () => {
    interface RefreshRequest {
      nodeId: string;
      valuePath?: string;
      value: JsonValue | undefined;
      trigger: 'manual' | 'automatic';
    }
    const refreshes: RefreshRequest[] = [];
    const callbacks = {
      onRefreshField: (request: RefreshRequest) => refreshes.push(request),
    };
    rs.useFakeTimers();
    try {
      const { rerender } = render(
        <WidgetHarness
          id="Live object"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          externalValue={{ query: 'stable', settings: { limit: 5, enabled: true } }}
          schema={{ type: 'object' }}
          customProps={{ controlWidget: 'json', realTimeRefresh: true }}
          callbacks={callbacks}
        />,
      );

      rerender(
        <WidgetHarness
          id="Live object"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          externalValue={{ settings: { enabled: true, limit: 5 }, query: 'stable' }}
          schema={{ type: 'object' }}
          customProps={{ controlWidget: 'json', realTimeRefresh: true }}
          callbacks={callbacks}
        />,
      );
      act(() => rs.runAllTimers());
      expect(refreshes).toEqual([]);

      const changedValue = { query: 'changed', settings: { enabled: true, limit: 5 } };
      rerender(
        <WidgetHarness
          id="Live object"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          externalValue={changedValue}
          schema={{ type: 'object' }}
          customProps={{ controlWidget: 'json', realTimeRefresh: true }}
          callbacks={callbacks}
        />,
      );
      act(() => rs.advanceTimersByTime(249));
      expect(refreshes).toEqual([]);
      act(() => rs.advanceTimersByTime(1));
      expect(refreshes).toEqual([
        {
          nodeId: 'Live object',
          valuePath: 'Live object',
          value: changedValue,
          trigger: 'automatic',
        },
      ]);
    } finally {
      rs.useRealTimers();
    }
  });

  it('guards boundary actions and preserves host-neutral control fallbacks', () => {
    render(
      <>
        <span id="external-multiline-label">External instructions</span>
        <WidgetHarness
          id="Fallback multiline"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          initialValue={null}
          customProps={{ controlWidget: 'textarea' }}
          labelledBy="external-multiline-label"
          omitLabel
        />
        <WidgetHarness
          id="Odd operations"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.sortableList}
          initialValue={[7, 8]}
          schema={{ type: 'array', items: {} }}
        />
        <WidgetHarness
          id="Blank decisions"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.actionPicker}
          schema={{ type: 'array', items: {} }}
        />
        <WidgetHarness
          id="Zero duration"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.duration}
          initialValue={{ value: 0 }}
          schema={{ type: 'object' }}
        />
        <WidgetHarness
          id="Custom slider"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          initialValue={0.5}
          schema={{ type: 'number', minimum: 0, maximum: 1 }}
          customProps={{ controlWidget: 'slider', step: 0.25 }}
        />
        <WidgetHarness
          id="Free slider"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          initialValue={0}
          schema={{ type: 'number' }}
          customProps={{ controlWidget: 'slider' }}
        />
        <WidgetHarness
          id="Unlabelled actions"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          initialValue=""
          customProps={{
            controlWidget: 'text',
            copyField: true,
            inputTypes: ['Message'],
            refreshButton: true,
          }}
          omitLabel
        />
        <WidgetHarness
          id="Fallback model select"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.model}
          initialValue=""
          options={[{ label: 'Model', value: 'model' }]}
          omitLabel
          omitPlaceholder
        />
        <WidgetHarness
          id="Unlabelled JSON"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.json}
          initialValue={{}}
          schema={{ type: 'object' }}
          omitLabel
        />
        <WidgetHarness
          id="Unlabelled code"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.code}
          initialValue={null}
          omitLabel
        />
        <WidgetHarness
          id="Unlabelled prompt"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.prompt}
          initialValue={null}
          omitLabel
        />
      </>,
    );

    const multiline = screen.getByRole('textbox', { name: 'External instructions' });
    expect(screen.getAllByText('Empty').length).toBeGreaterThan(0);
    fireEvent.change(multiline, { target: { value: 'One line' } });
    expect(screen.getByText('1 line')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Fallback multiline editor' }));

    const movePastStart = screen.getByRole('button', { name: 'Move 7 up' }) as HTMLButtonElement;
    movePastStart.disabled = false;
    fireEvent.click(movePastStart);
    expect(screen.getByTestId('Odd operations-value').textContent).toBe('[7,8]');

    fireEvent.keyDown(screen.getByPlaceholderText('Add a decision'), { key: 'Enter' });
    expect(screen.getByTestId('Blank decisions-value').textContent).toBe('');
    fireEvent.change(screen.getByLabelText('Zero duration value'), { target: { value: '0' } });
    expect(screen.getByTestId('Zero duration-value').textContent).toContain('"value":0');

    expect(screen.getByText('Step 0.25')).toBeTruthy();
    expect(screen.queryByText('Step 1')).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Copy Unlabelled actions' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByRole('option', { name: 'Select a model' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Expand Unlabelled JSON editor' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Expand Unlabelled code editor' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Expand Unlabelled prompt editor' })).toBeTruthy();
  });
});
