import { useCallback, useMemo } from 'react';
import {
  type FieldErrors,
  type FieldValues,
  type FieldError as ReactHookFormFieldError,
  type Resolver,
  type ResolverOptions,
  type UseFormProps,
  type UseFormReturn,
  useForm as useReactHookForm,
  useWatch,
} from 'react-hook-form';
import {
  type FieldError as A3SFieldError,
  type FormAsyncValidator,
  type FormHostAdapter,
  type FormLocaleCatalogOverride,
  type FormPlan,
  type JsonObject,
  matchValuePathTemplate,
  validateFormValueAsync,
} from './core';

export type {
  Control,
  ControllerFieldState,
  ControllerProps,
  ControllerRenderProps,
  DefaultValues,
  FieldArray,
  FieldArrayPath,
  FieldArrayWithId,
  FieldPath,
  FieldPathValue,
  FieldValues,
  FormProviderProps,
  FormState as ReactHookFormState,
  RegisterOptions,
  SubmitErrorHandler,
  SubmitHandler,
  UseControllerProps,
  UseControllerReturn,
  UseFieldArrayProps,
  UseFieldArrayReturn,
  UseFormProps,
  UseFormRegister,
  UseFormRegisterReturn,
  UseFormReturn,
  UseFormStateProps,
  UseFormStateReturn,
  UseWatchProps,
} from 'react-hook-form';
export {
  Controller,
  Form,
  FormProvider,
  FormState,
  FormStateSubscribe,
  useController,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
  Watch,
} from 'react-hook-form';

export interface A3SFormResolverOptions {
  plan: FormPlan;
  validator?: FormAsyncValidator;
  locale?: string;
  localeCatalog?: FormLocaleCatalogOverride;
}

export interface A3SFormRendererBinding {
  plan: FormPlan;
  value: JsonObject;
  onChange: (value: JsonObject) => void;
  errors: A3SFieldError[];
  hostAdapter?: FormHostAdapter;
  locale?: string;
  localeCatalog?: FormLocaleCatalogOverride;
}

export interface UseA3SFormProps<TFieldValues extends FieldValues = FieldValues, TContext = unknown>
  extends Omit<UseFormProps<TFieldValues, TContext, TFieldValues>, 'resolver'> {
  plan: FormPlan;
  hostAdapter?: FormHostAdapter;
  locale?: string;
  localeCatalog?: FormLocaleCatalogOverride;
}

export interface UseA3SFormReturn<
  TFieldValues extends FieldValues = FieldValues,
  TContext = unknown,
> extends UseFormReturn<TFieldValues, TContext, TFieldValues> {
  formPlan: FormPlan;
  rendererProps: A3SFormRendererBinding;
}

function fieldScope(plan: FormPlan, names: readonly string[] | undefined) {
  if (names?.length !== 1) return { kind: 'form' } as const;
  const path = names[0];
  const node = plan.nodes.find(
    (candidate) =>
      candidate.valuePath === path ||
      matchValuePathTemplate(candidate.valuePathTemplate, path) !== undefined,
  );
  return node ? ({ kind: 'field', nodeId: node.id, path } as const) : ({ kind: 'form' } as const);
}

function assignNestedError(
  target: Record<string, unknown>,
  path: string,
  issue: A3SFieldError,
  criteriaMode: ResolverOptions<FieldValues>['criteriaMode'],
): void {
  if (!path) {
    if (!target.root) target.root = {};
    const root = target.root as Record<string, unknown>;
    root.a3s = mergeFieldError(root.a3s, issue, criteriaMode);
    return;
  }

  const segments = path.split('.');
  let current = target;
  for (const segment of segments.slice(0, -1)) {
    const existing = current[segment];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  const key = segments.at(-1) as string;
  current[key] = mergeFieldError(current[key], issue, criteriaMode);
}

function mergeFieldError(
  current: unknown,
  issue: A3SFieldError,
  criteriaMode: ResolverOptions<FieldValues>['criteriaMode'],
): ReactHookFormFieldError {
  const existing =
    current && typeof current === 'object' && 'type' in current
      ? (current as ReactHookFormFieldError)
      : undefined;
  if (!existing) {
    return {
      type: issue.code,
      message: issue.message,
      ...(criteriaMode === 'all' ? { types: { [issue.code]: issue.message } } : {}),
    };
  }
  if (criteriaMode !== 'all') return existing;
  const types = { ...existing.types };
  let key = issue.code;
  for (let index = 2; key in types; index += 1) key = `${issue.code}.${index}`;
  types[key] = issue.message;
  return { ...existing, types };
}

export function toReactHookFormErrors<TFieldValues extends FieldValues>(
  issues: readonly A3SFieldError[],
  criteriaMode: ResolverOptions<TFieldValues>['criteriaMode'] = 'firstError',
): FieldErrors<TFieldValues> {
  const errors: Record<string, unknown> = {};
  for (const issue of issues) {
    assignNestedError(errors, issue.path, issue, criteriaMode);
  }
  return errors as FieldErrors<TFieldValues>;
}

function isReactHookFormFieldError(value: unknown): value is ReactHookFormFieldError {
  return Boolean(
    value && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string',
  );
}

function rendererPath(path: readonly string[]): string {
  if (path[0] === 'root' && path[1] === 'a3s') return '';
  return path.join('.');
}

export function toA3SFormErrors<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
): A3SFieldError[] {
  const output: A3SFieldError[] = [];
  const seen = new Set<string>();

  const append = (path: readonly string[], code: string, message: unknown) => {
    if (typeof message !== 'string' || message.length === 0) return;
    const issue = { path: rendererPath(path), code, message };
    const identity = `${issue.path}\u0000${issue.code}\u0000${issue.message}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    output.push(issue);
  };

  const visit = (value: unknown, path: string[]) => {
    if (!value || typeof value !== 'object') return;
    if (isReactHookFormFieldError(value)) {
      append(path, value.type, value.message);
      for (const [code, message] of Object.entries(value.types ?? {})) append(path, code, message);
    }
    for (const [key, child] of Object.entries(value)) {
      if (['type', 'message', 'types', 'ref'].includes(key)) continue;
      visit(child, [...path, key]);
    }
  };

  visit(errors, []);
  return output;
}

/**
 * Bridges React Hook Form's subscription engine to the deterministic A3S Form Core.
 * The core remains authoritative for computed rules, schema validation, locale copy,
 * and host-provided asynchronous validation.
 */
export function createA3SFormResolver<
  TFieldValues extends FieldValues = FieldValues,
  TContext = unknown,
>(options: A3SFormResolverOptions): Resolver<TFieldValues, TContext, TFieldValues> {
  let activeValidation: AbortController | undefined;

  return async (values, _context, resolverOptions) => {
    activeValidation?.abort();
    const controller = new AbortController();
    activeValidation = controller;
    const evaluation = await validateFormValueAsync(
      options.plan,
      values as JsonObject,
      options.validator,
      {
        scope: fieldScope(options.plan, resolverOptions.names),
        locale: options.locale,
        localeCatalog: options.localeCatalog,
      },
      controller.signal,
    );

    if (activeValidation === controller) activeValidation = undefined;
    if (evaluation.status === 'cancelled') {
      return { values, errors: {} };
    }
    if (evaluation.errors.length === 0) {
      return { values: evaluation.value as TFieldValues, errors: {} };
    }
    return {
      values: {} as Record<string, never>,
      errors: toReactHookFormErrors<TFieldValues>(evaluation.errors, resolverOptions.criteriaMode),
    };
  };
}

/**
 * React Hook Form-compatible state with an A3S Renderer binding.
 * Import this optional React surface from `@a3s-lab/ui/form/react-hooks`.
 */
export function useA3SForm<TFieldValues extends FieldValues = FieldValues, TContext = unknown>(
  options: UseA3SFormProps<TFieldValues, TContext>,
): UseA3SFormReturn<TFieldValues, TContext> {
  const { plan, hostAdapter, locale, localeCatalog, ...formOptions } = options;
  const resolver = useMemo(
    () =>
      createA3SFormResolver<TFieldValues, TContext>({
        plan,
        validator: hostAdapter?.validateValue,
        locale,
        localeCatalog,
      }),
    [hostAdapter?.validateValue, locale, localeCatalog, plan],
  );
  const methods = useReactHookForm<TFieldValues, TContext, TFieldValues>({
    ...formOptions,
    resolver,
  });
  const watchedValue = useWatch({ control: methods.control }) as TFieldValues | undefined;
  const { reset, trigger } = methods;
  const handleRendererChange = useCallback(
    (value: JsonObject) => {
      reset(value as TFieldValues, {
        keepDefaultValues: true,
        keepErrors: true,
        keepIsSubmitted: true,
        keepSubmitCount: true,
        keepTouched: true,
      });
      if (formOptions.mode === 'all' || formOptions.mode === 'onChange') void trigger();
    },
    [formOptions.mode, reset, trigger],
  );
  const rendererErrors = useMemo(
    () => toA3SFormErrors(methods.formState.errors),
    [methods.formState.errors],
  );
  const rendererProps = useMemo<A3SFormRendererBinding>(
    () => ({
      plan,
      value: (watchedValue ?? methods.getValues()) as JsonObject,
      onChange: handleRendererChange,
      errors: rendererErrors,
      hostAdapter,
      locale,
      localeCatalog,
    }),
    [
      handleRendererChange,
      hostAdapter,
      locale,
      localeCatalog,
      methods,
      plan,
      rendererErrors,
      watchedValue,
    ],
  );

  return useMemo(
    () => ({ ...methods, formPlan: plan, rendererProps }),
    [methods, plan, rendererProps],
  );
}
