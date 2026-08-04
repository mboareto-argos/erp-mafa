import { Prisma } from '@prisma/client';
import { calculateMovingAverageCost } from './moving-average';

describe('calculateMovingAverageCost (RN 11.4 do Documento de Negócio)', () => {
  it('usa o custo recebido quando não havia estoque anterior', () => {
    const result = calculateMovingAverageCost({
      previousQuantity: 0,
      previousAvgCost: 0,
      receivedQuantity: 10,
      receivedUnitCost: 110,
    });
    expect(result.toString()).toBe('110');
  });

  it('recalcula a média ponderada quando já havia estoque', () => {
    // (2 x 110 + 5 x 200) / 7 = 174.2857...
    const result = calculateMovingAverageCost({
      previousQuantity: 2,
      previousAvgCost: 110,
      receivedQuantity: 5,
      receivedUnitCost: 200,
    });
    expect(result.toFixed(4)).toBe('174.2857');
  });

  it('não gera erro quando a quantidade total dá zero (segurança contra divisão por zero)', () => {
    const result = calculateMovingAverageCost({
      previousQuantity: 0,
      previousAvgCost: 0,
      receivedQuantity: new Prisma.Decimal(0),
      receivedUnitCost: 50,
    });
    expect(result.toString()).toBe('50');
  });
});
