import { z } from 'zod';

const salePaymentSchema = z.object({
  paymentMethodId: z.string().uuid('Forma de pagamento inválida.'),
  amount: z.number().positive('Valor do pagamento deve ser maior que zero.'),
});

// Só à vista nesta fase (ver plano da Fase 3): a soma dos pagamentos precisa
// bater exatamente com o total da venda — sem troco/crédito parcial.
export const confirmSaleSchema = z.object({
  payments: z
    .array(salePaymentSchema)
    .min(1, 'Informe ao menos uma forma de pagamento.'),
});

export type ConfirmSaleDto = z.infer<typeof confirmSaleSchema>;
