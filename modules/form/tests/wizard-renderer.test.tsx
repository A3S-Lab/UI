import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useMemo, useState } from 'react';
import {
  assertCompiled,
  createFormWizardCheckpoint,
  type FormDocument,
  type FormHostAdapter,
  type FormWizardCheckpoint,
  type FormWizardCheckpointChange,
  type JsonObject,
} from '../src/core';
import { FormRenderer } from '../src/react';
import { createWizardDocument } from './fixtures';

function WizardHarness({
  document = createWizardDocument(),
  hostAdapter,
  initialValue = {},
  initialCheckpoint,
  onCheckpointChange,
  onAction,
}: {
  document?: FormDocument;
  hostAdapter?: FormHostAdapter;
  initialValue?: JsonObject;
  initialCheckpoint?: FormWizardCheckpoint;
  onCheckpointChange?: (change: FormWizardCheckpointChange) => void;
  onAction?: (value: JsonObject) => void;
}) {
  const plan = useMemo(() => assertCompiled(document), [document]);
  const [value, setValue] = useState<JsonObject>(initialValue);
  const [checkpoints, setCheckpoints] = useState<
    Readonly<Record<string, FormWizardCheckpoint>> | undefined
  >(initialCheckpoint ? { [initialCheckpoint.wizardId]: initialCheckpoint } : undefined);
  return (
    <>
      <FormRenderer
        plan={plan}
        value={value}
        onChange={setValue}
        hostAdapter={hostAdapter}
        wizardCheckpoints={checkpoints}
        onWizardCheckpointChange={(change) => {
          onCheckpointChange?.(change);
          if (checkpoints) {
            setCheckpoints((current) => ({
              ...current,
              [change.checkpoint.wizardId]: change.checkpoint,
            }));
          }
        }}
        onAction={(_actionId, next) => onAction?.(next)}
      />
      <output data-testid="wizard-value">{JSON.stringify(value)}</output>
      <button
        type="button"
        onClick={() => setValue((current) => ({ ...current, workspaceName: '' }))}
      >
        Clear workspace name
      </button>
    </>
  );
}

function completeIdentity() {
  fireEvent.change(screen.getByLabelText('Workspace name'), {
    target: { value: 'A3S Workspace' },
  });
  fireEvent.click(screen.getByRole('radio', { name: 'Personal' }));
}

describe('wizard renderer', () => {
  it('gates each page, retains controlled values, renders review, and exposes actions at the end', async () => {
    const changes: FormWizardCheckpointChange[] = [];
    render(<WizardHarness onCheckpointChange={(change) => changes.push(change)} />);

    expect(screen.getByRole('navigation', { name: 'Form progress' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Workspace' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create workspace' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect((await screen.findAllByText('This field is required.')).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Workspace' })).toBeTruthy();

    completeIdentity();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByRole('heading', { name: 'Contact' })).toBeTruthy();
    expect(screen.getByTestId('wizard-value').textContent).toContain('A3S Workspace');
    expect(changes.at(-1)).toEqual(
      expect.objectContaining({
        reason: 'next',
        checkpoint: expect.objectContaining({
          pageId: 'contact-page',
          completedPageIds: ['identity-page'],
        }),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(await screen.findByRole('heading', { name: 'Workspace' })).toBeTruthy();
    expect((screen.getByLabelText('Workspace name') as HTMLInputElement).value).toBe(
      'A3S Workspace',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));
    fireEvent.change(screen.getByLabelText('Contact email'), {
      target: { value: 'owner@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));

    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
    const review = screen.getByRole('region', { name: 'Review your entries' });
    expect(within(review).getByText('Workspace name')).toBeTruthy();
    expect(within(review).getByText('A3S Workspace')).toBeTruthy();
    expect(within(review).getByText('owner@example.test')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeTruthy();

    fireEvent.click(within(review).getByRole('button', { name: 'Edit Workspace name' }));
    expect(await screen.findByRole('heading', { name: 'Workspace' })).toBeTruthy();
  });

  it('skips invisible branches and restores a digest-bound controlled checkpoint', async () => {
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
    const resumed = createFormWizardCheckpoint(plan, 'onboarding', 'review-page', [
      'identity-page',
    ]);
    if (!resumed.ok) throw new Error(resumed.message);
    const view = render(
      <WizardHarness
        document={document}
        initialValue={{ workspaceName: 'Personal space', organizationType: 'personal' }}
        initialCheckpoint={resumed.checkpoint}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Review' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Contact' })).toBeNull();

    view.unmount();
    render(<WizardHarness document={document} />);
    completeIdentity();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
  });

  it('waits for page-scoped host validation and keeps host failures on the active page', async () => {
    let pageAttempts = 0;
    const scopes: string[] = [];
    const hostAdapter: FormHostAdapter = {
      validateValue: async (request) => {
        scopes.push(request.scope.kind);
        if (request.scope.kind !== 'page' || request.scope.nodeId !== 'contact-page') {
          return { issues: [] };
        }
        pageAttempts += 1;
        return pageAttempts === 1
          ? {
              issues: [
                {
                  path: 'contactEmail',
                  code: 'domain_blocked',
                  message: 'Use an approved organization domain.',
                },
              ],
            }
          : { issues: [] };
      },
    };
    render(<WizardHarness hostAdapter={hostAdapter} />);
    completeIdentity();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await screen.findByRole('heading', { name: 'Contact' });
    fireEvent.change(screen.getByLabelText('Contact email'), {
      target: { value: 'owner@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));

    expect(await screen.findByText('Use an approved organization domain.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeTruthy();
    expect(scopes).toContain('page');
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
  });

  it('reveals the page that owns a final submission error', async () => {
    let submitted: JsonObject | undefined;
    render(<WizardHarness onAction={(value) => (submitted = value)} />);
    completeIdentity();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await screen.findByRole('heading', { name: 'Contact' });
    fireEvent.change(screen.getByLabelText('Contact email'), {
      target: { value: 'owner@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await screen.findByRole('heading', { name: 'Review' });

    fireEvent.click(screen.getByRole('button', { name: 'Clear workspace name' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Workspace' })).toBeTruthy());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText('Workspace name')),
    );
    expect(submitted).toBeUndefined();
  });
});
