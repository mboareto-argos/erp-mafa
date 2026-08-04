import { z } from 'zod';

export const cancelReceivableSchema = z.object({
  reason: z.string().min(1, 'Informe o motivo do cancelamento.').max(500),
});

export type CancelReceivableDto = z.infer<typeof cancelReceivableSchema>;
