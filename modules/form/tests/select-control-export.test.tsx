import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import * as FormReact from '../src/react';
import { SelectControl } from '../src/react';

describe('SelectControl public export', () => {
  it('is available as a named export from the React barrel', () => {
    expect(FormReact.SelectControl).toBe(SelectControl);
  });

  it('renders a native select with the shared control contract', () => {
    render(
      createElement(
        SelectControl,
        { 'aria-label': 'Role', defaultValue: 'editor' },
        createElement('option', { value: 'editor' }, 'Editor'),
        createElement('option', { value: 'viewer' }, 'Viewer'),
      ),
    );

    const select = screen.getByLabelText('Role');
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveClass('select');
    expect(select.closest('.a3s-form-select-control')).toBeTruthy();
    expect(select).toHaveValue('editor');
  });
});
