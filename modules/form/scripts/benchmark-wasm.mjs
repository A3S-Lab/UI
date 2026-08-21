import { performance } from 'node:perf_hooks';
import {
  sha256JavaScript,
  sha256WithWasm,
  wasmAccelerationStatus,
} from '../../../dist/form/core.js';

const payload = 'A3S Form · 表单设计器\n'.repeat(8_192);
const rounds = 8;

function measure(digest) {
  const startedAt = performance.now();
  let result = '';
  for (let index = 0; index < rounds; index += 1) result = digest(payload) ?? '';
  return { result, elapsed: performance.now() - startedAt };
}

const status = wasmAccelerationStatus();
if (!status.available) throw new Error('Rust WASM SHA-256 accelerator is unavailable.');

sha256JavaScript('warmup');
sha256WithWasm('warmup');
const javascript = measure(sha256JavaScript);
const wasm = measure(sha256WithWasm);
if (!wasm.result || wasm.result !== javascript.result) {
  throw new Error('WASM and JavaScript SHA-256 results do not match.');
}

const speedup = javascript.elapsed / wasm.elapsed;
console.log(
  `WASM ${status.version}: ${wasm.elapsed.toFixed(2)} ms; JavaScript: ${javascript.elapsed.toFixed(2)} ms; ${speedup.toFixed(2)}x speedup.`,
);
