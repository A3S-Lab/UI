import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CompiledNode, FormPlan } from '../core';
import { Control } from './designer-inspector-controls';
import type {
  FormNodeDesignProps,
  FormNodeInspectorProps,
  FormNodeRegistry,
  FormNodeRenderProps,
} from './node-registry';
import { defineFormNodeRegistry } from './node-registry';
import { SelectControl } from './select-control';
import {
  boundedTypedSignature,
  createFormSignatureSchema,
  FORM_SIGNATURE_LIMITS,
  type FormSignatureCapture,
  type FormSignatureCaptureMode,
  type FormSignaturePenColor,
  type FormSignatureReference,
  type FormSignatureStroke,
  formSignatureReferenceKey,
  normalizeFormSignatureReference,
  normalizeSignatureCaptureMode,
  normalizeSignaturePenColor,
  signaturePointCount,
} from './signature-contract';
import { SignaturePad } from './signature-pad';

export const SIGNATURE_WIDGET = 'a3s.signature';

export type {
  CreateFormSignatureSchemaOptions,
  FormDrawnSignatureCapture,
  FormSignatureCapture,
  FormSignatureCaptureMode,
  FormSignatureMethod,
  FormSignaturePenColor,
  FormSignaturePoint,
  FormSignatureReference,
  FormSignatureStroke,
  FormTypedSignatureCapture,
} from './signature-contract';
export {
  createFormSignatureSchema,
  FORM_SIGNATURE_LIMITS,
  isFormSignatureReference,
} from './signature-contract';

export interface FormSignatureOperationContext {
  node: CompiledNode;
  plan: FormPlan;
  valuePath?: string;
  rowIndices: readonly number[];
}

export interface FormSignatureSaveRequest extends FormSignatureOperationContext {
  capture: FormSignatureCapture;
  previous?: FormSignatureReference;
  signal: AbortSignal;
}

export interface FormSignatureRemoveRequest extends FormSignatureOperationContext {
  signature: FormSignatureReference;
  signal: AbortSignal;
}

export interface FormSignatureOpenRequest extends FormSignatureOperationContext {
  signature: FormSignatureReference;
  signal: AbortSignal;
}

export interface FormSignatureService {
  save: (request: FormSignatureSaveRequest) => Promise<FormSignatureReference>;
  remove: (request: FormSignatureRemoveRequest) => Promise<void>;
  open?: (request: FormSignatureOpenRequest) => void | Promise<void>;
}

export type FormSignatureOperation = 'save' | 'remove' | 'open';

export interface FormSignatureMessages {
  fallbackLabel: string;
  required: string;
  empty: string;
  readOnlyEmpty: string;
  methodLabel: string;
  drawnMethod: string;
  typedMethod: string;
  drawHint: string;
  drawKeyboardHint: string;
  typedLabel: string;
  typedPlaceholder: string;
  typedPreview: string;
  undo: string;
  clear: string;
  save: string;
  saving: string;
  cancelSave: string;
  retrySave: string;
  cancelEdit: string;
  saved: string;
  savedMeta: string;
  open: string;
  opening: string;
  replace: string;
  remove: string;
  removing: string;
  invalidReference: string;
  emptyCapture: string;
  saveFailed: string;
  removeFailed: string;
  openFailed: string;
  conflict: string;
  saveAnnouncement: string;
  removeAnnouncement: string;
}

export interface CreateSignatureNodeRegistryOptions {
  service: FormSignatureService;
  messages?:
    | Partial<FormSignatureMessages>
    | ((locale: string) => Partial<FormSignatureMessages> | undefined);
  getErrorMessage?: (
    error: unknown,
    operation: FormSignatureOperation,
    subject: FormSignatureCapture | FormSignatureReference,
  ) => string | undefined;
}

const EN_MESSAGES: Readonly<FormSignatureMessages> = Object.freeze({
  fallbackLabel: 'Signature',
  required: 'Required',
  empty: 'No signature saved.',
  readOnlyEmpty: 'No signature is available.',
  methodLabel: 'Signature method',
  drawnMethod: 'Draw signature',
  typedMethod: 'Type signature',
  drawHint: 'Draw inside the area with a pointer or touch input.',
  drawKeyboardHint: 'Backspace or Delete removes the last stroke.',
  typedLabel: 'Signing name',
  typedPlaceholder: 'Enter the signing name',
  typedPreview: 'Typed signature preview',
  undo: 'Undo last stroke',
  clear: 'Clear signature',
  save: 'Save signature',
  saving: 'Saving signature',
  cancelSave: 'Cancel saving signature',
  retrySave: 'Retry saving signature',
  cancelEdit: 'Cancel signature changes',
  saved: 'Signature saved',
  savedMeta: '{method} · {time}',
  open: 'View signature',
  opening: 'Opening signature',
  replace: 'Replace signature',
  remove: 'Remove signature',
  removing: 'Removing signature',
  invalidReference: 'The host value contains an invalid signature reference.',
  emptyCapture: 'Add a signature before saving.',
  saveFailed: 'The signature could not be saved. Try again.',
  removeFailed: 'The signature could not be removed. Try again.',
  openFailed: 'The signature could not be opened. Try again.',
  conflict: 'The host changed this signature. Review the latest value and sign again.',
  saveAnnouncement: 'Signature saved.',
  removeAnnouncement: 'Signature removed.',
});

const ZH_MESSAGES: Readonly<FormSignatureMessages> = Object.freeze({
  fallbackLabel: '签名',
  required: '必填',
  empty: '尚未保存签名。',
  readOnlyEmpty: '当前没有可查看的签名。',
  methodLabel: '签名方式',
  drawnMethod: '手写签名',
  typedMethod: '键入签名',
  drawHint: '在区域内使用鼠标、触控笔或触摸输入。',
  drawKeyboardHint: '按退格键或删除键可撤销最后一笔。',
  typedLabel: '签署姓名',
  typedPlaceholder: '输入签署姓名',
  typedPreview: '键入签名预览',
  undo: '撤销最后一笔',
  clear: '清空签名',
  save: '保存签名',
  saving: '正在保存签名',
  cancelSave: '取消保存签名',
  retrySave: '重试保存签名',
  cancelEdit: '取消签名修改',
  saved: '签名已保存',
  savedMeta: '{method} · {time}',
  open: '查看签名',
  opening: '正在打开签名',
  replace: '重新签名',
  remove: '删除签名',
  removing: '正在删除签名',
  invalidReference: '宿主值中的签名引用无效。',
  emptyCapture: '完成签名后再保存。',
  saveFailed: '签名没有保存，请重试。',
  removeFailed: '签名没有删除，请重试。',
  openFailed: '签名无法打开，请重试。',
  conflict: '宿主已更新签名，请核对最新值后重新签署。',
  saveAnnouncement: '签名已保存。',
  removeAnnouncement: '签名已删除。',
});

interface PendingOperation {
  kind: FormSignatureOperation;
  controller: AbortController;
}

interface OperationError {
  kind: FormSignatureOperation;
  message: string;
}

class InvalidSignatureReferenceError extends Error {}
class SignatureConflictError extends Error {}

function resolveMessages(
  locale: string,
  override: CreateSignatureNodeRegistryOptions['messages'],
): Readonly<FormSignatureMessages> {
  const base = locale.toLowerCase().startsWith('zh') ? ZH_MESSAGES : EN_MESSAGES;
  const configured = typeof override === 'function' ? override(locale) : override;
  return configured ? { ...base, ...configured } : base;
}

function formatMessage(template: string, values: Record<string, string>): string {
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (token, name: string) =>
    name in values ? values[name] : token,
  );
}

function signatureSettings(node: Pick<CompiledNode, 'customProps'>): {
  captureMode: FormSignatureCaptureMode;
  penColor: FormSignaturePenColor;
} {
  return {
    captureMode: normalizeSignatureCaptureMode(node.customProps?.captureMode),
    penColor: normalizeSignaturePenColor(node.customProps?.penColor),
  };
}

function initialMethod(mode: FormSignatureCaptureMode): 'drawn' | 'typed' {
  return mode === 'typed' ? 'typed' : 'drawn';
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function formatSignedAt(value: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function SignatureIcon({ state = 'capture' }: { state?: 'capture' | 'saved' }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
      {state === 'saved' ? (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="m8 12.2 2.5 2.5L16.4 9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      ) : (
        <>
          <path
            d="m5 17.5 1-4L15.6 4l4.4 4.4-9.6 9.6-4 .9L5 17.5Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <path d="m13.8 5.8 4.4 4.4M4 21h16" stroke="currentColor" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function ActionIcon({ name }: { name: 'open' | 'replace' | 'remove' | 'undo' | 'clear' }) {
  const paths: Record<typeof name, ReactNode> = {
    open: <path d="M13 5h6v6m0-6-8 8m5 0v5H6V8h5" />,
    replace: <path d="M18 8V4l-2 2a7 7 0 1 0 3 6" />,
    remove: <path d="M8 8v10m4-10v10m4-10v10M5 5h14M9 5l1-2h4l1 2m3 0-1 16H7L6 5" />,
    undo: <path d="M9 8 5 12l4 4M5 12h8a5 5 0 0 1 5 5" />,
    clear: <path d="m7 7 10 10M17 7 7 17" />,
  };
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
}

function SignatureDesign({ node, required }: FormNodeDesignProps) {
  const settings = signatureSettings(node);
  return (
    <div className="a3s-form-signature-design">
      <div className="a3s-form-signature-design-heading">
        <span className="a3s-form-signature-design-label">
          <strong>{node.label ?? '签名'}</strong>
          {required && <em>必填</em>}
        </span>
        <small>{node.description ?? '由宿主保存签署记录'}</small>
      </div>
      <div className="a3s-form-signature-design-pad" data-pen-color={settings.penColor}>
        <SignatureIcon />
        <svg aria-hidden="true" viewBox="0 0 280 70" preserveAspectRatio="none">
          <path d="M12 48c23-31 35 18 52-5 15-20 20-36 29-25 8 10-3 31 5 35 14 7 27-35 35-30 9 6-11 27 2 30 12 3 23-18 31-15 8 4 1 16 17 17 19 1 39-4 84-1" />
        </svg>
        <span className="a3s-form-signature-design-action">
          {settings.captureMode === 'typed' ? '键入姓名' : '在此签名'}
        </span>
      </div>
    </div>
  );
}

function SignatureInspector({ node, onUpdate }: FormNodeInspectorProps) {
  const settings = signatureSettings(node);
  const update = (changes: Record<string, string>) =>
    onUpdate({ node: { customProps: { ...node.customProps, ...changes } } });
  return (
    <section className="a3s-form-signature-inspector" aria-label="签名设置">
      <Control label="签名方式">
        <SelectControl
          aria-label="签名方式"
          value={settings.captureMode}
          onChange={(event) => update({ captureMode: event.target.value })}
        >
          <option value="drawn-or-typed">手写或键入</option>
          <option value="drawn">仅手写</option>
          <option value="typed">仅键入</option>
        </SelectControl>
      </Control>
      <Control label="笔迹颜色">
        <SelectControl
          aria-label="笔迹颜色"
          value={settings.penColor}
          onChange={(event) => update({ penColor: event.target.value })}
        >
          <option value="ink">墨黑</option>
          <option value="blue">蓝色</option>
        </SelectControl>
      </Control>
      <p>签名内容只发送给宿主服务。表单值仅保存一个不可变引用，删除和查看仍由宿主授权。</p>
    </section>
  );
}

function SignatureNode({
  service,
  messageOverride,
  getErrorMessage,
  ...props
}: FormNodeRenderProps & {
  service: FormSignatureService;
  messageOverride: CreateSignatureNodeRegistryOptions['messages'];
  getErrorMessage: CreateSignatureNodeRegistryOptions['getErrorMessage'];
}) {
  const messages = useMemo(
    () => resolveMessages(props.locale, messageOverride),
    [messageOverride, props.locale],
  );
  const settings = signatureSettings(props.node);
  const rawValue = Array.isArray(props.value) ? props.value : [];
  const reference =
    rawValue.length === 1 ? normalizeFormSignatureReference(rawValue[0]) : undefined;
  const invalidReference = rawValue.length > 0 && !reference;
  const referenceKey = formSignatureReferenceKey(reference);
  const latestReferenceKey = useRef(referenceKey);
  latestReferenceKey.current = referenceKey;
  const [editing, setEditing] = useState(() => !reference);
  const [method, setMethod] = useState<'drawn' | 'typed'>(() =>
    initialMethod(settings.captureMode),
  );
  const [strokes, setStrokes] = useState<readonly FormSignatureStroke[]>([]);
  const [typedName, setTypedName] = useState('');
  const [pending, setPending] = useState<PendingOperation>();
  const pendingRef = useRef<PendingOperation | undefined>(undefined);
  const [operationError, setOperationError] = useState<OperationError>();
  const [announcement, setAnnouncement] = useState('');
  const hintId = useId();
  const labelId = `${props.id}-label`;

  useEffect(() => {
    if (settings.captureMode === 'typed') setMethod('typed');
    else if (settings.captureMode === 'drawn') setMethod('drawn');
  }, [settings.captureMode]);

  useEffect(() => {
    if (referenceKey) setEditing(false);
  }, [referenceKey]);

  useEffect(
    () => () => {
      pendingRef.current?.controller.abort();
    },
    [],
  );

  const clearCapture = () => {
    setStrokes([]);
    setTypedName('');
    setOperationError(undefined);
  };

  const beginOperation = (kind: FormSignatureOperation): PendingOperation => {
    pendingRef.current?.controller.abort();
    const operation = { kind, controller: new AbortController() };
    pendingRef.current = operation;
    setPending(operation);
    setOperationError(undefined);
    return operation;
  };

  const finishOperation = (operation: PendingOperation) => {
    if (pendingRef.current !== operation) return;
    pendingRef.current = undefined;
    setPending(undefined);
  };

  const fallbackError = (operation: FormSignatureOperation, error: unknown): string => {
    if (error instanceof InvalidSignatureReferenceError) return messages.invalidReference;
    if (error instanceof SignatureConflictError) return messages.conflict;
    const fallback =
      operation === 'save'
        ? messages.saveFailed
        : operation === 'remove'
          ? messages.removeFailed
          : messages.openFailed;
    try {
      const subject: FormSignatureCapture | FormSignatureReference =
        operation === 'save'
          ? method === 'typed'
            ? { method: 'typed', text: boundedTypedSignature(typedName) }
            : { method: 'drawn', strokes }
          : (reference as FormSignatureReference);
      return getErrorMessage?.(error, operation, subject) || fallback;
    } catch {
      return fallback;
    }
  };

  const context = {
    node: props.node,
    plan: props.plan,
    valuePath: props.valuePath,
    rowIndices: props.rowIndices,
  };

  const save = async () => {
    const capture: FormSignatureCapture =
      method === 'typed'
        ? { method: 'typed', text: boundedTypedSignature(typedName) }
        : { method: 'drawn', strokes: strokes.map((stroke) => ({ points: [...stroke.points] })) };
    if (
      (capture.method === 'typed' && capture.text.length === 0) ||
      (capture.method === 'drawn' && signaturePointCount(capture.strokes) === 0)
    ) {
      setOperationError({ kind: 'save', message: messages.emptyCapture });
      return;
    }
    const baseReferenceKey = latestReferenceKey.current;
    const operation = beginOperation('save');
    try {
      const saved = await service.save({
        ...context,
        capture,
        previous: reference,
        signal: operation.controller.signal,
      });
      if (operation.controller.signal.aborted) return;
      const normalized = normalizeFormSignatureReference(saved);
      if (!normalized) throw new InvalidSignatureReferenceError();
      if (latestReferenceKey.current !== baseReferenceKey) throw new SignatureConflictError();
      props.onChange([normalized]);
      clearCapture();
      setEditing(false);
      setAnnouncement(messages.saveAnnouncement);
    } catch (error) {
      if (!operation.controller.signal.aborted && !isAbortError(error)) {
        setOperationError({ kind: 'save', message: fallbackError('save', error) });
      }
    } finally {
      finishOperation(operation);
    }
  };

  const remove = async () => {
    if (!reference) return;
    const target = reference;
    const targetKey = referenceKey;
    const operation = beginOperation('remove');
    try {
      await service.remove({ ...context, signature: target, signal: operation.controller.signal });
      if (operation.controller.signal.aborted) return;
      if (latestReferenceKey.current !== targetKey) throw new SignatureConflictError();
      props.onChange([]);
      setEditing(true);
      clearCapture();
      setAnnouncement(messages.removeAnnouncement);
    } catch (error) {
      if (!operation.controller.signal.aborted && !isAbortError(error)) {
        setOperationError({ kind: 'remove', message: fallbackError('remove', error) });
      }
    } finally {
      finishOperation(operation);
    }
  };

  const open = async () => {
    if (!reference || !service.open) return;
    const operation = beginOperation('open');
    try {
      await service.open({ ...context, signature: reference, signal: operation.controller.signal });
    } catch (error) {
      if (!operation.controller.signal.aborted && !isAbortError(error)) {
        setOperationError({ kind: 'open', message: fallbackError('open', error) });
      }
    } finally {
      finishOperation(operation);
    }
  };

  const cancelPending = () => {
    const operation = pendingRef.current;
    if (!operation) return;
    operation.controller.abort();
    pendingRef.current = undefined;
    setPending(undefined);
  };

  const canSave =
    method === 'typed'
      ? boundedTypedSignature(typedName).length > 0
      : signaturePointCount(strokes) > 0;
  const isSaving = pending?.kind === 'save';
  const modeOptions = settings.captureMode === 'drawn-or-typed';

  return (
    <section
      className={`a3s-form-signature${props.invalid || invalidReference ? ' is-invalid' : ''}`}
      aria-labelledby={labelId}
      data-disabled={props.disabled || undefined}
    >
      <header className="a3s-form-signature-heading">
        <div>
          <span className="a3s-form-signature-label" id={labelId}>
            {props.node.label ?? messages.fallbackLabel}
          </span>
          {props.required && (
            <span className="a3s-form-signature-required">{messages.required}</span>
          )}
        </div>
        {reference && !editing && (
          <small>
            {reference.method === 'drawn' ? messages.drawnMethod : messages.typedMethod}
          </small>
        )}
      </header>
      {props.node.description && (
        <p className="a3s-form-signature-help">{props.node.description}</p>
      )}

      {invalidReference ? (
        <div className="a3s-form-signature-error" role="alert">
          {messages.invalidReference}
        </div>
      ) : reference && !editing ? (
        <div className="a3s-form-signature-saved">
          <span className="a3s-form-signature-saved-icon">
            <SignatureIcon state="saved" />
          </span>
          <span className="a3s-form-signature-saved-copy">
            <strong>{messages.saved}</strong>
            <small>
              {formatMessage(messages.savedMeta, {
                method: reference.method === 'drawn' ? messages.drawnMethod : messages.typedMethod,
                time: formatSignedAt(reference.signedAt, props.locale),
              })}
            </small>
          </span>
          <span className="a3s-form-signature-actions">
            {service.open && (
              <button
                type="button"
                className="btn"
                data-size="icon-sm"
                data-variant="ghost"
                aria-label={pending?.kind === 'open' ? messages.opening : messages.open}
                disabled={Boolean(pending)}
                onClick={open}
              >
                <ActionIcon name="open" />
              </button>
            )}
            {!props.disabled && (
              <>
                <button
                  type="button"
                  className="btn"
                  data-size="icon-sm"
                  data-variant="ghost"
                  aria-label={messages.replace}
                  disabled={Boolean(pending)}
                  onClick={() => {
                    clearCapture();
                    setEditing(true);
                  }}
                >
                  <ActionIcon name="replace" />
                </button>
                <button
                  type="button"
                  className="btn"
                  data-size="icon-sm"
                  data-variant="ghost"
                  aria-label={pending?.kind === 'remove' ? messages.removing : messages.remove}
                  disabled={Boolean(pending)}
                  onClick={remove}
                >
                  <ActionIcon name="remove" />
                </button>
              </>
            )}
          </span>
        </div>
      ) : props.disabled ? (
        <div className="a3s-form-signature-empty">
          <SignatureIcon />
          <span>{messages.readOnlyEmpty}</span>
        </div>
      ) : (
        <div className="a3s-form-signature-editor">
          {modeOptions && (
            <div
              className="a3s-form-signature-methods"
              role="tablist"
              aria-label={messages.methodLabel}
            >
              {(['drawn', 'typed'] as const).map((candidate) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === candidate}
                  className={`btn${method === candidate ? ' is-active' : ''}`}
                  data-size="sm"
                  data-variant="ghost"
                  key={candidate}
                  disabled={isSaving}
                  onClick={() => {
                    setMethod(candidate);
                    setOperationError(undefined);
                  }}
                >
                  {candidate === 'drawn' ? messages.drawnMethod : messages.typedMethod}
                </button>
              ))}
            </div>
          )}

          {method === 'drawn' ? (
            <div className="a3s-form-signature-draw">
              <SignaturePad
                strokes={strokes}
                onChange={(next) => {
                  setStrokes(next);
                  setOperationError(undefined);
                }}
                onUndo={() => {
                  setStrokes((current) => current.slice(0, -1));
                  setOperationError(undefined);
                }}
                disabled={isSaving}
                label="手写签名区域"
                describedBy={hintId}
                penColor={settings.penColor}
              />
              <div className="a3s-form-signature-draw-meta">
                <p id={hintId}>
                  {messages.drawHint}{' '}
                  <span className="a3s-form-signature-keyboard-hint">
                    {messages.drawKeyboardHint}
                  </span>
                </p>
                <span className="a3s-form-signature-draw-actions">
                  <button
                    type="button"
                    className="btn"
                    data-size="sm"
                    data-variant="ghost"
                    aria-label={messages.undo}
                    disabled={isSaving || strokes.length === 0}
                    onClick={() => setStrokes((current) => current.slice(0, -1))}
                  >
                    <ActionIcon name="undo" />
                    {messages.undo}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    data-size="sm"
                    data-variant="ghost"
                    aria-label={messages.clear}
                    disabled={isSaving || strokes.length === 0}
                    onClick={() => setStrokes([])}
                  >
                    <ActionIcon name="clear" />
                    {messages.clear}
                  </button>
                </span>
              </div>
            </div>
          ) : (
            <div className="a3s-form-signature-typed">
              <label htmlFor={`${props.id}-typed`}>{messages.typedLabel}</label>
              <input
                id={`${props.id}-typed`}
                className="input"
                aria-label={messages.typedLabel}
                autoComplete="name"
                disabled={isSaving}
                maxLength={FORM_SIGNATURE_LIMITS.maxTypedLength}
                placeholder={messages.typedPlaceholder}
                value={typedName}
                onChange={(event) => {
                  setTypedName(event.target.value);
                  setOperationError(undefined);
                }}
              />
              <div
                className="a3s-form-signature-typed-preview"
                role="img"
                aria-label={messages.typedPreview}
              >
                <span className="a3s-form-signature-typed-preview-text">
                  {boundedTypedSignature(typedName) || messages.typedPlaceholder}
                </span>
              </div>
            </div>
          )}

          {operationError?.kind === 'save' && (
            <div className="a3s-form-signature-error" role="alert">
              {operationError.message}
            </div>
          )}
          <div className="a3s-form-signature-editor-actions">
            {reference && (
              <button
                type="button"
                className="btn"
                data-size="sm"
                data-variant="secondary"
                disabled={isSaving}
                onClick={() => {
                  clearCapture();
                  setEditing(false);
                }}
              >
                {messages.cancelEdit}
              </button>
            )}
            {isSaving ? (
              <>
                <span className="a3s-form-signature-saving" role="status">
                  {messages.saving}
                </span>
                <button
                  type="button"
                  className="btn"
                  data-size="sm"
                  data-variant="secondary"
                  aria-label={messages.cancelSave}
                  onClick={cancelPending}
                >
                  {messages.cancelSave}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn"
                data-size="sm"
                data-variant="primary"
                aria-label={operationError?.kind === 'save' ? messages.retrySave : messages.save}
                disabled={!canSave}
                onClick={save}
              >
                {operationError?.kind === 'save' ? messages.retrySave : messages.save}
              </button>
            )}
          </div>
        </div>
      )}

      {operationError && (!editing || operationError.kind !== 'save') && (
        <div className="a3s-form-signature-error" role="alert">
          {operationError.message}
        </div>
      )}
      <span className="a3s-form-signature-announcement" aria-live="polite" role="status">
        {announcement}
      </span>
    </section>
  );
}

export function createSignatureNodeRegistry(
  options: CreateSignatureNodeRegistryOptions,
): FormNodeRegistry {
  const Runtime = (props: FormNodeRenderProps) => (
    <SignatureNode
      {...props}
      service={options.service}
      messageOverride={options.messages}
      getErrorMessage={options.getErrorMessage}
    />
  );
  return defineFormNodeRegistry({
    [SIGNATURE_WIDGET]: {
      kind: 'field',
      catalog: {
        section: 'host-services',
        sectionLabel: '宿主能力',
        label: '签名',
        description: '手写或键入，宿主保存签署记录',
        glyph: 'SG',
      },
      schema: createFormSignatureSchema(),
      defaults: {
        width: 12,
        description: '签署前请核对当前内容',
        customProps: {
          captureMode: 'drawn-or-typed',
          penColor: 'ink',
        },
      },
      design: SignatureDesign,
      render: Runtime,
      inspector: SignatureInspector,
    },
  });
}
