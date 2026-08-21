import { createFormDocument } from '../src/core';

describe('form document template', () => {
  it('creates a sealed Chinese starter document', () => {
    const document = createFormDocument();
    expect(document.metadata.title).toBe('未命名表单');
    expect(document.metadata.locale).toBe('zh-CN');
    expect(document.ui.root).toBe('root');
    expect(document.digest).toMatch(/^sha256:/);
  });

  it('applies explicit metadata', () => {
    const document = createFormDocument({
      title: '客户登记',
      description: '公开信息',
      locale: 'zh-HK',
    });
    expect(document.metadata).toEqual(
      expect.objectContaining({ title: '客户登记', description: '公开信息', locale: 'zh-HK' }),
    );
    expect(document.ui.nodes[0].label).toBe('客户登记');
  });
});
