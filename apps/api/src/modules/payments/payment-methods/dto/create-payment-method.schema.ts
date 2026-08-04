import { z } from 'zod';

export const createPaymentMethodSchema = z.object({
  type: z.enum([
    'cash',
    'pix',
    'debit_card',
    'credit_card',
    'bank_transfer',
    'store_credit',
    'other',
  ]),
  name: z.string().min(1, 'Informe o nome da forma de pagamento.').max(120),
  feeRate: z.number().min(0).max(100).optional(),
  feeFixed: z.number().nonnegative().optional(),
  // Conta financeira de destino (§10.12) — opcional. Quando presente, uma
  // venda à vista confirmada com esta forma de pagamento gera uma
  // FinancialTransaction real (Fase 4).
  financialAccountId: z.string().uuid().optional(),
});

export type CreatePaymentMethodDto = z.infer<typeof createPaymentMethodSchema>;
