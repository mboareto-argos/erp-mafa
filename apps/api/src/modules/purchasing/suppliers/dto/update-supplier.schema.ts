import { z } from 'zod';

export const updateSupplierSchema = z.object({
  name: z.string().min(1, 'Informe o nome do fornecedor.').max(160).optional(),
  document: z.string().max(32).nullable().optional(),
  contactName: z.string().max(160).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  whatsapp: z.string().max(32).nullable().optional(),
  email: z.string().email('Informe um e-mail válido.').nullable().optional(),
});

export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>;
