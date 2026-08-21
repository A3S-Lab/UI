import {
  assertCompiled,
  compileForm,
  createFormWizardCheckpoint,
  evaluateFormValue,
  evaluateWizardPageValue,
  type FormPlan,
  filterInactiveWizardPageErrors,
  formWizardDefinitions,
  formWizardPageForNode,
  formWizardPageForValuePath,
  formWizardPages,
  formWizardValuePathOwners,
  restoreFormWizardCheckpoint,
  validateFormValueAsync,
  valuePathBelongsToWizardPage,
} from '../src/core';
import { createWizardDocument } from './fixtures';

describe('wizard contracts', () => {
  it('compiles first-class wizard pages and rejects ambiguous layouts', () => {
    const plan = assertCompiled(createWizardDocument());
    expect(plan.nodeById.onboarding.layout).toBe('wizard');
    expect(plan.nodeById['review-page'].pageRole).toBe('review');

    const invalidChild = createWizardDocument();
    invalidChild.ui.nodes.find((node) => node.id === 'onboarding')?.children?.push('contact-email');
    expect(compileForm(invalidChild).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'wizard.page' }),
    );

    const orphanPage = createWizardDocument();
    const root = orphanPage.ui.nodes.find((node) => node.id === 'root');
    const wizard = orphanPage.ui.nodes.find((node) => node.id === 'onboarding');
    if (!root || !wizard) throw new Error('Missing wizard fixture nodes.');
    wizard.children = wizard.children?.filter((id) => id !== 'contact-page');
    root.children?.push('contact-page');
    expect(compileForm(orphanPage).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'wizard.page_parent' }),
    );

    const misplacedReview = createWizardDocument();
    const misplacedWizard = misplacedReview.ui.nodes.find((node) => node.id === 'onboarding');
    if (!misplacedWizard) throw new Error('Missing wizard fixture node.');
    misplacedWizard.children = ['identity-page', 'review-page', 'contact-page'];
    expect(compileForm(misplacedReview).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'wizard.review_order' }),
    );
  });

  it('rejects every unsupported wizard topology at the compiler boundary', () => {
    const unsupported = createWizardDocument();
    const unsupportedRoot = unsupported.ui.nodes.find((node) => node.id === 'root');
    if (!unsupportedRoot) throw new Error('Missing root fixture node.');
    unsupportedRoot.layout = 'unsupported' as typeof unsupportedRoot.layout;
    unsupportedRoot.pageRole = 'summary' as typeof unsupportedRoot.pageRole;
    expect(compileForm(unsupported).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'node.layout' }),
        expect.objectContaining({ code: 'wizard.page_role' }),
        expect.objectContaining({ code: 'wizard.page_role_scope' }),
      ]),
    );

    const invalidContainer = createWizardDocument();
    const invalidWizard = invalidContainer.ui.nodes.find((node) => node.id === 'onboarding');
    if (!invalidWizard) throw new Error('Missing wizard fixture node.');
    invalidWizard.kind = 'field';
    expect(compileForm(invalidContainer).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'wizard.container' }),
    );

    const empty = createWizardDocument();
    const emptyWizard = empty.ui.nodes.find((node) => node.id === 'onboarding');
    if (!emptyWizard) throw new Error('Missing wizard fixture node.');
    emptyWizard.children = undefined;
    expect(compileForm(empty).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'wizard.empty' }),
        expect.objectContaining({ code: 'wizard.page_parent' }),
      ]),
    );

    const duplicateReview = createWizardDocument();
    const contactPage = duplicateReview.ui.nodes.find((node) => node.id === 'contact-page');
    if (!contactPage) throw new Error('Missing contact page fixture node.');
    contactPage.pageRole = 'review';
    expect(compileForm(duplicateReview).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'wizard.review_count' }),
    );

    const nested = createWizardDocument();
    const nestedRoot = nested.ui.nodes.find((node) => node.id === 'root');
    if (!nestedRoot) throw new Error('Missing root fixture node.');
    nestedRoot.layout = 'wizard';
    expect(compileForm(nested).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'wizard.nested' }),
    );
  });

  it('validates only the active page and ignores required fields on hidden branches', () => {
    const document = createWizardDocument();
    document.rules = [
      {
        id: 'enterprise-contact',
        target: 'contact-page',
        kind: 'visible',
        expression: {
          op: 'eq',
          left: { op: 'field', path: 'organizationType' },
          right: { op: 'literal', value: 'enterprise' },
        },
      },
    ];
    const plan = assertCompiled(document);
    const identity = evaluateWizardPageValue(plan, {}, 'identity-page', { locale: 'en-US' });
    expect(identity.errors.map((error) => error.path).sort()).toEqual([
      'organizationType',
      'workspaceName',
    ]);
    expect(evaluateWizardPageValue(plan, {}, 'missing-page').errors).toEqual([
      expect.objectContaining({ path: '', code: 'wizard.page_missing' }),
    ]);
    const rootError = { path: '', code: 'root', message: 'Root error.' };
    expect(filterInactiveWizardPageErrors(plan, {}, [rootError])).toEqual([rootError]);

    const personal = evaluateFormValue(plan, {
      workspaceName: 'Personal space',
      organizationType: 'personal',
    });
    expect(personal.errors).toEqual([]);

    const enterprise = evaluateFormValue(plan, {
      workspaceName: 'Enterprise space',
      organizationType: 'enterprise',
    });
    expect(enterprise.errors).toContainEqual(
      expect.objectContaining({ path: 'contactEmail', code: 'required' }),
    );
  });

  it('creates digest-bound checkpoints and rejects stale or foreign state', () => {
    const plan = assertCompiled(createWizardDocument());
    const created = createFormWizardCheckpoint(plan, 'onboarding', 'contact-page', [
      'identity-page',
    ]);
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.message);
    expect(created.checkpoint).toEqual({
      apiVersion: 'a3s.dev/form-wizard-checkpoint/v1alpha1',
      sourceDigest: plan.sourceDigest,
      sourceRevision: plan.sourceRevision,
      wizardId: 'onboarding',
      pageId: 'contact-page',
      completedPageIds: ['identity-page'],
    });
    expect(restoreFormWizardCheckpoint(plan, created.checkpoint)).toEqual(created);

    expect(
      restoreFormWizardCheckpoint(plan, {
        ...created.checkpoint,
        sourceDigest: 'sha256:stale',
      }),
    ).toEqual(expect.objectContaining({ ok: false, code: 'digest_mismatch' }));
    expect(createFormWizardCheckpoint(plan, 'onboarding', 'missing', [])).toEqual(
      expect.objectContaining({ ok: false, code: 'page_missing' }),
    );

    expect(createFormWizardCheckpoint(plan, 'missing', 'missing', [])).toEqual(
      expect.objectContaining({ ok: false, code: 'wizard_missing' }),
    );
    expect(
      createFormWizardCheckpoint(plan, 'onboarding', 'contact-page', ['foreign-page']),
    ).toEqual(expect.objectContaining({ ok: false, code: 'completed_page_missing' }));

    expect(restoreFormWizardCheckpoint(plan, null)).toEqual(
      expect.objectContaining({ ok: false, code: 'invalid_api_version' }),
    );
    expect(
      restoreFormWizardCheckpoint(plan, {
        ...created.checkpoint,
        apiVersion: 'a3s.dev/form-wizard-checkpoint/v2',
      }),
    ).toEqual(expect.objectContaining({ ok: false, code: 'invalid_api_version' }));
    expect(
      restoreFormWizardCheckpoint(plan, {
        ...created.checkpoint,
        sourceRevision: plan.sourceRevision + 1,
      }),
    ).toEqual(expect.objectContaining({ ok: false, code: 'revision_mismatch' }));
    expect(
      restoreFormWizardCheckpoint(plan, {
        ...created.checkpoint,
        wizardId: undefined,
      }),
    ).toEqual(expect.objectContaining({ ok: false, code: 'wizard_missing' }));
    expect(
      restoreFormWizardCheckpoint(plan, {
        ...created.checkpoint,
        pageId: undefined,
      }),
    ).toEqual(expect.objectContaining({ ok: false, code: 'page_missing' }));
    expect(
      restoreFormWizardCheckpoint(plan, {
        ...created.checkpoint,
        completedPageIds: 'identity-page',
      }),
    ).toEqual(expect.objectContaining({ ok: false, code: 'completed_page_missing' }));
    expect(
      restoreFormWizardCheckpoint(plan, {
        ...created.checkpoint,
        completedPageIds: ['foreign-page'],
      }),
    ).toEqual(expect.objectContaining({ ok: false, code: 'completed_page_missing' }));
  });

  it('indexes wizard ownership defensively and caches the resulting topology', () => {
    const base = assertCompiled(createWizardDocument());
    const wizard = {
      ...base.nodeById.onboarding,
      children: ['identity-page', 'missing-page', 'identity-page'],
    };
    const identityPage = {
      ...base.nodeById['identity-page'],
      children: [...(base.nodeById['identity-page'].children ?? []), 'identity-page'],
    };
    const plan = {
      ...base,
      nodes: base.nodes.map((node) => {
        if (node.id === wizard.id) return wizard;
        if (node.id === identityPage.id) return identityPage;
        return node;
      }),
      nodeById: {
        ...base.nodeById,
        [wizard.id]: wizard,
        [identityPage.id]: identityPage,
      },
    } satisfies FormPlan;

    expect(formWizardDefinitions(plan)[0]?.pages.map((page) => page.id)).toEqual([
      'identity-page',
      'identity-page',
    ]);
    expect(formWizardDefinitions(plan)).toBe(formWizardDefinitions(plan));
    expect(formWizardPages(plan, 'missing')).toEqual([]);
    expect(formWizardPageForNode(plan, 'workspace-name')).toBe('identity-page');
    expect(formWizardPageForNode(plan, 'missing')).toBeUndefined();
    expect(formWizardPageForValuePath(plan, 'workspaceName')).toBe('identity-page');
    expect(formWizardPageForValuePath(plan, 'missing')).toBeUndefined();
    expect(valuePathBelongsToWizardPage(plan, 'contact-page', 'workspaceName')).toBe(false);
    expect(formWizardValuePathOwners(plan, '')).toEqual({ pageIds: [], outsideWizard: false });

    const wizardWithoutChildren = { ...base.nodeById.onboarding, children: undefined };
    const emptyPlan = {
      ...base,
      nodes: base.nodes.map((node) =>
        node.id === wizardWithoutChildren.id ? wizardWithoutChildren : node,
      ),
      nodeById: {
        ...base.nodeById,
        [wizardWithoutChildren.id]: wizardWithoutChildren,
      },
    } satisfies FormPlan;
    expect(formWizardDefinitions(emptyPlan)[0]?.pages).toEqual([]);
  });

  it('passes page-scoped asynchronous validation to the host and rejects foreign issues', async () => {
    const plan = assertCompiled(createWizardDocument());
    const requests: string[] = [];
    const invalid = await validateFormValueAsync(
      plan,
      {
        workspaceName: 'A3S Lab',
        organizationType: 'enterprise',
        contactEmail: 'owner@example.test',
      },
      async (request) => {
        requests.push(request.scope.kind);
        return {
          issues: [
            {
              path: 'contactEmail',
              code: 'domain_blocked',
              message: 'Use an approved organization domain.',
            },
          ],
        };
      },
      { scope: { kind: 'page', nodeId: 'contact-page' }, trigger: 'submit' },
    );
    expect(requests).toEqual(['page']);
    expect(invalid.status).toBe('invalid');
    expect(invalid.asyncErrors).toEqual([
      {
        path: 'contactEmail',
        code: 'async.domain_blocked',
        message: 'Use an approved organization domain.',
      },
    ]);

    const foreign = await validateFormValueAsync(
      plan,
      {
        workspaceName: 'A3S Lab',
        organizationType: 'enterprise',
        contactEmail: 'owner@example.test',
      },
      async () => ({
        issues: [{ path: 'workspaceName', code: 'foreign_page', message: 'Wrong page scope.' }],
      }),
      { scope: { kind: 'page', nodeId: 'contact-page' } },
    );
    expect(foreign.status).toBe('unavailable');
    expect(foreign.asyncErrors[0]?.code).toBe('async.invalid_response');

    let called = false;
    const blocked = await validateFormValueAsync(
      plan,
      {},
      async () => {
        called = true;
        return { issues: [] };
      },
      { scope: { kind: 'page', nodeId: 'identity-page' } },
    );
    expect(blocked.status).toBe('invalid');
    expect(called).toBe(false);
  });
});
