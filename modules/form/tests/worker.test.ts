import {
  type CompileWorkerRequest,
  compileForm,
  compileFormInWorker,
  createWorkerRequestId,
} from '../src/core';
import { createDocument } from './fixtures';

class FakeWorker {
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  terminated = false;
  mode: 'success' | 'error' | 'mismatch' | 'silent' = 'success';

  postMessage(message: CompileWorkerRequest) {
    queueMicrotask(() => {
      if (this.mode === 'error') this.onerror?.({ message: 'worker failed' } as ErrorEvent);
      else if (this.mode === 'mismatch') {
        this.onmessage?.({
          data: {
            id: 'another-request',
            type: 'result',
            result: compileForm(message.document, message.options),
          },
        } as MessageEvent);
        queueMicrotask(() =>
          this.onmessage?.({
            data: {
              id: message.id,
              type: 'result',
              result: compileForm(message.document, message.options),
            },
          } as MessageEvent),
        );
      } else if (this.mode === 'success')
        this.onmessage?.({
          data: {
            id: message.id,
            type: 'result',
            result: compileForm(message.document, message.options),
          },
        } as MessageEvent);
    });
  }

  terminate() {
    this.terminated = true;
  }
}

describe('cancellable compiler worker client', () => {
  it('creates secure request ids with a deterministic fallback', () => {
    expect(createWorkerRequestId(() => 'secure-id')).toBe('secure-id');
    expect(createWorkerRequestId()).toMatch(/^\d+-0\.\d+$/);
  });

  it('returns matching results and terminates the worker', async () => {
    const worker = new FakeWorker();
    const result = await compileFormInWorker(createDocument(), {
      workerFactory: () => worker as never,
    });
    expect(result.ok).toBe(true);
    expect(result.compilerRevision).toBe('a3s-form-core@0.1.0');
    expect(worker.terminated).toBe(true);
  });

  it('propagates worker errors', async () => {
    const worker = new FakeWorker();
    worker.mode = 'error';
    await expect(
      compileFormInWorker(createDocument(), { workerFactory: () => worker as never }),
    ).rejects.toThrow('worker failed');
    expect(worker.terminated).toBe(true);
  });

  it('honors an already aborted signal', async () => {
    const worker = new FakeWorker();
    const controller = new AbortController();
    controller.abort();
    await expect(
      compileFormInWorker(createDocument(), {
        workerFactory: () => worker as never,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminated).toBe(true);
  });

  it('ignores responses for other requests and supports cancellation while running', async () => {
    const worker = new FakeWorker();
    worker.mode = 'mismatch';
    await expect(
      compileFormInWorker(createDocument(), { workerFactory: () => worker as never }),
    ).resolves.toMatchObject({ ok: true });
    expect(worker.terminated).toBe(true);

    const pending = new FakeWorker();
    pending.mode = 'silent';
    const controller = new AbortController();
    const compilation = compileFormInWorker(createDocument(), {
      workerFactory: () => pending as never,
      signal: controller.signal,
    });
    controller.abort();
    await expect(compilation).rejects.toMatchObject({ name: 'AbortError' });
    expect(pending.terminated).toBe(true);
  });
});
