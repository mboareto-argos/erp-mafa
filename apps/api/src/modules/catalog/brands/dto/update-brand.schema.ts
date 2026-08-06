import { z } from 'zod';

export const updateBrandSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da marca.').max(120),
});

export type UpdateBrandDto = z.infer<typeof updateBrandSchema>;
