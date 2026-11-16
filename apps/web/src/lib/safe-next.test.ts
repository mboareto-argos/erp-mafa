import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext (sem redirecionamento para fora do app)', () => {
  it('aceita só caminhos internos', () => {
    expect(safeNext('/financeiro/quem-me-deve?x=1')).toBe(
      '/financeiro/quem-me-deve?x=1',
    );
    expect(safeNext('https://evil.example')).toBe('/inicio');
    expect(safeNext('//evil.example')).toBe('/inicio');
    expect(safeNext('/\\evil.example')).toBe('/inicio');
    expect(safeNext('/api/session/logout')).toBe('/inicio');
    expect(safeNext(null)).toBe('/inicio');
  });
});
