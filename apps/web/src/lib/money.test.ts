import { describe, expect, it } from 'vitest';
import { centsToDecimal, formatCents, toCents } from './money';

describe('money (centavos inteiros, nunca float — TA-DOMAIN-001)', () => {
  it('converte decimais da API sem erro de ponto flutuante', () => {
    expect(toCents('289.9')).toBe(28990);
    expect(toCents('0.1')).toBe(10);
    expect(toCents('1234,56')).toBe(123456);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents('10.005')).toBe(1001);
    expect(toCents('')).toBe(0);
    expect(toCents('abc')).toBe(0);
  });

  it('volta para o formato aceito pela API e formata em reais', () => {
    expect(centsToDecimal(28990)).toBe('289.90');
    expect(centsToDecimal(5)).toBe('0.05');
    expect(formatCents(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  });
});
