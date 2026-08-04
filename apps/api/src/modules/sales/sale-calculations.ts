import { Prisma } from '@prisma/client';

export interface SaleItemInput {
  quantity: Prisma.Decimal.Value;
  unitPrice: Prisma.Decimal.Value;
  discount: Prisma.Decimal.Value;
}

export interface SaleTotals {
  subtotal: Prisma.Decimal;
  totalDiscount: Prisma.Decimal;
  total: Prisma.Decimal;
}

// Subtotal = soma de quantidade x preço unitário (§10.10 "Cálculos da venda").
// Receita líquida (total) = subtotal - descontos (por item + geral).
export function calculateSaleTotals(
  items: SaleItemInput[],
  generalDiscount: Prisma.Decimal.Value,
): SaleTotals {
  const subtotal = items.reduce(
    (sum, item) =>
      sum.add(new Prisma.Decimal(item.quantity).mul(item.unitPrice)),
    new Prisma.Decimal(0),
  );
  const itemDiscounts = items.reduce(
    (sum, item) => sum.add(new Prisma.Decimal(item.discount)),
    new Prisma.Decimal(0),
  );
  const totalDiscount = itemDiscounts.add(generalDiscount);
  const total = subtotal.sub(totalDiscount);

  return { subtotal, totalDiscount, total };
}

export interface SaleCostItemInput {
  quantity: Prisma.Decimal.Value;
  quantityReturned: Prisma.Decimal.Value;
  unitCostAtSale: Prisma.Decimal.Value;
}

export interface SaleProfit {
  cmv: Prisma.Decimal;
  grossProfit: Prisma.Decimal;
  margin: Prisma.Decimal | null;
}

// CMV = soma do custo histórico dos itens efetivamente vendidos (RN 11.3),
// líquido de devoluções (RN 10.11.8: "CMV deve ser revertido
// proporcionalmente aos itens devolvidos"). Lucro bruto = receita líquida -
// CMV (RN 11.5). Margem = lucro / receita líquida x 100 (RN 11.8) — nunca
// gera erro quando a receita líquida é zero (retorna null nesse caso).
export function calculateCmvAndProfit(
  items: SaleCostItemInput[],
  netRevenue: Prisma.Decimal.Value,
): SaleProfit {
  const revenue = new Prisma.Decimal(netRevenue);
  const cmv = items.reduce((sum, item) => {
    const soldQuantity = new Prisma.Decimal(item.quantity).sub(
      item.quantityReturned,
    );
    return sum.add(soldQuantity.mul(item.unitCostAtSale));
  }, new Prisma.Decimal(0));
  const grossProfit = revenue.sub(cmv);
  const margin = revenue.isZero() ? null : grossProfit.div(revenue).mul(100);

  return { cmv, grossProfit, margin };
}
