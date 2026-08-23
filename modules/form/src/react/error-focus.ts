import { type RefObject, useCallback } from 'react';
import { type FormPlan, matchValuePathTemplate } from '../core';

export function nodeForValuePath(plan: FormPlan, path: string) {
  return Object.values(plan.nodeById).find((node) => {
    if (node.valuePath === path) return true;
    if (
      (node.widget === 'matrix-single' || node.widget === 'matrix-multiple') &&
      node.valuePath &&
      path.startsWith(`${node.valuePath}.`)
    )
      return true;
    return matchValuePathTemplate(node.valuePathTemplate, path) !== undefined;
  });
}

interface UseFormErrorFocusOptions {
  formRef: RefObject<HTMLFormElement | null>;
  plan: FormPlan;
  prefix: string;
  revealValuePath: (path: string) => boolean;
}

export function useFormErrorFocus({
  formRef,
  plan,
  prefix,
  revealValuePath,
}: UseFormErrorFocusOptions) {
  const focusControl = useCallback(
    function focusValuePath(path: string, revealDialog = true, revealVirtualRow = true) {
      const field = [
        ...(formRef.current?.querySelectorAll<HTMLElement>('[data-a3s-form-path]') ?? []),
      ].find((element) => element.getAttribute('data-a3s-form-path') === path);
      const invalidControlSelector =
        'input:not(:disabled)[aria-invalid="true"], select:not(:disabled)[aria-invalid="true"], textarea:not(:disabled)[aria-invalid="true"], button:not(:disabled)[aria-invalid="true"]';
      const describedControlSelector =
        'input:not(:disabled)[aria-describedby], select:not(:disabled)[aria-describedby], textarea:not(:disabled)[aria-describedby], button:not(:disabled)[aria-describedby]';
      const nativeControlSelector =
        'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)';
      const tabbableSelector = '[tabindex]:not([tabindex="-1"])';
      let control = field?.matches(invalidControlSelector)
        ? field
        : field?.querySelector<HTMLElement>(invalidControlSelector);
      if (!control) {
        control = field?.matches(describedControlSelector)
          ? field
          : field?.querySelector<HTMLElement>(describedControlSelector);
      }
      if (!control) {
        control = field?.matches(nativeControlSelector)
          ? field
          : field?.querySelector<HTMLElement>(nativeControlSelector);
      }
      if (!control) {
        control = field?.matches(tabbableSelector)
          ? field
          : field?.querySelector<HTMLElement>(tabbableSelector);
      }
      if (!control && field) {
        field.tabIndex = -1;
        control = field;
      }
      if (control) {
        control.focus();
        control.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (revealDialog) {
        const editButton = [
          ...(formRef.current?.querySelectorAll<HTMLButtonElement>('[data-a3s-form-grid-edit]') ??
            []),
        ].find((button) => {
          const rowPath = button.getAttribute('data-a3s-form-grid-edit');
          return rowPath && (path === rowPath || path.startsWith(`${rowPath}.`));
        });
        if (editButton) {
          editButton.click();
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(() => focusValuePath(path, false, false)),
          );
          return;
        }
      }
      if (revealVirtualRow) {
        const virtualGrid = [
          ...(formRef.current?.querySelectorAll<HTMLElement>(
            '[data-a3s-form-virtual-grid="true"]',
          ) ?? []),
        ]
          .map((element) => ({
            element,
            path: element.getAttribute('data-a3s-form-path'),
          }))
          .filter(
            (candidate): candidate is { element: HTMLElement; path: string } =>
              candidate.path !== null && path.startsWith(`${candidate.path}.`),
          )
          .sort((left, right) => right.path.length - left.path.length)[0];
        if (virtualGrid) {
          const handled = !virtualGrid.element.dispatchEvent(
            new CustomEvent('a3s-form-reveal-path', {
              cancelable: true,
              detail: { path },
            }),
          );
          if (handled) {
            window.requestAnimationFrame(() =>
              window.requestAnimationFrame(() => focusValuePath(path, true, false)),
            );
            return;
          }
        }
      }
      const node = nodeForValuePath(plan, path);
      if (!node) return;
      const fallback = window.document.getElementById(`${prefix}-${node.id}`);
      fallback?.focus();
      fallback?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [formRef, plan, prefix],
  );

  return useCallback(
    (path: string) => {
      const node = nodeForValuePath(plan, path);
      const nestedValuePath = Boolean(
        node?.valuePath && path !== node.valuePath && path.startsWith(`${node.valuePath}.`),
      );
      if (revealValuePath(path) || nestedValuePath) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusControl(path)));
        return;
      }
      focusControl(path);
    },
    [focusControl, plan, revealValuePath],
  );
}
