import { z } from 'zod';

const returnItemSchema = z.object({
  saleItemId: z.string().uuid('Item inválido.'),
  quantity: z
    .number()
    .positive('Quantidade devolvida deve ser maior que zero.'),
  condition: z.enum(['apt', 'damaged']),
});

export const returnSaleSchema = z.object({
  reason: z.string().min(1, 'Informe o motivo da devolução.').max(500),
  items: z
    .array(returnItemSchema)
    .min(1, 'Informe ao menos um item devolvido.'),
});

export type ReturnSaleDto = z.infer<typeof returnSaleSchema>;
