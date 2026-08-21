import { FORM_CORE_WASM_BASE64 } from '../wasm/form-core-binary';
import { canonicalize } from './canonical';
import type {
  ComputedRuleTraceEntry,
  FieldError,
  FormDiagnostic,
  FormDocument,
  FormLocaleCatalogOverride,
  FormPlan,
  JsonObject,
  JsonValue,
} from './types';

export const PORTABLE_COMPILE_REQUEST_API_VERSION =
  'a3s.dev/form-core/compile-request/v1alpha1' as const;
export const PORTABLE_COMPILE_RESPONSE_API_VERSION =
  'a3s.dev/form-core/compile-response/v1alpha1' as const;
export const PORTABLE_EVALUATE_REQUEST_API_VERSION =
  'a3s.dev/form-core/evaluate-request/v1alpha1' as const;
export const PORTABLE_EVALUATE_RESPONSE_API_VERSION =
  'a3s.dev/form-core/evaluate-response/v1alpha1' as const;

export interface PortableCompilerCapabilities {
  widgets?: string[];
  dataSources?: string[];
  actions?: string[];
}

export interface PortableCompilerLimits {
  maxSerializedBytes?: number;
  maxNodes?: number;
  maxDepth?: number;
  maxRules?: number;
  maxExpressionOperations?: number;
  maxPatchOperations?: number;
}

export interface PortableCompileRequest {
  apiVersion: typeof PORTABLE_COMPILE_REQUEST_API_VERSION;
  document: FormDocument;
  options?: {
    capabilities?: PortableCompilerCapabilities;
    limits?: PortableCompilerLimits;
    requireDigest?: boolean;
  };
}

export interface PortableCompileResponse {
  apiVersion: typeof PORTABLE_COMPILE_RESPONSE_API_VERSION;
  compilerRevision: string;
  ok: boolean;
  normalizedDocumentJson?: string;
  digest?: string;
  schemaProfile?: string;
  formPlan?: FormPlan;
  diagnostics: FormDiagnostic[];
}

export interface PortableEvaluateRequest {
  apiVersion: typeof PORTABLE_EVALUATE_REQUEST_API_VERSION;
  formPlan: FormPlan;
  value: JsonObject;
  options?: {
    includeValues?: boolean;
    locale?: string;
    localeCatalog?: FormLocaleCatalogOverride;
  };
}

export interface PortableEvaluateResponse {
  apiVersion: typeof PORTABLE_EVALUATE_RESPONSE_API_VERSION;
  compilerRevision: string;
  ok: boolean;
  value?: JsonObject;
  trace: ComputedRuleTraceEntry[];
  errors: FieldError[];
}

interface FormCoreWasmExports {
  memory: WebAssembly.Memory;
  engine_version: () => number;
  compiler_version: () => number;
  input_ptr: () => number;
  input_capacity: () => number;
  output_ptr: () => number;
  output_capacity: () => number;
  compile_request: (length: number) => number;
  evaluate_request: (length: number) => number;
}

export interface WasmFormCore {
  readonly version: string;
  readonly compilerRevision: string;
  readonly inputCapacity: number;
  readonly outputCapacity: number;
  compileBytes(request: Uint8Array): Uint8Array | undefined;
  compile(request: PortableCompileRequest): PortableCompileResponse | undefined;
  evaluateBytes(request: Uint8Array): Uint8Array | undefined;
  evaluate(request: PortableEvaluateRequest): PortableEvaluateResponse | undefined;
}

export interface PortableFormCoreStatus {
  available: boolean;
  engine: 'rust-wasm' | 'unavailable';
  version?: string;
  compilerRevision?: string;
}

export type Base64Decoder = (value: string) => string;

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function formatVersion(value: number): string {
  return `${value >>> 16}.${(value >>> 8) & 0xff}.${value & 0xff}`;
}

function requestSizeFailure(actual: number, limit: number, compilerRevision: string): Uint8Array {
  const response = {
    apiVersion: PORTABLE_COMPILE_RESPONSE_API_VERSION,
    compilerRevision,
    diagnostics: [
      {
        code: 'protocol.request_size',
        message: `compile request is ${actual} bytes; the hard limit is ${limit} bytes`,
        path: '',
        severity: 'error',
      },
    ],
    ok: false,
  } as JsonValue;
  return encoder.encode(canonicalize(response));
}

function requestEncodingFailure(compilerRevision: string): PortableCompileResponse {
  return {
    apiVersion: PORTABLE_COMPILE_RESPONSE_API_VERSION,
    compilerRevision,
    ok: false,
    diagnostics: [
      {
        code: 'protocol.request_encoding',
        message: 'compile request must be an acyclic JSON value that can be encoded.',
        path: '',
        severity: 'error',
      },
    ],
  };
}

function evaluationRequestSizeFailure(
  actual: number,
  limit: number,
  compilerRevision: string,
): Uint8Array {
  const response = {
    apiVersion: PORTABLE_EVALUATE_RESPONSE_API_VERSION,
    compilerRevision,
    errors: [
      {
        code: 'protocol.request_size',
        message: `evaluation request is ${actual} bytes; the hard limit is ${limit} bytes`,
        path: '',
      },
    ],
    ok: false,
    trace: [],
  } as JsonValue;
  return encoder.encode(canonicalize(response));
}

function evaluationRequestEncodingFailure(compilerRevision: string): PortableEvaluateResponse {
  return {
    apiVersion: PORTABLE_EVALUATE_RESPONSE_API_VERSION,
    compilerRevision,
    ok: false,
    trace: [],
    errors: [
      {
        code: 'protocol.request_encoding',
        message: 'evaluation request must be an acyclic JSON value that can be encoded.',
        path: '',
      },
    ],
  };
}

/**
 * Creates an explicit portable semantic compiler from caller-provided WASM.
 * Default package adapters use embeddedWasmFormCore so browser, Worker, CLI,
 * and server-side JavaScript share the same compiler revision.
 */
export function createWasmFormCore(
  binary: BufferSource,
  runtime: typeof WebAssembly | null = globalThis.WebAssembly,
): WasmFormCore | undefined {
  if (!runtime) return undefined;
  try {
    const module = new runtime.Module(binary);
    const instance = new runtime.Instance(module);
    const exports = instance.exports as unknown as FormCoreWasmExports;
    if (
      typeof exports.compile_request !== 'function' ||
      typeof exports.evaluate_request !== 'function'
    ) {
      return undefined;
    }
    const inputCapacity = exports.input_capacity();
    const outputCapacity = exports.output_capacity();
    const inputPointer = exports.input_ptr();
    const outputPointer = exports.output_ptr();
    const compilerRevision = `a3s-form-core@${formatVersion(exports.compiler_version())}`;
    return {
      version: formatVersion(exports.engine_version()),
      compilerRevision,
      inputCapacity,
      outputCapacity,
      compileBytes(request) {
        if (request.byteLength > inputCapacity) {
          return requestSizeFailure(request.byteLength, inputCapacity, compilerRevision);
        }
        new Uint8Array(exports.memory.buffer, inputPointer, request.byteLength).set(request);
        const outputLength = exports.compile_request(request.byteLength);
        if (outputLength === 0 || outputLength > outputCapacity) return undefined;
        return new Uint8Array(exports.memory.buffer, outputPointer, outputLength).slice();
      },
      compile(request) {
        try {
          const encoded = JSON.stringify(request);
          if (encoded === undefined) return requestEncodingFailure(compilerRevision);
          const response = this.compileBytes(encoder.encode(encoded));
          if (!response) return undefined;
          return JSON.parse(decoder.decode(response)) as PortableCompileResponse;
        } catch {
          return requestEncodingFailure(compilerRevision);
        }
      },
      evaluateBytes(request) {
        if (request.byteLength > inputCapacity) {
          return evaluationRequestSizeFailure(request.byteLength, inputCapacity, compilerRevision);
        }
        new Uint8Array(exports.memory.buffer, inputPointer, request.byteLength).set(request);
        const outputLength = exports.evaluate_request(request.byteLength);
        if (outputLength === 0 || outputLength > outputCapacity) return undefined;
        return new Uint8Array(exports.memory.buffer, outputPointer, outputLength).slice();
      },
      evaluate(request) {
        try {
          const encoded = JSON.stringify(request);
          if (encoded === undefined) return evaluationRequestEncodingFailure(compilerRevision);
          const response = this.evaluateBytes(encoder.encode(encoded));
          if (!response) return undefined;
          return JSON.parse(decoder.decode(response)) as PortableEvaluateResponse;
        } catch {
          return evaluationRequestEncodingFailure(compilerRevision);
        }
      },
    };
  } catch {
    return undefined;
  }
}

export function createBase64WasmFormCore(
  encoded: string,
  runtime: typeof WebAssembly | null = globalThis.WebAssembly,
  decode: Base64Decoder | undefined = globalThis.atob?.bind(globalThis),
): WasmFormCore | undefined {
  if (!runtime || !decode) return undefined;
  try {
    const decoded = decode(encoded);
    const binary = new Uint8Array(new ArrayBuffer(decoded.length));
    for (let index = 0; index < decoded.length; index += 1) {
      binary[index] = decoded.charCodeAt(index);
    }
    return createWasmFormCore(binary, runtime);
  } catch {
    return undefined;
  }
}

let embeddedCore: WasmFormCore | undefined;

/** Returns the package-embedded semantic core used by every default adapter. */
export function embeddedWasmFormCore(): WasmFormCore | undefined {
  embeddedCore ??= createBase64WasmFormCore(FORM_CORE_WASM_BASE64);
  return embeddedCore;
}

export function describePortableFormCore(core: WasmFormCore | undefined): PortableFormCoreStatus {
  return core
    ? {
        available: true,
        engine: 'rust-wasm',
        version: core.version,
        compilerRevision: core.compilerRevision,
      }
    : { available: false, engine: 'unavailable' };
}

export function portableFormCoreStatus(): PortableFormCoreStatus {
  return describePortableFormCore(embeddedWasmFormCore());
}
