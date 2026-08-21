import { SHA256_WASM_BINARY } from '../wasm/sha256-binary';

interface Sha256WasmExports {
  memory: WebAssembly.Memory;
  input_ptr: () => number;
  input_capacity: () => number;
  hash: (length: number) => number;
  engine_version: () => number;
}

export interface WasmSha256Accelerator {
  readonly capacity: number;
  readonly version: string;
  digest(value: string): string | undefined;
}

export interface WasmAccelerationStatus {
  available: boolean;
  engine: 'rust-sha256' | 'javascript';
  version?: string;
  capacity?: number;
}

const encoder = new TextEncoder();
const hex = Array.from({ length: 256 }, (_, value) => value.toString(16).padStart(2, '0'));

function formatVersion(value: number): string {
  return `${value >>> 16}.${(value >>> 8) & 0xff}.${value & 0xff}`;
}

export function createWasmSha256(
  runtime: typeof WebAssembly | null = globalThis.WebAssembly,
  binary: BufferSource = SHA256_WASM_BINARY,
): WasmSha256Accelerator | undefined {
  if (!runtime) return undefined;
  try {
    const module = new runtime.Module(binary);
    const instance = new runtime.Instance(module);
    const exports = instance.exports as unknown as Sha256WasmExports;
    const capacity = exports.input_capacity();
    const inputPointer = exports.input_ptr();
    return {
      capacity,
      version: formatVersion(exports.engine_version()),
      digest(value) {
        const bytes = encoder.encode(value);
        if (bytes.length > capacity) return undefined;
        new Uint8Array(exports.memory.buffer, inputPointer, bytes.length).set(bytes);
        const digestPointer = exports.hash(bytes.length);
        return Array.from(
          new Uint8Array(exports.memory.buffer, digestPointer, 32),
          (byte) => hex[byte],
        ).join('');
      },
    };
  } catch {
    return undefined;
  }
}

const accelerator = createWasmSha256();

export function sha256WithAccelerator(
  candidate: WasmSha256Accelerator | undefined,
  value: string,
): string | undefined {
  return candidate?.digest(value);
}

export function sha256WithWasm(value: string): string | undefined {
  return sha256WithAccelerator(accelerator, value);
}

export function describeWasmAcceleration(
  candidate: WasmSha256Accelerator | undefined,
): WasmAccelerationStatus {
  return candidate
    ? {
        available: true,
        engine: 'rust-sha256',
        version: candidate.version,
        capacity: candidate.capacity,
      }
    : { available: false, engine: 'javascript' };
}

export function wasmAccelerationStatus(): WasmAccelerationStatus {
  return describeWasmAcceleration(accelerator);
}
