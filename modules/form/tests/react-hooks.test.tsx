import { act, renderHook, waitFor } from '@testing-library/react';
import { useFieldArray } from 'react-hook-form';
import { assertCompiled, type FormAsyncValidator } from '../src/core';
import {
  createA3SFormResolver,
  toA3SFormErrors,
  toReactHookFormErrors,
  useA3SForm,
} from '../src/react-hooks';
import { createDocument, createObjectRepeaterDocument } from './fixtures';

interface PersonValues {
  name: string;
  age: number;
  active: boolean;
  role: string;
}

function resolverOptions(names?: string[], criteriaMode: 'firstError' | 'all' = 'all') {
  return {
    criteriaMode,
    fields: {},
    names,
    shouldUseNativeValidation: false,
  } as never;
}

describe('A3S UI React form hooks', () => {
  it('maps deterministic core issues to nested React Hook Form errors', () => {
    const errors = toReactHookFormErrors(
      [
        { path: 'profile.name', code: 'required', message: 'Name is required.' },
        { path: 'profile.name', code: 'minLength', message: 'Name is too short.' },
        { path: 'items.0.email', code: 'format.email', message: 'Email is invalid.' },
        { path: '', code: 'form.invalid', message: 'Form is invalid.' },
        { path: '', code: 'form.blocked', message: 'Form is blocked.' },
      ],
      'all',
    );

    expect(errors).toEqual(
      expect.objectContaining({
        profile: {
          name: expect.objectContaining({
            type: 'required',
            message: 'Name is required.',
            types: {
              required: 'Name is required.',
              minLength: 'Name is too short.',
            },
          }),
        },
        items: { 0: { email: expect.objectContaining({ type: 'format.email' }) } },
        root: {
          a3s: expect.objectContaining({
            type: 'form.invalid',
            types: {
              'form.invalid': 'Form is invalid.',
              'form.blocked': 'Form is blocked.',
            },
          }),
        },
      }),
    );
  });

  it('round-trips nested and root errors for FormRenderer', () => {
    const source = [
      { path: 'profile.name', code: 'required', message: 'Name is required.' },
      { path: 'profile.name', code: 'minLength', message: 'Name is too short.' },
      { path: '', code: 'form.invalid', message: 'Form is invalid.' },
    ];

    expect(toA3SFormErrors(toReactHookFormErrors(source, 'all'))).toEqual(source);
  });

  it('preserves first-error semantics and ignores non-renderable error metadata', () => {
    const first = toReactHookFormErrors(
      [
        { path: 'profile.name', code: 'required', message: 'Name is required.' },
        { path: 'profile.name', code: 'required', message: 'Name is still required.' },
        { path: 'profile.email', code: 'required', message: 'Email is required.' },
      ],
      'firstError',
    );
    expect(first).toEqual(
      expect.objectContaining({
        profile: expect.objectContaining({
          name: expect.objectContaining({ type: 'required', message: 'Name is required.' }),
        }),
      }),
    );

    const all = toReactHookFormErrors(
      [
        { path: 'name', code: 'invalid', message: 'First issue.' },
        { path: 'name', code: 'invalid', message: 'Second issue.' },
      ],
      'all',
    );
    expect(all.name).toEqual(
      expect.objectContaining({
        types: { invalid: 'First issue.', 'invalid.2': 'Second issue.' },
      }),
    );
    expect(
      toA3SFormErrors({
        name: {
          type: 'invalid',
          message: '',
          types: { ignored: true, useful: 'Useful message.' },
          ref: { name: 'name' },
        },
        metadata: 'ignored',
      } as never),
    ).toEqual([{ path: 'name', code: 'useful', message: 'Useful message.' }]);
  });

  it('uses A3S Form Core as the resolver authority', async () => {
    const plan = assertCompiled(createDocument());
    const resolver = createA3SFormResolver<PersonValues>({ plan, locale: 'en-US' });

    const invalid = await resolver(
      { name: 'A', age: 17, active: true, role: 'member' },
      undefined,
      resolverOptions(),
    );
    expect(invalid.values).toEqual({});
    expect(toA3SFormErrors(invalid.errors)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'name', code: 'minLength' }),
        expect.objectContaining({ path: 'age', code: 'minimum' }),
      ]),
    );

    const value = { name: 'Ada', age: 36, active: true, role: 'admin' };
    await expect(resolver(value, undefined, resolverOptions())).resolves.toEqual({
      values: value,
      errors: {},
    });
  });

  it('passes a concrete field scope to host validation', async () => {
    const plan = assertCompiled(createDocument());
    let validationRequest: Parameters<FormAsyncValidator>[0] | undefined;
    let validationSignal: AbortSignal | undefined;
    const validator: FormAsyncValidator = async (request, signal) => {
      validationRequest = request;
      validationSignal = signal;
      return {
        issues:
          request.scope.kind === 'field' && request.scope.path === 'name'
            ? [{ code: 'reserved', message: 'This name is reserved.' }]
            : [],
      };
    };
    const resolver = createA3SFormResolver<PersonValues>({
      plan,
      validator,
      locale: 'en-US',
    });
    const result = await resolver(
      { name: 'Admin', age: 20, active: true, role: 'member' },
      undefined,
      resolverOptions(['name']),
    );

    expect(validationRequest).toEqual(
      expect.objectContaining({
        scope: { kind: 'field', nodeId: 'name', path: 'name' },
        trigger: 'blur',
      }),
    );
    expect(validationSignal).toBeInstanceOf(AbortSignal);
    expect(toA3SFormErrors(result.errors)).toContainEqual({
      path: 'name',
      code: 'async.reserved',
      message: 'This name is reserved.',
    });
  });

  it('uses form scope for unknown fields and cancels superseded resolver work', async () => {
    const plan = assertCompiled(createDocument());
    const requests: Parameters<FormAsyncValidator>[0][] = [];
    const completions: Array<(value: { issues: [] }) => void> = [];
    const resolver = createA3SFormResolver<PersonValues>({
      plan,
      validator: (request) => {
        requests.push(request);
        return new Promise((resolve) => completions.push(resolve));
      },
    });
    const value = { name: 'Ada', age: 36, active: true, role: 'admin' };
    const first = resolver(value, undefined, resolverOptions(['unknown']));
    await waitFor(() => expect(completions).toHaveLength(1));
    const second = resolver(value, undefined, resolverOptions());
    await waitFor(() => expect(completions).toHaveLength(2));

    completions[0]?.({ issues: [] });
    completions[1]?.({ issues: [] });
    await expect(first).resolves.toEqual({ values: value, errors: {} });
    await expect(second).resolves.toEqual({ values: value, errors: {} });
    expect(requests.map((request) => request.scope)).toEqual([{ kind: 'form' }, { kind: 'form' }]);
  });

  it('binds React Hook Form state to FormRenderer without a second store', async () => {
    const plan = assertCompiled(createDocument());
    const initialValue: PersonValues = {
      name: 'Ada',
      age: 36,
      active: true,
      role: 'admin',
    };
    const { result } = renderHook(() =>
      useA3SForm({
        plan,
        defaultValues: initialValue,
        mode: 'onChange',
        locale: 'en-US',
      }),
    );

    expect(result.current.formPlan).toBe(plan);
    expect(result.current.rendererProps).toEqual(
      expect.objectContaining({ plan, value: initialValue, locale: 'en-US', errors: [] }),
    );

    act(() => {
      result.current.rendererProps.onChange({
        ...initialValue,
        name: 'Grace',
      });
    });
    await waitFor(() => expect(result.current.getValues('name')).toBe('Grace'));
    expect(result.current.formState.isDirty).toBe(true);

    act(() => {
      result.current.rendererProps.onChange({ ...initialValue, name: 'A' });
    });
    await waitFor(() =>
      expect(result.current.rendererProps.errors).toContainEqual(
        expect.objectContaining({ path: 'name', code: 'minLength' }),
      ),
    );
  });

  it('accepts renderer changes without change-mode validation and starts with empty values', async () => {
    const plan = assertCompiled(createDocument());
    const empty = renderHook(() => useA3SForm({ plan }));
    expect(empty.result.current.rendererProps.value).toEqual({});
    empty.unmount();

    const initialValue: PersonValues = {
      name: 'Ada',
      age: 36,
      active: true,
      role: 'admin',
    };
    const { result } = renderHook(() =>
      useA3SForm({
        plan,
        defaultValues: initialValue,
      }),
    );

    act(() => {
      result.current.rendererProps.onChange({ ...initialValue, name: 'Grace' });
    });
    await waitFor(() => expect(result.current.getValues('name')).toBe('Grace'));
    expect(result.current.rendererProps.errors).toEqual([]);
  });

  it('keeps React Hook Form field-array identities while validating with A3S Core', () => {
    const plan = assertCompiled(createObjectRepeaterDocument());
    const { result } = renderHook(() => {
      const form = useA3SForm({
        plan,
        defaultValues: {
          recipients: [{ rowId: 'row-1', name: 'Ada', email: 'ada@example.com' }],
        },
      });
      const rows = useFieldArray({ control: form.control, name: 'recipients' });
      return { form, rows };
    });
    const firstIdentity = result.current.rows.fields[0]?.id;

    act(() => {
      result.current.rows.append({ rowId: 'row-2', name: 'Grace', email: 'grace@example.com' });
    });
    expect(result.current.rows.fields).toHaveLength(2);
    expect(result.current.rows.fields[0]?.id).toBe(firstIdentity);
    expect(result.current.form.getValues('recipients.1.name')).toBe('Grace');

    act(() => result.current.rows.swap(0, 1));
    expect(result.current.rows.fields[1]?.id).toBe(firstIdentity);
    expect(result.current.form.getValues('recipients.0.rowId')).toBe('row-2');
  });
});
