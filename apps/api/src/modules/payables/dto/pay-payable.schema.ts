import { z } from 'zod';

export const payPayableSchema = z.object({
  financialAccountId: z.string().uuid('Conta financeira inválida.'),
  amount: z.number().positive('Valor deve ser maior que zero.'),
  interest: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
});

export type PayPayableDto = z.infer<typeof payPayableSchema>;
