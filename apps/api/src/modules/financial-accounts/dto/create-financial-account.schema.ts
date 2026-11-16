import { z } from 'zod';

export const createFinancialAccountSchema = z.object({
  name: z.string().min(1, 'Informe o nome da conta.').max(160),
  // BR §10.13 regra 10: "owner" = conta do proprietário (no máximo uma).
  kind: z.enum(['store', 'owner']).default('store'),
});

export type CreateFinancialAccountDto = z.infer<
  typeof createFinancialAccountSchema
>;
