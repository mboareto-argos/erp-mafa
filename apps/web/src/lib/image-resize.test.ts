import { describe, expect, it } from 'vitest';
import { fitWithin } from './image-resize';

describe('fitWithin (redução antes do envio)', () => {
  it('reduz pelo lado maior até 1600 px mantendo a proporção', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  it('nunca amplia foto pequena', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
