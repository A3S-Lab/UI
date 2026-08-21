import type { FormDocument, JsonSchema, UiNode } from '../core';
import {
  Control,
  InspectorSection,
  numberOrUndefined,
  Toggle,
  ValueShape,
} from './designer-inspector-controls';
import { schemaBindingForNode } from './designer-schema';
import { ALWAYS_READ_ONLY_WIDGETS } from './widget-contract';

export interface ValidationPanelProps {
  document: FormDocument;
  selected: UiNode;
  selectedSchema: JsonSchema | undefined;
  onSetRequired: (required: boolean) => void;
  onUpdateNode: (changes: Partial<UiNode>) => void;
  onSetMatrixRowsRequired: (required: boolean) => void;
  onUpdateMatrixMinimum: (value: number | undefined) => void;
  onUpdateMatrixMaximum: (value: number | undefined) => void;
  onUpdateSchema: (changes: Partial<JsonSchema>) => void;
}

export function ValidationPanel(props: ValidationPanelProps) {
  const { selected, selectedSchema } = props;
  if (selected.kind !== 'field' && selected.kind !== 'repeater') {
    return <p className="a3s-form-empty">当前节点没有字段校验设置。</p>;
  }

  const binding = schemaBindingForNode(props.document, selected);
  const required = Boolean(binding?.parentSchema.required?.includes(binding.property));
  const stringField = selectedSchema?.type === 'string';
  const numberField = selectedSchema?.type === 'number' || selectedSchema?.type === 'integer';
  const arrayField = selectedSchema?.type === 'array';
  const widget = selected.widget ?? 'text';
  const stringConstraintField =
    stringField && !['select', 'radio', 'date', 'date-time', 'time', 'hidden'].includes(widget);
  const signatureField = widget === 'a3s.signature' || widget === 'signature';
  const fileField = widget === 'a3s.file-upload' || widget === 'file';
  const arrayConstraintField = arrayField && !signatureField;
  const fixedUniqueCollection =
    widget === 'multi-select' || widget === 'tags' || fileField || signatureField;
  const supportsUniqueItems =
    arrayConstraintField &&
    !fixedUniqueCollection &&
    !(selected.kind === 'repeater' && selectedSchema?.items?.type === 'object');
  const collectionNoun = fileField
    ? '文件'
    : widget === 'multi-select'
      ? '选择项'
      : widget === 'tags'
        ? '标签'
        : selected.kind === 'repeater'
          ? '列表项'
          : '项目';
  const alwaysReadOnly = ALWAYS_READ_ONLY_WIDGETS.has(selected.widget ?? '');
  const matrixField =
    (selected.widget === 'matrix-single' || selected.widget === 'matrix-multiple') &&
    selected.matrix;
  const matrixRowSchemas: JsonSchema[] = selected.matrix
    ? selected.matrix.rows
        .map(({ id }) => selectedSchema?.properties?.[id])
        .filter((schema): schema is JsonSchema => Boolean(schema))
    : [];
  const matrixRowsRequired = Boolean(
    matrixField &&
      selected.matrix?.rows.every(
        ({ id }) =>
          selectedSchema?.required?.includes(id) &&
          (selected.widget !== 'matrix-multiple' ||
            (selectedSchema.properties?.[id]?.minItems ?? 0) > 0),
      ),
  );
  const matrixMinimum = matrixRowSchemas[0]?.minItems;
  const matrixMaximum = matrixRowSchemas[0]?.maxItems;

  return (
    <div className="a3s-form-inspector-fields">
      <InspectorSection title="可用性" description="控制字段在填写流程中的基础状态。">
        <ValueShape schema={selectedSchema} widget={selected.widget} />
        <Toggle label="必填字段" checked={required} onChange={props.onSetRequired} />
        {!alwaysReadOnly && (
          <Toggle
            label="只读字段"
            checked={Boolean(selected.readOnly)}
            onChange={(readOnly) => props.onUpdateNode({ readOnly })}
          />
        )}
        {!alwaysReadOnly && (
          <Toggle
            label="默认隐藏"
            checked={Boolean(selected.hidden)}
            onChange={(hidden) => props.onUpdateNode({ hidden })}
          />
        )}
        {alwaysReadOnly && (
          <p className="a3s-form-component-note">
            {selected.widget === 'hidden' ? '隐藏值没有可见控件。' : '计算结果固定为只读输出。'}
          </p>
        )}
      </InspectorSection>

      {matrixField && (
        <InspectorSection title="矩阵约束" description="这些限制对矩阵的每一行生效。">
          <Toggle
            label="每行必选"
            checked={matrixRowsRequired}
            onChange={props.onSetMatrixRowsRequired}
          />
          {selected.widget === 'matrix-multiple' && selected.matrix && (
            <div className="a3s-form-inline-controls">
              <Control label="每行最少选择">
                <input
                  aria-label="每行最少选择数"
                  type="number"
                  min="0"
                  max={selected.matrix.columns.length}
                  value={matrixMinimum ?? ''}
                  onChange={(event) =>
                    props.onUpdateMatrixMinimum(numberOrUndefined(event.target.value))
                  }
                />
              </Control>
              <Control label="每行最多选择">
                <input
                  aria-label="每行最多选择数"
                  type="number"
                  min="0"
                  max={selected.matrix.columns.length}
                  value={matrixMaximum ?? ''}
                  onChange={(event) =>
                    props.onUpdateMatrixMaximum(numberOrUndefined(event.target.value))
                  }
                />
              </Control>
            </div>
          )}
        </InspectorSection>
      )}

      {(stringConstraintField || numberField || arrayConstraintField) && (
        <InspectorSection
          title={
            stringConstraintField ? '文本限制' : numberField ? '数值范围' : `${collectionNoun}数量`
          }
          description="填写值必须满足这里设置的边界。"
        >
          {stringConstraintField && (
            <>
              <div className="a3s-form-inline-controls">
                <Control label="最少字符">
                  <input
                    aria-label="最小字符数"
                    type="number"
                    min="0"
                    value={selectedSchema?.minLength ?? ''}
                    onChange={(event) =>
                      props.onUpdateSchema({ minLength: numberOrUndefined(event.target.value) })
                    }
                  />
                </Control>
                <Control label="最多字符">
                  <input
                    aria-label="最大字符数"
                    type="number"
                    min="0"
                    value={selectedSchema?.maxLength ?? ''}
                    onChange={(event) =>
                      props.onUpdateSchema({ maxLength: numberOrUndefined(event.target.value) })
                    }
                  />
                </Control>
              </div>
              <Control label="格式规则" hint="正则表达式">
                <input
                  aria-label="格式规则"
                  value={selectedSchema?.pattern ?? ''}
                  onChange={(event) =>
                    props.onUpdateSchema({ pattern: event.target.value || undefined })
                  }
                />
              </Control>
            </>
          )}
          {numberField && (
            <>
              <div className="a3s-form-inline-controls">
                <Control label="最小值">
                  <input
                    aria-label="最小值"
                    type="number"
                    min={selected.widget === 'rating' ? 1 : undefined}
                    max={selected.widget === 'rating' ? 10 : undefined}
                    step={selected.widget === 'rating' ? 1 : undefined}
                    value={selectedSchema?.minimum ?? ''}
                    onChange={(event) =>
                      props.onUpdateSchema({ minimum: numberOrUndefined(event.target.value) })
                    }
                  />
                </Control>
                <Control label="最大值">
                  <input
                    aria-label="最大值"
                    type="number"
                    min={selected.widget === 'rating' ? 1 : undefined}
                    max={selected.widget === 'rating' ? 10 : undefined}
                    step={selected.widget === 'rating' ? 1 : undefined}
                    value={selectedSchema?.maximum ?? ''}
                    onChange={(event) =>
                      props.onUpdateSchema({ maximum: numberOrUndefined(event.target.value) })
                    }
                  />
                </Control>
              </div>
              {selected.widget === 'number' && (
                <Control label="数值步长" hint="留空时使用浏览器默认值">
                  <input
                    aria-label="数值步长"
                    type="number"
                    min="0.000001"
                    step="any"
                    value={
                      typeof selectedSchema?.multipleOf === 'number'
                        ? selectedSchema.multipleOf
                        : ''
                    }
                    onChange={(event) =>
                      props.onUpdateSchema({ multipleOf: numberOrUndefined(event.target.value) })
                    }
                  />
                </Control>
              )}
            </>
          )}
          {arrayConstraintField && (
            <>
              <div className="a3s-form-inline-controls">
                <Control label={`最少${collectionNoun}`}>
                  <input
                    aria-label={`最少${collectionNoun}数`}
                    type="number"
                    min="0"
                    value={selectedSchema?.minItems ?? ''}
                    onChange={(event) =>
                      props.onUpdateSchema({ minItems: numberOrUndefined(event.target.value) })
                    }
                  />
                </Control>
                <Control label={`最多${collectionNoun}`}>
                  <input
                    aria-label={`最多${collectionNoun}数`}
                    type="number"
                    min="0"
                    value={selectedSchema?.maxItems ?? ''}
                    onChange={(event) =>
                      props.onUpdateSchema({ maxItems: numberOrUndefined(event.target.value) })
                    }
                  />
                </Control>
              </div>
              {supportsUniqueItems && (
                <Toggle
                  label={`${collectionNoun}不可重复`}
                  checked={Boolean(selectedSchema?.uniqueItems)}
                  onChange={(uniqueItems) =>
                    props.onUpdateSchema({ uniqueItems: uniqueItems || undefined })
                  }
                />
              )}
            </>
          )}
        </InspectorSection>
      )}

      <InspectorSection
        title="条件逻辑"
        collapsible
        summary={`${props.document.rules?.filter((rule) => rule.target === selected.id).length ?? 0} 条`}
      >
        <div className="a3s-form-rule-summary">
          <span>关联规则</span>
          <strong>
            {props.document.rules?.filter((rule) => rule.target === selected.id).length ?? 0} 条
          </strong>
          <p>条件规则由结构化补丁或宿主配置维护，并在保存前经过编译校验。</p>
        </div>
      </InspectorSection>
    </div>
  );
}
