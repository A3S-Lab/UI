import type { FormDiagnostic, FormDocument, JsonValue } from '../src/core';

export interface FixtureMutation {
  op: 'set' | 'remove';
  path: string;
  value?: JsonValue;
}

function decodeToken(token: string): string {
  return token.replaceAll('~1', '/').replaceAll('~0', '~');
}

export function mutateForm(base: FormDocument, operations: FixtureMutation[]): FormDocument {
  const document = structuredClone(base) as unknown as Record<string, unknown>;
  for (const operation of operations) {
    const tokens = operation.path.split('/').slice(1).map(decodeToken);
    const key = tokens.pop();
    if (key === undefined) throw new Error(`Invalid mutation path ${operation.path}.`);
    let parent: unknown = document;
    for (const token of tokens) {
      if (parent === null || typeof parent !== 'object') {
        throw new Error(`Mutation parent ${operation.path} does not exist.`);
      }
      parent = (parent as Record<string, unknown>)[token];
    }
    if (parent === null || typeof parent !== 'object') {
      throw new Error(`Mutation parent ${operation.path} is not an object.`);
    }
    if (operation.op === 'remove') {
      if (Array.isArray(parent)) parent.splice(Number(key), 1);
      else delete (parent as Record<string, unknown>)[key];
    } else if (Array.isArray(parent)) {
      parent[Number(key)] = structuredClone(operation.value);
    } else {
      (parent as Record<string, unknown>)[key] = structuredClone(operation.value);
    }
  }
  return document as unknown as FormDocument;
}

export function wireDiagnostics(diagnostics: FormDiagnostic[]): FormDiagnostic[] {
  return JSON.parse(JSON.stringify(diagnostics)) as FormDiagnostic[];
}
