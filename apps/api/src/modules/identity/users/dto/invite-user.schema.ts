import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.').transform(value => value.toLowerCase()),
  roleName: z.enum(['owner', 'admin', 'sales', 'inventory', 'finance', 'viewer']),
});

export type InviteUserDto = z.infer<typeof inviteUserSchema>;
