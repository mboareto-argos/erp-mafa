import { z } from 'zod';

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Informe o nome do cliente.').max(160).optional(),
  whatsapp: z.string().max(32).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.string().email('Informe um e-mail válido.').nullable().optional(),
  instagram: z.string().max(64).nullable().optional(),
  birthDate: z.coerce.date().nullable().optional(),
});

export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;
