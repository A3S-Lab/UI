import { type CSSProperties, useEffect, useId, useMemo, useRef, useState } from 'react';
import { canonicalize, formatFormMessage, type JsonValue } from '../core';
import {
  DataGridFillDialog,
  type DataGridFillSnapshot,
  DataGridPasteDialog,
} from './data-grid-bulk-dialog';
import { DataGridDialog, type DialogEditorState } from './data-grid-dialog';
import { DataGridFieldFooter } from './data-grid-footer';
import { DataGridSelectionBar } from './data-grid-selection';
import {
  DataGridColumnHeader,
  DataGridNoResults,
  DataGridToolbar,
  SelectionCheckbox,
  useDataGridView,
} from './data-grid-view';
import {
  DATA_GRID_VIRTUAL_OVERSCAN,
  DATA_GRID_VIRTUAL_VIEWPORT_HEIGHT,
  useDataGridVirtualRows,
} from './data-grid-virtual';
import { createRepeaterItem, generatedItemKey, RowActions } from './repeater-controls';
import type { RepeaterFieldProps } from './repeater-props';
import type { StableRepeaterRow, useStableRepeaterRows } from './repeater-state';

interface DataGridFieldProps extends RepeaterFieldProps {
  rows: ReturnType<typeof useStableRepeaterRows>;
}

type BulkDialogState = { kind: 'paste' } | { kind: 'fill'; snapshot: DataGridFillSnapshot };

function DataGridVirtualSpacer(props: { height: number; colSpan: number }) {
  if (props.height <= 0) return null;
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: Native table rows are not focusable; spacer rows must stay out of the accessibility row model.
    <tr className="a3s-form-data-grid-spacer" aria-hidden="true">
      <td colSpan={props.colSpan} style={{ height: props.height }} />
    </tr>
  );
}

export function DataGridField({ rows, ...props }: DataGridFieldProps) {
  const minimum = props.node.schema?.minItems ?? 0;
  const maximum = props.node.schema?.maxItems;
  const dialogEditing = props.node.dataGrid?.editMode === 'dialog';
  const multipleSelection = props.node.dataGrid?.selection === 'multiple';
  const sorting = props.node.dataGrid?.sorting === 'single';
  const filtering = props.node.dataGrid?.filtering === 'search';
  const pasteEnabled = props.node.dataGrid?.paste === 'append';
  const fillEnabled = props.node.dataGrid?.fill === 'down';
  const virtualization = props.node.dataGrid?.virtualization;
  const virtualizationEnabled = virtualization?.mode === 'rows';
  const atMaximum = maximum !== undefined && props.items.length >= maximum;
  const hasPasteableColumns = props.columns.some((column) => column.pasteable && column.path);
  const label = props.node.label ?? props.node.id;
  const totalColumnWeight = Math.max(
    1,
    props.columns.reduce((total, column) => total + column.width, 0),
  );
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const pendingScrollIndexRef = useRef<number | undefined>(undefined);
  const draftPrefix = useId().replaceAll(':', '');
  const [editor, setEditor] = useState<DialogEditorState>();
  const [bulkDialog, setBulkDialog] = useState<BulkDialogState>();
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const view = useDataGridView({
    rows: rows.rows,
    columns: props.columns,
    locale: props.locale,
    sorting,
    filtering,
    pinFocusedRow: !dialogEditing,
    getCellValue: props.getCellValue,
    formatCellValue: props.formatCellValue,
  });
  const virtualRowKeys = useMemo(() => view.rows.map((row) => row.key), [view.rows]);
  const virtual = useDataGridVirtualRows({
    enabled: virtualizationEnabled,
    rowKeys: virtualRowKeys,
    viewportHeight: virtualization?.viewportHeight ?? DATA_GRID_VIRTUAL_VIEWPORT_HEIGHT,
    overscan: virtualization?.overscan ?? DATA_GRID_VIRTUAL_OVERSCAN,
    resetKey: `${view.filterValue}\u0000${view.sortState?.columnId ?? ''}\u0000${view.sortState?.direction ?? ''}`,
  });
  const renderedRows = virtual.enabled
    ? view.rows.slice(virtual.range.start, virtual.range.end)
    : view.rows;
  const selectedRows = rows.rows.filter((row) => selectedKeys.has(row.key));
  const selectedIndices = selectedRows.map((row) => row.index);
  const selectionKey = selectedRows.map((row) => row.key).join('\u0000');
  const selectedCount = selectedIndices.length;
  const visibleSelectedRows = view.rows.filter((row) => selectedKeys.has(row.key));
  const visibleSelectedCount = visibleSelectedRows.length;
  const allSelected = view.rows.length > 0 && visibleSelectedCount === view.rows.length;
  const someSelected = visibleSelectedCount > 0 && !allSelected;
  const canDeleteSelection = props.items.length - selectedCount >= minimum;
  const activeEditorRow =
    editor?.mode === 'edit' ? rows.rows.find((row) => row.key === editor.key) : undefined;
  const editorIndex = editor?.mode === 'add' ? props.items.length : (activeEditorRow?.index ?? 0);
  const editorTitle = editor
    ? editor.mode === 'add'
      ? formatFormMessage(props.messages, 'dataGridAddRowTitle', { label })
      : formatFormMessage(props.messages, 'dataGridEditRowLabel', {
          label,
          index: editor.position + 1,
        })
    : '';

  useEffect(() => {
    if (props.errors.length > 0 && view.filterValue.trim().length > 0) view.clearFilter();
  }, [props.errors.length, view.clearFilter, view.filterValue]);

  useEffect(() => {
    if (!virtual.enabled) return;
    const fieldset = fieldsetRef.current;
    if (!fieldset) return;
    const revealRow = (event: Event) => {
      const path = (event as CustomEvent<{ path?: unknown }>).detail?.path;
      if (typeof path !== 'string' || !path.startsWith(`${props.valuePath}.`)) return;
      const segment = path.slice(props.valuePath.length + 1).split('.')[0];
      const sourceIndex = Number(segment);
      if (!Number.isSafeInteger(sourceIndex)) return;
      if (!rows.rows.some((row) => row.index === sourceIndex)) return;
      event.preventDefault();
      const position = view.rows.findIndex((row) => row.index === sourceIndex);
      if (position >= 0) {
        virtual.scrollToIndex(position);
        return;
      }
      pendingScrollIndexRef.current = sourceIndex;
      if (view.filterActive) view.clearFilter();
    };
    fieldset.addEventListener('a3s-form-reveal-path', revealRow);
    return () => fieldset.removeEventListener('a3s-form-reveal-path', revealRow);
  }, [
    props.valuePath,
    rows.rows,
    view.clearFilter,
    view.filterActive,
    view.rows,
    virtual.enabled,
    virtual.scrollToIndex,
  ]);

  useEffect(() => {
    const sourceIndex = pendingScrollIndexRef.current;
    if (!virtual.enabled || sourceIndex === undefined) return;
    const position = view.rows.findIndex((row) => row.index === sourceIndex);
    if (position < 0) return;
    pendingScrollIndexRef.current = undefined;
    virtual.scrollToIndex(position);
  }, [view.rows, virtual.enabled, virtual.scrollToIndex]);

  const restoreFocus = () => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    queueMicrotask(() => {
      if (target?.isConnected) target.focus();
    });
  };

  const closeEditor = () => {
    setEditor(undefined);
    restoreFocus();
  };

  const closeBulkDialog = () => {
    setBulkDialog(undefined);
    restoreFocus();
  };

  const openPasteDialog = (trigger: HTMLButtonElement) => {
    returnFocusRef.current = trigger;
    setBulkDialog({ kind: 'paste' });
  };

  const openFillDialog = (trigger: HTMLButtonElement) => {
    if (visibleSelectedRows.length < 2) return;
    returnFocusRef.current = trigger;
    setBulkDialog({
      kind: 'fill',
      snapshot: {
        rows: visibleSelectedRows.map((row) => ({
          key: row.key,
          value: structuredClone(row.value),
        })),
      },
    });
  };

  const openEditor = (row: StableRepeaterRow, trigger: HTMLButtonElement, position: number) => {
    const rowPath = `${props.valuePath}.${row.index}`;
    returnFocusRef.current = trigger;
    setEditor({
      mode: 'edit',
      key: row.key,
      item: structuredClone(row.value),
      source: structuredClone(row.value),
      errors: props.errors.filter(
        (error) => error.path === rowPath || error.path.startsWith(`${rowPath}.`),
      ),
      conflict: false,
      position,
    });
  };

  const openNewEditor = (trigger: HTMLButtonElement) => {
    returnFocusRef.current = trigger;
    setEditor({
      mode: 'add',
      key: `${draftPrefix}-${generatedItemKey()}`,
      item: createRepeaterItem(props.node),
      errors: [],
      conflict: false,
      position: props.items.length,
    });
  };

  const updateEditorItem = (item: JsonValue) => {
    setEditor((current) => {
      if (!current) return current;
      const currentRow =
        current.mode === 'edit' ? rows.rows.find((row) => row.key === current.key) : undefined;
      const index = current.mode === 'add' ? props.items.length : (currentRow?.index ?? 0);
      const validation =
        current.errors.length > 0 ? props.validateDialogItem(item, index) : { item, errors: [] };
      return { ...current, item: validation.item, errors: validation.errors, conflict: false };
    });
  };

  const saveEditor = (currentEditor: DialogEditorState) => {
    let index = props.items.length;
    if (currentEditor.mode === 'edit') {
      const currentRow = rows.rows.find((row) => row.key === currentEditor.key);
      if (
        !currentRow ||
        currentEditor.source === undefined ||
        canonicalize(currentRow.value) !== canonicalize(currentEditor.source)
      ) {
        setEditor({ ...currentEditor, conflict: true });
        return;
      }
      index = currentRow.index;
    }
    const validation = props.validateDialogItem(currentEditor.item, index);
    if (validation.errors.length > 0) {
      setEditor({ ...currentEditor, item: validation.item, errors: validation.errors });
      return;
    }
    if (currentEditor.mode === 'add') pendingScrollIndexRef.current = props.items.length;
    props.onChange(
      currentEditor.mode === 'add'
        ? rows.insert(validation.item)
        : rows.update(index, validation.item),
    );
    closeEditor();
  };

  const toggleRow = (key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      for (const row of view.rows) {
        if (allSelected) next.delete(row.key);
        else next.add(row.key);
      }
      return next;
    });
  };

  const deleteSelected = () => {
    if (!canDeleteSelection || selectedIndices.length === 0) return;
    props.onChange(rows.removeMany(selectedIndices));
    setSelectedKeys(new Set());
  };

  return (
    <>
      <fieldset
        ref={fieldsetRef}
        className={`a3s-form-field a3s-form-repeater fieldset is-object is-data-grid${dialogEditing ? ' is-dialog-edit' : ''}${props.errors.length ? ' is-invalid' : ''}`}
        style={props.style}
        data-read-only={props.disabled || undefined}
        aria-describedby={props.describedBy}
        aria-busy={props.validating || undefined}
        data-validating={props.validating || undefined}
        data-a3s-form-path={props.valuePath}
        data-a3s-form-virtual-grid={virtual.enabled || undefined}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) props.onBlur();
        }}
      >
        <legend className={props.required ? 'is-required' : undefined}>{label}</legend>
        {props.node.description && (
          <div className="a3s-form-help" id={`${props.id}-help`}>
            {props.node.description}
          </div>
        )}
        {props.headerActions}
        <DataGridToolbar
          label={label}
          columns={props.columns}
          messages={props.messages}
          filtering={filtering}
          sorting={sorting}
          filterValue={view.filterValue}
          setFilterValue={view.setFilterValue}
          clearFilter={view.clearFilter}
          sortState={view.sortState}
          setSortState={view.setSortState}
          visibleCount={view.rows.length}
          totalCount={rows.rows.length}
          paste={pasteEnabled}
          pasteDisabled={props.disabled || atMaximum || !hasPasteableColumns}
          pasteDisabledTitle={
            atMaximum
              ? props.messages.repeaterMaximumReached
              : !hasPasteableColumns
                ? props.messages.dataGridPasteNoColumns
                : undefined
          }
          onPaste={openPasteDialog}
        />
        {virtual.enabled && (
          <span
            className="a3s-form-data-grid-virtual-description"
            id={`${props.id}-virtual-description`}
          >
            {formatFormMessage(props.messages, 'dataGridVirtualDescription', {
              total: view.rows.length,
            })}
          </span>
        )}
        <section
          ref={virtual.scrollRef}
          className={`a3s-form-data-grid-scroll table-container${virtual.enabled ? ' is-virtualized' : ''}`}
          style={
            virtual.enabled
              ? ({
                  '--a3s-form-data-grid-viewport-height': `${virtual.viewportHeight}px`,
                } as CSSProperties)
              : undefined
          }
          aria-label={
            virtual.enabled
              ? formatFormMessage(props.messages, 'dataGridVirtualRegionLabel', { label })
              : undefined
          }
          aria-describedby={virtual.enabled ? `${props.id}-virtual-description` : undefined}
          tabIndex={virtual.enabled ? 0 : undefined}
          onScroll={virtual.onScroll}
          onKeyDown={virtual.onKeyDown}
        >
          <table
            className="a3s-form-data-grid table"
            aria-label={label}
            aria-rowcount={virtual.enabled ? view.rows.length + 1 : undefined}
            onFocusCapture={view.onFocusCapture}
            onBlurCapture={view.onBlurCapture}
          >
            <colgroup>
              <col className="a3s-form-data-grid-row-number-column" />
              {props.columns.map((column) => (
                <col
                  key={column.id}
                  style={{ width: `${(column.width / totalColumnWeight) * 100}%` }}
                />
              ))}
              <col className="a3s-form-data-grid-actions-column" />
            </colgroup>
            <thead>
              <tr aria-rowindex={virtual.enabled ? 1 : undefined}>
                <th
                  scope="col"
                  className={multipleSelection ? 'is-selectable' : undefined}
                  aria-label={props.messages.dataGridRowNumberLabel}
                >
                  {multipleSelection ? (
                    <SelectionCheckbox
                      label={formatFormMessage(
                        props.messages,
                        view.filterActive ? 'dataGridSelectVisibleLabel' : 'dataGridSelectAllLabel',
                        { label },
                      )}
                      checked={allSelected}
                      mixed={someSelected}
                      disabled={props.disabled || view.rows.length === 0}
                      onChange={toggleAll}
                    />
                  ) : (
                    <span aria-hidden="true">#</span>
                  )}
                </th>
                {props.columns.map((column) => (
                  <DataGridColumnHeader
                    key={column.id}
                    column={column}
                    messages={props.messages}
                    sorting={sorting}
                    sortState={view.sortState}
                    disabled={rows.rows.length < 2}
                    onSort={view.cycleSort}
                  />
                ))}
                <th scope="col">{props.messages.dataGridActionsLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.rows.length === 0 ? (
                <tr>
                  <td className="a3s-form-data-grid-empty" colSpan={props.columns.length + 2}>
                    <span role="status">{props.messages.dataGridEmpty}</span>
                  </td>
                </tr>
              ) : view.rows.length === 0 ? (
                <DataGridNoResults
                  messages={props.messages}
                  colSpan={props.columns.length + 2}
                  onClear={view.clearFilter}
                />
              ) : (
                <>
                  <DataGridVirtualSpacer
                    height={virtual.enabled ? virtual.range.topSpacer : 0}
                    colSpan={props.columns.length + 2}
                  />
                  {renderedRows.map((row, renderedPosition) => {
                    const position = virtual.enabled
                      ? virtual.range.start + renderedPosition
                      : renderedPosition;
                    const rowLabel = formatFormMessage(props.messages, 'dataGridRowLabel', {
                      index: position + 1,
                      label,
                    });
                    const rowPath = `${props.valuePath}.${row.index}`;
                    const rowErrors = props.errors.filter(
                      (error) => error.path === rowPath || error.path.startsWith(`${rowPath}.`),
                    );
                    return (
                      <tr
                        ref={virtual.enabled ? virtual.getRowRef(row.key) : undefined}
                        data-row-key={row.key}
                        data-a3s-form-grid-row-path={rowPath}
                        data-selected={selectedKeys.has(row.key) || undefined}
                        data-invalid={rowErrors.length > 0 || undefined}
                        aria-label={rowLabel}
                        aria-rowindex={virtual.enabled ? position + 2 : undefined}
                        key={row.key}
                      >
                        <th
                          scope="row"
                          className={multipleSelection ? 'is-selectable' : undefined}
                          aria-label={rowLabel}
                        >
                          {multipleSelection && (
                            <SelectionCheckbox
                              label={formatFormMessage(props.messages, 'dataGridSelectRowLabel', {
                                label,
                                index: position + 1,
                              })}
                              checked={selectedKeys.has(row.key)}
                              disabled={props.disabled}
                              onChange={() => toggleRow(row.key)}
                            />
                          )}
                          <span className="a3s-form-data-grid-row-index" aria-hidden="true">
                            {position + 1}
                          </span>
                          <span className="a3s-form-data-grid-row-label">{rowLabel}</span>
                          {rowErrors.length > 0 && (
                            <span className="a3s-form-data-grid-row-invalid a3s-form-error">
                              {props.messages.dataGridRowInvalid}
                            </span>
                          )}
                        </th>
                        {props.columns.map((column) => (
                          <td
                            className="a3s-form-data-grid-cell"
                            data-label={column.label}
                            key={column.id}
                          >
                            {dialogEditing ? (
                              <span className="a3s-form-data-grid-summary">
                                {props.formatCellValue(column.id, row.index)}
                              </span>
                            ) : (
                              props.renderCell(column.id, row.index, row.key)
                            )}
                          </td>
                        ))}
                        <td
                          className="a3s-form-data-grid-row-actions-cell"
                          data-label={props.messages.dataGridActionsLabel}
                        >
                          <RowActions
                            index={row.index}
                            count={props.items.length}
                            minimum={minimum}
                            label={label}
                            messages={props.messages}
                            disabled={props.disabled}
                            position={position}
                            reorderDisabled={view.transformed}
                            reorderDisabledTitle={props.messages.dataGridReorderViewActive}
                            editPath={dialogEditing ? rowPath : undefined}
                            onEdit={
                              dialogEditing
                                ? (trigger) => openEditor(row, trigger, position)
                                : undefined
                            }
                            onMove={(offset) => props.onChange(rows.move(row.index, offset))}
                            onRemove={() => props.onChange(rows.remove(row.index))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  <DataGridVirtualSpacer
                    height={virtual.enabled ? virtual.range.bottomSpacer : 0}
                    colSpan={props.columns.length + 2}
                  />
                </>
              )}
            </tbody>
          </table>
        </section>
        {virtual.enabled && view.rows.length > 0 && (
          <div className="a3s-form-data-grid-virtual-range" aria-hidden="true">
            {formatFormMessage(props.messages, 'dataGridVirtualRange', {
              start: virtual.range.start + 1,
              end: virtual.range.end,
              total: view.rows.length,
              rows:
                view.rows.length === 1
                  ? props.messages.dataGridRowSingular
                  : props.messages.dataGridRowPlural,
            })}
          </div>
        )}
        {multipleSelection && selectedCount > 0 && (
          <DataGridSelectionBar
            messages={props.messages}
            selectionKey={selectionKey}
            selectedCount={selectedCount}
            visibleSelectedCount={visibleSelectedCount}
            minimum={minimum}
            canDelete={canDeleteSelection}
            canFill={fillEnabled}
            fillColumnsAvailable={hasPasteableColumns}
            disabled={props.disabled}
            onDelete={deleteSelected}
            onFill={openFillDialog}
          />
        )}
        <DataGridFieldFooter
          id={props.id}
          valuePath={props.valuePath}
          messages={props.messages}
          errors={props.errors}
          disabled={props.disabled}
          atMaximum={atMaximum}
          validationStatus={props.validationStatus}
          onAdd={(trigger) => {
            if (view.filterActive) view.clearFilter();
            if (dialogEditing) openNewEditor(trigger);
            else props.onChange(rows.insert(createRepeaterItem(props.node)));
          }}
        />
      </fieldset>
      {editor && (
        <DataGridDialog
          id={props.id}
          title={editorTitle}
          editor={editor}
          editorIndex={editorIndex}
          columns={props.columns}
          messages={props.messages}
          disabled={props.disabled}
          atMaximum={atMaximum}
          renderCell={props.renderDialogCell}
          onItemChange={updateEditorItem}
          onRequestClose={closeEditor}
          onSave={() => saveEditor(editor)}
        />
      )}
      {bulkDialog?.kind === 'paste' && (
        <DataGridPasteDialog
          id={props.id}
          label={label}
          columns={props.columns}
          messages={props.messages}
          disabled={props.disabled}
          items={props.items}
          maximum={maximum}
          node={props.node}
          validateItems={props.validateItems}
          onRequestClose={closeBulkDialog}
          onApply={(nextItems) => {
            pendingScrollIndexRef.current = props.items.length;
            props.onChange(nextItems);
            closeBulkDialog();
          }}
        />
      )}
      {bulkDialog?.kind === 'fill' && (
        <DataGridFillDialog
          id={props.id}
          label={label}
          columns={props.columns}
          messages={props.messages}
          disabled={props.disabled}
          items={props.items}
          rows={rows.rows}
          snapshot={bulkDialog.snapshot}
          validateItems={props.validateItems}
          onRequestClose={closeBulkDialog}
          onApply={(nextItems) => {
            props.onChange(nextItems);
            closeBulkDialog();
          }}
        />
      )}
    </>
  );
}
