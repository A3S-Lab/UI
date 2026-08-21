import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import {
  assertCompiled,
  createFormWizardCheckpoint,
  type FormPlan,
  resolveFormLocaleCatalog,
} from '../src/core';
import { nodeForValuePath, useFormErrorFocus } from '../src/react/error-focus';
import {
  type FormWizardController,
  useFormWizardController,
  WizardContainer,
  type WizardRuntimeState,
  wizardReviewItems,
} from '../src/react/wizard';
import { useWizardPageValidation } from '../src/react/wizard-validation';
import { createWizardDocument } from './fixtures';

function planWithHiddenPage(pageId: string): FormPlan {
  const document = createWizardDocument();
  document.rules = [
    {
      id: `hide-${pageId}`,
      target: pageId,
      kind: 'visible',
      expression: { op: 'literal', value: false },
    },
  ];
  return assertCompiled(document);
}

function reviewPlan(): { plan: FormPlan; state: WizardRuntimeState } {
  const base = assertCompiled(createWizardDocument());
  const source = base.nodeById['workspace-name'];
  const extraNodes = [
    { ...source, id: 'secret', label: 'Secret', widget: 'password', valuePath: 'secret' },
    { ...source, id: 'enabled', label: 'Enabled', widget: 'switch', valuePath: 'enabled' },
    { ...source, id: 'disabled', label: 'Disabled', widget: 'switch', valuePath: 'disabled' },
    {
      ...source,
      id: 'tags',
      label: 'Tags',
      valuePath: 'tags',
      options: [
        { label: 'Alpha', value: 'a' },
        { label: 'Beta', value: 'b' },
      ],
    },
    { ...source, id: 'unknown-tags', label: 'Unknown tags', valuePath: 'unknownTags' },
    { ...source, id: 'empty-tags', label: 'Empty tags', valuePath: 'emptyTags' },
    { ...source, id: 'settings', label: 'Settings', valuePath: 'settings' },
    { ...source, id: 'count', label: undefined, valuePath: 'count' },
    { ...source, id: 'duplicate', label: 'Duplicate', valuePath: 'workspaceName' },
    { ...source, id: 'hidden', label: 'Hidden', valuePath: 'hidden', hidden: true },
    {
      ...base.nodeById['identity-page'],
      id: 'value-layout',
      label: 'Value layout',
      valuePath: 'layoutValue',
      children: undefined,
    },
  ].map((node) => ({
    ...node,
    valuePathTemplate: node.valuePath,
  }));
  const identityPage = {
    ...base.nodeById['identity-page'],
    children: [
      ...(base.nodeById['identity-page'].children ?? []),
      '',
      'missing-node',
      ...extraNodes.map((node) => node.id),
    ],
  };
  const contactPage = { ...base.nodeById['contact-page'], children: undefined };
  const nodeById = {
    ...base.nodeById,
    [identityPage.id]: identityPage,
    [contactPage.id]: contactPage,
    ...Object.fromEntries(extraNodes.map((node) => [node.id, node])),
  };
  const plan = {
    ...base,
    nodes: [
      ...base.nodes.map((node) => {
        if (node.id === identityPage.id) return identityPage;
        if (node.id === contactPage.id) return contactPage;
        return node;
      }),
      ...extraNodes,
    ],
    nodeById,
  } satisfies FormPlan;
  const pages = [identityPage, contactPage, base.nodeById['review-page']];
  return {
    plan,
    state: {
      wizard: base.nodeById.onboarding,
      pages,
      activePage: pages[2],
      activeIndex: 2,
      completedPageIds: ['identity-page', 'contact-page'],
    },
  };
}

describe('React wizard internals', () => {
  it('reconciles hidden, stale, controlled and empty controller states', () => {
    const plan = assertCompiled(createWizardDocument());
    const changes: string[] = [];
    const uncontrolled = renderHook(() =>
      useFormWizardController({
        plan,
        value: {},
      }),
    );
    expect(uncontrolled.result.current.states.onboarding.activePage?.id).toBe('identity-page');
    act(() => {
      uncontrolled.result.current.goPrevious('onboarding');
      uncontrolled.result.current.goTo('onboarding', 'missing');
      uncontrolled.result.current.completeAndNavigate('missing', 'identity-page', 'contact-page');
      uncontrolled.result.current.completeAndNavigate('onboarding', 'missing', 'contact-page');
      uncontrolled.result.current.completeAndNavigate('onboarding', 'identity-page', 'missing');
    });
    expect(uncontrolled.result.current.states.onboarding.activePage?.id).toBe('identity-page');
    expect(uncontrolled.result.current.revealValuePath('missing')).toBe(false);
    expect(uncontrolled.result.current.revealValuePath('workspaceName')).toBe(false);
    let revealed = false;
    act(() => {
      revealed = uncontrolled.result.current.revealValuePath('contactEmail');
    });
    expect(revealed).toBe(true);
    expect(uncontrolled.result.current.states.onboarding.activePage?.id).toBe('contact-page');

    const hiddenContact = planWithHiddenPage('contact-page');
    const hiddenContactHook = renderHook(() =>
      useFormWizardController({ plan: hiddenContact, value: {} }),
    );
    expect(hiddenContactHook.result.current.revealValuePath('contactEmail')).toBe(false);

    const hiddenReview = planWithHiddenPage('review-page');
    const reviewCheckpoint = createFormWizardCheckpoint(hiddenReview, 'onboarding', 'review-page', [
      'identity-page',
    ]);
    if (!reviewCheckpoint.ok) throw new Error(reviewCheckpoint.message);
    const controlled = renderHook(() =>
      useFormWizardController({
        plan: hiddenReview,
        value: {},
        checkpoints: { onboarding: reviewCheckpoint.checkpoint },
        onCheckpointChange: (change) => changes.push(change.reason),
      }),
    );
    expect(controlled.result.current.states.onboarding.activePage?.id).toBe('contact-page');
    act(() => controlled.result.current.goTo('onboarding', 'identity-page'));
    expect(changes).toEqual(['jump']);
    expect(controlled.result.current.states.onboarding.activePage?.id).toBe('contact-page');

    const hiddenWizardDocument = createWizardDocument();
    hiddenWizardDocument.rules = [
      {
        id: 'hide-wizard',
        target: 'onboarding',
        kind: 'visible',
        expression: { op: 'literal', value: false },
      },
    ];
    const hiddenWizard = assertCompiled(hiddenWizardDocument);
    const empty = renderHook(() => useFormWizardController({ plan: hiddenWizard, value: {} }));
    expect(empty.result.current.states.onboarding.activePage).toBeUndefined();
    expect(empty.result.current.states.onboarding.activeIndex).toBe(-1);
    expect(empty.result.current.firstIncompleteWizardId).toBeUndefined();
    expect(empty.result.current.allAtEnd).toBe(true);
  });

  it('formats bounded review values and skips duplicate, hidden and structural nodes', () => {
    const { plan, state } = reviewPlan();
    const messages = resolveFormLocaleCatalog('en-US').messages;
    const items = wizardReviewItems(
      plan,
      {
        workspaceName: '',
        organizationType: 'personal',
        secret: 'do-not-show',
        enabled: true,
        disabled: false,
        tags: ['a', 'b'],
        unknownTags: ['a', 'unknown'],
        emptyTags: [],
        settings: { one: 1, two: 2 },
        count: 42,
        layoutValue: 'ignored',
        hidden: 'ignored',
      },
      state,
      messages,
    );
    const values = Object.fromEntries(items.map((item) => [item.nodeId, item.displayValue]));
    expect(values['workspace-name']).toBe(messages.wizardReviewEmptyValue);
    expect(values['organization-type']).toBe('Personal');
    expect(values.secret).toBe('••••••');
    expect(values.enabled).toBe(messages.wizardReviewBooleanTrue);
    expect(values.disabled).toBe(messages.wizardReviewBooleanFalse);
    expect(values.tags).toBe('Alpha, Beta');
    expect(values['unknown-tags']).toContain('2');
    expect(values['empty-tags']).toContain('0');
    expect(values.settings).toContain('2');
    expect(values.count).toBe('42');
    expect(items.find((item) => item.nodeId === 'count')?.label).toBe('count');
    expect(values.duplicate).toBeUndefined();
    expect(values.hidden).toBeUndefined();
    expect(values['value-layout']).toBeUndefined();

    const externalField = {
      ...plan.nodeById['workspace-name'],
      id: 'external-field',
      label: 'External field',
      valuePath: 'external',
      valuePathTemplate: 'external',
    };
    const externalPage = {
      ...plan.nodeById['identity-page'],
      id: 'external-page',
      label: 'External page',
      children: [externalField.id],
    };
    const externalPlan = {
      ...plan,
      nodes: [...plan.nodes, externalPage, externalField],
      nodeById: {
        ...plan.nodeById,
        [externalPage.id]: externalPage,
        [externalField.id]: externalField,
      },
    } satisfies FormPlan;
    const externalItems = wizardReviewItems(
      externalPlan,
      { external: 'Outside topology' },
      {
        ...state,
        pages: [externalPage],
        activePage: externalPage,
        activeIndex: 0,
      },
      messages,
    );
    expect(externalItems[0]?.pageId).toBe('external-page');
  });

  it('renders empty, validating, completed, review and page-error states', () => {
    const plan = assertCompiled(createWizardDocument());
    const messages = resolveFormLocaleCatalog('en-US').messages;
    const wizard = plan.nodeById.onboarding;
    const identity = plan.nodeById['identity-page'];
    const contact = plan.nodeById['contact-page'];
    const review = plan.nodeById['review-page'];
    const callbacks: string[] = [];
    const common = {
      messages,
      prefix: 'test',
      pageErrors: [],
      reviewItems: [],
      renderPage: (pageId: string) => <span>{pageId}</span>,
      onNext: () => callbacks.push('next'),
      onPrevious: () => callbacks.push('previous'),
      onGoTo: (pageId: string) => callbacks.push(`go:${pageId}`),
      onEditReviewItem: (pageId: string) => callbacks.push(`edit:${pageId}`),
    };

    const emptyView = render(
      <WizardContainer
        {...common}
        state={{
          wizard: { ...wizard, label: undefined },
          pages: [],
          activePage: undefined,
          activeIndex: -1,
          completedPageIds: [],
        }}
        validating={false}
      />,
    );
    expect(screen.getByText(messages.wizardEmpty)).toBeTruthy();
    emptyView.unmount();

    const unlabeledContact = { ...contact, label: undefined };
    const validatingView = render(
      <WizardContainer
        {...common}
        state={{
          wizard,
          pages: [identity, unlabeledContact, review],
          activePage: unlabeledContact,
          activeIndex: 1,
          completedPageIds: ['identity-page'],
        }}
        validating
      />,
    );
    expect(
      (
        screen.getByRole('button', {
          name: messages.wizardPageValidationPending,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByRole('status', { name: /contact-page/ })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Review' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: 'contact-page' }));
    expect(callbacks).toEqual([]);
    validatingView.unmount();

    render(
      <WizardContainer
        {...common}
        state={{
          wizard: { ...wizard, label: undefined, description: undefined },
          pages: [identity, { ...review, label: undefined, description: undefined }],
          activePage: { ...review, label: undefined, description: undefined },
          activeIndex: 1,
          completedPageIds: ['identity-page'],
        }}
        validating={false}
        pageErrors={[
          { path: '', code: 'page', message: 'Check this page.' },
          { path: 'workspaceName', code: 'field', message: 'Hidden inline error.' },
        ]}
      />,
    );
    expect(screen.getByRole('region', { name: messages.wizardReviewTitle }).textContent).toContain(
      messages.wizardReviewEmpty,
    );
    expect(screen.getByText('Check this page.')).toBeTruthy();
    expect(screen.queryByText('Hidden inline error.')).toBeNull();
    expect(screen.queryByRole('button', { name: messages.wizardNext })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: messages.wizardPrevious }));
    expect(callbacks).toEqual(['previous']);
  });

  it('covers blocked, read-only, cancelled and page-level validation paths', async () => {
    const plan = assertCompiled(createWizardDocument());
    const calls: string[] = [];
    const wizardController: FormWizardController = {
      states: {},
      allAtEnd: false,
      completeAndNavigate: (wizardId, pageId, nextPageId) =>
        calls.push(`${wizardId}:${pageId}:${nextPageId}`),
      goTo: (wizardId, pageId) => calls.push(`go:${wizardId}:${pageId}`),
      goPrevious: (wizardId) => calls.push(`previous:${wizardId}`),
      revealValuePath: () => false,
    };
    const validValue = {
      workspaceName: 'A3S Workspace',
      organizationType: 'personal',
      contactEmail: 'owner@example.test',
    };
    const blocked = renderHook(() =>
      useWizardPageValidation({
        plan,
        getValue: () => validValue,
        locale: 'en-US',
        readOnly: false,
        wizardController,
        isBlocked: () => true,
        clearFieldValidations: () => calls.push('clear'),
        focusError: () => calls.push('focus'),
      }),
    );
    await act(() =>
      blocked.result.current.validateAndAdvance('onboarding', 'identity-page', 'contact-page'),
    );
    expect(calls).toEqual([]);

    const readOnly = renderHook(() =>
      useWizardPageValidation({
        plan,
        getValue: () => validValue,
        locale: 'en-US',
        readOnly: true,
        wizardController,
        isBlocked: () => false,
        clearFieldValidations: () => calls.push('clear'),
        focusError: () => calls.push('focus'),
      }),
    );
    await act(() =>
      readOnly.result.current.validateAndAdvance('onboarding', 'identity-page', 'contact-page'),
    );
    expect(calls).toContain('onboarding:identity-page:contact-page');
    act(() => {
      readOnly.result.current.goTo('onboarding', 'contact-page');
      readOnly.result.current.goPrevious('onboarding');
      readOnly.result.current.reset();
    });
    expect(calls).toEqual(
      expect.arrayContaining(['go:onboarding:contact-page', 'previous:onboarding']),
    );

    let resolveValidation: ((value: { issues: [] }) => void) | undefined;
    const pending = renderHook(() =>
      useWizardPageValidation({
        plan,
        getValue: () => validValue,
        locale: 'en-US',
        hostAdapter: {
          validateValue: () =>
            new Promise<{ issues: [] }>((resolve) => {
              resolveValidation = resolve;
            }),
        },
        wizardController,
        isBlocked: () => false,
        clearFieldValidations: () => calls.push('clear'),
        focusError: () => calls.push('focus'),
      }),
    );
    let firstRequest: Promise<void> | undefined;
    await act(async () => {
      firstRequest = pending.result.current.validateAndAdvance(
        'onboarding',
        'identity-page',
        'contact-page',
      );
      await pending.result.current.validateAndAdvance(
        'onboarding',
        'identity-page',
        'contact-page',
      );
    });
    expect(pending.result.current.isActive()).toBe(true);
    pending.unmount();
    resolveValidation?.({ issues: [] });
    await act(async () => firstRequest);

    const pageError = renderHook(() =>
      useWizardPageValidation({
        plan,
        getValue: () => validValue,
        locale: 'en-US',
        hostAdapter: {
          validateValue: async () => ({
            issues: [{ code: 'page_blocked', message: 'This page is blocked.' }],
          }),
        },
        wizardController,
        isBlocked: () => false,
        clearFieldValidations: () => calls.push('clear'),
        focusError: () => calls.push('focus'),
      }),
    );
    await act(() =>
      pageError.result.current.validateAndAdvance('onboarding', 'identity-page', 'contact-page'),
    );
    expect(pageError.result.current.pageErrors).toContainEqual(
      expect.objectContaining({ path: '', code: 'async.page_blocked' }),
    );
  });

  it('focuses direct fields, inert field shells and fallback controls', () => {
    const plan = assertCompiled(createWizardDocument());
    expect(nodeForValuePath(plan, 'workspaceName')?.id).toBe('workspace-name');
    expect(nodeForValuePath(plan, 'missing')).toBeUndefined();

    const directForm = document.createElement('form');
    const directInput = document.createElement('input');
    directInput.dataset.a3sFormPath = 'workspaceName';
    directForm.append(directInput);
    document.body.append(directForm);
    const direct = renderHook(() =>
      useFormErrorFocus({
        formRef: { current: directForm },
        plan,
        prefix: 'direct',
        revealValuePath: () => false,
      }),
    );
    act(() => direct.result.current('workspaceName'));
    expect(document.activeElement).toBe(directInput);

    const shellForm = document.createElement('form');
    const shell = document.createElement('div');
    shell.dataset.a3sFormPath = 'workspaceName';
    shellForm.append(shell);
    document.body.append(shellForm);
    const shellFocus = renderHook(() =>
      useFormErrorFocus({
        formRef: { current: shellForm },
        plan,
        prefix: 'shell',
        revealValuePath: () => false,
      }),
    );
    act(() => shellFocus.result.current('workspaceName'));
    expect(document.activeElement).toBe(shell);
    expect(shell.tabIndex).toBe(-1);

    const fallback = document.createElement('input');
    fallback.id = 'fallback-workspace-name';
    document.body.append(fallback);
    const fallbackFocus = renderHook(() =>
      useFormErrorFocus({
        formRef: { current: null },
        plan,
        prefix: 'fallback',
        revealValuePath: () => false,
      }),
    );
    act(() => fallbackFocus.result.current('workspaceName'));
    expect(document.activeElement).toBe(fallback);
    act(() => fallbackFocus.result.current('missing'));

    directForm.remove();
    shellForm.remove();
    fallback.remove();
  });
});
