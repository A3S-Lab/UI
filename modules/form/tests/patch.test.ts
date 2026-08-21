import {
  applyFormPatch,
  compileForm,
  createFormRef,
  diffFormDocuments,
  type FormDocument,
  type FormPatch,
  isJsonObject,
} from '../src/core';
import { createDocument } from './fixtures';

function normalized(): FormDocument {
  return compileForm(createDocument()).document as FormDocument;
}

function patch(document: FormDocument, operations: FormPatch['operations']): FormPatch {
  return {
    apiVersion: 'a3s.dev/form-patch/v1alpha1',
    baseRevision: document.revision,
    operations,
  };
}

describe('typed FormPatch protocol', () => {
  it('applies set, insert and move atomically and reseals the document', () => {
    const document = structuredClone(normalized());
    const result = applyFormPatch(
      document,
      patch(document, [
        { op: 'set', path: '/metadata/title', value: '更新后的表单' },
        {
          op: 'set',
          path: '/ui/nodes/2',
          value: { ...document.ui.nodes[2], label: '法定年龄' } as never,
        },
        { op: 'insert', path: '/metadata/tags', index: 0, value: '重要' },
        { op: 'move', from: '/ui/nodes/1', path: '/ui/nodes' },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.metadata.title).toBe('更新后的表单');
    expect(result.document.metadata.tags).toEqual(['重要']);
    expect(result.document.ui.nodes.at(-1)?.id).toBe('name');
    expect(result.document.revision).toBe(document.revision + 1);
    expect(result.document.digest).not.toBe(document.digest);
    expect(result.plan.sourceDigest).toBe(result.document.digest);
    expect(document.metadata.title).toBe('测试表单');
  });

  it('supports remove, indexed set and explicit move indices', () => {
    const document = structuredClone(normalized());
    document.metadata.owner = 'team';
    delete document.digest;
    const resealed = compileForm(document).document as FormDocument;
    const result = applyFormPatch(
      resealed,
      patch(resealed, [
        { op: 'remove', path: '/metadata/owner' },
        { op: 'set', path: '/ui/nodes/1/label', value: '真实姓名' },
        { op: 'move', from: '/ui/nodes/4', path: '/ui/nodes', index: 1 },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.metadata.owner).toBeUndefined();
    expect(result.document.ui.nodes[1].id).toBe('role');
    expect(result.document.ui.nodes.find((node) => node.id === 'name')?.label).toBe('真实姓名');
  });

  it('honors revision and field preconditions', () => {
    const document = normalized();
    const success = applyFormPatch(document, {
      ...patch(document, []),
      preconditions: [
        { path: '/metadata/title', exists: true, equals: '测试表单' },
        { path: '/metadata/owner', exists: false },
      ],
    });
    expect(success.ok).toBe(true);

    const conflict = applyFormPatch(document, {
      ...patch(document, []),
      baseRevision: 1,
      preconditions: [
        { path: '/metadata/title', exists: false },
        { path: '/metadata/title', equals: '其他表单' },
        { path: '/metadata/__proto__/bad', exists: true },
      ],
    });
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.conflicts.map((item) => item.code)).toEqual(
      expect.arrayContaining(['revision_mismatch', 'precondition_failed']),
    );
  });

  it('rejects invalid protocol versions and operation counts', () => {
    const document = normalized();
    const invalidVersion = applyFormPatch(document, {
      ...patch(document, []),
      apiVersion: 'invalid' as never,
    });
    expect(invalidVersion.ok).toBe(false);
    const excessive = applyFormPatch(
      document,
      patch(
        document,
        Array.from({ length: 257 }, (_, index) => ({
          op: 'set' as const,
          path: `/metadata/x${index}`,
          value: index,
        })),
      ),
    );
    expect(excessive.ok).toBe(false);
  });

  it.each([
    [[{ op: 'set', path: '', value: {} }], '不能替换整个表单文档'],
    [[{ op: 'set', path: '/revision', value: 1 }], '不能通过补丁修改'],
    [[{ op: 'set', path: '/metadata/__proto__/polluted', value: true }], '不安全路径'],
    [[{ op: 'set', path: '/metadata/title/value', value: 'x' }], '路径不存在'],
    [[{ op: 'set', path: '/metadata/title/value/deeper', value: 'x' }], '路径不存在'],
    [[{ op: 'set', path: '/ui/nodes/99/label', value: 'x' }], '路径不存在'],
    [[{ op: 'set', path: '/ui/nodes/nope', value: 'x' }], '数组索引无效'],
    [[{ op: 'remove', path: '/ui/nodes/nope' }], '数组索引无效'],
    [[{ op: 'remove', path: '/metadata/missing' }], '路径不存在'],
    [[{ op: 'insert', path: '/metadata/title', index: 0, value: 'x' }], '不是数组'],
    [[{ op: 'insert', path: '/metadata/tags', index: 99, value: 'x' }], '插入索引无效'],
    [[{ op: 'move', from: '/metadata/title', path: '/metadata/tags', index: 99 }], '移动索引无效'],
    [[{ op: 'move', from: '/metadata/title', path: '/metadata/title' }], '不是数组'],
  ])('rejects unsafe or impossible operation %j', (operations, message) => {
    const document = normalized();
    const result = applyFormPatch(document, patch(document, operations as FormPatch['operations']));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.conflicts[0].message).toContain(message as string);
  });

  it('does not apply a structurally valid operation that creates an invalid form', () => {
    const document = normalized();
    const result = applyFormPatch(
      document,
      patch(document, [{ op: 'set', path: '/ui/root', value: 'missing' }]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.conflicts[0].message).toContain('无效表单');
      expect(result.diagnostics.map((item) => item.code)).toContain('ui.root_reference');
    }
  });

  it('diffs documents into a revision-bound patch that can be applied', () => {
    const before = normalized();
    const after = structuredClone(before);
    after.metadata.title = '差异标题';
    delete after.actions;
    delete after.digest;
    const generated = diffFormDocuments(before, after);
    expect(generated.baseRevision).toBe(before.revision);
    expect(generated.description).toContain('diff');
    expect(generated.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'set', path: '/metadata' }),
        expect.objectContaining({ op: 'remove', path: '/actions' }),
      ]),
    );
    const result = applyFormPatch(before, generated);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.metadata.title).toBe('差异标题');
  });

  it('creates immutable Workflow and Cloud references only for valid forms', () => {
    const reference = createFormRef(createDocument(), 'a3s://forms/onboarding', 'interaction');
    expect(reference).toEqual(
      expect.objectContaining({ uri: 'a3s://forms/onboarding', revision: 3, mode: 'interaction' }),
    );
    expect(reference.digest).toMatch(/^sha256:/);
    expect(() => createFormRef({} as never, 'a3s://bad', 'configuration')).toThrow('无效表单');
  });

  it('identifies JSON objects', () => {
    expect(isJsonObject({ ok: true })).toBe(true);
    expect(isJsonObject([])).toBe(false);
    expect(isJsonObject(null)).toBe(false);
  });
});
