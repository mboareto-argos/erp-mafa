import { z } from 'zod';
import { barcodeSchema } from './create-product.schema';
import { productImageUrlSchema } from './product-image-url.schema';

// Campos cadastrais apenas — preço/custo nunca mudam por aqui (ver
// reprice-product.schema.ts): DS-FORM-004 exige histórico, não update.
export const updateProductSchema = z.object({
  sku: z.string().min(1, 'Informe o SKU.').max(60).optional(),
  name: z.string().min(1, 'Informe o nome do produto.').max(160).optional(),
  unit: z.string().min(1, 'Informe a unidade de medida.').max(20).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  minStock: z.number().nonnegative().nullable().optional(),
  // null remove o código de barras da variação.
  barcode: barcodeSchema.nullable().optional(),
  // Foto principal (BR §10.3). Só aceita arquivo do armazenamento do
  // próprio app — nunca uma URL arbitrária vinda do cliente. null remove.
  imageUrl: productImageUrlSchema.nullable().optional(),
});

export type UpdateProductDto = z.infer<typeof updateProductSchema>;
