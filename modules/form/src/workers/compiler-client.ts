import type {
  CompileOptions,
  CompileResult,
  CompileWorkerRequest,
  CompileWorkerResponse,
  FormDocument,
} from '../core/types';

export interface WorkerCompileOptions extends CompileOptions {
  signal?: AbortSignal;
  workerFactory: () => Worker;
}

export function createWorkerRequestId(randomUUID?: () => string): string {
  return randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function compileFormInWorker(
  document: FormDocument,
  options: WorkerCompileOptions,
): Promise<CompileResult> {
  const { signal, workerFactory, ...compileOptions } = options;
  const worker = workerFactory();
  const id = createWorkerRequestId(globalThis.crypto?.randomUUID?.bind(globalThis.crypto));
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      signal?.removeEventListener('abort', abort);
      worker.terminate();
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('Form compilation was cancelled.', 'AbortError'));
    };
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once: true });
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message));
    };
    worker.onmessage = (event: MessageEvent<CompileWorkerResponse>) => {
      if (event.data.id !== id) return;
      cleanup();
      resolve(event.data.result);
    };
    const request: CompileWorkerRequest = {
      id,
      type: 'compile',
      document,
      options: compileOptions,
    };
    worker.postMessage(request);
  });
}
