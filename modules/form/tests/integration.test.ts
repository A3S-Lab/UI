import { createA3SCloudFormAdapter } from '../src/cloud';
import { compileForm, type JsonObject } from '../src/core';
import { createDocument } from './fixtures';

describe('Cloud adapter seam', () => {
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
