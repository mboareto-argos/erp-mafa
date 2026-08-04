import { Prisma } from '@prisma/client';

export interface ReceivedItemInput {
  id: string;
  quantityReceived: Prisma.Decimal.Value;
  unitCostOriginCurrency: Prisma.Decimal.Value;
}

export interface AllocatedItem {
  id: string;
  itemShare: Prisma.Decimal;
  allocatedAdditionalCost: Prisma.Decimal;
  unitCostFinal: Prisma.Decimal;
}

// Rateio de custos adicionais (frete etc.) proporcional ao valor de cada
// item recebido (RN 10.6, exemplo §10.6: 10un x R$100 + frete R$100 ->
// custo unitario final R$110).
export function allocateAdditionalCosts(
  items: ReceivedItemInput[],
  totalAdditionalCosts: Prisma.Decimal.Value,
): AllocatedItem[] {
  const totalAdditional = new Prisma.Decimal(totalAdditionalCosts);
  const totalItemsValue = items.reduce(
    (sum, item) =>
      sum.add(
        new Prisma.Decimal(item.unitCostOriginCurrency).mul(
          item.quantityReceived,
        ),
      ),
    new Prisma.Decimal(0),
  );

  return items.map((item) => {
    const itemValue = new Prisma.Decimal(item.unitCostOriginCurrency).mul(
      item.quantityReceived,
    );
    const itemShare = totalItemsValue.isZero()
      ? new Prisma.Decimal(0)
      : itemValue.div(totalItemsValue);
    const allocatedAdditionalCost = totalAdditional.mul(itemShare);
    const unitCostFinal = new Prisma.Decimal(item.unitCostOriginCurrency).add(
      allocatedAdditionalCost.div(item.quantityReceived),
    );

    return { id: item.id, itemShare, allocatedAdditionalCost, unitCostFinal };
  });
}
