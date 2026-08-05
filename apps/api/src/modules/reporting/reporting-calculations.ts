import { Prisma } from '@prisma/client';

// RN 11.9: ticket médio = receita líquida das vendas / quantidade de vendas
// válidas — nunca gera erro quando não há vendas no período.
export function calculateAverageTicket(
  netRevenue: Prisma.Decimal.Value,
  salesCount: number,
): Prisma.Decimal | null {
  if (salesCount === 0) return null;
  return new Prisma.Decimal(netRevenue).div(salesCount);
}

// Comparação com o período anterior (RN 10.17 — "comparações deverão
// utilizar períodos equivalentes"). Nunca gera erro quando o período
// anterior é zero (mesma cautela de RN 11.8 sobre margem).
export function calculatePercentChange(
  current: Prisma.Decimal.Value,
  previous: Prisma.Decimal.Value,
): Prisma.Decimal | null {
  const previousDecimal = new Prisma.Decimal(previous);
  if (previousDecimal.isZero()) return null;
  return new Prisma.Decimal(current)
    .sub(previousDecimal)
    .div(previousDecimal)
    .mul(100);
}

// RN 11.8: margem = lucro / receita líquida x 100 — nunca gera erro
// matemático quando a receita líquida é zero.
export function calculateMargin(
  profit: Prisma.Decimal.Value,
  netRevenue: Prisma.Decimal.Value,
): Prisma.Decimal | null {
  const revenue = new Prisma.Decimal(netRevenue);
  if (revenue.isZero()) return null;
  return new Prisma.Decimal(profit).div(revenue).mul(100);
}

export interface DreInput {
  grossRevenue: Prisma.Decimal.Value;
  discountsAndReturns: Prisma.Decimal.Value;
  cmv: Prisma.Decimal.Value;
  paymentFees: Prisma.Decimal.Value;
  expenses: Prisma.Decimal.Value;
}

export interface Dre {
  grossRevenue: Prisma.Decimal;
  discountsAndReturns: Prisma.Decimal;
  netRevenue: Prisma.Decimal;
  cmv: Prisma.Decimal;
  grossProfit: Prisma.Decimal;
  paymentFees: Prisma.Decimal;
  expenses: Prisma.Decimal;
  netProfit: Prisma.Decimal;
}

// DRE gerencial simplificada (RN 11.5/11.6/11.7 do Documento de Negócio):
// receita bruta -> (-) descontos/devoluções -> receita líquida -> (-) CMV
// -> lucro bruto -> (-) taxas de pagamento -> (-) despesas realizadas ->
// lucro líquido estimado. É gerencial, não contábil/fiscal oficial (RN
// 11.7: "deixar claro que se trata de visão gerencial").
export function calculateDre(input: DreInput): Dre {
  const grossRevenue = new Prisma.Decimal(input.grossRevenue);
  const discountsAndReturns = new Prisma.Decimal(input.discountsAndReturns);
  const netRevenue = grossRevenue.sub(discountsAndReturns);
  const cmv = new Prisma.Decimal(input.cmv);
  const grossProfit = netRevenue.sub(cmv);
  const paymentFees = new Prisma.Decimal(input.paymentFees);
  const expenses = new Prisma.Decimal(input.expenses);
  const netProfit = grossProfit.sub(paymentFees).sub(expenses);

  return {
    grossRevenue,
    discountsAndReturns,
    netRevenue,
    cmv,
    grossProfit,
    paymentFees,
    expenses,
    netProfit,
  };
}
