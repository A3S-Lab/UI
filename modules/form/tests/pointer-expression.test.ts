import {
  analyzeExpression,
  decodePointer,
  evaluateExpression,
  expandValuePathTemplate,
  expressionFieldPaths,
  type FormExpression,
  getAtPath,
  getAtPointer,
  isValuePathScopeCompatible,
  matchValuePathTemplate,
  removeAtPath,
  resolveValuePathTemplate,
  schemaPointerToValuePath,
  schemaPointerToValuePathTemplate,
  setAtPath,
  valuePathTemplateScopes,
} from '../src/core';

describe('JSON pointer and value path helpers', () => {
  it('decodes escaped pointers and reads values', () => {
    const value = { 'a/b': { '~key': 2 }, nested: { value: 'ok' } };
    expect(decodePointer('')).toEqual([]);
    expect(decodePointer('/a~1b/~0key')).toEqual(['a/b', '~key']);
    expect(getAtPointer(value, '/a~1b/~0key')).toBe(2);
    expect(getAtPointer(value, '/missing/value')).toBeUndefined();
    expect(getAtPath(value, 'nested.value')).toBe('ok');
    expect(getAtPath(value, '')).toBe(value);
    expect(getAtPath(value, 'nested.missing.value')).toBeUndefined();
    expect(() => decodePointer('bad')).toThrow('Invalid JSON Pointer');
  });

  it('writes immutable paths and maps schema paths', () => {
    const original = { profile: { name: 'old' } };
    expect(setAtPath(original, 'profile.name', 'new')).toEqual({ profile: { name: 'new' } });
    expect(original.profile.name).toBe('old');
    expect(setAtPath({}, 'profile.name', 'new')).toEqual({ profile: { name: 'new' } });
    expect(setAtPath({}, '', { root: true })).toEqual({ root: true });
    expect(removeAtPath({ profile: { name: 'old', role: 'admin' } }, 'profile.name')).toEqual({
      profile: { role: 'admin' },
    });
    expect(removeAtPath(original, 'profile.missing')).toEqual(original);
    expect(removeAtPath({ profile: 'not-an-object' }, 'profile.name')).toEqual({
      profile: 'not-an-object',
    });
    expect(removeAtPath(original, '')).toEqual({});
    expect(schemaPointerToValuePath('/properties/profile/properties/name')).toBe('profile.name');
    expect(schemaPointerToValuePath('/items/name')).toBeUndefined();
    expect(schemaPointerToValuePathTemplate('/properties/contacts/items/properties/email')).toBe(
      'contacts.*.email',
    );
    expect(schemaPointerToValuePathTemplate('/properties/contacts/items/items')).toBe(
      'contacts.*.*',
    );
    expect(schemaPointerToValuePathTemplate('/items/name')).toBeUndefined();
  });

  it('writes array item paths without converting arrays into objects', () => {
    const original = {
      contacts: [
        { name: 'Ada', channels: [{ address: 'ada@example.test' }] },
        { name: 'Grace', channels: [] },
      ],
    };
    const updated = setAtPath(original, 'contacts.0.channels.0.address', 'ada@a3s.dev');
    expect(updated).toEqual({
      contacts: [
        { name: 'Ada', channels: [{ address: 'ada@a3s.dev' }] },
        { name: 'Grace', channels: [] },
      ],
    });
    expect(Array.isArray(updated.contacts)).toBe(true);
    expect(original).toEqual({
      contacts: [
        { name: 'Ada', channels: [{ address: 'ada@example.test' }] },
        { name: 'Grace', channels: [] },
      ],
    });
  });

  it('handles sparse array writes, removals and invalid array segments safely', () => {
    expect(setAtPath({}, 'contacts.0.name', 'Ada')).toEqual({ contacts: [{ name: 'Ada' }] });
    expect(setAtPath({ contacts: [] }, 'contacts.bad.name', 'Ada')).toEqual({ contacts: [] });
    expect(setAtPath({ contacts: [null] }, 'contacts.0.name', 'Ada')).toEqual({
      contacts: [{ name: 'Ada' }],
    });
    expect(setAtPath({ contacts: [{}] }, 'contacts.0', { name: 'Grace' })).toEqual({
      contacts: [{ name: 'Grace' }],
    });
    expect(setAtPath({ contacts: [] }, 'contacts.bad', 'Ada')).toEqual({ contacts: [] });

    expect(removeAtPath({ contacts: [{ name: 'Ada', role: 'admin' }] }, 'contacts.0.name')).toEqual(
      { contacts: [{ role: 'admin' }] },
    );
    expect(removeAtPath({ contacts: [{ name: 'Ada' }] }, 'contacts.0')).toEqual({
      contacts: [],
    });
    expect(removeAtPath({ contacts: [] }, 'contacts.bad.name')).toEqual({ contacts: [] });
    expect(removeAtPath({ contacts: [] }, 'contacts.bad')).toEqual({ contacts: [] });
  });

  it('resolves and matches concrete paths against nested repeater templates', () => {
    expect(schemaPointerToValuePath('/properties/contacts/items/properties/name')).toBeUndefined();
    expect(schemaPointerToValuePathTemplate('')).toBeUndefined();
    expect(resolveValuePathTemplate(undefined, [0])).toBeUndefined();
    expect(resolveValuePathTemplate('contacts.*.channels.*.address', [2, 1])).toBe(
      'contacts.2.channels.1.address',
    );
    expect(resolveValuePathTemplate('contacts.*.name')).toBeUndefined();
    expect(matchValuePathTemplate(undefined, 'contacts.0.name')).toBeUndefined();
    expect(matchValuePathTemplate('contacts.*.name', 'contacts.0')).toBeUndefined();
    expect(matchValuePathTemplate('contacts.*.name', 'contacts.first.name')).toBeUndefined();
    expect(matchValuePathTemplate('contacts.*.name', 'recipients.0.name')).toBeUndefined();
    expect(
      matchValuePathTemplate('contacts.*.channels.*.address', 'contacts.2.channels.1.address'),
    ).toEqual([2, 1]);
  });

  it('expands existing row scopes even when computed target properties are absent', () => {
    const value = {
      orders: [{ lines: [{ quantity: 1 }, { quantity: 2 }] }, { lines: [{ quantity: 3 }] }],
    };
    expect(expandValuePathTemplate(value, 'orders.*.lines.*.total')).toEqual([
      'orders.0.lines.0.total',
      'orders.0.lines.1.total',
      'orders.1.lines.0.total',
    ]);
    expect(expandValuePathTemplate(value, 'orders.*.missing.*.total')).toEqual([]);
    expect(expandValuePathTemplate(value, 'summary.total')).toEqual(['summary.total']);
    expect(expandValuePathTemplate(value, 'orders..total')).toEqual([]);
  });

  it('compares repeater scopes from outer to inner rows', () => {
    expect(valuePathTemplateScopes('orders.*.lines.*.total')).toEqual([
      'orders.*',
      'orders.*.lines.*',
    ]);
    expect(isValuePathScopeCompatible('orders.*.lines.*.total', 'orders.*.taxRate')).toBe(true);
    expect(isValuePathScopeCompatible('orders.*.lines.*.total', 'globalLimit')).toBe(true);
    expect(isValuePathScopeCompatible('orders.*.total', 'orders.*.lines.*.quantity')).toBe(false);
    expect(isValuePathScopeCompatible('orders.*.total', 'groups.*.limit')).toBe(false);
  });
});

describe('bounded expressions', () => {
  const value = { age: 20, role: 'admin', tags: ['a', 'b'], empty: '', enabled: true };
  const literal = (item: unknown): FormExpression => ({ op: 'literal', value: item as never });
  const field = (path: string): FormExpression => ({ op: 'field', path });
  const binary = (
    op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in',
    left: FormExpression,
    right: FormExpression,
  ): FormExpression => ({ op, left, right });

  it.each([
    [binary('eq', field('role'), literal('admin')), true],
    [binary('ne', field('role'), literal('member')), true],
    [binary('gt', field('age'), literal(18)), true],
    [binary('gte', field('age'), literal(20)), true],
    [binary('lt', field('age'), literal(21)), true],
    [binary('lte', field('age'), literal(20)), true],
    [binary('contains', field('role'), literal('min')), true],
    [binary('contains', field('tags'), literal('b')), true],
    [binary('in', field('role'), literal(['admin', 'owner'])), true],
  ])('evaluates %j', (expression, expected) => {
    expect(evaluateExpression(expression as FormExpression, value)).toBe(expected);
  });

  it('evaluates boolean composition and existence', () => {
    const expression: FormExpression = {
      op: 'all',
      values: [
        { op: 'exists', value: field('role') },
        { op: 'not', value: { op: 'exists', value: field('missing') } },
        { op: 'any', values: [literal(false), field('enabled')] },
      ],
    };
    expect(evaluateExpression(expression, value)).toBe(true);
    expect(evaluateExpression({ op: 'exists', value: field('empty') }, value)).toBe(false);
    expect(expressionFieldPaths(expression).sort()).toEqual(['enabled', 'missing', 'role']);
  });

  it('returns undefined for missing fields and enforces operation limits', () => {
    expect(evaluateExpression(field('missing'), value)).toBeUndefined();
    expect(evaluateExpression(binary('gt', literal({ object: true }), literal(1)), value)).toBe(
      false,
    );
    expect(
      evaluateExpression(binary('contains', literal({ object: true }), literal('x')), value),
    ).toBe(false);
    expect(evaluateExpression(binary('contains', literal('value'), literal(null)), value)).toBe(
      true,
    );
    expect(evaluateExpression(binary('in', literal('x'), literal('not-an-array')), value)).toBe(
      false,
    );
    expect(evaluateExpression(binary('eq', literal(null), literal(null)), value)).toBe(true);
    expect(evaluateExpression(binary('eq', literal(true), literal(true)), value)).toBe(true);
    expect(() =>
      evaluateExpression({ op: 'not', value: field('enabled') }, value, { maxOperations: 1 }),
    ).toThrow('operation limit');
  });

  it('binds expression field templates through an explicit row resolver', () => {
    const rows = { rows: [{ amount: 2 }, { amount: 5 }] };
    expect(
      evaluateExpression(field('rows.*.amount'), rows, {
        resolveFieldPath: (path) => resolveValuePathTemplate(path, [1]),
      }),
    ).toBe(5);
    expect(() =>
      evaluateExpression(field('rows.*.amount'), rows, {
        resolveFieldPath: () => undefined,
      }),
    ).toThrow('could not be resolved');
  });

  it('evaluates bounded arithmetic, branching, concatenation and fallback expressions', () => {
    const arithmetic = {
      op: 'divide',
      left: {
        op: 'subtract',
        left: {
          op: 'multiply',
          left: { op: 'add', left: field('age'), right: literal(2) },
          right: literal(3),
        },
        right: literal(6),
      },
      right: literal(2),
    } as FormExpression;
    expect(evaluateExpression(arithmetic, value)).toBe(30);
    expect(
      evaluateExpression(
        {
          op: 'if',
          condition: binary('gte', field('age'), literal(18)),
          whenTrue: {
            op: 'concat',
            values: [literal('role:'), field('role')],
          },
          whenFalse: literal('minor'),
        } as FormExpression,
        value,
      ),
    ).toBe('role:admin');
    expect(
      evaluateExpression(
        {
          op: 'coalesce',
          values: [field('missing'), literal(null), field('role')],
        } as FormExpression,
        value,
      ),
    ).toBe('admin');
    expect(
      evaluateExpression(
        {
          op: 'concat',
          values: [field('missing'), literal(null), literal('fallback')],
        } as FormExpression,
        value,
      ),
    ).toBe('fallback');
  });

  it('uses structural equality and reports deterministic expression failures', () => {
    expect(
      evaluateExpression(binary('eq', literal({ a: 1, b: 2 }), literal({ b: 2, a: 1 })), value),
    ).toBe(true);
    expect(
      evaluateExpression(binary('contains', literal([{ id: 1 }]), literal({ id: 1 })), value),
    ).toBe(true);
    expect(() =>
      evaluateExpression(
        { op: 'divide', left: literal(1), right: literal(0) } as FormExpression,
        value,
      ),
    ).toThrow('divide by zero');
    expect(() =>
      evaluateExpression(
        { op: 'multiply', left: literal('2'), right: literal(2) } as FormExpression,
        value,
      ),
    ).toThrow('finite numbers');
    expect(() =>
      evaluateExpression(
        {
          op: 'multiply',
          left: literal(Number.MAX_VALUE),
          right: literal(Number.MAX_VALUE),
        } as FormExpression,
        value,
      ),
    ).toThrow('result must be a finite number');
    expect(() =>
      evaluateExpression(
        { op: 'concat', values: [literal({ sensitive: false })] } as FormExpression,
        value,
      ),
    ).toThrow('JSON primitives');
    expect(
      evaluateExpression(
        { op: 'coalesce', values: [field('missing'), literal(null)] } as FormExpression,
        value,
      ),
    ).toBeUndefined();
    expect(
      evaluateExpression(
        {
          op: 'if',
          condition: literal(false),
          whenTrue: literal('yes'),
          whenFalse: literal('no'),
        } as FormExpression,
        value,
      ),
    ).toBe('no');
  });

  it('analyzes only closed expression shapes', () => {
    const expression = {
      op: 'if',
      condition: field('enabled'),
      whenTrue: { op: 'concat', values: [field('role'), literal('!')] },
      whenFalse: literal('disabled'),
    } as FormExpression;
    expect(analyzeExpression(expression)).toEqual({
      size: 6,
      fieldPaths: ['enabled', 'role'],
    });
    expect(() => analyzeExpression({ op: 'field', path: '' })).toThrow('field path');
    expect(() => analyzeExpression({ op: 'unknown' })).toThrow('operator');
    expect(() => analyzeExpression({ op: 'literal' })).toThrow('literal');
    expect(() => analyzeExpression({ op: 'all', values: 'invalid' })).toThrow('values');
    expect(() =>
      analyzeExpression({ op: 'not', value: { op: 'literal', value: true }, extra: true }),
    ).toThrow('unexpected');
  });
});
