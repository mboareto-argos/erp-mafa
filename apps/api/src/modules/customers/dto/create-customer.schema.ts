import { z } from 'zod';
import { marketingConsentSourceSchema } from './marketing-consent.schema';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Informe o nome do cliente.').max(160),
  whatsapp: z.string().max(32).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.string().email('Informe um e-mail válido.').nullable().optional(),
  instagram: z.string().max(64).nullable().optional(),
  birthDate: z.coerce.date().nullable().optional(),
  // Aceite de ofertas já no cadastro (BR §10.9, regra 9): a data é a do
  // servidor; aqui só a origem.
  marketingConsentSource: marketingConsentSourceSchema.optional(),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
