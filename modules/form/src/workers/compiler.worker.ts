/// <reference lib="webworker" />

import { compileForm } from '../core/compiler';
import type { CompileWorkerRequest, CompileWorkerResponse } from '../core/types';

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<CompileWorkerRequest>) => {
  if (event.data.type !== 'compile') return;
  const response: CompileWorkerResponse = {
    id: event.data.id,
    type: 'result',
    result: compileForm(event.data.document, event.data.options),
  };
  workerScope.postMessage(response);
};
