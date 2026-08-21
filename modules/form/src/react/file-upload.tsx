import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CompiledNode, FormPlan, JsonObject, JsonValue } from '../core';
import { Control } from './designer-inspector-controls';
import {
  boundedFileUploadInteger,
  createFormFileUploadSchema,
  FORM_FILE_UPLOAD_LIMITS,
  formatFileUploadMessage,
  formatFormFileSize,
  formFileAccepts,
  formFileUploadProgressPercentage,
  normalizeFormFileReference,
} from './file-upload-contract';
import type {
  FormNodeDesignProps,
  FormNodeInspectorProps,
  FormNodeRegistry,
  FormNodeRenderProps,
} from './node-registry';
import { defineFormNodeRegistry } from './node-registry';
import { SelectControl } from './select-control';

export const FILE_UPLOAD_WIDGET = 'a3s.file-upload';

export {
  createFormFileUploadSchema,
  FORM_FILE_UPLOAD_LIMITS,
  isFormFileReference,
} from './file-upload-contract';

export interface FormFileReference extends JsonObject {
  id: string;
  name: string;
  size: number;
  mediaType: string;
}

export interface FormFileOperationContext {
  node: CompiledNode;
  plan: FormPlan;
  valuePath?: string;
  rowIndices: readonly number[];
}

export interface FormFileUploadProgress {
  loaded: number;
  total?: number;
}

export interface FormFileUploadRequest extends FormFileOperationContext {
  file: File;
  signal: AbortSignal;
  onProgress: (progress: FormFileUploadProgress) => void;
}

export interface FormFileRemoveRequest extends FormFileOperationContext {
  file: FormFileReference;
  signal: AbortSignal;
}

export interface FormFileOpenRequest extends FormFileOperationContext {
  file: FormFileReference;
  signal: AbortSignal;
}

export interface FormFileService {
  upload: (request: FormFileUploadRequest) => Promise<FormFileReference>;
  remove: (request: FormFileRemoveRequest) => Promise<void>;
  open?: (request: FormFileOpenRequest) => void | Promise<void>;
}

export type FormFileOperation = 'upload' | 'remove' | 'open';

export interface FormFileUploadMessages {
  fallbackLabel: string;
  required: string;
  chooseFiles: string;
  chooseFilesLabel: string;
  dropPrompt: string;
  dropHint: string;
  empty: string;
  constraints: string;
  acceptAny: string;
  queued: string;
  uploading: string;
  uploaded: string;
  removing: string;
  opening: string;
  fileCount: string;
  uploadProgressLabel: string;
  cancelUploadLabel: string;
  retryUploadLabel: string;
  dismissErrorLabel: string;
  removeFileLabel: string;
  retryRemoveLabel: string;
  openFileLabel: string;
  invalidType: string;
  tooLarge: string;
  tooMany: string;
  invalidReference: string;
  uploadFailed: string;
  removeFailed: string;
  openFailed: string;
  uploadCompleteAnnouncement: string;
  removeCompleteAnnouncement: string;
}

export interface CreateFileUploadNodeRegistryOptions {
  service: FormFileService;
  messages?:
    | Partial<FormFileUploadMessages>
    | ((locale: string) => Partial<FormFileUploadMessages> | undefined);
  getErrorMessage?: (
    error: unknown,
    operation: FormFileOperation,
    subject: File | FormFileReference,
  ) => string | undefined;
}

export interface CreateFormFileUploadSchemaOptions {
  minFiles?: number;
  maxFiles?: number;
}

const EN_MESSAGES: Readonly<FormFileUploadMessages> = Object.freeze({
  fallbackLabel: 'Attachments',
  required: 'Required',
  chooseFiles: 'Choose files',
  chooseFilesLabel: 'Choose {label} files',
  dropPrompt: 'Drop files here',
  dropHint: 'or choose files from this device',
  empty: 'No files uploaded.',
  constraints: '{accept} · {size} each · Up to {count} files',
  acceptAny: 'Any file type',
  queued: 'Waiting to upload',
  uploading: 'Uploading',
  uploaded: 'Uploaded',
  removing: 'Removing',
  opening: 'Opening',
  fileCount: '{current} of {maximum} files',
  uploadProgressLabel: '{name} upload progress',
  cancelUploadLabel: 'Cancel upload {name}',
  retryUploadLabel: 'Retry upload {name}',
  dismissErrorLabel: 'Dismiss {name} error',
  removeFileLabel: 'Remove {name}',
  retryRemoveLabel: 'Retry removing {name}',
  openFileLabel: 'Open {name}',
  invalidType: 'This file type is not accepted.',
  tooLarge: 'The file exceeds the {size} limit.',
  tooMany: 'Up to {count} files can be kept.',
  invalidReference: 'The host returned an invalid file reference.',
  uploadFailed: 'The upload did not complete. Try again.',
  removeFailed: 'The file could not be removed. Try again.',
  openFailed: 'The file could not be opened. Try again.',
  uploadCompleteAnnouncement: '{name} uploaded.',
  removeCompleteAnnouncement: '{name} removed.',
});

const ZH_MESSAGES: Readonly<FormFileUploadMessages> = Object.freeze({
  fallbackLabel: '附件',
  required: '必填',
  chooseFiles: '选择文件',
  chooseFilesLabel: '选择{label}文件',
  dropPrompt: '拖放文件到这里',
  dropHint: '或从设备中选择',
  empty: '尚未上传文件。',
  constraints: '{accept} · 单个不超过 {size} · 最多 {count} 个',
  acceptAny: '不限文件类型',
  queued: '等待上传',
  uploading: '上传中',
  uploaded: '已上传',
  removing: '正在删除',
  opening: '正在打开',
  fileCount: '已使用 {current} / {maximum}',
  uploadProgressLabel: '{name} 上传进度',
  cancelUploadLabel: '取消上传 {name}',
  retryUploadLabel: '重试上传 {name}',
  dismissErrorLabel: '移除 {name} 错误',
  removeFileLabel: '删除 {name}',
  retryRemoveLabel: '重试删除 {name}',
  openFileLabel: '打开 {name}',
  invalidType: '不支持这种文件类型。',
  tooLarge: '文件超过 {size} 上限。',
  tooMany: '最多可保留 {count} 个文件。',
  invalidReference: '宿主返回的文件引用无效。',
  uploadFailed: '上传没有完成，请重试。',
  removeFailed: '删除没有完成，请重试。',
  openFailed: '文件无法打开，请重试。',
  uploadCompleteAnnouncement: '{name} 已上传。',
  removeCompleteAnnouncement: '{name} 已删除。',
});

interface UploadTask {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'error';
  progress: number;
  error?: string;
  retryable: boolean;
}

interface ReferenceActionState {
  operation: 'remove' | 'open';
  pending: boolean;
  error?: string;
}

function resolveMessages(
  locale: string,
  override: CreateFileUploadNodeRegistryOptions['messages'],
): Readonly<FormFileUploadMessages> {
  const base = locale.toLowerCase().startsWith('zh') ? ZH_MESSAGES : EN_MESSAGES;
  const configured = typeof override === 'function' ? override(locale) : override;
  return configured ? { ...base, ...configured } : base;
}

function fileUploadSettings(node: CompiledNode) {
  return {
    accept: typeof node.customProps?.accept === 'string' ? node.customProps.accept.trim() : '',
    maxFileSize: boundedFileUploadInteger(
      node.customProps?.maxFileSize,
      FORM_FILE_UPLOAD_LIMITS.defaultMaxFileSize,
      1,
      FORM_FILE_UPLOAD_LIMITS.maxFileSize,
    ),
    maxFiles: boundedFileUploadInteger(
      node.schema?.maxItems,
      FORM_FILE_UPLOAD_LIMITS.defaultMaxFiles,
      0,
      FORM_FILE_UPLOAD_LIMITS.maxFiles,
    ),
    concurrency: boundedFileUploadInteger(
      node.customProps?.maxConcurrentUploads,
      FORM_FILE_UPLOAD_LIMITS.defaultConcurrency,
      1,
      FORM_FILE_UPLOAD_LIMITS.maxConcurrency,
    ),
  };
}

function UploadIcon({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7.5 3.5h6L18.5 8v12.5h-11z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 3.5V8h5M10 13h6m-6 3h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActionIcon({ name }: { name: 'close' | 'retry' | 'open' | 'remove' }) {
  const paths: Record<typeof name, ReactNode> = {
    close: <path d="m7.5 7.5 9 9m0-9-9 9" />,
    retry: <path d="M18 8.5V4.8l-1.7 1.7A7 7 0 1 0 19 12" />,
    open: <path d="M13 5h6v6m0-6-8 8m5 0v5H6V8h5" />,
    remove: <path d="M8 8v10m4-10v10m4-10v10M5 5h14M9 5l1-2h4l1 2m3 0-1 16H7L6 5" />,
  };
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
}

function FileUploadDesign({ node, schema, required }: FormNodeDesignProps) {
  const settings = fileUploadSettings({ ...node, schema } as CompiledNode);
  return (
    <div className="a3s-form-file-design">
      <div className="a3s-form-file-design-heading">
        <span>
          <strong className="a3s-form-file-design-title">{node.label ?? '文件上传'}</strong>
          {required && <em>必填</em>}
        </span>
        <small>{node.description ?? '由宿主服务接收并保存文件'}</small>
      </div>
      <div className="a3s-form-file-design-drop">
        <span className="a3s-form-file-design-icon">
          <UploadIcon size={18} />
        </span>
        <span>
          <strong className="a3s-form-file-design-prompt">拖放文件到这里</strong>
          <small className="a3s-form-file-design-constraints">
            {settings.accept || '不限格式'} · {formatFormFileSize(settings.maxFileSize)} · 最多{' '}
            {settings.maxFiles} 个
          </small>
        </span>
        <i aria-hidden="true">选择文件</i>
      </div>
    </div>
  );
}

function FileUploadInspector({ node, onUpdate }: FormNodeInspectorProps) {
  const maxFileSize = boundedFileUploadInteger(
    node.customProps?.maxFileSize,
    FORM_FILE_UPLOAD_LIMITS.defaultMaxFileSize,
    1,
    FORM_FILE_UPLOAD_LIMITS.maxFileSize,
  );
  const concurrency = boundedFileUploadInteger(
    node.customProps?.maxConcurrentUploads,
    FORM_FILE_UPLOAD_LIMITS.defaultConcurrency,
    1,
    FORM_FILE_UPLOAD_LIMITS.maxConcurrency,
  );
  const updateCustomProps = (changes: Record<string, JsonValue | undefined>) => {
    const customProps = { ...(node.customProps ?? {}) };
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) delete customProps[key];
      else customProps[key] = value;
    }
    onUpdate({ node: { customProps } });
  };
  return (
    <section className="a3s-form-file-inspector" aria-label="文件上传设置">
      <Control label="允许的文件类型" hint="扩展名或 MIME，逗号分隔">
        <input
          aria-label="允许的文件类型"
          placeholder=".pdf,image/*"
          value={typeof node.customProps?.accept === 'string' ? node.customProps.accept : ''}
          onChange={(event) =>
            updateCustomProps({ accept: event.target.value.trim() || undefined })
          }
        />
      </Control>
      <div className="a3s-form-inline-controls">
        <Control label="单个文件上限" hint="MB">
          <input
            aria-label="单个文件上限（MB）"
            type="number"
            min="1"
            max={FORM_FILE_UPLOAD_LIMITS.maxFileSize / 1024 / 1024}
            value={Math.max(1, Math.round(maxFileSize / 1024 / 1024))}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              updateCustomProps({
                maxFileSize: Math.max(
                  1,
                  Math.min(FORM_FILE_UPLOAD_LIMITS.maxFileSize, Math.round(value * 1024 * 1024)),
                ),
              });
            }}
          />
        </Control>
        <Control label="并发上传" hint="1–4">
          <SelectControl
            aria-label="并发上传数"
            value={concurrency}
            onChange={(event) =>
              updateCustomProps({ maxConcurrentUploads: Number(event.target.value) })
            }
          >
            {[1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectControl>
        </Control>
      </div>
      <p className="a3s-form-file-inspector-note">
        文件数量在“校验”中设置。文件内容、授权和存储位置不写入表单文档。
      </p>
    </section>
  );
}

function FileUploadNode({
  service,
  messageOverride,
  getErrorMessage,
  ...props
}: FormNodeRenderProps & {
  service: FormFileService;
  messageOverride: CreateFileUploadNodeRegistryOptions['messages'];
  getErrorMessage: CreateFileUploadNodeRegistryOptions['getErrorMessage'];
}) {
  const messages = useMemo(
    () => resolveMessages(props.locale, messageOverride),
    [messageOverride, props.locale],
  );
  const settings = fileUploadSettings(props.node);
  const rawValue = useMemo<JsonValue[]>(
    () => (Array.isArray(props.value) ? props.value : []),
    [props.value],
  );
  const valueEntries = useMemo(() => {
    const occurrences = new Map<string, number>();
    return rawValue.map((candidate, index) => {
      const file = normalizeFormFileReference(candidate);
      const identity = file
        ? `file:${file.id}`
        : `invalid:${JSON.stringify(candidate) ?? String(candidate)}`;
      const occurrence = (occurrences.get(identity) ?? 0) + 1;
      occurrences.set(identity, occurrence);
      return { candidate, index, key: `${identity}:${occurrence}` };
    });
  }, [rawValue]);
  const { onChange } = props;
  const valueRef = useRef<JsonValue[]>(rawValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const taskSequence = useRef(0);
  const mounted = useRef(false);
  const controllers = useRef(new Map<string, AbortController>());
  const dragDepth = useRef(0);
  const fieldId = useId();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [referenceActions, setReferenceActions] = useState<Record<string, ReferenceActionState>>(
    {},
  );

  useEffect(() => {
    valueRef.current = rawValue;
  }, [rawValue]);

  useEffect(() => {
    mounted.current = true;
    const activeControllers = controllers.current;
    return () => {
      mounted.current = false;
      for (const controller of activeControllers.values()) controller.abort();
      activeControllers.clear();
    };
  }, []);

  const operationContext = useCallback(
    (): FormFileOperationContext => ({
      node: props.node,
      plan: props.plan,
      valuePath: props.valuePath,
      rowIndices: [...props.rowIndices],
    }),
    [props.node, props.plan, props.rowIndices, props.valuePath],
  );

  const safeErrorMessage = useCallback(
    (error: unknown, operation: FormFileOperation, subject: File | FormFileReference) => {
      try {
        const configured = getErrorMessage?.(error, operation, subject)?.trim();
        if (configured) return configured.slice(0, 500);
      } catch {
        // Error presentation must not replace the original service failure.
      }
      if (operation === 'remove') return messages.removeFailed;
      if (operation === 'open') return messages.openFailed;
      return messages.uploadFailed;
    },
    [getErrorMessage, messages],
  );

  const beginUpload = useCallback(
    (task: UploadTask) => {
      const controller = new AbortController();
      controllers.current.set(task.id, controller);
      void Promise.resolve()
        .then(() =>
          service.upload({
            ...operationContext(),
            file: task.file,
            signal: controller.signal,
            onProgress: (progress) => {
              if (!mounted.current || controller.signal.aborted) return;
              const percentage = formFileUploadProgressPercentage(progress, task.file.size);
              setTasks((current) =>
                current.map((candidate) =>
                  candidate.id === task.id ? { ...candidate, progress: percentage } : candidate,
                ),
              );
            },
          }),
        )
        .then((result) => {
          if (!mounted.current || controller.signal.aborted) return;
          const uploaded = normalizeFormFileReference(result);
          if (!uploaded) throw new Error(messages.invalidReference);
          const current = valueRef.current;
          if (
            current.length >= settings.maxFiles ||
            current.some((candidate) => normalizeFormFileReference(candidate)?.id === uploaded.id)
          ) {
            throw new Error(messages.invalidReference);
          }
          const next: JsonValue[] = [...current, uploaded];
          valueRef.current = next;
          onChange(next);
          setTasks((items) => items.filter((candidate) => candidate.id !== task.id));
          setAnnouncement(
            formatFileUploadMessage(messages.uploadCompleteAnnouncement, { name: uploaded.name }),
          );
        })
        .catch((error: unknown) => {
          if (!mounted.current) return;
          if (controller.signal.aborted) {
            setTasks((items) => items.filter((candidate) => candidate.id !== task.id));
            return;
          }
          setTasks((items) =>
            items.map((candidate) =>
              candidate.id === task.id
                ? {
                    ...candidate,
                    status: 'error',
                    error: safeErrorMessage(error, 'upload', task.file),
                    retryable: true,
                  }
                : candidate,
            ),
          );
        })
        .finally(() => controllers.current.delete(task.id));
    },
    [
      messages.invalidReference,
      messages.uploadCompleteAnnouncement,
      onChange,
      operationContext,
      safeErrorMessage,
      service,
      settings.maxFiles,
    ],
  );

  useEffect(() => {
    const active = tasks.filter((task) => task.status === 'uploading').length;
    const queued = tasks
      .filter((task) => task.status === 'queued')
      .slice(0, Math.max(0, settings.concurrency - active));
    if (queued.length === 0) return;
    const ids = new Set(queued.map((task) => task.id));
    setTasks((current) =>
      current.map((task) =>
        ids.has(task.id) ? { ...task, status: 'uploading', progress: 0 } : task,
      ),
    );
    for (const task of queued) beginUpload(task);
  }, [beginUpload, settings.concurrency, tasks]);

  const addFiles = (files: readonly File[]) => {
    if (props.disabled || settings.maxFiles === 0) return;
    const reserved = tasks.filter((task) => task.retryable).length;
    let available = Math.max(0, settings.maxFiles - valueRef.current.length - reserved);
    const nextTasks: UploadTask[] = [];
    const availableTaskSlots = Math.max(0, FORM_FILE_UPLOAD_LIMITS.maxLocalTasks - tasks.length);
    for (const selected of files.slice(0, availableTaskSlots)) {
      taskSequence.current += 1;
      const id = `${fieldId}-${taskSequence.current}`;
      if (!formFileAccepts(selected, settings.accept)) {
        nextTasks.push({
          id,
          file: selected,
          status: 'error',
          progress: 0,
          error: messages.invalidType,
          retryable: false,
        });
      } else if (selected.size > settings.maxFileSize) {
        nextTasks.push({
          id,
          file: selected,
          status: 'error',
          progress: 0,
          error: formatFileUploadMessage(messages.tooLarge, {
            size: formatFormFileSize(settings.maxFileSize),
          }),
          retryable: false,
        });
      } else if (available === 0) {
        nextTasks.push({
          id,
          file: selected,
          status: 'error',
          progress: 0,
          error: formatFileUploadMessage(messages.tooMany, { count: settings.maxFiles }),
          retryable: false,
        });
      } else {
        available -= 1;
        nextTasks.push({ id, file: selected, status: 'queued', progress: 0, retryable: true });
      }
    }
    if (nextTasks.length) setTasks((current) => [...current, ...nextTasks]);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = '';
  };

  const cancelTask = (taskId: string) => {
    controllers.current.get(taskId)?.abort();
    controllers.current.delete(taskId);
    setTasks((current) => current.filter((task) => task.id !== taskId));
  };

  const retryTask = (taskId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: 'queued', progress: 0, error: undefined } : task,
      ),
    );
  };

  const runReferenceAction = (file: FormFileReference, operation: 'remove' | 'open') => {
    const key = `${operation}:${file.id}`;
    const controller = new AbortController();
    controllers.current.set(key, controller);
    setReferenceActions((current) => ({
      ...current,
      [file.id]: { operation, pending: true },
    }));
    const request = { ...operationContext(), file, signal: controller.signal };
    Promise.resolve()
      .then(() => (operation === 'remove' ? service.remove(request) : service.open?.(request)))
      .then(() => {
        if (!mounted.current || controller.signal.aborted) return;
        if (operation === 'remove') {
          const current = valueRef.current;
          const index = current.findIndex(
            (candidate) => normalizeFormFileReference(candidate)?.id === file.id,
          );
          const next =
            index < 0 ? current : [...current.slice(0, index), ...current.slice(index + 1)];
          valueRef.current = next;
          onChange(next);
          setAnnouncement(
            formatFileUploadMessage(messages.removeCompleteAnnouncement, { name: file.name }),
          );
        }
        setReferenceActions((current) => {
          const next = { ...current };
          delete next[file.id];
          return next;
        });
      })
      .catch((error: unknown) => {
        if (!mounted.current || controller.signal.aborted) return;
        setReferenceActions((current) => ({
          ...current,
          [file.id]: {
            operation,
            pending: false,
            error: safeErrorMessage(error, operation, file),
          },
        }));
      })
      .finally(() => controllers.current.delete(key));
  };

  const currentCount = rawValue.length + tasks.filter((task) => task.retryable).length;
  const selectionDisabled = props.disabled || currentCount >= settings.maxFiles;
  const constraintText = formatFileUploadMessage(messages.constraints, {
    accept: settings.accept || messages.acceptAny,
    size: formatFormFileSize(settings.maxFileSize),
    count: settings.maxFiles,
  });
  const descriptionId = props.node.description ? `${props.id}-description` : undefined;
  const constraintId = `${props.id}-constraints`;

  return (
    <section
      className="a3s-form-file-upload"
      data-disabled={props.disabled || undefined}
      data-invalid={props.invalid || undefined}
    >
      <div className="a3s-form-file-upload-heading">
        <div>
          <label id={`${props.id}-label`} htmlFor={props.id}>
            {props.node.label ?? messages.fallbackLabel}
          </label>
          {props.required && <span className="a3s-form-file-required">{messages.required}</span>}
        </div>
        <span>
          {formatFileUploadMessage(messages.fileCount, {
            current: rawValue.length,
            maximum: settings.maxFiles,
          })}
        </span>
      </div>
      {props.node.description && (
        <p className="a3s-form-file-help" id={descriptionId}>
          {props.node.description}
        </p>
      )}
      <fieldset
        className="a3s-form-file-dropzone"
        aria-labelledby={`${props.id}-label`}
        data-testid="file-upload-dropzone"
        data-dragging={dragging || undefined}
        data-disabled={selectionDisabled || undefined}
        onDragEnter={(event: DragEvent<HTMLFieldSetElement>) => {
          if (selectionDisabled) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (selectionDisabled) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(event) => {
          if (selectionDisabled) return;
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (selectionDisabled) return;
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files ?? []));
        }}
      >
        <span className="a3s-form-file-drop-icon">
          <UploadIcon />
        </span>
        <div className="a3s-form-file-drop-copy">
          <strong className="a3s-form-file-drop-title">{messages.dropPrompt}</strong>
          <span className="a3s-form-file-drop-hint">{messages.dropHint}</span>
        </div>
        <input
          ref={inputRef}
          className="a3s-form-file-input"
          id={props.id}
          type="file"
          accept={settings.accept || undefined}
          multiple={settings.maxFiles > 1}
          disabled={selectionDisabled}
          aria-label={formatFileUploadMessage(messages.chooseFilesLabel, {
            label: props.node.label ?? messages.fallbackLabel,
          })}
          aria-describedby={[descriptionId, constraintId].filter(Boolean).join(' ') || undefined}
          aria-invalid={props.invalid || undefined}
          onChange={handleInput}
          onBlur={props.onBlur}
          onFocus={props.onFocus}
        />
        <button
          type="button"
          className="btn"
          data-size="sm"
          data-variant="secondary"
          disabled={selectionDisabled}
          onClick={() => inputRef.current?.click()}
        >
          {messages.chooseFiles}
        </button>
      </fieldset>
      <p className="a3s-form-file-constraints" id={constraintId}>
        {constraintText}
      </p>
      {rawValue.length === 0 && tasks.length === 0 ? (
        <p className="a3s-form-file-empty">{messages.empty}</p>
      ) : (
        <ul className="a3s-form-file-list" aria-labelledby={`${props.id}-label`}>
          {valueEntries.map(({ candidate, index, key }) => {
            const file = normalizeFormFileReference(candidate);
            if (!file) {
              return (
                <li className="a3s-form-file-row is-error" key={key}>
                  <span className="a3s-form-file-type">
                    <FileIcon />
                  </span>
                  <span className="a3s-form-file-details">
                    <strong className="a3s-form-file-name">{messages.invalidReference}</strong>
                    <small className="a3s-form-file-meta">#{index + 1}</small>
                  </span>
                </li>
              );
            }
            const action = referenceActions[file.id];
            return (
              <li className={`a3s-form-file-row${action?.error ? ' is-error' : ''}`} key={key}>
                <span className="a3s-form-file-type">
                  <FileIcon />
                </span>
                <span className="a3s-form-file-details">
                  <strong className="a3s-form-file-name" title={file.name}>
                    {file.name}
                  </strong>
                  <small className="a3s-form-file-meta">
                    {formatFormFileSize(file.size)} ·{' '}
                    {action?.pending
                      ? action.operation === 'remove'
                        ? messages.removing
                        : messages.opening
                      : messages.uploaded}
                  </small>
                  {action?.error && (
                    <em className="a3s-form-file-error" role="alert">
                      {action.error}
                    </em>
                  )}
                </span>
                <span className="a3s-form-file-actions">
                  {service.open && (
                    <button
                      type="button"
                      className="btn"
                      data-size="icon-sm"
                      data-variant="ghost"
                      disabled={action?.pending}
                      aria-label={formatFileUploadMessage(messages.openFileLabel, {
                        name: file.name,
                      })}
                      onClick={() => runReferenceAction(file, 'open')}
                    >
                      <ActionIcon name="open" />
                    </button>
                  )}
                  {!props.disabled && (
                    <button
                      type="button"
                      className="btn"
                      data-size="icon-sm"
                      data-variant="ghost"
                      disabled={action?.pending}
                      aria-label={formatFileUploadMessage(
                        action?.error && action.operation === 'remove'
                          ? messages.retryRemoveLabel
                          : messages.removeFileLabel,
                        { name: file.name },
                      )}
                      onClick={() => runReferenceAction(file, 'remove')}
                    >
                      <ActionIcon
                        name={action?.error && action.operation === 'remove' ? 'retry' : 'remove'}
                      />
                    </button>
                  )}
                </span>
              </li>
            );
          })}
          {tasks.map((task) => (
            <li className={`a3s-form-file-row is-${task.status}`} key={task.id}>
              <span className="a3s-form-file-type">
                <FileIcon />
              </span>
              <span className="a3s-form-file-details">
                <strong className="a3s-form-file-name" title={task.file.name}>
                  {task.file.name}
                </strong>
                <small className="a3s-form-file-meta">
                  {formatFormFileSize(task.file.size)} ·{' '}
                  {task.status === 'queued'
                    ? messages.queued
                    : task.status === 'uploading'
                      ? messages.uploading
                      : task.error}
                </small>
                {task.status === 'uploading' && (
                  <progress
                    aria-label={formatFileUploadMessage(messages.uploadProgressLabel, {
                      name: task.file.name,
                    })}
                    value={task.progress}
                    max="100"
                    aria-valuenow={task.progress}
                  />
                )}
                {task.status === 'error' && (
                  <em className="a3s-form-file-error" role="alert">
                    {task.error}
                  </em>
                )}
              </span>
              <span className="a3s-form-file-actions">
                {task.status === 'error' && task.retryable && (
                  <button
                    type="button"
                    className="btn"
                    data-size="icon-sm"
                    data-variant="ghost"
                    aria-label={formatFileUploadMessage(messages.retryUploadLabel, {
                      name: task.file.name,
                    })}
                    onClick={() => retryTask(task.id)}
                  >
                    <ActionIcon name="retry" />
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  data-size="icon-sm"
                  data-variant="ghost"
                  aria-label={formatFileUploadMessage(
                    task.status === 'error'
                      ? messages.dismissErrorLabel
                      : messages.cancelUploadLabel,
                    { name: task.file.name },
                  )}
                  onClick={() => cancelTask(task.id)}
                >
                  <ActionIcon name="close" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <span className="a3s-form-file-announcement" aria-live="polite" role="status">
        {announcement}
      </span>
    </section>
  );
}

export function createFileUploadNodeRegistry(
  options: CreateFileUploadNodeRegistryOptions,
): FormNodeRegistry {
  const Runtime = (props: FormNodeRenderProps) => (
    <FileUploadNode
      {...props}
      service={options.service}
      messageOverride={options.messages}
      getErrorMessage={options.getErrorMessage}
    />
  );
  return defineFormNodeRegistry({
    [FILE_UPLOAD_WIDGET]: {
      kind: 'field',
      catalog: {
        section: 'host-services',
        sectionLabel: '宿主能力',
        label: '文件上传',
        description: '上传、进度、重试与文件引用',
        glyph: 'DOC',
      },
      schema: createFormFileUploadSchema(),
      defaults: {
        width: 12,
        description: '上传业务所需文件',
        customProps: {
          accept: '',
          maxFileSize: FORM_FILE_UPLOAD_LIMITS.defaultMaxFileSize,
          maxConcurrentUploads: FORM_FILE_UPLOAD_LIMITS.defaultConcurrency,
        },
      },
      design: FileUploadDesign,
      render: Runtime,
      inspector: FileUploadInspector,
    },
  });
}
