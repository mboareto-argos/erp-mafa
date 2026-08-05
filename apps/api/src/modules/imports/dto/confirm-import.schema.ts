import { z } from 'zod';

export const confirmImportSchema = z.object({
  fileName: z.string().max(255).optional(),
  rows: z
    .array(
      z.object({
        cells: z.record(z.string(), z.string()),
        duplicateAction: z
          .enum(['use_existing', 'create_new', 'register_alias', 'ignore'])
          .optional(),
      }),
    )
    .min(1, 'Envie ao menos uma linha.'),
  // Total informado a partir da planilha original (BR §34.8) — opcional,
  // usado na reconciliação quando o tipo de entidade tem valor por linha.
  expectedTotal: z.number().optional(),
});

export type ConfirmImportDto = z.infer<typeof confirmImportSchema>;
