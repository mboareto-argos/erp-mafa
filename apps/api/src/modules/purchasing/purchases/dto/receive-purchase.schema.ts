import { z } from 'zod';

const receivePurchaseItemSchema = z.object({
  purchaseItemId: z.string().uuid('Item inválido.'),
  quantityReceived: z
    .number()
    .positive('Quantidade recebida deve ser maior que zero.'),
});

// Custos adicionais (frete etc.) rateados proporcionalmente ao valor dos
// itens recebidos neste recebimento (RN 10.6.7/10.6.8 — método inicial).
const additionalCostSchema = z.object({
  type: z.string().min(1),
  amount: z.number().nonnegative(),
});

export const receivePurchaseSchema = z.object({
  items: z
    .array(receivePurchaseItemSchema)
    .min(1, 'Informe ao menos um item recebido.'),
  additionalCosts: z.array(additionalCostSchema).default([]),
});

export type ReceivePurchaseDto = z.infer<typeof receivePurchaseSchema>;
