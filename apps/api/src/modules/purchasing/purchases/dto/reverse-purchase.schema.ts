import { z } from 'zod';
export const reversePurchaseSchema = z.object({
  reason: z.string().trim().min(3, 'Informe o motivo do estorno.').max(500),
});
export type ReversePurchaseDto = z.infer<typeof reversePurchaseSchema>;
