import { canonicalize } from './canonical';
import { compileForm, DEFAULT_COMPILER_LIMITS } from './compiler';
import { decodePointer, getAtPointer } from './pointer';
import type {
  ApplyPatchResult,
  CompileOptions,
  FormDocument,
  FormPatch,
  FormPatchOperation,
  JsonObject,
  JsonValue,
  PatchConflict,
} from './types';

const RESERVED = new Set(['revision', 'digest', 'kind', 'apiVersion']);
const UNSAFE = new Set(['__proto__', 'prototype', 'constructor']);

function equal(left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) return left === right;
  return canonicalize(left as JsonValue) === canonicalize(right as JsonValue);
}

function assertSafePointer(pointer: string): void {
  const parts = decodePointer(pointer);
  if (parts.some((part) => UNSAFE.has(part))) throw new Error('JSON Pointer 包含不安全路径。');
}

function parentAt(
  root: Record<string, unknown>,
  pointer: string,
): { parent: Record<string, unknown> | unknown[]; key: string } {
  const parts = decodePointer(pointer);
  if (parts.length === 0) throw new Error('不能替换整个表单文档。');
  if (RESERVED.has(parts[0])) throw new Error(`不能通过补丁修改 /${parts[0]}。`);
  if (parts.some((part) => UNSAFE.has(part))) throw new Error('JSON Pointer 包含不安全路径。');
  let current: unknown = root;
  for (const part of parts.slice(0, -1)) {
    if (current === null || typeof current !== 'object')
      throw new Error(`补丁路径不存在：${pointer}`);
    current = (current as Record<string, unknown>)[part];
  }
  if (current === null || typeof current !== 'object')
    throw new Error(`补丁路径不存在：${pointer}`);
  return { parent: current as Record<string, unknown> | unknown[], key: parts.at(-1) as string };
}

function removeAt(root: Record<string, unknown>, pointer: string): unknown {
  const { parent, key } = parentAt(root, pointer);
  if (Array.isArray(parent)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= parent.length)
      throw new Error(`数组索引无效：${pointer}`);
    return parent.splice(index, 1)[0];
  }
  if (!(key in parent)) throw new Error(`补丁路径不存在：${pointer}`);
  const previous = parent[key];
  delete parent[key];
  return previous;
}

function applyOperation(root: Record<string, unknown>, operation: FormPatchOperation): void {
  if (operation.op === 'move') {
    const moved = removeAt(root, operation.from);
    assertSafePointer(operation.path);
    const destination = getAtPointer(root, operation.path);
    if (!Array.isArray(destination)) throw new Error(`移动目标不是数组：${operation.path}`);
    const index = operation.index ?? destination.length;
    if (index < 0 || index > destination.length) throw new Error(`移动索引无效：${index}`);
    destination.splice(index, 0, moved);
    return;
  }
  if (operation.op === 'insert') {
    assertSafePointer(operation.path);
    const target = getAtPointer(root, operation.path);
    if (!Array.isArray(target)) throw new Error(`插入目标不是数组：${operation.path}`);
    if (operation.index < 0 || operation.index > target.length)
      throw new Error(`插入索引无效：${operation.index}`);
    target.splice(operation.index, 0, structuredClone(operation.value));
    return;
  }
  if (operation.op === 'remove') {
    removeAt(root, operation.path);
    return;
  }
  const { parent, key } = parentAt(root, operation.path);
  if (Array.isArray(parent)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= parent.length)
      throw new Error(`数组索引无效：${operation.path}`);
    parent[index] = structuredClone(operation.value);
  } else parent[key] = structuredClone(operation.value);
}

export function applyFormPatch(
  document: FormDocument,
  patch: FormPatch,
  options?: CompileOptions,
): ApplyPatchResult {
  const conflicts: PatchConflict[] = [];
  if (patch.apiVersion !== 'a3s.dev/form-patch/v1alpha1') {
    conflicts.push({
      code: 'invalid_operation',
      path: '/apiVersion',
      message: '不支持的补丁版本。',
    });
  }
  if (patch.baseRevision !== document.revision) {
    conflicts.push({
      code: 'revision_mismatch',
      path: '/revision',
      message: `补丁基于 revision ${patch.baseRevision}，当前文档为 ${document.revision}。`,
    });
  }
  if (patch.operations.length > DEFAULT_COMPILER_LIMITS.maxPatchOperations) {
    conflicts.push({
      code: 'invalid_operation',
      path: '/operations',
      message: `单个补丁最多包含 ${DEFAULT_COMPILER_LIMITS.maxPatchOperations} 个操作。`,
    });
  }
  for (const precondition of patch.preconditions ?? []) {
    try {
      assertSafePointer(precondition.path);
      const current = getAtPointer(document, precondition.path);
      if (precondition.exists !== undefined && precondition.exists !== (current !== undefined))
        conflicts.push({
          code: 'precondition_failed',
          path: precondition.path,
          message: '补丁前置条件 exists 不满足。',
        });
      if (precondition.equals !== undefined && !equal(current, precondition.equals))
        conflicts.push({
          code: 'precondition_failed',
          path: precondition.path,
          message: '补丁前置条件 equals 不满足。',
        });
    } catch (error) {
      conflicts.push({
        code: 'precondition_failed',
        path: precondition.path,
        message: error instanceof Error ? error.message : '补丁前置条件无效。',
      });
    }
  }
  if (conflicts.length > 0) return { ok: false, conflicts, diagnostics: [] };
  const next = structuredClone(document) as FormDocument;
  try {
    for (const operation of patch.operations)
      applyOperation(next as unknown as Record<string, unknown>, operation);
  } catch (error) {
    return {
      ok: false,
      conflicts: [
        {
          code: 'invalid_operation',
          path: '/operations',
          message: error instanceof Error ? error.message : '补丁操作无效。',
        },
      ],
      diagnostics: [],
    };
  }
  next.revision += 1;
  delete next.digest;
  const compiled = compileForm(next, options);
  if (!compiled.ok || !compiled.document || !compiled.plan) {
    return {
      ok: false,
      conflicts: [
        {
          code: 'invalid_operation',
          path: '/operations',
          message: '补丁会产生无效表单，因此未应用。',
        },
      ],
      diagnostics: compiled.diagnostics,
    };
  }
  return {
    ok: true,
    document: compiled.document,
    plan: compiled.plan,
    diagnostics: compiled.diagnostics,
  };
}

export function diffFormDocuments(before: FormDocument, after: FormDocument): FormPatch {
  const operations: FormPatchOperation[] = [];
  const keys: (keyof FormDocument)[] = [
    'schema',
    'ui',
    'rules',
    'dataSources',
    'actions',
    'metadata',
  ];
  for (const key of keys) {
    if (!equal(before[key], after[key])) {
      if (after[key] === undefined) operations.push({ op: 'remove', path: `/${key}` });
      else
        operations.push({
          op: 'set',
          path: `/${key}`,
          value: structuredClone(after[key]) as JsonValue,
        });
    }
  }
  return {
    apiVersion: 'a3s.dev/form-patch/v1alpha1',
    baseRevision: before.revision,
    description: '由 a3s-form diff 生成',
    operations,
  };
}

export function createFormRef(
  document: FormDocument,
  uri: string,
  mode: import('./types').FormRef['mode'],
  options?: CompileOptions,
): import('./types').FormRef {
  const result = compileForm(document, options);
  if (!result.ok || !result.document) throw new Error('无法为无效表单创建 FormRef。');
  return {
    uri,
    revision: result.document.revision,
    digest: result.document.digest as string,
    mode,
  };
}

export function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
