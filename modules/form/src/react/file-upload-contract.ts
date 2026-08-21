import type { JsonSchema } from '../core';
import type {
  CreateFormFileUploadSchemaOptions,
  FormFileReference,
  FormFileUploadProgress,
} from './file-upload';

export const FORM_FILE_UPLOAD_LIMITS = Object.freeze({
  defaultMaxFiles: 5,
  maxFiles: 100,
  defaultMaxFileSize: 10 * 1024 * 1024,
  maxFileSize: 5 * 1024 * 1024 * 1024,
  defaultConcurrency: 2,
  maxConcurrency: 4,
  maxLocalTasks: 120,
});

const REFERENCE_KEYS = new Set(['id', 'name', 'size', 'mediaType']);

export function formatFileUploadMessage(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (token, name: string) =>
    name in values ? String(values[name]) : token,
  );
}

export function boundedFileUploadInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback;
}

function referenceSchema(): JsonSchema {
  return {
    type: 'object',
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 512 },
      name: { type: 'string', minLength: 1, maxLength: 1024 },
      size: { type: 'integer', minimum: 0 },
      mediaType: { type: 'string', minLength: 1, maxLength: 255 },
    },
    required: ['id', 'name', 'size', 'mediaType'],
    additionalProperties: false,
  };
}

export function createFormFileUploadSchema(
  options: CreateFormFileUploadSchemaOptions = {},
): JsonSchema {
  const maxFiles = boundedFileUploadInteger(
    options.maxFiles,
    FORM_FILE_UPLOAD_LIMITS.defaultMaxFiles,
    0,
    FORM_FILE_UPLOAD_LIMITS.maxFiles,
  );
  const minFiles = boundedFileUploadInteger(options.minFiles, 0, 0, maxFiles);
  return {
    type: 'array',
    default: [],
    minItems: minFiles,
    maxItems: maxFiles,
    uniqueItems: true,
    items: referenceSchema(),
  };
}

export function normalizeFormFileReference(value: unknown): FormFileReference | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source);
  if (keys.length !== REFERENCE_KEYS.size || keys.some((key) => !REFERENCE_KEYS.has(key))) {
    return undefined;
  }
  if (
    typeof source.id !== 'string' ||
    source.id.trim().length === 0 ||
    source.id.length > 512 ||
    typeof source.name !== 'string' ||
    source.name.trim().length === 0 ||
    source.name.length > 1024 ||
    typeof source.size !== 'number' ||
    !Number.isSafeInteger(source.size) ||
    source.size < 0 ||
    typeof source.mediaType !== 'string' ||
    source.mediaType.trim().length === 0 ||
    source.mediaType.length > 255
  ) {
    return undefined;
  }
  return {
    id: source.id,
    name: source.name,
    size: source.size,
    mediaType: source.mediaType,
  };
}

export function isFormFileReference(value: unknown): value is FormFileReference {
  return normalizeFormFileReference(value) !== undefined;
}

export function formatFormFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  const precision = value >= 10 || Number.isInteger(value) ? 0 : 1;
  return `${value.toFixed(precision)} ${unit}`;
}

function validAcceptTokens(accept: string): string[] {
  return accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(
      (token) =>
        /^\.[a-z0-9][a-z0-9.+_-]*$/i.test(token) ||
        /^[a-z0-9][a-z0-9!#$&^_.+-]*\/(?:\*|[a-z0-9][a-z0-9!#$&^_.+-]*)$/i.test(token),
    );
}

export function formFileAccepts(file: File, accept: string): boolean {
  const tokens = validAcceptTokens(accept);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const mediaType = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return mediaType.startsWith(token.slice(0, -1));
    return mediaType === token;
  });
}

export function formFileUploadProgressPercentage(
  progress: FormFileUploadProgress,
  fileSize: number,
): number {
  const total =
    typeof progress.total === 'number' && Number.isFinite(progress.total) && progress.total > 0
      ? progress.total
      : fileSize;
  if (!Number.isFinite(progress.loaded) || progress.loaded <= 0 || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((progress.loaded / total) * 100)));
}
