import { z } from 'zod';

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da categoria.').max(120),
});

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
