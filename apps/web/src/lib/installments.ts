// Agenda de parcelas idêntica à da API
// (apps/api/src/common/finance/installment-schedule.ts): divide em centavos,
// diferença de arredondamento na última parcela, mesmo dia nos meses
// seguintes (ou o último dia, em meses mais curtos). Usada na prévia do
// fiado (venda) e do "pagar depois" (compra).

/** Espelho de buildInstallmentSchedule (API): diferença de centavos na última parcela. */
export function installmentSchedule(
  totalCents: number,
  count: number,
  firstDueDate: string,
) {
  if (totalCents <= 0 || count < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate))
    return [];
  const base = Math.floor(totalCents / count);
  const first = new Date(`${firstDueDate}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const targetMonth = first.getUTCMonth() + index;
    const year = first.getUTCFullYear() + Math.floor(targetMonth / 12);
    const month = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const due = new Date(
      Date.UTC(year, month, Math.min(first.getUTCDate(), lastDay)),
    );
    return {
      number: index + 1,
      cents: index === count - 1 ? totalCents - base * (count - 1) : base,
      dueDate: due.toISOString().slice(0, 10),
    };
  });
}
