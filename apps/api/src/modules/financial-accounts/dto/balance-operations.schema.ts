import { z } from 'zod';

const money = z.number().finite();
const civilDate = z.string().date('Informe uma data válida.').optional();

// BR §10.13 regra 8 — saldo inicial (uma vez por conta). Pode ser negativo
// (ex.: conta que já começou no cheque especial).
export const openingBalanceSchema = z.object({
  amount: money.refine(
    (value) => value !== 0,
    'Informe um saldo diferente de zero.',
  ),
  date: civilDate,
});
export type OpeningBalanceDto = z.infer<typeof openingBalanceSchema>;

// BR §10.13 regra 9 — conferir saldo com o banco/caixa.
export const reconcileBalanceSchema = z.object({
  actualBalance: money,
  reason: z.string().trim().min(3, 'Explique o motivo da diferença.').max(500),
  date: civilDate,
});
export type ReconcileBalanceDto = z.infer<typeof reconcileBalanceSchema>;

// BR §10.13 regra 10 — aporte: parte do que a loja deve ao proprietário que
// não será reembolsada.
export const ownerContributionSchema = z.object({
  amount: money.refine(
    (value) => value > 0,
    'Informe um valor maior que zero.',
  ),
  note: z.string().trim().max(500).optional(),
});
export type OwnerContributionDto = z.infer<typeof ownerContributionSchema>;
