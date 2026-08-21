export {
  DATA_SOURCE_LIMITS,
  DEFAULT_COMPILER_LIMITS,
  DEFAULT_WIDGETS,
  MATRIX_LIMITS,
} from './compiler-contract';

import { embeddedWasmFormCore, type WasmFormCore } from './portable-core';
import { hasPortableJsonGraph, portableDocumentDiagnostic } from './portable-input';
import type {
  CompileOptions,
  CompileResult,
  CompilerCapabilities,
  CompilerLimits,
  FormDiagnostic,
  FormDocument,
  FormPlan,
} from './types';

function failure(
  compilerRevision: string,
  code: string,
  message: string,
  path: string,
): CompileResult {
  return {
    compilerRevision,
    ok: false,
    diagnostics: [{ code, severity: 'error', message, path }],
  };
}

function capabilitiesToArrays(
  capabilities: CompilerCapabilities | undefined,
): { widgets?: string[]; dataSources?: string[]; actions?: string[] } | undefined {
  if (!capabilities) return undefined;
  const widgets = capabilities.widgets ? Array.from(capabilities.widgets) : undefined;
  const dataSources = capabilities.dataSources ? Array.from(capabilities.dataSources) : undefined;
  const actions = capabilities.actions ? Array.from(capabilities.actions) : undefined;
  if (widgets === undefined && dataSources === undefined && actions === undefined) return undefined;
  return { widgets, dataSources, actions };
}

function limitsToPortable(
  limits: Partial<CompilerLimits> | undefined,
): Partial<CompilerLimits> | undefined {
  if (!limits) return undefined;
  return {
    maxSerializedBytes: limits.maxSerializedBytes,
    maxNodes: limits.maxNodes,
    maxDepth: limits.maxDepth,
    maxRules: limits.maxRules,
    maxExpressionOperations: limits.maxExpressionOperations,
    maxPatchOperations: limits.maxPatchOperations,
  };
}

function deepFreeze<T extends object>(root: T): T {
  const pending: object[] = [root];
  while (pending.length > 0) {
    const value = pending.pop() as object;
    for (const child of Object.values(value)) {
      if (child !== null && typeof child === 'object') pending.push(child);
    }
    Object.freeze(value);
  }
  return root;
}

/**
 * Compiles through the package-embedded Rust/WASM semantic core. TypeScript,
 * Worker, CLI, and browser consumers all enter through this synchronous path.
 */
export function compileFormWithCore(
  core: WasmFormCore | undefined,
  input: unknown,
  options: CompileOptions = {},
): CompileResult {
  const compilerRevision = core?.compilerRevision ?? 'a3s-form-core@unavailable';
  if (!core) {
    return failure(
      compilerRevision,
      'compiler.unavailable',
      'The portable A3S Form semantic core is unavailable.',
      '',
    );
  }
  if (!hasPortableJsonGraph(input)) {
    return {
      compilerRevision,
      ok: false,
      diagnostics: [portableDocumentDiagnostic()],
    };
  }

  try {
    const response = core.compile({
      apiVersion: 'a3s.dev/form-core/compile-request/v1alpha1',
      document: input as FormDocument,
      options: {
        capabilities: capabilitiesToArrays(options.capabilities),
        limits: limitsToPortable(options.limits),
        requireDigest: options.requireDigest,
      },
    });
    if (!response) {
      return failure(
        compilerRevision,
        'compiler.response',
        'The portable A3S Form semantic core did not return a response.',
        '',
      );
    }
    if (!response.ok) {
      if (response.diagnostics.some((item) => item.code === 'protocol.request_encoding')) {
        return {
          compilerRevision: response.compilerRevision,
          ok: false,
          diagnostics: [portableDocumentDiagnostic()],
        };
      }
      return {
        compilerRevision: response.compilerRevision,
        ok: false,
        diagnostics: response.diagnostics,
      };
    }
    if (
      response.normalizedDocumentJson === undefined ||
      response.formPlan === undefined ||
      response.digest === undefined ||
      response.schemaProfile === undefined
    ) {
      return failure(
        response.compilerRevision,
        'compiler.response',
        'The portable A3S Form semantic core returned an incomplete success response.',
        '',
      );
    }
    const document = JSON.parse(response.normalizedDocumentJson) as FormDocument;
    const plan = response.formPlan as FormPlan;
    return {
      compilerRevision: response.compilerRevision,
      ok: true,
      document: deepFreeze(document),
      plan: deepFreeze(plan),
      diagnostics: response.diagnostics as FormDiagnostic[],
    };
  } catch {
    return failure(
      compilerRevision,
      'compiler.response',
      'The portable A3S Form semantic core response could not be decoded.',
      '',
    );
  }
}

export function compileForm(input: unknown, options: CompileOptions = {}): CompileResult {
  return compileFormWithCore(embeddedWasmFormCore(), input, options);
}

export function assertCompiled(input: unknown, options?: CompileOptions): FormPlan {
  const result = compileForm(input, options);
  if (!result.ok || !result.plan) {
    const message = result.diagnostics
      .map((item) => `${item.path || '/'}: ${item.message}`)
      .join('\n');
    throw new Error(message);
  }
  return result.plan;
}
