import { z } from 'zod';

const createPurchaseItemSchema = z.object({
  productVariantId: z.string().uuid('Produto inválido.'),
  quantity: z.number().positive('Quantidade deve ser maior que zero.'),
  unitCostOriginCurrency: z.number().nonnegative(),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid().optional(),
  currency: z.string().length(3).default('BRL'),
  exchangeRate: z.number().positive().optional(),
  items: z.array(createPurchaseItemSchema).min(1, 'Informe ao menos um item.'),
});

export type CreatePurchaseDto = z.infer<typeof createPurchaseSchema>;
