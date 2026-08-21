import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  createFormWizardCheckpoint,
  type FieldError,
  type FormLocaleMessages,
  type FormPlan,
  type FormWizardCheckpoint,
  type FormWizardCheckpointChange,
  type FormWizardCheckpointChangeReason,
  fieldState,
  formatFormMessage,
  formWizardDefinitions,
  formWizardPageForNode,
  formWizardPageForValuePath,
  type JsonObject,
  type JsonValue,
  readFormValue,
  restoreFormWizardCheckpoint,
  type UiNode,
} from '../core';

export interface WizardRuntimeState {
  wizard: FormPlan['nodes'][number];
  pages: readonly FormPlan['nodes'][number][];
  activePage?: FormPlan['nodes'][number];
  activeIndex: number;
  completedPageIds: readonly string[];
}

export interface FormWizardController {
  states: Readonly<Record<string, WizardRuntimeState>>;
  allAtEnd: boolean;
  firstIncompleteWizardId?: string;
  completeAndNavigate: (wizardId: string, pageId: string, nextPageId: string) => void;
  goTo: (wizardId: string, pageId: string, reason?: FormWizardCheckpointChangeReason) => void;
  goPrevious: (wizardId: string) => void;
  revealValuePath: (path: string) => boolean;
}

interface UseFormWizardControllerOptions {
  plan: FormPlan;
  value: JsonObject;
  checkpoints?: Readonly<Record<string, FormWizardCheckpoint>>;
  onCheckpointChange?: (change: FormWizardCheckpointChange) => void;
}

function fallbackVisiblePage(
  pages: readonly FormPlan['nodes'][number][],
  visiblePages: readonly FormPlan['nodes'][number][],
  requestedPageId: string | undefined,
) {
  if (visiblePages.length === 0) return undefined;
  const requestedIndex = pages.findIndex((page) => page.id === requestedPageId);
  if (requestedIndex < 0) return visiblePages[0];
  return (
    visiblePages.find(
      (page) => pages.findIndex((candidate) => candidate.id === page.id) >= requestedIndex,
    ) ?? visiblePages.at(-1)
  );
}

export function useFormWizardController({
  plan,
  value,
  checkpoints,
  onCheckpointChange,
}: UseFormWizardControllerOptions): FormWizardController {
  const [localCheckpoints, setLocalCheckpoints] = useState<
    Readonly<Record<string, FormWizardCheckpoint>>
  >({});
  const controlled = checkpoints !== undefined;
  const states = useMemo(() => {
    const next: Record<string, WizardRuntimeState> = {};
    for (const definition of formWizardDefinitions(plan)) {
      const pages = definition.pages;
      const visiblePages = fieldState(plan, definition.wizard.id, value).visible
        ? pages.filter((page) => fieldState(plan, page.id, value).visible)
        : [];
      const candidate = (controlled ? checkpoints : localCheckpoints)?.[definition.wizard.id];
      const restored = candidate ? restoreFormWizardCheckpoint(plan, candidate) : undefined;
      const restoredCheckpoint = restored?.ok ? restored.checkpoint : undefined;
      const activePage = fallbackVisiblePage(pages, visiblePages, restoredCheckpoint?.pageId);
      const visiblePageIds = new Set(visiblePages.map((page) => page.id));
      const completedPageIds = (restoredCheckpoint?.completedPageIds ?? []).filter((pageId) =>
        visiblePageIds.has(pageId),
      );
      next[definition.wizard.id] = {
        wizard: definition.wizard,
        pages: visiblePages,
        activePage,
        activeIndex: activePage ? visiblePages.findIndex((page) => page.id === activePage.id) : -1,
        completedPageIds,
      };
    }
    return next;
  }, [checkpoints, controlled, localCheckpoints, plan, value]);

  const commit = useCallback(
    (
      wizardId: string,
      pageId: string,
      completedPageIds: readonly string[],
      reason: FormWizardCheckpointChangeReason,
    ) => {
      const created = createFormWizardCheckpoint(plan, wizardId, pageId, completedPageIds);
      if (!created.ok) return;
      if (!controlled) {
        setLocalCheckpoints((current) => ({
          ...current,
          [wizardId]: created.checkpoint,
        }));
      }
      onCheckpointChange?.({ checkpoint: created.checkpoint, reason });
    },
    [controlled, onCheckpointChange, plan],
  );

  const goTo = useCallback(
    (wizardId: string, pageId: string, reason: FormWizardCheckpointChangeReason = 'jump') => {
      const state = states[wizardId];
      if (!state?.pages.some((page) => page.id === pageId)) return;
      commit(wizardId, pageId, state.completedPageIds, reason);
    },
    [commit, states],
  );

  const completeAndNavigate = useCallback(
    (wizardId: string, pageId: string, nextPageId: string) => {
      const state = states[wizardId];
      if (!state || state.activePage?.id !== pageId) return;
      commit(wizardId, nextPageId, [...new Set([...state.completedPageIds, pageId])], 'next');
    },
    [commit, states],
  );

  const goPrevious = useCallback(
    (wizardId: string) => {
      const state = states[wizardId];
      const previous = state?.pages[state.activeIndex - 1];
      if (state && previous) commit(wizardId, previous.id, state.completedPageIds, 'previous');
    },
    [commit, states],
  );

  const revealValuePath = useCallback(
    (path: string) => {
      const pageId = formWizardPageForValuePath(plan, path);
      if (!pageId) return false;
      const wizardId = formWizardDefinitions(plan).find((definition) =>
        definition.pages.some((page) => page.id === pageId),
      )?.wizard.id;
      if (!wizardId || states[wizardId]?.activePage?.id === pageId) return false;
      if (!states[wizardId]?.pages.some((page) => page.id === pageId)) return false;
      goTo(wizardId, pageId, 'jump');
      return true;
    },
    [goTo, plan, states],
  );

  const firstIncompleteWizardId = Object.values(states).find(
    (state) =>
      state.pages.length > 0 &&
      state.activeIndex >= 0 &&
      state.activeIndex < state.pages.length - 1,
  )?.wizard.id;
  const allAtEnd = Object.values(states).every(
    (state) => state.pages.length === 0 || state.activeIndex === state.pages.length - 1,
  );

  return {
    states,
    allAtEnd,
    firstIncompleteWizardId,
    completeAndNavigate,
    goTo,
    goPrevious,
    revealValuePath,
  };
}

export interface WizardReviewItem {
  nodeId: string;
  pageId: string;
  label: string;
  displayValue: string;
}

function reviewValue(
  node: UiNode,
  value: JsonValue | undefined,
  messages: Readonly<FormLocaleMessages>,
): string {
  if (value === undefined || value === null || value === '') return messages.wizardReviewEmptyValue;
  if (node.widget === 'password') return '••••••';
  if (typeof value === 'boolean') {
    return value ? messages.wizardReviewBooleanTrue : messages.wizardReviewBooleanFalse;
  }
  if (Array.isArray(value)) {
    const labels = value
      .map((item) => node.options?.find((option) => option.value === item)?.label)
      .filter((label): label is string => Boolean(label));
    if (labels.length === value.length && labels.length > 0) return labels.join(', ');
    return formatFormMessage(messages, 'wizardReviewItemCount', { count: value.length });
  }
  if (typeof value === 'object') {
    return formatFormMessage(messages, 'wizardReviewItemCount', {
      count: Object.keys(value).length,
    });
  }
  return node.options?.find((option) => option.value === value)?.label ?? String(value);
}

export function wizardReviewItems(
  plan: FormPlan,
  value: JsonObject,
  state: WizardRuntimeState,
  messages: Readonly<FormLocaleMessages>,
): WizardReviewItem[] {
  const items: WizardReviewItem[] = [];
  const seenPaths = new Set<string>();
  for (const page of state.pages) {
    if (page.pageRole === 'review') continue;
    const pending = [...(page.children ?? [])].reverse();
    while (pending.length > 0) {
      const nodeId = pending.pop();
      if (!nodeId) continue;
      const node = plan.nodeById[nodeId];
      if (!node || !fieldState(plan, node.id, value).visible) continue;
      pending.push(...[...(node.children ?? [])].reverse());
      const path = node.valuePath;
      if (!path || seenPaths.has(path) || (node.kind !== 'field' && node.kind !== 'repeater')) {
        continue;
      }
      seenPaths.add(path);
      items.push({
        nodeId: node.id,
        pageId: formWizardPageForNode(plan, node.id) ?? page.id,
        label: node.label ?? node.id,
        displayValue: reviewValue(node, readFormValue(value, path), messages),
      });
    }
  }
  return items;
}

interface WizardContainerProps {
  state: WizardRuntimeState;
  messages: Readonly<FormLocaleMessages>;
  prefix: string;
  validating: boolean;
  pageErrors: readonly FieldError[];
  reviewItems: readonly WizardReviewItem[];
  renderPage: (pageId: string) => ReactNode;
  onNext: () => void;
  onPrevious: () => void;
  onGoTo: (pageId: string) => void;
  onEditReviewItem: (pageId: string) => void;
}

export function WizardContainer({
  state,
  messages,
  prefix,
  validating,
  pageErrors,
  reviewItems,
  renderPage,
  onNext,
  onPrevious,
  onGoTo,
  onEditReviewItem,
}: WizardContainerProps) {
  const activePage = state.activePage;
  const headingId = activePage
    ? `${prefix}-${state.wizard.id}-${activePage.id}-heading`
    : undefined;
  if (!activePage) {
    return (
      <section className="a3s-form-wizard" aria-label={state.wizard.label ?? state.wizard.id}>
        <div className="a3s-form-wizard-empty" role="status">
          {messages.wizardEmpty}
        </div>
      </section>
    );
  }

  const completed = new Set(state.completedPageIds);
  const highestCompletedIndex = state.pages.reduce(
    (highest, page, index) => (completed.has(page.id) ? Math.max(highest, index) : highest),
    -1,
  );
  const reachableIndex = Math.max(state.activeIndex, highestCompletedIndex + 1);
  const nextPage = state.pages[state.activeIndex + 1];
  const previousPage = state.pages[state.activeIndex - 1];
  const progressText = formatFormMessage(messages, 'wizardStepProgress', {
    current: state.activeIndex + 1,
    total: state.pages.length,
  });

  return (
    <section
      className="a3s-form-wizard"
      aria-labelledby={state.wizard.label ? `${prefix}-${state.wizard.id}-title` : undefined}
    >
      {state.wizard.label && (
        <header className="a3s-form-wizard-heading">
          <h2 id={`${prefix}-${state.wizard.id}-title`}>{state.wizard.label}</h2>
          {state.wizard.description && <p>{state.wizard.description}</p>}
        </header>
      )}
      <nav className="a3s-form-wizard-progress" aria-label={messages.wizardProgressLabel}>
        <ol>
          {state.pages.map((page, index) => {
            const current = page.id === activePage.id;
            const canOpen = index <= reachableIndex;
            const status = current ? 'current' : completed.has(page.id) ? 'complete' : 'upcoming';
            return (
              <li key={page.id} data-status={status}>
                <button
                  type="button"
                  className="btn"
                  data-size="sm"
                  data-variant="ghost"
                  aria-current={current ? 'step' : undefined}
                  disabled={!canOpen || validating}
                  onClick={() => onGoTo(page.id)}
                >
                  <span className="a3s-form-wizard-step-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{page.label ?? page.id}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <span className="a3s-form-wizard-progress-text" aria-live="polite">
          {progressText}
        </span>
      </nav>
      <section className="a3s-form-wizard-page" aria-labelledby={headingId}>
        <header>
          <h3 id={headingId}>{activePage.label ?? activePage.id}</h3>
          {activePage.description && <p>{activePage.description}</p>}
        </header>
        {renderPage(activePage.id)}
        {activePage.pageRole === 'review' && (
          <section className="a3s-form-wizard-review" aria-label={messages.wizardReviewTitle}>
            <h4>{messages.wizardReviewTitle}</h4>
            {reviewItems.length === 0 ? (
              <p>{messages.wizardReviewEmpty}</p>
            ) : (
              <dl>
                {reviewItems.map((item) => (
                  <div key={item.nodeId}>
                    <dt>{item.label}</dt>
                    <dd>{item.displayValue}</dd>
                    <button
                      type="button"
                      className="btn"
                      data-size="xs"
                      data-variant="link"
                      aria-label={formatFormMessage(messages, 'wizardReviewEditLabel', {
                        label: item.label,
                      })}
                      onClick={() => onEditReviewItem(item.pageId)}
                    >
                      {formatFormMessage(messages, 'wizardReviewEditLabel', {
                        label: item.label,
                      })}
                    </button>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}
        {pageErrors
          .filter((error) => error.path === '')
          .map((error) => (
            <div
              className="a3s-form-wizard-error"
              role="alert"
              key={`${error.code}-${error.message}`}
            >
              {error.message}
            </div>
          ))}
      </section>
      <footer className="a3s-form-wizard-navigation">
        <button
          type="button"
          className="a3s-form-secondary btn"
          data-variant="secondary"
          disabled={!previousPage || validating}
          onClick={onPrevious}
        >
          {messages.wizardPrevious}
        </button>
        <span aria-hidden="true">{progressText}</span>
        {nextPage && (
          <button
            type="button"
            className="a3s-form-primary btn"
            data-variant="primary"
            disabled={validating}
            onClick={onNext}
          >
            {validating ? messages.wizardPageValidationPending : messages.wizardNext}
          </button>
        )}
      </footer>
      {validating && (
        <span
          className="a3s-form-wizard-validation-status"
          role="status"
          aria-live="polite"
          aria-label={formatFormMessage(messages, 'wizardPageValidationPendingLabel', {
            label: activePage.label ?? activePage.id,
          })}
        >
          {messages.wizardPageValidationPending}
        </span>
      )}
    </section>
  );
}
