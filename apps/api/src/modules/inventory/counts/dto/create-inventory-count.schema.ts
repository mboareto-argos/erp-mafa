import { z } from 'zod';
export const createInventoryCountSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});
export type CreateInventoryCountDto = z.infer<
  typeof createInventoryCountSchema
>;
