import { z } from 'zod';

export const createFinancialAccountSchema = z.object({
  name: z.string().min(1, 'Informe o nome da conta.').max(160),
});

export type CreateFinancialAccountDto = z.infer<
  typeof createFinancialAccountSchema
>;
