import { Prisma } from '@prisma/client';

// Juros/desconto ajustam só o valor em caixa recebido/pago — nunca o saldo
// da dívida em si, que é sempre reduzido exatamente pelo `amount` aplicado
// (RN 10.14.7/10.15.12 do Documento de Negócio).
export function calculateNetCash(
  amount: Prisma.Decimal.Value,
  interest?: Prisma.Decimal.Value,
  discount?: Prisma.Decimal.Value,
): Prisma.Decimal {
  return new Prisma.Decimal(amount).add(interest ?? 0).sub(discount ?? 0);
}

// RN 10.14.2/10.15.11: um recebimento/pagamento nunca pode superar o saldo
// em aberto de uma conta a receber/pagar.
export function exceedsRemainingBalance(
  amount: Prisma.Decimal.Value,
  amountOriginal: Prisma.Decimal.Value,
  amountSettled: Prisma.Decimal.Value,
): boolean {
  const remaining = new Prisma.Decimal(amountOriginal).sub(amountSettled);
  return new Prisma.Decimal(amount).greaterThan(remaining);
}
