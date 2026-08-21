import { generatedItemKey } from '../src/react/repeater-controls';

describe('repeater controls', () => {
  it('allocates a local row key when random UUIDs are unavailable', () => {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {} });
    try {
      expect(generatedItemKey()).toMatch(/^row-[a-z0-9]+-[a-z0-9]+$/);
    } finally {
      if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
      else Reflect.deleteProperty(globalThis, 'crypto');
    }
  });
});
