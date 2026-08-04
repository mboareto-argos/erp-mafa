import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Informe o nome.').max(120),
  email: z.string().email('Informe um e-mail válido.'),
  password: z
    .string()
    .min(8, 'A senha deve ter ao menos 8 caracteres.')
    .max(72),
  companyName: z.string().min(2, 'Informe o nome da empresa.').max(160),
});

export type RegisterDto = z.infer<typeof registerSchema>;
