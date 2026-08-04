import { allocateAdditionalCosts } from './cost-allocation';

describe('allocateAdditionalCosts (RN 10.6, rateio proporcional ao valor)', () => {
  it('reproduz o exemplo de cálculo do §10.6 do Documento de Negócio', () => {
    // 10 unidades a R$100 + frete total de R$100 -> custo unitário final R$110
    const [allocation] = allocateAdditionalCosts(
      [{ id: 'item-1', quantityReceived: 10, unitCostOriginCurrency: 100 }],
      100,
    );

    expect(allocation.unitCostFinal.toString()).toBe('110');
  });

  it('rateia proporcionalmente ao valor entre itens diferentes', () => {
    // item A: 10un x R$100 = R$1000 (80% do valor total)
    // item B: 5un x R$50 = R$250 (20% do valor total)
    // frete total R$100 -> A recebe R$80, B recebe R$20
    const [allocationA, allocationB] = allocateAdditionalCosts(
      [
        { id: 'item-a', quantityReceived: 10, unitCostOriginCurrency: 100 },
        { id: 'item-b', quantityReceived: 5, unitCostOriginCurrency: 50 },
      ],
      100,
    );

    expect(allocationA.allocatedAdditionalCost.toString()).toBe('80');
    expect(allocationA.unitCostFinal.toString()).toBe('108');
    expect(allocationB.allocatedAdditionalCost.toString()).toBe('20');
    expect(allocationB.unitCostFinal.toString()).toBe('54');
  });

  it('não altera o custo unitário quando não há custo adicional', () => {
    const [allocation] = allocateAdditionalCosts(
      [{ id: 'item-1', quantityReceived: 3, unitCostOriginCurrency: 42 }],
      0,
    );

    expect(allocation.unitCostFinal.toString()).toBe('42');
  });
});
