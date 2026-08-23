import { act, renderHook } from '@testing-library/react';
import { assertCompiled } from '../src/core';
import { nodeForValuePath, useFormErrorFocus } from '../src/react/error-focus';
import {
  createDocument,
  createNestedRepeaterDocument,
  createObjectRepeaterDocument,
} from './fixtures';

function setPath(element: HTMLElement, path: string) {
  element.setAttribute('data-a3s-form-path', path);
}

describe('form error focus', () => {
  it('focuses invalid, described and explicitly tabbable field roots directly', () => {
    const plan = assertCompiled(createDocument());
    const form = document.createElement('form');
    const invalid = document.createElement('input');
    invalid.setAttribute('aria-invalid', 'true');
    setPath(invalid, 'name');
    const described = document.createElement('textarea');
    described.setAttribute('aria-describedby', 'age-error');
    setPath(described, 'age');
    const tabbable = document.createElement('div');
    tabbable.tabIndex = 0;
    setPath(tabbable, 'active');
    form.append(invalid, described, tabbable);
    document.body.append(form);

    const focus = renderHook(() =>
      useFormErrorFocus({
        formRef: { current: form },
        plan,
        prefix: 'direct-root',
        revealValuePath: () => false,
      }),
    );

    for (const [path, control] of [
      ['name', invalid],
      ['age', described],
      ['active', tabbable],
    ] as const) {
      act(() => focus.result.current(path));
      expect(document.activeElement).toBe(control);
    }

    form.remove();
  });

  it('opens a row dialog before recursively focusing its invalid control', () => {
    const plan = assertCompiled(createObjectRepeaterDocument());
    const form = document.createElement('form');
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.setAttribute('data-a3s-form-grid-edit', 'recipients.0');
    edit.addEventListener('click', () => {
      const input = document.createElement('input');
      input.setAttribute('aria-invalid', 'true');
      setPath(input, 'recipients.0.name');
      form.append(input);
    });
    form.append(edit);
    document.body.append(form);

    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 1;
    };
    try {
      const focus = renderHook(() =>
        useFormErrorFocus({
          formRef: { current: form },
          plan,
          prefix: 'dialog',
          revealValuePath: () => false,
        }),
      );

      act(() => focus.result.current('recipients.0.name'));
      expect(document.activeElement?.getAttribute('data-a3s-form-path')).toBe('recipients.0.name');

      const fallback = document.createElement('input');
      fallback.id = 'dialog-recipient-email';
      form.append(fallback);
      act(() => focus.result.current('recipients.0.email'));
      expect(document.activeElement).toBe(fallback);
    } finally {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      form.remove();
    }
  });

  it('reveals the narrowest virtual grid and falls back when the event is unhandled', () => {
    const plan = assertCompiled(createNestedRepeaterDocument());
    const form = document.createElement('form');
    const outerGrid = document.createElement('fieldset');
    outerGrid.setAttribute('data-a3s-form-virtual-grid', 'true');
    setPath(outerGrid, 'recipients');
    const nestedGrid = document.createElement('fieldset');
    nestedGrid.setAttribute('data-a3s-form-virtual-grid', 'true');
    setPath(nestedGrid, 'recipients.0.channels');
    nestedGrid.addEventListener('a3s-form-reveal-path', (event) => {
      event.preventDefault();
      const input = document.createElement('input');
      input.setAttribute('aria-describedby', 'channel-address-error');
      setPath(input, 'recipients.0.channels.0.address');
      form.append(input);
    });
    form.append(outerGrid, nestedGrid);
    document.body.append(form);

    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 1;
    };
    try {
      const focus = renderHook(() =>
        useFormErrorFocus({
          formRef: { current: form },
          plan,
          prefix: 'virtual',
          revealValuePath: () => false,
        }),
      );

      act(() => focus.result.current('recipients.0.channels.0.address'));
      expect(document.activeElement?.getAttribute('data-a3s-form-path')).toBe(
        'recipients.0.channels.0.address',
      );

      const fallback = document.createElement('input');
      fallback.id = 'virtual-recipient-name';
      form.append(fallback);
      act(() => focus.result.current('recipients.0.name'));
      expect(document.activeElement).toBe(fallback);
    } finally {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      form.remove();
    }
  });

  it('maps nested matrix errors to their owning field', () => {
    const plan = structuredClone(assertCompiled(createDocument()));
    plan.nodeById.name.widget = 'matrix-single';

    expect(nodeForValuePath(plan, 'name.quality')?.id).toBe('name');
  });

  it('does not treat a non-nested template alias as a nested value path', () => {
    const plan = structuredClone(assertCompiled(createDocument()));
    plan.nodeById.name.valuePathTemplate = 'alias';
    const fallback = document.createElement('input');
    fallback.id = 'alias-name';
    document.body.append(fallback);
    const focus = renderHook(() =>
      useFormErrorFocus({
        formRef: { current: null },
        plan,
        prefix: 'alias',
        revealValuePath: () => false,
      }),
    );

    act(() => focus.result.current('alias'));
    expect(document.activeElement).toBe(fallback);
    fallback.remove();
  });
});
