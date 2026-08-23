import { fireEvent, render, screen } from '@testing-library/react';
import { FieldHelp } from '../src/react/field-help';

describe('field help disclosure', () => {
  it('renders concise help without an unnecessary disclosure control', () => {
    render(<FieldHelp id="name-help" label="Name" description="Use a recognizable name." />);

    expect(screen.getByText('Use a recognizable name.').id).toBe('name-help');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('expands and collapses long help with an accessible label', () => {
    const description = 'A'.repeat(181);
    render(<FieldHelp id="context-help" label="Context" description={description} />);

    const more = screen.getByRole('button', { name: 'Show more help for Context' });
    expect(more.getAttribute('aria-controls')).toBe('context-help');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText(description).getAttribute('data-expanded')).toBeNull();

    fireEvent.click(more);
    const less = screen.getByRole('button', { name: 'Show less help for Context' });
    expect(less.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(description).getAttribute('data-expanded')).toBe('true');

    fireEvent.click(less);
    expect(screen.getByRole('button', { name: 'Show more help for Context' })).toBeTruthy();
  });

  it('treats multi-line help as collapsible even when it is short', () => {
    render(<FieldHelp id="details-help" label="Details" description={'First line\nSecond line'} />);

    expect(screen.getByRole('button', { name: 'Show more help for Details' })).toBeTruthy();
  });
});
