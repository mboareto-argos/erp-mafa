import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Informe o nome do fornecedor.').max(160),
  document: z.string().max(32).optional(),
  contactName: z.string().max(160).optional(),
  phone: z.string().max(32).optional(),
  whatsapp: z.string().max(32).optional(),
  email: z.string().email('Informe um e-mail válido.').optional(),
});

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;
