import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Informe o nome da marca.').max(120),
});

export type CreateBrandDto = z.infer<typeof createBrandSchema>;
