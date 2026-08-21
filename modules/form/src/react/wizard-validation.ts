import { useCallback, useEffect, useRef, useState } from 'react';
import {
  evaluateWizardPageValue,
  type FieldError,
  type FormHostAdapter,
  type FormLocaleCatalogOverride,
  type FormPlan,
  type JsonObject,
  validateFormValueAsync,
} from '../core';
import type { FormWizardController } from './wizard';

interface UseWizardPageValidationOptions {
  plan: FormPlan;
  getValue: () => JsonObject;
  locale: string;
  localeCatalog?: FormLocaleCatalogOverride;
  hostAdapter?: FormHostAdapter;
  readOnly?: boolean;
  wizardController: FormWizardController;
  isBlocked: () => boolean;
  clearFieldValidations: () => void;
  focusError: (path: string) => void;
}

export interface WizardPageValidationController {
  pageErrors: readonly FieldError[];
  validatingPageId?: string;
  isActive: () => boolean;
  reset: () => void;
  goTo: (wizardId: string, pageId: string) => void;
  goPrevious: (wizardId: string) => void;
  validateAndAdvance: (wizardId: string, pageId: string, nextPageId: string) => Promise<void>;
}

export function useWizardPageValidation({
  plan,
  getValue,
  locale,
  localeCatalog,
  hostAdapter,
  readOnly,
  wizardController,
  isBlocked,
  clearFieldValidations,
  focusError,
}: UseWizardPageValidationOptions): WizardPageValidationController {
  const validationController = useRef<AbortController | null>(null);
  const [validatingPageId, setValidatingPageId] = useState<string>();
  const [pageErrors, setPageErrors] = useState<FieldError[]>([]);

  const abort = useCallback(() => {
    validationController.current?.abort();
    validationController.current = null;
  }, []);

  const reset = useCallback(() => {
    abort();
    setValidatingPageId(undefined);
    setPageErrors([]);
  }, [abort]);

  useEffect(() => abort, [abort]);

  const goTo = useCallback(
    (wizardId: string, pageId: string) => {
      reset();
      wizardController.goTo(wizardId, pageId);
    },
    [reset, wizardController],
  );

  const goPrevious = useCallback(
    (wizardId: string) => {
      reset();
      wizardController.goPrevious(wizardId);
    },
    [reset, wizardController],
  );

  const validateAndAdvance = useCallback(
    async (wizardId: string, pageId: string, nextPageId: string) => {
      if (isBlocked() || validationController.current) return;
      if (readOnly) {
        wizardController.completeAndNavigate(wizardId, pageId, nextPageId);
        return;
      }

      const evaluation = evaluateWizardPageValue(plan, getValue(), pageId, {
        locale,
        localeCatalog,
      });
      setPageErrors(evaluation.errors);
      if (evaluation.errors.length > 0) {
        focusError(evaluation.errors[0].path);
        return;
      }

      const validator = hostAdapter?.validateValue;
      if (validator) {
        clearFieldValidations();
        const controller = new AbortController();
        validationController.current = controller;
        setValidatingPageId(pageId);
        const asyncEvaluation = await validateFormValueAsync(
          plan,
          evaluation.value,
          validator,
          {
            scope: { kind: 'page', nodeId: pageId },
            trigger: 'submit',
            locale,
            localeCatalog,
          },
          controller.signal,
        );
        if (controller.signal.aborted || validationController.current !== controller) return;
        validationController.current = null;
        setValidatingPageId(undefined);
        setPageErrors(asyncEvaluation.errors);
        if (asyncEvaluation.status !== 'valid') {
          const firstError = asyncEvaluation.errors[0];
          if (firstError?.path) focusError(firstError.path);
          return;
        }
      }

      setPageErrors([]);
      wizardController.completeAndNavigate(wizardId, pageId, nextPageId);
    },
    [
      clearFieldValidations,
      focusError,
      getValue,
      hostAdapter?.validateValue,
      isBlocked,
      locale,
      localeCatalog,
      plan,
      readOnly,
      wizardController,
    ],
  );

  const isActive = useCallback(() => validationController.current !== null, []);

  return {
    pageErrors,
    validatingPageId,
    isActive,
    reset,
    goTo,
    goPrevious,
    validateAndAdvance,
  };
}
