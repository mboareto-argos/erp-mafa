import {
  calculateSaleTotals,
  calculateCmvAndProfit,
} from './sale-calculations';

describe('calculateSaleTotals (RN §10.10 "Cálculos da venda")', () => {
  it('calcula subtotal e total sem descontos', () => {
    const { subtotal, total } = calculateSaleTotals(
      [{ quantity: 3, unitPrice: 100, discount: 0 }],
      0,
    );
    expect(subtotal.toString()).toBe('300');
    expect(total.toString()).toBe('300');
  });

  it('desconta descontos por item e o desconto geral da venda', () => {
    const { subtotal, totalDiscount, total } = calculateSaleTotals(
      [
        { quantity: 2, unitPrice: 50, discount: 5 },
        { quantity: 1, unitPrice: 30, discount: 0 },
      ],
      10,
    );
    // subtotal = 2*50 + 1*30 = 130; descontos = 5 (item) + 10 (geral) = 15
    expect(subtotal.toString()).toBe('130');
    expect(totalDiscount.toString()).toBe('15');
    expect(total.toString()).toBe('115');
  });
});

describe('calculateCmvAndProfit (RN 11.3/11.5/11.8)', () => {
  it('calcula CMV, lucro bruto e margem de uma venda simples', () => {
    // 3 unidades vendidas a custo histórico de 50 cada -> CMV = 150.
    // Receita líquida 300 -> lucro bruto 150 -> margem 50%.
    const { cmv, grossProfit, margin } = calculateCmvAndProfit(
      [{ quantity: 3, quantityReturned: 0, unitCostAtSale: 50 }],
      300,
    );
    expect(cmv.toString()).toBe('150');
    expect(grossProfit.toString()).toBe('150');
    expect(margin?.toString()).toBe('50');
  });

  it('desconta a quantidade devolvida do CMV (RN 10.11.8)', () => {
    // 4 vendidos, 1 devolvido -> CMV considera só 3 unidades.
    const { cmv } = calculateCmvAndProfit(
      [{ quantity: 4, quantityReturned: 1, unitCostAtSale: 50 }],
      300,
    );
    expect(cmv.toString()).toBe('150');
  });

  it('nunca gera erro matemático quando a receita líquida é zero (RN 11.8)', () => {
    const { margin, grossProfit } = calculateCmvAndProfit(
      [{ quantity: 2, quantityReturned: 2, unitCostAtSale: 50 }],
      0,
    );
    expect(margin).toBeNull();
    expect(grossProfit.toString()).toBe('0');
  });
});
