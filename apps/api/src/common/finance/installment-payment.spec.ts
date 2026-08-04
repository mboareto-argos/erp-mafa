import {
  calculateNetCash,
  exceedsRemainingBalance,
} from './installment-payment';

describe('calculateNetCash (RN 10.14.7/10.15.12)', () => {
  it('retorna o valor bruto quando não há juros nem desconto', () => {
    expect(calculateNetCash(100).toString()).toBe('100');
  });

  it('soma juros e subtrai desconto do valor em caixa', () => {
    expect(calculateNetCash(100, 10, 5).toString()).toBe('105');
  });
});

describe('exceedsRemainingBalance (RN 10.14.2/10.15.11)', () => {
  it('permite um pagamento igual ao saldo em aberto', () => {
    expect(exceedsRemainingBalance(300, 300, 0)).toBe(false);
  });

  it('permite um pagamento parcial menor que o saldo em aberto', () => {
    expect(exceedsRemainingBalance(100, 300, 100)).toBe(false);
  });

  it('bloqueia um pagamento maior que o saldo em aberto', () => {
    expect(exceedsRemainingBalance(101, 300, 200)).toBe(true);
  });

  it('bloqueia qualquer pagamento quando o saldo já está zerado', () => {
    expect(exceedsRemainingBalance(1, 300, 300)).toBe(true);
  });
});
