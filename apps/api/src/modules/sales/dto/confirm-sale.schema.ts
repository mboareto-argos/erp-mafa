import { z } from 'zod';

const salePaymentSchema = z.object({
  paymentMethodId: z.string().uuid('Forma de pagamento inválida.'),
  amount: z.number().positive('Valor do pagamento deve ser maior que zero.'),
});

export const confirmSaleSchema = z.object({
  payments: z.array(salePaymentSchema).default([]),
  installmentPlan: z.object({
    count: z.number().int().min(1).max(60),
    firstDueDate: z.string().date('Informe a primeira data de vencimento.'),
  }).optional(),
});

export type ConfirmSaleDto = z.infer<typeof confirmSaleSchema>;
