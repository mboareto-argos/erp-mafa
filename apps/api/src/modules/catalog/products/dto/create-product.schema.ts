import { z } from 'zod';

export const createProductSchema = z
  .object({
    sku: z.string().min(1, 'Informe o SKU.').max(60),
    name: z.string().min(1, 'Informe o nome do produto.').max(160),
    unit: z.string().min(1, 'Informe a unidade de medida.').max(20),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    // Estoque minimo (§10.3) — usado pelo alerta de estoque baixo do
    // Inventory (RN 10.7.8).
    minStock: z.number().nonnegative().optional(),
    salePrice: z.number().nonnegative().optional(),
  })
  .strict();

export type CreateProductDto = z.infer<typeof createProductSchema>;
