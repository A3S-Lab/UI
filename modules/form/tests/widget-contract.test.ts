import type { JsonSchema, UiNode } from '../src/core';
import { designerWidgetValue } from '../src/react/widget-contract';

function field(widget: string, changes: Partial<UiNode> = {}): UiNode {
  return { id: `field-${widget}`, kind: 'field', widget, ...changes };
}

describe('Designer widget preview contract', () => {
  it('prefers meaningful Schema defaults without sharing object identity', () => {
    const objectDefault = { nested: { enabled: true } };
    const value = designerWidgetValue(field('text'), { default: objectDefault });
    expect(value).toEqual(objectDefault);
    expect(value).not.toBe(objectDefault);
    expect(designerWidgetValue(field('text'), { default: null })).toBeNull();
    expect(designerWidgetValue(field('text'), { default: ['configured'] })).toEqual(['configured']);
  });

  it('uses representative values when collection defaults are empty', () => {
    expect(designerWidgetValue(field('tags'), { default: [] })).toEqual(['示例标签']);
    expect(
      designerWidgetValue(field('matrix-single', { matrix: { rows: [], columns: [] } }), {
        default: {},
      }),
    ).toEqual({});
  });

  it('covers boolean, choice, collection, and fallback widgets', () => {
    const options = [
      { label: 'Disabled', value: 'disabled', disabled: true },
      { label: 'Enabled', value: 'enabled' },
    ];
    expect(designerWidgetValue(field('checkbox'), undefined)).toBe(true);
    expect(designerWidgetValue(field('switch'), undefined)).toBe(true);
    expect(designerWidgetValue(field('select', { options }), undefined)).toBe('enabled');
    expect(designerWidgetValue(field('radio'), undefined)).toBe('');
    expect(designerWidgetValue(field('multi-select', { options }), undefined)).toEqual(['enabled']);
    expect(designerWidgetValue(field('multi-select'), undefined)).toEqual([]);
    expect(designerWidgetValue(field('unknown'), undefined)).toBe('');
  });

  it('derives bounded numeric and temporal preview values', () => {
    expect(designerWidgetValue(field('number'), { minimum: 12 })).toBe(12);
    expect(designerWidgetValue(field('currency'), { minimum: Number.NaN })).toBe(0);
    expect(designerWidgetValue(field('rating'), {})).toBe(4);
    expect(designerWidgetValue(field('rating'), { minimum: -4, maximum: 30 })).toBe(9);
    expect(designerWidgetValue(field('rating'), { minimum: 6, maximum: 4 })).toBe(6);
    expect(designerWidgetValue(field('slider'), { minimum: 20, maximum: 80 })).toBe(50);
    expect(designerWidgetValue(field('slider'), { minimum: 20, maximum: 10 })).toBe(20);
    expect(designerWidgetValue(field('slider'), {})).toBe(50);
    expect(designerWidgetValue(field('date'), undefined)).toBe('2026-08-09');
    expect(designerWidgetValue(field('date-time'), undefined)).toBe('2026-08-09T09:30:00Z');
    expect(designerWidgetValue(field('time'), undefined)).toBe('09:30:00Z');
    expect(designerWidgetValue(field('calculated'), undefined)).toBe(0);
  });

  it('builds stable matrix previews from enabled rows and columns', () => {
    const matrix: NonNullable<UiNode['matrix']> = {
      rows: [
        { id: 'quality', label: 'Quality' },
        { id: 'speed', label: 'Speed', disabled: true },
      ],
      columns: [
        { label: 'Unavailable', value: 'off', disabled: true },
        { label: 'Good', value: 'good' },
      ],
    };
    expect(designerWidgetValue(field('matrix-single', { matrix }), undefined)).toEqual({
      quality: 'good',
    });
    expect(designerWidgetValue(field('matrix-multiple', { matrix }), undefined)).toEqual({
      quality: ['good'],
    });
    expect(
      designerWidgetValue(
        field('matrix-single', {
          matrix: {
            rows: matrix.rows,
            columns: matrix.columns.map((column) => ({ ...column, disabled: true })),
          },
        }),
        undefined,
      ),
    ).toEqual({});
    expect(
      designerWidgetValue(
        field('matrix-single', {
          matrix: { columns: [{ label: 'Good', value: 'good' }] } as UiNode['matrix'],
        }),
        undefined,
      ),
    ).toEqual({});
  });

  it('accepts a sparse Schema argument', () => {
    const schema: JsonSchema = { minimum: undefined, maximum: undefined };
    expect(designerWidgetValue(field('number'), schema)).toBe(0);
  });
});
