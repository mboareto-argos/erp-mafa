import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable();

export const updateCompanySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da empresa.').max(160),
  document: optionalText(30),
  segment: optionalText(120),
  email: z
    .string()
    .trim()
    .email('Informe um e-mail válido.')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: optionalText(30),
  currency: z
    .string()
    .trim()
    .length(3, 'Use o código de três letras da moeda.')
    .transform((value) => value.toUpperCase()),
  timezone: z.string().trim().min(1).max(80),
  operationStartDate: z.string().date().optional().nullable().or(z.literal('')),
  brandAccentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Informe uma cor hexadecimal válida.'),
  allowNegativeStock: z.boolean(),
  allocationMethod: z.enum(['proportional_value', 'proportional_quantity']),
  defaultMinStock: z
    .string()
    .regex(/^\d+(?:[.,]\d{1,3})?$/, 'Informe um estoque mínimo válido.')
    .optional()
    .nullable()
    .or(z.literal('')),
  discountLimit: z
    .string()
    .regex(/^\d+(?:[.,]\d{1,2})?$/, 'Informe um limite válido.')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>;
