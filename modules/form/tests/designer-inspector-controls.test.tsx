import { fireEvent, render, screen } from '@testing-library/react';
import {
  FormInspectorControl,
  FormInspectorSection,
  FormInspectorSettingGroup,
  FormInspectorToggle,
} from '../src/react';
import { FieldWidgetOptions } from '../src/react/designer-inspector-controls';

describe('Designer Inspector A3S UI controls', () => {
  it('keeps extension widgets available when built-in groups are absent', () => {
    render(
      <select aria-label="组件">
        <FieldWidgetOptions widgets={[{ label: 'Custom field', value: 'custom.field' }]} />
      </select>,
    );

    expect(screen.getByRole('group', { name: '扩展组件' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Custom field' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: '文本输入' })).toBeNull();
  });

  it('applies the A3S UI contract to native controls without dropping host classes', () => {
    render(
      <>
        <FormInspectorControl label="名称">
          <input className="host-input" />
        </FormInspectorControl>
        <FormInspectorControl label="说明">
          <textarea className="host-textarea" />
        </FormInspectorControl>
        <FormInspectorControl label="类型">
          <select className="host-select">
            <option>文本</option>
          </select>
        </FormInspectorControl>
        <FormInspectorToggle label="启用" checked={true} onChange={() => undefined} />
      </>,
    );

    const input = screen.getByLabelText('名称');
    const textarea = screen.getByLabelText('说明');
    const select = screen.getByLabelText('类型');
    expect(input.classList.contains('input')).toBe(true);
    expect(input.classList.contains('host-input')).toBe(true);
    expect(textarea.classList.contains('textarea')).toBe(true);
    expect(textarea.classList.contains('host-textarea')).toBe(true);
    expect(select.classList.contains('select')).toBe(true);
    expect(select.classList.contains('host-select')).toBe(true);
    expect(screen.getByRole('switch', { name: '启用' }).classList.contains('input')).toBe(true);
  });

  it('uses native A3S UI disclosures for low-frequency settings', () => {
    const { container } = render(
      <>
        <FormInspectorSection title="位置与宽度" collapsible summary="6 / 12">
          <FormInspectorControl label="宽度">
            <input />
          </FormInspectorControl>
        </FormInspectorSection>
        <FormInspectorSettingGroup title="批处理" collapsible summary="未启用">
          <button type="button">允许粘贴</button>
        </FormInspectorSettingGroup>
      </>,
    );

    const sectionDetails = container.querySelector<HTMLDetailsElement>(
      '.a3s-form-inspector-disclosure.accordion > details',
    );
    const groupDetails = container.querySelector<HTMLDetailsElement>(
      '.a3s-form-setting-group.is-collapsible',
    );
    expect(sectionDetails?.open).toBe(false);
    expect(groupDetails?.open).toBe(false);
    fireEvent.click(screen.getByText('6 / 12').closest('summary') as HTMLElement);
    fireEvent.click(screen.getByText('未启用').closest('summary') as HTMLElement);
    expect(sectionDetails?.open).toBe(true);
    expect(groupDetails?.open).toBe(true);
  });
});
