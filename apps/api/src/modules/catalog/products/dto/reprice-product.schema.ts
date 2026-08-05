import { z } from 'zod';

// BR §10.3 regras 8-9: preço/custo nunca são editados diretamente — toda
// mudança gera um novo ProductPrice, com motivo obrigatório (origem
// registrada) para auditoria.
export const repriceProductSchema = z
  .object({
    salePrice: z.number().positive('Informe um preço de venda válido.'),
    reason: z.string().min(1, 'Informe o motivo da reprecificação.').max(500),
  })
  .strict();

export type RepriceProductDto = z.infer<typeof repriceProductSchema>;
