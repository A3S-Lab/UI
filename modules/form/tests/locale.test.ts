import {
  assertCompiled,
  evaluateFormValue,
  FORM_LOCALE_CATALOG_API_VERSION,
  formatFormMessage,
  resolveFormLocaleCatalog,
} from '../src/core';
import { createDocument } from './fixtures';

describe('locale catalogs', () => {
  it('resolves built-in language families and falls back to English', () => {
    expect(resolveFormLocaleCatalog('zh-Hans').messages.selectPlaceholder).toBe('请选择');
    expect(resolveFormLocaleCatalog('en-GB').messages.validationRequired).toBe(
      'This field is required.',
    );
    expect(resolveFormLocaleCatalog('fr-FR').messages.validationRequired).toBe(
      'This field is required.',
    );
  });

  it('layers versioned host overrides without mutating the built-in catalog', () => {
    const override = {
      apiVersion: FORM_LOCALE_CATALOG_API_VERSION,
      messages: { selectPlaceholder: 'Choose a workflow model' },
    } as const;
    const resolved = resolveFormLocaleCatalog('en-US', override);
    expect(resolved.messages.selectPlaceholder).toBe('Choose a workflow model');
    expect(resolved.messages.repeaterAdd).toBe('Add item');
    expect(resolveFormLocaleCatalog('en-US').messages.selectPlaceholder).toBe('Select');
    expect(resolveFormLocaleCatalog().locale).toBe('zh-CN');
    expect(
      resolveFormLocaleCatalog('en-US', {
        apiVersion: 'unsupported' as never,
        messages: { selectPlaceholder: 'Ignored' },
      }).messages.selectPlaceholder,
    ).toBe('Select');
    expect(
      formatFormMessage(resolveFormLocaleCatalog('en-US').messages, 'errorSummaryTitle', {
        count: 2,
      }),
    ).toBe('Review 2 {fieldLabel}');
  });

  it('localizes core validation and accepts host validation-message overrides', () => {
    const document = createDocument();
    document.metadata.locale = 'en-US';
    const plan = assertCompiled(document);
    expect(evaluateFormValue(plan, {}).errors[0]?.message).toBe('This field is required.');
    expect(
      evaluateFormValue(
        plan,
        {},
        {
          localeCatalog: {
            apiVersion: FORM_LOCALE_CATALOG_API_VERSION,
            messages: { validationRequired: 'Required by the workflow host.' },
          },
        },
      ).errors[0]?.message,
    ).toBe('Required by the workflow host.');
  });
});
