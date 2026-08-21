import { useEffect, useState } from 'react';
import type { JsonValue } from '../../../src/core';
import {
  createFileUploadNodeRegistry,
  createSignatureNodeRegistry,
  defineFormNodeRegistry,
  type FormFileService,
  FormInspectorControl,
  type FormNodeDesignProps,
  type FormNodeInspectorProps,
  type FormNodeRenderProps,
  type FormSignatureService,
} from '../../../src/react';

const playgroundFileService: FormFileService = {
  upload: ({ file, signal, onProgress }) =>
    new Promise((resolve, reject) => {
      let loaded = 0;
      const total = Math.max(1, file.size);
      const step = Math.max(1, Math.ceil(total / 6));
      const abort = () => {
        window.clearInterval(timer);
        reject(new DOMException('Upload cancelled.', 'AbortError'));
      };
      const timer = window.setInterval(() => {
        loaded = Math.min(total, loaded + step);
        onProgress({ loaded, total });
        if (loaded < total) return;
        window.clearInterval(timer);
        signal.removeEventListener('abort', abort);
        resolve({
          id: globalThis.crypto?.randomUUID?.() ?? `playground-${file.name}-${file.size}`,
          name: file.name,
          size: file.size,
          mediaType: file.type || 'application/octet-stream',
        });
      }, 120);
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    }),
  remove: async () => undefined,
};

const fileUploadNodeRegistry = createFileUploadNodeRegistry({
  service: playgroundFileService,
});

const playgroundSignatureService: FormSignatureService = {
  save: ({ capture, signal }) =>
    new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve({
          id: globalThis.crypto?.randomUUID?.() ?? `playground-signature-${Date.now()}`,
          method: capture.method,
          signedAt: new Date().toISOString(),
        });
      }, 420);
      const abort = () => {
        window.clearTimeout(timer);
        reject(new DOMException('Signature save cancelled.', 'AbortError'));
      };
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    }),
  remove: async ({ signal }) => {
    if (signal.aborted) throw new DOMException('Signature removal cancelled.', 'AbortError');
  },
};

const signatureNodeRegistry = createSignatureNodeRegistry({
  service: playgroundSignatureService,
});

function JsonDesign({ node, schema, required }: FormNodeDesignProps) {
  return (
    <div className="playground-json-design">
      <div>
        <strong>
          {node.label}
          {required && <em>*</em>}
        </strong>
        <span>{node.description ?? '编辑结构化 JSON 配置'}</span>
      </div>
      <code>{schema?.type === 'array' ? '[ … ]' : '{ … }'}</code>
    </div>
  );
}

function JsonNode({ id, node, value, disabled, invalid, onChange }: FormNodeRenderProps) {
  const fallback = node.schema?.default ?? (node.schema?.type === 'array' ? [] : {});
  const serialized = JSON.stringify(value ?? fallback, null, 2);
  const [source, setSource] = useState(serialized);
  const [parseError, setParseError] = useState('');

  useEffect(() => {
    setSource(serialized);
    setParseError('');
  }, [serialized]);

  return (
    <div
      className={`playground-json-node field${parseError ? ' is-invalid' : ''}`}
      data-invalid={invalid || Boolean(parseError) || undefined}
    >
      <label className="playground-json-label" htmlFor={id}>
        {node.label}
      </label>
      {node.description && <span className="playground-json-help">{node.description}</span>}
      <textarea
        id={id}
        className="textarea"
        aria-invalid={invalid || Boolean(parseError) || undefined}
        aria-describedby={parseError ? `${id}-json-error` : undefined}
        disabled={disabled}
        spellCheck={false}
        rows={boundedEditorRows(node.customProps?.editorRows)}
        value={source}
        onChange={(event) => {
          const nextSource = event.target.value;
          setSource(nextSource);
          try {
            const nextValue: unknown = JSON.parse(nextSource);
            if (
              nextValue === null ||
              typeof nextValue === 'string' ||
              typeof nextValue === 'number' ||
              typeof nextValue === 'boolean' ||
              Array.isArray(nextValue) ||
              typeof nextValue === 'object'
            ) {
              onChange(nextValue as JsonValue);
              setParseError('');
            }
          } catch {
            setParseError('JSON 格式无效，请检查括号、引号和逗号。');
          }
        }}
      />
      {parseError && (
        <span className="playground-json-error" id={`${id}-json-error`} role="alert">
          {parseError}
        </span>
      )}
    </div>
  );
}

function JsonInspector({ node, onUpdateNode }: FormNodeInspectorProps) {
  const rows = boundedEditorRows(node.customProps?.editorRows);
  return (
    <div className="playground-json-inspector">
      <FormInspectorControl label="编辑区高度" hint="运行时可继续滚动">
        <select
          aria-label="JSON 编辑区高度"
          value={rows}
          onChange={(event) =>
            onUpdateNode({
              customProps: { ...node.customProps, editorRows: Number(event.target.value) },
            })
          }
        >
          <option value="6">紧凑 · 6 行</option>
          <option value="10">标准 · 10 行</option>
          <option value="16">展开 · 16 行</option>
        </select>
      </FormInspectorControl>
      <p className="a3s-form-component-note">
        输入会在本地解析；格式错误时保留草稿，不覆盖受控值。
      </p>
    </div>
  );
}

function boundedEditorRows(value: JsonValue | undefined): 6 | 10 | 16 {
  return value === 6 || value === 16 ? value : 10;
}

function RatingStar() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
    </svg>
  );
}

const RATING_PREVIEW_KEYS = ['rating-1', 'rating-2', 'rating-3', 'rating-4', 'rating-5'] as const;

function RatingDesign({ node, required }: FormNodeDesignProps) {
  const maximum = Number(node.customProps?.maximum ?? 5);
  return (
    <div className="playground-rating-design">
      <div>
        <strong>
          {node.label}
          {required && <em>*</em>}
        </strong>
        <span>{node.description ?? '请选择满意度评分'}</span>
      </div>
      <div className="a3s-form-rating" aria-hidden="true">
        {RATING_PREVIEW_KEYS.slice(0, Math.max(0, Math.min(maximum, 5))).map((key) => (
          <span key={key}>
            <RatingStar />
          </span>
        ))}
      </div>
    </div>
  );
}

function RatingNode({ id, node, value, disabled, invalid, onChange }: FormNodeRenderProps) {
  const maximum = Math.max(3, Math.min(10, Number(node.customProps?.maximum ?? 5)));
  const current = typeof value === 'number' ? value : 0;
  return (
    <fieldset
      className={`playground-rating-node fieldset${invalid ? ' is-invalid' : ''}`}
      data-invalid={invalid || undefined}
      disabled={disabled}
    >
      <legend id={`${id}-label`}>{node.label}</legend>
      {node.description && <p>{node.description}</p>}
      <div
        className="a3s-form-rating field"
        data-orientation="horizontal"
        role="radiogroup"
        aria-labelledby={`${id}-label`}
      >
        {Array.from({ length: maximum }, (_, index) => index + 1).map((rating) => (
          <label className={rating <= current ? 'is-active' : ''} key={rating}>
            <input
              className="input"
              type="radio"
              name={id}
              value={rating}
              checked={rating === current}
              aria-label={`${rating} 星`}
              onChange={() => onChange(rating)}
            />
            <RatingStar />
          </label>
        ))}
        <output aria-live="polite">
          {current > 0 ? `${current} / ${maximum}` : `— / ${maximum}`}
        </output>
      </div>
    </fieldset>
  );
}

function RatingInspector({ node, onUpdate }: FormNodeInspectorProps) {
  const maximum = Number(node.customProps?.maximum ?? 5);
  return (
    <div className="playground-rating-inspector">
      <FormInspectorControl label="最高评分" hint="3 至 10">
        <input
          aria-label="评分最大星数"
          type="number"
          min="3"
          max="10"
          value={maximum}
          onChange={(event) => {
            const next = Math.max(3, Math.min(10, Number(event.target.value)));
            onUpdate({
              node: { customProps: { ...node.customProps, maximum: next } },
              schema: { maximum: next },
            });
          }}
        />
      </FormInspectorControl>
    </div>
  );
}

export const playgroundNodeRegistry = defineFormNodeRegistry({
  ...fileUploadNodeRegistry,
  ...signatureNodeRegistry,
  'a3s.json': {
    kind: 'field',
    catalog: {
      section: 'business',
      sectionLabel: '业务组件',
      label: 'JSON 配置',
      description: '可校验的结构化 JSON 编辑器',
      glyph: '{ }',
    },
    schema: {},
    defaults: {
      width: 12,
      description: '请输入合法 JSON',
    },
    design: JsonDesign,
    render: JsonNode,
    inspector: JsonInspector,
  },
  'a3s.rating': {
    kind: 'field',
    catalog: {
      section: 'business',
      sectionLabel: '业务组件',
      label: '评分',
      description: '可配置星级的满意度评分',
      glyph: 'RT',
    },
    schema: { type: 'number', minimum: 1, maximum: 5 },
    defaults: {
      width: 6,
      description: '请为本次体验评分',
      customProps: { maximum: 5 },
    },
    design: RatingDesign,
    render: RatingNode,
    inspector: RatingInspector,
  },
});
