import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Informe o nome da categoria.').max(120),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
