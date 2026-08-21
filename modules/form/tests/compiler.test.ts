import {
  assertCompiled,
  compileForm,
  DEFAULT_COMPILER_LIMITS,
  digestDocument,
  type FormDocument,
  sealDocument,
} from '../src/core';
import {
  createDocument,
  createNestedRepeaterDocument,
  createObjectRepeaterDocument,
} from './fixtures';

function codes(result: ReturnType<typeof compileForm>): string[] {
  return result.diagnostics.map((item) => item.code);
}

describe('form compiler', () => {
  it('normalizes, seals and freezes a valid document into one plan', () => {
    const source = createDocument();
    const result = compileForm(source);
    expect(result.ok).toBe(true);
    expect(result.document?.metadata.locale).toBe('zh-CN');
    expect(result.document?.metadata.tags).toEqual([]);
    expect(result.document?.digest).toBe(digestDocument(result.document as FormDocument));
    expect(result.plan?.sourceDigest).toBe(result.document?.digest);
    expect(result.plan?.nodeById.name.valuePath).toBe('name');
    expect(result.plan?.nodeById.root.children).toEqual(['name', 'age', 'active', 'role']);
    expect(result.plan?.dependencyOrder).toEqual([]);
    expect(result.plan?.ruleDependencies).toEqual({ 'show-age': ['active'] });
    expect(result.plan?.nodeSubscriptions).toEqual({
      root: [],
      name: ['name'],
      age: ['active', 'age'],
      active: ['active'],
      role: ['role'],
    });
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(Object.isFrozen(result.plan?.nodes)).toBe(true);
    expect(source.digest).toBeUndefined();
  });

  it('supports asserted plans and reports assertion failures', () => {
    expect(assertCompiled(createDocument()).root).toBe('root');
    expect(() => assertCompiled({})).toThrow('/kind');
  });

  it('compiles object repeater children into row-scoped value templates', () => {
    const plan = assertCompiled(createObjectRepeaterDocument());

    expect(plan.nodeById.recipients.valuePath).toBe('recipients');
    expect(plan.nodeById.recipients.valuePathTemplate).toBe('recipients');
    expect(plan.nodeById['recipient-name'].valuePath).toBeUndefined();
    expect(plan.nodeById['recipient-name'].valuePathTemplate).toBe('recipients.*.name');
    expect(plan.nodeById['recipient-name'].repeaterAncestors).toEqual(['recipients']);
    expect(plan.nodeSubscriptions['recipient-name']).toEqual(['recipients.*.name']);
  });

  it('rejects invalid object repeater bindings and unstable item keys', () => {
    const nonArray = createObjectRepeaterDocument();
    if (!nonArray.schema.properties) throw new Error('Missing root properties.');
    nonArray.schema.properties.recipients = { type: 'string' };
    expect(codes(compileForm(nonArray))).toContain('repeater.schema_type');

    const missingSchema = createObjectRepeaterDocument();
    const missingRepeater = missingSchema.ui.nodes.find((node) => node.id === 'recipients');
    if (!missingRepeater) throw new Error('Missing recipient repeater node.');
    missingRepeater.schemaPath = '/properties/missing';
    expect(codes(compileForm(missingSchema))).toContain('node.schema_reference');

    const primitiveChildren = createObjectRepeaterDocument();
    const recipients = primitiveChildren.schema.properties?.recipients;
    if (!recipients) throw new Error('Missing recipients schema.');
    recipients.items = { type: 'string' };
    expect(codes(compileForm(primitiveChildren))).toContain('repeater.items_type');

    const missingItemKey = createObjectRepeaterDocument();
    const itemSchema = missingItemKey.schema.properties?.recipients?.items;
    if (!itemSchema?.properties) throw new Error('Missing recipient item schema.');
    delete itemSchema.properties.rowId;
    expect(codes(compileForm(missingItemKey))).toContain('repeater.item_key');

    const orphan = createObjectRepeaterDocument();
    const root = orphan.ui.nodes.find((node) => node.id === 'root');
    const repeater = orphan.ui.nodes.find((node) => node.id === 'recipients');
    if (!root || !repeater) throw new Error('Missing repeater fixture nodes.');
    repeater.children = repeater.children?.filter((id) => id !== 'recipient-email');
    root.children?.push('recipient-email');
    expect(codes(compileForm(orphan))).toContain('node.dynamic_scope');

    const multipleParents = createObjectRepeaterDocument();
    multipleParents.ui.nodes[0].children?.push('recipient-name');
    expect(codes(compileForm(multipleParents))).toContain('node.dynamic_scope');

    const wrongRepeater = createObjectRepeaterDocument();
    if (!wrongRepeater.schema.properties) throw new Error('Missing root properties.');
    wrongRepeater.schema.properties.others = {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: false,
      },
    };
    const nestedName = wrongRepeater.ui.nodes.find((node) => node.id === 'recipient-name');
    if (!nestedName) throw new Error('Missing nested name node.');
    nestedName.schemaPath = '/properties/others/items/properties/name';
    expect(codes(compileForm(wrongRepeater))).toContain('node.dynamic_scope');
  });

  it('tracks nested repeater scopes from outer to inner rows', () => {
    const plan = assertCompiled(createNestedRepeaterDocument());

    expect(plan.nodeById['recipient-channels'].valuePathTemplate).toBe('recipients.*.channels');
    expect(plan.nodeById['recipient-channels'].repeaterAncestors).toEqual(['recipients']);
    expect(plan.nodeById['channel-address'].valuePathTemplate).toBe(
      'recipients.*.channels.*.address',
    );
    expect(plan.nodeById['channel-address'].repeaterAncestors).toEqual([
      'recipients',
      'recipient-channels',
    ]);
  });

  it.each([
    ['document.type', null],
    ['document.kind', { ...createDocument(), kind: 'other' }],
    ['document.api_version', { ...createDocument(), apiVersion: 'v0' }],
    ['schema.type', { ...createDocument(), schema: null }],
    ['ui.type', { ...createDocument(), ui: null }],
    ['ui.root', { ...createDocument(), ui: { ...createDocument().ui, root: 2 } }],
    ['ui.nodes', { ...createDocument(), ui: { ...createDocument().ui, nodes: null } }],
    ['metadata.title', { ...createDocument(), metadata: {} }],
    ['document.revision', { ...createDocument(), revision: -1 }],
    ['document.revision', { ...createDocument(), revision: 1.2 }],
  ])('rejects malformed structure with %s', (code, input) => {
    expect(codes(compileForm(input))).toContain(code);
  });

  it('enforces document, dialect and digest boundaries', () => {
    const dialect = createDocument();
    dialect.schema.$schema = 'http://json-schema.org/draft-07/schema#';
    expect(codes(compileForm(dialect))).toContain('schema.dialect');

    expect(codes(compileForm(createDocument(), { requireDigest: true }))).toContain(
      'digest.required',
    );
    const stale = { ...createDocument(), digest: 'sha256:stale' };
    expect(codes(compileForm(stale))).toContain('digest.mismatch');
    expect(compileForm(sealDocument(createDocument()), { requireDigest: true }).ok).toBe(true);

    const large = createDocument();
    large.metadata.description = 'x'.repeat(100);
    expect(codes(compileForm(large, { limits: { maxSerializedBytes: 10 } }))).toContain(
      'limits.document_size',
    );
  });

  it('rejects malformed, duplicate and unsupported nodes', () => {
    const malformed = createDocument();
    malformed.ui.nodes.push(
      null as never,
      { id: '', kind: 'field' } as never,
      { id: 'odd', kind: 'unknown' } as never,
    );
    expect(codes(compileForm(malformed))).toEqual(expect.arrayContaining(['node.id', 'node.kind']));

    const duplicate = createDocument();
    duplicate.ui.nodes.push({ ...duplicate.ui.nodes[1] });
    expect(codes(compileForm(duplicate))).toContain('node.duplicate');

    const missingPath = createDocument();
    delete missingPath.ui.nodes[1].schemaPath;
    expect(codes(compileForm(missingPath))).toContain('node.schema_path');

    const badPath = createDocument();
    badPath.ui.nodes[1].schemaPath = 'not-a-pointer';
    expect(codes(compileForm(badPath))).toContain('node.schema_reference');

    const missingSchema = createDocument();
    missingSchema.ui.nodes[1].schemaPath = '/properties/missing';
    expect(codes(compileForm(missingSchema))).toContain('node.schema_reference');

    const badMapping = createDocument();
    badMapping.ui.nodes[1].schemaPath = '/required/0';
    expect(codes(compileForm(badMapping))).toContain('node.schema_reference');

    const widget = createDocument();
    widget.ui.nodes[1].widget = 'company.person';
    expect(codes(compileForm(widget))).toContain('capability.widget');
    expect(compileForm(widget, { capabilities: { widgets: ['company.person'] } }).ok).toBe(true);
  });

  it('validates references, reachability, cycles and depth', () => {
    const root = createDocument();
    root.ui.root = 'missing';
    expect(codes(compileForm(root))).toContain('ui.root_reference');

    const child = createDocument();
    child.ui.nodes[0].children?.push('missing');
    expect(codes(compileForm(child))).toContain('node.child_reference');

    const unreachable = createDocument();
    unreachable.ui.nodes.push({ id: 'orphan', kind: 'content', content: 'x' });
    const unreachableResult = compileForm(unreachable);
    expect(unreachableResult.ok).toBe(true);
    expect(unreachableResult.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'layout.unreachable', severity: 'warning' }),
    );

    const cycle = createDocument();
    cycle.ui.nodes[1].children = ['root'];
    cycle.ui.nodes[1].kind = 'group';
    expect(codes(compileForm(cycle))).toContain('layout.cycle');

    expect(codes(compileForm(createDocument(), { limits: { maxDepth: 0 } }))).toContain(
      'limits.depth',
    );
    expect(codes(compileForm(createDocument(), { limits: { maxNodes: 1 } }))).toContain(
      'limits.nodes',
    );
  });

  it('checks trusted data-source and action registries', () => {
    const missing = createDocument();
    missing.ui.nodes[4].dataSource = 'missing';
    expect(codes(compileForm(missing))).toContain('node.data_source');

    expect(
      codes(
        compileForm(createDocument(), {
          capabilities: { dataSources: ['other'], actions: ['other'] },
        }),
      ),
    ).toEqual(expect.arrayContaining(['capability.data_source', 'capability.action']));
    expect(
      compileForm(createDocument(), {
        capabilities: { dataSources: ['test.roles'], actions: ['test.submit'] },
      }).ok,
    ).toBe(true);

    const malformed = createDocument();
    malformed.dataSources = [null as never];
    malformed.actions = [null as never];
    expect(codes(compileForm(malformed))).toEqual(
      expect.arrayContaining(['data_source.definition', 'action.definition']),
    );
  });

  it('closes data-source definitions and dependency paths', () => {
    const document = createDocument();
    document.dataSources = [
      {
        id: 'models',
        registryKey: 'workflow.models',
        dependencies: ['active', 'missing', 'active'],
        trigger: 'manual' as never,
        searchable: 'yes' as never,
        cacheTtlMs: 86_400_001,
        debounceMs: -1,
        pageSize: 201,
        parameters: [] as never,
        endpoint: 'https://forbidden.example',
      } as never,
      { id: 'models', registryKey: '' },
      { id: '', registryKey: 'workflow.empty' },
      { id: 'invalid-dependency', registryKey: 'workflow.invalid', dependencies: [1 as never] },
      {
        id: 'too-many-dependencies',
        registryKey: 'workflow.large',
        dependencies: Array.from({ length: 33 }, (_, index) => `field${index}`),
      },
    ];

    expect(codes(compileForm(document))).toEqual(
      expect.arrayContaining([
        'data_source.dependency_reference',
        'data_source.dependency_duplicate',
        'data_source.dependency',
        'data_source.dependencies',
        'data_source.trigger',
        'data_source.searchable',
        'data_source.cache_ttl',
        'data_source.debounce',
        'data_source.page_size',
        'data_source.parameters',
        'data_source.keyword',
        'data_source.duplicate',
        'data_source.registry_key',
        'data_source.id',
      ]),
    );
  });

  it('normalizes bounded data-source orchestration defaults', () => {
    const document = createDocument();
    if (!document.dataSources) throw new Error('Missing fixture data source.');
    document.dataSources[0].parameters = {
      nil: null,
      list: [true, 1, 'model'],
      nested: { enabled: false },
    };
    const result = compileForm(document);
    expect(result.ok).toBe(true);
    expect(result.plan?.dataSources[0]).toEqual({
      id: 'roles',
      registryKey: 'test.roles',
      parameters: {
        nil: null,
        list: [true, 1, 'model'],
        nested: { enabled: false },
      },
      dependencies: [],
      trigger: 'mount',
      searchable: false,
      cacheTtlMs: 0,
      debounceMs: 250,
      pageSize: 50,
    });
  });

  it('adds declared data-source paths to field subscriptions', () => {
    const document = createDocument();
    if (!document.dataSources) throw new Error('Missing fixture data source.');
    document.dataSources[0].dependencies = ['active', 'name'];
    const plan = assertCompiled(document);
    expect(plan.nodeSubscriptions.role).toEqual(['active', 'name', 'role']);
  });

  it('validates rule definitions, size, targets, duplicates and dependency cycles', () => {
    const malformed = createDocument();
    malformed.rules?.push(null as never);
    expect(codes(compileForm(malformed))).toContain('rule.definition');

    const duplicate = createDocument();
    duplicate.rules?.push(structuredClone(duplicate.rules[0]));
    expect(codes(compileForm(duplicate))).toContain('rule.duplicate');

    const target = createDocument();
    (target.rules as NonNullable<FormDocument['rules']>)[0].target = 'missing';
    expect(codes(compileForm(target))).toContain('rule.target');

    const invalidExpression = createDocument();
    (invalidExpression.rules as NonNullable<FormDocument['rules']>)[0].expression = null as never;
    expect(codes(compileForm(invalidExpression))).toContain('rule.definition');

    const throwingExpression = createDocument();
    (throwingExpression.rules as NonNullable<FormDocument['rules']>)[0].expression = {
      op: 'not',
    } as never;
    expect(codes(compileForm(throwingExpression))).toContain('rule.expression');

    const longExpression = createDocument();
    (longExpression.rules as NonNullable<FormDocument['rules']>)[0].expression = {
      op: 'all',
      values: Array.from({ length: 5 }, () => ({ op: 'literal', value: true })),
    };
    expect(
      codes(compileForm(longExpression, { limits: { maxExpressionOperations: 2 } })),
    ).toContain('limits.expression');
    expect(codes(compileForm(createDocument(), { limits: { maxRules: 0 } }))).toContain(
      'limits.rules',
    );

    const dependencyCycle = createDocument();
    dependencyCycle.rules = [
      {
        id: 'age-from-name',
        target: 'age',
        kind: 'computed',
        expression: { op: 'field', path: 'name' },
      },
      {
        id: 'name-from-age',
        target: 'name',
        kind: 'computed',
        expression: { op: 'field', path: 'age' },
      },
    ];
    expect(codes(compileForm(dependencyCycle))).toContain('rules.cycle');

    const dynamicTargets = createObjectRepeaterDocument();
    dynamicTargets.rules = [
      {
        id: 'derive-recipient-name',
        target: 'recipient-name',
        kind: 'computed',
        expression: { op: 'literal', value: 'Ada' },
      },
      {
        id: 'validate-recipient-email',
        target: 'recipient-email',
        kind: 'validate',
        expression: { op: 'literal', value: true },
      },
    ];
    expect(
      codes(compileForm(dynamicTargets)).filter((code) => code === 'rule.dynamic_target'),
    ).toHaveLength(2);
  });

  it('rejects invalid or unbindable row-rule scopes', () => {
    const invalidScope = createDocument();
    if (!invalidScope.rules?.[0]) throw new Error('Missing rule fixture.');
    invalidScope.rules[0].scope = 'section' as never;
    expect(codes(compileForm(invalidScope))).toContain('rule.scope');

    const staticTarget = createDocument();
    if (!staticTarget.rules?.[0]) throw new Error('Missing rule fixture.');
    staticTarget.rules[0].scope = 'row';
    expect(codes(compileForm(staticTarget))).toContain('rule.row_scope_target');

    const missingScope = createNestedRepeaterDocument();
    missingScope.rules = [
      {
        id: 'show-channel',
        target: 'channel-address',
        kind: 'visible',
        expression: {
          op: 'field',
          path: 'recipients.*.channels.*.address',
        },
      },
    ];
    expect(codes(compileForm(missingScope))).toContain('rule.field_scope');

    const deeperDependency = createNestedRepeaterDocument();
    deeperDependency.rules = [
      {
        id: 'derive-recipient-name',
        target: 'recipient-name',
        kind: 'computed',
        scope: 'row',
        expression: {
          op: 'field',
          path: 'recipients.*.channels.*.address',
        },
      },
    ];
    expect(codes(compileForm(deeperDependency))).toContain('rule.field_scope');
  });

  it('exposes conservative default limits', () => {
    expect(DEFAULT_COMPILER_LIMITS.maxNodes).toBeGreaterThan(100);
    expect(Object.isFrozen(DEFAULT_COMPILER_LIMITS)).toBe(true);
  });
});
