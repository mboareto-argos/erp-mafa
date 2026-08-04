import { z } from 'zod';

export const createProductSchema = z
  .object({
    sku: z.string().min(1, 'Informe o SKU.').max(60),
    name: z.string().min(1, 'Informe o nome do produto.').max(160),
    unit: z.string().min(1, 'Informe a unidade de medida.').max(20),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    // Custo de referencia inicial (§10.3 do Documento de Negocio) — distinto
    // do custo operacional calculado por Purchasing/Inventory (DS-FORM-004).
    // So pode ser informado na criacao; nao existe endpoint de update.
    referenceCost: z.number().nonnegative().optional(),
    salePrice: z.number().nonnegative().optional(),
  })
  .refine(
    (data) =>
      (data.referenceCost === undefined) === (data.salePrice === undefined),
    {
      message:
        'Informe custo de referência e preço de venda juntos, ou nenhum dos dois.',
      path: ['salePrice'],
    },
  );

export type CreateProductDto = z.infer<typeof createProductSchema>;
