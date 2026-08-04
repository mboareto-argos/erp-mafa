import { z } from 'zod';

export const selectCompanySchema = z.object({
  preauthToken: z.string().min(1, 'Token de pré-autenticação ausente.'),
  companyId: z.string().uuid('Empresa inválida.'),
});

export type SelectCompanyDto = z.infer<typeof selectCompanySchema>;
