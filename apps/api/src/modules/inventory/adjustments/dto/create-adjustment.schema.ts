import { z } from 'zod';

export const createAdjustmentSchema = z.object({
  productVariantId: z.string().uuid('Produto inválido.'),
  quantity: z
    .number()
    .refine((value) => value !== 0, 'Quantidade não pode ser zero.'),
  reason: z.string().min(1, 'Informe o motivo do ajuste.').max(500),
});

export type CreateAdjustmentDto = z.infer<typeof createAdjustmentSchema>;
