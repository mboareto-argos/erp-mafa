import { buildInstallmentSchedule } from './installment-schedule';

describe('buildInstallmentSchedule', () => {
  it('preserva o total em centavos e coloca o arredondamento na última parcela', () => {
    const schedule = buildInstallmentSchedule('100.00', 3, '2026-01-31');
    expect(schedule.map(item => item.amount.toFixed(2))).toEqual(['33.33', '33.33', '33.34']);
    expect(schedule.reduce((sum, item) => sum.add(item.amount), schedule[0].amount.sub(schedule[0].amount)).toFixed(2)).toBe('100.00');
  });

  it('sugere os vencimentos mensais a partir da primeira data', () => {
    const schedule = buildInstallmentSchedule('20', 3, '2026-05-10');
    expect(schedule.map(item => item.dueDate.toISOString().slice(0, 10))).toEqual(['2026-05-10', '2026-06-10', '2026-07-10']);
  });
});
