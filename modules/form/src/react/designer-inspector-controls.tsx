import { cloneElement, type ReactElement, type ReactNode, useId } from 'react';
import type { JsonSchema, UiNode } from '../core';
import { DesignerIcon } from './designer-icons';

const FIELD_WIDGET_GROUPS = [
  {
    label: '文本输入',
    values: ['text', 'textarea', 'email', 'password', 'url', 'tel'],
  },
  {
    label: '选择与集合',
    values: [
      'select',
      'radio',
      'checkbox',
      'switch',
      'multi-select',
      'tags',
      'matrix-single',
      'matrix-multiple',
    ],
  },
  { label: '日期与时间', values: ['date', 'date-time', 'time'] },
  { label: '数值', values: ['number', 'currency', 'rating', 'slider'] },
  { label: '业务字段', values: ['file', 'signature', 'hidden', 'calculated'] },
] as const;

export function InspectorSection({
  title,
  description,
  className,
  collapsible = false,
  defaultOpen = false,
  summary,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summary?: string;
  children: ReactNode;
}) {
  if (collapsible) {
    return (
      <section
        className={[
          'a3s-form-inspector-section',
          'a3s-form-inspector-disclosure',
          'accordion',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <details className="a3s-form-disclosure" open={defaultOpen}>
          <summary>
            <span>
              <h3>{title}</h3>
              {description && <p>{description}</p>}
            </span>
            {summary && <small>{summary}</small>}
            <DesignerIcon name="chevron-down" size={12} />
          </summary>
          <div className="a3s-form-inspector-section-content">{children}</div>
        </details>
      </section>
    );
  }
  return (
    <section className={['a3s-form-inspector-section', className].filter(Boolean).join(' ')}>
      <header>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      <div className="a3s-form-inspector-section-content">{children}</div>
    </section>
  );
}

export function SettingGroup({
  title,
  summary,
  collapsible = false,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  if (collapsible) {
    return (
      <details
        className="a3s-form-setting-group a3s-form-disclosure is-collapsible"
        open={defaultOpen}
      >
        <summary>
          <h4>{title}</h4>
          {summary && <small>{summary}</small>}
          <DesignerIcon name="chevron-down" size={12} />
        </summary>
        <div>{children}</div>
      </details>
    );
  }
  return (
    <section className="a3s-form-setting-group">
      <h4>{title}</h4>
      <div>{children}</div>
    </section>
  );
}

export function FieldWidgetOptions({
  widgets,
}: {
  widgets: readonly { label: string; value: string }[];
}) {
  const grouped = new Set<string>(FIELD_WIDGET_GROUPS.flatMap(({ values }) => values));
  const extensions = widgets.filter(({ value }) => !grouped.has(value));
  return (
    <>
      {FIELD_WIDGET_GROUPS.map((group) => {
        const items = widgets.filter(({ value }) => group.values.includes(value as never));
        if (items.length === 0) return null;
        return (
          <optgroup key={group.label} label={group.label}>
            {items.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </optgroup>
        );
      })}
      {extensions.length > 0 && (
        <optgroup label="扩展组件">
          {extensions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );
}

export function ValueShape({
  schema,
  widget,
}: {
  schema: JsonSchema | undefined;
  widget?: string;
}) {
  const labels: Record<NonNullable<JsonSchema['type']>, string> = {
    null: '空值',
    boolean: '布尔值',
    object: '对象',
    array: '数组',
    number: '数值',
    integer: '整数',
    string: '字符串',
  };
  const type = schema?.type ? labels[schema.type] : '未声明';
  const detail =
    widget === 'matrix-single' || widget === 'matrix-multiple'
      ? '按行 ID 存储'
      : schema?.format
        ? schema.format
        : widget === 'multi-select'
          ? '多项选择'
          : undefined;
  return (
    <div className="a3s-form-value-shape">
      <span>值结构</span>
      <strong>{detail ? `${type} · ${detail}` : type}</strong>
    </div>
  );
}

export function ComponentContext({ node }: { node: UiNode }) {
  const messages: Record<string, string> = {
    checkbox: '复选框用于确认状态，字段标题同时作为控件标签。',
    switch: '开关用于启用或关闭状态，字段标题同时作为控件标签。',
    select: '选项标签可修改；提交值不会随排序或改名变化。',
    radio: '选项标签可修改；提交值不会随排序或改名变化。',
    'multi-select': '每项使用稳定提交值，停用后不再允许新增选择。',
    'matrix-single': '每行使用稳定 ID，每列使用稳定提交值。',
    'matrix-multiple': '每行使用稳定 ID，每列使用稳定提交值。',
    'date-time': '受控值按带 Z 后缀的 UTC 日期时间保存。',
    time: '受控值按带 Z 后缀的 UTC 时间保存。',
    rating: '最高评分读取校验面板中的最大值，范围为 1–10。',
    slider: '步长在此设置，最小值和最大值在校验面板设置。',
    hidden: '隐藏值保留在受控数据中，填写页不显示。',
    calculated: '计算结果只读展示受控值或 computed 规则结果。',
    currency: '货币代码只负责展示，受控值保持为数值。',
    'a3s.file-upload': '文件类型和上传并发在此设置；数量限制在校验面板中设置。',
    'a3s.signature': '签名方式和笔迹外观在此设置；签名内容由宿主服务保存。',
  };
  const message =
    node.layout === 'data-grid'
      ? '数据表格按对象数组存储；排序和筛选只影响当前视图。'
      : node.kind === 'repeater'
        ? '重复项按数组存储，行标识用于稳定排序和组件状态。'
        : messages[node.widget ?? ''];
  return message ? <p className="a3s-form-component-context">{message}</p> : null;
}

export function Control({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactElement<{ id?: string; className?: string }>;
}) {
  const generatedId = `a3s-form-control-${useId().replaceAll(':', '')}`;
  const controlId = children.props.id ?? generatedId;
  const a3sUiClass =
    children.type === 'input'
      ? 'input'
      : children.type === 'textarea'
        ? 'textarea'
        : children.type === 'select'
          ? 'select'
          : undefined;
  const className = [a3sUiClass, children.props.className].filter(Boolean).join(' ') || undefined;
  const child = cloneElement(children, { id: controlId, className });
  return (
    <div className="a3s-form-control field">
      <label htmlFor={controlId}>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </label>
      {child}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = `a3s-form-toggle-${useId().replaceAll(':', '')}`;
  return (
    <div className="a3s-form-toggle field" data-orientation="horizontal">
      <input
        id={id}
        className="input"
        type="checkbox"
        role="switch"
        data-size="sm"
        aria-label={label}
        aria-checked={checked}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function numberOrUndefined(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}
