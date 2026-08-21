import { useMemo } from 'react';
import type {
  FormDocument,
  FormPatch,
  JsonSchema,
  JsonValue,
  UiMatrixColumn,
  UiMatrixRow,
  UiNode,
  UiOption,
} from '../core';
import { DATA_GRID_VIRTUAL_VIEWPORT_HEIGHT } from './data-grid-virtual';
import { DesignerIcon } from './designer-icons';
import {
  LayoutItemEditor,
  MatrixDefinitionEditor,
  OptionEditor,
} from './designer-inspector-collections';
import {
  ComponentContext,
  Control,
  FieldWidgetOptions,
  InspectorSection,
  numberOrUndefined,
  SettingGroup,
  Toggle,
  ValueShape,
} from './designer-inspector-controls';
import { DataSourceControl, DefaultValueControl } from './designer-inspector-data';
import { ValidationPanel } from './designer-inspector-validation';
import { resolveDesignerNodeUxProfile } from './designer-node-profiles';
import { DesignerNodeSummary } from './designer-node-summary';
import { handlePanelTabKey } from './designer-tabs';
import type { FormNodeRegistry } from './node-registry';
import { SelectControl } from './select-control';
import { OPTION_FIELD_WIDGETS, PLACEHOLDER_FIELD_WIDGETS } from './widget-contract';

export type InspectorPanel = 'properties' | 'validation' | 'agent';

export interface PatchFeedback {
  tone: 'success' | 'error';
  message: string;
}

export function Inspector(props: {
  document: FormDocument;
  selected: UiNode | undefined;
  selectedProperty: string | undefined;
  selectedSchema: JsonSchema | undefined;
  availableFieldWidgets: readonly { label: string; value: string }[];
  nodeRegistry?: FormNodeRegistry;
  panel: InspectorPanel;
  patchText: string;
  patchFeedback: PatchFeedback | undefined;
  onPanelChange: (panel: InspectorPanel) => void;
  onUpdateNode: (changes: Partial<UiNode>) => void;
  onUpdateWidget: (widget: string) => void;
  onUpdateMetadata: (changes: Partial<FormDocument['metadata']>) => void;
  onUpdateSchema: (changes: Partial<JsonSchema>) => void;
  onUpdateCustomNode: (changes: { node?: Partial<UiNode>; schema?: Partial<JsonSchema> }) => void;
  onSetRequired: (required: boolean) => void;
  onUpdateOptions: (text: string) => void;
  onReplaceOptions: (options: UiOption[]) => void;
  onUpdateMatrixRows: (text: string) => void;
  onReplaceMatrixRows: (rows: UiMatrixRow[]) => void;
  onUpdateMatrixColumns: (text: string) => void;
  onReplaceMatrixColumns: (columns: UiMatrixColumn[]) => void;
  onSetMatrixRowsRequired: (required: boolean) => void;
  onUpdateMatrixMinimum: (value: number | undefined) => void;
  onUpdateMatrixMaximum: (value: number | undefined) => void;
  onAddLayoutItem: () => void;
  onSelectNode: (nodeId: string) => void;
  onUpdateLayoutItem: (nodeId: string, changes: Partial<UiNode>) => void;
  onMoveLayoutItem: (nodeId: string, direction: -1 | 1) => void;
  onDuplicateLayoutItem: (nodeId: string) => void;
  onRemoveLayoutItem: (nodeId: string) => void;
  onUpdateColumnWidths: (widths: UiNode['width'][]) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onPatchTextChange: (text: string) => void;
  onReviewPatch: () => void;
}) {
  const { selected } = props;
  const selectedProfile = selected
    ? resolveDesignerNodeUxProfile(selected, props.document, props.nodeRegistry)
    : undefined;
  const validationAvailable = selected?.kind === 'field' || selected?.kind === 'repeater';
  const panels: readonly InspectorPanel[] = validationAvailable
    ? ['properties', 'validation', 'agent']
    : ['properties', 'agent'];
  return (
    <aside
      className="a3s-form-inspector task-pane tabs"
      aria-label="属性面板"
      data-editor={selectedProfile?.editor}
    >
      <div className="a3s-form-panel-tabs is-inspector" role="tablist" aria-label="属性面板标签">
        <button
          type="button"
          id="a3s-form-inspector-tab-properties"
          role="tab"
          aria-controls="a3s-form-inspector-panel"
          aria-selected={props.panel === 'properties'}
          tabIndex={props.panel === 'properties' ? 0 : -1}
          className={`btn${props.panel === 'properties' ? ' is-active' : ''}`}
          data-size="xs"
          data-variant="ghost"
          onKeyDown={(event) => handlePanelTabKey(event, panels, props.panel, props.onPanelChange)}
          onClick={() => props.onPanelChange('properties')}
        >
          属性
        </button>
        <button
          type="button"
          id="a3s-form-inspector-tab-validation"
          role="tab"
          aria-controls="a3s-form-inspector-panel"
          aria-selected={props.panel === 'validation'}
          tabIndex={props.panel === 'validation' ? 0 : -1}
          className={`btn${props.panel === 'validation' ? ' is-active' : ''}`}
          data-size="xs"
          data-variant="ghost"
          disabled={!validationAvailable}
          aria-disabled={!validationAvailable}
          title={validationAvailable ? '编辑字段校验' : '当前节点不需要字段校验'}
          onKeyDown={(event) => handlePanelTabKey(event, panels, props.panel, props.onPanelChange)}
          onClick={() => props.onPanelChange('validation')}
        >
          校验
        </button>
        <button
          type="button"
          id="a3s-form-inspector-tab-agent"
          role="tab"
          aria-controls="a3s-form-inspector-panel"
          aria-selected={props.panel === 'agent'}
          tabIndex={props.panel === 'agent' ? 0 : -1}
          className={`btn${props.panel === 'agent' ? ' is-active' : ''}`}
          data-size="xs"
          data-variant="ghost"
          onKeyDown={(event) => handlePanelTabKey(event, panels, props.panel, props.onPanelChange)}
          onClick={() => props.onPanelChange('agent')}
        >
          Agent
        </button>
      </div>
      <div
        className="a3s-form-inspector-body"
        id="a3s-form-inspector-panel"
        role="tabpanel"
        aria-labelledby={`a3s-form-inspector-tab-${props.panel}`}
      >
        {props.panel === 'agent' ? (
          <PatchPanel
            document={props.document}
            patchText={props.patchText}
            patchFeedback={props.patchFeedback}
            onTextChange={props.onPatchTextChange}
            onReview={props.onReviewPatch}
          />
        ) : selected ? (
          <>
            <DesignerNodeSummary
              document={props.document}
              node={selected}
              selectedProperty={props.selectedProperty}
              nodeRegistry={props.nodeRegistry}
              onDuplicate={props.onDuplicate}
              onRemove={props.onRemove}
            />
            {props.panel === 'properties' ? (
              <PropertiesPanel {...props} selected={selected} />
            ) : (
              <ValidationPanel {...props} selected={selected} />
            )}
          </>
        ) : (
          <p className="a3s-form-empty">选择一个节点以编辑属性。</p>
        )}
      </div>
    </aside>
  );
}

function contentCopyForNode(node: UiNode): {
  title: string;
  description: string;
  label: string;
  labelAria: string;
  help: string;
  helpAria: string;
} {
  if (node.kind === 'field') {
    return {
      title: '字段内容',
      description: '填写页显示的字段名称和补充说明。',
      label: '字段标题',
      labelAria: '字段标题',
      help: '字段说明',
      helpAria: '字段说明',
    };
  }
  if (node.kind === 'repeater') {
    return {
      title: '重复项内容',
      description: '填写页显示的列表名称和补充说明。',
      label: '列表标题',
      labelAria: '列表标题',
      help: '列表说明',
      helpAria: '列表说明',
    };
  }
  if (node.layout === 'page') {
    return {
      title: '步骤内容',
      description: '向导中显示的步骤名称和补充说明。',
      label: '步骤标题',
      labelAria: '步骤标题',
      help: '步骤说明',
      helpAria: '步骤说明',
    };
  }
  if (node.layout === 'tab') {
    return {
      title: '标签页内容',
      description: '标签导航中显示的名称和补充说明。',
      label: '标签页标题',
      labelAria: '标签页标题',
      help: '标签页说明',
      helpAria: '标签页说明',
    };
  }
  if (node.layout === 'collapse-panel') {
    return {
      title: '面板内容',
      description: '折叠面板显示的名称和补充说明。',
      label: '面板标题',
      labelAria: '面板标题',
      help: '面板说明',
      helpAria: '面板说明',
    };
  }
  if (node.kind === 'section') {
    return {
      title: '分组内容',
      description: '内容分组显示的名称和补充说明。',
      label: '分组标题',
      labelAria: '分组标题',
      help: '分组说明',
      helpAria: '分组说明',
    };
  }
  return {
    title: '容器内容',
    description: '画布中显示的容器名称和补充说明。',
    label: '容器标题',
    labelAria: '容器标题',
    help: '容器说明',
    helpAria: '容器说明',
  };
}

function layoutCopyForNode(node: UiNode): { title: string; description: string } {
  if (node.kind === 'field' || node.kind === 'repeater') {
    return { title: '位置与宽度', description: '设置节点在当前容器中占用的栅格宽度。' };
  }
  if (node.kind === 'content') {
    return { title: '内容布局', description: '设置内容宽度和自身间距。' };
  }
  return { title: '容器布局', description: '设置容器宽度、内部栏数和间距。' };
}

function PropertiesPanel(props: Parameters<typeof Inspector>[0] & { selected: UiNode }) {
  const { selected } = props;
  const valueNode = selected.kind === 'field' || selected.kind === 'repeater';
  const matrixField = selected.widget === 'matrix-single' || selected.widget === 'matrix-multiple';
  const updateCustomProperty = (key: string, value: JsonValue | undefined) => {
    const customProps = { ...(selected.customProps ?? {}) };
    if (value === undefined) delete customProps[key];
    else customProps[key] = value;
    props.onUpdateNode({ customProps });
  };
  const dataGridEligible =
    selected.kind === 'repeater' &&
    props.selectedSchema?.items?.type === 'object' &&
    (selected.children?.length ?? 0) > 0 &&
    (selected.children ?? []).every(
      (id) => props.document.ui.nodes.find((node) => node.id === id)?.kind === 'field',
    );
  const supportsInternalGrid =
    (selected.kind === 'section' || selected.kind === 'group') &&
    selected.layout !== 'columns' &&
    selected.layout !== 'tabs' &&
    selected.layout !== 'collapse' &&
    selected.layout !== 'wizard';
  const CustomInspector = selected.widget
    ? props.nodeRegistry?.[selected.widget]?.inspector
    : undefined;
  const contentCopy = contentCopyForNode(selected);
  const layoutCopy = layoutCopyForNode(selected);
  const placeholderField =
    selected.kind === 'field' &&
    PLACEHOLDER_FIELD_WIDGETS.has(selected.widget ?? 'text') &&
    !CustomInspector;
  const objectRepeater =
    selected.kind === 'repeater' && props.selectedSchema?.items?.type === 'object';
  const hasComponentSettings =
    selected.layout === 'data-grid' ||
    selected.kind === 'repeater' ||
    Boolean(matrixField && selected.matrix) ||
    selected.widget === 'currency' ||
    selected.widget === 'rating' ||
    selected.widget === 'slider' ||
    selected.widget === 'calculated' ||
    OPTION_FIELD_WIDGETS.has(selected.widget ?? '') ||
    Boolean(CustomInspector);
  const componentName =
    selected.layout === 'data-grid'
      ? '数据表格'
      : (props.availableFieldWidgets.find(({ value }) => value === selected.widget)?.label ??
        '组件');
  const layoutItems =
    selected.layout === 'tabs' || selected.layout === 'collapse' || selected.layout === 'wizard'
      ? (selected.children ?? []).flatMap((id) => {
          const item = props.document.ui.nodes.find((node) => node.id === id);
          return item ? [item] : [];
        })
      : [];
  const columnChildren =
    selected.layout === 'columns'
      ? (selected.children ?? []).flatMap((id) => {
          const item = props.document.ui.nodes.find((node) => node.id === id);
          return item ? [item] : [];
        })
      : [];
  const ratioOptions = columnRatioOptions(columnChildren.length);
  const currentRatio = columnChildren.map((item) => item.width ?? 12).join(',');
  if (selected.kind === 'root') {
    return (
      <div className="a3s-form-inspector-fields">
        <InspectorSection title="表单内容" description="填写页顶部展示的名称和说明。">
          <Control label="表单标题">
            <input
              aria-label="表单标题"
              value={props.document.metadata.title}
              onChange={(event) => props.onUpdateMetadata({ title: event.target.value })}
            />
          </Control>
          <Control label="表单说明">
            <textarea
              aria-label="表单说明"
              value={props.document.metadata.description ?? ''}
              onChange={(event) => props.onUpdateMetadata({ description: event.target.value })}
            />
          </Control>
        </InspectorSection>
        <InspectorSection
          title="画布布局"
          description="设置表单的基础栅格和字段间距。"
          collapsible
          summary="高级"
        >
          <Control label="画布栏数">
            <SelectControl
              aria-label="画布栏数"
              value={selected.columns ?? 12}
              onChange={(event) =>
                props.onUpdateNode({ columns: Number(event.target.value) as UiNode['columns'] })
              }
            >
              {[1, 2, 3, 4, 6, 12].map((columns) => (
                <option key={columns} value={columns}>
                  {columns} 栏
                </option>
              ))}
            </SelectControl>
          </Control>
          <Control label="字段间距">
            <SelectControl
              aria-label="画布间距"
              value={selected.gap ?? 16}
              onChange={(event) =>
                props.onUpdateNode({ gap: Number(event.target.value) as UiNode['gap'] })
              }
            >
              {[0, 8, 12, 16, 24, 32].map((gap) => (
                <option key={gap} value={gap}>
                  {gap}px
                </option>
              ))}
            </SelectControl>
          </Control>
        </InspectorSection>
      </div>
    );
  }
  return (
    <div className="a3s-form-inspector-fields">
      {selected.widget === 'hidden' ? (
        <InspectorSection
          title="隐藏值"
          description="随表单提交，但不会出现在填写页。不要在这里保存密钥。"
        >
          <DefaultValueControl
            schema={props.selectedSchema}
            widget={selected.widget}
            options={selected.options ?? []}
            onChange={(value) => props.onUpdateSchema({ default: value })}
          />
          <ComponentContext node={selected} />
        </InspectorSection>
      ) : selected.kind === 'content' ? (
        selected.presentation !== 'spacer' && (
          <InspectorSection
            title={selected.presentation === 'divider' ? '分隔线文字' : '说明文字'}
            description={
              selected.presentation === 'divider'
                ? '留空时只显示分隔线。'
                : '这段文字会直接出现在填写页。'
            }
          >
            <Control label="文字内容">
              <textarea
                aria-label={selected.presentation === 'divider' ? '分隔线标题' : '说明文字内容'}
                value={selected.content ?? ''}
                onChange={(event) => props.onUpdateNode({ content: event.target.value })}
              />
            </Control>
          </InspectorSection>
        )
      ) : (
        <InspectorSection title={contentCopy.title} description={contentCopy.description}>
          <Control label={contentCopy.label}>
            <input
              aria-label={contentCopy.labelAria}
              value={selected.label ?? ''}
              onChange={(event) => props.onUpdateNode({ label: event.target.value })}
            />
          </Control>
          <Control label={contentCopy.help}>
            <textarea
              aria-label={contentCopy.helpAria}
              value={selected.description ?? ''}
              onChange={(event) => props.onUpdateNode({ description: event.target.value })}
            />
          </Control>
          {placeholderField && (
            <Control label="占位提示">
              <input
                aria-label="占位提示"
                value={selected.placeholder ?? ''}
                onChange={(event) => props.onUpdateNode({ placeholder: event.target.value })}
              />
            </Control>
          )}
          {!hasComponentSettings && <ComponentContext node={selected} />}
        </InspectorSection>
      )}

      {layoutItems.length > 0 && (
        <InspectorSection
          title={selected.layout === 'wizard' ? '步骤管理' : '页面管理'}
          description="在这里改名、排序或打开具体内容。"
        >
          <LayoutItemEditor
            layout={selected.layout as 'tabs' | 'collapse' | 'wizard'}
            items={layoutItems}
            onAdd={props.onAddLayoutItem}
            onSelect={props.onSelectNode}
            onUpdate={props.onUpdateLayoutItem}
            onMove={props.onMoveLayoutItem}
            onDuplicate={props.onDuplicateLayoutItem}
            onRemove={props.onRemoveLayoutItem}
          />
        </InspectorSection>
      )}

      {(selected.kind === 'field' || selected.kind === 'repeater') && hasComponentSettings && (
        <InspectorSection
          title={`${componentName}设置`}
          description="这里仅保留会改变该组件行为的设置。"
        >
          <ComponentContext node={selected} />
          {objectRepeater && (
            <>
              <Control label="行展示方式" hint="窄屏自动切换为逐行卡片">
                <SelectControl
                  aria-label="行展示方式"
                  value={selected.layout === 'data-grid' ? 'data-grid' : 'flow'}
                  onChange={(event) => {
                    const layout = event.target.value as UiNode['layout'];
                    props.onUpdateNode({
                      layout,
                      dataGrid: layout === 'data-grid' ? selected.dataGrid : undefined,
                    });
                  }}
                >
                  <option value="flow">卡片行</option>
                  <option value="data-grid" disabled={!dataGridEligible}>
                    数据表格{dataGridEligible ? '' : '（先添加直接字段）'}
                  </option>
                </SelectControl>
              </Control>
              <SettingGroup title="行模板">
                <section className="a3s-form-collection-list item-group" aria-label="行模板字段">
                  {(selected.children ?? []).map((childId) => {
                    const child = props.document.ui.nodes.find((node) => node.id === childId);
                    if (!child) return null;
                    return (
                      <button
                        type="button"
                        className="a3s-form-collection-item item"
                        key={child.id}
                        onClick={() => props.onSelectNode(child.id)}
                      >
                        <span className="a3s-form-collection-content">
                          <strong>{child.label ?? child.id}</strong>
                          <small>{child.widget ?? child.kind}</small>
                        </span>
                        <DesignerIcon name="chevron-down" size={12} />
                      </button>
                    );
                  })}
                </section>
              </SettingGroup>
            </>
          )}
          {selected.kind === 'repeater' && !objectRepeater && (
            <>
              <Control label="项目占位提示">
                <input
                  aria-label="重复项占位提示"
                  value={stringCustomProperty(selected, 'itemPlaceholder')}
                  onChange={(event) =>
                    updateCustomProperty('itemPlaceholder', event.target.value || undefined)
                  }
                />
              </Control>
              <div className="a3s-form-inline-controls">
                <Control label="添加按钮文案">
                  <input
                    aria-label="重复项添加按钮文案"
                    value={stringCustomProperty(selected, 'addLabel')}
                    onChange={(event) =>
                      updateCustomProperty('addLabel', event.target.value || undefined)
                    }
                  />
                </Control>
                <Control label="空状态文案">
                  <input
                    aria-label="重复项空状态文案"
                    value={stringCustomProperty(selected, 'emptyLabel')}
                    onChange={(event) =>
                      updateCustomProperty('emptyLabel', event.target.value || undefined)
                    }
                  />
                </Control>
              </div>
            </>
          )}
          {selected.kind === 'field' && OPTION_FIELD_WIDGETS.has(selected.widget ?? '') && (
            <DataSourceControl
              document={props.document}
              node={selected}
              schema={props.selectedSchema}
              onUpdateNode={props.onUpdateNode}
            />
          )}
          {selected.layout === 'data-grid' && (
            <>
              <SettingGroup
                title="编辑与容量"
                summary={
                  selected.dataGrid?.editMode === 'dialog' ? '整行确认后保存' : '直接编辑单元格'
                }
                collapsible
                defaultOpen
              >
                <Control label="编辑方式" hint="复杂行可确认后整行保存">
                  <SelectControl
                    aria-label="表格编辑方式"
                    value={selected.dataGrid?.editMode ?? 'inline'}
                    onChange={(event) => {
                      const editMode = event.target.value as NonNullable<
                        UiNode['dataGrid']
                      >['editMode'];
                      props.onUpdateNode({
                        dataGrid: {
                          ...selected.dataGrid,
                          editMode,
                          virtualization:
                            editMode === 'dialog' ? selected.dataGrid?.virtualization : undefined,
                        },
                      });
                    }}
                  >
                    <option value="inline">表内直接编辑</option>
                    <option value="dialog">对话框草稿编辑</option>
                  </SelectControl>
                </Control>
                <Toggle
                  label="启用虚拟滚动"
                  checked={selected.dataGrid?.virtualization?.mode === 'rows'}
                  onChange={(enabled) =>
                    props.onUpdateNode({
                      dataGrid: {
                        ...selected.dataGrid,
                        editMode: enabled ? 'dialog' : selected.dataGrid?.editMode,
                        virtualization: enabled
                          ? {
                              mode: 'rows',
                              viewportHeight:
                                selected.dataGrid?.virtualization?.viewportHeight ??
                                DATA_GRID_VIRTUAL_VIEWPORT_HEIGHT,
                              overscan: selected.dataGrid?.virtualization?.overscan,
                            }
                          : undefined,
                      },
                    })
                  }
                />
                {selected.dataGrid?.virtualization?.mode === 'rows' && (
                  <Control label="滚动区域高度" hint="240–960px">
                    <input
                      aria-label="虚拟滚动区域高度"
                      type="number"
                      min="240"
                      max="960"
                      step="20"
                      value={
                        selected.dataGrid.virtualization.viewportHeight ??
                        DATA_GRID_VIRTUAL_VIEWPORT_HEIGHT
                      }
                      onChange={(event) =>
                        props.onUpdateNode({
                          dataGrid: {
                            ...selected.dataGrid,
                            virtualization: {
                              ...selected.dataGrid?.virtualization,
                              mode: 'rows',
                              viewportHeight: numberOrUndefined(event.target.value),
                            },
                          },
                        })
                      }
                    />
                  </Control>
                )}
              </SettingGroup>
              <SettingGroup
                title="批处理"
                summary={
                  [
                    selected.dataGrid?.selection === 'multiple' ? '选择' : '',
                    selected.dataGrid?.paste === 'append' ? '粘贴' : '',
                    selected.dataGrid?.fill === 'down' ? '填充' : '',
                  ]
                    .filter(Boolean)
                    .join(' · ') || '未启用'
                }
                collapsible
              >
                <Toggle
                  label="允许多行选择"
                  checked={selected.dataGrid?.selection === 'multiple'}
                  onChange={(enabled) =>
                    props.onUpdateNode({
                      dataGrid: {
                        ...selected.dataGrid,
                        selection: enabled ? 'multiple' : 'none',
                        fill: enabled ? selected.dataGrid?.fill : 'none',
                      },
                    })
                  }
                />
                <Toggle
                  label="允许批量粘贴"
                  checked={selected.dataGrid?.paste === 'append'}
                  onChange={(enabled) =>
                    props.onUpdateNode({
                      dataGrid: {
                        ...selected.dataGrid,
                        paste: enabled ? 'append' : 'none',
                      },
                    })
                  }
                />
                <Toggle
                  label="允许向下填充"
                  checked={selected.dataGrid?.fill === 'down'}
                  onChange={(enabled) =>
                    props.onUpdateNode({
                      dataGrid: {
                        ...selected.dataGrid,
                        selection: enabled ? 'multiple' : selected.dataGrid?.selection,
                        fill: enabled ? 'down' : 'none',
                      },
                    })
                  }
                />
              </SettingGroup>
              <SettingGroup
                title="当前视图"
                summary={
                  [
                    selected.dataGrid?.sorting === 'single' ? '排序' : '',
                    selected.dataGrid?.filtering === 'search' ? '筛选' : '',
                  ]
                    .filter(Boolean)
                    .join(' · ') || '未启用'
                }
                collapsible
              >
                <Toggle
                  label="允许单列排序"
                  checked={selected.dataGrid?.sorting === 'single'}
                  onChange={(enabled) =>
                    props.onUpdateNode({
                      dataGrid: {
                        ...selected.dataGrid,
                        sorting: enabled ? 'single' : 'none',
                      },
                    })
                  }
                />
                <Toggle
                  label="显示跨列筛选"
                  checked={selected.dataGrid?.filtering === 'search'}
                  onChange={(enabled) =>
                    props.onUpdateNode({
                      dataGrid: {
                        ...selected.dataGrid,
                        filtering: enabled ? 'search' : 'none',
                      },
                    })
                  }
                />
              </SettingGroup>
              <p className="a3s-form-component-note">
                排序、筛选和选择不改写原始行顺序；粘贴和填充通过整表校验后一次写入。
              </p>
            </>
          )}
          {matrixField && selected.matrix && (
            <MatrixDefinitionEditor
              rows={selected.matrix.rows}
              columns={selected.matrix.columns}
              onRowsChange={props.onReplaceMatrixRows}
              onColumnsChange={props.onReplaceMatrixColumns}
              onBulkRowsChange={props.onUpdateMatrixRows}
              onBulkColumnsChange={props.onUpdateMatrixColumns}
            />
          )}
          {selected.widget === 'currency' && (
            <div className="a3s-form-inline-controls">
              <Control label="货币代码" hint="ISO 4217">
                <input
                  aria-label="货币代码"
                  maxLength={3}
                  value={String(selected.customProps?.currency ?? 'CNY')}
                  onChange={(event) =>
                    updateCustomProperty('currency', event.target.value.toUpperCase().slice(0, 3))
                  }
                />
              </Control>
              <Control label="输入步长">
                <input
                  aria-label="金额输入步长"
                  aria-valuetext={formatInputNumber(selected.customProps?.step, 0.01)}
                  type="number"
                  inputMode="decimal"
                  min="0.000001"
                  step="any"
                  value={formatInputNumber(selected.customProps?.step, 0.01)}
                  onChange={(event) =>
                    updateCustomProperty('step', numberOrUndefined(event.target.value))
                  }
                />
              </Control>
            </div>
          )}
          {selected.widget === 'rating' && (
            <div className="a3s-form-inline-controls">
              <Control label="最低评分">
                <input
                  aria-label="最低评分"
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={formatInputNumber(props.selectedSchema?.minimum, 1)}
                  onChange={(event) =>
                    props.onUpdateSchema({ minimum: numberOrUndefined(event.target.value) })
                  }
                />
              </Control>
              <Control label="最高评分" hint="最多 10">
                <input
                  aria-label="最高评分"
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={formatInputNumber(props.selectedSchema?.maximum, 5)}
                  onChange={(event) =>
                    props.onUpdateSchema({ maximum: numberOrUndefined(event.target.value) })
                  }
                />
              </Control>
            </div>
          )}
          {selected.widget === 'slider' && (
            <>
              <div className="a3s-form-inline-controls">
                <Control label="最小值">
                  <input
                    aria-label="滑块最小值"
                    type="number"
                    step="any"
                    value={formatInputNumber(props.selectedSchema?.minimum, 0)}
                    onChange={(event) =>
                      props.onUpdateSchema({ minimum: numberOrUndefined(event.target.value) })
                    }
                  />
                </Control>
                <Control label="最大值">
                  <input
                    aria-label="滑块最大值"
                    type="number"
                    step="any"
                    value={formatInputNumber(props.selectedSchema?.maximum, 100)}
                    onChange={(event) =>
                      props.onUpdateSchema({ maximum: numberOrUndefined(event.target.value) })
                    }
                  />
                </Control>
              </div>
              <Control label="步长">
                <input
                  aria-label="滑块步长"
                  type="number"
                  min="0.000001"
                  step="any"
                  value={formatInputNumber(selected.customProps?.step, 1)}
                  onChange={(event) =>
                    updateCustomProperty('step', numberOrUndefined(event.target.value))
                  }
                />
              </Control>
            </>
          )}
          {selected.widget === 'calculated' && (
            <article className="item" data-size="xs" data-variant="outline">
              <section>
                <h4>计算来源</h4>
                <p>
                  {props.document.rules?.some(
                    (rule) => rule.kind === 'computed' && rule.target === selected.id,
                  )
                    ? '由表单计算规则更新'
                    : '由宿主写入受控值'}
                </p>
              </section>
              <aside>
                <span className="badge" data-variant="secondary">
                  只读
                </span>
              </aside>
            </article>
          )}
          {OPTION_FIELD_WIDGETS.has(selected.widget ?? '') && !selected.dataSource && (
            <OptionEditor
              options={selected.options ?? []}
              onChange={props.onReplaceOptions}
              onBulkChange={props.onUpdateOptions}
            />
          )}
          {CustomInspector && (
            <section className="a3s-form-custom-inspector" aria-label="扩展组件设置">
              <CustomInspector
                node={selected}
                schema={props.selectedSchema}
                onUpdate={props.onUpdateCustomNode}
                onUpdateNode={props.onUpdateNode}
                onUpdateSchema={props.onUpdateSchema}
              />
            </section>
          )}
        </InspectorSection>
      )}

      <InspectorSection
        title={valueNode ? '高级配置' : layoutCopy.title}
        description={valueNode ? '查看字段绑定、值结构和画布位置。' : layoutCopy.description}
        collapsible={valueNode}
        summary={
          valueNode
            ? `${props.selectedProperty ?? '未绑定'} · ${selected.width ?? 12} / 12`
            : undefined
        }
      >
        {selected.kind === 'field' && (
          <SettingGroup title="组件类型与初始值">
            <Control label="组件类型" hint="切换会重建值结构">
              <SelectControl
                aria-label="字段组件"
                value={selected.widget ?? 'text'}
                onChange={(event) => props.onUpdateWidget(event.target.value)}
              >
                <FieldWidgetOptions widgets={props.availableFieldWidgets} />
              </SelectControl>
            </Control>
            <p className="a3s-form-component-note">
              切换后会按新组件重建 Schema；不适用的选项、默认值和专属设置将被移除。
            </p>
            {selected.widget !== 'hidden' && (
              <DefaultValueControl
                schema={props.selectedSchema}
                widget={selected.widget}
                options={selected.options ?? []}
                onChange={(value) => props.onUpdateSchema({ default: value })}
              />
            )}
          </SettingGroup>
        )}
        {valueNode && (
          <SettingGroup title="数据契约">
            <ValueShape schema={props.selectedSchema} widget={selected.widget} />
            <Control label="字段标识" hint="只读">
              <input aria-label="字段标识" value={props.selectedProperty ?? ''} readOnly />
            </Control>
            {selected.kind === 'repeater' && selected.itemKey && (
              <Control label="行标识字段" hint="用于稳定排序与组件状态">
                <input aria-label="行标识字段" value={selected.itemKey} readOnly />
              </Control>
            )}
          </SettingGroup>
        )}
        {valueNode && (
          <SettingGroup title={layoutCopy.title}>{renderLayoutSettings()}</SettingGroup>
        )}
        {!valueNode && renderLayoutSettings()}
      </InspectorSection>
    </div>
  );

  function renderLayoutSettings() {
    return (
      <>
        {selected.layout === 'page' && (
          <Control label="步骤类型" hint="确认页会汇总此前填写内容">
            <SelectControl
              aria-label="步骤类型"
              value={selected.pageRole ?? 'form'}
              onChange={(event) =>
                props.onUpdateNode({ pageRole: event.target.value as UiNode['pageRole'] })
              }
            >
              <option value="form">填写步骤</option>
              <option value="review">确认步骤</option>
            </SelectControl>
          </Control>
        )}
        <Control label="栅格宽度">
          <SelectControl
            aria-label="栅格宽度"
            value={selected.width ?? 12}
            onChange={(event) =>
              props.onUpdateNode({ width: Number(event.target.value) as UiNode['width'] })
            }
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((width) => (
              <option key={width} value={width}>
                {width} / 12
              </option>
            ))}
          </SelectControl>
        </Control>
        {selected.layout === 'columns' && columnChildren.length > 0 && (
          <>
            <Control label="栏位比例">
              <SelectControl
                aria-label="栏位比例"
                value={currentRatio}
                onChange={(event) =>
                  props.onUpdateColumnWidths(
                    event.target.value.split(',').map(Number) as UiNode['width'][],
                  )
                }
              >
                {!ratioOptions.some(({ value }) => value === currentRatio) && (
                  <option value={currentRatio}>当前比例</option>
                )}
                {ratioOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectControl>
            </Control>
            <Control label="栏间距">
              <SelectControl
                aria-label="栏间距"
                value={selected.gap ?? 16}
                onChange={(event) =>
                  props.onUpdateNode({ gap: Number(event.target.value) as UiNode['gap'] })
                }
              >
                {[0, 8, 12, 16, 24, 32].map((gap) => (
                  <option key={gap} value={gap}>
                    {gap}px
                  </option>
                ))}
              </SelectControl>
            </Control>
          </>
        )}
        {supportsInternalGrid && (
          <>
            <Control label="内部栏数">
              <SelectControl
                aria-label="内部栏数"
                value={selected.columns ?? 12}
                onChange={(event) =>
                  props.onUpdateNode({ columns: Number(event.target.value) as UiNode['columns'] })
                }
              >
                {[1, 2, 3, 4, 6, 12].map((columns) => (
                  <option key={columns} value={columns}>
                    {columns} 栏
                  </option>
                ))}
              </SelectControl>
            </Control>
            <Control label="内部间距">
              <SelectControl
                aria-label="内部间距"
                value={selected.gap ?? 16}
                onChange={(event) =>
                  props.onUpdateNode({ gap: Number(event.target.value) as UiNode['gap'] })
                }
              >
                {[0, 8, 12, 16, 24, 32].map((gap) => (
                  <option key={gap} value={gap}>
                    {gap}px
                  </option>
                ))}
              </SelectControl>
            </Control>
          </>
        )}
        {selected.kind === 'content' && selected.presentation === 'spacer' && (
          <Control label="间距高度">
            <SelectControl
              aria-label="间距高度"
              value={selected.gap ?? 24}
              onChange={(event) =>
                props.onUpdateNode({ gap: Number(event.target.value) as UiNode['gap'] })
              }
            >
              {[8, 12, 16, 24, 32].map((gap) => (
                <option key={gap} value={gap}>
                  {gap}px
                </option>
              ))}
            </SelectControl>
          </Control>
        )}
      </>
    );
  }
}

function stringCustomProperty(node: UiNode, key: string): string {
  const value = node.customProps?.[key];
  return typeof value === 'string' ? value : '';
}

function formatInputNumber(value: JsonValue | undefined, fallback: number): string {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return String(Number(number.toFixed(8)));
}

function columnRatioOptions(count: number): readonly { value: string; label: string }[] {
  if (count === 2) {
    return [
      { value: '6,6', label: '等宽 · 1 : 1' },
      { value: '4,8', label: '左窄右宽 · 1 : 2' },
      { value: '8,4', label: '左宽右窄 · 2 : 1' },
    ];
  }
  if (count === 3) {
    return [
      { value: '4,4,4', label: '三栏等宽' },
      { value: '3,6,3', label: '中栏加宽 · 1 : 2 : 1' },
      { value: '6,3,3', label: '左栏加宽 · 2 : 1 : 1' },
      { value: '3,3,6', label: '右栏加宽 · 1 : 1 : 2' },
    ];
  }
  return [];
}

function PatchPanel({
  document,
  patchText,
  patchFeedback,
  onTextChange,
  onReview,
}: {
  document: FormDocument;
  patchText: string;
  patchFeedback: PatchFeedback | undefined;
  onTextChange: (text: string) => void;
  onReview: () => void;
}) {
  const preflight = useMemo(() => inspectPatchText(patchText), [patchText]);
  const template = JSON.stringify(
    {
      apiVersion: 'a3s.dev/form-patch/v1alpha1',
      baseRevision: document.revision,
      operations: [],
    },
    null,
    2,
  );
  return (
    <section className="a3s-form-patch-review">
      <div className="a3s-form-inspector-heading">
        <span>受控变更通道</span>
        <strong>Agent 补丁</strong>
      </div>
      <p>
        Agent 提交 FormPatch，编辑器负责版本校验、冲突检查和完整编译。这里不会直接执行模型输出。
      </p>
      <fieldset className="a3s-form-patch-contract" aria-label="FormPatch 当前状态">
        <span>
          当前 revision
          <strong>{document.revision}</strong>
        </span>
        <span>
          协议
          <strong>v1alpha1</strong>
        </span>
      </fieldset>
      <div className="a3s-form-patch-editor-heading">
        <label htmlFor="a3s-form-patch-editor">FormPatch JSON</label>
        <button
          type="button"
          className="btn"
          data-size="xs"
          data-variant="ghost"
          onClick={() => onTextChange(template)}
        >
          载入空补丁
        </button>
      </div>
      <textarea
        id="a3s-form-patch-editor"
        className="textarea"
        value={patchText}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder={template}
        spellCheck={false}
      />
      <div
        className={`a3s-form-patch-preflight is-${preflight.tone}`}
        role="status"
        aria-live="polite"
      >
        <DesignerIcon name={preflight.tone === 'error' ? 'alert' : 'sparkles'} size={14} />
        <span>{preflight.message}</span>
      </div>
      <button
        type="button"
        className="a3s-form-primary-action btn"
        data-variant="primary"
        disabled={!patchText.trim()}
        onClick={onReview}
      >
        校验并应用补丁
      </button>
      {patchFeedback && (
        <div
          className={`a3s-form-patch-message is-${patchFeedback.tone}`}
          role={patchFeedback.tone === 'error' ? 'alert' : 'status'}
        >
          <DesignerIcon
            name={patchFeedback.tone === 'error' ? 'alert' : 'check-square'}
            size={14}
          />
          <span>{patchFeedback.message}</span>
        </div>
      )}
    </section>
  );
}

function inspectPatchText(text: string): { tone: 'idle' | 'ready' | 'error'; message: string } {
  if (!text.trim()) return { tone: 'idle', message: '载入模板或粘贴 Agent 生成的补丁。' };
  try {
    const patch = JSON.parse(text) as Partial<FormPatch>;
    if (!Array.isArray(patch.operations)) {
      return { tone: 'error', message: 'operations 必须是数组。' };
    }
    if (typeof patch.baseRevision !== 'number') {
      return { tone: 'error', message: 'baseRevision 必须是数字。' };
    }
    return {
      tone: 'ready',
      message: `JSON 格式正确 · ${patch.operations.length} 项操作 · 基于 revision ${patch.baseRevision}`,
    };
  } catch {
    return { tone: 'error', message: 'JSON 尚未闭合或格式有误。' };
  }
}
