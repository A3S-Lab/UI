import { createApp, effectScope, h, nextTick } from 'vue';
import { assertCompiled, type JsonObject } from '../src/core';
import {
  type A3SVueFormContext,
  provideA3SForm,
  useA3SField,
  useA3SFieldArray,
  useA3SForm,
  useA3SFormContext,
} from '../src/vue-hooks';
import { createDocument, createObjectRepeaterDocument } from './fixtures';

describe('A3S UI Vue form composables', () => {
  it('tracks values, dirty state, touch state, and deterministic errors', async () => {
    const scope = effectScope();
    const form = scope.run(() =>
      useA3SForm<{ name: string; age: number; active: boolean; role: string }>({
        plan: assertCompiled(createDocument()),
        initialValues: { name: 'Ada', age: 36, active: true, role: 'admin' },
        mode: 'onBlur',
        locale: 'en-US',
      }),
    );
    if (!form) throw new Error('Vue effect scope did not return the form.');

    expect(form.formState.value.isDirty).toBe(false);
    form.setValue('name', 'A');
    expect(form.getValue('name')).toBe('A');
    expect(form.formState.value.dirtyFields).toContain('name');

    form.register('name').onBlur();
    await waitFor(() => expect(form.errors.value[0]?.path).toBe('name'));
    expect(form.formState.value.touchedFields).toContain('name');
    expect(form.formState.value.isValid).toBe(false);

    form.setValue('name', 'Grace');
    await expect(form.validate('name')).resolves.toBe(true);
    expect(form.errors.value).toEqual([]);
    scope.stop();
  });

  it('exposes writable fields with field-scoped meta', async () => {
    const scope = effectScope();
    const result = scope.run(() => {
      const form = useA3SForm({
        plan: assertCompiled(createDocument()),
        initialValues: { name: 'Ada', age: 36, active: true, role: 'admin' },
      });
      return { form, field: useA3SField({ form, name: 'name' }) };
    });
    if (!result) throw new Error('Vue effect scope did not return the field.');

    result.field.value.value = 'Grace';
    expect(result.form.getValue('name')).toBe('Grace');
    expect(result.field.meta.value.dirty).toBe(true);
    result.field.handleBlur();
    expect(result.field.meta.value.touched).toBe(true);
    await expect(result.field.validate()).resolves.toBe(true);
    scope.stop();
  });

  it('supports explicit state updates, scoped errors, registration, and reset', async () => {
    const scopes: unknown[] = [];
    const scope = effectScope();
    const form = scope.run(() =>
      useA3SForm<{ name: string; age: number; active: boolean; role: string }>({
        plan: assertCompiled(createDocument()),
        initialValues: { name: 'Ada', age: 36, active: true, role: 'admin' },
        hostAdapter: {
          validateValue: async (request) => {
            scopes.push(request.scope);
            return { issues: [] };
          },
        },
        locale: 'en-US',
        localeCatalog: { apiVersion: 'a3s.dev/form-locale-catalog/v1', messages: {} },
        mode: 'onChange',
      }),
    );
    if (!form) throw new Error('Vue effect scope did not return the form.');

    form.setValue('name', 'Grace', {
      shouldDirty: false,
      shouldTouch: true,
      shouldValidate: false,
    });
    expect(form.formState.value.dirtyFields).toEqual(new Set());
    expect(form.formState.value.touchedFields).toContain('name');

    form.setValues(
      { name: 'Lin', age: 40, active: false, role: 'member' },
      { shouldDirty: true, shouldTouch: true, shouldValidate: false },
    );
    expect(form.formState.value.dirtyFields).toContain('age');
    expect(form.formState.value.touchedFields).toContain('role');

    const binding = form.register<string>('name');
    expect(binding.modelValue).toBe('Lin');
    binding['onUpdate:modelValue']('Katherine');
    expect(form.getValue('name')).toBe('Katherine');
    await waitFor(() => expect(form.formState.value.isValidating).toBe(false));

    form.setError({ path: 'name', code: 'manual', message: 'First.' });
    form.setError({ path: 'name', code: 'manual', message: 'Replacement.' });
    form.setError({ path: 'name.first', code: 'nested', message: 'Nested.' });
    form.setError({ path: 'other', code: 'other', message: 'Other.' });
    expect(form.errors.value).toContainEqual({
      path: 'name',
      code: 'manual',
      message: 'Replacement.',
    });
    form.clearErrors('name.first');
    expect(form.errors.value.some((error) => error.path === 'name')).toBe(false);
    form.clearErrors(['other']);
    expect(form.errors.value).toEqual([]);
    form.setError({ path: '', code: 'form', message: 'Form issue.' });
    form.clearErrors();
    expect(form.errors.value).toEqual([]);

    await expect(form.validate('name')).resolves.toBe(true);
    await expect(form.validate('unknown')).resolves.toBe(true);
    await expect(form.validate(['name', 'age'])).resolves.toBe(true);
    expect(scopes).toEqual([
      { kind: 'field', nodeId: 'name', path: 'name' },
      { kind: 'field', nodeId: 'name', path: 'name' },
      { kind: 'form' },
      { kind: 'form' },
    ]);

    form.reset({ name: 'Reset', age: 42, active: true, role: 'admin' });
    form.setValue('name', 'Changed', { shouldValidate: false });
    form.reset();
    expect(form.values.value).toEqual({ name: 'Reset', age: 42, active: true, role: 'admin' });
    expect(form.formState.value).toEqual(
      expect.objectContaining({
        isDirty: false,
        isSubmitted: false,
        isSubmitSuccessful: false,
        submitCount: 0,
      }),
    );
    scope.stop();
  });

  it('supports empty defaults, passive bulk updates, implicit validation, and local keys', async () => {
    const emptyScope = effectScope();
    const form = emptyScope.run(() =>
      useA3SForm<{ name: string; age: number; active: boolean; role: string }>({
        plan: assertCompiled(createDocument()),
        mode: 'onChange',
      }),
    );
    if (!form) throw new Error('Vue effect scope did not return the empty form.');
    expect(form.values.value).toEqual({});

    form.setValues(
      { name: 'Ada', age: 36, active: true, role: 'admin' },
      { shouldDirty: false, shouldTouch: false },
    );
    await waitFor(() => expect(form.formState.value.isValidating).toBe(false));
    expect(form.formState.value.dirtyFields).toEqual(new Set());
    expect(form.formState.value.touchedFields).toEqual(new Set());
    expect(form.errors.value).toEqual([]);
    emptyScope.stop();

    const cryptoObject = globalThis.crypto as Crypto & { randomUUID?: () => `${string}-${string}` };
    const randomUuidDescriptor = Object.getOwnPropertyDescriptor(cryptoObject, 'randomUUID');
    Object.defineProperty(cryptoObject, 'randomUUID', {
      configurable: true,
      value: undefined,
    });
    try {
      const arrayScope = effectScope();
      const result = arrayScope.run(() => {
        const arrayForm = useA3SForm({
          plan: assertCompiled(createObjectRepeaterDocument()),
          initialValues: {
            recipients: [{ rowId: 'row-local', name: 'Local', email: 'local@example.com' }],
          },
        });
        return {
          rows: useA3SFieldArray<JsonObject, JsonObject>({
            form: arrayForm,
            name: 'recipients',
          }),
        };
      });
      if (!result) throw new Error('Vue effect scope did not return the local-key array.');
      expect(result.rows.fields.value[0]?.key).toMatch(/^a3s-field-\d+$/);
      arrayScope.stop();
    } finally {
      if (randomUuidDescriptor) {
        Object.defineProperty(cryptoObject, 'randomUUID', randomUuidDescriptor);
      } else {
        Reflect.deleteProperty(cryptoObject, 'randomUUID');
      }
    }
  });

  it('cancels superseded validation and exposes field transforms and errors', async () => {
    const completions: Array<(value: { issues: [] }) => void> = [];
    const scope = effectScope();
    const result = scope.run(() => {
      const form = useA3SForm({
        plan: assertCompiled(createDocument()),
        initialValues: { name: 'Ada', age: 36, active: true, role: 'admin' },
        hostAdapter: {
          validateValue: () => new Promise((resolve) => completions.push(resolve)),
        },
      });
      const field = useA3SField<JsonObject, number>({
        form,
        name: 'age',
        transform: (value) => value + 1,
        validateOnValueUpdate: false,
      });
      return { form, field };
    });
    if (!result) throw new Error('Vue effect scope did not return the form.');

    result.field.setValue(40);
    expect(result.form.getValue('age')).toBe(41);
    result.form.setError({ path: 'age', code: 'manual', message: 'Check age.' });
    expect(result.field.errorMessage.value).toBe('Check age.');
    expect(result.field.meta.value.valid).toBe(false);
    result.field.value.value = undefined;
    expect(result.form.getValue('age')).toBe(41);

    const first = result.form.validate('age');
    await waitFor(() => expect(completions).toHaveLength(1));
    expect(result.field.meta.value.validating).toBe(true);
    const second = result.form.validate('age');
    await waitFor(() => expect(completions).toHaveLength(2));
    completions[0]?.({ issues: [] });
    completions[1]?.({ issues: [] });
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    scope.stop();
  });

  it('keeps field-array keys stable across append and move operations', async () => {
    const scope = effectScope();
    const result = scope.run(() => {
      const form = useA3SForm({
        plan: assertCompiled(createObjectRepeaterDocument()),
        initialValues: {
          recipients: [{ rowId: 'row-1', name: 'Ada', email: 'ada@example.com' }],
        },
      });
      return {
        form,
        rows: useA3SFieldArray<JsonObject, JsonObject>({
          form,
          name: 'recipients',
          keyFactory: (() => {
            let index = 0;
            return () => `key-${++index}`;
          })(),
        }),
      };
    });
    if (!result) throw new Error('Vue effect scope did not return the array.');
    const firstKey = result.rows.fields.value[0]?.key;

    result.rows.append({ rowId: 'row-2', name: 'Grace', email: 'grace@example.com' });
    await nextTick();
    expect(result.rows.fields.value.map((field) => field.key)).toEqual([firstKey, 'key-2']);
    result.rows.move(1, 0);
    expect(result.rows.fields.value.map((field) => field.key)).toEqual(['key-2', firstKey]);
    expect(result.form.getValue<JsonObject>('recipients.0')?.rowId).toBe('row-2');
    result.rows.remove(0);
    expect(result.rows.fields.value[0]?.key).toBe(firstKey);
    scope.stop();
  });

  it('supports every field-array mutation and external reconciliation', async () => {
    const scope = effectScope();
    const result = scope.run(() => {
      const form = useA3SForm({
        plan: assertCompiled(createObjectRepeaterDocument()),
        initialValues: {
          recipients: [{ rowId: 'row-1', name: 'Ada', email: 'ada@example.com' }],
        },
      });
      return {
        form,
        rows: useA3SFieldArray<JsonObject, JsonObject>({ form, name: 'recipients' }),
      };
    });
    if (!result) throw new Error('Vue effect scope did not return the array.');

    result.rows.prepend({ rowId: 'row-0', name: 'Before', email: 'before@example.com' });
    result.rows.insert(99, { rowId: 'row-2', name: 'After', email: 'after@example.com' });
    expect(result.rows.fields.value.map((field) => field.value.rowId)).toEqual([
      'row-0',
      'row-1',
      'row-2',
    ]);
    result.rows.update(-1, { rowId: 'row-u', name: 'Updated', email: 'updated@example.com' });
    result.rows.swap(0, 2);
    const swapped = result.rows.fields.value.map((field) => field.key);
    result.rows.swap(0, 0);
    expect(result.rows.fields.value.map((field) => field.key)).toEqual(swapped);
    result.rows.move(0, 1);
    const moved = result.rows.fields.value.map((field) => field.key);
    result.rows.move(1, 1);
    expect(result.rows.fields.value.map((field) => field.key)).toEqual(moved);
    result.rows.remove([0, 2]);
    expect(result.rows.fields.value).toHaveLength(1);

    result.rows.replace([
      { rowId: 'row-a', name: 'A', email: 'a@example.com' },
      { rowId: 'row-b', name: 'B', email: 'b@example.com' },
    ]);
    expect(result.rows.fields.value).toHaveLength(2);
    result.rows.remove();
    expect(result.rows.fields.value).toEqual([]);

    result.form.setValue('recipients', [{ rowId: 'external', name: 'External' }], {
      shouldValidate: false,
    });
    await nextTick();
    expect(result.rows.fields.value[0]?.value.rowId).toBe('external');
    result.form.setValue('recipients', {}, { shouldValidate: false });
    await nextTick();
    expect(result.rows.fields.value).toEqual([]);
    scope.stop();
  });

  it('submits only core-valid values and forwards renderer changes', async () => {
    const scope = effectScope();
    const form = scope.run(() =>
      useA3SForm({
        plan: assertCompiled(createDocument()),
        initialValues: { name: 'A', age: 17, active: true, role: 'admin' },
        locale: 'en-US',
      }),
    );
    if (!form) throw new Error('Vue effect scope did not return the form.');
    const validValues: JsonObject[] = [];
    const invalidErrors: Array<readonly unknown[]> = [];
    const submit = form.handleSubmit(
      (value) => {
        validValues.push(value);
      },
      (errors) => {
        invalidErrors.push(errors);
      },
    );

    await submit();
    expect(validValues).toEqual([]);
    expect(invalidErrors).toHaveLength(1);
    expect(form.formState.value.submitCount).toBe(1);

    form.rendererProps.value.onChange({
      name: 'Ada',
      age: 36,
      active: true,
      role: 'member',
    });
    await submit();
    expect(validValues).toHaveLength(1);
    expect(form.formState.value.isSubmitSuccessful).toBe(true);
    scope.stop();
  });

  it('provides one typed form context to descendant composables', () => {
    let injected: A3SVueFormContext | undefined;
    const Child = {
      setup() {
        injected = useA3SFormContext();
        return () => null;
      },
    };
    const Parent = {
      setup() {
        const form = useA3SForm({
          plan: assertCompiled(createDocument()),
          initialValues: { name: 'Ada' },
        });
        provideA3SForm(form);
        return () => h(Child);
      },
    };
    const container = document.createElement('div');
    const app = createApp(Parent);
    app.mount(container);

    expect(injected?.getValue('name')).toBe('Ada');
    app.unmount();
  });

  it('requires injection and lets descendant composables use the provided form', () => {
    expect(() => useA3SFormContext()).toThrow(
      'useA3SFormContext must be used below provideA3SForm.',
    );

    let fieldName: string | undefined;
    let arrayLength: number | undefined;
    const Child = {
      setup() {
        fieldName = useA3SField({ name: 'name' }).name;
        arrayLength = useA3SFieldArray({ name: 'recipients' }).fields.value.length;
        return () => null;
      },
    };
    const Parent = {
      setup() {
        const form = provideA3SForm(
          useA3SForm({
            plan: assertCompiled(createObjectRepeaterDocument()),
            initialValues: {
              name: 'Ada',
              recipients: [{ rowId: 'row-1', name: 'Ada' }],
            },
          }),
        );
        expect(form.getValue('name')).toBe('Ada');
        return () => h(Child);
      },
    };
    const app = createApp(Parent);
    const container = document.createElement('div');
    app.mount(container);
    expect(fieldName).toBe('name');
    expect(arrayLength).toBe(1);
    app.unmount();
  });
});

async function waitFor(assertion: () => void, attempts = 20): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  throw lastError;
}
