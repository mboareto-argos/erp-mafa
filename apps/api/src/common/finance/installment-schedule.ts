import { Prisma } from '@prisma/client';

export type ScheduledInstallment = { number: number; amount: Prisma.Decimal; dueDate: Date };

// Divide em centavos para que a soma das parcelas seja sempre exatamente o
// total. A diferença de arredondamento fica na última parcela.
export function buildInstallmentSchedule(total: Prisma.Decimal.Value, count: number, firstDueDate: string | Date): ScheduledInstallment[] {
  const totalCents = new Prisma.Decimal(total).mul(100).round().toNumber();
  const baseCents = Math.floor(totalCents / count);
  const first = typeof firstDueDate === 'string' ? new Date(`${firstDueDate}T00:00:00.000Z`) : firstDueDate;
  return Array.from({ length: count }, (_, index) => {
    const targetMonth = first.getUTCMonth() + index;
    const year = first.getUTCFullYear() + Math.floor(targetMonth / 12);
    const month = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const date = new Date(Date.UTC(year, month, Math.min(first.getUTCDate(), lastDay)));
    const cents = index === count - 1 ? totalCents - baseCents * (count - 1) : baseCents;
    return { number: index + 1, amount: new Prisma.Decimal(cents).div(100), dueDate: date };
  });
}
