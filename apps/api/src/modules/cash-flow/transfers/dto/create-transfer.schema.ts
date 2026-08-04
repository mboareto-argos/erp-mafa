import { z } from 'zod';

export const createTransferSchema = z
  .object({
    fromAccountId: z.string().uuid('Conta de origem inválida.'),
    toAccountId: z.string().uuid('Conta de destino inválida.'),
    amount: z.number().positive('Valor deve ser maior que zero.'),
    reason: z.string().max(500).optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Conta de origem e destino devem ser diferentes.',
    path: ['toAccountId'],
  });

export type CreateTransferDto = z.infer<typeof createTransferSchema>;
