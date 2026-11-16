import { z } from 'zod';

const createSaleItemSchema = z.object({
  productVariantId: z.string().uuid('Produto inválido.'),
  quantity: z.number().positive('Quantidade deve ser maior que zero.'),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  // Brinde (BR §10.10, regra 19): o servidor zera preço e desconto.
  isGift: z.boolean().default(false),
});

export const createSaleSchema = z.object({
  customerId: z.string().uuid().optional(),
  channel: z.enum(['presencial', 'whatsapp', 'instagram', 'catalogo', 'outro']),
  discount: z.number().nonnegative().default(0),
  items: z.array(createSaleItemSchema).min(1, 'Informe ao menos um item.'),
});

export type CreateSaleDto = z.infer<typeof createSaleSchema>;
