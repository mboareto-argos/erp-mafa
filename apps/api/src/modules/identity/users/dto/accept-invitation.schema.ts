import { z } from 'zod';

export const acceptInvitationSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(120),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').max(72),
});

export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>;
