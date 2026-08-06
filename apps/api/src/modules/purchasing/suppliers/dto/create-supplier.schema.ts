import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Informe o nome do fornecedor.').max(160),
  document: z.string().max(32).nullable().optional(),
  contactName: z.string().max(160).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  whatsapp: z.string().max(32).nullable().optional(),
  email: z.string().email('Informe um e-mail válido.').nullable().optional(),
});

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;
