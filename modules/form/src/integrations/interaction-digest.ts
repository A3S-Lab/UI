import { canonicalize, sha256 } from '../core/canonical';
import { hasPortableJsonGraph } from '../core/portable-input';
import type { JsonObject, JsonValue } from '../core/types';
import type { FormInteractionRequest } from './interaction-types';

export function cloneInteractionJson<T>(value: T, label: string): T {
  if (!hasPortableJsonGraph(value)) {
    throw new TypeError(`${label} must be an acyclic, bounded JSON value.`);
  }
  try {
    return structuredClone(value);
  } catch {
    throw new TypeError(`${label} must not contain accessor or Proxy values.`);
  }
}

export function tryCloneInteractionJson<T>(value: T): T | undefined {
  try {
    return cloneInteractionJson(value, 'Interaction contract');
  } catch {
    return undefined;
  }
}

function canonicalDigest(value: unknown, label: string): string {
  const portable = cloneInteractionJson(value, label);
  return `sha256:${sha256(canonicalize(portable as JsonValue))}`;
}

function requestContent(request: FormInteractionRequest): Omit<FormInteractionRequest, 'digest'> {
  return {
    apiVersion: request.apiVersion,
    requestId: request.requestId,
    identity: request.identity,
    form: request.form,
    assignment: request.assignment,
    task: request.task,
    allowedOutcomes: request.allowedOutcomes,
    outputMapping: request.outputMapping,
    maxValueBytes: request.maxValueBytes,
    ...(request.initialValue === undefined ? {} : { initialValue: request.initialValue }),
  };
}

export function digestInteractionValue(value: JsonObject): string {
  return canonicalDigest(value, 'Interaction value');
}

export function digestInteractionRequest(request: FormInteractionRequest): string {
  const portable = cloneInteractionJson(request, 'Interaction request');
  return canonicalDigest(requestContent(portable), 'Interaction request');
}

export function digestInteractionRequestContent(
  request: Omit<FormInteractionRequest, 'digest'>,
): string {
  return canonicalDigest(request, 'Interaction request');
}

export function interactionCanonicalBytes(value: unknown): number | undefined {
  try {
    const portable = cloneInteractionJson(value, 'Interaction value');
    return new TextEncoder().encode(canonicalize(portable as JsonValue)).length;
  } catch {
    return undefined;
  }
}

export function interactionSameJson(left: unknown, right: unknown): boolean {
  try {
    const portableLeft = cloneInteractionJson(left, 'Interaction value');
    const portableRight = cloneInteractionJson(right, 'Interaction value');
    return canonicalize(portableLeft as JsonValue) === canonicalize(portableRight as JsonValue);
  } catch {
    return false;
  }
}
