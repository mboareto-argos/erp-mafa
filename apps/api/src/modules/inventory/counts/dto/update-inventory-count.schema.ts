import { z } from 'zod';
export const updateInventoryCountSchema = z.object({ items: z.array(z.object({ itemId: z.string().uuid(), countedQuantity: z.number().nonnegative() })).min(1) });
export type UpdateInventoryCountDto = z.infer<typeof updateInventoryCountSchema>;
