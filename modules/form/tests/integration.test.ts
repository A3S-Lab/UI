import { createA3SCloudFormAdapter } from '../src/cloud';
import { compileForm, createFormRef, type FormDocument, type JsonObject } from '../src/core';
import {
  createWorkflowFormBinding,
  createWorkflowNodeConfiguration,
  validateWorkflowNodeConfiguration,
  verifyPinnedForm,
  type WorkflowNodeConfiguration,
} from '../src/workflow';
import { createDocument } from './fixtures';

describe('Workflow and Cloud seams', () => {
  const published = () => compileForm(createDocument()).document as FormDocument;

  it('verifies revision and digest pins for host-owned bindings', () => {
    const document = published();
    const form = createFormRef(document, 'a3s://forms/test', 'interaction');
    expect(verifyPinnedForm(document, form).ok).toBe(true);
    expect(verifyPinnedForm(document, { ...form, revision: 99 })).toEqual(
      expect.objectContaining({ ok: false, code: 'revision_mismatch' }),
    );
    expect(verifyPinnedForm(document, { ...form, digest: 'sha256:bad' })).toEqual(
      expect.objectContaining({ ok: false, code: 'digest_mismatch' }),
    );
    expect(verifyPinnedForm({ ...document, digest: 'sha256:bad' }, form)).toEqual(
      expect.objectContaining({ ok: false, code: 'invalid_document' }),
    );
  });

  it('creates mode-safe configuration bindings', () => {
    const document = published();
    const configuration = createFormRef(document, 'a3s://forms/config', 'configuration');
    const interaction = createFormRef(document, 'a3s://forms/interaction', 'interaction');
    expect(createWorkflowFormBinding(configuration, { model: 'a3s-code' })).toEqual(
      expect.objectContaining({ configuration: { model: 'a3s-code' } }),
    );
    expect(() => createWorkflowFormBinding(interaction, {})).toThrow('configuration FormRef');
  });

  it('resolves a host-neutral workflow node configuration against its pinned form', () => {
    const document = published();
    const form = createFormRef(document, 'a3s://forms/workflow/llm', 'configuration');
    const sourceValue: JsonObject = { name: 'Research agent', age: 20 };
    const descriptor = createWorkflowNodeConfiguration({
      nodeType: 'llm',
      nodeId: 'llm-1',
      form,
      value: sourceValue,
      locale: 'en-US',
      readOnly: false,
    });

    sourceValue.name = 'mutated outside the form host';
    expect(descriptor).toEqual({
      apiVersion: 'a3s.dev/workflow-node-configuration/v1alpha1',
      nodeType: 'llm',
      nodeId: 'llm-1',
      form,
      value: { name: 'Research agent', age: 20 },
      locale: 'en-US',
      readOnly: false,
    });

    const resolved = validateWorkflowNodeConfiguration(document, descriptor);
    expect(resolved).toEqual(
      expect.objectContaining({
        ok: true,
        digest: form.digest,
        value: { name: 'Research agent', age: 20 },
      }),
    );
    if (resolved.ok) {
      expect(resolved.plan.sourceDigest).toBe(form.digest);
      expect(resolved.document.digest).toBe(form.digest);
    }

    expect(validateWorkflowNodeConfiguration(document, { ...descriptor, value: {} })).toEqual(
      expect.objectContaining({
        ok: false,
        digest: form.digest,
        errors: expect.arrayContaining([
          expect.objectContaining({ path: 'name', message: 'This field is required.' }),
        ]),
      }),
    );
    expect(
      validateWorkflowNodeConfiguration(document, {
        ...descriptor,
        form: { ...descriptor.form, digest: 'sha256:other' },
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        errors: [expect.objectContaining({ code: 'digest_mismatch' })],
      }),
    );
    expect(() =>
      createWorkflowNodeConfiguration({
        nodeType: '',
        nodeId: 'llm-1',
        form,
        value: {},
      }),
    ).toThrow('nodeType');
    expect(() =>
      createWorkflowNodeConfiguration({
        nodeType: 'llm',
        nodeId: 'llm-1',
        form: createFormRef(document, 'a3s://forms/workflow/interaction', 'interaction'),
        value: {},
      }),
    ).toThrow('configuration FormRef');
    expect(() =>
      createWorkflowNodeConfiguration({
        nodeType: 'llm',
        nodeId: '',
        form,
        value: {},
      }),
    ).toThrow('nodeId');
    expect(
      validateWorkflowNodeConfiguration(document, {
        ...descriptor,
        apiVersion: 'unsupported' as WorkflowNodeConfiguration['apiVersion'],
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        errors: [expect.objectContaining({ code: 'invalid_api_version' })],
      }),
    );
    expect(validateWorkflowNodeConfiguration(document, { ...descriptor, nodeId: '' })).toEqual(
      expect.objectContaining({
        ok: false,
        errors: [expect.objectContaining({ code: 'invalid_node_identity' })],
      }),
    );
    expect(
      validateWorkflowNodeConfiguration(document, {
        ...descriptor,
        form: { ...descriptor.form, mode: 'interaction' },
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        errors: [expect.objectContaining({ code: 'invalid_form_mode' })],
      }),
    );
  });

  it('uses host-approved widget capabilities when pinning node configuration forms', () => {
    const source = createDocument();
    const role = source.ui.nodes.find((node) => node.id === 'role');
    if (!role) throw new Error('Missing role field fixture.');
    role.widget = 'host.model-picker';
    const options = { capabilities: { widgets: ['host.model-picker'] } };
    const document = compileForm(source, options).document;
    if (!document) throw new Error('Expected the custom-node fixture to compile.');
    const form = createFormRef(
      document,
      'a3s://forms/workflow/custom-node',
      'configuration',
      options,
    );
    const descriptor = createWorkflowNodeConfiguration({
      nodeType: 'custom',
      nodeId: 'custom-1',
      form,
      value: { name: 'Custom node' },
    });

    expect(verifyPinnedForm(document, form)).toEqual(
      expect.objectContaining({ ok: false, code: 'invalid_document' }),
    );
    expect(verifyPinnedForm(document, form, options).ok).toBe(true);
    expect(validateWorkflowNodeConfiguration(document, descriptor, options)).toEqual(
      expect.objectContaining({ ok: true, digest: form.digest }),
    );
  });

  it('binds Cloud context to host-owned registries without serializing it', async () => {
    const context = {
      organizationId: 'org-1',
      projectId: 'project-1',
      environmentId: 'prod',
      locale: 'zh-CN',
    };
    let received: JsonObject | undefined;
    const adapter = createA3SCloudFormAdapter({
      context,
      resolveDataSource: async (cloud, request) => {
        received = { organizationId: cloud.organizationId, source: request.definition.id };
        return {
          options: [{ label: '研发', value: 'engineering' }],
          nextCursor: 'next-page',
        };
      },
      invokeAction: async (cloud, request) => ({
        organizationId: cloud.organizationId,
        action: request.definition.id,
      }),
      validateValue: async (cloud, request) => ({
        issues:
          request.value.name === 'blocked'
            ? [
                {
                  path: 'name',
                  code: 'blocked_name',
                  message: `Blocked in ${cloud.environmentId}.`,
                },
              ]
            : [],
      }),
    });
    const plan = compileForm(createDocument()).plan as NonNullable<
      ReturnType<typeof compileForm>['plan']
    >;
    const signal = new AbortController().signal;
    const response = await adapter.resolveDataSource?.(
      { definition: plan.dataSources[0], value: {}, locale: 'zh-CN' },
      signal,
    );
    const options = Array.isArray(response) ? response : response?.options;
    expect(options?.[0].value).toBe('engineering');
    expect(Array.isArray(response) ? undefined : response?.nextCursor).toBe('next-page');
    expect(received).toEqual({ organizationId: 'org-1', source: 'roles' });
    const action = await adapter.invokeAction?.(
      { definition: plan.actions[0], value: {}, plan },
      signal,
    );
    expect(action).toEqual({ organizationId: 'org-1', action: 'submit' });
    const validation = await adapter.validateValue?.(
      {
        plan,
        value: { name: 'blocked' },
        scope: { kind: 'form' },
        trigger: 'submit',
        locale: 'en-US',
      },
      signal,
    );
    expect(validation).toEqual({
      issues: [
        {
          path: 'name',
          code: 'blocked_name',
          message: 'Blocked in prod.',
        },
      ],
    });
    expect(JSON.stringify(plan)).not.toContain('org-1');
    expect(createA3SCloudFormAdapter({ context })).toEqual({
      resolveDataSource: undefined,
      validateValue: undefined,
      invokeAction: undefined,
    });
    const emptyAdapter = createA3SCloudFormAdapter({
      context,
      resolveDataSource: (() => undefined) as never,
      invokeAction: (() => undefined) as never,
      validateValue: (() => undefined) as never,
    });
    await expect(
      emptyAdapter.resolveDataSource?.(
        { definition: plan.dataSources[0], value: {}, locale: 'zh-CN' },
        signal,
      ),
    ).resolves.toEqual([]);
    await expect(
      emptyAdapter.invokeAction?.({ definition: plan.actions[0], value: {}, plan }, signal),
    ).resolves.toBeUndefined();
    await expect(
      emptyAdapter.validateValue?.(
        {
          plan,
          value: {},
          scope: { kind: 'form' },
          trigger: 'submit',
          locale: 'en-US',
        },
        signal,
      ),
    ).resolves.toEqual({ issues: [] });
  });
});
