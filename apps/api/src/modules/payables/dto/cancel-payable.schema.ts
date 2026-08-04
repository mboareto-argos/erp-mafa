import { z } from 'zod';

export const cancelPayableSchema = z.object({
  reason: z.string().min(1, 'Informe o motivo do cancelamento.').max(500),
});

export type CancelPayableDto = z.infer<typeof cancelPayableSchema>;
