import { z } from 'zod';

export const createReceivableSchema = z.object({
  customerId: z.string().uuid().optional(),
  saleId: z.string().uuid().optional(),
  description: z.string().min(1, 'Informe a descrição.').max(500),
  amountOriginal: z.number().positive('Valor deve ser maior que zero.'),
  dueDate: z.coerce.date(),
});

export type CreateReceivableDto = z.infer<typeof createReceivableSchema>;
