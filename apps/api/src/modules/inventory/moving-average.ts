import { Prisma } from '@prisma/client';

// Custo medio movel (RN 11.4 do Documento de Negocio):
// novo = ((qtdAnterior x custoAnterior) + (qtdRecebida x custoRecebido)) / novaQtdTotal
export function calculateMovingAverageCost(params: {
  previousQuantity: Prisma.Decimal.Value;
  previousAvgCost: Prisma.Decimal.Value;
  receivedQuantity: Prisma.Decimal.Value;
  receivedUnitCost: Prisma.Decimal.Value;
}): Prisma.Decimal {
  const previousQuantity = new Prisma.Decimal(params.previousQuantity);
  const previousAvgCost = new Prisma.Decimal(params.previousAvgCost);
  const receivedQuantity = new Prisma.Decimal(params.receivedQuantity);
  const receivedUnitCost = new Prisma.Decimal(params.receivedUnitCost);
  const newQuantityTotal = previousQuantity.add(receivedQuantity);

  if (newQuantityTotal.isZero()) {
    return receivedUnitCost;
  }

  return previousQuantity
    .mul(previousAvgCost)
    .add(receivedQuantity.mul(receivedUnitCost))
    .div(newQuantityTotal);
}
