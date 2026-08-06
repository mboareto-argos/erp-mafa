import { z } from 'zod';

export const updateMembershipSchema = z.object({
  roleName: z.enum(['owner', 'admin', 'sales', 'inventory', 'finance', 'viewer']),
  status: z.enum(['active', 'removed']),
});

export type UpdateMembershipDto = z.infer<typeof updateMembershipSchema>;
